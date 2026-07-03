# PAMPA STAR — Diseño del Partido v3: presentación y flujo ("la magia")

> Spec para Claude Code. v2 puso equipo y pases; v3 pone lo que hacía mágico al
> género: la PRESENTACIÓN por escenas y el FLUJO con suspenso. Todo es MECÁNICA
> y puesta en escena replicada con contenido 100% original: cero assets, sprites,
> sonidos o código de Tecmo/Captain Tsubasa. Nunca menores reales; nada de
> apuestas. Mobile-first, guardado `pampa_star_v1` retrocompatible (v3 casi no
> toca el guardado: es capa de presentación sobre el motor v2).

**Qué aprendimos del original (mecánica, verificado):** el género "cinematic
soccer" pausa en menú y después MUESTRA la resolución como escena dramática
(la pelota volando, el arquero estirándose); el minimapa muestra a TODOS los
jugadores en tiempo real; los pases se dirigen a cualquier lado y el juego
calcula si alguien puede robarlos EN EL AIRE — ahí vive el suspenso. Eso es lo
que replicamos con lenguaje propio.

---

## ETAPA 1 — Todos los jugadores en cancha

**Cuántos: 7 por equipo.** Formación **ARQ – 2 DEF – 3 VOL – 1 ATA**. Con la
cancha de 640px y viewport de 280px, 7v7 deja 2–4 jugadores visibles por
pantalla (cancha poblada, no sopa de sprites) y el minimapa muestra los 14.
Cinco era poco para que se sienta "equipo"; once no se lee en 280px. Tus 4
amigos ocupan su posición real; canteranos genéricos completan (igual que v2,
solo que ahora son 2 más). El rival forma espejado con stats derivadas de la
fuerza del club.

**Dos capas de jugadores, regla central de v3:**

| Capa | Quiénes | Comportamiento |
|---|---|---|
| **ACTIVOS** (2–4 a la vez) | Portador; marcador del tercio; receptor más probable; en defensa, tu perseguidor controlado | Persiguen, presionan, disparan encuentros |
| **POSICIONALES** (el resto) | Todos los demás, de los dos equipos | Escenografía VIVA: van a su ancla de formación con elasticidad (ya existe en v2), deriva lenta, oscilación idle de 1px, mirando hacia la pelota. NUNCA persiguen, NUNCA desaparecen |

**Arreglo del bug de magia n°1:** hoy el defensor superado se marca `passed`
y se deja de dibujar — desaparece. En v3 **nadie desaparece jamás**: el
superado vuelve caminando a su ancla (se lo ve atrás tuyo en pantalla y en el
minimapa, vencido). Ver rivales quedando atrás ES la sensación de progreso.

---

## ETAPA 2 — El flujo de escenas (el corazón)

**Concepto: ESCENA = unidad de presentación.** Todo lo que pasa en el partido
se muestra como una secuencia de escenas encadenadas; la vista principal
muestra la escena actual y el minimapa el panorama completo, siempre. Máquina
de estados única:

```
PS.escena = { tipo, t, desde, hasta, datos, alTerminar }
```

Una sola escena activa a la vez, encoladas en `PS.colaEscenas`. Los
`setTimeout` sueltos del motor actual migran acá (ya causaron carreras en v1;
la cola las elimina por construcción).

**Tipos de escena:**

**E1. CONDUCCIÓN** (la actual): cámara sigue al portador, control libre.

**E2. PASE — la escena estrella.** Al confirmar el pase:

1. Se cierra el menú. La cámara SE DESPEGA del pasador y sigue a LA PELOTA,
   que viaja sola (recta baja o globo según tipo de pase).
2. Si hay un rival que puede cortar (el cálculo de intercepción de v2), cuando
   la pelota entra a su radio: **hit-stop de 250ms** — todo se congela, el
   rival estirado hacia la trayectoria. Ese cuarto de segundo ES el "¿llega o
   no llega?". Después la moneda ya tirada se muestra: la pelota sigue de
   largo (¡pasó!) o el rival la toca (corte).
3. La cámara aterriza en el receptor, cartel `AHORA JUGÁS: RAMONA (VOL)`,
   control retomado. Si fue corte: transición a defensa desde ahí.

