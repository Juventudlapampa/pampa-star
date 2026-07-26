# HANDOFF V9 — "que se vea todo" (26/jul)

Tanda del playtest de Rodri sobre `e757af5`: **cobertura parcial de animaciones**.
Diez puntos, diez commits verificados en vivo. Base: `adc3504` → `3a2bb16`.

En vivo: https://juventudlapampa.github.io/pampa-star/phaser/

---

## 1 · LA TABLA DE COBERTURA (§1)

Regla dura de esta tanda: **ninguna acción se resuelve solo con texto o solo con el mapa**.
Ojo con el dato que explica medio playtest: en pantalla partida `mundoLayer` **está apagado**,
así que todo lo que se "veía en el mapa" (incluido `avisar()`) no se ve. El único canal que
sobrevive es el panel de arriba y el ticker.

| Acción | Antes | Ahora | Dónde |
|---|---|---|---|
| pase normal | PARCIAL (viñeta solo sin cortador) | **SÍ** — se acomoda, le pega, la pelota viaja | `escenas_v9.js` `escenaPase` |
| pase al vacío | PARCIAL | **SÍ** (el receptor pica en el plano) | idem |
| pase interceptado | SÍ | **SÍ** (mismo plano, desenlace distinto) | idem |
| pase ganado CON cortador | **NO** (cartel de texto) | **SÍ** — freeze + silencio + "le pasó por al lado" | idem |
| gambeta ganada | PARCIAL (se perdía con megacosa rival) | **SÍ** siempre (cut-in → viñeta) | `match.js` `resolverAccionAtaque` |
| gambeta perdida | SÍ | SÍ | idem |
| uno-dos / pared | **NO** (solo texto) | **SÍ** — viñeta propia, pose `pared` | idem |
| quite ganado | SÍ (mudo) | SÍ + relato `quite_win` | `resolverAccionDefensa` |
| quite perdido | SÍ | SÍ | idem |
| corte de pase ganado | SÍ (mudo) | SÍ + relato | idem |
| corte fallado | **NO** | **SÍ** — "¡TE LA PEINÓ!" | idem |
| bloqueo logrado | SÍ (mudo) | SÍ + relato | idem |
| **bloqueo fallido** | **NO — no se veía NADA** | **SÍ** — "¡SE TE FUE! / te tiraste al bloqueo y te la sacó del pie" | idem |
| tiro normal | SÍ | SÍ (+ fiesta de gol completa) | `tiroPorComandos` |
| tiro tapado en el cruce | PARCIAL (texto salvo megacosa) | PARCIAL — **pendiente**, ver §"lo que queda" | `resolverTiro` |
| **súper tiro / megatiro** | grilla + barra | **SÍ** — la mega animación entera | `dispararConCine` |
| cabezazo / volea / chilena | SÍ (con barra) | SÍ (sin barra, penal por dificultad) | `resolverTiroAereo` |
| atajada de tu arquero | SÍ | SÍ (ahora con 3 decisiones, sin barra ni grilla) | `definicion_ui.js` |
| atajada con rebote | NO | **pendiente** (la lógica ya devuelve `retiene`) | — |
| gol propio | SÍ (sin fiesta en el cine) | **SÍ, igual por los 5 caminos** (`golPropio()`) | `escenas_v9.js` |
| gol en contra | SÍ | SÍ + la hinchada se hunde | idem |
| entretiempo | PARCIAL (banner) | **SÍ** + cambio de lado anunciado | `transicionEntretiempo` |
| final | PARCIAL (menú) | **pendiente** — sigue sin festejo | `finDelPartido` |
| saque inicial | relato 1 vez por partido | relato tras cada gol (`saque_gol`) y en el 2T (`arranca_2t`) | `golPropio` / evento |
| trap / control | no existe como acción | **no existe** (decisión: sigue sin existir) | — |
| despeje de jugador | no existe | **no existe** | — |
| lateral · córner · saque de arco | no existen en la sim | **no existen** | — |
| autogol | no existe | **no existe** (decisión: descartado) | — |

---

## 2 · CHECKLIST PARA EL CELU (probalo en este orden)

- [ ] **Pasá la pelota con alguien en la línea.** Tiene que verse el rival tirándose, medio
      segundo de silencio y recién ahí si pasó o la cortó. Abajo, por qué: *"estaba parado en
      la línea de pase"*.
- [ ] **Andá al bloqueo y perdé.** Antes no pasaba nada: ahora "¡SE TE FUE!" con el rival
      quebrando, y la razón ("venías cansado" / "te leyeron la jugada").
- [ ] **Rematá normal.** No tiene que aparecer ninguna barra que se llene. Ni una.
- [ ] **Tirá un Caldén / súper tiro.** Cut-in → la carga y el impacto → la pelota viajando →
      el arquero volando → freeze → gol. Cero grillas.
