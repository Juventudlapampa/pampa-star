# PAMPA STAR — Documento General del Juego

**Versión del documento:** 1.0 · 16 de julio de 2026
**Autor y dirección de diseño:** Rodri (Rodrigo Draeger)
**Implementación:** Claude Code (agente único autorizado sobre los archivos núcleo)
**Repositorio:** `github.com/Juventudlapampa/pampa-star` (público)
**En vivo:** `juventudlapampa.github.io/pampa-star/` (clásico) · `.../pampa-star/phaser/` (partido nuevo)
**Estado:** en desarrollo activo · el partido Phaser convive con el motor clásico detrás de un flag apagado por defecto

> Este documento describe el juego completo: qué es, cómo se juega, de qué está hecho, cómo llegó hasta acá y hacia dónde va. Los documentos de diseño por tanda (v2, v3 Feel, v4 Anime, v6 Maestro) son especificaciones de implementación y viven en `/docs`. Este es el documento raíz.

---

# 1. VISIÓN

## 1.1 El pitch

**Del potrero al Mundial. Retro, pampeano y por comandos.**

Sos un pibe de un pueblo de La Pampa que empieza pateando en una calle de tierra y sueña con jugar el Mundial. PAMPA STAR es un juego de fútbol de navegador donde no corrés atrás de la pelota: **decidís**. El partido se detiene en cada momento clave, te muestra la situación, y elegís — gambeteo, la toco, la reviento — mientras la pantalla corta a una viñeta de anime donde tu jugador ejecuta y el mundo se detiene medio segundo antes de revelar qué pasó.

## 1.2 La fórmula

Dos juegos cruzados, cada uno aportando lo suyo:

- **El motor de comandos del fútbol-anime ochentoso** aporta el partido: acción pausada, decisión por menú, resolución por estadísticas más azar, y cinemáticas ilustradas. Es un JRPG con piel de fútbol.
- **La progresión de New Star Soccer** aporta el crecer: un pibe que sube, un torneo que escala, estadísticas que mejoran.

Y encima, la capa que lo vuelve único: **La Pampa real**. Pueblos, apodos, clima, viento, caldenes, el Atuel. Setenta años de fútbol de liga cultural convertidos en un JRPG.

## 1.3 Principio rector (el corazón del diseño)

> **El partido es una sucesión de MOMENTOS, no un flujo continuo.**

Entre momento y momento, el desplazamiento es rápido y esquemático. Toda la riqueza —duelo, gambeta, robo, tiro, atajada— vive DENTRO de un momento y se resuelve con corte a escena ilustrada.

**Test de corrección:** si el jugador puede perseguir en tiempo real al rival que le robó la pelota, el diseño está roto.

## 1.4 Las tres verdades aprendidas

Tres hallazgos que cambiaron el proyecto de raíz, cada uno pagado con un playtest fallido:

1. **La cámara es una decisión conceptual, no un número.** Mostrar la cancha entera hace imposible el cine; pegarse al jugador sin arte hace imposible ver. La respuesta correcta es la de Tecmo en 1988: **arriba la escena, abajo el mapa**. Dos capas con trabajos distintos.
2. **El anime no anima.** La épica se hace con una pose dibujada QUIETA y todo lo demás en movimiento: fondo en capas, líneas de velocidad, temblor, flash, y el freeze con silencio antes del desenlace. Menos frames, más drama.
3. **La tensión no viene de perseguir: viene de no saber.** En el original no se ven los rivales en la cancha. Esa ceguera mata de un saque la persecución, el "se siente un FIFA" y la información simétrica.

## 1.5 Público y contexto

Juventudes de La Pampa. Jugable en el celular de cualquiera, sin descarga, mandando un link por WhatsApp. Producto de la Subsecretaría de Juventud de La Pampa, lo que impone restricciones que también son identidad: sin apuestas, sin plata, sin marcas ajenas, sin nombres de menores reales.

---

# 2. GÉNERO Y POSICIONAMIENTO

## 2.1 El género

**RPG de fútbol por comandos** (lo que Tecmo llamó "fútbol cinemático"). Un género sorprendentemente vacante: la franquicia que lo inventó lo abandonó por la acción 3D en tiempo real, y el único heredero vivo es la saga japonesa de RPG de fútbol coleccionable, que es más arcade y menos anclada en lo real.

**Ese casillero vacío es la oportunidad.** No hay competencia directa moderna en fútbol-por-comandos con identidad local.

## 2.2 Referencias y qué se toma de cada una

