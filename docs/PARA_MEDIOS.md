# PAMPA STAR · para medios y sitios que quieran sumarlo

Pampa Star es un juego de fútbol pampeano, gratis y sin publicidad, de la
Subsecretaría de Juventudes de La Pampa. Se juega en el celular o en la compu,
desde el navegador: quien juega arma su pinta, elige su localidad y hace su
carrera del potrero al Mundial, jugada por jugada.

## El link

```
https://juventudlapampa.github.io/pampa-star/
```

Abre la portada del juego: qué es, cómo se juega y un botón grande **▶
JUGAR**. Pegado en un mensaje o en una red, el link muestra la tarjeta del
juego (el logo sobre la ilustración del campo pampeano y "DEL POTRERO AL
MUNDIAL"). La carrera queda guardada en el navegador de cada persona.

Si hace falta el link que entra directo a jugar, sin la portada:
`https://juventudlapampa.github.io/pampa-star/phaser/`.

## Para ponerlo adentro de una nota (iframe)

Copiar y pegar este código donde vaya el juego:

```html
<iframe src="https://juventudlapampa.github.io/pampa-star/phaser/embed.html"
  style="width:100%;aspect-ratio:16/9;border:0"
  allow="autoplay; fullscreen" title="PAMPA STAR" loading="lazy"></iframe>
```

Qué hace, y por qué así:

- **`embed.html` es una página liviana** (unos 160 KB: la ilustración, el logo
  y un archivo chico). Quien lee la nota y pasa de largo no baja el juego.
- **En el celular** el recuadro muestra un póster con **▶ JUGAR EN PANTALLA
  COMPLETA**, que abre el juego en una pestaña nueva. Ahí se juega apaisado, a
  pantalla completa y con la carrera guardada. Adentro de la columna de una
  nota, en un teléfono, el recuadro es demasiado chico para jugar.
- **En la compu**, si el recuadro mide 640 px de ancho y 360 de alto o más,
  el juego arranca adentro de la nota. Con el botón **PANTALLA COMPLETA** (arriba a la
  izquierda, en el editor) se agranda.
- **`aspect-ratio:16/9`**: el juego es apaisado. Con un alto fijo (por ejemplo
  `height:1100px`) el recuadro queda vertical y solo se ve el póster.
- **`allow="autoplay; fullscreen"`**: sin `fullscreen` el navegador no deja
  agrandarlo; sin `autoplay` la música puede no arrancar.
- **`loading="lazy"`**: el recuadro carga recién cuando la nota llega hasta ahí.

El link del póster no lleva ningún dato: el juego no mide visitas.

## Lo que conviene saber

- **La carrera de adentro de la nota no es la misma que la del link.** El
  navegador guarda aparte lo que se juega dentro de la página de otro sitio (y
  algunos no dejan guardar nada ahí). Por eso, en el celular, el póster manda
  a una pestaña propia.
- **Se juega apaisado.** Si alguien lo abre en vertical, ve la portada con
  la ayuda para girar el teléfono y, en Android, el botón **JUGAR EN
  HORIZONTAL**.
- **Abierto desde Instagram, Facebook o TikTok** se abre en el navegador de
  la app. El juego avisa y ofrece abrirlo en el navegador del teléfono (en
  Android, con un botón), para que la carrera quede guardada.
- **Peso:** la primera vez baja de a poco unos 13 MB a lo largo de la carrera
  (las ilustraciones y la música). Después abre desde el teléfono, sin bajar
  todo de nuevo.

## Texto corto para acompañar (280 caracteres)

> Llegó PAMPA STAR, el juego de fútbol pampeano: armás tu pinta, elegís tu
> localidad y hacés tu carrera del potrero al Mundial, jugada por jugada.
> Gratis, en el celular o en la compu. Jugalo acá:
> juventudlapampa.github.io/pampa-star/

(Son 231 caracteres con el link.)
