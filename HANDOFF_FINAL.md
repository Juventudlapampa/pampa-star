# HANDOFF FINAL — Partido v2 Phaser, tanda completa (noche del 11/jul/2026)

**El candado ABRIÓ**: Etapas 2–6 completas, cada una con commit propio, suite de tests
verde y revisión adversarial multi-agente con sus fixes aplicados. La Etapa Final se
ejecutó entera: fusión con flag, saves ida-y-vuelta verificados, sonido con hooks,
pulido cinematográfico, pasada mobile y QA de punta a punta. **Nada quedó bloqueado.**

---

## 1. Estado de cada etapa

| Etapa | Estado | Revisión adversarial |
|---|---|---|
| E1 — Cámara y mundo lógico | ✅ completa (aprobación tuya del feel pendiente en celu) | 3 lentes → 4 fixes |
| E2 — Radar y HUD | ✅ completa | cubierta en la revisión E2+E3 (17 hallazgos) |
| E3 — Menú de comandos + pausa + retratos | ✅ completa | 3 lentes → 12 fixes (los ALTA: estados §9 separados de verdad; 1 falso positivo de render refutado empíricamente) |
| E4 — Animaciones heroicas + falsa perspectiva | ✅ completa | 2 lentes → 13 fixes (rodillas, glifo del 0, dorsal rival, sim remapeada al trapecio…) |
| E5 — Economía de guts (escala del doc) | ✅ completa | 2 lentes con sims de 90' → 8 fixes (defensa que corre, tanque rival que respira, regen por salto) |
| E6 — Pulido cinematográfico | ✅ completa | 2 lentes → 6 fixes (el ALTA: `_urgente`/caches vs restart) |
| **Etapa Final** | ✅ ejecutada (fusión + saves + sonido + pulido + mobile + QA) | prueba de saves ida-y-vuelta + soak final |

**Tests finales: 2010 + 9 + 32 + 15 + 137 = 2.203 asserts, 0 fallas.**
QA de punta a punta: partido completo 93' manejando los menús reales — 117 menús, 23
pases dirigidos (7 al vacío), entretiempo, descuento sorpresa y FINAL, **0 errores de
consola, 0 estados congelados**, ambos tanques de guts con vida propia.

## 2. Commits de la noche, en orden

1. `bce0988` docs: especificación v2 + investigación a `/docs`
2. `0b2df82` **Etapa 1**: cámara cinematográfica y mundo lógico
3. `6c21dde` **Etapa 2**: radar y HUD fijo
4. `653c76e` **Etapa 3**: menú de comandos con pausa y retratos
5. `bf2a6a4` Retratos: banco real (tu decisión de la mañana)
6. `fffa7b8` **Etapa 4**: animaciones heroicas y falsa perspectiva
7. `f7dccd4` **Etapa 5**: economía de guts + defensa que corre
8. `d700174` **Etapa 6**: pulido cinematográfico
9. *(este)* **Etapa Final**: fusión con flag, sonido, pulido y QA

## 3. Feature flags y su estado por defecto

| Flag | Dónde | Default | Apagado = |
|---|---|---|---|
| `e3_menus` | `balance.json → flags` | **ON** | sandbox E1/E2 (sin cruces, remate rival auto-resuelto, sin botón ACCIÓN) |
| `e4_arte` | `balance.json → flags` | **ON** | sprites toscos + cancha plana |
| `e5_guts` | `balance.json → flags` | **ON** | tanques de guts quietos al máximo |
| `e6_cine` | `balance.json → flags` | **ON** | Etapa 5 exacta (sin flashes/cut-in/SFX de acción; solo silbato) |
| `partido_phaser` | localStorage del CLÁSICO | **OFF** | el clásico juega su propio partido, como siempre |

`partido_phaser` se enciende abriendo el juego con **`?partido_phaser=1`** (y se apaga
con `=0`) — queda guardado. Con el flag ON, JUGAR FECHA lanza el partido Phaser con el
club rival real, y al final el botón **▶ APLICAR Y VOLVER A LA CARRERA** escribe el
resultado que el clásico aplica por su propio `aplicarFecha()` (mismo camino de siempre).

**Prueba de saves ejecutada y aprobada**: save viejo (formato pre-avatares) → flag ON →
partido Phaser (rival "Deportivo Telén", 2-1) → APLICAR → el clásico avanzó la fecha
(0→1), sumó los 3 puntos a la tabla, persistió el save, dejó el `look` viejo intacto y
no quedó ninguna clave basura → flag OFF → clásico normal y consistente. **Sin revert.**

## 4. Checklist de aceptación en el celu (en orden, EN VIVO en Pages)

Abrí **https://juventudlapampa.github.io/pampa-star/phaser/** apaisado → editor → ¡A LA CANCHA!

