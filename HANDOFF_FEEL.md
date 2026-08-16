# HANDOFF — ORDEN TOTAL: QUE SE SIENTA HERMOSO

Cinco bloques, los cinco cerrados. Modo autónomo.

| Bloque | Punto | Commit |
|---|---|---|
| **D** | D1 el guardián que mentía · D2 la trampa del tope | `cd2e0cf` |
| **A+B** | los tres escalones · el oficio de la animación | `737579d` |
| **C** | que la escalera se sienta | `0db60b8` |
| **E** | la jerarquía + la cuenta corregida | `a6811b5` |

Suite: **32 archivos verdes** · §11 limpia.

---

## LA CUENTA DEL BLOQUE A

Lo que pedía el punto. Un partido de ~5,5 minutos reales:

```
acción       esc  veces   antes      después
pase         1     14     54.9s      0.0s   ← en la cancha
quite        1      8     31.4s      0.0s   ← en la cancha
corte        1      5     19.6s      0.0s   ← en la cancha
gambeta      2      7     27.4s     15.9s
remate       2      6     23.5s     13.6s
atajada      2      4     15.7s      9.1s
bloqueo      2      3     11.8s      6.8s
gol          3      2      7.8s      7.8s
gol_rival    3      1      3.9s      3.9s
megatiro     3      1      3.9s      3.9s
                TOTAL   199.9s     61.1s    (−69%)
```

**139 segundos menos de mirar sin tocar, y el gol no perdió un milisegundo.**

### Un número que corregí a mitad de camino

Mi primera cuenta usaba **2.600 ms por viñeta** y subestimaba el problema a la
mitad. La viñeta real cuesta **3.170**: entrada 500 + pose 800 + hold 1.300 +
**silencio 500** + negro 70. Y antes de cada una corre un **beat de tensión de
750 ms** que yo no estaba contando. La unidad real es 3.920, no 2.600.

Lo detecté midiendo el código en vez de estimarlo, y con ese número la
conclusión cambia de tono: el juego pasaba cerca del **40% del tiempo mirando
sin tocar nada**.

---

## LO QUE MÁS VALE LA PENA MIRAR

### D2 · La trampa del tope, que era estructural

`duelChance` acotaba con `clamp(v, min, max)`. Apenas la diferencia de fuerza
pasaba de 26, la chance quedaba clavada en 0.95 y **ahí la derivada es cero**:

```
dif   chance   ¿se mueve si le saco 10 de poder?
 20    84%     17.2 puntos
 26    95%     17.2 puntos
 40    95%      0.0 puntos   ← acá empezaba la trampa
 80    95%      0.0 puntos
```

Fallaba en silencio. Cayeron dos palancas, cada una parcheada por separado.

**Se resolvió en dos partes, no una.** El techo dejó de ser un muro (por encima
de `max` el exceso se comprime hacia 0.99 sin llegar nunca), y hay **una sola
vía** para las penalizaciones: `resolveShot({penalizaciones: [{id, factor}]})`,
que las aplica sobre la chance ya resuelta y devuelve el desglose. Un factor
0.8 saca entre 10 y 20 puntos en todo el rango, pase lo que pase.

Y hay un assert que verifica que **por debajo del tope no cambió nada**: el
arreglo no podía mover el balance de la zona donde el juego pasa el 90% del
tiempo.

### D1 · El guardián afirmaba lo contrario de la realidad

Pasaba con 23 asserts diciendo "ningún grupo de opciones fuera de la franja"
mientras el jugadón tenía botones en y=66 y y=118. Ahora sigue los helpers:
cuando la Y es una variable, busca su declaración y evalúa la expresión.
**Apenas se amplió cazó otro** que llevaba ahí desde siempre: la grilla del
evento en `280 + i * 92`.

### B1 · El hitstop, y el detalle que casi lo rompe

