# HANDOFF — ORDEN DE TRABAJO CONTINUA (modo autónomo)

Corrida del 16/ago. Cinco tandas pedidas, **dos cerradas**. Lo que no entró
está listado abajo con nombre y apellido, no escondido.

| | Punto | Estado | Commit |
|---|---|---|---|
| **T0** | A1 techo de stats · A3 resaca · A4 descenso | ✅ | `0194e4d` |
| **T1** | G1 todo remate es gol | ✅ | `2f598c0` |
| **T1** | G2 cobertura de animación | ✅ | `f4e748c` |
| **T1** | G3 hacia dónde corren los que no tienen la pelota | ✅ | `07bc572` |
| **T2** | O1 opciones en un solo lugar · O2 entrevista de origen | ❌ no empezado | — |
| **T3** | N1 tribuna · N2 rival se adapta · N3 escudos · N4 la semana | ❌ no empezado | — |
| **T4** | V1 jerarquía, espacio, alineación, cantidad | ❌ no empezado | — |

Suite: **26 archivos verdes**. Sección 11 limpia en 42 archivos.

---

## TANDA 0 · LAS TRES DECISIONES

### A1 · Techo de stats → rendimiento decreciente

`rendimiento()` en `logic/semana.js`: cada punto de entrenamiento vale
`(techo − stat)/(techo − inicial)`, con piso `rendimiento_piso`.

El pedido traía **dos** criterios a la vez, y son los dos los que fijan la
curva: entrenando siempre el mismo stat hay que tocar el techo *cerca del
final, no antes de la temporada 4*, y con estrategia mixta *nunca*. Barrido:

```
rendimiento_piso   0.10   0.13   0.16   0.19   0.25
entrenar toca      s80    s73    s68    s64    s58
mixta toca         nunca  nunca  nunca  nunca  nunca
```

Quedó **0.13**: el techo llega en la semana 73, que es el arranque de la quinta
y última temporada. Curva del tiro entrenando siempre:
`s18 76.3 · s36 88.3 · s54 94.1 · s72 98.8 · s90 99`. Con mixta se termina en
91.3 sin tocarlo.

### A3 · La resaca de la semana → sí, suave

`lunesDespues` devuelve `resaca` = un tercio de lo que faltó para llenar el
tanque (`resaca_frac 0.33`); `nuevaSemana` la resta con piso `resaca_piso`.

**El piso quedó en 50 y no en 35** porque es lo que separa las estrategias:

```
energía de arranque, ya estabilizada:   entrenar 50 · mixta 60 · descansar 88
```

Con 35 entraba una sola actividad por semana y las tres estrategias se
igualaban; con 60 o más entrenar y mixta arrancan iguales y la resaca deja de
notarse. Con 50 entran dos y las tres curvas quedan separadas.

### A4 · Descenso → los dos últimos

`zonaDescenso` / `enZonaDescenso` / `veredicto` en `logic/temporada.js`, con
`partido.descenso_plazas = 2`. Solo muerde a quien ya ascendió: en `primera_b`
no hay a dónde bajar y no hay zona.

En pantalla, verificado en vivo (capturas en `.claude/shots/`):

- la tabla marca la zona **por forma además de color** — `▼` en la fila y una
  línea de corte donde empieza la zona;
- el aviso aparece desde que entrás en zona, no al final:
  `▼ ZONA DE DESCENSO · 10º · si termina así te vas a PRIMERA A (faltan 6)`;
- el veredicto lo dice con todas las letras: `▼ DESCENSO · terminaste 10º y
  bajás a PRIMERA A`, y NUEVA TEMPORADA arranca en `primera_a`.

### El efecto secundario que no escondo

La resaca clava la energía en un valor fijo por estrategia, así que el resumen
de la semana tiene menos de dónde variar: **con mixta el texto más repetido
pasó de 79% a 94%** de las 90 semanas. Es la deuda A2, declarada cerrada en la
orden. Queda impresa en cada corrida de la suite con el número adentro.

---

## TANDA 1 · BUGS DE JUEGO

### G1 · Todo remate es gol

