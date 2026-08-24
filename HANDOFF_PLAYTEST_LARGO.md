# HANDOFF · PLAYTEST LARGO

Cuatro bloques, cinco commits, suite de 45 archivos verde.

```
b6b3bd1  BLOQUE 1 · la musica vieja era UN bug: la puerta unica
3283083  BLOQUE 2 · el remate: cinco reportes, cuatro bugs, una familia
3ed52e6  BLOQUE 3 · D5 la entrevista, D2 la semana por accion, D3 su animacion
27b1f1d  BLOQUE 3 · D4 el mapa de La Pampa, D1 las cartas por puesto
(este)   BLOQUE 4 · las tres propuestas + HANDOFF
```

---

## 1 · LO QUE HICE Y VI FUNCIONANDO

Todo lo de esta lista lo verifiqué en pantalla, no solo en test.
Las capturas están en `.claude/shots/`.

### BLOQUE 1 · la música vieja

Los cinco lugares que reportaste eran **un solo bug**, con la misma forma que el
`mundoLayer.visible === false`: el sistema nuevo andaba perfecto donde estaba
conectado y el viejo seguía sonando donde no.

Había **dos puertas** para pedir música (`this.musica()` en el partido y
`SFX.musicaTema()` directo desde la intro, el pasillo y el jugadón), y encima el
registro de archivos era **por escena**: el partido armaba su propio mapa de 8
entradas y lo registraba en `create()`, pisando el global de 12 y borrando justo
`definicion` y `jugadon`. Por eso el pasillo seguía roto aunque la llamada fuera
correcta — el archivo no estaba registrado.

- **M2** · una sola puerta (`pedirMusica`), el contrato de los 11 momentos en
  `phaser/logic/musica.js`, registro global una vez. Momento desconocido = error
  visible en desarrollo, **nunca** sintetizador en silencio.
- **M3** · el sintetizador de música se retiró: borrados `programar`,
  `vientoOn`, `musEnsure`, `notaMus`, `golpeMus`, `musicaZona` y el segundo mapa.
  **Se quedan y están anotados** los cinco golpes cortos (`temaPosesion`,
  `temaCampo`, `temaUrgente`, `golEnContra`, `goal`) porque son efectos, no
  música: duran menos de medio segundo y no hacen loop.
- **M4** · el test **enumera**, no lista a mano. Abre los 32 archivos de
  `scenes/` y `logic/`, saca las llamadas y las cruza con el contrato. Encontró
  cuatro cosas que leer el código no mostró (ver lista 3).
- **M5** · el corte cuelga del `shutdown` de la escena, una vez, en el mixin.

**Visto:** trailer → `opening`; pasillo → `definicion` (antes: sintetizador);
salida del pasillo → `partido`; jugadón → `jugadon` (antes pedía `"urgente"`,
que no existía en ningún lado); gol en contra → la música **no cambia**, suena
el lamento, que es un golpe corto; **partido 2 de la carrera** → `entrada` →
`partido` → `The_Winning_Strike_loop.ogg`, con los 10 momentos todavía
registrados y 0 pedidos tardíos.

### BLOQUE 2 · el remate

- **A1 · el jugador corre para atrás.** No era el arte ni la regla del flip: era
  **la mitad**. La simulación ataca siempre a +x (a propósito) y en el 2T se
  espeja el dibujo vía `fx()`. El panel no pasaba por ahí. Medido: **el 1er
  tiempo siempre bien, el 2do siempre mal, los dos lados.** Ya había pasado con
  el teclado y estaba arreglado ahí con este comentario: *"sin esto, en el 2T
  ibas al arco y corrías para atrás"*.
- **A2 · "pateo y no hay animación", tercera vez.** No faltaba una escena.
  Tracé 24 remates: `resolverTiro` tiene **cinco salidas** y una —el marcador que
  te gana el duelo antes de patear— no pasaba por `escenaCine`. Salía un renglón
  de texto, con anim `"gambeta"`, que encima es la equivocada.
- **A3 · nadie corta el remate.** La lectura posicional existía desde C1 y la
  usaba un solo arco. `remateRivalAuto` nunca tuvo nada de "rival": recibe
  tirador y arco. Ahora se llama `remateAuto` y la usan los dos lados, con la
  misma perilla.
- **A4 · la pelota vuelve al medio.** Los cuatro desenlaces terminaban en **dos**
  funciones: el gol en `kickoff()` y los otros tres en `tiroFallado()`, que era
  una línea — `perderPelota()`, la función de "te robaron en juego", que le da la
  pelota al rival de campo más cerca **excluyendo al arquero**. El arquero
  atajaba y la pelota aparecía en los pies de un defensor. De paso: el córner
  movía al jugador al vértice y **dejaba la pelota donde había terminado el
  remate**, a 100 px.