- [ ] **Dejá que te rematen.** Tres botones (ME TIRO / SALGO A ACHICAR / AGUANTO), elegís uno,
      los otros desaparecen y se resuelve. No hay barra de carga corriendo.
- [ ] **Súper tiro del jugadón.** Tres decisiones (AL PALO / AL MEDIO / AL ÁNGULO), no seis
      zonas numeradas.
- [ ] **Escuchá el relator.** Tiene que hablar en el saque, en las jugadas de peligro, en los
      duelos, en el gol, en el entretiempo y al final. La franja está arriba del mapa (y=300),
      ya no encima de las fichas de abajo.
- [ ] **Mirá la tribuna.** Se mueve siempre, se agita cuando la pelota entra al área y explota
      en el gol propio.
- [ ] **Llegá al entretiempo.** Cartel "⇄ CAMBIO DE LADO" y en el 2T tu arco es el otro: el
      radar lo dice con texto ("TU ARCO ►"), no solo por color.

---

## 3 · LO QUE SE HIZO, COMMIT POR COMMIT

| Commit | Qué |
|---|---|
| `c880bc4` | §2 el pase se ve (escena nueva + `riesgoLinea` + motivo del corte) |
| `3023dcc` | §3 bloqueo fallido · §7 el porqué · §8 el relator · §9 la hinchada |
| `8c36839` | §4 mueren las barras · §5 la mega animación · §6 la defensa con 3 decisiones |
| `3a2bb16` | §10 cambio de lado (espejo de render) |

**Archivos nuevos**: `phaser/scenes/escenas_v9.js`, `phaser/test/porque.test.js`.
**Perillas nuevas en `balance.json`**: `escena_pase`, `vista.hinchada`, `relator`.
**Suite**: 17 archivos verdes (~5.500 asserts). Nuevos: `porque` (857), `relator` (40, con el
chequeo de claves), `partido` (93, con el cambio de lado).

### Lo que se borró (y por qué)
- `abrirTiming` / `dibujarTiming` / `pararAguja` y el estado `TIMING`: era un QTE de reflejos.
- La segunda aguja copiada dentro de la Definición y la barra de carga del rival (4,2 s).
- La grilla de 6 zonas, en los **dos** lados (ofensivo y defensivo) y en el jugadón.
- Los botones `PLANTARSE` / `LÍNEA` / `QUIETO`: el primero era gratis, el segundo era el
  default (un botón para no hacer nada) y el tercero daba +30 de aguante por toque, sin tope.

---

## 4 · LO QUE QUEDA (con severidad)

1. **[media] Tiro tapado en el cruce** — sigue resolviéndose con cartel salvo que el rival
   traiga megacosa. Se arregla con el mismo molde del bloqueo fallido, pose `bloqueo` +
   `poseRivalNaranja`; la Definición ya muestra cómo se escribe (`definicion_ui.js:493`).
2. **[media] Final del partido** — es una pantalla de menú. Merece el mismo trato que el gol:
   pose `festejo` + tribuna + burst si ganaste, cabizbajo si perdiste.
3. **[media] Atajada con rebote** — la lógica ya devuelve `retiene`, pero la revelación no lo
   lee: atajar-y-retener se ve igual que atajar-y-que-rebote.
4. **[baja] El % que promete el menú no es el que se usa** — a `duelChance` del menú le faltan
   el aguante, el envión y la matriz; puede errar hasta ~30 puntos. Ahora que el duelo devuelve
   `aporte`, se arregla exponiendo un `chanceMostrable`.
5. **[baja] El modificador `duelo` del evento de la semana** entra en un solo lugar
   (`shotPower` del tiro por comandos), no en los duelos. O se cablea o se le cambia el nombre.
6. **[baja] Lateral, córner y saque de arco** — no existen en la sim (todo está clampeado y la
   pelota va siempre pegada al portador). Si se quieren, el camino barato es hacerlos
   *situaciones invocadas* al estilo de LA DEFINICIÓN, no física real.
7. **[baja] 32 frases muertas en `relatos.json`** (`narrador_inicio`, `relatores`, `escenas`):
   nadie las lee. O se enchufan al opening y al Master, o se marcan como muertas.

---

## 5 · SECCIÓN 11 (la de siempre)

`phaser/test/seccion11.test.js` sigue barriendo los 38 archivos de producto: marcas de
terceros, "GUTS" como texto visible, apuestas/dinero, clubes profesionales reales y apellidos
en el roster. Verde en esta tanda. **El test es el guardián: si vuelve a colarse, falla la
suite antes de llegar al repo.**
