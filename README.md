# PAMPA STAR

**Fútbol pampeano jugada por jugada.** Armás tu pinta, elegís tu localidad y
jugás tu carrera del potrero al Mundial. Un juego de la **Subsecretaría de
Juventudes de La Pampa**, gratis y sin publicidad, que se juega en el
navegador del celular o de la compu. Está en camino a la versión 1.0.

## Jugar

**https://juventudlapampa.github.io/pampa-star/**

Ese es el link oficial: abre la portada (qué es, cómo se juega y un botón
grande ▶ JUGAR). El juego en sí vive en `phaser/`.

- **En el celular:** se juega con el teléfono acostado. Se puede instalar
  como una app: desde el menú del navegador, *Instalar app* o *Agregar a la
  pantalla principal*; en iPhone, el botón *Compartir* y *Agregar a inicio*.
  La primera vez baja unos 13 MB de a poco (mejor con Wi-Fi); después abre
  sin bajar todo de nuevo.
- **En la compu:** con el mouse o con el teclado (flechas, Enter y espacio).
- **La carrera queda guardada en el navegador** donde se juega. No hay
  cuentas y el juego no mide visitas ni junta datos. Para seguirla en otro
  aparato está el **código de carrera** (CÓDIGO DE CARRERA para llevarla,
  PEGAR UN CÓDIGO para traerla).
- **Para medios y sitios que quieran sumarlo** a una nota:
  [`docs/PARA_MEDIOS.md`](docs/PARA_MEDIOS.md) (el link, el código del
  iframe y un texto corto para acompañar).

## Para quién es

Para la gente de 12 a 25 años de toda la provincia, sobre todo en el
celular: un link que anda en cualquier teléfono, sin descarga y sin trámite.

## Qué hay en el juego

- **La carrera (Modo Master).** Elegís tu localidad en el mapa de La Pampa,
  armás tu pinta y te entrevista Nito. Arrancás en la Primera B y el
  campeón sube: Primera B, Primera A, Regional, Nacional y el Mundial. Fecha
  a fecha, con tabla de posiciones, y entre fecha y fecha una semana con una
  sola elección: entrenar TIRO, PASE o GAMBETA, descansar, ver al rival o
  salir con la barra. Cada ascenso tiene su escena y, si ganás el Mundial,
  Nito te vuelve a entrevistar y te recuerda lo que contestaste al empezar.
- **El partido por comandos.** No se corre atrás de la pelota: el partido se
  frena cada vez que hay que decidir y elegís qué hacer. Con la pelota: gambeta,
  pase, pared o tiro. Defendiendo: quite, corte o bloqueo. Arriba se ve la
  escena ilustrada y abajo el mapa de la cancha; cada acción gasta aguante.
- **De frente al arco.** El remate se juega mirando el arco, con el
  arquero y la defensa del rival: elegís el hueco y la pegada y le pegás
  en el momento justo. En el teléfono se patea arrastrando el dedo desde la
  pelota. Los tiros libres y los penales se patean igual.
- **El arte.** Poses ilustradas a mano que cortan a pantalla completa en
  cada jugada grande (la pose queda quieta y se mueve todo lo demás), con
  música y sonido que siguen lo que pasa en la cancha.
- **Accesible:** nada se distingue solo por color (siempre va con forma o
  con texto), los botones tienen tamaño de dedo y se puede manejar con el
  teclado.

## Correrlo para desarrollar

