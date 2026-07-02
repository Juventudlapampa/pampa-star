# PAMPA STAR — Biblia de arte

> Todo el arte es **original y generado por código** (`pampa-star-sprites.js`). Nada de Tecmo/Captain Tsubasa ni assets de terceros. Regla dura de accesibilidad: el dueño del proyecto es **daltónico** — ninguna información se distingue solo por color; toda variante lleva **nombre/etiqueta y/o forma**. Colores siempre en HEX.

## Paleta (nombre → HEX)

| Nombre | HEX | Uso |
|---|---|---|
| Pasto | `#2a9d4f` | franja clara de la cancha |
| Pasto cortado | `#259247` | franja oscura (corte alternado) |
| Raya de cal | `#eafff0` | líneas de la cancha |
| Sol pampeano | `#f6c11d` | dorado principal (UI) |
| Sol claro | `#ffd84d` | acentos dorados |
| Cielo | `#5bb8e8` | acentos celestes / arquero propio |
| Crema | `#f6efdc` | texto |
| Tinta | `#0a1f13` | contornos / texto sobre dorado |
| Rojo caldén | `#e3503e` | alertas / especiales |
| Ok | `#7ee08a` | éxito |
| Noche | `#06120b` | fondo |
| Fuego (estela) | `#ff8c3a` + `#f6c11d` | tiros especiales |
| Red del arco | `#d9e6ee` / `#9fb6c4` | arco y red |

## Sprites (8×16 px lógicos, escalables con `image-rendering: pixelated`)

- **Jugador/amigos/rivales**: cabeza 4×4 (tono de piel), pelo (ver variantes), torso 6 filas (camiseta con estilo), short, piernas con animación de 2 frames, sombra.
- **Tu jugador** lleva **marcador ▼ blanco con borde tinta** encima (forma, no color).
- **Arqueros**: guantes blancos; el rival viste `#ffe14d`, el tuyo `#5bb8e8` (además de estar en arcos opuestos).
- **Pelota**: 4×4 blanca con panel oscuro.
- **Cancha**: apaisada con scroll horizontal, franjas de corte cada 18 px, círculo y punto central, áreas, puntos penales, arcos con red tejida y banderines en los córners.

## Variantes de apariencia (catálogo etiquetado)

| Tipo | Variante | Distinción |
|---|---|---|
| Piel | Piel clara `#e9b58c` / Piel trigueña `#c68e5f` / Piel morena `#8d5a3a` | etiqueta con nombre |
| Pelo | Rapado (al ras) / Corto oscuro `#3a2a1a` / Corto claro `#c9a227` (+flequillo) / Largo oscuro `#241a10` (melena) / Largo colorado `#a53f1f` (melena + vincha `#0a1f13`) | **cada uno con FORMA propia** + etiqueta |
| Camiseta | Lisa / A franjas (verticales, FORMA) / Con banda (horizontal, FORMA) | forma + etiqueta |

Las camisetas usan los colores del club (c1/c2 en HEX, definidos por club en el código).