| Referencia | Qué se toma | Qué NO se toma |
|---|---|---|
| Fútbol-anime ochentoso (Famicom, 1988/90) | El motor entero: comandos, duelos, aguante, cine, ceguera, economía | Marcas, nombres, personajes, terminología (incluida la palabra "guts") |
| New Star Soccer | La progresión, el crecer, el pibe que sube | El casino y las apuestas, que son mecánica central del original |
| RPG de fútbol coleccionable mobile (2017) | La confirmación de que el motor funciona en táctil | El gacha, el pago, y el mirar partidos sin decidir |
| Juego de acción anime-fútbol reciente (2026) | El duelo de seis direcciones atacante-vs-arquero | La acción en tiempo real |

## 2.3 La advertencia del género

El reclamo número uno del referente mobile con presupuesto japonés: **hay que mirar los partidos sí o sí, y aunque los pongas en automático seguís esperando, y se vuelve aburridísimo muy rápido.**

De ahí sale la regla dura de PAMPA STAR: **ninguna escena sin decisión pegada.** Si mirás sin decidir, es un video. Si cada viñeta termina en una elección, es un juego.

---

# 3. PLATAFORMA

**Web primero.** Phaser 3, HTML5, sin descarga, servido por GitHub Pages. Un link anda en cualquier celu y cualquier PC. Para una cuenta institucional es la mejor distribución posible: cero fricción.

**No es solo celu.** Se juega en PC y en teléfono, y el diseño de controles sirve para los dos sin duplicar trabajo: un tap es un clic, un swipe es una flecha, un botón grande se toca o se aprieta con espacio. La regla vieja de "sin mouse como requisito" resultó ser, sin querer, una regla de multiplataforma.

**Roadmap de distribución:** PWA instalable (ícono en la pantalla, anda sin internet, sin trámite) → eventualmente Play Store vía empaquetado, más como gesto institucional que como canal real. Los costos verificados: registro de desarrollador de Google, pago único; el de Apple, anual. Apps gratis sin venta digital no pagan comisión. La fricción real no es la plata: es la verificación de identidad institucional y las semanas de trámite.

---

# 4. ARQUITECTURA DE LA EXPERIENCIA

## 4.1 Las dos capas

**CAPA 1 — VISTA TÁCTICA (navegar y decidir).** Cámara elevada, cancha legible, jugadores como sprites simples. Movimiento lento y leíble. Es donde se está el 80% del tiempo. No pretende ser épica: pretende ser clara.

**CAPA 2 — CAPA CINEMÁTICA (el anime).** Cada acción significativa corta a una escena de pantalla completa: poses ilustradas, efectos, texto dramático, sonido. Acá vive TODA la épica. Después del desenlace, corte de vuelta.

Así lo resolvió Tecmo, y tiene una virtud de producción: una escena épica son dos a cuatro poses bien dibujadas más efectos, mientras que la épica en la vista de juego exigiría ciclos de animación completos.

## 4.2 La ceguera

En la vista táctica **los rivales no se dibujan**. Existen como entidades lógicas, se mueven, marcan e interceptan — pero no se ven. Se revelan en tres momentos: en el cruce, en la escena cinemática, y siempre en el radar.

Consecuencias de diseño, todas buenas:
- Perseguir al que te robó deja de tener sentido: no sabés dónde está. **La ceguera es el cimiento del modelo de saltos, no un adorno.**
- El radar deja de ser accesorio y pasa a ser la única fuente de información posicional del rival.
- El pase se vuelve una apuesta informada por el radar, no una lectura de la cancha.
- La escena de definición es el momento en que **por fin le ves la cara al rival**. Jugaste todo el partido contra fantasmas y de golpe está ahí, cargando el remate.

Flag `ceguera_rival`, encendido por defecto. Perilla de rescate: `RADIO_REVELACION` (revela rivales cerca del portador), arranca en 0 = ceguera total.

## 4.3 El bucle de juego

```
LIBRE (saltos)  →  anuncio del momento  →  MENÚ (pausa real)
MENÚ            →  elección propia + elección secreta del CPU  →  RESOLUCIÓN
RESOLUCIÓN      →  escena ilustrada + freeze + silencio + desenlace  →  LIBRE
```

Durante MENÚ la simulación está genuinamente detenida (lección aprendida: pausar de verdad mató una familia entera de bloqueos). Durante RESOLUCIÓN no hay input.

---

# 5. EL PARTIDO

