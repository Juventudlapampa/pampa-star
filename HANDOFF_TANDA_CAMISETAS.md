# HANDOFF — TANDA 2 · LAS SEIS CAMISETAS (7/ago)

Del documento `PAMPA_STAR_TANDAS_DE_ARTE.md`. Es la única tanda que no necesita
generar arte: son seis líneas de datos.

En vivo: https://juventudlapampa.github.io/pampa-star/phaser/

---

## LO PRIMERO: NO ERAN DOS MINUTOS

El documento dice *"Pasáselos a Claude Code y quedan en dos minutos"*. Las seis
líneas sí tardan dos minutos. Pero pegadas tal cual **seis de las nueve camisetas
mostraban otra**.

`phaser/logic/avatar.js` tenía el tope clavado:

```js
out.tCam = tin(l.tCam, 4);   // 3 camisetas + "Original"
```

El editor ofrecía las nueve (usa `.length` del manifest), pero todo lo que dibuja
—el busto, la pose del panel, la ficha del radar— valida el look antes de
indexar, y ahí el índice se plegaba con módulo:

```
Con el tope viejo (3): 4→0, 5→1, 6→2, 7→3, 8→0, 9→1
Con el tope nuevo (9): ninguno se pliega
```

O sea: elegías "Violeta jarilla" y jugabas de "Blanco pampa". Y como el look se
guarda en `localStorage`, al recargar la partida la camiseta cambiaba sola.

**El `HANDOFF_V9_2.md` decía "más camisetas: listo, una línea por camiseta".
Era falso.** Quedó corregido.

---

## LO QUE QUEDÓ HECHO

### 1 · Las seis camisetas

`data/caras_manifest.json` → `camisetas[]`

| Nombre | Hex |
|---|---|
| Verde caldén | `#2E7D32` |
| Bordó salitral | `#7B2233` |
| Naranja atardecer | `#E8712F` |
| Violeta jarilla | `#6A3FA0` |
| Amarillo trigo | `#E8C33A` |
| Negro tranquera | `#232323` |

Van después de las tres originales, así que los saves viejos no se mueven de
lugar: quien tenía "Blanco pampa" (índice 3) la sigue teniendo.

### 2 · El tope ahora lo dice el manifest

`logic/avatar.js` es lógica pura y no lee JSON (los tests lo requieren sin
manifest), así que no puede contar solo. Ahora expone `setCatalogoManifest({caras,
camisetas})` y `index.html` se lo pasa al arrancar, antes de crear el juego.

Arreglado para las **dos** cosas que tenían número clavado: las camisetas (`4`) y
las caras (`% 8`). La Tanda 3 agrega seis caras — con esto ya no hace falta tocar
código para eso tampoco.

### 3 · El radar, legible con tonos oscuros

El número de cada ficha y el anillo eran `#0a1f13` fijos. Contra los celestes se
leían; con "Negro tranquera" quedaban negro sobre negro y la ficha desaparecía
del mapa.

Ahora se eligen por luma del tono: oscuro → tinta clara, claro → tinta oscura.
El rival no se toca (sigue naranja y triángulo: el bando nunca depende del tono).

Esto es la regla de daltonismo del proyecto: en el mapa te reconocés por el
número tanto como por el color, así que el número tiene que leerse siempre.

### 4 · Un test que lo cuida — `phaser/test/camisetas.test.js`

55 asserts, en tres partes:

- **el dato**: hex de 6 dígitos parseable, nombres sin repetir, hex sin repetir, y
  cada nombre con al menos una palabra distintiva (no vale "Celeste 1" / "Celeste 2");
- **el código**: recorre *todos* los índices que el editor ofrece y falla si alguno
  se pliega — es el bug de arriba, convertido en test;
- **que el tope sea de verdad dinámico**: lo prueba con 20 camisetas y 14 caras, para
  que nadie lo vuelva a clavar en otro número.

---

## VERIFICADO EN VIVO

Con el juego corriendo, no solo compilando.

**El editor, las nueve camisetas, una por una.** Recorrí el stepper como lo haría
un jugador y comparé lo que dice la fila contra lo que se aplica:

| click | dice en pantalla | tCam guardado | tras validar | textura del busto |
|---|---|---|---|---|
| 0 | Original | 0 | 0 | `cara_clasico` |
| 1 | Celeste titular | 1 | 1 | `caraT_0_0_0_1` |
| … | … | … | … | … |
| 7 | Violeta jarilla | 7 | **7** | `caraT_0_0_0_7` |
| 8 | Amarillo trigo | 8 | **8** | `caraT_0_0_0_8` |
| 9 | Negro tranquera | 9 | **9** | `caraT_0_0_0_9` |

