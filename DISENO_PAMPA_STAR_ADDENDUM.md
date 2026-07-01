# PAMPA STAR — Addendum: Capa 3 (vida, amigos y plantel) + datos reales

> Este archivo se mergea al final del DISENO_PAMPA_STAR.md. Son secciones nuevas (13 a 15) que expanden la capa de vida y definen cómo se usan los planteles reales. NO es el próximo build: el orden sigue siendo partido primero, temporada después, y esta capa en tercer lugar.

---

## 13. La capa de vida (cómo se vive la carrera)

La vida transcurre en una semana entre fechas con unos pocos puntos de energía o tiempo para repartir. No es un menú aparte: es el motor de cómo jugás. Con esos puntos elegís entre cuatro cosas. Entrenar, que sube un stat tuyo o de un amigo. Descansar, que recupera energía. Juntarte con un amigo, que sube el vínculo con ese compañero. Y vivir, que es la textura pampeana (la familia, la changa, el asado, la pensión) y te da plata o ánimo.

La pieza que hace que esto no sea relleno es que el vínculo con cada amigo se traduce en la cancha: cuanto más alto el vínculo con un compañero, mejor te salen las paredes y los pases con él en el partido por comandos. Así se cierra el círculo. Vivís y entrenás fuera de la cancha, eso sube vínculos y stats, eso te hace mejor en el partido, eso te da plata y fama, y eso te abre mejores clubes y más vida. Ese círculo es el corazón de la capa y es lo que tenían tanto New Star Soccer como los modos historia de Captain Tsubasa.

## 14. El plantel de amigos (los pibes que reclutás)

El jugador tiene un núcleo de cuatro amigos. Vos más cuatro son cinco, que es el formato de fútbol cinco y mantiene la coherencia con el resto del trabajo de juventudes. Cuatro es la cantidad donde todavía les tenés cariño y te acordás de cada uno; de seis para arriba se vuelve administración y se diluye el vínculo. El resto del equipo es relleno genérico para no tener que gestionar a once.

Reglas del sistema de amigos:

**Los nombres los pone el jugador.** Esto es deliberado y resuelve dos cosas a la vez. Le da el realismo y el cariño que buscamos, y de paso elimina por completo cualquier problema de nombres reales o de menores en el plantel propio, porque los amigos son criaturas del que juega, no personas reales.

**Cada amigo tiene estadísticas propias** y se entrena y mejora con la capa de vida.

**Rotación de plantel (versión profunda, no la primera).** Cuando te venden a un club más grande, algunos amigos van con vos y a otros los venden o se quedan, y aparecen caras nuevas para reclutar. Perder a un amigo que levantaste de la nada tiene que doler: ahí están los stakes emocionales que atan al juego. La primera versión del sistema es solo reclutar, nombrar, entrenar y que jueguen con vos; la rotación viene después.

**Género neutro desde el modelo de datos.** A futuro se tiene que poder jugar con chicas o chicos, y esto tiene ancla real porque la Liga Cultural tiene Primera Femenina de verdad. Aunque la primera versión jugable sea de un solo lado, el modelo de datos nace neutro: no se hardcodea el género en ningún lado. Igual que el guardado retrocompatible, es barato ahora y carísimo después.

**Personalización con variantes pixel.** Tosco pero con variantes (pelo, camiseta, piel, etc.). Condición no negociable de accesibilidad: como el dueño del proyecto es daltónico, toda variante que dependa de color tiene que tener además un nombre o etiqueta, nunca distinguirse solo por color. Pelo "rapado" o "largo", camiseta "a franjas" o "lisa", no solo "la roja" y "la azul". Todos los colores que aparezcan en código se especifican en HEX.

## 15. Datos reales: planteles rivales

Los planteles de los clubes rivales pueden usar nombres reales de jugadores adultos, sacados de las formaciones publicadas en los medios. Esto cumple doble función: homenajea al fútbol pampeano y, como efecto lindo, el juego termina enseñando quién juega en cada club de la provincia.

**Guardas no negociables:**

Solo jugadores adultos de Primera A y Primera B. Nunca formativas, juveniles ni infantiles, porque ahí hay menores.

Los nombres se usan tal como los publican los medios. No se les inventan goles, escándalos ni datos que parezcan rendimiento real de esa persona. Sus estadísticas en el juego son claramente estadísticas de juego, no afirmaciones sobre la persona real.

Siempre como homenaje y celebración, nunca para ridiculizar a nadie.

Los goleadores que aparezcan en las tablas de la temporada simulada son genéricos o procedurales, salvo los reales que el sistema cargó con su nombre publicado. No se generan nombres con apariencia de persona real identificable de la nada.

**Fuentes:** las formaciones están desperdigadas partido a partido en A Un Toque (auntoque.com), Zonal Press (zonalpress.com.ar), El Diario de La Pampa y La Arena, más el sitio oficial ligacultural.com. No hay listas limpias de planteles: el roster se cosecha formación por formación, a mano, club por club.

**Cuándo se hace:** el harvest de planteles reales es una tarea discreta que se hace al construir la capa de rivales, con las formaciones más recientes, para que el roster no nazca desactualizado. Cualquier plantel real es una foto de un momento y conviene poder refrescarlo.

---

*Capas en orden de construcción: 1) partido estilo Captain Tsubasa, 2) temporada con zonas y tabla, 3) esta capa de vida, amigos y planteles reales. La tercera es la más rica pero solo rinde cuando las dos de abajo están firmes.*
