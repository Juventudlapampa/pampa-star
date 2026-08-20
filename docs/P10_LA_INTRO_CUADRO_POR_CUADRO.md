# P10 · LA INTRO, CUADRO POR CUADRO

Los 8 planos vistos uno por uno en 1366×768, capturados a la mitad de cada uno.
Capturas en `.claude/shots/P10_p1.png` … `P10_p8.png` (más `P10_00_compuerta.png`).

**Esto es la lista, no el arreglo.** Ninguno de estos puntos está tocado.

---

## LO QUE SE VE MAL, DE MÁS A MENOS GRAVE

### 1. EL PLANO 2 ES UNA PANTALLA NEGRA — 2 segundos
`P10_p2.png`. Literalmente negro, con dos barras diagonales gris oscurísimo
apenas visibles arriba a la derecha. Dos segundos enteros de nada al comienzo
de la intro, justo después del único plano que tiene fondo de verdad.

Es el peor: es el momento donde alguien piensa que el juego se colgó.

### 2. SIETE DE LOS OCHO PLANOS SON FIGURAS FLOTANDO EN NEGRO
Solo el plano 1 (el pueblo) y el 6 (fondo crema) tienen fondo. Los otros seis
son un dibujo recortado sobre negro puro. Como secuencia, la intro se lee como
*"pantalla negra con dibujos que aparecen"*, no como una película.

Es lo mismo que Rodri señaló en P6 pero acá: **no hay espacio, hay figuras.**

### 3. EL TEXTO DEL PLANO 1 SE LEE CORTADO Y CASI NO SE LEE
`P10_p1.png` muestra **"En algún pueblo de La Pamp"** — sin la "a" ni los
puntos suspensivos. A la mitad del plano el texto todavía se está escribiendo,
así que durante buena parte de los 3 segundos se lee una frase incompleta.

Y además: es texto claro con contorno finito sobre un cielo claro y un camino de
tierra claro. Es el texto peor contrastado de todo el juego.

### 4. EL PROTAGONISTA DE LA INTRO ES UN RIVAL
`P10_p3.png` — cuatro segundos, el plano más largo de la intro después del
título, y el que está en pantalla es un jugador de **camiseta naranja a rayas
con el número 4**, o sea un rival. El héroe (celeste, 10) recién aparece en el
plano 4.

El plano más largo del comienzo se lo lleva alguien que no sos vos.

### 5. EL PLANO 6 ROMPE LA PALETA
`P10_p6.png` es el único con fondo **crema claro** y rayos gris verdoso. Los
demás son negros o de paleta cálida apagada. En una secuencia de cortes secos,
ese cambio de valor pega como un flash — y no parece intencional, porque el
arquero que muestra no es un momento más importante que los otros.

### 6. "¡CALDENAZO!" NO SE VE EN SU PLANO
El plano 4 declara el texto `¡CALDENAZO!` pero a la mitad del plano no está en
pantalla (`P10_p4.png`): aparece más tarde, sobre 2 segundos. El grito de la
intro llega tarde a su propio plano.

### 7. EL PLANO 5 SON MIL MILISEGUNDOS DE UNA PELOTA Y TRES PUNTOS
`P10_p5.png`: una pelota blanca chica en el centro sobre negro, y "…" abajo.
Entiendo que es el silencio antes del estallido, pero con todo lo demás también
en negro no se lee como una pausa: se lee como otro plano vacío más.

### 8. EL "tocá para saltear ▸" ES ILEGIBLE
Está en todos los planos, abajo a la derecha, en gris oscuro sobre negro. Si es
la única salida de una intro de 20 segundos, tiene que verse. En el plano 1
(fondo claro) directamente desaparece.

### 9. EL TÍTULO NO TIENE MARCA
`P10_p8.png` — el plano final son 4 segundos con "DEL POTRERO AL MUNDIAL" en
texto chico centrado sobre negro. No hay logo, no dice PAMPA STAR, no hay
escudo. El cierre de la intro no nombra al juego.

---

## LO QUE SÍ ESTÁ BIEN

- Los **rayos de velocidad** de los planos 3, 6 y 7 funcionan: dan energía y
  encuadran la figura.
- El **plano 7** (el festejo con los brazos arriba y los rayos dorados) es el
  mejor de los ocho: figura, fondo y color diciendo lo mismo.
- El **plano 1** tiene la mejor ilustración de todas — el pueblo con los
  álamos. Es una pena que sea la única con fondo.
- La **compuerta** (`P10_00_compuerta.png`) hace lo que tiene que hacer y el
  texto se lee.
- Los cortes son **secos**, sin transiciones blandas. Eso está bien y es la
  doctrina del proyecto.

---

## LO QUE YO HARÍA, SI SE DECIDE ARREGLARLA

Por orden de cuánto mejora por lo que cuesta:

1. **Poner fondo en los seis planos negros.** Con lo que ya hay: el pasto y la
   tribuna del panel de partido, o el propio pueblo del plano 1 desenfocado.
   Es la que más cambia y no necesita arte nuevo.
2. **Cambiar el plano 2** por algo que se vea, o borrarlo y repartir sus 2
   segundos entre el 1 y el 3.
3. **Que el texto del plano 1 termine de escribirse en el primer tercio**, y
   ponerle una franja oscura detrás como la del relator.
4. **Dar vuelta los planos 3 y 4**: que el primero en aparecer seas vos.
5. **Subir el contraste del "tocá para saltear"**, que hoy es invisible.
6. **Cerrar con el nombre del juego**, no solo con la bajada.

Los tiempos ya son data (`balance.intro.planos_ms`), así que reordenar y
recortar no toca código.
