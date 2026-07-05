# DISEÑO — LA SELECCIÓN Y EL MUNDIAL (clímax de carrera)

> Documento de diseño para Claude Code. Solo data, escenas, relato y prensa: **no se toca el motor de partido del v3**. Se apoya en lo ya construido: partido por comandos con flujo de escenas y megatiros, editor de pinta, las tres voces del relato (DISENO_PRESENTACION.md), la escalera de categorías y el leitmotiv chiptune de PAMPA STAR.

## 0. Principios

- **Épico pero sobrio y pampeano.** El clímax no es el estadio: es la plaza de [PUEBLO]. La cámara emocional siempre vuelve al pueblo.
- **Adaptativo.** Todo texto usa huecos: [PUEBLO] (localidad elegida), [CLUB] (club de origen en la Liga Cultural), [APELLIDO] (el del avatar), [RIVAL] (rival de turno). Mínimo 2–3 plantillas por beat para que no se repita entre partidas.
- **Nunca personas reales.** Ni jugadores, ni técnicos, ni periodistas, ni alusiones reconocibles ("el 10 zurdo de Rosario" también está prohibido). Los cargos son genéricos: el Técnico de la Selección, el coordinador, el capitán. La Selección Argentina existe como institución; su plantel es 100% ficticio.
- **Selecciones rivales ficticias.** Nunca países reales como rivales; arquetipos que evocan sin nombrar (sección 2.3).
- El Mundial es la cima del ciclo, **no el final del juego**: la carrera sigue después.
- Reglas de siempre: mobile-first apaisado, index.html, guardado retrocompatible, nada de apuestas, nunca menores, todo original.

---

## 1. LA CONVOCATORIA

### 1.1 Condiciones (data)

- **Requisito de categoría:** Primera División o Europa.
- **Nivel de Figura:** promedio de calificación de las últimas 10 fechas de club + bonus por goles/asistencias. Se recalcula cada fecha.
- **Tres umbrales progresivos:** Radar (rumores) → Prellamado → Citación. Si el rendimiento cae, el radar se enfría; la convocatoria **nunca se pierde para siempre**, se vuelve a calentar rindiendo.
- La citación solo llega en una **ventana de Selección** (2 por temporada, ver 2.1).

### 1.2 Las tres señales (rampa de anticipación)

1. **Radar.** Titular en prensa nacional post-partido ("¿Lo estarán mirando?") + una línea nueva del relato. Sutil, sin escena.
2. **Prellamado.** Evento visual: "gente del cuerpo técnico de la Selección estuvo en la platea". Un amigo del equipo te lo comenta en el vestuario. La prensa pampeana explota antes que la nacional (sección 4).
3. **Citación.** El beat grande (1.3).

### 1.3 El beat de la citación (escena en 4 cuadros)

Ritmo lento, silencio, contraste total con el partido.

1. **El llamado.** En Argentina: el utilero del club te avisa "te buscan por teléfono, pibe". En Europa: "llamada desde Argentina, atendé".
2. **La voz.** "Habla la coordinación de la Selección Argentina. El Técnico te quiere en la próxima lista." Sin nombres propios, solo cargos.
3. **El pueblo se entera.** Corte a [PUEBLO]: la radio local interrumpe la programación, en el buffet de [CLUB] alguien pega la lista en la puerta, la bandera del club colgada en la plaza. Plantilla ejemplo: *"En [PUEBLO] no se habla de otra cosa. En [CLUB], donde pateaste por primera vez, la lista de convocados está pegada en la puerta del buffet."*
4. **La camiseta.** Plano de la celeste y blanca con tu número y [APELLIDO]. Leitmotiv de PAMPA STAR en versión solemne (ya definido en el diseño de música).

### 1.4 Primer día en la Selección

- Vestuario nuevo: compañeros estrella **ficticios y adultos**. Tres fijos con personalidad + resto procedural (mismo generador de la escalera, tier máximo):
  - **El Capitán** — Bautista Quiroga, central veterano; te apadrina, es la voz de los beats internos.
  - **El Diez** — Ciro Legazú, la figura; distante al principio, se gana con rendimiento. Desbloqueable: **megatiro combinado** con el tuyo (pared imposible), la única mecánica nueva de toda la etapa y es solo data de megatiro.
  - **El Arquero** — Nicanor "el Ruso" Beltrán, humor seco, alivia la tensión entre partidos.
