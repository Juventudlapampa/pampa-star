# PAMPA STAR — Documento de diseño y prompt maestro para Claude Code

> Título provisorio. Juego de carrera futbolística ambientado en La Pampa, que cruza el motor por comandos de *Captain Tsubasa* con la capa de vida y progresión de *New Star Soccer*. El jugador es un pibe pampeano que arranca en un club chico de la Liga Cultural y sueña con llegar al Mundial.

---

## 1. El pitch en una frase

Sos un pibe que empieza pateando en un potrero de un pueblo pampeano, debutás en la Primera B de la Liga Cultural de Fútbol, te compran clubes cada vez más grandes, ascendés, das el salto a River o Boca, te vas a Europa y terminás jugando un Mundial con la Selección. El partido se juega por comandos y decisiones; la carrera se vive entre partido y partido.

## 2. Por qué la Liga Cultural es la base correcta

La Liga Cultural de Fútbol de La Pampa es la liga regional más grande de la provincia, afiliada a AFA vía Consejo Federal, fundada en 1929, con sede en Mansilla 215 de Santa Rosa y alrededor de 46 clubes. Tiene una estructura completa (Infantiles, Formativas, Juveniles, Primera B, Primera A y Femenina) que arma sola la escalera de progresión, y sus mejores clubes clasifican al Torneo Regional Federal Amateur, que es la puerta real al ascenso del fútbol argentino. Esa puerta es la transición natural entre el mundo pampeano y el mundo nacional dentro del juego.

## 3. La escalera de carrera (el arco completo)

El núcleo del juego es subir esta escalera. Cada peldaño tiene clubes, rivales y dificultad propios.

1. **Inferiores / pruebas.** El jugador arranca probándose en un club de pueblo. Categorías genéricas, sin nombres reales (ver regla de menores en la sección 8).
2. **Primera B Liga Cultural.** Debut. Clubes reales de la B y del oeste: Deportivo Winifreda, El Pampero (Guatraché), Centro Oeste, Carro Quemado, Luan Toro, Cochico, Deportivo Telén, Caleufú, Cultural Argentino (General Pico).
3. **Primera A Liga Cultural.** Te compra un club grande de la liga: All Boys (el más ganador, más de 40 títulos), Santa Rosa, Belgrano, Mac Allister, Unión de General Acha, Costa Brava (General Pico).
4. **Torneo Regional Federal Amateur.** Ascendés con el club o te suma uno que clasificó. La puerta a AFA.
5. **Ascenso AFA.** Federal A y Primera Nacional. Ancla real: Ferro Carril Oeste de General Pico, único club pampeano histórico en esa categoría.
6. **Primera División.** River, Boca y los grandes. Clubes reales de la temporada vigente.
7. **Europa.** Clubes del exterior (genéricos o con nombres ligeros para evitar líos de licencia; ver sección 8).
8. **Selección Argentina y Mundial.** El cierre del sueño. Ancla narrativa real: ya hubo jugadores pampeanos convocados a la Mayor, así que el sueño no es fantasía pura, tiene precedente.

## 4. El motor de partido (capa Captain Tsubasa)

El partido NO es acción en tiempo real. Es por comandos y semi-por-turnos, que es lo que lo hace abordable y divertido sin física fina ni IA multiagente.

**Cómo funciona el momento de juego.** El partido frena y presenta una situación: "Tenés la pelota en mitad de cancha, te viene a marcar un defensor". El jugador elige un comando.

Comandos base: **Pase**, **Gambeta**, **Pared**, **Tiro**, **Tiro especial** (cuando hay energía y está desbloqueado).

**Resolución del duelo.** Cada acción enfrenta una estadística del atacante contra una del defensor o arquero, más una barra de poder con timing y una pizca de azar. Ejemplo: un tiro enfrenta `Tiro` del jugador contra `Atajada` del arquero, modulado por cuánto cargó la barra y la distancia. Si gana el atacante, es gol o avance; si gana el defensor, hay quite, atajada o rebote.

**Energía.** Cada acción consume energía. La energía baja a lo largo del partido y condiciona qué podés intentar al final. Esto viene de New Star Soccer y es clave para el ritmo.

