# PAMPA STAR — Capa de presentación: "Elegí tu relato" + Editor de pinta

> Spec para Claude Code. Diseño y texto, sin código. Se monta sobre el partido
> v3 (máquina de escenas). REGLAS DURAS: personajes 100% inventados — nunca
> personas, programas ni medios reales; cualquier parecido es casualidad y si
> un nombre coincide con alguien real del medio, se cambia. Nunca menores
> reales. Nada de apuestas. Modelo género-neutro: ninguna línea usa él/ella
> para referirse a quien juega (se usa {jugador}, "amigo" como vocativo de
> streamer, o frases neutras). Guardado `pampa_star_v1` retrocompatible.

---

# PARTE 1 — "ELEGÍ TU RELATO"

## 1.1 El sistema

**Qué es.** Antes del partido (y cambiable desde la pantalla de temporada), el
jugador elige QUIÉN le relata: tres modalidades con personajes propios y bancos
de líneas distintos. La mecánica es la misma; cambia la voz. Es la capa de
personalidad más barata y más visible del juego.

**Guardado:** `career.relato = "streamer" | "cabina" | "tele"` (default
`"cabina"`, el más clásico). Campo nuevo con default: retrocompatible.

**Selector (accesible, forma + texto, nunca solo color):** tres tarjetas con
ícono de FORMA distinta + nombre + una línea de muestra real:

| Tarjeta | Ícono | Muestra |
|---|---|---|
| 📱 STREAMER — "Pichi en vivo" | rectángulo vertical (celu) | "CLIP ESO, CHAT." |
| 🎙 CABINA — "La Voz del Oeste" | micrófono | "¡Se viene el pueblo abajo!" |
| 📺 TELE — "Deporte Provincial" | rectángulo horizontal (pantalla) | "Buenas tardes, comienza el encuentro." |

**Dónde se muestra el relato: la CINTA.** Franja de texto fija bajo la barra
de marcador (1–2 renglones, fuente retro, autolimpia a los 4s). Cada modalidad
tiene su marco con FORMA propia: streamer = burbuja de chat con `PICHI:`;
cabina = línea con `🎙 BAGUAL:` o `🎙 PROFE:`; tele = zócalo con borde fino
tipo graph. Regla v3 intocable: la línea aparece DESPUÉS del desenlace visual
de la escena, nunca antes.

**Anti-repetición:** por evento y por partido, bolsa mezclada (shuffle bag):
no se repite una línea hasta agotar las variantes de ese evento. La bolsa vive
en `PS`, no en el guardado.

**Tokens disponibles:** `{jugador}` (tu nombre), `{amigo}` (compañero de la
jugada, si hay), `{club}`, `{rival}`, `{marcador}` (ej. "2-1"), `{min}`.

**Eventos cubiertos (17):** arranque · pase completado · pase cortado ·
gambeta ganada · gambeta perdida · quite · tiro atajado · gol propio · gol
rival · atajada propia · tiro especial (lanzamiento) · entretiempo · últimos
minutos · final ganando · final perdiendo · final empatando · (reservado:
gol de amigo, usa {amigo}).

**Formato de datos para el código:**

```js
const RELATOS = {
  streamer: { arranque:[...], paseOk:[...], ... },
  cabina:   { ... },   // líneas prefijadas con hablante: "BAGUAL: ..." / "PROFE: ..."
  tele:     { ... },
};
```

Líneas de ≤90 caracteres (la cinta es chica y se lee en un vistazo).

## 1.2 Los personajes (todos inventados)

**📱 PICHI (streamer).** "Pichi en vivo", transmite desde una pieza en General
Pico con un póster de la Cultural atrás. Adulto joven, reacciona a TODO como si
fuera una final del mundo, habla con su chat imaginario, pide clips, se
autodecreta "modo DIOS" y sufre de verdad. Cariñoso con el equipo: nunca
maltrata, exagera. Muletillas: "chat", "clipeen eso", "F", "MODO DIOS",
"amigo", "no puede ser", mayúsculas cuando pierde el control.

**🎙 LA CABINA (radio de cancha).** Dupla clásica de AM del oeste pampeano:

