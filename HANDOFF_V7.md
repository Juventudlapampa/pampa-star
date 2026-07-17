# HANDOFF V7 — "El juego entero" (tanda del 17/jul/2026, noche)

> **Nota de procedencia:** `docs/DISENO_V7_EL_JUEGO_ENTERO.md` NO llegó a la
> carpeta (mensajes cruzados, como el V7-1). La tanda se ejecutó sobre el
> índice de tu mensaje (§0 playtest → §1 deudas → §2 Master con carrera →
> §3 mudanza con gate → §4 adversarial → §5 PWA) + el GDD + lo ya construido.
> Si el doc aparece, se reconcilia contra esto. Las decisiones que tomé sin
> doc están marcadas **[DECISIÓN MÍA]** y esperan tu visto.

## §0 — Los 3 fixes de tu playtest (PRIMERO, hechos)

### §0.1 Las pelotas ilustradas MURIERON (`f83cf62`)
La pelota la dibuja SIEMPRE el juego. Recortada de los 13 PNG que la traían
(corriendo, las 6 identidades, remate, chilena, cabezazo, gambeta_gana,
pared, arquero_ataja_v2). `poses_manifest → pelota:{x,y,r}` dice dónde iba:
las escenas dibujan ahí la pelota del juego (tamaño y flip correctos) y la
Definición la pone abrazada al arquero. Las siluetas ya no llevan pelota:
en pantalla hay UNA sola.

### §0.2 Tintes OPCIONALES (`091d7e5`)
- Primera opción de PIEL / COLOR DE PELO / CAMISETA = **"Original"** (la
  ilustración con sus colores propios). Recién después, las variantes.
- Los tintes viven en `look.tPiel/tPelo/tCam` (0 = Original). **Saves viejos
  caen a Original** — la cara se ve como la dibujaron.
- Combinaciones que rompen, declaradas en `caras_manifest` y salteadas por el
  stepper: `rapado` no tiñe pelo (pelo==piel); `colorado` excluye Rubio y
  Canoso (pelo bicolor). Cambiar a una cara que no admite tu tinte lo resetea
  a Original. Agregás exclusiones editando el manifest, sin código:
  `"tintes_pelo": false` o `"tintes_pelo_excluye": ["rubio", ...]`.
- El roster de 50 juega con la ilustración ORIGINAL (la variedad la dan las
  8 caras); el rival SIEMPRE lleva camiseta naranja (bando).

### §0.3 El TEMPO bajó — **TUS DIALES** (tocalos vos, todo en `phaser/data/balance.json`)

| Dial | Dónde | Antes | Ahora | Qué hace |
|---|---|---|---|---|
| `ritmo.saltos_vel_mult` | balance.json | 2.4 | **1.8** | Velocidad de la corrida esquemática (portador y rival). Más alto = más vértigo. |
| `vista.parallax_pasto` | balance.json | 2.4 (duro) | **1.4** | Cuánto corre el pasto del panel por px de avance. |
| `vista.parallax_pasto_y` | balance.json | 1.1 (duro) | **0.7** | Ídem en vertical. |
| `vista.parallax_tribuna` | balance.json | 0.6 (duro) | **0.35** | Cuánto corre la tribuna (capa lejana, más lenta). |
| `tempo.minutos_por_momento` / `tempo.presets.intermedio` | balance.json | 2.5 | **2.2** | Minutos de partido que consume cada jugada. Más bajo = más jugadas por partido. |
| `escena.entrada_ms` | balance.json | 420 | **500** | Entrada de las viñetas. |
| `escena.pose_ms` | balance.json | 650 | **800** | Cuánto se sostiene la pose. |
| `escena.hold_ms` | balance.json | 1150 | **1300** | El desenlace en pantalla. |

El espejo `BALANCE_FALLBACK` de `phaser/index.html` quedó igualado (solo se
usa si el fetch del JSON falla — si tocás balance.json, con eso alcanza).

## Checklist celu (§0)
1. Partido → arriba corre UNO con UNA pelota al pie; las siluetas de atrás
   van SIN pelota.
2. La corrida y el pasto se leen (si lo querés más rápido: `saltos_vel_mult`).
3. Editor → PIEL/PELO/CAMISETA arrancan en "Original" y la cara se ve como
   la dibujaron; Rapado no deja teñir pelo; Colorado saltea Rubio y Canoso.
4. Una escena de remate/chilena/cabezazo: la pelota del juego aparece donde
   iba la ilustrada (con su estela).

## §1 — Deudas técnicas (hechas)
1. **Definición fase 1**: los defensores en el camino son la pose ILUSTRADA
   del bloqueo (el rival plantado, 96px) — las siluetas de código quedaron de
   fallback. El arquero rival bajo los palos es una ficha HUMANA (su sprite
   heroico naranja), no un rectángulo.
2. **SKIP del cine de 5 planos** (megatiro): un toque adelanta directo al
   desenlace — idempotente, el gol se cuenta UNA vez (el skip muere al entrar
   al desenlace).
3. **Velocidad RÁPIDA** ahora también acorta los 5 planos (pie/viaje/esfuerzo/
   arquero y el hold del desenlace). El silencio sagrado NO se toca.