**Tiros especiales pampeanos.** Se desbloquean al subir de nivel y tienen identidad local. Nombres tentativos: Disparo del Caldén, Tiro Atuel, Tornado Pampeano, Remate del Médano, Viento Norte. Cuestan mucha energía y tienen animación más dramática.

**Ritmo.** Lo adictivo de estos juegos es que te tiran a una decisión clave cada pocos segundos. El partido debe ser una sucesión de momentos, no una simulación minuto a minuto. Un partido jugable dura pocos minutos reales.

## 5. La capa de carrera y vida (New Star Soccer)

Entre partido y partido se vive la carrera. Esta capa le da el alma.

**Recursos.** Energía (se recupera descansando), Forma (rendimiento del momento), Plata (sueldo modesto y realista), y Vínculos (con el club, el DT, los compañeros, la hinchada, la familia y la pareja).

**Entrenamiento.** Gastás energía y tiempo para subir estadísticas. Es la palanca principal de progresión fuera de la cancha.

**Momentos de vida.** Entre fechas aparecen decisiones que afectan stats y vínculos, con textura pampeana auténtica: el viaje en micro al partido, la pensión, el asado con los compañeros, mandarle plata a la familia que quedó en el pueblo, la changa paralela cuando el sueldo no alcanza, el primer contrato grande. Nada de casino, apuestas ni lujo trucho: eso del New Star Soccer original se reemplaza por economía real de jugador del ascenso.

## 6. Estadísticas del jugador

Pase, Tiro, Gambeta, Velocidad, Resistencia, Físico, Juego aéreo, y Carácter/Mentalidad. Más Energía y Forma como variables dinámicas. Cada peldaño de la escalera exige umbrales más altos: para que te compre un club de Primera A necesitás cierto nivel, para Primera División otro, y así.

## 7. Modelo de datos

**Club:** id, nombre, localidad, división, zona, color primario y secundario (para el escudo generado), nivel de fuerza, es_real (booleano), peldaño de la escalera.

**Jugador NPC:** id, nombre, club, posición, estadísticas. Solo se cargan NPCs con nombre real en Primera A en adelante (adultos, figuras públicas del deporte). En divisiones inferiores los NPCs son genéricos o procedurales.

**Jugador protagonista (PC):** nombre elegido por quien juega, edad, posición, estadísticas, energía, forma, plata, vínculos, historial de carrera (clubes, goles, títulos), nivel y tiros especiales desbloqueados.

**Estado de temporada:** fixture, tabla de posiciones, resultados de las otras fechas, campeón. Define si la liga "vive" alrededor del jugador o solo se simulan sus partidos (ver decisión abierta en la sección 11).

## 8. Reglas de datos reales y guardas (LEER ANTES DE SCRAPEAR)

El proyecto usa nombres reales para dar autenticidad, con tres reglas no negociables:

**Regla de menores (la más importante).** Las divisiones Formativas, Infantiles y Juveniles tienen menores de edad. Sus nombres NO se cargan jamás en el sistema de personajes. La etapa de inferiores y pruebas del juego usa nombres genéricos o procedurales. Los nombres reales de jugadores solo se usan de Primera A en adelante, donde son adultos y figuras públicas del deporte local. Esta regla es por seguridad de los chicos y para proteger el rol público de quien firma el proyecto.

**Clubes y estructura: libres.** Nombres de clubes, localidades, zonas, fixture, historia y datos del torneo son información pública e institucional. Se usan sin problema.

**Jugadores adultos: con respeto.** Los nombres reales de Primera A en adelante van como homenaje y celebración del fútbol pampeano, nunca en mecánicas que los ridiculicen.

**Clubes del exterior (Europa):** usar nombres genéricos o ligeramente alterados para evitar problemas de licencia de marcas internacionales. Los clubes argentinos de Primera son de dominio mediático y se usan con naturalidad.

**Fuentes públicas para clubes, fixtures y formaciones de adultos:**
- Sitio oficial: ligacultural.com (boletines oficiales y fixtures).
- A Un Toque: auntoque.com (resultados, formaciones, goleadores, desde 2005).
- Zonal Press: zonalpress.com.ar (oeste pampeano).
- El Diario de La Pampa y La Arena (cobertura general).
- Instagram oficial: @ligaculturaldefutbol.