- **"El Bagual" Medina**, relator. Voz de tormenta, épica interminable, mil
  palabras por minuto, todo es historia grande aunque sea fecha 3 de la B.
  Muletillas: "¡Atención, atención!", "la redonda", "¡se viene el pueblo
  abajo!", "mi gente", "por todos los santos del campo".
- **"El Profe" Zárate**, comentarista. Ex DT de liga cultural, seco, baja el
  precio con dos palabras y un refrán de campo. Muletillas: "Y bueno,
  Bagual…", "eso en mis tiempos…", "campo y pelota al pie", "que conste".

**📺 DELFINA ROLDÁN (tele).** Conducción de "Deporte Provincial", sobria y
precisa, tercera persona, le gusta el dato justo. Nunca grita: cuando algo es
enorme, baja la voz. Muletillas: "Buenas tardes", "que conste en el análisis",
"la tarde", cifras y marcador.

## 1.3 Banco de líneas

### 📱 STREAMER — Pichi

- **Arranque:** «¡ARRANCAMOS, chat! Hoy gana {club} o me rapo en vivo.» ·
  «En vivo desde la pampa. Banquen a {jugador} que hoy está MODO DIOS.» ·
  «Empezó esto. Si hay gol, clipeamos TODO.»
- **Pase completado:** «Pasesito fino fino. ¿Vieron eso, chat?» ·
  «ESO. Tocá, que el fútbol es de equipo, amigo.» ·
  «La cocina {jugador}, la cocina a fuego lento.»
- **Pase cortado:** «NOOO, el pase no. Me quiero morir, chat.» ·
  «Te la cortaron, amigo. F en el chat.» ·
  «¿A quién le pasaste? ¡AHÍ NO HABÍA NADIE!»
- **Gambeta ganada:** «¡LO MANDÓ A COMPRAR PAN! No puede ser.» ·
  «¡LE ROMPIÓ LA CINTURA! Clip. Clip. CLIP.» ·
  «Esto es un DELIRIO total. Lo dejó pagando.»
- **Gambeta perdida:** «Te comieron el amague. F.» ·
  «No, amigo, ahí se suelta antes… lo dije YO primero.» ·
  «Bueno. Bueno. Respiremos, chat.»
- **Quite:** «¡QUÉ QUITE! Modo muralla activado.» ·
  «Se la sacaste LIMPIA. Aplaudan, chat.» ·
  «GRANDE. Recuperada y a otra cosa, mariposa.»
- **Tiro atajado:** «NOOO, EL ARQUERO. ¿De dónde salió ese pulpo?» ·
  «La tenía, chat. LA TENÍA.» ·
  «Uy no. Uy no uy no. CASI.»
- **Gol propio:** «¡GOOOOL! ¡GOL GOL GOL! ¡ME CAIGO DE LA SILLA!» ·
  «¡GRITÉ TAN FUERTE QUE VINO MI VIEJA! ¡GOLAZO DE {jugador}!» ·
  «CLIP ESO YA. Y suban el volumen. ¡GOOOL!»
- **Gol rival:** «No. No no no. Silencio en el chat, por favor.» ·
  «Nos comimos uno… tranquilos, esto se remonta EN VIVO.» ·
  «F gigante, chat. Pero acá no se llora, se juega.»
- **Atajada propia:** «¡QUÉ MANOS, por favor, QUÉ MANOS!» ·
  «Casi me da algo, pero la sacó. VAMOS.» ·
  «¡EL ARQUERO ES UN MURO! Denle amor en el chat.»
- **Tiro especial:** «AH NO. AH NO, CHAT. VIENE EL ESPECIAL. GRITEN.» ·
  «SE CARGÓ EL CALDÉN. Esto es HISTÓRICO, lo juro.» ·
  «MOMENTO ÉPICO. Volumen al máximo. YA.»
- **Entretiempo:** «Entretiempo, chat. Vayan por agua, yo NO me muevo.» ·
  «Medio partido: {marcador}. Debate en el chat: ¿cómo la ven?»
