# LA BARRIDA · construido, probado, documentado y desconectado

Barrida de las seis zonas del juego buscando **condiciones que no pueden dar
verdadero y no tiran ningún error**. 44 agentes, 38 sospechas, **24 confirmadas
tras verificación adversaria** (cada hallazgo tuvo que sobrevivir a alguien
tratando de refutarlo). Más el censo mecánico de
`phaser/test/desconectados.test.js --censo`.

---

## EL NÚMERO

| qué se contó | cuántas |
|---|---|
| Funciones de lógica pura con **guarda de salida temprana que devuelve el argumento sin tocar** | **3** |
| … de esas, **correctas por diseño** (lista vacía → devolver el índice actual) | 2 |
| … de esas, que **estaban desconectadas** | **1** — `rendimiento()` |
| **Condiciones que no pueden dar verdadero nunca** (barrida, confirmadas) | **24** |
| … de esas, que **pierden contenido** del juego | **18** |
| … cosméticas | 3 |
| … intencionales (perillas viejas que se conservan a propósito) | 3 |
| Campos de escena/estado **leídos y nunca escritos** | 3 |
| Campos **escritos y nunca leídos** que no son asas ni sellos | 0 |
| Claves del registry sin consumidor | 0 |

**Y la respuesta a la pregunta que importa:** de las 24 confirmadas, **21 están
calibradas, documentadas o testeadas como si funcionaran**. Sólo 3 son huecos
silenciosos sin prosa alrededor.

Ese es el dato feo. No es que el código esté mal escrito: es que **la
documentación y los tests describen un juego que no es el que corre**.

---

## LA LISTA, ORDENADA POR CUÁNTO CAMBIA EL JUEGO SI SE CONECTA

Sin arreglar. Cada una con lo que se midió.

### 1 · La Definición está DADA VUELTA (no desconectada: invertida)

La más grave de todas, y no es un cable suelto — es un signo al revés.

`definicion_ui.js:481` arma la aguja como `p = 0.5 + (0.5 − pun) * 0.5`, donde
`pun = tiro/100*0.6 + (aguante/max)*0.4`. O sea: **cuanto mejor el pateador,
más lejos del punto dulce.**

Medido con el balance real (`zona_timing 0.2`, `dulce_bonus +8`, `floja_penal −22`):

| tiro | tanque | resultado |
|---|---|---|
| 58 | 100% | la pegó floja **−22** |
| 70 | 100% | la pegó floja **−22** |
| 82 | 100% | la pegó floja **−22** |
| 90 | 100% | la pegó floja **−22** |
| 99 | 100% | la pegó floja **−22** |

**Con el tanque lleno —que es como entrás a la Definición— comen −22 los cinco.**
El `dulce_bonus` de +8 no se ve nunca. Y para llegar al punto dulce hay que
estar fundido, tanto más cuanto mejor seas: con tiro 58 alcanza con bajar al
88% del tanque; **con tiro 99 hay que bajar al 27%**.

O sea que la fase ofensiva entera de la pantalla más importante del juego
premia al pibe fundido y castiga al crack, sistemáticamente.

> **Si se conecta:** cambia el resultado de TODA definición ofensiva. Es el
> cambio de balance más grande de la lista, y también el único que arregla algo
> que hoy está mal, no algo que hoy no está.

### 2 · Los 50 jugadores no tienen la stat que el JUGADÓN lee

`jugadon.js` pesa los cierres del defensor con `quite`, y `jugadon_ui.js` lo
saca de `d.stats.quite`. Contado sobre `data/roster_pampeano.json`:
**0 de 50 jugadores tienen `quite`.** El esquema son ocho claves y ninguna es
esa: `aereo, caracter, fisico, gambeta, pase, resistencia, tiro, velocidad`.

Resultado: el `|| 55` se cobra el 100% de las veces. `elegirCierre` pesa los
cuatro cierres como `[1, 1, q/50, q/60]` = **`[1, 1, 1.1, 0.9167]` SIEMPRE**, y
el comentario que dice «quite alto → más firme y se_tira» describe algo que no
pasa. Un central del Mundial y uno de Primera B cierran idéntico.

> **Si se conecta:** el JUGADÓN —la función estrella de la V8— pasa a tener
> variedad por rival y por división. Hoy no tiene ninguna.

### 3 · Tu arquero vale 55 en las tres pantallas donde debería decidir

Mismo origen: `definicion_ui.js:335` y `:537` y `escenas_v9.js:325` leen
`arq.stats.keeper`. **0 de 50 jugadores tienen `keeper`.** Tu arquero no cambia
con la división, ni con el club, ni con el jugador que te tocó.

### 4 · Entrenar aguante no hace absolutamente nada

`entrenar_aguante` es la **única** opción de la semana con `stat_mas: 2` (el
doble que las otras) y la más cara junto con `ayudar_casa`:

