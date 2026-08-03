# HANDOFF — TANDA DE ARTE (30/jul)

Los 26 PNG del entregable, cableados. Base: `e3cdf57` → `2e41a53`.
En vivo: https://juventudlapampa.github.io/pampa-star/phaser/

---

## LO PRIMERO, PORQUE CAMBIA TODO

**El arte llegó con FONDO MAGENTA, no con transparencia.** Los 26 archivos
tienen 0% de canal alpha: el recorte está hecho con chroma key sobre magenta
(#fc00f9). Además, los que tienen extensión `.png` son **WEBP por dentro** (solo
el spritesheet del ciclo es PNG de verdad).

Si se cableaban tal cual, cada figura salía con un cuadrado magenta alrededor.
Se procesaron **una sola vez, offline**:

1. magenta → alpha, **despintando el halo** del antialias (si no queda un borde
   rosa alrededor de todo);
2. recorte al contenido;
3. **caja común** donde la alineación importa (el ciclo y las identidades);
4. escala a un alto razonable y guardado como PNG con alpha real.

Para el arte que venga: lo ideal es exportar con transparencia real. Si sale de
una herramienta que solo da chroma, avisá y lo proceso igual — pero conviene que
el magenta no toque el dibujo (una camiseta rosa fuerte se comería el borde).

---

## A1 · LAS 8 CARAS

`assets/poses/caras/` · manifest `data/caras_manifest.json` → `caras[]`

| Archivo del zip | Queda como | id | pelo | piel | camiseta | pelo_y1 |
|---|---|---|---|---|---|---|
| busto_01_cara_clasico.png | cara_clasico.png | clasico | `#183448` | `#fbe1ca` | `#4dbff3` | 0.36 |
| busto_02_cara_rulos.png | cara_rulos.png | rulos | `#332925` | `#cc9168` | `#4ebef3` | 0.50 |
| busto_03_cara_melena.png | cara_melena.png | melena | `#183246` | `#fbe1ca` | `#4dbef4` | 0.75 |
| busto_04_cara_rapado.png | cara_rapado.png | rapado | `#875033` | `#875033` | `#4cbff4` | 0.30 |
| busto_05_cara_colorado.png | cara_colorado.png | colorado | `#f84824` | `#fee8d9` | `#4dbef4` | 0.35 |
| busto_06_cara_flequillo.png | cara_flequillo.png | flequillo | `#183246` | `#fbe1ca` | `#4dbef4` | 0.40 |
| busto_07_cara_mohicano.png | cara_mohicano.png | mohicano | `#183347` | `#b79c55` | `#4dbef4` | 0.40 |
| busto_08_cara_tranqui.png | cara_tranqui.png | tranqui | `#31292a` | `#eebc89` | `#4ebef4` | 0.41 |

- **Los tonos salen de cada PNG**, no copiados entre sí: el rulos tiene piel
  morena, el mohicano piel oliva, el colorado pelo naranja.
- **Las ocho traen camiseta celeste.** El naranja a rayas que mencionabas está
  en las identidades de sprint, no en los bustos.
- **`pelo_y1` se midió por color** en cada dibujo. Hubo que filtrar el contorno
  de tinta: al ser casi negro matchea con los pelos oscuros y estiraba la banda
  hasta el cuello (daba 0.95 en siete de ocho).
- **El rapado queda sin tinte de pelo**: su "tono de pelo" ES la piel de la
  cabeza, así que teñirlo le pintaba la cara. El colorado sigue excluyendo
  rubio y canoso.

**Verificado**: se tiñe el pelo de naranja fuerte y se cuentan los píxeles que
cambian dentro y fuera de la banda. 12.000-56.000 píxeles teñidos por cara y
**cero fuera de la banda** en las siete que se tiñen.

---

## A2 · LAS 6 IDENTIDADES DE SPRINT

`assets/poses/identidades/` · manifest `data/identidades_manifest.json`

