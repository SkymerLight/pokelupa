import { readFile, writeFile } from "node:fs/promises";

const clasValidos = ["ironhard", "naturia", "seavell", "malefic", "orebound", "psycraft", "raibolt", "volcanic", "gardestrike", "wingeon"];
const tiposValidos = ["NORMAL", "FIRE", "WATER", "ELECTRIC", "GRASS", "ICE", "FIGHTING", "POISON", "GROUND", "FLYING", "PSYCHIC", "BUG", "ROCK", "GHOST", "DRAGON", "DARK", "STEEL", "FAIRY"];
const arquivo = new URL("../dados/clas.json", import.meta.url);

function falhar(motivo) {
  console.log(`::error::${motivo}`);
  process.exit(1);
}

const texto = process.env.CORPO_ISSUE || "";
const bloco = texto.match(/```json\s*([\s\S]*?)```/);
if (!bloco) falhar("Não achei o bloco ```json na issue.");

let missao;
try {
  missao = JSON.parse(bloco[1]);
} catch (erro) {
  falhar("JSON inválido.");
}

const inteiro = (valor, min, max) => Number.isInteger(valor) && valor >= min && valor <= max;
const textoCurto = valor => typeof valor === "string" && valor.length > 0 && valor.length <= 60;

if (!clasValidos.includes(missao.cla)) falhar("Clã desconhecido.");
if (!inteiro(missao.rank, 2, 5)) falhar("Rank precisa ser de 2 a 5.");
const itens = Array.isArray(missao.itens) ? missao.itens : [];
const capturar = Array.isArray(missao.capturar) ? missao.capturar : [];
const derrotar = Array.isArray(missao.derrotar) ? missao.derrotar : [];
if (itens.length > 10 || capturar.length > 10 || derrotar.length > 10) falhar("Listas grandes demais.");
if (!itens.every(i => inteiro(i.id, 1, 10000000) && textoCurto(i.nome) && inteiro(i.qtd, 1, 10000000))) falhar("Item inválido.");
if (!capturar.every(c => inteiro(c.id, 1, 100000) && textoCurto(c.nome) && inteiro(c.qtd, 1, 100000))) falhar("Captura inválida.");
if (!derrotar.every(d => tiposValidos.includes(d.tipo) && inteiro(d.qtd, 1, 10000000))) falhar("Derrota inválida.");

const banco = JSON.parse(await readFile(arquivo, "utf8"));
banco.clas[missao.cla] = banco.clas[missao.cla] || {};
banco.clas[missao.cla][String(missao.rank)] = {
  nome: textoCurto(missao.nome) ? missao.nome : null,
  nivel: inteiro(missao.nivel, 1, 1000) ? missao.nivel : null,
  itens: itens.map(i => ({ id: i.id, nome: i.nome, qtd: i.qtd })),
  capturar: capturar.map(c => ({ id: c.id, nome: c.nome, qtd: c.qtd })),
  derrotar: derrotar.map(d => ({ tipo: d.tipo, qtd: d.qtd }))
};
banco.atualizadoEm = new Date().toISOString().slice(0, 10);
await writeFile(arquivo, JSON.stringify(banco, null, 2) + "\n");
console.log(`Missão ${missao.cla} rank ${missao.rank} registrada.`);