**Regla de oro: el resultado nunca se anuncia por texto ANTES de verse.**
Primero la pelota viaja, después el desenlace, después (si hace falta) la
línea de texto. Hoy es al revés y por eso no hay suspenso.

**E3. CORTE DE CÁMARA (transición).** Cuando la cámara debe saltar más de
media pantalla (pase largo, contragolpe): **corte seco con 120ms de negro** —
el lenguaje de cortes del género, gratis de implementar y dramático. Saltos
cortos: paneo rápido (300ms, ease-out). Nunca teletransporte sin transición.

**E4. TIRO.** Cámara viaja con la pelota al arco → hit-stop de 400ms con el
arquero en el aire → desenlace visual (red que se infla / manotazo) → recién
ahí el cartel (¡GOL! / atajada) y la línea de crónica.

**E5. ESPECIAL.** Igual que E4 pero precedida por el cut-in dramático (retrato
pixel grande + grito + estela, ya especificado en la dirección de arte). El
silencio de 400ms antes del desenlace es obligatorio acá.

**E6. PELOTA DIVIDIDA / RECUPERACIÓN.** Disputa que se ve: dos sprites
convergen a la pelota suelta, hit-stop corto, uno se la lleva.

**El minimapa durante todo esto** queda fijo y actualizado: es el "plano
general" mientras la vista principal hace el "primer plano". Doble plano
permanente, como el original.

---

## ETAPA 3 — Persecución y cambio de jugador en defensa

**Decisión: control AUTOMÁTICO al jugador propio más cercano a la pelota**
(fiel al género y sin fricción táctil en móvil), con override opcional:
**tocar cualquier punto propio en el minimapa te pasa el control a ese
jugador**. El cambio se anuncia siempre igual: la flecha ▼ se muda + cartel
`AHORA MARCÁS CON: TOTO (DEF)` (texto + forma, nunca solo color).

**Que defender no sea verlos pasar:**

- Tu perseguidor controlado corre a **0.55 px/frame vs 0.34 del portador
  rival**: si elegís bien el ángulo, SIEMPRE lo alcanzás antes del área. Hoy
  se escapan porque tu velocidad de persecución no compensa el arranque.
- El marcador posicional del tercio presiona automático al portador rival:
  puede forzar un encuentro "pasivo" (sin que corras) con % reducido (−15).
  Defender es elegir: corrés vos (control total, mejor %) o confiás en la
  marca (pasivo, peor %) y cubrís el pase con otro.
- El rival juega con el mismo lenguaje de escenas: sus pases también se VEN
  viajar, y tu corte también tiene su hit-stop (la tensión funciona en las dos
  direcciones — cortarle un pase al rival tiene que sentirse igual de bien
  que completar el tuyo).
- Al recuperar: escena E6 + corte + `¡LA RECUPERASTE!` y seguís desde ahí.

---

## ETAPA 4 — Megatiros accesibles (bug + diseño)

**Diagnóstico exacto (verificado en el código actual):** `TIROS_ESPECIALES`
está declarado (línea ~372) pero **ningún código lo consume**: la reescritura
v2 de los menús eliminó el bucle `for(const e of TIROS_ESPECIALES)` que v1
tenía dentro del menú de mano a mano. Los especiales no aparecen porque quedaron
huérfanos, no por balance.

**Arreglo de diseño:**

1. **El menú de REMATE muestra SIEMPRE los 3 especiales**, cada uno con estado
   etiquetado por TEXTO (regla daltonismo, igual que v1):
   - Activo: `🔥 DISPARO DEL CALDÉN · 82% · -25 GUTS` (botón grande, estilo
     `.cmd.special` que ya existe en el CSS).
   - Falta nivel: `NIVEL 3` (bloqueado). Verlos bloqueados fabrica deseo: es
     el gancho de progresión del género.
   - Falta energía: `GUTS 25`.
   - No implementado: `PRÓXIMAMENTE`.
2. **Dónde se ofrece:** mano a mano con el arquero y tiro dentro del área
   (100% del multiplicador); tiro desde el borde del área (multiplicador
   ×0.8, se etiqueta "DESDE LEJOS"). Nunca en mediocampo.
