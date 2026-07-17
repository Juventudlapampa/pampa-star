# HANDOFF V6 — "El anime jugando" (tanda del 16-17/jul/2026)

## ⬆⬆ EDITOR v2 (17/jul): caras ilustradas + tintes — COMPLETO (`8db6246`)
Los 8 bustos de `pampa_star_caras.zip` → `assets/poses/caras/` (PNG8 ≤560px) +
`data/caras_manifest.json` con **nombres legibles** (Clásico · Rulos · Melena ·
Rapado · Colorado · Flequillo · Mohicano · Tranqui), los tonos base de cada PNG
sampleados una sola vez al manifest, y 3 tonos de camiseta con nombre (Celeste
titular / Celeste profundo / Blanco pampa).

- **El editor cambió**: stepper grande "◀ CARA: Rulos ▶" con el busto de 300px
  al lado, + 3 tintes (PIEL / COLOR DE PELO / CAMISETA) que recolorean el busto
  en vivo (`tenirImagen` reemplaza tonos planos preservando luminancia).
  Ojos/cejas/boca desaparecieron del editor; el avatar de bloques quedó SOLO
  como fallback si el manifest/PNG no cargan.
- **Consistencia total**: la MISMA cara teñida aparece en los duelos, los
  cut-ins y el primer plano del esfuerzo (`_bustoIlustrado()` en match.js,
  enchufado a `retratoKey()` y `texturaCineJugador()`). El rival la lleva con
  camiseta NARANJA (sufijo `_r` en el cache).
- **Roster 50**: mapea determinista a las 8 caras (hash del nombre — mismo id,
  misma cara, siempre).
- **Saves retrocompatibles**: `look.cara` nuevo en `validarLook` — pinta vieja
  sin el campo → Clásico (0) + sus tintes de siempre. Verificado con el save real.
- Flag `v7_caras` (FLAGS de match.js). Accesibilidad: cara por NOMBRE en texto,
  fila activa con "►" además del resalte, tintes con nombre.
- **Checklist celu**: editor → la cara grande con su nombre; tocá ◀/▶ de CARA
  (ciclan las 8); cambiá PIEL/PELO/CAMISETA (el busto se tiñe al toque);
  guardá → jugá → en el primer duelo tu cara elegida aparece en el panel
  (la del rival, de naranja).

