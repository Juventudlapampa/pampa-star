# P11 · PEDIDOS DE ARTE

Todo lo que le falta al juego para verse más vivo, con la descripción de cada
pieza. **No inventé arte: esto es la lista para que Rodri lo genere.**

Lo que ya existe hoy: **12 poses** (remate, chilena, cabezazo, barrida,
arquero_vuela, arquero_ataja, festejo, gambeta_gana, gambeta_pierde, pared,
bloqueo, corriendo), **1 fondo** (tribuna), **8 caras**, **6 identidades**,
**11 retratos** del banco.

Cada pieza dice **dónde se usaría** y **qué se ve hoy en su lugar**, porque eso
es lo que decide si vale la pena.

---

## PRIORIDAD 0 · SEPTIEMBRE 2026 (tanda de arte V10)

### 0.1 · BLOQUEO y BARRIDA con NUESTRA camiseta
- **Dónde**: "te rematan" (tus defensores que saltan o se tiran a tapar) y la
  Definición defensiva cuando se planta uno de los tuyos.
- **Hoy**: tus defensores salen con la camiseta NARANJA A RAYAS del rival,
  porque `pose_bloqueo` y `pose_barrida` existen solo en ese kit. La placa
  dice el nombre en celeste, pero el dibujo es de otro equipo. Con los fondos
  pintados nuevos se nota mucho más.
- **Por qué no se tiñe por código**: en `pose_bloqueo` la piel de los brazos
  (que cruzan el pecho) es casi del mismo naranja que la camiseta — medido:
  la camiseta ronda #fc844c y la piel #fca46c. Un teñido por color pinta los
  brazos de celeste. Y las poses de nuestro equipo que se parecen (`quite`,
  `cabezazo_v2`) traen la pelota DIBUJADA, que en esa escena sería una
  segunda pelota.
- **Qué es**: las mismas dos poses, idénticas, con camiseta CELESTE LISA,
  short BLANCO, medias celestes, botines negros. Sin número o con un número
  que no sea el 10 (el 10 es VOS). **Sin pelota dibujada.**
- **Formato**: como las otras poses — PNG con alfa nativo, sin halo, el
  cuerpo entero adentro del lienzo (en la `pose_bloqueo` de hoy los botines
  quedan cortados por el borde de abajo).
- **Nombres**: `pose_bloqueo_celeste.webp`, `pose_barrida_celeste.webp`.

### 0.2 · Lo que la barrida encontró roto en el arte que ya está (no lo toqué: regla de no reprocesar)
- **Poses con el hueco de la pelota recortada**: `pose_cabezazo` (el disco se
  come la frente y los ojos), `pose_chilena` (la punta del botín),
  `pose_gambeta_gana` (media pantorrilla), `pose_remate` (el empeine),
  `pose_arquero_ataja_v2` (190 px en el pecho). En el juego la pelota del
  juego los tapa — y desde el 25/sep la pelota se ve de nuevo (estuvo
  invisible cinco semanas y los huecos quedaban a la vista).
- **Halo magenta/violeta del recorte**: las 8 caras, las 6 identidades,
  `pose_corriendo`, `pose_barrida`, `pose_festejo`, `pose_arquero_vuela_v2`.
  Sobre los fondos claros nuevos (la siesta) se nota más que antes.
- **Retratos del banco `retrato_pibe_1` a `_6`**: alfa roto — ojos, bocas y
  remeras transparentes, manchas de damero alrededor. Hoy no se ven (el flag
  de retratos modulares está prendido), pero si se apaga, salen así.
- **Estilos que no pegan**: `pose_festejo` (anime moderno, línea gruesa),
  `pose_cansado` (vectorial, celeste turquesa), `retrato_juvenil` (acuarela
  realista). `pose_tiro` y `pose_volea` tienen el pelo castaño y vincha: se
  leen como otro jugador.

---

## PRIORIDAD 1 · LO QUE HOY SE VE MAL POR FALTA DE ESTA PIEZA

### 1.1 · Retrato de NELDA
- **Dónde**: el cuadro de diálogo de la tribuna, durante todo el partido.
- **Hoy**: un retrato prestado del banco de futbolistas — un pibe joven de
  mirada seria. No es ella.
- **Qué es**: una mujer grande del pueblo, de las que jugaron en la liga
  femenina hace años y siguen yendo a la cancha. Cara de la que sabe y no se
  emociona hasta que la pelota entró. No sonríe. Podría tener un mate, un
  pañuelo en el pelo, o nada.
- **Formato**: busto de frente o tres cuartos, fondo transparente o liso.
  Se muestra recortado en un círculo de 42 px, así que la cara tiene que
  ocupar buena parte del cuadro.

### 1.2 · Retrato de EL TULI
- **Dónde**: el mismo cuadro, debajo de Nelda.
- **Hoy**: otro pibe prestado del banco.
- **Qué es**: el que sufre y el que come. Gordito, supersticioso, exagerado y
  tierno. Viene por el partido y por el choripán, en ese orden discutible.
  Cara de estar sufriendo aunque vayan ganando. Podría tener el choripán en la
  mano.
- **Formato**: igual que Nelda.

### 1.3 · Pose de QUITE (el que roba la pelota)
- **Dónde**: la escena del quite ganado dentro del área, y el trámite del
  quite en el panel.
- **Hoy**: se usa `barrida`, que es tirarse al piso. Funciona cuando el
  subtítulo dice "te tiraste al piso", pero no cuando robás de pie.
