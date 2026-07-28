# HANDOFF V9-2 — bugs del playtest + los tres cambios de diseño

Tanda sobre `cfe7c2a` → `1f4a866`. Cuatro bugs (B1-B4) y tres cambios de diseño
(C1-C3), commit por punto, todos verificados en pantalla.

En vivo: https://juventudlapampa.github.io/pampa-star/phaser/

---

## LOS BUGS

### B1 · Segundo tiempo con los controles al revés (era grave)
Deuda mía de la tanda anterior: espejé el **render** y me olvidé del **input**.
Eran **tres** caminos, no uno:
- `radarAMundo()` — el mapa se dibuja espejado pero el toque se leía sin espejar,
  así que tocabas donde veías el arco rival y el target caía en tu propio arco.
  Esto también arreglaba el **pase dirigido**, que compartía el bug.
- teclado/d-pad — "derecha" en pantalla es −x de simulación con el lado dado vuelta.
- el toque sobre la cancha sin perspectiva.

**Verificado jugando los dos tiempos**: flecha derecha mueve a la derecha EN
PANTALLA siempre (1T sim 525→591; 2T sim 525→443, que en pantalla es 525→608);
tocar el arco rival da target 1036 en los dos tiempos.

### B2 · El jugador duplicado
`defTeatroFinal` dibujaba **dos veces la misma pose del mismo jugador** (una de
alto 400 y otra de alto 240, superpuestas). La segunda se creaba y no se tocaba
nunca más. Borrada. **Verificado**: el teatro final dibuja `pose_remate` una sola vez.

### B3 · El muñequito de bloques
Una sola causa raíz explicaba todos los casos: **el antagonista del plano
(`cfg.rival`) nunca miraba poses** — salía siempre por el heroico paramétrico.
Por eso en las escenas donde el protagonista es el rival (quite ganado, defensa
fallada) el rival lucía ilustrado y **vos** salías de bloques.
- `poseDelAntagonista()`: el segundo cuerpo también va ilustrado (naranja si es
  rival, con tu pinta si sos vos), y la revelación ya no lo pisa.
- `poseParaEscena()` no devuelve `null` nunca más; el heroico queda solo como red
  de seguridad si el manifest no carga.
- La **chilena** usa por fin `pose_chilena` (mandaba anim "volea" → "remate").

### B4 · Recorrido en vivo, acción por acción
No de memoria: se disparó cada acción en el juego corriendo y se contaron las
figuras del plano. **15 escenas, 0 muñequitos, 0 duplicadas.**

---

## LA TABLA DE ESCENAS Y POSES (quién sale y con qué)

| Escena | Protagonista | Pose del prota | Antagonista | Pose del antagonista |
|---|---|---|---|---|
| gambeta ganada | VOS | `gambeta_gana` | el rival | `barrida` (naranja) |
| gambeta perdida | VOS | `gambeta_pierde` | el rival | `barrida` (naranja) |
| pared / uno-dos | VOS | `pared` | el rival | `barrida` (naranja) |
| quite ganado | el rival (cae él) | `gambeta_pierde` espejada (naranja) | VOS | `pared` |
| bloqueo ganado | VOS | `bloqueo` | el rival | `remate` (naranja) |
| corte ganado | VOS | `barrida` | el rival | `barrida` (naranja) |
| quite / bloqueo / corte fallados | el rival | `gambeta_gana` espejada (naranja) | VOS | `pared` |
| tiro normal | VOS | `remate` | el rival que estorba | `gambeta_gana` (naranja) |
| cabezazo | VOS | `cabezazo` | arquero rival | `arquero_vuela` (naranja) |
| chilena | VOS | `chilena` | arquero rival | `arquero_vuela` (naranja) |
| volea | VOS | `remate` | arquero rival | `arquero_vuela` (naranja) |
| megatiro | VOS | `remate` (especial) | — | — |
| te rematan (C1) | el rival que patea | `remate` (naranja) | tus defensores + tu arquero | `bloqueo`, `barrida`, `arquero_vuela` |
| el pase | el que la toca | `pared` | el que se tira a cortarla | `barrida` (naranja) |
| corrida vertical (C2) | VOS | `corriendo` con tu pinta | los marcadores | `bloqueo` (naranja) |
| teatro de la Definición | el que remata | la del tiro elegido | arquero | `arquero_vuela` |

