# PAMPA STAR — DISEÑO MAESTRO v6 "EL ANIME JUGANDO"

**Documento único y ejecutable para Claude Code.** Consolida y REEMPLAZA los documentos v2, v3 (Feel) y v4 (Anime) en todo lo que contradiga. Nace de tres playtests de Rodri más investigación verificada sobre el original de Tecmo (1988/1990).

Rodri entrega junto con este documento **7 poses ilustradas con transparencia** en `assets/poses/`. Ese arte es el corazón de la tanda: el código no dibuja personajes, los MUEVE.

---

## §0 — PRINCIPIO RECTOR (leer entero antes de tocar una línea)

El partido actual se siente "un FIFA lento". La causa única: **hay demasiado tiempo real de baja calidad entre los momentos épicos.**

El modelo correcto, verificado contra el original: **el partido es una sucesión de MOMENTOS, no un flujo continuo.** Entre momento y momento el desplazamiento es rápido y esquemático. Toda la riqueza —duelo, gambeta, robo, tiro, atajada— vive DENTRO de un momento y se resuelve con corte a escena ilustrada.

**Test de corrección:** si el jugador puede perseguir en tiempo real al rival que le robó la pelota, el modelo está mal implementado.

Estructura de pantalla (así lo resolvió Tecmo y así va): **arriba la escena, abajo el mapa.** La cancha táctica sirve para navegar y decidir; la capa cinemática es donde vive el anime.

---

## §1 — FIXES URGENTES (baratos, arreglan lo roto; van PRIMERO)

**F1 · Devolver el radar.** La implementación de Anime A lo eliminó (`this.radar = null`). Fue un error: Rodri lo quiere. Mini-mapa fijo en esquina, coexistiendo con la cancha. Fichas por FORMA además de color: círculos celestes #4FC3F7 propios, triángulos naranjas #FF8A50 rivales, rombo blanco #FFFFFF con borde negro #000000 la pelota, anillo blanco en el controlado, número en cada ficha.

**F2 · El arquero SIEMPRE se estira.** Hoy a veces se tira y a veces no. Regla dura: ante todo tiro al arco, propio y rival, el arquero ejecuta su animación de estirada, con la misma calidad en ambos arcos. La épica no puede ser intermitente.

**F3 · Intercepción imposible desde atrás.** Un pase solo puede ser cortado por un rival geométricamente ENTRE pasador y receptor, dentro del corredor de la línea de pase. Nunca por uno que está detrás o al costado fuera del corredor.

**F4 · Cambio de jugador correcto.** Al perder la posesión, el control pasa automáticamente al jugador propio mejor posicionado para defender: el más cercano a la pelota que además esté entre la pelota y el arco propio, **EXCLUYENDO al que acaba de perderla**. Botón manual de respaldo en TAB, pero el automático tiene que acertar solo. **ESPACIO es solo ACCIÓN, nunca cambia de jugador.**

**F5 · Defensores que marcan.** La IA defensiva se acerca al portador y a los receptores y cierra líneas. No se queda tirando pelotazos desde lejos.

**F6 · §11 vivo: "GUTS" sigue en pantalla.** El HUD renderiza el texto literal "GUTS" (match.js ~610). Es el nombre del medidor de energía de Tecmo. La lógica ya usa `aguante`; falta la etiqueta. Reemplazar por **"AGUANTE"** en toda la UI del Phaser y del clásico.

---

## §2 — EL MODELO DE SALTOS (el cambio de raíz)

**R1 · Desplazamiento por saltos.** Entre momentos, el portador avanza rápido y esquemático hacia el próximo punto de decisión. No hay dribbling libre perseguido en tiempo real. Cuando aparece un punto de decisión (rival al cruce, oportunidad de pase, zona de tiro), el juego CORTA: pausa, escena, menú. **Tras un robo, corte inmediato: la pelota ya está en poder del rival en su próximo momento. No se persigue.**

**R2 · Separación post-duelo.** Al resolverse un duelo, el perdedor queda NOTABLEMENTE lejos, como el gambeteado del anime que queda tirado metros atrás. La separación es parte de la resolución de la escena, no del movimiento en cancha. Nada de quedar pegados y volver a chocar al instante.

