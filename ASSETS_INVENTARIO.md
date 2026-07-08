# PAMPA STAR — Inventario de assets (`assets_drive/`)

Material que Rodri juntó para el juego (ilustraciones IA, sonidos, roster, diálogos, docs).
Clasificado en **(a) usable ya · (b) usable más adelante · (c) descartar / no es del juego**.
Regla dura: **nada de Tecmo/Captain Tsubasa** entra al juego (marcado ⛔ abajo).

> Nota: el paquete llegó como export de Google Drive. Varias carpetas son **el mismo material repetido** en distintos empaquetados (`PAMPA_STAR_TODO_FINAL`, `PAMPA_STAR_TODO_SEPARADO`, `PAMPA_STAR_Assets`). Se toma **`PAMPA_STAR_TODO_FINAL`** como fuente curada de imágenes originales y **`PAMPA_STAR_FONDOS_VARIANTES` / `PAMPA_STAR_PERSONAJES_TANDA2`** como las tandas nuevas.

---

## ⛔ PROHIBIDO — material de Tecmo/Captain Tsubasa (NO se usa, se marca y se ignora)
Está en la carpeta pero **no toca el juego** ni se commitea a `assets/`:
- `CaptainTsubasa2-HyperEdition/Captain Tsubasa 2 - Hyper Edition.ips` — parche de ROM de un juego de Tecmo. **NO USAR.**
- `CaptainTsubasa2-HyperEdition/CaptainTsubasa2-HyperEdition.txt` — readme del parche. **NO USAR.**
- *(en el paquete original de Drive también venían `Captain Tsubasa Vol. II ... .nes` (ROM) y `Diseño de Juego_ Tsubasa y New Star.pdf` — la ROM es material de terceros: **descartar**; el PDF es una investigación de referencia, no un asset).*

**Motivo:** son assets/ROM de un juego comercial ajeno. Se usan solo como referencia mental de mecánica (ya destilada en `INVESTIGACION_MOTOR_TSUBASA.md`); ni un byte de ellos entra en Pampa Star.

---

## (a) USABLE YA — integrado en este pase

### Ilustraciones para PANTALLAS (no para la cancha)
Fuente: `PAMPA_STAR_TODO_FINAL/01_Assets_Originales/` (retro-anime originales, 1440×810 / 1280×1280).
El pixel-art del PARTIDO **no se toca**; estas van en título, intro, menús y momentos épicos.

| Archivo original | Uso en el juego | Optimizado a |
|---|---|---|
| `originales/portada.jpg` (1440×810, 1.6MB) | Fondo de la pantalla de TÍTULO | `assets/ui/portada.webp` |
| `png_transparent/logo_pampa_star.png` (1280², 1.4MB) | Logo sobre el título | `assets/ui/logo.webp` |
| `originales/heroe.jpg` (810×1440, 1.8MB) | Ilustración del héroe (intro/creación) | `assets/ui/heroe.webp` |
| `originales/relatores.jpg` (1440×810, 1.6MB) | Fondo/arte de "elegí tu relato" | `assets/ui/relatores.webp` |
| `FONDOS_VARIANTES/fondo6_menu_mate` (1440×810) | Fondo de menús (semana/temporada) | `assets/ui/fondo_menu.webp` |
| `FONDOS_VARIANTES/fondo7_pueblo_poster` (1440×810) | Fondo "chill en el pueblo" | `assets/ui/fondo_pueblo.webp` |

Descartadas por redundancia o menor calidad para el uso: el resto de `fondoN_*` (quedan en **(b)** como pool de variantes), `escudos.jpg`/`retratos.jpg`/`cancha.jpg` (planillas de contactos, sirven de referencia de arte, no de asset directo).

### Diálogos / lore (texto)
Fuente: `PAMPA_DIALOGOS_CONVERSACIONES/*.txt` — **relatores y escenas ORIGINALES** (Pichi el Bagual, El Profe, Delfina Roldán; declarados inventados, nunca personas reales).
- Integrados como **data separada** en `data/relatos.json` (para "elegí tu relato" y el narrador del menú) y citados en `DISENO_PRESENTACION.md`.
- 8 archivos: narrador de inicio, relato de gol (Pichi), análisis (El Profe), previa (Delfina), charla de vestuario, amigos en el bar, prensa post-partido, chill en el pueblo. Todos limpios: sin menores, sin marcas, género-neutro salvo detalles menores.

### Roster
`PAMPA_STAR_ROSTER_50.csv` → convertido a `data/roster_pampeano.json` (ver tarea 2). **Data limpia, sin personas reales ni menores.**

---

## (b) USABLE MÁS ADELANTE — queda en `assets_drive/`, no se integra aún

