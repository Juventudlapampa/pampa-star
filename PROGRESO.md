# PAMPA STAR — Progreso

## ✅ PARTIDO v4.1 (jul 2026) — respuesta al playtest CONTROL 2
Feedback de Rodri con captura de CT2 al lado: faltaba el CUADRO DE ANIMACIÓN, la cancha estaba alargada, no podía pasar/cambiar/tirar a otro lado y el arquero rival no se movía. Todo atacado:
- **🖼 CUADRO DE ANIMACIÓN (lo grande):** sprites GRANDES originales (16×26 por código, mismas variantes de FORMA del sprite chico) que PISAN la vista de acción en los momentos de drama, estilo el "dibujito" de la serie: cara a cara del encuentro (vos vs defensor / mano a mano con el arquero / remate rival vs tu arquero), patada del tiro Y del pase (la pelota sale volando con estela si es especial), festejo de gol con brazos arriba y saltito. Fondo con líneas de velocidad animadas + piso + marco; teñido de fuego en especiales. Poses: parado/correr/encarar/patear/arquero/festejo. Se limpia solo en cada kickoff/contra/cierre de menú.
- **📐 Cancha PROPORCIONADA (doc §1.2):** mundo 1050×680 (105×68 m reales, ×10); áreas, arcos, penales y círculo central a escala FIFA en `PSART.config`. `draw()` con cámara 2D real (camX+camY explícitos, sin translate mágico); formación reescalada (DEF 190 / VOL 460 / ATA 730).
- **🗺 Radar con proporciones reales:** canvas 210×136 (antes 280×48 estirado), centrado al 58%, con círculo central, arcos a escala y la VENTANA DE LA CÁMARA en 2D (rectángulo que muestra qué pedazo del mundo mira la acción).
- **➡️ Botón PASE:** tercer botón de acción (y tecla P): abre el menú de receptores CUANDO QUERÉS, sin esperar el encuentro; VOLVER reanuda el juego. En defensa se apaga ("sin pelota").
- **🧤 Arqueros VIVOS:** los DOS arqueros siguen la pelota siempre (clamp ±52 del centro del arco); el rival vuelve a su casa cuando ataca su equipo.
- **🎯 El tiro VIAJA a la zona elegida:** cada zona del arco tiene su `gy` (esquinas ±44, palos ±38); si sale AFUERA pasa de largo el palo (se VE el error). Verificado: esquina alta = pelota a MIDY−44 exacto.
- **⚖ Velocidades reescaladas al mundo alto:** posicionales 0.55 (antes 0.15, quedaban clavados), marcadores persiguen a ±0.85 en Y, vuelta al ancla ±0.55.
Verificado en preview: 11v11 arranca, cine pinta (77% panel + sprites), pase voluntario y VOLVER, tiro a zona exacta, gol+festejo, kickoff limpia, defensa con CAMBIO, remate rival con cuadro, layout mobile 375×812 sin desbordes.

