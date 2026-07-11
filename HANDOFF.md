# HANDOFF — Partido v2 Phaser (estado real, mañana del 11/jul/2026)

**Lo primero y sin vueltas: la cola nocturna NO se ejecutó.** Tus reglas de sesión
llegaron como interrupción justo cuando terminaba de verificar la Etapa 3, y ahí
frené: **no implementé nada después de tu mensaje con las reglas**. Este documento
refleja el estado verdadero para tu revisión etapa por etapa. Nada de lo descrito
acá es trabajo inventado: cada punto es verificable en git y en los tests.

---

## 1. Estado por etapa

| Etapa | Estado | Commit | ¿En vivo (Pages)? |
|---|---|---|---|
| Docs v2 en `/docs` | ✅ completa | `bce0988` | sí |
| **E1 — Cámara y mundo** | ✅ completa + revisión adversarial (3 lentes, 4 fixes) | `0b2df82` | sí |
| **E2 — Radar y HUD** | ✅ implementada y verificada headless — **committeada ANTES de tus reglas**: le falta su revisión adversarial formal y tu verificación gráfica en el celu | `6c21dde` | sí |
| **E3 — Menús + pausa + retratos** | 🔶 implementada y verificada headless, **SIN COMMITEAR** (working tree), sin revisión adversarial todavía | — | **no** (no la podés ver en el celu hasta commitear) |
| E4 — Animaciones y perspectiva | ⬜ no empezada (tu dirección de arte quedó anotada) | — | no |
| E5 — Economía de guts | ⬜ no empezada (`_economiaActiva` apagado: guts clavados) | — | no |
| E6 — Pulido cinematográfico | ⬜ no empezada | — | no |
| Etapa Final (fusión/sonido/QA) | 🔒 candado CERRADO (requiere E2–E6 completas con revisión) | — | no |

**Tests (corridos hoy a la mañana): 2010 + 9 + 30 + 15 + 137 = 2.201 asserts, 0 fallas.**
Saves: intactos — `armarPlanteles` lee `pampa_star_v1` + avatares igual que siempre; el editor de pinta sigue siendo la entrada.

## 2. Qué hay en el working tree (la E3 sin commitear)

- `logic/partido.js`: **pase al vacío** (`resolverPaseAlVacio` + arquero vendido con ventana), **no moverse** (`esperarDefensa`, recupera guts), tiro con **penalidad por distancia** y número de camiseta como dato lógico.
- `scenes/match.js`: máquina de estados LIBRE→MENU→RESOLUCION (doc §9), **menú en CRUZ** (W/N/E/S como el pad, doc §8) con teclado flechas+ENTER, **doble retrato en duelos** (nombre + guts, doc §6), botón **☰ ACCIÓN** (≥48px; con pelota abre menú, en defensa elige el marcador más cercano), **pase dirigible tocando el radar** (tocar más allá del receptor = AL VACÍO), menú del arquero, rival del cruce **materializado** (máx 3 sprites grandes, verificado), fin de partido con revancha.
- `balance.json` + fallback: claves nuevas (`dist_tiro` 525 = §7 "desde campo propio no llega", `vacio_*`, `recupera_no_moverse`, `tiro_lejos_*`, `bonus_arquero_vendido`).
- Verificado headless: cruce pausa + 2 retratos con GUTS + 3 sprites máx ✓ + resolución ✓ + pase al pie ✓ + al vacío (arquero vendido ✓) + menú arquero ✓ + ✕ vuelve ✓ + 0 errores de consola.

## 3. Desvíos que esperan TU decisión (los hice ANTES de leer tus reglas)

1. **RETRATOS**: usé tu banco real (`assets_drive` → 11 bustos optimizados en `assets/retratos/`, ~170KB) y armé yo `data/portraits_manifest.json`. Tu regla pedía **placeholders dibujados por mí** y el manifest lo armás vos. Decidí: **(a)** aprobás lo hecho (reemplazás archivos/nombres cuando quieras — formato abajo), o **(b)** lo paso a placeholders originales y saco tus webp del tree. El sistema de paneles es agnóstico: VOS/amigos usan la cara del avatar del editor; el resto sale del manifest por arquetipo.
2. **index.html**: además del config de render (autorizado), toqué el **fallback de balance** (claves E3, necesarias para la paridad `file://` — regla vieja del proyecto) y el **fetch del manifest**. Fue antes de tu regla "solo render config". ¿Mantener o revertir? (revertir rompe la E3 sin server).
3. **tiro.js §11**: autorizaste borrar el comentario con la marca — **aún no lo toqué** (no implementé nada tras tus reglas). Un minuto de trabajo cuando des el OK de arranque.