4. **Camiseta forma vs tono**: elegir el TONO de camiseta del busto ya no pisa
   la FORMA (lisa/banda/cuello) del kit de cancha.
5. El assert del tempo se actualizó (intermedio 2.2' → ~20 momentos).

## §2 — MODO MASTER: la carrera ADENTRO del Phaser (hecho)
El botón **🏆 CARRERA** (editor, arriba a la derecha) abre el Modo Master:
- **Elegís tu club**: stepper con los 10 pueblos del roster (con el apodo del
  crack local); arrancás en la PRIMERA B. Si tu save clásico tiene localidad
  de origen, arranca ahí.
- **La temporada**: fixture REAL de 18 fechas (ida y vuelta, método del
  círculo — el mismo esquema del clásico), tabla completa PJ G E P GF GC DG
  PTS con tu fila marcada ►, y la próxima fecha te dice el rival, la localía
  y su PERFIL de IA ("un equipo de toque / pura garra / de pelotazo / con una
  ESTRELLA") — sabés a qué venís.
- **JUGAR LA FECHA** → el partido de siempre (motor completo, división y
  perfil aplicados) → al final "▶ SEGUIR LA CARRERA" te devuelve con el
  resultado cargado; el resto de la fecha se simula DETERMINISTA (misma
  temporada, mismos resultados — resumible tras recargar).
- **Fin de temporada**: el CAMPEÓN sube el escalón (B → A → Regional →
  Nacional → EL MUNDIAL, dificultad FIJA de logic/master.js). Nadie
  desciende. Campeón del Mundial = LA GLORIA (y podés seguir).
- **Data**: `data/divisiones.json` (9 rivales por división: la B usa los
  MISMOS 9 clubes públicos del clásico; A ficticios de localidades pampeanas;
  Regional/Nacional ficticios de región; Mundial selecciones por país).
- **Save propio** `pampa_master_v1` — NO toca el clásico ni los avatares.
- Lógica pura en `logic/temporada.js` (+ test temporada.test.js, 142 asserts).
- **[DECISIÓN MÍA]** sin el doc: arrancás siempre en la B; el ascenso es solo
  para el campeón; nadie desciende; 10 equipos por división. Todo discutible.

## §3 — La mudanza con backup (hecho; el GATE pasó verde)
- **El gate**: soak de **8 fechas de carrera seguidas** (8 partidos enteros
  master→partido→resultado→master, tabla PJ 8, persistencia estable) con
  **0 errores de consola** — recién ahí se hizo la mudanza.
- **Backup**: antes de que la carrera Phaser escriba por PRIMERA vez, el save
  clásico entero se copia a `pampa_star_v1_backup_pre_v7` (una sola vez,
  nunca se pisa). El clásico sigue INTACTO y jugable en la raíz.
- **Importación**: si tu save clásico tiene carrera, la pantalla de elección
  ofrece "⬆ IMPORTAR TU CARRERA (nivel N → división)" — tu nivel de allá te
  ubica en el escalón que corresponde (divisionPorNivel), y tu pueblo de
  origen arranca pre-elegido en el stepper.
- **[DECISIÓN MÍA]**: la mudanza NO toca el index.html clásico (queda de
  referencia y en vivo); la "entrada nueva" es el botón 🏆 CARRERA del editor
  Phaser. El puente viejo (JUGAR FECHA del clásico → ?partido_phaser=1) sigue
  funcionando igual que antes.

## §5 — PWA (hecho): PAMPA STAR se INSTALA en el celu
- `phaser/manifest.webmanifest` + íconos propios (el sol pampeano + la pelota,
  diseño nuestro, sin marcas) + `phaser/sw.js`.
- **Offline**: el service worker precachea el juego entero (31 archivos:
  motor, escenas, lógica, data) al primer load; las poses/caras/identidades
  entran al cache la primera vez que se ven y quedan (cache-first para
  assets pesados).
- **Tus deploys LLEGAN**: código, data y html van NETWORK-FIRST — con red
  siempre baja lo último de Pages; sin red, responde el cache y el juego
  abre igual. No hay que "vaciar cache" nunca.
- El scope es `phaser/` — el clásico de la raíz ni se entera.
- **Instalar en el celu**: abrí https://juventudlapampa.github.io/pampa-star/phaser/
  en Chrome → menú ⋮ → "Agregar a pantalla principal" / "Instalar app".
  Abre a pantalla completa, apaisado, con su ícono.
- Si algún día cambiás assets pesados ya cacheados: subí `VERSION` en
  `phaser/sw.js` (una línea) y el cache viejo se barre solo.

## Decisiones que te esperan
- **[DECISIÓN MÍA] §0.3**: bajé `intermedio` a 2.2' por momento (~20 jugadas
  por tiempo). Si lo sentís largo, volvé a 2.5 en `tempo.presets`.
- **[PENDIENTE SIN DOC] roster `especiales`**: la regla del V6 §5 ("los que
  tienen especiales arrancan con stats base más bajas") sigue sin campo en
  `roster_pampeano.json` — decidir QUIÉNES tienen especiales es diseño tuyo;
  lo cableo en cuanto lo definas (o llegue el doc del V7).
- El doc del V7 no llegó — lo que sigue (§2-§5) va sobre tu índice + el GDD.