## 9. La rebanada vertical (lo primero que construye Claude Code)

No se construye la novela primero. Se construye el núcleo divertido y se prueba. La primera versión es solo esto, jugable en el celular:

Un partido completo por comandos, con el jugador en un club de Primera B, con energía que baja, un arquero, uno o dos defensores, la barra de poder con timing, y al final un gol que sube una estadística. Nada más. Si ese partido engancha cuando lo agarrás en el celu, todo lo demás (temporada, escalera, vida) es lógica de estado y se escala tranquilo. Si no engancha, se descubre en una sesión.

## 10. Stack técnico y estructura para Claude Code

Mobile-first, navegador, sin descargas, coherente con la línea de Pampa Mundialista. HTML, CSS y JavaScript. El motor de partido es DOM y estado, no requiere física pesada; canvas opcional solo para animaciones de tiros especiales. Guardado de partida con localStorage o archivo JSON (funciona perfecto en el entorno de Claude Code, que corre en tu propia máquina). Estructura sugerida: un módulo de motor de partido, un módulo de carrera y temporada, un módulo de datos (clubes y jugadores), y la capa de interfaz. Empezar por el motor de partido aislado y jugable antes de tocar el resto.

## 11. Decisiones abiertas (definir con Rodri antes de avanzar)

- **Alcance de la primera versión completa:** ¿un solo club y un solo jugador subiendo por las categorías, o la liga entera simulándose alrededor con sus tablas y campeón? Lo segundo es más grande; la rebanada vertical no lo necesita.
- **El verde.** Una cancha de fútbol es verde por naturaleza, lo que choca con la restricción de marca "sin verde" de Pampa Mundialista. Decidir si este juego sigue esa paleta o tiene identidad visual propia (el césped verde es casi inevitable).
- **Posición del jugador.** ¿Se elige al crear el personaje (delantero, mediocampista) y eso cambia los comandos disponibles, o se fija como delantero para simplificar la primera versión?
- **Nombre definitivo del juego.** Pampa Star es provisorio.

## 12. Prompt maestro para pegar en Claude Code

```
Quiero construir un juego de navegador, mobile-first, sin descargas, llamado provisoriamente PAMPA STAR.

Es un juego de carrera futbolística ambientado en La Pampa, Argentina. Cruza el motor por comandos de Captain Tsubasa con la capa de vida y progresión de New Star Soccer. El jugador es un pibe pampeano que arranca en un club chico de la Liga Cultural de Fútbol de La Pampa y sueña con llegar al Mundial.

NO arranques construyendo toda la carrera. Construí primero esta rebanada vertical, aislada y jugable en el celular:

- Un partido completo por comandos. El partido frena en "momentos" y me presenta una situación (tengo la pelota, me marca un defensor). Elijo un comando: pase, gambeta, pared, tiro.
- La resolución es un duelo: una estadística mía contra una del defensor o arquero, más una barra de poder con timing y algo de azar.
- Hay un sistema de energía que baja con cada acción y condiciona el final del partido.
- Juego como delantero en un club de Primera B de la Liga Cultural.
- Al meter un gol, sube una de mis estadísticas.

Tecnología: HTML, CSS y JavaScript. El motor es DOM y estado, no necesita física pesada. Guardado con localStorage. Pensalo para pantalla de celular.

Reglas de contenido no negociables:
- Nombres reales de jugadores SOLO de Primera A en adelante (adultos). En inferiores y Primera B, jugadores genéricos o procedurales. NUNCA usar nombres de menores de las divisiones formativas, infantiles o juveniles.
- Nombres de clubes, localidades y estructura del torneo sí son reales y públicos.
- Nada de apuestas, casino ni gambling en ninguna mecánica.

Cuando la rebanada vertical funcione y se sienta divertida, escalamos: temporada de la Liga Cultural con fixture y tabla, la escalera de carrera (Primera B, Primera A, Torneo Regional, Ascenso AFA, Primera División, Europa, Selección y Mundial), la capa de vida entre partidos, y los tiros especiales pampeanos.

Empezá por el motor de partido. Mostrame algo jugable lo antes posible.
```

---

*Documento base. La escalera de carrera y el modelo de datos son sólidos; el "feel" del remate se define iterando con el prototipo en la mano.*
