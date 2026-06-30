# ⚽ PAMPA STAR

Juego de **carrera futbolística pampeana** por comandos. Un pibe que arranca en la **Primera B de la Liga Cultural de Fútbol de La Pampa** y sueña con llegar al Mundial. Cruza el motor por comandos de *Captain Tsubasa* con la capa de vida y progresión de *New Star Soccer*.

> Título provisorio · proyecto de la Subsecretaría de Juventudes de La Pampa.

## Jugar

- **Online:** se publica solo con GitHub Pages (link en la solapa *Settings → Pages*).
- **Local:** abrí `index.html` con doble clic. Es un único archivo autónomo (HTML + CSS + JS). Solo usa internet para las tipografías de Google.
- **Con servidor (para desarrollar):** `node server.js` y abrí `http://localhost:8123`.

## Estado: rebanada vertical

Un **partido completo por comandos**, jugable y mobile-first:

- Comandos contextuales según la zona: **Pase / Gambeta / Pared / Tiro**.
- **Barra de poder con timing**: frená el cursor en la zona verde para pegarle justo.
- **Duelos**: tu estadística vs la del defensor o arquero + el timing + algo de azar.
- **Energía** que baja con cada acción y penaliza las stats sobre el final.
- **Gol → sube una estadística**. La carrera se guarda en el navegador (`localStorage`).
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
