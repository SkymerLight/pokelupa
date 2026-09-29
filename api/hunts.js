const { bancoPronto, comandos, liberarOrigem, paresEmObjeto } = require("./_banco");

module.exports = async function (req, res) {
  liberarOrigem(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!bancoPronto()) return res.status(200).json({ pronto: false, hunts: [] });

  const [slugs] = await comandos([["SMEMBERS", "pokelupa:hunts"]]);
  const lista = slugs || [];
  if (!lista.length) {
    res.setHeader("Cache-Control", "s-maxage=120");
    return res.status(200).json({ pronto: true, hunts: [] });
  }

  const pedidos = [];
  for (const slug of lista) {
    pedidos.push(["HGETALL", `pokelupa:hunt:${slug}`]);
    pedidos.push(["HGETALL", `pokelupa:huntinfo:${slug}`]);
    pedidos.push(["SCARD", `pokelupa:huntjogadores:${slug}`]);
    pedidos.push(["SMEMBERS", `pokelupa:huntpokes:${slug}`]);
  }
  const respostas = await comandos(pedidos);

  const pokesPedidos = [];
  const mapaPokes = [];
  lista.forEach((slug, i) => {
    for (const chave of respostas[i * 4 + 3] || []) {
      pokesPedidos.push(["HGETALL", `pokelupa:huntpoke:${slug}:${chave}`]);
      mapaPokes.push({ slug, chave });
    }
  });
  const pokesRespostas = pokesPedidos.length ? await comandos(pokesPedidos) : [];
  const pokesPorHunt = {};
  mapaPokes.forEach((item, i) => {
    const valores = paresEmObjeto(pokesRespostas[i]);
    const [nome, forma, faixa] = item.chave.split("|");
    (pokesPorHunt[item.slug] = pokesPorHunt[item.slug] || []).push({
      nome, forma: forma || null, faixaNivel: faixa ? Number(faixa) : null,
      segundos: Number(valores.segundos) || 0, xp: Number(valores.xp) || 0, xpBase: Number(valores.xpBase) || 0,
      pokeXp: Number(valores.pokeXp) || 0, pokeXpBase: Number(valores.pokeXpBase) || 0,
      kills: Number(valores.kills) || 0, loot: Number(valores.loot) || 0
    });
  });

  const hunts = lista.map((slug, i) => {
    const soma = paresEmObjeto(respostas[i * 4]);
    const info = paresEmObjeto(respostas[i * 4 + 1]);
    const numeros = {};
    for (const campo of ["segundos", "xp", "xpBase", "pokeXp", "pokeXpBase", "kills", "loot", "capturasGold", "gastos", "segundosComGastos", "trechos"]) numeros[campo] = Number(soma[campo]) || 0;
    return {
      slug, nome: info.nome || slug, area: info.area || "kanto", nivel: Number(info.nivel) || 0,
      jogadores: Number(respostas[i * 4 + 2]) || 0, ...numeros,
      pokes: (pokesPorHunt[slug] || []).sort((a, b) => b.segundos - a.segundos).slice(0, 15)
    };
  }).filter(h => h.segundos > 0);

  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  return res.status(200).json({ pronto: true, atualizadoEm: Date.now(), hunts });
};