**R3 · El mérito es multi-mecánica.** La resolución combina CUATRO factores, ninguno dominante: stats de los jugadores, aguante gastado, azar acotado (la fortuna, que da drama), y ejecución de destreza del jugador. La barra de timing deja de ser el único determinante.

Se suma el **MEDIDOR DE ENVIÓN** (mecánica de mérito acumulable, inspirada en el patrón del V-Zone): una barra que se llena ganando quites, gambetas y duelos. Cuando está llena, se puede gastar en potenciar al equipo por unos momentos, o en una **Súper Defensa** que bloquea un remate rival de forma segura. Es mérito acumulado, no reflejo. Se muestra siempre con número además de la barra.

**R4 · El reloj a saltos (perilla única).** El reloj NO es un cronómetro continuo. Avanza en bloques: cada momento consume una cantidad fija de minutos de partido, se interrumpe cuando hay acción, y sigue. **Un solo parámetro** `TEMPO.MINUTOS_POR_MOMENTO` define duración real, cantidad de decisiones y ritmo de una sola vez.

Presets de duración (elegibles por el jugador antes del partido):
- RELÁMPAGO: cada momento consume ~5 min de reloj (≈8-10 momentos por tiempo).
- INTERMEDIO (recomendado, por defecto): ~2,5 min por momento (≈16-18 momentos por tiempo).
- LARGO: ~1,2 min por momento (≈35 momentos por tiempo).

Se suma **VELOCIDAD** como ajuste aparte (Normal / Rápida), que solo afecta la duración de las animaciones y los tiempos muertos, más una tecla/toque de SKIP para saltar escenas ya vistas. Los saques laterales y de arco son casi instantáneos. Nada de caminatas.

**Objetivo medible:** un partido INTERMEDIO completo se juega en menos de 10 minutos reales. Rodri es el cronómetro final.

**R5 · LA CEGUERA (decisión tomada por Rodri, va sí o sí).**

En el original de Tecmo **no se ve a los rivales en la cancha**. Está documentado: los comentaristas de la época se sorprendían de que no se pudiera ver a los oponentes en el campo, y las guías explican que hay que elegir **a ciegas** la dirección para mover a tus jugadores cuando perseguís la pelota, tratando de adivinar hacia dónde va el rival para marcarlo. Ese es el secreto mejor guardado del género: **la tensión no viene de la persecución, viene de la ceguera.**

