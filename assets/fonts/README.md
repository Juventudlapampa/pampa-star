# Tipografías de PAMPA STAR (V7 §0.3)

Sistema de DOS fuentes, self-hosteadas en el repo (nada de CDN — la PWA
anda offline). Familias y uso configurables en `phaser/data/balance.json → tipografia`.

| Rol | Fuente | Archivo | Uso |
|---|---|---|---|
| **DISPLAY** | Press Start 2P | `PressStart2P-Regular.ttf` | Títulos, botones, nombres en duelos, "TOCÁ PARA EMPEZAR", marcador |
| **TEXTO** | Pixelify Sans | `PixelifySans-Regular.ttf` | Relator, descripciones, tabla, cuerpo (pixel redondeada con peso — V8 §5) |
| reserva | VT323 | `VT323-Regular.ttf` | Alternativa de cuerpo (cambiable en balance → tipografia) |

**Acentos verificados EN PANTALLA (V8 §5):** á é í ó ú ñ ¿ ¡ renderizados y
comparados por bitmap en las tres fuentes — todas los dibujan bien. El fix
real de los "acentos rotos" era de carga: el juego ahora espera las fuentes
hasta 8s y re-rasteriza los textos vivos si llegan tarde.

## Licencias

Ambas bajo **SIL Open Font License 1.1** (OFL) — libres para usar,
redistribuir y embeber, incluso comercialmente. Texto completo:
https://openfontlicense.org

- **Press Start 2P** — Copyright 2012 The Press Start 2P Project Authors
  (cody@zone38.net), Reserved Font Name "Press Start 2P".
  Fuente: https://github.com/google/fonts/tree/main/ofl/pressstart2p
- **Pixelify Sans** — Copyright 2021 The Pixelify Sans Project Authors
  (https://github.com/eifetx/Pixelify-Sans).
  Fuente: https://github.com/google/fonts/tree/main/ofl/pixelifysans
- **VT323** — Copyright 2011 The VT323 Project Authors
  (peter.hull@oikoi.com).
  Fuente: https://github.com/google/fonts/tree/main/ofl/vt323

Los TTF se descargaron sin modificar del repositorio oficial de Google Fonts
(directorio `ofl/`). Si se reemplaza alguna fuente, mantener este README al
día con la licencia de la nueva.
