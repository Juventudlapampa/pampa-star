# P2 · QUE SEA LINDO Y DISTINTO

**Propuesta. No está implementado.** Qué se puede hacer en 2D con Phaser para
dar la sensación de **estar en un lugar** en vez de mirar un menú.

**Restricción del pedido, respetada:** nada de migrar a Godot ni a 3D. Todo lo
que sigue corre en el Phaser que ya está, con el arte que ya hay o con pedidos
de arte chicos y nombrados.

---

## Por qué hoy se siente a menú

No es por feo. Es por **tres cosas concretas y medibles**:

1. **Todo pasa en el mismo plano.** Un menú tiene un fondo y unos botones
   encima. Un lugar tiene cosas adelante, cosas atrás, y algo entre medio.
2. **Nada se mueve si vos no tocás.** Un lugar respira cuando no lo mirás. Hoy,
   entre toque y toque, la pantalla está congelada. (La excepción es el partido,
   que ya tiene tribuna que late y parallax — y por eso el partido **sí** se
   siente un lugar.)
3. **No hay nadie más.** En la semana, en el club y en la tabla no hay una sola
   persona además de vos. Un lugar tiene gente que no te está esperando.

Lo bueno: **el partido ya resolvió las tres** (V7-1 pantalla partida, parallax,
tribuna que late, siluetas). Lo que sigue es llevarle eso al resto del juego,
que es más barato que inventarlo.

---

## LO MÁS BARATO PRIMERO

### B1 · Que el fondo tenga TRES capas y se mueva con el dedo

**Qué:** cada pantalla que hoy tiene un fondo plano pasa a tener fondo / medio /
frente, y las tres se corren distinto cuando arrastrás o cuando el cursor se
mueve. Dos o tres píxeles. No hace falta más.

**Por qué funciona:** el paralaje es lo único que en 2D dice "esto tiene
profundidad" sin dibujar nada nuevo. Es exactamente lo que hace que el panel del
partido se lea como una cancha y no como una foto.

**Lo que ya está:** `panelPasto` y `panelTribuna` son TileSprites con
`parallax_pasto` y `parallax_tribuna` en `balance.vista`. El mecanismo está
escrito y calibrado.

**Costo:** **~1 día** para la semana y el club. **Cero arte** si se reusan los
fondos que ya trajo la tanda de Claude Design (`bg1`..`bg4`, `fondo_tribuna`).

---

### B2 · Que algo respire cuando no tocás nada

**Qué:** en cada pantalla, **una** cosa chica que se mueva sola en loop:

- en la **semana**, la ropa colgada del patio o el humo del asado
- en el **club**, la bandera del mástil y el pasto que se peina con el viento
- en la **tabla**, el ventilador de la sala o la luz que parpadea

Un tween de 2 a 4 segundos, `repeat: -1`, sobre un objeto de 30 píxeles.

**Por qué funciona:** es la diferencia entre una foto y una ventana. Y es lo más
barato que existe: una cosa por pantalla alcanza. Dos ya es ruido.

**Cuidado medido:** en la escena `intro` los tweens **no avanzan** (verificado:
progress 0 tras 24 cuadros, anotado en `intro.js`). En las demás escenas sí
corren. Esto no sirve para la intro.

**Costo:** **~1 día** para tres pantallas. **Arte:** 3 elementos chicos.

---

### B3 · Que haya alguien más

**Qué:** una o dos siluetas de fondo que no hacen nada y no se pueden tocar. En
la semana, alguien pasando en bici por atrás. En el club, dos pibes pateando
contra el paredón. En la tabla, el tipo del buffet.

**Por qué funciona:** es lo que más rinde por píxel. Un lugar con una persona
que no te está mirando se siente habitado; el mismo lugar vacío se siente un
menú. Y **no tienen que estar bien dibujadas**: van en silueta oscura, que es lo
que ya hace `panelSil` en el partido.

**Lo que ya está:** el sistema de siluetas del panel (`setTintFill(0x101820)`
sobre una pose cualquiera). Se le puede dar de comer cualquier pose del
manifest.

**Costo:** **~1 día.** **Cero arte nuevo** si van en silueta.

---

## LO DEL MEDIO

### M1 · LA SEMANA COMO PIEZA, no como grilla

**Qué:** en vez de diez tarjetas en una grilla, **una habitación vista de lado**
—la pieza del jugador— con las cosas repartidas: los botines en un rincón, la
cama, la mesa con los libros, la puerta que da al patio. Elegir la acción es
**tocar la cosa**: los botines son entrenar, la cama es descansar, los libros
son estudiar, la puerta es salir al asado.

**Por qué funciona:** una grilla te hace elegir de una lista. Un lugar te hace
elegir *qué hacés*, que es exactamente lo mismo pero se siente distinto porque
la decisión tiene ubicación. Y las tres cosas que ya elegiste se pueden ver EN
la pieza: los botines embarrados, la cama deshecha.

