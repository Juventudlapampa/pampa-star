# PAMPA STAR · AUDITORÍA TOTAL

Nueve roles de desarrollo mirando el mismo juego, cada uno con su lente, en dos vueltas.
Los bugs pasaron por escépticos que intentaron refutarlos antes de entrar acá.

**115 hallazgos únicos** · 84 bugs · 31 sugerencias

| severidad | cuántos | qué significa |
|---|---|---|
| **CRÍTICA** | 4 | viola una regla dura del proyecto, o rompe el juego |
| alta | 34 | el jugador lo sufre seguido |
| media | 59 | se nota |
| baja | 18 | pulido |

**Por área:** balance 37 · texto 14 · ux 13 · datos 12 · accesibilidad 11 · estado 11 · arquitectura 6 · onboarding 5 · visual 4 · crash 1 · rendimiento 1

---

## Lo que hay que saber antes de leer la lista

**El juego no tiene rival.** Es el hallazgo que ordena todo lo demás: `poderRival()` devuelve 52 constante, no lee stats ni división, y el ataque rival es `poderRival + 12` fijo. Tu arquero ataja el 93,6% de los remates. Simulado sobre la lógica real con stats 50 en todo: **ganás el 87% en Primera B y el 61% en el Mundial, con 0,2 goles en contra en las cinco divisiones.** Salís campeón el 95-98% de las temporadas sin entrenar nada, y llegás a la gloria en 5,8 temporadas promedio. La escalera de divisiones existe en los datos y no llega al duelo.

**Y hay opciones dominantes que vacían la decisión.** PASE en el cruce esquiva la matriz entera —`corte>pase` no ocurre nunca— y da 72-74% por 20 de aguante, contra gambeta 53% por 90. UNO-DOS cuesta más que GAMBETA, gana menos y avanza menos. En la Definición, AL MEDIO está dominada por 7-17 puntos. El aguante, que es la economía central, nunca aprieta: los costos del menú son decoración frente a lo que recuperás.

**Falta la mitad de la auditoría.** Siete de los trece roles no alcanzaron a correr antes del límite de sesión: audio, arte, onboarding, arquitectura, mobile/rendimiento, integridad de datos y productor/coherencia. Lo que sigue son seis lentes, no trece.

---

## Los 10 que haría primero

| # | qué | por qué primero |
|---|---|---|
| 1 | El crash del segundo partido | **Ya arreglado y commiteado.** Congelaba el juego en la fecha 2 del Master. Era mío. |
| 2 | FM El Caldén es una radio real | Regla dura violada, está en pantalla, y se arregla en minutos cambiando un string. |
| 3 | Los clubes reales de Primera B | Regla dura, y el showcase público promete lo contrario. Decisión tuya, no parche. |
| 4 | Que el rival ataque de verdad | Sin esto no hay juego: ganás el 87% sin hacer nada. Todo el balance cuelga de acá. |
| 5 | Que la división entre al duelo | `mult_stats` es una perilla muerta fuera del jugadón. Es lo que hace que la escalera signifique algo. |
| 6 | PASE domina el cruce | Vacía la decisión más frecuente del juego. Una opción que esquiva la matriz no es una opción. |
| 7 | Los avisos en la capa invisible | Once mensajes que nadie ve nunca. La enfermedad de siempre, y son minutos. |
| 8 | Los atajos 1-0 de la semana se apilan | Una tecla llena dos ranuras: corrompe la semana y es un `once()` sin `off`. |
| 9 | Recargar duplica las mejoras | Se puede repetir sin límite. Es la única cosa de la lista que un jugador puede explotar. |
| 10 | El relator dice "¡GOL de VOS!" | Rompe la voz del juego en su momento más importante, y es un string. |

---

## CRÍTICOS · 4

### 1. Sección 11: la Primera B usa clubes REALES de la Liga Cultural mientras el showcase público promete "100% ficticios"

`**BUG** · datos · horas`

**Dónde** · data/divisiones.json:7 (primera_b) · data/divisiones.json:3 (_doc) · assets_drive/PAMPA_STAR_TODO_FINAL/04_Web_Showcase/index.html:508 · phaser/test/seccion11.test.js:70

**Evidencia** · Búsqueda web (winifreda.com.ar, Copa de la Liga Cultural 2026): Deportivo Winifreda integra la Zona A junto a Carro Quemado, Cochico y Deportivo Telén — cuatro de los nueve rivales de `primera_b` son clubes reales con esos nombres. El propio `_doc` de divisiones.json lo reconoce («los MISMOS 9 clubes públicos de la Liga Cultural») y el GDD:317 dice «Primera B de la Liga Cultural». Pero el showcase (index.html:508) afirma «PAMPA STAR no utiliza nombres de jugadores, clubes, ligas ni relatores existentes. Toda la Liga Pampeana [...] 100% ficticias», y seccion11.test.js solo prohíbe 13 clubes profesionales, así que el guardián no lo ve. En Primera A, declarada FICTICIA, «Alvear Fútbol» es casi el nombre del Alvear Foot Ball Club real de Intendente Alvear (a verificar). Es una decisión documentada, pero contradice la regla dura de esta auditoría y la promesa pública.

**Arreglo** · Decisión de Rodri, en una sola dirección: (a) ficcionalizar los nueve (mismo pueblo, otro nombre: «Winifreda Fútbol Club», «Sportivo Telén», «Los Caldenes de Cochicó») y agregar sus nombres actuales a la lista negra del test; o (b) declarar por escrito que los clubes de liga amateur son "públicos" y permitidos, y corregir el showcase que dice lo contrario.

### 2. Sección 11: "FM El Caldén" es una radio real de La Pampa (99.9, Bernasconi) y está en pantalla como la radio del entrevistador

`**BUG** · texto · minutos`

**Dónde** · data/entrevista.json:5 · phaser/scenes/master.js:675

**Evidencia** · entrevista.json declara `nombre: "Nito Carrizo, de FM El Caldén (\"Tercer Tiempo\", de la tarde)"` y master.js:675 lo dibuja (`E.entrevistador.nombre`). Búsqueda web: existe «FM El Caldén 99.9 Bernasconi, La Pampa» (tv-argentina.com.ar, caldenfm.com.ar), además de FM Caldén 92.5 (Santa Rosa) y FM Caldén 89.9 (Intendente Alvear, Cadena 3). La nota `_notas` de data/relatos.json fija la regla del propio proyecto: «NUNCA personas reales ni medios reales». seccion11.test.js no lo caza porque su lista de marcas es solo de videojuegos y clubes profesionales.

**Arreglo** · Renombrar a una emisora inventada que no exista (verificar con una búsqueda antes de commitear), p. ej. «FM La Tranquera 103.1» o «Radio Alambrado»; y sumar `caldén fm|fm el caldén` a MARCAS en seccion11.test.js para que no vuelva.

### 3. El segundo partido de la sesión se congela: refrescarHUD hace setText sobre txtMano destruido (TypeError por frame, el loop de Phaser muere)

`**BUG** · crash · minutos`

**Dónde** · phaser/scenes/match.js:4733-4737 (cache perezoso) · init() 103-192 no lo reinicia (cf. 139/148/185 que sí reinician los otros caches)

**Evidencia** · Reproducido en vivo en localhost:8123 (Phaser 3.80.1, loop manejado con loop.step): partido 1 crea txtMano con _hudMano='◆ FOGONAZO ◆ PUÑALADA'; tras match.scene.restart() → txtMano es LA MISMA referencia (mismaRef:true) con active:false y scene:undefined, y _hudMano conserva el texto viejo. Apenas cambia la mano (puse st.ctrl en un VOL, lo mismo que hace cambiarAlMasCercano al defender o el cooldown de una carta), el step tira: 'TypeError: Cannot read properties of null (reading cut) at setSize ← updateText ← setText'. En el vendored phaser.min.js el RAF es `this.step=function e(i){t.callback(i),t.isRunning&&(t.timeOutID=window.requestAnimationFrame(e))}`: si callback tira, no se vuelve a pedir el frame → el juego queda clavado. Aplica a la fecha 2 del Master (scene.start desde master) y a '↺ OTRO PARTIDO' (scene.restart, match.js:4178). Es exactamente el bug de _radarTuArco de P1, otra vez.

**Arreglo** · En init() agregar `this.txtMano = null; this._hudMano = null;` (misma línea que _hudFichas/txtFichas, match.js:148).

### 4. El rival casi no puede hacerte goles: convierte ~3% de sus remates en las 5 divisiones y perdés 0-3% de los partidos

`**BUG** · balance · horas · visto por 2 roles`

**Dónde** · phaser/logic/partido.js:396-401 (poderRival base 52 fija) · :1039 (atkRiv = poderRival + 12) · :1028 (tu arquero fisico*0.7 + caracter*0.4) · phaser/logic/definicion.js remateRivalAuto (bonus arquero + bloqueo)

**Evidencia** · Simulé 150 partidos por configuración con la lógica pura real (dis_sim_partido.js en el scratchpad; tick con dt 300, cruces, duelos, remateAuto, resolverAtajada, entretiempo). Resultado con VOS a 50 en todo: Primera B G 87% E 12% P 2%, GC 0.23; Mundial G 61% E 37% P 3%, GC 0.20. 'Te rematan' 7-10 veces por partido y entran 0.2-0.3: conversión 2.7-4.4%. La cuenta: tu arquero de roster vale ~67 + bonus de remateRivalAuto (~+22: nivel, tanque lleno, distancia) = ~89 contra un ataque rival FIJO de 64 (52+12, no lee ni stats ni división) → duelChance ~0.93 de atajar, y encima ~30% se bloquea antes. Y defender no cambia nada: política NO MOVERSE siempre → GC 0.27, política 'mejor stat' → GC 0.27 (misma cifra), te rematan 9.9 vs 8.4. En el Mundial igual (0.31 vs 0.32). Consecuencia en la temporada: con 60% de victorias sos campeón el 70% de las veces y con las medidas (84-97%) el 100%; descenso 0%.

**Arreglo** · Que el ataque rival salga de los stats del rival que remata (tiro/caracter del portadorRival, ya multiplicados por la división) en vez de poderRival+12 fijo, y bajar el bonus del arquero por 'lejos' (arquero_peso_lejos 18 sobre remates a 200px) hasta que la conversión rival quede en 10-15% en Primera B y 20%+ en el Mundial. Verificar con la sim: GC por división tiene que subir con la escalera.

> Otro rol lo midió aparte: Con el ARQ del roster (Thiago, fisico 63 / caracter 58): base 67.3 + bonusArquero de remateAuto 22 (nivel +3.6, aguante +10 SIEMPRE porque tu arquero nunca gasta — medido en 100 partidos: aguante mínimo del ARQ 1000 y 0 ticks como ctrl —, lejos +8.6 porque el rival remata siempre desde x<200) = 89.3 contra 64 → duelChance ataja 93.6% (97.4% con la CPU en picada), y encima pBloqueo 0.2. Sim 200 partidos por división: GC 0.13-0.19 por partido, 2-3% de los remates rivales, derrotas 3.5/4.5/4.5/4.5/5.5%. Hasta eligiendo NO MOVERSE en todos los cruces defensivos se pierde solo el 14%. Con spread 100 (más azar) GC sube a 0.72: el problema es el margen 89 vs 64, no el dado.

## SEVERIDAD ALTA · 34

### 5. Nelda y el Tuli festejan un quite nuestro cuando al que le cortaron el pase fuiste VOS

`**BUG** · texto · minutos`

**Dónde** · phaser/scenes/match.js:486 (MAPA corte → "quite") · data/tribuna.json evento "quite"

**Evidencia** · El mapa de relatar() traduce `corte: "quite"`. `corte` se relata solo en dos lugares y los dos son pérdida tuya: match.js:3964 («¡CORTARON LA PARED!», tras P.perderPelota) y match.js:4327 `if (!win) this.relatar("corte")` en el desenlace de TU pase (animarPase). Las líneas de tribuna.json para "quite" son de recuperación nuestra: «Se la sacó y salió jugando.» / «Ahí, ahí. Ahora no la devuelvan.» / «Esa pelota era de nadie y la hizo nuestra.». Resultado: cada pase tuyo interceptado dispara a los dos de la tribuna celebrando.

**Arreglo** · En el MAPA de match.js:486 cambiar `corte: "quite"` por `corte: "error"` (o crear un evento "perdida" en tribuna.json con 6 intercambios propios: «Ese pase tenía dueño y no era el nuestro»).

### 6. El relator dice "¡GOL de VOS!" y "¡Pasó uno VOS!" cada vez que sos vos el que la mete o gambetea

`**BUG** · texto · minutos`

**Dónde** · phaser/scenes/match.js:497 (y 2781, 3347) · data/relatos.json relator.gol[2], gambeta_win[1]

**Evidencia** · match.js:497 arma el contexto con `c.jugador = j.esVos ? "VOS" : j.nombre`, y 2781/3347 pasan `{ jugador: tirador.esVos ? "VOS" : tirador.nombre }`. Simulado en node con PampaRelator sobre data/relatos.json y jugador "VOS": salen «¡La clavó donde el viento no la saca! ¡GOL de VOS!» y «¡Pasó uno VOS! La lleva atada.». El jugador SÍ tiene nombre: match.js:630 pone `nombre: career.name` (cae a "VOS" solo si no hay carrera).

**Arreglo** · En match.js:497/2781/3347 pasar `j.nombre` (career.name) en vez de "VOS" y dejar "VOS" solo para etiquetas de HUD; o reescribir las dos líneas con {jugador} para que funcionen en segunda persona («¡GOL tuyo!», «¡Pasaste uno! La llevás atada»).

### 7. Las etiquetas de los botones de la Definición (9 px) y de la cruz de comandos (10 px) están por debajo del piso de legibilidad que el propio proyecto calculó: 6,5 y 7,2 px reales en teléfono

`**BUG** · texto · horas`

**Dónde** · phaser/scenes/definicion_ui.js:249-250 · phaser/scenes/match.js:2169-2171, 2182-2183

**Evidencia** · node phaser/test/legibilidad.test.js imprime: "DEUDA: 34 textos por debajo de 12 px lógicos (8.7 reales en teléfono). El más chico: 9px en definicion_ui.js:249. Por archivo: match 19, master 7, definicion_ui 3, editor 3, jugadon_ui 2" — y el test NO falla por eso, sólo si el número crece. balance.legibilidad.texto_info_min = 12 y su criterio de agudeza pide ~10 arcmin de altura de mayúscula (≈15,5 lógicos). La fuente display real es Archivo Black (balance.tipografia.display, aplicada en index.html:252); leí capHeight = 688/1000 del TTF: a 9 px la mayúscula mide 9×0,688×0,7222 = 4,5 px reales (5,7 arcmin con la proporción del test), a 10 px 5,0 px (6,3 arcmin). Los dos casos son las decisiones centrales del juego (TIRO/GAMBETA/PARED y la cruz N/S/E/O).

**Arreglo** · defBoton: título a 12 px y sub a 11 (el rect mide 52 de alto, entra 12+11 con 4 de aire); cruz: título a 12 px (el rect es 176x50). Después bajar el registro _legibilidad_deuda.json para que el test proteja el avance.

### 8. Modo Master: con teclado no se puede ARRANCAR la carrera ni JUGAR LA FECHA (ni deshacer una acción de la semana)

`**BUG** · accesibilidad · horas`

**Dónde** · phaser/scenes/master.js:163-167 (boton), 413/426/429 (vistaElegir), 1490/1515/1522/1536 (vistaTemporada), 235-237 (salidaDeLaCarrera), 884-889 (✕ sacar de la semana)

**Evidencia** · boton() (163-167) sólo registra pointerdown. grep keyboard en master.js: únicos handlers son LEFT/RIGHT del mapa (375-377), ONE..FOUR de la entrevista (616) y 1..0 de la semana (958-960); grupoFoco sólo en 308 (borrar carrera), 566 (pueblos del mapa: _focoMapa contiene sólo los puntos, no el botón ARRANCAR), 622 (entrevista), 990 (semana, que sí incluye _btnJugar) y 1343 (evento). vistaTemporada (1348-1545) no tiene ni una tecla ni foco: JUGAR LA FECHA / PASAR LA FECHA / NUEVA TEMPORADA / EDITOR son inalcanzables sin puntero. El ✕ de 884-889 tampoco entra a _focoSem.

**Arreglo** · Que boton() acumule {obj:r, cb} en this._focoVista y que vistaElegir/vistaTemporada terminen con this.grupoFoco(this._focoVista) (mismo patrón de vistaSemana 984-990). Agregar el ✕ de la ranura a _focoSem con su cb sacarDeLaSemana(i).

### 9. La Definición ofensiva (la escena estrella) no se puede jugar con teclado: TIRO/CABEZA/CHILENA/GAMBETA/PARED/PASE y las 3 zonas sólo reciben pointerdown

`**BUG** · accesibilidad · horas`

**Dónde** · phaser/scenes/definicion_ui.js:248-255 (defBoton), 257-280 (defBotonesOf), 466-480 (defZonas)

**Evidencia** · grep de keyboard|keydown|grupoFoco|ENTER|SPACE en definicion_ui.js: la única lectura de teclado es el polling de cursors para MOVER al jugador en fase 1 (líneas 742-746); defBoton registra sólo r.on("pointerdown") y nunca entra a grupoFoco (a diferencia de jugadon_ui.js:396 que sí lo hace). ESPACIO cae en match.js:1965-1967 onBotonAccion, que retorna si estado !== "LIBRE", y la definición pone estado = "DEFINICION" (definicion_ui.js:114). ESC (match.js:408) sólo atiende PASE y MENU. GDD §12: "sin mouse como requisito (todo con dedo o teclado)". La defensiva no tiene decisión (escenas_v9.js:324 escenaRemateRival es automática), así que el hueco es sólo ofensivo.

**Arreglo** · En defBotonesOf y defZonas juntar los rects que devuelve defBoton en una lista y llamar this.grupoFoco(lista, { inicial: 0, volver: () => salir por PASE }) igual que jugadon_ui.js:396; cerrarFoco al cambiar de fase. Son ~15 líneas porque el cursor ya existe.

### 10. '▶ VER INTRO' muestra pantalla negra los 20 segundos: corteSeco() hace tweens.killAll() y mata el fundido de entrada, el velo queda opaco a depth 99999

`**BUG** · visual · minutos`

**Dónde** · phaser/scenes/intro.js:132 (corteSeco → killAll) · 103-104 (arrancarOpening llama corteSeco en el mismo create cuando introPedida) · piel_ui.js:514-527 (entrarDesdeNegro crea el velo alpha 1 y lo baja con un tween cuyo onComplete lo destruye)

**Evidencia** · En vivo: con introPedida=true y restart de la intro → tras create hay un Rectangle 2400x1600 depth 99999 alpha 1 y `intro.tweens.getTweensOf(velo).length === 0`; después de 1,5 s de reloj REAL (maxLag levantado para que cuente) sigue alpha 1, active true. Control por la compuerta (introVista=false): el velo tiene 1 tween y a los 1,5 s está alpha 0 y destruido. Todo lo que dibuja la intro (capa, fxG, el 'tocá para saltear' depth 99) queda debajo del velo. El camino de la primera vista no lo sufre porque la compuerta no llama corteSeco.

**Arreglo** · En corteSeco reemplazar tweens.killAll() por this.tweens.killTweensOf(this.capa.list) (y los targets propios de los planos), o arrancar el opening en el onComplete del fundido de entrada.

### 11. LA SEMANA: los atajos 1-0 se apilan en cada repintado (keyboard.once sin off) — una tecla llena DOS ranuras y gasta doble energía

