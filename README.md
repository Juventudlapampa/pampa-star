# ⚽ PAMPA STAR

Juego de **carrera futbolística pampeana** por comandos. Un pibe que arranca en la **Primera B de la Liga Cultural de Fútbol de La Pampa** y sueña con llegar al Mundial. Cruza el motor por comandos de *Captain Tsubasa* con la capa de vida y progresión de *New Star Soccer*.

> Título provisorio · proyecto de la Subsecretaría de Juventudes de La Pampa.

## Jugar

- **Online:** se publica solo con GitHub Pages (link en la solapa *Settings → Pages*).
- **Local:** abrí `index.html` con doble clic. Es un único archivo autónomo (HTML + CSS + JS). Solo usa internet para las tipografías de Google.
- **Con servidor (para desarrollar):** `node server.js` y abrí `http://localhost:8123`.

## Estado: rebanada vertical (jugabilidad retro estilo Captain Tsubasa)

Una jugada de ataque completa, jugable y mobile-first, en una **cancha pixel-art con scroll**:

- Cancha **apaisada con scroll horizontal** (estilo Captain Tsubasa), usable con el celu en vertical: campo arriba, controles abajo.
- **Movés tu sprite** hacia el arco rival (a la derecha) con el **d-pad táctil** (o flechas/WASD). La pelota avanza con vos. Velocidad afinable con la constante `VELOCIDAD_JUGADOR` arriba del script.
- Cuando un defensor te sale al cruce, la acción **se congela** y aparece un **menú de comandos tipo combate de Pokémon**: Gambeta / Pase / Pared / Tiro, cada uno con su **chance %** en ese momento.
- Elegís y se resuelve como **duelo de estadísticas**: tu stat vs la del rival, modulado por tus **Guts** (energía que baja con cada acción). **Sin barra de timing** — es elegir y ver el resultado.
- Ganás el duelo: seguís avanzando. Perdés: perdés la pelota.
- En el área, **Tiro abre el duelo contra el arquero** (que también tiene Guts). Si gana tu tiro: **gol**.
- **Gol → sube una estadística**. La carrera se guarda en el navegador (`localStorage`).
- Sprites originales generados por código (jugadores, pelota, arco, cancha). Sin assets de terceros.
- Tiro especial *Disparo del Caldén* bloqueado, como adelanto de la progresión.

## Próximos pasos

1. Temporada de la Liga Cultural con fixture y tabla.
2. Escalera de carrera: Primera B → Primera A → Torneo Regional → Ascenso AFA → Primera División → Europa → Selección y Mundial.
3. Capa de vida entre partidos (entrenamiento, plata, vínculos, momentos pampeanos).
4. Tiros especiales pampeanos desbloqueables.

## Reglas de contenido (no negociables)

- Nombres reales de jugadores **solo de Primera A en adelante** (adultos, figuras públicas). Nunca menores de las divisiones formativas/infantiles/juveniles.
- Clubes, localidades y estructura del torneo: públicos, se usan con naturalidad.
- Nada de apuestas, casino ni *gambling* en ninguna mecánica.
