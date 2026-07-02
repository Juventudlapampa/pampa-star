# PAMPA STAR — Diseño del Partido v2: "Con equipo se juega mejor"

> Documento de diseño para Claude Code. Rediseña el partido para que se juegue
> como un juego de fútbol por comandos con EQUIPO: compañeros reales, pase que
> construye, minimapa para leer la jugada y ritmo que progresa hacia el arco.
> Es MECÁNICA replicada con contenido 100% original: nada de sprites, sonidos,
> código ni personajes de Tecmo/Captain Tsubasa. Los amigos los nombra quien
> juega (nunca personas reales, nunca menores). Nada de apuestas.
> Mobile-first apaisado en la cancha, HTML/CSS/JS en index.html, guardado
> `pampa_star_v1` SIEMPRE retrocompatible.

---

## 0. Diagnóstico: por qué hoy se siente que no avanzás

Medido sobre el código actual (v1):

**a. El 1v1 eterno.** En posesión mía hay exactamente 2 defensores + arquero, y
cada uno es un duelo obligatorio (encuentro a <22px con imán hacia vos). No hay
compañeros: PASE y PARED son duelos contra el defensor que ganan metros, igual
que GAMBETA. Son tres nombres para la misma mecánica.

**b. El ping-pong sin memoria.** Perdés un duelo → contra del rival → duelo
defensivo → si lo ganás, atacás desde donde estás... con defensores nuevos
(`spawnDefenders` regenera 2 cada vez). El progreso neto de un ciclo
atacar-perder-defender-recuperar es ~cero. La sensación de "saco y recupero
todo el tiempo sin avanzar" es literalmente el sistema.

**c. La cuenta no da para los especiales.** El reloj salta 5–9' por acción
(~13 acciones por partido). Llegar al arco encadena 2 duelos (~50% c/u) + el
arquero: cada intento consume 2–4 acciones. Resultado típico: 2–3 llegadas por
partido, con Guts ya gastado (cada comando cuesta 4–10 sobre ~70–100 iniciales).
El Disparo del Caldén pide 25 Guts en el área: casi nunca se da. El contenido
más lindo del juego es inalcanzable por matemática, no por dificultad.

**Metas de ritmo para v2** (criterios de aceptación al final):

| Métrica por partido | v1 actual | Objetivo v2 |
|---|---|---|
| Posesiones mías | 4–6 | 8–12 |
| Llegadas al área rival | 1–3 | 3–5 |
| Encuentros por posesión | 2–3 obligatorios | 1–2 elegibles |
| Posesiones con 2+ pases | 0% (no hay pase real) | >60% |
| Tiros especiales usables (nivel 3+) | ~0 | ≥2 oportunidades |

---

## ORDEN DE IMPLEMENTACIÓN

Cinco etapas, cada una jugable y commiteable por separado.
La A habilita todo lo demás; la E es puro tuning.

---

## ETAPA A — Equipo en la cancha

**Qué cambia.** El partido pasa de "yo + 2 conos" a 5 vs 5: fútbol 5, coherente
con vos + tus 4 amigos (formato ya definido en el addendum de diseño). El rival
también pone 5. Once contra once queda descartado en esta versión: no aporta
lectura en 280px de ancho y multiplica el trabajo.

**Mi equipo (5):**

- VOS (ATA, control inicial).
- Tus AMIGOS reclutados, cada uno en su posición real (ARQ/DEF/VOL/ATA, ya
  existen en `career.amigos` desde la Capa 3, con stats y vínculo propios).
- Si faltan amigos para completar 4, se rellena con **canteranos genéricos**:
  nombre procedural NO-humano ("Cantera 1", "Cantera 2" — nunca nombres con
  apariencia de persona real), stats bajas (35–45), vínculo 0. El mensaje de
  diseño es explícito: reclutar y entrenar amigos mejora al equipo visiblemente.

