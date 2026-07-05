# PAMPA STAR — Secuencia de prompts v2 (post-feedback del v3)

> Reemplaza a la secuencia anterior. El Prompt 1 ahora es la **reescritura v4** (el v3 no era el juego: manejabas un muñeco, no dirigías la jugada). Misma regla de oro: de a uno, en orden, y en cada ⛔ CONTROL parás, jugás y me pasás feedback antes de disparar el siguiente. Antes del Prompt 1: subí DISENO_PARTIDO_V4.md al repo (o pasáselo a Code para que lo commitee).

---

## PROMPT 1 — Reescritura del Partido v4 → Code

```
Continuás PAMPA STAR (repo Juventudlapampa/pampa-star). ANTES DE TOCAR NADA:
1) Sumá y commiteá DISENO_PARTIDO_V4.md.
2) Leé index.html, DISENO_PARTIDO_V4.md, DISENO_PARTIDO_V3.md, DIRECCION_ARTE_SONIDO.md y PROGRESO.md.

REESCRIBÍ el partido como PARTIDO v4 siguiendo DISENO_PARTIDO_V4.md al pie, en su orden de build. El v3 quedó mal de raíz: el jugador maneja un muñeco con cruceta en una cancha chica. El v4 es el modelo correcto, de DOS CAPAS: una vista de acción que muestra solo el drama (el portador corriendo, el cruce, el remate, el arquero) y un radar fijo con los 22 en tiempo real sobre un campo bien dimensionado, donde se lee y se decide. Movimiento con propósito del portador (y de un defensor en defensa, con cambio al más cercano o tocando el radar); encuentros por contacto que CONGELAN el tiempo y abren el menú por rol; matriz de duelos (corte>pase, quite>gambeta, bloqueo>tiro) con stats+azar y solo tus stats visibles; apuntado de pases en el radar ampliado (compañero o espacio) y tiros al arco en 6 zonas; el control viaja con el pase; reloj de 2×45' a saltos (1' cada 15s de juego libre, tunable) con descuento impredecible; economía de Guts completa con desgaste del arquero, CPU que también gasta, y megatiros contextuales con cut-in y animación dedicada. La cámara no hace zoom analógico: hace CORTES de escena estilo anime entre capas.

Conservá y no rompas TODO lo que anda alrededor: temporada, vida y amigos, avatar con origen, data de megatiros y stats, guardado.

Trabajá de corrido, commiteá y pusheá por etapa (las 6 del documento, sección 10), actualizá PROGRESO.md, frená solo si algo rompe el juego.

REGLAS: mobile-first apaisado; index.html; guardado retrocompatible; todo original, mecánica sí pero nombres/moves/melodías de Tecmo/Captain Tsubasa jamás; nunca menores; nada de apuestas.
```

### ⛔ CONTROL 1 — Jugá el v4 y decime: ¿sentís que dirigís la jugada leyendo el radar? ¿El corte a la vista de acción pone la épica? ¿Los encuentros tienen juego mental? ¿El apuntado (radar para pases, arco en 6 zonas) va bien al dedo? ¿Llegás a los megatiros y se sienten ganados? ¿45'/15s con descuento va, o ajustamos el tick?

---

## PROMPT 2 — Presentación + Identidad de juego → Code

```
Continuás PAMPA STAR (repo Juventudlapampa/pampa-star). ANTES DE TOCAR NADA leé index.html, DISENO_PRESENTACION.md y PROGRESO.md.

Construí la CAPA DE PRESENTACIÓN + IDENTIDAD. Commiteá por parte, actualizá PROGRESO.md.

1. IDENTIDAD DE JUEGO. Que se sienta un juego, no una app: intro al abrir con la placa del estudio ("[ESTUDIO] presenta", texto pixel, 2s, salteable) → logo animado de PAMPA STAR (pixel, con el leitmotiv) → pantalla de título (Jugar / Continuar / Opciones) → transiciones suaves entre todas las pantallas del juego (fundidos/barridos pixel, nunca cortes secos). Menús con la estética pixel de DIRECCION_ARTE_SONIDO.md.

2. EDITOR DE PINTA POR CAPAS, según DISENO_PRESENTACION.md: avatar modular (piel, camiseta, cara, pelo, vincha, accesorios) dibujado por código; variantes con etiqueta o forma, nunca solo color; HEX; migración retrocompatible; el mismo editor para los 4 amigos.

3. "ELEGÍ TU RELATO" — el comentarista. Las tres voces ficticias (el streamer, la cabina, la tele) con banco de líneas por evento; el jugador elige la modalidad; el relato aparece DESPUÉS del desenlace de cada jugada, respetando el flujo del v4, con variantes para no repetirse.

REGLAS: mobile-first apaisado; index.html; guardado retrocompatible; todo original; nunca personas, programas ni medios reales; nunca menores; nada de apuestas.
```

### ⛔ CONTROL 2 — ¿La intro y el título se sienten "juego de verdad"? ¿El relato suma o distrae? ¿El editor de pinta te gusta?

---

## PROMPT 3 — Escalera de ascensos y fichajes → Code

*(Sin cambios respecto de la secuencia anterior: cadena de categorías Primera B → Europa, ofertas y transferencias, rotación de amigos, dificultad creciente. Usar el prompt ya escrito.)*

### ⛔ CONTROL 3 — Jugá varias temporadas y ascendé. ¿El fichaje se siente épico? ¿La rotación de amigos pega?

---

## PROMPT 4 — Música chiptune enriquecida → Code

*(Sin cambios: matriz por estado — posesión, amenaza rival, urgencia en los últimos 10' —, stingers de gol/atajada/especial, leitmotiv de PAMPA STAR que evoluciona. Todo original.)*

### ⛔ CONTROL 4 — ¿La música acompaña sin cansar?

---

## CAPA DE PROFUNDIDAD (después de que el v4 respire — balance, no rediseño)

Del filtro del informe, para foldear cuando el partido ya se sienta bien: tácticas defensivas seleccionables (normal / presión alta / contragolpe), Work Rate atado a los Guts (la bisagra Vida↔cancha), y rasgos mecánicos de los amigos (armador, cazagol, etc.). Un solo prompt de balance; lo armamos con tu feedback de los controles.

## FASE FINAL

- **La Selección y el Mundial:** el diseño YA ESTÁ (DISENO_SELECCION_MUNDIAL.md). El prompt de build se arma cuando la escalera (Prompt 3) esté probada.
- **Planteles reales de Primera A y B:** paso de datos aparte (nombres adultos de medios públicos, con las guardas de siempre).
- **Modo femenino:** activar el modelo neutro.
- **Lesiones, moral y prensa post-partido:** diseño aparte.
- **Empaquetado ejecutable:** el juego es index.html; al final se empaqueta sin cambiar nada: PWA instalable (ícono y pantalla completa en el celu), APK (Capacitor) o .exe (Electron). Etapa técnica, un prompt propio cuando el juego esté entero.

## Recordatorio de orquestación

Los prompts de build van de a uno, esperando tu playtest en cada control. Si un control pide rediseñar de fondo, vuelve a Cowork antes de que Code construya (como pasó con el v3 → v4). Los informes (Gemini + filtro) ya están integrados: al v4 le entraron la matriz de duelos, los Guts con desgaste del arquero y los megatiros contextuales; el resto quedó en la capa de profundidad.
