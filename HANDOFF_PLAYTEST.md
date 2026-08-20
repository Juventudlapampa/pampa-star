# HANDOFF — PLAYTEST DE RODRI

Los once puntos, en orden. Modo autónomo.

| # | Qué | Commit |
|---|---|---|
| **P1** | el segundo partido de la carrera: eran DOS bugs | `dc2acdd` |
| **P2** | el arquero vive en el arco, no en la pantalla | `907b05e` |
| **P3** | el trámite se ve: faltaba una capa visible | `2b9ed33` |
| **P4** | Nelda y el Tuli tienen cara | `03361ed` |
| **P5** | la música corta, y queda la perilla para cambiarla | `4a55120` |
| **P6** | propuesta de composición (sin implementar) | `d99a52a` |
| **P7** | la gambeta deja de ser siempre la misma | `6ad348d` |
| **P8** | el quite tiene su momento | `df8ceda` |
| **P9** | las tres tipografías, para elegir mirando | `428d5d1` |
| **P10** | la intro cuadro por cuadro: la lista | `ddf5533` |
| **P11** | los pedidos de arte | `f461d6a` |

Suite: **39 archivos verdes** · §11 limpia (900 asserts) · árbol limpio.

---

## LO QUE MÁS IMPORTA DE TODA LA TANDA

**Los tres bugs eran el mismo bug.** No lo esperaba, y es lo más útil que salió.

`mundoLayer.visible === false` desde la pantalla partida de V7-1. Todo lo que
se dibuja ahí sigue ejecutándose perfecto y **nadie lo ve**:

- **P3** — la animación del quite y del remate en el trámite corre ahí. Por eso
  "pateo y no pasa nada". Ya se había buscado dos veces *qué escena faltaba*;
  no faltaba ninguna.
- **P8** — la entrada del que sale a interceptar corre ahí. Por eso "no se ve
  que va".
- **P1** — no es la misma capa, pero es el mismo tipo de falla silenciosa: una
  bandera que no se apagaba y una referencia a un objeto muerto.

Los tres fallaban **en silencio**. Ninguno tiraba un error. Por eso volvían.

Lo que cambié además del síntoma: ahora hay contadores. `_tramitesMudos` cuenta
las acciones que no se pudieron mostrar, y los guardianes de P1 barren el
archivo buscando banderas y caches que sobrevivan al partido. **Un contador que
se puede leer es la diferencia entre un bug que se encuentra y uno que vuelve.**

### P1 en detalle, porque cortaba la carrera entera

Phaser NO crea una escena nueva en `scene.start("match")`: reusa la misma
instancia y solo vuelve a correr `init()` y `create()`.

1. `_finalApagado` se prende al terminar el partido y nunca se apagaba. En la
   fecha 2, `dibujarRadar()` salía en el primer renglón: **el mapa quedaba
   vacío** —sin cancha, sin jugadores, sin "◄ TU ARCO"— para el resto de la
   carrera.
2. Arreglado eso aparece el segundo, que es el que rompe todo: `_radarTuArco`
   es un cache perezoso. El texto muere con la escena anterior pero la
   referencia sobrevive, así que la guarda `if (!this._radarTuArco)` da falso,
   no lo recrea, y le manda `setText()` a un objeto destruido. **Crash por
   frame**, y con él se cae el update entero del partido.

Verificado jugando la fecha 1 entera y entrando a la 2, en la misma instancia
de escena: el mapa pasó de **7 comandos de dibujo a 747**.

---

## 1 · DECISIONES QUE TOMÉ YO

**1. El trámite se dibuja en el panel, no revivo `mundoLayer`.** Prender esa
capa traería de vuelta la vista vieja encima de la pantalla partida. *Revertir*:
sacar el bloque `if (this._split)` de `animarResolucion`.

**2. Los retratos de Nelda y el Tuli son futbolistas prestados.** El banco son
once varones jóvenes: no hay nadie que sea una mujer grande ni un gordito
supersticioso. Elegí los dos que menos desentonan y lo dejé anotado **dentro
del propio JSON**. *Revertir*: cambiar el campo `retrato` en `data/tribuna.json`.

