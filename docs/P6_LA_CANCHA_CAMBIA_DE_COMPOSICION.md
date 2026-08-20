# P6 · QUE LA CANCHA CAMBIE DE COMPOSICIÓN

**Propuesta. No está implementado nada.** Rodri elige el camino.

---

## LO QUE DIJO RODRI, Y POR QUÉ TIENE RAZÓN

> En Captain Tsubasa, cuando hay un pase largo o un remate, la composición del
> campo CAMBIA — la cámara avanza, las distancias se reencuadran, aparece una
> nueva realidad espacial. Acá todo pasa siempre en el mismo plano fijo y por
> eso "no hay espacio" y todo se amontona.

Es exacto, y se puede ver en el código. Hoy la mitad de arriba de la pantalla es
**un solo encuadre, siempre el mismo**: `panelLayer`, una ventana fija de
960×232 con el portador de perfil, el pasto y la tribuna moviéndose por
parallax. Cambia *quién* está adentro y *qué pose* tiene. **No cambia nunca el
punto de vista.**

Un pase de 40 metros y un toque de 3 se dibujan con la misma cámara, a la misma
distancia, con el mismo horizonte. Por eso no hay espacio: **la distancia no se
representa, solo se nombra.**

Lo que en Tsubasa pasa —y acá no— es que el espacio se **re-establece** en cada
jugada: plano general para mostrar dónde estás, corte a un plano nuevo cuando la
pelota sale, y la pelota llega a *otro lugar* que se presentó recién.

---

## LO QUE YA ESTÁ CONSTRUIDO (y por eso esto no arranca de cero)

Antes de los caminos, lo que hay. Esto es lo que hace que los costos de abajo
sean reales:

| Pieza | Dónde | Qué hace |
|---|---|---|
| `logic/perspectiva.js` | lógica pura | Proyecta una profundidad `d ∈ [0,1]` a escala y altura en pantalla. **La matemática de la profundidad ya está resuelta y testeada.** |
| `dibujarCanchaProfunda(vp, nearY)` | `match.js` | Ya dibuja una cancha en fuga con punto de fuga, líneas que convergen y el arco al fondo. **Se usa en un solo plano del cine.** |
| `arcoCine()` | `match.js` (P2) | La geometría del arco en un solo lugar, de la que ya cuelgan cuatro desenlaces. |
| El panel y sus perillas | `balance.vista` | `panel_techo_y`, `panel_suelo_y`, `panel_figura_frac`, `panel_figura_x`, los tres factores de parallax. **El encuadre ya es data.** |
| `logic/drama.js` | lógica pura | Decide qué acción merece pantalla (los tres escalones). **El criterio de "esto importa" ya existe.** |
| El cine de 5 planos | `match.js` | Ya corta a pantalla completa y encadena planos con corte seco. |

**La conclusión honesta: la profundidad ya está resuelta y se usa en un solo
lugar.** Ninguno de los tres caminos inventa maquinaria nueva de cero.

---

## LOS TRES CAMINOS

### OPCIÓN A · EL PANEL CAMBIA DE ENCUADRE
*(el más barato, el menos ambicioso)*

El panel sigue siendo una ventana fija, pero deja de tener **un** encuadre y
pasa a tener **cinco**, y elige según la acción:

| Encuadre | Cuándo | Cómo se hace con lo que hay |
|---|---|---|
| **Lateral** | correr, gambetear (hoy) | tal cual está |
| **Plano largo** | recibir, buscar espacio | figura al 45% del alto, horizonte arriba, parallax lento, más siluetas |
| **Contrapicado** | rematar | figura al 110%, horizonte abajo, cielo dominante |
| **Picado** | el pase largo sale | horizonte arriba del todo, figura chica, pasto ocupando casi todo |
| **Primer plano** | la decisión, el cruce | figura al 160%, sin pasto, tribuna desenfocada |

Cada encuadre es una **combinación de números que ya existen**: escala de la
figura, altura del horizonte, velocidad de parallax, cantidad de siluetas, qué
capa de fondo se ve. Nada de código nuevo de render.

- **Costo: 1 tanda.** Una tabla de encuadres en `balance.vista.encuadres` + un
  selector que la lea (mismo molde que `drama.js`).
- **Arte nuevo: ninguno obligatorio.** Queda mejor con 2 fondos más (cielo
  limpio para el contrapicado, pasto de cerca para el picado).
- **Riesgo: BAJO.** Es el mismo panel con otros números; si algo se ve mal, se
  cambia un número.
- **Lo que NO resuelve:** la pelota sigue viajando adentro del mismo espacio.
  Hay más variedad de plano, pero no hay *una nueva realidad espacial*.

---

### OPCIÓN B · EL PASE LARGO ABRE LA CANCHA PROFUNDA
*(el que yo recomiendo)*