- **A5 · "cuando pateo está bugueado".** Reproducido y medido en el cuadro exacto
  de la revelación: **el arquero pasaba de 250 px a 2.923 px de alto, en un
  lienzo de 540.** El golpe de escala del final usaba las constantes de los
  sprites viejos sobre una ilustración. Pasa en todo remate que no es gol.

**Visto:** los 4 casos del flip coinciden; 24 remates trazados con **0 mudos**;
la escena del bloqueo con el defensor rayado interponiéndose; el córner armado
en el vértice con su frase; la atajada como tiene que verse (250 → 280 px).

### BLOQUE 3 · las cinco decisiones

- **D1 · cartas por puesto.** Dos por jugador según dónde juega. Van en el
  **centro de la cruz**, que es donde vivía la megacosa: el mismo lugar, otra
  ley. Antes preguntaba *"¿tenés aguante y nivel?"*, ahora pregunta *"¿quién
  sos?"*. **Un delantero no tiene carta de recuperación** — verificado en vivo:
  el ATA da "(vacío)". Cada carta tiene su momento de anime con el Bloque B que
  ya estaba (hitstop → cut-in → silencio). La simulación está en la lista 2.
- **D2 · la semana por acción.** Las diez acciones a la vista, elegís tres, el
  juego reparte los días y te lo cuenta en el repaso — que es donde el día sirve
  para algo. Antes eran seis toques y dos pantallas. **El reloj de 15 segundos
  quedó como modo opcional y apagado** (`balance.semana.reloj_seg = 0`), y
  cuando se prende **nunca elige por vos**: al llegar a cero se juega con lo que
  haya.
- **D3 · cada acción con su animación.** Sin arte nuevo: la pose sale de
  `data/semana.json`. Cinco de las diez están de prestado y quedan marcadas con
  `pose_falta` y su motivo (lista 3).
- **D4 · el mapa de La Pampa.** Los diez pueblos a la vez, el elegido con anillo
  + estrella + nombre grande (nunca solo por color). **No inventé coordenadas**:
  es un mapa esquemático por zonas y la pantalla lo dice.
- **D5 · editor → entrevista.** El orden estaba al revés y por eso en la
  entrevista no había a quién mostrar: la pinta todavía no existía. Cambio de
  orden, contenido idéntico.

**Visto:** el editor con "PASO 1 DE 2"; la entrevista con Nito y vos con tus
tintes (`poseM_recibiendo_3_2_4`); la semana con los tres días y sus figuras; el
mapa con Guatraché marcado; el momento de EL FOGONAZO; la recarga medida (usada
en el 10 → "vuelve en 26'" → lista en el 37).

### BLOQUE 4 · las tres propuestas

Tres documentos separados, **sin implementar**:

- `docs/PROPUESTA_P1_VARIEDAD_DEL_PASILLO.md`
- `docs/PROPUESTA_P2_LINDO_Y_DISTINTO.md`
- `docs/PROPUESTA_P3_MINIJUEGOS_DE_LA_SEMANA.md`

---

## 2 · LOS NÚMEROS: LO QUE SIMULÉ ANTES DE TOCAR NADA

### A3 · el bloqueo del remate (20.000 remates, 3 semillas)

| escenario | goles por remate | córners |
|---|---|---|
| sin bloqueo (como estaba) | 51,7 % | 2.294 |
| con bloqueo, todo perdido | 42,6 % (−17 % relativo) | — |
| **con el rebote adentro (lo que quedó)** | **46,0 % (−11 %)** | **3.422 (+49 %)** |

Se bloquea el **25-28 %** de tus remates (igual en la simulación y en vivo). Un
bloqueo no es una pelota perdida: reparte en córner 35 % / rebote 30 % (segunda
pelota) / despeje 35 %, y el reparto es dato.

> ## ⚠ ESTO ESTÁ PARA PROBAR, NO FIJADO
>
> **`bloqueo_base` quedó en `0.18` y lo vas a jugar con los dos valores.**
>
> Para pasarlo a **0.10** — **una línea**, en `phaser/data/balance.json`:
>
> ```json
> "definicion": { "bloqueo_base": 0.10 }
> ```
>
> | | te bloquean | tus goles por remate |
> |---|---|---|
> | **`0.18`** ← lo que hay ahora | **28,0 %** | **46,0 %** |
> | **`0.10`** ← el otro que querés probar | **19,0 %** | **47,3 %** |
>
> No hace falta tocar nada más: no hay que recompilar, no hay que limpiar el
> save, y el efecto se siente desde el primer remate. La perilla es
> **compartida** con el remate del rival contra vos, así que bajarla afloja los
> dos arcos a la vez — que es a propósito.

