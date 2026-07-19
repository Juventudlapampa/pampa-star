# PAMPA STAR — REDISEÑO v8 "EL PULSO Y EL JUGADÓN"

**Documento ejecutable para Claude Code. Es una corrección de ARQUITECTURA, no una tanda de fixes.** Nace del playtest de Rodri del 18/07 sobre el commit `792072f`, cruzado con capturas del Captain Tsubasa 2 de NES que Rodri aportó. Corrige el error de fondo que arrastran todas las versiones desde el V6.

> **El error de raíz:** el partido se construyó como tiempo real (movimiento continuo, 22 sprites moviéndose sueltos). Eso produjo todo lo que Rodri reporta: jugadores como "hormigas random", velocidad que salta de lenta a rapidísima, la sensación de "desprogramado", y un caos injugable. El original NO es tiempo real: es **por comandos y pulso**. Este documento tira el tiempo real del partido y lo reemplaza.

---

## §1 — EL PULSO (reemplaza el movimiento en tiempo real)

El partido avanza por **latidos discretos** (tuc-tuc-tuc), no por segundos continuos. Entre latido y latido el mundo se reposiciona; nunca hay 22 cosas moviéndose libres a la vez.

**Cómo te movés (modelo semi, como el original):**
- Si TENÉS la pelota: manejás a tu jugador, avanzás a pulso hacia donde dirigís, y la cámara te enfoca. El mundo (los 21) reacciona a tu avance por latidos.
- Si NO tenés la pelota: manejás al jugador seleccionado (el mejor parado, con cambio automático) para perseguir/marcar. La cámara enfoca **a quien tiene la pelota** (ver §4).
- El juego PAUSA para decidir en los cruces y en las jugadas clave. Entre pausas, avanza a pulso.

**Regla dura:** si en algún momento el jugador puede correr en tiempo real continuo y perseguir libremente como en un FIFA, el pulso está mal implementado. El movimiento es a tramos por latido, no fluido-continuo.

`TEMPO` en balance define la duración del latido y cuántos minutos de partido consume cada uno (los presets Relámpago/Intermedio/Largo se recalibran sobre el pulso, no sobre el reloj continuo).

---

## §2 — LA IA DE LOS 21 (el arreglo del caos)

Hoy los jugadores "parecen hormigas que se mueven random" y el jugador puede avanzar sin que nada pase. Causa: no hay IA de equipo real. Se construye una.

**Cada uno de los 21 jugadores actúa según su PUESTO y la SITUACIÓN:**
- Los defensores defienden y marcan; los mediocampistas circulan y cortan; los delanteros se ofrecen y definen. Un jugador no hace cualquier cosa: hace lo de su puesto.
- **Comportamiento situacional dinámico:** en un córner, los que corresponde suben al área rival y los otros defienden; en un tiro libre, se arma la barrera; en saque de arco, se abren. La formación se REACOMODA según la jugada, no está congelada.
- El rival te viene a marcar de verdad cuando avanzás (arregla "puedo avanzar y no pasa nada").
- Los perfiles de IA por club (del V7) modulan esto: un club ofensivo adelanta líneas, uno defensivo se repliega.

**La CPU no adivina:** su elección en los duelos y su acción sale de su puesto, sus stats y un componente acotado de azar — nunca de "copiar lo que hace el jugador". Si la CPU hace siempre lo mismo o refleja al jugador, está mal.

---

## §3 — EL JUGADÓN (la plataforma de acción, el corazón nuevo)

El sistema de "esquivar rápido con jugadores que se mueven" **NO va en el partido normal** — ahí es injugable, como bien detectó Rodri. Va en una **plataforma de acción aparte**, que se activa con fichas limitadas.

### §3.1 Las fichas (6 por partido)

El jugador tiene, por partido: **2 SÚPER QUITES** (defensivo), **2 GAMBETAS** (para superar marcas), **2 SÚPER TIROS** (para definir). Son el recurso épico: se gastan cuando querés forzar algo difícil o épico. El resto del partido se juega por comandos normales (stats + azar), SIN la barra de timing aburrida.

### §3.2 Cómo es la plataforma

Escena aparte, **cancha más ancha que larga** (como el prototipo que Rodri aprobó y le gustaba; referencia: el gambeteo de Pampa Mundialista pero con más opciones). Es dinámica, no corta el ritmo con menús.

**En la GAMBETA / esquive:**
- Los rivales **vienen hacia vos y se mueven** (no están quietos). Tenés que decidir en el momento; la CPU también decide.
- Las opciones dependen de la CARTA/perfil del jugador: moverte izquierda/derecha, **caño**, **salto/sombrerito**, **enganche**, etc. Un jugador random tiene pocas; un crack tiene más, y por eso es más difícil pasarlo con lo básico y hay que arriesgar el caño o el sombrero.
- **Lectura mutua, sin adivinar:** el juego te avisa/insinúa la intención del rival y vos la tuya; gana quien lee mejor, no quien tiene el número más alto. La CPU lee de verdad, no hace trampa copiando.
- Ves cuántos vienen: **si son uno o dos marcadores**, y te posicionás en consecuencia.

**En el SÚPER TIRO:**
- Al momento de disparar se analiza la **fuerza y energía del que patea**.
- Vos (como jugador) **elegís la zona del arco** a la que apuntás.
- La IA del arquero **elige dónde se para / a dónde vuela**, y su nivel importa (hay arqueros buenos y malos).
- **Física real, esto es clave (Claude Code la programa):** si el arquero está cerca de la trayectoria, la ataja — salvo que la pelota venga tan fuerte que le revienta las manos (fuerza del pateador vs. manos del arquero). Si el pateador es bueno y la cruza a un ángulo donde el arquero no llega, **no llega y es gol**. No es una tirada de dados disfrazada: es geometría (posición del arquero vs. zona elegida) más fuerza vs. reflejos. El azar existe pero acotado por la física.