**Formación 1-1-2-1** (de atrás hacia adelante): ARQ — DEF — VOL VOL — ATA.
Si tus amigos no cubren esas posiciones, el relleno completa lo que falte y tus
amigos juegan SIEMPRE en su posición (un ATA amigo nunca va al arco).

**Movimiento de los compañeros (barato y suficiente):** cada jugador tiene un
**ancla** en X proporcional a la posición de la pelota y una **banda** vertical
propia. Fórmula: `x = clamp(anclaBase + (ballX - WORLD_W/2) * elasticidad, zonaMin, zonaMax)`,
con `elasticidad` por posición (DEF 0.35, VOL 0.55, ATA 0.75) y una deriva
vertical suave hacia la pelota dentro de su banda. Nada de pathfinding: puntos
que acompañan la jugada. El rival usa el mismo sistema espejado.

**Modelo de datos del partido** (en `PS`, no toca el guardado):

```
PS.equipo = [ {ref: 'yo'|amigoIdx|'cantera', pos, nombre, stats, vinculo, guts, x, y, banda} x5 ]
PS.rivales = [ {pos, stats:f(fuerzaClub), x, y, banda} x5 ]
PS.portador = índice del jugador con pelota (mío o rival)
PS.control  = índice de MI jugador controlado (= portador si tengo la pelota)
```

**Guts por jugador** (fiel al espíritu del original y hace que entrenar amigos
pese): cada jugador tiene su propio Guts. Amigos: `55 + resistencia*0.5`,
canteranos 50, vos como hoy (70 base + descanso semanal). El HUD muestra
SIEMPRE nombre + Guts del jugador que controlás en este momento, con etiqueta
de texto (`GUTS · NOMBRE`), nunca solo un color de barra. El entretiempo
recupera +20 a todos.

**Retrocompatibilidad:** guardados viejos sin amigos juegan 1 + 4 canteranos.
Nada del guardado cambia de forma; `PS` es efímero.

---

## ETAPA B — Minimapa / vista de campo

**Qué es.** Una franja-plano de la cancha COMPLETA (los 640px del mundo),
siempre visible, con los 10 jugadores y la pelota. Es el "plan de juego": ahí
leés a quién pasarle y por dónde encarar. El canvas grande sigue mostrando la
ventana local con scroll, como hoy.

**Ubicación mobile-first:** barra horizontal de ~36px de alto entre la barra de
marcador y el canvas (la pantalla del celu es vertical: hay alto disponible; no
tapar el campo con overlays).

**Accesibilidad (regla dura, el dueño es daltónico — FORMA antes que color):**

| Elemento | Forma | Detalle |
|---|---|---|
| Mi equipo | Círculos ● | Borde claro 1px |
| Rival | Triángulos ▲ | Borde claro 1px |
| VOS / jugador controlado | Flecha ▼ encima (la misma del campo) | La flecha SIGUE al control cuando pasa a un compañero |
| Pelota | Punto con anillo ◎ | Siempre visible sobre el resto |
| Dupla de mejor vínculo | Doble borde ◉ + ★ | Ver Etapa E |
| Arcos | Corchetes [ ] en los extremos | |

Colores en HEX sobre el verde HUD existente (`#0d2a18`): míos `#f6efdc`,
rivales `#0a1f13` con borde `#f6efdc`. Aunque los colores se confundan, círculo
vs triángulo resuelve solo.

**Interacción:** tocar un punto propio muestra tooltip 2 segundos: nombre,
posición y vínculo ("RAMONA · VOL · vínculo 72"). No es un control, es lectura.

**Regla de dibujo:** el minimapa se redibuja en el mismo `loop()` del partido,
proyección lineal `mx = x/WORLD_W * anchoMinimapa`. Barato.

---

## ETAPA C — Pase real y juego por el medio

El corazón del rediseño. **El pase deja de ser un duelo que gana metros y pasa
a ser: la pelota viaja a un compañero REAL y el control pasa a ese compañero.**
Se maneja un solo jugador por vez; toda interacción se resuelve por menú.

