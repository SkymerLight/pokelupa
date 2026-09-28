const manifesto = chrome.runtime.getManifest();
const enderecoSite = (manifesto.homepage_url || "").replace(/\/?$/, "/");
const $ = id => document.getElementById(id);
let versaoRemota = null;

function versaoMaior(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

function etapa(nome, estado) {
  const item = document.querySelector(`[data-etapa="${nome}"]`);
  item.classList.remove("ativa", "feita");
  if (estado) item.classList.add(estado);
}

function avisar(texto, tipo) {
  $("mensagem").textContent = texto;
  $("mensagem").className = `mensagem ${tipo || ""}`;
}

function abrirBanco() {
  return new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open("pokelupa", 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore("pastas");
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

async function lerPastaSalva() {
  const banco = await abrirBanco();
  return new Promise(resolver => {
    const pedido = banco.transaction("pastas").objectStore("pastas").get("extensao");
    pedido.onsuccess = () => resolver(pedido.result || null);
    pedido.onerror = () => resolver(null);
  });
}

async function salvarPasta(pasta) {
  const banco = await abrirBanco();
  return new Promise(resolver => {
    const transacao = banco.transaction("pastas", "readwrite");
    transacao.objectStore("pastas").put(pasta, "extensao");
    transacao.oncomplete = () => resolver();
    transacao.onerror = () => resolver();
  });
}

async function pastaEhDaPokeLupa(pasta) {
  try {
    const arquivo = await (await pasta.getFileHandle("manifest.json")).getFile();
    const dados = JSON.parse(await arquivo.text());
    return /pokelupa/i.test(dados.name || "") || /pokelupa/i.test(dados.short_name || "");
  } catch (erro) {
    return false;
  }
}

async function obterPasta() {
  const salva = await lerPastaSalva();
  if (salva) {
    let permissao = await salva.queryPermission({ mode: "readwrite" });
    if (permissao !== "granted") permissao = await salva.requestPermission({ mode: "readwrite" });
    if (permissao === "granted" && await pastaEhDaPokeLupa(salva)) return salva;
  }
  const escolhida = await window.showDirectoryPicker({ id: "pokelupa", mode: "readwrite" });
  if (!await pastaEhDaPokeLupa(escolhida)) {
    throw new Error("Essa pasta não é a da PokeLupa. Escolha a pasta que tem o manifest.json da extensão.");
  }
  await salvarPasta(escolhida);
  return escolhida;
}

function lerInteiro(visao, posicao, bytes) {
  return bytes === 2 ? visao.getUint16(posicao, true) : visao.getUint32(posicao, true);
}

async function descompactar(buffer) {
  const visao = new DataView(buffer);
  let fim = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 70000); i--) {
    if (visao.getUint32(i, true) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new Error("Arquivo de atualização inválido.");
  const quantidade = lerInteiro(visao, fim + 10, 2);
  let posicao = lerInteiro(visao, fim + 16, 4);
  const decodificador = new TextDecoder();
  const arquivos = [];
  for (let n = 0; n < quantidade; n++) {
    if (visao.getUint32(posicao, true) !== 0x02014b50) throw new Error("Arquivo de atualização corrompido.");
    const metodo = lerInteiro(visao, posicao + 10, 2);
    const tamanhoCompactado = lerInteiro(visao, posicao + 20, 4);
    const tamanhoNome = lerInteiro(visao, posicao + 28, 2);
    const tamanhoExtra = lerInteiro(visao, posicao + 30, 2);
    const tamanhoComentario = lerInteiro(visao, posicao + 32, 2);
    const inicioLocal = lerInteiro(visao, posicao + 42, 4);
    const nome = decodificador.decode(new Uint8Array(buffer, posicao + 46, tamanhoNome));
    posicao += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
    if (nome.endsWith("/")) continue;
    const nomeLocal = lerInteiro(visao, inicioLocal + 26, 2);
    const extraLocal = lerInteiro(visao, inicioLocal + 28, 2);
    const inicioDados = inicioLocal + 30 + nomeLocal + extraLocal;
    const bruto = buffer.slice(inicioDados, inicioDados + tamanhoCompactado);
    let conteudo;
    if (metodo === 0) conteudo = bruto;
    else if (metodo === 8) conteudo = await new Response(new Blob([bruto]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
    else throw new Error(`Formato de compressão desconhecido em ${nome}.`);
    arquivos.push({ caminho: nome.replace(/^pokelupa\//, ""), conteudo });
  }
  return arquivos;
}

async function gravarArquivo(pasta, caminho, conteudo) {
  const partes = caminho.split("/").filter(Boolean);
  const nomeArquivo = partes.pop();
  let atual = pasta;
  for (const parte of partes) atual = await atual.getDirectoryHandle(parte, { create: true });
  const arquivo = await atual.getFileHandle(nomeArquivo, { create: true });
  const escrita = await arquivo.createWritable();
  await escrita.write(conteudo);
  await escrita.close();
}

async function atualizar() {
  $("atualizar").disabled = true;
  avisar("");
  try {
    etapa("pasta", "ativa");
    const pasta = await obterPasta();
    etapa("pasta", "feita");

    etapa("baixar", "ativa");
    const resposta = await fetch(`${enderecoSite}download/pokelupa.zip?t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) throw new Error("Não consegui baixar a versão nova. Tente de novo em instantes.");
    const arquivos = await descompactar(await resposta.arrayBuffer());
    if (!arquivos.some(a => a.caminho === "manifest.json")) throw new Error("O pacote baixado está incompleto.");
    etapa("baixar", "feita");

    etapa("gravar", "ativa");
    let feitos = 0;
    const ordenados = arquivos.sort((a, b) => (a.caminho === "manifest.json") - (b.caminho === "manifest.json"));
    for (const arquivo of ordenados) {
      await gravarArquivo(pasta, arquivo.caminho, arquivo.conteudo);
      feitos++;
      $("textoGravar").textContent = `${feitos} de ${arquivos.length} arquivos`;
    }
    etapa("gravar", "feita");

    etapa("recarregar", "ativa");
    avisar("Pronto! Recarregando a PokeLupa…", "ok");
    setTimeout(() => chrome.runtime.reload(), 900);
  } catch (erro) {
    document.querySelectorAll(".etapas li.ativa").forEach(li => li.classList.remove("ativa"));
    if (erro && erro.name === "AbortError") avisar("Você cancelou a escolha da pasta.", "erro");
    else avisar(erro.message || "Algo deu errado.", "erro");
    $("atualizar").disabled = false;
  }
}

async function iniciar() {
  const salvo = await chrome.storage.local.get("pokelupa:ajustes").catch(() => ({}));
  const idioma = (salvo["pokelupa:ajustes"] && salvo["pokelupa:ajustes"].idioma) || window.PokeLupaIdiomas.idiomaPadrao();
  window.PokeLupaIdiomas.observar(document.body, () => idioma);
  $("atualizar").addEventListener("click", atualizar);
  if (!("showDirectoryPicker" in window)) {
    $("versoes").textContent = `Versão ${manifesto.version} instalada`;
    avisar("Este navegador não permite a atualização automática. Baixe o .zip no site e substitua a pasta.", "erro");
    return;
  }
  const salva = await lerPastaSalva().catch(() => null);
  if (salva) $("textoPasta").textContent = `Usando a pasta "${salva.name}". Se o navegador perguntar, permita editar.`;
  try {
    const info = await fetch(`${enderecoSite}download/versao.json?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json());
    versaoRemota = info.versao;
    const tem = versaoMaior(info.versao, manifesto.version);
    $("versoes").textContent = tem ? `Você tem a ${manifesto.version} · nova: ${info.versao}` : `Você já está na versão mais nova (${manifesto.version})`;
    if (info.resumo) {
      $("novidades").hidden = false;
      $("novidades").textContent = `Novidades da ${info.versao}: ${info.resumo}`;
    }
    $("atualizar").textContent = tem ? `Atualizar para a ${info.versao}` : "Reinstalar mesmo assim";
    $("atualizar").disabled = false;
    if (tem && new URLSearchParams(location.search).get("auto") === "1") $("atualizar").focus();
  } catch (erro) {
    $("versoes").textContent = `Versão ${manifesto.version} instalada`;
    avisar("Não consegui ver se tem versão nova. Verifique a internet.", "erro");
    $("atualizar").disabled = false;
  }
}

iniciar();