El panel deja de tener un solo **modo espacial** y pasa a tener dos:

- **modo LATERAL** (el de hoy): de perfil, para correr y gambetear. La cancha se
  lee de izquierda a derecha.
- **modo PROFUNDO** (nuevo, pero con la maquinaria hecha): la cámara se para
  **detrás del que la tira** y mira hacia el arco. El receptor aparece **chico
  en el fondo y crece** mientras la pelota viaja. Las líneas convergen al punto
  de fuga.

El corte entre los dos modos es lo que Rodri está pidiendo: **el pase largo
saca la cámara de donde estaba y la pone en otro lado.** La pelota sale del
plano lateral, corte seco, y aterriza en un espacio que se acaba de presentar.

Cuándo entra el modo profundo:
- pase largo (más de X metros — la distancia ya se calcula)
- remate desde afuera del área
- la megacorrida (que ya corre hacia el arco)
- el saque del arquero

**Lo importante: `dibujarCanchaProfunda()` y `perspectiva.js` ya hacen esto.**
Hoy viven encerrados en un solo plano del cine. El trabajo no es inventarlos: es
sacarlos de ahí y volverlos un modo del panel, con el estado del partido
alimentándolos en vivo en vez de una animación cerrada.

- **Costo: 1,5 a 2 tandas.** Convertir el plano profundo en un modo vivo del
  panel + el criterio de cuándo entra + la coherencia con el mapa de abajo
  (el mapa tiene que decir dónde estás mientras arriba cambió el punto de vista).
- **Arte nuevo: 2 poses.** Un jugador **de espaldas** (que es como se ve el que
  la tira en el plano profundo) y uno **recibiendo de frente**. Sin esas dos, el
  modo profundo se ve con las poses de perfil giradas, que es lo que se nota.
- **Riesgo: MEDIO.** Son dos modos que hay que mantener coherentes. El peligro
  concreto: que el jugador se pierda al cambiar de punto de vista. Se resuelve
  con el mapa de abajo, que no cambia nunca — es el ancla.
- **Lo que resuelve:** esto **sí** es una nueva realidad espacial, y es la que
  más se parece a lo que describió Rodri.

---

### OPCIÓN C · EL PARTIDO SE CUENTA POR PLANOS
*(el techo, y el más caro)*

Se termina el panel permanente. La mitad de arriba pasa a ser una **sucesión de
planos** elegidos por un módulo director, igual que `drama.js` elige escalones:
cada momento del partido consulta una tabla de planos y corta.

Es la gramática entera del anime: general → medio → detalle → reacción. Con
corte seco, con duración por escalón, y con reglas de continuidad (no cortar dos
veces al mismo plano, no cruzar el eje).

- **Costo: 3 a 4 tandas.** Un `logic/director.js` (puro, testeable) + una
  biblioteca de planos + reescribir la mitad de arriba del partido.
- **Arte nuevo: bastante.** Cada tipo de plano quiere su encuadre de figura.
  Mínimo 6 poses nuevas y 3 fondos.
- **Riesgo: ALTO.** Toca el corazón de lo que ya funciona. Y hay un riesgo de
  diseño real: **un juego no es una película** — si el jugador tiene que decidir
  mientras la cámara corta, se marea. Habría que separar bien qué momentos son
  *para mirar* y cuáles son *para jugar*.
- **Lo que resuelve:** todo. Es el techo.

---

## LO QUE RECOMIENDO, Y POR QUÉ

**La B.**

- La A es barata pero no resuelve el problema que Rodri nombró: más variedad de
  plano no es una nueva realidad espacial. Se sentiría mejor y seguiría sin
  haber espacio.
- La C resuelve todo pero es la clase de cambio que rompe cosas que hoy andan, y
  encima arrastra un riesgo de diseño (cortar mientras se decide) que no está
  probado en este juego.
- **La B ataca exactamente lo que se nombró** —el pase largo y el remate— con
  la maquinaria que ya está construida y testeada, y deja el mapa de abajo como
  ancla para que nadie se pierda.

Y hay algo más: **la B es el primer paso de la C.** Si sale bien, agregar más
modos espaciales después es repetir el mismo trabajo. Si sale mal, se apaga con
un flag y no se llevó puesto nada.

### Si la B sale bien, el orden natural sería
1. modo profundo en el pase largo (lo que se propone acá)
2. el remate desde afuera entra al mismo modo
3. recién ahí, la tabla de encuadres de la A, que se vuelve barata
4. y si todavía falta, la C

---

## LO QUE NECESITO DE RODRI

1. **Qué camino** (A, B o C).
2. Si es la B: **las dos poses** (jugador de espaldas, jugador recibiendo de
   frente). Sin eso el modo profundo se ve con poses de perfil, y se nota.
3. Nada más. El resto se hace con lo que hay.