- **Arrancás suplente.** El debut es entrando desde el banco: beat propio ("los primeros minutos con la celeste"). La titularidad se gana con rendimiento en la fase de Selección.

---

## 2. LA FASE DE SELECCIÓN

### 2.1 Calendario: ventanas de Selección

- **2 ventanas por temporada de club** (mitad y cierre). En cada ventana la temporada se pausa y se juegan 1–2 partidos de Selección. Comprimido y tenso, no simulación exhaustiva.
- **Ciclo mundialista (2 temporadas):**
  - Temporada de la citación: **amistosos** (2–3 partidos, riesgo bajo, sirven para ganarse la titularidad).
  - Temporada siguiente: **Eliminatorias de la Confederación del Sur**, 6 fechas en 3 ventanas. Clasifican los 3 primeros; el 4° va a **Repechaje** (partido único, tensión máxima).
  - Cierre del ciclo: **el Mundial** como evento propio (sección 3).
- Si no clasificás: beat digno de derrota, la carrera de club sigue, y el ciclo vuelve a empezar en 2 temporadas (beat de revancha). Nunca es game over.

### 2.2 Motor

- **El mismo partido por comandos del v3**, sin cambios de código de motor: flujo de escenas, ansiedad del pase, defensa, megatiros. Lo que cambia es data: rivales, dificultad, relato, público, música.
- Novedades data-driven:
  - **Megatiros rivales:** en este tier los rivales también tienen figura con tiro especial (el arquero propio gana protagonismo).
  - **"Dásela al Diez":** opción de comando en posición de remate; cede el protagonismo a cambio de mayor probabilidad. Elegir entre tu gloria y la del equipo es el dilema de la etapa.
  - **Clima de estadio:** multiplicador cosmético de tensión (público, banderas, temblor de pantalla en momentos calientes).
- **Titularidad:** rendir en amistosos te hace titular en Eliminatorias; rendir mal te devuelve al banco (menos minutos → menos Nivel de Figura → presión real).

### 2.3 Rivales: selecciones ficticias (data)

Cada una con estilo, fuerza (1–5), paleta de camiseta y una figura ficticia con megatiro propio. Nombres 100% inventados que evocan arquetipos sin nombrar países.

**Confederación del Sur (Eliminatorias):**

| Selección | Arquetipo | Fuerza |
|---|---|---|
| **Tropania** | El clásico continental: toque, magia, su figura "el Príncipe" | 5 |
| **Cordillania** | Aguerrida, achica espacios; de visitante se juega "en la Altura" (drena stamina, partido especial) | 4 |
| **Orientalia** | Garra, roce, nunca se entrega | 4 |
| **Guaralia** | Pelota parada letal, defensa cerrada | 3 |
| **Litoralia** | Joven, contragolpe veloz | 3 |
| **Andaria** | Ordenada, sin figuras | 2 |
| **Caribia** | Física, imprevisible | 2 |

**Potencias del Mundial (otros continentes):**

| Selección | Arquetipo | Fuerza |
|---|---|---|
| **Nordania** | La máquina: física, ordenada, penales de hierro | 5 |
| **Galonia** | Elegancia, "el Artista" en el mediocampo | 5 |
| **Albiona** | Juego directo, centros y cabezazos | 4 |
| **Sahelia** | Potencia física y velocidad pura | 4 |
| **Kitania** | Disciplina táctica, presión alta | 3 |
| **Atlantia** | Atlética, sin historia futbolera (aún) | 3 |

### 2.4 Dificultad y stakes

- **Tier Selección = un escalón arriba de Europa:** defensas que anticipan, menos ventanas de pase claro, megatiros rivales.
- La dificultad sube dentro del Mundial por ronda (3.2), no solo por rival.
- Balance: el jugador que llegó hasta acá ya domina el sistema; el desafío es de ejecución y de nervios, no de aprender mecánicas nuevas.

---

## 3. EL MUNDIAL

### 3.1 Estructura

- **Sede ficticia** rotativa por ciclo (Costa Dorada, Nordania, Kitania…): puramente cosmética (paleta de estadios, textura de público).
- **Camino del jugador: 7 partidos.** Grupo de 4 (3 partidos, clasifican 2) → octavos → cuartos → semifinal → final. El resto del cuadro se simula; entre partidos, pantalla de resultados con titulares ficticios.
- Grupo sorteado con 1 potencia + 2 selecciones menores; el cuadro de eliminación escala en fuerza hacia la final (la final es siempre contra Tropania o Nordania, el clásico o la máquina).

