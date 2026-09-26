(function () {
  const F = window.PokeLupaFormulas;
  const Cartao = window.PokeLupaCartao;

  const repositorio = "https://github.com/SkymerLight/pokelupa";
  const linkDownload = "download/pokelupa.zip";
  const tesseractUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

  const nomesCategorias = {
    loot: "Loot", stone: "Pedra", clan: "Clã", misc: "Diverso", card: "Shiny Card", addon: "Addon",
    tm: "TM", berry: "Berry", held: "Held", pokecard: "Poke Card", heal: "Cura", revive: "Reviver"
  };

  const $ = seletor => document.querySelector(seletor);
  const especiesPorNome = new Map();
  let especies = [];
  let itens = [];

  document.querySelectorAll('[data-link="repositorio"]').forEach(a => { a.href = repositorio; });
  document.querySelectorAll('[data-link="download"]').forEach(a => { a.href = linkDownload; });

  function criarHospede(elemento) {
    const sombra = elemento.attachShadow({ mode: "open" });
    const estilo = document.createElement("style");
    estilo.textContent = (window.PokeLupaEstilos || "") + `
      .expandido .cartao { position: static; width: auto; opacity: 1; transform: none; font-size: 13.5px; }
      .expandido .cartao .nome { font-size: 17px; }
      .vazio-site { padding: 40px 20px; text-align: center; color: var(--texto-3); border: 1px dashed var(--borda); border-radius: 16px; }
      .vazio-site b { display: block; color: var(--texto-2); font-size: 15px; margin-bottom: 4px; }
    `;
    const conteudo = document.createElement("div");
    sombra.append(estilo, conteudo);
    return html => { conteudo.innerHTML = html; };
  }

  const desenharExemplo = criarHospede($("#cartaoExemplo"));
  const desenharResultado = criarHospede($("#cartaoResultado"));

  function envolver(poke, especie) {
    return `<div class="expandido"><div class="cartao ${poke.shiny ? "shiny" : ""}">${Cartao.htmlPoke(poke, especie)}</div></div>`;
  }

  function pokeDeExemplo() {
    const especie = especiesPorNome.get("dragonite");
    if (!especie) return;
    const ivs = { hp: 29, atk: 31, def: 24, spAtk: 22, spDef: 27, speed: 30 };
    const qualidade = 1.62;
    const nivel = 118;
    const stats = F.calcularStats(F.basesDaEspecie(especie), ivs, nivel, qualidade);
    const poke = {
      name: especie.name, speciesId: especie.pokeId, level: nivel, quality: qualidade, stats,
      ivTotal: Object.values(ivs).reduce((a, b) => a + b, 0), type1: especie.type1, type2: especie.type2
    };
    poke.power = F.calcularPoder(stats, qualidade);
    desenharExemplo(envolver(poke, especie));
  }

  const formulario = $("#formulario");
  const campo = nome => formulario.elements[nome];

  function numeroDoCampo(nome) {
    const texto = String(campo(nome).value || "").trim().replace(",", ".");
    const valor = Number(texto);
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

  function calcular() {
    const especie = especiesPorNome.get(String(campo("especie").value).trim().toLowerCase());
    const nivel = numeroDoCampo("nivel");
    const qualidade = numeroDoCampo("qualidade");
    const ivTotal = numeroDoCampo("ivTotal");
    const stats = {};
    let completos = true;
    for (const chave of F.chavesStats) {
      const valor = numeroDoCampo(chave);
      if (!valor) completos = false;
      stats[chave] = valor;
    }
    if (!especie || !nivel || !qualidade || (!completos && !ivTotal)) {
      const faltando = [!especie && "espécie", !nivel && "nível", !qualidade && "qualidade", !completos && !ivTotal && "os 6 atributos (ou o IV total)"].filter(Boolean);
      desenharResultado(`<div class="vazio-site"><b>Falta pouco</b>Preencha ${faltando.join(", ")}.</div>`);
      return;
    }
    const poke = {
      name: especie.name, speciesId: especie.pokeId, level: nivel, quality: qualidade,
      stats: completos ? stats : null, ivTotal: ivTotal || undefined, shiny: campo("shiny").checked,
      type1: especie.type1, type2: especie.type2, sellValue: especie.sellValue
    };
    desenharResultado(envolver(poke, especie));
  }

  formulario.addEventListener("input", evento => {
    evento.target.classList.remove("lido", "duvida");
    calcular();
  });
  $("#limparFormulario").addEventListener("click", () => {
    formulario.reset();
    formulario.querySelectorAll(".lido, .duvida").forEach(e => e.classList.remove("lido", "duvida"));
    calcular();
  });

  let promessaTesseract = null;
  function carregarTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!promessaTesseract) {
      promessaTesseract = new Promise((resolver, rejeitar) => {
        const script = document.createElement("script");
        script.src = tesseractUrl;
        script.onload = () => resolver(window.Tesseract);
        script.onerror = () => rejeitar(new Error("Não consegui carregar o leitor de texto."));
        document.head.appendChild(script);
      });
    }
    return promessaTesseract;
  }

  function prepararImagem(imagem, escala, modo) {
    const tela = document.createElement("canvas");
    const fator = Math.max(1, Math.min(escala, 2400 / imagem.naturalWidth));
    tela.width = Math.round(imagem.naturalWidth * fator);
    tela.height = Math.round(imagem.naturalHeight * fator);
    const ctx = tela.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imagem, 0, 0, tela.width, tela.height);
    const pixels = ctx.getImageData(0, 0, tela.width, tela.height);
    const d = pixels.data;
    let soma = 0;
    for (let i = 0; i < d.length; i += 4) soma += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const escuro = soma / (d.length / 4) < 128;
    for (let i = 0; i < d.length; i += 4) {
      let luz = modo === "brilho" ? Math.max(d[i], d[i + 1], d[i + 2]) : 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (escuro) luz = 255 - luz;
      if (modo === "brilho") luz = luz > 150 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = luz;
    }
    ctx.putImageData(pixels, 0, 0);
    return tela;
  }

  const variacoesLeitura = [[3, "brilho"], [3, "cinza"], [2, "brilho"], [4, "brilho"]];

  function votar(leituras) {
    const final = {};
    const duvidas = new Set();
    const campos = new Set(leituras.flatMap(l => Object.keys(l)));
    for (const nome of campos) {
      const contagem = new Map();
      for (const leitura of leituras) {
        if (leitura[nome] === undefined) continue;
        const valor = String(leitura[nome]);
        contagem.set(valor, (contagem.get(valor) || 0) + 1);
      }
      const ordenado = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
      if (!ordenado.length) continue;
      final[nome] = nome === "shiny" ? true : ordenado[0][0];
      if (ordenado[0][1] < 2 && nome !== "shiny" && nome !== "especie") duvidas.add(nome);
    }
    return { final, duvidas };
  }

  function extrairNumero(texto, padroes) {
    for (const padrao of padroes) {
      const achado = texto.match(padrao);
      if (achado) return achado[1];
    }
    return null;
  }

  function interpretarTexto(bruto) {
    const texto = bruto.replace(/[|]/g, " ").replace(/[“”"']/g, "").replace(/\s+/g, " ");
    const resultado = {};

    const nivel = extrairNumero(texto, [/\bN[vV]\.?\s*:?\s*(\d{1,3})\b/, /\bN[ÍIíi]VEL\s*:?\s*(\d{1,3})\b/i, /\bLv\.?\s*(\d{1,3})\b/i]);
    if (nivel) resultado.nivel = nivel;

    const qualidade = extrairNumero(texto, [/[x×X]\s?(\d[.,]\d{1,3})\b/, /QUALIDADE[^\d]{0,24}(\d[.,]\d{1,3})/i, /\bQ\s*:?\s*(\d[.,]\d{1,3})\b/]);
    if (qualidade) resultado.qualidade = qualidade.replace(".", ",");

    const ivTotal = extrairNumero(texto, [/\bI[VY]\s*(?:TOTAL)?\s*:?\s*(\d{1,3})\s*\/\s*192/i, /\bI[VY]\s*(?:TOTAL)?\s*:?\s*(\d{1,3})\b/i]);
    if (ivTotal && Number(ivTotal) >= 6 && Number(ivTotal) <= 192) resultado.ivTotal = ivTotal;

    const padroesStats = {
      hp: [/\bH\s?P\s*:?\s*(\d{1,5})\b/i],
      atk: [/\bAt[kK]\s*:?\s*(\d{1,5})\b/, /\bATK\s*:?\s*(\d{1,5})\b/],
      def: [/(?:^|[^pP])\bDef\s*:?\s*(\d{1,5})\b/i],
      spAtk: [/\bSp\.?\s?A(?:tk)?\s*:?\s*(\d{1,5})\b/i, /\bSPA\s*:?\s*(\d{1,5})\b/i],
      spDef: [/\bSp\.?\s?[DO0](?:ef)?\s*:?\s*(\d{1,5})\b/i, /\bSPD\s*:?\s*(\d{1,5})\b/i],
      speed: [/\bVe[lI1]\s*:?\s*(\d{1,5})\b/i, /\bSpe(?:ed)?\s*:?\s*(\d{1,5})\b/i]
    };
    for (const chave in padroesStats) {
      const valor = extrairNumero(texto, padroesStats[chave]);
      if (valor) resultado[chave] = valor;
    }

    const minusculo = texto.toLowerCase();
    let melhor = null;
    for (const especie of especies) {
      const nome = especie.name.toLowerCase();
      if (nome.length < 3) continue;
      const indice = minusculo.indexOf(nome);
      if (indice === -1) continue;
      if (!melhor || nome.length > melhor.name.length) melhor = especie;
    }
    if (melhor) resultado.especie = melhor.name;
    if (/shiny/i.test(texto)) resultado.shiny = true;
    return resultado;
  }

  const areaSoltar = $("#areaSoltar");
  const previa = $("#previaPrint");
  const leitura = $("#leitura");

  function mostrarLeitura(texto, estado) {
    leitura.hidden = false;
    leitura.className = `leitura ${estado || ""}`;
    leitura.querySelector("span").textContent = texto;
  }

  async function lerPrint(arquivo) {
    if (!arquivo || !arquivo.type.startsWith("image/")) return;
    const url = URL.createObjectURL(arquivo);
    const carregou = new Promise((resolver, rejeitar) => {
      previa.onload = resolver;
      previa.onerror = () => rejeitar(new Error("Não consegui abrir essa imagem."));
    });
    previa.src = url;
    previa.hidden = false;
    $("#soltarVazio").hidden = true;
    mostrarLeitura("Carregando o leitor…");
    try {
      await carregou;
      const Tesseract = await carregarTesseract();
      const leitor = await Tesseract.createWorker("eng");
      await leitor.setParameters({ tessedit_pageseg_mode: "6" });
      const leituras = [];
      for (let passo = 0; passo < variacoesLeitura.length; passo++) {
        mostrarLeitura(`Lendo o print… ${passo + 1}/${variacoesLeitura.length}`);
        const [escala, modo] = variacoesLeitura[passo];
        const { data } = await leitor.recognize(prepararImagem(previa, escala, modo));
        leituras.push(interpretarTexto(data.text || ""));
      }
      await leitor.terminate();
      const { final: achados, duvidas } = votar(leituras);
      formulario.querySelectorAll(".lido, .duvida").forEach(e => e.classList.remove("lido", "duvida"));
      let preenchidos = 0;
      for (const nome of ["especie", "nivel", "qualidade", "ivTotal", ...F.chavesStats]) {
        if (achados[nome] === undefined) continue;
        campo(nome).value = achados[nome];
        campo(nome).classList.add(duvidas.has(nome) ? "duvida" : "lido");
        preenchidos++;
      }
      if (achados.shiny) campo("shiny").checked = true;
      calcular();
      if (duvidas.size) {
        mostrarLeitura(`Li ${preenchidos} campos. Confira os marcados em amarelo.`, "pronta");
        return;
      }
      if (preenchidos >= 8) mostrarLeitura(`Pronto! Li ${preenchidos} campos. Confira os valores ao lado.`, "pronta");
      else if (preenchidos) mostrarLeitura(`Li ${preenchidos} campos. Complete o que faltou à mão.`, "pronta");
      else mostrarLeitura("Não reconheci o cartão. Tente um print maior ou preencha à mão.", "erro");
    } catch (erro) {
      mostrarLeitura(erro.message || "Algo deu errado na leitura.", "erro");
    }
  }

  $("#arquivoPrint").addEventListener("change", evento => lerPrint(evento.target.files[0]));
  ["dragenter", "dragover"].forEach(tipo => areaSoltar.addEventListener(tipo, evento => {
    evento.preventDefault();
    areaSoltar.classList.add("arrastando");
  }));
  ["dragleave", "drop"].forEach(tipo => areaSoltar.addEventListener(tipo, evento => {
    evento.preventDefault();
    areaSoltar.classList.remove("arrastando");
  }));
  areaSoltar.addEventListener("drop", evento => lerPrint(evento.dataTransfer.files[0]));
  areaSoltar.addEventListener("keydown", evento => {
    if (evento.key === "Enter" || evento.key === " ") $("#arquivoPrint").click();
  });
  document.addEventListener("paste", evento => {
    const arquivo = [...(evento.clipboardData?.files || [])].find(a => a.type.startsWith("image/"));
    if (!arquivo) return;
    evento.preventDefault();
    lerPrint(arquivo);
    document.getElementById("analisador").scrollIntoView({ behavior: "smooth" });
  });

  function iconeDoItem(item) {
    const caminho = /^(https?:)?\//.test(item.icon) ? item.icon : `/assets/items/${item.icon}`;
    return caminho.startsWith("http") ? caminho : `https://poke.idleworld.online${caminho}`;
  }

  function desenharTabela() {
    const busca = $("#buscaLoot").value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const categoria = $("#categoriaLoot").value;
    const quantidade = Math.max(1, Number($("#qtdLoot").value) || 1);
    const filtrados = itens
      .filter(i => (categoria === "todas" || i.category === categoria) && (!busca || i.name.toLowerCase().includes(busca)))
      .sort((a, b) => b.npcPrice - a.npcPrice);
    const tabela = $("#tabelaLoot");
    tabela.replaceChildren();
    for (const item of filtrados) {
      const linha = document.createElement("div");
      linha.className = "linha-loot";
      const imagem = document.createElement("img");
      imagem.src = iconeDoItem(item);
      imagem.alt = "";
      imagem.loading = "lazy";
      const meio = document.createElement("div");
      const nome = document.createElement("b");
      nome.textContent = item.name;
      const sub = document.createElement("span");
      sub.textContent = `${nomesCategorias[item.category] || item.category} · ${item.category === "stone" ? "Flint" : "Mark"}`;
      meio.append(nome, sub);
      const preco = document.createElement("strong");
      preco.textContent = F.formatarNumero(item.npcPrice * quantidade);
      linha.append(imagem, meio, preco);
      tabela.appendChild(linha);
    }
    if (!filtrados.length) tabela.textContent = "Nenhum item encontrado.";
  }

  ["input", "change"].forEach(tipo => {
    $("#buscaLoot").addEventListener(tipo, desenharTabela);
    $("#categoriaLoot").addEventListener(tipo, desenharTabela);
    $("#qtdLoot").addEventListener(tipo, desenharTabela);
  });

  async function iniciar() {
    const [listaEspecies, listaItens] = await Promise.all([
      fetch("site/dados/especies.json").then(r => r.json()),
      fetch("site/dados/itens.json").then(r => r.json())
    ]);
    especies = listaEspecies;
    itens = listaItens;
    for (const especie of especies) especiesPorNome.set(especie.name.toLowerCase(), especie);
    $("#listaEspecies").innerHTML = especies.map(e => `<option value="${Cartao.esc(e.name)}">`).join("");
    const categorias = [...new Set(itens.map(i => i.category))];
    $("#categoriaLoot").innerHTML = `<option value="todas">Todas as categorias</option>` +
      categorias.map(c => `<option value="${c}">${nomesCategorias[c] || c}</option>`).join("");
    pokeDeExemplo();
    calcular();
    desenharTabela();
    fetch("download/versao.json").then(r => r.json()).then(info => {
      $("#versaoDownload").textContent = `Versão ${info.versao} · Chrome, Edge, Brave e Opera`;
    }).catch(() => {});
  }

  iniciar();
})();