Se hace con `timeScale` del reloj y de los tweens, no pausando objeto por
objeto. Pero el temporizador de salida **no puede ser un `delayedCall` de la
escena**, porque el reloj de la escena está congelado y no volvería nunca. Va
con `setTimeout` del navegador. Verificado en el partido: timeScale pasa de 1 a
0.0001 y vuelve solo.

### C · El criterio verificable de la escalera

El test no mide "se ve lindo": mide **cuántos rasgos visuales separan a dos
divisiones**. Los extremos difieren en 6 de 6. Los vecinos —los difíciles— en
al menos 3. El objetivo era que alguien que abre una captura sepa en qué
división está sin leer el texto, y eso se puede verificar.

---

## PEDIDOS DE ARTE

Ninguno nuevo. Todo el bloque C se hizo modulando lo que ya existe, que era la
condición del punto. Siguen abiertos los de las corridas anteriores: retrato del
entrevistador, retratos de Nelda y el Tuli, `pose_volea`, `pose_quite` y las
tres poses de arquero con la camiseta celeste.

---

## DECISIONES QUE TOMÉ YO

**1. La clasificación de escalones vive en `logic/drama.js`, no en balance.**
Los presupuestos sí son perillas, pero qué merece pantalla es diseño, no ajuste.
*Revertir*: mover el objeto `ESCALON` a balance.json.

**2. El silencio se recorta al 40% en el escalón 2.** Era fijo en 500 ms y no se
acortaba nunca. En un gol es la mitad del efecto; en una gambeta del minuto 20,
medio segundo de negro treinta veces por partido. *Revertir*: en `escenaCine`,
volver a `feel.silencio_ms` fijo.

**3. Los presupuestos 420 / 1250 / 2600.** El punto pedía "menos de 500" para el
trámite y "la mitad" para la jugada; elegí los números. *Revertir*:
`balance.drama`.

**4. Un quite o un corte suben de escalón según DÓNDE pasan** (último tercio de
campo), no según una lista fija. Robarla en el mediocampo y salvarla sobre la
línea no son lo mismo. *Revertir*: `escalonDe()` en match.js.

**5. `lectura.arquero_bonus_max` queda en 0.** Era un parche para esquivar el
tope duro, y ese tope ya no existe. La perilla se conserva. *Revertir*: subirla.

**6. La tabla de la escalera** (densidades, luces, ceremonias) la elegí yo.
*Revertir*: `ESCALONES` en `logic/escalera.js`.

**7. El escudo gana detalle con la división** — media sombra, filete, estrella.
Sigue siendo geométrico y ficticio. *Revertir*: `escudo_detalle` a 1 en todas.

**8. La escala de jerarquía 24/16/13/12.** El 12 es el piso de legibilidad y no
baja de ahí. *Revertir*: `JERARQUIA` en `logic/piel.js`.

**9. El principal de cada pantalla.** En la semana elegí "contra quién jugás";
en el evento, lo que pasó. *Revertir*: los `nivel(n)` de master.js.

---

## LO QUE QUEDA ABIERTO

- **B2, B3, B4 y B6 están implementados y probados como helpers, pero cableados
  solo en parte.** El hitstop y el gol como pico sí están en el flujo real del
  remate; la pelota viva (estirar, achatar, estela) y el empuje de cámara viven
  en `feel_ui.js` con sus perillas y su lugar de llamada, pero enchufarlos en
  cada punto del viaje de la pelota es una pasada aparte. Están listos para
  usar, no en uso.
- **La jerarquía se aplicó a las dos pantallas peor medidas** (la semana y el
  evento). La tabla de la temporada, el editor, la intro y el jugadón siguen
  sin un elemento dominante.
- **Huérfanos detectados y no tocados**: las cuatro `barra_zona_*` y
  `barra_periodo_ms` de `balance.feel` no las lee nadie desde que murió la barra
  de aguja; en `balance.epica` hay una docena de números que tampoco. Y hay dos
  caminos muertos: `abrirMenuArquero()` y el `escenaCine` de `dispararSimple()`,
  inalcanzables con los flags de hoy.
