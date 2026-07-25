# HANDOFF · TANDA "AUDITORÍA + PLAYTEST RODRI" (sobre `e757af5`)

**Estado: TODO HECHO, en vivo.** Seis bloques (A-F), seis commits, 16 suites de test
verdes (4.645 asserts), working tree limpio.

Probalo acá 👉 https://juventudlapampa.github.io/pampa-star/phaser/
(si ves lo viejo: es la PWA cacheando — cerrá la pestaña y volvé a abrir)

---

## LOS COMMITS DE ESTA TANDA

| commit | qué |
|---|---|
| `9993d89` | **A** — la VIDA de la carrera + los 3 fixes del playtest |
| `3bfcc98` | **B** — el tiro normal vuelve a ser por comandos |
| `0e2945a` | **D+E+F** — animación arriba, el reloj se ve, las letras |
| `8b07633` | **C** — el jugadón es un MINIJUEGO de gambeta |
| `3cc3b9c` | **§11** — el guardián automático + lo que encontró |

---

## CHECKLIST PARA EL CELU (probá en este orden)

### A1 · LA VIDA DE LA CARRERA (lo grande)
- [ ] Modo Master → **carrera nueva**: aparecen **3 pantallas** antes de empezar
      ("¿Dónde aprendiste a jugar?" / "¿Qué hacés cuando no jugás?" / "¿Qué te dijo
      el que te enseñó?"), 4 opciones cada una, **sin un solo número a la vista**.
- [ ] Al terminar, la ficha corta: *"Thiago, el que aprendió en el potrero de Winifreda"*.
- [ ] Tocá **JUGAR LA FECHA**: sale **un evento de la semana** con 2 opciones. Elegís y
      ya estás en la cancha. **Dos toques, nunca una pantalla de administrar.**
- [ ] Al arrancar el partido, arriba aparece **📋 la frase del relator** con lo que hiciste
      ("Lo trajo al hermanito y jugó para él") — ahí ves que el evento pegó.
- [ ] Jugá 5-6 fechas seguidas: **no se te tiene que repetir un evento** hasta que se
      agote la bolsa. Hay 28 eventos + condicionales (clásico, racha, cosecha, primera fecha).

### A2 · el mapa se queda quieto
- [ ] Abrí un **menú de acción** (o el de pase) en pleno partido: los 21 jugadores del
      mapa de abajo tienen que quedarse **CLAVADOS**. Antes seguían corriendo.

### A3 · el editor
- [ ] Editor de pinta: **ya no está el muñequito de bloques**. Queda solo la cara grande.

### A4 · el tinte
- [ ] Cambiá el **color de pelo**: se tiñe **solo el pelo**. La cara y el cuello quedan
      con su color. El contorno negro tampoco se pinta.

### B · EL TIRO NORMAL (lo más importante)
- [ ] Tocá **TIRO**: **NO** aparece ninguna pantalla de zonas ni barra. Sale
      **la animación del remate** → la pelota **viajando** (la intriga) → adentro o afuera.
- [ ] Probá tirar **de lejos y de costado**: tiene que ir mucho más al medio y flojo.
      **De cerca y de frente**: al ángulo. Cansado al final del partido: peor.
- [ ] Con defensores encima: se nota que descuenta.

### C · EL JUGADÓN
- [ ] Con ficha de **🌟 GAMBETA**: entrás a **otra cancha**, más ancha que larga.
- [ ] **Movés vos** al jugador (dedo arrastrando o flechas). Los rivales **vienen**
      a cerrarte con el nombre arriba.
- [ ] Cuando uno te alcanza, **se congela** y te insinúa lo que va a hacer
      ("SE TIRA AL PISO", "CIERRA POR LA DERECHA"): elegís caño / sombrerito /
      enganche / izquierda / derecha.
- [ ] Si los pasás a todos o **llegás arriba**, la jugada **termina en remate**
      (ahí sí entra el súper tiro si te queda ficha).

### D · toda acción tiene animación
- [ ] Un **pase bien dado** y un **corte/robo** ahora tienen su viñeta arriba.
      Ninguna acción se resuelve solo con un cartel de texto.

### E · el reloj
- [ ] Arriba se lee **MM:SS** y los segundos **avanzan de a 15** por tramo.

### F · las letras
- [ ] Ya no hay letra "de programación": es **Pixelify Sans** (pixel con peso),
      **sin stroke** y con una sombra mínima. Los acentos y las **ñ** se ven enteros.
- [ ] Si algo sigue sin gustarte: está TODO en `phaser/data/balance.json` →
      `tipografia` (familia, sombra x/y/alpha, interletrado). Se cambia ahí, sin tocar código.

---

## DECISIONES QUE TOMÉ (revisalas y decime)

1. **Los efectos de los eventos duran SOLO esa fecha.** Se guardan en `save.modFecha`
   y se borran al volver del partido. Nada se acumula: la carrera no se rompe por
   elegir "mal" tres veces seguidas.
2. **Ninguna opción es la mejor.** Cada una da y saca algo distinto (aguante vs
   carácter, envión vs precisión). No hay respuesta correcta, hay personaje.
3. **El origen sí es permanente** (las 3 pantallas del principio reparten stats de
   entrada), pero repartiendo pocos puntos: define quién sos, no cuánto valés.
4. **El tiro por comandos tiene un flag para comparar**: agregando
   `"flags": { "v8_tiro_comandos": false }` en `phaser/data/balance.json` vuelve
   LA DEFINICIÓN de 4 fases. Si querés el viejo de vuelta en algún contexto, se
   prende ahí (hoy no hay bloque `flags` en el JSON: todos los flags están en
   sus valores por defecto, prendidos, en `match.js:81`).
5. **La velocidad del minijuego es una perilla**: `balance.jugadon.vel_rival` (118).
   Si te lo hacen fácil, subila; si es injusto, bajala.

---

## LO QUE QUEDA ANOTADO (no se hizo en esta tanda)

- **Córner y tiro libre** como situaciones propias (hoy se resuelven como jugada común).
- **Doble cuadro** (dos viñetas simultáneas) en las secuencias largas.
- **Retratos y pieles** del roster: falta variedad.
- **Sonido**: el chiptune está, pero faltan capas en el minijuego de gambeta.
- El commit `3bfcc98` tiene una marca de terceros **en el mensaje de git** (no en el
  producto). No reescribí historia por eso; el guardián §11 mira archivos, no commits.