| opción | stat | sube | cuesta |
|---|---|---|---|
| entrenar_tiro | tiro | +1 | 25 |
| entrenar_gambeta | gambeta | +1 | 25 |
| **entrenar_aguante** | **resistencia** | **+2** | **30** |
| **ayudar_casa** | **resistencia** | **+1** | **35** |

`stats.resistencia` **no lo lee ningún motor**. La única línea que lo toca
(`match.js:308`) escribe `j.aguanteMax`, y `aguanteMax` como campo del jugador
tampoco lo lee nadie: **los 17 clamps de aguante de `partido.js` usan el global
`bal.aguante.max`**.

O sea: **las dos opciones más caras de la semana entrenan una stat muerta.**
Entrenás aguante toda la carrera y nunca aguantás más.

### 5 · Las dos cartas del ARQUERO son inalcanzables — el 25% del sistema

`cartas.js:79` exige `jugador.pos === carta.puesto`, y la mano se arma siempre
con el jugador que controlás. **Todos** los sitios que asignan `st.ctrl`
excluyen al arquero, y `cambiarA` lo rechaza explícitamente. LA TRANQUERA y EL
PATADÓN no se ven jamás — y `d_decisiones.test.js:48` certifica en verde que
existen. Hay una pose (`arquero_despeje_celeste`) que se carga en cada arranque
sólo para eso.

### 6 · El clásico no existe para casi nadie

`clasico` se resuelve buscando el nombre de tu pueblo **adentro** del nombre
del rival. Cruzados los dos catálogos: para **Toay, Eduardo Castex, Intendente
Alvear y Guatraché no matchea ningún rival de ninguna división**. De los seis
que sí, cinco matchean **sólo en Primera A** — y toda carrera empieza en
Primera B. Y hay dos derbis fallados por la subcadena: *Eduardo Castex* vs
*Ferrocarril de Castex*, *Intendente Alvear* vs *Alvear Fútbol*.

En Regional, Nacional y Mundial no matchea **nadie**.

### 7 · La rama de lesión nunca nace del partido

`this._golpeFuerte` se lee en `match.js:4079` y **no lo escribe nadie**. Y
`master.js:99` hace `save.molestia = lunes.molestia` sin condición, así que
cada lunes ASIGNA false — pisa incluso la molestia que sí produce la semana.

> **Si se conecta:** se enciende `penal_molestia` (15 puntos de energía menos al
> arrancar la semana) y las acciones de kinesiología pasan a ofrecerse. Es un
> cambio de balance real en toda la carrera.

### 8 · El cansancio y los defensores no cambian que la tires afuera

`tiro.js:108` calcula `riesgoFuera` con puntería y defensores, y **nadie lo
consume**: quien decide si se va afuera es `duel.resolveShot` con los cuatro
números cableados de la zona. Un jugador fundido pateando entre tres tiene
exactamente el mismo riesgo que uno entero y solo.

### 9 · El bonus de ánimo por meterla vos

`this._hiceGol` se lee en `match.js:4077` y no lo escribe nadie. Medido:
`lunesDespues` devuelve ánimo **78 con gol contra 72 sin gol**. Esos 6 puntos
(`semana.animo_gol`) no se cobran nunca.

### 10 · Nelda y el Tuli nunca hablan del cansancio

`data/tribuna.json` declara el evento `cansancio` y el mapa de `match.js:445`
no lo produce nunca. Es el único diálogo de la tribuna sobre el AGUANTE, que es
la economía central del partido. *(La tribuna en sí SÍ funciona — lo verifiqué:
`montar()` se llama y los datos están completos.)*

### 11 · `_teniaVis`

Se lee como `o._teniaVis !== false` y no lo escribe nadie, así que siempre da
verdadero. El default es el seguro, pero la intención era recordar cuáles
estaban ocultas: hoy al restaurar el panel se muestran también esas.

### 12-14 · Cosméticas

- `relatos.json` declara la situación `saque_arquero` y el juego no la pide jamás.
- Las cinco poses con `cargar: false` **se cargan igual**: `intro.js` no respeta la bandera.
- `this.hinchadaViva` no existe: en las escenas de cine la tribuna nunca cobra vida.

### Intencionales (no tocar)

- `balance.partido.calden` y `aguante.costo_calden`: perillas muertas, el Caldén real sale de `megacosas`.
- `resolverSuperTiro` y `ARCO`: ya documentado como física del jugadón que no corre en partido.
- `identidades_manifest.json`: `dorsal` y `tonos` sin lector.

---

---

## ESTADO AL CIERRE

De las **18 que perdían contenido**, quedan **4**, y las cuatro son decisiones
tuyas, no trabajo pendiente.

