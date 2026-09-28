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
      case "analyzer":
        enviarParaPainel("analisador", {
          segundos: Number(msg.seconds) || 0,
          xp: Number(msg.xpGained) || 0,
          kills: Number(msg.kills) || 0,
          loot: Number(msg.lootGold) || 0,
          capturas: Number(msg.captures) || 0,
          capturasGold: Number(msg.capturesGold) || 0,
          shinies: Number(msg.shinyCaptures) || 0,
          gastos: Number(msg.supplyGold) || 0,
          saldo: Number(msg.balance) || 0,
          itens: Array.isArray(msg.drops) ? msg.drops.map(d => ({ id: d.itemId, qtd: Number(d.qty) || 0, gold: Number(d.gold) || 0 })) : []
        });
        return;
      case "hunt-resume":
        if (msg.slug) enviarParaPainel("huntInicio", { slug: String(msg.slug), nome: msg.name ? String(msg.name) : null });
        return;
      case "field-teleport-city":
        enviarParaPainel("huntFim", { motivo: "cidade" });
        return;
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
          enviarParaPainel("huntFim", { motivo: "desconectou" });
        });
      }
    }

    send(dados) {
      try {
        if (this === socketDoJogo && typeof dados === "string" && dados.includes("hunt")) {
          const pedido = JSON.parse(dados);
          if (pedido && pedido.type === "enter-hunt" && pedido.slug) enviarParaPainel("huntInicio", { slug: String(pedido.slug) });
          else if (pedido && pedido.type === "leave-hunt") enviarParaPainel("huntFim", { motivo: "saiu" });
        }
      } catch (erro) {}
      return super.send(dados);
    }
  }
  window.WebSocket = SocketEspiao;

  function guardarPrecosMercado(dados) {
    if (!dados || typeof dados !== "object") return;
    const anuncios = Array.isArray(dados.listings) ? dados.listings : [];
    const precos = {};
    for (const anuncio of anuncios) {
      if (!anuncio || anuncio.kind === "pokemon" || !anuncio.name || anuncio.offerOnly) continue;
      if (anuncio.currency && String(anuncio.currency).toUpperCase() !== "GOLD") continue;
      const unitario = Number(anuncio.unitPrice) || Number(anuncio.price) || 0;
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
        nivel: tarefa.level ?? null,
        itens: (tarefa.items || []).map(i => ({ id: i.itemId, nome: i.name, precisa: Number(i.need) || 0, tem: Number(i.have) || 0 })),
        capturar: (tarefa.caught || []).map(c => ({ id: c.speciesId, nome: c.name, precisa: Number(c.need) || 0, tem: Number(c.have) || 0 })),
        derrotar: (tarefa.kills || []).map(k => ({ tipo: k.type, precisa: Number(k.need) || 0, tem: Number(k.have) || 0 }))
      } : null
    });
  }

  function guardarPokesDoMercado(dados) {
    const anuncios = dados && Array.isArray(dados.listings) ? dados.listings : [];
    const lista = anuncios.filter(a => a && typeof a.quality === "number").map(a => ({
      id: a.id,
      name: a.name,
      speciesId: a.speciesId,
      level: a.level,
      shiny: !!a.shiny,
      quality: a.quality,
      ivTotal: a.ivTotal,
      power: a.power,
      stats: a.stats ? { ...a.stats } : null,
      type1: a.type1,
      type2: a.type2,
      price: a.offerOnly || (a.currency && String(a.currency).toUpperCase() !== "GOLD") ? 0 : Number(a.price) || 0,
      diamantes: a.currency && String(a.currency).toUpperCase() === "DIAMONDS" ? Number(a.price) || 0 : 0,
      seller: a.seller || a.sellerName || null
    }));
    if (lista.length) enviarParaPainel("mercadoPokes", lista);
  }

  function conflitosDeVenda(corpo) {
    let pedido;
    try {
      pedido = typeof corpo === "string" ? JSON.parse(corpo) : null;
    } catch (erro) {
      return [];
    }
    const itens = pedido && Array.isArray(pedido.items) ? pedido.items : [];
    const conflitos = [];
    for (const venda of itens) {
      const bloqueio = marcacoes.bloqueios[venda.itemId];
      if (!bloqueio) continue;
      const tenho = (estado.inventario || []).find(e => e.itemId === venda.itemId)?.quantity ?? 0;
      const livre = bloqueio.tudo ? 0 : Math.max(0, tenho - bloqueio.qtd);
      if ((Number(venda.qty) || 0) > livre) conflitos.push(`• ${bloqueio.nome}: vendendo ${venda.qty}, ${bloqueio.tudo ? "marcado para guardar" : `reservado ${bloqueio.qtd} (${bloqueio.motivo})`}`);
    }
    return conflitos;
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
      try {
        const destino = typeof argumentos[0] === "string" ? argumentos[0] : (argumentos[0] && argumentos[0].url) || "";
        if (destino.includes("/api/game/shop/sell") && argumentos[1] && argumentos[1].body) {
          const conflitos = conflitosDeVenda(argumentos[1].body);
          const textosConfirmacao = {
            pt: ["PokeLupa: esta venda inclui itens que você reservou.", "Vender mesmo assim?"],
            en: ["PokeLupa: this sale includes items you reserved.", "Sell anyway?"],
            es: ["PokeLupa: esta venta incluye ítems que reservaste.", "¿Vender de todos modos?"]
          }[marcacoes.idioma] || ["PokeLupa: esta venda inclui itens que você reservou.", "Vender mesmo assim?"];
          if (conflitos.length && !window.confirm(`${textosConfirmacao[0]}\n\n${conflitos.join("\n")}\n\n${textosConfirmacao[1]}`)) {
            return Promise.reject(new Error("Venda cancelada pela PokeLupa (itens reservados)"));
          }
        }
      } catch (erro) {}
      const resposta = fetchOriginal.apply(this, argumentos);
      try {
        const alvo = typeof argumentos[0] === "string" ? argumentos[0] : (argumentos[0] && argumentos[0].url) || "";
        const metodo = String((argumentos[1] && argumentos[1].method) || "GET").toUpperCase();
        if (alvo.includes("/api/game/market?") && alvo.includes("category=")) {
          resposta.then(r => r.clone().json()).then(guardarPrecosMercado).catch(() => {});
        } else if (alvo.includes("/api/game/market?") && alvo.includes("browse=pokemon")) {
          resposta.then(r => r.clone().json()).then(guardarPokesDoMercado).catch(() => {});
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
          precoAnuncio: valor.kind === "item" && valor.price && (!valor.currency || String(valor.currency).toUpperCase() === "GOLD") ? Number(valor.unitPrice) || Number(valor.price) : null
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
      const cartaDiaria = elemento.closest(".dk-card");
      if (cartaDiaria) {
        const numero = Number(String(cartaDiaria.querySelector(".dk-card-no")?.textContent || "").replace(/\D/g, ""));
        const nome = cartaDiaria.querySelector(".dk-card-name")?.textContent?.trim() || null;
        if (numero || nome) alvo = { tipo: "especie", dados: { speciesId: numero || null, nome } };
      }
      let atual = elemento;
      for (let subida = 0; atual && subida < 4 && !alvo && !cartaDiaria; subida++) {
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

  let marcacoes = { reservas: {}, notas: {}, bloqueios: {} };
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
      .inv-slot[data-pokelupa-mini] { position: relative; }
      .inv-slot[data-pokelupa-mini]::before {
        content: attr(data-pokelupa-mini); position: absolute; left: 2px; top: 2px; z-index: 3; pointer-events: none;
        font: 800 9px/1 system-ui, sans-serif; padding: 2px 3px; border-radius: 4px; background: #e7c26a; color: #1b1404;
        box-shadow: 0 1px 3px rgba(0,0,0,.5);
      }
      .inv-slot[data-pokelupa-mini-nota]::before {
        content: attr(data-pokelupa-mini-nota); position: absolute; left: 2px; top: 2px; z-index: 3; pointer-events: none;
        font: 800 10px/1 system-ui, sans-serif; width: 14px; height: 14px; display: grid; place-items: center; border-radius: 4px;
        background: rgba(0,0,0,.65); border: 1px solid currentColor;
      }
      .inv-slot[data-pokelupa-mini-nota="S"]::before { color: #ffd166; } .inv-slot[data-pokelupa-mini-nota="A"]::before { color: #4ade80; }
      .inv-slot[data-pokelupa-mini-nota="B"]::before { color: #60a5fa; } .inv-slot[data-pokelupa-mini-nota="C"]::before { color: #fbbf24; }
      .inv-slot[data-pokelupa-mini-nota="D"]::before { color: #f87171; }
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
    for (const celula of document.querySelectorAll(".inv-slot")) {
      const fibra = acharFibra(celula);
      const chave = fibra && typeof fibra.key === "string" ? fibra.key.match(/^([ip])-(\d+)$/) : null;
      const reserva = chave && chave[1] === "i" ? marcacoes.reservas[chave[2]] : null;
      const nota = chave && chave[1] === "p" ? marcacoes.notas[chave[2]] : null;
      if (reserva) celula.setAttribute("data-pokelupa-mini", reserva.startsWith("GUARDAR") ? "🔒" : reserva.startsWith("IGNORADO") ? "—" : reserva.split(" ")[0]);
      else celula.removeAttribute("data-pokelupa-mini");
      if (nota) celula.setAttribute("data-pokelupa-mini-nota", nota.letra);
      else celula.removeAttribute("data-pokelupa-mini-nota");
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

  function bloqueioDaLinha(caixa) {
    const fibra = acharFibra(caixa);
    const chave = fibra && typeof fibra.key === "string" ? fibra.key.match(/^s-(\d+)$/) : null;
    return chave ? marcacoes.bloqueios[chave[1]] : null;
  }

  function desmarcarGuardados() {
    for (const caixa of document.querySelectorAll(".mks-srow.on")) {
      const bloqueio = bloqueioDaLinha(caixa);
      const marcador = caixa.querySelector("input.mks-check");
      if (bloqueio && bloqueio.tudo && marcador) {
        liberarProximoClique = true;
        marcador.click();
      }
    }
  }

  let liberarProximoClique = false;

  document.addEventListener("click", evento => {
    if (!(evento.target instanceof Element)) return;
    if (evento.target.closest(".mks-selall")) {
      setTimeout(desmarcarGuardados, 60);
      setTimeout(desmarcarGuardados, 250);
      return;
    }
    const caixa = evento.target.closest(".mks-srow");
    if (!caixa) return;
    if (liberarProximoClique) {
      liberarProximoClique = false;
      return;
    }
    const bloqueio = bloqueioDaLinha(caixa);
    if (!bloqueio || !bloqueio.tudo || caixa.classList.contains("on")) return;
    if (!evento.target.closest("label, input")) return;
    evento.preventDefault();
    evento.stopPropagation();
    caixa.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 260 });
  }, true);

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
      marcacoes = { reservas: pedido.dados?.reservas || {}, notas: pedido.dados?.notas || {}, bloqueios: pedido.dados?.bloqueios || {}, idioma: pedido.dados?.idioma || "pt" };
      agendarMarcacao();
    } else if (pedido.tipo === "pedirEstado") {
      enviarParaPainel("estado", { ...estado, motivo: "pedido" });
    } else if (pedido.tipo === "lerAnalisador") {
      if (socketDoJogo && socketDoJogo.readyState === SocketOriginal.OPEN) {
        try {
          SocketOriginal.prototype.send.call(socketDoJogo, JSON.stringify({ type: "analyzer-get" }));
        } catch (erro) {}
      }
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
