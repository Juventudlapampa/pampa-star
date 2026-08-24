# P3 · DOS ACCIONES DE LA SEMANA QUE SE PRESTAN A MINIJUEGO

**Propuesta. No está implementado.** Cuáles dos, el minijuego más simple que
funciona para cada una, y **qué le pasa al balance** si una acción deja de tener
resultado fijo.

---

## Cómo elegí cuáles dos

Las diez acciones de `data/semana.json`, con lo que dan hoy:

| acción | costo | lo que da | ¿se presta? |
|---|---|---|---|
| `entrenar_tiro` | 25 | +1 tiro | **sí** — el gesto es obvio y ya existe en el juego |
| `entrenar_gambeta` | 25 | +1 gambeta | **sí** — pero el gesto ya es el pasillo |
| `entrenar_aguante` | 30 | +2 resistencia | no — "correr diez vueltas" como minijuego es aburrido de verdad |
| `picadito` | 15 | +5 ánimo, +1 stat al azar, 12% de golpe | **sí** — pero es un partido chico, o sea caro |
| `descansar` | −30 (recupera) | +5 ánimo | **no, y a propósito** (ver abajo) |
| `asado` | 10 | +15 ánimo | no — no hay nada que jugar |
| `ayudar_casa` | 35 | +10 ánimo, +1 resistencia | no |
| `ver_rival` | 20 | espía al rival | **sí** — y es el más interesante |
| `estudiar` | 20 | +3 ánimo, evita materia | no |
| `curar` | 20 | cura la molestia | no |

**Los dos que elijo: `entrenar_tiro` y `ver_rival`.**

Y una regla que vale la pena dejar escrita: **`descansar` no puede tener nunca
un minijuego.** Es la única acción cuyo sentido es *no hacer nada*. Si descansar
pide habilidad, deja de ser el descanso y la semana pierde su único respiro.

---

# MINIJUEGO 1 · ENTRENAR TIRO

## El más simple que funciona: **CINCO PELOTAS AL ARCO VACÍO**

Cinco tiros. En el arco hay **tres zonas marcadas** (los dos ángulos y el
medio). Antes de cada tiro se enciende una: esa es la que hay que embocar.

Tocás la pantalla para pegarle y la pelota sale hacia donde tocaste. Sin barra,
sin timing, sin aguja: **es puntería con el dedo, y nada más.**

- 5 de 5 → **+2 tiro**
- 3 o 4 → **+1 tiro** (lo mismo que hoy)
- 0 a 2 → **+0**, pero se recupera algo de energía ("al menos te movíste")

**Por qué éste y no otro:** porque es el mismo gesto que el juego ya te enseñó
—apuntar y patear— y porque se termina en veinte segundos. Un minijuego de
entrenamiento que dura más que la decisión de entrenar está mal calibrado por
definición.

**Por qué NO una barra de potencia:** el proyecto ya sacó la barra de timing dos
veces, y la razón está escrita en `match.js` (V9 §4): *"eso es un QTE de
reflejos, no una decisión de fútbol"*. Meterla de vuelta por la puerta de atrás
sería desandar eso.

**Lo que ya existe y se reusa:**
- `logic/definicion.js` tiene las **seis zonas del arco** (`ZONAS`) con su
  geometría — sobran tres.
- `escenaCine` con la pose `remate` para cada tiro.
- `logic/duel.js` para el resultado si se quisiera meter azar (no hace falta).

**Costo: ~2 días.** Una escena chica, cinco iteraciones, un contador. Cero arte
nuevo (`remate` y `arco` ya están en el manifest).

---

# MINIJUEGO 2 · IR A VER AL RIVAL

## El más simple que funciona: **¿QUÉ VISTE?**

Mirás **treinta segundos de un partido del rival** — no jugás, mirás. Es la
cancha esquemática (la de abajo de la pantalla partida, que ya existe) con los
once de ellos moviéndose según su perfil de IA.

Después te preguntan **tres cosas**:

1. *¿Por dónde salen jugando?* — por el medio / por las bandas / la revientan
2. *¿Cómo defienden?* — se tiran al piso / esperan / te salen a presionar
3. *¿Quién es el peligroso?* — tres nombres de su plantel

Cada acierto te da **una pista concreta para el partido del domingo**, mostrada
en el HUD:

- acertaste la salida → sabés hacia dónde va a ir el pase antes de que salga
- acertaste la defensa → el aviso de "te tienen leído" aparece antes
- acertaste el peligroso → ese jugador te aparece marcado en el radar

**Por qué éste y no otro:** porque **espiar es mirar**, y es la única acción de
la semana donde el verbo natural no es hacer sino observar. Un minijuego de
observación no existe en el resto del juego, así que no compite con nada, y es
el único de esta lista que no es "el partido pero más chico".

**Y hay algo más:** hoy `ver_rival` te da `espia_rival = true` y listo. Es la
acción más aburrida de la semana porque su premio es invisible. Con el
minijuego, el premio es **información que usás el domingo**, que es lo que la
acción prometía desde el principio.