### Revisión adversarial del v4.1 ✅ (4 lentes · 14 hallazgos · 12 confirmados, todos arreglados y verificados)
1. **[ALTA · daltonismo]** En el cuadro de duelo, VOS y el rival se distinguían SOLO por color de camiseta (con carrera nueva, sprites idénticos) → flecha ▼ grande + etiqueta "VOS" sobre tu sprite en TODOS los duelos (forma + texto, la regla de la casa).
2. **[MEDIA]** PS.cine quedaba colgado tapando la cancha en el lateral, la pelota dividida y el entretiempo/final interceptados por checkTime → limpieza en pelotaDividida, rama lateral de perderPelota, halftime y fullTime.
3. **[MEDIA]** El guard "SIN RECEPTORES CERCA" era inalcanzable (receptoresPase nunca filtraba por distancia) y un pase de media cancha mostraba el mismo % que uno corto y viajaba 6,3s sin input → filtro de radio 380, penalidad de % por distancia (>200: −0.05/px, también en el apuntado) y viaje topeado a 2,4s.
4. **[MEDIA]** El tap del radar quedó en ~20px de blanco táctil (canvas más chico mostrado al 58%) justo siendo el ÚNICO camino para elegir marcador específico → umbral escalado a píxeles de pantalla (~44px de dedo siempre).
5. **[BAJA]** GOAL_MEDIO=55 es un arco de 11m, no los 7,3 reales: decisión deliberada (legibilidad + zonas atadas al 55) → documentada en el comentario con la cadena completa a reescalar si algún día se baja.
6. **[BAJA]** Tras la atajada propia salías jugando en x=130, DENTRO del área nueva (MY_AREA_X pasó de 118 a 173) → MY_AREA_X+20.
7. **[BAJA]** GAMBETEAR al arquero mostraba el cuadro de PATADA con SFX de remate → la gambeta conserva el cara a cara, sin patada.
8. **[BAJA]** El festejo a escala 5 se decapitaba 4px contra el techo del canvas en los frames del saltito → escala 4,5, entra entero.
9. **[BAJA]** La estela de fuego del especial se esfumaba de golpe a 20px del borde → guard ampliado a CW+50, sale deslizándose.
10. **[BAJA]** El cine animaba por FRAME dentro de escenas en MILISEGUNDOS (a 120Hz la patada quedaba desincronizada) → ci.t avanza por dt real (1 unidad ≈ 1 frame de 60Hz en cualquier pantalla).
Falsos positivos descartados con verificación: el tiro DESDE LEJOS al medio (diseño explícito, la dificultad está en el duelo) y el rasante siempre al mismo palo (firma del especial, pre-existente).
**Pendiente conocido:** radar ampliado a pantalla para apuntar fino, pelota aérea, córners, perfiles IA, alargue/penales (lista v4.1 del doc).

## ✅ Partido V3 — presentación y "la magia" (jul 2026, DISENO_PARTIDO_V3.md)
Capa de presentación sobre el motor v2; el guardado no cambia. Un commit por etapa, verificado.
- **Etapa 1 — 7v7 con capas:** formación ARQ-2DEF-3VOL-1ATA por equipo (antes 5); amigos en su puesto + canteranos; minimapa muestra los 14. Capa POSICIONAL = escenografía viva (van despacio a su ancla, idle 1px, no chan la pelota). **Nadie desaparece:** el defensor superado vuelve caminando a su ancla, vencido, visible.
- **Etapa 2 — máquina de escenas:** `PS.escena` + `PS.colaEscenas` avanzadas por tiempo real en `loop()`; adiós a los setTimeout sueltos del pase. **E2 pase (la estrella):** la cámara se despega del pasador y sigue a la PELOTA; si hay corte posible, **hit-stop 250ms** ("¿llega?") antes del desenlace; aterriza en el receptor con cartel "AHORA JUGÁS: X". Regla de oro: la imagen primero, el texto después. **E3 corte:** negro seco 120ms en saltos largos de cámara.
- **Etapa 4 — megatiros + E4/E5:** el remate es escena (pelota al arco + **hit-stop 400ms** + desenlace + texto después). **E5 especial:** cut-in dramático (retrato + líneas de velocidad) + silencio 400ms + estela. Los 3 especiales en el menú de arquero con estado etiquetado; **Tiro Atuel activado** (nivel 5, rasante). Jugada armada al área = +5 Guts (subidón).
- **Etapa 3 — defensa:** control automático al propio más cercano ("AHORA MARCÁS CON: X") + override tocando el minimapa; persecución 0.55 vs 0.34 (alcanzás con buen ángulo); recuperación con corte + "¡LA RECUPERASTE!".
- **Etapa 5 — constantes de ritmo:** VEL_PORTADOR_MIO 0.50, VEL_PERSECUCION 0.55, VEL_RIVAL_CON_PELOTA 0.34, VEL_POSICIONALES 0.15, VEL_PELOTA ~2px/f, hit-stops 250/400, corte 120. Lo lento son los cuerpos, lo rápido la pelota y los cortes.
- **Parcial (documentado, para tuning):** marca pasiva del tercio (−15%) y escenas de los pases DEL rival; migración a escenas de los duelos def/defensa/despeje/arquero (aún en setTimeout, sin carreras observadas). Cut-in dibujado como overlay HTML (no canvas).
### Revisión adversarial del V3 ✅ (5 hallazgos únicos, todos arreglados y verificados)
1. **[ALTA]** `buildEquipo` daba al amigo su posición propia en vez de la del slot: planteles con 0 o varios ARQ y "fantasmas" (sin dibujar/mover/recibir). Ahora el ROL es el del slot físico → siempre exactamente 1 ARQ, 7 en cancha, 3 receptores (verificado con el plantel patológico 2×ATA+2×ARQ).
2. El silencio dramático del especial apagaba la música hasta el entretiempo → `musicaDeJuego()` la reanuda en cada kickoff/contra (respetando el loop urgente de los últimos minutos).
3. Perder el duelo defensivo teletransportaba a TU sprite en vez del controlado (7v7) → ahora corre el controlado.
4. `accionEspecial` sin guard de `PS.escena` (latente) → agregado.
5. La estela del megatiro se pintaba antes del repintado del frame (invisible) → ahora se dibuja dentro de `draw()` leyendo la escena activa (verificado a nivel píxel).

