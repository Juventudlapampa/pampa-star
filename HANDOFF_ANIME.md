# HANDOFF ANIME v4 — "El anime jugando: dos capas" (tanda del 13/jul/2026)

Nace de `docs/DISENO_ANIME_V4.md` (tu 2º playtest). **REEMPLAZA la política de
cámara de la v2 (§0)**: vista táctica elevada para navegar + capa cinemática
para la épica. Ejecutada en el ORDEN reordenado por impacto/costo que pediste.

## Estado por bloque

| Bloque | Estado | Commit |
|---|---|---|
| **A + G** — vista elevada + tempo 10' | ✅ COMPLETO | `c18d68c` |
| **B** — capa cinemática (prioridades 1-3) | ✅ COMPLETO | `4feef99` |
| **D** — chiptune que suena | ✅ COMPLETO | `9bcafec` |
| **E** — el relator | ✅ COMPLETO | `e5f831b` |
| **F** — tiros situacionales | ✅ COMPLETO | `8571732` |
| **C** — retratos modulares 64×64 | ✅ COMPLETO | `2d2488d` |
| B prioridades 4-5 (megacosas al gestor, festejo con hinchada) | ⏸ NO ARRANCADO (a propósito: "recién si sobra margen") | — |

**Tests:** suite completa **2248 asserts, 0 fallas** (partido +21 nuevos de tempo/
marcador auto/pelota alta; relator +23 nuevos). **Soak de integración:** partido
entero a `92'` (3-6) resolviendo todos los menús, **0 errores de consola**, 29
escenas cinemáticas disparadas.

**Revisión adversarial:** inline por bloque (no multi-agente, como pediste —
"gasta de más"), documentada en cada commit. Nada quedó en working tree.

## Flags nuevos (todos ON por defecto; apagar = comportamiento anterior exacto)
`balance.json → flags` (o por código): `v4_vista`, `v4_escenas`, `v4_musica`,
`v4_relator`, `v4_aereo`, `v4_retratos64`. Los flags viejos (e3_menus…e6_cine)
siguen vigentes. `partido_phaser` (fusión con el clásico) intacto, OFF.

## Checklist de aceptación en tu celu
Abrí **https://juventudlapampa.github.io/pampa-star/phaser/** apaisado → ¡A LA CANCHA!

- **A — Vista elevada:** ves CASI TODA la cancha de un vistazo, los 22 como fichas
  simples (celeste liso vs naranja a RAYAS, número al pausar). El portador es
  apenas más grande. **No hay radar.** El pase se toca DIRECTO sobre la cancha.
- **A — Cambio de jugador:** en defensa cambia SOLO al mejor marcador (el que está
  entre la pelota y tu arco). ESPACIO es solo ACCIÓN. Si querés cambiar a mano:
  botón chico "⇄ OTRO" (o TAB en la compu).
- **G — Tempo:** un partido entero se juega en ~10 min reales. Acciones lentas,
  reloj rápido, sin "esto no termina más". (Afinable en `balance.tempo`.)
- **B — La épica se VE:** patear, atajar (con TU arquero cuando te patean),
  gambetear e interceptar CORTAN a una viñeta a pantalla con las poses del
  jugador, siluetas de "contra cuántos pateás", silencio y desenlace. Después
  vuelve a la táctica. Ninguna acción importante se resuelve solo con texto.
- **D — Sonido:** con sonido ON, música chiptune en LOOP que cambia con la
  posesión (propia pausada / rival tensa), tictac en los últimos 5', y MEDIO
  SEGUNDO DE SILENCIO antes de cada desenlace grande (el vacío en el estómago).
  Botón 🔊 arriba a la izquierda; el mute es el MISMO del botón del clásico.
- **E — El relator:** abajo, un ticker que cuenta el partido en pampeano
  ("¡GRITALO, WINIFREDA!" con TU pueblo), sin repetir la frase, en cada momento.
- **F — Tiros situacionales:** un pase LARGO llega ALTO cerca del arco y abre
  CABEZAZO / VOLEA / CHILENA / BAJARLA. La chilena exige juego aéreo alto + 250
  guts y tiene la escena más espectacular (vuelta en el aire, doble flash). LA
  DEFINICIÓN aplica con ventana más chica.
- **C — Retratos:** en los menús y cut-ins, las caras son 64×64 modulares,
  determinísticas (mismo jugador, misma cara siempre) y CAMBIAN de expresión
  según el momento (concentrado / triunfante en el especial / dolorido si está
  rendido). Se leen por forma, no solo color.

## Pendiente para el jueves
- **B prioridades 4-5** (NO arrancadas, a propósito): 4) integrar las megacosas
  ya existentes al gestor `EscenaCine` con su versión extendida; 5) festejo de gol
  con hinchada (tribuna de siluetas saltando + goleador en pose).
- **Calibración de números** (todo en `balance.json`, sin tocar código):
  `vista.cobertura` (0.85 = cuánta cancha se ve), `tempo.duracion_real_min` (10),
  ventanas de la barra aérea (`feel.barra_zona_aerea/chilena`), stats de la chilena.
- **Decisión tuya:** el banco webp de retratos quedó como capa alternativa
  (flag `v4_retratos64` OFF lo reactiva). Hoy manda el modular. ¿Lo dejamos así?
- **Revisión multi-agente retroactiva** de la tanda (si querés la pasada completa
  cuando haya cupo de workflows): diff `64eb469..2d2488d`.

## No negociables (§11, verificado)
Sin marcas de terceros en código ni producto · sin apuestas · sin mouse
obligatorio (todo con dedo/teclado) · modelo de datos neutro en género · saves
retrocompatibles tras CADA commit (campos nuevos opcionales: `tutorialPartido`,
`vello`) · info por forma/número además de color · máx 3 sprites grandes del
mundo (las escenas son paneles de UI). 100% original: música, caras, relatos.
