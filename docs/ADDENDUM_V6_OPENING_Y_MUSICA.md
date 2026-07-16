# PAMPA STAR — ADDENDUM v6: EL OPENING Y LA MÚSICA

**Complemento del `DISENO_MAESTRO_V6.md`.** Dos entregables que se ejecutan **al final del orden del §9**, después del modo Master. Si la tanda no llega, quedan documentados para la siguiente. Ninguno de los dos toca la lógica del partido: son de bajo riesgo y se pueden hacer aunque el resto quede parcial.

---

# PARTE A — EL OPENING (intro estilo anime)

## A.1 Por qué

Los juegos de este género se recuerdan por su presentación. El opening es lo que convierte "una demo que hizo un tipo" en "un juego". Y es **casi gratis**: el arte ya existe en `assets/poses/` y `assets/ui/`. No hay que dibujar nada nuevo — hay que MOVER lo que ya está, que es exactamente lo que el código hace bien.

## A.2 Dónde vive

Escena nueva `scenes/intro.js`, disparada al cargar el juego antes del título. **Salteable con cualquier toque o tecla** (obligatorio: nadie quiere ver el opening dos veces). Flag `intro_opening`, encendido por defecto. Se ve una vez por sesión; con un botón "ver intro" en el menú para repetirla a gusto.

## A.3 El guion, plano por plano

Duración objetivo: **18 a 25 segundos**. Todo en cortes secos, nada de fundidos. Cada plano dura entre 0,6 y 1,5 segundos salvo donde se indique.

**PLANO 1 — El potrero (3 s).** Negro. Aparece `fondo_pueblo.webp` con un lento zoom-in. Texto que se escribe letra por letra, tipografía pixel, abajo: *"En algún pueblo de La Pampa…"*. Sonido: viento (ruido blanco filtrado) y un bombo lejano.

**PLANO 2 — La corrida (2 s).** Corte seco. Fondo de rayas diagonales barriendo a alta velocidad. `pose_remate` entrando desde la izquierda y frenando en el centro, con temblor. La música arranca de golpe con el motivo principal.

**PLANO 3 — Ráfaga de héroes (4 s).** Secuencia rápida de cortes, ~0,7 s cada uno, cada pose sobre un fondo de líneas radiales de distinto color: `pose_chilena` → `pose_cabezazo` → `pose_barrida` → `pose_arquero_vuela`. Cada corte con flash blanco #FFFFFF de un frame. Cada uno con un golpe de percusión sincronizado.

**PLANO 4 — El grito (2 s).** `pose_remate` a pantalla completa, congelada, con zoom lento hacia la cara. El texto **"¡CALDENAZO!"** entra desde abajo, grande, con sacudida de cámara.

**PLANO 5 — El silencio (1 s).** **Todo se detiene. Silencio absoluto.** La pelota congelada en el aire. Es el mismo recurso que el juego usa en cada desenlace: el opening lo enseña antes de que lo juegues.

**PLANO 6 — El arquero (1,5 s).** Corte. `pose_arquero_vuela` estirándose contra un fondo blanco que se llena de líneas de velocidad. La música vuelve de golpe.

**PLANO 7 — El gol (2 s).** `pose_festejo` sobre explosión de líneas radiales doradas. Hinchada a todo volumen. Flash blanco.

**PLANO 8 — El logo (4 s, remate).** Corte a negro. `logo.webp` cae desde arriba y rebota, con impacto y temblor de cámara. Debajo, la bajada apareciendo letra por letra: **"DEL POTRERO AL MUNDIAL"**. Acorde final sostenido. Fundido al título.

## A.4 Reglas técnicas

Todo por `delayedCall` con reloj propio, nunca encadenando tweens (lección del Hito 1: los tweens encadenados se cuelgan). Cualquier input saltea al título de inmediato y corta el audio limpio. Si falta un asset, el plano se saltea solo y el opening sigue: **nada crashea por un archivo faltante**. Todos los tiempos, colores y textos a `balance.json → intro` para afinarlos sin tocar código. En celu se respeta el apaisado; en portrait, la pantalla de "girá el teléfono" va antes del opening.

## A.5 Aceptación