**E1 — cámara**: el portador GRANDE (⅓–½ del alto), la cámara lo sigue suave, nunca ves
la cancha entera, tocás y corre, en los bordes la cámara frena.
**E2 — radar/HUD**: círculos celestes numerados (tuyos) / triángulos naranjas numerados
(rivales) / rombo blanco con borde negro (pelota) / anillo blanco en el que controlás;
mirando SOLO el radar entendés todo sin depender del color. GUTS siempre con número.
**E3 — menús**: al cruce el juego SE PAUSA, ves tu cara y la del rival (nombre + barra +
número de guts, atacante a la izquierda), elegís con UN toque en la cruz (o flechas +
ENTER, ESC cancela), la resolución se muestra antes de seguir. PASE tocando el destino
en el radar; tocar MÁS ALLÁ del receptor = AL VACÍO (y "arquero vendido" si después
tirás rápido). UNO-DOS y NO MOVERSE presentes; TIRO gris con motivo escrito desde campo
propio; CALDÉN convive con TIRO (centro de la cruz). ☰ ACCIÓN: con pelota abre el menú,
en defensa te pasa al marcador más cercano. **En defensa ahora MOVÉS a tu marcador**
(mirá su anillo en el radar) y perseguir gasta guts.
**E4 — arte**: jugador de cuerpo entero ¾ trasero con TU pinta (pelo/vincha/muñequeras),
número en la espalda (rival A RAYAS naranja con dorsal legible, vos celeste liso),
correr de 4 frames con estela de velocidad, cancha con franjas de dos verdes que se
afinan al fondo, horizonte curvo con tribuna, y las resoluciones CON CUERPO (gambeta,
pase, tiro/volea/cabezazo, festejo en el gol, arquero que se estira).
**E5 — guts**: los costos se sienten (tiro 80, especial 300 de 1000), rendido bajo 100
(trota y las acciones caras se bloquean con motivo escrito), la barra cambia de color
CON el número, el descanso y los saltos de reloj recuperan de a poco.
**E6 — cine**: flash + motivo musical al cambiar de manos la pelota, CUT-IN con tu
retrato en el Caldén, chispas + sacudón en el gol (el gol en contra suena DESCENDENTE y
con chispas frías), banner de entretiempo, tictac + reloj ⏰ rojo en los últimos 5'.
**Etapa Final — fusión**: abrí **https://juventudlapampa.github.io/pampa-star/?partido_phaser=1**
→ CONTINUAR → JUGAR FECHA → te lleva al partido nuevo contra el club real → jugá →
APLICAR Y VOLVER → la tabla del clásico tiene tu resultado. Después `?partido_phaser=0`
y verificá que el clásico juega el suyo como siempre.

## 5. Deudas técnicas pendientes

- **Performance en gama baja**: el radar ya usa el plan barato del doc (Graphics, no
  segunda cámara) y los botones táctiles del partido son ≥48px; pero los 50 fps en TU
  celu no se pueden medir desde acá — si al probar se arrastra, avisame qué escena.
  El primer cruce de cada jugador hornea 28 texturas (hitch tapado por la pausa del menú).
- Los steppers del EDITOR miden 44×38 (fuera del alcance §8, que es del partido) — subir a 48 si molesta en celu.
- `docs/DISENO_PARTIDO_V2_PAMPA_STAR.md` §6 pedía retratos también para "tiros especiales" con cut-in ✅ y "menú de comandos" (panel fijo del portador SIN duelo — hoy el retrato aparece en el menú del duelo y en el libre; igual criterio).
- Contextos del §7 sin implementar (documentados en el header de match.js, no son bugs): menús de RECEPCIÓN (Trap/Through/volea al recibir), Despeje en área propia, "achicar" del arquero.
- El comentario del bloque `sugerencias_de_tu_banco` en `portraits_manifest.json` quedó de la etapa placeholder — inofensivo, borralo si querés.

## 6. DECISIONES QUE ESPERAN A RODRI

1. **Retratos**: quedó tu banco real cableado (decisión tuya de la mañana ✅). Si querés
   sumar/cambiar retratos: pisá archivos en `assets/retratos/` con el mismo nombre o
   editá `data/portraits_manifest.json` (formato documentado adentro).
2. **¿`partido_phaser` como camino definitivo?** Hoy OFF por defecto: el clásico manda.
   Si el playtest de la fusión te cierra, se puede encender por defecto (una línea) —
   y ahí decidimos qué pasa con el partido clásico (queda como "modo retro"?).
3. **Orientación de la perspectiva (E4)**: la profundidad va hacia el lateral lejano
   (neutral para ambos arcos). El Tsubasa de verdad reorienta para que SIEMPRE corras
   "hacia arriba" — hacerlo implica remapear la vista por posesión. ¿Lo querés?
4. **LA DEFINICIÓN + cine de 5 planos de la Tanda ABC**: viven en git (`53f0d80`).
   El TIRO de hoy resuelve directo (E3); reintegrar tu tiro con destreza + los planos
   como RESOLUCIÓN del remate es la mejora grande que sigue, si la querés acá.
5. **Guts del clásico → Phaser**: la vida (gutsProximo) todavía no alimenta el tanque
   inicial del partido Phaser (arranca a 1000). ¿Lo mapeamos cuando confirmes la fusión?
6. **Rename "GUTS" en el clásico** (pendiente viejo, opciones a/b/c en PROGRESO).

*Todo lo de esta noche cumple los no negociables: sin menores reales, sin apuestas, sin
material de Tecmo/Captain Tsubasa (el comentario viejo de tiro.js también se limpió),
textos neutros en voseo, saves retrocompatibles tras CADA commit, y toda información
visual con forma/número además del color.*