**No faltaba penalización por distancia: estaba mal aplicada.** `prepararRemate`
ya restaba poder desde `tiro_lejos_desde`, pero `duelChance` está topeada en
0.95, así que en cuanto el poder le sacaba ~26 puntos al arquero la chance
quedaba pegada al techo y los metros no movían nada. Antes:

```
crack (tiro 85) vs arquero normal
área chica 95% · área grande 95% · borde 95% · MEDIA CANCHA 95% · campo propio 91%
```

Las tres primeras daban idéntico porque `tiro_lejos_desde` valía 380 px: el
área grande entera tenía penalización cero. Y el Caldén ni la calculaba.

Ahora la distancia viaja cruda hasta `resolveShot`, que la aplica como **factor
después del tope**, con curva `1/(1+t³)` — plana adentro del área, se derrumba
afuera:

```
crack (tiro 85) vs arquero normal
área chica 95% · área grande 91% · borde 62% · MEDIA CANCHA 10% · campo propio 4%

Caldén/megatiro (tiro 70), aguanta más metros pero ya no es inmune
área chica 95% · área grande 94% · borde 87% · media cancha 38% · campo propio 20%
```

**El arquero ahora interviene.** El no-gol se reparte en tres: de lejos se va
*afuera* (ni le llega); de lo que le llega, *la agarró* (se la queda, perdés la
pelota) o *la sacó al córner* (no la retuvo: **conservás la posesión** y reponés
desde el vértice). El córner es lógica nueva y una consecuencia real, no un
cartel — todavía sin escena de saque de esquina.

Calibración: con la base de retención en 0.5 el arquero mandaba 566 al córner y
agarraba 76. Con 0.75 quedó 306 contra 322.

Los cuatro caminos de remate resolvían el no-gol cada uno por su lado con un
`else P.tiroFallado(st)` — por eso el córner no existía en ninguno. Ahora todos
pasan por `desenlaceRemate()`.

### G2 · Cobertura de animación

El método es el punto: la tabla ya había mentido dos veces por leer el
manifest. Esta vez se instrumentó la escena viva envolviendo `add.sprite` y
`add.image`, disparando cada acción con el rng forzado a cada desenlace y
**contando las figuras que la escena crea**.

**El hallazgo**: en tres de los cinco caminos defensivos el defensor salía con
`pose_pared` — el toque de primera, que es una pose de *ataque*. Y el corte
pintaba a los dos jugadores barriéndose. Arreglado con `poseRival` explícito:

```
quite · gana     poseR_gambeta_pierde + pose_barrida    (era pose_pared)
quite · pierde   poseR_gambeta_gana   + pose_corriendo  (era pose_pared)
corte de pase    pose_barrida         + poseR_gambeta_pierde
bloqueo · gana   pose_bloqueo         + poseR_remate    (ya estaba bien)
bloqueo · pierde poseR_gambeta_gana   + pose_barrida    (era pose_pared)
```

### G3 · Hacia dónde corren los que no tienen la pelota

El criterio existía en el código pero no estaba escrito, así que no había con
qué comparar. Ahora está arriba de `phaser/test/g3_sin_pelota.test.js`, con un
assert por regla corriendo sobre la lógica real. Resumen: el DEF acompaña hasta
el 55% y en defensa nunca queda delante de la pelota; el VOL sigue el juego; el
ATA se descuelga, se abre y **nunca retrocede**, y en defensa no cruza el 42%;
el rival usa la misma IA espejada.

Medido: 280 px de movimiento del volante contra 0 del defensor cuando la pelota
cruza medio campo · 0 retrocesos del delantero en 40 latidos · nadie se sale de
su banda.

---

## PEDIDOS DE ARTE

1. **`pose_volea`** — no existe. La volea usa `pose_remate`, que es razonable
   pero no es la jugada. Una figura pegándole a la pelota en el aire de
   costado, misma escala y alpha nativo que las demás de `assets/poses/`.
2. **`pose_quite`** — tampoco existe. Hoy el defensor que gana usa `barrida`,
   que es lo más cercano. Si querés distinguir "se tiró al piso" de "metió la
   pierna sin irse al suelo", hace falta la segunda.
