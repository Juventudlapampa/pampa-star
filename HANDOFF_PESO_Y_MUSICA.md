# HANDOFF — EL PESO, EL CIERRE Y LA MÚSICA

Dos tandas, las dos cerradas. Modo autónomo.

| Tanda | Qué | Commit |
|---|---|---|
| **W1-W3** | el peso, los siete sin usar, la pose mal clasificada | `3f3b088` |
| **M1-M5** | la música por archivos | `c0bc2a5` |

Suite: **43 archivos verdes** · §11 limpia · árbol limpio.

---

## EL NÚMERO

| | Antes | Después |
|---|---|---|
| Assets que pide el juego | **34,01 MB** | **3,59 MB** |
| Música | sintetizada | **3,9 MB** de OGG Opus |
| **Total del link** | **34 MB** | **7,5 MB** |

Medido con el mismo método antes y después: bajar el set entero con
`cache: no-store` y sumar bytes, que es lo que le pasa a alguien que abre el
link por primera vez.

---

## 1 · CÓMO SE HIZO, Y LO QUE CASI SE ESCAPA

**No hay `cwebp` ni ImageMagick en esta máquina** — el `convert` que aparece en
el PATH es el de Windows y no tiene nada que ver. Pero Chrome tiene un
codificador WebP de verdad detrás de `canvas.toBlob`, y el juego ya corre en un
navegador con un servidor de capturas que escribe a disco. Se convirtieron las
58 piezas dibujando cada PNG en un canvas **del mismo tamaño** —sin reescalar
nada— y escribiendo el resultado. Cero fallos.

**Dos cosas que casi se escapan, y las dos por el mismo motivo** (mi barrido
miraba solo `archivo` en el manifiesto):

- **Los cuadros de los ciclos** se declaran adentro de la pose
  (`ciclo.cuadros`), no como archivo suelto. Quedaron en PNG un rato aunque el
  juego sí los pide.
- **Los seis fondos de la intro** se cargan con la ruta armada por
  concatenación (`"../assets/ui/" + k + ".png"`), así que el reemplazo por
  regex no la veía.

Las dos aparecieron mirando qué PNG habían quedado en las carpetas, no
suponiendo que estaba todo.

### El procedimiento quedó documentado
**`docs/COMO_PESAN_LOS_ASSETS.md`** tiene el paso a paso completo, por qué 88 es
la calidad correcta *para este arte* (cel shading de tres tonos: superficies
planas, que es el caso donde WebP no tiene casi nada que tirar), y qué no hay
que hacer.

### El guardián
`phaser/test/w1_peso.test.js` — ningún asset declarado puede ser `.png`, lo que
carga no puede pasar de **8 MB**, la fuente tiene que seguir existiendo, y toda
pieza apagada tiene que decir dónde iría.

**La trampa que evita es concreta:** que la próxima tanda entre en PNG "por
ahora" y nadie se entere hasta que alguien vuelva a cronometrar.

---

## 2 · DECISIONES QUE TOMÉ YO

**1. Los PNG no se borran: se archivan.** Viven en `assets/_fuente/`, fuera de
lo que carga el juego. La copia `.webp` **deriva** del original; si se pierde el
PNG no se puede regenerar con otra calidad ni medir la geometría de un ciclo.

**2. Los siete sin usar se APAGAN, no se sacan.** `cargar: false` en el
manifiesto: la pieza sigue en el repo —guardada no cuesta nada— pero deja de
costar ancho de banda en cada arranque. Y **cada una dice dónde iría**, porque
sin eso nadie la prende nunca:

| Pieza | Lugar propuesto |
|---|---|
| `calden`, `arco` | los fondos |
| `banco` | la semana |
| `banderin` | el córner, cuando exista como situación |
| `arbitro_amarilla` | un evento de amarilla, que hoy no existe |
| `dt`, `utilero` | la semana — el DT te mira cuando elegís descansar |

**3. El test de ciclos mide sobre el PNG fuente.** El lector mínimo de PNG no
abre webp, pero la copia se generó al mismo tamaño, así que la caja de la figura
es idéntica — y la fuente es la autoridad sobre la geometría.

**4. Con archivos, el partido tiene UN tema.** El sintetizador cambiaba de tema
con cada cambio de posesión, y funcionaba porque era síntesis: un motivo que
crecía. Con archivos eso sería un corte de pista cada tres segundos. Ahora lo
que cambia es el **momento** (entrada → partido → tramo final), no la posesión.
*Revertir*: sacar la guarda `hayArchivo("partido")` en `cambioDePortador`.

**5. El Master tiene música por primera vez.** Se salía del partido y quedaba en
silencio hasta el siguiente. Ahora `espera` en la tabla y `semana` en las
decisiones, con la misma alternancia por fecha.

**6. El duck ahora baja también los archivos.** Antes solo bajaba el bus del
sintetizador, así que con archivos la regla del volumen no habría hecho nada.

---

## 3 · LO QUE QUEDA ABIERTO

### Lo que no pude verificar acá
**Que el loop no chasquee al oído.** El navegador headless no reproduce audio
sin gesto de usuario. Lo que sí verifiqué es el **mecanismo**, que es la
condición de M1: loop nativo del elemento `Audio`, y `currentTime` tocado
únicamente junto con `pause()` — nunca durante la reproducción. Hay un assert
que cuenta los dos usos y falla si alguien mueve el cabezal mientras suena.

Queda para vos: abrir el juego, quedarte un minuto en la semana y escuchar.

### Los dos temas de reserva
`Cielo_de_victoria` y `Fuerza_de_un_León` quedan declarados en `audio.json` sin
destino. Cortan en 18,5 compases, así que para usarlos en loop hay que
recortarlos — y eso lo tenés que hacer vos, porque recortar audio es
exactamente lo que M1 me prohíbe.

### De antes
- La física del súper tiro sigue corriendo solo en los tests.
- Los 7 puntos de legibilidad de la tanda de cierre (AGUANTE y ENVIÓN a 7,2 px
  reales en teléfono es el peor).
- Jugar una temporada entera del Modo Master de punta a punta.