| Archivo del zip | Queda como | equipo | dorsal | camiseta |
|---|---|---|---|---|
| sprint_01_jugador_rulos.png | jugador_rulos.png | mio | 7 | celeste `#52c1f5` |
| sprint_02_jugador_largo.png | jugador_largo.png | mio | 11 | celeste `#59bceb` |
| sprint_03_jugador_rapado.png | jugador_rapado.png | mio | 9 | celeste `#57b9e8` |
| sprint_04_jugador_colorado.png | jugador_colorado.png | mio | 8 | celeste `#57b9e7` |
| sprint_05_rival_flequillo.png | rival_flequillo.png | rival | 10 | naranja `#fe844a` |
| sprint_06_rival_mohicano.png | rival_mohicano.png | rival | 5 | naranja `#fe8349` |

- **Caja común, no una por una**: los pisos quedaron en **618-619 de 620**, o sea
  1px de diferencia entre las seis. Si alguna se reemplaza, hay que recortarla
  con la misma caja o se va a ver saltar.
- **Traían la pelota dibujada** y el juego dibuja siempre la suya: se borró
  (estaba en x≈0.228, y≈0.902, r≈0.096 en las seis) y quedó anotado en el
  manifest para que no se vuelva a colar.

---

## A3 · EL CICLO DE CORRIDA — ✅ ACTIVO (segunda vuelta, 3/ago)

`assets/poses/` · manifest `data/poses_manifest.json` → `poses.corriendo.ciclo`

| Archivo del zip v2 | Queda como | cuadro |
|---|---|---|
| run/pose_corriendo_1.png | pose_corriendo_1.png | contacto |
| run/pose_corriendo_2.png | pose_corriendo_2.png | paso |
| run/pose_corriendo_3.png | pose_corriendo_3.png | empuje |

```json
"ciclo": { "cuadros": ["pose_corriendo_1.png","pose_corriendo_2.png","pose_corriendo_3.png"], "ms": 120 }
```

Los tres se pegaron **tal cual vienen** de `PAMPA_STAR_arte_v2_ciclo_alineado.zip`
(1500×1400, PNG RGBA): no se recortaron, no se reescalaron, no se recentraron, no
pasaron por sharp. Vienen con máscara binaria y alineados de origen.

### La primera vuelta, y por qué falló

Se había procesado el zip equivocado (`TODO_TODO_TODO_FINAL.zip`, el original) y
se recortaron los cuadros con **caja común** — que alinea el **lienzo**, no la
**figura**. El desajuste quedó intacto: piso 68px, alto 9,6%. A 120ms eso se lee
como rebote y pulso de tamaño, no como zancada.

### Verificado EN VIVO

Medido sobre el render real de Phaser (RenderTexture + snapshot), a la escala del
panel — figura de 183px — con los mismos tres cuadros viejos sacados de git para
comparar en igualdad de condiciones:

| | piso | alto | cadera |
|---|---|---|---|
| **antes** (los que rebotaban) | ±21 px | ±9,4 % | ±7,7 px (3,9 % del alto) |
| **ahora** (zip v2) | **±1 px** | **±0,5 %** | ±6,7 px (3,7 % del alto) |

El pie apoya en la misma línea en los tres cuadros y el cuerpo no pulsa de
tamaño. La **cadera** se queda quieta: los 6,7px son la inclinación del torso al
correr, y giran las piernas alrededor.

### El test — `phaser/test/ciclos.test.js`

Mide la figura de cada cuadro de cualquier ciclo declarado en el manifest y falla
si el **piso** difiere más de **4px**, el **alto** varía más del **3%** o el
**centro de la cadera** se corre más del **6% del alto de figura**.

Dos cosas cambiaron respecto de la primera versión:

1. **La banda de cadera reemplazó a la caja completa.** Al correr, los brazos y
   las piernas se abren y se cierran: la caja se ensancha por diseño y su centro
   se mueve aunque el cuerpo esté quieto. La cintura (42-55% de la altura de
   figura) es el eje real del movimiento.
