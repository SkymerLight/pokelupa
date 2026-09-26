(function (raiz) {
  const chavesStats = ["hp", "atk", "def", "spAtk", "spDef", "speed"];

  const nomesStats = {
    hp: "HP",
    atk: "Atk",
    def: "Def",
    spAtk: "SpA",
    spDef: "SpD",
    speed: "Vel"
  };

  const expoentes = { hp: 0.95, atk: 0.8, def: 0.8, spAtk: 0.8, spDef: 0.8, speed: 0.95 };

  const ivMinimo = 1;
  const ivMaximo = 32;
  const ivTotalMaximo = ivMaximo * 6;
  const tetoSelvagem = 1.8;

  const sorteioQualidade = [
    [0.8, 0.9, 5],
    [0.9, 1, 5],
    [1, 1.1, 34.03846],
    [1.1, 1.2, 20],
    [1.2, 1.3, 10],
    [1.3, 1.4, 10],
    [1.4, 1.5, 10],
    [1.5, 1.6, 5],
    [1.7, 1.8, 0.67308],
    [1.8, 1.8, 0.28846]
  ];

  const faixasQualidade = [
    { minimo: 4, rotulo: "Divina", cor: "#dbefff" },
    { minimo: 3, rotulo: "Anciã", cor: "#d4a017" },
    { minimo: 2, rotulo: "Mítica", cor: "#b36bff" },
    { minimo: 1.7, rotulo: "Lendária", cor: "#ff8c3c" },
    { minimo: 1.5, rotulo: "Épica", cor: "#f0c040" },
    { minimo: 1.3, rotulo: "Rara", cor: "#b06cff" },
    { minimo: 1.1, rotulo: "Incomum", cor: "#7fd4ff" },
    { minimo: 1, rotulo: "Comum", cor: "#63d873" },
    { minimo: -Infinity, rotulo: "Fraca", cor: "#9aa6b3" }
  ];

  const notas = [
    { minimo: 90, letra: "S", rotulo: "Excepcional", cor: "#ffd166" },
    { minimo: 75, letra: "A", rotulo: "Ótimo", cor: "#4ade80" },
    { minimo: 55, letra: "B", rotulo: "Bom", cor: "#60a5fa" },
    { minimo: 35, letra: "C", rotulo: "Mediano", cor: "#fbbf24" },
    { minimo: -Infinity, letra: "D", rotulo: "Fraco", cor: "#f87171" }
  ];

  const tabelaTipos = {
    NORMAL: { ROCK: 0.5, GHOST: 0, STEEL: 0.5 },
    FIRE: { FIRE: 0.5, WATER: 0.5, GRASS: 2, ICE: 2, BUG: 2, ROCK: 0.5, DRAGON: 0.5, STEEL: 2 },
    WATER: { FIRE: 2, WATER: 0.5, GRASS: 0.5, GROUND: 2, ROCK: 2, DRAGON: 0.5 },
    ELECTRIC: { WATER: 2, ELECTRIC: 0.5, GRASS: 0.5, GROUND: 0, FLYING: 2, DRAGON: 0.5 },
    GRASS: { FIRE: 0.5, WATER: 2, GRASS: 0.5, POISON: 0.5, GROUND: 2, FLYING: 0.5, BUG: 0.5, ROCK: 2, DRAGON: 0.5, STEEL: 0.5 },
    ICE: { FIRE: 0.5, WATER: 0.5, GRASS: 2, ICE: 0.5, GROUND: 2, FLYING: 2, DRAGON: 2, STEEL: 0.5 },
    FIGHTING: { NORMAL: 2, ICE: 2, POISON: 0.5, FLYING: 0.5, PSYCHIC: 0.5, BUG: 0.5, ROCK: 2, GHOST: 0, DARK: 2, STEEL: 2, FAIRY: 0.5 },
    POISON: { GRASS: 2, POISON: 0.5, GROUND: 0.5, ROCK: 0.5, GHOST: 0.5, STEEL: 0, FAIRY: 2 },
    GROUND: { FIRE: 2, ELECTRIC: 2, GRASS: 0.5, POISON: 2, FLYING: 0, BUG: 0.5, ROCK: 2, STEEL: 2 },
    FLYING: { ELECTRIC: 0.5, GRASS: 2, FIGHTING: 2, BUG: 2, ROCK: 0.5, STEEL: 0.5 },
    PSYCHIC: { FIGHTING: 2, POISON: 2, PSYCHIC: 0.5, DARK: 0, STEEL: 0.5 },
    BUG: { FIRE: 0.5, GRASS: 2, FIGHTING: 0.5, POISON: 0.5, FLYING: 0.5, PSYCHIC: 2, GHOST: 0.5, DARK: 2, STEEL: 0.5, FAIRY: 0.5 },
    ROCK: { FIRE: 2, ICE: 2, FIGHTING: 0.5, GROUND: 0.5, FLYING: 2, BUG: 2, STEEL: 0.5 },
    GHOST: { NORMAL: 0, PSYCHIC: 2, GHOST: 2, DARK: 0.5 },
    DRAGON: { DRAGON: 2, STEEL: 0.5, FAIRY: 0 },
    DARK: { FIGHTING: 0.5, PSYCHIC: 2, GHOST: 2, DARK: 0.5, FAIRY: 0.5 },
    STEEL: { FIRE: 0.5, WATER: 0.5, ELECTRIC: 0.5, ICE: 2, ROCK: 2, STEEL: 0.5, FAIRY: 2 },
    FAIRY: { FIRE: 0.5, FIGHTING: 2, POISON: 0.5, DRAGON: 2, DARK: 2, STEEL: 0.5 }
  };

  const nomesTipos = {
    NORMAL: "Normal", FIRE: "Fogo", WATER: "Água", ELECTRIC: "Elétrico", GRASS: "Planta",
    ICE: "Gelo", FIGHTING: "Lutador", POISON: "Veneno", GROUND: "Terra", FLYING: "Voador",
    PSYCHIC: "Psíquico", BUG: "Inseto", ROCK: "Pedra", GHOST: "Fantasma", DRAGON: "Dragão",
    DARK: "Sombrio", STEEL: "Aço", FAIRY: "Fada"
  };

  const coresTipos = {
    NORMAL: "#a8a77a", FIRE: "#ee8130", WATER: "#6390f0", ELECTRIC: "#f7d02c", GRASS: "#7ac74c",
    ICE: "#96d9d6", FIGHTING: "#c22e28", POISON: "#a33ea1", GROUND: "#e2bf65", FLYING: "#a98ff3",
    PSYCHIC: "#f95587", BUG: "#a6b91a", ROCK: "#b6a136", GHOST: "#735797", DRAGON: "#6f35fc",
    DARK: "#705746", STEEL: "#b7b7ce", FAIRY: "#d685ad"
  };

  function statFinal(base, iv, nivel, qualidade, chave) {
    const potencia = Math.pow(qualidade, expoentes[chave]);
    return Math.round(nivel / 100 * (base + 2 * iv) * potencia);
  }

  function calcularStats(bases, ivs, nivel, qualidade) {
    const saida = {};
    for (const chave of chavesStats) saida[chave] = statFinal(bases[chave], ivs[chave], nivel, qualidade, chave);
    return saida;
  }

  function calcularPoder(stats, qualidade) {
    let soma = 0;
    for (const chave of chavesStats) soma += stats[chave] || 0;
    return Math.round(soma * qualidade);
  }

  function faixaDaQualidade(qualidade) {
    const valor = Number(qualidade) || 0;
    return faixasQualidade.find(faixa => valor >= faixa.minimo);
  }

  function notaPorPontos(pontos) {
    return notas.find(nota => pontos >= nota.minimo);
  }

  function basesDaEspecie(especie) {
    if (!especie) return null;
    return {
      hp: especie.baseHp,
      atk: especie.baseAtk,
      def: especie.baseDef,
      spAtk: especie.baseSpAtk,
      spDef: especie.baseSpDef,
      speed: especie.baseSpeed
    };
  }

  function candidatosDoStat(valor, base, nivel, qualidade, chave) {
    const lista = [];
    for (let iv = ivMinimo; iv <= ivMaximo; iv++) {
      if (statFinal(base, iv, nivel, qualidade, chave) === valor) lista.push(iv);
    }
    return lista;
  }

  function estimarIvs(stats, bases, nivel, qualidade, ivTotalConhecido) {
    if (!stats || !bases || !nivel || !qualidade) return null;
    const faixas = {};
    for (const chave of chavesStats) {
      if (typeof stats[chave] !== "number" || typeof bases[chave] !== "number") return null;
      const candidatos = candidatosDoStat(stats[chave], bases[chave], nivel, qualidade, chave);
      if (!candidatos.length) return { coerente: false };
      faixas[chave] = { min: candidatos[0], max: candidatos[candidatos.length - 1] };
    }

    const totalValido = typeof ivTotalConhecido === "number" && ivTotalConhecido >= 6;
    if (totalValido) {
      let mudou = true;
      let voltas = 0;
      while (mudou && voltas < 20) {
        mudou = false;
        voltas++;
        const somaMin = chavesStats.reduce((a, c) => a + faixas[c].min, 0);
        const somaMax = chavesStats.reduce((a, c) => a + faixas[c].max, 0);
        if (ivTotalConhecido < somaMin || ivTotalConhecido > somaMax) return { coerente: false };
        for (const chave of chavesStats) {
          const outrosMin = somaMin - faixas[chave].min;
          const outrosMax = somaMax - faixas[chave].max;
          const novoMin = Math.max(faixas[chave].min, ivTotalConhecido - outrosMax);
          const novoMax = Math.min(faixas[chave].max, ivTotalConhecido - outrosMin);
          if (novoMin !== faixas[chave].min || novoMax !== faixas[chave].max) {
            faixas[chave] = { min: novoMin, max: novoMax };
            mudou = true;
          }
        }
      }
    }

    let somaMin = 0;
    let somaMax = 0;
    let exatos = 0;
    for (const chave of chavesStats) {
      somaMin += faixas[chave].min;
      somaMax += faixas[chave].max;
      if (faixas[chave].min === faixas[chave].max) exatos++;
    }
    return {
      coerente: true,
      faixas,
      totalMin: totalValido ? ivTotalConhecido : somaMin,
      totalMax: totalValido ? ivTotalConhecido : somaMax,
      exatos
    };
  }

  const distribuicaoIv = (function () {
    let atual = [1];
    for (let dado = 0; dado < 6; dado++) {
      const proxima = new Array(atual.length + ivMaximo).fill(0);
      for (let soma = 0; soma < atual.length; soma++) {
        if (!atual[soma]) continue;
        for (let face = ivMinimo; face <= ivMaximo; face++) proxima[soma + face] += atual[soma];
      }
      atual = proxima;
    }
    const total = Math.pow(ivMaximo, 6);
    return atual.map(v => v / total);
  })();

  function percentilIv(ivTotal, shiny) {
    const alvo = Math.round(ivTotal);
    let abaixo = 0;
    let igual = 0;
    let universo = 0;
    for (let soma = 6; soma <= ivTotalMaximo; soma++) {
      const chance = distribuicaoIv[soma] || 0;
      if (shiny && soma <= 159) continue;
      universo += chance;
      if (soma < alvo) abaixo += chance;
      else if (soma === alvo) igual += chance;
    }
    if (!universo) return 0;
    return Math.max(0, Math.min(100, (abaixo + igual / 2) / universo * 100));
  }

  function percentilQualidade(qualidade) {
    const q = Number(qualidade) || 0;
    if (q > tetoSelvagem) return 100;
    let acumulado = 0;
    for (const [inicio, fim, chance] of sorteioQualidade) {
      if (inicio === fim) {
        if (q > inicio) acumulado += chance;
        else if (q === inicio) acumulado += chance / 2;
        continue;
      }
      if (q >= fim) acumulado += chance;
      else if (q > inicio) acumulado += chance * (q - inicio) / (fim - inicio);
    }
    return Math.max(0, Math.min(100, acumulado));
  }

  function multiplicadorDefensivo(tipoAtaque, tipo1, tipo2) {
    const linha = tabelaTipos[tipoAtaque] || {};
    let valor = linha[tipo1] ?? 1;
    if (tipo2 && tipo2 !== tipo1) valor *= linha[tipo2] ?? 1;
    return valor;
  }

  function fraquezas(tipo1, tipo2) {
    const resultado = { x4: [], x2: [], metade: [], quarto: [], imune: [] };
    if (!tipo1) return resultado;
    for (const tipo of Object.keys(tabelaTipos)) {
      const valor = multiplicadorDefensivo(tipo, tipo1, tipo2);
      if (valor >= 4) resultado.x4.push(tipo);
      else if (valor >= 2) resultado.x2.push(tipo);
      else if (valor === 0) resultado.imune.push(tipo);
      else if (valor <= 0.25) resultado.quarto.push(tipo);
      else if (valor < 1) resultado.metade.push(tipo);
    }
    return resultado;
  }

  function analisarPokemon(poke, especie) {
    const qualidade = Number(poke.quality) || 0;
    const nivel = Number(poke.level) || 0;
    const bases = basesDaEspecie(especie);
    const estimativa = poke.stats && bases && !poke.isDitto ? estimarIvs(poke.stats, bases, nivel, qualidade, poke.ivTotal) : null;

    let ivTotal = typeof poke.ivTotal === "number" ? poke.ivTotal : null;
    if (ivTotal === null && estimativa && estimativa.coerente) {
      ivTotal = Math.round((estimativa.totalMin + estimativa.totalMax) / 2);
    }

    const ivPct = ivTotal !== null ? Math.round((ivTotal - 6) / (ivTotalMaximo - 6) * 1000) / 10 : null;
    const ivPercentil = ivTotal !== null ? percentilIv(ivTotal, false) : null;
    const qualidadePercentil = qualidade ? percentilQualidade(qualidade) : null;

    let pontos = null;
    if (ivPercentil !== null && qualidadePercentil !== null) pontos = 0.45 * ivPercentil + 0.55 * qualidadePercentil;
    else if (ivPercentil !== null) pontos = ivPercentil;
    else if (qualidadePercentil !== null) pontos = qualidadePercentil;

    const nota = pontos !== null ? notaPorPontos(pontos) : null;
    const faixa = qualidade ? faixaDaQualidade(qualidade) : null;
    const poder = typeof poke.power === "number" ? poke.power : (poke.stats && qualidade ? calcularPoder(poke.stats, qualidade) : null);

    let melhorStat = null;
    let piorStat = null;
    if (estimativa && estimativa.coerente) {
      const medias = chavesStats.map(c => ({ chave: c, valor: (estimativa.faixas[c].min + estimativa.faixas[c].max) / 2 }));
      medias.sort((a, b) => b.valor - a.valor);
      melhorStat = medias[0];
      piorStat = medias[medias.length - 1];
    }

    const dicas = [];
    if (qualidade > tetoSelvagem) dicas.push({ tom: "ouro", texto: "Qualidade acima do teto de captura selvagem (1.80). Raro, vale guardar." });
    if (poke.shiny) dicas.push({ tom: "ouro", texto: ivTotal !== null && ivTotal < 160 ? "Shiny, mas com IV abaixo do comum para shinies (costumam passar de 159)." : "Shiny: os IVs já nascem acima de 159 no total." });
    if (nota && nota.letra === "S") dicas.push({ tom: "bom", texto: "Exemplar de topo. Merece investimento." });
    else if (nota && nota.letra === "A") dicas.push({ tom: "bom", texto: "Muito acima da média das capturas." });
    if (ivPercentil !== null && qualidadePercentil !== null && ivPercentil >= 85 && qualidadePercentil < 50) dicas.push({ tom: "info", texto: "IV excelente, mas a qualidade segura o poder final." });
    if (ivPercentil !== null && qualidadePercentil !== null && qualidadePercentil >= 90 && ivPercentil < 35) dicas.push({ tom: "info", texto: "Qualidade alta com IV baixo. Bom, mas não o ideal." });
    if (nota && nota.letra === "D" && !poke.shiny && !poke.team) {
      const venda = poke.sellValue || (especie && especie.sellValue) || 0;
      dicas.push({ tom: "ruim", texto: venda ? `Candidato a venda: rende ${formatarNumero(venda)} no Mark.` : "Candidato a venda ou troca." });
    }
    if (nivel && nivel < 15 && estimativa && estimativa.coerente && estimativa.exatos < 6) dicas.push({ tom: "info", texto: "Nível baixo: os IVs por atributo ficam aproximados. Suba de nível para mais precisão." });
    if (estimativa && estimativa.coerente === false) dicas.push({ tom: "info", texto: "Stats não batem com a espécie base (forma alternativa ou Ditto). Usando só o IV total." });

    return {
      nome: poke.name || (especie && especie.name) || "Pokémon",
      especie,
      nivel,
      qualidade,
      faixa,
      ivTotal,
      ivPct,
      ivPercentil,
      qualidadePercentil,
      pontos: pontos !== null ? Math.round(pontos) : null,
      nota,
      poder,
      estimativa,
      melhorStat,
      piorStat,
      tipos: [poke.type1 || (especie && especie.type1), poke.type2 || (especie && especie.type2)].filter(Boolean),
      dicas
    };
  }

  function formatarNumero(valor) {
    return Math.round(Number(valor) || 0).toLocaleString("pt-BR");
  }

  function formatarCurto(valor) {
    const n = Number(valor) || 0;
    const absoluto = Math.abs(n);
    if (absoluto >= 1e9) return (n / 1e9).toFixed(absoluto >= 1e10 ? 1 : 2).replace(".", ",") + "B";
    if (absoluto >= 1e6) return (n / 1e6).toFixed(absoluto >= 1e7 ? 1 : 2).replace(".", ",") + "M";
    if (absoluto >= 1e4) return (n / 1e3).toFixed(1).replace(".", ",") + "k";
    return formatarNumero(n);
  }

  function urlSprite(idEspecie, shiny) {
    if (!idEspecie || idEspecie < 1) return "";
    const pasta = shiny ? "pokemon/shiny" : "pokemon";
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/${pasta}/${idEspecie}.png`;
  }

  raiz.PokeLupaFormulas = {
    chavesStats,
    nomesStats,
    expoentes,
    ivMinimo,
    ivMaximo,
    ivTotalMaximo,
    tetoSelvagem,
    nomesTipos,
    coresTipos,
    statFinal,
    calcularStats,
    calcularPoder,
    faixaDaQualidade,
    notaPorPontos,
    basesDaEspecie,
    estimarIvs,
    percentilIv,
    percentilQualidade,
    fraquezas,
    analisarPokemon,
    formatarNumero,
    formatarCurto,
    urlSprite
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
