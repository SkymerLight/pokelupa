import { writeFile, mkdir } from "node:fs/promises";

const origem = "https://poke.idleworld.online/game";
const destino = new URL("../site/dados/", import.meta.url);

async function baixar(arquivo) {
  const resposta = await fetch(`${origem}/${arquivo}`);
  if (!resposta.ok) throw new Error(`${arquivo}: HTTP ${resposta.status}`);
  return resposta.json();
}

const [{ creatures }, { items }] = await Promise.all([baixar("creatures.json"), baixar("items.json")]);

const especies = creatures.map(c => ({
  pokeId: c.pokeId,
  name: c.name,
  type1: c.type1,
  type2: c.type2 || null,
  rarity: c.rarity,
  baseHp: c.baseHp,
  baseAtk: c.baseAtk,
  baseDef: c.baseDef,
  baseSpAtk: c.baseSpAtk,
  baseSpDef: c.baseSpDef,
  baseSpeed: c.baseSpeed,
  sellValue: c.sellValue
}));

const itens = items
  .filter(i => i.npcPrice > 0)
  .map(i => ({ id: i.id, name: i.name, icon: i.icon, category: i.category, npcPrice: i.npcPrice }));

await mkdir(destino, { recursive: true });
await writeFile(new URL("especies.json", destino), JSON.stringify(especies));
await writeFile(new URL("itens.json", destino), JSON.stringify(itens));
console.log(`${especies.length} espécies e ${itens.length} itens salvos em site/dados`);