## 5.1 El reloj a saltos (perilla única)

El reloj **no es un cronómetro continuo**: avanza en bloques. Cada momento consume una cantidad fija de minutos de partido, se interrumpe cuando hay acción, y sigue. Un solo parámetro, `TEMPO.MINUTOS_POR_MOMENTO`, define de una sola vez la duración real, la cantidad de decisiones y el ritmo.

| Preset | Minutos por momento | Momentos por tiempo |
|---|---|---|
| RELÁMPAGO | ~5 | 8–10 |
| **INTERMEDIO** (por defecto) | ~2,5 | 16–18 |
| LARGO | ~1,2 | ~35 |

Aparte, ajuste de **VELOCIDAD** (Normal / Rápida) que solo afecta animaciones y tiempos muertos, más **SKIP** para escenas ya vistas. Saques laterales y de arco casi instantáneos, sin caminatas.

**Objetivo medible:** un partido INTERMEDIO se juega en menos de 10 minutos reales.

## 5.2 El menú de comandos

Contextual según situación. Cada opción muestra su costo de aguante en **número**, no solo barra.

**Con la pelota, en el piso:** Pase (dirigible sobre el radar) · Gambeta · Uno-Dos / Pared · Tiro (bloqueado desde campo propio: "no llega").
**Recibiendo en zona rival, pelota baja:** Pase · Trap · Pase al vacío (trayectoria punteada) · Volea.
**Recibiendo pelota alta:** Pase · Trap · Pase al vacío · **Cabezazo** o **Chilena**.
**En área propia:** Pase · Trap · Despeje.
**Defendiendo:** Corte de pase · Quite · Bloqueo · No moverse (recupera aguante — es una decisión válida y a veces la correcta).
**Arquero:** Atajar · Despejar de puño · en mano a mano, achicar o cubrir.

## 5.3 El duelo

Cuando dos jugadores se cruzan, se dispara el duelo. La matriz es **piedra-papel-tijera con información parcial**: quite gana a gambeta, corte gana a pase, bloqueo gana a tiro. El CPU elige en secreto y al mismo tiempo.

La resolución combina **cuatro factores, ninguno dominante**:
1. Stats de los dos jugadores.
2. Aguante disponible.
3. Azar acotado (la fortuna, que da drama).
4. Ejecución de destreza del jugador.

Después del duelo, **separación notable**: el perdedor queda lejos, como el gambeteado del anime que queda tirado metros atrás. Nada de quedar pegados y volver a chocar.

## 5.4 El medidor de envión

Barra que se llena ganando quites, gambetas y duelos. Cuando está llena se gasta en potenciar al equipo unos momentos, o en una **Súper Defensa** que bloquea un remate de forma segura. Es mérito acumulado, no reflejo. Siempre con número además de barra.

---

# 6. LA DEFINICIÓN (la escena estrella)

Cuando alguien entra en zona de definición, el partido corta a una sub-escena a pantalla completa. **Es simétrica: atajar tiene que dar tanta adrenalina como meterla.**

## 6.1 Definición ofensiva

**FASE 1 — POSICIÓN.** Vista de tres cuartos del área rival. Movés a tu jugador buscando el ángulo. Los defensores se acercan a ritmo lento y leíble: cuanto más esperás, mejor ángulo, pero más cerca los tenés. Botones contextuales con su costo: TIRO · GAMBETA (si te marcan) · PARED (si hay compañero cerca, barata a propósito) · CABEZA o CHILENA (si viene alta) · PASE.

**FASE 2 — EJECUCIÓN.** **El duelo de seis zonas:** el arco se divide en seis (arriba y abajo × izquierda, centro, derecha), cada una con etiqueta y forma propia. Vos elegís una; el arquero elige otra a ciegas y al mismo tiempo. Coinciden → atajada segura. A una zona → atajada difícil. A dos o más → llega mal. Encima corre la barra de timing que modula la potencia, con punto dulce: floja la ataja, pasada se va afuera.

**FASE 3 — EL VUELO.** La pelota sale, la cámara la acompaña, el defensor se tira, el arquero vuela.

**FASE 4 — EL DESENLACE.** Freeze + medio segundo de silencio absoluto + revelación.

## 6.2 Definición defensiva