- **Últimos minutos:** «ÚLTIMOS MINUTOS. Me tiemblan las manos, en serio.» ·
  «No me hablen. NO ME HABLEN. Se define TODO.» ·
  «Quedan dos minutos, chat. Recen a quien recen, AHORA.»
- **Final ganando:** «¡GANAMOS! ¡GANAMOS EN VIVO! ¡ABRAZO VIRTUAL GIGANTE!» ·
  «Se ganó, chat. Hoy se duerme feliz en toda la pampa.»
- **Final perdiendo:** «Perdimos… pero acá no se abandona NUNCA. Mañana hay más.» ·
  «Dolió. Dolió mucho. Pero banco a este equipo A MUERTE.»
- **Final empatando:** «Empate. Gusto a poco, chat. Gusto a POCO.» ·
  «Un puntito. Lo abrazamos igual, qué le vamos a hacer.»

### 🎙 CABINA — El Bagual y el Profe

- **Arranque:** «BAGUAL: ¡Rueda la redonda en el oeste pampeano! ¡Arrancó, mi gente!» ·
  «PROFE: Partido bravo el de hoy, Bagual. {rival} no regala nada.» ·
  «BAGUAL: ¡Atención, atención, que esto ya se juega!»
- **Pase completado:** «BAGUAL: Toca {jugador}, toca y avanza el equipo…» ·
  «PROFE: Bien tocada. Campo y pelota al pie, así se sale.» ·
  «BAGUAL: ¡Circula la redonda con criterio, señoras y señores del campo!»
- **Pase cortado:** «BAGUAL: ¡Uy, la cortaron! La pierde {club}…» ·
  «PROFE: Ese pase estaba avisado, Bagual. Muy telegrafiado.» ·
  «BAGUAL: ¡Se interpone el rival y cambia la historia!»
- **Gambeta ganada:** «BAGUAL: ¡Lo dejó sentado! ¡LO DEJÓ SENTADO!» ·
  «PROFE: Eso, en mis tiempos, era para aplaudir de pie. Que conste.» ·
  «BAGUAL: ¡Qué manera de gambetear, por todos los santos del campo!»
- **Gambeta perdida:** «PROFE: Había que soltarla antes, Bagual. La quiso de más.» ·
  «BAGUAL: ¡Se la quitaron y se complica la cosa!» ·
  «PROFE: El rival marcó bien. Punto para el oficio.»
- **Quite:** «BAGUAL: ¡Recupera {club}! ¡Limpita la quita!» ·
  «PROFE: Así se marca: sin patadas y con paciencia.» ·
  «BAGUAL: ¡La robó y ya piensa en el arco de enfrente!»
- **Tiro atajado:** «BAGUAL: ¡Remata {jugador}…! ¡Y la saca el arquero, LA SACA!» ·
  «PROFE: Bien el uno rival. Le adivinó el palo.» ·
  «BAGUAL: ¡Estaba para gol y apareció el arquero, increíble!»
- **Gol propio:** «BAGUAL: ¡GOOOOOOL! ¡GOL DE {club}! ¡SE VIENE EL PUEBLO ABAJO!» ·
  «BAGUAL: ¡GOLAZO, GOLAZO, GOLAZO! ¡Para todo el oeste: GOOOL!» ·
  «PROFE: Golazo, sí. Y bien construido, que conste en actas.»
- **Gol rival:** «BAGUAL: Gol de {rival}… y el silencio se escucha hasta la ruta.» ·
  «PROFE: Lo veníamos avisando, Bagual. Se durmieron atrás.» ·
  «BAGUAL: Golpearon ellos. Pero esto, mi gente, recién empieza.»
- **Atajada propia:** «BAGUAL: ¡QUÉ ATAJADÓN, por todos los santos del campo!» ·
  «PROFE: Arquero grande se hace en tardes como esta.» ·
  «BAGUAL: ¡Vuela y la saca! ¡De pie las tribunas!»
- **Tiro especial:** «BAGUAL: ¡Atención, mi gente, que se viene el CALDÉN! ¡ATENCIÓN!» ·
  «BAGUAL: ¡Va a sacar TODA la fuerza de la pampa en un zapatazo!» ·
  «PROFE: Cuando la agarra así, Bagual, mejor ir rezando.»