| # | qué | estado |
|---|---|---|
| 1 | La Definición dada vuelta | **arreglado** · `timing_desvio 0.30`, promedio de gol 62,1% → 63,6% |
| 2 | Los 50 jugadores sin `quite` | **arreglado** · Mundial 40,2% → 34,4%, abajo igual |
| 3 | Tu arquero siempre 55 | **arreglado** · promedio −1,2, rango 44,4% a 30,8% |
| 4 | Entrenar aguante no hacía nada | **arreglado** · +197 de tanque (+19,7%) |
| 5 | Las dos cartas del ARQUERO | **DEUDA** — decisión de diseño |
| 6 | El clásico | **arreglado** · 6/10 pueblos → 10/10 |
| 7 | La rama de lesión | **arreglado** · `golpe_prob 0.25`, 1 cada 7-8 fechas |
| 8 | `riesgoFuera` | **arreglado** · `riesgo_fuera_mult 0.35`, promedio −2,3 |
| 9 | El bonus de ánimo por el gol | **arreglado** · el techo llega en la fecha 3 en vez de la 4 |
| 10 | La tribuna y el cansancio | **arreglado** · *"Se le acabó la nafta"* |
| 11 | `_teniaVis` | **arreglado** · el pool ya no prende las tres siluetas al volver |
| 12 | `saque_arquero` de relatos.json | **DEUDA** — misma raíz que la 5 |
| 13 | Las poses con `cargar:false` | **arreglado** · 5 piezas dejan de bajarse |
| 14 | `hinchadaViva` | **la llamada muerta se sacó**, con el motivo escrito |

Más dos que aparecieron **mientras se arreglaban las otras**, y que ninguna
lista tenía:

- **`textoDeLaMano()`** — la línea de HUD con tu mano de cartas, escrita entera
  y sin un solo llamador. Jugabas sin saber qué cartas tenías. **Arreglado.**
- **`resumen()` cortaba en seco con la molestia** y se tragaba la energía y el
  ánimo. Esa rama nunca se había ejecutado; conectar la lesión la destapó y
  `carrera.test.js` la cazó en el acto. **Arreglado**, y las tres estrategias
  quedaron mejor que la línea base.

### La deuda: la de campo quedó en cero

```
  DEUDA CONOCIDA: 3 (tope aceptado: 3)
    0 de campo · 3 de contenido
      · el arquero no tiene momento
      · megadefensa TRANQUERA
      · física del súper tiro
```

**Dos de las tres son la misma pregunta: ¿el arquero vuelve a tener un momento
de decisión?** De ahí cuelgan LA TRANQUERA y EL PATADÓN (2 de las 8 cartas), la
megadefensa TRANQUERA, la situación `saque_arquero` y el arte
`arquero_despeje_celeste`. La V9 C1 sacó esa pantalla a propósito, así que
devolvérsela es diseño, no parche.

La tercera es la física del súper tiro, ya marcada **⚠ PENDIENTE DE RODRI** en
`jugadon_ui.js` desde antes de esta barrida.

> **Y una corrección sobre el guardián.** Contaba `_teniaVis` como deuda cuando
> ya estaba cableado: mi escritura era `this.panelSil[k]._teniaVis = false` y el
> escáner sólo reconocía receptores que fueran un identificador, no el resultado
> de un índice. O sea, **el guardián mintiendo sobre su propia lista** — la misma
> familia que vigila. Arreglado; ahora acepta `]` y `)` antes del punto.

---

## LO QUE SÍ SE CABLEÓ EN ESTA TANDA

Tres grupos, los de mayor pérdida de contenido, cada uno **visto funcionando en
pantalla** antes de declararlo:

1. **El nivel de carrera estaba clavado en 1.** `save.nivel` del clásico no
   existe (se calcula, no se guarda), así que `if (c && c.nivel)` era falso
   siempre. Se llevaba puestos los dos megatiros altos, las tres megadefensas,
   las dos secuencias y el botón IMPORTAR. Y una segunda capa debajo: ¡PAMPERO!
   y ¡MÉDANO! no tenían **ningún** llamador desde que D1 cambió el centro de la
   cruz de defensa.
2. **Los 28 eventos nunca se pudieron ELEGIR.** `vistaEvento()` —pantalla
   entera, terminada— vivía detrás de `if (!S || !D)`, una guarda que no se
   cumple nunca. 56 opciones, 56 efectos y 56 frases del relator, invisibles.
3. **Cinco de los doce efectos no los leía nadie:** `duelo` (pegaba en una sola
   de las cuatro vías de tiro), `arranque`, `final`, `recuperacion` y `keeper`.

---

## Y EL GUARDIÁN

`phaser/test/desconectados.test.js` enumera las tres formas del bicho y **falla
nombrando archivo, línea y síntoma**. Probado rompiéndolo a propósito: al sacar
`{ stats: this.statsDeHoy() }` de los llamadores se pone rojo con
*«CALIBRADA PERO DESCONECTADA · semana.js:133 rendimiento()»*, y al inventar un
`this._flagQueNadieEscribe` también.

La **DEUDA CONOCIDA** (los casos 7, 9 y 11 de arriba) está en una lista aparte:
no perdonada, **contada**. Se imprime en cada corrida y el test falla si aparece
una nueva o si una se cablea y no se saca.
