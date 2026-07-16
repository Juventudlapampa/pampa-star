# PAMPA STAR — CORRECCIÓN V7-1: PANTALLA PARTIDA

> **Nota de procedencia:** el .md original de Rodri no llegó a la carpeta de
> entrega; este documento es la TRANSCRIPCIÓN fiel de su brief (17/jul/2026,
> feedback de playtest + corrección de diseño verificada por él contra
> capturas del juego original). Si aparece el original, reemplaza a este
> archivo. El contenido de diseño es de Rodri; la redacción, de la transcripción.

## §1 — El diagnóstico del playtest

Dos fixes urgentes reportados:
- **El editor de pinta está roto**: flechas duplicadas (dos ▶ por fila) que no
  responden — no se puede cambiar nada.
- **Las poses no son "yo"**: las ilustraciones del héroe deben RECOLOREARSE
  según la pinta guardada (tinte de los tonos planos de piel / pelo / camiseta).

## §2 — La corrección de diseño: PANTALLA PARTIDA

**Se elimina la cancha estilo FIFA.** Verificado contra capturas del original:
el partido se juega en DOS PANELES FIJOS:

- **ARRIBA (~55-60%) — LA ESCENA**: el portador GRANDE corriendo en ilustración
  (pose_corriendo o la identidad que corresponda) sobre fondo con PARALLAX
  (pasto rápido, fondo_tribuna lento, cielo quieto). La pelota del juego
  dibujada al pie. Los rivales cercanos entran como SILUETAS oscuras (dentro
  de RADIO_SILUETA) y se revelan recién en el cruce.
- **ABAJO (~40-45%) — EL MAPA**: la cancha COMPLETA, grande, con los DOS
  equipos visibles: círculos celestes numerados (míos), triángulos naranjas
  numerados (rivales), rombo blanco (pelota), anillo (el controlado). Es la
  **superficie de navegación principal**: se toca ahí para correr y para
  apuntar los pases.

### §2.2 — La IMPRECISIÓN (reemplaza a la ceguera)

**El flag `ceguera_rival` muere.** Los rivales SÍ se ven en el mapa, pero
IMPRECISOS: su posición se actualiza cada `IMPRECISION_MS` (600-900 ms) con un
desvío aleatorio de hasta `IMPRECISION_RADIO` px. Los tuyos y la pelota,
precisos y fluidos. Ambos parámetros en `balance.json`.

## §3 — Identidades

Seis poses de corrida entregadas en `assets/poses/identidades/`:
`jugador_rulos`, `jugador_largo`, `jugador_rapado`, `jugador_colorado`
(camiseta celeste) · `rival_flequillo`, `rival_mohicano` (naranja a rayas).

- `data/identidades_manifest.json` las mapea (fallback tolerante).
- Asignación DETERMINISTA a jugadores del roster (mismo id, misma cara siempre).
- Los rivales usan `rival_flequillo` / `rival_mohicano` para sus cracks.
- En el panel de escena, cuando el portador es un compañero o un rival
  revelado, se muestra SU identidad — no siempre el héroe.

## §4 — Recolor por pinta

Las poses del héroe se TIÑEN según el avatar guardado: mapear los tonos planos
de piel, pelo y camiseta de los PNG y reemplazarlos por los del editor.
**El que corre arriba tengo que ser YO.**

## §5 — Reglas

Flag `pantalla_partida` encendido por defecto. Todos los diales nuevos a
`balance.json`. Soak de un partido completo sin errores antes del último
commit. Sección 11 integral. Lo que queda del V7 (Modo Master completo,
mudanza de la carrera, adversarial, PWA) NO entra en esta tanda.