**C1. Menú de posesión (portador mío):**

```
┌─────────────┬─────────────┐
│ GAMBETA     │ PASE      ▸ │   PASE abre submenú de receptores
│ PARED (1-2) │ TIRO        │
└─────────────┴─────────────┘
```

**C2. Submenú de PASE — hasta 3 receptores**, ordenados por conveniencia:

```
▸ RAMONA (VOL) ▲ adelante   78%  ★dupla
▸ CHELO (ATA)  ▲▲ al espacio 54%
▸ TOTO (DEF)   ▼ atrás      93%  (seguro)
```

Cada opción muestra: nombre, posición, dirección con flechas (▲ adelante,
▼ atrás, ◀▶ lateral — forma, no color), % de éxito y marca ★ si es dupla.

**Cálculo del % de pase:**

```
base 68
+ (paseEfectivo(portador) - 50) * 0.5
+ (pase(receptor) - 50) * 0.2
+ vinculo(par) * 0.12
- presión: 12 si hay marcador encima del PASADOR
- intercepción: (55 - distanciaRivalALinea) * 0.4  si un rival está cerca de la LÍNEA de pase
- 10 extra si es "al espacio" (pase largo)
clamp 25..96
```

El interceptor es el rival más cercano al SEGMENTO pasador→receptor, no al
pasador: pasar "por el medio" entre líneas es posible y se lee en el minimapa.

**Resultados:**

- **Éxito:** la pelota viaja (animación de 300ms, sin duelo), `PS.control` pasa
  al receptor, la flecha ▼ se muda, el HUD anuncia con texto:
  `AHORA JUGÁS: RAMONA (VOL)`. La presión se resetea (tu marcador quedó atrás).
- **Falla:** intercepción → posesión rival desde ese punto. (Ver Etapa F: no
  toda falla es contra letal.)

**C3. PARED (uno-dos).** Requiere un compañero a rango adelante. Es EL comando
para zafar de la presión sin perder el control:

```
% = base 55 + (paseEfectivo)*0.35 + vinculo(par)*0.20 - defensa del presionador*0.3
```