**La tabla completa**, por si querés un tercer valor:

| bloqueo_base | % bloqueados | gol % | cómo se siente |
|---|---|---|---|
| 0 | 8,9 | 49,1 | casi nadie corta |
| 0,10 | 19,0 | 47,3 | pasa seguido, no molesta |
| 0,14 | 22,9 | 47,6 | tenés que buscar el hueco |
| **0,18** | **28,0** | **46,0** | **simétrico con tu defensa ← lo que hay** |
| 0,24 | 33,3 | 44,8 | muro |

La perilla es **compartida** a propósito: bajarla afloja los dos arcos.

### D1 · las cartas (4.000 partidos de 90', tres vueltas de calibración)

| vuelta | cartas/partido | qué pasaba |
|---|---|---|
| primera | **19,3** | disparate: la recarga estaba en segundos y no mordía (0 % caía en recarga) |
| con minutos | 10,2 | |
| **+ la situación** | **8,1** | una carta solo se ofrece si la situación da ← lo que quedó |

- reparto: de 4 a 13 por partido, moda en 8 (22 %)
- de los intentos: **12 % cae en recarga · 43 % se cae por aguante**
- entre dos usos de la **misma** carta pasan **35' de partido**

**Solo con defensores:** 5,1 cartas por partido (normal 8,1) y 2,5 de ataque
(normal 5,1). No te quedás sin nada — EL PELOTAZO y EL PATADÓN siguen — pero
perdés el remate especial y la definición. Que es el punto.

**La perilla que sí mueve es el AGUANTE, no la recarga:**

| recarga × | cartas/partido | | aguante × | cartas/partido | cómo se siente |
|---|---|---|---|---|---|
| 0,5 | 8,37 | | 0,6 | 9,66 | dejan de ser especiales |
| **1** | **8,13** | | **1** | **8,09** | **como el Caldén de hoy** |
| 2 | 7,88 | | 1,25 | 7,18 | hay que elegir el momento |
| | | | 1,5 | 6,32 | una o dos en todo el partido |

Referencia: el Caldén cuesta 450 de 1000 y el propio balance dice que *"se usa
EXACTAMENTE dos veces y chau"*. La carta más cara (EL FOGONAZO, 430) juega en
esa liga.

---

## 3 · LO QUE QUEDA ANOTADO

### Pedidos de arte

**Las 5 poses de prestado de la semana** (D3, marcadas en `data/semana.json` con
`pose_falta` y su motivo):

| acción | usa | qué falta |
|---|---|---|
| `asado` | `celebracion` | nadie comiendo un asado |
| `ayudar_casa` | `de_espaldas_sin_pelota` | nadie laburando en casa |
| `ver_rival` | `recibiendo` | nadie mirando desde afuera |
| `estudiar` | `cansado` | nadie estudiando |
| `curar` | `gambeta_pierde` | nadie curándose |

**Las cartas** (D1, en `data/megacosas.json` → `_cartas_arte`):

- **LA BARRIDA** usa la pose `barrida`, que es el defensor **naranja**. Para tu
  propio defensor hace falta **la versión celeste**. Es el único pedido que
  molesta de verdad, porque se ve el color equivocado.
- `EL PELOTAZO` y `EL HILO` comparten la pose `pase`.
- `LA PUÑALADA` usa `volea`.

**P1** pide una pose más si se hace la clase B: *"la protege de espaldas con el
cuerpo"* (está cerca `de_espaldas`, pero es corriendo, no aguantando).

### Cosas que encontré de paso y no toqué

- **`rendimiento_piso` no coincide con su propio comentario.** El texto de
  `balance.semana._rendimiento` dice *"Se eligió 0.40"* y explica por qué; el
  valor en el archivo es **0.13**. Con 0,13 llegar al techo de una stat pasa de
  93 sesiones a 145 — más de lo que da una carrera entera. **Es balance de
  carrera, así que es tu decisión.**
- **`o2_entrevista.test.js` no existe.** El `_doc` de `data/entrevista.json` dice
  que si tocás las respuestas *"el test o2_entrevista.test.js corta"*, y ese
  archivo no está en `phaser/test/`. Cubrí esa verificación dentro de
  `d_decisiones.test.js` (bloque [6]).
- **Las zonas del mapa las asigné yo.** No hay coordenadas en ningún archivo del
  proyecto, así que puse la zona de cada pueblo a mi criterio. **Revisalas.**
  Cuando quieras, cargá `x`/`y` (0..1) al lado de la zona: el mapa usa la
  coordenada si está y la zona si no. Conviven, no hay que migrar nada.
