# Cómo agregar arte a PAMPA STAR sin tocar una línea de código

Todo el arte del juego entra por **manifests JSON**. Poné el archivo en su carpeta,
agregá una entrada en el JSON que corresponde, y el juego lo levanta solo.
Si algo falla, el juego **no se rompe**: cae al arte que ya tenía.

Regla general: **PNG con fondo transparente**, sin recuadro, sin marco.
El juego escala todo por ALTURA, así que no importa el tamaño exacto —
importa que el personaje ocupe el alto del PNG y no quede flotando chiquito
en una esquina.

---

## 1 · UNA CARA NUEVA (el editor de pinta)

**Carpeta:** `assets/poses/caras/`
**Manifest:** `data/caras_manifest.json` → array `caras`

1. Guardá el PNG como `cara_loquesea.png` (busto de frente, transparente).
2. Agregá al array `caras`:

```json
{
  "id": "flequillo_largo",
  "n": "Flequillo largo",
  "archivo": "cara_flequillo_largo.png",
  "tonos": { "pelo": "#113344", "piel": "#ffeecc", "camiseta": "#44bbff" },
  "corte_bloques": "corto",
  "pelo_y1": 0.5
}
```

| Campo | Qué es |
|---|---|
| `id` | interno, sin espacios ni acentos. No se repite. |
| `n` | **el nombre que se lee en el editor** (ese sí con acentos). |
| `archivo` | el nombre exacto del PNG. |
| `tonos` | los colores que TRAE tu dibujo. Se sacan con un cuentagotas del propio PNG: el juego los usa para saber qué reemplazar cuando el jugador elige otro color. Si te equivocás, el tinte no agarra (no rompe nada). |
| `corte_bloques` | qué corte usa el muñequito chico del mapa: `corto`, `rulos`, `melena`, `rapado`. |
| `pelo_y1` | hasta qué altura del PNG llega el pelo, de 0 (arriba) a 1 (abajo). **Si el tinte de pelo se le va a la cara, bajá este número**; si queda pelo sin teñir, subilo. Melenas y rulos suelen ir en 0.62. |

Si la cara no admite algún tinte (un rapado no tiene pelo, un pelirrojo no
debería poder ser rubio), agregala a `_tintes.exclusiones` del mismo archivo.

---

## 2 · UNA CAMISETA NUEVA

**Manifest:** `data/caras_manifest.json` → array `camisetas`

```json
{ "n": "Verde caldén", "hex": "#2E7D32" }
```

Solo eso: nombre visible y color. Aparece en el editor en el orden del array.
**Importante para daltonismo:** el nombre tiene que distinguirse por la palabra,
no por el color — "Celeste titular" y "Celeste profundo" está bien; dos "Celeste"
a secas, no.

Y de verdad es solo eso: el tope lo toma el código del propio manifest
(`index.html` le pasa el largo a `logic/avatar.js` al arrancar). Hasta agosto de
2026 no era cierto — `validarLook` tenía el número 4 clavado (3 camisetas +
Original), así que al pasar de 3 a 9 los índices 4 a 9 se plegaban con módulo y
el jugador elegía una camiseta y veía otra. Está arreglado y `phaser/test/camisetas.test.js`
lo cuida: recorre todos los índices que el editor ofrece y falla si alguno se pliega.