- **Qué es**: un defensor sacando la pelota con la pierna estirada, **de pie**,
  el cuerpo metido entre el rival y la pelota. Es el gesto del que llega
  primero, no del que se barre.

### 1.4 · Pose de VOLEA
- **Dónde**: la variedad del remate (hoy hay tres: tiro, volea, cabezazo) y la
  decisión aérea.
- **Hoy**: `remate` para las tres. El cabezazo sí tiene la suya; la volea no.
- **Qué es**: el pie a la altura de la cadera, el cuerpo abierto, la pelota en
  el aire. La pose más difícil y más linda del fútbol.

### 1.5 · Las tres poses de arquero con la camiseta CELESTE
- **Dónde**: cuando el arquero que ataja es el TUYO (la defensa de tu arco).
- **Hoy**: existen `arquero_vuela` y `arquero_ataja` en naranja. Al arquero
  propio se lo tiñe, y el tinte sobre una camiseta naranja no da celeste
  limpio.
- **Qué es**: las mismas dos poses más una de despeje, con camiseta celeste.

---

## PRIORIDAD 2 · LO QUE LE FALTA A LA INTRO (P10)

### 2.1 · Seis fondos para los planos negros
- **Dónde**: la intro. Siete de sus ocho planos son figuras flotando en negro
  puro, y por eso se lee como pantalla negra con dibujos.
- **Qué es**: no hacen falta ilustraciones nuevas completas. Alcanza con
  **fondos de valor**: un cielo pampeano al atardecer, un alambrado contra el
  campo, una tribuna de tablones desenfocada, tierra y pasto seco de cerca.
  Pueden ser abstractos y de un solo color dominante — lo que falta es que
  haya algo detrás.

### 2.2 · Un plano para reemplazar el 2
- **Dónde**: el segundo plano de la intro, que hoy son 2 segundos de negro.
- **Qué es**: cualquier cosa que se vea. La sugerencia: la pelota vieja en el
  pasto seco, quieta, antes de que empiece todo.

### 2.3 · El logo de PAMPA STAR
- **Dónde**: el plano final de la intro, y arriba en el menú del Master.
- **Hoy**: la intro cierra con la bajada "DEL POTRERO AL MUNDIAL" en texto
  chico, y el juego nunca muestra su propio nombre dibujado.
- **Qué es**: el nombre como pieza gráfica. Un caldén, una estrella, o las dos
  cosas.

---

## PRIORIDAD 3 · LO QUE ABRE COSAS QUE HOY NO SE PUEDEN HACER

### 3.1 · Jugador DE ESPALDAS (corriendo hacia el arco)
- **Dónde**: es la pieza que **habilita la opción B de P6** — la cancha
  profunda. Sin ella, el modo profundo se ve con poses de perfil giradas.
- **Qué es**: el jugador visto desde atrás, corriendo, alejándose de la cámara.
  Con la pelota al pie y sin ella.

### 3.2 · Jugador RECIBIENDO de frente
- **Dónde**: la otra mitad de lo mismo: el que espera el pase largo, visto de
  frente y chico al fondo.
- **Qué es**: brazos abiertos, cuerpo perfilado, esperando que le llegue.

### 3.3 · Retrato del ENTREVISTADOR
- **Dónde**: la entrevista después de la fecha (O2).
- **Hoy**: se dibuja un muñeco geométrico con Graphics.
- **Qué es**: Nito Carrizo, de FM El Caldén — el que hace "Tercer Tiempo". Un
  tipo de pueblo con un micrófono viejo.

### 3.4 · El DT y el UTILERO
- **Dónde**: la semana (las decisiones de lunes/miércoles/viernes) y el
  vestuario.
- **Hoy**: no existen como personajes; la semana es solo texto y cajas.
- **Qué es**: dos caras más del club. El DT que te mira cuando elegís
  descansar; el utilero que sabe todo y no dice nada.

---

## PRIORIDAD 4 · LO QUE SUMA VIDA SIN DESBLOQUEAR NADA

### 4.1 · Más caras para la hinchada
- **Hoy**: la tribuna son siluetas negras que respiran y saltan. Funciona, pero
  son todas iguales.
- **Qué es**: 4 o 5 siluetas distintas — uno con bombo, uno con bandera, una
  con el bebé a upa, uno parado sobre el tablón.

### 4.2 · La pelota vieja
- **Hoy**: la pelota es un círculo blanco con gajos.
- **Qué es**: una pelota de potrero, gastada, con el cuero pelado. Cambia la
  clase social del juego entero con una pieza de 32 px.

### 4.3 · Objetos del pueblo para los fondos
- Un caldén solo en el campo · un molino · un alambrado · el cartel de entrada
  al pueblo. Sirven para los fondos de la intro y para variar la tribuna según
  la división (la escalera de C ya modula densidad y luz, pero el fondo es
  siempre el mismo).

### 4.4 · El escudo del club propio, dibujado
- **Hoy**: los escudos son geométricos, generados por código (12 colores,
  7 formas, 7 patrones). Está bien para los 90 rivales.
- **Qué es**: para TU club, uno dibujado a mano. Es el único que vas a mirar
  toda la carrera.

---

## LO QUE NO PIDO

- **Ciclos de animación.** La doctrina del juego es pose quieta y corte seco
  (V6). Una pose por gesto alcanza; cuatro cuadros por gesto sería tirar
  trabajo.
- **Retratos de los 90 rivales.** El sistema de identidades genera cara
  determinista por nombre. Con 6 identidades ya no se repiten seguido.
- **Nada de marcas, clubes o jugadores reales** (sección 11).