## 4. Feature flags

Todavía **no hay flags formales** (E2/E3 nacieron antes de esa regla). Existe el gate interno `_economiaActiva` (apagado = guts clavados al máximo hasta E5). Al retomar, propongo `balance.flags = { e3_menus, e4_arte, e5_guts, e6_cine, partido_phaser }`, todos apagables, `partido_phaser` APAGADO por defecto como pediste.

## 5. Formato del manifest de retratos (para que lo armes vos)

```json
{ "retratos": [
    { "archivo": "assets/retratos/TU_ARCHIVO.webp",
      "arquetipo": "companero | rival",
      "n": "nombre legible",
      "origen": "de dónde salió (documentación)" } ] }
```
- `arquetipo: "companero"` → se asigna a NPCs de tu equipo; `"rival"` → a rivales. Determinista por nombre del jugador (mismo jugador, mismo retrato todo el partido).
- VOS y tus 4 amigos **no usan el banco**: su retrato es la cara del avatar del editor.
- Si un archivo falta o no hay server, cae solo a caras de avatar (tolerante, nada crashea).

## 6. Checklist de aceptación en el celu

**HOY EN VIVO** en https://juventudlapampa.github.io/pampa-star/phaser/ (apaisado, editor → ¡A LA CANCHA!):
- **E1**: el portador se ve GRANDE (⅓–½ del alto), la cámara lo sigue suave con un aire antes de scrollear, NUNCA se ve la cancha entera, tocás y corre, en los bordes la cámara frena. NO deberías ver otros jugadores grandes ni menús.
- **E2**: radar abajo-izquierda: **círculos celestes numerados** (tuyos), **triángulos naranjas numerados** (rivales), **rombo blanco de borde negro** (pelota), **anillo blanco** en el que controlás; mirando SOLO el radar entendés dónde está todo, sin depender del color. HUD: marcador y reloj arriba, **GUTS siempre con el número** además de la barra. *(El botón ☰ ACCIÓN todavía NO está en vivo: es parte de la E3 sin commitear.)*

**CUANDO APRUEBES COMMITEAR LA E3** (hoy no visible en el celu):
- Al cruzarte con un rival el juego SE PAUSA y ves TU cara y la del rival con nombre y guts.
- Elegís con UN toque en la cruz (o flechas + ENTER); la resolución se muestra antes de seguir.
- PASE: tocás el destino en el radar; tocar MÁS ALLÁ de un receptor adelantado = PASE AL VACÍO (y el próximo tiro avisa "arquero vendido").
- UNO-DOS y NO MOVERSE presentes; TIRO bloqueado desde campo propio ("no llega").
- ☰ ACCIÓN: con pelota abre el menú; en defensa te pasa al marcador más cercano.
- Nunca más de 3 sprites grandes en cámara (portador + rival del cruce + arquero).

## 7. Reglas vigentes anotadas (tu mensaje nocturno)

Etapas 2→6 en orden estricto, un commit por etapa, tests + revisión adversarial por etapa, freno si algo rompe saves o la regla de 3 sprites, feature flag por feature, nada al clásico sin tu autorización, dirección de arte E4 (pixel art cuerpo entero proporción heroica, ¾ trasero, 4 frames por animación, camisetas parametrizables celeste-liso vs naranja-rayas — forma además de color, campo #2E7D32/#388E3C con convergencia y curvatura), verificación gráfica E2 antes de cerrarla, y el candado de la Etapa Final. **HANDOFF_FINAL.md** al cierre con la sección "DECISIONES QUE ESPERAN A RODRI".

## 8. Qué espero de vos para arrancar

1. Decisión de **retratos** (a: tu banco ya cableado / b: placeholders míos).
2. Decisión de **index.html** (mantener fallback+fetch / revertir).
3. OK para **commitear la E3** (con su revisión adversarial + flag antes del commit).
4. Tu verificación gráfica de **E2 en el celu** (checklist de arriba).