**Un tono muy oscuro es válido** (hay "Negro tranquera" #232323): el recolor
preserva la luminancia, así que la camiseta conserva sus luces y sombras en vez
de quedar una mancha plana, y la ficha del radar cambia el número y el borde a
tinta clara cuando el tono es oscuro, para que el número siga leyéndose.

---

## 3 · UNA POSE NUEVA (las ilustraciones grandes del cine)

**Carpeta:** `assets/poses/`
**Manifest:** `data/poses_manifest.json` → objeto `poses`

```json
"palomita": {
  "archivo": "pose_palomita.png",
  "quien": "heroe",
  "n": "Palomita al centro",
  "pelota": { "x": 0.884, "y": 0.737, "r": 0.126 },
  "tonos": { "pelo": "#0c2424", "piel": "#fccca4", "camiseta": "#54bcec" }
}
```

| Campo | Qué es |
|---|---|
| `quien` | `heroe` (celeste, se tiñe con tu pinta), `defensor` (el juego lo tiñe de naranja para el rival) o `arquero`. |
| `n` | nombre legible, para el HANDOFF y los tests. |
| `pelota` | **dónde iba la pelota en tu dibujo**, en fracción del ancho/alto (0..1) y el radio. El juego dibuja SU pelota ahí. Si tu PNG ya no tiene pelota, igual conviene declararlo para que la pelota del juego quede al pie. Si lo omitís, la pelota va a una posición por defecto. |
| `tonos` | igual que en las caras: los colores que trae el dibujo, para poder teñirlo. Sin esto la pose se ve tal cual la dibujaste (que también está bien). |

Para que una pose nueva **aparezca en una escena**, hay que asignarla: ver la
tabla de escenas del HANDOFF V9. Si querés que sea automática para una acción,
el mapeo vive en `poseParaEscena()` — eso sí es código, avisá y lo cableo.

---

## 4 · UN FONDO NUEVO

**Manifest:** `data/poses_manifest.json` → objeto `fondos`

```json
"tribuna_noche": { "archivo": "fondo_tribuna_noche.png", "n": "Tribuna de noche" }
```

Los fondos son capas lejanas (van detrás de todo, se repiten en X).

---

## 5 · SPRITES DE CORRER Y SALTAR (ciclo real) — PREPARADO, FALTA EL ARTE

El juego hoy usa **animación limitada**: una pose quieta por acción, con corte
seco (criterio del anime). Para un ciclo de verdad, el manifest ya acepta
declararlo así:

```json
"corriendo": {
  "archivo": "pose_corriendo.png",
  "quien": "heroe",
  "n": "Corriendo",
  "ciclo": { "cuadros": ["pose_corriendo_1.png", "pose_corriendo_2.png", "pose_corriendo_3.png"], "ms": 120 }
}
```

Poné los cuadros en `assets/poses/` con esos nombres. **Mientras `ciclo` no
exista, el juego usa la pose quieta y no cambia nada** — así que se puede
agregar el arte cuando esté, sin tocar código y sin romper lo que hay.
Lo mismo para un salto: `"ciclo": { "cuadros": [...], "ms": 90, "unaVez": true }`.

---

## 6 · EL RELATOR O RELATORA VISIBLE — PREPARADO, FALTA EL ARTE

Hoy el relator es una línea de texto. Para que se vea la persona, el manifest
de retratos ya tiene lugar:

**Manifest:** `data/portraits_manifest.json`

```json
{
  "relator": {
    "archivo": "relator_delfina.png",
    "n": "Delfina",
    "pos": "esquina_derecha",
    "bocas": ["relator_delfina_habla1.png", "relator_delfina_habla2.png"]
  }
}
```

`bocas` es opcional: si están, la figura alterna cuadros mientras dura la frase;
si no, se muestra quieta. Sin la entrada `relator`, todo sigue como hoy.

---

## 7 · SONIDOS

**Carpeta:** `assets/audio/` · el juego usa chiptune generado por código, así que
los archivos son opcionales. Si querés reemplazar un efecto, avisá cuál y lo
cableo: el manifest de audio todavía no existe porque no hacía falta.

---

## Lo que NO va, nunca

- Arte, sprites o sonidos sacados de otros juegos.
- Nombres, escudos o fotos de clubes profesionales o de personas reales.
- Menores identificables.

Los **pueblos** de La Pampa sí son reales (son públicos); los personajes son
todos inventados. Hay un test que lo verifica en cada cambio
(`phaser/test/seccion11.test.js`).