`**BUG** · estado · minutos`

**Dónde** · phaser/scenes/master.js:960 (registra once por tarjeta) · 1180 (momentoDeAccion repinta vistaSemana a los 950 ms) · sin ningún keyboard.off/removeAllListeners en master.js

**Evidencia** · En vivo con carrera nueva (Club Winifreda, energía 100): pintado 1 → listenerCount de keydown-ONE..SEVEN = 1 cada una. Apreto '1' → entrenar_tiro; tras el repintado, keydown-TWO..SEVEN tienen 2 listeners cada una. Apreto '2' UNA vez → elegidas = ['entrenar_tiro','entrenar_gambeta','entrenar_gambeta'], energía 100→25, dos overlays de momentoDeAccion apilados (overlays:2). La semana entera se armó con dos teclas. El comentario de 927-931 dice que ese apilamiento ('apretabas 1 y te llenaba media semana') se arregló con el cursor — el cursor se agregó, los once quedaron. Y el título de la lista (918) sigue anunciando '(teclas 1 a 0)'.

**Arreglo** · Guardar los handlers en un array de la escena y hacer keyboard.off de todos al principio de vistaSemana (igual que G._teclas en foco_ui.js:224); o sacar los atajos numéricos y dejar sólo el cursor.

### 12. El guardián p1_estado_limpio [4] (caches perezosos) tiene el regex sin backslashes y matchea 0 líneas: pasa en verde vacío y por eso txtMano se le escapó

`**BUG** · arquitectura · minutos`

**Dónde** · phaser/test/p1_estado_limpio.test.js:117