- **Los dos temas de reserva siguen sin destino** (`Cielo_de_victoria.ogg`,
  `Fuerza_de_un_Leon.ogg`). Cortan en 18,5 compases y usarlos pediría
  recortarlos, que es lo que M1 prohíbe.

### Deudas que la suite ya reporta

- el resumen de la semana repite el mismo texto en más del 80 % de las 90
  semanas en 2 de las 3 estrategias (es A2, declarado cerrado)
- 35 textos por debajo de 12 px lógicos; el más chico, 9 px en
  `definicion_ui.js:249`

---

## 4 · DECISIONES QUE TOMÉ YO

Modo autónomo. Cada una con qué elegí, por qué y cómo se revierte.

**1 · `definicion` y `jugadon` comparten tema con `partido_final`.**
Los dos son urgencia pura y Last Ten Seconds es 161 BPM en Fa menor. La
alternativa eran los dos temas de reserva, pero cortan en 18,5 compases y habría
que recortarlos — que es exactamente lo que M1 prohíbe.
*Revertir:* cambiá el `tema` de esos momentos en `phaser/logic/musica.js`.

**2 · La entrada a la cancha suena en el PARTIDO, no al salir del master.**
`entrada` estaba declarado, con archivo en disco, y no lo pedía nadie. Lo puse
primero en el master y ahí se vio el error: el cambio de escena lo cortaba a los
dos cuadros.
*Revertir:* `balance.musica.entrada_ms = 0` y el partido arranca con su tema.

**3 · Un bloqueo reparte en córner / rebote / despeje (35/30/35).**
Contando todo bloqueo como pelota perdida, los goles caían 17 %. Con el rebote
adentro caen 11 % y los córners suben 49 %. Además es lo que pasa de verdad.
*Revertir:* `balance.definicion.bloqueo_reparto`.

**4 · El bloqueo de tu remate usa la MISMA perilla que el del rival.**
A3 dice que la lógica existe y falta de tu lado; la simetría es el pedido. Y una
perilla compartida es una cosa menos que mantener sincronizada.
*Revertir:* la tabla de `bloqueo_base` está en la lista 2.

**5 · La atajada y el afuera terminan en el arquero rival, no en un defensor.**
Es lo que pasa en un partido y es lo que arregla tu reporte.
*Revertir:* volvé `desenlaceRemate` a llamar `P.tiroFallado()`, que sigue
existiendo como alias.

**6 · Las ocho cartas: nombres, costos y recargas los inventé yo.**
Los nombres son pampeanos y §11 los aprobó. Los costos juegan en la liga del
Caldén a propósito. La tabla de perillas está en la lista 2.
*Revertir:* todo está en `data/megacosas.json` → `cartas`, sin tocar código.

**7 · El delantero no tiene carta de recuperación.**
Es la lectura literal de "el delantero lleva dos de ataque", y es lo que hace
que elegir a quién le pasás signifique algo.
*Revertir:* cambiá la `clase` de `definicion_ata` a `"recuperacion"`.

**8 · La carta de ataque solo aparece si el megatiro no está.**
No compiten: el megatiro gasta ficha y te lleva a otra pantalla; la carta es un
golpe dentro del menú. Cuando están los dos, manda el megatiro, que es más raro.
*Revertir:* invertí el orden de los dos `if` del `centro` en `abrirMenuAtaque`.

**9 · El repaso de la semana es donde aparecen los días.**
Elegís acciones sueltas y el juego las reparte en la primera ranura libre. El
día no cambia ningún número, así que pedirte que lo elijas era pedirte una
decisión sin consecuencia.
*Revertir:* el orden sale de `sem.elegidas.findIndex(e => !e)` en
`ponerEnLaSemana`.

**10 · El mapa es esquemático por zonas y lo dice en pantalla.**
No hay coordenadas y la orden prohíbe inventarlas. Un esquema que se presenta
como exacto miente, así que la pantalla aclara que las exactas van cuando estén
los datos.
*Revertir:* cargá `x`/`y` en `data/roster_pampeano.json` y el cartel cambia solo.

**11 · Le subí el tamaño a tres textos míos y el contraste a las tarjetas
apagadas de la semana.**
El guardián de legibilidad cazó los primeros. Las tarjetas quedaban texto oscuro
sobre fondo oscuro y se distinguían **solo por ser más apagadas** — con
daltonismo eso no se distingue. Ahora lo dicen con palabra ("sin energía para
esto" / "la semana ya está armada") y con grosor de borde.
*Revertir:* no lo revertiría.

**12 · Actualicé `o1_franja.test.js`.**
Lo que cae en la franja de decisión ya no son las ranuras de día (que ahora son
el resumen) sino la lista de acciones. El test verificaba la implementación
vieja; cambié qué verifica, no si verifica.
*Revertir:* el assert viejo está en el historial de git.