- **Fondos variantes restantes** (`FONDOS_VARIANTES/fondo1..5,8,9,10`): atardecer anime, noche pixel, lluvia watercolor, invierno oil, vestuario flat, tribuna ink, entrenamiento 3D, estrellas minimal. Pool de estilos para cuando se defina la piel visual de cada pantalla. Son 1440×810 pesados: se optimizan cuando se elijan.
- **Personajes TANDA2** (`PERSONAJES_TANDA2/*.webp`, 10 ilustraciones 1280×1920+): héroe watercolor, DT (flat/retrato), delantero pateando, mediocampista, utilero, rival, defensor Santa Rosa. Para retratos de personajes/DT/rival en la presentación y cut-ins de pantalla (NO en la cancha). Muy pesadas (hasta 1.2MB): optimizar al integrarlas.
- **PNG transparentes de avatar/escudo** (`01_Assets_Originales/png_transparent/avatar_1..6`, `escudo_1..6`): 6 avatares y 6 escudos recortados. Candidatos para el editor de avatar de la presentación (Prompt 2) — se integran cuando se construya esa pantalla.
- **Pixel-art NES** (`02_Pixel_Art/pampa_{heroe,logo,portada}_pixel_*.jpg`): versiones 8-bit. Referencia de estilo; el pixel-art del juego se genera por código (PSART), así que quedan como comparación, no como asset directo.
- **`ficha_cartucho.png`**: mockup de cartucho retro. Lindo para un "acerca de" o splash; no urgente.

---

## (c) DESCARTAR — no es del juego (ruido del export de Drive)
- `La_Pampa_si_Nacion_no.docx`, `Jovenes_14-30_Censo2022_LIMPIO.xlsx`, `ENCUESTA JOVEN ... .xlsx` — documentos de trabajo de la Subsecretaría, nada que ver con el juego.
- `ai_studio_code.sh` (34 bytes) — basura.
- `pampa_*.tar.gz`, `PAMPA_STAR_TODO_*.zip` internos — re-empaquetados del mismo material (redundantes).
- Docs `.md` repetidos (`_1`, `(1)`) — ya versionados en el repo; no se re-commitean.

---

## SONIDOS — PROPUESTA (no se pisa el chiptune actual sin OK de Rodri)
Fuente: `PAMPA_STAR_SONIDOS_VARIANTES/*.wav` (12) + `TODO_SEPARADO/sonido/*.wav` (4, subconjunto).
Todos **44100 Hz · mono · 16-bit**, cortos. **El audio actual del juego (PSAUDIO, chiptune procedural por WebAudio) NO se toca en este pase** — esto queda como opción A/B para que Rodri decida.

| WAV | Dur | Evento del juego | ¿Supera al chiptune actual? |
|---|---|---|---|
| `01_menu_navigate` | 0.1s | `SFX("menu")` navegar | Parejo. El chiptune ya cubre bien. |
| `02_menu_select` | 0.2s | confirmar opción | Parejo. |
| `03/04_dialogo_blip` | 0.1s | texto tipeándose (presentación) | **Suma** — hoy no hay blip de diálogo. Candidato para Prompt 2. |
| `05_tiro_normal` | 0.2s | `SFX("kick")` | Parejo. |
| `06_tiro_especial_carga` | 1.0s | carga del megatiro | **Puede sumar** — un "carga" sampleado da épica al cut-in del especial. A evaluar. |
| `07_gol_fanfarria` | 0.6s | `SFX("goal")` | **A evaluar** — comparar contra el stinger de gol actual. |
| `08_atajada` | 0.2s | `SFX("save")` | Parejo. |
| `09_musica_posesion_loop` | 4.0s | música posesión | Loop corto (4s). El chiptune actual es más largo/variado. |
| `10_musica_rival_loop` | 4.0s | música amenaza rival | Loop corto. |
| `11_musica_ultimos_minutos_loop` | 2.4s | últimos 10' | Loop muy corto (2.4s), se notaría la repetición. |
| `12_chill_pueblo_loop` | 4.0s | semana / pueblo | **Suma** — hoy la semana no tiene música propia. Candidato. |

**Recomendación:** integrar como **capa opcional** los que hoy NO existen (blips de diálogo, música de "chill/pueblo", quizá el "carga" del especial), dejando el chiptune del partido como está. Los loops de 2.4–4s son muy cortos para música de fondo sin que canse; convendría loops más largos o encadenarlos. **Espera OK de Rodri antes de cablear cualquiera.**

---

_Este inventario se actualiza si aparecen más tandas. La regla de arquitectura (data separada del código, portable a Godot) rige toda ingesta: roster y relatos van a `data/*.json`, no enterrados en `index.html`._