**En el SÚPER QUITE:** el equivalente defensivo — te metés en la jugada del rival en la plataforma para robársela, con la misma lógica de lectura mutua.

---

## §4 — CÁMARA Y PRESENTACIÓN (fixes que dependen de lo anterior)

**El foco sigue a la pelota, NO a tu jugador.** Hoy cuando perdés la pelota la cámara te enfoca a vos corriendo al pepe. Corrección: **la cámara enfoca SIEMPRE a quien tiene la pelota.** Cuando el rival te la roba, se ve al RIVAL con la pelota, grande, revelado (con su cara y nombre) — ese es el drama de "me la tiene el Ramiro". Verlo a él, no a vos.

**Doble cuadro al perder la pelota:** cuando perdés la posesión y venís corriendo/persiguiendo, se puede mostrar un cuadro dividido — el rival con la pelota avanzando, y vos/tu equipo reaccionando — para que no sea el mismo plano de siempre. Presentación distinta según quién ataca.

**El que maneja tiene la pelota:** buen recurso de claridad — el jugador controlable por defecto es el que tiene la pelota (en ataque). Se ve de un vistazo quién es "yo".

**Números en las camisetas:** los jugadores llevan su número (como el original), para identificarlos en la cancha y en el mapa. Suma a la accesibilidad (número además de color y forma).

**Animación de corrida real:** hoy el jugador se desliza sin mover las piernas, y al retroceder "corre hacia atrás". Hacen falta: ciclo de piernas al avanzar, y una animación/pose distinta para retroceder (no el sprite de avance espejado yendo para atrás).

---

## §5 — ARTE Y TIPOGRAFÍA (deudas que siguen abiertas)

**LA TIPOGRAFÍA SIGUE MAL.** El fix anterior (Press Start 2P + VT323) no alcanzó: Rodri la sigue viendo "una poronga", y los acentos vienen rotos. Acciones:
- Verificar que las fuentes OFL estén realmente cargando (no cayendo a un fallback monoespaciado feo). Si Press Start 2P no soporta bien acentos en español (ñ, tildes), es un problema conocido de esa fuente: elegir una pixel-display alternativa con soporte latino completo (probar opciones OFL con glyphs latinos: ej. "Pixelify Sans", "Silkscreen" con set extendido, o una con acentos garantizados) y VERIFICAR en pantalla que "á é í ó ú ñ ¿ ¡" se vean bien.
- Referencia de Rodri: **la tipografía del Tsubasa original le gusta más** que la actual. Buscar ese carácter: pixel pero redondeada/con peso, no de terminal.
- Criterio: los acentos y la ñ tienen que verse perfectos; ninguna letra rota. Esto se prueba renderizando un texto con todos los acentos antes de dar por cerrado.

**Retratos con puntos raros en el pelo:** algunas caras muestran píxeles sueltos en el borde del pelo (artefacto del recorte de la imagen fuente). No es urgente; anotarlo. Si molesta, se puede suavizar el borde del alpha en esas caras puntuales.

**Las pieles no calzan bien** en algunas combinaciones (ej. el tinte no matchea el cuello/manos de la ilustración). Revisar el mapeo de tinte de piel para que sea coherente en toda la figura, no solo en la cara.

---

## §6 — SONIDO

Mejorable pero no urgente (palabras de Rodri: "de a poco"). La música de intro y de partido queda para una pasada de pulido posterior. No se toca en esta tanda salvo que rompa algo.

---

## §7 — ORDEN Y REGLAS

Orden estricto, porque cada bloque habilita al siguiente:
1. **§1 EL PULSO** — la base. Sin esto nada de lo demás tiene sentido. Detrás de flag `pulso` encendido por defecto; el modo tiempo-real viejo queda accesible con el flag apagado SOLO para comparar, hasta que el pulso esté aprobado.
2. **§2 LA IA DE LOS 21** — sobre el pulso.
3. **§4 CÁMARA** (foco a la pelota, el que maneja tiene la pelota, números, animación de corrida/retroceso) — barato y arregla la sensación de inmediato.
4. **§3 EL JUGADÓN** — la plataforma de acción con las 6 fichas y la física real del arquero. Es el bloque más grande.
5. **§5 TIPOGRAFÍA** — con verificación de acentos en pantalla obligatoria.
6. Retratos/pieles y sonido quedan como pulido posterior.

Reglas de siempre: austeridad, commit por bloque ("v8 §N: descripción"), tests por bloque (el jugadón y la física del arquero necesitan tests de lógica pura nuevos), nada en working tree, HANDOFF_V8.md con checklist para el celu de Rodri y las decisiones abiertas. Sección 11 integral (sin marcas ni "guts", sin apuestas, sin menores, forma/número/etiqueta además de color, sin mouse como requisito, saves retrocompatibles).

**Criterio de aceptación (Rodri, el único juez):** el partido se siente como el Captain Tsubasa —pulso, no FIFA—; los 21 juegan según su puesto y la situación, no como hormigas; puedo gastar mis 6 fichas de jugadón en una plataforma dinámica donde leo al rival y él me lee a mí; el súper tiro se resuelve por física real (fuerza vs. arquero vs. zona), no por dados; la cámara enfoca a quien tiene la pelota; y las letras, con acentos, se ven lindas.
