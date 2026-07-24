# HANDOFF V8 — "El pulso y el jugadón" (tanda del 18-19/jul/2026)

## 🔍 INFORME DE AUDITORÍA ADVERSARIAL (19/jul, sobre 2fdb22b)

**Nota de método**: el workflow multi-agente se lanzó DOS veces y murió las
dos por límites de la sesión (la segunda por **límite de gasto MENSUAL** —
lo gestionás vos con /usage-credits si querés la pasada con subagentes).
La auditoría se ejecutó INLINE con los mismos 6 lentes; los de lógica
corrieron de verdad en node.

### Qué se probó
- **ROMPER**: 12 clases de basura contra validarLook/migrar/lookParaBloques,
  planteles rotos, doble resolución de gambeta/quite/tiro, fichas con tipos
  inventados y null, temporada con 4 equipos y división inventada, delta de
  30s (foco perdido) contra el guard del pulso.
- **SOAK**: la ESCALERA ENTERA B→Mundial→GLORIA en 5 temporadas (90 fechas,
  tablas siempre consistentes) + 9 partidos completos a puro latido (3 por
  preset de tempo, 128-442 latidos c/u): todos terminan, goles 0-5, reloj
  nunca clavado, nadie fuera de cancha, sin NaN.
- **FÍSICA**: 2000 semillas por caso borde — fuerza 200 vs manos 1: 2000/2000
  goles; tiro mínimo vs arquero máximo: 1992/2000 atajadas y 0 rebotes
  imposibles; matriz con vencedor y vencido por cada cierre; distribución de
  cierres sana; pulso sin deriva en 9000 latidos.
- **A11Y + §11 + MOBILE**: barridos de código, pesos (primer load 4,9MB),
  precache vs scripts, guards de caché de tinte (todos presentes).

### Hallazgos confirmados y ARREGLADOS
1. **§11 (media)**: dos "GUTS" VISIBLES en la UI del clásico que el F6 no
   cazó (banner del subidón + costo de especiales) → AGUANTE (`9ee169d`).
2. **PWA (media)**: `jugadon_ui.js` no estaba en el precache — offline el
   jugadón desaparecía → agregado + VERSION v8-3 (`22b32cb`).
3. **A11Y (media)**: el jugadón era tap-only → botones numerados con teclas
   1-9 + arco con 6 zonas numeradas (teclas 1-6) + sello anti-doble-tiro
   (`5d8927a`). Verificado en vivo por teclado.

### Refutados / falsos positivos
- "Rionegrino Central / Puerto Central parecen clubes reales": no —
  "Central" es genérico; no existen clubes profesionales con esos nombres.

### Queda anotado (baja, pulido posterior)
- `fondo_tribuna.png` 396KB: comprimible (~40% menos con paleta reducida).
- Primer load 4,9MB total (1,15MB es el motor): razonable para PWA (baja
  una vez y queda cacheado), pero si molesta en gama baja, el precache
  puede pasar a lazy para las poses.

### Reintegración (tu pedido, mismo cierre — `5d8927a`)
- Megacosas y hinchada: **verificadas cableadas** (cutInEspecial en 5
  puntos; tribuna en goles y Definición).
- **Escenas con el arte por bando**: el rival protagonista con su pose
  NARANJA; VOS con tu pinta en la corrida — alcanza a megacorrida,
  combinada y gambetas.
- **El gol del jugadón con pulido cinematográfico**: festejo ilustrado
  entrando + explosión + la hinchada saltando + relator.

## ⬆ FIXES POST-AUDITORÍA + PLAYTEST (19/jul) — los 3, verificados EN VIVO

**Tu pregunta ("¿qué encontré invertido?"): NADA estaba espejado.** Eran dos
calibraciones y un cableado estrecho:

1. **El jugadón casi no se podía invocar** (`4155f5a`): los botones dorados
   pedían el momento exacto. Ahora las fichas se OFRECEN SIEMPRE que queden:
   ⚡ACCIÓN con la pelota te muestra 🌟 GAMBETA siempre (haya o no rival
   pegado) y 🌟 SÚPER TIRO desde campo rival — pueden verse los dos.
   Verificado en vivo: ACCIÓN → botón dorado → la plataforma abre.
