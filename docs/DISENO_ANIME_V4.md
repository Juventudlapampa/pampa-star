# PAMPA STAR — Diseño v4 ("El anime jugando": dos capas)

**Documento de diseño ejecutable para Claude Code.** Nace del segundo playtest de Rodri (11/07/2026, en PC) y de su exploración de retratos con otra IA. **Este documento REEMPLAZA la política de cámara de la v2 (§1–§2)**: el mundo lógico, el radar, los comandos, los duelos y todo lo demás siguen vigentes; lo que cambia es dónde vive la épica.

---

## 0. La decisión de arquitectura (leer antes de tocar nada)

El diagnóstico del playtest: la cámara pegada sin arte de héroe no dio cine, dio menos campo de visión. La corrección no es más zoom ni mejores sprites corriendo — es separar el juego en **dos capas con trabajos distintos**:

**CAPA 1 — VISTA TÁCTICA (navegar y decidir).** La cámara se ELEVA: se ve la cancha completa o casi completa (mínimo el 70 por ciento, parámetro afinable), jugadores como sprites simples y legibles, movimiento LENTO y leíble. Acá el jugador ve el mapa, planifica, elige. Es la vista donde se está el 80 por ciento del tiempo. No pretende ser épica: pretende ser clara.

**CAPA 2 — CAPA CINEMÁTICA (el anime).** Cada acción significativa CORTA a una escena de pantalla completa o panel grande: composiciones dibujadas del jugador en pose de acción, con efectos (líneas de velocidad, flash, sacudida, zoom del retrato), texto dramático y sonido. Acá vive TODA la épica. Después del desenlace, corte de vuelta a la táctica.

Esto es literalmente cómo funciona el Tsubasa de Tecmo, y tiene una virtud de producción: una escena épica se compone con dos a cuatro poses estáticas bien dibujadas más efectos, mientras que la épica en la vista de juego exigiría ciclos de animación completos. Menos frames, más drama.

---

## Bloque A — VISTA TÁCTICA ELEVADA

La cámara principal sube hasta mostrar la cancha completa (o el 70–85 por ciento con scroll suave mínimo, parámetro `VISTA.COBERTURA` en balance). Los 22 jugadores se ven simultáneamente como sprites simples de alta legibilidad: silueta clara, camiseta inconfundible por diseño (rayas contra liso) además del color, número visible al pausar. El portador lleva un marcador "▼ VOS" o anillo. Con la cancha entera visible, el radar queda redundante: se achica a esquina o se elimina (decisión en implementación según espacio en mobile; si se elimina, el pase dirigido pasa a tocarse directamente sobre la cancha).

El movimiento es LENTO: los jugadores trotan, la pelota viaja visible, hay tiempo de leer la cancha antes de cada decisión. La regla del anuncio de cruces (beat de tensión antes del menú) sigue vigente.

**Cambio de jugador en defensa:** automático al más cercano a la pelota con preferencia por el que está entre la pelota y tu arco. La barra espaciadora deja de ciclar jugadores: **ESPACIO es solo ACCIÓN**. Si se quiere ciclado manual queda en otra tecla (TAB) y en mobile un botón secundario chico, pero el automático debe funcionar tan bien que casi nunca haga falta.

**Aceptación:** Rodri ve la cancha, entiende el partido de un vistazo, cambia de jugador sin pensarlo, y nunca aprieta espacio esperando una cosa y pasa otra.

---

## Bloque B — LA CAPA CINEMÁTICA (donde vive el anime)

Sistema de escenas: un gestor único (`EscenaCine`) que recibe tipo de acción, protagonistas y desenlace, y compone la escena a pantalla con las poses, efectos y texto correspondientes. Las escenas obligatorias de esta tanda, en orden de prioridad:

1. **Tiro y atajada (ambos arcos):** el pateador en pose de disparo, corte al arquero — TU arquero incluido cuando te patean, con su estirada, atajada o desenlace de gol. La escena muestra contra cuántos rivales estás pateando (siluetas del arquero y defensores entre vos y el arco).
2. **Gambeta (las cuatro variantes):** ganás, perdés, te la hacen y la defendés — cada una con su composición (el que gambetea en pose, el que queda atrás o el que se queda con la pelota).
3. **Intercepción de pase (incluido el pase al vacío):** el defensor que se lanza o salta a cortarla, con el medio segundo de suspenso antes del desenlace. Nunca más "perdiste la pelota" solo en el título.
4. **Megacosas (tiros y defensas especiales):** ya tienen cut-in; se integran al sistema de escenas con su versión extendida.
5. **Festejo de gol con hinchada:** la tribuna saltando (capa de siluetas animadas simples), el goleador en pose de festejo.

Cada escena se compone de poses estáticas (dos a cuatro por tipo) más efectos de cámara y pantalla. Presupuesto de arte honesto: es preferible seis escenas con dos poses excelentes que quince con poses pobres.

**Aceptación:** ninguna acción importante se resuelve solo con texto; patear, atajar, gambetear e interceptar se VEN como viñetas de anime; el partido se siente "un anime jugando".

---

## Bloque C — RETRATOS Y POSES MODULARES 64x64 (síntesis de la exploración de Rodri)

Se construye el sistema modular de rostros que Rodri exploró: retícula base de **64x64 píxeles**, rostro base más capas intercambiables (pelo, vello facial, accesorios), estilo **menos anime**: contornos negros gruesos, sombras duras de dos a tres tonos (nada de dithering ruidoso), ojos grandes y contrastados que se lean a tamaño chico. Cada identidad tiene **cuatro expresiones**: concentrado, frustrado, triunfante y dolorido, y el juego elige la expresión según el momento del partido.