2. **El tope va en porcentaje, no en píxeles.** Los lienzos cambian de tamaño
   entre entregas (739×700 la vez pasada, 1500×1400 ahora), así que un tope
   absoluto significa cosas distintas en cada tanda.

**Sobre el 6%**: medidos con la banda de cadera, el set roto da 4,33% y el bueno
4,51% — la cadera **no discrimina** entre uno y otro (ver "Una diferencia con los
números del pedido", más abajo). Los que sí separan son el piso (68px → 0) y el
alto (9,6% → 0,0%). El tope quedó en 6% para cazar un cuadro corrido de verdad
sin castigar la inclinación del torso, que es dibujo y no defecto.

*(El spritesheet 4800×1600 no se usó: los tres cuadros sueltos son más fáciles
de mantener y de reemplazar uno solo.)*

### Una diferencia con los números del pedido

El pedido decía que los cuadros nuevos dan **1px** de deriva de cadera con la
banda 42-55%. Midiéndolos con cuatro métodos distintos me da bastante más:

| método | deriva |
|---|---|
| centro por extremos de cada fila de la banda | 54 px |
| centro de masa de la banda | 54 px |
| solo el short, aislado por color | 21 px |
| la banda excluyendo los tonos de piel | 31 px |

Sobre 1197px de alto de figura, 54px son 4,5% — y en pantalla, a 183px de figura,
son los 6,7px de la tabla de arriba. Puede ser que el 1px salga de medir el
**centroide de la máscara completa** o el centro del lienzo en vez del contenido;
no pude reproducirlo.

**No cambia la conclusión**: el ciclo está bien, y está bien por el piso y el
alto, que dieron 0. Lo dejo anotado para que no sorprenda que el test imprima
"cadera ±54px" en verde.

---

## A4 · ESCALA Y ENCUADRE DEL PANEL

| Qué | Antes | Ahora |
|---|---|---|
| alto de la figura | ~1/3 del panel | **77,9%** del alto útil |
| anclaje | centro (podía cortar los pies) | **pies a la línea del suelo** |
| fondo cuando actúa | igual siempre | **se oscurece** (brillo 95,6 → 60,7) |
| el nombre | flotando sobre el sprite | **franja propia abajo** (y=292) |

Perillas nuevas en `balance.vista`: `panel_techo_y`, `panel_suelo_y`,
`panel_figura_frac`, `panel_figura_x`, `panel_velo_alpha`, `panel_franja_y`.

**Un bug mío que cazó la medición**: creé el velo con `fillAlpha 0` y en Phaser
eso lo deja invisible por más que se anime `.alpha`. En el código se veía
correcto y en pantalla no oscurecía nada. Se ve solo midiendo píxeles.

---

## SOBRE LAS CAPTURAS

No pude adjuntar screenshots: el navegador del preview corre con el panel oculto
y **no compone frames**, así que la herramienta de captura devuelve error (es una
limitación conocida de este entorno, ya anotada). Lo resolví de dos maneras que
sí dan evidencia:

1. **Hojas de contacto del arte procesado** (las miré para asignar bando, tonos y
   cortes): así confirmé que son 4 celestes + 2 naranjas, que el ciclo es
   consistente y que la pelota se borró sin comerse los botines.
2. **Mediciones sobre el frame real del juego** (`snapshot` del renderer): de ahí
   salen el 77,9%, el brillo 95,6 → 60,7 y la serie de cuadros del ciclo.

Si querés las imágenes, la vía es abrir el juego en tu celu — o decime y preparo
una página de prueba que muestre las 8 caras, las 6 identidades y el ciclo lado
a lado para revisarlo de un vistazo.

---

## LO QUE NO TOQUÉ

Las **8 poses de `01_poses_originales/`** del zip son las que ya están cableadas
y verificadas desde la tanda 2 (con alpha nativo). No las reemplacé: cambiarlas
por las versiones con chroma sin necesidad ponía en riesgo escenas que hoy andan.
Si alguna cambió de dibujo, avisá cuál y la actualizo.