**FASE 1 — CORRER Y POSICIONAR.** El arco es el tuyo. **Corrés a tu defensor** buscando meterte en la línea entre la pelota y el arco, mientras el rematador **carga el remate** (barra visible). También posicionás al arquero. Opciones: INTERPONERSE (seguro, bloqueo parcial) · BARRIDA (alto riesgo: le sacás la pelota o quedás tirado y él queda solo) · ACHICAR (reduce las zonas útiles del rematador, pero si la toca por arriba queda vendido) · QUEDARSE EN LA LÍNEA (más margen de reacción) · MEGABLOQUEO / MEGAATAJADA (si el envión está lleno) · NO MOVERSE.

**FASE 2 — VOS SOS EL ARQUERO.** El rematador elige zona a ciegas, vos elegís la tuya, corre tu barra de reacción. Y si posicionaste bien un defensor, **hay una tirada de bloqueo previa**: la jugada puede morir ahí, con su propia mini-revelación.

**FASES 3 y 4** espejadas. Una atajada en el último minuto se grita igual que un gol.

## 6.3 Las secuencias

Jugadas que **encadenan varias escenas en una sola acción épica**. Precedente verificado: la jugada combinada existe en el original desde 1988, barata en aguante.

- **MEGACORRIDA:** arrancás, se te van quedando rivales atrás uno a uno en escenas sucesivas, y rematás con el arquero estirándose.
- **JUGADA COMBINADA:** gambeteás, se suma un compañero en escena, elegís centro o pase, el compañero define en la escena siguiente.

Costo alto de aguante, desbloqueo por progresión. Es el techo de espectáculo del juego.

---

# 7. LA ECONOMÍA DEL AGUANTE

## 7.1 Por qué existe

Sin economía, el menú es plano: elegís siempre el número más alto. Con economía, **cada elección es una tragedia chiquita**.

La regla de oro: **el crack tiene que poder ganarte un partido, y no tiene que poder ganarte dos.**

## 7.2 Los números (calibrados contra el original)

En el original, el tanque del mejor jugador llega a ~880, el tiro top cuesta 400 (45% del tanque), y por debajo de 100 el jugador queda inútil. **Dos tiros top y chau.** El "dos" nunca fue una regla: era aritmética.

Traducción a PAMPA STAR sobre tanque de 1000:

| Acción | Costo | % del tanque |
|---|---|---|
| Umbral de inutilidad | 110 | 11% |
| **MEGATIRO (Disparo del Caldén)** | **450** | 45% |
| Especiales medios (Atuel, Tornado) | 250–280 | 25–28% |
| Cabezazo especial | 200 | 20% |
| Chilena | 180 | 18% |
| Pared / uno-dos | 120 | 12% |
| Gambeta especial | 90 | 9% |
| Tiro normal | 90 | 9% |
| Quite normal | 50 | 5% |
| Pase normal | 20 | 2% |
| Recuperación de entretiempo | alta (el crack vuelve cerca de 800) | — |

## 7.3 Dos reglas asimétricas heredadas del original

- **La CPU tiene aguante infinito pero con un límite invisible**: si se pasa, sus habilidades caen en picada. El rival se desgasta solo, sin que administres nada. Trampa deliberada y elegante.
- **Los jugadores con movimientos especiales tienen stats base más bajas.** El crack es bueno UNA vez, no bueno siempre.

## 7.4 Las megacosas (data, no código)

Viven en `data/megacosas.json`. Cada una tiene nombre propio pampeano, grito, costo, multiplicador y nivel de desbloqueo por progresión.

**Megatiros:** Disparo del Caldén ("¡CALDENAZO!", *la fuerza del árbol eterno*, nivel 1) · Tiro del Atuel ("¡ATUELAZO!", *el río que no negocia*, nivel 3) · Tornado Pampeano ("¡TORNADO!", *el viento que arrasa*, nivel 5).

**Megadefensas:** Quite Pampero ("¡PAMPERO!", nivel 2) · Bloqueo Médano ("¡MÉDANO!", nivel 2) · La Tranquera ("¡TRANQUERA!", atajada, nivel 3).

Cada megatiro tiene además una línea de cancha mínima que lo habilita: no se patea desde cualquier lado.

---

# 8. PROGRESIÓN: EL MODO MASTER

## 8.1 Por qué Master y no manager

Decisión de diseño explícita de Rodri: **el juego es diversión, no administración.** No se ficha, no se negocia, no se maneja presupuesto. La parte "crecer" se resuelve jugando.

## 8.2 Cómo funciona

Torneo con divisiones. Arrancás en la **Primera B de la Liga Cultural** y soñás con el **Mundial**.