Rodri lo mira una vez en el celu y una vez en la PC. **Criterio: da ganas de jugar.** Y el corolario: cualquier plano de 5 segundos de este opening sirve como clip para las redes de la Subsecretaría, que es el formato que mejor rinde — una rebanada de gameplay concreta vale más que cualquier trailer narrativo.

---

# PARTE B — EL BRIEF MUSICAL

## B.1 El diagnóstico

Feedback textual de Rodri: *"la música de fondo es muy pedorra, parece Pokémon cuando va lento"*. El problema no es el chiptune: es que **nadie le dio dirección musical**. Pedirle a un generador "que suene mejor" produce lo mismo un poco distinto. Hay que darle tonalidad, tempo, progresión, instrumentación y motivo.

Un chiptune con dirección deja de ser genérico. Esto es un brief, no un pedido.

## B.2 El motivo (la identidad sonora del juego)

**Un motivo de 4 notas, ascendente, que aparece en TODOS los temas** transformado según el contexto. Es lo que hace que el juego suene a un juego y no a una playlist. En el tema tenso va lento y en menor; en el gol va rápido, alto y en mayor; en el opening va a toda orquesta.

Sugerencia concreta de intervalo: **tónica → quinta → sexta → octava** (heroico, abierto, muy fácil de recordar, funciona en cualquier tonalidad).

## B.3 Los temas

| Tema | Tonalidad | Tempo | Carácter | Capas |
|---|---|---|---|---|
| **Posesión propia, campo propio** | Menor natural (ej. La menor) | 92 BPM | Contenido, tenso, esperando | Bajo de corcheas + arpegio lento + motivo insinuado |
| **Posesión propia, campo rival** | El mismo, modula a mayor relativo | 112 BPM | Crece, se abre, esperanza | Suma percusión + el motivo entra completo |
| **Posesión rival** | Menor, con segunda menor (tensión) | 100 BPM | Amenaza, incomodidad | Bajo cromático descendente + motivo invertido |
| **Últimos 5 minutos** | Menor | 138 BPM | Urgencia | Tictac de corcheas + todo el resto comprimido |
| **Gol propio** | Mayor | 150 BPM | Explosión, 3 s | Motivo a toda potencia + hinchada |
| **Gol en contra** | Menor | 70 BPM | Lamento, 3 s | Motivo invertido y lento, solo bajo |
| **Opening** | Menor → Mayor | 140 BPM | Épico | Todas las capas, motivo como melodía principal |

## B.4 Reglas de arreglo

Tres capas mínimo en todo tema: **bajo** (onda cuadrada grave o triangular), **melodía** (cuadrada o pulso) y **percusión** (ruido filtrado). El error del chiptune pobre es tener una sola capa: por eso suena a juego de mesa. La progresión de acordes no puede ser I–IV–V–I plana; usar **i–VI–III–VII** (el clásico heroico) o **i–VII–VI–V** (el descendente dramático), que son las que suenan a anime ochentoso.

**El silencio es un instrumento.** Medio segundo de nada absoluta antes de cada desenlace vale más que cualquier acorde.

**Detalle pampeano opcional pero valioso:** una capa muy sutil de viento (ruido blanco filtrado, apenas audible) presente en todos los temas de partido. Es gratis, es identidad, y es la única cosa que a un juego japonés no se le habría ocurrido.

## B.5 Reglas duras

Todo generado proceduralmente por código (Web Audio / oscilador propio). **Cero música de terceros, cero muestras de terceros, cero librerías con licencia dudosa.** Todo parámetro musical (BPM, tonalidad, progresión, mezcla) a `balance.json → musica` para afinar sin tocar código. Volumen maestro y mute compartidos con el motor clásico, funcionando de verdad en PC y celu.

## B.6 Aceptación

**Jugar con sonido y sin sonido tienen que ser experiencias distintas.** Y el test específico de Rodri: el silencio antes del desenlace se tiene que sentir en el estómago.

Si después de esto el audio procedural sigue sin llegar, el plan B documentado es un set de pistas chiptune originales pre-compuestas siguiendo este mismo brief — pero **originales**, nunca de terceros. El oído final es de Rodri.
