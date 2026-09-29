(function (raiz) {
  const F = raiz.PokeLupaFormulas;
  const segundosDeDeslocamento = 4;
  const fatorDeLuta = 1.9;
  const fatorXp = 1.5;
  const naoCopiaveis = new Set([132, 142, 144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251]);
  const bossesDeOrre = new Set([289, 350, 373, 376, 464, 465, 466, 467, 477]);
  const formasShiny = new Set([1,2,3,4,5,6,7,8,9,12,13,14,15,16,17,18,19,20,21,22,24,26,28,31,34,36,38,40,41,43,44,45,46,47,48,49,51,52,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,72,73,74,75,76,78,79,80,81,82,83,84,85,87,88,89,90,91,92,93,94,95,97,98,99,100,101,102,103,104,105,106,107,109,110,111,112,114,116,117,118,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,143,147,148,152,153,154,155,156,157,158,159,160,163,164,168,169,171,175,177,178,179,181,186,189,195,196,197,203,204,205,208,210,211,212,213,217,218,219,220,221,222,225,226,227,228,229,230,231,232,234,236,239,240,241,246,247,252,255,256,257,258,259,260,277,280,281,282,303,304,305,306,310,324,326,447,448,468,472]);
  const formasPorHunt = 3;

  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  }

  function prepararDados(especies, itens, hunts) {
    const porNome = new Map();
    for (const especie of especies) {
      const chave = normalizar(especie.name);
      if (!porNome.has(chave) || especie.pokeId <= 1025) porNome.set(chave, especie);
    }
    const precoPorNome = new Map(itens.map(item => [item.name.toLowerCase(), item.npcPrice || 0]));
    const valorPorKill = especie => (especie.loot || []).reduce((soma, drop) => soma + drop.chance / 100000 * ((drop.min + drop.max) / 2) * (precoPorNome.get(String(drop.nome).toLowerCase()) || 0), 0);

    const listaHunts = [];
    for (const hunt of hunts) {
      const prefixo = (hunt.nome.match(/^(Nightmare|Brave|Tribal|Ancient|War|Furious|Enigmatic|Charged|Magnetic|Evil)\s+/i) || [])[1];
      const partes = hunt.nome.split(/\s+e\s+|,\s*|\s*&\s*|\s*\/\s*/i).map(p => p.trim()).filter(Boolean);
      const mobs = [];
      for (const parte of partes) {
        const especie = porNome.get(normalizar(parte)) || (prefixo ? porNome.get(normalizar(`${prefixo} ${parte}`)) : null);
        if (especie && !mobs.includes(especie)) mobs.push(especie);
      }
      if (!mobs.length) continue;
      listaHunts.push({
        ...hunt,
        mobs: mobs.map(especie => ({
          especie,
          combatente: F.montarCombatente(especie, hunt.nivel),
          xpPorKill: (especie.experiencia || 0) * fatorXp,
          goldPorKill: valorPorKill(especie)
        }))
      });
    }
    return { hunts: listaHunts, porNome, especies };
  }

  function lerNome(base, texto) {
    const limpo = String(texto || "").trim();
    const shiny = /^shiny\s+/i.test(limpo);
    const especie = base.porNome.get(normalizar(shiny ? limpo.replace(/^shiny\s+/i, "") : limpo)) || base.porNome.get(normalizar(limpo));
    if (!especie) return null;
    return { especie, shiny, ditto: especie.pokeId === 132 };
  }

  function dittoPodeCopiar(especie, shiny) {
    const id = especie.pokeId;
    if (naoCopiaveis.has(id) || bossesDeOrre.has(id) || id >= 14000 || (id >= 10500 && id < 13000)) return false;
    if (especie.rarity === "LEGENDARY" || especie.rarity === "MYTHICAL") return false;
    return !shiny || formasShiny.has(id);
  }

  function formasDoDitto(base, shiny) {
    const chave = shiny ? "formasShiny" : "formasNormais";
    if (!base[chave]) {
      const vistos = new Set();
      base[chave] = base.especies.filter(e => {
        if (vistos.has(e.name) || !(e.ataques || []).length || !dittoPodeCopiar(e, shiny)) return false;
        vistos.add(e.name);
        return true;
      });
    }
    return base[chave];
  }

  function avaliarHunt(hunt, meu) {
    let segundos = 0;
    let xp = 0;
    let gold = 0;
    let piorAguente = Infinity;
    for (const mob of hunt.mobs) {
      const resultado = F.avaliarConfronto(meu, mob.combatente);
      if (!Number.isFinite(resultado.tempoParaVencer)) return null;
      piorAguente = Math.min(piorAguente, resultado.abates);
      segundos += segundosDeDeslocamento + fatorDeLuta * resultado.tempoParaVencer;
      xp += mob.xpPorKill;
      gold += mob.goldPorKill;
    }
    if (piorAguente < 1) return null;
    const killsHora = 3600 / (segundos / hunt.mobs.length);
    return {
      killsHora,
      xpHora: killsHora * xp / hunt.mobs.length,
      goldHora: killsHora * gold / hunt.mobs.length,
      aguenta: piorAguente
    };
  }

  function combatenteDoJogador(especie, nivel, opcoes) {
    const media = (opcoes.ivTotal || 99) / 6;
    const ivs = opcoes.ivs || { hp: media, atk: media, def: media, spAtk: media, spDef: media, speed: media };
    const stats = opcoes.stats && opcoes.nivelDosStats === nivel ? opcoes.stats : F.calcularStats(F.basesDaEspecie(especie), ivs, nivel, opcoes.qualidade || 1);
    return F.montarCombatente(especie, nivel, stats, [especie.type1, especie.type2]);
  }

  function melhorFormaNaHunt(base, hunt, nivel, opcoes) {
    const cache = opcoes.cacheFormas || (opcoes.cacheFormas = new Map());
    const faixa = Math.floor(nivel / 50);
    const chave = `${hunt.slug}|${faixa}`;
    let candidatas = cache.get(chave);
    if (!candidatas) {
      const notas = [];
      for (const forma of formasDoDitto(base, opcoes.shiny)) {
        const avaliacao = avaliarHunt(hunt, combatenteDoJogador(forma, nivel, opcoes));
        if (avaliacao) notas.push({ forma, killsHora: avaliacao.killsHora });
      }
      candidatas = notas.sort((a, b) => b.killsHora - a.killsHora).slice(0, formasPorHunt).map(n => n.forma);
      cache.set(chave, candidatas);
    }
    let melhor = null;
    for (const forma of candidatas) {
      const avaliacao = avaliarHunt(hunt, combatenteDoJogador(forma, nivel, opcoes));
      if (avaliacao && (!melhor || avaliacao.killsHora > melhor.killsHora)) melhor = { ...avaliacao, forma };
    }
    return melhor;
  }

  function rankear(base, especie, nivel, opcoes) {
    const meu = opcoes.ditto ? null : combatenteDoJogador(especie, nivel, opcoes);
    const areas = opcoes.areas || null;
    const resultados = [];
    for (const hunt of base.hunts) {
      if (hunt.nivel > nivel) continue;
      if (areas && !areas.has(hunt.area)) continue;
      const avaliacao = opcoes.ditto ? melhorFormaNaHunt(base, hunt, nivel, opcoes) : avaliarHunt(hunt, meu);
      if (avaliacao) resultados.push({ hunt, ...avaliacao });
    }
    if (!resultados.length) return [];
    const maiorXp = Math.max(...resultados.map(r => r.xpHora)) || 1;
    const maiorGold = Math.max(...resultados.map(r => r.goldHora)) || 1;
    for (const r of resultados) {
      r.pontos = opcoes.modo === "lucro" ? r.goldHora : opcoes.modo === "xp" ? r.xpHora : (r.xpHora / maiorXp + r.goldHora / maiorGold) / 2;
    }
    return resultados.sort((a, b) => b.pontos - a.pontos);
  }

  function planejarRota(base, especie, de, ate, opcoes) {
    const trechos = [];
    let totalSegundos = 0;
    let totalGold = 0;
    for (let nivel = Math.max(1, de); nivel < ate; nivel++) {
      const melhor = rankear(base, especie, nivel, opcoes)[0];
      if (!melhor) return { trechos, totalSegundos, totalGold, travouEm: nivel };
      const xpNecessario = F.xpTotalParaNivel(nivel + 1) - F.xpTotalParaNivel(nivel);
      const horas = xpNecessario / Math.max(1, melhor.xpHora);
      const segundos = horas * 3600;
      totalSegundos += segundos;
      totalGold += melhor.goldHora * horas;
      const ultimo = trechos[trechos.length - 1];
      if (ultimo && ultimo.hunt.slug === melhor.hunt.slug && ultimo.forma === melhor.forma) {
        ultimo.ate = nivel + 1;
        ultimo.segundos += segundos;
        ultimo.gold += melhor.goldHora * horas;
        ultimo.xpHora = melhor.xpHora;
        ultimo.goldHora = melhor.goldHora;
      } else {
        trechos.push({ hunt: melhor.hunt, de: nivel, ate: nivel + 1, segundos, gold: melhor.goldHora * horas, xpHora: melhor.xpHora, goldHora: melhor.goldHora, aguenta: melhor.aguenta, forma: melhor.forma });
      }
    }
    return { trechos, totalSegundos, totalGold, travouEm: null };
  }

  raiz.PokeLupaRotas = { prepararDados, rankear, planejarRota, normalizar, lerNome };
})(typeof globalThis !== "undefined" ? globalThis : window);
