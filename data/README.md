# `data/` — contenido separado del código (portable)

Regla de arquitectura (pensando en un futuro porteo a **Godot**): **el contenido no vive dentro de `index.html`**. Roster, relatos, y a futuro clubes/textos/constantes de balance viven acá como **JSON puro**, sin una sola línea de lógica de juego. Cualquier motor (el `index.html` actual, Godot, otro) los lee tal cual.

## Archivos

### `roster_pampeano.json` — `pampa-star/roster@1`
50 identidades pampeanas **ficticias** (fuente: `PAMPA_STAR_ROSTER_50.csv` de Rodri).
- Nombres de pila inventados; apodos y **pueblos reales de La Pampa** (información pública). **Sin personas reales, sin menores.**
- `posicion` original (ARQ/DEF/MED/DEL) + `posicion_motor` mapeada al engine actual (MED→VOL, DEL→ATA).
- `stats_auto`: 8 stats derivadas **deterministas** por `id`+posición (sembradas, reproducibles), sesgadas por puesto. Son un **default afinable**, no autoradas a mano — si Rodri quiere valores propios, se editan acá.
- `clubes_por_pueblo`: los 50 agrupados en 10 pueblos (5 c/u), cada pueblo con su `apodo` de club.
- **Todavía NO cableado al juego.** Es la base de datos para cuando entren los planteles reales / la rotación de amigos (ver DISENO_PAMPA_STAR_ADDENDUM). Los pueblos del roster no coinciden 1:1 con los 9 `CLUBES` actuales del `index.html` (comparten Winifreda, General Pico, Guatraché); la reconciliación club↔roster es trabajo futuro, documentado en el inventario.

### `relatos.json` — `pampa-star/relatos@1`
Voces y escenas **ficticias y originales** (fuente: `PAMPA_DIALOGOS_CONVERSACIONES` de Rodri).
- `narrador_inicio`: las 4 líneas del narrador de la pantalla de título.
- `relatores`: Pichi el Bagual (grito de gol), El Profe (análisis), Delfina Roldán (previa) — las tres voces del futuro "elegí tu relato" (DISENO_PRESENTACION). **Inventadas; nunca personas ni medios reales.**
- `escenas`: vestuario, amigos en el bar, prensa post-partido, chill en el pueblo — texto de sabor para momentos.

## Cómo se consume (sin romper retrocompat)
El `index.html` carga estos JSON con `fetch` **de forma opcional y tolerante a fallo**: si el archivo no está (o el juego se abre con `file://` sin server), el juego usa sus textos por defecto y sigue andando. La data enriquece, no es requisito.