- **Dificultad FIJA por división**, nunca elástica. Los de la B son flojos, los de la A son duros. Cada ascenso tiene que SENTIRSE. "Cada vez te cruzás equipos más poronga."
- **Perder no reinicia nada.** No ascendés, o descendés, y seguís. Precedente del original: si perdés jugás contra el equipo anterior, con intentos ilimitados, y subís de nivel igual. Dificultad escalonada más red de contención. Para un juego institucional es lo correcto: no castiga al pibe que perdió.
- **Entre temporadas tus jugadores mejoran solos** por haber jugado. Esa es la parte New Star Soccer sin lo tedioso.
- **Perfiles de IA por rival**: un rival estrella se tiene que sentir distinto de uno de pueblo. (Pendiente: hoy todos juegan igual.)

---

# 9. CONTENIDO: LA PAMPA

## 9.1 El roster

`data/roster_pampeano.json` — **50 identidades pampeanas ficticias**. Nombres de pila inventados; apodos y pueblos reales de La Pampa (información pública). Sin personas reales, sin menores. Stats derivadas de forma determinista: mismo id, mismas stats siempre. Data pura, portable a Godot como recurso tal cual.

Cada jugador tiene nombre, apodo, pueblo, posición, un **rasgo** y una **historia**. Ejemplo real del archivo: *Thiago, "El Bagual de Winifreda", arquero, rasgo "patea contra el viento", de Winifreda, empezó pateando en la calle de tierra.*

## 9.2 Los clubes

**10 clubes por pueblo**, cada uno con su apodo y sus 5 jugadores: El Bagual de Winifreda, El Caldén de Toay, El Viento de General Pico, y así. El ecosistema real del fútbol pampeano convertido en plantel de JRPG.

## 9.3 El relator

`data/relatos.json` alimenta a `PampaRelator`: ticker con relatos cortos en tono pampeano de cancha, con variantes por situación y sin repetir la misma frase dos veces seguidas. Hooks listos para un futuro modo con voz. El gol se grita con el pueblo: *"¡GRITALO, WINIFREDA!"*

---

# 10. DIRECCIÓN DE ARTE

## 10.1 La división del trabajo (la decisión que destrabó todo)

> **Rodri pone los dibujos. Claude Code pone el movimiento.**

Dibujar por código tiene techo bajo: un muñequito de rectángulos parece siempre un muñequito de rectángulos. Pero el código es excelente moviendo: tweens, cámara, líneas de velocidad, flashes, sacudidas y cortes impecables. Si se le pide dibujar, se pierde. Si se le dan dibujos y se le pide moverlos, gana.

## 10.2 La técnica: animación limitada

**El jugador NO se anima: se sostiene.** Cada acción es UNA pose ilustrada, quieta, grande, recortada. Todo lo demás es código:

- Fondo en tres capas a distinta velocidad (cielo casi quieto, tribuna lenta, pasto rápido).
- Líneas de velocidad radiales o rayas diagonales barriendo, en los momentos épicos.
- Sacudida de la pose 2–3 px a alta frecuencia = se lee como esfuerzo brutal.
- Zoom rápido de cámara hacia la pose, temblor en el impacto.
- Flash blanco #FFFFFF de un frame en el contacto.
- **FREEZE de 250–500 ms antes de cada revelación.** El efecto más barato y más épico que existe.
- Cortes secos entre pose y pose. Como el manga entre viñetas.

Regla de producción: **tres poses excelentes valen más que quince pobres.**

## 10.3 El estilo

Ilustración anime deportivo ochentoso. Cel shading con sombras duras de tres tonos. Contornos negros gruesos. Sin degradados, sin dithering, sin textura. Proporción heroica (~3,5 cabezas). Alto contraste, legible como silueta en chico.

**Convivencia deliberada:** las poses ilustradas conviven con la cancha en pixel art. No es inconsistencia — es el canon del género: en el original la cancha era de bloquecitos y los cut-ins eran dibujos con otro nivel de acabado.

## 10.4 Los assets

**Poses de acción** (`assets/poses/`, PNG con transparencia real, recortadas, sin halo): remate, chilena, cabezazo, barrida, arquero volando, arquero atajando, festejo. Pendientes: gambeta ganada, gambeta perdida, pared, bloqueo, corrida.

**Retratos** (`assets/retratos/`): 11 bustos webp optimizados + sistema modular 64×64 por capas con cuatro expresiones (concentrado, frustrado, triunfante, dolorido) que el juego elige según el momento.