Las nueve coinciden y cada una genera su propia textura teñida.

**Que el color cambie de verdad.** Medí el promedio de los píxeles de la camiseta
en cada busto teñido:

| camiseta | promedio medido |
|---|---|
| Original | `#6ba6c4` |
| Verde caldén | `#5a8460` |
| Bordó salitral | `#825460` |
| Naranja atardecer | `#bb7d5e` |
| Violeta jarilla | `#7a6399` |
| Amarillo trigo | `#bba864` |
| Negro tranquera | `#555558` |

No dan exactamente el hex pedido porque el recolor **preserva la luminancia**:
las luces y sombras del cel shading sobreviven. Es lo que hace que siga
pareciendo un dibujo y no un recorte pintado.

**El riesgo que no se cumplió.** La auditoría previa anticipó que `#232323`
fundiría la camiseta con el contorno negro y quedaría una mancha plana. Medido:
los píxeles de tinta pasan de **11 % a 11,3 %** (291 píxeles de 94.014) y el
promedio queda en `#555558`, o sea conserva el volumen. El arte tiene rango de
sobra. No hizo falta aclarar el negro.

**El save aguanta el índice alto.** Guardé con Negro tranquera, recargué la
página y `localStorage` seguía con `tCam: 9`. Con el código viejo volvía a 1.

**El radar, en partido.** Entré a la cancha con Negro tranquera:

```
ficha           #232323  · luma 35
tinta elegida   #f6efdc  · luma 239
número en pantalla  "1"  color #f6efdc
número del rival    "1"  color #0a1f13   (sin cambios)
```

Y con Celeste titular la tinta vuelve a `#0a1f13`. El contraste pasa de 35-contra-14
(invisible) a 35-contra-239.

**Lo que no pude capturar**: el snapshot del radar registra el cambio de la ficha
(39 píxeles oscuros más con el negro) pero no la re-rasterización del número, por
el desfase de frame conocido de este entorno headless. El color del objeto de
texto sí lo verifiqué, y es lo que Phaser dibuja.

---

## SUITE

20 archivos verdes. Sección 11 limpia en 40 archivos de producto: ninguno de los
seis nombres dispara los patrones del guardián (marcas, apuestas, clubes reales).

---

## LO QUE NO TOQUÉ, Y CONVIENE SABER

Dos cosas siguen sin seguir la camiseta elegida. Son de antes de esta tanda, pero
con los tonos nuevos se notan mucho más que con tres celestes:

- **el muñequito de cancha y de bloques** (`avatar_arte.js`, `KITS.mio` fijo en
  `0x4fc3f7`);
- **el chip "TU ARCO"** (`match.js`, `#4FC3F7` escrito a mano).

Con Negro tranquera el busto y la pose salen negros y el muñequito de la cancha
sigue celeste. No lo arreglé porque toca el kit de cancha, que es otra decisión de
diseño (el kit tiene FORMA propia — lisa, banda, cuello en V — que hoy es
independiente del tono del busto). Si querés que la camiseta mande en todo, es una
tanda corta aparte y te la hago.

---

## SOBRE EL RESTO DEL DOCUMENTO

Auditadas contra el repo, las demás afirmaciones se sostienen casi todas:

| Afirmación | Veredicto |
|---|---|
| Hoy hay 8 caras, ninguna con barba/gorra/anteojos/femenina | **cierto** |
| Hay 12 poses cableadas y 1 solo fondo (la tribuna) | **cierto** |
| Las 6 poses propuestas no existen y hoy caen en poses prestadas | **cierto** |
| El rival no tiene ciclo de corrida en ningún nivel | **cierto** |
| Los 6 nombres de camiseta no disparan la sección 11 | **cierto** |
| "El manifest ya está esperando el arte del relator" | **falso** |

Lo del relator conviene aclararlo antes de que generes esa tanda: en
`portraits_manifest.json` hay un **hueco documentado** (`_relator_visible`), pero
no una entrada real, y **ningún código la lee**. A diferencia del ciclo de
corrida, que tenía el código listo esperando los PNG, el relator visible necesita
código nuevo en `match.js` además del arte. La tanda sirve igual — pero no es
pegar y listo.

Dos detalles menores para cuando llegue la Tanda 3: los ids propuestos vienen con
prefijo (`cara_barba`), y la convención del manifest es sin prefijo (`barba`,
archivo `cara_barba.png`) — con prefijo la textura quedaría `cara_cara_barba`.