- **Entretiempo:** «BAGUAL: Final del primer tiempo: {marcador}. Y esto continúa.» ·
  «PROFE: Naranjas, charla y a corregir el mediocampo.»
- **Últimos minutos:** «BAGUAL: ¡Minutos finales! ¡Se muerde las uñas hasta el juez de línea!» ·
  «PROFE: Acá se ven los equipos grandes. Cabeza fría.» ·
  «BAGUAL: ¡El reloj corre y el corazón no aguanta, mi gente!»
- **Final ganando:** «BAGUAL: ¡FINAL! ¡GANA {club} Y FESTEJA EL PUEBLO ENTERO!» ·
  «PROFE: Triunfo merecido. Punto final y a casa contentos.»
- **Final perdiendo:** «BAGUAL: Final. Derrota de {club}… pero siempre hay revancha, siempre.» ·
  «PROFE: Se perdió, pero el rumbo está. Palabra de viejo.»
- **Final empatando:** «BAGUAL: ¡Final! Empate y reparto de puntos en la Cultural.» ·
  «PROFE: Punto que suma, Bagual. En la B nadie regala nada.»

### 📺 TELE — Delfina Roldán

- **Arranque:** «Buenas tardes. Desde La Pampa, comienza {club} ante {rival}.» ·
  «Todo listo: rueda el balón en una nueva fecha de la Primera B.» ·
  «Bienvenidos a Deporte Provincial. Arranca el compromiso de la fecha.»
- **Pase completado:** «Buena circulación de {club}.» ·
  «Pase preciso: avanza la jugada.» ·
  «El equipo mueve el balón con criterio.»
- **Pase cortado:** «Intercepción de {rival}: se pierde la posesión.» ·
  «El pase no encuentra destino. Recupera el rival.» ·
  «Lectura rápida de la defensa rival, que corta el circuito.»
- **Gambeta ganada:** «Enorme maniobra individual de {jugador}.» ·
  «Desborde limpio: la marca quedó atrás.» ·
  «Gran gesto técnico. La tribuna lo reconoce.»
- **Gambeta perdida:** «Bien la defensa de {rival}, que corta el avance.» ·
  «La acción individual no prospera: recupera el rival.» ·
  «Le adivinaron la intención. Balón para {rival}.»
- **Quite:** «Quite impecable. {club} retoma la iniciativa.» ·
  «Buena lectura defensiva: cambia la posesión.» ·
  «Recuperación limpia en mitad de cancha.»
- **Tiro atajado:** «Remate de {jugador} y respuesta del arquero.» ·
  «Llegó con peligro, pero el arco sigue en cero.» ·
  «Buena intervención del guardameta rival, que conste en el análisis.»
- **Gol propio:** «Gol de {club}. Define {jugador} con categoría.» ·
  «Llegó el gol: {marcador}. Premio a la insistencia.» ·
  «Gol. La jugada nació en el mediocampo y murió en la red.»
- **Gol rival:** «Gol de {rival}. Golpe para {club}: {marcador}.» ·
  «Anota {rival}. Habrá que rehacer el trámite del partido.» ·
  «Gol del rival, en su primera llegada clara de la tarde.»
- **Atajada propia:** «Notable intervención del arquero de {club}.» ·
  «Atajada decisiva: el marcador no se mueve.» ·
  «Respuesta enorme bajo los tres palos.»
- **Tiro especial:** «Atención: {jugador} prepara su remate especial.» ·
  «Momento cumbre de la tarde en el oeste pampeano.» ·
  «Lo que ocurra ahora puede definir el partido.»
- **Entretiempo:** «Final del primer tiempo: {marcador}. Enseguida volvemos.» ·
  «Se cierra la primera parte. El análisis, en el descanso.»
- **Últimos minutos:** «Minutos finales: {marcador}.» ·
  «El reloj apura: quedan instantes de juego.» ·
  «Cierre de partido con máxima tensión en las tribunas.»