## ⬆ ADDENDUM (post-tanda, misma noche): OPENING + MÚSICA — COMPLETO
`docs/ADDENDUM_V6_OPENING_Y_MUSICA.md` (`f7561cf`). **Parte B (reemplazó al §6,
`3fb413a`)**: la música ahora tiene DIRECCIÓN — EL MOTIVO de 4 notas
(tónica→quinta→sexta→octava) en todos los temas transformado (insinuado en campo
propio Am/92 · completo al cruzar con modulación al mayor Do/112 · INVERTIDO con
bajo cromático y segunda menor cuando la tiene el rival/100 · tictac 138 en los
últimos 5' · principal en el opening/140), progresión heroica i–VI–III–VII, tres
capas siempre + **el viento pampeano** sutil de fondo, y los stingers de gol /
gol en contra construidos sobre el motivo. TODO en `balance.json → musica`.
**Parte A (`65a4bc5`)**: `scenes/intro.js` — el opening de 8 planos (~20s, cortes
secos, salteable con cualquier toque, una vez por sesión, botón "▶ VER INTRO" en
el editor, tiempos y textos en `balance.json → intro`, tolerante a assets
faltantes). **FIX del mudo (`c3273ba`) — LA COMPUERTA**: antes del opening,
pantalla negra con el logo y "👆 TOCÁ PARA EMPEZAR" pulsando; ese toque
desbloquea el audio del navegador Y dispara el opening CON sonido desde el
primer plano (los toques posteriores saltean). Knob `intro.compuerta`.
**Checklist celu**: recargá → la compuerta espera; tocá → el opening ENTERO
con música; tocá de nuevo → salteás al editor; "▶ VER INTRO" va directo a los
planos. Criterio A.5: ¿da ganas de jugar? Lo firmás vos.

`docs/DISENO_MAESTRO_V6.md` ejecutado **en el orden del §9, completo, sin saltear
ni reordenar**. Suite final: **2.322 asserts, 0 fallas** (8 suites; nuevas:
definicion 21, master 19). Soak de cierre: partido RELÁMPAGO entero al 94' con
TODO integrado (saltos+ceguera+definición+secuencias+master), **0 errores**.
Revisión adversarial inline por bloque (hallazgos y fixes en cada commit).
Nada quedó en working tree.

## ⬆ ARTE TANDA 2 (17/jul): las 7 poses nuevas + tribuna + arqueros sin marcas
Las 14 poses llegaron con **transparencia nativa** (reemplazan a las chroma-key
de la tanda 1) + `fondo_tribuna.png`. Optimizadas a ≤900px PNG8 (~2MB las 15).
**Qué pose quedó cableada a qué escena:**

| Pose | Escena |
|---|---|
| `gambeta_gana` | Gambeta GANADA (ataque win) · "te la hacen" (defensa lose, **espejada**) |
| `gambeta_pierde` | Gambeta PERDIDA (ataque lose, vos trastabillando) · "la defendés" (defensa win, **espejada**) |
| `pared` | La escena de la JUGADA COMBINADA ("¡PARED Y SE SUMA…!") |
| `bloqueo` | BLOQUEO defensivo ganado (escena nueva) · INTERPONERSE/Súper Defensa en el desenlace bloqueado de la Definición · "me bloquearon" ofensivo |
| `corriendo` | Los eslabones de la MEGACORRIDA (+ la pelota DEL JUEGO al pie: aviso de arte) |
| `arquero_vuela` → **_v2** | Estirada en vuelo (Definición F3, escenas de tiro) — mangas lisas, §11 ✔ |
| `arquero_ataja` → **_v2** | Atajada/desenlace (+ la pelota DEL JUEGO superpuesta: la ilustrada salió naranja) |
| `fondo_tribuna` | Capa lejana del OPENING plano 1 (parallax con el pueblo) + detrás del arco en la DEFINICIÓN (of y def) |

Las viejas `pose_arquero_*.png` quedan en el repo, fuera del manifest. Manifest
con bloque `fondos` nuevo, mismo fallback tolerante.

## Estado por bloque (§9)

| # | Bloque | Estado | Commit |
|---|---|---|---|
| 0 | GDD raíz + doc v6 + **las 7 poses** (chroma→alpha) + poses_manifest | ✅ | `ce9d4e5` |
| 1 | §1 F1-F6 fixes urgentes (radar, arquero, corredor, cambio, marcas, AGUANTE) | ✅ | `225887b` |
| 2 | §2 R1+R2+R4+R5 — saltos, separación, reloj por momentos, **LA CEGUERA** | ✅ | `5068833` |
| 3 | §4 — **LA DEFINICIÓN v2** ofensiva Y defensiva, 4 fases, con las poses | ✅ | `0b139de` |
| 4 | §3.1+§3.3 — animación limitada en el gestor (freeze, corte seco, sacudida) | ✅ | `4d9dd59` |
| 5 | §5 — balance del aguante contra el original (Caldén 450, dos y chau) | ✅ | `7800019` |
| 6 | §6 — chiptune con bajo/melodía/percusión + la crecida al cruzar | ✅ | `700d416` |
| 7 | §2 R3 — medidor de **ENVIÓN** (potenciar / súper defensa) | ✅ | `cf8eb1e` |
| 8 | §3.3 P4-5 — megacosas al gestor + **hinchada animada** | ✅ | `d5235d8` |
| 9 | §7 — relator | ✅ ya cumplido por Anime E, verificado contra v6 (sin commit) |
| 10 | §3.4 — **SECUENCIAS**: megacorrida + jugada combinada | ✅ | `3619b6d` |
| 11 | §8 — modo **MASTER**: divisiones fijas + perfiles de IA | ✅ | `3bbdbef` |

## Flags (todos apagables; OFF = comportamiento anterior)
- Nuevos v6: `v6_tempo` (menú de presets), `v6_definicion`, `v6_secuencias`, `v6_master` — ON.
- En **balance** (data, no código): `ritmo.modo_saltos` ON · `vista.ceguera_rival` ON +
  `vista.radio_revelacion` 0 (la perilla de rescate) · `tempo.minutos_por_momento` 2.5.
- Los viejos (e3…e6, v4_*) siguen. `partido_phaser` **APAGADO**, intacto.

## Checklist de aceptación en tu celu
**https://juventudlapampa.github.io/pampa-star/phaser/** apaisado → ¡A LA CANCHA!

- **Antes del saque**: el menú "⏱ ¿QUÉ PARTIDO JUGAMOS?" — RELÁMPAGO / ★INTERMEDIO /
  LARGO + VELOCIDAD Normal/Rápida (recuerda tu última elección; teclas 1/2/3).
- **La ceguera (el cambio grande)**: en la cancha NO VES a los rivales — solo tus
  celestes y la pelota (si la tienen ellos, la pelota viaja "sola": fantasma).
  El RADAR (volvió, abajo a la izquierda) es tu única fuente: triángulos naranjas
  numerados. El rival aparece SOLO en el cruce, en las escenas y en el radar.
  La tensión no viene de perseguir: viene de no saber. Si te resulta demasiado,
  decímelo: `vista.radio_revelacion` > 0 revela a los cercanos (una edición).
- **El modelo de saltos**: con la pelota vas RÁPIDO; nadie te corre por atrás —
  te emboscan los de adelante. Si te la roban, NO la perseguís: corte, y ya está
  lejos. El perdedor de cada duelo queda notablemente atrás.
- **El reloj por momentos**: cada jugada consume su bloque de minutos; entre
  jugadas apenas gotea. Un INTERMEDIO entero < 10 min reales (vos sos el cronómetro).
- **LA DEFINICIÓN ofensiva**: al elegir TIRO → escena a pantalla: corrés buscando
  el ángulo mientras los defensores APRIETAN (si te tocan, te la sacan; GAMBETA
  saca a uno, PARED barata, CABEZA/CHILENA si viene alta) → tocás una de las
  6 ZONAS del arco (cada una con etiqueta; el toque también clava la aguja del
  timing) → el vuelo con TU pose de remate + el arquero volando → FREEZE +
  silencio + revelación (pose_festejo o pose_arquero_ataja).
- **LA DEFINICIÓN defensiva**: cuando te rematan, le VES LA CARA al rival por
  primera vez (la ceguera hace eso solo) mientras CARGA con barra visible; corrés
  a tu defensor a la línea punteada; PLANTARSE / BARRIDA a todo o nada / ACHICAR /
  LÍNEA / SÚPER DEFENSA (si el envión está lleno) / QUIETO → elegís TU zona +
  TU reacción → la ATAJADA SE GRITA COMO UN GOL (hinchada + fanfarria).
- **Las poses**: el que patea es TU ilustración (remate/chilena/cabezazo), el
  festejo es pose_festejo con la TRIBUNA SALTANDO, la barrida es el defensor
  rival, el arquero vuela y ataja con sus dos poses. La pose está QUIETA y todo
  lo demás se mueve; el freeze la clava antes de cada revelación. Un TOQUE
  durante cualquier escena la adelanta (SKIP).
- **El aguante**: probá dos Caldenes: el tercero no existe (450×2=900 de 1000).
  El HUD dice AGUANTE (chau "guts", también en el clásico).
- **El ENVIÓN**: ganá duelos y mirá la barra amarilla (con número): llena, aparece
  🌟 POTENCIAR cuando atacás, o la SÚPER DEFENSA cuando te rematan.
- **Las SECUENCIAS** (nivel 2+): el centro de la cruz sin megatiro listo ofrece
  🌀 MEGACORRIDA (van quedando rivales atrás uno a uno y rematás) y el uno-dos
  crece a 🤝 COMBINADA (pared, elegís CENTRO o AL PIE, y el COMPAÑERO define).
- **El MASTER**: el HUD dice tu división (PRIMERA B) junto al marcador, y al
  saque te avisa a qué juega el rival (garra / toque / pelotazo / estrella).
  Los rivales del Mundial pegan el doble que los de la B — fijo, no elástico.
- **El sonido**: bajo + melodía + percusión; al cruzar al campo rival el tema
  SUBE la octava y aparece el eco. El silencio pre-desenlace es sagrado (no se
  acorta ni en velocidad RÁPIDA).

## LO QUE FALTA PARA MAÑANA (por prioridad)
1. **Las 5 poses nuevas tuyas** → `assets/poses/` + una clave cada una en
   `data/poses_manifest.json` (ids esperados: `gambeta_win`, `gambeta_lose`,
   `pared`, `bloqueo`, `corrida`) — el código ya las levanta solo. **Ojo**: si
   vienen con fondo magenta como las 7 de hoy, avisame y las proceso
   (chroma→alpha); el doc pedía transparencia real y llegaron RGB.
2. **Regenerar las poses del arquero con mangas lisas** (deuda §11 del doc:
   las rayas evocan trade dress deportivo).
3. **Tu playtest de la CEGUERA y el TEMPO**: son las dos apuestas grandes.
   Perillas listas: `vista.radio_revelacion` (0=total), `tempo.minutos_por_momento`,
   `ritmo.saltos_vel_mult`, `definicion.carga_ms`. Todo en balance, sin código.
4. **La carrera al Phaser** (gap #1 del GDD §16.4): el Master ya define divisiones
   y perfiles, pero temporada/ascensos/mejora siguen en el clásico. Es LA
   próxima tanda grande si el partido ya se siente Tsubasa.
5. **Pulido de la definición**: los defensores de la fase 1 son siluetas de
   código (les vendría bien `pose_bloqueo`); el arquero posicionable es un
   rectángulo (pose chica o ficha). La volea usa pose_remate (no hay pose propia).
6. **Roster**: "los jugadores con especiales tienen stats base más bajas" (§5)
   pide un campo `especiales` en roster_pampeano.json — regla anotada, sin campo aún.
7. Menores: SKIP para el cine de 5 planos del megatiro (las escenas del gestor
   ya lo tienen) · velocidad RÁPIDA no acorta los 5 planos · el flag `e5_guts`
   conserva su nombre interno (identificador, no UI).

## Deudas / notas honestas
- Las 7 poses llegaron 1600px RGB con fondo MAGENTA (sin alpha): les apliqué
  chroma→alpha con descontaminación de borde + recorte + PNG8 (~1MB las 7).
  Fuentes crudas quedaron en tu Downloads. `_PREVIEW_sobre_cancha.png` (tuyo)
  quedó commiteado en assets/poses/.
- La ceguera convive con el pase tocado EN la cancha y con el radar (los dos
  valen). El marcador propio en defensa lleva anillo blanco + ⇄/TAB manual.
- `resolverTiro` con megatiro conserva su ceremonia v3 (cut-in ahora a pantalla
  + barra exigente + cine de 5 planos). El tiro normal va SIEMPRE a LA DEFINICIÓN
  (flag `v6_definicion` OFF = flujo v4 con barra y escenas).
- Carrera real cazada en la tanda: `cerrarEscena` dejaba una ventana LIBRE antes
  del `alFinal` (la sim metía un rivalTira encima de la combinada) — cerrada.
- Saves retrocompatibles verificados: campos nuevos opcionales, `pampa_tempo`
  (preferencia local), `gutsProximo`/`PS.guts` del clásico INTACTOS (solo cambió
  el texto visible a AGUANTE).

## No negociables (§10/§11, verificado)
Sin apuestas · sin marcas ni terminología de terceros en producto NI comentarios
(rename GUTS→AGUANTE en Phaser, clásico y data; quedó un identificador interno
`e5_guts` documentado arriba) · sin nombres reales de menores · sin mouse (todo
dedo/teclado: zonas tocables, TAB, 1/2/3, ESPACIO=ACCIÓN siempre y solo) ·
género neutro · saves retrocompatibles en cada commit · toda info por forma/
número/etiqueta además del color (zonas con etiqueta, envión con número,
división en texto, radar por formas) · un solo agente sobre los archivos núcleo.
