globalThis.PokeLupaEstilos = `
:host {
  all: initial;
  --fundo: #0a101c;
  --fundo-2: #0f1828;
  --fundo-3: #152136;
  --borda: rgba(148, 176, 222, 0.14);
  --borda-forte: rgba(231, 194, 106, 0.38);
  --texto: #e6edf7;
  --texto-2: #9fb0c8;
  --texto-3: #6c7d96;
  --ouro: #e7c26a;
  --ouro-2: #f5dc9b;
  --azul: #5aa9ff;
  --verde: #4ade80;
  --vermelho: #f87171;
  --roxo: #b36bff;
  --raio: 14px;
  --sombra: 0 18px 50px rgba(0, 0, 0, 0.55), 0 2px 0 rgba(255, 255, 255, 0.03) inset;
  font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  color: var(--texto);
  font-size: 13px;
  line-height: 1.35;
}

* { box-sizing: border-box; }

.camada { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }

.num { font-variant-numeric: tabular-nums; }
.fraco { color: var(--texto-3); }
.medio { color: var(--texto-2); }

.cartao {
  position: fixed;
  width: 300px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(90, 169, 255, 0.10), transparent 60%),
    radial-gradient(120% 80% at 100% 0%, rgba(231, 194, 106, 0.10), transparent 55%),
    linear-gradient(180deg, var(--fundo-2), var(--fundo));
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  box-shadow: var(--sombra);
  padding: 12px;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px) scale(0.98);
  transition: opacity .12s ease, transform .12s ease;
}
.cartao.visivel { opacity: 1; transform: none; }
.cartao.shiny { border-color: rgba(255, 209, 102, 0.55); }
.cartao.shiny::before {
  content: "";
  position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
  background: linear-gradient(120deg, transparent 20%, rgba(255, 230, 150, 0.18) 45%, transparent 70%);
  background-size: 250% 100%;
  animation: brilho 2.6s linear infinite;
}
@keyframes brilho { from { background-position: 150% 0; } to { background-position: -100% 0; } }

.topo { display: flex; gap: 10px; align-items: center; }
.retrato {
  width: 56px; height: 56px; flex: 0 0 56px; border-radius: 12px;
  background: radial-gradient(circle at 50% 60%, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 70%);
  border: 1px solid var(--borda);
  display: grid; place-items: center; overflow: hidden;
}
.retrato img { width: 64px; height: 64px; image-rendering: pixelated; margin-top: -4px; }
.retrato.item img { width: 36px; height: 36px; margin: 0; }
.identidade { flex: 1; min-width: 0; }
.nome { font-size: 15px; font-weight: 700; letter-spacing: .2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nome .estrela { color: var(--ouro); margin-left: 4px; }
.sub { color: var(--texto-2); font-size: 12px; margin-top: 2px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tipo { font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: 999px; color: #0b1020; text-transform: uppercase; letter-spacing: .4px; }

.selo {
  width: 54px; height: 54px; flex: 0 0 54px; border-radius: 50%;
  display: grid; place-items: center; position: relative;
  background: conic-gradient(var(--cor-selo) calc(var(--pct) * 1%), rgba(255,255,255,0.07) 0);
}
.selo::after { content: ""; position: absolute; inset: 4px; border-radius: 50%; background: var(--fundo); }
.selo b { position: relative; z-index: 1; font-size: 20px; color: var(--cor-selo); line-height: 1; }
.selo small { position: absolute; z-index: 1; bottom: 7px; font-size: 9px; color: var(--texto-2); }

.metricas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; }
.metrica { background: rgba(255,255,255,0.03); border: 1px solid var(--borda); border-radius: 10px; padding: 6px 8px; }
.metrica span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: var(--texto-3); }
.metrica b { display: block; font-size: 14px; margin-top: 1px; }
.metrica i { display: block; font-style: normal; font-size: 10.5px; color: var(--texto-2); margin-top: 1px; }

.barras { margin-top: 10px; display: grid; gap: 5px; }
.barra { display: grid; grid-template-columns: 30px 1fr 44px 36px; gap: 6px; align-items: center; font-size: 11.5px; }
.barra .rotulo { color: var(--texto-2); font-weight: 600; }
.barra .trilho { height: 7px; border-radius: 99px; background: rgba(255,255,255,0.06); position: relative; overflow: hidden; }
.barra .cheio { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 99px; }
.barra .incerto { position: absolute; top: 0; bottom: 0; border-radius: 99px; opacity: .35; }
.barra .valor { text-align: right; color: var(--texto); }
.barra .stat { text-align: right; color: var(--texto-3); }

.fraquezas { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 11px; }
.fraquezas em { font-style: normal; color: var(--texto-3); margin-right: 2px; }
.mini-tipo { padding: 1px 6px; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #0b1020; }
.mini-tipo.x4 { outline: 2px solid var(--vermelho); outline-offset: 1px; }

.dicas { margin-top: 10px; display: grid; gap: 5px; }
.dica { font-size: 11.5px; padding: 6px 8px; border-radius: 8px; border-left: 3px solid var(--azul); background: rgba(90,169,255,0.07); color: var(--texto-2); }
.dica.ouro { border-color: var(--ouro); background: rgba(231,194,106,0.08); color: var(--ouro-2); }
.dica.bom { border-color: var(--verde); background: rgba(74,222,128,0.07); }
.dica.ruim { border-color: var(--vermelho); background: rgba(248,113,113,0.07); }

.linhas { margin-top: 8px; display: grid; gap: 4px; }
.linha { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
.linha span { color: var(--texto-2); }
.linha b { font-weight: 600; }
.linha b.ouro { color: var(--ouro); }
.drops { margin-top: 8px; font-size: 11px; color: var(--texto-3); }
.drops b { color: var(--texto-2); font-weight: 600; }

.lancador {
  position: fixed; width: 50px; height: 50px; border-radius: 50%;
  pointer-events: auto; cursor: grab; border: 0; padding: 0;
  background: radial-gradient(circle at 35% 30%, #22324f, #0b1220 70%);
  box-shadow: 0 0 0 1px var(--borda-forte), 0 10px 28px rgba(0,0,0,.55), 0 0 22px rgba(231,194,106,.18);
  display: grid; place-items: center;
  transition: transform .15s ease, box-shadow .15s ease;
}
.lancador:hover { transform: scale(1.06); box-shadow: 0 0 0 1px var(--ouro), 0 10px 28px rgba(0,0,0,.55), 0 0 28px rgba(231,194,106,.35); }
.lancador:active { cursor: grabbing; }
.lancador svg { width: 30px; height: 30px; }
.lancador .ponto { position: absolute; top: 3px; right: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--verde); box-shadow: 0 0 0 2px #0b1220; opacity: 0; transition: opacity .2s; }
.lancador.vivo .ponto { opacity: 1; }

.painel {
  position: fixed; top: 12px; right: 12px; bottom: 12px; width: 400px; max-width: calc(100vw - 24px);
  pointer-events: auto; display: flex; flex-direction: column;
  background:
    radial-gradient(90% 40% at 100% 0%, rgba(231,194,106,0.08), transparent 60%),
    radial-gradient(90% 40% at 0% 100%, rgba(90,169,255,0.07), transparent 60%),
    linear-gradient(180deg, var(--fundo-2), var(--fundo));
  border: 1px solid var(--borda);
  border-radius: 18px;
  box-shadow: var(--sombra);
  transform: translateX(calc(100% + 30px));
  transition: transform .28s cubic-bezier(.2,.8,.2,1);
  overflow: hidden;
}
.painel.aberto { transform: none; }

.cabeca { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px; }
.cabeca .logo { width: 34px; height: 34px; }
.cabeca h1 { margin: 0; font-size: 16px; letter-spacing: .3px; }
.cabeca h1 span { color: var(--ouro); }
.cabeca p { margin: 1px 0 0; font-size: 11px; color: var(--texto-3); }
.cabeca .acoes { margin-left: auto; display: flex; gap: 6px; }

.botao-icone {
  width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--borda);
  background: rgba(255,255,255,0.03); color: var(--texto-2); cursor: pointer;
  display: grid; place-items: center; font-size: 15px; transition: all .15s;
}
.botao-icone:hover { color: var(--texto); border-color: var(--borda-forte); background: rgba(231,194,106,0.08); }
.botao-icone.girando svg { animation: girar .8s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

.abas { display: flex; gap: 4px; padding: 0 12px; border-bottom: 1px solid var(--borda); }
.aba {
  flex: 1; padding: 9px 4px 10px; background: none; border: 0; color: var(--texto-3); cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 600; position: relative; transition: color .15s;
}
.aba:hover { color: var(--texto-2); }
.aba.ativa { color: var(--ouro); }
.aba.ativa::after { content: ""; position: absolute; left: 20%; right: 20%; bottom: -1px; height: 2px; border-radius: 2px; background: var(--ouro); box-shadow: 0 0 10px var(--ouro); }

.corpo { flex: 1; overflow-y: auto; padding: 12px; scrollbar-width: thin; scrollbar-color: #2a3a56 transparent; }
.corpo::-webkit-scrollbar { width: 8px; }
.corpo::-webkit-scrollbar-thumb { background: #243450; border-radius: 8px; }

.destaque {
  border-radius: 14px; padding: 14px; border: 1px solid var(--borda-forte);
  background: linear-gradient(135deg, rgba(231,194,106,0.14), rgba(231,194,106,0.02) 60%);
  position: relative; overflow: hidden;
}
.destaque .rotulo { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; color: var(--ouro); font-weight: 700; }
.destaque .grande { font-size: 28px; font-weight: 800; margin-top: 2px; letter-spacing: -.5px; }
.destaque .grande small { font-size: 14px; color: var(--texto-2); font-weight: 600; margin-left: 4px; }
.destaque .nota-rodape { font-size: 11px; color: var(--texto-2); margin-top: 2px; }
.destaque .moeda { position: absolute; right: -18px; top: -18px; width: 110px; height: 110px; opacity: .10; transform: rotate(-18deg); filter: grayscale(.3); }

.grade { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.quadro { border-radius: 12px; padding: 10px; border: 1px solid var(--borda); background: rgba(255,255,255,0.025); }
.quadro span { display: block; font-size: 10.5px; color: var(--texto-3); text-transform: uppercase; letter-spacing: .6px; }
.quadro b { display: block; font-size: 16px; margin-top: 2px; }
.quadro i { display: block; font-style: normal; font-size: 11px; color: var(--texto-2); margin-top: 1px; }

.ferramentas { display: flex; gap: 6px; margin: 12px 0 8px; align-items: center; }
.busca {
  flex: 1; height: 32px; border-radius: 10px; border: 1px solid var(--borda); background: rgba(255,255,255,0.03);
  color: var(--texto); padding: 0 10px; font: inherit; font-size: 12.5px; outline: none;
}
.busca:focus { border-color: var(--borda-forte); }
select.busca { flex: 0 0 auto; padding-right: 6px; }
select.busca option { background: var(--fundo-2); }

.chips { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
.chip {
  border: 1px solid var(--borda); background: rgba(255,255,255,0.03); color: var(--texto-2);
  border-radius: 999px; padding: 3px 9px; font: inherit; font-size: 11.5px; cursor: pointer; transition: all .15s;
}
.chip:hover { color: var(--texto); }
.chip.ativo { color: #111827; background: var(--ouro); border-color: var(--ouro); font-weight: 700; }

.lista { display: grid; gap: 4px; }
.item-linha {
  display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: center;
  padding: 6px 8px; border-radius: 10px; border: 1px solid transparent; position: relative;
  background: rgba(255,255,255,0.02);
}
.item-linha:hover { border-color: var(--borda); background: rgba(255,255,255,0.04); }
.item-linha .icone { width: 34px; height: 34px; border-radius: 8px; background: rgba(255,255,255,0.04); display: grid; place-items: center; overflow: hidden; }
.item-linha .icone img { max-width: 30px; max-height: 30px; image-rendering: pixelated; }
.item-linha .icone.poke img { max-width: 44px; max-height: 44px; }
.item-linha .meio { min-width: 0; }
.item-linha .meio > b { display: block; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-linha .meio > span { display: block; font-size: 11px; color: var(--texto-3); }
.item-linha .fim { text-align: right; }
.item-linha .fim > b, .item-linha .fim > div > b { display: block; font-size: 13px; }
.item-linha .fim > span, .item-linha .fim > div > span { display: block; font-size: 10.5px; color: var(--texto-3); }
.item-linha .fatia { position: absolute; left: 8px; right: 8px; bottom: 2px; height: 2px; border-radius: 2px; background: rgba(255,255,255,0.04); overflow: hidden; }
.item-linha .fatia i { display: block; height: 100%; background: linear-gradient(90deg, var(--ouro), #f59e0b); }
.etiqueta { display: inline-block; font-size: 9.5px; padding: 0 5px; border-radius: 5px; margin-left: 4px; vertical-align: 1px; font-weight: 700; letter-spacing: .3px; }
.etiqueta.pedra { background: rgba(179,107,255,0.18); color: #d4b0ff; }
.etiqueta.nao { background: rgba(255,255,255,0.07); color: var(--texto-3); }
.etiqueta.time { background: rgba(90,169,255,0.18); color: #9ccaff; }

.poke-linha { cursor: pointer; }
.nota-mini { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-weight: 800; font-size: 14px; border: 1px solid currentColor; background: rgba(0,0,0,0.2); }
.expandido { grid-column: 1 / -1; margin-top: 4px; }
.expandido .cartao { position: static; width: auto; opacity: 1; transform: none; box-shadow: none; }

.vazio { text-align: center; padding: 34px 16px; color: var(--texto-3); }
.vazio svg { width: 54px; height: 54px; opacity: .5; margin-bottom: 8px; }
.vazio b { display: block; color: var(--texto-2); font-size: 14px; margin-bottom: 4px; }

.botao {
  height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--borda-forte);
  background: linear-gradient(180deg, rgba(231,194,106,0.22), rgba(231,194,106,0.08)); color: var(--ouro-2);
  font: inherit; font-weight: 700; font-size: 12.5px; cursor: pointer; transition: all .15s;
}
.botao:hover { filter: brightness(1.15); }
.botao.secundario { border-color: var(--borda); background: rgba(255,255,255,0.04); color: var(--texto-2); }

.form { display: grid; gap: 8px; }
.form label { display: grid; gap: 4px; font-size: 11px; color: var(--texto-3); text-transform: uppercase; letter-spacing: .6px; }
.form .dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.form .seis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.form input { height: 34px; border-radius: 10px; border: 1px solid var(--borda); background: rgba(255,255,255,0.03); color: var(--texto); padding: 0 10px; font: inherit; font-size: 13px; outline: none; width: 100%; }
.form input:focus { border-color: var(--borda-forte); }

.alternar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--borda); }
.alternar b { display: block; font-size: 13px; }
.alternar span { display: block; font-size: 11.5px; color: var(--texto-3); }
.chave { width: 40px; height: 22px; border-radius: 99px; background: #26334a; position: relative; cursor: pointer; border: 0; flex: 0 0 40px; transition: background .15s; }
.chave::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #cbd5e1; transition: transform .15s; }
.chave.ligada { background: var(--ouro); }
.chave.ligada::after { transform: translateX(18px); background: #1a1405; }

.secao { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; color: var(--texto-3); margin: 16px 0 8px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.secao::after { content: ""; flex: 1; height: 1px; background: var(--borda); }

.rodape { padding: 8px 14px; border-top: 1px solid var(--borda); font-size: 10.5px; color: var(--texto-3); display: flex; justify-content: space-between; }
.rodape a { color: var(--texto-2); text-decoration: none; }
.rodape a:hover { color: var(--ouro); }

.avisos { position: fixed; left: 50%; top: 16px; transform: translateX(-50%); display: grid; gap: 8px; pointer-events: none; }
.aviso {
  pointer-events: auto; min-width: 260px; max-width: 380px; padding: 12px 14px; border-radius: 14px;
  background: linear-gradient(135deg, #3b2c07, #1a1a24 75%); border: 1px solid var(--ouro);
  box-shadow: 0 14px 40px rgba(0,0,0,.5), 0 0 30px rgba(231,194,106,.25);
  display: flex; gap: 10px; align-items: center; animation: entrar .35s cubic-bezier(.2,.9,.3,1.3);
}
.aviso .brilho { font-size: 24px; }
.aviso b { display: block; color: #ffe7a8; font-size: 14px; }
.aviso span { display: block; font-size: 12px; color: #d9e2ef; }
.aviso.info { border-color: var(--borda); background: linear-gradient(135deg, #0f1f35, #0f1828 70%); box-shadow: 0 14px 40px rgba(0,0,0,.5); }
@keyframes entrar { from { opacity: 0; transform: translateY(-12px) scale(.96); } }

@media (max-width: 520px) {
  .painel { width: auto; left: 8px; right: 8px; top: 8px; bottom: 8px; }
}
`;
