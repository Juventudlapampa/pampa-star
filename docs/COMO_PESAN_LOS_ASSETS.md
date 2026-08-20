# CÓMO PESAN LOS ASSETS

**El procedimiento para que una tanda de arte nueva no vuelva a engordar el
juego.** Si estás por meter piezas nuevas, esto es lo que hay que hacer.

---

## POR QUÉ EXISTE ESTE DOCUMENTO

Las 32 piezas de la tanda de arte entraron como PNG. El juego pasó a pedir
**34 MB en cada arranque** y la primera carga del partido dejó de ser
instantánea.

Este juego se comparte **por link de WhatsApp**. Treinta y cuatro megas con
datos es gente que cierra la pestaña antes de ver nada. No es una optimización
prematura: es la diferencia entre que alguien lo juegue y que no.

Convertidas a WEBP calidad 88: **5,28 MB, el 15%**. Con las siete piezas sin
uso apagadas, **3,59 MB**. En cel shading de tres tonos la diferencia visual es
nula — verificado mirando el juego, no suponiendo.

---

## LA REGLA

> **Lo que carga el juego es `.webp`. Los `.png` son fuente y viven en
> `assets/_fuente/`, donde el juego no los ve.**

La copia `.webp` no reemplaza al original: lo **deriva**. Si se pierde el PNG no
se puede regenerar con otra calidad ni medir la geometría de un ciclo.

El test `phaser/test/w1_peso.test.js` la hace cumplir:
- ningún asset declarado puede ser `.png`
- lo que carga el juego no puede pasar de **8 MB**
- la carpeta de fuente tiene que seguir existiendo
- ningún manifiesto puede apuntar a `assets/_fuente/`

---

## EL PROCEDIMIENTO, PASO A PASO

### 1 · Las piezas nuevas entran como PNG a su carpeta
`assets/poses/`, `assets/retratos/` o `assets/ui/`, según corresponda. Y se
declaran en su manifiesto (`data/poses_manifest.json`,
`data/portraits_manifest.json`) apuntando **al `.png`** todavía.

### 2 · Se convierten con el navegador
**No hay `cwebp` ni ImageMagick en esta máquina** (el `convert` que aparece en
el PATH es el de Windows, que no tiene nada que ver). Pero Chrome tiene un
codificador WebP de verdad detrás de `canvas.toBlob`, y el juego ya corre en un
navegador con un servidor de capturas que escribe a disco.

Con el juego abierto en el preview y `.claude/capture-server.js` corriendo:

```bash
node .claude/capture-server.js
```

Y en la consola de la página, el conversor (está en el HANDOFF de la tanda W;
pegarlo tal cual):

- carga cada PNG en un `Image`
- lo dibuja en un canvas **del mismo tamaño** (no se reescala nada)
- exporta con `toBlob("image/webp", 0.88)`
- lo manda al servidor de capturas, que lo escribe

Sale con alpha real, sin halo y sin tocar las dimensiones.

### 3 · Los webp a su carpeta, los png a `_fuente`
Los archivos aterrizan en `.claude/shots/` con el nombre `carpeta__archivo.webp`.
Se mueven a su carpeta y el PNG original se archiva en
`assets/_fuente/<carpeta>/`.

**Solo se archiva el PNG si su `.webp` ya quedó en su lugar.** Nunca se mueve el
original de algo que el juego todavía necesita.

### 4 · Los manifiestos apuntan al webp
Incluidos **los cuadros de los ciclos**, que se declaran adentro de la pose
(`ciclo.cuadros`) y es fácil que se pasen por alto — en esta tanda quedaron en
PNG un rato justamente por eso.

Y las rutas escritas a mano en el código: `intro.js` y `master.js` cargan
algunas piezas por ruta literal, sin manifiesto.

### 5 · Se corre el test y se mira el juego
```bash
node phaser/test/w1_peso.test.js
```
Y después, en pantalla: que ninguna pieza se vea peor. Si alguna se degrada,
**se le sube la calidad solo a esa** — no a todas.

---

## LA CALIDAD

**88** es el número de esta tanda, y funcionó para las 58 piezas sin una sola
degradación visible.

Por qué funciona tan bien acá: el arte es **cel shading de tres tonos con
contorno negro**. Son superficies planas y grandes, que es exactamente el caso
donde WebP con pérdida no tiene casi nada que tirar. En una foto o en un
degradado suave habría que subirla.

Si una pieza puntual se ve mal, se la convierte sola a 92 o 95. No hace falta
mover el número global.

---

## LO QUE NO HAY QUE HACER

- **No reescalar.** El juego escala por altura en runtime; cambiar las
  dimensiones del archivo rompe los `alto_rel` del manifiesto y cualquier
  `setScale` calibrado.
- **No reprocesar el alpha.** Las piezas vienen con alpha binaria y recortadas
  al contenido. Pasarlas por un recorte de nuevo come borde.
- **No borrar los PNG.** Son la fuente.
- **No meter en la carga lo que no se ve.** Ver abajo.

---

## LO QUE NO SE VE, NO SE CARGA

Una pieza puede estar **guardada** sin estar **cargada**. Guardada no cuesta
nada; cargada cuesta ancho de banda en cada arranque, tenga o no un lugar donde
mostrarse.

En el manifiesto:

```json
"calden": { "archivo": "calden.webp", "cargar": false,
            "_W2": "... lugar propuesto → los fondos ..." }
```

El preload la saltea. Cuando encuentre su lugar, `cargar: true` y ya.

**La regla que acompaña**: una pieza apagada tiene que decir **dónde iría**. Sin
eso nadie la va a prender nunca y queda como peso muerto en el repo. El test lo
verifica.
