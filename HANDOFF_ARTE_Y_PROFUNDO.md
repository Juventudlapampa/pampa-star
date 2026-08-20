# HANDOFF — LA CANCHA PROFUNDA, LA INTRO Y LAS 42 PIEZAS DE ARTE

Cuatro tandas seguidas, todas cerradas. Modo autónomo.

| Tanda | Qué | Commit |
|---|---|---|
| **P6-B** | la cancha profunda: el panel tiene dos modos | `74752c4` + `64c68e7` |
| **I1 / I2** | la intro (las nueve de P10) · las dos tipografías | `b0e9220` · `a6c6f36` |
| **A1-A5** | las 32 piezas de arte | `3ba05e2` |
| **D1-D4** | el arte de Claude Design | `6afff64` |

Suite: **41 archivos verdes** · §11 limpia · árbol limpio.

---

## LO QUE MÁS VALE LA PENA MIRAR

### El umbral que habría dejado invisible todo el trabajo de P6-B

Puse `pase_dist: 300` a ojo. Después jugué 16 minutos eligiendo siempre el
receptor más lejano y medí las distancias reales: **156 175 180 200 219 219 220
273 274 369**. La máxima de diez pases fue 369 y la mediana 219.

Con 300, el modo profundo disparaba **1 de cada 10** — o sea que la tanda
entera habría quedado prácticamente invisible, y no me habría enterado. Quedó
en **260**, que agarra el tercio más largo. Los diez números están escritos en
`balance.vista.profundo._umbrales` para que el próximo sepa contra qué se
calibró.

Verificado jugando de verdad, sin forzar nada: disparó solo en un pase largo al
minuto 9.6.

### Los tweens de la intro no corren — y explicaban tres de las nueve

Medido: un tween de 300 ms quedó en **progress 0 después de 24 cuadros**, con
el reloj de la escena andando bien (los `delayedCall` de los planos sí
disparan) y sin pausa ni `timeScale` raro.

Todo lo que dependía de un tween para ENTRAR al cuadro no entraba nunca: el
héroe del plano 2 se quedaba en x=1200 (fuera de pantalla), el ¡CALDENAZO! en
y=700 (160 px por debajo de la pantalla) y **el logo en y=-220 — o sea que el
cierre de la intro nunca mostró el nombre del juego, y el archivo estaba ahí
desde siempre**.

Regla nueva: en la intro, nada que tenga que verse depende de un tween.

Y de paso apareció el que los rompía: `temblor()` era un tween infinito con
valores **relativos** sobre x/y, así que capturaba la posición al arrancar y
oscilaba alrededor de ESE punto para siempre, pisando cualquier entrada.

### `pose_corriendo_v2` no era un problema de muestreo

Avisaste que "da naranja donde debería dar celeste". Midiéndola: **es un rival**
— camiseta naranja a rayas, número 7, de espaldas. No es un error de medición,
es qué hay en el archivo. Entró como `r_corriendo`.

### Dos cosas que costaron una captura cada una

- **La pelota vieja llenaba la pantalla.** La textura `ball` original mide
  **16x16** y todo el juego la escala contra eso; el PNG mide **1500x1496**, así
  que cada `setScale(2)` la volvía de 3000 px. En la captura, el panel entero
  era la pelota. Ahora se **rasteriza a 16x16**: el archivo no se toca y los
  `setScale` de todo el juego siguen valiendo sin cambiar ninguno.
- **El cuentagotas por franjas fallaba en ocho poses, no en tres.** Muestreaba
  una banda "cabeza" y una "torso", y en cuanto la figura no está parada de
  frente —las acostadas del arquero, las de espaldas— la banda de la cabeza cae
  sobre la camiseta y devuelve celeste como piel. El segundo método clasifica
  cada píxel por lo que **es** y no depende de dónde esté cada parte del cuerpo.

---

## 1 · LA TABLA: ARCHIVO → MANIFEST → DÓNDE SE VE

### Retratos (A1) — `data/portraits_manifest.json` → `personajes`