**Lo que ya existe y se reusa:**
- `Ma.perfilRival(rival)` ya devuelve el perfil de IA con nombre ("un equipo de
  toque"). Las respuestas correctas salen de ahí: **no hay que inventar nada**.
- El mapa esquemático de la pantalla partida, con los triángulos naranjas.
- `logic/lectura.js`, que ya maneja "te tienen leído" en las dos direcciones.

**Costo: ~3 días.** Lo caro es la reproducción de los treinta segundos: hay que
correr la IA de los 21 sin jugador. Alternativa **más barata (~1,5 días)**: en
vez de un partido en vivo, **tres jugadas fijas** dibujadas con flechas sobre la
cancha quieta, como una pizarra de DT. Se entiende igual y es la mitad del
trabajo.

---

# QUÉ LE PASA AL BALANCE

Esta es la parte que importa, y la respuesta corta es: **más de lo que parece.**

## 1 · Hoy la semana es un presupuesto, y eso es una virtud

Con resultados fijos, la semana es un problema de reparto: 100 de energía, tres
ranuras, costos conocidos. Podés **planear**. La pantalla del repaso te dice
exactamente con cuánto aguante vas a llegar al domingo, y ese número es cierto.

Con minijuegos, ese número deja de ser cierto antes de jugarlos. **Se pierde la
planificación y se gana tensión.** No es gratis: es un cambio de qué clase de
pantalla es la semana.

## 2 · La resaca se rompe si el rango es ancho

`balance.semana` tiene un mecanismo delicado y calibrado: la **resaca**
(`resaca_frac 0.33`, `resaca_piso 50`). El comentario del propio archivo dice
que la calibración de `rendimiento_piso` fue **una tensión entre dos criterios
que no entraban juntos**, y que se eligió 0,40 porque con menos ninguna
estrategia llega al techo y con más llegan las dos.

Un minijuego que a veces da +2 y a veces +0 **mete varianza en la entrada de esa
calibración**. Con 90 semanas de carrera, la varianza se promedia... pero el
techo no: un jugador que domina el minijuego llega antes al 99 de stat, y ahí la
curva de rendimiento decreciente ya no frena nada.

**El número concreto, corrido con la fórmula que está en `balance.semana`**
(`factor = max(rendimiento_piso, (99 − stat) / (99 − 50))`, arrancando en 50):

| sesiones de entrenar tiro para llegar a 98,5 | hoy (+1) | con minijuego (+1,7 de media) |
|---|---|---|
| con `rendimiento_piso` = 0,13 (lo que está en el dato) | 145 | **85** |
| con `rendimiento_piso` = 0,40 (lo que dice la nota) | 93 | **55** |

O sea: el minijuego **adelanta el techo entre 38 y 60 sesiones**, según cuál de
los dos valores sea el bueno. (El +1,7 sale de suponer un jugador que hace 5 de
5 el 70% de las veces y 3-4 el resto.)

> **Y acá apareció algo que no estaba buscando.** El comentario `_rendimiento`
> de `balance.semana` dice con todas las letras *"Se eligió 0.40"* y explica por
> qué, pero **el valor que está en el archivo es 0.13**. Una de las dos cosas
> quedó desactualizada. Con 0,13 la curva frena mucho menos y llegar al techo
> pasa de 93 sesiones a 145 — más de lo que da una carrera entera de 90 semanas.
> No lo toqué porque es balance de carrera y no es de este bloque, pero va al
> HANDOFF.

## 3 · Los tres arreglos posibles, y cuál recomiendo

**(a) Que el minijuego mueva el ÁNIMO, no la stat.**
El resultado del minijuego cambia cuánto ánimo te llevás, y la stat sigue siendo
fija. La progresión de la carrera queda intacta —cero riesgo sobre la
calibración de 90 semanas— y el minijuego igual importa, porque el ánimo mueve
el envión con el que arrancás el partido.

**(b) Que el techo del minijuego sea el mismo de hoy, y el piso más bajo.**
5 de 5 da **+1** (igual que hoy) y fallar da **+0**. El minijuego no puede
hacerte más fuerte que hoy: solo puede hacerte perder la semana. Conserva el
balance exacto pero es un castigo puro, y eso a la larga cansa.

**(c) Rango angosto: 0 / +1 / +2, con +2 poco frecuente.**
Es lo que propuse arriba. El más divertido y el que más riesgo tiene.

> **Recomiendo (a).** Es el único que se puede meter sin volver a calibrar las
> 90 semanas. Y tiene una ventaja de diseño: el ánimo es el medidor más flojo
> del juego hoy —el propio `test.sh` reporta como deuda que *"el ánimo se satura
> (llega a 100 y se queda) y deja de ser un medidor"*— así que darle una fuente
> de variación es arreglar dos cosas con una.

## 4 · El caso de `ver_rival` es distinto y más fácil

`ver_rival` **no toca ninguna stat**: da información. Un minijuego ahí no mueve
la progresión de la carrera en absoluto — mueve **cuánto sabés el domingo**, que
es una ventaja táctica y no una permanente.

**Por eso `ver_rival` es el minijuego seguro y `entrenar_tiro` es el riesgoso.**
Si hay que hacer uno solo, es `ver_rival`.

Un solo cuidado: si acertar las tres te da mucha ventaja, `ver_rival` pasa a ser
la única acción que se elige siempre. Se controla haciendo que las pistas duren
**un solo partido** (que ya es como funciona `espia_rival`) y que la tercera
—el jugador peligroso— sea la difícil.

---

## Resumen

| | ENTRENAR TIRO | VER AL RIVAL |
|---|---|---|
| **el minijuego** | cinco pelotas a la zona encendida | mirás y después te preguntan tres cosas |
| **el gesto** | puntería con el dedo | observación |
| **dura** | ~20 s | ~40 s |
| **costo** | ~2 días | ~3 días (o ~1,5 con la versión pizarra) |
| **arte nuevo** | no | no |
| **riesgo de balance** | **alto** (toca la stat, y la stat está calibrada a 90 semanas) | **bajo** (no toca ninguna stat) |
| **qué haría** | que mueva el ÁNIMO, no la stat | hacerlo tal cual |

**Si hay que elegir uno: `ver_rival`.** Es el que arregla una acción que hoy es
aburrida, el que no toca la calibración de la carrera, y el único de los dos que
introduce un verbo que el juego todavía no tiene.