2. **El pulso disparejo** (`e9818f1`): el multiplicador de saltos solo pegaba
   en los portadores — tu latido era 3× el del resto (30px vs 11px). Ahora:
   `saltos_vel_mult` 1.0 (tu tramo ~17px ≈ todos), `latido_ms` 440 (más
   pausado), y `rival_con_pelota` 64 para que la regla "al rival no se lo
   caza corriendo" siga valiendo. **LA PERILLA está en `balance.pulso`**
   (la _nota explica los 3 diales: latido_ms, dt_ms, saltos_vel_mult).
3. **Los delanteros para atrás** (`defb31f`): el destino del ATA se recalcula
   cada latido sin memoria y podía quedar DETRÁS de su posición (jugada
   adelantada + referencia que baja). Piso anti-retroceso: **en ataque el
   delantero solo sube o se queda**; al defender baja normal. Verificado en
   vivo (pelota de 860 a 420, los ATA clavados) + 4 asserts nuevos.


`docs/REDISENO_V8_PULSO_Y_JUGADON.md` ejecutado **en el orden estricto del
§7, completo** (los 5 bloques). Corrección de ARQUITECTURA: el tiempo real
murió — el partido ahora es por comandos y PULSO. Suite: **13 archivos de
test verdes** (nuevos: pulso 8, ia 18, jugadón 26).

## Los 5 bloques (un commit cada uno)

| # | Bloque | Commit |
|---|---|---|
| 1 | **EL PULSO** — latidos discretos (tuc-tuc), flag `pulso` ON | `8a3d9f1` |
| 2 | **LA IA DE LOS 21** — puesto + situación, perfiles modulan la línea | `3adbc5b` |
| 3 | **CÁMARA** — número en la etiqueta, flip real con memoria, zancada | `deb1497` |
| 4 | **EL JUGADÓN** — 6 fichas, plataforma, FÍSICA real del arquero | `7165130` |
| 5 | **TIPOGRAFÍA** — acentos verificados EN PANTALLA + Pixelify Sans | `7dfce81` |

## §1 · EL PULSO
- El partido avanza por **latidos** (`balance.pulso.latido_ms` 380): cada
  latido corre UN tramo de simulación (`dt_ms` 300 ≈ 30px del portador) y
  **entre latidos el mundo está QUIETO** — verificado: 88 de 92 frames sin
  movimiento, saltos exactos de 29,7px. Nadie corre fluido como en un FIFA.
- La sim pura no cambió (todo el tuning y los tests valen): el pulso es CÓMO
  se la invoca. `flags.pulso=false` = el tiempo real viejo, SOLO para comparar.
- El reloj gotea por latido; los MOMENTOS (cruces, tempo elegible) siguen igual.

## §2 · LA IA DE LOS 21
- **DEF** marcan la zona y quedan SIEMPRE entre la pelota y su arco (en
  ataque apoyan hasta media cancha). **VOL** circulan siguiendo el juego.
  **ATA** se descuelgan a recibir y se ABREN a las bandas; en defensa
  presionan poco. Nadie es una hormiga: cada uno hace lo de su puesto.
