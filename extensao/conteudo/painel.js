(function () {
  if (window.__pokeLupaPainel) return;
  window.__pokeLupaPainel = true;

  const F = globalThis.PokeLupaFormulas;
  const Cartao = globalThis.PokeLupaCartao;
  const marcaJogo = "pokelupa:jogo";
  const marcaPainel = "pokelupa:painel";
  const chaves = {
    ajustes: "pokelupa:ajustes",
    mercado: "pokelupa:mercado",
    sessao: "pokelupa:sessao",
    resumo: "pokelupa:resumo",
    shinies: "pokelupa:shinies"
  };
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
      <div class="abas" data-ref="abas">
        <button class="aba" data-aba="mochila">Mochila</button>
        <button class="aba" data-aba="pokes">Pokémons</button>
        <button class="aba" data-aba="sessao">Sessão</button>
        <button class="aba" data-aba="analisar">Analisar</button>
        <button class="aba" data-aba="ajustes">Ajustes</button>
      </div>
      <div class="corpo" data-ref="corpo"></div>
      <div class="rodape"><span>Alt+L abre e fecha</span><a href="https://skymerlight.github.io/pokelupa/" target="_blank" rel="noopener" data-ref="linkRepo">PokeLupa</a></div>
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
          sellValue: especie.sellValue, huntLevel: especie.huntLevel
        };
        dados.especies.set(especie.pokeId, enxuta);
        dados.especiesPorNome.set(especie.name.toLowerCase(), enxuta);
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
      dados.nomesEspecies = [...dados.especies.values()].map(e => e.name).sort((a, b) => a.localeCompare(b));
      dados.pronto = true;
      aoMudarDados("catalogo");
    } catch (erro) {
      statusTopo.textContent = "Não consegui ler o catálogo do jogo.";
    }
  }

  function acharEspecie(poke) {
    if (!poke) return null;
    if (poke.isDitto && poke.formName) {
      const forma = dados.especiesPorNome.get(String(poke.formName).toLowerCase());
      if (forma) return forma;
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

    for (const entrada of estadoJogo.inventario) {
      const item = dados.itens.get(entrada.itemId);
      const quantidade = entrada.quantity || 0;
      if (!item || quantidade <= 0) continue;
      const destino = destinoDoItem(item);
      const unitario = destino === "nenhum" ? 0 : item.npcPrice || 0;
      const total = unitario * quantidade;
      const mercado = precoMercadoDe(item);
      if (destino === "mark") totalMark += total;
      if (destino === "flint") totalFlint += total;
      if (mercado) itensComMercado++;
      totalMercado += (mercado || unitario) * quantidade;
      quantidadeTotal += quantidade;
      linhas.push({ item, quantidade, destino, unitario, total, mercado });
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
      totalPokes, quantidadePokes: pokesVendaveis.length, totalBolas,
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
    const categorias = ["todas", ...new Set(mochila.linhas.map(l => l.item.category))];
    corpo.innerHTML = `
      <div class="destaque">
        <div class="moeda">${svgLogo}</div>
        <div class="rotulo">Valor da mochila</div>
        <div class="grande num">${F.formatarNumero(mochila.totalGeral)}<small>gold</small></div>
        <div class="nota-rodape">${F.formatarNumero(mochila.quantidadeTotal)} itens em ${mochila.linhas.length} tipos · vendendo tudo aos NPCs</div>
      </div>
      <div class="grade">
        <div class="quadro"><span>Mark (loot)</span><b class="num">${F.formatarCurto(mochila.totalMark)}</b><i>itens aceitos pelo Mark</i></div>
        <div class="quadro"><span>Flint (pedras)</span><b class="num">${F.formatarCurto(mochila.totalFlint)}</b><i>pedras de evolução</i></div>
        <div class="quadro"><span>Pelo mercado</span><b class="num">${F.formatarCurto(mochila.totalMercado)}</b><i>${mochila.itensComMercado ? `${mochila.itensComMercado} itens com preço visto` : "abra o mercado p/ aprender"}</i></div>
        <div class="quadro"><span>Pokémons à venda</span><b class="num">${F.formatarCurto(mochila.totalPokes)}</b><i>${mochila.quantidadePokes} fora do time</i></div>
      </div>
      <div class="ferramentas">
        <input class="busca" data-campo="buscaMochila" placeholder="Buscar item…" value="${esc(visao.buscaMochila)}">
      </div>
      <div class="chips">${categorias.map(c => `<button class="chip ${visao.categoriaMochila === c ? "ativo" : ""}" data-categoria="${esc(c)}">${esc(c === "todas" ? "Todas" : nomesCategorias[c] || c)}</button>`).join("")}</div>
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
      (visao.categoriaMochila === "todas" || l.item.category === visao.categoriaMochila) &&
      (!busca || semAcento(l.item.name).includes(busca))
    );
    if (!filtradas.length) {
      alvo.innerHTML = `<div class="vazio" style="padding:18px">Nada encontrado.</div>`;
      return;
    }
    alvo.innerHTML = filtradas.slice(0, 400).map(l => {
      const etiqueta = l.destino === "flint" ? '<span class="etiqueta pedra">FLINT</span>' : l.destino === "nenhum" ? '<span class="etiqueta nao">SEM VENDA</span>' : "";
      const sub = l.destino === "nenhum" ? `${F.formatarNumero(l.quantidade)} un` : `${F.formatarNumero(l.quantidade)} × ${F.formatarNumero(l.unitario)}`;
      const mercado = l.mercado ? `<span>mercado ${F.formatarCurto(l.mercado * l.quantidade)}</span>` : `<span>${l.total ? ((l.total / (mochila.totalGeral || 1)) * 100).toFixed(1).replace(".", ",") + "%" : ""}</span>`;
      return `
        <div class="item-linha">
          <div class="icone"><img src="${esc(urlIconeItem(l.item))}" alt="" loading="lazy"></div>
          <div class="meio"><b>${esc(l.item.name)}${etiqueta}</b><span class="num">${sub}</span></div>
          <div class="fim"><b class="num">${l.total ? F.formatarCurto(l.total) : "—"}</b>${mercado}</div>
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

  function montarPokes() {
    if (!estadoJogo.pokes) {
      corpo.innerHTML = htmlVazio("Nenhum Pokémon lido ainda", "Abra a mochila ou o time no jogo, ou peça os dados:", true);
      return;
    }
    const todos = analisesDosPokes();
    const contagem = {
      todos: todos.length,
      time: todos.filter(x => x.poke.team).length,
      vender: todos.filter(x => !x.poke.team && !x.poke.starter && !x.poke.shiny && x.analise.nota && "CD".includes(x.analise.nota.letra)).length,
      shiny: todos.filter(x => x.poke.shiny).length
    };
    const mediaNota = todos.length ? Math.round(todos.reduce((s, x) => s + (x.analise.pontos || 0), 0) / todos.length) : 0;
    const melhor = todos.slice().sort((a, b) => (b.analise.pontos || 0) - (a.analise.pontos || 0))[0];
    corpo.innerHTML = `
      <div class="grade" style="margin-top:0">
        <div class="quadro"><span>Pokémons</span><b class="num">${todos.length}</b><i>${contagem.time} no time · ${contagem.shiny} shiny</i></div>
        <div class="quadro"><span>Nota média</span><b class="num">${mediaNota}<span class="fraco">/100</span></b><i>${melhor ? `melhor: ${esc(melhor.analise.nome)}` : ""}</i></div>
      </div>
      <div class="ferramentas">
        <input class="busca" data-campo="buscaPokes" placeholder="Buscar Pokémon…" value="${esc(visao.buscaPokes)}">
        <select class="busca" data-campo="ordemPokes">
          ${[["nota", "Nota"], ["poder", "Poder"], ["iv", "IV"], ["qualidade", "Qualidade"], ["nivel", "Nível"]].map(([v, t]) => `<option value="${v}" ${visao.ordemPokes === v ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>
      <div class="chips">
        ${[["todos", "Todos"], ["time", "Time"], ["vender", "Pra vender"], ["shiny", "Shiny"]].map(([v, t]) => `<button class="chip ${visao.filtroPokes === v ? "ativo" : ""}" data-filtro="${v}">${t} <span class="num">${contagem[v]}</span></button>`).join("")}
      </div>
      <div class="lista" data-ref-lista="pokes"></div>
    `;
    desenharListaPokes(todos);
  }

  function desenharListaPokes(todos) {
    const alvo = corpo.querySelector('[data-ref-lista="pokes"]');
    if (!alvo) return;
    todos = todos || analisesDosPokes();
    const busca = semAcento(visao.buscaPokes);
    const ordens = {
      nota: x => x.analise.pontos ?? -1,
      poder: x => x.analise.poder ?? -1,
      iv: x => x.analise.ivTotal ?? -1,
      qualidade: x => x.analise.qualidade ?? -1,
      nivel: x => x.analise.nivel ?? -1
    };
    const filtros = {
      todos: () => true,
      time: x => x.poke.team,
      vender: x => !x.poke.team && !x.poke.starter && !x.poke.shiny && x.analise.nota && "CD".includes(x.analise.nota.letra),
      shiny: x => x.poke.shiny
    };
    const lista = todos
      .filter(filtros[visao.filtroPokes] || filtros.todos)
      .filter(x => !busca || semAcento(x.analise.nome).includes(busca))
      .sort((a, b) => ordens[visao.ordemPokes](b) - ordens[visao.ordemPokes](a));
    if (!lista.length) {
      alvo.innerHTML = `<div class="vazio" style="padding:18px">Nenhum Pokémon aqui.</div>`;
      return;
    }
    alvo.innerHTML = lista.slice(0, 300).map(x => {
      const { poke, analise, especie } = x;
      const nota = analise.nota || { letra: "?", cor: "#94a3b8" };
      const faixa = analise.faixa || { rotulo: "—", cor: "#94a3b8" };
      const chave = String(poke.id ?? analise.nome + analise.nivel);
      const aberto = visao.pokeAberto === chave;
      const sprite = F.urlSprite(especie && especie.pokeId, poke.shiny);
      return `
        <div class="item-linha poke-linha" data-poke="${esc(chave)}">
          <div class="icone poke">${sprite ? `<img src="${sprite}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</div>
          <div class="meio">
            <b>${esc(analise.nome)}${poke.shiny ? ' <span style="color:var(--ouro)">✦</span>' : ""}${poke.team ? '<span class="etiqueta time">TIME</span>' : ""}</b>
            <span class="num">Nv ${analise.nivel} · <span style="color:${faixa.cor}">${esc(faixa.rotulo)} ×${analise.qualidade ? analise.qualidade.toFixed(2) : "?"}</span> · IV ${analise.ivTotal ?? "?"}</span>
          </div>
          <div class="fim" style="display:flex;gap:8px;align-items:center">
            <div><b class="num">${analise.poder !== null ? F.formatarCurto(analise.poder) : ""}</b><span>poder</span></div>
            <div class="nota-mini" style="color:${nota.cor}">${nota.letra}</div>
          </div>
          ${aberto ? `<div class="expandido"><div class="cartao ${poke.shiny ? "shiny" : ""}">${Cartao.htmlPoke(poke, acharEspecie(poke))}</div></div>` : ""}
        </div>`;
    }).join("");
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
      <div class="grade">
        <div class="quadro"><span>Itens ganhos</span><b class="num">${F.formatarNumero(ganhos.lista.reduce((s, l) => s + l.quantidade, 0))}</b><i>${ganhos.lista.length} tipos diferentes</i></div>
        <div class="quadro"><span>Shinies vistos</span><b class="num">${registroShinies.length}</b><i>${registroShinies[0] ? `último ${tempoRelativo(registroShinies[0].em)}` : "nenhum ainda"}</i></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="botao" data-acao="novaSessao">Começar nova sessão</button>
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
      ${registroShinies.length ? `<div class="secao">Shinies</div><div class="lista">${registroShinies.slice(0, 30).map(s => `
        <div class="item-linha">
          <div class="icone" style="color:var(--ouro);font-size:18px">✦</div>
          <div class="meio"><b>${esc(s.nome || "Shiny")}</b><span>${s.nivel ? `Nv ${s.nivel} · ` : ""}${esc(new Date(s.em).toLocaleString("pt-BR"))}</span></div>
          <div class="fim"><span>${tempoRelativo(s.em)}</span></div>
        </div>`).join("")}</div>` : ""}
    `;
  }

  function montarAnalisar() {
    corpo.innerHTML = `
      <div class="form" data-ref="formulario">
        <label>Espécie<input list="pokelupa-especies" data-calc="especie" placeholder="Ex.: Geodude" autocomplete="off"></label>
        <datalist id="pokelupa-especies">${dados.nomesEspecies.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
        <div class="seis">
          <label>Nível<input type="number" min="1" data-calc="nivel" placeholder="50"></label>
          <label>Qualidade<input type="number" step="0.01" min="0.5" data-calc="qualidade" placeholder="1.25"></label>
          <label>IV total<input type="number" min="6" max="192" data-calc="ivTotal" placeholder="opcional"></label>
        </div>
        <div class="seis">
          ${F.chavesStats.map(c => `<label>${F.nomesStats[c]}<input type="number" min="1" data-calc="${c}"></label>`).join("")}
        </div>
        <label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:12px;color:var(--texto-2)"><input type="checkbox" data-calc="shiny" style="width:auto;height:auto"> Shiny</label>
      </div>
      <div class="secao">Resultado</div>
      <div data-ref="resultadoCalc"><div class="vazio" style="padding:18px">Preencha espécie, nível, qualidade e os 6 atributos.</div></div>
    `;
  }

  function calcularManual() {
    const form = corpo.querySelector('[data-ref="formulario"]');
    const saida = corpo.querySelector('[data-ref="resultadoCalc"]');
    if (!form || !saida) return;
    const valor = nome => form.querySelector(`[data-calc="${nome}"]`);
    const especie = dados.especiesPorNome.get(String(valor("especie").value).trim().toLowerCase());
    const nivel = Number(valor("nivel").value);
    const qualidade = Number(String(valor("qualidade").value).replace(",", "."));
    const stats = {};
    let completos = true;
    for (const c of F.chavesStats) {
      const n = Number(valor(c).value);
      if (!n) completos = false;
      stats[c] = n;
    }
    if (!especie || !nivel || !qualidade) {
      saida.innerHTML = `<div class="vazio" style="padding:18px">Preencha espécie, nível e qualidade.</div>`;
      return;
    }
    const ivTotal = Number(valor("ivTotal").value) || undefined;
    const poke = {
      name: especie.name, speciesId: especie.pokeId, level: nivel, quality: qualidade,
      stats: completos ? stats : null, ivTotal, shiny: valor("shiny").checked,
      type1: especie.type1, type2: especie.type2
    };
    if (!completos && !ivTotal) {
      saida.innerHTML = `<div class="vazio" style="padding:18px">Informe os 6 atributos ou o IV total.</div>`;
      return;
    }
    saida.innerHTML = `<div class="expandido"><div class="cartao ${poke.shiny ? "shiny" : ""}">${Cartao.htmlPoke(poke, acharEspecie(poke))}</div></div>`;
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
      <div class="secao">Como funciona</div>
      <div class="drops" style="font-size:12px;line-height:1.5">
        A PokeLupa só lê o que o jogo já manda para o seu navegador (mochila, Pokémons e catálogo). Nada é enviado para fora e nenhuma ação é feita por você.
        IVs por atributo são deduzidos da fórmula do jogo: <b>stat = nível/100 × (base + 2·IV) × qualidade^exp</b>, com exp 0,95 para HP/Vel e 0,8 para os outros.
        A nota junta o quanto o IV e a qualidade são melhores que as capturas selvagens.
      </div>
    `;
  }

  function renderizar(forcar) {
    camada.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === visao.aba));
    painel.classList.toggle("aberto", visao.painelAberto);
    lancador.style.display = ajustes.lancadorVisivel && !visao.painelAberto ? "" : "none";
    atualizarStatus();
    if (!visao.painelAberto) return;
    if (visao.aba === "analisar" && !forcar) return;
    const rolagem = corpo.scrollTop;
    ({ mochila: montarMochila, pokes: montarPokes, sessao: montarSessao, analisar: montarAnalisar, ajustes: montarAjustes }[visao.aba])();
    if (!forcar) corpo.scrollTop = rolagem;
  }

  function aoMudarDados(motivo) {
    renderizar(motivo === "catalogo");
    salvarResumo();
  }

  function abrirPainel(aberto) {
    visao.painelAberto = aberto ?? !visao.painelAberto;
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
    const alvo = evento.target.closest("[data-acao],[data-aba],[data-categoria],[data-filtro],[data-alternar],[data-poke]");
    if (!alvo) return;
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
        registrarShiny({ nome: "Pikachu (teste)", nivel: 42 });
        break;
    }
  });

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
    } else if (campo.dataset.calc) {
      calcularManual();
    }
  });
  camada.addEventListener("change", evento => {
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
      if (area !== "local" || !mudancas[chaves.ajustes]) return;
      ajustes = { ...ajustesPadrao, ...(mudancas[chaves.ajustes].newValue || {}) };
      renderizar(false);
    });
  } catch (erro) {}

  setInterval(() => {
    atualizarStatus();
    if (visao.painelAberto && visao.aba === "sessao") renderizar(false);
  }, 30000);

  (async function iniciar() {
    const [ajustesSalvos, mercadoSalvo, sessaoSalva, shiniesSalvos] = await Promise.all([
      ler(chaves.ajustes), ler(chaves.mercado), ler(chaves.sessao), ler(chaves.shinies)
    ]);
    ajustes = { ...ajustesPadrao, ...(ajustesSalvos || {}) };
    precosMercado = mercadoSalvo || {};
    sessao = sessaoSalva || null;
    registroShinies = Array.isArray(shiniesSalvos) ? shiniesSalvos : [];
    posicionarLancador();
    renderizar(true);
    await carregarCatalogo();
    pedirAoJogo("pedirEstado");
  })();
})();