- Éxito: saltás al presionador (avanzás ~34px como hoy), SEGUÍS con la pelota
  vos, y el par gana +1 vínculo (máx +3 por partido). Con vínculo ≥70, la
  primera pared del partido con esa dupla **sale automática** ("se conocen de
  memoria" — se anuncia con texto y ★★).
- Falla: pelota dividida (Etapa F).

**C4. Construcción por el medio.** Incentivos concretos, no vibes:

- Receptor VOL en el tercio central: +8% al pase.
- **Jugada armada:** 3 pases exitosos seguidos en la misma posesión → el equipo
  "sube" (las anclas avanzan 40px) y el próximo TIRO o GAMBETA gana +10%.
  Anuncio con texto: `¡JUGADA ARMADA! +10%`.
- El pase cuesta 2–3 Guts (vs 8–10 de gambeta/tiro): construir es la ruta
  barata; gambetear, la ruta rápida y cara. Elegir es el juego.

**C5. Tiros especiales:** siguen siendo TUYOS (del personaje). Para usarlos
tenés que llegar vos al área: la jugada natural es construir con pases y
recibir el último pase adentro. Eso convierte a los amigos en la llave de los
especiales, que es exactamente el círculo vida→cancha de la Capa 3.

---

## ETAPA D — Posiciones y habilidades (menús por rol)

Cada rol tiene su menú propio. El duelo usa las stats DEL JUGADOR QUE
CONTROLÁS en ese momento (entrenar amigos pesa en cada comando).

**Portador ATA (vos o amigo ATA):** GAMBETA / PASE / PARED / TIRO
(+ especiales solo si sos vos y tenés nivel).

**Portador VOL:** GAMBETA / PASE / PARED / **PASE FILTRADO** — habilidad propia
del volante: un pase que rompe la línea defensiva (ignora la penalización por
presión del pasador; usa `pase*0.8 + caracter*0.3`). El VOL también tiene
**CAMBIO DE FRENTE**: pase lateral largo que mueve la pelota a la otra banda y
resetea TODA la presión (barato en %, no avanza).

**Portador DEF:** PASE / **DESPEJE** (100% seguro: pelota dividida lejos, nunca
gol en contra — la salida cobarde pero sana) / SUBIDA (gambeta con −10%).

**Defensa (rival ataca, controlás al más cercano):** QUITE / CORTE DE PASE /
BLOQUEO — como hoy, pero con las stats del defensor controlado. Si tu amigo
DEF está cerca: **CIERRE** (cuarto comando: tackle de cobertura, usa el
`fisico` del amigo + tu `caracter`*0.2).

**ARQUERO (tiro rival):** deja de ser automático. Menú de tres:

| Comando | Fórmula | Después |
|---|---|---|
| ATAJAR | `fisico*0.7 + caracter*0.4` del ARQ | Si ataja: elegís a quién saca (submenú de pase) → contra tuya |
| DESPEJAR | +12% de atajar, pero pelota dividida en el medio | Disputa neutral |
| ATAJADA ESPECIAL | −20 Guts del ARQ, +25% | Requiere amigo ARQ con vínculo ≥50; anuncio dramático propio |

Con canterano en el arco solo hay ATAJAR: otra razón visible para reclutar.

**Pesos de stats por posición** (mismo comando, manos distintas):

| Comando | ATA | VOL | DEF |
|---|---|---|---|
| Gambeta | gambeta×1.0 | gambeta×0.9 | gambeta×0.7 |
| Pase | pase×1.0 | pase×1.15 | pase×0.9 |
| Tiro | tiro×1.0 | tiro×0.85 | tiro×0.6 |
| Quite | fisico×0.7 | fisico×0.85 | fisico×1.1 |

(Multiplicadores sobre la stat efectiva con Guts, tabla única `PESOS_POS` como
constante afinable arriba del script.)

---

## ETAPA E — Química y parejas, VISIBLE

La química ya existe (vínculo 0–100 por amigo, Capa 3). La v2 la hace jugable
y sobre todo LEGIBLE:

**Dónde pega** (resumen de fórmulas de C):
pase +vínculo×0.12 · pared +vínculo×0.20 · pared automática con vínculo ≥70 ·
atajada especial requiere vínculo ≥50 · par amigo-amigo (pase entre dos
amigos): usa el promedio de sus vínculos con vos ×0.6 (v2 no agrega matriz
amigo-amigo al guardado; queda para v3 con la rotación de plantel).

**Cómo se muestra (siempre forma + texto, nunca solo color):**

1. **En el submenú de pase:** ★ + palabra "dupla" en el receptor con vínculo
   ≥60, y el % ya la incluye (el número ES la prueba de que el vínculo paga).
2. **En el minimapa:** doble borde ◉ en el compañero de mejor vínculo.
3. **PIZARRA en la semana** (pantalla nueva chica, entra en la de semana): tabla
   de duplas — `VOS + RAMONA · vínculo 72 · pared 86% · "se conocen de memoria"`.
   Es el lugar donde el jugador PLANIFICA a quién juntarse esta semana.
4. **Post-partido:** "La dupla de la tarde" (el par con más pases conectados)
   gana +1 vínculo, anunciado en la pantalla final.

---

## ETAPA F — Ritmo y balance (el arreglo del ping-pong)

**F1. Marcaje selectivo (mata el 1v1 eterno).** Los encuentros ya no se
disparan por proximidad contra todos: cada tercio de cancha tiene UN marcador
asignado (el rival de la zona). Correr por espacio libre ES libre. El encuentro
se dispara solo si: entrás al radio del marcador de tu tercio (`PRESION_RADIO
= 26px`) o retenés la pelota >4 segundos en su zona. **Pasar la pelota te saca
de encima al marcador** (el receptor arranca sin presión hasta cruzar a otro
tercio). Presupuesto resultante: 1–2 encuentros por posesión construida, 2–3 si
vas a pura gambeta.

**F2. Pelota dividida (mata el todo-o-nada).** Perder un duelo de ataque ya no
es contra automática. Tira 1d100:

- 45%: contra rival clásica (como hoy).
- 35%: **pelota dividida** — disputa automática instantánea entre tu compañero
  más cercano y el rival más cercano (stats `fisico+velocidad`, sin menú, texto
  de una línea). Si la gana tu equipo, seguís atacando desde ahí con ese
  jugador. El ciclo perder-defender-recuperar-desde-cero se corta.
- 20%: lateral/afuera → reanuda con pase tuyo desde la banda (menú de pase).

**F3. El rival también construye por fases.** En defensa el rival avanza en 3
saltos de tercio (elige gambeta/pase con IA de pesos según sus stats), con UN
encuentro tuyo elegible por tercio (controlás al defensor más cercano; tu amigo
DEF suma CIERRE). Ya no es la corrida continua con imán: da tiempo a leer el
minimapa.

**F4. Números** (constantes afinables, una tabla arriba del script):

| Constante | v1 | v2 | Por qué |
|---|---|---|---|
| `MINUTOS_POR_ACCION` (duelo) | [5,9] | [3,5] | ~22 acciones/partido |
| Minutos por pase exitoso | — | [1,2] | Pasar no quema el reloj |
| Guts: pase / pared | 4 / 6 | 2 / 4 | La construcción es barata |
| Guts: gambeta / tiro | 8 / 10 | 8 / 10 | Igual: la ruta cara |
| `PRESION_RADIO` | 22 (todos) | 26 (solo marcador) | Menos, mejores encuentros |
| Defensores con encuentro/posesión | 2 fijos | 1–2 elegibles | El jugador decide cuáles |
| Especial: Caldén | 25 Guts | 25 Guts | Ahora alcanzable: llegás con 55–70 |

**F5. Simulación de sanidad** (para verificar el balance sin jugar 50 partidos):
correr 500 partidos con IA random-razonable por consola y chequear: goles/partido
2.2–3.4 entre ambos, posesiones mías 8–12, ≥1 oportunidad de especial por
partido a nivel 3+. Si algo da afuera, tocar SOLO las constantes de F4.

---

## Criterios de aceptación (playtest)

1. En un partido cualquiera puedo: pasar a un amigo REAL, ver que el control
   cambia (flecha + texto "AHORA JUGÁS:"), y llegar al área con 2+ pases.
2. El minimapa me deja decidir un pase mirando dónde están rivales (triángulos)
   y míos (círculos), sin depender de ningún color.
3. Con nivel 3+, en la mayoría de los partidos llego al mano a mano con ≥25
   Guts al menos una vez (el Caldén se usa de verdad).
4. Un partido completo dura 5–8 minutos reales.
5. Un guardado v1 viejo abre y juega la v2 sin romperse (amigos faltantes =
   canteranos).
6. Ninguna información de juego depende solo del color (revisar minimapa,
   duplas, menús con la checklist de daltonismo del proyecto).

## Qué NO entra en v2 (etapas futuras)

11 vs 11 · faltas, córners y offside · matriz de vínculo amigo-amigo ·
rotación de plantel (venta/compra, viene definida en el addendum como etapa
aparte) · planteles reales rivales (etapa aparte con sus guardas) · más de un
jugador controlado a la vez (nunca: un jugador por vez, todo por menú).

---

*v2 diseñada el 2026-07-02. Orden: A equipo → B minimapa → C pase →
D roles → E química visible → F ritmo. Cada etapa se commitea jugable.
El código lo implementa Claude Code en su sesión; este documento es la spec.*
