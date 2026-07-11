# PAMPA STAR — Diseño del Feel v3 ("El alma Tsubasa")

**Documento de diseño ejecutable para Claude Code.** Complementa y manda sobre `docs/DISENO_PARTIDO_V2_PAMPA_STAR.md` en todo lo referido a ritmo, tensión y presentación. Origen: playtest de Rodri del 11/07/2026 sobre la build `fdd50b0`.

---

## 0. Diagnóstico del playtest

La v2 construyó el esqueleto correcto (cámara cinematográfica, radar, comandos con pausa, máquina de estados) pero el partido no se siente Tsubasa por tres carencias de alma: el ritmo es demasiado rápido, no hay tensión antes de las resoluciones, y la épica visual del héroe corriendo no existe todavía — con lo cual el zoom de cámara, sin su arte, se percibe como pérdida de campo de visión en lugar de cine. Además el saque inicial es incorrecto, el botón de acción no se descubre solo, y ni los tiros ni las defensas tienen momentos especiales.

**Principio rector de esta tanda:** Tsubasa no es fútbol rápido con pausas; es un drama lento donde cada jugada importante se anuncia, se decide, se ejecuta con destreza y se resuelve con teatro. Si una jugada clave dura menos de tres segundos entre anuncio y resolución, está mal.

---

## Bloque 1 — RITMO (la raíz, se hace primero)

Todo el partido baja un cambio. Se introduce una configuración central `RITMO` en el balance con estos efectos, cada uno como parámetro afinable independiente:

1. La velocidad de corrida del portador baja entre un 30 y un 40 por ciento respecto de la actual, y la de la simulación lógica de los otros 21 baja en proporción.
2. Los encuentros con rivales se anuncian ANTES de ocurrir: cuando un defensor entra en radio de cruce, el juego muestra un beat de tensión de 600 a 900 ms (zoom leve de cámara, sonido de riser, el rival aparece en el borde de la vista) antes de pausar y abrir el menú. Nunca más un menú que aparece de golpe sin aviso.
3. Toda resolución (gambeta, quite, pase interceptado, tiro) dura como mínimo 1,5 segundos de animación y teatro antes de devolver el control. La resolución instantánea queda prohibida.
4. El reloj del partido escala con el ritmo nuevo para que un partido completo siga durando lo mismo en minutos reales.

**Aceptación (Rodri en el celu):** el partido se siente "por turnos disfrazado de fútbol"; hay tiempo de pensar; ninguna jugada clave pasa tan rápido que no se entienda qué pasó.

---

## Bloque 2 — SAQUE Y POSICIONES REALES

El partido arranca como arranca el fútbol: los dos equipos cada uno en su mitad, en su formación, y el saque desde el círculo central con la pelota en el punto medio. Tras cada gol, saque del equipo que lo recibió, otra vez desde el centro con todos reposicionados. Los laterales, córners y saques de arco reposicionan de forma plausible según la lógica ya existente. Ningún jugador puede empezar el partido en campo rival.

**Aceptación:** al tocar "¡A LA CANCHA!" se ve el saque desde el centro; después de un gol, se repite el ritual.

---

## Bloque 3 — CONTROLES QUE SE EXPLICAN SOLOS

Un botón de ACCIÓN visible permanente en pantalla, táctil, de 64 px o más, con etiqueta "⚡ ACCIÓN" y pulso sutil cuando hay acciones disponibles. La primera vez que se juega un partido (flag en el save), un overlay de 3 pasos superpuesto al juego real: movés con el dedo o las flechas, ACCIÓN abre el menú, en el radar tocás el destino del pase. En teclado, la barra espaciadora es ACCIÓN y se muestra la ayuda contextual "ESPACIO = ACCIÓN" la primera vez. El overlay no vuelve a aparecer salvo reset.

**Aceptación:** una persona que nunca vio el juego entiende cómo jugar sin que nadie le explique.

---

## Bloque 4 — LA TENSIÓN DEL PASE

El pase deja de ser instantáneo. Al confirmar un pase: la cámara acompaña la pelota en su viaje (pan corto), y si hay un rival en la línea de pase, el juego muestra el momento de peligro — el rival se lanza al corte con su animación, medio segundo de suspenso con sonido en suspenso, y recién ahí se revela si la pelota pasa o la cortan, resuelto por stats como ya está en la lógica. Si la cortan, mini-teatro del rival quedándose con la pelota. El pase al vacío muestra la trayectoria punteada y al compañero corriendo a buscarla, con el mismo beat de suspenso si hay peligro.

**Aceptación:** cada pase con peligro genera el "¿llega o no llega?" y se ve al interceptor intentarlo; los pases seguros fluyen sin fricción.

---