### Deploy de Pages
Las fallas del deploy eran arrastre del incidente de latencia de GitHub (2-3/7); se destrabó con un redeploy forzado y hoy todos los runs están en verde con el sitio al día. Blindado con `.nojekyll`.

### ⛔ CONTROL 1 — VEREDICTO: el v3 NO pasó el playtest (jul 2026)
Feedback de Rodri: el modelo de control está equivocado de raíz — "estoy manejando un jugador, no es el juego que quiero". El original es otro paradigma: movés al portador con propósito (lento), la cámara CORTA a la acción con drama, elegís del menú en los encuentros, apuntás tocando la cancha, cambiás de jugador, 22 en cancha bien dimensionada, y la identidad es de JUEGO (logo, estudio, transiciones), no de app.

### ✅ PARTIDO v4 CONSTRUIDO (jul 2026) — "Cinematic Soccer"
**Base:** el prompt de Rodri + `INVESTIGACION_MOTOR_TSUBASA.md` (el `DISENO_PARTIDO_V4.md` de Cowork **nunca sincronizó** a la carpeta; si aparece, diffear contra esto).
- **E1 — Cancha dimensionada + 11v11 + cámara con zoom:** mundo al doble (1280), formación 1-4-3-3 por slots (vos sos el 9), vista de acción con zoom ×2 que sigue la pelota (ventana ~140px), radar CT2 de 48px con los 22 y la ventana de cámara dibujada, marcadores dinámicos por cercanía.
- **E2 — Dirigís la jugada:** APUNTADO TOCANDO EL RADAR (pase a cualquier punto, modelo CT2): tocás, el juego propone el receptor más cercano con su % real, confirmás o seguís. El control sigue a la pelota; en defensa el radar cambia el marcador.
- **E3 — Matriz de intenciones + CPU con nafta:** quite>gambeta / corte>pase / bloqueo>tiro con intención rival OCULTA por zona (±8/6) revelada en el relato; la CPU gasta Guts (duelos, remates, persecución), su fuerza cae hasta 14% vacía, recupera ⅛ al entretiempo. El asedio es estrategia.
- **E4 — Reloj del original completo:** corre en tiempo real al conducir + SALTA 0.6–1.4' por acción + **descuento oculto** por tiempo (45+'/90+' en el HUD): nadie sabe cuándo pita el árbitro.
- **Deviaciones documentadas:** encuentro voluntario de menú completo (botón B del original) cubierto parcialmente por PATEAR + pase apuntado; balón aéreo (trap/through/despeje aéreo) y reposicionamiento en córners no entraron — candidatos v4.1 según playtest.

