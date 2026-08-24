# P1 · LA VARIEDAD DEL PASILLO

**Propuesta. No está implementado.** Tres o cuatro clases de obstáculo que
pidan cosas distintas, con el costo de cada una.

---

## Lo que hay hoy, medido

`phaser/logic/jugadon.js` declara **seis obstáculos y cinco gestos**:

| obstáculo | lo que dice | lo vence |
|---|---|---|
| `marca_izq` | TE CIERRA LA IZQUIERDA | `der` |
| `marca_der` | TE CIERRA LA DERECHA | `izq` |
| `barrida` | SE TIRA AL PISO | `saltar` |
| `pozo` | UN POZO EN EL PASTO | `saltar` |
| `firme` | SE PLANTA DE FRENTE | `canio` · `amague` |
| `dos_juntos` | DOS CERRÁNDOTE | `amague` |

Gestos: `izq`, `der`, `saltar`, `amague` (desde 55 de gambeta), `canio` (desde 70).

**Los seis piden exactamente lo mismo: elegí de una lista el gesto que le gana
a este obstáculo.** Cambia cuál es la respuesta correcta, no qué clase de cosa
te están preguntando. Por eso a la tercera vez ya no hay pasillo: hay una tabla
de seis filas que te sabés.

Y hay una segunda cosa medida: `pozo` y `barrida` se vencen los dos con
`saltar`, y `firme` acepta dos gestos. O sea que de seis obstáculos, hay
**cuatro respuestas distintas** y una de ellas sirve para dos casos.

---

## El diagnóstico

Un obstáculo interesante no se define por *cuál es la respuesta* sino por
**qué te obliga a hacer**. Hoy los seis te obligan a lo mismo: leer una etiqueta
y tocar el botón que le corresponde. Es reconocimiento de patrón, y el patrón
tiene seis entradas.

Las clases que siguen están pensadas para que **cada una pida un músculo
distinto**: una pide leer al rival, otra pide aguantar, otra pide elegir entre
dos males, otra pide precisión. Se pueden mezclar en la misma corrida y el
pasillo deja de ser una tabla.

---

## Las cuatro clases

### CLASE A · EL QUE TE LEE (lectura mutua, no tabla)

**Qué pide:** adivinar al rival sabiendo que él te está adivinando a vos.

El rival **declara una intención** (insinuada en pantalla, como ya hace el
duelo de la gambeta en V8 §4) y vos elegís sabiendo eso. Pero su declaración
puede ser mentira: hay un porcentaje de amague. No hay respuesta correcta fija
— hay una lectura.

- Si va a cerrar la izquierda y salís por la derecha, pasás.
- Si te la declaró para que salgas por la derecha y él te esperaba ahí, te come.

**Por qué es distinto:** los seis de hoy tienen respuesta correcta y única. Este
no tiene respuesta correcta: tiene una apuesta con información parcial. Es el
único que se puede jugar cien veces sin resolverse.

**Lo que ya existe y se reusa:** `cruceGambeta` y `crearGambeta` de
`logic/jugadon.js` hacen exactamente esta lectura mutua, con la CPU que NO copia
tu elección. Está probado en `jugadon.test.js`.

**Costo:** **bajo.** ~1 día. La lógica está escrita; falta declararla como
obstáculo del pasillo y darle su insinuación en pantalla. Cero arte nuevo (usa
`bloqueo` y `gambeta_gana`/`gambeta_pierde`, que ya están).

---

### CLASE B · EL QUE NO SE ESQUIVA (aguantar, no evitar)

**Qué pide:** no soltar la pelota mientras te pegan.

El rival no te cierra un lado: **se te tira encima y te va a pegar igual**. No
hay gesto que lo evite. Lo que elegís es **cuánto pagás**:

- **PROTEGERLA** — pasás seguro, pero perdés bastante aguante y salís más lento
  al obstáculo siguiente.
- **SEGUIR DE LARGO** — mantenés la velocidad, pero tirás una moneda con tu
  físico: si te gana, la perdés ahí.

**Por qué es distinto:** es el único que no se resuelve con reflejos ni con
lectura. Es una decisión de economía, y encima **afecta al obstáculo siguiente**,
que es lo que convierte una corrida en una jugada y no en tres preguntas
sueltas.

**Lo que ya existe:** el aguante con sus costos (`balance.aguante`), y
`resolverDuelo` para la moneda del físico. La pose `gambeta_pierde` sirve para
el que aguanta y sigue.

**Costo:** **bajo-medio.** ~1,5 días. La novedad real es el **arrastre**: que lo
que elegiste acá cambie el obstáculo siguiente. Eso pide un campo de estado en
la corrida que hoy no está.