- Avanzando **siempre hay un rival cerrándote** (se acabó el "avanzo y no
  pasa nada").
- El perfil del club rival mueve su LÍNEA entera: garra +30 (presiona),
  pelotazo −40 (se mete atrás), estrella +15 — `master.js → PERFILES.linea`.
- La CPU **no espeja**: pesos + stats + azar acotado, sin canal para copiar
  (testeado). Diales en `balance.ia`; `ia.v8=false` = elasticidad vieja.
- **[PENDIENTE]** córner/tiro libre/saque como situaciones con reacomodo
  propio: la sim no tiene esas jugadas como eventos todavía — anotado.

## §3 · CÁMARA Y PRESENTACIÓN (sobre el pulso)
- El foco a QUIEN TIENE LA PELOTA ya estaba del playtest 2 (el panel muestra
  al portador revelado con cara y nombre). Nuevo: **NÚMERO** en la etiqueta
  ("▼ 10 · VOS" / "▲ 5 · DYLAN") — forma + número + nombre.
- El flip sigue la **dirección real** del movimiento y tiene MEMORIA entre
  latidos: nunca más corre de espaldas.
- **La zancada al latido**: la pose alterna ±3,5° con el tuc-tuc (animación
  limitada de dos cuadros, como consola vieja).
- **[PENDIENTE]** el doble cuadro al perder la pelota ("se puede mostrar",
  opcional en el doc) — pulido posterior.

## §4 · EL JUGADÓN (el corazón nuevo)
- **Las 6 fichas**: 2 SÚPER QUITES · 2 GAMBETAS · 2 SÚPER TIROS por partido,
  visibles en el HUD (letra + número). Los botones DORADOS aparecen arriba
  de los menús de ataque/defensa cuando te quedan.
- **La plataforma**: cancha MÁS ANCHA QUE LARGA; los rivales VIENEN; ves
  cuántos son (uno o dos); la intención del rival se INSINÚA en un globo de
  texto ("▼ RAMIRO: TE CIERRA LA IZQUIERDA") elegida por SUS stats + azar
  acotado ANTES de tu elección — la CPU no copia (testeado).
- **La carta**: un jugador random solo tiene IZQUIERDA/DERECHA; con gambeta
  suma ENGANCHE (55), CAÑO (70) y SOMBRERITO (82). La matriz premia leer:
  te cierran la izquierda → vas a la derecha; se tira al piso → sombrerito.
- **El SÚPER TIRO es FÍSICA, no dados**: tocás la ZONA del arco; el arquero
  ELIGE dónde volar leyendo con error según sus reflejos (nunca adivina
  exacto — testeado); la GEOMETRÍA decide si llega (tiempo de vuelo vs
  alcance: si no llega, es gol); si llega pelean FUERZA (tu tiro + energía)
  vs MANOS — el tiro brutal se las REVIENTA (rebote vivo: segunda chance).
  La precisión importa: al ángulo sin técnica se va afuera.
- Verificado en vivo: gambeta leída y ganada (+150px de ventaja), súper tiro
  al ángulo = GOL, súper quite perdido por leer mal (la matriz castiga).
- Todo en `logic/jugadon.js` (puro, PRNG con semilla, 26 asserts).

## §5 · TIPOGRAFÍA (verificación de acentos EN PANTALLA, obligatoria)
- **á é í ó ú ñ ¿ ¡ verificados por bitmap** (glifo con acento vs glifo
  pelado) en canvas Y adentro de un Text de Phaser: las tres fuentes los
  dibujan bien.
- **El bug real de los "acentos rotos" era de CARGA**: con red lenta el tope
  de 2,5s vencía y Phaser rasterizaba los textos con el fallback para
  siempre. Fix doble: espera hasta 8s + si las fuentes llegan tarde,
  `document.fonts.ready` RE-RASTERIZA todos los textos vivos.
- **El carácter que pediste**: el TEXTO pasó de VT323 (terminal) a
  **Pixelify Sans** (pixel redondeada con peso, OFL, latino completo,
  self-hosteada, licencia en `assets/fonts/README.md`). DISPLAY sigue
  Press Start 2P. VT323 queda de reserva: una línea en
  `balance.json → tipografia` y volvés.

## Checklist celu (V8)
1. Partido → el juego LATE: tu jugador avanza a tramos (tuc-tuc), nadie
   flota continuo. Si lo querés más ágil: `pulso.latido_ms` más bajo.
2. Avanzá con la pelota → siempre te sale uno al cruce; mirá el mapa: los
   DEF rivales se quedan atrás tuyo cuidando su arco, los ATA se abren.
3. En un cruce de ataque → botón dorado 🌟 GAMBETA DEL JUGADÓN → leé el
   globo del rival y elegí la movida contraria. Pasalo y quedás lanzado.
4. En zona de tiro → 🌟 SÚPER TIRO → tocá el ÁNGULO del arco. Mirá cómo el
   arquero vuela a donde ÉL leyó (no a la pelota). Probá un tiro flojo al
   medio: te lo come.
5. Defendiendo → 🌟 SÚPER QUITE → él insinúa su movida: cerrale ESO.
6. Las letras: títulos pixel chunky, cuerpo redondeado con peso, y
   "á é í ó ú ñ ¿ ¡" perfectos en el relator y los menús.
7. Las fichas se ven abajo a la izquierda y se agotan (2+2+2).

## Decisiones que te esperan
- **[DECISIÓN MÍA] cadencia del pulso**: 380ms de latido / 300ms de tramo.
  Todo en `balance.pulso`.
- **[DECISIÓN MÍA] la ventaja de la gambeta ganada**: +150px lanzado. ¿O
  preferís que abra directo el súper tiro si te queda ficha?
- **[DECISIÓN MÍA] rebote del súper tiro**: queda VIVO para vos pegado al
  área (segunda chance). Alternativa: pelota dividida.
- **[PENDIENTE del doc]** retratos con puntos en el pelo y pieles que no
  calzan (§5), doble cuadro (§4), situaciones córner/tiro libre (§2),
  sonido (§6) — pulido posterior, como marca el §7.