### Ajustes al DISENO_PARTIDO_V4.md de Cowork (llegó después del build)
El diseño coincidió en el grueso con lo construido (misma fuente: la investigación). Se aplicaron los 5 gaps baratos:
1. **Arco en 6 ZONAS tocables** (§4): esquinas +gol pero pueden irse AFUERA (riesgo visible en el %), al medio seguro.
2. **Botón CAMBIO en defensa** (§5): el botón de acción se convierte en CAMBIO (al más cercano); la BARRA también.
3. **Reloj a 15s/min** (§6, default del doc) y **descuento 1–4'**.
4. **Umbral de RENDIDO** (§8): con Guts <25 solo podés pasar y correr (SIN NAFTA).
5. Desgaste ya cubierto (CPU con nafta, matriz, megatiros por condición).
**Pendientes del doc para v4.1 (según playtest):** radar ampliado a pantalla para apuntar, pelota aérea (§4), córners con reposicionamiento, perfiles de IA por jugador, arquero que solo recupera si le convirtieron, gancho guionado del especial, alargue/penales (recién con eliminatorias del Mundial).

### 🎯 (histórico) rumbo v4 — diseño
- **Investigación hecha** (`INVESTIGACION_MOTOR_TSUBASA.md`): el motor "Cinematic Soccer" de Tecmo al detalle — doble capa (vista de acción + radar CT2 en tiempo real), encuentros por contacto o voluntarios (B), menú contextual por rol con matriz corte>pase / quite>gambeta / bloqueo>tiro, GUTS con costos y recuperación de 1/8 al entretiempo, reloj regresivo por acción + tiempo real al correr, descuento impredecible, y las trampas a evitar (radar ciego de CT1, ciclado numérico de defensores, GUTS infinitos de la CPU).
- **Filtro editorial** (`PAMPA_STAR_FILTRO_INFORME.md`): qué se toma/adapta/rechaza (casino y escándalos: NUNCA).
- **v3.1 interino**: reloj continuo estilo original (corre solo en juego, congelado en menús; 2×45', `SEGUNDOS_POR_MINUTO`).
- **Flujo acordado:** Cowork entrega `DISENO_PARTIDO_V4.md` → Rodri dispara el prompt de build (ya entregado y guardado) → Code reescribe el motor por etapas. **NO arrancar sin su aviso.** La presentación (PROMPT 2) y la escalera van DESPUÉS del v4 probado.

## ✅ Tanda de integración + pase de calidad (jul 2026)

### Integración sobre el partido v2 (dirección: pixel retro + chiptune)
- **Sonido:** chiptune propio (`pampa-star-audio.js`) enganchado a todo — silbatos (inicio/entretiempo/final), sting del encuentro, blip de menú, patada, ganar/perder duelo, gol, gol rival, atajada, especial, pasitos. Música por estado (posesión + urgente en los últimos minutos). Mute con ícono+texto, volumen/mute persistidos, desbloqueo al primer toque.
- **Controles:** cruceta a la izquierda + botones PATEAR y CALDÉN a la derecha (grandes, ícono+texto, estado en palabras). Teclado: flechas/WASD + Espacio (patear) + E (especial); botones en pantalla clickeables.
- **Inicio:** pantalla título con CONTINUAR (resumen de carrera) / NUEVO JUEGO / sonido.
- **Avatar con ORIGEN:** nombre; localidad (75 de La Pampa; pueblo +Carácter, ciudad grande +técnica); rasgo permanente (Potrerista/De Club/Arranque Tardío, condiciona la semana); estilo (Encarás/La Clavás/Jugás en Equipo); repartir 5 puntos; apariencia etiquetada; club "desde abajo". El origen tiñe stats, semana, vínculos y prensa.
- **Lore de intro** adaptativo a [PUEBLO], [CLUB] y [PUEBLO DEL CLUB].

### Pase de calidad — revisión adversarial (4 agentes) + soak + QA mobile + a11y
Soak: 2 temporadas al azar con invariantes OK (GF=GC, G=P, pts=g·3+e, PJ=16, campeón, save siempre parseable). QA mobile 375px: sin desbordes; táctiles subidos. **12 hallazgos únicos, todos arreglados y verificados:**
1. **[ALTA] Equipo sin arquero → partido congelado.** Con 4 amigos de campo, `buildEquipo` cortaba antes del ARQ y `rivalShot` crasheaba matando el RAF. Fix: garantizar siempre un ARQ (cantera al arco, aunque el plantel quede en 6) + guard defensivo en `rivalShot`.
2. **[ALTA] Textos con género en pantallas nuevas.** "CREÁ TU JUGADOR"→"TU CRACK", "¿de chico?"→"Tu historia con la pelota", "TARDÍO"→"ARRANQUE TARDÍO", "EL QUE ENCARA/LA CLAVA/JUEGA PARA TODOS"→"ENCARÁS/LA CLAVÁS/JUGÁS EN EQUIPO", lore "pibes…"→"quienes…". (badge y label "delantero"→"ataque" ya venían.)
3. **[MEDIA] NUEVO JUEGO borraba el save al instante.** Ahora el borrado se difiere a EMPEZAR CARRERA; "Volver al inicio" conserva la carrera vieja (flag `nuevoPendiente`).
4. **[MEDIA] Espacio robaba la activación de botones por teclado** en todas las pantallas. Ahora los atajos de juego (Espacio/E/flechas) solo actúan con la cancha activa.
5. **[MEDIA] Botones táctiles chicos** (+/− de puntos 32px, ◀▶ de pinta 30px, mute ~24px). Todos a 44px. Cruceta 42→46px.
6. **[MEDIA] Ráfaga de notas al desmutear** (el secuenciador recuperaba el atraso de golpe). Fix en `pampa-star-audio.js`: no acumular atraso (`mus.next` se resincroniza).
7. **[MEDIA] SFX doble** (el "win/lose" del duelo sonaba encima del gol/atajada). Fix con flag `_sfxBig`.
8. **[MEDIA] `ensureSeason` no validaba nada.** Ahora `seasonValida()` regenera una temporada corrupta; stats con NaN/string se sanean a número.
9. **[BAJA] Gambeta ganada controlando a un amigo avanzaba tu sprite** (no el del amigo). Fix: usar `ctrlPos()`.
10. **[BAJA] Desbloqueo de audio `{once:true}`** moría si el AudioContext se suspendía. Ahora reanuda en cada interacción + `visibilitychange`.
11. **[BAJA] Saque lateral con "◀ VOLVER"** abría un duelo fantasma con el encounter viejo. Fix: `encounter=null` y menú de pase obligatorio sin VOLVER.
12. **[BAJA] `lookResolved` con índice corrupto** (negativo/NaN) crasheaba `draw()`. Fix: índice a prueba de basura en `pampa-star-sprites.js`.

## ✅ Hecho

### Base (previo)
- Motor de partido retro estilo Captain Tsubasa: cancha apaisada pixel-art con scroll horizontal, d-pad táctil (+flechas/WASD), encuentro que congela, menú tipo Pokémon, duelo por stats y Guts SIN barra de timing, mano a mano con el arquero. `VELOCIDAD_JUGADOR` como constante afinable.

### Bloque 1 — Defensa + partido completo ✅
- **Nota:** el reloj de 90' con dos tiempos NO existía (el prompt lo daba por hecho); se construyó acá porque la posesión alternada lo necesita.
- Reloj estilizado: 90' en dos tiempos, salta 5–9' por acción (`MINUTOS_POR_ACCION`). Entretiempo con recuperación de Guts (`GUTS_ENTRETIEMPO`). HUD con minuto y 1T/2T.
- **Defensa espejada:** cuando el rival tiene la pelota avanza hacia tu arco; lo cruzás → congela → menú **QUITAR / CORTAR PASE / BLOQUEAR / MARCAR**, duelo por stats + Guts. Ganás: recuperás. Perdés: sigue (te deja atrás, lo corrés de nuevo).
- Si el rival llega a tu área: **mano a mano contra tu arquero** (automático, tu arquero escala con tu Carácter). Gol rival o atajadón.
- **Posesión alterna naturalmente:** perder la pelota en ataque → contra del rival; recuperar en defensa → seguís atacando desde ahí; tras gol saca el que lo recibió; el 2T lo saca el rival.
- Etiquetas de fase con TEXTO (⚔ ATAQUE / 🛡 DEFENSA / ⏸ ENTRETIEMPO) — accesible para daltonismo, nunca solo color.
- Final de partido: veredicto GANASTE/EMPATE/PERDISTE + marcador, crónica, stats que suben por goles (+1 carácter si ganás), carrera guardada (partidos/victorias/empates/derrotas/goles) retrocompatible.
- Verificado en preview: ataque, pérdida→defensa, duelo defensivo (ganar/perder), gol rival, atajada, entretiempo, final.

### Bloque 2 — Temporada ✅
- **Fixture ida y vuelta** (18 fechas) con los 9 clubes por método del círculo: 4 partidos por fecha y **un equipo libre explícito** (número impar). Verificado: cada club juega 16 y descansa 2.
- Mi partido de cada fecha se juega con el motor real (rival según fixture, dice local/visitante). Los otros se **simulan con la misma escala de goles** (binomial ~1.5 por equipo, tope 4; promedio verificado: 3 goles/partido).
- **Tabla de posiciones** PJ G E P GF GC DG PTS ordenada por puntos/DG/GF, con mi equipo resaltado **y marcado con ►** (accesible daltonismo). **Goleadores** top 6: yo con mi nombre "(VOS)", rivales genéricos por camiseta ("El 9 de…"), sin nombres con apariencia real.
- Pantalla de temporada entre fechas: próximo rival, mi posición, equipo libre, resultados de la última fecha, botón JUGAR/SIMULAR FECHA.
- Final de temporada: **campeón**, mi posición final y mis goles. Botón NUEVA TEMPORADA (regenera fixture, conserva la carrera).
- **Guardado único retrocompatible** en `pampa_star_v1`: a un guardado viejo se le agrega `temporada` sin pisar nada (verificado con un save pre-temporada).
- Guard anti doble-aplicación del resultado (CONTINUAR + Inicio no duplican la fecha).

### Bloque 3 — Tiros especiales ✅
- **Sistema de niveles:** subís de nivel cada 3 goles de carrera (`GOLES_POR_NIVEL`). Nivel visible en la ficha de la intro; al cruzar un nivel, banner "🌟 ¡NIVEL X!" en la pantalla final con lo que desbloquea.
- **Disparo del Caldén (funcional, nivel 3):** aparece en el mano a mano; cuesta **25 Guts**, mejor chance (Tiro ×1.30 + Carácter), botón con estilo especial mostrando % y costo. **Animación dramática**: grito en pantalla, pelota disparada con estela de fuego (#ff8c3a/#f6c11d) y textos propios de gol/atajada.
- Estados del especial siempre etiquetados con TEXTO (accesible daltonismo): activo con "% · -25 GUTS", bloqueado "NIVEL 3", sin energía "GUTS 25", futuro "PRÓXIMAMENTE".
- **Definidos pero bloqueados (desbloqueos futuros):**
  - 🌊 **TIRO ATUEL** (nivel 5, 30 Guts, ×1.45): rasante y serpenteante como el río, entra pegado al pasto.
  - 🌪️ **TORNADO PAMPEANO** (nivel 7, 40 Guts, ×1.60): chilena con el viento del oeste, casi imposible de atajar.

### Revisión adversarial post-bloques ✅
3 agentes revisores (máquina de estados / datos-guardado / UI móvil) sobre el archivo final: 14 hallazgos → 8 problemas únicos, **todos arreglados y verificados**:
1. El teclado global se tragaba a/s/d/w y flechas al escribir el nombre (alta).
2. Tu sprite se distinguía de los rivales solo por color de camiseta → ahora tiene **flechita ▼ blanca con borde** (forma, apto daltonismo) (alta).
3. Recargar en la pantalla final permitía rejugar la fecha inflando la carrera → la fecha se consume en el mismo guardado del final.
4. Cambiar de club a mitad de temporada corrompía la temporada → ahora avisa y arranca temporada nueva.
5. D-pad con mouse quedaba trabado si el combate tapaba el botón → pointer capture + direcciones apagadas al congelar.
6. El ¡GOLAZO! del tiro especial se borraba por una carrera de timeouts en flash().
7. El nombre del jugador se inyectaba como HTML en goleadores → escapado.
8. Guardados viejos con stats incompletas daban NaN% → merge con defaults + validación del JSON.

### Capa 3 — Vida y amigos ✅ (jul 2026)
- **Semana entre fechas** (3 puntos por semana): ENTRENAR (+1 stat, tuya o del grupo), DESCANSAR (+15 Guts para la fecha), JUNTARSE (+vínculo), VIVIR (eventos pampeanos: changa, asado, mandar plata a la familia, río, pensión → plata o ánimo), RECLUTAR.
- **El Guts se arrastra entre partidos** (queda en 75 tras cada fecha; descansar lo recupera). El ánimo pesa un poquito en las stats. **Sueldo modesto** por fecha + premios por gol/victoria.
- **Los 4 amigos:** personajes inventados, **el nombre lo pone quien juega** (nunca personas reales); posición neutra (Arco/Defensa/Volante/Ataque), stats propias sesgadas al puesto, se entrenan y mejoran con la semana. Lista con mini-sprite, pinta etiquetada, stats y barra de vínculo CON número.
- **El vínculo pega en la cancha:** PASE y PARED se juegan CON un compañero del grupo; el vínculo suma chance real (el botón muestra "con X · vínculo N" y el % ya lo incluye; la pared pondera más). Ganar la jugada juntos da +1 vínculo. Círculo cerrado: vivís → vínculo → jugás mejor → más vida.
- **Modelo género neutro:** sin campo de género, textos sin él/ella (a futuro se puede jugar con chicas o chicos; la Liga Cultural tiene Primera Femenina real).
- **Variantes pixel etiquetadas** (regla dura daltonismo): piel (3), pelo (5, con FORMA: rapado/corto/largo) y camiseta (3, con FORMA: lisa/franjas/banda). Cada variante tiene NOMBRE visible; nada se distingue solo por color; HEX en el código. Personalización "Tu pinta" en la intro con preview, y mini-sprites de los amigos con su pinta.
- Guardado único retrocompatible (`vida` y `look` se agregan a saves viejos sin pisar nada).

### Revisión adversarial de la Capa 3 ✅ (7 hallazgos únicos, todos arreglados)
1. Saneo profundo del guardado en `ensureVida`: `puntosSemana`/amigos corruptos ya no regalan puntos infinitos ni congelan el partido (reparación EN el objeto, sin romper referencias vivas).
2–4. Textos género-neutros: meta description e intro sin "pibe", default "Promesa" (antes "El Pibe"), "a jugar en equipo" (antes "juntos"), "Aguantás firme" (antes "Lo esperás parado").
5. Cambiar de club ahora resetea la vida como NUEVA TEMPORADA (sin semana fantasma, Guts 100).
6. Pelos con FORMA propia: "Corto claro (flequillo)" y "Largo colorado (vincha #0a1f13)" — ningún par se distingue solo por color.
7. `renderPinta` e `initIntro` normalizan índices de look fuera de rango (no rompe el arranque).

### Partido V2 "Con equipo se juega mejor" ✅ (spec: DISENO_PARTIDO_V2.md)
- **A — Equipo 5v5:** vos + amigos SIEMPRE en su posición + canteranos de relleno (1-1-2-1); movimiento por anclas con elasticidad por rol; Guts POR JUGADOR (HUD: GUTS·NOMBRE); rival espejado.
- **B — Minimapa:** plano completo entre marcador y campo; míos ● / rivales ▲ / controlado ▼ / pelota ◎ / arcos [ ] — FORMA antes que color; tooltip al tocar (nombre·pos·vínculo).
- **C — Pase real:** submenú de hasta 3 receptores (%, dirección con flechas, ★dupla, intercepción por línea de pase); éxito = control PASA al receptor ("AHORA JUGÁS: X"); PARED 1-2 (+1 vínculo, automática con ≥70); JUGADA ARMADA (3 pases → +10% y el equipo sube); pase 2 Guts / 1-2 min. Especiales solo si llegás VOS. Gol de amigo: para el equipo + su vínculo + goleadores con su nombre.
- **D — Roles:** tabla PESOS_POS afinable; VOL: P. FILTRADO ▸ (sin presión, pase×0.8+carácter×0.3); DEF: SUBIDA (−10%) y DESPEJE (100% seguro → dividida lejos); defensa con CIERRE del amigo DEF; **ARQUERO JUGABLE**: ATAJAR / DESPEJAR (+seguro, dividida) / ATAJADA ESPECIAL (amigo ARQ vínculo≥50, −20 Guts, +25%); con cantera solo ATAJAR.
- **E — Química visible:** ★dupla en pases, doble borde ◉ en minimapa, pizarra de duplas en la semana (pase/pared por vínculo), DUPLA DE LA TARDE (+1 vínculo post-partido).
- **F — Ritmo:** MINUTOS_POR_ACCION [3,5]; pase casi no quema reloj; marcaje selectivo POR TERCIO (radio 26, correr libre ES libre); **pelota dividida** (45% contra / 35% disputa automática / 20% lateral con pase tuyo).
- **Desvíos documentados de la spec:** CAMBIO DE FRENTE del VOL y el avance rival por fases (F3) quedan para el tuning v2.1; la retención >4s tampoco entró. La simulación de sanidad de 500 partidos (F5) queda pendiente para la pasada de balance.

### 🗺 HOJA DE RUTA ACORDADA (jul 2026, orden de Rodri)
1. **Partido v2** según `DISENO_PARTIDO_V2.md` (spec de Cowork, en el repo): 5v5 con amigos reales, minimapa, pase real, roles, química visible, ritmo. VA PRIMERO.
2. Tanda de integración: arte/sonido/controles/inicio/avatar (sobre el partido v2). NOTA: los módulos `pampa-star-sprites.js`, `pampa-star-audio.js` y `ARTE.md` actuales son ORIGINALES creados en sesión (el material de Cowork nunca llegó a la carpeta); la dirección de arte/sonido se está reconsiderando aparte y habrá un pase dedicado de assets cuando se defina.
3. Escalera de ascensos y fichajes.

### NO hecho a propósito (etapas aparte, definidas en el addendum)
- Rotación de plantel (amigos que van con vos o se venden cuando cambiás de club).
- Planteles reales rivales (harvest de formaciones publicadas).

## ⏹ Lo que sigue
- Escalera de ascensos (Primera A → Regional → AFA → Primera → Europa → Selección).
- Rotación de plantel y planteles reales (guardas de la sección 15 del addendum).

### Para afinar jugándolo
- Balance: chances de los duelos, costo de Guts, fuerza del arquero propio (`myKeeperSkill`), escala de goles simulados (`simGoals`).
- Constantes a mano arriba del script: `VELOCIDAD_JUGADOR`, `VELOCIDAD_RIVAL`, `MINUTOS_POR_ACCION`, `GUTS_ENTRETIEMPO`, `GOLES_POR_NIVEL`.
