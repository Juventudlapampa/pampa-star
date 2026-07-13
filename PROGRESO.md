# PAMPA STAR — Progreso

## ✅ ANIME v4 "EL ANIME JUGANDO: DOS CAPAS" (13/jul/2026) — LOS 6 BLOQUES DEL ORDEN COMPLETOS
`docs/DISENO_ANIME_V4.md` REEMPLAZA la política de cámara de la v2 (§0): vista táctica ELEVADA para navegar + capa CINEMÁTICA para la épica. Ejecutada en el orden reordenado por impacto/costo, un commit por bloque, revisión adversarial inline, suite **2248 asserts** verdes, soak de partido entero (92', 0 errores, 29 escenas): **A+G** (`c18d68c`) cámara elevada + 22 fichas + radar fuera + pase sobre la cancha + cambio de marcador automático + tempo de 10 min reales · **B** (`4feef99`) gestor `EscenaCine`: tiro/atajada (con MI arquero) + gambeta 4 variantes + intercepción, cada uno como viñeta a pantalla con siluetas de "contra cuántos pateás" · **D** (`9bcafec`) chiptune en LOOP por posesión + silencio pre-desenlace + botón 🔊 con mute compartido con el clásico · **E** (`e5f831b`) `PampaRelator` (data/relatos.json → bloque relator): ticker pampeano por situación, sin repetir, hook streamer listo · **F** (`8571732`) el pase largo llega ALTO → CABEZAZO/VOLEA/CHILENA (la chilena exige aéreo+250 guts, escena máxima), LA DEFINICIÓN con ventana más chica · **C** (`2d2488d`) `retrato64`: caras modulares 64×64 deterministas con 4 expresiones (concentrado/frustrado/triunfante/dolorido) según el momento. **Pendiente a propósito** ("recién si sobra margen"): B prioridades 4-5 (megacosas al gestor + festejo con hinchada). **👉 LEER `HANDOFF_ANIME.md`: checklist por bloque para el celu + calibración.**

## ✅ FEEL v3 "EL ALMA TSUBASA" (11/jul/2026, noche 2) — LOS 8 BLOQUES COMPLETOS
`docs/DISENO_FEEL_TSUBASA_V3.md` manda sobre la v2 en ritmo, tensión y presentación. Ejecutados en el orden del doc (1,2,3,5,4,6,7,8), un commit por bloque (`5636672`→`24d7a24`), tests verdes por bloque (suite 2.207): **B1** ritmo -35% + reloj compensado + BEAT de tensión pre-menú + resolución mínima 1,6s · **B2** saque real desde el círculo, cada equipo en su mitad · **B3** ⚡ACCIÓN 68px con pulso + tutorial 3 pasos (flag en save) · **B5** LA DEFINICIÓN reintegrada: barra de timing en el tiro + MEGATIRO con cut-in, carga, ventana exigente y CINE de 5 planos (megatiros en `data/megacosas.json`: Caldén/Atuel/Tornado con desbloqueo por nivel) · **B4** tensión del pase (viaje con cámara, interceptor que se lanza, suspenso, trayectoria punteada del vacío; seguros fluyen) · **B6** megacosas defensivas (Quite Pampero/Bloqueo Médano/La Tranquera; el rival las anuncia con beat largo + "algo grande se viene") · **B7** corrida de 6 frames + pelota al pie + ráfagas a fondo + rival entrando corriendo · **B8** tema que crece al cruzar de campo + silencio pre-revelación + hinchada. **Las revisiones fueron auto-revisión inline** (el workflow multi-agente murió por límite de sesión, resetea 19:00 — pasada retroactiva disponible a pedido). **👉 LEER `HANDOFF_FEEL.md`: checklist de aceptación por bloque para el celu.**

## ✅ PARTIDO V2 PHASER — "Cámara Cinematográfica" (jul 2026) — TANDA NOCTURNA COMPLETA
Especificación que **manda sobre el partido anterior**: `docs/DISENO_PARTIDO_V2_PAMPA_STAR.md` (+ `docs/INVESTIGACION_CAMARA_CINEMATICA_TSUBASA.md`).
**LAS 6 ETAPAS + LA ETAPA FINAL ESTÁN HECHAS** (commits `0b2df82`→Etapa Final), cada una con tests verdes y revisión adversarial con fixes: E1 cámara/mundo · E2 radar+HUD · E3 menús en cruz+pausa+retratos del banco · E4 sprites heroicos+falsa perspectiva · E5 economía de guts escala 1000 · E6 pulido cine (cut-in Caldén, cortes, hooks de música, últimos 5') · FINAL: **fusión con el clásico detrás del flag `partido_phaser` (OFF por defecto, se enciende con `?partido_phaser=1`)** con prueba de saves ida-y-vuelta aprobada, QA de punta a punta (93', 0 errores) y suite 2.203 asserts. **👉 LEER `HANDOFF_FINAL.md`: estado, flags, checklist de aceptación en el celu y DECISIONES QUE ESPERAN A RODRI.**

### ✅ ETAPA 1 — Cámara y mundo lógico (el cambio madre)
`phaser/scenes/match.js` REESCRITO según el doc §2/§10 (la escena anterior — Hito 2 + Tanda ABC con menús, cine y LA DEFINICIÓN — queda en git, commit `53f0d80`, para reintegrar sus piezas en las Etapas 3-6):
- **Mundo lógico 2400×1200** que nunca se ve entero (la ventana visible es ~436×245: un 18%×20% del mundo).
- **Cámara cinematográfica literal del doc**: `setBounds(0,0,2400,1200)` + `startFollow(portador, true, 0.12, 0.12)` + `setDeadzone(220,140)` + `setZoom(2.2)` + `roundPixels` (en la cámara, sin tocar el config). Corte de plano listo: si la pelota cambia de dueño, pan de 300ms al nuevo portador y follow.
- **SOLO el portador materializado** como sprite grande (su avatar del editor, ×2, filtro NEAREST = pixel nítido): ocupa el **41% del alto visible** (⅓–½ ✓). Los otros 21 son **entidades lógicas** en `logic/partido.js`, que NO se tocó: la simulación sigue en su espacio 1050×680 con todo el tuning del Bloque A intacto, y la escena escala coordenadas (SX/SY).
- **Control**: tocás/arrastrás la cancha y el portador corre hacia ahí (pantalla→mundo→simulación vía `getWorldPoint`); en escritorio, flechas o WASD. Sin mouse obligatorio.
- **Sandbox explícito de la etapa** (comentado en el código): encuentros apagados (`cooldown` clavado — los menús con pausa son la **Etapa 3**) y aguante clavado al máximo (la economía es la **Etapa 5**). Reloj y entretiempo corren en esqueleto.
- Saves retrocompatibles: `armarPlanteles` idéntico (pampa_star_v1 + avatares + roster); el editor de pinta sigue siendo la escena inicial y `¡A LA CANCHA!` entra a la nueva escena.
- Verificado headless: bounds/zoom/deadzone/lerp/follow exactos, 2 sprites en escena (portador + pelota), 22 entidades lógicas, fracción de alto 0.41, movimiento táctil y teclado con la cámara siguiendo, cero errores de consola. Tests: 2010+9+30+15+137 verdes (lógica intacta).
- **Qué NO hay todavía (a propósito)**: radar (E2), HUD (E2), menús/pausa/retratos (E3), animaciones y falsa perspectiva (E4), guts/duelos (E5), cut-ins (E6).

## 🔄 TANDA ABC (jul 2026) — ritmo + tiro con ejecución + avatar lindo
El playtest del Hito 2 pidió tres frentes. Se commitea POR BLOQUE; al cerrar C, frena para playtest.

### ✅ BLOQUE A — RITMO MODULADO (commit `0399603`)
El partido estaba "rapidísimo, amontonado, sin aire y ni se llegaba a patear". Ahora:
- **TODO el ritmo vive junto en `balance.json → ritmo`** con nombres claros (velocidades, radio y cooldown del encuentro, perseguidores, reloj, saltos, descuento, zoom). Arrancás BIEN PAUSADO y se afina tocando UN bloque.
- **Aire para jugar**: portador 84 vs defensor que cierra 104 (te alcanzan, pero con margen), UN solo perseguidor, cooldown de encuentro 3.2s, y al perder/recibir la pelota el rival **la pisa 1.5s** antes de arrancar (tiempo de reaccionar y elegir marcador). `dist_tiro` 380: **se llega a patear**.
- **El freno con zoom SOLO en lo clave**: en el encuentro la cámara se acerca SUAVE al cruce (1.22×) con el rival marcado ▽, y el menú es una **tira compacta abajo** — la cancha queda visible: el momento de decisión es de LECTURA. Cámara doble (la UI nunca se escala). Al resolver, vuelve igual de suave.
- Verificado headless: 3.2s de aire hasta el primer encuentro, zoom con HUD quieto, menú con cancha visible, retorno suave. Tests migrados a `ritmo.*`.

### ✅ BLOQUE B — TIRO HÍBRIDO CON EJECUCIÓN (este commit)
La construcción sigue siendo Tsubasa (decisión/lectura), pero **el remate ahora lo ejecutás VOS** (sabor New Star Soccer): al elegir TIRO o CALDÉN se abre **LA DEFINICIÓN** en modo cine — el arco grande de frente, y tu gesto define **puntería + potencia + comba** antes de que arranquen los planos (pie → viaje → esfuerzo → arquero → desenlace).
- **Tres formas, mismo momento** (se detecta el dispositivo y cambian las instrucciones):
  · **Celular (dedo)**: arrastrás — al costado apuntás, hacia arriba cargás potencia, y si el gesto va en banana le das comba. Soltás = remate. Un tap corto NO dispara.
  · **Mouse**: el mismo arrastre.
  · **Teclado**: ←→↑↓ mueven la mira, ESPACIO mantenido carga la barra de potencia (sube y baja: soltá en el momento), y otro ESPACIO clava la comba con timing.
- **La destreza pesa, los stats también**: `logic/tiro.js` (PURO, portable a Godot, `test/tiro.test.js` 15 asserts) convierte tu ejecución en la zona del remate — esquina rinde más pero arriesga, potencia con **punto dulce** (floja la ataja fácil / pasada se puede ir), comba controlada suma. El stat de tiro da **margen de error** (crack = pulso firme, pibe = tiembla). Todo afinable en `balance.json → tiro_ejecucion` (peso_destreza, sensibilidades, punto dulce, ruido).
- **El arquero sigue intacto**: la ejecución PREPARA la zona; `duel.resolveShot` decide UNA vez (invariante testeado con la zona dinámica). Devolución honesta del gesto ("¡EJECUCIÓN PERFECTA!" / "¡AL LÍMITE DEL PALO!") sin adelantar el resultado.
- **UI legible sin color solo**: la franja justa de potencia se NOMBRA ("¡JUSTA!"/"¡PASADA!"), la comba tiene aguja + flechas ↶↷, la mira se marca al pasarse del palo.
- Verificado headless: gesto completo (aim/pot/comba en vivo), teclado por fases, VOLVER cancela gratis, desde encuentro no hay VOLVER, Caldén con su título y costo 30, cadena de planos entera y vuelta al juego. Tests: 2010+9+30+15 verdes.

### ✅ BLOQUE C — GENERADOR DE PERSONAJE LINDO (este commit)
Chau personajes toscos: ahora el juego **arranca en el EDITOR DE PINTA** y tu avatar se arma por **CAPAS combinables**, todo dibujado por código (original, nada de terceros):
- **Las capas** (`logic/avatar.js`, PURO y testeado — 137 asserts): 4 tonos de piel, 6 **cortes de pelo con FORMA propia** (rapado/corto/flequillo/rulos/colita/melena), 5 colores de pelo, 3 ojos, 3 cejas, 3 bocas, accesorios (**vincha y muñequeras**) y 3 estilos de camiseta. **Regla daltonismo cumplida**: cada variante tiene NOMBRE en el editor (steppers ◀ Rulos ▶), los cortes/ojos/bocas se distinguen por forma y todo color vive con HEX etiquetado.
- **El editor** (`scenes/editor.js`): pestañas **VOS + tus 4 AMIGOS** del save clásico, vista previa en vivo (cara grande + jugador de cancha), GUARDAR y ¡A LA CANCHA!. **Guardado retrocompatible**: agrega `career.avatares` a `pampa_star_v1` sin tocar nada de lo viejo (verificado: el `look` clásico queda intacto); sin save clásico, guarda aparte.
- **Migración automática** del avatar viejo (`career.look` piel/pelo/camiseta → capas nuevas; el "largo colorado (vincha)" clásico conserva su vincha; las franjas clásicas van a "banda" porque **las franjas son la identidad del RIVAL** y no se tocan).
- **En la cancha**: los 20 jugadores de campo se hornean CON SU LOOK (`scenes/avatar_arte.js`) — VOS y amigos con lo que elegiste, los NPC del roster con **combos procedurales deterministas** por nombre. Los arqueros conservan sus GUANTES y el rival sus FRANJAS (identidades por forma).
- **LA CARA EN EL ZOOM** (el pedido clave): el primer plano del esfuerzo en el remate y el cine de la gambeta muestran **tu cara personalizada** (pelo, cejas, ojos, boca, vincha) — el generador y el zoom van juntos.
- Verificado headless: editor→cancha (transición ok), migración de save real simulado, usuario sin save, revancha (re-horneado idempotente), cara custom en el plano esfuerzo, cero errores de consola. Tests: 2010+9+30+15+137 verdes.

## ✅ HITO 2 — EL PARTIDO COMPLETO JUGABLE (jul 2026)
El Hito 1 (el turno juego↔cine) quedó **aprobado por playtest**. Sobre esa base se construyó el partido entero. **Frena para playtest de Rodri.**

**QUÉ QUEDÓ JUGABLE (`phaser/`, commits Hito2-A + Hito2-B/C/D + cierre):**
- **Las dos capas en el partido entero**: MODO JUEGO con cancha 3/4 (arco rival al fondo, proyección real del mundo 1050×680 con inversa analítica para el arrastre), los **22 jugadores** por formación 1-4-3-3 (activos cerca de la pelota, posicionales de fondo), **RADAR** para leer la jugada (míos ● / rivales ▲ / anillo en el controlado / pelota ◎ — forma, no solo color; el rival juega **a franjas**), y el MODO CINE en los momentos clave.
- **Movimiento con propósito calibrado** (`balance.velocidad`): el portador va MÁS LENTO que el defensor que cierra (te alcanzan), perseguir drena aguante y no es infinito (rendido = trote).
- **EL ENCUENTRO**: el rival entra en el radio → congela → **menú por rol** con % aproximado y costo: ataque (gambeta / pase ▸ / pared / tiro), defensa (quite / corte / bloqueo), arquero (atajar / despejar). **Duelos con la matriz de ventajas** (quite>gambeta, corte>pase, bloqueo>tiro) e intención rival **oculta**: adivinar es el juego mental. El TIRO desde el encuentro primero tiene que zafar del bloqueo.
- **PASE Y TIRO CON APUNTADO**: receptores elegidos con %, distancia y dirección (el control **viaja** con el pase); remate a la **zona del arco que elijas** (6 zonas con riesgo de afuera). **Cambio de jugador libre en defensa**: botón CAMBIO + tap en el radar; marca clara ▼ VOS/nombre siempre.
- **RELOJ Y ESTRUCTURA**: tiempo real en juego + saltos por acción + **descuento oculto** (constantes afinables), **entretiempo** que recupera aguante (saca el rival), **final** con resultado y revancha. Verificado de punta a punta con soak (93', 4 fases, 0 errores, 0 atascos).
- **DISPARO DEL CALDÉN**: habilitado **por condición** (sos VOS + pasaste la línea + aguante suficiente): botón propio 🔥, costo 30, y su cine dramático teñido ("el Caldén toma fuerza" → **¡CALDENAZO!**).
- **AMIGOS DE LA CAPA 3**: si existe el save clásico (`pampa_star_v1`, mismo origen), tus amigos entran al plantel con su nombre/stats/vínculo (tolerante a fallo); el resto se completa con el **roster pampeano** (`data/roster_pampeano.json`) y el rival se llama por su pueblo.
- **Arquitectura Godot**: `logic/partido.js` = la SIMULACIÓN PURA testeada en node (`test/partido.test.js`, 30 asserts: creación, reloj+descuento, calibración, aguante/rendido, matriz direccional, pases, Caldén, remate rival, cambio); el remate delega en `duel.resolveShot` (**el bug del arquero sigue cerrado**); la escena solo dibuja y pregunta. DATA en `balance.json` (bloques `partido` + `aguante` reescalado a máx 100).

**Revisión de calidad:** la revisión multi-agente cayó por el límite de sesión (los 3 lentes fallaron al arrancar), así que hice la **auto-revisión** sobre los mismos focos: fallback embebido verificado **campo por campo contra todo lo que lee el código (74 campos, completo — `file://` no crashea)**; sin menús sin salida (rendido siempre deja PASE libre; defensa deja CORTE); botones PASE/CAMBIO nunca coexisten; `scene.restart` mata sus timers; textos en voseo y género neutro. **3 arreglos aplicados:** el salto de reloj del remate se movió de la escena a la lógica (`prepararRemate`, arquitectura), la dividida que gana el rival ahora auto-cambia tu marcador al más cercano, y la pelota de esa dividida arranca en el medio. Tests: 30+2010+9 asserts verdes. *La revisión adversarial completa puede correrse cuando el límite resetee, si hace falta.*

**QUÉ FALTA (hitos siguientes):** animaciones completas de todas las acciones + pases/gambetas con más cine (H3), la carrera (temporada/vida/avatar portados, H4), presentación + voces del relato + música (H5), escalera + Mundial (H6). Pendientes menores anotados: pared con compañero específico elegible, perfiles de IA por rival, pase al espacio del clásico, el pase desde el encuentro no pasa por la matriz (igual que el clásico v4: su riesgo vive en el % del receptor).

## ✅ MIGRACIÓN A PHASER — HITO 1 REHECHO: EL TURNO juego↔cine (jul 2026)
Rodri rechazó la primera versión del Hito 1 (quedó como "penales de vista lateral y plana"). El corazón es **EL TURNO entre dos modos de presentación** que se turnan, y el Hito 1 lo demuestra con el remate. **El HTML clásico NO se toca**; Phaser vive al lado en `phaser/`. Frena para playtest: *si el corte al cine con la pelota viajando al arco emociona, seguimos.*

**Qué hay (`phaser/`, commits A-B-C):**
- **MODO JUEGO** (`scenes/match.js`): cancha en **3/4 con el arco al fondo** (perspectiva). Arrastrás para llevar al jugador hacia el arco; la pelota y el nombre lo siguen y se achican al alejarse (profundidad). Al entrar en rango aparece **¡REMATÁ!** y tocás el arco para apuntar (la X elige palo, la Y elige alto/bajo).
- **EL CORTE**: al rematar, flash + shake y corta al cine.
- **MODO CINE** — **secuencia de PLANOS que cortan como película** (negro seco entre planos): **EL PIE** (primer plano del botín) → **EL VIAJE** (la pieza central: la pelota se aleja **HACIA ADENTRO** hacia el arco al fondo, con **perspectiva real, estela y líneas de velocidad radiales**; slow-mo + zoom en el momento clave) → **EL ESFUERZO** (jugador grande con gesto) → **EL ARQUERO** (grande, dramático) → **EL DESENLACE** (gol con red/flash/shake/fanfarria, atajada con rebote, o afuera). El sprite se agranda en el drama (media pantalla). Al terminar **vuelve al modo juego** con fundido. Repetible.
- **El bug del arquero, CERRADO con test** (`logic/duel.js`): `resolveShot()` decide una vez con invariante **keeperWins ⇔ outcome≠'gol'**; la anim es esclava. 2010 asserts verde.
- **Arquitectura para Godot**: la **profundidad** la calcula `logic/perspectiva.js` (PURA, testeada, 9 asserts). La secuencia de planos avanza por **RELOJ** (no por tween) y el **viaje de la pelota se anima por TIEMPO en `update()`** → robusto y verificable. DATA en `data/balance.json` (bloques `juego`, `cine`, `duelo`, `epica`), LÓGICA pura, separadas del RENDER. Phaser 3.80.1 MIT vendorizado.

**Revisión adversarial (3 lentes, 13 agentes):** 10 hallazgos confirmados, todos aplicados —
1. **[el más grave] la cámara quedaba con zoom 1.25 + pan del viaje colgados en el clímax** (el "¡GOOOL!"/atajada salía ampliado y corrido ~100px en CADA tiro) → reseteo la cámara al terminar el viaje (verificado: zoom 1.00 en esfuerzo/arquero/desenlace). 2. El toggle ARQUERO flotaba sobre el cine → ahora vive en gameLayer (se oculta con la cancha) + guard en el handler. 3. El alto/bajo del tiro salía al azar → ahora lo elige la Y del toque. 4. El fundido de retorno cine→juego se perdía → va por `camera.fade` (cubre ambas capas) con fallback. 5. Línea muerta + rayas de la cancha desalineadas → limpiadas. 6. Constantes de tuning hardcodeadas (zoom, drift, escalas, tiempos del desenlace, corte) → todas a `balance.json.cine`.

**⚠ DECISIÓN PENDIENTE PARA RODRI — el nombre "GUTS":** la revisión anterior marcó que "Guts" es el nombre del medidor de energía de Tecmo/Captain Tsubasa (regla dura). En el Phaser nuevo ya lo renombré a **"aguante"**. El **motor HTML clásico** y varios docs siguen con "guts". No hice el rename masivo sin tu OK. Opciones: (a) rename project-wide, (b) solo el Phaser en limpio, (c) "guts" te sirve igual. **Decime.**

**Verificado (paso a paso, con el loop de Phaser manejado a mano porque el RAF se pausa en la pestaña headless):** turno completo `juego→pie→viaje→esfuerzo→arquero→desenlace→juego`; la pelota se aleja de verdad (y 436→129, escala 3.6→1.38, curvándose al palo); gol y atajada; repetible; el jugador se mueve; mobile apaisado; HTML clásico intacto; sin errores.
**Siguiente (con tu playtest):** HITO 2 partido jugable → 3 animaciones → 4 carrera → 5 presentación+audio → 6 escalera+Mundial.

## ✅ INGESTA DE ASSETS (jul 2026) — inventario curado + data separada + ilustraciones
Rodri dejó el material que juntó (imágenes IA, sonidos, roster, diálogos, docs). Inventariado e ingerido por partes, con la regla de arquitectura: **el contenido va a estructuras limpias fuera del `index.html`, portable a Godot.**

**QUÉ SE INTEGRÓ (usable ya):**
- **Ilustraciones de pantalla** → `assets/ui/` (6 WebP, **362KB total desde ~8MB**, optimizadas con sharp/libvips para celu): portada + logo (con alpha) en el TÍTULO, y fondos ilustrados en LORE y SEMANA vía clase `.hasbg` con overlay para legibilidad. **El pixel-art del PARTIDO no se toca** (sigue en su canvas). Fallback: si una imagen no carga, queda el gradiente y el título en texto.
- **Roster** → `data/roster_pampeano.json`: 50 identidades pampeanas ficticias, 10 pueblos, posición mapeada al motor (MED→VOL, DEL→ATA), `stats_auto` deterministas afinables. **Sin personas reales ni menores.** Todavía NO cableado: es la base para planteles/rotación.
- **Diálogos/lore** → `data/relatos.json`: narrador de inicio + 3 relatores ficticios (Pichi el Bagual, El Profe, Delfina Roldán) + escenas de sabor. Referenciados desde `DISENO_PRESENTACION.md` (los usa el "elegí tu relato" de Prompt 2).

**QUÉ SE DEJÓ PARA DESPUÉS (usable más adelante, queda en `assets_drive/` local):** 7 fondos variantes extra, 10 personajes TANDA2 (retratos DT/rival/jugadores para la presentación), 6 avatares + 6 escudos transparentes (editor de avatar), pixel-art NES de referencia, ficha de cartucho.

**QUÉ SE DESCARTÓ:** ⛔ **material de Tecmo/Captain Tsubasa** (parche de ROM `.ips` + ROM `.nes` del paquete original) — marcado como PROHIBIDO, **jamás entra al juego**; documentos de la Subsecretaría (censo, encuestas) ajenos al juego; re-empaquetados redundantes; docs `.md` duplicados.

**SONIDOS — PROPUESTA (no se pisó el chiptune actual):** 12 WAVs sampleados (44.1kHz mono). Propuestos en `ASSETS_INVENTARIO.md` como opción A/B; recomendación: sumar solo lo que hoy NO existe (blips de diálogo, música de "chill/pueblo", quizá "carga" del especial) dejando el chiptune del partido intacto. Los loops de música son cortos (2.4–4s). **Espera OK de Rodri antes de cablear.**

**Arquitectura:** `assets_drive/` (186MB crudos + material de terceros) va al `.gitignore` — fuente LOCAL, no se publica en Pages; solo lo optimizado (`assets/`, `data/`) se commitea. Ver `ASSETS_INVENTARIO.md` y `data/README.md`.

## ✅ PARTIDO v4.2 (jul 2026) — COMPLETO de punta a punta (prompt "completalo a jugable")
Los 8 puntos del prompt de Rodri, commiteados por parte (A–E + cierre):
- **(A) Balance a mano:** bloque único AFINADO RÁPIDO arriba del script con TODO (velocidades, PRESION_RADIO, RADIO_ENCUENTRO_DEF, DIST_MENU_ARQUERO, PASE_RADIO, PASE_TOPE_VIAJE, AEREO_UMBRAL, GUTS_RENDIDO, SEGUNDOS_POR_MINUTO, CORNER_PROB). **Control clarísimo:** NOMBRE del controlado sobre su cabeza (texto con borde + flecha ▼, también en defensa — RV2 arregló que quedara sobre el sprite equivocado). **Doc §6:** el ARQ solo recupera Guts al entretiempo si le convirtieron.
- **(B) Arquero rival REACTIVO:** vuela hacia la zona del tiro en la escena (llega si ataja / mitad de camino si es gol / mira si va afuera) + cuadro de atajada (750ms) antes de la contra.
- **(C) Radar AMPLIABLE (doc §1.2/§4):** lupa junto al radar (o tecla R) → pantalla completa pausada, mismo tap (apuntar/marcar), espejo pixelado del radar chico. **PASE AL ESPACIO:** tocar un punto libre → el más cercano PICA (carrera visible), % por velocidad vs el rival del punto.
- **(D) PELOTA AÉREA (doc §4):** pases >300 y centros van POR ARRIBA (globo + sombra, sin corte a media altura) → DUELO AÉREO al caer (aereo+físico+vínculo vs defensa) → si cae llegando al área, MENÚ AÉREO: BAJARLA / VOLEA (escena completa) / DEJARLA PASAR (finta, arquero vendido → +10% al remate). Botón **CENTRO AL ÁREA** desde la banda en campo rival.
- **(E) CÓRNER con reposicionamiento (doc §5):** ~35% de las atajadas van al córner → elegís dónde parar a tu mejor cabeceador (PRIMER PALO/PUNTO PENAL/SEGUNDO PALO con su %), acompañantes y defensa se reposicionan (marcadores incluidos — RV3), centro aéreo SIEMPRE disputado, y el arquero puede SALIR A CORTAR (§7): si igual la ganás quedó EN EL AIRE (arco vacío, bonus).
- **Soak de partido completo:** dos tiempos + entretiempo + final sin trabas (clicks al azar en todos los menús + acciones aleatorias de pase/tiro/radar). Sin errores de consola.
### Revisión adversarial v4.2 (4 lentes; verificación manual — el workflow agotó el cupo de sesión): 9 arreglos
1. **[ALTA] Soft-lock del radar ampliado**: tap a un punto sin jugada dejaba el juego pausado en "aim" sin salida en celu → cerrar SIEMPRE reanuda.
2. **[ALTA] Flecha/nombre sobre el sprite equivocado en defensa** (era de arrastre del v4): ahora siguen al controlado real.
3. **[ALTA] Córner fantasma**: `rivalPuntos()` pisaba a los rivales reposicionados con los marcadores viejos → los marcadores también van a los palos y el córner SIEMPRE se disputa.
4. La VOLEA no cobraba el bonus del arquero vendido → agregada a la lista de bonusJugada (y BAJARLA).
5. El menú aéreo ignoraba SIN NAFTA → volea bloqueada con Guts <25.
6. DEJARLA PASAR dominaba siempre (~75%) → carácter centrado (58±).
7. La gambeta al arquero perdida podía "irse al córner" sin tiro → excluida + banner propio.
8. El cuadro del duelo aéreo no mostraba al arquero cuando salía → ahora se lo ve (amarillo, guantes).
9. Nombre del controlado se salía del canvas en la banda de arriba → clampeado.
**Pendiente conocido (fuera de alcance v4.2, doc §6/§11):** alargue/penales (recién con eliminatorias del Mundial), perfiles de IA por jugador, tácticas seleccionables, identidad/presentación (PROMPT 2).

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