**Interfaz** (`assets/ui/`): portada, logo con alpha, héroe, fondos de menú y pueblo, relatores.

**Editor de pinta:** el avatar se arma por capas dibujadas por código — 4 tonos de piel, 6 cortes de pelo con forma propia, 5 colores, 3 ojos, 3 cejas, 3 bocas, vincha, muñequeras, 3 estilos de camiseta. Tu cara es la que aparece en los duelos y en las escenas: **el que patea sos vos**.

## 10.5 Paleta base

| Elemento | HEX | Distinción no cromática |
|---|---|---|
| Equipo propio | #4FC3F7 | círculo en radar · camiseta lisa |
| Equipo rival | #FF8A50 | triángulo en radar · camiseta a rayas |
| Pelota | #FFFFFF borde #000000 | rombo en radar |
| Jugador controlado | anillo #FFFFFF | anillo + nombre sobre la cabeza |
| Aguante alto / medio / bajo | #2E7D32 / #F9A825 / #C62828 | **siempre con el número** |
| Cancha | #2E7D32 / #388E3C | franjas alternadas |

---

# 11. SONIDO

Chiptune procedural original, sin librerías de licencia dudosa y sin música ajena.

- Tema pausado y tenso con la pelota en campo propio, que **crece al cruzar al campo rival**.
- Tema distinto cuando la tiene el rival.
- Riser en el anuncio de cada cruce; riser alargado y distinto si viene una megacosa ("⚠ ¡ALGO GRANDE SE VIENE!").
- **Medio segundo de silencio absoluto antes de cada desenlace épico.** El efecto más barato y más potente del juego.
- Explosión de hinchada en el gol propio; lamento en el gol en contra.
- Tictac en los últimos cinco minutos. **Descuento sorpresa:** no sabés el segundo exacto del final.

Desbloqueo con el primer toque (política de autoplay), mute compartido con el motor clásico.

Esta estructura —un tema con la pelota, otro cuando la tiene el rival, uno más urgente en los últimos cinco minutos— es exactamente la del original. No es casualidad: es lo que hace que el partido respire.

---

# 12. ACCESIBILIDAD (requisito duro, no negociable)

Rodri tiene deficiencia de visión cromática. **Ninguna información del juego puede depender solo del color.**

- Toda distinción cromática lleva **forma, número o etiqueta** de apoyo.
- Radar: círculos vs. triángulos, no celeste vs. naranja.
- Equipos: rayas vs. liso, además del color.
- Aguante: el número siempre visible, además de la barra y su color.
- Editor: cada variante tiene NOMBRE (steppers "◀ Rulos ▶"); cortes, ojos y bocas se distinguen por forma.
- Todo HEX documentado con etiqueta en código y en documentación.

**Si una información del partido se distingue solo por color, es un bug, no una preferencia.**

Otras: control de un pulgar (botones ≥48 px, nada en el centro de la pantalla, sin gestos de dos dedos), **sin mouse como requisito** (todo con dedo o teclado), tutorial de tres pasos la primera vez, y ESPACIO = ACCIÓN, siempre y solo.

---

# 13. ARQUITECTURA TÉCNICA

## 13.1 Stack

Phaser 3 · HTML5 / JS vanilla · sin build step · GitHub Pages. Mobile-first apaisado (960×540, FIT + CENTER_BOTH, `roundPixels`, `pixelArt`). Detección de orientación con pantalla de "girá el teléfono".

## 13.2 Separación lógica / presentación

**Regla de oro del proyecto:** la lógica es PURA y corre en Node sin dependencias ni navegador.

```
phaser/logic/     partido.js · tiro.js · avatar.js · relator.js     ← lógica pura, testeable, portable
phaser/scenes/    match.js · editor.js · avatar_arte.js · sprites.js ← presentación Phaser
phaser/data/      balance.json                                       ← TODOS los números
phaser/audio/     sfx.js                                             ← chiptune procedural
data/             roster_pampeano.json · megacosas.json · relatos.json · portraits_manifest.json
assets/           poses/ · retratos/ · ui/
docs/             los documentos de diseño por tanda
```

Esto no es prolijidad: es **la ruta de escape a Godot**. La lógica y la data viajan tal cual; solo se reescribe la presentación.

## 13.3 Balance externalizado

`phaser/data/balance.json` con bloques: `mundo · ritmo · vista · escena · tempo · feel · persecucion · conduccion · aguante · partido · duelo · tiro · tiro_ejecucion · juego · cine · epica`.