**Lo que ya está:** `PampaSemanaUI.escenario()` ya dibuja seis lugares
(`club`, `potrero`, `casa`, `patio`, `ruta`, `escuela`) con Graphics. La pieza
sería el séptimo, y los seis de hoy pasarían a ser lo que se ve por la ventana.

**Lo que cambia y hay que decidir:** con diez acciones y una pieza, **algunas no
tienen objeto obvio**. "Ir a ver al rival" no está en tu pieza. Se resuelve con
la puerta (salir) que abre un segundo plano — o se acepta que dos acciones vivan
en un cartel al costado.

**Costo:** **~4 días.** El grueso es arte: la pieza con sus objetos, en dos
estados (limpia / usada). El código es el mismo `escenario()` con hit-areas.

**Arte que falta:** la pieza (1 fondo), 6-8 objetos tocables, y una variante
"usada" de cada objeto que ya elegiste.

---

### M2 · EL CLUB COMO SITIO

**Qué:** la pantalla del club deja de ser un escudo y un nombre y pasa a ser
**la entrada del club**: el paredón con el escudo pintado, la tranquera, el
cartel con el nombre, y adentro el pasto. La tabla de posiciones vive en un
**pizarrón colgado del paredón**, que es donde vive de verdad en un club de
pueblo.

**Por qué funciona:** una tabla en un pizarrón se lee igual que una tabla en una
pantalla, pero ya no es una interfaz: es una cosa que está en un lugar. Y el
escudo pintado en el paredón hace lo que un escudo en un recuadro no hace nunca.

**Lo que ya está:** `PampaEscudosUI` dibuja el escudo del club generado por
`logic/escudos.js`. Pintarlo sobre un paredón es la misma llamada con otra
escala y un filtro de textura.

**Costo:** **~3 días.** Arte: el paredón, la tranquera, el pizarrón. El código
es reubicar lo que ya hay.

---

## LO CARO (y por qué igual lo pongo)

### C1 · LOS PUEBLOS COMO MAPA CAMINABLE

**Qué:** el mapa de D4 —que ahora es puntos y etiquetas— pasa a ser un mapa que
se **recorre**: tu muñequito camina por la ruta entre pueblos, y cada pueblo es
un lugar al que entrás.

**Por qué lo pongo aunque sea caro:** porque es lo único de esta lista que
convierte el Modo Master en **un mundo** en vez de una secuencia de pantallas.
Y porque el mapa esquemático de D4 ya dejó la puerta abierta: cuando carguen las
coordenadas exactas, el mapa deja de ser un esquema y pasa a ser un territorio.

**Por qué NO lo haría ahora:** porque pide contenido para cada pueblo. Un mapa
caminable donde todos los pueblos son iguales es peor que una lista, porque
promete algo que no cumple. Esto se hace cuando haya al menos tres pueblos con
algo propio adentro.

**Costo:** **~8-10 días** y **mucho arte** (un fondo por pueblo, mínimo). Más el
contenido, que no es tiempo de programación.

---

## LA REGLA QUE VALE MÁS QUE TODA LA LISTA

Hay una cosa que sale **cero días** y rinde más que cualquiera de las anteriores:

> **Cada pantalla tiene UNA cosa que se mira y el resto cede.**

Ya está escrita en el proyecto (`logic/piel.js`, BLOQUE E, los cuatro niveles de
jerarquía) y hay una medición vieja que la justifica: *en la vista de la semana,
13 de sus 14 textos estaban dentro del 72% del tamaño del más grande*. Cuando
todo pesa lo mismo, el ojo no sabe dónde empezar — **y eso es exactamente lo que
hace que algo se sienta un menú**, más que la falta de dibujos.

Antes de dibujar una sola pieza nueva, conviene pasar las pantallas que quedan
por `PampaPiel.nivel()`. Es barato y es la mitad del problema.

---

## Resumen y orden que recomiendo

| # | qué | costo | arte | rinde |
|---|---|---|---|---|
| **0** | jerarquía con `piel.nivel()` en las pantallas que faltan | ~0,5 día | no | **mucho** |
| **B3** | siluetas de gente de fondo | ~1 día | no | **mucho** |
| **B1** | tres capas de fondo con parallax | ~1 día | no | mucho |
| **B2** | una cosa que respira por pantalla | ~1 día | 3 chicos | medio |
| **M2** | el club como sitio | ~3 días | sí | mucho |
| **M1** | la semana como pieza | ~4 días | sí | mucho |
| **C1** | los pueblos caminables | ~8-10 días | mucho | mucho, después |

**Lo que haría primero, y son 3,5 días:** 0 + B3 + B1 + B2. Es todo barato, casi
todo sin arte nuevo, y cambia la sensación de las tres pantallas principales sin
tocar una sola regla del juego.

**M1 (la pieza) es la que más se parece a lo que pediste** —"la semana como una
habitación"— y la pondría inmediatamente después, porque la semana es la
pantalla donde más tiempo pasás fuera de la cancha.