### 3.2 Rampa de tensión (por ronda)

Cada ronda sube en sincronía cuatro perillas, todas data:

1. **Público y presentación:** más banderas, más ruido, entrada de equipos más ceremoniosa.
2. **Relato:** las tres voces cada vez más al borde (banco de líneas por ronda, sección 4).
3. **Música:** el leitmotiv suma capas y tempo por ronda (engancha con el diseño de música ya hecho). En la final, versión solemne en la entrada — **no se usa el himno real ni ninguna melodía existente**: el leitmotiv ES el himno emocional del juego.
4. **El cuadro de [PUEBLO]:** antes de cada partido de eliminación, un cuadro único "mientras tanto, en [PUEBLO]": la pantalla en la plaza, cada ronda con más gente. Octavos: el buffet de [CLUB] lleno. Cuartos: la plaza. Semi: el pueblo entero, los tractores estacionados alrededor. Final: silencio total, un pueblo conteniendo la respiración. **Este hilo es la rampa emocional del Mundial.**

### 3.3 Definición de la final

Si la final termina empatada: **muerte súbita de jugadas** — se reutiliza el motor tal cual: jugada de ataque alternada, el primero que convierte gana. Máxima tensión con cero código nuevo. (Alternativa descartada: minijuego de penales; es motor nuevo y esta etapa no agrega motor.)

### 3.4 El clímax: campeón del mundo (escena en 5 cuadros)

1. **El pitazo.** Un segundo de silencio absoluto (pantalla casi quieta). Después explota todo. Línea de relato según la voz elegida.
2. **La Copa.** La levantás entre el Capitán y el Diez. Confetti chiptune, leitmotiv triunfal (versión definitiva).
3. **[PUEBLO].** La cámara no se queda en el estadio: corta a la plaza. La bandera de [CLUB] arriba de la multitud. Plantilla: *"A 1.000 kilómetros del estadio, el pueblo más feliz del mundo tiene [HABITANTES] habitantes y se llama [PUEBLO]."*
4. **La vuelta.** Semanas después, sin caravana: el potrero donde empezó. Los pibes de [CLUB] esperándolo. Les deja una pelota. Cuadro final: el jugador de espaldas mirando el potrero, atardecer pampeano, caldén y llanura. Texto: *"De [PUEBLO] al mundo. Del mundo a [PUEBLO]."*
5. **Créditos + estadísticas de carrera completa** (de la B de la Liga Cultural a la Copa). Post-créditos: la carrera sigue; el próximo ciclo es la defensa del título (modo leyenda, mismo sistema).

**Subcampeón / eliminado:** beats propios, dignos, nunca humillantes. El cuadro de [PUEBLO] también existe en la derrota: el pueblo aplaude igual. Setea la revancha del próximo ciclo.

---

## 4. RELATO Y PRENSA

### 4.1 Las tres voces

Usar los **personajes ya definidos en DISENO_PRESENTACION.md** (el streamer, la cabina de radio, la tele). Banco nuevo de líneas para estos eventos, mínimo 3 variantes por evento por voz: rumor de radar, citación (post-partido siguiente), debut con la celeste, gol en Eliminatorias, clasificación al Mundial, debut mundialista, gol en el Mundial, pase a semis, pase a la final, gol en la final, campeón, subcampeón, eliminación en Eliminatorias.

Líneas ancla de tono (Code genera el banco completo respetándolas):

**Campeón:**
- *Streamer:* "CHAT. CHAT. EL PIBE DE [PUEBLO] ES CAMPEÓN DEL MUNDO. CLIPEALO. CLIPEALO TODO."
- *Cabina:* "¡Campeóóóón del mundo! ¡El pibe que pateó por primera vez en una canchita de [PUEBLO] acaba de tocar el cielo con las manos! ¡Abrazate, [PUEBLO]! ¡Abrazate, Argentina!"
- *Tele:* "Final del partido. Argentina, campeona del mundo. Y la historia tiene una dirección: [PUEBLO], La Pampa."

**Citación:**
- *Streamer:* "¿Vieron la lista? ¿LA VIERON? Está [APELLIDO]. El de [PUEBLO]. No es fake, chat."
- *Cabina:* "Y entre los convocados, una historia que empieza en la Liga Cultural: [APELLIDO], de [PUEBLO], a la Selección Argentina."
- *Tele:* "Sorpresa en la lista: [APELLIDO], surgido en [CLUB] de [PUEBLO], recibe su primera citación."