**Ningún número de tuning vive en el código.** Se afina editando un archivo, sin tocar escenas.

## 13.4 Tests

~2.248 asserts en cinco suites, corriendo en Node sin dependencias:

```
node phaser/test/duel.test.js         → 2010 asserts
node phaser/test/avatar.test.js       →  137
node phaser/test/partido.test.js      →   32
node phaser/test/tiro.test.js         →   15
node phaser/test/perspectiva.test.js  →    9
```

Más soak de partido completo (dos tiempos + entretiempo + final, clicks al azar en todos los menús) verificando cero errores de consola y cero congelamientos.

## 13.5 Saves y compatibilidad

Clave única `pampa_star_v1`, compartida entre el motor clásico y el Phaser. Los agregados (`career.avatares`) son aditivos y tolerantes a su ausencia. **Retrocompatibilidad verificada en cada commit**, con prueba de ida y vuelta: save viejo → flag ON → partido Phaser → aplicar → flag OFF → clásico consistente.

## 13.6 Feature flags

Cada feature nueva detrás de un flag apagable. `partido_phaser` **apagado por defecto**: el motor clásico sigue siendo el camino activo hasta que Rodri autorice la fusión. El flag se persiste en el navegador y se fuerza por URL (`?partido_phaser=1` / `=0`).

## 13.7 Proceso de desarrollo

**Claude Code es el único agente autorizado** a modificar los archivos núcleo. Nunca corren dos agentes sobre el mismo archivo. El chat de estrategia produce documentos; Claude Code implementa.

El ciclo que funciona: **especificación escrita → tanda por bloques → un commit por bloque → revisión adversarial → tests → HANDOFF con checklist → playtest de Rodri → feedback → nueva especificación.**

La revisión adversarial (multi-lente, hasta 13 agentes) es la red de seguridad. Su hallazgo más grave hasta hoy: la cámara quedaba con zoom y pan colgados en el clímax, y el "¡GOOOL!" salía ampliado y corrido ~100 px en cada tiro.

**Regla de la tanda agresiva:** commitear lo estable antes de cualquier freno; nada queda en working tree; el HANDOFF se escribe siempre.

---

# 14. LOS NO NEGOCIABLES

Vigentes en toda versión, toda tanda, todo agente:

1. **Sin apuestas ni dinero real.** Ninguna mecánica de casa de apuestas, casino o sorteo con plata. Regla permanente de todos los proyectos de Rodri. (El New Star Soccer original tiene el casino como mecánica central: acá se saca entera.)
2. **Sin marcas, nombres, assets ni terminología de terceros**, ni en el producto ni en los comentarios del código. Incluye la palabra "guts" (nombre del medidor de energía de Tecmo) → **"aguante"**. Aplica también a los prompts de generación de arte.
3. **Sin nombres reales de menores.** El roster es 100% ficticio.
4. **Sin mouse como requisito.** Todo jugable con dedo o teclado.
5. **Modelo de datos neutro en género.**
6. **Saves retrocompatibles** después de cada commit.
7. **Toda información distinguible por forma, número o etiqueta además del color.**
8. **Claude Code es el único agente** sobre los archivos núcleo.

---

# 15. HISTORIA DEL PROYECTO

## 15.1 De dónde viene

**Fusion4** — proyecto anterior de juego de conquista territorial en La Pampa, pausado cuando se cayó el programador del equipo. PAMPA STAR es la revancha: ahora ese rol lo cubre la herramienta y Rodri queda donde mejor está parado, como **director de diseño**.

**El descarte** que definió el género: se evaluó New Star Soccer (dificultad de "feel" del remate), un arcade top-down noventoso (dificultad de IA multiagente, donde mueren casi todos los clones), y un 3D arcade (desproporcionado). Ganó el fútbol por comandos: la dificultad es lógica de estado, que es la zona cómoda de Rodri.

## 15.2 La cronología del desarrollo

**Hito 1 — La cámara.** Mundo lógico 2400×1200, cámara con follow, solo el portador materializado. Revisión adversarial de 3 lentes → 4 fixes.

**Etapas 2–6 y Etapa Final.** Radar y HUD accesibles, menús con pausa real, retratos en duelos, sprites heroicos, economía de aguante, pulido cinemático, y la fusión con el clásico detrás de flag apagado (`fdd50b0`). QA de 93 minutos sin un error.