- **Final ganando:** «Final del partido: victoria de {club}. Celebra su gente.» ·
  «Triunfo de {club}, que se lleva tres puntos valiosos.»
- **Final perdiendo:** «Final: derrota de {club}. Habrá tiempo de corregir.» ·
  «No pudo ser: {rival} se queda con el partido.»
- **Final empatando:** «Final: empate {marcador}. Reparto de puntos.» ·
  «Igualdad en el marcador. Un punto para cada uno.»

**Nota de tono:** el streamer exagera pero nunca insulta ni humilla; la cabina
es épica-tierna; la tele jamás ironiza sobre una derrota. Ningún personaje
menciona plata, apuestas, cuotas ni pronósticos.

---

# PARTE 2 — Editor de jugador modular ("TU PINTA")

## 2.1 Principio

Avatar por CAPAS pixel-art dibujadas 100% por código (grillas de caracteres
como las actuales del módulo PSART; nada de IA ni assets externos). Cada
variante tiene NOMBRE visible y se distingue por FORMA además del color
(regla dura de daltonismo). Todos los colores en HEX.

**Grilla base: 16×24 px** (cuerpo entero, de frente). Zonas: filas 0–9 cabeza,
10–17 torso y brazos, 18–23 piernas. Cada pieza es una grilla parcial que se
superpone ('.' = transparente). Escalas: editor ×4 (64×96), fichas ×3,
cut-ins del partido v3 ×5 con marco.

**Orden de dibujo (z-order), de abajo hacia arriba:**

1. CUERPO (piel) → 2. CAMISETA → 3. CARA → 4. PELO → 5. ACCESORIO DE CABEZA →
6. ACCESORIOS DE CUERPO.

## 2.2 Lista completa de piezas y variantes

**Capa 1 — PIEL** (color con nombre; sin significado de juego):

| Etiqueta | HEX |
|---|---|
| Piel clara | #e9b58c |
| Piel trigueña | #c68e5f |
| Piel morena | #8d5a3a |

**Capa 2 — CAMISETA.** Colores automáticos del club (c1/c2 ya en datos).
Variantes por FORMA, dos sub-piezas:

- Patrón: **Lisa** · **A franjas** (verticales) · **Con banda** (diagonal) ·
  **A aros** (horizontales, nueva).
- Cuello: **Redondo** · **En V** (forma distinta en las filas 10–11).

**Capa 3 — CARA.** Dos sub-piezas:

- Ojos (forma): **Grandes** (2×2 abiertos) · **Pillos** (línea entrecerrada) ·
  **Decididos** (con ceja en V).