En los paneles de duelo, los personajes dejan de parecer tarjetas: se muestran de medio cuerpo o cuerpo entero **en pose de acción** (el atacante encarando con la pelota, el defensor barriéndose o plantado), no bustos estáticos enmarcados. El retrato-busto queda para el HUD y los menús; el duelo es un enfrentamiento dibujado.

El banco real de retratos webp existente se conserva como capa alternativa (flag), pero el camino nuevo es el modular, que además le da a cada jugador del roster una cara generable por combinación determinista de capas (mismo id, misma cara siempre).

**Aceptación:** los rostros se reconocen de un vistazo, las expresiones cambian con el partido, y el panel de duelo parece una viñeta de enfrentamiento, no dos cartas coleccionables.

---

## Bloque D — SONIDO QUE SUENA (chiptune real)

Los hooks existen pero el silencio actual mata toda la épica. Esta tanda entrega audio REAL: música chiptune original generada proceduralmente (Web Audio API u oscilador propio; sin librerías con licencias dudosas y sin música ajena): tema pausado en posesión propia, tema tenso en posesión rival, riser en anuncios de cruce, medio segundo de silencio pre-desenlace, explosión de hinchada en gol propio, lamento en gol rival, tictac final. El audio se desbloquea con el primer toque del usuario (política de autoplay de los navegadores) y hay botón de SONIDO ON/OFF ya existente que debe funcionar de verdad en PC y mobile.

**Aceptación:** jugar con sonido en la PC de Rodri produce momentos épicos audibles; el silencio pre-tiro se siente en el estómago.

---

## Bloque E — EL RELATOR

Un relator de texto acompaña el partido usando `data/relatos.json` (ya existe en el repo): banner o ticker con relatos cortos en tono pampeano de cancha — el saque, las jugadas de peligro, el gol ("¡GRITALO, WINIFREDA!"), el cierre. El relator tiene variantes por situación y no repite la misma frase dos veces seguidas. Queda cableado como sistema (`Relator`) con hooks para un futuro modo streamer con voz, que NO se implementa ahora.

**Aceptación:** el partido se cuenta solo; leer al relator suma drama sin tapar el juego.

---

## Bloque F — TIROS SITUACIONALES

Cuando la pelota viene alta, el menú ofrece las opciones aéreas que ya prevé la lógica pero ahora con identidad propia y escena propia: **cabezazo, volea y chilena** (la chilena exige stats altos y guts, y tiene la escena más espectacular del juego). La escena de tiro muestra siempre la situación real: cuántos defensores y el arquero entre vos y el arco, para que la decisión de patear sea informada. La ejecución de destreza (LA DEFINICIÓN) aplica también a los tiros aéreos con ventanas más exigentes.

**Aceptación:** ante un centro, Rodri puede elegir cabezazo o chilena, ve contra cuántos patea, y la chilena convertida es el momento más épico que el juego puede producir.

---

## Bloque G — EL TEMPO: jugadores lentos, partido corto

El error de la tanda anterior fue compensar el reloj para que el partido durara lo mismo: jugadores lentos más duración igual dio un partido interminable. La regla correcta del Tsubasa es **acciones lentas, partido corto**: los jugadores se mueven pausado, pero el reloj del partido corre rápido y los tiempos muertos se comprimen (saques laterales y de arco casi instantáneos, sin caminatas). La duración real total de un partido completo es un parámetro (`TEMPO.DURACION_REAL_MIN`, arrancar en 10 minutos, afinable), y el descuento sorpresa se mantiene.

**Aceptación:** un partido entero se juega en unos 10 minutos reales, cada jugada da tiempo de pensar, y nunca aparece la sensación de "esto no termina más".

---

## PARKING LOT — Futuro explícito (NO se implementa en esta tanda)

Queda anotado para tandas futuras, por decisión de Rodri: viento que afecta pases y tiros; estado de la cancha (seca, embarrada) como factor; el perro que se mete a la cancha como evento aleatorio pampeano; megacosas completas por posición (arquero que ataja y saca largo, defensor que cabecea y se barre, mediocampista que gambetea y filtra pases, delantero que fusila); y el **sistema de cartas coleccionables**: elegir una a tres cartas de jugador antes del partido, obtenibles por progresión, como dinámica mobile de colección y armado de equipo. Ninguna de estas cosas entra ahora; entran acá para no perderse.

---

## Orden de ejecución y reglas de la tanda

Orden: **A y G primero** (juntos transforman la experiencia base: ver la cancha y que el partido fluya), después **B** (el sistema de escenas con las cinco prioridades en orden), después **D** (sonido, porque sin audio ninguna escena rinde), después **C** (retratos modulares), después **E** (relator) y **F** (tiros situacionales). Un commit por bloque ("Anime A: descripción"), tests y revisión adversarial por bloque, todos los parámetros nuevos a `balance.json`. Regla de la tanda agresiva vigente: commitear lo estable antes de cualquier freno, nada queda solo en working tree, y el HANDOFF (HANDOFF_ANIME.md) se escribe siempre con la checklist de aceptación por bloque. Sección 11 del doc v2 completa y vigente: sin marcas de terceros ni en producto ni en comentarios, sin apuestas, sin mouse como requisito, modelo neutro en género, saves retrocompatibles en cada commit, y toda información distinguible por forma o número además del color.