Implementación:
- En la **cancha táctica**, los jugadores rivales NO se dibujan. Solo se ven los tuyos y la pelota.
- Los rivales existen siempre como entidades lógicas, se mueven, marcan e interceptan con normalidad. Simplemente **no se ven**.
- Los rivales se revelan en exactamente tres momentos: cuando aparecen en el **cruce** (con su beat de tensión), cuando entran a una **escena cinemática**, y en el **radar** (donde siempre están, como triángulos naranjas #FF8A50 numerados).
- El radar pasa de ser un accesorio a ser **la única fuente de información posicional del rival**. Eso lo vuelve central y justifica del todo el F1: sin radar, con ceguera, el juego sería injugable.
- Consecuencia de diseño: como no ves quién te viene a marcar, **elegir el destino del pase es una apuesta informada por el radar**, no una lectura de la cancha. Y perseguir al que te robó deja de tener sentido, porque no sabés dónde está. La ceguera y el modelo de saltos se refuerzan mutuamente.

**Flag `ceguera_rival`, ENCENDIDO por defecto.** Se puede apagar para comparar, pero el juego se diseña con ceguera. Si al probarlo Rodri siente que se pierde, se afina revelando también a los rivales dentro de un radio corto del portador (parámetro `RADIO_REVELACION` en balance, arrancar en 0 = ceguera total).

---

## §3 — LA CAPA CINEMÁTICA Y LAS 7 POSES

### §3.1 La técnica: animación limitada (así hace el anime)

**El jugador NO se anima: se sostiene.** Cada acción es UNA pose ilustrada, quieta, grande, recortada. La sensación de movimiento y esfuerzo la produce TODO LO DEMÁS, y todo lo demás es código:

- **Fondo en tres capas** a distinta velocidad: cielo casi quieto, tribuna lenta, pasto rápido.
- **Líneas de velocidad**: en los momentos épicos el fondo se reemplaza por líneas radiales saliendo del centro, o rayas diagonales barriendo la pantalla.
- **Sacudida de pose**: la pose tiembla 2-3 px a alta frecuencia = se lee como esfuerzo brutal.
- **Cámara**: zoom rápido hacia la pose, temblor en el impacto.
- **Flash**: un frame blanco #FFFFFF en el momento del contacto.
- **FREEZE**: la imagen se clava 250-500 ms antes de cada revelación. Es el efecto más barato y más épico que existe.
- **Cortes secos** entre pose y pose. Nada de fundidos: como el manga entre viñetas.

### §3.2 Las poses disponibles en `assets/poses/`

`pose_remate.png` (héroe patea de derecha) · `pose_chilena.png` (chilena invertida) · `pose_cabezazo.png` (salto de cabeza) · `pose_barrida.png` (defensor barriéndose) · `pose_arquero_vuela.png` (estirada) · `pose_arquero_ataja.png` (atajó, de rodillas) · `pose_festejo.png` (gol).

Todas PNG con transparencia real, ~1600px de lado, recortadas al bounding box, sin halo. Estilo: anime deportivo ochentoso, contornos negros gruesos, sombras duras de 3 tonos, camiseta celeste #4FC3F7 número 10 para el héroe, naranja #FF8A50 número 1 para el arquero, naranja a rayas negras número 4 para el defensor rival.

**Manifiesto obligatorio:** crear `data/poses_manifest.json` mapeando cada acción a su archivo, con fallback tolerante (si falta un archivo, cae a la pose de código anterior, nada crashea). Rodri va a entregar más poses mañana (gambeta ganada, gambeta perdida, pared, bloqueo, corrida): el manifiesto tiene que permitir agregarlas sin tocar código.

### §3.3 Las escenas obligatorias

Gestor único `EscenaCine` que recibe tipo de acción, protagonistas y desenlace, y compone la escena. Prioridad:

1. **Tiro y atajada** (ambos arcos, con MI arquero cuando me patean).
2. **Gambeta, 4 variantes**: gano, pierdo, me la hacen, la defiendo.
3. **Intercepción de pase** (incluido el pase al vacío), con el defensor lanzándose. **Nunca más "perdiste la pelota" solo en el título.**
4. **Megacosas** ofensivas y defensivas, integradas al gestor (hoy están sueltas con cut-in viejo).
5. **Festejo de gol con hinchada ANIMADA**: la tribuna salta (capa de siluetas simples animadas), el goleador en `pose_festejo`.

### §3.4 Las SECUENCIAS (megacorrida y jugada combinada)

Una jugada que **encadena varias escenas en una sola acción épica**. Precedente verificado en el original: la jugada combinada existe desde 1988 (la pared de dos jugadores para avanzar, barata en aguante).

- **MEGACORRIDA**: el jugador arranca, se le van quedando rivales atrás uno a uno en escenas sucesivas, y remata al arco con el arquero estirándose.
- **JUGADA COMBINADA**: gambeteás, se suma un compañero en escena, elegís centro o pase, el compañero define en la escena siguiente.

Cada eslabón es una escena del gestor; la secuencia las orquesta. Costo alto de aguante, desbloqueo por progresión. Es el techo de espectáculo del juego.

---

## §4 — LA DEFINICIÓN v2: LA ESCENA DE PATEAR Y ATAJAR

Reintegrar `LA DEFINICIÓN` y el `cine de 5 planos` desde el commit **`53f0d80`**, adaptados a este marco. Es la escena que Rodri aprobó y quiere de vuelta, con la fase de posicionamiento agregada.

### §4.1 LA DEFINICIÓN OFENSIVA

Al elegir TIRO o entrar en zona de definición, el partido CORTA a una sub-escena a pantalla completa. Cuatro fases:

**FASE 1 — POSICIÓN.** Vista de tres cuartos del área rival, arco al fondo, tribuna detrás. Tu jugador es el sprite grande. Defensores y arquero en pantalla, en pose de marca. **Movés a tu jugador buscando el ángulo.** La tensión: los defensores se acercan a ritmo lento y leíble (parámetro en balance), no en caos de tiempo real. Cuanto más esperás, mejor ángulo, pero más cerca los tenés.

Botones grandes contextuales, cada uno con su costo de aguante en NÚMERO:
- **TIRO** siempre.
- **GAMBETA** si tenés un defensor encima.
- **PARED** si hay un compañero cerca (barata a propósito).
- **CABEZA** o **CHILENA** si la pelota viene alta.
- **PASE** al compañero mejor ubicado.

**FASE 2 — EJECUCIÓN (la destreza).** Al elegir TIRO se resuelve con **el duelo de seis zonas**: la portería se divide en seis (arriba-izq, arriba-centro, arriba-der, abajo-izq, abajo-centro, abajo-der), cada una con ETIQUETA y forma propia, nunca distinguidas solo por color. Vos elegís una; **el arquero elige otra a ciegas y al mismo tiempo**. Coinciden → atajada segura. A una zona → atajada difícil. A dos o más → el arquero llega mal. Encima corre la barra de timing de LA DEFINICIÓN, que modula la potencia (punto dulce: floja la ataja, pasada se va afuera).

**FASE 3 — EL VUELO.** La pelota sale. La cámara la acompaña. Si hay un defensor en la línea, se tira con `pose_barrida`. El arquero vuela hacia su zona con `pose_arquero_vuela`. Líneas de velocidad, sacudida de cámara.

**FASE 4 — EL DESENLACE.** FREEZE + **medio segundo de silencio absoluto** + revelación: gol con explosión de hinchada y `pose_festejo`, o atajada con `pose_arquero_ataja`. Corte seco de vuelta al partido.

### §4.2 LA DEFINICIÓN DEFENSIVA (escena completa, no una adivinanza)

Cuando el rival entra en zona de definición, **la escena es igual de rica que la ofensiva y tiene su propia mecánica de correr y posicionar.** Atajar tiene que dar tanta adrenalina como meterla. Con la ceguera de R5 activa, acá SÍ se ve al rematador (está en escena), y esa revelación es parte del drama: recién ahora le ves la cara al que te va a fusilar.

**FASE 1 — POSICIÓN DEFENSIVA (correr, la mecánica central).** Misma vista de tres cuartos, pero ahora el arco es el tuyo. En pantalla: el rematador con la pelota, tus defensores, y tu arquero. **Vos manejás y corrés a tu defensor** (el más cercano, con cambio automático según F4), buscando meterte en la línea entre la pelota y el arco. Y **también posicionás a tu arquero** sobre la línea, o lo mandás a achicar.

La tensión es de reloj y de espacio: el rematador está **cargando el remate** (barra visible), y vos tenés esos segundos para acomodarte. Cuanto más te acercás al rematador, más chance de bloquear, pero si te pasa, quedás fuera de la jugada por la separación de R2.

Botones grandes contextuales, cada uno con su costo de aguante en NÚMERO:
- **INTERPONERSE**: te plantás en la línea de tiro. Seguro, sin riesgo, bloqueo parcial. Usa `pose_bloqueo` cuando exista; mientras tanto, la pose de marca.
- **BARRIDA**: te tirás con `pose_barrida`. Alto riesgo, alta recompensa: o le sacás la pelota, o quedás tirado y él queda solo contra el arquero.
- **ACHICAR** (arquero): el arquero sale a achicar el ángulo. Reduce las zonas útiles del rematador, pero si la toca por arriba, queda vendido.
- **QUEDARSE EN LA LÍNEA** (arquero): conserva las seis zonas, más margen de reacción.
- **MEGABLOQUEO / MEGAATAJADA**: si el medidor de envión (R3) está lleno. Bloqueo seguro, con su cut-in.
- **NO MOVERSE**: recupera aguante. Es una decisión válida y a veces la correcta.

**FASE 2 — EJECUCIÓN (vos sos el arquero).** El rematador elige su zona a ciegas; **vos elegís la tuya**. Coinciden → atajada segura. A una zona → atajada difícil. A dos o más → llegás mal. Encima corre TU barra de timing (la reacción del arquero), que modula qué tan bien llegás. El resultado combina los cuatro factores de R3: stats del arquero, su aguante, la adivinanza de zona y tu destreza. Y si posicionaste bien un defensor en la línea en la Fase 1, **hay una tirada previa de bloqueo antes de que la pelota llegue al arquero**: la jugada puede morir ahí, con `pose_barrida` y su propia mini-revelación.

**FASE 3 — EL VUELO.** El rematador ejecuta con su pose (`pose_remate`, `pose_chilena` o `pose_cabezazo` según cómo venga la pelota). Si hay defensor en la línea, se lanza. Tu arquero vuela con `pose_arquero_vuela` hacia la zona que elegiste. Líneas de velocidad, temblor de cámara.

**FASE 4 — EL DESENLACE.** FREEZE + medio segundo de silencio + revelación: gol en contra con lamento de la hinchada y tu arquero en el piso, o **atajada con `pose_arquero_ataja` y la tribuna explotando**. Una atajada en el último minuto tiene que gritarse igual que un gol.

---

## §5 — BALANCE DEL AGUANTE (números verificados contra el original)

El original: aguante máximo ~880 en el mejor jugador al final; tiro top 400 (45% del tanque); tiros medios 200-250; chilena común 160; pared 120; gambeta especial 90; pase especial 40; quite normal 50; pase normal 20. **Por debajo de 100 el jugador queda inútil.** Resultado: el tiro top se usa **exactamente dos veces y chau**. El "dos" no era una regla: era aritmética.

Traducción a PAMPA STAR sobre tanque de 1000:

| Acción | Costo |
|---|---|
| Umbral de inutilidad | 110 |
| MEGATIRO (Disparo del Caldén) | **450** (hoy está en 300: corregir) |
| Especiales medios (Atuel, Tornado) | 250–280 |
| Cabezazo especial | 200 |
| Chilena | 180 |
| Pared / uno-dos | 120 |
| Gambeta especial | 90 |
| Tiro normal | 90 |
| Quite normal | 50 |
| Pase normal | 20 |
| Recuperación de entretiempo | alta (el crack vuelve cerca de 800) |

Dos reglas heredadas del original, que le dan carácter:
- **La CPU tiene aguante infinito pero con un límite invisible**: si se pasa, sus habilidades caen en picada. El rival se desgasta solo, sin que el jugador administre nada.
- **Los jugadores con movimientos especiales tienen stats base más bajas**, a propósito. El crack es bueno UNA vez, no bueno siempre.

Regla de oro: **el crack tiene que poder ganarte un partido, y no tiene que poder ganarte dos.**

---

## §6 — SONIDO (que suene, y que no parezca de otro juego)

El chiptune actual es pobre. Sube la calidad del audio procedural: temas con más capas y carácter (bajo, melodía, percusión). Tema pausado y tenso con la pelota en campo propio, que **crece al cruzar al campo rival**; tema distinto cuando la tiene el rival; riser en el anuncio de cada cruce; **medio segundo de SILENCIO absoluto antes de cada desenlace épico** (el efecto más barato y más potente); explosión de hinchada en el gol propio; lamento en el gol en contra; tictac en los últimos 5 minutos. Todo original, desbloqueo con el primer toque (política de autoplay), botón de sonido funcionando de verdad en PC y celu.

---

## §7 — EL RELATOR

Usar `data/relatos.json` (ya existe). Ticker o banner con relatos cortos en tono pampeano de cancha: el saque, el peligro, el gol, el cierre. Variantes por situación, sin repetir la misma frase dos veces seguidas. Sistema `PampaRelator` con hooks para un futuro modo con voz (NO se implementa ahora).

---

## §8 — MODO MASTER (la carrera sin manager)

Reemplaza la idea de "corrida roguelite". Es un torneo con divisiones: **arrancás en la Primera B de la Liga Cultural y soñás con el Mundial.**

Precedente del original: en modo historia hay que ganar cada partido para avanzar; si perdés, jugás contra el equipo anterior, con intentos ilimitados, y subís de nivel igual. Dificultad escalonada más red de contención.

Reglas:
- **Dificultad FIJA por división**, no elástica: los rivales de la B son flojos y los de la A son duros. Cada ascenso tiene que SENTIRSE. "Cada vez te cruzás equipos más poronga."
- Perder no reinicia nada: no ascendés, o descendés, y seguís. No castiga al que perdió.
- Entre temporadas, **tus jugadores mejoran solos** por haber jugado. No se ficha, no se negocia, no se administra. Esa es la parte de "crecer" sin manager.
- Los rivales tienen **perfiles de IA distintos** (hoy todos juegan igual): un rival estrella se tiene que sentir distinto de uno de pueblo.

---

## §9 — ORDEN DE EJECUCIÓN

Estricto, por impacto/costo. Un commit por bloque, tests y revisión adversarial inline por bloque, todos los parámetros a `balance.json`.

1. **§1 completo** (F1–F6): fixes baratos, arreglan lo roto. Incluye el rename GUTS→AGUANTE.
2. **§2 R1+R2+R4+R5**: modelo de saltos, separación, reloj a saltos con presets, y **la ceguera** (flag encendido por defecto). El cambio de feel más grande. R5 depende de F1: sin radar no hay ceguera posible, así que el radar va antes sí o sí.
3. **§4 completo**: LA DEFINICIÓN v2 con las 7 poses — **§4.1 ofensiva y §4.2 defensiva, las dos con su fase de correr y posicionar**. Es la escena estrella y ninguna de las dos mitades es opcional.
4. **§3.1+§3.3**: técnica de animación limitada y las escenas del gestor (prioridades 1 a 3).
5. **§5**: balance del aguante completo.
6. **§6**: sonido.
7. **§2 R3**: mérito multi-mecánica y medidor de envión.
8. **§3.3 prioridades 4-5**: megacosas al gestor, hinchada animada.
9. **§7**: relator.
10. **§3.4**: secuencias (megacorrida y jugada combinada).
11. **§8**: modo Master.

---

## §10 — REGLAS DE LA TANDA

**Austeridad:** cero explicaciones entre bloques, reportes de una línea por commit, nada de resúmenes intermedios. Todo el detalle va al HANDOFF final.

**Nada en working tree:** commitear lo estable ANTES de cualquier freno, aunque el bloque quede parcial y marcado como tal en PROGRESO. Si el margen se acaba, saltar directo a escribir el HANDOFF.

**HANDOFF_V6.md se escribe SIEMPRE**, llegue hasta donde llegue: estado por bloque (completo / parcial / no arrancado), lista de commits, flags y su estado por defecto, checklist de aceptación por bloque para el celu de Rodri, deudas, y una sección "LO QUE FALTA PARA MAÑANA" ordenada por prioridad.

**Feature flags:** cada bloque nuevo detrás de un flag apagable. `partido_phaser` sigue APAGADO por defecto hasta que Rodri lo autorice.

**§11 vigente completa:** sin nombres reales de menores; sin apuestas ni dinero real; **sin marcas, nombres, assets ni terminología de terceros, ni en producto ni en comentarios** (incluye la etiqueta "GUTS"); modelo de datos neutro en género; saves retrocompatibles en cada commit; sin mouse como requisito (todo con dedo o teclado); toda información distinguible por **forma, número o etiqueta además del color** (requisito de visión de Rodri, no negociable).

---

## §11 — PARKING LOT (NO en esta tanda, anotado para no perderse)

**Información asimétrica.** Hoy se muestran los porcentajes de las dos partes. El original ocultaba todo (y degeneraba en elegir siempre el número más alto). Punto dulce a probar: mostrar tus stats, ocultar las del rival, y dar una pista de lectura ("DYLAN viene calentito", "DYLAN está fundido").

**Otras:** viento que afecta pases y tiros; estado de la cancha (seca/embarrada); el perro que se mete a la cancha; megacosas completas por posición (arquero que saca largo, defensor que cabecea, mediocampista que filtra, delantero que fusila); cartas coleccionables elegibles antes del partido; modo streamer con voz; desafío diario con semilla fija compartida; PWA instalable; porteo a Godot.

**Deuda de arte pendiente (Rodri, mañana):** las poses del arquero tienen rayas negras en la manga que evocan trade dress de una marca deportiva — regenerar con mangas lisas. Poses faltantes: gambeta ganada, gambeta perdida, pared, bloqueo, corrida.
