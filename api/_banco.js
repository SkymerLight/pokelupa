const endereco = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const chave = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

function bancoPronto() {
  return Boolean(endereco && chave);
}

async function comandos(lista) {
  const resposta = await fetch(`${endereco}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify(lista)
  });
  if (!resposta.ok) throw new Error(`banco respondeu ${resposta.status}`);
  const dados = await resposta.json();
  return dados.map(item => item.result);
}

function liberarOrigem(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const partes = [];
  for await (const parte of req) partes.push(parte);
  const texto = Buffer.concat(partes).toString("utf8");
  if (texto.length > 20000) throw new Error("corpo grande demais");
  return JSON.parse(texto || "{}");
}

function numero(valor, minimo, maximo) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= minimo && n <= maximo ? n : null;
}

function texto(valor, maximo) {
  return typeof valor === "string" && valor.trim().length > 0 && valor.length <= maximo ? valor.trim() : null;
}

function paresEmObjeto(lista) {
  const saida = {};
  if (!Array.isArray(lista)) return saida;
  for (let i = 0; i < lista.length; i += 2) saida[lista[i]] = lista[i + 1];
  return saida;
}

module.exports = { bancoPronto, comandos, liberarOrigem, lerCorpo, numero, texto, paresEmObjeto };
