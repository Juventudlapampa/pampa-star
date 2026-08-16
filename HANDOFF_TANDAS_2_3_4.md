# HANDOFF — TANDAS 2, 3 y 4

Segunda corrida del 16/ago, en modo autónomo. Siete puntos pedidos, **seis
cerrados**. El séptimo (V1) quedó a medias y abajo está exactamente qué falta.

| | Punto | Estado | Commit |
|---|---|---|---|
| **T2** | O1 · todas las opciones en un solo lugar | ✅ (ver deuda abajo) | `a1f1f17` |
| **T2** | O2 · la historia inicial como entrevista | ✅ | `8223410` |
| **T3** | N1 · la tribuna comenta | ✅ | `ab27e55` |
| **T3** | N2 · el rival se adapta a los especiales | ✅ | `8a163fd` |
| **T3** | N3 · escudos de los clubes | ✅ | `7eaa527` |
| **T3** | N4 · la semana como escenario | ✅ | `eac69ed` |
| **T4** | V1 · jerarquía, espacio, alineación, cantidad | ⚠️ parcial | `3e4a146` |

Suite: **29 archivos verdes** · §11 limpia en 49 archivos.

---

## LO QUE MÁS VALE LA PENA MIRAR

### N3 · Los escudos, y por qué la paleta es cerrada

45 clubes, ninguno tenía escudo. Ahora salen del **nombre por hash**, así que un
club nuevo ya tiene el suyo sin tocar nada. Dos decisiones mandaron sobre el
resto:

**Los colores no son libres.** Salen de una paleta cerrada de 12 tonos, los del
propio juego. Un generador con colores libres termina, tarde o temprano,
sacando la combinación de un club o una bandera de verdad. Con paleta cerrada
eso no puede pasar, y de paso todos se ven de la misma familia.

**Se distinguen por forma, no por color**: 7 siluetas × 7 patrones, todos
legibles en blanco y negro. Con 49 combinaciones y 10 clubes por división, la
probabilidad de que dos caigan igual es ~65% (cumpleaños), así que hay un
desempate que recorre en orden alfabético y rota el patrón del que colisiona.
Medido: **0 choques** en las 5 divisiones. Las iniciales también se desempatan
—"Centro Oeste" y "Cochico FC" daban las dos "CO"—.

### N2 · Una sola vía no alcanzaba, y el motivo es el mismo que en G1

La primera versión bajaba nada más el multiplicador del especial. El Tornado
pasaba de 96 a 83 de poder y **la chance de gol no se movía un punto**, porque
`duelChance` está topeada en 0.95 y cerca del arco el descuento se lo comía el
tope. Es el mismo hallazgo de G1 apareciendo en otro lado. La lectura ahora hace
tres cosas: baja el multiplicador, sube la capacidad del arquero (eso sí mueve
la diferencia atk−def) y le saca metros al especial. Medido:

```
uso   lectura   +arquero   gol desde 260px   desde media cancha
 1     0.00      +   0          87%                38%
 3     0.46      +10.2          81%                25%
 5     0.88      +19.4          68%                13%
```

Recuperación: 32 minutos sin usarlo. Y hay un piso — un especial leído del todo
(65%) nunca rinde menos que un tiro normal (62%).

### N1 · Los dos de la tribuna no pueden decir lo que dice el relator

La revisión adversarial encontró **cinco líneas que chocaban casi textualmente**
con las del relator: "Queda mucho, levantá la cabeza" contra "A levantar la
cabeza, que queda partido". Si eso queda, la tribuna es el relator con otro
nombre. Reescritas 15 de las 132 líneas.

La franja va en y=135..250 porque se midió la ocupación del lienzo por bandas de
45 px durante el partido: esa banda tenía **un objeto contra los 6-10 del resto**.

---

## LA DEUDA DE O1, QUE ES IMPORTANTE

Mi inventario de O1 encontró **dos** grupos de opciones fuera de la franja. Un
barrido posterior más exhaustivo encontró **más**, y el peor es grave:

- **los botones de ficha del jugadón se dibujan en y=66 y y=118** mientras el
  menú en cruz está en 352/405/458 (`jugadon_ui.js:21-29`). En el mismo cuadro
  hay opciones arriba de todo y abajo de todo. **Este es el caso más flagrante
  del punto y NO está arreglado.**
- la grilla de elegir el día usa 2 columnas en 118/204/290/376 (arriba)
- el editor tiene pestañas en y=78 y dos accesos sueltos en y=12 y y=34
- la pantalla final del partido tiene un botón en y=398 que cae **encima** de la
  franja de resultado (y=337..423)
