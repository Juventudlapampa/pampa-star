# ⚽ PAMPA STAR

Juego de **carrera futbolística pampeana** por comandos. Un pibe que arranca en la **Primera B de la Liga Cultural de Fútbol de La Pampa** y sueña con llegar al Mundial. Cruza el motor por comandos de *Captain Tsubasa* con la capa de vida y progresión de *New Star Soccer*.

> Título provisorio · proyecto de la Subsecretaría de Juventudes de La Pampa.

## Jugar

- **Online:** se publica solo con GitHub Pages (link en la solapa *Settings → Pages*).
- **Local:** abrí `index.html` con doble clic. Es un único archivo autónomo (HTML + CSS + JS). Solo usa internet para las tipografías de Google.
- **Con servidor (para desarrollar):** `node server.js` y abrí `http://localhost:8123`.

## Estado: temporada completa jugable (estilo Captain Tsubasa)

**Partido completo** en cancha pixel-art apaisada con scroll horizontal (usable con el celu en vertical: campo arriba, controles abajo):

- **Reloj estilizado de 90'** en dos tiempos, con entretiempo que recupera Guts. Un partido dura pocos minutos reales.
- **Ataque:** movés tu sprite con el d-pad (o flechas/WASD) hacia el arco rival; un defensor te cruza → la acción **se congela** → menú tipo Pokémon (**Gambeta / Pase / Pared / Tiro**) con chance % → duelo de stats + Guts, **sin barra de timing**. En el área, mano a mano con el arquero.
- **Defensa:** el rival avanza hacia tu arco; lo cruzás → menú (**Quitar / Cortar pase / Bloquear / Marcar**) → duelo. Ganás: recuperás. Perdés: sigue, y define contra tu arquero.
- **La posesión alterna naturalmente** (pérdida → contra; recupero → seguís atacando; tras gol saca el otro).
- **Temporada de Primera B:** fixture ida y vuelta (18 fechas, equipo libre por fecha), tu partido con el motor real y el resto simulado con la misma escala de goles, **tabla de posiciones** (PJ G E P GF GC DG PTS) con tu equipo marcado, **goleadores**, campeón y resumen final.
- **Niveles y tiros especiales:** subís de nivel cada 3 goles. 🔥 **Disparo del Caldén** (nivel 3) funcional: 25 Guts, mejor chance, animación con estela de fuego. 🌊 *Tiro Atuel* (nivel 5) y 🌪️ *Tornado Pampeano* (nivel 7) definidos, próximamente.
- **Guardado único retrocompatible** en `localStorage` (carrera + temporada). Sprites originales por código, sin assets de terceros.
- Afinado rápido con constantes arriba del script: `VELOCIDAD_JUGADOR`, `MINUTOS_POR_ACCION`, `GUTS_ENTRETIEMPO`, `GOLES_POR_NIVEL`.

Ver [PROGRESO.md](PROGRESO.md) para el detalle de lo hecho y lo que sigue.

## Próximos pasos

1. Capa de vida, amigos y planteles (ver DISENO_PAMPA_STAR_ADDENDUM.md) — **requiere definiciones de Rodri**.
2. Escalera de carrera: Primera B → Primera A → Torneo Regional → Ascenso AFA → Primera División → Europa → Selección y Mundial.

## Reglas de contenido (no negociables)

- Nombres reales de jugadores **solo de Primera A en adelante** (adultos, figuras públicas). Nunca menores de las divisiones formativas/infantiles/juveniles.
- Clubes, localidades y estructura del torneo: públicos, se usan con naturalidad.
- Nada de apuestas, casino ni *gambling* en ninguna mecánica.