**3. La distinción entre las dos cajas de diálogo es por lugar y forma**
(escalón de 28 px + flechas ▲▼ + aro), con el color solo como refuerzo.
*Revertir*: `SANGRIA = 0` en `tribuna_ui.js`.

**4. La música se traba en vez de parchear al llamador.** Con el partido
terminado, `musica()` no deja pasar nada que no sea el silencio, así que da
igual quién la llame. *Revertir*: sacar `_musicaTrabada`.

**5. Inventé un tema de cierre** (`musica.temas.final`, lento y bajo) porque
cortar en seco sonaba a bug. Dura `musica.final_ms`; en 0 corta seco.

**6. La perilla de música son ARCHIVOS que mandan sobre el sintetizador.** No
había archivo que reemplazar —la música es chiptune generado— así que hice que
`musica.archivos` acepte una ruta por tema: el que tenga archivo suena de
archivo, el que no, sigue sintetizado. Se pueden cambiar de a uno.

**7. En P7 la resolución del obstáculo NO tiene azar.** El gesto correcto pasa
siempre y el equivocado nunca. El azar sigue viviendo en el duelo cara a cara.
Si vas a pedir que el jugador lea, la lectura tiene que valer. *Revertir*:
volver a `cruceGambeta` en `jugadonMovida`.

**8. Los obstáculos que no podés pasar no aparecen.** El caño pide 70 de
gambeta, así que abajo de eso el obstáculo "firme" no sale en tu secuencia.

**9. En P8 el que sale a buscarla es una SILUETA, no la figura del jugador.**
Es como el panel ya representa a los rivales cerca, y no depende de una pose
que puede no existir.

**10. Dejé puesta la tipografía actual (A).** No cambio la pinta del juego sin
que elijas; las tres están cableadas y capturadas.

**11. Recomiendo la opción B de P6** (la cancha profunda en el pase largo).
Está argumentado en el documento: es lo que ataca exactamente lo que nombraste,
usa maquinaria que ya está construida y testeada, y es el primer paso de la C
—así que si sale bien no es trabajo tirado, y si sale mal se apaga con un flag.

---

## 2 · PEDIDOS DE ARTE

Están todos en **`docs/P11_PEDIDOS_DE_ARTE.md`**, con qué es cada pieza, dónde
se usaría y qué se ve hoy en su lugar. Los cuatro que más cambian:

1. **Nelda y el Tuli** — hoy tienen cara prestada de futbolista.
2. **Seis fondos para la intro** — siete de sus ocho planos son negro puro.
3. **Jugador de espaldas + recibiendo de frente** — son exactamente las dos
   piezas que habilitan la opción B de P6.
4. **La pelota vieja de potrero** — cambia la clase social del juego entero con
   una pieza de 32 px.

---

## 3 · LO QUE QUEDA ABIERTO

### Esperando que elijas
- **P6** — qué camino (A, B o C). Sin esto no arranca el cambio más grande que
  le queda al juego.
- **P9** — qué tipografía. Ojo con la C: **rompe la maqueta** en dos lugares y
  se ve en la captura.
- **P10** — si se arregla la intro y con qué alcance.
- **La física del súper tiro** (viene de la tanda anterior): hoy solo corre en
  los tests. O se revive o se retira.

### Lo que vi y no arreglé
- El "tocá para saltear" de la intro es ilegible en todos los planos.
- El plano 2 de la intro son 2 segundos de pantalla negra.
- El plano más largo del comienzo lo protagoniza un rival.
- Los 7 puntos de legibilidad de la tanda anterior siguen abiertos (AGUANTE y
  ENVIÓN a 7,2 px reales en teléfono es el peor).

### Lo que el entorno no me deja ver
Pasado el minuto ~40 de partido el preview headless rompe adentro del `setText`
de Phaser. El entretiempo y el final del partido siguen sin captura — es el
entorno, no el juego. Todo lo demás de esta tanda se verificó en pantalla.