**Arte que falta:** una pose de "la protege de espaldas con el cuerpo". Está
cerca `de_espaldas`, pero es de espaldas corriendo, no aguantando un empujón.

---

### CLASE C · LA ELECCIÓN ENVENENADA (dos males)

**Qué pide:** elegir qué preferís perder.

No hay salida buena. Hay dos salidas y **las dos te cuestan algo distinto**:

- **POR AFUERA** — pasás casi seguro, pero te vas a la banda: el remate del
  final sale desde un ángulo peor.
- **POR EL MEDIO** — si pasás quedás de frente al arco, pero la chance es
  bastante menor.

**Por qué es distinto:** los de hoy preguntan "¿sabés cuál es?". Este pregunta
"¿qué clase de jugador sos?". Y la consecuencia **no se ve en el obstáculo**: se
ve al final, en el remate. Eso es lo que hace que la corrida entera tenga forma.

**Lo que ya existe:** `logic/tiro.js` ya calcula la calidad del remate por
ángulo y distancia (`tiroAuto` usa `centrado` y `cerca`). O sea: la consecuencia
ya está implementada, falta que algo la mueva desde el pasillo.

**Costo:** **medio.** ~2 días. Lo caro no es el obstáculo: es que la corrida
lleve una posición lateral que el remate final lea. Hoy el pasillo y la
definición están conectados por el resultado (pasaste / no pasaste) y no por la
geometría.

**Arte que falta:** ninguno. Es el mismo `bloqueo`, con dos flechas.

---

### CLASE D · EL QUE TE APURA (el único con reloj)

**Qué pide:** decidir rápido, sin tabla.

Un obstáculo que **se cierra solo**. Tenés una ventana corta (1,2 s) y si no
elegís, elige él: te cierra el lado que estabas mirando. No hay gesto ganador
garantizado — hay que decidir antes de tener toda la información.

**Por qué es distinto:** es el único que castiga *pensar de más*. Los otros tres
premian pensar; este premia haber jugado lo suficiente como para no tener que
pensar. Mezclado con los otros es lo que hace que la corrida tenga pulso.

**Cuidado, y es un cuidado serio:** esto es un QTE, y el proyecto ya sacó dos
QTE a propósito (V9 §4 sacó la barra de timing: *"eso es un QTE de reflejos, no
una decisión de fútbol"*). **Esta clase solo tiene sentido si es UNA de cuatro,
nunca la regla.** Si aparece en cada obstáculo, el pasillo vuelve a ser un
juego de reflejos y se pierde exactamente lo que se ganó sacando la aguja.

**Recomendación:** que salga como mucho una vez por corrida, y que sea el
obstáculo del final — el que te apura cuando ya estás llegando.

**Costo:** **bajo.** ~1 día. Un temporizador y un default. Cero arte.

---

## Cómo se mezclan

Una corrida de tres obstáculos, armada así:

1. **uno de lectura (A)** — te mete en la jugada
2. **uno de economía (B) o de elección envenenada (C)** — te hace pagar algo
3. **uno rápido (D) o de lectura (A)** — el remate está ahí

La regla que las mantiene distintas: **nunca dos de la misma clase seguidas.**
`secuenciaObstaculos` ya tiene la lógica de no repetir el mismo obstáculo
seguido (`ultimo = o.id`); extenderla a la clase es una línea.

---

## Resumen de costo

| clase | qué pide | costo | arte nuevo |
|---|---|---|---|
| A · el que te lee | leer con información parcial | ~1 día | no |
| B · el que no se esquiva | pagar y arrastrar | ~1,5 días | 1 pose (protegerla de espaldas) |
| C · la elección envenenada | elegir qué perder | ~2 días | no |
| D · el que te apura | decidir sin pensar | ~1 día | no |
| **las cuatro + la regla de mezcla** | | **~6 días** | **1 pose** |

**Si hay que elegir dos:** **A y C.** A es la más barata y la única que no se
agota; C es la que le da forma a la corrida entera. Con esas dos el pasillo ya
deja de ser una tabla, y son ~3 días.

**La que yo dejaría para el final es D**, no por costo sino por riesgo: es la
única que puede romper el tono que el proyecto viene defendiendo.

---

## Lo que hay que decidir antes de empezar

1. **¿El pasillo tiene que poder perderse?** Hoy se puede. Las clases B y C
   asumen que sí, y que perder ahí es parte del juego.
2. **¿La corrida arrastra estado entre obstáculos?** Hoy no. B y C lo necesitan.
   Es la decisión de arquitectura de esta propuesta, no un detalle.
3. **¿Cuántos obstáculos por corrida?** Hoy es variable. Con cuatro clases, tres
   es el número que deja mezclar sin repetir.
