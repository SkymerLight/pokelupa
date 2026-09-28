(function () {
  if (window.__pokeLupaPainel) return;
  window.__pokeLupaPainel = true;

  const F = globalThis.PokeLupaFormulas;
  const Cartao = globalThis.PokeLupaCartao;
  const marcaJogo = "pokelupa:jogo";
  const marcaPainel = "pokelupa:painel";
  const chaves = {
    ajustes: "pokelupa:ajustes",
    mercado: "pokelupa:mercado2",
    sessao: "pokelupa:sessao",
    resumo: "pokelupa:resumo",
    shinies: "pokelupa:shinies",
    reservas: "pokelupa:reservas",
    cla: "pokelupa:cla",
    receitas: "pokelupa:receitas",
    craft: "pokelupa:craft",
    novidade: "pokelupa:novidade",
    novidadeAvisada: "pokelupa:novidadeAvisada",
    bancoClas: "pokelupa:bancoClas",
    pokesMercado: "pokelupa:pokesMercado"
  };
  const enderecoSite = (() => {
    try {
      return (chrome.runtime.getManifest().homepage_url || "").replace(/\/?$/, "/");
    } catch (erro) {
      return "https://skymerlight.github.io/pokelupa/";
    }
  })();
  const enderecoBancoClas = `${enderecoSite}dados/clas.json`;
  const enderecoVersao = `${enderecoSite}download/versao.json`;
  const ervas = { comum: 19354, selvagem: 19356, porUnidade: 25 };
  const reservasPadrao = { guardar: {}, ignorar: {}, berries: {}, unidadesCraft: 10, craftAutomatico: true, proximosRanks: false };
  const ajustesPadrao = {
    cartaoAtivo: true,
    alertaShiny: true,
    somShiny: true,
    lancadorVisivel: true,
    posicaoLancador: null
  };
  const nomesCategorias = {
    loot: "Loot", stone: "Pedra", heal: "Cura", revive: "Reviver", clan: "Clã", misc: "Diverso",
    card: "Shiny Card", addon: "Addon", tm: "TM", berry: "Berry", held: "Held", pokecard: "Poke Card"
  };
  const semVendaNoMark = new Set(["heal", "revive", "stone"]);
  const pausaEntreSessoes = 2 * 60 * 60 * 1000;

  let ajustes = { ...ajustesPadrao };
  let precosMercado = {};
  let sessao = null;
  let registroShinies = [];
  let estadoJogo = { pokes: null, inventario: null, bolas: null, atualizadoEm: 0 };
  let ultimoContato = 0;
  let reservasUsuario = { ...reservasPadrao };
  let infoCla = null;
  let receitas = null;
  let craftLiberadas = [];
  let novidade = null;
  let bancoClas = null;
  let pokesMercado = [];
  let pokesMercadoEm = 0;

  const dados = {
    itens: new Map(),
    itensPorNome: new Map(),
    especies: new Map(),
    especiesPorNome: new Map(),
    dropsPorItem: new Map(),
    nomesEspecies: [],
    pronto: false
  };

  const visao = {
    aba: "mochila",
    painelAberto: false,
    buscaMochila: "",
    categoriaMochila: "todas",
    buscaPokes: "",
    filtroPokes: "todos",
    ordemPokes: "nota",
    faixasPokes: new Set(),
    fontePokes: "meus",
    qualMinPokes: "",
    qualMaxPokes: "",
    ordemInvertida: false,
    buscaContra: "",
    buscaBerry: "",
    claVisto: "",
    ivMinPokes: "",
    ivMaxPokes: "",
    pokeAberto: null,
    atualizando: false
  };

  function armazenamento() {
    try {
      return chrome && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
    } catch (erro) {
      return null;
    }
  }

  function ler(chave) {
    const local = armazenamento();
    if (!local) return Promise.resolve(undefined);
    return new Promise(resolver => {
      try {
        local.get(chave, resultado => resolver(resultado ? resultado[chave] : undefined));
      } catch (erro) {
        resolver(undefined);
      }
    });
  }

  function gravar(chave, valor) {
    const local = armazenamento();
    if (!local) return;
    try {
      local.set({ [chave]: valor });
    } catch (erro) {}
  }

  function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function semAcento(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function urlIconeItem(item) {
    if (!item || !item.icon) return "";
    return /^(https?:)?\//.test(item.icon) ? item.icon : `/assets/items/${item.icon}`;
  }

  function tempoRelativo(momento) {
    if (!momento) return "nunca";
    const segundos = Math.max(0, Math.round((Date.now() - momento) / 1000));
    if (segundos < 10) return "agora";
    if (segundos < 60) return `há ${segundos}s`;
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.round(minutos / 60);
    return horas < 48 ? `há ${horas} h` : `há ${Math.round(horas / 24)} dias`;
  }

  function duracao(ms) {
    const totalMinutos = Math.max(0, Math.floor(ms / 60000));
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return horas ? `${horas}h ${String(minutos).padStart(2, "0")}min` : `${minutos} min`;
  }

  const svgLogo = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="plg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="#c81e3a"/></linearGradient></defs><circle cx="27" cy="27" r="20" fill="#0b1220" stroke="#e7c26a" stroke-width="4"/><path d="M9 27a18 18 0 0 1 36 0z" fill="url(#plg)"/><path d="M9 27h36" stroke="#e7c26a" stroke-width="3"/><circle cx="27" cy="27" r="6" fill="#0b1220" stroke="#e7c26a" stroke-width="3"/><circle cx="27" cy="27" r="2.2" fill="#f5dc9b"/><path d="M41.5 41.5 56 56" stroke="#e7c26a" stroke-width="7" stroke-linecap="round"/></svg>`;
  const svgAtualizar = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>`;
  const svgFechar = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  const svgDiscord = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.2.5a18 18 0 0 1 4.3 1.4 14.5 14.5 0 0 0-15 0A18 18 0 0 1 8.8 3.5L8.6 3a19.6 19.6 0 0 0-4.9 1.4C.6 9.1-.3 13.7.1 18.2A19.8 19.8 0 0 0 6.1 21l1.3-2a12.6 12.6 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.7 19.7 0 0 0 6-3c.5-5.2-.9-9.8-3.6-13.6ZM8.3 15.5c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7.4 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>`;
  const svgPix = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M17.6 17.3a2.9 2.9 0 0 1-2.1-.9l-3-3a.6.6 0 0 0-.8 0l-3 3a2.9 2.9 0 0 1-2.1.9H6l3.8 3.8a3 3 0 0 0 4.3 0l3.8-3.8ZM6.6 6.7a2.9 2.9 0 0 1 2.1.9l3 3a.6.6 0 0 0 .8 0l3-3a2.9 2.9 0 0 1 2.1-.9h.3l-3.8-3.8a3 3 0 0 0-4.3 0L6 6.7Zm14.5 3.2-2.3-2.3h-1.2a2 2 0 0 0-1.4.6l-3 3a1.5 1.5 0 0 1-2.1 0l-3-3a2 2 0 0 0-1.4-.6H5.2L2.9 9.9a3 3 0 0 0 0 4.3l2.3 2.3h1.4a2 2 0 0 0 1.4-.6l3-3a1.5 1.5 0 0 1 2.1 0l3 3a2 2 0 0 0 1.4.6h1.2l2.3-2.3a3 3 0 0 0 0-4.3Z"/></svg>`;
  const svgMochila = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 7V5a4 4 0 0 1 8 0v2"/><rect x="4" y="7" width="16" height="14" rx="3"/><path d="M4 13h16M10 13v2h4v-2"/></svg>`;

  const hospedeiro = document.createElement("div");
  hospedeiro.id = "pokelupa-raiz";
  const sombra = hospedeiro.attachShadow({ mode: "open" });
  const estilo = document.createElement("style");
  estilo.textContent = globalThis.PokeLupaEstilos || "";
  sombra.appendChild(estilo);

  const camada = document.createElement("div");
  camada.className = "camada";
  camada.innerHTML = `
    <div class="cartao" data-ref="cartao"></div>
    <div class="avisos" data-ref="avisos"></div>
    <div class="painel" data-ref="painel">
      <div class="cabeca">
        <div class="logo">${svgLogo}</div>
        <div>
          <h1>Poke<span>Lupa</span></h1>
          <p data-ref="status">Aguardando o jogo…</p>
        </div>
        <div class="acoes">
          <button class="botao-icone" data-acao="atualizar" title="Pedir dados atualizados ao jogo">${svgAtualizar}</button>
          <button class="botao-icone" data-acao="fechar" title="Fechar (Alt+L)">${svgFechar}</button>
        </div>
      </div>
      <div class="faixa-novidade" data-ref="novidade" hidden></div>
      <div class="abas" data-ref="abas">
        <button class="aba" data-aba="mochila">Mochila</button>
        <button class="aba" data-aba="pokes">Ranking</button>
        <button class="aba" data-aba="contra">Contra</button>
        <button class="aba" data-aba="sessao">Sessão</button>
        <button class="aba" data-aba="cla">Clã</button>
        <button class="aba" data-aba="profissao">Profissão</button>
        <button class="aba" data-aba="ajustes">Ajustes</button>
      </div>
      <div class="corpo" data-ref="corpo"></div>
      <div class="rodape"><span class="apoio"><a href="https://pixie.gg/skymerlight" target="_blank" rel="noopener" class="apoio-pix" title="Apoiar com Pix">${svgPix} Apoiar</a><button class="apoio-discord" data-acao="copiarDiscord" title="Copiar meu Discord">${svgDiscord} Skymer#9220</button></span><a href="https://skymerlight.github.io/pokelupa/" target="_blank" rel="noopener" data-ref="linkRepo">PokeLupa</a></div>
    </div>
    <button class="lancador" data-ref="lancador" title="PokeLupa (Alt+L)">${svgLogo}<span class="ponto"></span></button>
  `;
  sombra.appendChild(camada);

  const ref = nome => camada.querySelector(`[data-ref="${nome}"]`);
  const cartao = ref("cartao");
  const painel = ref("painel");
  const corpo = ref("corpo");
  const lancador = ref("lancador");
  const areaAvisos = ref("avisos");
  const statusTopo = ref("status");

  try {
    const manifesto = chrome.runtime.getManifest();
    if (manifesto.homepage_url) ref("linkRepo").href = manifesto.homepage_url;
    ref("linkRepo").textContent = `PokeLupa v${manifesto.version}`;
  } catch (erro) {}

  function anexar() {
    if (!document.documentElement.contains(hospedeiro)) document.documentElement.appendChild(hospedeiro);
  }
  anexar();
  new MutationObserver(anexar).observe(document.documentElement, { childList: true });

  async function carregarCatalogo() {
    try {
      const [respostaItens, respostaEspecies] = await Promise.all([
        fetch("/game/items.json", { cache: "force-cache" }).then(r => r.json()),
        fetch("/game/creatures.json", { cache: "force-cache" }).then(r => r.json())
      ]);
      for (const item of respostaItens.items || []) {
        dados.itens.set(item.id, item);
        dados.itensPorNome.set(item.name.toLowerCase(), item);
      }
      const drops = new Map();
      for (const especie of respostaEspecies.creatures || []) {
        const enxuta = {
          pokeId: especie.pokeId, name: especie.name, type1: especie.type1, type2: especie.type2,
          rarity: especie.rarity, baseHp: especie.baseHp, baseAtk: especie.baseAtk, baseDef: especie.baseDef,
          baseSpAtk: especie.baseSpAtk, baseSpDef: especie.baseSpDef, baseSpeed: especie.baseSpeed,
          sellValue: especie.sellValue, huntLevel: especie.huntLevel,
          ataques: (especie.attacks || []).map(a => ({ name: a.name, power: a.power, type: a.type, category: a.category, cooldownMs: a.cooldownMs, learnLevel: a.learnLevel }))
        };
        dados.especies.set(especie.pokeId, enxuta);
        if (!dados.especiesPorNome.has(especie.name.toLowerCase()) || especie.pokeId <= 1025) dados.especiesPorNome.set(especie.name.toLowerCase(), enxuta);
        for (const drop of especie.loot || []) {
          if (!drop || !drop.chance) continue;
          const chave = String(drop.name).toLowerCase();
          if (!drops.has(chave)) drops.set(chave, []);
          drops.get(chave).push({ nome: especie.name, chance: drop.chance });
        }
      }
      for (const [chave, lista] of drops) {
        lista.sort((a, b) => b.chance - a.chance);
        dados.dropsPorItem.set(chave, lista.slice(0, 4));
      }
      for (const especie of dados.especies.values()) especie.spriteId = idDoSprite(especie);
      dados.nomesEspecies = [...dados.especies.values()].map(e => e.name).sort((a, b) => a.localeCompare(b));
      dados.pronto = true;
      aoMudarDados("catalogo");
    } catch (erro) {
      statusTopo.textContent = "Não consegui ler o catálogo do jogo.";
    }
  }

  const cacheFormas = new Map();

  function idDoSprite(especie) {
    if (especie.pokeId <= 1025) return especie.pokeId;
    const palavras = especie.name.split(/\s+/);
    const mesmoNome = [...dados.especies.values()].find(e => e.pokeId <= 1025 && e.name.toLowerCase() === especie.name.toLowerCase());
    if (mesmoNome) return mesmoNome.pokeId;
    for (let i = 1; i < palavras.length; i++) {
      const base = dados.especiesPorNome.get(palavras.slice(i).join(" ").toLowerCase());
      if (base && base.pokeId <= 1025) return base.pokeId;
    }
    return null;
  }

  function acharEspecie(poke) {
    if (!poke) return null;
    if (poke.isDitto && poke.formName) {
      const forma = dados.especiesPorNome.get(String(poke.formName).toLowerCase());
      if (forma) return forma;
    }
    if (poke.isDitto && poke.stats && poke.level && poke.quality) {
      if (!cacheFormas.has(poke.id ?? poke.name)) {
        const candidatas = [...dados.especies.values()].filter(e => e.pokeId !== 132);
        cacheFormas.set(poke.id ?? poke.name, { chave: JSON.stringify([poke.stats, poke.type1, poke.type2]), forma: F.melhorForma(poke.stats, poke.level, poke.quality, poke.ivTotal, candidatas, [poke.type1, poke.type2]) });
      }
      const registro = cacheFormas.get(poke.id ?? poke.name);
      if (registro.chave !== JSON.stringify([poke.stats, poke.type1, poke.type2])) {
        cacheFormas.delete(poke.id ?? poke.name);
        return acharEspecie(poke);
      }
      if (registro.forma) return registro.forma;
    }
    if (poke.speciesId > 0 && dados.especies.has(poke.speciesId)) return dados.especies.get(poke.speciesId);
    const nome = String(poke.name || "").replace(/^shiny\s+/i, "").replace(/\s*⚠.*$/, "").trim().toLowerCase();
    return dados.especiesPorNome.get(nome) || null;
  }

  function destinoDoItem(item) {
    if (!item) return "nenhum";
    const preco = item.npcPrice || 0;
    if (item.category === "stone") return preco ? "flint" : "nenhum";
    if (semVendaNoMark.has(item.category) || !preco) return "nenhum";
    return "mark";
  }

  function precoMercadoDe(item) {
    if (!item) return null;
    const registro = precosMercado[item.name.toLowerCase()];
    return registro ? registro.preco : null;
  }

  function berriesAtivas() {
    if (!receitas) return [];
    const escolhidas = Object.keys(reservasUsuario.berries).filter(id => reservasUsuario.berries[id] && receitas[id]);
    if (escolhidas.length) return escolhidas;
    if (reservasUsuario.craftAutomatico) return craftLiberadas.map(String).filter(id => receitas[id]);
    return [];
  }

  function calcularReservas() {
    const mapa = new Map();
    const somar = (id, qtd, motivo) => {
      const chave = Number(id);
      if (!mapa.has(chave)) mapa.set(chave, { qtd: 0, motivos: new Set() });
      const registro = mapa.get(chave);
      registro.qtd += qtd;
      registro.motivos.add(motivo);
    };
    if (infoCla && infoCla.tarefa) {
      for (const item of infoCla.tarefa.itens) if (item.precisa > 0) somar(item.id, item.precisa, "clã");
      const ranksDoBanco = reservasUsuario.proximosRanks && bancoClas && bancoClas.clas ? bancoClas.clas[infoCla.cla] || {} : {};
      for (const rank in ranksDoBanco) {
        if (Number(rank) <= Number(infoCla.tarefa.rank)) continue;
        for (const item of ranksDoBanco[rank].itens || []) somar(item.id, item.qtd, "clã");
      }
    }
    const unidades = Math.max(1, Number(reservasUsuario.unidadesCraft) || 1);
    for (const id of berriesAtivas()) {
      const item = dados.itens.get(Number(id));
      const selvagem = item ? /^wild\s/i.test(item.name) : false;
      somar(selvagem ? ervas.selvagem : ervas.comum, ervas.porUnidade * unidades, "craft");
      for (const ingrediente of receitas[id]) somar(ingrediente.id, ingrediente.qtd * unidades, "craft");
    }
    for (const id in reservasUsuario.guardar) if (reservasUsuario.guardar[id]) somar(id, Infinity, "guardar");
    return mapa;
  }

  function rotuloReserva(registro) {
    if (registro.motivos.has("guardar")) return "GUARDAR";
    const partes = [];
    if (registro.motivos.has("clã")) partes.push("CLÃ");
    if (registro.motivos.has("craft")) partes.push("CRAFT");
    return `${partes.join("+")} ${F.formatarCurto(registro.qtd)}`;
  }

  function enviarMarcacoes() {
    const reservas = {};
    for (const [id, registro] of calcularReservas()) reservas[id] = rotuloReserva(registro);
    for (const id in reservasUsuario.ignorar) if (reservasUsuario.ignorar[id] && !reservas[id]) reservas[id] = "IGNORADO";
    const bloqueios = {};
    for (const [id, registro] of calcularReservas()) {
      const item = dados.itens.get(id);
      bloqueios[id] = {
        nome: item ? item.name : `Item ${id}`,
        tudo: registro.qtd === Infinity,
        qtd: registro.qtd === Infinity ? 0 : registro.qtd,
        motivo: [...registro.motivos].join(" + ")
      };
    }
    const notas = {};
    for (const x of analisesDosPokes()) {
      if (x.poke.id != null && x.analise.nota) notas[x.poke.id] = { letra: x.analise.nota.letra, pontos: x.analise.pontos };
    }
    window.postMessage({ marca: marcaPainel, tipo: "marcacoes", dados: { reservas, notas, bloqueios } }, location.origin);
  }

  function htmlCartaoItem(alvo) {
    const item = dados.itens.get(alvo.id) || (alvo.nome ? dados.itensPorNome.get(String(alvo.nome).toLowerCase()) : null);
    if (!item) return "";
    const quantidade = alvo.quantidade || 1;
    const destino = destinoDoItem(item);
    const unitario = destino === "nenhum" ? 0 : item.npcPrice || 0;
    const mercado = precoMercadoDe(item);
    const anuncio = alvo.precoAnuncio;
    const drops = dados.dropsPorItem.get(item.name.toLowerCase()) || [];
    const nomeDestino = destino === "mark" ? "Mark" : destino === "flint" ? "Flint" : "NPC";

    let linhas = `<div class="linha"><span>Quantidade</span><b class="num">${F.formatarNumero(quantidade)}</b></div>`;
    const reserva = calcularReservas().get(item.id);
    if (reserva) {
      const motivos = [...reserva.motivos].map(m => m === "clã" ? "missão do clã" : m === "craft" ? "craft de berries" : "você marcou para guardar").join(" + ");
      linhas += `<div class="linha"><span>Não venda: ${esc(motivos)}</span><b class="num ouro">${reserva.qtd === Infinity ? "tudo" : F.formatarNumero(reserva.qtd)}</b></div>`;
    }
    if (destino !== "nenhum") {
      linhas += `<div class="linha"><span>Preço no ${nomeDestino}</span><b class="num">${F.formatarNumero(unitario)} /un</b></div>`;
      linhas += `<div class="linha"><span>Total no ${nomeDestino}</span><b class="num ouro">${F.formatarNumero(unitario * quantidade)}</b></div>`;
    } else {
      linhas += `<div class="linha"><span>Venda ao NPC</span><b class="fraco">não aceita</b></div>`;
    }
    if (mercado) linhas += `<div class="linha"><span>Mercado (menor visto)</span><b class="num">${F.formatarNumero(mercado)} /un</b></div>`;
    if (anuncio && unitario) {
      const diferenca = Math.round((anuncio / unitario - 1) * 100);
      linhas += `<div class="linha"><span>Este anúncio</span><b class="num" style="color:${diferenca > 0 ? "var(--vermelho)" : "var(--verde)"}">${F.formatarNumero(anuncio)} /un (${diferenca > 0 ? "+" : ""}${diferenca}% vs NPC)</b></div>`;
    }

    return `
      <div class="topo">
        <div class="retrato item"><img src="${esc(urlIconeItem(item))}" alt=""></div>
        <div class="identidade">
          <div class="nome">${esc(item.name)}</div>
          <div class="sub">${esc(nomesCategorias[item.category] || item.category)}${item.rare ? ' · <span style="color:var(--ouro)">raro</span>' : ""}</div>
        </div>
      </div>
      <div class="linhas">${linhas}</div>
      ${drops.length ? `<div class="drops">Dropa de: ${drops.map(d => `<b>${esc(d.nome)}</b> ${(d.chance / 1000).toFixed(d.chance < 1000 ? 2 : 1).replace(".", ",")}%`).join(" · ")}</div>` : ""}
      ${item.description ? `<div class="drops">${esc(item.description)}</div>` : ""}
    `;
  }

  let chaveCartaoAtual = "";
  let temporizadorEsconder = 0;

  function mostrarCartao(alvo, x, y) {
    if (!ajustes.cartaoAtivo || !dados.pronto) return;
    clearTimeout(temporizadorEsconder);
    const chave = JSON.stringify(alvo);
    if (chave !== chaveCartaoAtual) {
      const html = alvo.tipo === "poke" ? Cartao.htmlPoke(alvo.dados, acharEspecie(alvo.dados)) : htmlCartaoItem(alvo.dados);
      if (!html) return esconderCartao();
      cartao.innerHTML = html;
      cartao.classList.toggle("shiny", alvo.tipo === "poke" && !!alvo.dados.shiny);
      chaveCartaoAtual = chave;
    }
    const largura = cartao.offsetWidth || 300;
    const altura = cartao.offsetHeight || 260;
    const margem = 16;
    let esquerda = x - largura - margem;
    if (esquerda < 8) {
      esquerda = x + margem + 244 + 10;
      if (esquerda + largura > window.innerWidth - 8) esquerda = Math.max(8, x + margem);
    }
    let topo = y + 14;
    if (topo + altura > window.innerHeight - 8) topo = Math.max(8, window.innerHeight - altura - 8);
    cartao.style.left = `${Math.round(esquerda)}px`;
    cartao.style.top = `${Math.round(topo)}px`;
    cartao.classList.add("visivel");
  }

  function esconderCartao() {
    clearTimeout(temporizadorEsconder);
    temporizadorEsconder = setTimeout(() => {
      cartao.classList.remove("visivel");
      chaveCartaoAtual = "";
    }, 60);
  }

  function calcularMochila() {
    if (!estadoJogo.inventario || !dados.pronto) return null;
    const linhas = [];
    let totalMark = 0;
    let totalFlint = 0;
    let totalMercado = 0;
    let quantidadeTotal = 0;
    let itensComMercado = 0;
    let totalReservado = 0;
    let totalIgnorado = 0;
    const reservas = calcularReservas();

    for (const entrada of estadoJogo.inventario) {
      const item = dados.itens.get(entrada.itemId);
      const quantidade = entrada.quantity || 0;
      if (!item || quantidade <= 0) continue;
      const destino = destinoDoItem(item);
      const unitario = destino === "nenhum" ? 0 : item.npcPrice || 0;
      const ignorado = !!reservasUsuario.ignorar[item.id];
      const reserva = reservas.get(item.id) || null;
      const reservado = ignorado ? 0 : Math.min(quantidade, reserva ? reserva.qtd : 0);
      const livre = ignorado ? 0 : quantidade - reservado;
      const total = unitario * livre;
      const mercado = precoMercadoDe(item);
      if (destino === "mark") totalMark += total;
      if (destino === "flint") totalFlint += total;
      if (mercado) itensComMercado++;
      if (!ignorado) totalMercado += (mercado || unitario) * livre;
      totalReservado += unitario * reservado;
      if (ignorado) totalIgnorado += unitario * quantidade;
      quantidadeTotal += quantidade;
      linhas.push({ item, quantidade, destino, unitario, total, mercado, reserva, reservado, livre, ignorado });
    }
    linhas.sort((a, b) => b.total - a.total || b.quantidade - a.quantidade);

    const pokesVendaveis = (estadoJogo.pokes || []).filter(p => !p.team && !p.starter && !p.shiny && (p.sellValue || 0) > 0);
    const totalPokes = pokesVendaveis.reduce((soma, p) => soma + (p.sellValue || 0), 0);

    let totalBolas = 0;
    if (estadoJogo.bolas) {
      for (const bola of estadoJogo.bolas.catalog) {
        if (bola.infinite) continue;
        totalBolas += Math.floor(Number(estadoJogo.bolas.counts[String(bola.id)] || 0));
      }
    }

    return {
      linhas, totalMark, totalFlint, totalMercado, quantidadeTotal, itensComMercado,
      totalPokes, quantidadePokes: pokesVendaveis.length, totalBolas, totalReservado, totalIgnorado,
      totalGeral: totalMark + totalFlint
    };
  }

  function valorDeGanhos(ganhos) {
    let valor = 0;
    const lista = [];
    for (const id in ganhos) {
      const item = dados.itens.get(Number(id));
      if (!item) continue;
      const destino = destinoDoItem(item);
      const unitario = destino === "nenhum" ? 0 : item.npcPrice || 0;
      valor += unitario * ganhos[id];
      lista.push({ item, quantidade: ganhos[id], total: unitario * ganhos[id] });
    }
    lista.sort((a, b) => b.total - a.total || b.quantidade - a.quantidade);
    return { valor, lista };
  }

  function atualizarSessao() {
    if (!estadoJogo.inventario) return;
    const agora = {};
    for (const entrada of estadoJogo.inventario) agora[entrada.itemId] = entrada.quantity || 0;
    const momento = Date.now();
    if (!sessao || !sessao.anterior || momento - (sessao.vistoEm || 0) > pausaEntreSessoes) {
      sessao = { inicio: momento, vistoEm: momento, anterior: agora, ganhos: {} };
    } else {
      for (const id in agora) {
        const diferenca = agora[id] - (sessao.anterior[id] || 0);
        if (diferenca > 0) sessao.ganhos[id] = (sessao.ganhos[id] || 0) + diferenca;
      }
      sessao.anterior = agora;
      sessao.vistoEm = momento;
    }
    gravar(chaves.sessao, sessao);
  }

  let temporizadorResumo = 0;
  function salvarResumo() {
    clearTimeout(temporizadorResumo);
    temporizadorResumo = setTimeout(() => {
      const mochila = calcularMochila();
      const ganhos = sessao ? valorDeGanhos(sessao.ganhos) : { valor: 0 };
      const horas = sessao && Date.now() - sessao.inicio >= 5 * 60000 ? (Date.now() - sessao.inicio) / 3600000 : 0;
      gravar(chaves.resumo, {
        atualizadoEm: Date.now(),
        mochila: mochila ? {
          totalMark: mochila.totalMark, totalFlint: mochila.totalFlint, totalMercado: mochila.totalMercado,
          totalPokes: mochila.totalPokes, quantidadeTotal: mochila.quantidadeTotal, tipos: mochila.linhas.length,
          top: mochila.linhas.slice(0, 5).map(l => ({ nome: l.item.name, icone: new URL(urlIconeItem(l.item), location.origin).href, quantidade: l.quantidade, total: l.total }))
        } : null,
        pokes: estadoJogo.pokes ? estadoJogo.pokes.length : null,
        sessao: sessao ? { inicio: sessao.inicio, ganho: ganhos.valor, porHora: horas ? ganhos.valor / horas : 0 } : null,
        shinies: registroShinies.length
      });
    }, 800);
  }

  function versaoMaior(a, b) {
    const pa = String(a).split(".").map(Number);
    const pb = String(b).split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
    }
    return false;
  }

  function versaoInstalada() {
    try {
      return chrome.runtime.getManifest().version;
    } catch (erro) {
      return "0";
    }
  }

  let novidadeAvisada = null;

  function avisarNovidade(info) {
    const aviso = document.createElement("div");
    aviso.className = "aviso novidade-aviso";
    aviso.innerHTML = `<div class="brilho">⬆️</div><div><b>PokeLupa ${esc(info.versao)} disponível</b><span>${esc(info.resumo || "Clique para atualizar.")}</span><button class="botao pequeno" data-acao="abrirAtualizador">Atualizar agora</button></div><button class="fechar-aviso" title="Fechar">✕</button>`;
    aviso.querySelector(".fechar-aviso").addEventListener("click", () => aviso.remove());
    aviso.querySelector("[data-acao]").addEventListener("click", () => aviso.remove());
    areaAvisos.appendChild(aviso);
    setTimeout(() => aviso.remove(), 30000);
  }

  function mostrarNovidade() {
    const faixa = ref("novidade");
    let atual = "0";
    try {
      atual = chrome.runtime.getManifest().version;
    } catch (erro) {}
    const tem = novidade && versaoMaior(novidade.versao, atual);
    faixa.hidden = !tem;
    lancador.classList.toggle("novidade", !!tem);
    if (tem && novidadeAvisada !== novidade.versao) {
      novidadeAvisada = novidade.versao;
      gravar(chaves.novidadeAvisada, novidade.versao);
      avisarNovidade(novidade);
    }
    if (tem) {
      faixa.innerHTML = `<b>Versão ${esc(novidade.versao)} disponível</b><span>${esc(novidade.resumo || "Atualize para ganhar as novidades.")}</span><button class="botao pequeno" data-acao="abrirAtualizador">Atualizar agora</button>`;
    }
  }

  async function carregarBancoClas() {
    const guardado = await ler(chaves.bancoClas);
    if (guardado) bancoClas = guardado.dados;
    if (guardado && Date.now() - (guardado.em || 0) < 60 * 60 * 1000) return;
    try {
      const novo = await fetch(`${enderecoBancoClas}?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json());
      bancoClas = novo;
      gravar(chaves.bancoClas, { dados: novo, em: Date.now() });
      aoMudarDados("banco");
    } catch (erro) {}
  }

  async function verificarVersao(forcar) {
    const guardado = await ler(chaves.novidade);
    if (!forcar && guardado && Date.now() - (guardado.checadoEm || 0) < 10 * 60 * 1000) {
      novidade = guardado;
      mostrarNovidade();
      return;
    }
    try {
      const info = await fetch(`${enderecoVersao}?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json());
      novidade = { versao: info.versao, resumo: info.resumo || "", checadoEm: Date.now() };
      gravar(chaves.novidade, novidade);
      mostrarNovidade();
      return novidade;
    } catch (erro) {
      return null;
    }
  }

  function atualizarStatus() {
    if (!ultimoContato) {
      statusTopo.textContent = dados.pronto ? "Abra a mochila no jogo ou clique em ↻" : "Carregando catálogo…";
      lancador.classList.remove("vivo");
      return;
    }
    statusTopo.textContent = `Dados do jogo ${tempoRelativo(ultimoContato)}`;
    lancador.classList.toggle("vivo", Date.now() - ultimoContato < 5 * 60 * 1000);
  }

  function htmlVazio(titulo, texto, comBotao) {
    return `<div class="vazio">${svgMochila}<b>${esc(titulo)}</b>${esc(texto)}${comBotao ? `<div style="margin-top:14px"><button class="botao" data-acao="atualizar">Buscar dados agora</button></div>` : ""}</div>`;
  }

  function montarMochila() {
    const mochila = calcularMochila();
    if (!mochila) {
      corpo.innerHTML = htmlVazio("Nenhuma mochila lida ainda", "Abra a mochila no jogo uma vez, ou peça os dados direto:", true);
      return;
    }
    const categorias = ["todas", "reservados", ...new Set(mochila.linhas.map(l => l.item.category))];
    const nomeCategoria = c => c === "todas" ? "Todas" : c === "reservados" ? "Não vender" : nomesCategorias[c] || c;
    corpo.innerHTML = `
      <div class="destaque">
        <div class="moeda">${svgLogo}</div>
        <div class="rotulo">Pode vender hoje</div>
        <div class="grande num">${F.formatarNumero(mochila.totalGeral)}<small>gold</small></div>
        <div class="nota-rodape">${F.formatarNumero(mochila.quantidadeTotal)} itens em ${mochila.linhas.length} tipos · já sem o que está reservado</div>
      </div>
      <div class="grade">
        <div class="quadro"><span>Mark (loot)</span><b class="num">${F.formatarCurto(mochila.totalMark)}</b><i>itens aceitos pelo Mark</i></div>
        <div class="quadro"><span>Flint (pedras)</span><b class="num">${F.formatarCurto(mochila.totalFlint)}</b><i>pedras de evolução</i></div>
        <div class="quadro clicavel" data-categoria="reservados"><span>Reservado</span><b class="num">${F.formatarCurto(mochila.totalReservado)}</b><i>clã, craft e itens guardados</i></div>
        <div class="quadro"><span>Pelo mercado</span><b class="num">${F.formatarCurto(mochila.totalMercado)}</b><i>${mochila.itensComMercado ? `${mochila.itensComMercado} itens com preço visto` : "abra o mercado p/ aprender"}</i></div>
      </div>
      ${mochila.totalIgnorado ? `<div class="nota-lateral">${F.formatarCurto(mochila.totalIgnorado)} em itens ignorados ficaram fora da conta.</div>` : ""}
      <div class="ferramentas">
        <input class="busca" data-campo="buscaMochila" placeholder="Buscar item…" value="${esc(visao.buscaMochila)}">
      </div>
      <div class="chips">${categorias.map(c => `<button class="chip ${visao.categoriaMochila === c ? "ativo" : ""}" data-categoria="${esc(c)}">${esc(nomeCategoria(c))}</button>`).join("")}</div>
      <div class="legenda">🔒 guardar (nunca vender) · 🚫 ignorar no valor</div>
      <div class="lista" data-ref-lista="mochila"></div>
    `;
    desenharListaMochila(mochila);
  }

  function desenharListaMochila(mochila) {
    const alvo = corpo.querySelector('[data-ref-lista="mochila"]');
    if (!alvo) return;
    mochila = mochila || calcularMochila();
    if (!mochila) return;
    const busca = semAcento(visao.buscaMochila);
    const maior = mochila.linhas.reduce((m, l) => Math.max(m, l.total), 0) || 1;
    const filtradas = mochila.linhas.filter(l =>
      (visao.categoriaMochila === "todas" ||
        (visao.categoriaMochila === "reservados" ? (l.reserva || l.ignorado) : l.item.category === visao.categoriaMochila)) &&
      (!busca || semAcento(l.item.name).includes(busca))
    );
    if (!filtradas.length) {
      alvo.innerHTML = `<div class="vazio" style="padding:18px">${visao.categoriaMochila === "reservados" ? "Nada reservado ainda. Abra o painel do clã ou o de crafts no jogo, ou use o 🔒 nos itens." : "Nada encontrado."}</div>`;
      return;
    }
    alvo.innerHTML = filtradas.slice(0, 400).map(l => {
      const etiquetas = [];
      if (l.destino === "flint") etiquetas.push('<span class="etiqueta pedra">FLINT</span>');
      if (l.destino === "nenhum") etiquetas.push('<span class="etiqueta nao">SEM VENDA</span>');
      if (l.reserva && !l.ignorado) etiquetas.push(`<span class="etiqueta reserva">${esc(rotuloReserva(l.reserva))}</span>`);
      if (l.ignorado) etiquetas.push('<span class="etiqueta nao">IGNORADO</span>');
      let sub = l.destino === "nenhum" ? `${F.formatarNumero(l.quantidade)} un` : `${F.formatarNumero(l.quantidade)} × ${F.formatarNumero(l.unitario)}`;
      if (l.reservado && l.livre) sub += ` · livre ${F.formatarNumero(l.livre)}`;
      if (l.reservado && !l.livre) sub += " · tudo reservado";
      const direita = l.mercado ? `<span>mercado ${F.formatarCurto(l.mercado * l.livre)}</span>` : `<span>${l.total ? ((l.total / (mochila.totalGeral || 1)) * 100).toFixed(1).replace(".", ",") + "%" : ""}</span>`;
      const guardado = !!reservasUsuario.guardar[l.item.id];
      return `
        <div class="item-linha com-botoes ${l.ignorado ? "apagado" : ""}">
          <div class="icone"><img src="${esc(urlIconeItem(l.item))}" alt="" loading="lazy"></div>
          <div class="meio"><b>${esc(l.item.name)}${etiquetas.join("")}</b><span class="num">${sub}</span></div>
          <div class="fim"><b class="num">${l.total ? F.formatarCurto(l.total) : "—"}</b>${direita}</div>
          <div class="botoes-item">
            <button class="mini ${guardado ? "ligado" : ""}" data-guardar="${l.item.id}" title="${guardado ? "Parar de guardar" : "Guardar: nunca vender este item"}">🔒</button>
            <button class="mini ${l.ignorado ? "ligado" : ""}" data-ignorar="${l.item.id}" title="${l.ignorado ? "Voltar a contar no valor" : "Ignorar no valor da mochila"}">🚫</button>
          </div>
          <div class="fatia"><i style="width:${(l.total / maior * 100).toFixed(1)}%"></i></div>
        </div>`;
    }).join("");
  }

  function analisesDosPokes() {
    return (estadoJogo.pokes || []).map(poke => {
      const especie = acharEspecie(poke);
      return { poke, especie, analise: F.analisarPokemon(poke, especie) };
    });
  }

  const faixasDeQualidade = ["Fraca", "Comum", "Incomum", "Rara", "Épica", "Lendária", "Mítica", "Anciã", "Divina"];
  const coresDeFaixa = { Fraca: "#9aa6b3", Comum: "#63d873", Incomum: "#7fd4ff", Rara: "#b06cff", "Épica": "#f0c040", "Lendária": "#ff8c3c", "Mítica": "#b36bff", "Anciã": "#d4a017", Divina: "#dbefff" };

  function pareceVendavel(x) {
    return !x.poke.team && !x.poke.starter && !x.poke.shiny && !x.poke.locked && x.analise.nota && x.analise.nota.letra === "D";
  }

  function analisesDaFonte() {
    if (visao.fontePokes === "mercado") {
      return pokesMercado.map(poke => {
        const especie = acharEspecie(poke);
        return { poke, especie, analise: F.analisarPokemon(poke, especie), anuncio: true };
      });
    }
    return analisesDosPokes();
  }

  function filtrosAtivos() {
    return visao.buscaPokes || visao.faixasPokes.size || visao.ivMinPokes || visao.ivMaxPokes || visao.qualMinPokes || visao.qualMaxPokes || visao.filtroPokes !== "todos" || visao.ordemInvertida;
  }

  function montarPokes() {
    const mercado = visao.fontePokes === "mercado";
    const fonteVazia = mercado ? !pokesMercado.length : !estadoJogo.pokes;
    const seletorFonte = `
      <div class="alternador">
        <button class="${!mercado ? "ativo" : ""}" data-fonte="meus">Meus Pokémons</button>
        <button class="${mercado ? "ativo" : ""}" data-fonte="mercado">Mercado${pokesMercado.length ? ` <span class="num">${pokesMercado.length}</span>` : ""}</button>
      </div>`;
    if (fonteVazia) {
      corpo.innerHTML = seletorFonte + (mercado
        ? htmlVazio("Nenhum anúncio lido ainda", "Abra o Mercado no jogo, vá em Pokémon e navegue pelas páginas. A PokeLupa lê cada página que você abrir e ranqueia aqui.", false)
        : htmlVazio("Nenhum Pokémon lido ainda", "Abra a mochila ou o time no jogo, ou peça os dados:", true));
      return;
    }
    const todos = analisesDaFonte();
    const contagem = {
      todos: todos.length,
      time: todos.filter(x => x.poke.team).length,
      vender: todos.filter(pareceVendavel).length,
      shiny: todos.filter(x => x.poke.shiny).length
    };
    const mediaNota = todos.length ? Math.round(todos.reduce((s, x) => s + (x.analise.pontos || 0), 0) / todos.length) : 0;
    const melhor = todos.slice().sort((a, b) => (b.analise.pontos || 0) - (a.analise.pontos || 0))[0];
    const chipsFiltro = mercado ? [["todos", "Todos"], ["shiny", "Shiny"]] : [["todos", "Todos"], ["time", "Time"], ["vender", "Pra vender"], ["shiny", "Shiny"]];
    corpo.innerHTML = `
      ${seletorFonte}
      <div class="grade" style="margin-top:8px">
        <div class="quadro"><span>${mercado ? "Anúncios lidos" : "Pokémons"}</span><b class="num">${todos.length}</b><i>${mercado ? `atualizado ${tempoRelativo(pokesMercadoEm)}` : `${contagem.time} no time · ${contagem.shiny} shiny`}</i></div>
        <div class="quadro"><span>Nota média</span><b class="num">${mediaNota}<span class="fraco">/100</span></b><i>${melhor ? `melhor: ${esc(melhor.analise.nome)}` : ""}</i></div>
      </div>
      <div class="ferramentas">
        <input class="busca" data-campo="buscaPokes" list="pokelupa-especies" placeholder="Nome do Pokémon…" value="${esc(visao.buscaPokes)}">
        <datalist id="pokelupa-especies">${dados.nomesEspecies.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
        <select class="busca" data-campo="ordemPokes">
          ${[["nota", "Nota (potencial)"], ["poder", "Poder agora"], ["poder100", "Poder no Nv 100"], ["iv", "IV"], ["qualidade", "Qualidade"], ["nivel", "Nível"], ...(mercado ? [["preco", "Preço"], ["custo", "Custo-benefício"]] : [])].map(([v, t]) => `<option value="${v}" ${visao.ordemPokes === v ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <button class="botao-icone" data-acao="inverterOrdem" title="${visao.ordemInvertida ? "Do pior para o melhor" : "Do melhor para o pior"}">${visao.ordemInvertida ? "↑" : "↓"}</button>
      </div>
      <div class="grade-filtros">
        <label>IV<span><input class="busca curto" type="number" min="6" max="192" data-campo="ivMinPokes" placeholder="mín" value="${esc(visao.ivMinPokes)}"><input class="busca curto" type="number" min="6" max="192" data-campo="ivMaxPokes" placeholder="máx" value="${esc(visao.ivMaxPokes)}"></span></label>
        <label>Qualidade<span><input class="busca curto" type="number" step="0.01" min="0" data-campo="qualMinPokes" placeholder="mín" value="${esc(visao.qualMinPokes)}"><input class="busca curto" type="number" step="0.01" min="0" data-campo="qualMaxPokes" placeholder="máx" value="${esc(visao.qualMaxPokes)}"></span></label>
      </div>
      <div class="chips">
        ${faixasDeQualidade.map(f => `<button class="chip faixa ${visao.faixasPokes.has(f) ? "ativo" : ""}" data-faixa="${esc(f)}" style="--cor-faixa:${coresDeFaixa[f]}">${esc(f)}</button>`).join("")}
      </div>
      <div class="chips">
        ${chipsFiltro.map(([v, t]) => `<button class="chip ${visao.filtroPokes === v ? "ativo" : ""}" data-filtro="${v}">${t} <span class="num">${contagem[v]}</span></button>`).join("")}
        <button class="chip limpar ${filtrosAtivos() ? "" : "apagado"}" data-acao="limparFiltros">✕ Limpar filtros</button>
      </div>
      <div class="lista" data-ref-lista="pokes"></div>
    `;
    desenharListaPokes(todos);
  }

  function desenharListaPokes(todos) {
    const alvo = corpo.querySelector('[data-ref-lista="pokes"]');
    if (!alvo) return;
    todos = todos || analisesDaFonte();
    const busca = semAcento(visao.buscaPokes);
    const numero = texto => {
      const valor = Number(String(texto || "").replace(",", "."));
      return texto !== "" && Number.isFinite(valor) ? valor : null;
    };
    const ivMin = numero(visao.ivMinPokes);
    const ivMax = numero(visao.ivMaxPokes);
    const qualMin = numero(visao.qualMinPokes);
    const qualMax = numero(visao.qualMaxPokes);
    const ordens = {
      nota: x => x.analise.pontos ?? -1,
      poder: x => x.analise.poder ?? -1,
      poder100: x => x.analise.poderNv100 ?? -1,
      iv: x => x.analise.ivTotal ?? -1,
      qualidade: x => x.analise.qualidade ?? -1,
      nivel: x => x.analise.nivel ?? -1,
      preco: x => -(x.poke.price || 0),
      custo: x => x.poke.price ? Math.pow(x.analise.pontos || 0, 3) / x.poke.price : -1
    };
    const filtros = {
      todos: () => true,
      time: x => x.poke.team,
      vender: pareceVendavel,
      shiny: x => x.poke.shiny
    };
    const ordem = ordens[visao.ordemPokes] || ordens.nota;
    const sinal = visao.ordemInvertida ? -1 : 1;
    const lista = todos
      .filter(filtros[visao.filtroPokes] || filtros.todos)
      .filter(x => !busca || semAcento(x.analise.nome).includes(busca))
      .filter(x => !visao.faixasPokes.size || (x.analise.faixa && visao.faixasPokes.has(x.analise.faixa.rotulo)))
      .filter(x => ivMin === null || (x.analise.ivTotal ?? 0) >= ivMin)
      .filter(x => ivMax === null || (x.analise.ivTotal ?? 0) <= ivMax)
      .filter(x => qualMin === null || (x.analise.qualidade ?? 0) >= qualMin)
      .filter(x => qualMax === null || (x.analise.qualidade ?? 0) <= qualMax)
      .sort((a, b) => sinal * (ordem(b) - ordem(a)));
    if (!lista.length) {
      alvo.innerHTML = `<div class="vazio" style="padding:18px">Nenhum Pokémon com esses filtros.</div>`;
      return;
    }
    alvo.innerHTML = lista.slice(0, 300).map((x, posicao) => {
      const { poke, analise, especie } = x;
      const nota = analise.nota || { letra: "?", cor: "#94a3b8" };
      const faixa = analise.faixa || { rotulo: "—", cor: "#94a3b8" };
      const chave = `${x.anuncio ? "m" : "p"}${poke.id ?? analise.nome + analise.nivel + posicao}`;
      const aberto = visao.pokeAberto === chave;
      const sprite = F.urlSprite(especie && (especie.spriteId), poke.shiny);
      const extra = x.anuncio ? (poke.price ? ` · 💲${F.formatarCurto(poke.price)}` : poke.diamantes ? ` · 💎${F.formatarCurto(poke.diamantes)}` : "") : (poke.sellValue ? ` · Mark 💲${F.formatarCurto(poke.sellValue)}` : "");
      return `
        <div class="item-linha poke-linha" data-poke="${esc(chave)}">
          <div class="icone poke">${sprite ? `<img src="${sprite}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</div>
          <div class="meio">
            <b><span class="posicao num">${posicao + 1}º</span> ${esc(analise.nome)}${poke.shiny ? ' <span style="color:var(--ouro)">✦</span>' : ""}${poke.team ? '<span class="etiqueta time">TIME</span>' : ""}${poke.locked ? '<span class="etiqueta nao">🔒</span>' : ""}</b>
            <span class="num">Nv ${analise.nivel} · <span style="color:${faixa.cor}">${esc(faixa.rotulo)} ×${analise.qualidade ? analise.qualidade.toFixed(2) : "?"}</span> · IV ${analise.ivTotal ?? "?"}${extra}</span>
          </div>
          <div class="fim" style="display:flex;gap:8px;align-items:center">
            <div><b class="num">${analise.poder !== null ? F.formatarCurto(analise.poder) : ""}</b><span>poder</span></div>
            <div class="nota-mini" style="color:${nota.cor}">${nota.letra}</div>
          </div>
          ${aberto ? `<div class="expandido"><div class="cartao ${poke.shiny ? "shiny" : ""}">${Cartao.htmlPoke(poke, acharEspecie(poke))}</div></div>` : ""}
        </div>`;
    }).join("");
  }

  function nomeBase(nome) {
    return String(nome).replace(/^(Nightmare|Brave|Hard|Shiny|Elder|Ancient|Enraged|Furious|Dark|Master)\s+/i, "");
  }

  function montarContra() {
    const nomeAlvo = String(visao.buscaContra || "").trim().toLowerCase();
    const especieAlvo = dados.especiesPorNome.get(nomeAlvo) || null;
    let resultado = "";
    if (!nomeAlvo) {
      resultado = `<div class="vazio" style="padding:22px">Digite o Pokémon que você vai enfrentar (o da hunt, do boss ou do ginásio). A PokeLupa simula a luta usando os golpes, os tipos e os atributos de cada um.</div>`;
    } else if (!especieAlvo) {
      resultado = `<div class="vazio" style="padding:22px">Não achei "${esc(visao.buscaContra)}". Escolha um nome da lista.</div>`;
    } else {
      resultado = htmlResultadoContra(especieAlvo);
    }
    corpo.innerHTML = `
      <div class="ferramentas" style="margin-top:0">
        <input class="busca" data-campo="buscaContra" list="pokelupa-especies-contra" placeholder="Contra quem? Ex.: Charizard" value="${esc(visao.buscaContra)}" autocomplete="off">
        <datalist id="pokelupa-especies-contra">${dados.nomesEspecies.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
      </div>
      <div data-ref="resultadoContra">${resultado}</div>
    `;
  }

  function htmlResultadoContra(especieAlvo) {
    const nivelAlvo = especieAlvo.huntLevel > 0 ? especieAlvo.huntLevel : 50;
    const alvoNaHunt = F.montarCombatente(especieAlvo, nivelAlvo);
    const alvoIgual = F.montarCombatente(especieAlvo, 100);
    const fraq = F.fraquezas(especieAlvo.type1, especieAlvo.type2);
    const tiposGolpes = [...new Set(alvoIgual.ataques.map(a => a.type))];

    const meus = analisesDosPokes().map(x => {
      const especie = x.especie;
      if (!especie || !x.poke.stats || x.poke.isDitto) return null;
      const meu = F.montarCombatente(especie, x.poke.level || 1, x.poke.stats, [x.poke.type1 || especie.type1, x.poke.type2 || especie.type2]);
      return { x, especie, resultado: F.avaliarConfronto(meu, alvoNaHunt) };
    }).filter(Boolean).sort((a, b) => b.resultado.pontuacao - a.resultado.pontuacao).slice(0, 8);

    const agrupados = new Map();
    for (const especie of dados.especies.values()) {
      if (especie.pokeId === especieAlvo.pokeId) continue;
      const resultado = F.avaliarConfronto(F.montarCombatente(especie, 100), alvoIgual);
      if (resultado.pontuacao <= 0) continue;
      const chave = `${resultado.pontuacao.toFixed(6)}|${nomeBase(especie.name)}`;
      if (!agrupados.has(chave)) agrupados.set(chave, { especie, resultado, variantes: [] });
      else agrupados.get(chave).variantes.push(especie.name);
    }
    const especies = [...agrupados.values()].sort((a, b) => b.resultado.pontuacao - a.resultado.pontuacao).slice(0, 12);
    const topoMeus = meus.length ? meus[0].resultado.pontuacao : 1;
    const topoEspecies = especies.length ? especies[0].resultado.pontuacao : 1;

    const linhaResultado = (nome, especie, shiny, resultado, detalhe, topo) => {
      const rotulo = F.rotuloVantagem(resultado.abates);
      const rapidez = Math.round(resultado.pontuacao / (topo || 1) * 100);
      const golpe = resultado.meuGolpe;
      const perigo = resultado.golpeDele;
      const sprite = F.urlSprite(especie.spriteId, shiny);
      return `
        <div class="item-linha contra-linha">
          <div class="icone poke">${sprite ? `<img src="${sprite}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</div>
          <div class="meio">
            <b>${esc(nome)}</b>
            <span>${golpe ? `usa <b style="color:${Cartao.corTipo(golpe.tipo)}">${esc(golpe.nome)}</b> (${golpe.poder}${golpe.efetividade !== 1 ? ` · ${String(golpe.efetividade).replace(".", ",")}×` : ""})` : "sem golpe que acerte"}${detalhe ? ` · ${detalhe}` : ""}</span>
            ${perigo ? `<span class="perigo">leva <b style="color:${Cartao.corTipo(perigo.tipo)}">${esc(perigo.nome)}</b>${perigo.efetividade !== 1 ? ` (${String(perigo.efetividade).replace(".", ",")}×)` : ""}</span>` : `<span class="perigo">ele não consegue te acertar</span>`}
          </div>
          <div class="fim" title="Quão boa é a escolha comparada ao 1º da lista (rapidez para derrotar, com desconto se ele cai antes) · ${resultado.abates === Infinity ? "ele não consegue te ferir" : `aguenta ~${Math.max(0, Math.floor(resultado.abates))} dele antes de cair`}">
            <b class="num">${rapidez}%</b>
            <span style="color:${rotulo.cor}">${rotulo.texto}</span>
          </div>
          <div class="fatia"><i style="width:${rapidez}%"></i></div>
        </div>`;
    };

    return `
      <div class="alvo-contra">
        <div class="retrato">${F.urlSprite(especieAlvo.spriteId) ? `<img src="${F.urlSprite(especieAlvo.spriteId)}" alt="" referrerpolicy="no-referrer">` : ""}</div>
        <div>
          <div class="nome">${esc(especieAlvo.name)}</div>
          <div class="sub">${Cartao.htmlTipos([especieAlvo.type1, especieAlvo.type2].filter(Boolean))}${especieAlvo.huntLevel ? `<span>hunt Nv ${especieAlvo.huntLevel}</span>` : ""}</div>
          <div class="fraquezas" style="margin-top:6px"><em>Fraco a</em>${[...fraq.x4.map(t => `<span class="mini-tipo x4" style="background:${Cartao.corTipo(t)}">${esc(F.nomesTipos[t])} 4×</span>`), ...fraq.x2.map(t => `<span class="mini-tipo" style="background:${Cartao.corTipo(t)}">${esc(F.nomesTipos[t])}</span>`)].join("") || '<span class="fraco">nada</span>'}</div>
          <div class="fraquezas"><em>Ataca com</em>${tiposGolpes.map(t => `<span class="mini-tipo" style="background:${Cartao.corTipo(t)}">${esc(F.nomesTipos[t] || t)}</span>`).join("") || '<span class="fraco">—</span>'}</div>
        </div>
      </div>
      <div class="nota-lateral">% = quão boa é a escolha (100% = a melhor da lista): conta a rapidez para derrotar e desconta quem cai antes. Etiqueta = quanto aguenta.</div>
      <div class="secao">Seus melhores contra ele</div>
      ${meus.length ? `<div class="lista">${meus.map(m => linhaResultado(m.x.analise.nome, m.especie, m.x.poke.shiny, m.resultado, `Nv ${m.x.poke.level}${m.x.poke.team ? " · time" : ""}`, topoMeus)).join("")}</div>` : `<div class="vazio" style="padding:14px">Abra a mochila no jogo para eu conhecer seus Pokémons.</div>`}
      <div class="secao">Melhores espécies do jogo</div>
      <div class="nota-lateral">Comparando todos no Nv 100, IV médio e qualidade 1,00.</div>
      <div class="lista">${especies.map(e => linhaResultado(e.especie.name + (e.variantes.length ? ` (+${e.variantes.length})` : ""), e.especie, false, e.resultado, esc(nomesRaridade[e.especie.rarity] || ""), topoEspecies)).join("")}</div>
    `;
  }

  function montarSessao() {
    const ganhos = sessao ? valorDeGanhos(sessao.ganhos) : { valor: 0, lista: [] };
    const decorrido = sessao ? Date.now() - sessao.inicio : 0;
    const horas = decorrido / 3600000;
    const confiavel = decorrido >= 5 * 60000;
    const porHora = sessao && confiavel ? ganhos.valor / horas : 0;
    corpo.innerHTML = `
      <div class="destaque">
        <div class="moeda">${svgLogo}</div>
        <div class="rotulo">Loot por hora</div>
        <div class="grande num">${confiavel ? F.formatarNumero(porHora) : "…"}<small>${confiavel ? "gold/h" : "medindo (5 min)"}</small></div>
        <div class="nota-rodape">${sessao ? `Sessão de ${duracao(decorrido)} · ${F.formatarNumero(ganhos.valor)} gold em loot` : "A sessão começa na primeira leitura da mochila."}</div>
      </div>
      <div class="explica" style="margin-top:8px">A sessão compara sua mochila de agora com a do começo e soma só o que entrou. Vender não atrapalha. Se ficar 2 h sem abrir o jogo, uma nova sessão começa sozinha.</div>
      <div class="grade">
        <div class="quadro"><span>Itens ganhos</span><b class="num">${F.formatarNumero(ganhos.lista.reduce((s, l) => s + l.quantidade, 0))}</b><i>${ganhos.lista.length} tipos diferentes</i></div>
        <div class="quadro"><span>Shinies vistos</span><b class="num">${registroShinies.length}</b><i>${registroShinies[0] ? `último ${tempoRelativo(registroShinies[0].em)}` : "nenhum ainda"}</i></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="botao" data-acao="novaSessao" title="Apaga o loot contado e começa a medir de novo a partir de agora">Zerar sessão</button>
        <button class="botao secundario" data-acao="atualizar">Ler mochila agora</button>
      </div>
      <div class="secao">Loot da sessão</div>
      <div class="lista">
        ${ganhos.lista.length ? ganhos.lista.slice(0, 120).map(l => `
          <div class="item-linha">
            <div class="icone"><img src="${esc(urlIconeItem(l.item))}" alt="" loading="lazy"></div>
            <div class="meio"><b>${esc(l.item.name)}</b><span class="num">+${F.formatarNumero(l.quantidade)}</span></div>
            <div class="fim"><b class="num">${l.total ? F.formatarCurto(l.total) : "—"}</b><span>${l.total && confiavel ? F.formatarCurto(l.total / horas) + "/h" : ""}</span></div>
          </div>`).join("") : `<div class="vazio" style="padding:18px">Continue caçando: os itens novos aparecem aqui sempre que o jogo atualizar a mochila.</div>`}
      </div>
      ${registroShinies.length ? `<div class="secao">Shinies <button class="chip limpar" data-acao="limparShinies" style="margin-left:auto">✕ Limpar</button></div><div class="lista">${registroShinies.slice(0, 30).map(s => `
        <div class="item-linha">
          <div class="icone" style="color:var(--ouro);font-size:18px">✦</div>
          <div class="meio"><b>${esc(s.nome || "Shiny")}</b><span>${s.nivel ? `Nv ${s.nivel} · ` : ""}${esc(new Date(s.em).toLocaleString("pt-BR"))}</span></div>
          <div class="fim"><span>${tempoRelativo(s.em)}</span></div>
        </div>`).join("")}</div>` : ""}
    `;
  }

  const nomesClas = {
    ironhard: "Ironhard", naturia: "Naturia", seavell: "Seavell", malefic: "Malefic", orebound: "Orebound",
    psycraft: "Psycraft", raibolt: "Raibolt", volcanic: "Volcanic", gardestrike: "Gardestrike", wingeon: "Wingeon"
  };
  const nomesRaridade = { COMMON: "comum", UNCOMMON: "incomum", RARE: "raro", EPIC: "épico", LEGENDARY: "lendário", MYTHICAL: "mítico" };

  function missaoCapturadaComoBanco() {
    if (!infoCla || !infoCla.cla || !infoCla.tarefa || !infoCla.tarefa.rank || !Array.isArray(infoCla.tarefa.capturar)) return null;
    const t = infoCla.tarefa;
    return {
      cla: infoCla.cla,
      rank: Number(t.rank),
      nome: t.nome || null,
      nivel: t.nivel || null,
      itens: t.itens.map(i => ({ id: i.id, nome: i.nome, qtd: i.precisa })),
      capturar: (t.capturar || []).map(c => ({ id: c.id, nome: c.nome, qtd: c.precisa })),
      derrotar: (t.derrotar || []).map(d => ({ tipo: d.tipo, qtd: d.precisa }))
    };
  }

  function missaoFaltaNoBanco() {
    const minha = missaoCapturadaComoBanco();
    if (!minha) return null;
    const noBanco = bancoClas && bancoClas.clas && bancoClas.clas[minha.cla] && bancoClas.clas[minha.cla][String(minha.rank)];
    const resumo = m => JSON.stringify([m.itens.map(i => [i.id, i.qtd]), m.capturar.map(c => [c.id, c.qtd]), m.derrotar.map(d => [d.tipo, d.qtd])]);
    if (noBanco && resumo(noBanco) === resumo(minha)) return null;
    return minha;
  }

  function linkContribuir(missao) {
    const titulo = `[missão] ${nomesClas[missao.cla] || missao.cla} rank ${missao.rank}`;
    const corpoIssue = `Missão enviada pela extensão PokeLupa.\n\n\`\`\`json\n${JSON.stringify(missao, null, 2)}\n\`\`\`\n`;
    return `https://github.com/SkymerLight/pokelupa/issues/new?title=${encodeURIComponent(titulo)}&body=${encodeURIComponent(corpoIssue)}`;
  }

  function htmlMissao(rank, missao, destaque) {
    const partes = [];
    for (const i of missao.itens || []) {
      const item = dados.itens.get(i.id);
      const tem = quantidadeNaMochila(i.id);
      partes.push(`<div class="req"><img src="${esc(item ? urlIconeItem(item) : "")}" alt=""><span>${esc(i.nome)}</span><b class="num" style="color:${tem >= i.qtd ? "var(--verde)" : "var(--texto)"}">${F.formatarCurto(Math.min(tem, i.qtd))}/${F.formatarCurto(i.qtd)}</b></div>`);
    }
    for (const c of missao.capturar || []) partes.push(`<div class="req"><span class="req-ico">🎯</span><span>Capturar ${esc(c.nome)}</span><b class="num">${c.qtd}</b></div>`);
    for (const d of missao.derrotar || []) partes.push(`<div class="req"><span class="mini-tipo" style="background:${Cartao.corTipo(d.tipo)}">${esc(F.nomesTipos[d.tipo] || d.tipo)}</span><span>Derrotar</span><b class="num">${F.formatarCurto(d.qtd)}</b></div>`);
    return `
      <div class="missao ${destaque ? "atual" : ""}">
        <div class="missao-topo"><b>Rank ${rank}${missao.nome ? ` · ${esc(missao.nome)}` : ""}</b><span>${missao.nivel ? `Nv ${missao.nivel}+` : ""}${destaque ? " · seu próximo" : ""}</span></div>
        ${partes.join("") || '<div class="fraco" style="font-size:11.5px">Sem requisitos de item.</div>'}
      </div>`;
  }

  function htmlSecaoCla() {
    const meuCla = infoCla && infoCla.cla;
    const clasBanco = (bancoClas && bancoClas.clas) || {};
    const claVisto = visao.claVisto || meuCla || Object.keys(clasBanco)[0] || "psycraft";
    const ranksBanco = clasBanco[claVisto] || {};
    const minha = missaoCapturadaComoBanco();
    const ranks = {};
    for (const r in ranksBanco) ranks[r] = ranksBanco[r];
    if (minha && minha.cla === claVisto && !ranks[String(minha.rank)]) ranks[String(minha.rank)] = minha;
    const faltando = missaoFaltaNoBanco();
    const numeros = Object.keys(ranks).map(Number).sort((a, b) => a - b);
    const rankAtual = infoCla && infoCla.cla === claVisto && infoCla.tarefa ? Number(infoCla.tarefa.rank) : null;
    const conhecidos = Object.keys(clasBanco).reduce((s, c) => s + Object.keys(clasBanco[c]).length, 0);
    return `
      <div class="ferramentas" style="margin-top:0">
        <select class="busca" data-campo="claVisto" style="flex:1">
          ${Object.keys(nomesClas).map(c => `<option value="${c}" ${c === claVisto ? "selected" : ""}>${nomesClas[c]}${c === meuCla ? " (seu)" : ""} · ${Object.keys(clasBanco[c] || {}).length}/4 ranks</option>`).join("")}
        </select>
      </div>
      ${meuCla ? "" : `<div class="nota-lateral">Abra a janela de <b>Clãs</b> no jogo uma vez para a PokeLupa saber seu clã e sua próxima missão.</div>`}
      ${numeros.length ? numeros.map(r => htmlMissao(r, ranks[r], r === rankAtual)).join("") : `<div class="vazio" style="padding:14px">Ninguém enviou as missões de ${esc(nomesClas[claVisto])} ainda.</div>`}
      ${meuCla === claVisto ? `<div class="alternar" style="border:0;padding-top:6px"><div><b>Guardar itens dos próximos ranks</b><span>Além do próximo rank, reserva os itens dos ranks seguintes que estão no banco.</span></div><button class="chave ${reservasUsuario.proximosRanks ? "ligada" : ""}" data-reserva-alternar="proximosRanks"></button></div>` : ""}
      ${faltando ? `
        <div class="contribuir">
          <b>Sua missão de ${esc(nomesClas[faltando.cla])} rank ${faltando.rank} ainda não está no banco</b>
          <span>Mande para todo mundo ver os itens desse rank. Abre uma página do GitHub com tudo preenchido; é só clicar em "Create". Vai só a missão, nada da sua conta.</span>
          <a class="botao" href="${esc(linkContribuir(faltando))}" target="_blank" rel="noopener">Enviar missão</a>
        </div>` : ""}
      <div class="nota-lateral">O jogo só mostra a missão do seu próximo rank, então o banco é montado por quem usa a PokeLupa. ${conhecidos} missões conhecidas até agora.</div>
    `;
  }

  function htmlLinhaReserva(item, qtd, detalhe, tem) {
    if (!item) return "";
    const completo = tem !== undefined && tem >= qtd;
    return `
      <div class="item-linha">
        <div class="icone"><img src="${esc(urlIconeItem(item))}" alt="" loading="lazy"></div>
        <div class="meio"><b>${esc(item.name)}</b><span>${esc(detalhe)}</span></div>
        <div class="fim"><b class="num" style="color:${completo ? "var(--verde)" : "var(--texto)"}">${tem !== undefined ? `${F.formatarCurto(Math.min(tem, qtd))}/` : ""}${F.formatarCurto(qtd)}</b><span>${completo ? "completo" : "guardar"}</span></div>
      </div>`;
  }

  function quantidadeNaMochila(id) {
    const entrada = (estadoJogo.inventario || []).find(e => e.itemId === Number(id));
    return entrada ? entrada.quantity : 0;
  }

  function montarCla() {
    corpo.innerHTML = `
      <div class="explica">Os itens da missão do seu próximo rank ficam marcados como <b>não vender</b>: saem do valor da mochila e ganham um aviso na Loja do Mark.</div>
      <div class="secao">Missões</div>
      ${htmlSecaoCla()}
    `;
  }

  function montarProfissao() {
    const ativas = berriesAtivas();
    const unidades = Math.max(1, Number(reservasUsuario.unidadesCraft) || 1);
    const listaBerries = receitas ? Object.keys(receitas).map(id => ({ id, item: dados.itens.get(Number(id)) })).filter(b => b.item).sort((a, b) => a.item.name.localeCompare(b.item.name)) : [];
    const escolhidasManual = Object.keys(reservasUsuario.berries).some(id => reservasUsuario.berries[id]);
    const ingredientes = new Map();
    for (const id of ativas) {
      const item = dados.itens.get(Number(id));
      const selvagem = item ? /^wild\s/i.test(item.name) : false;
      const erva = selvagem ? ervas.selvagem : ervas.comum;
      ingredientes.set(erva, (ingredientes.get(erva) || 0) + ervas.porUnidade * unidades);
      for (const ing of receitas[id]) ingredientes.set(ing.id, (ingredientes.get(ing.id) || 0) + ing.qtd * unidades);
    }
    corpo.innerHTML = `
      <div class="explica">Os ingredientes das berries que você crafta ficam marcados como <b>não vender</b>: saem do valor da mochila e ganham um aviso na Loja do Mark.</div>
      <div class="secao">Craft de berries</div>
      ${receitas ? `
        <div class="ferramentas" style="margin-top:0">
          <span class="rotulo-campo">Guardar para</span>
          <input class="busca curto" type="number" min="1" data-campo="unidadesCraft" value="${unidades}">
          <span class="fraco">unidades de cada berry</span>
        </div>
        <div class="nota-lateral">${escolhidasManual ? "Usando as berries que você marcou abaixo." : craftLiberadas.length ? `Usando as ${craftLiberadas.length} receitas que você já liberou (abra o painel de crafts para atualizar).` : "Marque as berries que você crafta, ou abra o painel de crafts no jogo para detectar as liberadas."}</div>
        <input class="busca" data-campo="buscaBerry" placeholder="Buscar berry… (ex.: occa)" value="${esc(visao.buscaBerry)}" style="width:100%;margin-bottom:8px">
        <div class="chips berries">${listaBerries.map(b => {
          const marcada = escolhidasManual ? !!reservasUsuario.berries[b.id] : ativas.includes(b.id);
          const escondida = visao.buscaBerry && !semAcento(b.item.name).includes(semAcento(visao.buscaBerry));
          return `<button class="chip ${marcada ? "ativo" : ""}" data-berry="${b.id}" ${escondida ? "hidden" : ""}>${esc(b.item.name)}</button>`;
        }).join("")}</div>
        ${escolhidasManual ? `<button class="botao secundario pequeno" data-acao="berriesAutomaticas">Voltar para automático</button>` : ""}
        <div class="secao">Ingredientes para guardar</div>
        ${ingredientes.size ? `<div class="lista">${[...ingredientes].sort((a, b) => b[1] - a[1]).map(([id, qtd]) => htmlLinhaReserva(dados.itens.get(id), qtd, "ingrediente de craft", quantidadeNaMochila(id))).join("")}</div>` : `<div class="vazio" style="padding:14px">Nenhuma berry selecionada.</div>`}
      ` : `<div class="vazio" style="padding:16px">Lendo as receitas do jogo… entre no mapa e espere alguns segundos.</div>`}
    `;
  }

  function htmlAlternar(chave, titulo, descricao) {
    return `<div class="alternar"><div><b>${esc(titulo)}</b><span>${esc(descricao)}</span></div><button class="chave ${ajustes[chave] ? "ligada" : ""}" data-alternar="${chave}" aria-pressed="${ajustes[chave]}"></button></div>`;
  }

  function montarAjustes() {
    const quantidadeMercado = Object.keys(precosMercado).length;
    corpo.innerHTML = `
      ${htmlAlternar("cartaoAtivo", "Cartão ao passar o mouse", "Mostra IV, qualidade e nota ao passar o mouse em Pokémons e itens.")}
      ${htmlAlternar("alertaShiny", "Alerta de shiny", "Aviso na tela quando um shiny aparece no seu mapa.")}
      ${htmlAlternar("somShiny", "Som do alerta", "Toca um sininho junto com o aviso de shiny.")}
      ${htmlAlternar("lancadorVisivel", "Botão flutuante", "Se desligar, abra o painel com Alt+L.")}
      <div class="secao">Dados</div>
      <div class="linhas">
        <div class="linha"><span>Itens no catálogo</span><b class="num">${dados.itens.size}</b></div>
        <div class="linha"><span>Espécies no catálogo</span><b class="num">${dados.especies.size}</b></div>
        <div class="linha"><span>Preços de mercado aprendidos</span><b class="num">${quantidadeMercado}</b></div>
        <div class="linha"><span>Última leitura do jogo</span><b>${tempoRelativo(ultimoContato)}</b></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="botao secundario" data-acao="limparMercado">Esquecer preços de mercado</button>
        <button class="botao secundario" data-acao="resetarLancador">Recentralizar botão</button>
        <button class="botao secundario" data-acao="testarShiny">Testar alerta</button>
      </div>
      <div class="secao">Versão</div>
      <div class="linhas">
        <div class="linha"><span>Instalada</span><b class="num">${esc(versaoInstalada())}</b></div>
        <div class="linha"><span>Mais nova no site</span><b class="num">${novidade ? esc(novidade.versao) : "—"}</b></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="botao" data-acao="verificarVersao">Verificar atualização</button>
        <button class="botao secundario" data-acao="abrirAtualizador">Abrir atualizador</button>
      </div>
      <div class="secao">Apoie o projeto</div>
      <div class="apoio-grande">
        <a class="botao pix" href="https://pixie.gg/skymerlight" target="_blank" rel="noopener">${svgPix} Doar com Pix</a>
        <button class="botao discord" data-acao="copiarDiscord">${svgDiscord} Discord: Skymer#9220</button>
      </div>
      <div class="secao">Como funciona</div>
      <div class="drops" style="font-size:12px;line-height:1.5">
        A PokeLupa só lê o que o jogo já manda para o seu navegador (mochila, Pokémons e catálogo). Nada é enviado para fora e nenhuma ação é feita por você.
        IVs por atributo são deduzidos da fórmula do jogo: <b>stat = nível/100 × (base + 2·IV) × qualidade^exp</b>, com exp 0,95 para HP/Vel e 0,8 para os outros.
        A nota é o potencial: o poder no Nv 100 em % do melhor exemplar possível da mesma espécie. A qualidade entra duas vezes no poder, por isso pesa quase o dobro do IV.
      </div>
    `;
  }

  function renderizar(forcar) {
    camada.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === visao.aba));
    painel.classList.toggle("aberto", visao.painelAberto);
    lancador.style.display = ajustes.lancadorVisivel && !visao.painelAberto ? "" : "none";
    atualizarStatus();
    if (!visao.painelAberto) return;
    const rolagem = corpo.scrollTop;
    ({ mochila: montarMochila, pokes: montarPokes, sessao: montarSessao, cla: montarCla, profissao: montarProfissao, contra: montarContra, ajustes: montarAjustes }[visao.aba])();
    if (!forcar) corpo.scrollTop = rolagem;
  }

  function aoMudarDados(motivo) {
    const focado = sombra.activeElement;
    if (focado && focado.matches("input") && visao.painelAberto && motivo !== "catalogo") {
      if (visao.aba === "mochila") desenharListaMochila();
      else if (visao.aba === "pokes") desenharListaPokes();
    } else {
      renderizar(motivo === "catalogo");
    }
    salvarResumo();
    enviarMarcacoes();
  }

  function abrirPainel(aberto) {
    visao.painelAberto = aberto ?? !visao.painelAberto;
    if (visao.painelAberto) verificarVersao();
    if (visao.painelAberto) esconderCartao();
    renderizar(true);
  }

  function pedirAoJogo(tipo) {
    window.postMessage({ marca: marcaPainel, tipo }, location.origin);
  }

  function avisar(titulo, texto, tipo) {
    const aviso = document.createElement("div");
    aviso.className = `aviso ${tipo || ""}`;
    aviso.innerHTML = `<div class="brilho">${tipo === "info" ? "ℹ️" : "✨"}</div><div><b>${esc(titulo)}</b><span>${esc(texto)}</span></div>`;
    aviso.addEventListener("click", () => aviso.remove());
    areaAvisos.appendChild(aviso);
    setTimeout(() => {
      aviso.style.transition = "opacity .4s";
      aviso.style.opacity = "0";
      setTimeout(() => aviso.remove(), 450);
    }, tipo === "info" ? 3500 : 9000);
  }

  let contextoSom = null;
  function tocarSino() {
    try {
      contextoSom = contextoSom || new (window.AudioContext || window.webkitAudioContext)();
      const inicio = contextoSom.currentTime;
      [1318.5, 1760, 2093, 2637].forEach((frequencia, indice) => {
        const oscilador = contextoSom.createOscillator();
        const volume = contextoSom.createGain();
        oscilador.type = "triangle";
        oscilador.frequency.value = frequencia;
        const t = inicio + indice * 0.09;
        volume.gain.setValueAtTime(0.0001, t);
        volume.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        oscilador.connect(volume).connect(contextoSom.destination);
        oscilador.start(t);
        oscilador.stop(t + 0.65);
      });
    } catch (erro) {}
  }

  function registrarShiny(info) {
    registroShinies.unshift({ nome: info.nome, nivel: info.nivel, em: Date.now() });
    registroShinies = registroShinies.slice(0, 60);
    gravar(chaves.shinies, registroShinies);
    if (ajustes.alertaShiny) avisar(`${info.nome || "Um shiny"} apareceu!`, info.nivel ? `Nível ${info.nivel} · corre pra capturar` : "Corre pra capturar");
    if (ajustes.somShiny) tocarSino();
    if (visao.aba === "sessao") renderizar(false);
    salvarResumo();
  }

  window.addEventListener("message", evento => {
    if (evento.source !== window || !evento.data || evento.data.marca !== marcaJogo) return;
    const { tipo, dados: carga } = evento.data;
    if (tipo === "passeio") {
      if (!visao.painelAberto || !painel.matches(":hover")) mostrarCartao(carga.alvo, carga.x, carga.y);
      return;
    }
    if (tipo === "passeioFim") {
      esconderCartao();
      return;
    }
    if (tipo === "estado") {
      const mudouInventario = carga.inventario && carga.motivo === "inventory";
      estadoJogo = { pokes: carga.pokes, inventario: carga.inventario, bolas: carga.bolas, atualizadoEm: carga.atualizadoEm };
      if (carga.atualizadoEm) ultimoContato = Math.max(ultimoContato, carga.atualizadoEm);
      if (mudouInventario || (carga.motivo === "pedido" && carga.inventario)) atualizarSessao();
      if (visao.atualizando && (carga.motivo === "inventory" || carga.motivo === "pokes")) {
        visao.atualizando = false;
        camada.querySelector('[data-acao="atualizar"]').classList.remove("girando");
      }
      aoMudarDados();
      return;
    }
    if (tipo === "mercado") {
      const momento = Date.now();
      for (const nome in carga) precosMercado[nome] = { preco: carga[nome], em: momento };
      gravar(chaves.mercado, precosMercado);
      aoMudarDados();
      return;
    }
    if (tipo === "cla") {
      infoCla = { ...carga, em: Date.now() };
      gravar(chaves.cla, infoCla);
      aoMudarDados("cla");
      return;
    }
    if (tipo === "craft") {
      craftLiberadas = carga.liberadas || [];
      gravar(chaves.craft, craftLiberadas);
      aoMudarDados("craft");
      return;
    }
    if (tipo === "mercadoPokes") {
      const porId = new Map(pokesMercado.map(poke => [poke.id, poke]));
      for (const poke of carga) porId.set(poke.id, poke);
      pokesMercado = [...porId.values()].slice(-600);
      pokesMercadoEm = Date.now();
      gravar(chaves.pokesMercado, { lista: pokesMercado, em: pokesMercadoEm });
      if (visao.aba === "pokes" && visao.fontePokes === "mercado") renderizar(false);
      return;
    }
    if (tipo === "receitas") {
      receitas = carga;
      gravar(chaves.receitas, receitas);
      aoMudarDados("receitas");
      return;
    }
    if (tipo === "shiny") {
      registrarShiny(carga);
      return;
    }
    if (tipo === "atualizando" && carga === false) {
      visao.atualizando = false;
      camada.querySelector('[data-acao="atualizar"]').classList.remove("girando");
      avisar("Jogo desconectado", "Entre no jogo (tela do mapa) para ler os dados.", "info");
    }
  });

  camada.addEventListener("click", evento => {
    const alvo = evento.target.closest("[data-acao],[data-aba],[data-categoria],[data-filtro],[data-alternar],[data-guardar],[data-ignorar],[data-berry],[data-faixa],[data-fonte],[data-reserva-alternar],[data-poke]");
    if (!alvo) return;
    if (alvo.dataset.fonte) {
      visao.fontePokes = alvo.dataset.fonte;
      visao.filtroPokes = "todos";
      if (visao.fontePokes === "meus" && ["preco", "custo"].includes(visao.ordemPokes)) visao.ordemPokes = "nota";
      renderizar(true);
      return;
    }
    if (alvo.dataset.reservaAlternar) {
      const chave = alvo.dataset.reservaAlternar;
      reservasUsuario[chave] = !reservasUsuario[chave];
      salvarReservas();
      return;
    }
    if (alvo.dataset.guardar || alvo.dataset.ignorar) {
      const lista = alvo.dataset.guardar ? reservasUsuario.guardar : reservasUsuario.ignorar;
      const id = alvo.dataset.guardar || alvo.dataset.ignorar;
      if (lista[id]) delete lista[id];
      else lista[id] = true;
      salvarReservas();
      return;
    }
    if (alvo.dataset.berry) {
      if (!Object.keys(reservasUsuario.berries).some(id => reservasUsuario.berries[id])) {
        for (const id of berriesAtivas()) reservasUsuario.berries[id] = true;
      }
      const id = alvo.dataset.berry;
      if (reservasUsuario.berries[id]) delete reservasUsuario.berries[id];
      else reservasUsuario.berries[id] = true;
      if (!Object.keys(reservasUsuario.berries).length) reservasUsuario.craftAutomatico = false;
      salvarReservas();
      return;
    }
    if (alvo.dataset.faixa) {
      const faixa = alvo.dataset.faixa;
      if (visao.faixasPokes.has(faixa)) visao.faixasPokes.delete(faixa);
      else visao.faixasPokes.add(faixa);
      alvo.classList.toggle("ativo", visao.faixasPokes.has(faixa));
      desenharListaPokes();
      return;
    }
    if (alvo.dataset.aba) {
      visao.aba = alvo.dataset.aba;
      renderizar(true);
      corpo.scrollTop = 0;
      return;
    }
    if (alvo.dataset.categoria) {
      visao.categoriaMochila = alvo.dataset.categoria;
      corpo.querySelectorAll("[data-categoria]").forEach(b => b.classList.toggle("ativo", b === alvo));
      desenharListaMochila();
      return;
    }
    if (alvo.dataset.filtro) {
      visao.filtroPokes = alvo.dataset.filtro;
      corpo.querySelectorAll("[data-filtro]").forEach(b => b.classList.toggle("ativo", b === alvo));
      desenharListaPokes();
      return;
    }
    if (alvo.dataset.poke) {
      visao.pokeAberto = visao.pokeAberto === alvo.dataset.poke ? null : alvo.dataset.poke;
      desenharListaPokes();
      return;
    }
    if (alvo.dataset.alternar) {
      const chave = alvo.dataset.alternar;
      ajustes[chave] = !ajustes[chave];
      gravar(chaves.ajustes, ajustes);
      renderizar(false);
      return;
    }
    switch (alvo.dataset.acao) {
      case "fechar":
        abrirPainel(false);
        break;
      case "atualizar":
        visao.atualizando = true;
        camada.querySelector('[data-acao="atualizar"]').classList.add("girando");
        pedirAoJogo("atualizar");
        setTimeout(() => {
          visao.atualizando = false;
          camada.querySelector('[data-acao="atualizar"]').classList.remove("girando");
        }, 6000);
        break;
      case "novaSessao":
        sessao = null;
        gravar(chaves.sessao, null);
        atualizarSessao();
        renderizar(false);
        salvarResumo();
        break;
      case "abrirAtualizador":
        try {
          chrome.runtime.sendMessage({ tipo: "abrirAtualizador" });
        } catch (erro) {
          avisar("Recarregue a página", "A extensão foi atualizada por fora; recarregue a aba do jogo.", "info");
        }
        break;
      case "verificarVersao":
        verificarVersao(true).then(info => {
          if (!info) avisar("Sem conexão", "Não consegui falar com o site da PokeLupa.", "info");
          else if (versaoMaior(info.versao, versaoInstalada())) avisar(`Versão ${info.versao} disponível`, "Clique em Atualizar agora no topo do painel.", "info");
          else avisar("Tudo em dia", `Você já está na versão mais nova (${versaoInstalada()}).`, "info");
          renderizar(false);
        });
        break;
      case "copiarDiscord":
        try {
          navigator.clipboard.writeText("Skymer#9220");
          avisar("Discord copiado", "Skymer#9220 — cole na busca de amigos do Discord.", "info");
        } catch (erro) {
          avisar("Meu Discord", "Skymer#9220", "info");
        }
        break;
      case "limparShinies":
        registroShinies = [];
        gravar(chaves.shinies, registroShinies);
        renderizar(false);
        salvarResumo();
        break;
      case "limparFiltros":
        visao.buscaPokes = "";
        visao.faixasPokes = new Set();
        visao.ivMinPokes = visao.ivMaxPokes = visao.qualMinPokes = visao.qualMaxPokes = "";
        visao.filtroPokes = "todos";
        visao.ordemInvertida = false;
        renderizar(false);
        break;
      case "inverterOrdem":
        visao.ordemInvertida = !visao.ordemInvertida;
        renderizar(false);
        break;
      case "berriesAutomaticas":
        reservasUsuario.berries = {};
        reservasUsuario.craftAutomatico = true;
        salvarReservas();
        break;
      case "limparMercado":
        precosMercado = {};
        gravar(chaves.mercado, precosMercado);
        renderizar(false);
        break;
      case "resetarLancador":
        ajustes.posicaoLancador = null;
        gravar(chaves.ajustes, ajustes);
        posicionarLancador();
        break;
      case "testarShiny":
        if (ajustes.alertaShiny) avisar("Pikachu apareceu! (teste)", "É assim que o alerta aparece.");
        if (ajustes.somShiny) tocarSino();
        break;
    }
  });

  let temporizadorUnidades = 0;

  function salvarReservas() {
    gravar(chaves.reservas, reservasUsuario);
    renderizar(false);
    salvarResumo();
    enviarMarcacoes();
  }

  camada.addEventListener("input", evento => {
    const campo = evento.target;
    if (campo.dataset.campo === "buscaMochila") {
      visao.buscaMochila = campo.value;
      desenharListaMochila();
    } else if (campo.dataset.campo === "buscaPokes") {
      visao.buscaPokes = campo.value;
      desenharListaPokes();
    } else if (campo.dataset.campo === "ordemPokes") {
      visao.ordemPokes = campo.value;
      desenharListaPokes();
    } else if (campo.dataset.campo === "buscaBerry") {
      visao.buscaBerry = campo.value;
      const termo = semAcento(campo.value);
      corpo.querySelectorAll("[data-berry]").forEach(botao => { botao.hidden = !!termo && !semAcento(botao.textContent).includes(termo); });
    } else if (campo.dataset.campo === "buscaContra") {
      visao.buscaContra = campo.value;
      const especie = dados.especiesPorNome.get(campo.value.trim().toLowerCase());
      const saida = corpo.querySelector('[data-ref="resultadoContra"]');
      if (saida && (especie || !campo.value.trim())) saida.innerHTML = especie ? htmlResultadoContra(especie) : "";
    } else if (["ivMinPokes", "ivMaxPokes", "qualMinPokes", "qualMaxPokes"].includes(campo.dataset.campo)) {
      visao[campo.dataset.campo] = campo.value;
      desenharListaPokes();
    } else if (campo.dataset.campo === "unidadesCraft") {
      const valor = Math.max(1, Math.floor(Number(campo.value) || 1));
      reservasUsuario.unidadesCraft = valor;
      clearTimeout(temporizadorUnidades);
      temporizadorUnidades = setTimeout(() => salvarReservas(), 500);
    }
  });
  camada.addEventListener("change", evento => {
    if (evento.target.dataset.campo === "claVisto") {
      visao.claVisto = evento.target.value;
      renderizar(false);
      return;
    }
    if (evento.target.dataset.campo === "ordemPokes") {
      visao.ordemPokes = evento.target.value;
      desenharListaPokes();
    }
  });

  ["keydown", "keyup", "keypress"].forEach(tipo => {
    camada.addEventListener(tipo, evento => evento.stopPropagation());
  });

  function posicionarLancador() {
    const posicao = ajustes.posicaoLancador;
    const x = posicao ? Math.min(Math.max(8, posicao.x), window.innerWidth - 58) : window.innerWidth - 66;
    const y = posicao ? Math.min(Math.max(8, posicao.y), window.innerHeight - 58) : Math.round(window.innerHeight * 0.62);
    lancador.style.left = `${x}px`;
    lancador.style.top = `${y}px`;
  }

  let arraste = null;
  lancador.addEventListener("pointerdown", evento => {
    arraste = { inicioX: evento.clientX, inicioY: evento.clientY, x: lancador.offsetLeft, y: lancador.offsetTop, moveu: false };
    lancador.setPointerCapture(evento.pointerId);
  });
  lancador.addEventListener("pointermove", evento => {
    if (!arraste) return;
    const dx = evento.clientX - arraste.inicioX;
    const dy = evento.clientY - arraste.inicioY;
    if (!arraste.moveu && Math.hypot(dx, dy) < 5) return;
    arraste.moveu = true;
    lancador.style.left = `${Math.min(Math.max(8, arraste.x + dx), window.innerWidth - 58)}px`;
    lancador.style.top = `${Math.min(Math.max(8, arraste.y + dy), window.innerHeight - 58)}px`;
  });
  lancador.addEventListener("pointerup", () => {
    if (!arraste) return;
    if (arraste.moveu) {
      ajustes.posicaoLancador = { x: lancador.offsetLeft, y: lancador.offsetTop };
      gravar(chaves.ajustes, ajustes);
    } else {
      abrirPainel();
    }
    arraste = null;
  });
  window.addEventListener("resize", posicionarLancador);

  window.addEventListener("keydown", evento => {
    if (evento.altKey && !evento.ctrlKey && !evento.metaKey && evento.code === "KeyL") {
      evento.preventDefault();
      abrirPainel();
    } else if (evento.key === "Escape" && visao.painelAberto) {
      abrirPainel(false);
    }
  }, true);

  try {
    chrome.runtime.onMessage.addListener((mensagem, remetente, responder) => {
      if (!mensagem) return;
      if (mensagem.tipo === "abrirPainel") {
        if (mensagem.aba) visao.aba = mensagem.aba;
        abrirPainel(true);
        responder({ ok: true });
      } else if (mensagem.tipo === "atualizar") {
        pedirAoJogo("atualizar");
        responder({ ok: true });
      }
    });
    chrome.storage.onChanged.addListener((mudancas, area) => {
      if (area === "local" && mudancas[chaves.novidade] && mudancas[chaves.novidade].newValue) {
        novidade = mudancas[chaves.novidade].newValue;
        mostrarNovidade();
      }
      if (area !== "local" || !mudancas[chaves.ajustes]) return;
      ajustes = { ...ajustesPadrao, ...(mudancas[chaves.ajustes].newValue || {}) };
      renderizar(false);
    });
  } catch (erro) {}

  setInterval(() => verificarVersao(), 30 * 60 * 1000);

  setInterval(() => {
    atualizarStatus();
    if (visao.painelAberto && visao.aba === "sessao") renderizar(false);
  }, 30000);

  (async function iniciar() {
    const [ajustesSalvos, mercadoSalvo, sessaoSalva, shiniesSalvos, reservasSalvas, claSalvo, receitasSalvas, craftSalvo] = await Promise.all([
      ler(chaves.ajustes), ler(chaves.mercado), ler(chaves.sessao), ler(chaves.shinies),
      ler(chaves.reservas), ler(chaves.cla), ler(chaves.receitas), ler(chaves.craft)
    ]);
    reservasUsuario = { ...reservasPadrao, ...(reservasSalvas || {}) };
    novidadeAvisada = (await ler(chaves.novidadeAvisada)) || null;
    infoCla = claSalvo || null;
    receitas = receitasSalvas || null;
    craftLiberadas = Array.isArray(craftSalvo) ? craftSalvo : [];
    const mercadoPokesSalvo = await ler(chaves.pokesMercado);
    if (mercadoPokesSalvo && Date.now() - (mercadoPokesSalvo.em || 0) < 24 * 60 * 60 * 1000) {
      pokesMercado = mercadoPokesSalvo.lista || [];
      pokesMercadoEm = mercadoPokesSalvo.em || 0;
    }
    ajustes = { ...ajustesPadrao, ...(ajustesSalvos || {}) };
    precosMercado = mercadoSalvo || {};
    sessao = sessaoSalva || null;
    registroShinies = (Array.isArray(shiniesSalvos) ? shiniesSalvos : []).filter(s => !/\(teste\)/i.test(s.nome || ""));
    if (Array.isArray(shiniesSalvos) && shiniesSalvos.length !== registroShinies.length) gravar(chaves.shinies, registroShinies);
    posicionarLancador();
    renderizar(true);
    await carregarCatalogo();
    pedirAoJogo("pedirEstado");
    verificarVersao();
    carregarBancoClas();
  })();
})();
