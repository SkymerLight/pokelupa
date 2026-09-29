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
  sellValue: c.sellValue,
  huntLevel: c.huntLevel,
  ataques: (c.attacks || []).filter(a => a.power > 0).map(a => ({ name: a.name, power: a.power, type: a.type, category: a.category, cooldownMs: a.cooldownMs, learnLevel: a.learnLevel })),
  experiencia: c.experience || 0,
  loot: (c.loot || []).filter(l => l.chance > 0).map(l => ({ nome: l.name, chance: l.chance, min: l.minCount || 1, max: l.maxCount || 1 }))
}));

const itens = items
  .filter(i => i.npcPrice > 0)
  .map(i => ({ id: i.id, name: i.name, icon: i.icon, category: i.category, npcPrice: i.npcPrice }));

const mapa = await fetch("https://poke.idleworld.online/api/game/map-markers").then(r => r.json());
const hunts = (mapa.hunts || []).filter(h => h.level > 0).map(h => ({ slug: h.slug, nome: h.name, area: h.area, nivel: h.level }));

await mkdir(destino, { recursive: true });
await writeFile(new URL("hunts.json", destino), JSON.stringify(hunts));
await writeFile(new URL("especies.json", destino), JSON.stringify(especies));
await writeFile(new URL("itens.json", destino), JSON.stringify(itens));
console.log(`${especies.length} espécies, ${itens.length} itens e ${hunts.length} hunts salvos em site/dados`);
