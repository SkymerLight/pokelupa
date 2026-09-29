const { bancoPronto, comandos, liberarOrigem, lerCorpo, numero, texto, paresEmObjeto } = require("./_banco");

const clas = new Set(["ironhard", "naturia", "seavell", "malefic", "orebound", "psycraft", "raibolt", "volcanic", "gardestrike", "wingeon"]);
const tipos = new Set(["NORMAL", "FIRE", "WATER", "ELECTRIC", "GRASS", "ICE", "FIGHTING", "POISON", "GROUND", "FLYING", "PSYCHIC", "BUG", "ROCK", "GHOST", "DRAGON", "DARK", "STEEL", "FAIRY"]);

function limpar(corpo) {
  const cla = String(corpo.cla || "").toLowerCase();
  const rank = numero(corpo.rank, 2, 5);
  if (!clas.has(cla) || !Number.isInteger(rank)) return null;
  const itens = Array.isArray(corpo.itens) ? corpo.itens : [];
  const capturar = Array.isArray(corpo.capturar) ? corpo.capturar : [];
  const derrotar = Array.isArray(corpo.derrotar) ? corpo.derrotar : [];
  if (itens.length > 10 || capturar.length > 10 || derrotar.length > 10) return null;
  const missao = {
    cla, rank,
    nome: texto(corpo.nome, 40),
    nivel: numero(corpo.nivel, 1, 1000),
    itens: itens.map(i => ({ id: numero(i.id, 1, 1e7), nome: texto(i.nome, 60), qtd: numero(i.qtd, 1, 1e7) })),
    capturar: capturar.map(c => ({ id: numero(c.id, 1, 1e5), nome: texto(c.nome, 60), qtd: numero(c.qtd, 1, 1e5) })),
    derrotar: derrotar.map(d => ({ tipo: tipos.has(d.tipo) ? d.tipo : null, qtd: numero(d.qtd, 1, 1e7) }))
  };
  const valido = [...missao.itens, ...missao.capturar].every(x => x.id && x.nome && x.qtd) && missao.derrotar.every(d => d.tipo && d.qtd);
  return valido ? missao : null;
}

module.exports = async function (req, res) {
  liberarOrigem(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!bancoPronto()) return res.status(req.method === "GET" ? 200 : 503).json({ pronto: false, clas: {} });

  if (req.method === "GET") {
    const [chaves] = await comandos([["SMEMBERS", "pokelupa:missoes"]]);
    const lista = chaves || [];
    const votos = lista.length ? await comandos(lista.map(c => ["HGETALL", `pokelupa:missao:${c}`])) : [];
    const saida = {};
    lista.forEach((c, i) => {
      const contagem = paresEmObjeto(votos[i]);
      const melhor = Object.entries(contagem).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
      if (!melhor) return;
      const missao = JSON.parse(melhor[0]);
      (saida[missao.cla] = saida[missao.cla] || {})[String(missao.rank)] = { ...missao, votos: Number(melhor[1]) };
    });
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({ pronto: true, clas: saida });
  }

  if (req.method !== "POST") return res.status(405).json({ erro: "use GET ou POST" });
  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch (erro) {
    return res.status(400).json({ erro: "JSON inválido" });
  }
  const instalacao = texto(corpo.instalacao, 64);
  const missao = limpar(corpo);
  if (!missao || !instalacao) return res.status(400).json({ erro: "missão inválida" });
  const chave = `${missao.cla}:${missao.rank}`;
  const [novo] = await comandos([["SADD", `pokelupa:missaovotos:${chave}`, instalacao]]);
  if (!novo) return res.status(200).json({ ok: true, repetido: true });
  await comandos([
    ["SADD", "pokelupa:missoes", chave],
    ["HINCRBY", `pokelupa:missao:${chave}`, JSON.stringify(missao), 1]
  ]);
  return res.status(200).json({ ok: true });
};