**Gol en la final:**
- *Streamer:* "NO PUEDO. NO PUEDO. GOL DE [APELLIDO] EN LA FINAL DEL MUNDO. ME MUERO EN VIVO."
- *Cabina:* "¡Gooooool! ¡Gol de la Argentina! ¡Gol del pibe de [PUEBLO] en la final del mundo, señores!"
- *Tele:* "Gol de [APELLIDO]. Argentina golpea en la final."

### 4.2 Medios ficticios

**Nacionales:** diario *La Jornada Deportiva*, portal *Pelota Parada*, canal *TDN — Todo Deporte Nacional*.
**Pampeanos:** diario *El Eco Pampeano*, *Radio Amanecer de [PUEBLO]*, semanario *La Voz de [PUEBLO]*.

La prensa pampeana siempre reacciona **antes y más fuerte** que la nacional: para el país sos una nota de color hasta el Mundial; para [PUEBLO] sos la historia del siglo desde el radar.

### 4.3 Titulares por hito (con huecos, 2–3 variantes cada uno)

| Hito | Nacional | Pampeano |
|---|---|---|
| Radar | "¿Lo mira la Selección? El nombre que suena desde el interior" | "ES DE ACÁ: dicen que la Selección mira a [PUEBLO]" |
| Citación | "De la Liga Cultural a la Selección: la citación que nadie vio venir" | "[PUEBLO] TIENE UN CONVOCADO. En [CLUB] no durmió nadie" |
| Clasificación | "ARGENTINA AL MUNDIAL" | "Vamos todos: [PUEBLO] va al Mundial con [APELLIDO]" |
| Semifinal | "A un paso de la gloria" | "El pueblo no respira: [PUEBLO] a una final del mundo" |
| Campeón | "CAMPEONES DEL MUNDO" | "EL PUEBLO MÁS FELIZ DEL MUNDO SE LLAMA [PUEBLO]" |
| Derrota | "Duele, pero se vuelve" | "[PUEBLO] aplaude igual: gracias, pibe" |

### 4.4 Reglas de generación

- Nunca nombres de personas, periodistas ni medios reales; cargos genéricos.
- Los titulares aparecen en la pantalla entre partidos y en los beats correspondientes.
- El relato aparece siempre DESPUÉS del desenlace de cada jugada, respetando el flujo del v3.

---

## 5. DATA (esqueleto para el save, retrocompatible)

```js
save.seleccion = {            // si no existe: la etapa no arrancó, nada se rompe
  estado: "sin_radar" | "radar" | "prellamado" | "citado",
  nivelFigura: 0,             // recalculado por fecha de club
  titular: false,
  ciclo: { fase: "amistosos" | "eliminatorias" | "mundial" | "cerrado",
           fechaEliminatorias: 0, posicionTabla: 0 },
  mundial: { sede: "", ronda: "", eliminado: false, campeon: false },
  vinculoDiez: 0              // desbloquea el megatiro combinado
}
// Selecciones ficticias: array estático { nombre, estilo, fuerza, paleta, figura: {apodo, megatiro} }
```

## 6. QUÉ NO HACER

- No tocar el motor de partido: esta etapa es data + escenas + relato + música ya diseñada.
- Nada de países reales como rivales, ni planteles reales, ni alusiones reconocibles a personas reales.
- No reproducir el himno ni ninguna melodía existente.
- Nunca menores, nada de apuestas, guardado retrocompatible, mobile-first apaisado.

## 7. ORDEN DE BUILD SUGERIDO (commits por parte)

1. Data + condiciones + las tres señales + beat de la citación.
2. Ventanas, amistosos y Eliminatorias (calendario y titularidad).
3. Mundial: estructura, rampa, cuadro de [PUEBLO], beats de final y derrota.
4. Banco de relato y prensa de toda la etapa.

## 8. PREGUNTAS PARA EL CONTROL DE PLAYTEST

¿La citación emociona o pasa rápido? ¿La rampa del Mundial se siente (sobre todo el cuadro de [PUEBLO])? ¿El final sobrio pega o pide más bombo? ¿El tier Selección desafía sin frustrar? ¿El dilema "dásela al Diez" se usa de verdad?