3. Siguen pendientes de tandas viejas: las 3 poses de arquero
   (`arquero_parado`, `arquero_vencido`, `arquero_despeje`) con la camiseta en
   el mismo celeste `#54bcec`.

---

## DECISIONES QUE TOMÉ YO

La orden decía que no frenara y eligiera. Esto es lo que elegí, por qué, y cómo
se revierte.

**1. `rendimiento_piso = 0.13`** (A1). Los dos criterios del pedido dejaban un
rango; elegí el valor que hace que el techo caiga en la semana 73, o sea al
empezar la última temporada, porque "cerca del final" es un hito legible.
*Revertir*: `balance.semana.rendimiento_piso`. Más alto = el techo llega antes.

**2. `resaca_piso = 50`** (A3, el pedido decía "un piso" sin número). Es el
único valor del barrido que deja las tres estrategias con energías distintas y
permite dos actividades por semana. *Revertir*: `balance.semana.resaca_piso`.

**3. El córner conserva la posesión** (G1). El pedido pedía que "la sacó al
córner" existiera y se viera, sin decir qué consecuencia tiene. Sin sistema de
saque de esquina, elegí lo que hace que los dos resultados signifiquen algo
distinto: la agarrada te hace perder la pelota, el córner no. *Revertir*: en
`desenlaceRemate()`, cambiar `P.cornerMio(st)` por `P.tiroFallado(st)`.

**4. `tiro.retiene_base = 0.75`** (G1). Con 0.5 el arquero casi nunca retenía
—566 córners contra 76 agarradas— porque el poder del rematador le gana siempre
por diseño. *Revertir*: `balance.tiro.retiene_base`.

**5. El defensor usa `barrida` y `corriendo`** (G2). No hay pose de quite; elegí
las dos que ya existen y que coinciden con lo que dice el subtítulo de cada
escena. *Revertir*: los `poseRival` de `match.js`, o mejor, encargar el arte.

**6. Separé `BLOQUEA_TECHO` de `BLOQUEA_TEXTO`** en el test de carrera. A1 está
decidido y bloquea; A2 está declarado cerrado por la orden y bloquear por él
trabaría todo commit. *Revertir*: `BLOQUEA_TEXTO = true`.

---

## LO QUE NO PUDE VER EN PANTALLA

Un solo punto, y lo digo porque la regla es que lo declarado hecho tiene que
haberse visto: **el cartel "¡LA SACÓ AL CÓRNER!" no lo pude capturar en píxeles**.
En el entorno de preview headless, cualquier `add.text` dentro de la escena del
partido falla de forma intermitente (`Cannot read properties of null (reading
'context')`) — se reproduce con un `add.text` trivial, así que no es del
cambio. Lo que **sí** verifiqué en el partido real:

- forzando el córner en una fecha del Modo Master, la posesión queda `"mia"`, el
  jugador aparece en x=1020 de 1050 (el vértice) y el contador sube;
- los cuatro carteles, pedidos a la escena viva: `¡GOOOL!` (posesión rival,
  +1 gol), `¡LA SACÓ AL CÓRNER!` (posesión mía, al vértice), `¡LA AGARRÓ!`
  (posesión rival), `¡AFUERA!` (posesión rival).

---

## DECISIONES ABIERTAS PARA RODRI

1. **La línea de defensa no sube con la pelota.** En ataque el destino del
   defensor depende solo de su base (+`def_apoyo`), no de dónde está la pelota:
   por eso se mueven 0 px mientras el equipo avanza medio campo. Cumple el
   criterio escrito, pero un equipo real sube la línea. Cambiarlo mueve el
   balance del partido.
2. **La gambeta perdida no dibuja la pelota** (2 figuras contra 3 de los otros
   desenlaces). Puede ser correcto —la perdiste, se la lleva él— pero es una
   diferencia real.
3. **La deuda A2**: el resumen de la semana repite el mismo texto el 94% de las
   veces en dos de las tres estrategias. Pagarlo toca el valor de las 10
   opciones de `data/semana.json`, que es balance de carrera.