Regla: **prota** = `cfg.pose` o `poseParaEscena()`; **antagonista** =
`poseDelAntagonista()`. Ninguna de las dos puede devolver el heroico salvo que
el manifest no haya cargado.

---

## LOS CAMBIOS DE DISEÑO

### C1 · Fuera la pantalla de defensa (la cuarta vez que la pediste)
Se va **entera**, no los botones de a uno. Cuando te rematan: el rival define,
tus defensores que están en el camino saltan o se tiran, el arquero vuela o no
llega. Freeze, medio segundo de silencio, desenlace. **Cero botones.**
- `logic/definicion.js → remateRivalAuto()` (pura, 10 tests): recibe la foto real
  de la jugada —posiciones de los once, nivel y aguante del arquero, distancia—
  y devuelve quién está en la línea, la chance de bloqueo, el bonus del arquero y
  **por qué** salió así.
- El test cazó una prioridad pobre: con el arquero fundido decía "quedó solo" en
  vez de nombrar lo que de verdad pesó. Corregido en la lógica, no en el test.

**Verificado**: sin nadie en el camino → "GOL DE GENERAL PI / quedó solo contra
tu arquero"; con tres cruzados → "¡LA BLOQUEÓ BENJA! / puso el cuerpo en la
línea", y la pelota vuelve a ser tuya.

### C2 · El megatiro va en cancha vertical
El minijuego dejó de ser una cancha acostada: ahora es la **vista en profundidad**
—la misma del cine— con el arco al fondo, vos viniendo de frente, los rivales
creciendo desde el fondo, y el remate al llegar. Gambeta y remate en un solo
entorno.

**Verificado**: la figura sube en pantalla y se achica con la profundidad
(y 462→264, escala 0.151→0.087); un rival sale al cruce ("TE CIERRA LA DERECHA"),
elegís, lo pasás, seguís, rematás → **gol**. Con mega: cut-in → "¡TIRO DEL
CALDÉN!" → "· el viaje ·" → gol.

### C3 · Tres opciones de remate
**TIRO** (normal) · **MEGATIRO** (la secuencia vertical completa, gasta ficha) ·
**GAMBETA-TIRO** (encarar y definir, gasta ficha). Se fueron la MEGACORRIDA del
centro y el "súper tiro" suelto: rematar sin encarar ya es el TIRO normal.

---

## EL CONTENIDO QUE FALTA (anotado, no inventado)

Rodri entrega el arte. Los manifests quedaron **preparados y documentados** en
[`data/COMO_AGREGAR_ARTE.md`](data/COMO_AGREGAR_ARTE.md) — poner el PNG en su
carpeta y agregar una entrada al JSON, sin tocar código:

| Lo que falta | Dónde entra | Estado |
|---|---|---|
| más caras | `data/caras_manifest.json` → `caras[]` | listo, documentado |
| más camisetas | `data/caras_manifest.json` → `camisetas[]` | listo, una línea por camiseta |
| ciclo de correr / saltar | `data/poses_manifest.json` → `ciclo: {cuadros, ms}` | **campo aceptado**; mientras no exista, se usa la pose quieta |
| relator/a visible | `data/portraits_manifest.json` → clave `relator` | **hueco declarado**; mientras no exista, sigue la franja de texto |
| sonidos propios | `assets/audio/` | el manifest no existe aún: avisá cuál efecto y lo cableo |

---

## PENDIENTES (siguen abiertos del V9-1)

1. **[media]** Tiro tapado en el cruce — sigue en cartel salvo con megacosa.
2. **[media]** Final del partido — sin festejo.
3. **[media]** Atajada con rebote — se ve igual que la atajada limpia.
4. **[baja]** El % que promete el menú no es el que se usa (le faltan aguante,
   envión y matriz).
5. **[baja]** El modificador `duelo` del evento de la semana entra en un solo lugar.
6. **[baja]** Lateral, córner y saque de arco: no existen en la sim.

**Procedimiento corregido**: en esta tanda un commit pasó con la suite en rojo
porque mi corrida de tests imprimía "ok" sin mirar el código de salida (el §11
había cazado una marca en un comentario mío). Ahora la suite corre con un script
que respeta el exit code y frena el commit. El test estaba bien: el error era mío.

## SECCIÓN 11
`phaser/test/seccion11.test.js` verde sobre 38 archivos de producto.