| Archivo | Entrada | Dónde se ve |
|---|---|---|
| `retrato_nelda.png` | `data/tribuna.json` → `nelda.retrato` | El cuadro de la tribuna, arriba, todo el partido |
| `retrato_tuli.png` | `data/tribuna.json` → `tuli.retrato` | El cuadro de la tribuna, abajo |
| `retrato_nito.png` | `personajes[].id = nito` | La entrevista después de la fecha — reemplazó el muñeco geométrico |
| `retrato_dt.png` | `personajes[].id = dt` | **CARGADO Y SIN USAR** |
| `retrato_utilero.png` | `personajes[].id = utilero` | **CARGADO Y SIN USAR** |

Los cinco viven en `personajes` y **no** en el pool `retratos`: ese pool el
partido lo usa para dar cara al azar, y si estuvieran ahí Nelda podría salir de
defensora del rival.

### Poses propias (A2) — `data/poses_manifest.json` → `poses`

| Archivo | id | Tono medido | Dónde se ve |
|---|---|---|---|
| `pose_quite.png` | `quite` | piel `#f6c69a` · cam `#72bce6` | Disponible: el quite de pie (pedido de arte de P11, ya cubierto) |
| `pose_volea.png` | `volea` | `#fbc69a` · `#82b5e4` | Disponible: la variedad del remate |
| `pose_tiro.png` | `tiro` | `#fec391` · `#5ebaed` | Disponible · `alto_rel 0.97` |
| `pose_pase.png` | `pase` | `#f2be91` · `#61a6d3` | Disponible |
| `pose_cabezazo_v2.png` | `cabezazo_v2` | `#cb8a62` · `#65bde4` | Disponible |
| `pose_cansado.png` | `cansado` | `#fed1aa` · `#00c2ee` | Disponible: sin aire |
| `pose_celebracion.png` | `celebracion` | `#fac194` · `#8cc5e9` | Disponible |
| `pose_de_espaldas.png` | `de_espaldas` | `#c28a6d` · `#4daae6` | **P6-B**: es la pieza que pedía el modo profundo |
| `pose_de_espaldas_sin_pelota.png` | `de_espaldas_sin_pelota` | `#f4bd91` · `#71b8dd` | **P6-B** |
| `pose_recibiendo.png` | `recibiendo` | `#fabb8b` · `#71b2de` | **P6-B**: el que espera el pase largo |
| `pose_arquero_ataja_celeste.png` | `arquero_ataja_celeste` | `#ffcb9f` · `#23659d` | TU arquero, en el cine |
| `pose_arquero_despeje_celeste.png` | `arquero_despeje_celeste` | `#f6be92` · `#7bbbde` | TU arquero |
| `pose_arquero_vuela_celeste.png` | `arquero_vuela_celeste` | `#da9b73` · `#8dbedb` | TU arquero · **`alto_rel 0.58`** |

### Poses del rival (A2)

| Archivo | id | Tono | Dónde |
|---|---|---|---|
| `pose_corriendo_v2.png` | `r_corriendo` | naranja `#fa6d1a` | **Es un rival**, no el héroe |
| `poseR_arquero_vuela.png` | `r_arquero_vuela` | `#fdba8b` · `#fd7a32` | El arquero rival · **`alto_rel 0.51`** |
| `poseR_quite.png` | `r_quite` | `#fcb683` · `#dc7c4a` | El quite del rival |

### Siluetas de hinchada (A4) — `poses_manifest.json` → `hinchada`

`hincha_parado` · `hincha_mate` · `hincha_bombo` · `hincha_bandera` ·
`hincha_bebe` → **la tribuna del panel, todo el partido**. Reemplazaron 26
siluetas idénticas de Graphics. La **mezcla varía con la división**
(`hinchada.mezcla`): en Primera B hay gente parada y algún mate; en el Mundial
aparecen el bombo y las banderas.

### Objetos y utilería (A5)