- dos botones del HUD comparten exactamente la coordenada (838, 396) y no chocan
  solo porque su visibilidad es excluyente por posesión: es frágil
- hay dos grupos de opciones que ya son **código muerto**: `defBotonesDef` y
  `entrarJugadonTiro`

**Por qué mi guardián no los cazó**: `phaser/test/o1_franja.test.js` detecta
coordenadas literales en la misma línea del `add.rectangle`, y todos estos usan
un helper que calcula la Y aparte (`var y = 66 + fila*52`). El test hay que
ampliarlo para seguir la variable, o mejor, para exigir que todo botón de opción
pase por `piel.yDeOpcion()`.

---

## LO QUE FALTA DE V1

Se hicieron los arreglos que fueron apareciendo al tocar cada pantalla, y son
reales, pero **no es la pasada completa que pedía el punto**:

Hecho:
- **alineación**: la fila de la Definición estaba corrida 190 px (centro 290
  contra centro 480 del lienzo)
- **alineación**: el botón de la semana estaba descentrado — `boton()` toma x
  como centro y le pasaban `W/2−170`, heredado del layout de dos botones
- **espacio**: el texto del efecto se salía de la caja de la ranura; el botón
  quedaba pegado a las ranuras (ahora 32 px de aire)
- **cantidad**: el texto de ayuda del origen decía dos cosas y una sobraba

Falta:
- **jerarquía**: definir el elemento principal de cada pantalla y que el resto
  ceda. No se tocó.
- el **antes/después por pantalla** que pedía el punto, con capturas de las dos
  resoluciones
- los cuatro criterios aplicados a las pantallas que no toqué (intro, editor,
  jugadón, pantalla final)

---

## PEDIDOS DE ARTE (se suman a los de la corrida anterior)

1. **Retrato del entrevistador** (Nito Carrizo, FM El Caldén). Hoy es una
   silueta de Graphics con micrófono: se entiende que hay alguien enfrente, pero
   un busto ilustrado como los del roster lo cambiaría todo. Tipo: hombre de
   pueblo, 50 y pico, campera, micrófono de mano con cubo de espuma.
2. **Retratos de Nelda y el Tuli**, los dos de la tribuna. Hoy son dos cabecitas
   geométricas distinguibles por forma (ella con rodete, él con gorra). 64×64
   como los del manifest de retratos alcanzaría.
3. Siguen pendientes: `pose_volea`, `pose_quite`, y las 3 poses de arquero
   (`arquero_parado`, `arquero_vencido`, `arquero_despeje`) con la camiseta en
   el mismo celeste `#54bcec`.

---

## DECISIONES QUE TOMÉ YO

**1. La paleta de los escudos es cerrada** (N3). El punto pedía "dos o tres
colores" sin decir cuáles. Elegí que salgan de los 12 tonos del juego, porque es
la única forma de garantizar que ninguno se parezca a un club real por accidente.
*Revertir*: `PALETA` en `logic/escudos.js`.

**2. Las selecciones del Mundial también llevan escudo geométrico** (N3). Brasil,
Alemania, etc. son nombres de países y sus escudos salen del mismo generador con
la misma paleta cerrada, así que no reproducen banderas ni escudos de
federaciones. Si preferís que el Mundial no tenga escudos, es sacar la llamada
en la tabla del Master.

**3. `lectura.penal_max = 0.42` y `arquero_bonus_max = 22`** (N2). El punto pedía
la simulación pero no el número. Elegí el par que hace que cinco usos bajen el
especial a un tercio desde media cancha sin que deje de existir cerca del arco.
*Revertir*: `balance.lectura`.

**4. La lectura arranca en cero cada partido** (N2). El punto decía "el efecto es
local al partido"; lo tomé literal. *Revertir*: guardar `st.lectura` en el save.

**5. La franja de decisión es 296..528** (O1). Elegí el corte donde ya estaban 10
de los 12 grupos, para mover lo menos posible. *Revertir*:
`balance.piel.franja_decision`.

**6. Los lugares de la semana son seis** (N4): club, potrero, casa, patio, ruta,
escuela. La asignación de cada opción a su lugar la hice yo. *Revertir*: el
campo `lugar` en `data/semana.json` — es solo texto, no toca ningún número.

**7. El entrevistador es Graphics y no un retrato** (O2). Pedirlo era frenar el
punto. Queda como pedido de arte.

**8. Las correcciones del lector adversarial se aplicaron todas** (N1, O2), 15
líneas de la tribuna y 6 de la entrevista. Los textos originales están en el
journal del workflow si querés comparar.
