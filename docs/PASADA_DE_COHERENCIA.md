# PASADA DE COHERENCIA · dos partidos seguidos del Modo Master

Jugados de punta a punta después de tocar música, remate, semana, entrevista,
mapa y pasillo en la misma corrida. Sin buscar nada en particular.

**Recorrido:** tabla → JUGAR LA FECHA → la semana (tres acciones) → la entrada
a la cancha → el tempo → un remate → el final → vuelta al master → **segundo
partido** con el mismo recorrido.

Capturas en `.claude/shots/COH_01` a `COH_08`.

---

## Lo que ANDA (y lo confirmo porque estaba tocado)

- **El segundo partido está limpio.** Momento `partido`, fecha de audio 1 →
  `partido_alt` → `Voltage_Breakaway_loop.ogg`: la alternancia funciona y el
  segundo partido suena distinto al primero. Todas las banderas en cero
  (`_musicaTrabada`, `_temaFinalPuesto`, `_urgente`, `_finalApagado`), fichas
  2/2/2 llenas, **0 momentos de música desconocidos y 0 pedidos tardíos**.
- La cadena de música completa del recorrido, sin un solo hueco:
  `espera → semana → (silencio) → entrada → partido → gol_festejo → (silencio)
  → espera → semana → (silencio) → entrada → partido`.
- Los 10 momentos siguen registrados después de dos partidos.
- **El HUD del partido no tiene ni un solape.** Lo verifiqué con cajas reales
  (29 objetos de texto, 0 solapes).

> **Una corrección mía:** mi primer test de solapes comparaba distancias entre
> centros sin tener en cuenta el origen de cada texto, y me dio tres falsos
> positivos que casi reporto. Rehecho con las cajas de verdad, dan cero. Lo
> anoto porque el método malo es el que iba a hacerte perder el tiempo.

---

## LO QUE ESTÁ MAL

Ordenado por qué tan feo se ve.

### 1 · Tu club y un rival pueden ser del mismo pueblo

El juego arma tu club como `"Club " + pueblo`, y las divisiones ya tienen un
club de ese pueblo entre los rivales. En la tabla te aparecen los dos.

| división | choques |
|---|---|
| **primera_b** | Winifreda — tu *Club Winifreda* vs su *Deportivo Winifreda* |
| **primera_a** | **cinco**: General Pico, Santa Rosa, Victorica, Realicó, Macachín |

En la captura `COH_01` se ven las dos filas: `4 ►Club Winifreda` y
`9 Deportivo Winifre`. Y en el segundo partido el rival ES tu propio pueblo:
el marcador dice **"VOS 0 - 0 DEPORTIVO WINI"**.

En una liga de diez equipos de una provincia chica, dos clubes del mismo pueblo
se lee como un error. Y cuando ascendés a Primera A pasa con la mitad.

**Lo que yo haría:** tu club **es** el club de tu pueblo. Si la división tiene
uno de ahí, ese pasa a ser el tuyo (te quedás con su nombre y su apodo) y no
aparece como rival. La liga sigue teniendo diez. Es más real y elimina el
duplicado. **No lo hice porque es decisión tuya**: cambia con qué nombre jugás.

---

### 2 · Las columnas de la tabla no se alinean

Las filas se arman rellenando con espacios, pero se dibujan con una fuente
**proporcional**. Medido: los anchos de fila van de **201 a 229 px** — 28 px de
diferencia. Los números no caen debajo de su encabezado.

Se ve claro en `COH_01`: la fila de *Centro Oeste* (nombre corto) tiene los
números corridos a la izquierda respecto de *Atlético Carro Qu*.

**El arreglo:** cada columna como su propio texto en una x fija. Es la única
forma que no depende de la fuente. **Medio día.**

---

### 3 · El nombre del rival se corta a mitad de palabra

`match.js:216` y `:228` hacen `.toUpperCase().slice(0, 14)`. Sale:

- `CULTURAL ARGENTINO` → **"CULTURAL ARGEN"**
- `DEPORTIVO WINIFREDA` → **"DEPORTIVO WINI"**

Y aparece en tres lugares: el marcador de arriba, el cartel del resultado y la
pantalla de fin. **El arreglo:** cortar en el último espacio antes del límite, o
abreviar la primera palabra (*"CULT. ARGENTINO"*). **Media hora.**

---

### 4 · "¡LE PEGA VOS!"

`tiroPorComandos` arma el título como `"¡LE PEGA " + (esVos ? "VOS" : nombre)`.
Con un compañero queda bien (*"¡LE PEGA RAMIRO!"*), con vos queda mal dicho.
Se ve en `COH_05`. Debería ser **"¡LE PEGÁS!"**. **Cinco minutos.**

---

### 5 · El tempo te lo pregunta antes de CADA partido

`abrirMenuTempo` se abre en cada `create()`. En una temporada de 18 fechas son
18 veces la misma pregunta, y el 90% de las veces vas a elegir lo mismo.

**Lo que hacen los juegos:** se acuerdan, y te dejan cambiarlo. Guardar el
preset en el save y ofrecer *"jugás en INTERMEDIO · ✎ cambiar"* como un renglón
chico. **Un par de horas.**

---

### 6 · En la pantalla de fin, el panel sigue mostrando al rival corriendo

`COH_06`: el cartel dice **GANASTE 2-1** y arriba se ve al **rival naranja**
trotando, con su nombre (*▲ 10 · RAMIRO*). El partido terminó y el panel sigue
en modo partido.

Debería quedarse en vos, o pasar al festejo. **Un par de horas.**

---

### 7 · El botón ⚡ ACCIÓN sigue vivo en la pantalla de fin

Mismo `COH_06`: abajo a la derecha sigue el botón de acción del partido, con su
*"ESPACIO = ACCIÓN"*. El partido terminó: no hay acción que hacer.

---

### 8 · Las siete tarjetas de la semana repiten el mismo renglón

`COH_03`: una vez armada la semana, las siete acciones dicen todas
*"la semana ya está armada"*. Siete veces lo mismo, en rojo, es ruido.

Es **mío**, de la tanda D2 — le puse el motivo a cada tarjeta y no pensé en el
caso donde el motivo es el mismo para todas. Debería decirse **una vez**, arriba
del grupo. **Media hora.**

---

### 9 · La semana pide su música en cada repintado

Medido: `pedirMusica("semana")` se llama **3 o 4 veces** al armar la semana, una
por cada repintado de la vista. No se escucha (el motor ignora el pedido si ya
está sonando ese tema) pero es una llamada por cuadro de más y ensucia
cualquier medición futura de música. **Diez minutos.**

---

### 10 · El cartel del remate le tapa la cara a la figura

`COH_05`: **"¡LE PEGA VOS!"** cae justo sobre la cara y el pecho del jugador.
La ilustración es lo mejor que tiene la escena y el texto la parte al medio.

**Lo que yo haría:** el cartel abajo, sobre la franja de pasto, que ya está
oscura y es donde no hay dibujo. **Una hora.**

---

### 11 · Hueco muerto en la tabla

Medido: **85 px** vacíos entre la última fila (y=305) y el renglón de la fecha.
En un lienzo de 540 es un sexto de pantalla sin nada. `COH_01`.

---

## Lo que quedó de la pasada, en una línea

De once cosas, **una es un bug de datos que cambia con qué club jugás** (la 1),
**dos son de legibilidad** (2 y 3), **una es mía de esta tanda** (8), y el resto
son cosas que quedaron a medio terminar cuando el partido cambia de estado.

Ninguna rompe el juego. Todas se notan.
