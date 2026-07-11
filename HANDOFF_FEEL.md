# HANDOFF FEEL — "El alma Tsubasa" (tanda del 11/jul/2026, noche 2)

**LOS 8 BLOQUES ESTÁN COMPLETOS**, ejecutados en el orden del documento (1, 2, 3, 5, 4, 6, 7, 8),
un commit por bloque, tests verdes en cada uno (suite final: **2.207 asserts, 0 fallas**) y
verificación en vivo por bloque. **Nada quedó bloqueado ni parcial; nada quedó solo en working tree.**

⚠ **Nota honesta sobre las revisiones**: el workflow adversarial multi-agente murió por límite
de sesión en el primer intento (Feel 1) — resetea a las 19:00. Los 8 bloques llevaron
**auto-revisión inline** contra los mismos focos (documentada en cada commit), el fallback ya
usado dos veces en este proyecto. Si querés la pasada multi-agente completa sobre la tanda
entera, pedila después de las 19:00: es un workflow sobre el diff `0861f54..24d7a24`.

## Commits de la tanda, en orden

1. `0861f54` docs: especificación Feel v3 a `/docs`
2. `5636672` **Feel 1**: ritmo — todo baja un cambio y los cruces se anuncian
3. `640701b` **Feel 2**: saque y posiciones reales
4. `312cbec` **Feel 3**: controles que se explican solos
5. `ae8497d` **Feel 5**: LA DEFINICIÓN reintegrada — timing + MEGATIRO con cine
6. `ae2e8ab` **Feel 4**: la tensión del pase
7. `02414eb` **Feel 6**: megacosas defensivas
8. `cae1b7d` **Feel 7**: la épica de la corrida
9. `24d7a24` **Feel 8**: el sonido de la épica

**Parámetros**: TODO el timing del drama vive en `balance.json → feel` (beat, resolución mínima,
silencio, ventanas de la barra, momento caliente) y el ritmo en `→ ritmo`. Los especiales en
`data/megacosas.json` (nombres, gritos, costos, niveles). Nada hardcodeado en escenas.

## Checklist de aceptación en tu celu (por bloque)

Abrí **https://juventudlapampa.github.io/pampa-star/phaser/** apaisado → ¡A LA CANCHA!

**B1 — Ritmo**: el partido se siente "por turnos disfrazado de fútbol": corrés LENTO y con margen,
NINGÚN menú aparece de golpe — antes hay un beat de ~0,75s (zoom leve + sonido que sube + el rival
ENTRANDO al plano corriendo), y ninguna resolución te devuelve el control antes de 1,6s. El reloj
igual cierra: el partido dura más o menos lo mismo que antes en minutos reales.
**B2 — Saque**: al entrar se ve el saque desde el CÍRCULO CENTRAL, cada equipo en su mitad (ningún
delantero arranca en campo rival); tras cada gol, el ritual se repite con el otro equipo sacando.
**B3 — Controles**: la PRIMERA vez, un tutorial de 3 pasos (mover / ⚡ACCIÓN / pase en el radar)
que no vuelve a aparecer. El botón ⚡ACCIÓN (grande, 68px) PULSA suave cuando tenés la pelota.
En compu, "ESPACIO = ACCIÓN" aparece hasta el primer uso.
**B5 — La definición**: al elegir TIRO aparece LA BARRA: frenás la aguja (tocando o con
ESPACIO/ENTER) en la zona marcada "▲ JUSTO ACÁ" — el timing modula potencia y colocación (y tus
stats el margen de error). El MEGATIRO (🔥 centro de la cruz, cerca del arco con guts) es un
EVENTO de 5-8s: cut-in con tu retrato + carga de guts visible → barra con ventana más chica →
CINE DE 5 PLANOS (el pie, el viaje de la pelota hacia adentro, tu cara en el esfuerzo, el arquero,
el desenlace con silencio previo). Los megatiros tienen nombre propio (Caldén nivel 1; Atuel y
Tornado esperan tu progresión de carrera).
**B4 — El pase**: un pase con un rival en la línea genera el "¿llega o no llega?": la cámara
acompaña la pelota, el rival SE LANZA al corte, medio segundo de suspenso… y recién ahí se sabe.
El pase al vacío muestra la TRAYECTORIA PUNTEADA. Los pases seguros fluyen sin fricción (~0,7s).
**B6 — Megacosas defensivas**: cerca del arco rival, a veces el beat SE ALARGA, suena más grave y
aparece "⚠ ¡ALGO GRANDE SE VIENE!" — el rival tiene preparada una megacosa (Quite Pampero /
Bloqueo Médano): si te la hace, cut-in con SU retrato; si le ganás igual, "momento para el
recuerdo". Las tuyas (incluida La Tranquera del arquero) aparecen en el centro de la cruz cuando
tu carrera las desbloquea (nivel 2-3) y tenés los guts.
**B7 — La corrida**: mirá a tu jugador llevar la pelota: ciclo de correr de 6 frames, la pelota
PICANDO al pie, y cuando corrés a fondo (>0,6s) aparecen las ráfagas horizontales de anime.
El criterio sos vos: ¿héroe de anime o muñeco perdido?
**B8 — El sonido**: jugá con y sin sonido. Con sonido: el tema del avance CRECE al cruzar al campo
rival, cada cruce tiene su riser, el tiro tiene MEDIO SEGUNDO DE SILENCIO antes de revelarse (el
vacío en el estómago), el gol explota la hinchada y el gol en contra baja las notas.

## Deudas y notas

- **Revisión multi-agente de la tanda**: pendiente de cupo (post-19:00), pedila si la querés.
- El tutorial (B3) usa el campo nuevo `tutorialPartido` en el save (retrocompatible).
- La velocidad -35% + reloj 16 s/min es la primera calibración: si en el celu se siente lento de
  más o el reloj corre raro, todo vive en `balance.ritmo` (una edición, sin tocar código).
- Los saves siguen retrocompatibles tras CADA commit; la fusión `partido_phaser` de la tanda
  anterior no se tocó y sigue OFF por defecto.
- Sección 11 vigente verificada: sin marcas de terceros en código ni producto, textos en voseo y
  género neutro, forma/número además de color en todo lo nuevo (zona de la barra con etiqueta,
  aviso de megacosa con texto, trayectoria punteada), sin mouse obligatorio, máx 3 sprites grandes
  del mundo (cut-ins y cine son paneles de UI).
