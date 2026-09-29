const { bancoPronto, comandos, liberarOrigem, lerCorpo, numero, texto } = require("./_banco");

const areas = new Set(["kanto", "outland", "orre", "nightmare"]);
const somaveis = ["segundos", "xp", "xpBase", "pokeXp", "pokeXpBase", "kills", "loot", "capturasGold", "gastos", "segundosComGastos"];

module.exports = async function (req, res) {
  liberarOrigem(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "use POST" });
  if (!bancoPronto()) return res.status(503).json({ erro: "banco não configurado" });

  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch (erro) {
    return res.status(400).json({ erro: "JSON inválido" });
  }

  const slug = texto(corpo.slug, 60);
  const segundos = numero(corpo.segundos, 120, 6 * 3600);
  const instalacao = texto(corpo.instalacao, 64);
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug) || !segundos || !instalacao) return res.status(400).json({ erro: "dados incompletos" });

  const horas = segundos / 3600;
  const valores = {
    segundos,
    xp: numero(corpo.xp, 0, 3e9 * horas),
    xpBase: numero(corpo.xpBase, 0, 3e9 * horas),
    pokeXp: numero(corpo.pokeXp, 0, 3e9 * horas),
    pokeXpBase: numero(corpo.pokeXpBase, 0, 3e9 * horas),
    kills: numero(corpo.kills, 0, 20000 * horas),
    loot: numero(corpo.loot, 0, 5e9 * horas),
    capturasGold: numero(corpo.capturasGold, 0, 5e9 * horas) || 0,
    gastos: numero(corpo.gastos, 0, 5e9 * horas) || 0,
    segundosComGastos: corpo.temGastos ? segundos : 0
  };
  if (valores.xp === null || valores.kills === null || valores.loot === null) return res.status(400).json({ erro: "valores fora do normal" });
  for (const campo of ["xpBase", "pokeXp", "pokeXpBase"]) if (valores[campo] === null) valores[campo] = 0;

  const nome = texto(corpo.nome, 80) || slug;
  const area = areas.has(String(corpo.area || "").toLowerCase()) ? String(corpo.area).toLowerCase() : "kanto";
  const nivelHunt = numero(corpo.nivelHunt, 0, 100000) || 0;
  const poke = corpo.poke && typeof corpo.poke === "object" ? corpo.poke : null;
  const nomePoke = poke ? texto(poke.nome, 60) : null;
  const forma = poke ? texto(poke.forma, 60) : null;
  const nivelPoke = poke ? numero(poke.nivel, 1, 100000) : null;
  const faixaNivel = nivelPoke ? Math.floor(nivelPoke / 50) * 50 : null;
  const chavePoke = nomePoke ? `${nomePoke}|${forma || ""}|${faixaNivel ?? ""}` : null;

  const trava = `pokelupa:trava:${instalacao}:${slug}`;
  const [livre] = await comandos([["SET", trava, "1", "NX", "EX", "60"]]);
  if (livre !== "OK") return res.status(429).json({ erro: "envie no máximo um trecho por minuto por hunt" });

  const lista = [
    ["SADD", "pokelupa:hunts", slug],
    ["HSET", `pokelupa:huntinfo:${slug}`, "nome", nome, "area", area, "nivel", String(nivelHunt)],
    ["HINCRBY", `pokelupa:hunt:${slug}`, "trechos", 1],
    ["SADD", `pokelupa:huntjogadores:${slug}`, instalacao]
  ];
  for (const campo of somaveis) lista.push(["HINCRBYFLOAT", `pokelupa:hunt:${slug}`, campo, String(valores[campo])]);
  if (chavePoke) {
    lista.push(["SADD", `pokelupa:huntpokes:${slug}`, chavePoke]);
    for (const campo of ["segundos", "xp", "xpBase", "pokeXp", "pokeXpBase", "kills", "loot"]) lista.push(["HINCRBYFLOAT", `pokelupa:huntpoke:${slug}:${chavePoke}`, campo, String(valores[campo])]);
  }
  await comandos(lista);
  return res.status(200).json({ ok: true });
};
