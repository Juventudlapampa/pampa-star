# `phaser/` — motor Phaser 3 (migración en curso)

El HTML clásico (`../index.html`) **validó el diseño** y sigue jugable como referencia viva. Acá, **al lado**, se construye el motor nuevo en **Phaser 3**, donde vive la ÉPICA (animaciones, cortes de cámara, el remate que emociona). Destino final posible: Godot — por eso la arquitectura de abajo.

## Estado: HITO 1 — la rebanada épica
Solo la **secuencia de remate al arco** con toda la épica (corrida → patada → pelota que vuela con curva y estela → arquero que se estira → GOL con la red sacudiéndose / ATAJADA con rebote / AFUERA), cámara con zoom + shake + flash + slow-motion, y SFX original por beat. Apuntás **tocando el arco**; toggle **ARQUERO NORMAL/FIGURA** para ver goles y atajadas a gusto; botón **REPETIR**.

**Abrilo:** `phaser/index.html` (con el server: `http://localhost:8123/phaser/`). El HTML clásico sigue en `../index.html`.

## Arquitectura (obligatoria — pensada para portar a Godot)
Tres capas separadas; el día del porteo, **data y lógica se copian, solo se reescribe el render**.

| Capa | Dónde | Qué |
|---|---|---|
| **DATA** | `data/*.json` | Todo el contenido y balance FUERA del código: `balance.json` (velocidades, duelo, zonas de tiro, tiempos de épica). Se suma a `../data/` (roster, relatos). |
| **LÓGICA** | `logic/*.js` | Módulos PUROS, sin Phaser ni DOM (UMD: corren en node y en el browser). `duel.js` = resolución del remate. Testeable solo. |
| **RENDER** | `scenes/*.js`, `audio/*.js` | Todo lo Phaser/WebAudio: `shot.js` (la escena), `sprites.js` (genera sprites originales por código), `sfx.js` (audio original). |

## El bug del arquero, cerrado con test
Feedback del playtest: *"el arquero atajó y marcó gol igual"* — la animación y el resultado estaban desacoplados. **Fix de raíz:** `logic/duel.js` `resolveShot()` decide **una sola vez** y expone `outcome` + `keeperWins` con el invariante duro **`keeperWins ⇔ outcome≠'gol'`**. La animación (`shot.js`) es **esclava** de ese resultado: nunca lo cambia. Cubierto por `test/duel.test.js`:

```
node phaser/test/duel.test.js     # 2010 asserts, verde
```

## Calibración (fix del playtest)
En `balance.json → velocidad`: el avance es **lento y con esfuerzo**, el `defensor_cerrando` es más rápido que el `portador_con_pelota` (te alcanzan), y perseguir **cuesta Guts y no es infinito** (`persecucion.guts_por_segundo` + `guts_minimo_para_correr`). El movimiento libre es HITO 2, pero las constantes ya están bien nombradas y coherentes.

## Sin terceros
Sprites generados por código, SFX sintetizados en vivo, Phaser es MIT (vendorizado en `vendor/`). **Nada de assets, sprites, música, código ni nombres de Tecmo/Captain Tsubasa** — solo se emula la forma de jugar. Daltonismo: el arquero se distingue por **forma** (brazos + guantes), no solo color; el jugador lleva flecha **▼ VOS**.

## Hitos siguientes (no arrancan sin playtest del anterior)
2. Partido jugable (dos capas, movimiento calibrado, encuentro + menú, duelos, cambio, reloj). · 3. Animaciones completas. · 4. Carrera (temporada/vida/avatar). · 5. Presentación + audio. · 6. Escalera + Mundial. Ver `../PAMPA_STAR_MIGRACION_PHASER.md`.
