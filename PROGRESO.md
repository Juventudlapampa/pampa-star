# PAMPA STAR — Progreso

## ✅ Hecho

### Base (previo)
- Motor de partido retro estilo Captain Tsubasa: cancha apaisada pixel-art con scroll horizontal, d-pad táctil (+flechas/WASD), encuentro que congela, menú tipo Pokémon, duelo por stats y Guts SIN barra de timing, mano a mano con el arquero. `VELOCIDAD_JUGADOR` como constante afinable.

### Bloque 1 — Defensa + partido completo ✅
- **Nota:** el reloj de 90' con dos tiempos NO existía (el prompt lo daba por hecho); se construyó acá porque la posesión alternada lo necesita.
- Reloj estilizado: 90' en dos tiempos, salta 5–9' por acción (`MINUTOS_POR_ACCION`). Entretiempo con recuperación de Guts (`GUTS_ENTRETIEMPO`). HUD con minuto y 1T/2T.
- **Defensa espejada:** cuando el rival tiene la pelota avanza hacia tu arco; lo cruzás → congela → menú **QUITAR / CORTAR PASE / BLOQUEAR / MARCAR**, duelo por stats + Guts. Ganás: recuperás. Perdés: sigue (te deja atrás, lo corrés de nuevo).
- Si el rival llega a tu área: **mano a mano contra tu arquero** (automático, tu arquero escala con tu Carácter). Gol rival o atajadón.
- **Posesión alterna naturalmente:** perder la pelota en ataque → contra del rival; recuperar en defensa → seguís atacando desde ahí; tras gol saca el que lo recibió; el 2T lo saca el rival.
- Etiquetas de fase con TEXTO (⚔ ATAQUE / 🛡 DEFENSA / ⏸ ENTRETIEMPO) — accesible para daltonismo, nunca solo color.
- Final de partido: veredicto GANASTE/EMPATE/PERDISTE + marcador, crónica, stats que suben por goles (+1 carácter si ganás), carrera guardada (partidos/victorias/empates/derrotas/goles) retrocompatible.
- Verificado en preview: ataque, pérdida→defensa, duelo defensivo (ganar/perder), gol rival, atajada, entretiempo, final.

### Bloque 2 — Temporada ✅
- **Fixture ida y vuelta** (18 fechas) con los 9 clubes por método del círculo: 4 partidos por fecha y **un equipo libre explícito** (número impar). Verificado: cada club juega 16 y descansa 2.
- Mi partido de cada fecha se juega con el motor real (rival según fixture, dice local/visitante). Los otros se **simulan con la misma escala de goles** (binomial ~1.5 por equipo, tope 4; promedio verificado: 3 goles/partido).
- **Tabla de posiciones** PJ G E P GF GC DG PTS ordenada por puntos/DG/GF, con mi equipo resaltado **y marcado con ►** (accesible daltonismo). **Goleadores** top 6: yo con mi nombre "(VOS)", rivales genéricos por camiseta ("El 9 de…"), sin nombres con apariencia real.
- Pantalla de temporada entre fechas: próximo rival, mi posición, equipo libre, resultados de la última fecha, botón JUGAR/SIMULAR FECHA.
- Final de temporada: **campeón**, mi posición final y mis goles. Botón NUEVA TEMPORADA (regenera fixture, conserva la carrera).
- **Guardado único retrocompatible** en `pampa_star_v1`: a un guardado viejo se le agrega `temporada` sin pisar nada (verificado con un save pre-temporada).
- Guard anti doble-aplicación del resultado (CONTINUAR + Inicio no duplican la fecha).

### Bloque 3 — Tiros especiales ✅
- **Sistema de niveles:** subís de nivel cada 3 goles de carrera (`GOLES_POR_NIVEL`). Nivel visible en la ficha de la intro; al cruzar un nivel, banner "🌟 ¡NIVEL X!" en la pantalla final con lo que desbloquea.
- **Disparo del Caldén (funcional, nivel 3):** aparece en el mano a mano; cuesta **25 Guts**, mejor chance (Tiro ×1.30 + Carácter), botón con estilo especial mostrando % y costo. **Animación dramática**: grito en pantalla, pelota disparada con estela de fuego (#ff8c3a/#f6c11d) y textos propios de gol/atajada.
- Estados del especial siempre etiquetados con TEXTO (accesible daltonismo): activo con "% · -25 GUTS", bloqueado "NIVEL 3", sin energía "GUTS 25", futuro "PRÓXIMAMENTE".
- **Definidos pero bloqueados (desbloqueos futuros):**
  - 🌊 **TIRO ATUEL** (nivel 5, 30 Guts, ×1.45): rasante y serpenteante como el río, entra pegado al pasto.
  - 🌪️ **TORNADO PAMPEANO** (nivel 7, 40 Guts, ×1.60): chilena con el viento del oeste, casi imposible de atajar.

### Revisión adversarial post-bloques ✅
3 agentes revisores (máquina de estados / datos-guardado / UI móvil) sobre el archivo final: 14 hallazgos → 8 problemas únicos, **todos arreglados y verificados**:
1. El teclado global se tragaba a/s/d/w y flechas al escribir el nombre (alta).
2. Tu sprite se distinguía de los rivales solo por color de camiseta → ahora tiene **flechita ▼ blanca con borde** (forma, apto daltonismo) (alta).
3. Recargar en la pantalla final permitía rejugar la fecha inflando la carrera → la fecha se consume en el mismo guardado del final.
4. Cambiar de club a mitad de temporada corrompía la temporada → ahora avisa y arranca temporada nueva.
5. D-pad con mouse quedaba trabado si el combate tapaba el botón → pointer capture + direcciones apagadas al congelar.
6. El ¡GOLAZO! del tiro especial se borraba por una carrera de timeouts en flash().
7. El nombre del jugador se inyectaba como HTML en goleadores → escapado.
8. Guardados viejos con stats incompletas daban NaN% → merge con defaults + validación del JSON.

## ⏹ FRENADO ACÁ (a pedido de Rodri)

### Lo que sigue — NO arrancar sin Rodri
- **Capa 3 (vida, amigos, planteles reales)** — ver DISENO_PAMPA_STAR_ADDENDUM.md. Necesita definiciones suyas.
- Escalera de ascensos (Primera A → Regional → AFA → Primera → Europa → Selección).

### Para afinar jugándolo
- Balance: chances de los duelos, costo de Guts, fuerza del arquero propio (`myKeeperSkill`), escala de goles simulados (`simGoals`).
- Constantes a mano arriba del script: `VELOCIDAD_JUGADOR`, `VELOCIDAD_RIVAL`, `MINUTOS_POR_ACCION`, `GUTS_ENTRETIEMPO`, `GOLES_POR_NIVEL`.