**Tanda Feel v3 — "El alma Tsubasa"** (`0861f54..24d7a24`). Ocho bloques: ritmo (todo baja un 35%, ningún menú aparece de golpe), saque real, controles que se explican solos, la tensión del pase, LA DEFINICIÓN reintegrada con timing y megatiro con cine, megacosas defensivas, la épica de la corrida, el sonido de la épica.

**Tanda Anime v4** (`c18d68c..2d2488d`). Vista táctica elevada + tempo, la capa cinemática (gestor `EscenaCine`), chiptune que suena, el relator pampeano, tiros situacionales con chilena, retratos modulares con expresiones.

**La pieza histórica:** el commit `53f0d80` guarda la escena anterior con LA DEFINICIÓN y el cine de 5 planos — el sistema que Rodri aprobó y que se reintegra en la v6.

## 15.3 Los tres playtests que corrigieron el rumbo

1. *"Veintidós cabezones amontonados"* → cámara pegada al jugador.
2. *"Achicaste la pantalla pero no pusiste el arte, entonces es jugar con menos campo de visión"* → dos capas: táctica elevada + cinemática.
3. *"Ahora uno ve más un FIFA, pero es otra cosa lo que queremos lograr"* → modelo de saltos + ceguera.

Cada corrección fue más profunda que la anterior. Ninguna salió de leer un documento: salieron de jugar.

## 15.4 El criterio final

Los tests verifican que nada se rompa. **Que se sienta Tsubasa lo firma Rodri y nadie más.** Si el partido te da tiempo de pensar, si el Caldén te da el vacío en el estómago, si mirar la pantalla mientras corrés te hace sentir un héroe de anime y no un muñeco en un campo verde — ahí está listo.

---

# 16. HOJA DE RUTA

## 16.1 En construcción (tanda v6)

Fixes urgentes (radar, arquero, intercepción, cambio de jugador, marca, rename a "aguante") → modelo de saltos + ceguera + reloj a saltos → **LA DEFINICIÓN v2 ofensiva y defensiva con las 7 poses** → escenas del gestor → balance del aguante → sonido → envión → megacosas y hinchada → relator → secuencias → modo Master.

## 16.2 Decisiones abiertas

- **Encender `partido_phaser`** como camino definitivo, y qué pasa con el clásico (¿queda como "modo retro"?).
- **Información asimétrica:** hoy se muestran los porcentajes de las dos partes. El original ocultaba todo (y degeneraba en elegir siempre el número más alto). Punto dulce a probar: mostrar los tuyos, ocultar los del rival, y dar una pista de lectura ("DYLAN viene calentito", "DYLAN está fundido").
- **Reorientación vertical de la perspectiva.**

## 16.3 Parking lot

Viento que afecta pases y tiros · estado de la cancha (seca / embarrada) · el perro que se mete a la cancha · megacosas por posición (arquero que saca largo, defensor que cabecea, mediocampista que filtra, delantero que fusila) · cartas coleccionables elegibles antes del partido, obtenibles jugando y nunca comprando · modo streamer con voz · desafío diario con semilla fija compartida entre todos los pibes de La Pampa · PWA instalable · porteo a Godot · alargue y penales (recién con las eliminatorias del Mundial) · tácticas seleccionables.

## 16.4 Deudas conocidas

- La carrera (temporada, vida, progresión) sigue viviendo en el motor clásico: el partido Phaser lee el nivel pero no la corre adentro. **Es el gap más grande del proyecto.**
- Las tandas Feel y Anime corrieron con auto-revisión inline; la adversarial multi-agente cayó por límite de sesión. Las features más nuevas tienen menos red que las viejas.
- El pase no pasa por la matriz de duelo: su riesgo vive en un porcentaje suelto del receptor.
- IA genérica: sin perfiles por rival ni tácticas.
- El uno-dos no deja elegir compañero específico.
- Las poses del arquero tienen rayas en la manga que evocan trade dress de una marca deportiva: regenerar con mangas lisas.

---

# 17. EL HORIZONTE

PAMPA STAR es, además de un juego, una prueba de concepto. Un funcionario provincial sin equipo de programación, dirigiendo un agente de IA como director de diseño, construyendo en semanas un juego con identidad local, arte propio, 2.248 tests y cero pesos de presupuesto.

Y no es un ejercicio abstracto: es exactamente el proyecto que se cayó cuando se fue el programador de Fusion4, ahora terminándose.

Del potrero al Mundial.

---

*Documento vivo. Las especificaciones de implementación por tanda viven en `/docs`. El estado real vive en `PROGRESO.md` y en los HANDOFF.*
