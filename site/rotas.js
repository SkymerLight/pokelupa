(function (raiz) {
  const F = raiz.PokeLupaFormulas;
  const segundosDeDeslocamento = 4;
  const fatorDeLuta = 1.9;
  const fatorXp = 1.5;

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
    return { hunts: listaHunts, porNome };
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

  function rankear(base, especie, nivel, opcoes) {
    const meu = combatenteDoJogador(especie, nivel, opcoes);
    const areas = opcoes.areas || null;
    const resultados = [];
    for (const hunt of base.hunts) {
      if (hunt.nivel > nivel) continue;
      if (areas && !areas.has(hunt.area)) continue;
      const avaliacao = avaliarHunt(hunt, meu);
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
      if (ultimo && ultimo.hunt.slug === melhor.hunt.slug) {
        ultimo.ate = nivel + 1;
        ultimo.segundos += segundos;
        ultimo.gold += melhor.goldHora * horas;
        ultimo.xpHora = melhor.xpHora;
        ultimo.goldHora = melhor.goldHora;
      } else {
        trechos.push({ hunt: melhor.hunt, de: nivel, ate: nivel + 1, segundos, gold: melhor.goldHora * horas, xpHora: melhor.xpHora, goldHora: melhor.goldHora, aguenta: melhor.aguenta });
      }
    }
    return { trechos, totalSegundos, totalGold, travouEm: null };
  }

  raiz.PokeLupaRotas = { prepararDados, rankear, planejarRota, normalizar };
})(typeof globalThis !== "undefined" ? globalThis : window);