**Evidencia** · El regex escrito es /ifs*(s*!s*this.(_?[A-Za-z][w]*)s*)/ (perdió \s, \(, \., \w — `(` abre un grupo, no un paréntesis literal, y `[w]*` sólo matchea la letra w). Corrido contra match.js con node: 0 líneas. Con el regex correcto /if\s*\(\s*!\s*this\.(_?[A-Za-z]\w*)\s*\)/ + add/make en las 3 líneas siguientes: 3 matches (179 comentario, 4463 _radarTuArco — limpio, 4733 txtMano — SUCIO). O sea que arreglado el regex el test se pone rojo exactamente en el bug crítico de arriba. Enfermedad B en el propio guardián: el mensaje '[4] ningun cache perezoso queda con la referencia muerta' se imprime siempre.

**Arreglo** · Restaurar el regex y agregar una contraprueba (un cache inventado sin reinicio tiene que ponerlo rojo), como hace desconectados.test.js.

### 13. Desde el segundo partido la división del HUD queda en blanco: _hudDiv no se reinicia y txtDivision nace vacío

`**BUG** · estado · minutos`

**Dónde** · phaser/scenes/match.js:4657 (compara contra el cache) · 4588 (txtDivision se crea con "") · init() 139 reinicia _hudMarc/_hudReloj/_hudGuts/_hudEnvion pero no _hudDiv

**Evidencia** · En vivo: partido 1 → txtDivision.text='PRIMERA B'; tras el restart (misma división, que es el caso normal de una temporada) → _hudDiv sigue en 'PRIMERA B', txtDivision es un objeto nuevo (txtDivisionRecreado:true) y su text es "" — la guarda `this._hudDiv !== division` da falso y nunca se escribe.

**Arreglo** · Agregar `this._hudDiv = null` al reinicio de caches de init() (match.js:139).

### 14. En el cruce, PASE domina: 72% de éxito por 20 de aguante y sin pasar por la matriz, contra gambeta 53% por 90 (el menú dice 'corte>pase' y el corte nunca se aplica)

`**BUG** · balance · horas`

**Dónde** · phaser/scenes/match.js:2296-2299 (título con 'corte>pase' y W: PASE → iniciarPaseDirigido, sin resolverDuelo) · phaser/logic/partido.js:724-737 (pct del receptor) · deuda anotada en GDD 16.4, acá va medida

**Evidencia** · 1016 pases en cruces simulados (B): pct promedio 72.4, mínimo 49, 83% de los pases ≥70%; la elección secreta de la CPU (eleccionCPU) no se consulta. Gambeta 50 contra poderRival 52 con cpu_pesos: 32.8% si leyeron, 65.9% si zafaste, esperado 52.6%, y cuesta 90. Sim 200 partidos: política 'pase en cada cruce, tiro cuando se puede' 80% de victorias y GF 1.56 contra 74.5% y 1.35 con gambeta; además con pase la CPU casi no gasta tanque (picada 2.5% vs 9.4%) porque el pase no dispara gastar(rival). Perfil 'garra' (quite 0.55) castiga la gambeta y regala el pase: 76% vs 66%.

**Arreglo** · Que el pase elegido en un cruce pase por resolverDuelo con accion 'pase' (CONTRA ya tiene pase→corte) y recién después por el pct del receptor, o restarle matriz_bonus al pct cuando la CPU eligió corte y cobrarle a la CPU el costo del corte.

### 15. El preset de tempo es una perilla de dificultad: en LARGO la CPU se funde y ganás el 95%, en RELÁMPAGO nadie hace goles

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:365-371 (saltoReloj recupera recuperacion_por_minuto_salto × minutos) contra :402-405 y :614 (costos por acción) · phaser/data/balance.json:288-300 (tempo.presets)

**Evidencia** · Sim regional, 200 partidos, solo cambiando tempo.minutos_por_momento: 5 (RELÁMPAGO) → GF 0.39, victorias 31.5%, empates 62%, CPU en picada el 0% de los momentos, aguante rival final 862; 2.2 (INTERMEDIO) → GF 1.12, 64%, picada 9.8%, rival 254; 1.2 (LARGO) → GF 2.94, 95.5%, picada 53.8%, rival 12.6. Los costos se cobran por momento y la recuperación por minuto de reloj, así que el preset cambia el balance neto del tanque de los dos lados (el tuyo también: 970 vs 584 al final). El GDD 5.1 vende el preset como ritmo puro.

**Arreglo** · Recuperar por momento (una perilla recuperacion_por_momento) en vez de por minuto, o escalar los costos por (minutos_por_momento / 2.2) en gastar(); recalibrar cpu_umbral_frac después.

### 16. TIRO desde la mitad de cancha es una trampa: el botón muestra el '% de zafar' del bloqueo, no la chance de gol, y tirar apenas se puede rinde 74% de victorias contra 92% esperando al área

`**BUG** · ux · horas`

**Dónde** · phaser/scenes/match.js:2289 (pct = duelChance(a.poder, poderRival)) y :2322 (botón TIRO) · phaser/logic/partido.js:850-852 (dist_tiro 525)

**Evidencia** · Tabla con resolveShot real: desde x=750 la chance de gol es 48% (B) y 15.6% (Mundial); desde x=900, 95% y 35%. El menú en x=750 muestra ~60% ('% de zafar', que es solo el duelo contra el bloqueo). Sim B, 200 partidos: 'tiro apenas x>525' → 74.5% de victorias, GF 1.35, gol/tiro 22.8%, x promedio del remate 743; 'tiro solo si x>900' → 92.5%, GF 2.11, gol/tiro 67%; umbral 700 → 88.5%, 800 → 90.5%. Con dist_tiro 300 en balance: GF 1.12→1.77 en regional.

**Arreglo** · Mostrar en el botón TIRO la chance de gol real (Duel.resolveShot ya devuelve chancePct con distancia; se puede calcular sin tirar) en vez del duelo, o subir partido.dist_tiro a ~700 para que la opción aparezca donde sirve.

### 17. Sin entrenar y con stats 50 salís campeón el 95-98% de las temporadas en B, A y Regional; con tiro 76 (una temporada entrenando) el 100% hasta en el Mundial: la carrera no tiene techo ni riesgo

`**BUG** · balance · horas`

**Dónde** · phaser/logic/temporada.js:87-91 (golesAjenos), :157-195 (descenso) · consecuencia de los dos hallazgos anteriores

**Evidencia** · temporada_sim.js: 40 temporadas por división, mi partido con el simulador (política gambeta+tiro, defensa quite, todas las stats en 50) y el resto con T.jugarFecha real: campeón 98/95/95/70/20%, posición media 1.0/1.1/1.1/1.7/3.3, descenso 0% en 200 temporadas (la zona de descenso_plazas 2, elegida porque 'solo el último no mordió en 24 temporadas', sigue sin morder nunca). Carrera completa sin entrenar: mediana 8 temporadas hasta la gloria, 29/30 llegan. Con política 'pase a VOS' y tiro 76 (entrenar tiro 3 veces por semana lo da en ~14 semanas: curva s18 = 76.3 en carrera.test.js): campeón 100% en las 5 divisiones, Mundial G/E/P 15.6/2.1/0.4. Los rivales ajenos rinden ~1.4 pts/partido (1º de la tabla sin contarme: 32-33 pts) contra mis 41-52.

**Arreglo** · Se resuelve con los dos anteriores (rival que ataca con sus stats y arquero sin bonus fijo). Además hacer que golesAjenos dependa de la fuerza relativa de los clubes para que el campeón de la tabla ronde 40+ pts y no 32.

### 18. La escalera no toca al rival en los duelos ni en su remate: mult_stats es una perilla muerta fuera del jugadón

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:396-401 (poderRival = 52 fijo), :610, :623, :1039 · phaser/logic/master.js:18-22, 80-88

**Evidencia** · grep de consumidores de stats del rival en scenes+logic: solo jugadon_ui.js:147 (quiteDe) y :538 (gambeta) — el duelo de campo usa def = poderRival(st) y el remate rival atkRiv = poderRival(st)+12, sin leer j.stats. Simulación 200 partidos en regional con DIVISIONES.regional.mult_stats = 0.5 y = 1.5: resultados idénticos al decimal (G/E/P 64/31.5/4.5, GF 1.12, GC 0.17, tiros 6.04). Tabla analítica: poderRival = 52.0 en las 5 divisiones mientras el físico medio del rival tras aplicar() va 45→71; el perfil 'estrella' (mult 1.1) no es más duro que 'toque' (66% vs 64% de victorias). Lo único que sube por división es keeper (40→88): con keeper 40 en regional el partido queda igual a Primera B (74.5%) y con 88 igual al Mundial (38.5%). master.test.js:18 solo verifica que mult_stats crezca, no que se lea.

**Arreglo** · Que poderRival(st) parta de la stat del rival involucrado (fisico del marcador para quite/corte/bloqueo, tiro del ATA que remata en resolverAtajada) multiplicada por el factor de tanque, en lugar de la constante 52. Mínimo viable: base = 52 * division.mult_stats.

### 19. En LA DEFINICIÓN, 'AL MEDIO' está dominada (7-17 puntos menos de gol) y 'AL PALO' vs 'AL ÁNGULO' son la misma decisión

`**BUG** · balance · horas`

**Dónde** · phaser/scenes/definicion_ui.js:470-475 (las tres opciones) y :535 (fuera 0.04/0.08 por dz) · phaser/logic/definicion.js eleccionCPU (pesos 0.14/0.18/0.14/0.16/0.22/0.16) y bonusArqueroPorZona · balance.json:268-270

**Evidencia** · El arquero CPU elige entre 6 zonas con sesgo al centro; el bonus que recibe es coincide +55 / a una +10 / a dos -25 (Chebyshev). Como bajo_centro está a distancia 1 de las otras cinco, el bonus esperado del arquero es 19.9 al medio contra 6.7 al palo y 5.8 al ángulo, y encima el medio tiene más 'fuera' (8.0% vs 6.8%). Simulado 100.000 remates por combinación con desvioDeEjecucion, efectoTiming y resolveShot reales: keeper 40 / tiro 55 → PALO 75.2%, MEDIO 67.9%, ÁNGULO 76.8%; keeper 62 / tiro 55 → 55.2 / 39.2 / 55.8; keeper 88 / tiro 55 → 24.8 / 7.0 / 24.7; keeper 88 / tiro 80 → 54.4 / 37.9 / 55.0. 'A reventarla' no revienta nada, y 'el más seguro' vs 'donde no llega nadie' difieren en menos de 1 punto: la 'decisión' de la escena estrella es una sola opción disfrazada de tres.

**Arreglo** · Que cada opción tenga su contrapartida: AL MEDIO con fuera 0.02 y bonus +6 al poder (la revienta: fuerza), AL ÁNGULO con fuera 0.14 (riesgo real) y a_dos -30, AL PALO como está. Recalibrar con el script hasta que las tres queden a ±5 puntos de gol entre sí con distinta varianza.

### 20. UNO-DOS está dominado por GAMBETA en el cruce: cuesta más (120 vs 90), gana menos y avanza menos

`**BUG** · balance · minutos`

**Dónde** · phaser/logic/partido.js:523 (poder pared = pase*0.8 + mejorVinculo*0.2) · :541-544 (mejorVinculo: solo amigos esAmigo, en Master siempre 0) · :667 (pared avanza sep*0.7, gambeta sep) · balance.json:336-338

**Evidencia** · En el Master no hay amigos (armarPlanteles solo los toma de career.vida.amigos del clásico, match.js:620-627), así que vinculo=0 y el poder del uno-dos es pase*0.8. Calculado con duelChance y los cpu_pesos de los cuatro perfiles (matriz ±12 incluida): VOS a 50 → gambeta 41-51% vs uno-dos 25-33%; sobre los 43 jugadores de campo del roster, gambeta > uno-dos en 30/43 (garra), 42/43 (toque), 36/43 (pelotazo), 37/43 (estrella). Además el uno-dos gana 63 px contra 90 de la gambeta y cuesta 33% más de aguante. No hay ninguna situación en que sea la elección correcta; el menú lo muestra con su % (~25%) al lado de la gambeta (~50%).

**Arreglo** · Darle al uno-dos lo que promete el GDD ('barata a propósito'): costo 60, poder = max(pase, gambeta)*0.9 + vinculo, y que el compañero termine ADELANTE del pasador (control viaja al compa a +sep). O sacarlo del cruce y dejar solo COMBINADA.

### 21. El aguante no aprieta nunca en un partido normal: los costos del menú (20-120) son decoración frente a la regeneración

`**BUG** · balance · horas`

**Dónde** · phaser/data/balance.json:349 (recuperacion_por_minuto_salto 6) · :350 (entretiempo 0.375) · :336-346 (costos) · phaser/logic/partido.js:363-371 (regen en cada salto)

**Evidencia** · Regeneración por momento: 6 × 2.2 min = 13.2 para todo el que no conduce, más 375 en el entretiempo, más 0.2/s; sobre un tanque de 1000 y ~32 momentos por partido son ~800 de regen. Medido en la sim: aguante mínimo de VOS en el partido = 902 (mixta), 758 (GAMBETA en todos los cruces), 680 (tirando libre desde la mitad); momentos con VOS 'rendido' = 0.0 a 1.2 por partido en todas las políticas; ni pared siempre (120 por cruce) baja de 860. Con el control viajando en cada pase, VOS conduce 2-5 momentos por partido. El único gasto que puede negar algo es el Caldén (450) y las cartas (250-430). GDD 7.1: 'sin economía el menú es plano: elegís siempre el número más alto' — es exactamente lo que pasa.

**Arreglo** · Bajar recuperacion_por_minuto_salto a ~2 y la fracción del entretiempo a ~0.25, o duplicar los costos de gambeta/pared/quite/bloqueo, hasta que en la sim VOS pise el umbral de rendido en 3-5 momentos por partido con la política mixta. Mostrar en el HUD cuánto regenera cada momento para que el número se lea como decisión.

### 22. La escalera del Master solo endurece al arquero rival: mult_stats de la división no lo lee ningún duelo

`**BUG** · balance · horas`

**Dónde** · phaser/logic/master.js:17-24 (DIVISIONES mult_stats 0.82→1.3) y :80-97 (aplicar multiplica rivales[].stats) · phaser/logic/partido.js:396-401 (poderRival no mira stats) · :609-630 (resolverDuelo usa poderRival de los dos lados)

**Evidencia** · grep de consumidores de stats del rival: partido.js no lee rivales[i].stats en ningún duelo; los únicos lectores son jugadon_ui.js:147 (quiteDe para el pasillo) y :538 (súper quite). O sea, de las tres cosas que cambia aplicar(), solo rivalKeeperSkill (40→88) llega al partido normal. Medido en la sim (120 partidos por división, VOS a 50): chance de gambeta 65/64/64/64/64%, chance de quite 56/55/56/55/54%, poderRival mínimo 49.7/49.6/49.6/49.5/49.4, GC 0.23 en las cinco; lo único que se mueve es la chance media de MIS remates (90→39%). Con VOS entrenado a 80 (temporada ~5) la escalera desaparece del todo: G 97/97/96/95/94% de Primera B a Mundial, GC 0.28→0.23. 'Cada ascenso tiene que SENTIRSE' (GDD 8.2) hoy es un arquero mejor y nada más.

**Arreglo** · Que poderRival(st) parta del promedio de stats del rival involucrado (defensor del cruce en ataque, portador en defensa) × (0.86+0.14*frac) en vez de la constante 52, y que la intención oculta cuando defendés pese tiro/gambeta/pase reales de ese rival. Recalibrar spread/matriz con la sim hasta que Primera B quede ~70% de victorias y el Mundial ~35-40% con VOS a 80.

### 23. Editor con carrera pendiente: '▶ LISTO, A LA ENTREVISTA' no entra al recorrido del teclado, y el botón que sí entra ('▶ ¡A LA CANCHA!', mismo verde, misma x, mismo ▶) te manda a un amistoso sin vuelta

`**BUG** · accesibilidad · minutos`

**Dónde** · phaser/scenes/editor.js:195-201 (LISTO creado con add.rectangle, no con btn()) vs :171 (_botones solo se llena en btn()) y :175 (¡A LA CANCHA!)

**Evidencia** · Corrido en navegador con registry.carreraPendiente={division:'primera_b'}: e._botones.length=2, e._foco.items = 4 filas + los dos rect de y=500; listoEnFoco=false. Rectángulos interactivos: y=380 → {x:650,w:300,color:7ee08a} (LISTO) y y=500 → {x:650,w:320,color:7ee08a} (¡A LA CANCHA!). Dos botones verdes con ▶ apilados en la misma columna; el de teclado es el equivocado, y el amistoso no tiene salida (hallazgo anterior). El comentario de :140-149 dice que 'los botones de abajo entran al recorrido'.

**Arreglo** · Con carreraPendiente, no crear '¡A LA CANCHA!' y crear LISTO con btn() (queda en _botones y en el foco), dejando un solo botón verde.

### 24. Todos los avisos del partido (avisar) se escriben en mundoLayer, que en pantalla partida es invisible: el jugador nunca los ve

`**BUG** · ux · horas`

**Dónde** · phaser/scenes/match.js:5082-5086 (avisar añade a mundoLayer) · :361 (mundoLayer.setVisible(false) con _split) · :426-428 (hint 'tocá la cancha' también va ahí)

**Evidencia** · Corrido en navegador: m._split=true, m.mundoLayer.visible=false, m.mundoLayer.willRender(cam)=false; tras m.avisar('PRUEBA AUDITORIA') el Text queda con parentContainer===mundoLayer y parentContainer.visible=false, no está en hudLayer. Son 11 llamadores en match.js (:418 'Marcás con…', :469 '⚔ rival juega…', :1830 'Tempo…', :1832 '📋 ficha de la vida', :4200 'No hay a quién dársela…', :4620 '🌟 EQUIPO ENCENDIDO', :4810 '⏰ ÚLTIMOS MINUTOS', :5070) más foco_ui.js:171 ('✗ motivo' al confirmar una opción bloqueada). El comentario P3 en :1225-1235 ya sabía que mundoLayer es invisible y arregló solo la animación del trámite; avisar quedó igual.

**Arreglo** · avisar() y el hint de :426 van a hudLayer (cámara fija), en una franja propia bajo el panel de escena (p.ej. y≈316, sobre la línea del mapa), con cola de 1 mensaje a la vez; y el hint pasa a decir 'tocá el MAPA' en pantalla partida.

### 25. PASE en el cruce es dominante: esquiva la matriz entera (cpu_pesos.corte no pega nunca), 74% por 20 de aguante contra gambeta 53% por 90

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:717-735 (resolverPase, sin resolverDuelo) · partido.js:574 (CONTRA: pase→corte solo lo usa 'pared') · phaser/scenes/match.js:2306 (W: PASE → iniciarPaseDirigido)

**Evidencia** · Política 'siempre PASE en el cruce' vs 'siempre GAMBETA' (300 partidos, Primera B): 97,0% de victorias / 3,07 goles / 0 duelos / 0 momentos rendido / aguante final 723 contra 92,3% / 2,48 goles / 14,4 duelos / aguante final 685. Cuenta analítica: gambeta 50 (+4) vs CPU 52 con quite 40% de los pesos = 0,53 esperado; pase = 68 + (pase-50)*0.5 - riesgo, medido 74% y cuesta 20. La CPU 'elige' corte el 25-50% de las veces según perfil y ese corte no toca nada porque el pase nunca llama a resolverDuelo. Es la deuda del GDD 16.4, ahora medida como dominante.

**Arreglo** · Cuando el pase sale desde un cruce, pasar por resolverDuelo con accion 'pase' (poder = statCtrl pase) y que 'leyeron' (corte) reste al pct antes de rng; o al menos descontar riesgoLinea del rival del cruce como interceptor seguro.

### 26. Las cinco divisiones son idénticas en el duelo: poderRival() es 52 constante y mult_stats solo lo lee el jugadón

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:498-503 (poderRival) · phaser/logic/master.js:76-92 (aplicar) · phaser/scenes/jugadon_ui.js:147,533

**Evidencia** · grep de consumidores de rivales[].stats: solo jugadon_ui.js (quiteDe para los cierres). poderRival() devuelve base 52 * (0.86+0.14*frac) sin mirar ninguna stat. Simulación 300 partidos por división promediando los 9 rivales reales: atkWinPct 56,5 / 54,7 / 54,6 / 56,4 / 55,5 y defWinPct 49,7 / 51,1 / 50,9 / 49,8 / 50,1 en Primera B → Mundial. Lo único que cambia es el arquero (keeper 40→88): gol por tiro 33% → 9%. Los cuatro perfiles de IA tampoco se sienten: garra/toque/pelotazo/estrella dan 89,3 / 89,3 / 88,0 / 90,3% de victorias (estrella, el 'difícil', es el más fácil).

**Arreglo** · Que poderRival lea la stat del rival que cruza (quiteDe(stats) al defender, gambeta/tiro al atacar) multiplicada por la división, en vez de la constante 52; conservar la picada por tanque encima de eso.

### 27. El rival no mete goles: 0,2 por partido en las cinco divisiones; perdés el 0,6% de los partidos en Primera B y el 8% en el Mundial con stats 50

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:1033-1040 (resolverAtajada: atkRiv = poderRival+12) · phaser/logic/definicion.js:remateRivalAuto (bonus arquero) · phaser/scenes/escenas_v9.js:325-345

**Evidencia** · Intercepté resolverAtajada en 300 partidos simulados (Primera B): poder del arquero base 67,3 (fisico*0.7+caracter*0.4 del primer ARQ del roster, Thiago) + bonusArquero medio 21,4 de remateRivalAuto (nivel derivado 61 → +3,6; fracArq SIEMPRE 1 porque el ARQ nunca gasta → +10; lejos 0,48*18 → +8,6) = 88,7 contra atkRiv 62 → duelChance 0,94. Resultado: 44 goles en 929 remates que llegan (4,7%), 6 remates rivales por partido → 0,16-0,2 goles en contra en TODAS las divisiones (golRivalPorTiro 2,5-2,9%). Por eso la defensa no importa: quite/corte/bloqueo dan 92-93% de victorias y NO MOVERSE siempre da 76%. El nivel del arquero cuenta dos veces: en la base y en (nivel-55)*0.6 del bonus.

**Arreglo** · Bajar arquero_peso_aguante (20) y arquero_peso_nivel (0.6) en balance.definicion, o no sumar el bonus sobre una base que ya lleva fisico/caracter; objetivo medible: 25-35% de gol por remate rival en Primera B. Chequear con la misma simulación que golesRival suba a ~1 por partido.

### 28. 'Adivinale la intención' en defensa: la CPU elige uniforme, así que QUITE/CORTE/BLOQUEO valen exactamente lo mismo y VER AL RIVAL no informa nada

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js (resolverDuelo, rama defensiva: `accionRival = ["gambeta","pase","tiro"][Math.floor(rng()*3)]`) · match.js:2385 (título del menú) · phaser/scenes/master.js:977 (espiado)

**Evidencia** · Calculado con duel.duelChance y el balance real (stat 55, tanque lleno): chance esperada de ganar = quite 54% · corte 54% · bloqueo 54%; con rival al 29%: 83/83/83. Los cpu_pesos por perfil (garra 0,55 quite, etc.) se usan sólo cuando la CPU DEFIENDE (eleccionCPU); atacando no hay perfil, posición ni situación (a 200 px de tu arco elige 'pase' con la misma prob. que 'tiro'). La única diferencia entre las tres es el costo (50/60/70) y qué stat tuya pesa. `espiado` (semana.js:183) lo lee sólo master.js:977 para un texto: ninguna pantalla muestra los pesos ni el perfil.

**Arreglo** · Intención rival ponderada por perfil y situación: garra→gambeta, toque→pase, pelotazo→tiro, y `tiro` sube con x < dist_remate_rival*1.5; y que `espiado` pinte los pesos en el menú del cruce ('este equipo: gambeta 50% · pase 25% · tiro 25%').

### 29. La división no entra al duelo ni al remate rival: en el uno-contra-uno Primera B y el Mundial son idénticos, y el rival mete 0,24 goles por partido en las cinco

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:396-401 (poderRival, base 52 literal) · partido.js:1039 (atkRiv = poderRival+12) · phaser/logic/master.js aplicar() (mult_stats)

**Evidencia** · poderRival() es `52 * (0.86 + 0.14*frac)`: no lee stats del rival ni la división. Master.aplicar multiplica `j.stats` de los rivales por mult_stats (0,82→1,3), pero resolverDuelo y resolverAtajada usan sólo poderRival; los stats rivales los leen únicamente quiteDe/gambeta del jugadón. Harness 300 partidos por división (política gambeta): duelos ganados 57/56/56/56/57 % en primera_b/primera_a/regional/nacional/mundial; goles en contra 0,24/0,23/0,25/0,23/0,23; goles a favor 2,29→1,12 (sólo por keeper 40→88). Del remate rival: 8,2/partido, 48% bloqueados por remateRivalAuto, 95% atajados de los que llegan → 2,9% de gol. El perfil 'estrella' (mult 1,1) da el mejor récord para el jugador (186-9-5 vs 179-18-3 'toque'). Contradice GDD 8.2 'cada ascenso tiene que SENTIRSE' y 6.2 'una atajada en el último minuto se grita igual que un gol' (casi no hay).

**Arreglo** · poderRival = f(stats del portador rival × mult de la división) en vez del 52 literal (p. ej. media de fisico/gambeta/velocidad ya escalada por aplicar), y atkRiv del remate = tirador.stats.tiro + bonus. Recalibrar spread/keeper con el harness para que primera_b quede como hoy y el Mundial duela.

### 30. PASE en el cruce salta el duelo: es la opción dominante y 'corte>pase' no ocurre nunca

`**BUG** · balance · horas`

**Dónde** · phaser/scenes/match.js:2296 (W: PASE → iniciarPaseDirigido) · match.js:4257-4260 (confirmarPase → P.resolverPase) · phaser/logic/partido.js CONTRA (`pase: "corte"`)

**Evidencia** · En el menú del cruce el título promete 'corte>pase' (match.js:2291) pero la opción W va a iniciarPaseDirigido → confirmarPase → P.resolverPase(pct) sin pasar por resolverDuelo. grep de los llamadores de resolverDuelo en match.js: accion gambeta (2313, 3925), pared (2320, 3956), tiro (2644) — nunca 'pase', así que `CONTRA.pase` y el peso `corte` (0.3) sólo se cobran contra PARED. Harness 300 partidos (VOS stats 60, sin división): política 'siempre PASE en el cruce' = 286-12-2, 3,04 GF, 4,4 duelos/partido, 0,01 veces rendido; política 'siempre GAMBETA' = 262-31-7, 2,00 GF, 21,4 duelos. El pase cuesta 20 (gambeta 90), sale 75%, y encima te muda a un compañero con el tanque lleno.

**Arreglo** · En un cruce (rivalIdx != null) el PASE primero resuelve `resolverDuelo(st, {accion:'pase', costo: costo_pase})` contra la intención oculta (el CORTE lo gana) y recién si zafa abre el radar; o, mínimo, que riesgoLinea cuente siempre al rival del cruce (hoy queda excluido por `t < 0.1` cuando está pegado).

### 31. Las cuatro cartas de ATAQUE (Fogonazo 430, Puñalada 300, Hilo 270, Pelotazo 280) cobran aguante y hacen exactamente lo mismo que el tiro/pase normal

`**BUG** · balance · horas · visto por 2 roles`

**Dónde** · phaser/scenes/match.js:2339-2341 · data/megacosas.json (cartas) · phaser/scenes/cartas_ui.js:99

**Evidencia** · match.js:2339-2341 despacha `poder_tiro` y `zona_segura` a `this.resolverTiro(false, rivalIdx, libre)` y `pase_seguro`/`pase_largo` a `this.iniciarPaseDirigido(...)`, las mismas llamadas del TIRO y el PASE comunes. grep de `poder_tiro|zona_segura|pase_seguro|pase_largo|.efecto` en phaser/scenes: sólo esas tres líneas más `bonus_atajada` (2444, defensa). Ningún consumidor de `carta.valor` (+26) ni de `efecto` en prepararRemate/resolveShot/receptoresPase. Cartas.usar (cartas_ui.js:99) sí descuenta el aguante. Las de recuperación (LA BARRIDA, LA PRESIÓN) sí suman `c.valor` (match.js:2445). Resultado: EL FOGONAZO = un TIRO de 90 que cuesta 430; EL HILO = un PASE de 20 que cuesta 270. Es un caso nuevo de la enfermedad A que el guardián no cuenta (DEUDA sigue en 3).

**Arreglo** · Que la carta viaje por el estado: `st.cartaEnJuego = {efecto, valor}` al usarla; prepararRemate suma `valor` a shotPower con poder_tiro y con zona_segura fuerza `zone.fuera=0` + bonus; receptoresPase clampa pct a 90 con pase_seguro y ignora pase_radio con pase_largo; se limpia al resolver. Agregar los cuatro ids a desconectados.test.js.

> Otro rol lo midió aparte: match.js:2339: poder_tiro (FOGONAZO, valor 26, 430 aguante) y zona_segura (PUÑALADA, 300) llaman ambos a this.resolverTiro(false, rivalIdx, libre) → prepararRemate(st, null) → remate normal, y si hay rivalIdx antes tiene que ganar el duelo del bloqueo igual que un TIRO común. pase_seguro (EL HILO, 270) y pase_largo (EL PELOTAZO, 280) → iniciarPaseDirigido, el pase de siempre. grep '.valor' en scenes: única lectura match.js:2445 (cartas de recuperación, que sí suman +20/+26). Comparación: el Caldén cuesta 450 y multiplica ×1.3; el FOGONAZO cuesta 430 y multiplica ×1.0.

### 32. Los 11 avisos del partido (avisar) se escriben en mundoLayer, que está apagado: nadie ve 'Tempo X', '⚔ el rival juega X', 'Marcás con X', 'No hay a quién dársela' ni el motivo de una opción bloqueada

`**BUG** · ux · horas`

**Dónde** · phaser/scenes/match.js:5086 (avisar → this.mundoLayer.add) con match.js:361 (mundoLayer.setVisible(false) en pantalla partida, flag por defecto true); phaser/scenes/foco_ui.js:171; match.js:428 (hint 'tocá la cancha (o flechas) para correr')

**Evidencia** · En vivo: _split=true, mundoLayer.visible=false; avisar('PRUEBA') crea el Text dentro de mundoLayer con parentContainer.visible=false. grep this.avisar(/self.avisar( → 11 llamadas vivas (match.js 418, 469, 1650, 1776, 1830, 1832, 4200, 4620, 4810, 5070 y foco_ui 171). HANDOFF_V9 §1 anota el dato ('todo lo que se veía en el mapa, incluido avisar(), no se ve') pero los llamadores nunca se migraron. La ficha de la vida ('📋 …', lo que dejó tu semana) y la lectura del perfil rival se pierden enteras.

**Arreglo** · Que avisar() escriba en hudLayer/ticker en posición fija (uiCam) en vez de anclarse al portador en mundoLayer; mover el hint inicial a la misma franja.

### 33. La carrera no se puede jugar con teclado: ARRANCAR, JUGAR LA FECHA, 🏆 CARRERA y SEGUIR LA CARRERA quedan fuera del cursor

`**BUG** · accesibilidad · horas`

**Dónde** · phaser/scenes/master.js:413 (vistaElegir: botones solo pointerdown), master.js:1493-1555 (vistaTemporada no llama a grupoFoco), phaser/scenes/editor.js:176-179 (bc no entra a _botones), phaser/scenes/match.js:4157-4170 (final sin foco)

**Evidencia** · En vivo: vistaElegir → _foco.items = 10 (solo los pueblos), listeners ENTER = 1 (el del cursor sobre el mapa); vistaTemporada: grep grupoFoco( en master.js da líneas 309/566/622/990/1343, ninguna dentro de vistaTemporada; editor: _foco.items = 6 (4 filas + GUARDAR + A LA CANCHA), CARRERA y 'LISTO, A LA ENTREVISTA' afuera; final del partido: foco=false, listeners ENTER=0, ENTER+SPACE no cambian estado (sigue FINAL). El único botón alcanzable con teclado en el editor es A LA CANCHA, que lleva al amistoso sin salida.

**Arreglo** · Sumar esos botones como items {obj, cb} a un grupoFoco en cada vista (vistaElegir, vistaTemporada, editor con carreraPendiente, pantallaFinal).

### 34. '▶ ¡A LA CANCHA!' del editor juega un amistoso sin salida: al final solo hay '↺ OTRO PARTIDO' y no se vuelve ni al editor ni a la carrera

`**BUG** · ux · horas · visto por 2 roles`

**Dónde** · phaser/scenes/editor.js:175 (irA('match') sin masterPartido) y phaser/scenes/match.js:4176-4178 (final sin _masterPartido)

**Evidencia** · En vivo: partido con _masterPartido=null → finDelPartido() → botones=[{'↺ OTRO PARTIDO'}] y nada más; durante el partido ESC solo cancela menú/pase (match.js:408) y no hay pausa ni abandonar (grep pausa/salir/abandonar: 0 botones). Es el botón más grande y verde de la primera pantalla tras la intro, y también está visible con carrera en curso (✎ EDITOR / PINTA → editor → A LA CANCHA). Salir exige recargar la página.

**Arreglo** · En pantallaFinal sin carrera agregar '◀ VOLVER' (a master si hay pampa_master_v1, si no al editor); en el editor con carrera activa etiquetar 'AMISTOSO (no cuenta)' y bajarle jerarquía frente a CARRERA.

> Otro rol lo midió aparte: grep de irA(/scene.start/location.href en match.js da esas tres líneas. Corrido en navegador tras scene.start('match') sin masterPartido y finDelPartido(): menuLayer contiene ['EMPATE','VOS 0 - 0 GENERAL PI','↺ OTRO PARTIDO'], _foco=null. No hay forma de volver al editor ni al master sin recargar la página (y la recarga vuelve a pasar por compuerta e intro).

### 35. En LA SEMANA los atajos 1-0 se apilan en cada repintado: una sola tecla llena DOS ranuras

`**BUG** · estado · minutos · visto por 2 roles`

**Dónde** · phaser/scenes/master.js:960 (keyboard.once por tarjeta en cada vistaSemana) · mismo patrón en :616 (entrevista)

**Evidencia** · Corrido en navegador con un save de Primera B: listenerCount('keydown-TWO') = 1 al entrar; elijo una acción con el cursor (Enter) → momento → repintado → listenerCount = 2. Emito UNA vez keydown-TWO: elegidas pasa de ['entrenar_tiro',null,null] a ['entrenar_tiro','entrenar_gambeta','entrenar_gambeta'], quedan 2 overlays de momentoDeAccion abiertos a la vez y el save en localStorage guarda las tres. El comentario de :931-935 dice que 'los atajos se apilaban' y lo da por resuelto; el mecanismo sigue (once nunca se saca y vistaSemana se repinta después de cada elección).

**Arreglo** · Guardar los handlers en una lista y hacer keyboard.off() antes de cada repintado, como ya hace jugadon_ui.js:87-98 (_jg.teclas); o registrar las diez teclas una vez en create() y despachar por índice sobre la lista actual.

> Otro rol lo midió aparte: En vivo: elegí entrenar_tiro con el puntero → tras el repintado listenerCount('keydown-TWO') = 2 → una sola pulsación de '2' → elegidas [entrenar_tiro, entrenar_gambeta, entrenar_gambeta], energía 55 → 5. children.removeAll() no saca listeners de teclado y grupoFoco solo limpia los suyos (_teclas). El comentario de master.js dice que esto ('apretabas 1 y te llenaba media semana') se arregló con el cursor: sigue pasando. En la entrevista el stale listener re-renderiza el paso 2 con elegidas=[0] antes de avanzar (log vivo), resultado final correcto pero doble render.

### 36. El evento de la semana se sortea de nuevo tras recargar: dos eventos por fecha, bolsa consumida dos veces y la elección anterior pisada

`**BUG** · estado · horas`

**Dónde** · phaser/scenes/master.js:799 y :1318 (_semEvento / _semEventoResuelto son campos de la instancia, no del save)

**Evidencia** · En vivo: fecha 2, evento 'colectivo' elegido ('Entro en frío'), reload, JUGAR LA FECHA → aparece OTRO evento ('Voy después del partido / Me la pierdo'), bolsaEventos pasa de ['colectivo'] a ['colectivo','fiesta'] y modFecha queda 'Me la pierdo, estoy enfocado'. Simulación node con logic/vida.js y la misma semilla: 1er sorteo 'hermanito', 2do 'micro'. Agrava: desde la semana no hay botón de volver (grupoFoco sin `volver`), así que recargar es la única forma de salir.

**Arreglo** · Persistir el evento de la fecha en el save (save.eventoFecha = {id, resuelto}) y leerlo antes de sortear; opcional, un '◀ VOLVER A LA TABLA' en la semana.

### 37. Recargar a mitad de fecha duplica las mejoras permanentes de la semana, y se puede repetir sin límite

`**BUG** · estado · horas`

**Dónde** · phaser/scenes/master.js:1272 (cerrarSemana suma sem.permanentes a save.mejoras) y master.js:101 (save.semana solo se anula al volver del partido con masterResultado)

**Evidencia** · Reproducido en vivo: semana armada [entrenar_tiro, entrenar_gambeta, entrenar_gambeta] → JUGAR LA FECHA → mejoras {tiro:0.88, gambeta:2}; location.reload() → master → JUGAR LA FECHA → la semana aparece ya armada ("LA SEMANA ESTÁ ARMADA · a la cancha") → JUGAR → mejoras {tiro:1.76, gambeta:4}, y save.semana sigue con las tres elegidas (se puede repetir). Simulación node con logic/semana.js: 1, 2, 3 cierres → tiro 1, 2, 3. No hay salida del partido salvo recargar (grep irA( en match.js: única a 4170), y en celu el PWA se cierra solo.

**Arreglo** · En cerrarSemana marcar la semana como cerrada (save.semana.cerrada = true, o anular save.semana dejando solo semanaResumen) y, al entrar a vistaSemana con semana cerrada, ir derecho a la cancha sin volver a sumar permanentes.

### 38. Sin entrenar nada se llega al Mundial en 5 temporadas y a la gloria en 5-6: la escalera no pide progresión y entrenar no cambia nada hasta Nacional

`*Sugerencia* · balance · dias`

**Dónde** · phaser/logic/master.js:16-22 (DIVISIONES) · phaser/logic/temporada.js:98-102 (golesAjenos, igual en todas las divisiones) · data/divisiones.json

**Evidencia** · Con stats 50 en todo (sin origen ni mejoras), política gambeta/quite y tiro desde x>=760, W/D/L medido: Primera B 93/6/1, Primera A 90/10/1, Regional 83/15/2, Nacional 73/25/2, Mundial 45/47/8. Metido en temporada.js (3000 temporadas por división): P(campeón) 100 / 100 / 99,9 / 99,1 / 56,8%; zona de descenso 0% en todas. Carrera completa (1000 corridas): gloria en 5,8 temporadas promedio, mediana 5, el 56% en 5 o menos. Entrenar tiro 35 semanas (50→85) en Primera B: 94,0% → 94,3% de victorias (nada); recién en Nacional pesa (68% → 84%). Los 9 rivales de la tabla sacan los mismos goles al azar en Primera B que en el Mundial (1,65 por equipo-partido).

**Arreglo** · Después de arreglar 1 y 2, recalibrar keeper/mult_stats por división contra este simulador con objetivo explícito (ej. 55-60% de victorias en Primera B con stats base, 35% en el Mundial), y que golesAjenos escale con la división para que la tabla también apriete.

## SEVERIDAD MEDIA · 59

### 39. El cartel y el relator dicen la misma oración en el mismo momento (gol, bloqueo, tiro leído)

`**BUG** · texto · minutos`

**Dónde** · phaser/scenes/match.js:3105, 3183, 3432, 2673 · data/relatos.json relator.gol[2], bloqueo[0], bloqueo_leido[0]

**Evidencia** · match.js:3105 y 3183 ponen de sub del gol «¡La clavaste donde el viento no la saca!» y acto seguido 2781/3347 relatan "gol", cuya bolsa de 4 incluye «¡La clavó donde el viento no la saca! ¡GOL de {jugador}!» (1 de 4 goles). match.js:3432 pone de sub «Se metió en el camino y se la comió con el cuerpo.» y el `volver` de 3580 relata "bloqueo", cuya bolsa[0] es «¡Se la bloquearon! Se metió en el camino y se la comió con el cuerpo.» (1 de 6, idéntico). match.js:2673 «Sabían que ibas a patear.» y bloqueo_leido[0] «Sabía que ibas a patear antes que vos.» (1 de 3).

**Arreglo** · Reescribir los tres subs de match.js con otra imagen (el cartel dice QUÉ pasó; el relator, CÓMO se sintió): «¡Al ángulo!», «Un cuerpo en el camino. Pelota de ellos.», «Te vieron la intención.». No tocar relatos.json.

### 40. Enfermedad A: las 12 frases del origen + fichaOrigen() y las 10 "frase" de la semana están escritas, testeadas y sin lector

`**BUG** · datos · horas`

**Dónde** · phaser/logic/vida.js:44 (fichaOrigen) · data/eventos_temporada.json origen[*].opciones[*].frase · data/semana.json opciones[*].frase

**Evidencia** · grep -rn `fichaOrigen|\.frases\b` en phaser/ e index.html: solo vida.js (definición), vida.test.js:52 y save_viejo.test.js:139. Ninguna escena la llama ni lee `origen.frases`. El encabezado de vida.js dice «dejan una FRASE que el relator cita después»: el relator no la cita nunca. vida.test.js:18 certifica en verde que las 12 opciones tienen `frase`. Lo mismo con semana.json: `frase` («Te quedaste pateando hasta que se hizo de noche.» ×10) no lo lee nadie — grep `\.frase\b` fuera de tests da solo vida.js:38 y match.js:286 (que es modFecha.frase, otra cosa); semana_ui.js:164 usa `repaso`. Son 22 líneas muertas más una función; el guardián reporta DEUDA CONOCIDA 3 y esto no está contado.

**Arreglo** · fichaOrigen() ya devuelve «Thiago, el que aprendió en el potrero de Winifreda»: mostrarla en la ficha del elegido (master.js:548) y pasarla al relator como {ficha} en la bolsa `saque`. Para semana.json, o mostrar `frase` como toast al elegir la acción (master.js ~1216) o borrar el campo y su assert.

### 41. Enfermedad A: los tres relatores (Pichi, El Profe, Delfina), el narrador de inicio y las cuatro escenas de relatos.json no los lee nadie

`**BUG** · datos · horas`

**Dónde** · data/relatos.json (narrador_inicio, relatores, escenas) · phaser/scenes/match.js:465

**Evidencia** · grep -rn de `relatores|narrador_inicio|vestuario_dt|amigos_bar|prensa_post|chill_pueblo|pichi|delfina|\.escenas` sobre phaser/, index.html y data/: el único consumidor fuera del propio JSON es assets_drive/.../04_Web_Showcase/index.html (una página de muestra). match.js:465 crea el relator con todo el JSON pero relator.js:20 solo lee `data.relator`. Son 14 líneas de tres voces con estilo declarado más 16 de escenas (vestuario, bar, prensa, pueblo) que no aparecen nunca. Y si algún día se enchufan, tienen pueblos clavados: «¡Goool del pibe de Winifreda!», «desde General Pico», «se vino a probar a Santa Rosa», falsos para 9 de los 10 pueblos elegibles. No figura en docs/BARRIDA_DESCONECTADOS.md (que solo listó saque_arquero).

**Arreglo** · Decidir: (a) conectar — `narrador_inicio` como texto de los planos de intro.js (hoy balance.intro.t_pueblo es una sola línea), `escenas.amigos_bar/chill_pueblo` como repaso ilustrado de la semana en master.js, y parametrizar los pueblos con {pueblo}; o (b) moverlos a docs/ como material de tono y dejar en el JSON solo lo que corre.

### 42. Cuatro eventos de la semana prometen más que su condición: "puntero e invicto" con el rival 3°, "viene último" con el rival 5°, "invicto" tras una derrota

`**BUG** · datos · horas`

**Dónde** · phaser/logic/vida.js:57-62 · phaser/scenes/master.js:108 · data/eventos_temporada.json (puntero, descendido, racha, mala_racha)

**Evidencia** · Corrido en node con el vida.js real: `aplicaCondicion({condicion:"rival_arriba"},{posRival:3,posMia:5})` → true, y el texto dice «El rival viene puntero e invicto»; `aplicaCondicion({condicion:"rival_abajo"},{posRival:5,posMia:2})` → true y el texto dice «El rival viene último». `racha_buena` es `racha >= 3` y master.js:108 cuenta victorias consecutivas (`Math.max(1, racha+1)`), así que tras D-G-G-G sale «El equipo viene invicto». Al revés, `mala_racha` es `racha <= -3` pero el empate resetea a 0 (`: 0`), así que «Hace tres fechas que no ganan» nunca sale con D-E-D-E aunque sea literalmente cierto.

**Arreglo** · O ajustar las condiciones (`rival_arriba`: posRival === 1; `rival_abajo`: posRival === último; `racha_buena`: sin derrotas en las últimas N; `racha_mala`: sin victorias en las últimas 3, contando empates), o suavizar los textos («El rival viene arriba en la tabla», «viene abajo y enojado», «viene de tres al hilo»).

### 43. La tribuna afirma cosas que el partido no sabe: localía, "faltan diez" a los 85', "tercera que ataja"

`**BUG** · texto · horas`

**Dónde** · data/tribuna.json (empate[2], resultado_gana[2], perdiendo_final[0], atajada[4]) · phaser/scenes/match.js:4805

**Evidencia** · «Un empate afuera no está mal.» y «Sufrido, pero de local se gana así.» se eligen al azar (tribuna_ui.js comentar) y match.js no tiene ninguna noción de localía (grep soyLocal|localia|de local|de visita en match.js: 0 hits), aunque la temporada sí la tiene (temporada.js:42 {local, visita}; master.js:1480 la muestra). «Faltan diez. Con uno estamos de nuevo adentro.» se dispara por urgente → perdiendo_final, y urgente solo se relata cuando `st.tiempo === 2 && st.minuto >= 85` (match.js:4805): faltan cinco, no diez. «Tercera que ataja.» no mira ningún contador.

**Arreglo** · Pasar la localía al partido en _masterPartido (master.js:1479 ya la calcula) y admitir un campo opcional `solo: "local"|"visita"` por intercambio que comentar() filtre; cambiar «Faltan diez» por «Faltan cinco»; sacar el ordinal de «Tercera que ataja» («Otra que saca. Va a terminar cansado él.»).

### 44. El evento "error" de la tribuna mezcla pase, tiro y gambeta: Nelda critica un pase inexistente después de un tiro afuera

`**BUG** · texto · horas`

**Dónde** · phaser/scenes/match.js:486 (gambeta_lose → "error", afuera → "error") · data/tribuna.json evento "error"

**Evidencia** · Las seis líneas de "error" hablan de jugadas distintas: «Ese pase no existía. Se lo inventó.», «La quiso de taquito con el partido así.», «Le pegó de zurda teniendo la derecha.». Se disparan por `afuera` (tiro que se fue) y por `gambeta_lose` (te robaron en el duelo). Tras un tiro afuera, 1 de 6 veces Nelda habla de un pase; tras una gambeta perdida, 1 de 6 veces habla de con qué pierna le pegaste.

**Arreglo** · Partir "error" en tres eventos (error_pase, error_tiro, error_gambeta) con 3-4 intercambios cada uno y mapear cada situación al suyo; o reescribir las seis para que sean neutras a la jugada.

### 45. Controles que se escapan del piso táctil de 61 lógicos (44 CSS px): steppers del editor, cancelar pase, botones de texto, puntos del mapa y mute

`**BUG** · ux · minutos`

**Dónde** · phaser/scenes/piel_ui.js:313-321 (filtro del barrido) · editor.js:110, 203 · match.js:4220, 4639-4640 · master.js:235, 517, 529-541, 884-886

**Evidencia** · balance.legibilidad.tap_min = 61 y pisoTactil (piel_ui.js:276) lo aplica, pero su único llamador es vestirPendientes (321), que sólo visita Rectangles con fillAlpha>0 y width≥60/height≥20 (316-317). Quedan afuera: steppers ◄► del editor 52x44 (editor.js:110) = 37,6x31,8 CSS px, y son el control principal de la pantalla; ✕ cancelar pase 56x48 (match.js:4220) = 40x35; los botones hechos con Text: "▶ VER INTRO" (editor.js:203, 11 px + pad 4 ≈ 21 lógicos = 15 CSS px de alto), "✕ empezar otra carrera" (master.js:235, ≈22 lógicos = 16 CSS px), "✕" sacar de la semana (884-886, ≈24x21 = 17x15 CSS px); en el mapa el punto del pueblo r=5 (10 lógicos = 7 CSS px) y su nombre 12 px + pad 1 (≈16 lógicos = 12 CSS px); el mute (4640) declara hit area de 44 LÓGICOS = 31,8 CSS px aunque el comentario dice 44 px. Altura de línea de Pixelify Sans = 1,2 em, leída del hhea del TTF. Factor 0,7222 = 390/540 (Scale.FIT, index.html:285).

**Arreglo** · Llamar this.pisoTactil(obj) explícitamente sobre esos objetos (ya acepta cualquier GameObject con width/height) y bajar el filtro del barrido a width≥40; para el mute pasar 61 en vez del rect de 44.

### 46. En la cruz, el MOTIVO de una opción bloqueada —el canal 'no color' del estado— es el texto de peor contraste del menú: 3,04:1 a 10 px

`**BUG** · accesibilidad · minutos`

**Dónde** · phaser/scenes/match.js:2163 (bg 0x333d36), 2169 (título #9aa59d), 2171 (motivo #c76a5e)

**Evidencia** · Ratios calculados con node: #c76a5e sobre #333d36 = 3,04:1; #9aa59d sobre #333d36 = 4,43:1 (AA = 4,5). El comentario de 2164 dice que el bloqueo "se ve por TEXTURA (rayado ▨) + motivo escrito, no solo por el gris": el motivo es la pieza que sostiene la regla del daltonismo y es la que menos se lee, a 7,2 px reales. Mismo patrón en master.js:927-939 (tarjeta no elegible: #5a6b60 sobre #c9c3b2 = 3,22:1).

**Arreglo** · En la bloqueada dejar el fondo claro (como hizo master.js:927 "el fondo se mantiene claro para que el texto siga leyéndose") y el motivo en #0a1f13; o, si se mantiene el fondo oscuro, motivo en #f6efdc (≈9:1).

### 47. Nombres de zona del mapa de La Pampa con contraste 1,85:1 (#2f5c40 sobre #14301f)

`**BUG** · accesibilidad · minutos`

**Dónde** · phaser/scenes/master.js:504 (texto) y 491 (relleno del contorno)

**Evidencia** · Calculé el ratio WCAG con node: #2f5c40 sobre #14301f = 1,85:1 (AA pide 4,5:1; ni siquiera llega al 3:1 de texto grande). Son 12 px lógicos = 8,7 reales. El comentario de la línea 497 dice que las zonas se nombran porque "el mapa es esquemático y se dice": es información, no decoración. Los nombres de pueblo de al lado (529-531) sí van en #dcd6c2 con caja #0a1f13cc (9,8:1).

**Arreglo** · Usar piel.texto_apagado #9fb3a5 (6,4:1 sobre ese verde) con la misma backgroundColor "#0a1f13cc" que los nombres de pueblo.

### 48. Partido: el tutorial de 3 pasos y la pantalla FINAL sólo avanzan con puntero; el tutorial encima dice "(en teclado: ESPACIO)"

`**BUG** · accesibilidad · horas`

**Dónde** · phaser/scenes/match.js:1914-1946 (tutorialSiHaceFalta), 4157-4190 (pantalla final)

**Evidencia** · Tutorial: velo.on("pointerdown") (1933) es el único avance; estado = "TUTORIAL" y modo congelado (1912-1913); SPACE → onBotonAccion (1965-1967) retorna porque estado !== "LIBRE"; el texto del paso 2 (1906) promete ESPACIO. Final: b3/b/b2 (4157, 4175, 4182) sólo pointerdown; grep keydown en match.js da únicamente 404-414 (SPACE/ESC/TAB, que no atienden FINAL), 1757 y 1863-1866. Un jugador de teclado termina el partido y no puede SEGUIR LA CARRERA.

**Arreglo** · Tutorial: extraer el handler de velo a una función y colgarla también de keyboard.on("keydown-SPACE") y "keydown-ENTER" mientras estado === "TUTORIAL". Final: pasar los botones por grupoFoco (ya se usa en el menú de tempo, 1891).

### 49. Otros caches del partido que init() no reinicia: _hudEnvionEst, _tribunaCansancio, _escalonActual y _relPendiente cruzan al partido siguiente

`**BUG** · estado · minutos`

**Dónde** · phaser/scenes/match.js:4796 (_hudEnvionEst) · 4756-4757 (_tribunaCansancio) · 2149 y 3179 (_escalonActual, escrito en 3663) · 501/514 (_relPendiente)

**Evidencia** · Barrido propio con node de toda asignación `this._x =` fuera de init/create en match.js + los 8 mixins: 94 campos no reiniciados; descartando los que create() vuelve a construir por build*, quedan estos cuatro caches que se comparan con !== o se consumen en update. Consecuencias por lectura de código (no verificadas en vivo): txtEnvionEstado nace "" y si el estado inicial coincide con el cache del final anterior ('🌟 ENVIÓN LLENO' tras llegar con envión lleno de la semana) la etiqueta queda en blanco; el comentario de Nelda y el Tuli sobre el cansancio no sale en el tiempo del partido siguiente si la marca ('t1'/'t2') coincide; el primer empuje de cámara/hitstop del partido 2 usa el escalón de la última viñeta del 1; una frase del relator guardada con el HUD apagado al cierre se pinta al arrancar el partido siguiente. p1 [1] no los ve porque sólo mira asignaciones de true/false/!!.

**Arreglo** · Reiniciar los cuatro en init() y ampliar p1 [1] a cualquier `this._x = ` que después se compare con !== (caches), no sólo booleanos.

### 50. La entrevista (vistaOrigen) registra keyboard.once 1-4 por paso y nunca los saca: elegir con Enter/dedo y después con número re-dibuja pasos anteriores con `elegidas` viejas

`**BUG** · estado · minutos`

**Dónde** · phaser/scenes/master.js:616

**Evidencia** · En vivo, envolviendo vistaOrigen y _crearCarrera para contar llamadas: paso 0 elegido con el cursor (cb, no consume las teclas) → en paso 1 apreto '2' y se llama vistaOrigen(paso=1,[1]) Y vistaOrigen(paso=2,[0,1]); en paso 2 apreto '3' y salen vistaOrigen(1,[2]), vistaOrigen(2,[0,2]), vistaOrigen(2,[1,2]) y recién _crearCarrera. El resultado final sale bien sólo porque el listener más nuevo se registra último; mientras tanto hay tres renders fantasma (cada uno con children.removeAll() y su grupoFoco) y closures con respuestas que el jugador no dio.

**Arreglo** · Mismo tratamiento que LA SEMANA: guardar los once y hacer off al entrar a vistaOrigen, o eliminar los atajos numéricos (el cursor ya cubre el teclado).

### 51. master.js cambia de vista con children.removeAll() sin destroy: los botones viejos siguen vivos, interactivos y con tweens (Phaser 3.80.1 sólo los desengancha)

`**BUG** · rendimiento · horas`

**Dónde** · phaser/scenes/master.js:265, 583, 804, 1215, 1321

**Evidencia** · En el vendored phaser.min.js List.removeAll(t) destruye sólo `if(t)`; sin argumento hace RemoveBetween y removeChildCallback deja displayList=null. inputCandidate exige willRender(camera), y willRender devuelve true cuando displayList es null, así que el objeto sigue en input._list y recibe pointerdown (sortGameObjects lo manda al fondo, gana sólo donde no hay nada dibujado encima). Medido en vivo en LA SEMANA: objetos interactivos vivos y desprendidos 3 → 11 → 31 tras dos repintados; input._list 11 → 20 → 42 con ~70-80 hijos en pantalla. Además cada vista que llama fondoDePiel() de nuevo (vistaBorrarCarrera:265-266) suma otra imagen de fondo mientras la anterior sigue viva. Sólo el shutdown de la escena limpia los Text (por updateList); Rectangle/Graphics/Image/Container desprendidos sobreviven hasta cambiar de escena.

**Arreglo** · Usar this.children.removeAll(true) en los cinco sitios y volver a poner el fondo radial al principio de cada vista (hoy sólo vistaBorrarCarrera lo hace); o agrupar cada vista en un Container y destruirlo.

### 52. golpe_prob se calibró 'con el tanque drenando': con el tanque real la molestia nace del partido en el 0% de los partidos (0,3% arrancando con 450)

`**BUG** · datos · horas`

**Dónde** · phaser/data/balance.json:335 (_golpe_nota: '6,7% arrancando lleno... dos o tres lesiones por temporada') · phaser/logic/partido.js:648-652

**Evidencia** · El disparador exige perder quite/bloqueo con aguante < 110. Sim 400 partidos por caso con el motor real: tanque lleno 0.0% de partidos con molestia (tanque mínimo de VOS 688-769, 0 momentos rendido); aguante inicial 450 (energía 0) 0.3% (mínimo 283); Mundial con 450: 1.3%. La nota promete una cada 7-8 fechas; el número salió de un harness que drenaba el tanque artificialmente (enfermedad B). Con esto la rama CURAR y penal_molestia solo se alimentan del riesgo_golpe de la semana (picadito 0.12).

**Arreglo** · Cambiar la ventana: disparar con aguante < 40% del techo o con probabilidad chica (0.04) al perder cualquier duelo físico sin condición de tanque; recalibrar corriendo el simulador de partido entero, no un drenado a mano.

### 53. Lo que hacés en la semana casi no llega a la cancha: llegar con 450 de aguante en vez de 1000 mueve el resultado 2-7 puntos y el tanque nunca baja del umbral de rendido

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:468 (bonusAguante ±4), :406 (umbral 110), :365-371 y :386-388 (recupera 13.2 por momento rival + 375 en el entretiempo)

**Evidencia** · Sim B, 200 partidos, política gambeta+tiro: aguante inicial 450 → 72.5% victorias / GF 1.30, 1000 → 74.5% / 1.35, tanque final 822 vs 911, momentos rendido 0.09. Con 'pase a VOS' (VOS juega el máximo posible, 6.6 cruces y 3.5 remates por partido): B 80.5→83%, Mundial 34.5→42%, tanque mínimo 279 vs 700. Entrenar aguante hasta el techo 1196: 74.5→75%. Con tanque lleno, 0 momentos rendido en 400 partidos: la 'tragedia chiquita' del GDD 7.1 y el 'dos Caldenes y chau' no ocurren porque bonusAguante vale como mucho ±4 sobre un spread de 58 y la recuperación por salto devuelve más de lo que cuesta un cruce.

**Arreglo** · bonusAguante ±4 → ±12 (o multiplicar el poder por 0.7+0.3*frac) y bajar recuperacion_por_minuto_salto para tu equipo (6→2) con una perilla aparte para la CPU, así la energía de la semana se siente sin tocar el límite invisible.

### 54. El ánimo llega a 100 en la semana 2 y se queda ahí el 99% de la carrera; su único efecto vivo es el envión inicial, porque la lectura ±5 se guarda en _lecturaSemana y nadie la lee (el guardián la excusa con una nota falsa)

`**BUG** · balance · horas`

**Dónde** · phaser/logic/semana.js:326-328 (animo_gana 12 + animo_gol 6 vs animo_pierde 10) y :240 (lectura) · phaser/scenes/match.js:307 · phaser/test/desconectados.test.js:297

**Evidencia** · Sim 90 semanas con 'descansar' (+5 ánimo): ánimo 100 en la semana 2 con pWin 0.5, 0.7 y 0.9, mínimo 75, al tope el 99% de las semanas; con picadito y mixta igual. comoLlegas: ánimo 60→envión 30, 100→50 (medio duelo ganado de diferencia, gana_duelo 18). El ASADO (+15 ánimo por 10 de energía) no compra nada desde la semana 2: tres asados por semana dan 662 de aguante dominical contra 1000 descansando, con el mismo envión (50). grep _lecturaSemana: solo la escritura en match.js:307 ('±5 a la lectura de los duelos' no llega a ningún st.*); el guardián la lista como 'se pasa al estado del partido en la misma línea' y no es cierto. carrera.test.js ya imprime la saturación como DEUDA, pero el asado dominado y la lectura muerta no están anotados.

**Arreglo** · animo_gana 12→4, animo_pierde 10→14 y un decaimiento semanal (−6 en nuevaSemana) para que recorra el rango; enchufar comoLlegas.lectura como bonus de resolverDuelo (al lado de bonusAguante) o borrarla y sacar la excusa del guardián.

### 55. La 'picada' de la CPU (cpu_umbral_frac 0.3, cpu_picada 0.62) no se alcanza en ningún partido con juego normal

`**BUG** · balance · minutos`

**Dónde** · phaser/logic/partido.js:396-401 · balance.json:351-353 · :349-350 (la CPU regenera igual que vos: 13.2 por momento + 375 en el entretiempo)

**Evidencia** · El rival gasta costo × 0.75 por duelo (~40-50) unas 10-15 veces por partido (~600) y regenera ~800 entre saltos y entretiempo (partido.js:194, :370, :388). Medido en 150 partidos por política: aguanteRival mínimo 657/1000 (mixta B), 685 (no moverse), 639 (mixta Mundial); partidos en que la CPU baja del 30%: 0% en todas las políticas normales. Solo con GAMBETA en todos los cruces (política que nunca patea) llega al 32% de los partidos. La 'trampa deliberada y elegante' del GDD 7.3 está calibrada y no corre: poderRival se mueve entre 49.4 y 52 en todo el partido.

**Arreglo** · Sacarle a la CPU la regen por salto (o dejarla en 2 por minuto) y subir cpu_factor_costo a 1.0; comprobar en la sim que en Primera B la CPU pise el 30% en el último cuarto de ~40% de los partidos.

### 56. POTENCIAR (el envión lleno) no toca el remate ni la Definición ni el jugadón: solo los duelos del cruce

`**BUG** · estado · minutos`

**Dónde** · phaser/logic/partido.js:561 (envionActivo) y :602 (único consumidor: resolverDuelo) · :860-915 (prepararRemate no lo suma) · phaser/scenes/match.js:4613-4623 (botón) · balance.json:246-252

**Evidencia** · grep de envionActivo/envBonus en logic y scenes: partido.js:602 (resolverDuelo) y match.js:4795 (texto del HUD). prepararRemate, prepararRemateAereo, tiroAuto, definicion_ui.defVueloOf y jugadon_ui no lo leen. Medido en la sim: el envión se llena 1.2-1.5 veces por partido y la potencia dura 20.1 s de simulación = ~4.7 momentos (4.3 s entre momentos), de los cuales la mitad son remates/pases/remate rival sin duelo. El HUD dice '⚡ ENVIÓN EN USO' mientras pateás y el remate sale igual.

**Arreglo** · Sumar potencia_bonus (o la mitad) al shotPower en prepararRemate/prepararRemateAereo y al poder del pasillo cuando envionActivo(st); o cambiar el texto del botón a 'potencia los cruces'.

### 57. El título del cruce promete 'corte>pase' pero el PASE no pasa por la matriz: la elección secreta del rival no le hace nada

`**BUG** · texto · minutos`

**Dónde** · phaser/scenes/match.js:2293 (título '(eligen en secreto: quite>gambeta · corte>pase · bloqueo>tiro)') · :4252-4260 (iniciarPaseDirigido → P.resolverPase, sin duelo) · phaser/logic/partido.js:738-761 (resolverPase: solo riesgoLinea y pct)

**Evidencia** · eleccionCPU se llama únicamente dentro de resolverDuelo (partido.js:608); el pase dirigido resuelve con resolverPase, que no consulta la intención del rival. Medido en la sim: pase 72-77% de éxito en todos los perfiles, sin variación entre 'de toque' (corte 0.5) y 'pura garra' (corte 0.25). El GDD 16.4 lo admite como deuda, pero el menú se lo dice al jugador como regla vigente en cada cruce.

**Arreglo** · O el pase entra a la matriz (si el rival eligió corte, riesgoLinea × 2 y pct -12), o el título del cruce deja de nombrar 'corte>pase' y dice 'quite>gambeta · corte>uno-dos · bloqueo>tiro'.

### 58. El paso 1 del tutorial dice 'Movés con el DEDO sobre la cancha', pero en pantalla partida tocar la ilustración no hace nada: solo navega el MAPA

`**BUG** · onboarding · minutos`

**Dónde** · phaser/scenes/match.js:1905 (paso 1) vs :1907 (paso 3 sí dice 'TOCANDO EL MAPA') · :4867-4871 (apuntar: con _split solo acepta toques dentro del rect del radar)

**Evidencia** · pantalla_partida es true por defecto (init :108) y balance.flags solo trae a3_bloqueo (balance.json:698-700); apuntar() en modo split hace return si el toque cae fuera del radar. El tutorial se muestra una sola vez en la vida del jugador (:1897-1904) y su primer paso enseña un gesto que no funciona; el paso 3 lo contradice.

**Arreglo** · Paso 1 en split: 'Movés TOCANDO EL MAPA de abajo (o flechas/WASD)', y fusionar con el 3 ('…y pasás tocando el destino en el mapa').

### 59. Mapa de elección de club: ◄► tienen dos manejadores (lista circular + cursor geométrico) y hacen cosas distintas que ▲▼

`**BUG** · ux · minutos`

**Dónde** · phaser/scenes/master.js:376-377 (keyboard.on LEFT/RIGHT ciclan pSel por lista) · :566 (grupoFoco con sinTeclado:false registra LEFT/RIGHT/UP/DOWN geométricos)

**Evidencia** · Corrido en navegador en vistaElegir: listenerCount('keydown-LEFT')=2, ('keydown-UP')=1. Con Winifreda elegido, PampaFoco.vecino(...,'izq') da Victorica, pero al emitir LEFT pSel pasa 0→9 y queda Macachín (último de la lista). ▲▼ mueven solo el cursor sin cambiar la ficha hasta Enter; ◄► cambian la ficha al instante en orden de lista. El comentario de :475-478 promete 'foco geométrico: la flecha de abajo lleva al pueblo de abajo'.

**Arreglo** · Borrar :376-377 y usar opts.alMover del grupoFoco para setear pSel y redibujar solo la ficha (o pasar sinTeclado:true y quedarse con la lista, pero no las dos).

### 60. Recargar la página a mitad de semana vuelve a preguntar el evento (otro distinto), consume otra vez la bolsa y pisa la decisión anterior

`**BUG** · estado · horas`

**Dónde** · phaser/scenes/master.js:799-801 y :1318 (_semEvento===undefined → eventoDeLaSemana) · :1283-1284 (solo cerrarSemana lo resetea) · _semEvento/_semEventoResuelto son campos de instancia, no del save

**Evidencia** · Corrido en navegador: con el save mid-semana (elegidas las 3, modFecha='Escucho y hago caso', bolsaEventos=1) recargo la página y entro a vistaSemana: _semEvento vuelve a 'undefined', se ofrece OTRO evento ('El nueve anda dulce…'), bolsaEventos pasa a 2 y al elegir modFecha queda 'Yo también quiero la mía' (guardado en localStorage). La semana armada sigue intacta, o sea el estado queda mezclado: acciones de una semana, evento de otra. En celular (PWA, pestaña descartada) recargar es lo normal.

**Arreglo** · Persistir en el save el evento de la fecha ({id, resuelto}) o tratar save.modFecha!=null como 'evento ya decidido para temporada.fecha', y limpiarlo en cerrarSemana como hoy.

### 61. El tutorial del partido y las salidas del final solo responden al toque: con teclado no se puede entrar ni salir del partido

`**BUG** · accesibilidad · minutos`

**Dónde** · phaser/scenes/match.js:1933 (velo.on pointerdown, única forma de avanzar el tutorial) · :4157-4160 y :4175-4178 (SEGUIR LA CARRERA / OTRO PARTIDO sin grupoFoco)

**Evidencia** · Corrido en navegador: tras elegir tempo con Enter, estado='TUTORIAL'; listenerCount('keydown-ENTER')=0, ('keydown-SPACE')=1 (onBotonAccion, que sale por estado!=='LIBRE' en :1967); emitidos SPACE y ENTER, estado sigue 'TUTORIAL' y _foco=null. En el final: _foco=null, listenersEnter=0. El resto del juego (tempo, cruz, semana, mapa, entrevista) sí navega con el cursor.

**Arreglo** · En tutorialSiHaceFalta, keyboard.once('keydown-ENTER'/'SPACE') que llame al mismo avance del velo; en finDelPartido, grupoFoco([{obj:b3|b, cb}]).

### 62. La semana calcula techo y rendimiento sobre base 50, pero el partido usa career.stats del save clásico (tiro 58, velocidad 60…) si existe pampa_star_v1

`**BUG** · datos · horas`

**Dónde** · phaser/scenes/master.js:219-232 (statsDeHoy: base = stat_inicial 50) · phaser/scenes/match.js:611-633 (armarPlanteles: stats: career && career.stats de pampa_star_v1) · index.html:586 (freshStats tiro 58, velocidad 60 + puntosSel)

**Evidencia** · statsDeHoy() arma 50 + origen + mejoras y con eso decide statEnElTecho y rendimiento(). armarPlanteles() lee localStorage pampa_star_v1 y, si hay carrera clásica, vos entrás a la cancha con freshStats (tiro 58) más los puntos repartidos, más origen (match.js:257) más mejoras (match.js:311), clamp 99. Con un clásico jugado, el tiro real está 8+ puntos arriba de lo que la semana cree: llega a 99 con mejoras 33 mientras statsDeHoy dice 91, así que entrenar_tiro sigue apareciendo sin la marca 'en_techo', cobra 25 de energía y suma +0,16 que el clamp descarta. Es el número plausible y equivocado: la calibración de rendimiento_piso (0.13) se midió sobre una base que no es la del partido para nadie que haya tocado el clásico.

**Arreglo** · Una sola fuente: que armarPlanteles use statsDeHoy() (pasarlas en masterPartido.stats) cuando viene del Master, y que el clásico solo aporte stats en el modo clásico.

### 63. El botón TIRO informa '~X% de zafar' (el duelo contra el bloqueo), nunca la chance de gol, que va de 27% a 95% según la distancia; dist_tiro 525 habilita remates con factor 0,10

`**BUG** · ux · horas`

**Dónde** · phaser/scenes/match.js:2289 (pct = duelChance(poder, poderRival)) y :2325 (sub '% de zafar') · phaser/logic/duel.js:factorDistancia · balance.partido.dist_tiro 525, tiro.referencia 90, media_vida 210

**Evidencia** · Simulación variando desde dónde se aprieta ACCIÓN (300 partidos, Primera B): x>=530 → 12 tiros, 19,7% de gol por tiro, chance media 26,7%, 4,4 bloqueados; x>=760 → 36,9%, chance 55%; x>=880 → 73%, chance 91%; x>=940 → 81,4%, chance 95%. factorDistancia a 525 px del arco = 0,10, a 350 = 0,34, a 200 = 0,88. Tabla analítica: tiro 50 contra keeper 40 a 500 px = 11%, a 150 px = 94%. El menú muestra en todos los casos el mismo '~55% de zafar' porque poderRival es constante; el jugador no tiene forma de saber que tirar desde 525 es tirarla al arquero.

**Arreglo** · En el sub del botón TIRO (y en el menú libre) mostrar Math.round(duelChance*factorDistancia*100)+'% de gol' usando prep.distancia; o subir dist_tiro a ~650 y mostrar 'LEJOS DEL ARCO' antes.

### 64. El 'límite invisible' de la CPU casi nunca dispara: cruza el 30% en el 11% de los partidos (minuto 81 mediano) y poderRival baja de 52 a ~49 en 90 minutos

`**BUG** · balance · horas`

**Dónde** · phaser/logic/partido.js:498-503 (poderRival: 0.86+0.14*frac, picada bajo cpu_umbral_frac) · phaser/data/balance.json aguante.cpu_factor_costo 0.75, recuperacion_por_minuto_salto 6, recuperacion_entretiempo_frac 0.375

**Evidencia** · 300 partidos con hook en resolverDuelo: la CPU cruza el umbral 0,3 en 34 de 300 partidos, minuto mediano del primer cruce 81; 131 de 7315 duelos (2%) se juegan con la CPU en picada; poderRival medio 49,9 (entero 52, picada 32,2). Fracción media del tanque CPU por tramo: 0,94 (0-15') · 0,80 · 0,65 (30-45') · 0,82 (tras entretiempo) · 0,70 · 0,56 (75-90'). Con frac 0,56 la pendiente da 52*(0.86+0.078)=48,8: −3 de poder = −5 puntos de chance en todo el partido. La 'trampa elegante' del GDD 7.3 no se ve.

**Arreglo** · cpu_factor_costo 1.0 y recuperacion_por_minuto_salto 3 para la CPU (o cpu_umbral_frac 0.5), y una pendiente 0.7+0.3*frac; verificar con el simulador que la picada llegue en el 60-70% de los partidos alrededor del minuto 60-70.

### 65. El bonus de ánimo a la lectura de duelos está muerto y el guardián lo excusa con una justificación falsa: el ánimo solo vale 3 duelos de envión

`**BUG** · arquitectura · minutos`

**Dónde** · phaser/scenes/match.js:307 (this._lecturaSemana = sem.lectura, sin lector) · phaser/test/desconectados.test.js:297 (ESCRITOS_OK: 'se pasa al estado del partido en la misma línea') · phaser/logic/semana.js:comoLlegas

**Evidencia** · grep '_lecturaSemana' fuera de tests: una sola línea, la escritura. En la misma línea no se pasa a ningún estado; resolverDuelo (partido.js:604-618) solo suma bonusAguante y envión. El guardián lo tiene en la lista blanca con una razón que no describe el código, o sea que la deuda de campo '0' está mal contada. Medido con comoLlegas: ánimo 0→100 = envionInicial 0→50 = 3 duelos ganados de diferencia (gana_duelo 18); lectura -5..+5 no llega a nadie. Consecuencia en la semana: asado (+15 ánimo), ayudar_casa (+10, 35 de energía) y estudiar (+3) compran algo que casi no pesa; ayudar_casa queda dominado por entrenar_aguante (30 energía, +2 resistencia vs +1).

**Arreglo** · Llevar sem.lectura a st.lecturaSemana en match.js:307 y sumarlo a bA en resolverDuelo; sacar '_lecturaSemana' y '_semanaResumen' de ESCRITOS_OK para que el guardián vuelva a vigilarlos.

### 66. Entrenar aguante deja MENOS aguante el domingo que descansar: techo 1196 pero llegás con 643 promedio contra 1000; 49 semanas compran +0,7 puntos de victoria en Primera B

`**BUG** · balance · horas`

**Dónde** · phaser/logic/semana.js:226-231 (techoDeAguante, aguante_por_resistencia=4 no existe en balance.json) · data/semana.json entrenar_aguante (30 energía) · phaser/logic/semana.js:comoLlegas

**Evidencia** · 90 semanas con semana.js y el balance real, 'entrenar_aguante' las tres ranuras: techo 1105/1153/1176/1195/1196 en las semanas 18/36/54/72/90, pero la energía termina en 20 y el domingo llegás con 619-670; promedio de aguanteInicial en las 90 semanas: 643, contra 1000 descansando y 452 entrenando tiro. En el partido simulado, +197 de tanque lleno: 94,0→94,7% (Primera B) y 68→71% (Nacional); una semana de entrenar aguante (+8) es +0,03 de poder en bonusAguante. Entrenar tiro 35 semanas en Nacional: 68→84%. La perilla aguante_por_resistencia solo vive como default en el código, contra la regla 'ningún número de tuning vive en el código'.

**Arreglo** · Declarar aguante_por_resistencia en balance.semana y subirla (8-10), y que resistencia también baje desgaste_max/resaca (que es lo que 'aguante' debería significar entre domingo y domingo).

### 67. PICADITO entrena la stat 'azar', que nadie lee, y se come el tope permanente de la semana: la otra opción de entrenar paga 25 de energía por +0

`**BUG** · datos · minutos`

**Dónde** · data/semana.json:66-70 (stat 'azar') · phaser/logic/semana.js:189-195 (suma al tope) · phaser/scenes/match.js:313 (if (k === 'azar') return) · phaser/scenes/master.js:219-232 (statsDeHoy no incluye azar)

**Evidencia** · Corrido semana.js con el balance real: [picadito, entrenar_aguante, entrenar_tiro] → permanentes {azar:1, resistencia:2}: el entrenar_tiro del viernes cobra 25 de energía y no suma nada porque el tope (permanente_max_semana=3) ya está lleno con 1 punto que ningún motor lee. [picadito×3] → {azar:3}, cero efecto permanente. picadito no es una_vez, así que se puede repetir.

**Arreglo** · Sacar stat/stat_mas de picadito (queda energía 15 + ánimo 5 + riesgo_golpe), o que elegir() traduzca 'azar' a una stat real elegida con rng antes de acumular.

### 68. PICADITO y VER AL RIVAL están dominados por ASADO y DESCANSAR porque sus dos efectos no existen: 'azar' se descarta y 'espiado' es un renglón de texto

`**BUG** · datos · minutos`

**Dónde** · phaser/scenes/match.js:314 (`if (k === "azar") return;`) · phaser/scenes/master.js:1192 y :977 · phaser/test/semana.test.js:53-58 · data/semana.json (picadito, ver_rival)

**Evidencia** · picadito da `stat: "azar", stat_mas: 1`; semana.elegir lo acumula en permanentes.azar, master.js:1272 lo copia a save.mejoras.azar y match.js:314 lo saltea; grep de `azar` en phaser/ e index.html: ningún otro consumidor. master.js:1192 le promete al jugador '+1 a una stat al azar'. `espiado` sólo lo lee master.js:977 (texto). semana.test.js:53-58 le acredita 0,5 stat al azar y +1 'extra' al espía, y con eso su test de 'ninguna opción dominada' da verde. Recalculado el mismo test sin esos dos efectos (como corre el juego): picadito dominado por asado y por descansar; ver_rival dominado por asado y por descansar. Viola la regla de diseño de semana.json ('NUNCA hay una opción objetivamente mejor').

**Arreglo** · En match.js, al aplicar mejoras, convertir `azar` en +N a una stat real elegida con semilla (fecha+id) y guardarla como stat concreta; `espiado` → mostrar los cpu_pesos del perfil rival en el menú del cruce y/o revelar la intención rival en el primer duelo defensivo.

### 69. La 'picada' de la CPU (límite invisible, GDD 7.3) no pasa nunca: en el 1-4% de los partidos y recién al minuto 90

`**BUG** · balance · minutos`

**Dónde** · phaser/logic/partido.js:396-401 (poderRival, cpu_umbral_frac) · partido.js saltoReloj (regen CPU) · partido.js entretiempo (rec CPU) · balance.aguante.cpu_umbral_frac 0,3 / cpu_picada 0,62

**Evidencia** · Harness 300 partidos: aguanteRival < 0,3 en 4% (gambeta), 1-2% (por división), 0% (política pase); minuto medio de la picada 90; frac CPU final media 0,55-0,59; frac media en los momentos por tramo de 15': 0,96 0,84 0,71 | 0,86 0,75 0,63. La CPU paga 0,75× pero recupera lo mismo que vos (recuperacion_por_minuto_salto 6 → +13,2 por momento, +375 en el entretiempo). El motivo 'rival_fundido' de motivoDuelo (< 0,35) tampoco se ve. La 'trampa deliberada y elegante' del original no existe en el juego que corre.

**Arreglo** · Perilla propia para la CPU: cpu_regen_mult 0,5 en saltoReloj y sin recarga de entretiempo para la CPU (o cpu_umbral_frac 0,5). Verificar con el harness que la picada llegue en el segundo tiempo en ~60% de los partidos.

### 70. El golpe fuerte 'golpe_prob 0,25 · 1 cada 7-8 fechas' es un número medido con el tanque forzado: en partidos reales nace 0 veces en 400

`**BUG** · balance · minutos`

**Dónde** · phaser/logic/partido.js (resolverDuelo, bloque EL GOLPE FUERTE) · phaser/test/lesion.test.js:75,88,109 · balance.aguante.golpe_prob

**Evidencia** · lesion.test.js pone `st.mios[st.ctrl].aguante = A.umbral_rendido + 20` antes de cada duelo (líneas 75, 88, 109): mide la rama con el tanque en el piso, no cuántas veces el partido llega ahí. Harness 400 partidos (primera_b, VOS stats 60): 5,9 duelos de cuerpo por partido, 0 de 2.360 con el marcador por debajo de 110, 0 golpes. Causa: el rendido casi no existe (min aguante VOS medio 600; GAMBETA bloqueada por SIN AGUANTE en el 2,2% de los menús) por la regen 6/min de salto + 375 de entretiempo + el control que salta de jugador. La rama de lesión, CURAR y penal_molestia siguen apagados en la práctica. Es la enfermedad B.

**Arreglo** · Disparar el golpe con un umbral alcanzable (perder un duelo de cuerpo con el tanque < 35%) o una prob. chica (4%) en cualquier duelo de cuerpo perdido, y medirlo con un partido entero simulado, no con el tanque puesto a mano.

### 71. La resaca de la semana (A3) está calibrada, testeada y desconectada: nadie escribe save.energiaFinal ni guarda lunes.resaca

`**BUG** · datos · minutos`

**Dónde** · phaser/scenes/master.js:97-99 · phaser/logic/semana.js (lunesDespues → resaca, nuevaSemana lee save.resaca) · phaser/test/carrera.test.js:80

**Evidencia** · master.js:97-99 guarda `lunes.animo`, `lunes.desgaste`, `lunes.molestia` y NO `lunes.resaca`; grep de `resaca|energiaFinal` en phaser/scenes/*.js e index.html: cero hits (sólo tests). lunesDespues calcula `resacaDeLaSemana(save.energiaFinal)` con energiaFinal undefined → 0, y nuevaSemana lee `save.resaca` que nunca existe → 0. carrera.test.js:80 le pasa `energiaFinal: semana.energia` a mano, por eso está verde. balance.semana.resaca_frac 0,33 y resaca_piso 50 no los consume nadie en juego. En el juego real podés gastar todo el viernes y el lunes arrancar como si nada (justo lo que A3 decía arreglar).

**Arreglo** · En cerrarSemana: `this.save.energiaFinal = sem.energia`; en el bloque del lunes: `this.save.resaca = lunes.resaca`. Agregar `resaca`/`energiaFinal` a la lista de claves del guardián.

### 72. IR A VER AL RIVAL cobra 20 de energía (110 de aguante el domingo) y no hace nada: 'espiado' muere en la semana y el perfil del rival ya se muestra gratis en la tabla

`**BUG** · balance · horas · visto por 2 roles`

**Dónde** · phaser/logic/semana.js:183 (espiado) · phaser/scenes/master.js:977 (único consumidor: un texto) · master.js:1489 (perfil.n gratis antes de la semana) · data/semana.json ver_rival, estudiar

**Evidencia** · grep 'espiado': se escribe en elegir() y solo lo lee master.js:977 para dibujar '👀 los fuiste a ver: sabés a qué juegan'. comoLlegas() no lo devuelve, save.semanaResumen (lo que viaja a match como masterPartido.semana) no lo lleva, match.js no tiene ni una lectura. Y master.js:1489 ya imprime 'un equipo pura garra' en la pantalla de la fecha para todos. Costo real: 1 punto de energía = 5,5 de aguante el domingo (comoLlegas), o sea 110 de aguante por nada. Mismo caso: ESTUDIAR (20 de energía, +3 ánimo, 'evita: materia' sin ningún lector en el repo) queda dominado por DESCANSAR (+30 energía, +5 ánimo).

**Arreglo** · Darle efecto a espiado en el partido (pasarlo en masterPartido y mostrar cpu_pesos/perfil en el menú del cruce, o +5 de lectura en resolverDuelo) o sacar la opción; estudiar: conectar 'materia' a un evento o borrarla.

> Otro rol lo midió aparte: grep espiado/espia en scenes/*.js y logic/*.js: solo semana.js:183 (propaga el flag) y master.js:977 (texto). match.js no lo lee; _perfilRival se calcula siempre (match.js:252) y el aviso '⚔ … juega X' además cae en la capa apagada. La tarjeta dice 'ves cómo juega el rival' (textoEfecto, master.js:1194) por 20 de energía que en la cancha no devuelve nada.

### 73. En el mapa de clubes las flechas hacen dos cosas distintas: ↑↓ mueven el cursor (hay que confirmar con Enter) y ←→ eligen directo en orden de lista, ignorando el cursor

`**BUG** · ux · minutos`

**Dónde** · phaser/scenes/master.js:376-377 (keydown-LEFT/RIGHT propios de vistaElegir) contra master.js:566 (grupoFoco geométrico en dibujarMapa)

**Evidencia** · En vivo: DOWN×2 → _foco.i pasa 0→2→8 (Guatraché) y pSel sigue 0; LEFT → pSel salta a 9 (Macachín, el anterior en la lista) y el cursor lo sigue; listenerCount('keydown-LEFT') = 2 (el del cursor y el de la vista). El jugador ve la escuadra en un pueblo y la estrella en otro.

**Arreglo** · Sacar los keydown-LEFT/RIGHT de vistaElegir y usar alMover del grupoFoco para actualizar pSel (o exigir Enter en los cuatro ejes).

### 74. Con carrera pendiente el editor apila tres títulos en 35 px: 'PASO 1 DE 2' y 'después te van a entrevistar' se pisan con 'TU PINTA'

`**BUG** · visual · minutos · visto por 2 roles`

**Dónde** · phaser/scenes/editor.js:189 y :192 (agregados) contra editor.js:66 (TU PINTA, nivel(1)=24 px, sigue dibujándose)

**Evidencia** · Medido en vivo con carreraPendiente: 'PASO 1 DE 2 · ARMÁ TU PINTA' y 12-26, 'TU PINTA' y 17-43, 'después te van a entrevistar…' y 34-47 — solapes de 9 px arriba y 9 px abajo, mismo centro x. En la captura los tres textos se leen superpuestos. Es la primera pantalla de toda carrera nueva.

**Arreglo** · Con carreraPendiente reemplazar el título y la bajada del editor por los del paso 1 (un solo par de textos), en vez de sumarlos.

> Otro rol lo midió aparte: Corrido en navegador: bounds 'TU PINTA' y 17–43; 'PASO 1 DE 2 · ARMÁ TU PINTA' y 12–26 (solapa 9 px); 'después te van a entrevistar, y te van a ver así' y 34–47 (solapa 9 px). Los tres centrados en x≈480. Es la primera pantalla de la carrera nueva.

### 75. Tras cada partido, '✔ GANASTE 2-1' se dibuja encima de 'Club Winifreda' en la tabla (7 px de solape, mismo ancho)

`**BUG** · visual · minutos · visto por 2 roles`

**Dónde** · phaser/scenes/master.js:1366 (club en y=78) y :1372 (resultado en y=84), los dos origin 0.5 y 12 px

**Evidencia** · Medido en vivo con getBounds tras masterResultado {2-1}: 'Club Winifreda' ocupa y 72-85, x 439-521; '✔ GANASTE 2-1' ocupa y 78-91, x 439-521. En la captura se lee como una mancha bajo el título. Pasa en las 18 fechas de cada temporada.

**Arreglo** · Bajar el resultado a y≈98 (o ponerlo en la misma línea: 'Club Winifreda · ✔ GANASTE 2-1').

> Otro rol lo midió aparte: Corrido en navegador con _ultimo={2,1}: getBounds() de 'Club Toay' = y 72–85, de '✔ GANASTE 2-1' = y 78–91 → 7 px de solape, los dos centrados en x=480. Es la primera pantalla que ve el jugador al volver de cada partido.

### 76. El tutorial del primer partido solo avanza con el dedo: SPACE, ENTER y ESC no hacen nada y el pie dice 'tocá para seguir'

`**BUG** · accesibilidad · minutos`

**Dónde** · phaser/scenes/match.js:1922 (pie) y :1933 (velo.on('pointerdown') es la única salida)

**Evidencia** · En vivo con estado TUTORIAL: despachadas SPACE, ENTER, ESC y → → estado sigue TUTORIAL, _foco=false; tres pointerdown sobre el velo → LIBRE. El paso 2 del propio tutorial dice '(en teclado: ESPACIO)' mientras ESPACIO no responde (onBotonAccion exige estado LIBRE, match.js:1967).

**Arreglo** · En el keydown-SPACE/ENTER, si estado === 'TUTORIAL' avanzar el paso; pie 'tocá o apretá ESPACIO para seguir'.

### 77. Con carrera pendiente el editor ofrece tres salidas: '🏆 CARRERA' y '▶ LISTO, A LA ENTREVISTA' hacen exactamente lo mismo, y '▶ ¡A LA CANCHA!' abandona el flujo

`*Sugerencia* · ux · minutos`

**Dónde** · phaser/scenes/editor.js:176-179 (bc), :197-200 (seg), :175 (A LA CANCHA)

**Evidencia** · Los dos handlers son idénticos: this.guardar(); this.irA('master'). El comentario D5 dice 'el botón de volver cambia de nombre' pero el código agrega un botón y deja el otro. Captura en vivo: CARRERA arriba a la derecha, LISTO en el centro, A LA CANCHA abajo, los tres a la vez.

**Arreglo** · Con carreraPendiente ocultar CARRERA y A LA CANCHA y dejar solo LISTO, A LA ENTREVISTA (y que entre al grupoFoco).

### 78. Antes del primer partido de carrera se pasa DOS veces por el editor (intro → editor, y de nuevo como 'PASO 1 DE 2') y son ~18 toques hasta jugar

`*Sugerencia* · onboarding · horas`

**Dónde** · phaser/scenes/intro.js:143 (irA('editor')) y phaser/scenes/master.js:387-391 (arrancarEn → irA('editor') otra vez)

**Evidencia** · Recorrido contado en vivo: compuerta 1 + saltear intro 1 + CARRERA 1 + ARRANCAR 1 + LISTO 1 + entrevista 3 + JUGAR LA FECHA 1 + evento 1 + semana 3 + JUGAR 1 + tempo 1 + tutorial 3 = 18 toques, con la misma pantalla de pinta vista dos veces (la primera sin contexto de carrera, con A LA CANCHA como botón principal).

**Arreglo** · Si ya hay pinta guardada (avatares.vos), arrancarEn salta el editor y va directo a la entrevista, o pregunta '¿seguís con esta pinta? SÍ / CAMBIAR' con una sola tecla.

### 79. La tensión no sube hacia el final: el entretiempo recarga a los dos, los duelos son igual de fáciles a los 80' que a los 10', y el 2T rinde menos goles que el 1T

`*Sugerencia* · balance · horas`

**Dónde** · phaser/logic/partido.js entretiempo() (recuperacion_entretiempo_frac 0,375 a mios y CPU) · balance.tempo / balance.musica.final_tramo_min

**Evidencia** · Harness 300 partidos: duelos ganados por tramo de 15' = 57/53/52/51/58/53 % (plano); goles a favor 1T 1,12 vs 2T 0,88; aguante VOS en los momentos por tramo 841/750/730 → 904/891/845 (el 2T arranca MÁS entero que el final del 1T); frac CPU 0,71 → 0,86 al reanudar. Lo único que cambia al final es el descuento oculto (1-3') y el tema 'urgente' (final_tramo_min 78): la música anuncia una urgencia que el sistema no produce. Nada le da al jugador un motivo para 'una jugada más'.

**Arreglo** · Que el último tramo tenga reglas: desde el 75' la CPU que va perdiendo presiona (persecutores +1, ia_linea +30) y la que va ganando se mete atrás; entretiempo 0,2 en vez de 0,375 (y 0 para la CPU); envion.gana_duelo ×1,5 en los últimos 15'; el descuento se anuncia recién al 90 ('+2').

### 80. Los tres megatiros dan la misma chance de gol, el Caldén (450) queda dominado por el Atuel (250), y el menú no deja elegir: siempre ofrece el último desbloqueado

`*Sugerencia* · balance · horas`

**Dónde** · data/megacosas.json (megatiros) · phaser/scenes/match.js:3258-3261 (megaDisponible → lista[lista.length-1]) · phaser/logic/duel.js duelChance/comprimir (max 0,95) · phaser/scenes/jugadon_ui.js jugadonRemate (x = W-130)

**Evidencia** · Simulados 20.000 remates por caso con tiroAuto+resolveShot y el balance real (tiro 65, 1 defensor). x=760, Primera B: normal 46,4% · Caldén 76,7 · Atuel 76,7 · Tornado 76,3. Mundial: 23,5 · 73,7 · 75,6 · 75,1. mult 1,3/1,45/1,6 muere en la asíntota de duelChance (por encima de max 0,95 comprime) y lo que vale es el flag `especial` (media_vida 380), que es igual para los tres. Desde x=950 el mega suma +0,7 puntos sobre el tiro normal (86,0 → 86,7). Peor: en el jugadón el megatiro remata desde x=920 (jugadon_ui.js, `W-130`) tras 3 obstáculos (55,5% de pasar, simulado con jugadon.js) → ≈48% de gol por 450 de aguante + ficha de tiro, mientras la GAMBETA-TIRO gratis (2 obstáculos, 66% de pasar) da ≈56%. lectura.js dice 'premia VARIAR' pero con un solo megatiro ofrecido no hay qué variar.

**Arreglo** · Diferenciar por eje, no por mult: Caldén = distancia (media_vida_especial propia), Atuel = ignora el bloqueo A3, Tornado = fuera 0 y +1 obstáculo; megaDisponible devuelve la lista y el menú deja elegir; la corrida del mega no debería tener más obstáculos que la gratis.

### 81. El ÁNIMO es una moneda muerta: sólo mueve el envión inicial (+20 en el mejor caso ≈ un duelo) y su bonus de lectura se guarda y nadie lo lee — con una exención falsa en el guardián

`*Sugerencia* · balance · minutos`

**Dónde** · phaser/logic/semana.js comoLlegas() · phaser/scenes/match.js:307 (`this._lecturaSemana = sem.lectura`) · phaser/test/desconectados.test.js:297

**Evidencia** · comoLlegas con el balance real: ánimo 40/60/80/100 → envión inicial 20/30/40/50 (el envión llena a 100 con 18 por duelo ganado: la diferencia entre ánimo 60 y 100 es ~1 duelo). `lectura` (±5) se escribe en `this._lecturaSemana` (match.js:307) y grep en scenes/logic no encuentra ningún lector; desconectados.test.js:297 lo exime con 'se pasa al estado del partido en la misma línea', que es falso (esa línea escribe en la escena, no en st). carrera.test.js anota que el ánimo se satura en 100. Con eso, ASADO (+15 ánimo) vende una moneda que no compra nada.

**Arreglo** · Pasar lectura al estado (`st.lecturaSemana`) y sumarla en resolverDuelo como ± al poder propio; que el ánimo bajo cueste (< 45: −4 de poder). Corregir la entrada del guardián.

### 82. El envión tiene un solo uso y ese uso rinde poco: la SÚPER DEFENSA vive en una pantalla inalcanzable y POTENCIAR cubre ~1,8 duelos

`*Sugerencia* · balance · horas`

**Dónde** · phaser/scenes/definicion_ui.js:197-208 (entrarDefinicionDef sale siempre por escenaRemateRival) · :317-319 y :579 (superDef / gastarEnvionSuper) · phaser/logic/partido.js gastarEnvionPotencia (potencia_ms 20000 de _t)

**Evidencia** · gastarEnvionSuper tiene un único llamador (definicion_ui.js:579, defVueloDef) y `_def.superDef` se enciende sólo en defBotonesDef (:318); ambos cuelgan del flujo viejo que entrarDefinicionDef (:197-199) ya no ejecuta (siempre `return this.escenaRemateRival(...)`). GDD 5.4 promete dos gastos. Harness 300 partidos: el envión se llena 1,0 vez por partido; con POTENCIAR automático 1,4 potencias, 2,49 duelos con envión activo (≈1,8 por potencia, +10 de poder = ~+13 pp cada uno), goles 2,00 → 2,19. Seis duelos ganados de mérito compran ~0,23 duelos extra.

**Arreglo** · Gasto defensivo en escenaRemateRival: si el envión está lleno, botón 'TAPÁ' antes del freeze que fuerza `bloqueado`; y que la potencia dure N momentos (contador en st, decrementado en saltoReloj) en vez de 20 s de _t.

### 83. La temporada se define sola: con el 89% de victorias de Primera B el campeonato está resuelto a mitad de fixture y nada de la tabla vuelve al partido

`*Sugerencia* · balance · horas`

**Dónde** · phaser/logic/temporada.js (golesAjenos, veredicto) · phaser/logic/master.js (perfilRival por hash del nombre) · phaser/logic/vida.js (racha sólo alimenta eventos)

**Evidencia** · Harness: primera_b 267-28-5 (89% G). Simuladas 3.000 temporadas con temporada.js: prob. de salir campeón = 7,9% (pWin 0,4) · 29,9% (0,5) · 62,6% (0,6) · 89% (0,7) · 99,5% (0,8) · 100% (0,9). El mejor rival simulado junta 36 pts (mediana; p90 40) y vos ~48. El rival de cada fecha no depende de la tabla ni de la racha: perfilRival es un hash del nombre y la dificultad es fija por división (y encima no entra al duelo). No hay 'partido decisivo' ni 'el puntero juega distinto'. En regional/nacional el 87-80% de victorias sigue dando ascenso casi seguro; recién el Mundial (65%) tiene alguna duda.

**Arreglo** · Que la tabla vuelva al partido: el puntero y el escolta juegan con perfil 'estrella' (con el perfil ya entrando al duelo), el que te sigue en la tabla en las últimas 4 fechas suma persecutores +1, y avisarlo en la previa ('si ganás sos campeón'). Recalibrar mult_stats para que primera_b quede ~65% de victorias.

### 84. La ficha GAMBETA-TIRO es la mejor acción de ataque del juego y cuesta 0 de aguante: dos por partido, ofrecida en cada cruce, ≈56% de gol cada una

`*Sugerencia* · balance · minutos`

**Dónde** · phaser/scenes/match.js:2372-2378 (botonJugadon GAMBETA-TIRO) · phaser/scenes/jugadon_ui.js entrarJugadonGambeta / jugadonRemate (x = W-130) · balance.jugadon.obstaculos

**Evidencia** · El botón se ofrece en todo cruce mientras queden fichas (decisión explícita de V8) y no descuenta aguante (sólo `gastarFicha`). Simulada la corrida con jugadon.js y el balance real, política razonable (gesto correcto, creer la declaración salvo cantito, PROTEGER, POR AFUERA, reloj 50/50): 2 obstáculos → pasa 63-66%, aguante medio gastado 34-38; el remate final sale desde x=920 (tiroAuto+resolveShot, arquero 40) → 54-57% de gol por ficha. Comparado: la GAMBETA del cruce cuesta 90 y gana ~55% para avanzar 90 px; el Caldén cuesta 450 + ficha y rinde ≈48%. GDD 1.5/6.3 quiere lo épico 'raro y valioso'; hoy lo más valioso es lo único gratis.

**Arreglo** · Cobrarle aguante a la ficha (150-200, con su número en el botón) o habilitarla sólo en campo rival (x > W/2), y subir el remate final a 3 obstáculos como el mega — o bajar el del mega a 2. Mantener que se ofrezca siempre.

### 85. '▶ JUGAR LA FECHA' no abre el partido sino el evento y la semana, y desde ahí no hay vuelta a la tabla

`*Sugerencia* · ux · minutos`

**Dónde** · phaser/scenes/master.js:1490-1492 (el botón llama a vistaSemana) · vistaSemana :808-1027 sin botón de volver · vistaEvento :1339-1342 ('no hay salida')

**Evidencia** · Corrido en navegador: en vistaSemana ningún texto matchea /VOLVER|◀/ (hayVolver=false); las únicas salidas son las tres tarjetas y '▶ JUGAR LA FECHA / JUGAR ASÍ'. El que toca 'JUGAR LA FECHA' para ver qué pasa queda comprometido a decidir evento + semana + partido sin poder mirar la tabla ni ir al editor. El save ya se guarda en cada toque (ponerEnLaSemana :1064), así que volver no pierde nada.

**Arreglo** · Renombrar a '▶ PREPARAR LA FECHA' y agregar '◀ TABLA' en vistaSemana (scene.restart(), que ya reconstruye desde el save).

### 86. El que vuelve con carrera necesita 3 toques y 2 pantallas (compuerta → saltear intro → editor → CARRERA) para ver su tabla, en cada carga de página

`*Sugerencia* · onboarding · minutos`

**Dónde** · phaser/scenes/intro.js:50 y :143 (siempre irA('editor')) · :97 (compuerta) · :106/:135 (saltear) · editor.js:178 ('🏆 CARRERA')

**Evidencia** · introVista se guarda en el registry (intro.js:54), que muere con la página: cada apertura del link de WhatsApp muestra compuerta + opening. Ningún camino mira pampa_master_v1 para decidir a dónde ir; index.html:281 arranca por intro y el editor no redirige. Con 18 fechas por temporada y sesiones cortas en celular, son 3 toques repetidos cada vez.

**Arreglo** · En intro.salir() (y en la ruta de :50) ir a 'master' si existe pampa_master_v1; el editor sigue a un toque desde '✎ EDITOR / PINTA'.

### 87. Las stats del jugador no se muestran en ninguna pantalla: la semana promete '+1 tiro' pero nunca ves cuánto tiro tenés

`*Sugerencia* · ux · horas`

**Dónde** · phaser/scenes/master.js:219-231 (statsDeHoy) · :1178-1188 (textoEfecto '+1 tiro') · —

**Evidencia** · statsDeHoy() solo se usa como ctx/bal de la lógica (:901, :1058, :1076, :1207, :1212); grep de 'tiro|gambeta' en master.js y editor.js solo da la lista de nombres de :224. En scenes, stats.* aparece únicamente en cálculos (definicion_ui.js:504, jugadon_ui.js:141/183/646, match.js:3277/3376), nunca en un add.text. La progresión (la mitad de la fórmula del GDD 1.2) es invisible: el rendimiento decreciente de A1 se calibró y el jugador no tiene forma de notarlo.

**Arreglo** · Un bloque 'TUS STATS' en vistaTemporada con los 8 valores de statsDeHoy(), y en momentoDeAccion la línea 'tiro 61 → 62' además del '+1'.

### 88. Las fichas GAMBETA-TIRO son gratis, sin condición y ofrecidas desde el primer cruce: lo óptimo es quemarlas en los minutos 3 y 8

`*Sugerencia* · balance · horas`

**Dónde** · phaser/scenes/match.js:2363-2379 (se ofrecen siempre) · phaser/scenes/jugadon_ui.js:124-200 (entrarJugadonGambeta no cobra aguante) · :475-520 (jugadonRemate te deja en x = W-130 y patea con tiroPorComandos) · balance.json:539-561

**Evidencia** · Medido con logic/jugadon.js real (20.000 corridas por caso, jugador que lee la etiqueta, protege en 'aguante', sale por afuera en 'envenenada'): pasa los 2 obstáculos el 72.5% con gambeta 50 y el 83% con 85, gastando 38-42 de aguante de promedio; después remata desde 130 px del arco, donde la chance media en Primera B es >90%. Comparado con la GAMBETA normal del mismo cruce (57-65%, +90 px, 90 de aguante) la ficha domina en todo. Sé que 'se ofrecen SIEMPRE' fue decisión de Rodri; el problema no es que estén, es que no cuestan nada ni ganan nada por guardarse, así que el 'techo de espectáculo' se gasta en el arranque y los últimos 80 minutos no lo tienen.

**Arreglo** · Sin esconderlas: que la ficha cueste aguante (150) o que se RECARGUE con envión (una ficha nueva cada envión lleno), para que guardarla para el final sea una decisión y no un error.

### 89. Cuando defendés, leer al rival es una moneda de 1/3: su intención no depende de dónde está ni de quién es

`*Sugerencia* · balance · horas`

**Dónde** · phaser/logic/partido.js:621 (accionRival = uno de tres al azar uniforme) · phaser/scenes/match.js:2404 (título 'Adivinale la intención')

**Evidencia** · La CPU 'ataca' eligiendo gambeta/pase/tiro con Math.floor(rng()*3) sin mirar posición, stats ni marcador: elige 'tiro' a 60 metros del arco tan seguido como adentro del área. Como no hay ninguna pista (el GDD 16.2 lo deja como decisión abierta), la matriz no se puede leer y la mejor jugada es siempre la opción de mayor poder. Medido en la sim: quite 56% / corte 57% / bloqueo 57% de chance media — tres botones que son uno.

**Arreglo** · Que la intención salga de la situación (x del portador: lejos → pase 60%, media → gambeta 50%, cerca del área → tiro 55%) y de su perfil (garra gambetea, toque pasa), y que el título del cruce lo insinúe ('está lejos: va a buscar el pase'). Así corte/quite/bloqueo pasan a ser una lectura.

### 90. La tensión del final es solo cosmética: el rival juega igual en el minuto 5 que en el 88, gane o pierda

`*Sugerencia* · balance · horas`

**Dónde** · phaser/logic/partido.js:155-350 (tick: ni goles ni minuto entran a la IA) · :547-553 (eleccionCPU solo pesos) · phaser/scenes/match.js:3155 (decisivo: solo alarga la viñeta) · :4802-4813 (tictac)

**Evidencia** · En partido.js, st.golesMio/golesRival se usan solo para sumar (golMio, resolverAtajada) y st.minuto solo para el reloj y la lectura de especiales; moverPosicional, caza, marcadores, persecutores y cpu_pesos no cambian con el marcador ni con el tiempo. Lo que sí cambia en los últimos 5' (medido: ~3 momentos con minuto >= 85, ~5 desde el 78) es música, tictac y el escalón del drama. Un rival que va perdiendo 0-1 en el 85 no adelanta la línea ni cambia sus pesos; vos ganando 2-0 no tenés motivo para jugar distinto.

**Arreglo** · Dos perillas en balance.ia: si el rival pierde y minuto > 70, ia_linea +40 y persecutores +1 (se te viene encima, más cruces); si gana, ia_linea -40 y cpu_pesos quite +0.15 (se cierra). Es el mismo mecanismo de los perfiles, activado por marcador.

### 91. LA DEFINICIÓN (la 'escena estrella' del GDD §6) aparece ~0.5 veces por partido en la temporada 1, y solo después de un pase largo

`*Sugerencia* · onboarding · horas`

**Dónde** · phaser/scenes/match.js:2691-2697 (con v8_tiro_comandos el TIRO normal no entra a la Definición) · :3907-3910 (megacorrida y combinada piden nivel 2) · :4304-4307 (única puerta en nivel 1: pase ≥240 px que cae pasada la mitad)

**Evidencia** · entrarDefinicionOf tiene cuatro llamadores: resolverTiro (solo con el flag apagado), megacorrida y combinada (nivel ≥2 = desde la Primera A) y el pase largo que llega alto. Medido en la sim en Primera B: con el mejor receptor por %, 0.92 pases de ≥240 px por partido y la Definición se abre 0.54 veces; jugando pase largo a propósito, 0.79; solo pasando, 1.82. Las 810 líneas de definicion_ui.js y sus 4 fases se ven una vez cada dos partidos en toda la primera temporada, y nunca desde el remate común.

**Arreglo** · Abrir la Definición desde el TIRO normal cuando el tirador está adentro del área (x > W-200) y no hay más de un rival en el camino, dejando tiroPorComandos para la media distancia; así el remate cercano es la escena de zonas y el lejano el de comandos.

### 92. La stat de tiro satura: de 70 para arriba no cambia nada hasta Nacional, así que las 90 semanas de entrenar tiro valen desde la semana ~14

`*Sugerencia* · balance · horas`

**Dónde** · phaser/logic/duel.js:42-52 (max 0.95 + compresión) · phaser/logic/master.js:18-22 (keeper 40/50/62)

**Evidencia** · Tabla con tiroAuto+prepararRemate+resolveShot reales, 2000 tiros por celda: desde x=900, tiro 70/90/99 → 85/86/87% de gol en B, A y Regional (chance 95-96, tope); desde x=750, 43-44% para tiro ≥70 en las cuatro primeras divisiones; solo en Nacional (70: 83%, 50: 52%) y Mundial (50: 33%, 70: 63%, 90: 83%) el rango 70-99 se mueve. Sim 'pase a VOS' en B: tiro 50 → 83% victorias, 70 → 93.5%, 99 → 97.5%. El rendimiento decreciente (A1) hace llegar el 99 en la semana 73 a una stat que dejó de rendir en la 14.

**Arreglo** · Subir duelo.spread (58→80) para estirar la zona sensible, o escalar el keeper de las divisiones bajas (40→48, 50→58, 62→68) para que el 70-99 se sienta antes del Mundial; medir con tablas.js.

### 93. La defensa es indiferente: quite, corte, bloqueo o azar dan lo mismo, y ni siquiera mover al marcador cambia el resultado

`*Sugerencia* · balance · horas`

**Dónde** · phaser/logic/partido.js:529-535 (accionesDefensa) y :619-631 (rama defensiva de resolverDuelo)

**Evidencia** · Sim B, 200 partidos, ataque fijo: quite 74.5% victorias, corte 74.5%, bloqueo 72%, elección al azar 70%, y defensa 'quieta' (sin input, solo el cambio automático) 72% con 3.56 cruces defensivos contra 5.54; solo NO MOVERSE en todos baja a 42%. dDef 55-62% en todos los casos: la adivinanza de la CPU (gambeta/pase/tiro uniforme) mueve ±12 sobre 58 y el rival igual no convierte (hallazgo del arquero). Con matriz_bonus 30, dDef cae a 50% y la lectura pasa a importar.

**Arreglo** · Viene con el arreglo del arquero; además que la matriz pese más en defensa (un matriz_bonus_def de 20) y que la elección de la CPU en ataque salga de sus stats (gambeta alta → gambetea) para que leerla tenga base.

### 94. El guardián P1 sólo lee match.js: los ocho mixins escriben estado en la misma instancia y quedan fuera del barrido

`*Sugerencia* · arquitectura · minutos`

**Dónde** · phaser/test/p1_estado_limpio.test.js:35-41 (sólo SRC = match.js) · mixins: jugadon_ui.js, definicion_ui.js, escenas_v9.js, cartas_ui.js, tribuna_ui.js, foco_ui.js, piel_ui.js, feel_ui.js

**Evidencia** · Los mixins entran por Object.assign(PampaMatch.prototype, ...) y escriben campos de la escena (_focoShutdown, _corteMusicaArmado, _enHitstop, _jgAviso, _jgMini, _hin, _tribuna, _def, _foco...). El test computa `limpios` desde init/create de match.js y escanea banderas sólo en match.js, así que una bandera nueva en cualquier mixin no la ve nadie. Mi barrido de los 9 archivos lista 94 asignaciones fuera de init/create; el test declara cubrir 'la clase de bug' y hoy cubre un archivo.

**Arreglo** · Que [1] y [4] recorran match.js más todos los archivos que hacen Object.assign(window.PampaMatch.prototype, ...) y crucen contra init()/create() de match.js.

### 95. El viewport bloquea el zoom del navegador (user-scalable=no, maximum-scale=1): con textos de 7-9 px reales, el pellizco era el único remedio del jugador

`*Sugerencia* · accesibilidad · minutos`

**Dónde** · phaser/index.html:5

**Evidencia** · <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">. WCAG 1.4.4 (Resize text) pide no impedir el zoom; 34 textos están por debajo del piso propio (ver legibilidad.test.js) y no existe ninguna opción de 'letra grande' en el juego (grep de balance.legibilidad: sólo la consumen el radar y pisoTactil).

**Arreglo** · Sacar maximum-scale y user-scalable (Scale.FIT sigue funcionando; iOS Safari ya ignora user-scalable=no) o, mejor, un toggle 'LETRA GRANDE' junto al mute que multiplique legibilidad.texto_info_min y los fontSize de nivel().

### 96. Muletillas del relator: "como siempre" cierra 4 frases en 4 bolsas distintas y "viento" aparece 10 veces; el mundo se queda en viento-caldén-mate

`*Sugerencia* · texto · horas`

**Dónde** · data/relatos.json relator.saque[0], gol_rival[2], urgente[1], final[1] · data/tribuna.json

**Evidencia** · Contado con grep: «como siempre» ×4 en relatos.json, cada una en una bolsa distinta (saque, gol_rival, urgente, final), así que un solo partido puede oírla cuatro veces sin que la bolsa barajada lo evite (la bolsa es por situación, relator.js:24). «viento» ×10 en relatos.json y ×5 en tribuna.json; «mate» ×6 y ×5. Salvo ruta 35, Victorica (el baile), casuarinas y alambrado, el paisaje que nombran los textos es siempre el mismo trío.

**Arreglo** · Dejar «como siempre» en una sola bolsa. Repartir motivos nuevos por bolsa: la siesta, el tren que ya no pasa, la estación, la salina, el médano, el pastizal, la cosechadora en la ruta, el boliche del pueblo, el puestero, el pueblo del rival ({rival_pueblo} si divisiones.json lo declara). Regla práctica: ninguna palabra-paisaje más de dos veces por archivo.

### 97. La semana no llega a la cancha: elegís el pampero o el barro y el relator igual saca «Viento cruzado, como siempre»

`*Sugerencia* · texto · horas`

**Dónde** · phaser/scenes/match.js:286, 1832 · data/relatos.json relator.saque · data/tribuna.json

**Evidencia** · Lo único del evento semanal que entra al partido es `this._vidaFicha = md.frase` (match.js:286), que se muestra una sola vez como toast «📋 ...» 1,4 s después del tempo (match.js:1832). relatos.json no tiene ninguna bolsa por clima ni recibe el eventoId (grep `clima|modFecha|pampero` en relatos.json: 0), y tribuna.json tampoco: la helada, el barro, los cuarenta grados o el micro con treinta del pueblo se anuncian el lunes y el domingo nadie los vuelve a nombrar. Es el hilo más barato para que La Pampa se sienta continua.

**Arreglo** · Pasar `md.eventoId` al contexto del relator y agregar bolsas opcionales `saque_pampero`, `saque_barro`, `saque_calor`, `saque_helada` (3 líneas cada una) con fallback a `saque`; y un intercambio de tribuna por clima («Con este barro no hay pase corto, Tuli» / «Con este barro no hay choripán que se salve»).

## SEVERIDAD BAJA · 18

### 98. Tres giros que no cierran: "atajando penales contra el paredón", "el nueve anda con la mano caliente", "al lateral del pensamiento"

`**BUG** · texto · minutos`

**Dónde** · data/eventos_temporada.json (arquero.texto, nueve.opciones[0].frase_relator) · data/relatos.json relator.corte[5]

**Evidencia** · «El arquero se quedó hasta tarde atajando penales contra el paredón del club»: contra un paredón se patea, no se ataja; nadie le está pateando (la opción 1 es justamente «Me quedo a patearle»). «Hoy la va a buscar siempre para el nueve, que anda con la mano caliente»: es un giro de básquet y el mismo evento ya usa el correcto («El nueve anda dulce»). «Le tiró la pierna y la sacó al lateral del pensamiento»: no se entiende qué pasó con la pelota.

**Arreglo** · «El arquero se quedó hasta tarde en el club, pidiendo que le pateen» / «que anda dulce» / «Le tiró la pierna y la mandó al lateral. A empezar de nuevo.»

### 99. nombreCorto() deja nombres cómicos o inconsistentes en el marcador ("CUL. ARGENTINO", "CAPI. FEDE. FC", "CAL MACACHÍN") y el relator los usa como si fueran personas

`**BUG** · texto · horas`

**Dónde** · phaser/logic/piel.js:224-246 · data/relatos.json relator.corte[2], gol_rival[0] · phaser/scenes/match.js:496

**Evidencia** · Corrido en node contra los 45 clubes de divisiones.json: «Cultural Argentino → CUL. ARGENTINO», «Capital Federal FC → CAPI. FEDE. FC», «Sportivo General Acha → SPO. GEN. ACHA», «Sal y Cal de Macachín → CAL MACACHÍN» (pierde "Sal y"), «Patagonia Austral → PATA. AUSTRAL», y «Deportivo Telén → DEPO. TELÉN» pero «Deportivo Winifreda → DEP. WINIFREDA» (la misma palabra abreviada de dos formas). Ese mismo string va a {rival} (match.js:496 `rival: this.nombreRival`), así que el relator dice «El pase quedó corto y CUL. ARGENTINO dijo gracias.» PASADA_DE_COHERENCIA #3 lo dio por arreglado "probado contra los 45 clubes": probado que no explota, no que lea bien.

**Arreglo** · Campo opcional `corto` por club en divisiones.json (escrito a mano: «CULTURAL», «SAL Y CAL», «CAPITAL FC») que nombreCorto respete antes de abreviar; y en relatos.json usar {rival} solo donde calza un club («Gol de {rival}») y sacar el «dijo gracias».

### 100. "Es tu primera fecha con esta camiseta. No dormiste en toda la noche" vuelve a salir en cada temporada con el mismo club

`**BUG** · texto · minutos`

**Dónde** · phaser/logic/vida.js:63 · phaser/scenes/master.js:1543-1548 · phaser/logic/temporada.js:66

**Evidencia** · `case "primera": return (ctx.fecha | 0) === 0`. Al terminar la temporada, master.js:1543 hace `temporadaN++` y crea otra con `miClub: this.save.club` (mismo club) y temporada.js:66 arranca en `fecha: 0`. El ctx que arma master.js:1247-1253 no lleva temporadaN. En la temporada 3, fecha 1, el pibe "debuta" otra vez con la camiseta que lleva 36 fechas usando.

**Arreglo** · Agregar `temporadaN: this.save.temporadaN` al ctx de master.js:1247 y en vida.js:63 `return ctx.fecha === 0 && (ctx.temporadaN | 0) <= 1`; o cambiar el texto a «Primera fecha del año» y dejar la condición.

### 101. Enfermedad A no censada: d.esperaMax se lee y nadie lo escribe, dentro de una rama de la Definición (modo 'def') que nunca corre

`**BUG** · arquitectura · minutos`

**Dónde** · phaser/scenes/definicion_ui.js:786-798 (rama d.modo !== 'of'), 793 (esperaMax)

**Evidencia** · grep -rn esperaMax en phaser/scenes y phaser/logic: única aparición es la lectura de 793 (d.espera >= undefined es siempre false). Además el único lugar que fija modo es la línea 123 (modo: "of"), así que todo el else de 782-798 ("¡Te quedaste mirando! El rival define") es inalcanzable. node phaser/test/desconectados.test.js --censo no lo lista (DEUDA CONOCIDA: 3) y no figura en docs/BARRIDA_DESCONECTADOS.md ni PASADA_DE_COHERENCIA.md.

**Arreglo** · Borrar la rama else de 782-798 junto con defBotonesDef (que el propio balance.definicion._nota declara sin llamador) o sumar esperaMax al censo del guardián para que la deuda quede contada.

### 102. relojDeLaSemana arma un time.addEvent por repintado y nunca remueve el anterior: con reloj_seg > 0 corren N cuentas regresivas y N cerrarSemana

`**BUG** · estado · minutos`

**Dónde** · phaser/scenes/master.js:1024-1039 (único sitio que escribe _relojSem; nadie lo remueve) · repintados en 1088, 1180, 1237

**Evidencia** · Cada vistaSemana llama relojDeLaSemana; `this._relojSem = this.time.addEvent(...)` pisa la referencia sin `.remove()`, así que el timer viejo sigue vivo y su callback sigue haciendo setText sobre un Text desprendido (no destruido, ver removeAll) y al llegar a cero llama cerrarSemana(alJugar) otra vez. Latente: balance.semana.reloj_seg es 0 (data/balance.json:597), pero es el modo opcional documentado en 598 y se rompe apenas se prende.

**Arreglo** · Al principio de relojDeLaSemana: `if (this._relojSem) { this._relojSem.remove(false); this._relojSem = null; }`.

### 103. Los handlers de 'shutdown' se acumulan uno por corrida de escena (el corte de música y el cierre del foco se re-arman en cada create)

`**BUG** · arquitectura · minutos`

**Dónde** · phaser/scenes/piel_ui.js:439-443 (armarCorteDeMusica) · phaser/scenes/foco_ui.js:240-241 (grupoFoco)

**Evidencia** · Los dos apagan su flag ADENTRO del handler de shutdown y lo vuelven a armar en el create siguiente con events.on. En el vendored Phaser, Systems.shutdown sólo hace events.off de TRANSITION_INIT/START/COMPLETE/OUT y emite SHUTDOWN: los demás listeners de scene.events sobreviven a la corrida. Medido en vivo en master: listenerCount('shutdown') 16 → 17 → 18 con dos restarts seguidos. Hoy los handlers son idempotentes (musicaTema(null), cerrarFoco), así que sólo cuesta trabajo y memoria; en una temporada de 18 fechas con el partido en el medio son decenas de closures.

**Arreglo** · Usar this.events.once('shutdown', ...) en los dos sitios (el flag puede quedar igual).

### 104. vistaElegirDia es una pantalla entera sin llamador (la reemplazó D2) y los envoltorios 'vestir' listan vistas que no existen

`**BUG** · arquitectura · minutos`

**Dónde** · phaser/scenes/master.js:1200-1241 (definición) · :1562 y editor.js:366 (listas con vistaElegirDia, vistaFecha, vistaTabla, vistaResultado)

**Evidencia** · grep -rn vistaElegirDia|vistaFecha|vistaTabla|vistaResultado en phaser/scenes da solo la definición y las dos listas de envoltorio; ninguna se invoca. En editor.js la lista envuelve métodos que PampaEditor no tiene (el forEach los saltea por typeof). Es código de una pantalla que el jugador ya no ve, con su propio '◀ VOLVER' y su propio cálculo de bal, que va a divergir de vistaSemana sin que ningún test lo note.

**Arreglo** · Borrar vistaElegirDia y dejar en cada lista solo las vistas que existen en esa clase.

### 105. El piso de resaca (50) solo se aplica si resaca > 0: terminar la semana con 100 de energía te deja arrancar en 45, con 97 en 50

`**BUG** · estado · minutos`

**Dónde** · phaser/logic/semana.js:38-43 (nuevaSemana: if (save && save.resaca) e = Math.max(piso, e))

**Evidencia** · Corrido con semana.js y balance real: energiaFinal 100 + desgaste 40 + molestia → resaca 0 → arrancás con 45; energiaFinal 97 + mismo desgaste y molestia → resaca 1 → arrancás con 50. El que descansa perfecto queda peor que el que gastó 3 de energía. Con desgaste 40 sin molestia y sin resaca: 60, tampoco pisa el piso que la nota _resaca describe como 'mínimo jugable'.

**Arreglo** · Aplicar el piso siempre: e = Math.max(piso, e) fuera del if, o condicionarlo a (desgaste || molestia || resaca).

### 106. duelo.techo y duelo.suavidad no llegan al remate: tiroPorComandos y dispararConCine pasan solo spread/min/max

`**BUG** · datos · minutos`

**Dónde** · phaser/scenes/match.js:3383-3389 (cfg: { spread, min, max }) · match.js dispararConCine (misma línea de cfg) · phaser/logic/duel.js:duelChance

**Evidencia** · duelChance(90, 40) con el cfg que arma el remate = 0,978 (defaults techo 0.99/suavidad 0.35); con techo 0.96 y suavidad 0.1 puestos en balance.duelo = 0,960. Hoy coinciden por casualidad porque los defaults del código son iguales al JSON; el día que se toque balance.duelo.techo cambian los duelos (resolverDuelo pasa bal.duelo entero) y el remate no, y la nota _d2 del balance dice que la compresión gobierna 'la chance' sin distinguir.

**Arreglo** · Pasar cfg: this.BAL.duelo en los dos resolveShot de match.js.

### 107. Las dos opciones del evento de la semana no dicen qué dejan, mientras cada tarjeta de la semana muestra su efecto en números

`*Sugerencia* · texto · minutos`

**Dónde** · phaser/scenes/master.js:1331 (solo '(i+1) · o.texto'); data/eventos_temporada.json

**Evidencia** · Contado en node: 28 eventos, 56 opciones con bloque efecto (p. ej. {tiro: 6}) y 0 con sub/desc; la pantalla no imprime ni el efecto ni un 'no hay opción mala' como sí hace la entrevista (master.js:627). El jugador elige entre 'Entro en frío' y 'Pido entrar más adelante' sin saber que una le da +6 de tiro.

**Arreglo** · Una línea chica debajo de cada opción con el efecto (reusar textoEfecto) o, si es intencional elegir por identificación, el mismo aviso verde de la entrevista.

### 108. '💾 GUARDAR PINTA' es redundante: los tres caminos de salida del editor ya guardan

`*Sugerencia* · ux · minutos`

**Dónde** · phaser/scenes/editor.js:174 (GUARDAR) · :175, :179, :201 (¡A LA CANCHA!, 🏆 CARRERA y LISTO llaman guardar() antes de irA)

**Evidencia** · Las tres salidas hacen this.guardar() y el toast '¡Pinta guardada!' es la única diferencia; el botón ocupa 300 px de la franja de decisión y es el primero al que llega el cursor bajando desde las filas (focoObjs: índice 4).

**Arreglo** · Reemplazarlo por '◀ VOLVER' (a master si hay carrera, si no a intro/compuerta) o sacarlo; el guardado sigue implícito.

### 109. La tabla de los otros nueve es la misma en la Primera B y en el Mundial: Brasil rinde igual que Cochico FC

`*Sugerencia* · datos · horas`

**Dónde** · phaser/logic/temporada.js:87-91 (golesAjenos: una sola distribución para todos) · :107-127 (jugarFecha) · phaser/scenes/master.js:1524-1535 (solo el campeón sube)

**Evidencia** · golesAjenos no recibe equipo ni división; con la misma semilla, temporada() en primera_b y en mundial da el mismo mejor ajeno (36 pts) con otros nombres. Simulado 2000 temporadas: el mejor ajeno hace 33 (p10) / 36 (mediana) / 40 (p90) puntos; con 60% de victorias sos campeón el 70% y con las tasas medidas en cancha (84-97%) el 100%. No hay una 'estrella' de la liga que te dispute el título ni una fecha decisiva: la pantalla de la temporada tampoco dice a cuántos puntos estás del primero.

**Arreglo** · Una fuerza por club (data: 0.8-1.3, derivada del hash del nombre o declarada) que sesgue golesAjenos, dos o tres clubes fuertes por división, y un renglón en vistaTemporada: 'a N puntos del primero · faltan M fechas'.

### 110. POTENCIAR cubre ~2,5 duelos por uso y no toca el remate ni la atajada, que es donde se decide el partido

`*Sugerencia* · balance · horas`

**Dónde** · phaser/logic/partido.js:602 (envBonus solo en resolverDuelo) · :864-914 (prepararRemate sin envión) · :1034-1043 (resolverAtajada sin envión) · balance.envion.potencia_ms 20000

**Evidencia** · Un momento cada 4.22 s de tiempo simulado (127.9 s y 30.3 momentos por partido) → potencia_ms 20 s ≈ 4.7 momentos, pero contando todas las llamadas a resolverDuelo: 1.79 usos por partido y 4.43 duelos potenciados → 2.47 por uso (1.71 con 'pase a VOS', porque pases y remates no lo consumen). +10 sobre spread 58 = +17% en 2.5 duelos ≈ 0.4 duelos ganados por uso. potencia_bonus 30 sube las victorias 64→76% en regional, o sea la mecánica responde: el problema es la ventana en ms y la exclusión del remate.

**Arreglo** · Contar la potencia en momentos (los próximos N duelos/remates) en vez de ms de simulación, y sumar potencia_bonus en prepararRemate y resolverAtajada.

### 111. Perillas que no aceptan 0 por el fallback `|| default`: separacion_duelo, potencia_bonus, saltos_vel_mult y las seis de ia

`*Sugerencia* · datos · minutos`

**Dónde** · phaser/logic/partido.js:175, 329 (saltos_vel_mult || 2.4), :602 (potencia_bonus || 10), :666, :682, :695, :702 (separacion_duelo || 90), :222-246 (ia.* || n)

**Evidencia** · Barrido de perillas en regional: separacion_duelo 0 → resultados idénticos al decimal a 90 (200 → 80.5% victorias, sí cambia); potencia_bonus 0 → idéntico a 10 (30 sí cambia). balance._saltos y _nota de envion invitan a 'apagarlo' o 'balancear' y en 0 el motor vuelve al default sin avisar: es la firma de la enfermedad B (medís un cambio que no ocurrió).

**Arreglo** · Reemplazar `x || d` por `x != null ? x : d` en esas lecturas, como ya hace el resto del archivo.

### 112. Las pistas de teclado ("ESPACIO = ACCIÓN", "o apretá cualquier tecla") se esconden en cualquier laptop con pantalla táctil

`*Sugerencia* · onboarding · minutos`

**Dónde** · phaser/scenes/match.js:1757 · phaser/scenes/intro.js:86

**Evidencia** · Ambas condicionan la pista a !this.sys.game.device.input.touch. En phaser/vendor/phaser.min.js device.input.touch se pone en true con 'ontouchstart' in document.documentElement || navigator.maxTouchPoints>=1, o sea en toda notebook táctil (muy comunes en escuelas). El teclado funciona igual, pero el jugador no se entera.

**Arreglo** · Mostrar la pista si hay teclado y esconderla recién al primer pointerdown de tipo touch (input.on('pointerdown', p => p.wasTouch && ocultar)).

### 113. El obstáculo 'reloj' del jugadón da 1,2 s para decidir y el único aviso es una barra roja de 8,7 px reales que se achica, sin número ni sonido

`*Sugerencia* · ux · minutos`

**Dónde** · phaser/scenes/jugadon_ui.js:397-407 · phaser/data/balance.json jugadon.obstaculos.reloj_ms = 1200

**Evidencia** · Barra 320x12 lógicos (12 = 8,7 px reales) tweeneada a scaleX 0 en msV(1200); al vencer se llama jugadonMovida(null) ('te cierra el lado y perdés'). No hay texto de cuenta regresiva ni SFX de tic (grep tic|reloj en jugadon_ui: sólo la barra). Para alguien que lee despacio o con baja visión, el límite es invisible.

**Arreglo** · Un texto "⏱ 1.2s → 0" que baje de a décimas al lado de la barra y un tic de SFX.ui cada 400 ms; o subir reloj_ms a 2000 la primera vez que aparece en la carrera.

### 114. Flashes de pantalla completa y sacudidas sin ninguna opción para reducirlos (hay mute de sonido, no de efectos)

`*Sugerencia* · visual · horas`

**Dónde** · phaser/scenes/match.js:3505, 2884, 3102, 3755, 3784, 3800, 4040 · escenas_v9.js:382 · match.js:3752 (shake a 46 ms)

**Evidencia** · Secuencia de gol: corte flash 120 ms (3505) + flash 90 (2884) en t≈0, flash de impacto 120 (3102); escena especial: flash 90 (3784) + 140 a los 252 ms (3755) + 60 en la revelación (3800); anuncio de megacosa flash 120 (4040). Hasta 3 flashes blancos por segundo (WCAG 2.3.1 marca 3 como límite). La sacudida de esfuerzo es un tween de 46 ms yoyo infinito (≈11 Hz). grep reduc|epilep|flash en balance.json y escenas: no existe perilla ni toggle; el único toggle del HUD es el mute (4640).

**Arreglo** · Una perilla balance.epica.flashes (true/false) y un ítem 'EFECTOS' junto al mute que la apague; con false, envolver uiCam.flash/cameras.main.flash en un helper que no haga nada y bajar shake_intensidad a 0.

### 115. Editor: las pestañas de personaje (★ vos / ♥ amigos) sólo se cambian con puntero

`*Sugerencia* · accesibilidad · minutos`

**Dónde** · phaser/scenes/editor.js:70-74 · 148-163 (teclado) · 171 (_botones)

**Evidencia** · Las pestañas se crean en 70-74 con r.on("pointerdown"); el teclado del editor (148-163) mueve filas con ↑↓, cicla con ◄► y ENTER sólo dispara this._botones (que se llena únicamente en 171 con los botones de abajo). Aparecen sólo si career.vida.amigos existe (48-56), por eso es baja.

**Arreglo** · keydown-TAB (con preventDefault) o Q/E que hagan this.sel = (this.sel+1) % this.personajes.length; this.refrescar().

---

## Cómo se hizo

Nueve agentes independientes, uno por rol, sin verse entre sí, con la orden de traer 8-15 hallazgos **con evidencia** — archivo:línea, o el número que salió de correr algo. Un hallazgo sin evidencia se descartaba.

Cada **bug** pasó después por dos escépticos independientes cuyo trabajo era refutarlo: ir al archivo, correr node, y buscar activamente por qué podría estar bien. Sobrevivía por mayoría. Las sugerencias no se refutan porque son opinión, pero se deduplicaron igual.

Dos vueltas: en la segunda, cada rol recibió la lista de lo ya encontrado con la orden de buscar en los rincones que quedaron sin mirar.

**Lo que no se hizo:** los siete roles que faltan, la tercera vuelta, y el crítico de completitud. El límite de sesión cortó la corrida dos veces. La primera vez se perdieron 32 hallazgos porque mi script contaba "cero escépticos" como "refutado"; se corrigió y la segunda vez no se perdió nada.
