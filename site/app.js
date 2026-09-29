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
  const tiposEmPortugues = {
    NORMAL: "NORMAL", FOGO: "FIRE", AGUA: "WATER", ELETRICO: "ELECTRIC", PLANTA: "GRASS", GELO: "ICE",
    LUTADOR: "FIGHTING", VENENO: "POISON", TERRA: "GROUND", VOADOR: "FLYING", PSIQUICO: "PSYCHIC",
    INSETO: "BUG", PEDRA: "ROCK", FANTASMA: "GHOST", DRAGAO: "DRAGON", SOMBRIO: "DARK", ACO: "STEEL", FADA: "FAIRY"
  };
  let tiposLidos = [];
  let poderLido = null;
  const especiesPorNome = new Map();
  let especies = [];
  let baseRotas = null;
  let medidasComunidade = new Map();
  let ultimoPokeAnalisado = null;
  let itens = [];

  document.querySelectorAll('[data-link="repositorio"]').forEach(a => { a.href = repositorio; });
  document.querySelectorAll('[data-link="download"]').forEach(a => { a.href = linkDownload; });
  document.querySelectorAll("[data-copiar]").forEach(botao => {
    botao.addEventListener("click", async () => {
      const original = botao.innerHTML;
      try {
        await navigator.clipboard.writeText(botao.dataset.copiar);
        botao.textContent = "Copiado! Cole na busca de amigos";
      } catch (erro) {
        botao.textContent = botao.dataset.copiar;
      }
      setTimeout(() => { botao.innerHTML = original; }, 2200);
    });
  });

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

  function ivTotalPelosAtributos(nomeEspecie, nivel, qualidade, stats, ditto, tipos) {
    let especie = especiesPorNome.get(String(nomeEspecie || "").trim().toLowerCase());
    if (!especie || !nivel || !qualidade || !F.chavesStats.every(c => stats[c])) return null;
    if (ditto || especie.pokeId === 132) {
      especie = F.melhorForma(stats, nivel, qualidade, undefined, especies.filter(e => e.pokeId !== 132), tipos && tipos.length ? tipos : null);
      if (!especie) return null;
    }
    const analise = F.analisarPokemon({ name: especie.name, level: nivel, quality: qualidade, stats }, especie);
    return analise.ivTotalCalculado ? analise.ivTotal : null;
  }

  function calcular() {
    let especie = especiesPorNome.get(String(campo("especie").value).trim().toLowerCase());
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
    const nomeOriginal = especie.name;
    const ditto = campo("ditto").checked || especie.pokeId === 132;
    let tipos = [especie.type1, especie.type2];
    if (ditto && completos) {
      const forma = F.melhorForma(stats, nivel, qualidade, ivTotal || undefined, especies.filter(e => e.pokeId !== 132), tiposLidos.length ? tiposLidos : null);
      if (forma) {
        especie = forma;
        tipos = [forma.type1, forma.type2];
      }
    }
    const poke = {
      name: ditto ? `${campo("shiny").checked ? "Shiny " : ""}Ditto` : nomeOriginal, speciesId: especie.pokeId, level: nivel, quality: qualidade,
      stats: completos ? stats : null, ivTotal: ivTotal || undefined, shiny: campo("shiny").checked, isDitto: ditto,
      type1: tipos[0], type2: tipos[1], sellValue: especie.sellValue,
      power: poderLido || undefined
    };
    desenharResultado(envolver(poke, especie));
    ultimoPokeAnalisado = { especie, nivel, qualidade, ivTotal: ivTotal || undefined, stats: completos ? stats : null };
    desenharMelhoresHunts();
  }

  formulario.addEventListener("input", evento => {
    evento.target.classList.remove("lido", "duvida");
    calcular();
  });
  $("#limparFormulario").addEventListener("click", () => {
    formulario.reset();
    tiposLidos = [];
    poderLido = null;
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

  function recortar(imagem, x, y, largura, altura, escala, limite) {
    const tela = document.createElement("canvas");
    tela.width = Math.max(1, Math.round(largura * escala));
    tela.height = Math.max(1, Math.round(altura * escala));
    const ctx = tela.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imagem, x, y, largura, altura, 0, 0, tela.width, tela.height);
    const pixels = ctx.getImageData(0, 0, tela.width, tela.height);
    const d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      const valor = Math.min(d[i], d[i + 1], d[i + 2]) > limite ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = valor;
    }
    ctx.putImageData(pixels, 0, 0);
    return tela;
  }

  async function relerNumeros(leitor, imagem, palavras, escalaBase) {
    const achados = {};
    const alvos = [
      { nome: "nivel", padrao: /^N[vV]/, largura: 3.2, valido: v => v >= 1 && v <= 999 },
      { nome: "ivTotal", padrao: /^I[VY1l]/, largura: 4.2, valido: v => v >= 6 && v <= 192 }
    ];
    await leitor.setParameters({ tessedit_pageseg_mode: "7", tessedit_char_whitelist: "0123456789/IVNv" });
    for (const alvo of alvos) {
      const palavra = palavras.find(p => alvo.padrao.test(p.texto));
      if (!palavra) continue;
      const x = palavra.caixa.x0 / escalaBase;
      const y = palavra.caixa.y0 / escalaBase;
      const altura = (palavra.caixa.y1 - palavra.caixa.y0) / escalaBase;
      const votos = new Map();
      for (const limite of [150, 170, 190]) {
        for (const escala of [8, 10]) {
          const { data } = await leitor.recognize(recortar(imagem, Math.max(0, x - 2), Math.max(0, y - altura * 0.35), (palavra.caixa.x1 - palavra.caixa.x0) / escalaBase + altura * alvo.largura, altura * 1.7, escala, limite));
          const numero = (data.text.replace(/^[^0-9]*/, "").match(/\d{1,3}/) || [])[0];
          if (numero && alvo.valido(Number(numero))) votos.set(numero, (votos.get(numero) || 0) + 1);
        }
      }
      const melhor = [...votos.entries()].sort((a, b) => b[1] - a[1])[0];
      if (melhor) achados[alvo.nome] = { valor: melhor[0], certeza: melhor[1] };
    }
    await leitor.setParameters({ tessedit_pageseg_mode: "6", tessedit_char_whitelist: "" });
    return achados;
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

    const ivTotal = extrairNumero(texto, [
      /\bI[VY1l|]\s*(?:TOTAL)?\s*:?\s*(\d{1,3})\s*[\/|lI1]\s*192/i,
      /(\d{2,3})\s*[\/|]\s*1\s?9\s?2\b/,
      /\bI[VY]\s*(?:TOTAL)?\s*:?\s*(\d{2,3})\b/i
    ]);
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
    const poder = texto.match(/Poder\s*:?\s*(\d{1,3}(?:[.,]\d{3})+|\d{1,7})/i);
    if (poder) resultado.poder = poder[1].replace(/[.,]/g, "");
    const semAcentos = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const achadosTipos = [];
    for (const palavra of semAcentos.split(/[^A-Z]+/)) {
      const tipo = tiposEmPortugues[palavra] || (palavra.length >= 4 ? Object.entries(tiposEmPortugues).find(([nome]) => nome.length >= 4 && nome.slice(0, 4) === palavra.slice(0, 4))?.[1] : null);
      if (tipo && !achadosTipos.includes(tipo)) achadosTipos.push(tipo);
      if (achadosTipos.length === 2) break;
    }
    if (achadosTipos.length) resultado.tipos = achadosTipos.join(",");
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
      let palavras = [];
      let escalaDasPalavras = 1;
      for (let passo = 0; passo < variacoesLeitura.length; passo++) {
        mostrarLeitura(`Lendo o print… ${passo + 1}/${variacoesLeitura.length}`);
        const [escala, modo] = variacoesLeitura[passo];
        const tela = prepararImagem(previa, escala, modo);
        const { data } = await leitor.recognize(tela, {}, { text: true, blocks: passo === 0 });
        leituras.push(interpretarTexto(data.text || ""));
        if (passo === 0 && data.blocks) {
          escalaDasPalavras = tela.width / previa.naturalWidth;
          for (const bloco of data.blocks) for (const paragrafo of bloco.paragraphs) for (const linha of paragrafo.lines) for (const palavra of linha.words) palavras.push({ texto: palavra.text, caixa: palavra.bbox });
        }
      }
      mostrarLeitura("Conferindo nível e IV…");
      const relidos = await relerNumeros(leitor, previa, palavras, escalaDasPalavras);
      await leitor.terminate();
      const { final: achados, duvidas } = votar(leituras);
      for (const nome in relidos) {
        achados[nome] = relidos[nome].valor;
        if (relidos[nome].certeza >= 2) duvidas.delete(nome);
        else duvidas.add(nome);
      }
      formulario.querySelectorAll(".lido, .duvida").forEach(e => e.classList.remove("lido", "duvida"));
      let preenchidos = 0;
      for (const nome of ["especie", "nivel", "qualidade", "ivTotal", ...F.chavesStats]) {
        if (achados[nome] === undefined) continue;
        campo(nome).value = achados[nome];
        campo(nome).classList.add(duvidas.has(nome) ? "duvida" : "lido");
        preenchidos++;
      }
      if (achados.shiny) campo("shiny").checked = true;
      tiposLidos = achados.tipos ? String(achados.tipos).split(",") : [];
      poderLido = achados.poder ? Number(achados.poder) : null;
      if (achados.especie && /ditto/i.test(achados.especie)) campo("ditto").checked = true;
      const statsLidos = {};
      for (const c of F.chavesStats) statsLidos[c] = numeroDoCampo(c);
      const calculado = ivTotalPelosAtributos(campo("especie").value, numeroDoCampo("nivel"), numeroDoCampo("qualidade"), statsLidos, campo("ditto").checked, tiposLidos);
      const lido = numeroDoCampo("ivTotal");
      if (calculado !== null && (lido === null || Math.abs(lido - calculado) > 10)) {
        campo("ivTotal").value = calculado;
        campo("ivTotal").classList.remove("lido");
        campo("ivTotal").classList.add("duvida");
        campo("ivTotal").title = "Não consegui ler o IV total no print; este valor foi calculado pelos atributos. Confira.";
        duvidas.add("ivTotal");
      }
      calcular();
      if (duvidas.has("ivTotal") && campo("ditto").checked) {
        mostrarLeitura("Confira o IV total (aparece no jogo como IV x/192): no Ditto ele decide em quem ele se transformou.", "pronta");
        return;
      }
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

  function formatarHoras(segundos) {
    const horas = segundos / 3600;
    if (!Number.isFinite(horas)) return "—";
    if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
    if (horas < 48) return `${Math.floor(horas)}h ${String(Math.round((horas % 1) * 60)).padStart(2, "0")}min`;
    return `${(horas / 24).toFixed(1).replace(".", ",")} dias`;
  }

  function lerModo(grupo) {
    return document.querySelector(`[data-grupo="${grupo}"] .chip-site.ativo`)?.dataset.valor || "xp";
  }

  function lerAreas() {
    return new Set([...document.querySelectorAll('[data-grupo="areas"] .chip-site.ativo')].map(b => b.dataset.valor));
  }

  function htmlMedido(slug) {
    const medida = medidasComunidade.get(slug);
    if (!medida || medida.segundos < 1800) return "";
    return `<span class="medido" title="Média real enviada por ${medida.jogadores} jogador(es), ${formatarHoras(medida.segundos)} de dados">medido: ${F.formatarCurto(medida.xp / medida.segundos * 3600)} XP/h · ${F.formatarCurto((medida.loot + medida.capturasGold - medida.gastos) / medida.segundos * 3600)} gold/h</span>`;
  }

  function simularRota(evento) {
    if (evento) evento.preventDefault();
    const formulario = document.getElementById("formRota");
    const saida = document.getElementById("resultadoRota");
    if (!baseRotas) {
      saida.innerHTML = `<div class="vazio-rota">Carregando dados…</div>`;
      return;
    }
    const especie = baseRotas.porNome.get(PokeLupaRotas.normalizar(formulario.elements.especie.value));
    const de = Math.max(1, Number(formulario.elements.de.value) || 1);
    const ate = Math.max(de + 1, Number(formulario.elements.ate.value) || de + 1);
    if (!especie) {
      saida.innerHTML = `<div class="vazio-rota">Não achei esse Pokémon. Escolha um nome da lista.</div>`;
      return;
    }
    if (ate - de > 600) {
      saida.innerHTML = `<div class="vazio-rota">Escolha um intervalo de até 600 níveis.</div>`;
      return;
    }
    const qualidade = Number(String(formulario.elements.qualidade.value || "1").replace(",", ".")) || 1;
    const ivTotal = Number(formulario.elements.ivTotal.value) || 99;
    const modo = lerModo("modo");
    const areas = lerAreas();
    const rota = PokeLupaRotas.planejarRota(baseRotas, especie, de, ate, { modo, qualidade, ivTotal, areas });
    if (!rota.trechos.length) {
      saida.innerHTML = `<div class="vazio-rota">Nenhuma hunt dessas regiões serve para ${Cartao.esc(especie.name)} no Nv ${de}.</div>`;
      return;
    }
    const nomesModo = { xp: "mais XP", lucro: "mais lucro", balanceado: "balanceada" };
    saida.innerHTML = `
      <div class="rota-resumo">
        <div><span>Rota ${nomesModo[modo]}</span><b>${Cartao.esc(especie.name)} Nv ${de} → ${rota.travouEm || ate}</b></div>
        <div><span>Tempo total</span><b>${formatarHoras(rota.totalSegundos)}</b></div>
        <div><span>Gold no caminho</span><b>${F.formatarCurto(rota.totalGold)}</b></div>
      </div>
      <ol class="rota-trechos">
        ${rota.trechos.map(t => `
          <li>
            <div class="rota-niveis">Nv ${t.de}–${t.ate}</div>
            <div class="rota-hunt">
              <b>${Cartao.esc(t.hunt.nome)}</b>
              <span class="area area-${t.hunt.area}">${t.hunt.area}</span>
              <small>hunt Nv ${t.hunt.nivel} · ${formatarHoras(t.segundos)}</small>
              ${htmlMedido(t.hunt.slug)}
            </div>
            <div class="rota-numeros"><span>${F.formatarCurto(t.xpHora)} XP/h</span><span>${F.formatarCurto(t.goldHora)} gold/h</span></div>
          </li>`).join("")}
      </ol>
      ${rota.travouEm ? `<div class="vazio-rota">A partir do Nv ${rota.travouEm} nenhuma hunt dessas regiões é segura para ele.</div>` : ""}
    `;
  }

  function desenharMelhoresHunts() {
    const caixa = document.getElementById("melhoresHunts");
    const lista = document.getElementById("listaMelhoresHunts");
    if (!ultimoPokeAnalisado || !baseRotas) {
      caixa.hidden = true;
      return;
    }
    const { especie, nivel, qualidade, ivTotal, stats } = ultimoPokeAnalisado;
    const especieRotas = baseRotas.porNome.get(PokeLupaRotas.normalizar(especie.name)) || especie;
    const ranking = PokeLupaRotas.rankear(baseRotas, especieRotas, nivel, { modo: lerModo("modoAnalise"), qualidade, ivTotal, stats, nivelDosStats: nivel }).slice(0, 10);
    caixa.hidden = false;
    lista.innerHTML = ranking.length ? ranking.map((r, i) => `
      <div class="hunt-sugerida">
        <span class="posicao-hunt">${i + 1}</span>
        <div><b>${Cartao.esc(r.hunt.nome)}</b> <span class="area area-${r.hunt.area}">${r.hunt.area}</span><small>hunt Nv ${r.hunt.nivel} · ${Math.round(r.killsHora)} kills/h</small>${htmlMedido(r.hunt.slug)}</div>
        <div class="rota-numeros"><span>${F.formatarCurto(r.xpHora)} XP/h</span><span>${F.formatarCurto(r.goldHora)} gold/h</span></div>
      </div>`).join("") : `<div class="vazio-rota">Nenhuma hunt segura para ele nesse nível.</div>`;
  }

  document.addEventListener("click", evento => {
    const chip = evento.target.closest(".chip-site");
    if (!chip) return;
    const grupo = chip.closest("[data-grupo]");
    if (grupo.dataset.grupo === "areas") {
      chip.classList.toggle("ativo");
      if (!grupo.querySelector(".ativo")) chip.classList.add("ativo");
    } else {
      grupo.querySelectorAll(".chip-site").forEach(b => b.classList.toggle("ativo", b === chip));
    }
    if (grupo.dataset.grupo === "modoAnalise") desenharMelhoresHunts();
    else if (document.querySelector("#resultadoRota .rota-trechos")) simularRota();
  });
  document.getElementById("formRota").addEventListener("submit", simularRota);

  async function iniciar() {
    const [listaEspecies, listaItens] = await Promise.all([
      fetch("site/dados/especies.json").then(r => r.json()),
      fetch("site/dados/itens.json").then(r => r.json())
    ]);
    especies = listaEspecies;
    itens = listaItens;
    fetch("site/dados/hunts.json").then(r => r.json()).then(hunts => {
      baseRotas = PokeLupaRotas.prepararDados(especies, itens, hunts);
      desenharMelhoresHunts();
    }).catch(() => {});
    fetch("api/hunts").then(r => r.json()).then(dados => {
      for (const hunt of dados.hunts || []) medidasComunidade.set(hunt.slug, hunt);
    }).catch(() => {});
    for (const especie of especies) if (!especiesPorNome.has(especie.name.toLowerCase()) || especie.pokeId <= 1025) especiesPorNome.set(especie.name.toLowerCase(), especie);
    for (const especie of especies) {
      if (especie.pokeId <= 1025) continue;
      const mesmoNome = especies.find(e => e.pokeId <= 1025 && e.name === especie.name);
      if (mesmoNome) especie.spriteId = mesmoNome.pokeId;
      const palavras = especie.name.split(/\s+/);
      for (let i = 1; i < palavras.length && !especie.spriteId; i++) {
        const base = especiesPorNome.get(palavras.slice(i).join(" ").toLowerCase());
        if (base && base.pokeId <= 1025) especie.spriteId = base.pokeId;
      }
    }
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
