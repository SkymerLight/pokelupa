(function (raiz) {
  const F = raiz.PokeLupaFormulas;

  function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function corTipo(tipo) {
    return F.coresTipos[tipo] || "#94a3b8";
  }

  function htmlTipos(tipos) {
    return tipos.map(t => `<span class="tipo" style="background:${corTipo(t)}">${esc(F.nomesTipos[t] || t)}</span>`).join("");
  }

  function htmlPoke(poke, especie) {
    const a = F.analisarPokemon(poke, especie);
    const sprite = F.urlSprite(especie && (especie.spriteId || (especie.pokeId <= 1025 ? especie.pokeId : null)), poke.shiny);
    const pontos = a.pontos ?? 0;
    const nota = a.nota || { letra: "?", cor: "#94a3b8", rotulo: "Sem dados" };

    const aproximado = !!(a.estimativa && a.estimativa.aproximado);
    const perfil = a.perfil;
    const peso = chave => !perfil ? 1 : chave === "atk" ? perfil.fisico * 2 : chave === "spAtk" ? perfil.especial * 2 : 1;
    const barras = F.chavesStats.map(chave => {
      const statAtual = poke.stats && typeof poke.stats[chave] === "number" ? poke.stats[chave] : null;
      const faixa = a.estimativa && a.estimativa.coerente ? a.estimativa.faixas[chave] : null;
      const cor = ["#4ade80", "#fb923c", "#facc15", "#60a5fa", "#a78bfa", "#f472b6"][F.chavesStats.indexOf(chave)];
      let trilho = "";
      let texto = "—";
      if (faixa) {
        const larguraCheia = faixa.min / F.ivMaximo * 100;
        const larguraIncerta = (faixa.max - faixa.min) / F.ivMaximo * 100;
        trilho = `<i class="cheio" style="width:${larguraCheia}%;background:${cor}"></i>` +
          (larguraIncerta > 0 ? `<i class="incerto" style="left:${larguraCheia}%;width:${larguraIncerta}%;background:${cor}"></i>` : "");
        texto = faixa.min === faixa.max ? `${aproximado ? "≈" : ""}${faixa.min}` : `${faixa.min}–${faixa.max}`;
      }
      const importancia = peso(chave);
      const classe = importancia >= 1.5 ? "chave-ataque" : importancia <= 0.3 ? "pouco-usado" : "";
      const dica = importancia >= 1.5 ? "Os golpes dele usam este atributo" : importancia <= 0.3 ? "Os golpes dele quase não usam este atributo" : "";
      return `<div class="barra ${classe}" title="${dica}"><span class="rotulo">${F.nomesStats[chave]}${importancia >= 1.5 ? "★" : ""}</span><span class="trilho">${trilho}</span><span class="valor num">${texto}<span class="fraco">/32</span></span><span class="stat num">${statAtual ?? ""}</span></div>`;
    }).join("");

    const coerente = a.estimativa && a.estimativa.coerente;
    const larguraMedia = coerente ? F.chavesStats.reduce((soma, c) => soma + a.estimativa.faixas[c].max - a.estimativa.faixas[c].min, 0) / 6 : 99;
    const statsSimples = poke.stats ? `<div class="stats-simples">${F.chavesStats.map(c => `<div><span>${F.nomesStats[c]}</span><b class="num">${poke.stats[c] ?? "?"}</b></div>`).join("")}</div>` : "";
    const linhaPerfil = perfil ? `<div class="perfil-golpes"><span>Golpes <b>${Math.round(perfil.fisico * 100)}% físicos</b> · ${Math.round(perfil.especial * 100)}% especiais</span>${a.ivUtil !== null ? `<span title="IV ponderado pelo que os golpes dele usam: Atk vale mais se ele bate físico, SpA se bate especial">IV útil <b>${a.ivUtil}%</b></span>` : ""}</div>` : "";
    const avisoAproximado = aproximado ? `<div class="aviso-barras">≈ Estimativa: ${poke.isDitto && especie ? `Ditto transformado em <b>${esc(especie.name)}</b>. ` : ""}os atributos têm algum bônus ou arredondamento extra, então o IV de cada um pode variar ±1–2. A soma bate com o IV total.</div>` : "";
    let blocoAtributos = `<div class="barras">${barras}</div>${linhaPerfil}${avisoAproximado}`;
    if (!poke.stats) {
      blocoAtributos = `<div class="aviso-barras">Sem os atributos deste Pokémon aqui. Nota calculada pelo <b>IV total</b> e pela <b>qualidade</b>.</div>`;
    } else if (!coerente) {
      const motivo = poke.isDitto ? "Não consegui descobrir em qual Pokémon este Ditto se transformou, então não dá para separar o IV de cada atributo." : "Os atributos não batem com a espécie base (forma especial ou bônus ativo).";
      blocoAtributos = `${statsSimples}<div class="aviso-barras">${motivo} A nota usa o <b>IV total</b> e a <b>qualidade</b>, que continuam certos.</div>`;
    } else if (larguraMedia > 5) {
      blocoAtributos = `${statsSimples}<div class="aviso-barras">No <b>Nv ${a.nivel}</b> os atributos ainda são pequenos e vários IVs dão o mesmo número. O IV de cada atributo fica confiável a partir do <b>Nv 30</b> e exato perto do <b>Nv 50</b>.</div>`;
    }

    const fraq = F.fraquezas(a.tipos[0], a.tipos[1]);
    const chipsFraqueza = [
      ...fraq.x4.map(t => `<span class="mini-tipo x4" style="background:${corTipo(t)}" title="4x">${esc(F.nomesTipos[t])} 4×</span>`),
      ...fraq.x2.map(t => `<span class="mini-tipo" style="background:${corTipo(t)}">${esc(F.nomesTipos[t])}</span>`)
    ].join("");
    const chipsImune = fraq.imune.map(t => `<span class="mini-tipo" style="background:${corTipo(t)}">${esc(F.nomesTipos[t])}</span>`).join("");

    const faixa = a.faixa || { rotulo: "—", cor: "#94a3b8" };
    const melhorQue = valor => valor === null ? "" : `top ${Math.max(1, Math.round(100 - valor))}%`;

    return `
      <div class="topo">
        <div class="retrato">${sprite ? `<img src="${sprite}" alt="" referrerpolicy="no-referrer">` : ""}</div>
        <div class="identidade">
          <div class="nome">${esc(a.nome)}${poke.shiny ? '<span class="estrela">✦</span>' : ""}</div>
          <div class="sub"><span class="num">Nv ${a.nivel || "?"}</span>${htmlTipos(a.tipos)}${poke.isDitto && especie && especie.pokeId !== 132 ? `<span class="fraco">virou ${esc(especie.name)}</span>` : ""}</div>
        </div>
        <div class="selo" style="--pct:${pontos};--cor-selo:${nota.cor}" title="${esc(nota.rotulo)}: ${a.potencial !== null ? `potencial ${a.potencial}% do melhor ${especie ? esc(especie.name) : "exemplar"} de captura selvagem${a.potencial > 100 ? " (passa de 100% porque a qualidade está acima do teto de 1,80)" : ""}` : `${pontos}/100`}"><b>${nota.letra}</b><small class="num">${a.pontos ?? ""}</small></div>
      </div>
      <div class="metricas">
        <div class="metrica"><span>Qualidade</span><b style="color:${faixa.cor}">${esc(faixa.rotulo)}</b><i class="num">×${a.qualidade ? a.qualidade.toFixed(2) : "?"} · ${a.qualidade > F.tetoSelvagem ? "além do teto" : melhorQue(a.qualidadePercentil)}</i></div>
        <div class="metrica"><span>IV total</span><b class="num" title="${a.ivTotalCalculado ? "Calculado a partir dos atributos" : ""}">${a.ivTotalCalculado ? "≈" : ""}${a.ivTotal ?? "?"}<span class="fraco">/192</span></b><i>${melhorQue(a.ivPercentil)}</i></div>
        <div class="metrica"><span>Poder</span><b class="num">${a.poder !== null ? F.formatarCurto(a.poder) : "?"}</b><i>${a.potencial !== null ? `potencial ${Math.round(a.potencial)}%` : esc(nota.rotulo)}</i></div>
      </div>
      ${blocoAtributos}
      ${chipsFraqueza || chipsImune ? `<div class="fraquezas">${chipsFraqueza ? `<em>Fraco a</em>${chipsFraqueza}` : ""}${chipsImune ? `<em style="margin-left:6px">Imune</em>${chipsImune}` : ""}</div>` : ""}
      ${a.dicas.length ? `<div class="dicas">${a.dicas.slice(0, 3).map(d => `<div class="dica ${d.tom}">${esc(d.texto)}</div>`).join("")}</div>` : ""}
    `;
  }

  function htmlEfetividade(tipo1, tipo2, titulo) {
    const grupos = F.gruposEfetividade(tipo1, tipo2).filter(g => g.tipos.length);
    return `
      <div class="efetividade">
        ${titulo ? `<div class="efetividade-titulo">${esc(titulo)}</div>` : ""}
        ${grupos.map(g => `
          <div class="efetividade-linha">
            <span class="efetividade-rotulo" style="color:${g.cor}">${esc(g.rotulo)} <small>${g.mult}</small></span>
            <span class="efetividade-tipos">${g.tipos.map(t => `<span class="mini-tipo" style="background:${corTipo(t)}">${esc(F.nomesTipos[t] || t)}</span>`).join("")}</span>
          </div>`).join("")}
      </div>`;
  }

  raiz.PokeLupaCartao = { esc, corTipo, htmlTipos, htmlPoke, htmlEfetividade };
})(typeof globalThis !== "undefined" ? globalThis : window);
