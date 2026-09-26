(function () {
  if (window.__pokeLupaEscutando) return;
  window.__pokeLupaEscutando = true;

  const marcaEnvio = "pokelupa:jogo";
  const marcaPedido = "pokelupa:painel";
  const SocketOriginal = window.WebSocket;
  const fetchOriginal = window.fetch;

  const estado = {
    pokes: null,
    inventario: null,
    bolas: null,
    atualizadoEm: 0
  };
  let socketDoJogo = null;
  const shiniesAvisados = new Set();

  function enviarParaPainel(tipo, dados) {
    try {
      window.postMessage({ marca: marcaEnvio, tipo, dados }, location.origin);
    } catch (erro) {}
  }

  function limparPoke(p) {
    if (!p || typeof p !== "object") return null;
    return {
      id: p.id,
      name: p.name,
      speciesId: p.speciesId,
      level: p.level,
      shiny: !!p.shiny,
      quality: p.quality,
      ivTotal: p.ivTotal,
      power: p.power,
      stats: p.stats ? { ...p.stats } : null,
      type1: p.type1,
      type2: p.type2,
      team: !!p.team,
      leader: !!p.leader,
      starter: !!p.starter,
      locked: !!(p.locked || p.lock || p.isLocked),
      isDitto: !!p.isDitto,
      formName: p.formName || null,
      sellValue: p.sellValue,
      xp: p.xp
    };
  }

  function juntarPoke(poke) {
    const limpo = limparPoke(poke);
    if (!limpo) return;
    const lista = estado.pokes ? estado.pokes.slice() : [];
    const posicao = lista.findIndex(p => p.id === limpo.id);
    if (posicao >= 0) lista[posicao] = { ...lista[posicao], ...limpo };
    else lista.push(limpo);
    estado.pokes = lista;
  }

  function procurarShiny(objeto, profundidade, achados) {
    if (!objeto || typeof objeto !== "object" || profundidade > 5) return;
    if (Array.isArray(objeto)) {
      for (const item of objeto) procurarShiny(item, profundidade + 1, achados);
      return;
    }
    if (objeto.shiny === true && (objeto.name || objeto.speciesName || objeto.species)) achados.push(objeto);
    for (const chave in objeto) {
      const valor = objeto[chave];
      if (valor && typeof valor === "object") procurarShiny(valor, profundidade + 1, achados);
    }
  }

  const tiposIgnoradosNoShiny = new Set([
    "pokes", "poke-delta", "poke-xp", "poke", "inventory", "balls", "shiny-global", "chat", "dm",
    "trade", "trade-invite", "market", "pvp-state", "pvp-update", "catch-result", "analyzer", "pending"
  ]);

  function tratarMensagem(texto) {
    if (typeof texto !== "string" || texto.length < 8 || texto.charCodeAt(0) !== 123) return;
    let msg;
    try {
      msg = JSON.parse(texto);
    } catch (erro) {
      return;
    }
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "pokes":
        estado.pokes = Array.isArray(msg.list) ? msg.list.map(limparPoke).filter(Boolean) : [];
        break;
      case "poke-delta":
        juntarPoke(msg.poke);
        break;
      case "poke-xp":
        if (estado.pokes && msg.id) {
          estado.pokes = estado.pokes.map(p => p.id === msg.id ? { ...p, level: msg.level ?? p.level, xp: msg.xp ?? p.xp } : p);
        }
        break;
      case "inventory":
        estado.inventario = Array.isArray(msg.items) ? msg.items.map(i => ({ itemId: i.itemId ?? i.id, quantity: Number(i.quantity) || 0 })) : [];
        break;
      case "balls":
        estado.bolas = {
          catalog: (msg.catalog || []).map(b => ({ id: b.id, name: b.name, iconUrl: b.iconUrl, bound: !!b.bound, infinite: !!b.infinite, price: b.price ?? b.priceGold ?? 0 })),
          counts: msg.counts || {}
        };
        break;
      default:
        if (!tiposIgnoradosNoShiny.has(msg.type) && texto.indexOf('"shiny":true') !== -1) {
          const achados = [];
          procurarShiny(msg, 0, achados);
          for (const achado of achados) {
            const chave = String(achado.id ?? achado.uid ?? achado.name) + ":" + msg.type;
            if (shiniesAvisados.has(chave)) continue;
            shiniesAvisados.add(chave);
            if (shiniesAvisados.size > 400) shiniesAvisados.clear();
            enviarParaPainel("shiny", { nome: achado.name || achado.speciesName || achado.species, nivel: achado.level ?? null, origem: msg.type });
          }
        }
        return;
    }
    estado.atualizadoEm = Date.now();
    enviarParaPainel("estado", { ...estado, motivo: msg.type });
  }

  class SocketEspiao extends SocketOriginal {
    constructor(endereco, protocolos) {
      if (protocolos === undefined) super(endereco);
      else super(endereco, protocolos);
      if (String(endereco).includes("idleworld")) {
        socketDoJogo = this;
        this.addEventListener("message", evento => tratarMensagem(evento.data));
        this.addEventListener("close", () => {
          if (socketDoJogo === this) socketDoJogo = null;
        });
      }
    }
  }
  window.WebSocket = SocketEspiao;

  function guardarPrecosMercado(dados) {
    if (!dados || typeof dados !== "object") return;
    const anuncios = Array.isArray(dados.listings) ? dados.listings : [];
    const precos = {};
    for (const anuncio of anuncios) {
      if (!anuncio || anuncio.kind === "pokemon" || !anuncio.name) continue;
      const quantidade = Number(anuncio.quantity) || 1;
      const unitario = Number(anuncio.unitPrice) || (Number(anuncio.price) || 0) / quantidade;
      if (!unitario) continue;
      const chave = String(anuncio.name).toLowerCase();
      if (!precos[chave] || unitario < precos[chave]) precos[chave] = unitario;
    }
    if (Object.keys(precos).length) enviarParaPainel("mercado", precos);
  }

  if (typeof fetchOriginal === "function") {
    window.fetch = function (...argumentos) {
      const resposta = fetchOriginal.apply(this, argumentos);
      try {
        const alvo = typeof argumentos[0] === "string" ? argumentos[0] : (argumentos[0] && argumentos[0].url) || "";
        if (alvo.includes("/api/game/market?") && alvo.includes("category=")) {
          resposta.then(r => r.clone().json()).then(guardarPrecosMercado).catch(() => {});
        }
      } catch (erro) {}
      return resposta;
    };
  }

  function acharFibra(elemento) {
    for (const chave in elemento) {
      if (chave.startsWith("__reactFiber$")) return elemento[chave];
    }
    return null;
  }

  function vindoDoChat(o) {
    if (!o || o.k !== "poke") return null;
    return { name: o.n, shiny: !!o.sh, level: o.lv, type1: o.t1, type2: o.t2, stats: o.st, quality: o.q, ivTotal: o.iv, power: o.pw, isDitto: !!o.dt };
  }

  function parecePoke(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return false;
    if (o.kind && o.kind !== "poke" && o.kind !== "pokemon") return false;
    const temStats = o.stats && typeof o.stats === "object" && typeof o.stats.hp === "number";
    const temIv = typeof o.ivTotal === "number" && typeof o.quality === "number";
    return (temStats || temIv) && (o.name || o.speciesId) && typeof o.level === "number";
  }

  function pareceItem(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return false;
    if (o.kind === "item" && (typeof o.id === "number" || typeof o.refId === "number")) return true;
    return typeof o.itemId === "number" && typeof o.quantity === "number";
  }

  function examinar(valor) {
    const chat = vindoDoChat(valor);
    if (chat) return { tipo: "poke", dados: chat };
    if (parecePoke(valor)) return { tipo: "poke", dados: limparPoke(valor) };
    if (pareceItem(valor)) {
      return {
        tipo: "item",
        dados: {
          id: valor.itemId ?? valor.refId ?? valor.id,
          nome: valor.name || null,
          quantidade: Number(valor.quantity) || 1,
          precoAnuncio: valor.kind === "item" && valor.price ? Number(valor.unitPrice) || Number(valor.price) / (Number(valor.quantity) || 1) : null
        }
      };
    }
    return null;
  }

  function descobrirAlvo(elemento) {
    let fibra = acharFibra(elemento);
    let passos = 0;
    while (fibra && passos < 14) {
      const props = fibra.memoizedProps;
      if (props && typeof props === "object") {
        const direto = examinar(props);
        if (direto) return direto;
        for (const chave in props) {
          if (chave === "children") continue;
          const achado = examinar(props[chave]);
          if (achado) return achado;
        }
      }
      fibra = fibra.return;
      passos++;
    }
    return null;
  }

  let ultimoElemento = null;
  let ultimoAlvo = null;
  let quadroPendente = false;
  let ultimoEvento = null;

  function processarPasseio() {
    quadroPendente = false;
    const evento = ultimoEvento;
    if (!evento) return;
    const elemento = evento.target;
    if (!(elemento instanceof Element) || elemento.closest("#pokelupa-raiz")) return;

    if (elemento !== ultimoElemento) {
      ultimoElemento = elemento;
      let alvo = null;
      let atual = elemento;
      for (let subida = 0; atual && subida < 4 && !alvo; subida++) {
        alvo = descobrirAlvo(atual);
        atual = atual.parentElement;
      }
      if (!alvo) {
        if (ultimoAlvo) enviarParaPainel("passeioFim", null);
        ultimoAlvo = null;
        return;
      }
      ultimoAlvo = alvo;
    }
    if (ultimoAlvo) enviarParaPainel("passeio", { alvo: ultimoAlvo, x: evento.clientX, y: evento.clientY });
  }

  document.addEventListener("mousemove", evento => {
    ultimoEvento = evento;
    if (!quadroPendente) {
      quadroPendente = true;
      requestAnimationFrame(processarPasseio);
    }
  }, { passive: true, capture: true });

  document.addEventListener("mouseleave", () => {
    if (ultimoAlvo) enviarParaPainel("passeioFim", null);
    ultimoAlvo = null;
    ultimoElemento = null;
  });

  window.addEventListener("message", evento => {
    if (evento.source !== window || !evento.data || evento.data.marca !== marcaPedido) return;
    const pedido = evento.data;
    if (pedido.tipo === "pedirEstado") {
      enviarParaPainel("estado", { ...estado, motivo: "pedido" });
    } else if (pedido.tipo === "atualizar") {
      if (socketDoJogo && socketDoJogo.readyState === SocketOriginal.OPEN) {
        for (const tipo of ["inv-get", "balls-get", "pokes-get"]) {
          try {
            socketDoJogo.send(JSON.stringify({ type: tipo }));
          } catch (erro) {}
        }
        enviarParaPainel("atualizando", true);
      } else {
        enviarParaPainel("atualizando", false);
      }
    }
  });
})();