| Archivo | id | Dónde se ve |
|---|---|---|
| `pelota_vieja.png` | `pelota_vieja` | **En todas partes**: reemplaza la textura `ball`, así que la heredan el panel, el mapa, el cine, el jugadón, la definición y la intro |
| `calden.png` | `calden` | **CARGADO Y SIN USAR** |
| `arco.png` | `arco` | **CARGADO Y SIN USAR** |
| `banco.png` | `banco` | **CARGADO Y SIN USAR** · `alto_rel 0.44` |
| `banderin.png` | `banderin` | **CARGADO Y SIN USAR** |
| `arbitro_amarilla.png` | `arbitro_amarilla` | **CARGADO Y SIN USAR** |

### Claude Design (D1-D4) — `assets/ui/`

| Archivo | Dónde se ve |
|---|---|
| `bg-04-tierra-pasto-seco.png` | Intro plano 2 · **la pelota vieja quieta** (era el negro de 2 s) |
| `bg-01-cielo-atardecer.png` | Intro plano 3 · el grito |
| `bg-05-horizonte-molino.png` | Intro plano 4 · la ráfaga |
| `bg-02-alambrado-campo.png` | Intro plano 5 · el silencio |
| `bg-03-tribuna-tablones.png` | Intro plano 6 · el arquero |
| `bg-06-noche-luces.png` | Intro plano 7 · el gol |
| `pampa-star-logo.png` | La compuerta de inicio **y** el plano final de la intro |
| `pampa-star-logo-horizontal.png` | La franja de arriba del menú del Master |
| `escudo-club.png` | El escudo de **tu** club, en la tabla y donde se dibuje |
| `cartel-pueblo.png` | Intro plano 1, con **el nombre de tu pueblo** escrito encima |

---

## 2 · DECISIONES QUE TOMÉ YO

**1. El modo profundo no revive `mundoLayer`.** Vive adentro de `panelLayer`,
así que hereda su máscara. *Revertir*: `vista.profundo.activo = false`.

**2. Lo que NO corta de cámara** — gambeta, quite, corte, bloqueo, pared,
cabezazo — está fijado por test: el corte se gasta si se usa siempre.

**3. `alto_rel` en vez de escalar por ancho.** Una sola perilla por pieza, en el
manifest, con la medida que la justifica escrita al lado.

**4. Los tonos que no se pueden medir bien no se declaran.** Teñir con un color
equivocado se ve peor que no teñir. Al final las 16 dieron medición confiable.

**5. La pelota se rasteriza a 16x16.** Es el único tamaño que no obliga a tocar
los quince `setScale` del juego. *Revertir*: `ball_gajos` guarda la original.

**6. `pose_corriendo_v2` entró como rival**, no como pose propia.

**7. Los fondos de la intro van con velo de luminosidad**, no recortados ni
cambiados. Entre 0.5 y 0.8 según el plano.

**8. El cartel del pueblo dice el nombre del save.**

**9. Dejé puesta la tipografía A (Archivo Black + Pixelify).** La B (Bowlby One
+ VT323) está cableada y el par exacto para copiar está en
`balance.tipografia._LAS_DOS_CANDIDATAS`.

---

## 3 · LO QUE QUEDA ABIERTO

### ⚠ El peso: los PNG suman 38 MB y la carga pasó a ~12 segundos

No los reprocesé porque estaba pedido explícitamente, y está bien que las
fuentes queden intactas. Pero **la primera carga del partido pasó de
instantánea a unos doce segundos**, y eso lo va a sufrir cualquiera que abra el
juego en el teléfono con datos.

Las 32 piezas son PNG de 700 KB a 2 MB cada una, a resoluciones de 1000-2000 px
que el juego muestra a 200-400. Las diez de Claude Design, en cambio, pesan
2,7 MB **entre todas**.

Lo que yo haría, y no hice porque no estaba pedido: generar una copia `.webp` al
80% para producción dejando los PNG como fuente. Es una decisión tuya.

### Sin usar, cargados y listos
El DT, el utilero, el caldén, el arco, el banco, el banderín y el árbitro con la
amarilla. Ninguno tenía un lugar natural donde entrar sin inventarle una pantalla.

### De antes
- La física del súper tiro sigue corriendo solo en los tests.
- Los 7 puntos de legibilidad de la tanda de cierre.
