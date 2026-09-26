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

  function guardarCla(dados) {
    if (!dados || typeof dados !== "object" || !("clan" in dados || "nextTask" in dados)) return;
    const tarefa = dados.nextTask || null;
    enviarParaPainel("cla", {
      cla: dados.clan || null,
      rank: dados.clanRank ?? null,
      tarefa: tarefa ? {
        rank: tarefa.rank ?? null,
        nome: tarefa.name || null,
        itens: (tarefa.items || []).map(i => ({ id: i.itemId, nome: i.name, precisa: Number(i.need) || 0, tem: Number(i.have) || 0 }))
      } : null
    });
  }

  function guardarCraft(dados) {
    if (!dados || typeof dados !== "object") return;
    enviarParaPainel("craft", {
      liberadas: Array.isArray(dados.unlocked) ? dados.unlocked : [],
      emAndamento: Array.isArray(dados.crafts) ? dados.crafts.map(c => ({ id: c.id, restantes: c.remaining ?? c.left ?? c.qty ?? null })) : []
    });
  }

  function acharReceitas(texto) {
    const padrao = /\{\d+:\[\{itemId:\d+,qty:[\d.e]+\}(?:,\{itemId:\d+,qty:[\d.e]+\})*\](?:,\d+:\[\{itemId:\d+,qty:[\d.e]+\}(?:,\{itemId:\d+,qty:[\d.e]+\})*\])*\}/g;
    let maior = "";
    for (const achado of texto.match(padrao) || []) if (achado.length > maior.length) maior = achado;
    if (!maior) return null;
    const receitas = {};
    const entrada = /(\d+):\[((?:\{itemId:\d+,qty:[\d.e]+\},?)+)\]/g;
    let pedaco;
    while ((pedaco = entrada.exec(maior))) {
      receitas[pedaco[1]] = [...pedaco[2].matchAll(/itemId:(\d+),qty:([\d.e]+)/g)].map(m => ({ id: Number(m[1]), qtd: Number(m[2]) }));
    }
    return Object.keys(receitas).length >= 5 ? receitas : null;
  }

  async function lerReceitasDoJogo() {
    const enderecos = new Set();
    for (const script of document.querySelectorAll("script[src]")) if (script.src.includes("/_next/static/chunks/")) enderecos.add(script.src);
    for (const recurso of performance.getEntriesByType("resource")) {
      if (recurso.name.includes("/_next/static/chunks/") && recurso.name.endsWith(".js")) enderecos.add(recurso.name);
    }
    for (const endereco of enderecos) {
      try {
        const texto = await fetchOriginal(endereco, { cache: "force-cache" }).then(r => r.text());
        if (!texto.includes("itemId:") || !texto.includes("qty:")) continue;
        const receitas = acharReceitas(texto);
        if (receitas) {
          enviarParaPainel("receitas", receitas);
          return;
        }
      } catch (erro) {}
    }
  }

  if (location.pathname.startsWith("/play")) setTimeout(lerReceitasDoJogo, 6000);

  if (typeof fetchOriginal === "function") {
    window.fetch = function (...argumentos) {
      const resposta = fetchOriginal.apply(this, argumentos);
      try {
        const alvo = typeof argumentos[0] === "string" ? argumentos[0] : (argumentos[0] && argumentos[0].url) || "";
        const metodo = String((argumentos[1] && argumentos[1].method) || "GET").toUpperCase();
        if (alvo.includes("/api/game/market?") && alvo.includes("category=")) {
          resposta.then(r => r.clone().json()).then(guardarPrecosMercado).catch(() => {});
        } else if (/\/api\/game\/clans(\?|$|\/rankup|\/skip)/.test(alvo)) {
          resposta.then(r => r.clone().json()).then(guardarCla).catch(() => {});
        } else if (/\/api\/game\/professions\/craft(\?|$)/.test(alvo) && metodo === "GET") {
          resposta.then(r => r.clone().json()).then(guardarCraft).catch(() => {});
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

  let marcacoes = { reservas: {}, notas: {} };
  let varreduraPendente = false;

  function colocarEstiloDeMarcas() {
    if (document.getElementById("pokelupa-marcas")) return;
    const estilo = document.createElement("style");
    estilo.id = "pokelupa-marcas";
    estilo.textContent = `
      [data-pokelupa-reserva] { position: relative; box-shadow: inset 3px 0 0 #e7c26a; }
      [data-pokelupa-reserva]::after {
        content: attr(data-pokelupa-reserva); position: absolute; right: 8px; top: 4px; pointer-events: none;
        font: 700 10px/1.4 system-ui, sans-serif; letter-spacing: .3px; color: #1b1404; background: #e7c26a;
        padding: 1px 6px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.4); z-index: 2;
      }
      .on[data-pokelupa-reserva], [data-pokelupa-reserva]:has(input:checked) { box-shadow: inset 3px 0 0 #f87171, 0 0 0 1px #f87171; }
      .on[data-pokelupa-reserva]::after, [data-pokelupa-reserva]:has(input:checked)::after { background: #f87171; color: #fff; content: "⚠ " attr(data-pokelupa-reserva); }
      [data-pokelupa-nota] { position: relative; }
      [data-pokelupa-nota]::after {
        content: attr(data-pokelupa-nota); position: absolute; right: 44px; top: 50%; transform: translateY(-50%); pointer-events: none;
        font: 800 12px/1 system-ui, sans-serif; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px;
        border: 1px solid currentColor; background: rgba(0,0,0,.35); z-index: 2;
      }
      [data-pokelupa-letra="S"]::after { color: #ffd166; } [data-pokelupa-letra="A"]::after { color: #4ade80; }
      [data-pokelupa-letra="B"]::after { color: #60a5fa; } [data-pokelupa-letra="C"]::after { color: #fbbf24; }
      [data-pokelupa-letra="D"]::after { color: #f87171; }
    `;
    (document.head || document.documentElement).appendChild(estilo);
  }

  function marcarLinhas() {
    varreduraPendente = false;
    colocarEstiloDeMarcas();
    for (const linha of document.querySelectorAll(".mks-srow")) {
      const fibra = acharFibra(linha);
      const chave = fibra && typeof fibra.key === "string" ? fibra.key.match(/^s-(\d+)$/) : null;
      const reserva = chave ? marcacoes.reservas[chave[1]] : null;
      if (reserva) linha.setAttribute("data-pokelupa-reserva", reserva);
      else linha.removeAttribute("data-pokelupa-reserva");
    }
    for (const linha of document.querySelectorAll("label.mks-row")) {
      const fibra = acharFibra(linha);
      const nota = fibra && fibra.key != null ? marcacoes.notas[String(fibra.key)] : null;
      if (nota) {
        linha.setAttribute("data-pokelupa-nota", nota.letra);
        linha.setAttribute("data-pokelupa-letra", nota.letra);
        linha.title = `PokeLupa: nota ${nota.letra} (${nota.pontos}/100)`;
      } else {
        linha.removeAttribute("data-pokelupa-nota");
        linha.removeAttribute("data-pokelupa-letra");
      }
    }
  }

  function agendarMarcacao() {
    if (varreduraPendente) return;
    varreduraPendente = true;
    setTimeout(marcarLinhas, 120);
  }

  new MutationObserver(mudancas => {
    for (const mudanca of mudancas) {
      if (mudanca.addedNodes.length || mudanca.type === "attributes") {
        agendarMarcacao();
        return;
      }
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  window.addEventListener("message", evento => {
    if (evento.source !== window || !evento.data || evento.data.marca !== marcaPedido) return;
    const pedido = evento.data;
    if (pedido.tipo === "marcacoes") {
      marcacoes = { reservas: pedido.dados?.reservas || {}, notas: pedido.dados?.notas || {} };
      agendarMarcacao();
    } else if (pedido.tipo === "pedirEstado") {
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
