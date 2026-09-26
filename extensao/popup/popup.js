const enderecoJogo = "https://poke.idleworld.online/play";
const chaveResumo = "pokelupa:resumo";
const chaveAjustes = "pokelupa:ajustes";
const chaveShinies = "pokelupa:shinies";
const chaveNovidade = "pokelupa:novidade";

function versaoMaior(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function checarNovidade(versaoAtual) {
  let info = (await chrome.storage.local.get(chaveNovidade))[chaveNovidade];
  try {
    const remoto = await fetch(`${chrome.runtime.getManifest().homepage_url.replace(/\/?$/, "/")}download/versao.json?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json());
    info = { versao: remoto.versao, resumo: remoto.resumo || "", checadoEm: Date.now() };
    await chrome.storage.local.set({ [chaveNovidade]: info });
  } catch (erro) {}
  if (info && versaoMaior(info.versao, versaoAtual)) {
    $("novidade").hidden = false;
    $("novidadeTitulo").textContent = `Versão ${info.versao} disponível${info.resumo ? ": " + info.resumo : ""}`;
  }
}

const $ = id => document.getElementById(id);

function numero(valor) {
  return Math.round(Number(valor) || 0).toLocaleString("pt-BR");
}

function curto(valor) {
  const n = Number(valor) || 0;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2).replace(".", ",") + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2).replace(".", ",") + "M";
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1).replace(".", ",") + "k";
  return numero(n);
}

function haQuanto(momento) {
  if (!momento) return "Sem leituras ainda";
  const minutos = Math.round((Date.now() - momento) / 60000);
  if (minutos < 1) return "Atualizado agora";
  if (minutos < 60) return `Atualizado há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return horas < 48 ? `Atualizado há ${horas} h` : `Atualizado há ${Math.round(horas / 24)} dias`;
}

function desenhar(resumo, shinies) {
  $("qtdShinies").textContent = Array.isArray(shinies) ? shinies.length : "0";
  if (!resumo) return;
  $("quando").textContent = haQuanto(resumo.atualizadoEm);
  if (resumo.mochila) {
    const m = resumo.mochila;
    $("valorMochila").textContent = numero(m.totalMark + m.totalFlint);
    $("detalheMochila").textContent = `${numero(m.quantidadeTotal)} itens · mercado ≈ ${curto(m.totalMercado)} · pokémons ${curto(m.totalPokes)}`;
    const top = $("topItens");
    top.replaceChildren();
    for (const item of m.top || []) {
      const linha = document.createElement("div");
      linha.className = "linha";
      const imagem = document.createElement("img");
      imagem.src = item.icone;
      imagem.alt = "";
      const nome = document.createElement("div");
      nome.className = "nome";
      nome.textContent = item.nome;
      const qtd = document.createElement("small");
      qtd.textContent = `×${numero(item.quantidade)}`;
      nome.appendChild(qtd);
      const valor = document.createElement("div");
      valor.className = "valor";
      valor.textContent = curto(item.total);
      linha.append(imagem, nome, valor);
      top.appendChild(linha);
    }
  }
  if (resumo.sessao) {
    $("porHora").textContent = curto(resumo.sessao.porHora) + "/h";
    $("ganhoSessao").textContent = curto(resumo.sessao.ganho);
  }
  if (typeof resumo.pokes === "number") $("qtdPokes").textContent = resumo.pokes;
}

async function abaDoJogo() {
  const abas = await chrome.tabs.query({ url: "https://*.idleworld.online/*" });
  return abas.find(a => a.active && a.lastFocusedWindow) || abas.find(a => a.url && a.url.includes("/play")) || abas[0] || null;
}

async function iniciar() {
  const manifesto = chrome.runtime.getManifest();
  $("versao").textContent = `v${manifesto.version}`;
  if (manifesto.homepage_url) $("site").href = manifesto.homepage_url;

  checarNovidade(manifesto.version);
  $("copiarDiscord").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("Skymer#9220");
      $("copiarDiscord").textContent = "Copiado!";
    } catch (erro) {
      $("copiarDiscord").textContent = "Skymer#9220";
    }
  });
  $("aplicarAtualizacao").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("atualizador/atualizar.html?auto=1") });
    window.close();
  });

  const salvo = await chrome.storage.local.get([chaveResumo, chaveAjustes, chaveShinies]);
  desenhar(salvo[chaveResumo], salvo[chaveShinies]);

  const ajustes = { cartaoAtivo: true, alertaShiny: true, somShiny: true, lancadorVisivel: true, ...(salvo[chaveAjustes] || {}) };
  document.querySelectorAll("[data-ajuste]").forEach(caixa => {
    caixa.checked = !!ajustes[caixa.dataset.ajuste];
    caixa.addEventListener("change", async () => {
      const atual = (await chrome.storage.local.get(chaveAjustes))[chaveAjustes] || ajustes;
      atual[caixa.dataset.ajuste] = caixa.checked;
      await chrome.storage.local.set({ [chaveAjustes]: atual });
    });
  });

  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area === "local" && (mudancas[chaveResumo] || mudancas[chaveShinies])) {
      chrome.storage.local.get([chaveResumo, chaveShinies]).then(novo => desenhar(novo[chaveResumo], novo[chaveShinies]));
    }
  });

  $("abrirPainel").addEventListener("click", async () => {
    const aba = await abaDoJogo();
    if (!aba) {
      chrome.tabs.create({ url: enderecoJogo });
      window.close();
      return;
    }
    await chrome.tabs.update(aba.id, { active: true });
    await chrome.windows.update(aba.windowId, { focused: true });
    chrome.tabs.sendMessage(aba.id, { tipo: "abrirPainel" }).catch(() => {});
    window.close();
  });

  $("abrirJogo").addEventListener("click", async () => {
    const aba = await abaDoJogo();
    if (aba) {
      await chrome.tabs.update(aba.id, { active: true });
      await chrome.windows.update(aba.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: enderecoJogo });
    }
    window.close();
  });
}

iniciar();
