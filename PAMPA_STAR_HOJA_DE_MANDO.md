# PAMPA STAR — Hoja de mando (estado y cola de prompts)

> Tu superficie única para este proyecto. Acá está qué está hecho, qué se está cocinando, los prompts listos para disparar en orden, y las ideas anotadas que todavía no se diseñaron. Cuando termines algo, mirás acá qué sigue.

---

## 1. Estado del juego (construido y andando)

El partido completo funciona: ataque, defensa, reloj de dos tiempos con entretiempo, duelo por stats y Guts, mano a mano con arquero. La temporada de Primera B corre con fixture ida y vuelta, tabla y goleadores. Los tiros especiales existen (Disparo del Caldén funcional). La Capa 3 de vida y amigos está, con sus fixes (género neutro, daltonismo, saneo del guardado). El partido v2 con equipo, pases y minimapa está construido, pero al jugarlo falta la presentación (ver punto 3, partido v3).

## 2. Cocinándose ahora

Code: la tanda de integración (arte, sonido, controles, inicio, avatar con origen, lore de intro) sobre el partido v2. Cowork: el guion narrativo (beats entre partidos, titulares de prensa, camino a la Selección, color de la vida).

## 3. Cola de prompts (en orden, con su texto listo)

**A · [CORRIENDO] Integración → Code.** Ya está en marcha. Cuando termine, probá el juego y verificá que el arte, el sonido y los controles quedaron bien.

**B · [PRÓXIMO, cuando Cowork se libere] Diseño del Partido v3 → Cowork.** Arregla lo que sentiste jugando: pocos jugadores, falta el flujo de escenas, la defensa donde se escapan, y los megatiros que no aparecen. El brief está en el chat (o pedímelo de nuevo). Es diseño, no toca el index.

**C · [DESPUÉS de B] Build del Partido v3 → Code.** Cuando Cowork entregue el diseño del v3, Code lo construye. Este es el trabajo que hace que el partido se sienta Captain Tsubasa de verdad (el flujo de escenas, la ansiedad del pase). Va antes que la escalera.

**D · [DESPUÉS de que el partido esté firme y probado] Escalera de ascensos y fichajes → Code.** El corazón de la carrera: subir de categoría, que te compren, la cadena B → A → Regional → AFA → Primera → Europa, los fichajes y la rotación de amigos. NO dispararlo hasta tener el partido v3 probado y el balance ajustado. El texto está en el chat.

**E · [POLISH, más adelante] Música chiptune enriquecida.** Va DESPUÉS de que el partido v3 esté firme (no tiene sentido pulir música sobre un partido que todavía cambia). Prompt listo:

> Componé la música de PAMPA STAR como chiptune original, integrada al motor de audio que ya existe. Replicá la ESTRUCTURA por estado del fútbol arcade (inspiración, no copia): un tema para cuando tengo la pelota, otro para cuando ataca el rival, uno más urgente y a mayor tempo para los últimos minutos de cada tiempo, y golpes cortos para el gol, la atajada y el tiro especial. Sumá un leitmotiv de pocas notas de PAMPA STAR que aparezca en todos lados y cambie de tono según el momento (solemne en el ascenso, triunfal en el Mundial). Todo ORIGINAL: nunca copies melodías de Captain Tsubasa ni de ningún tema con copyright. Respetá el volumen, mute y desbloqueo al primer toque que ya existen.

## 4. Capa de presentación (ideas anotadas, pendientes de diseñar)

Editor de jugador modular estilo Pampa Mundialista: pelo, cara, accesorios intercambiables. Va por código, sin IA, como capas sobre un cuerpo base; todas las variantes disponibles por definición. Con nombre o etiqueta, nunca solo color.

"Elegí tu relato": el jugador elige desde dónde le relatan el partido, un streamer que reacciona, una cabina clásica de relator y comentarista, o la tele. Se captura el ESTILO de cada mundo con personajes inventados y bien pampeanos. Regla firme: nunca personas reales ni medios reales (ni Luzu, ni Coscu, ni Closs, ni relatores o programas con nombre). La parodia del arquetipo es libre y da el mismo guiño sin exponer el cargo.

Comentarista en vivo durante el partido (texto que reacciona a la jugada) más titulares post-partido. Los titulares ya los está escribiendo Cowork en el guion.

## 5. Reglas transversales (no se tocan)

Mobile-first apaisado; HTML/CSS/JS que abre con index.html; guardado retrocompatible que no rompe carreras. Todo original, nada de assets, sprites, música ni personajes de Tecmo/Captain Tsubasa; solo se emula la mecánica y el estilo. Nunca nombres de personas reales ni de menores. Los amigos los nombra el jugador. Nada de apuestas ni casino. Colores en HEX y con etiqueta o forma, nunca distinción solo por color (daltonismo). Arte pixel retro + chiptune (dirección ya decidida).

## 6. Regla de oro de orquestación

Code es el único que toca el index.html: construye. Cowork diseña y escribe: nunca toca el index. No corras dos cosas que escriban el index al mismo tiempo. Si un prompt escribe código, es de Code; si piensa o escribe texto, es de Cowork.

## 7. Archivos

En el repo: index.html, PROGRESO.md, DISENO_PARTIDO_V2.md, DIRECCION_ARTE_SONIDO.md, los sprites y el audio de Code. En tus descargas: DISENO_PAMPA_STAR.md, el addendum, la hoja de ruta, el avatar y lore, y esta hoja de mando. Cuando Code libere la sesión, conviene sumar al repo los documentos de diseño que falten para que queden todos juntos.