## Bloque 5 — LA DEFINICIÓN (destreza en los tiros) — reintegración desde git `53f0d80`

Se reintegra el sistema LA DEFINICIÓN que vive en el commit `53f0d80`, adaptado al marco v2: el tiro no se resuelve solo por stats, sino que el jugador EJECUTA. Tiro normal: barra de timing (frenar la aguja en la zona buena modula potencia y colocación; solo dedo o teclado, jamás mouse). MEGATIRO (tiro especial): secuencia épica completa — cut-in del retrato a pantalla, carga de guts visible, la ejecución de destreza con ventana más exigente, y resolución con el cine de 5 planos que también vive en `53f0d80` (carrera, impacto, vuelo de la pelota, estirada del arquero, desenlace). La ejecución influye pero no reemplaza los stats: destreza perfecta con guts vacíos sigue siendo tiro débil.

Cada MEGATIRO tiene nombre propio pampeano definido en data (no hardcodeado), costo alto de guts, y desbloqueo por progresión de carrera.

**Aceptación:** patear un tiro normal exige timing; un MEGATIRO se siente como un evento (anuncio, carga, ejecución, cine, desenlace) que dura sus buenos 5 a 8 segundos y da adrenalina.

---

## Bloque 6 — MEGACOSAS DEFENSIVAS

La épica no es solo del que ataca. Los defensores (propios y rivales) tienen movimientos especiales con la misma gramática del MEGATIRO: MEGABLOQUEO, MEGAQUITE y MEGAATAJADA, con cut-in, costo de guts alto y resolución teatral. Los rivales estrella los usan contra vos en momentos calientes (definido por la lógica de duelos, no aleatorio puro), y tus jugadores los desbloquean por progresión. Cuando un rival te anuncia una megacosa, el beat de tensión del Bloque 1 se alarga y el sonido cambia: sabés que viene algo grande.

**Aceptación:** al menos una vez por partido contra un rival fuerte pasa algo defensivo memorable, y se distingue claramente de un quite común.

---

## Bloque 7 — LA ÉPICA DE LA CORRIDA (el arte del héroe)

La deuda visual central: cuando tenés la pelota, en la vista grande tiene que estar TU jugador — el del editor de pinta, con su cara y su camiseta — corriendo con animación de ciclo completo, no un sprite genérico chico. Spritesheet heroico de cuerpo entero según la dirección de arte ya establecida (proporción de 3 a 4 cabezas, tres cuartos trasero), con ciclo de correr de 6 frames mínimo, líneas de velocidad detrás cuando corre a fondo, y la pelota pegada al pie con su propio rebote. El rival que te sale al cruce aparece entrando al plano con su animación, no teletransportado. Si el presupuesto de frames aprieta, es preferible menos animaciones pero buenas (correr y gambeta impecables) que muchas pobres.

**Aceptación (el criterio de Rodri manda):** mirar la pantalla mientras corrés da sensación de héroe de anime llevando la pelota, no de muñeco perdido en un campo verde.

---

## Bloque 8 — EL SONIDO DE LA ÉPICA

El audio acompaña el ritmo lento, no lo apura. Tema pausado y tenso cuando tenés la pelota en campo propio, que crece al cruzar al campo rival; riser en el anuncio de cada cruce; SILENCIO total de medio segundo justo antes de revelar la resolución de un tiro o un duelo grande (el silencio es el efecto más barato y más épico que existe); explosión de hinchada en el gol, lamento en el gol en contra; tictac ya existente en los últimos 5 minutos. Todo original o placeholder propio, hooks ya cableados de la tanda anterior.

**Aceptación:** jugar con sonido y sin sonido son experiencias distintas; el silencio pre-resolución genera el vacío en el estómago.

---

## Orden de ejecución y reglas de la tanda

El orden es el de los bloques: primero el ritmo porque es la raíz de la que dependen la tensión y la épica; después saque y controles porque son rápidos y arreglan la primera impresión; después LA DEFINICIÓN porque ya existe en git y es la mayor ganancia de adrenalina por token invertido; después pase, megacosas, arte y sonido. Un commit por bloque con mensaje "Feel N: descripción". Tests y revisión adversarial por bloque como en la tanda anterior. Todo parámetro de ritmo y de ventanas de timing va al archivo de balance, afinable sin tocar escenas. Los no negociables de la sección 11 del doc v2 siguen vigentes completos, incluyendo: nada de mouse como requisito, retrocompatibilidad de saves en cada commit, máximo 3 sprites grandes en cámara (los cut-ins y cines son paneles de UI, no sprites del mundo), y ninguna marca de terceros en producto ni comentarios. Al final, HANDOFF_FEEL.md con la checklist de aceptación por bloque para el celu de Rodri.