No hay paso de compilación ni dependencias: es HTML y JavaScript servidos
tal cual. Hace falta [Node](https://nodejs.org) para el servidor local y
para la suite.

```bash
node server.js     # http://localhost:8123 (la portada) · http://localhost:8123/phaser/ (el juego)
bash test.sh       # la suite entera: tiene que terminar en "SUITE COMPLETA VERDE"
```

La suite son los archivos de `phaser/test/*.test.js`, que corren en node sin
navegador. Al final muestra las **DEUDAS A LA VISTA**: cosas que están mal y
todavía no frenan un commit.

Si trabajás desde el zip de distribución (sin `assets/_fuente/`, que son los
originales de las ilustraciones), dos bloques salen como `⊘ OMITIDO` en vez
de fallar: `ciclos.test.js` y `w1_peso.test.js` miden sobre esos originales.
Con el repo completo corren normalmente.

**Dónde está cada cosa:**

| Carpeta | Qué hay |
|---|---|
| `index.html` | la portada: el link oficial, liviana (solo HTML y CSS) |
| `phaser/` | el juego (ver [`phaser/README.md`](phaser/README.md): arquitectura, escenas y suite) |
| `data/` | el contenido en JSON: divisiones, plantel, relatos, entrevista, semana, eventos |
| `assets/` | ilustraciones, logo, tipografías y música |
| `docs/` | la documentación |
| `clasico/` | el motor anterior. No se linkea desde la portada ni desde el juego: queda para quien tenga guardada una carrera vieja, que el juego nuevo importa |

## Documentación

- [`docs/PAMPA_STAR_GDD.md`](docs/PAMPA_STAR_GDD.md): el documento raíz del
  juego (qué es, cómo se juega, de qué está hecho, hacia dónde va). Se lee
  primero.
- [`docs/TANDA_1_0.md`](docs/TANDA_1_0.md): la tanda que termina la 1.0, ítem
  por ítem, con qué estaba mal, qué se hizo y cómo se verificó.
- [`docs/PARA_MEDIOS.md`](docs/PARA_MEDIOS.md): para difundirlo y sumarlo a
  una nota.

## Créditos y licencias

PAMPA STAR es un juego de la **Subsecretaría de Juventudes de La Pampa**. La
pantalla de créditos completa (personas, ilustraciones y música) está en
preparación para la 1.0.

- **Motor:** Phaser 3.80.1, licencia MIT (en `phaser/vendor/`).
- **Tipografías:** Archivo Black, Bowlby One, Pixelify Sans, Press Start 2P
  y VT323, SIL Open Font License 1.1 (detalle en
  [`assets/fonts/README.md`](assets/fonts/README.md)).
- **Música:** generada con Suno y con Gemini. Lo de Suno es del plan
  gratuito, sin derechos de uso comercial. Las condiciones de Gemini para
  la música generada no se leyeron [FALTA DATO].
- **Efectos de sonido:** generados con ElevenLabs (plan gratuito). La tabla
  de ElevenLabs para música dice que el plan gratuito es solo para uso
  personal; para efectos de sonido no hay dato anotado [FALTA DATO].
- **Licencia de música y efectos:** a confirmar por la Subsecretaría antes
  de la difusión institucional.
- **Código, ilustraciones y logo:** el repositorio todavía no tiene un
  archivo de licencia. Hasta que la Subsecretaría la defina, no hay un
  permiso escrito para reutilizarlos.

## Reglas de contenido

Son las de hoy y no se negocian. Las vigilan tests de la suite.

- **Clubes y ligas ficticios; localidades reales.** Los clubes y sus nombres
  son inventados (y se chequean contra los reales para no cruzarse); las
  localidades de La Pampa son las de verdad, que son geografía pública.
- **Nadie real en la cancha.** El plantel tiene nombres de pila inventados,
  sin apellidos: ninguna persona identificable.
- **Sin marcas, clubes, medios ni juegos ajenos**, en el juego y en el código
  (`phaser/test/seccion11.test.js`). El medidor se llama **aguante**.
- **Sin apuestas, sin plata y sin publicidad:** no se compra nada adentro del
  juego.
- **Lenguaje institucional** en todo lo que se lee: sin masculino genérico,
  sin "e", sin barras y sin arrobas; se escribe sin género ("quien juega",
  "la gente", "tu equipo") y se dice "localidad".
- **Nunca solo color:** todo lo que se distingue por color lleva además una
  forma o un texto.