3. **Garantizar que LLEGUES con nafta:** además de los pases baratos de v2-F,
   nueva regla: completar una **jugada armada** (3 pases seguidos) al entrar
   al área devuelve **+5 Guts** ("subidón"). Objetivo medible: a nivel 3+, en
   ≥80% de las llegadas construidas el Caldén tiene que estar disponible.
4. **La escena E5** hace el resto: el especial tiene que SENTIRSE especial
   (cut-in, silencio, estela). Cablear también acá la ATAJADA ESPECIAL del
   amigo ARQ (v2-D) con el mismo patrón de menú y su propia escena.
5. De paso, activar **TIRO ATUEL** (nivel 5) como funcional: la fórmula ya
   existe (×1.45, 30 Guts); solo le falta su variante de escena (rasante, la
   estela va pegada al pasto). El Tornado queda PRÓXIMAMENTE.

---

## ETAPA 5 — Ritmo y velocidad (números finales)

**La frase que guía todo: lo lento son los CUERPOS, lo rápido son la PELOTA y
los CORTES.** El corre-corre muere bajando la velocidad de los jugadores; la
tensión vive en la velocidad de la pelota y en los hit-stops.

| Constante | Valor v3 | Nota |
|---|---|---|
| `VEL_PORTADOR_MIO` | 0.50 px/f | Baja de 0.62: conducir es decidir, no picar |
| `VEL_RIVAL_CON_PELOTA` | 0.34 px/f | |
| `VEL_PERSECUCION` | 0.55 px/f | Siempre alcanzás si el ángulo es bueno |
| `VEL_POSICIONALES` | ≤0.15 px/f | Escenografía que respira |
| `VEL_PELOTA_PASE` | 1.8–2.4 px/f | Escala con la distancia del pase |
| `HITSTOP_INTERCEPCION` | 250 ms | El "¿llega?" |
| `HITSTOP_DESENLACE` | 400 ms | Antes de gol/atajada/especial |
| `CORTE_NEGRO` | 120 ms | Transición de cámara larga |
| `PANEO_CORTO` | 300 ms ease-out | Transición de cámara corta |
| Cadencia objetivo | 1 escena cada 3–6 s | Conducir 2–4s → menú (sin reloj) → escena 1–2s |
| Partido completo | 6–9 min reales | |

El menú NUNCA tiene timer: pensás lo que quieras (es la identidad RPG del
género). El reloj del partido solo avanza con acciones resueltas, como en v2.

---

## Orden de implementación y commits

1. **Etapa 1** — 7v7 con capas activo/posicional; nadie desaparece. (jugable)
2. **Etapa 2** — máquina de escenas + E2 pase con hit-stop + E3 cortes. (el salto de magia)
3. **Etapa 4** — especiales en el menú de remate + E4/E5. (antes que la 3: es un bug visible y el payoff más grande)
4. **Etapa 3** — defensa con auto-switch + override por minimapa + E6.
5. **Etapa 5** — pasada final de constantes con la tabla de arriba.

## Criterios de aceptación (playtest)

1. En cualquier momento del partido veo 14 jugadores en el minimapa y a nadie
   "desaparecer" en la vista principal.
2. Todo pase se VE viajar; si hay posible corte, hay un instante congelado
   antes del desenlace, y el texto llega DESPUÉS de la imagen.
3. Con nivel 3 y 25+ Guts, el Caldén aparece en TODOS los menús de remate del
   área; con nivel bajo, se ve bloqueado con su etiqueta de texto.
4. En defensa, persiguiendo con buen ángulo alcanzo al portador rival antes
   del área en ≥80% de los casos.
5. El partido dura 6–9 minutos y en ningún momento hay dos escenas
   solapadas ni timeouts fantasma (la cola es única).
6. Checklist daltonismo: todo estado nuevo (bloqueos de especiales, carteles
   de control, capas del minimapa) se distingue por forma o texto.

---

*v3 = presentación sobre el motor v2; el guardado no cambia. Después de esto,
lo que sigue en la lista grande: ascensos, rotación de plantel y rivales reales.*
