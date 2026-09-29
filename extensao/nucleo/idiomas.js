(function (raiz) {
  const bandeiras = {
    pt: `<svg viewBox="0 0 28 20" width="22" height="16" aria-hidden="true"><rect width="28" height="20" rx="3" fill="#1f9d55"/><path d="M14 3 25 10 14 17 3 10Z" fill="#f7d417"/><circle cx="14" cy="10" r="4.2" fill="#1e3a8a"/><path d="M10 9.4c2.6-.9 5.4-.6 8 .9" stroke="#fff" stroke-width=".9" fill="none"/></svg>`,
    en: `<svg viewBox="0 0 28 20" width="22" height="16" aria-hidden="true"><rect width="28" height="20" rx="3" fill="#fff"/><g fill="#c8102e"><rect y="0" width="28" height="2.2"/><rect y="4.4" width="28" height="2.2"/><rect y="8.8" width="28" height="2.2"/><rect y="13.2" width="28" height="2.2"/><rect y="17.6" width="28" height="2.4"/></g><rect width="12.5" height="11" rx="1.5" fill="#1e3a8a"/><g fill="#fff"><circle cx="3" cy="3" r=".8"/><circle cx="6.2" cy="3" r=".8"/><circle cx="9.4" cy="3" r=".8"/><circle cx="4.6" cy="5.5" r=".8"/><circle cx="7.8" cy="5.5" r=".8"/><circle cx="3" cy="8" r=".8"/><circle cx="6.2" cy="8" r=".8"/><circle cx="9.4" cy="8" r=".8"/></g></svg>`,
    es: `<svg viewBox="0 0 28 20" width="22" height="16" aria-hidden="true"><rect width="28" height="20" rx="3" fill="#c60b1e"/><rect y="5" width="28" height="10" fill="#ffc400"/><rect x="6" y="7.5" width="3.4" height="5" rx=".8" fill="#c60b1e" opacity=".85"/></svg>`
  };
  const nomesIdiomas = { pt: "Português", en: "English", es: "Español" };

  const frases = {
    "Mochila": ["Bag", "Mochila"],
    "Ranking": ["Ranking", "Ranking"],
    "Contra": ["Counters", "Contra"],
    "Sessão": ["Session", "Sesión"],
    "Clã": ["Clan", "Clan"],
    "Profissão": ["Profession", "Profesión"],
    "Ajustes": ["Settings", "Ajustes"],
    "Atualizar agora": ["Update now", "Actualizar ahora"],
    "Dados do jogo agora": ["Game data just now", "Datos del juego ahora"],
    "Aguardando o jogo…": ["Waiting for the game…", "Esperando el juego…"],
    "Carregando catálogo…": ["Loading catalog…", "Cargando catálogo…"],
    "Abra a mochila no jogo ou clique em ↻": ["Open your bag in the game or click ↻", "Abre la mochila en el juego o haz clic en ↻"],
    "Pode vender hoje": ["Sellable today", "Puedes vender hoy"],
    "Mark (loot)": ["Mark (loot)", "Mark (loot)"],
    "itens aceitos pelo Mark": ["items Mark buys", "ítems que Mark compra"],
    "Flint (pedras)": ["Flint (stones)", "Flint (piedras)"],
    "pedras de evolução": ["evolution stones", "piedras evolutivas"],
    "Reservado": ["Reserved", "Reservado"],
    "clã, craft e itens guardados": ["clan, craft and kept items", "clan, crafteo e ítems guardados"],
    "Pelo mercado": ["At market price", "Por el mercado"],
    "abra o mercado p/ aprender": ["open the market to learn", "abre el mercado para aprender"],
    "Todas": ["All", "Todas"],
    "Não vender": ["Don't sell", "No vender"],
    "Loot": ["Loot", "Loot"],
    "Pedra": ["Stone", "Piedra"],
    "Cura": ["Healing", "Curación"],
    "Reviver": ["Revive", "Revivir"],
    "Diverso": ["Misc", "Varios"],
    "🔒 guardar (nunca vender) · 🚫 ignorar no valor": ["🔒 keep (never sell) · 🚫 ignore in value", "🔒 guardar (nunca vender) · 🚫 ignorar en el valor"],
    "FLINT": ["FLINT", "FLINT"],
    "SEM VENDA": ["NOT SELLABLE", "SIN VENTA"],
    "IGNORADO": ["IGNORED", "IGNORADO"],
    "GUARDAR": ["KEEP", "GUARDAR"],
    "TIME": ["TEAM", "EQUIPO"],
    "Apoiar": ["Support", "Apoyar"],
    "Fechar": ["Close", "Cerrar"],
    "Pedir dados atualizados ao jogo": ["Ask the game for fresh data", "Pedir datos actualizados al juego"],
    "Fechar (Alt+L)": ["Close (Alt+L)", "Cerrar (Alt+L)"],
    "Buscar item…": ["Search item…", "Buscar ítem…"],
    "Guardar: nunca vender este item": ["Keep: never sell this item", "Guardar: nunca vender este ítem"],
    "Parar de guardar": ["Stop keeping", "Dejar de guardar"],
    "Ignorar no valor da mochila": ["Ignore in bag value", "Ignorar en el valor de la mochila"],
    "Voltar a contar no valor": ["Count in value again", "Volver a contar en el valor"],
    "Apoiar com Pix": ["Support with Pix", "Apoyar con Pix"],
    "Copiar meu Discord": ["Copy my Discord", "Copiar mi Discord"],
    "PokeLupa (Alt+L)": ["PokeLupa (Alt+L)", "PokeLupa (Alt+L)"],
    "Meus Pokémons": ["My Pokémon", "Mis Pokémon"],
    "Mercado": ["Market", "Mercado"],
    "Pokémons": ["Pokémon", "Pokémon"],
    "Anúncios lidos": ["Listings read", "Anuncios leídos"],
    "Nota média": ["Average grade", "Nota media"],
    "Nota (potencial)": ["Grade (potential)", "Nota (potencial)"],
    "Poder agora": ["Power now", "Poder ahora"],
    "Poder no Nv 100": ["Power at Lv 100", "Poder en Nv 100"],
    "Qualidade": ["Quality", "Calidad"],
    "Nível": ["Level", "Nivel"],
    "Preço": ["Price", "Precio"],
    "Custo-benefício": ["Value for money", "Costo-beneficio"],
    "Fraca": ["Weak", "Débil"],
    "Comum": ["Common", "Común"],
    "Incomum": ["Uncommon", "Poco común"],
    "Rara": ["Rare", "Rara"],
    "Épica": ["Epic", "Épica"],
    "Lendária": ["Legendary", "Legendaria"],
    "Mítica": ["Mythic", "Mítica"],
    "Anciã": ["Ancient", "Ancestral"],
    "Divina": ["Divine", "Divina"],
    "Todos": ["All", "Todos"],
    "Time": ["Team", "Equipo"],
    "Pra vender": ["To sell", "Para vender"],
    "Shiny": ["Shiny", "Shiny"],
    "✕ Limpar filtros": ["✕ Clear filters", "✕ Limpiar filtros"],
    "poder": ["power", "poder"],
    "IV total": ["Total IV", "IV total"],
    "Poder": ["Power", "Poder"],
    "Golpes": ["Moves", "Ataques"],
    "IV útil": ["Useful IV", "IV útil"],
    "Fraco a": ["Weak to", "Débil a"],
    "Imune": ["Immune", "Inmune"],
    "Qualidade acima do teto de captura selvagem (1.80). Raro, vale guardar.": ["Quality above the wild catch cap (1.80). Rare, worth keeping.", "Calidad por encima del tope de captura salvaje (1.80). Raro, vale la pena guardarlo."],
    "Shiny: os IVs já nascem acima de 159 no total.": ["Shiny: IVs are born above 159 in total.", "Shiny: los IVs ya nacen por encima de 159 en total."],
    "Shiny, mas com IV abaixo do comum para shinies (costumam passar de 159).": ["Shiny, but with IV below usual for shinies (they usually exceed 159).", "Shiny, pero con IV por debajo de lo normal para shinies (suelen pasar de 159)."],
    "Exemplar de topo. Merece investimento.": ["Top specimen. Worth investing in.", "Ejemplar de primera. Merece la inversión."],
    "Muito acima da média das capturas.": ["Far above the average catch.", "Muy por encima de la media de capturas."],
    "IV excelente, mas a qualidade baixa segura o poder: no jogo a qualidade pesa quase o dobro do IV.": ["Great IV, but low quality holds power back: in the game quality weighs almost twice the IV.", "IV excelente, pero la calidad baja frena el poder: en el juego la calidad pesa casi el doble que el IV."],
    "Qualidade alta com IV baixo. Bom, mas não o ideal.": ["High quality with low IV. Good, but not ideal.", "Calidad alta con IV bajo. Bueno, pero no ideal."],
    "Candidato a venda ou troca.": ["Candidate to sell or trade.", "Candidato para vender o intercambiar."],
    "Nome do Pokémon…": ["Pokémon name…", "Nombre del Pokémon…"],
    "Do melhor para o pior": ["Best to worst", "Del mejor al peor"],
    "Do pior para o melhor": ["Worst to best", "Del peor al mejor"],
    "mín": ["min", "mín"],
    "máx": ["max", "máx"],
    "IV ponderado pelo que os golpes dele usam: Atk vale mais se ele bate físico, SpA se bate especial": ["IV weighted by what its moves use: Atk counts more for physical hitters, SpA for special ones", "IV ponderado por lo que usan sus ataques: Atk vale más si pega físico, SpA si pega especial"],
    "Os golpes dele usam este atributo": ["Its moves use this stat", "Sus ataques usan este atributo"],
    "Os golpes dele quase não usam este atributo": ["Its moves barely use this stat", "Sus ataques casi no usan este atributo"],
    "Nenhum anúncio lido ainda": ["No listings read yet", "Ningún anuncio leído todavía"],
    "Abra o Mercado no jogo, vá em Pokémon e navegue pelas páginas. A PokeLupa lê cada página que você abrir e ranqueia aqui.": ["Open the Market in the game, go to Pokémon and browse the pages. PokeLupa reads every page you open and ranks it here.", "Abre el Mercado en el juego, ve a Pokémon y navega por las páginas. PokeLupa lee cada página que abras y la clasifica aquí."],
    "Nenhum Pokémon lido ainda": ["No Pokémon read yet", "Ningún Pokémon leído todavía"],
    "Nenhuma mochila lida ainda": ["No bag read yet", "Ninguna mochila leída todavía"],
    "Abra a mochila ou o time no jogo, ou peça os dados:": ["Open your bag or team in the game, or request the data:", "Abre la mochila o el equipo en el juego, o pide los datos:"],
    "Abra a mochila no jogo uma vez, ou peça os dados direto:": ["Open your bag in the game once, or request the data directly:", "Abre la mochila en el juego una vez, o pide los datos directamente:"],
    "Buscar dados agora": ["Fetch data now", "Buscar datos ahora"],
    "Nenhum Pokémon com esses filtros.": ["No Pokémon match these filters.", "Ningún Pokémon con esos filtros."],
    "Nada encontrado.": ["Nothing found.", "Nada encontrado."],
    "Digite o Pokémon que você vai enfrentar (o da hunt, do boss ou do ginásio). A PokeLupa simula a luta usando os golpes, os tipos e os atributos de cada um.": ["Type the Pokémon you will face (hunt, boss or gym). PokeLupa simulates the fight using each one's moves, types and stats.", "Escribe el Pokémon que vas a enfrentar (hunt, jefe o gimnasio). PokeLupa simula la pelea con los ataques, tipos y atributos de cada uno."],
    "Contra quem? Ex.: Charizard": ["Against whom? e.g. Charizard", "¿Contra quién? Ej.: Charizard"],
    "Ataca com": ["Attacks with", "Ataca con"],
    "Golpes contra ele": ["Moves against it", "Ataques contra él"],
    "Muito efetivo": ["Super effective", "Muy efectivo"],
    "Hunts": ["Hunts", "Hunts"],
    "Calculadora de nível": ["Level calculator", "Calculadora de nivel"],
    "Nível desejado": ["Target level", "Nivel deseado"],
    "XP por hora": ["XP per hour", "XP por hora"],
    "Jogando AFK (ganho cai 50%)": ["Playing AFK (gain drops 50%)", "Jugando AFK (la ganancia baja 50%)"],
    "Falta de XP": ["XP left", "XP que falta"],
    "Tempo estimado": ["Estimated time", "Tiempo estimado"],
    "Usando o XP/h que você digitou.": ["Using the XP/h you typed.", "Usando el XP/h que escribiste."],
    "Cace um pouco com esse Pokémon de líder, ou digite o XP/h.": ["Hunt a bit with this Pokémon as leader, or type the XP/h.", "Caza un poco con este Pokémon de líder, o escribe el XP/h."],
    "Minhas hunts": ["My hunts", "Mis hunts"],
    "Comunidade": ["Community", "Comunidad"],
    "Compartilhar com a comunidade": ["Share with the community", "Compartir con la comunidad"],
    "Envia de forma anônima as médias das suas hunts e as missões de clã para o banco da PokeLupa. Nada da sua conta é enviado.": ["Anonymously sends your hunt averages and clan missions to the PokeLupa database. Nothing from your account is sent.", "Envía de forma anónima los promedios de tus hunts y las misiones de clan a la base de PokeLupa. No se envía nada de tu cuenta."],
    "Banco da comunidade ainda não está ligado ou não respondeu.": ["The community database isn't connected yet or didn't respond.", "La base de la comunidad aún no está conectada o no respondió."],
    "Por Pokémon (comunidade)": ["By Pokémon (community)", "Por Pokémon (comunidad)"],
    "sem XP/h": ["no XP/h", "sin XP/h"],
    "XP base/h": ["Base XP/h", "XP base/h"],
    "Gastos e capturas só entram quando o analisador de hunt do jogo está aberto.": ["Supplies and catches only count while the game's hunt analyzer is open.", "Gastos y capturas solo cuentan con el analizador de hunt del juego abierto."],
    "Caçando agora": ["Hunting now", "Cazando ahora"],
    "XP/h": ["XP/h", "XP/h"],
    "Loot/h": ["Loot/h", "Loot/h"],
    "Lucro/h": ["Profit/h", "Ganancia/h"],
    "Kills/h": ["Kills/h", "Kills/h"],
    "Tempo": ["Time", "Tiempo"],
    "loot + capturas − gastos": ["loot + catches − supplies", "loot + capturas − gastos"],
    "Drops que mais renderam": ["Most valuable drops", "Drops que más rindieron"],
    "Por Pokémon": ["By Pokémon", "Por Pokémon"],
    "Apagar dados desta hunt": ["Delete this hunt's data", "Borrar datos de esta hunt"],
    "Buscar hunt ou Pokémon…": ["Search hunt or Pokémon…", "Buscar hunt o Pokémon…"],
    "Nenhuma hunt medida ainda.": ["No hunt measured yet.", "Ninguna hunt medida todavía."],
    "Nenhuma hunt com esses filtros.": ["No hunt matches these filters.", "Ninguna hunt con esos filtros."],
    "Juntando os primeiros dados do trecho…": ["Gathering the first data of this stretch…", "Juntando los primeros datos del tramo…"],
    "Entre numa hunt e cace normalmente. A PokeLupa mede cada hunt separada: sair para a cidade, trocar de hunt ou cair a conexão fecha o trecho, e trechos com menos de 2 minutos não entram na conta.": ["Enter a hunt and play normally. PokeLupa measures each hunt separately: going to town, switching hunts or disconnecting closes the stretch, and stretches under 2 minutes are ignored.", "Entra a una hunt y caza normal. PokeLupa mide cada hunt por separado: ir a la ciudad, cambiar de hunt o desconectarte cierra el tramo, y los tramos de menos de 2 minutos no cuentan."],
    "Sem lendários": ["No legendaries", "Sin legendarios"],
    "Com lendários": ["With legendaries", "Con legendarios"],
    "Nenhuma forma ajuda contra ele.": ["No form helps against it.", "Ninguna forma sirve contra él."],
    "Dropa de:": ["Dropped by:", "Lo suelta:"],
    "A PokeLupa só lê o que o jogo já manda para o seu navegador (mochila, Pokémons e catálogo). Nada é enviado para fora e nenhuma ação é feita por você. IVs por atributo são deduzidos da fórmula do jogo:": ["PokeLupa only reads what the game already sends to your browser (bag, Pokémon and catalog). Nothing is sent out and no action is taken for you. Per-stat IVs come from the game's formula:", "PokeLupa solo lee lo que el juego ya envía a tu navegador (mochila, Pokémon y catálogo). No se envía nada afuera y no se hace ninguna acción por ti. Los IVs por atributo salen de la fórmula del juego:"],
    ", com exp 0,95 para HP/Vel e 0,8 para os outros. A nota é o potencial: o poder no Nv 100 em % do melhor exemplar possível da mesma espécie. A qualidade entra duas vezes no poder, por isso pesa quase o dobro do IV.": [", with exp 0.95 for HP/Spe and 0.8 for the others. The grade is the potential: power at Lv 100 as % of the best possible specimen of the same species. Quality counts twice in power, so it weighs almost twice the IV.", ", con exp 0,95 para HP/Vel y 0,8 para los demás. La nota es el potencial: el poder en Nv 100 en % del mejor ejemplar posible de la misma especie. La calidad entra dos veces en el poder, por eso pesa casi el doble que el IV."],
    "CLÃ": ["CLAN", "CLAN"],
    "Efetivo": ["Effective", "Efectivo"],
    "Inefetivo": ["Not very effective", "Poco efectivo"],
    "Muito inefetivo": ["Barely effective", "Muy poco efectivo"],
    "Nulo": ["No effect", "Nulo"],
    "% = quão boa é a escolha (100% = a melhor da lista): conta a rapidez para derrotar e desconta quem cai antes. Etiqueta = quanto aguenta.": ["% = how good the pick is (100% = best on the list): counts how fast it wins and penalizes who faints first. Tag = how much it can take.", "% = qué tan buena es la elección (100% = la mejor de la lista): cuenta la rapidez para derrotar y penaliza a quien cae antes. Etiqueta = cuánto aguanta."],
    "Seus melhores contra ele": ["Your best against it", "Tus mejores contra él"],
    "usa": ["uses", "usa"],
    "leva": ["takes", "recibe"],
    "ele não consegue te acertar": ["it can't hit you", "no puede golpearte"],
    "sem golpe que acerte": ["no move that hits", "sin ataque que golpee"],
    "Seguro": ["Safe", "Seguro"],
    "Ok": ["Ok", "Ok"],
    "Arriscado": ["Risky", "Arriesgado"],
    "Cai antes": ["Faints first", "Cae antes"],
    "Melhores espécies do jogo": ["Best species in the game", "Mejores especies del juego"],
    "Comparando todos no Nv 100, IV médio e qualidade 1,00.": ["Comparing all at Lv 100, average IV and quality 1.00.", "Comparando todos en Nv 100, IV medio y calidad 1,00."],
    "Abra a mochila no jogo para eu conhecer seus Pokémons.": ["Open your bag in the game so I can see your Pokémon.", "Abre la mochila en el juego para que conozca tus Pokémon."],
    "Loot por hora": ["Loot per hour", "Loot por hora"],
    "medindo (5 min)": ["measuring (5 min)", "midiendo (5 min)"],
    "A sessão começa na primeira leitura da mochila.": ["The session starts on the first bag read.", "La sesión empieza en la primera lectura de la mochila."],
    "A sessão compara sua mochila de agora com a do começo e soma só o que entrou. Vender não atrapalha. Se ficar 2 h sem abrir o jogo, uma nova sessão começa sozinha.": ["The session compares your bag now with the start and only adds what came in. Selling doesn't affect it. After 2 h without the game, a new session starts on its own.", "La sesión compara tu mochila de ahora con la del inicio y suma solo lo que entró. Vender no afecta. Si pasas 2 h sin abrir el juego, empieza una sesión nueva sola."],
    "Itens ganhos": ["Items gained", "Ítems ganados"],
    "Shinies vistos": ["Shinies seen", "Shinies vistos"],
    "nenhum ainda": ["none yet", "ninguno todavía"],
    "Zerar sessão": ["Reset session", "Reiniciar sesión"],
    "Ler mochila agora": ["Read bag now", "Leer mochila ahora"],
    "Loot da sessão": ["Session loot", "Loot de la sesión"],
    "Shinies": ["Shinies", "Shinies"],
    "✕ Limpar": ["✕ Clear", "✕ Limpiar"],
    "Apaga o loot contado e começa a medir de novo a partir de agora": ["Clears counted loot and starts measuring again from now", "Borra el loot contado y empieza a medir de nuevo desde ahora"],
    "Continue caçando: os itens novos aparecem aqui sempre que o jogo atualizar a mochila.": ["Keep hunting: new items show up here whenever the game updates your bag.", "Sigue cazando: los ítems nuevos aparecen aquí cada vez que el juego actualiza la mochila."],
    "Os itens da missão do seu próximo rank ficam marcados como": ["Items from your next rank's mission are marked as", "Los ítems de la misión de tu próximo rango quedan marcados como"],
    "não vender": ["don't sell", "no vender"],
    ": saem do valor da mochila e ganham um aviso na Loja do Mark.": [": they leave the bag value and get a warning in Mark's Shop.", ": salen del valor de la mochila y reciben un aviso en la Tienda de Mark."],
    "🔒 Travar itens do clã automaticamente": ["🔒 Lock clan items automatically", "🔒 Bloquear ítems del clan automáticamente"],
    "🔒 Travar ingredientes automaticamente": ["🔒 Lock ingredients automatically", "🔒 Bloquear ingredientes automáticamente"],
    "Não deixa marcar para vender na Loja do Mark, nem pelo Selecionar tudo, igual ao 🔒.": ["Can't be selected for sale in Mark's Shop, not even with Select all, just like 🔒.", "No se puede marcar para vender en la Tienda de Mark, ni con Seleccionar todo, igual que 🔒."],
    "Missões": ["Missions", "Misiones"],
    "Capturar": ["Catch", "Capturar"],
    "Derrotar": ["Defeat", "Derrotar"],
    "ninguém enviou ainda": ["nobody sent it yet", "nadie la envió todavía"],
    "Quem chegar nesse rank com a PokeLupa pode enviar pelo botão \"Enviar missão\".": ["Whoever reaches this rank with PokeLupa can send it with the \"Send mission\" button.", "Quien llegue a este rango con PokeLupa puede enviarla con el botón \"Enviar misión\"."],
    "Incluir os próximos ranks": ["Include the next ranks", "Incluir los próximos rangos"],
    "Além do seu próximo rank, reserva (e trava, se a chave de cima estiver ligada) os itens dos ranks seguintes do seu clã que já estão no banco.": ["Besides your next rank, reserves (and locks, if the switch above is on) the items of your clan's following ranks already in the database.", "Además de tu próximo rango, reserva (y bloquea, si el interruptor de arriba está activado) los ítems de los rangos siguientes de tu clan que ya están en la base."],
    "Enviar missão": ["Send mission", "Enviar misión"],
    "Mande para todo mundo ver os itens desse rank. Abre uma página do GitHub com tudo preenchido; é só clicar em \"Create\". Vai só a missão, nada da sua conta.": ["Share it so everyone sees this rank's items. Opens a pre-filled GitHub page; just click \"Create\". Only the mission is sent, nothing from your account.", "Envíala para que todos vean los ítems de este rango. Abre una página de GitHub ya rellenada; solo haz clic en \"Create\". Solo va la misión, nada de tu cuenta."],
    "Abra a janela de": ["Open the", "Abre la ventana de"],
    "Clãs": ["Clans", "Clanes"],
    "no jogo uma vez para a PokeLupa saber seu clã e sua próxima missão.": ["window in the game once so PokeLupa knows your clan and next mission.", "en el juego una vez para que PokeLupa sepa tu clan y tu próxima misión."],
    "Os ingredientes das berries que você crafta ficam marcados como": ["Ingredients of the berries you craft are marked as", "Los ingredientes de las berries que crafteas quedan marcados como"],
    "Craft de berries": ["Berry crafting", "Crafteo de berries"],
    "Guardar para": ["Keep enough for", "Guardar para"],
    "unidades de cada berry": ["units of each berry", "unidades de cada berry"],
    "Usando as berries que você marcou abaixo.": ["Using the berries you selected below.", "Usando las berries que marcaste abajo."],
    "Marque as berries que você crafta, ou abra o painel de crafts no jogo para detectar as liberadas.": ["Select the berries you craft, or open the crafting panel in the game to detect unlocked ones.", "Marca las berries que crafteas, o abre el panel de crafteo en el juego para detectar las desbloqueadas."],
    "Voltar para automático": ["Back to automatic", "Volver a automático"],
    "Ingredientes para guardar": ["Ingredients to keep", "Ingredientes para guardar"],
    "ingrediente de craft": ["crafting ingredient", "ingrediente de crafteo"],
    "entregar no clã": ["deliver to the clan", "entregar al clan"],
    "guardar": ["keep", "guardar"],
    "completo": ["done", "completo"],
    "Nenhuma berry selecionada.": ["No berry selected.", "Ninguna berry seleccionada."],
    "Lendo as receitas do jogo… entre no mapa e espere alguns segundos.": ["Reading the game's recipes… enter the map and wait a few seconds.", "Leyendo las recetas del juego… entra al mapa y espera unos segundos."],
    "Buscar berry… (ex.: occa)": ["Search berry… (e.g. occa)", "Buscar berry… (ej.: occa)"],
    "Cartão ao passar o mouse": ["Hover card", "Tarjeta al pasar el ratón"],
    "Mostra IV, qualidade e nota ao passar o mouse em Pokémons e itens.": ["Shows IV, quality and grade when hovering Pokémon and items.", "Muestra IV, calidad y nota al pasar el ratón sobre Pokémon e ítems."],
    "Alerta de shiny": ["Shiny alert", "Alerta de shiny"],
    "Aviso na tela quando um shiny aparece no seu mapa.": ["On-screen alert when a shiny appears on your map.", "Aviso en pantalla cuando aparece un shiny en tu mapa."],
    "Som do alerta": ["Alert sound", "Sonido de alerta"],
    "Toca um sininho junto com o aviso de shiny.": ["Plays a chime with the shiny alert.", "Suena una campanita con el aviso de shiny."],
    "Botão flutuante": ["Floating button", "Botón flotante"],
    "Se desligar, abra o painel com Alt+L.": ["If off, open the panel with Alt+L.", "Si lo apagas, abre el panel con Alt+L."],
    "Idioma": ["Language", "Idioma"],
    "Dados": ["Data", "Datos"],
    "Itens no catálogo": ["Items in catalog", "Ítems en el catálogo"],
    "Espécies no catálogo": ["Species in catalog", "Especies en el catálogo"],
    "Preços de mercado aprendidos": ["Market prices learned", "Precios de mercado aprendidos"],
    "Última leitura do jogo": ["Last game read", "Última lectura del juego"],
    "agora": ["just now", "ahora"],
    "nunca": ["never", "nunca"],
    "Esquecer preços de mercado": ["Forget market prices", "Olvidar precios de mercado"],
    "Recentralizar botão": ["Reset button position", "Recentrar botón"],
    "Testar alerta": ["Test alert", "Probar alerta"],
    "Versão": ["Version", "Versión"],
    "Instalada": ["Installed", "Instalada"],
    "Mais nova no site": ["Newest on site", "Más nueva en el sitio"],
    "Verificar atualização": ["Check for update", "Buscar actualización"],
    "Abrir atualizador": ["Open updater", "Abrir actualizador"],
    "Apoie o projeto": ["Support the project", "Apoya el proyecto"],
    "Doar com Pix": ["Donate with Pix", "Donar con Pix"],
    "Como funciona": ["How it works", "Cómo funciona"],
    "Quantidade": ["Quantity", "Cantidad"],
    "Preço no Mark": ["Price at Mark", "Precio en Mark"],
    "Total no Mark": ["Total at Mark", "Total en Mark"],
    "Preço no Flint": ["Price at Flint", "Precio en Flint"],
    "Total no Flint": ["Total at Flint", "Total en Flint"],
    "Venda ao NPC": ["NPC sale", "Venta al NPC"],
    "não aceita": ["not accepted", "no acepta"],
    "Mercado (menor visto)": ["Market (lowest seen)", "Mercado (menor visto)"],
    "raro": ["rare", "raro"],
    "Normal": ["Normal", "Normal"],
    "Fogo": ["Fire", "Fuego"],
    "Água": ["Water", "Agua"],
    "Elétrico": ["Electric", "Eléctrico"],
    "Planta": ["Grass", "Planta"],
    "Gelo": ["Ice", "Hielo"],
    "Lutador": ["Fighting", "Lucha"],
    "Veneno": ["Poison", "Veneno"],
    "Terra": ["Ground", "Tierra"],
    "Voador": ["Flying", "Volador"],
    "Psíquico": ["Psychic", "Psíquico"],
    "Inseto": ["Bug", "Bicho"],
    "Fantasma": ["Ghost", "Fantasma"],
    "Dragão": ["Dragon", "Dragón"],
    "Sombrio": ["Dark", "Siniestro"],
    "Aço": ["Steel", "Acero"],
    "Fada": ["Fairy", "Hada"],
    "Excepcional": ["Exceptional", "Excepcional"],
    "Ótimo": ["Great", "Excelente"],
    "Bom": ["Good", "Bueno"],
    "Mediano": ["Average", "Mediano"],
    "Fraco": ["Weak", "Débil"],
    "Sem dados": ["No data", "Sin datos"],
    "Pikachu apareceu! (teste)": ["Pikachu appeared! (test)", "¡Apareció Pikachu! (prueba)"],
    "É assim que o alerta aparece.": ["This is how the alert looks.", "Así se ve la alerta."],
    "Tudo em dia": ["All up to date", "Todo al día"],
    "Sem conexão": ["No connection", "Sin conexión"],
    "Não consegui falar com o site da PokeLupa.": ["Couldn't reach the PokeLupa site.", "No pude contactar el sitio de PokeLupa."],
    "Clique em Atualizar agora no topo do painel.": ["Click Update now at the top of the panel.", "Haz clic en Actualizar ahora arriba del panel."],
    "Discord copiado": ["Discord copied", "Discord copiado"],
    "Meu Discord": ["My Discord", "Mi Discord"],
    "Jogo desconectado": ["Game disconnected", "Juego desconectado"],
    "Entre no jogo (tela do mapa) para ler os dados.": ["Enter the game (map screen) to read the data.", "Entra al juego (pantalla del mapa) para leer los datos."],
    "Nada reservado ainda. Abra o painel do clã ou o de crafts no jogo, ou use o 🔒 nos itens.": ["Nothing reserved yet. Open the clan or crafting panel in the game, or use 🔒 on items.", "Nada reservado todavía. Abre el panel del clan o de crafteo en el juego, o usa 🔒 en los ítems."],
    "Valor da mochila": ["Bag value", "Valor de la mochila"],
    "Loot/hora": ["Loot/hour", "Loot/hora"],
    "Abra o jogo para ler sua mochila.": ["Open the game to read your bag.", "Abre el juego para leer tu mochila."],
    "Abrir painel no jogo": ["Open panel in game", "Abrir panel en el juego"],
    "Ir para o jogo": ["Go to the game", "Ir al juego"],
    "Sem leituras ainda": ["No reads yet", "Sin lecturas todavía"],
    "verificar atualização": ["check for update", "buscar actualización"],
    "site & analisador por print": ["site & screenshot analyzer", "sitio y analizador por captura"],
    "Atualizar PokeLupa": ["Update PokeLupa", "Actualizar PokeLupa"],
    "Pasta da extensão": ["Extension folder", "Carpeta de la extensión"],
    "Baixar versão nova": ["Download new version", "Descargar versión nueva"],
    "Direto do site da PokeLupa.": ["Straight from the PokeLupa site.", "Directo del sitio de PokeLupa."],
    "Trocar os arquivos": ["Replace the files", "Reemplazar los archivos"],
    "Substitui tudo, até arquivos que tenham sumido.": ["Replaces everything, even missing files.", "Reemplaza todo, incluso archivos que falten."],
    "Recarregar": ["Reload", "Recargar"],
    "A extensão reinicia e a aba do jogo recarrega sozinha.": ["The extension restarts and the game tab reloads by itself.", "La extensión se reinicia y la pestaña del juego se recarga sola."],
    "Não sei onde está a pasta": ["I don't know where the folder is", "No sé dónde está la carpeta"],
    "Reinstalar mesmo assim": ["Reinstall anyway", "Reinstalar de todos modos"],
    "Pronto! Recarregando a PokeLupa…": ["Done! Reloading PokeLupa…", "¡Listo! Recargando PokeLupa…"]
  };

  const regras = [
    [/^Versão (\S+) disponível$/, ["Version $1 available", "Versión $1 disponible"]],
    [/^PokeLupa (\S+) disponível$/, ["PokeLupa $1 available", "PokeLupa $1 disponible"]],
    [/^Dados do jogo há (.+)$/, ["Game data $1 ago", "Datos del juego hace $1"]],
    [/^há (\d+) ?(s|min|h|dias)$/, ["$1 $2 ago", "hace $1 $2"]],
    [/^(\d[\d.,]*) itens em (\d+) tipos · já sem o que está reservado$/, ["$1 items in $2 types · excluding reserved", "$1 ítems en $2 tipos · sin lo reservado"]],
    [/^(\d+) itens com preço visto$/, ["$1 items with a seen price", "$1 ítems con precio visto"]],
    [/^(.+) em itens ignorados ficaram fora da conta\.$/, ["$1 in ignored items left out", "$1 en ítems ignorados quedaron fuera"]],
    [/^(\d+) no time · (\d+) shiny$/, ["$1 in team · $2 shiny", "$1 en el equipo · $2 shiny"]],
    [/^melhor: (.+)$/, ["best: $1", "mejor: $1"]],
    [/^atualizado (.+)$/, ["updated $1", "actualizado $1"]],
    [/^potencial (\d+)%$/, ["potential $1%", "potencial $1%"]],
    [/^(×[\d.]+) · além do teto$/, ["$1 · above the cap", "$1 · sobre el tope"]],
    [/^· (\d+)% especiais$/, ["· $1% special", "· $1% especiales"]],
    [/^(\d+)% físicos$/, ["$1% physical", "$1% físicos"]],
    [/^Candidato a venda: rende (.+) no Mark\.$/, ["Candidate to sell: worth $1 at Mark.", "Candidato para vender: rinde $1 en Mark."]],
    [/^Sessão de (.+) · (.+) gold em loot$/, ["Session of $1 · $2 gold in loot", "Sesión de $1 · $2 gold en loot"]],
    [/^(\d+) tipos diferentes$/, ["$1 different types", "$1 tipos diferentes"]],
    [/^último (.+)$/, ["last $1", "último $1"]],
    [/^Usando as (\d+) receitas que você já liberou \(abra o painel de crafts para atualizar\)\.$/, ["Using the $1 recipes you already unlocked (open the crafting panel to refresh).", "Usando las $1 recetas que ya desbloqueaste (abre el panel de crafteo para actualizar)."]],
    [/^Rank (\d+)$/, ["Rank $1", "Rango $1"]],
    [/^Nv (\d+)\+ · seu próximo$/, ["Lv $1+ · your next", "Nv $1+ · tu próximo"]],
    [/^(.+) \(seu\) · (\d)\/4 ranks$/, ["$1 (yours) · $2/4 ranks", "$1 (tuyo) · $2/4 rangos"]],
    [/^(.+) · (\d)\/4 ranks$/, ["$1 · $2/4 ranks", "$1 · $2/4 rangos"]],
    [/^Capturar (.+)$/, ["Catch $1", "Capturar $1"]],
    [/^Sua missão de (.+) rank (\d) ainda não está no banco$/, ["Your $1 rank $2 mission isn't in the database yet", "Tu misión de $1 rango $2 aún no está en la base"]],
    [/^O jogo só mostra a missão do seu próximo rank, então o banco é montado por quem usa a PokeLupa\. (\d+) missões conhecidas até agora\.$/, ["The game only shows your next rank's mission, so the database is built by PokeLupa users. $1 missions known so far.", "El juego solo muestra la misión de tu próximo rango, así que la base la arman quienes usan PokeLupa. $1 misiones conocidas hasta ahora."]],
    [/^hunt Nv (\d+)$/, ["hunt Lv $1", "hunt Nv $1"]],
    [/^Você já está na versão mais nova \((.+)\)\.$/, ["You're already on the newest version ($1).", "Ya tienes la versión más nueva ($1)."]],
    [/^Você tem a (.+) · nova: (.+)$/, ["You have $1 · new: $2", "Tienes la $1 · nueva: $2"]],
    [/^Atualizar para a (.+)$/, ["Update to $1", "Actualizar a la $1"]],
    [/^Novidades da (.+?): (.+)$/, ["What's new in $1: $2", "Novedades de la $1: $2"]],
    [/^(\S+): potencial ([\d.]+)% do melhor (.+) de captura selvagem \(passa de 100% porque a qualidade está acima do teto de 1,80\)$/, ["$1: potential $2% of the best wild $3 (above 100% because quality is above the 1.80 cap)", "$1: potencial $2% del mejor $3 salvaje (pasa de 100% porque la calidad está sobre el tope de 1,80)"]],
    [/^(\S+): potencial ([\d.]+)% do melhor (.+) de captura selvagem$/, ["$1: potential $2% of the best wild $3", "$1: potencial $2% del mejor $3 salvaje"]],
    [/^Quão boa é a escolha comparada ao 1º da lista \(rapidez para derrotar, com desconto se ele cai antes\) · ele não consegue te ferir$/, ["How good the pick is vs the 1st on the list (speed to win, penalized if it faints first) · it can't hurt you", "Qué tan buena es la elección frente al 1º de la lista (rapidez para derrotar, penalizada si cae antes) · no puede herirte"]],
    [/^Quão boa é a escolha comparada ao 1º da lista \(rapidez para derrotar, com desconto se ele cai antes\) · aguenta ~(\d+) dele antes de cair$/, ["How good the pick is vs the 1st on the list (speed to win, penalized if it faints first) · survives ~$1 of them before fainting", "Qué tan buena es la elección frente al 1º de la lista (rapidez para derrotar, penalizada si cae antes) · aguanta ~$1 antes de caer"]],
    [/^Virar (.+)$/, ["Become $1", "Convertirse en $1"]],
    [/^(.+) \(\+(\d+) iguais\)$/, ["$1 (+$2 same)", "$1 (+$2 iguales)"]],
    [/^Seu (.+): melhores formas$/, ["Your $1: best forms", "Tu $1: mejores formas"]],
    [/^(.+) no trecho$/, ["$1 this stretch", "$1 en el tramo"]],
    [/^XP\/h do Pokémon: (.+)\.$/, ["Pokémon XP/h: $1.", "XP/h del Pokémon: $1."]],
    [/^Médias enviadas por quem usa a PokeLupa \(anônimo\)\. (\d+) hunts\.$/, ["Averages sent by PokeLupa users (anonymous). $1 hunts.", "Promedios enviados por quienes usan PokeLupa (anónimo). $1 hunts."]],
    [/^base (.+)\/h sem bônus$/, ["base $1/h without bonuses", "base $1/h sin bonus"]],
    [/^Bônus de XP vistos: (.+)$/, ["XP bonuses seen: $1", "Bonus de XP vistos: $1"]],
    [/^gastos\/h (.+)$/, ["supplies/h $1", "gastos/h $1"]],
    [/^(.+) · (.+) em (\d+) trechos?( · poucos dados)?$/, null],
    [/^Não deixa marcar/, null]
  ];

  const trocasDeTrecho = [
    [/\btime\b/g, ["team", "equipo"]],
    [/ · Nv (\d+)/g, [" · Lv $1", " · Nv $1"]],
    [/^Nv (\d+)/, ["Lv $1", "Nv $1"]],
    [/\bcomum\b/g, ["common", "común"]],
    [/\bincomum\b/g, ["uncommon", "poco común"]],
    [/\blendário\b/g, ["legendary", "legendario"]],
    [/\bépico\b/g, ["epic", "épico"]],
    [/\bmítico\b/g, ["mythical", "mítico"]],
    [/\braro\b/g, ["rare", "raro"]],
    [/^(Fraca|Comum|Incomum|Rara|Épica|Lendária|Mítica|Anciã|Divina) ×/, null],
    [/\b(Água|Elétrico|Planta|Gelo|Fogo|Pedra|Terra|Voador|Lutador|Veneno|Psíquico|Inseto|Fantasma|Dragão|Sombrio|Aço|Fada) 4×/, null]
  ];

  function indice(idioma) {
    return idioma === "en" ? 0 : idioma === "es" ? 1 : -1;
  }

  function traduzir(texto, idioma) {
    const i = indice(idioma);
    if (i < 0 || !texto) return texto;
    const limpo = texto.replace(/\s+/g, " ").trim();
    if (!limpo) return texto;
    const direto = frases[limpo];
    if (direto) return direto[i];
    for (const [padrao, saidas] of regras) {
      if (!saidas) continue;
      if (padrao.test(limpo)) return limpo.replace(padrao, saidas[i]).replace(/^([^\s:]+):/, (trecho, palavra) => frases[palavra] ? `${frases[palavra][i]}:` : trecho);
    }
    let resultado = limpo;
    const tier = resultado.match(/^(Fraca|Comum|Incomum|Rara|Épica|Lendária|Mítica|Anciã|Divina) (×.+)$/);
    if (tier && frases[tier[1]]) resultado = `${frases[tier[1]][i]} ${tier[2]}`;
    const tipo4 = resultado.match(/^(Água|Elétrico|Planta|Gelo|Fogo|Pedra|Terra|Voador|Lutador|Veneno|Psíquico|Inseto|Fantasma|Dragão|Sombrio|Aço|Fada|Normal) 4×$/);
    if (tipo4 && frases[tipo4[1]]) resultado = `${frases[tipo4[1]][i]} 4×`;
    for (const [padrao, saidas] of trocasDeTrecho) {
      if (!saidas) continue;
      resultado = resultado.replace(padrao, saidas[i]);
    }
    if (/\bhá (\d+)/.test(resultado)) resultado = resultado.replace(/\bhá (\d+) ?(s|min|h|dias)\b/g, i === 0 ? "$1 $2 ago" : "hace $1 $2");
    return resultado === limpo ? texto : resultado;
  }

  const originais = new WeakMap();

  function traduzirNo(no, idioma) {
    if (no.nodeType === 3) {
      if (!originais.has(no)) originais.set(no, no.nodeValue);
      const original = originais.get(no);
      const novo = traduzir(original, idioma);
      if (no.nodeValue !== novo) no.nodeValue = novo;
      return;
    }
    if (no.nodeType === 11) {
      for (const filho of no.childNodes) traduzirNo(filho, idioma);
      return;
    }
    if (no.nodeType !== 1 || no.tagName === "STYLE" || no.tagName === "SCRIPT") return;
    for (const atributo of ["title", "placeholder"]) {
      if (!no.hasAttribute(atributo)) continue;
      const chave = `__original_${atributo}`;
      if (no[chave] === undefined || (no[`__traduzido_${atributo}`] !== no.getAttribute(atributo))) no[chave] = no.getAttribute(atributo);
      const novo = traduzir(no[chave], idioma);
      no[`__traduzido_${atributo}`] = novo;
      if (no.getAttribute(atributo) !== novo) no.setAttribute(atributo, novo);
    }
    for (const filho of no.childNodes) traduzirNo(filho, idioma);
  }

  function observar(raizDom, obterIdioma) {
    let observador = null;
    const aplicar = alvo => {
      traduzirNo(alvo, obterIdioma());
      if (observador) observador.takeRecords();
    };
    observador = new MutationObserver(mudancas => {
      try {
        const idioma = obterIdioma();
        for (const mudanca of mudancas) {
          if (mudanca.type === "characterData") {
            originais.set(mudanca.target, mudanca.target.nodeValue);
            traduzirNo(mudanca.target, idioma);
          } else if (mudanca.type === "attributes") {
            traduzirNo(mudanca.target, idioma);
          } else {
            for (const no of mudanca.addedNodes) traduzirNo(no, idioma);
          }
        }
      } finally {
        observador.takeRecords();
      }
    });
    observador.observe(raizDom, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder"] });
    aplicar(raizDom);
    return () => aplicar(raizDom);
  }

  function idiomaPadrao() {
    const idioma = String((typeof navigator !== "undefined" && navigator.language) || "pt").toLowerCase();
    if (idioma.startsWith("pt")) return "pt";
    if (idioma.startsWith("es")) return "es";
    return "en";
  }

  raiz.PokeLupaIdiomas = { bandeiras, nomesIdiomas, traduzir, observar, idiomaPadrao };
})(typeof globalThis !== "undefined" ? globalThis : window);