- Rasgo: **Pecas** (3 puntos #a06a42 sobre mejillas) · **Marca de potrero**
  (rayita #8d5a3a en una mejilla, cicatriz de cancha de tierra) · **Ninguno**.

**Capa 4 — PELO.** Corte (SILUETA distinta cada uno) × color:

| Corte (forma) | Silueta |
|---|---|
| Rapado | línea fina al ras |
| Corto | casquito clásico |
| Flequillo | casco con mechón sobre la frente |
| Melena | cae a los costados hasta el mentón |
| Rulos | contorno de bultos irregulares |
| Colita | corto + atadito que sobresale atrás (nueva) |

| Color (etiqueta) | HEX |
|---|---|
| Azabache | #241a10 |
| Castaño | #6b4326 |
| Rubio trigo | #c9a227 |
| Colorado | #a53f1f |
| Canoso | #b9b9c4 |
| Violeta fantasía | #8e6bbf |

**Capa 5 — ACCESORIO DE CABEZA:** **Vincha** (banda en la frente con nudo
visible al costado — forma propia; color = secundario del club) · **Ninguno**.
Compatible con todos los cortes (sobre Rapado se ve la banda sola; con Melena
el pelo cae por fuera).

**Capa 6 — ACCESORIOS DE CUERPO** (elegir hasta 2):

| Accesorio | Forma |
|---|---|
| Muñequeras | bloques 2px en ambas muñecas (color secundario del club) |
| Medias caídas | medias arrugadas abajo, canilla a la vista (silueta de pierna distinta) |
| Canilleras a la vista | placas #d9e6ee sobre las medias |
| Cinta de brazo | banda en el brazo (SOLO para tu jugador: es tu marca de identidad en cancha) |
| Ninguno | — |

Combinaciones totales: 3×8×9×36×2×11 ≈ **170.000 pintas posibles**. Ninguna
regla de bloqueo salvo: Cinta de brazo exclusiva del jugador propio.

## 2.3 Modelo de datos y retrocompatibilidad

`career.look` conserva sus claves actuales y suma nuevas con default:

```js
look = {
  piel: 0..2,                    // ya existe
  pelo: 0..4,                    // LEGADO: se mantiene por compatibilidad
  camiseta: 0..2,                // ya existe (índice de patrón)
  corte: 0..5, colorPelo: 0..5,  // NUEVOS (reemplazan a 'pelo' al leer)
  ojos: 0..2, rasgo: 0..2, cuello: 0..1,
  vincha: 0|1, accesorios: [..hasta 2 índices..],
}
```

**Migración de guardados viejos** (una sola vez, al cargar): si `corte` no
existe, derivarlo de `pelo`: 0 Rapado→(Rapado, Azabache) · 1 Corto oscuro→
(Corto, Azabache) · 2 Corto claro→(Corto, Rubio trigo) · 3 Largo oscuro→
(Melena, Azabache) · 4 Largo colorado→(Melena, Colorado). El campo `pelo`
legado no se borra (regla de guardado: nunca pisar campos viejos).

## 2.4 Pantalla del editor ("TU PINTA")

Mobile-first vertical: preview grande arriba (×4, fondo verde cancha), debajo
filas de selectores `‹ ETIQUETA ›` — la etiqueta SIEMPRE visible es la
accesibilidad, no un adorno: Piel / Corte / Color de pelo / Ojos / Rasgo /
Cuello / Patrón de camiseta / Vincha / Accesorios (dos slots). Botones:
**SORTEAR PINTA** (aleatoria total) y **LISTO**. El preview se redibuja en
vivo con cada cambio.

**Los 4 amigos usan el mismo editor:** al reclutar (después de ponerle
nombre) y re-editable después GRATIS desde la ficha del amigo en la semana
("cambiar pinta" no gasta puntos: es cariño, no gestión). El botón SORTEAR es
el default del reclutamiento, así nombrar+aceptar sigue siendo rápido. Las
piezas no tienen género: no existe "pelo de chica"; hay cortes y colores para
cualquier personaje (modelo neutro de datos).

**Dónde se ve la pinta:** ficha de intro, semana (avatares), reclutamiento,
minimapa no (es abstracto), sprites de cancha (piel + camiseta + color de
pelo; el corte se simplifica a su silueta de 3px) y **cut-ins del v3** (la
misma grilla a ×5: el cut-in ES el avatar, con marco de líneas de velocidad —
ahí la pinta paga de verdad).

## 2.5 Orden de implementación

1. Grillas de capas + función `drawPinta(ctx, look, x, y, escala)` en PSART
   (reemplaza al avatar actual; mantiene la firma de uso).
2. Migración de `look` legado + editor "TU PINTA" en intro.
3. Editor en reclutamiento + re-edición gratis de amigos.
4. Cut-ins v3 usando `drawPinta` a ×5.
5. Selector "Elegí tu relato" + cinta + RELATOS (Parte 1 entera; puede ir en
   paralelo a 1–4, no comparten código).

## Criterios de aceptación

1. Dos pintas cualesquiera que difieren solo en color siguen distinguibles
   por su etiqueta visible; toda variante de forma se reconoce en el preview ×4.
2. Un guardado viejo abre con la pinta equivalente correcta (tabla de
   migración) y sin campos rotos.
3. Las líneas de relato nunca se repiten dentro del mismo partido para un
   mismo evento hasta agotar variantes, y aparecen SIEMPRE después del
   desenlace visual.
4. Ningún personaje del relato comparte nombre con figuras reales del medio
   argentino (verificación manual antes del commit).
5. Cambiar de modalidad de relato en la temporada surte efecto en el partido
   siguiente sin tocar nada más.
