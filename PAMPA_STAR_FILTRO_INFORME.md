# PAMPA STAR — Filtro editorial del informe (Tsubasa + New Star Soccer)

> El informe de Gemini es una radiografía excelente de la arquitectura. Esto es el filtro: qué tomamos, qué adaptamos y qué tiramos, y en qué etapa entra cada cosa. La regla de oro sigue: tomamos la mecánica y la matemática (no tienen dueño); nunca los nombres, personajes ni moves reales de Tecmo/Captain Tsubasa.

## Lo que CONFIRMA (ya lo teníamos bien)

La escenografía viva de los jugadores en cancha (activos vs posicionales), el flujo de escenas con la tensión del pase, el cambio al defensor más cercano al perder la pelota, la rotación emocional de amigos cuando te transfieren, la matriz de audio por estados (posesión, amenaza, urgencia, stingers) y el leitmotiv que evoluciona de la Primera B al Mundial. Todo esto ya está en nuestros diseños del partido v3, la escalera y la dirección de sonido. Buena señal.

## Joyas nuevas para INTEGRAR

**Megatiros como privilegio contextual (va al Partido v3).** El menú habilita el tiro especial solo cuando la jugada cumple condiciones (ej. el pase llegó alto desde la banda, o venís con racha de Guts). Resuelve el "no llegaba a los megatiros" y los hace sentir ganados. Con nombres pampeanos, no los del juego original.

**Matriz piedra-papel-tijeras en los duelos (va al Partido v3, capa de balance).** La resolución no es solo stat contra stat: cada comando tiene ventaja o desventaja contra otro (gambetear le gana a quien corta el pase, pero pierde contra quien mete la entrada), ponderado por estadísticas más azar. Es el juego mental de adivinar la intención del rival, y le da profundidad táctica real.

**Economía de Guts con jerarquía (va al Partido v3 y a balance).** Acciones normales baratas, especiales carísimos, con valores propios nuestros. Sumale el desgaste del arquero: los tiros fuertes le drenan Guts aunque los ataje, y el "asedio" (tirarle hasta cansarlo) se vuelve una estrategia emergente. El arquero recupera Guts en el entretiempo solo si le convirtieron; eso agrega tensión.

**Work Rate atado a los Guts (conecta la Vida con la cancha).** Si empujás tu esfuerzo al máximo para lucirte, participás en más jugadas pero drenás Guts más rápido y arriesgás que te saquen por agotamiento. Ata la ambición del metajuego a la gestión del partido. Es la bisagra que une las dos mitades del juego.

**Rasgos de los amigos (enriquece la Capa 3).** Cada amigo puede tener un rasgo con efecto mecánico: uno tipo "armador" que te genera más chances, uno "cazagol" letal si le das la asistencia en el área, etc. Con nombres propios. Les da personalidad y hace que elegir y mejorar amigos importe más.

**Tácticas de IA defensiva (profundidad para más adelante).** Poder elegir marca normal, presión alta o contragolpe, cada una con su ventaja y su riesgo. Suma una capa de decisión estratégica antes y durante el partido.

## Lo que NO tomamos (frenos de editor)

**El casino y las apuestas: rechazado, sin excepción.** El metajuego de New Star Soccer está construido alrededor del casino, con escándalo de "ludópata" incluido. Es el no-negociable del proyecto. Lo reemplazamos entero por la economía pampeana (changa, familia, pensión, primer sueldo), sin ninguna mecánica de apuesta.

**La novia como sumidero de recursos: rechazado.** En NSS la novia es un pozo de plata "mecánicamente ineficiente" con escándalos de ruptura. Para un producto de juventud firmado desde el Estado, y con el compromiso de modo femenino y lenguaje neutro, esa mecánica es off-brand y de mala óptica. La capa de vida con familia, amigos y pueblo la reemplaza sin perder nada.

**Los vicios y escándalos negativos: rechazado.** La prensa de PAMPA STAR reacciona al rendimiento (una racha, un golazo, una mala tarde), no a vicios ni escándalos de vida privada.

**Nombres, personajes y moves reales: nunca.** Tsubasa, Hyuga, Tiger Shot, Cyclone Shot y compañía no se copian jamás. Tomamos la estructura y la matemática; los nombres son pampeanos y originales.

## Dónde entra cada cosa

Al Partido v3 (o su balance, después de probarlo): megatiros contextuales, matriz piedra-papel-tijeras, economía de Guts y desgaste del arquero. A la Capa 3 / Vida: el Work Rate atado a los Guts y los rasgos de los amigos. A etapas posteriores: las tácticas de IA defensiva. Nada de esto frena el v3 que se está construyendo; se folda como capa de profundidad y balance una vez que el flujo básico ande.
