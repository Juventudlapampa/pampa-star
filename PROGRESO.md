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

## 🔜 Sigue

### Bloque 3 — Tiros especiales
- Desbloqueo por nivel. Disparo del Caldén funcional (mucho Guts, mejor chance, animación dramática). 1–2 especiales más definidos pero bloqueados.

### DESPUÉS (no arrancar sin Rodri)
- Capa 3 (vida, amigos, planteles reales) — ver DISENO_PAMPA_STAR_ADDENDUM.md.
