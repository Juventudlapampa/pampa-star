/* ============================================================================
   PAMPA STAR · EL NIVEL DE CARRERA

   EL BUG: match.js y master.js leian `save.nivel` del save del clasico. Ese
   campo NO EXISTE — el clasico lo calcula al vuelo (1 + goles/3) y nunca lo
   guarda. `if (c && c.nivel)` era falso SIEMPRE, la asignacion no corria nunca,
   y el nivel quedaba clavado en 1 en todas las partidas del juego.

   Lo que eso mataba, sin un solo error ni un test rojo:
     · los dos megatiros de progresion (Tiro del Atuel n3, Tornado Pampeano n5)
     · las TRES megadefensas (¡PAMPERO!, ¡MEDANO!, ¡TRANQUERA! — todas n2 o n3)
     · las dos SECUENCIAS (megacorrida y combinada, ambas n2), que tienen arte
       propio dibujado en la tanda 2
     · el boton ⬆ IMPORTAR TU CARRERA, o sea la mudanza entera de la V7 §3

   Es la misma familia que `requiere_origen` comparando "campo" contra "cosecha":
   una condicion que no puede dar verdadero y que nadie ve fallar.

   Corré:  node phaser/test/nivel_carrera.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var Ma = require(path.join(RAIZ, "phaser/logic/master.js"));
var MEGA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/megacosas.json"), "utf8"));
var MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");
var INDEX = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");

/* el gate viejo se CITA en los comentarios del arreglo (para que el proximo
   sepa que fue lo que estaba roto), asi que la prueba tiene que mirar codigo y
   no prosa: si no, el propio comentario que explica el bug hace fallar el test
   que lo cuida. */
function sinComentarios(s) {
  return s.split("\n").filter(function (l) {
    var t = l.trim();
    return t.indexOf("*") !== 0 && t.indexOf("/*") !== 0 && t.indexOf("//") !== 0;
  }).join("\n");
}
var MATCH_COD = sinComentarios(MATCH), MASTER_COD = sinComentarios(MASTER);

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] LA CUENTA DEL CLASICO, ESCRITA UNA SOLA VEZ ---------- */
(function () {
  assert(typeof Ma.nivelDeCarreraClasica === "function", "tiene que existir nivelDeCarreraClasica");
  assert(Ma.nivelDeCarreraClasica({ goles: 0 }) === 1, "0 goles = nivel 1");
  assert(Ma.nivelDeCarreraClasica({ goles: 2 }) === 1, "2 goles todavia es nivel 1");
  assert(Ma.nivelDeCarreraClasica({ goles: 3 }) === 2, "3 goles = nivel 2");
  assert(Ma.nivelDeCarreraClasica({ goles: 30 }) === 11, "30 goles = nivel 11");
  assert(Ma.nivelDeCarreraClasica(null) === 1, "sin save no puede reventar: nivel 1");
  /* la cuenta tiene que ser LA MISMA que la del clasico o los dos modos se
     separan sin que nadie se entere */
  var m = INDEX.match(/const GOLES_POR_NIVEL\s*=\s*(\d+)/);
  assert(m && Number(m[1]) === Ma.GOLES_POR_NIVEL,
    "GOLES_POR_NIVEL tiene que coincidir con index.html (clasico=" + (m && m[1]) + ", logic=" + Ma.GOLES_POR_NIVEL + ")");
  console.log("[1] nivel del clasico = 1 + goles/" + Ma.GOLES_POR_NIVEL + ", igual que index.html");
})();

/* ---------- [2] NADIE LEE MAS EL CAMPO FANTASMA ---------- */
(function () {
  /* el campo `nivel` del save clasico no existe: si vuelve a aparecer como
     condicion, vuelve el bug entero */
  assert(!/c && c\.nivel/.test(MATCH_COD), "match.js no puede volver a gatear con c.nivel");
  assert(!/clasico && clasico\.nivel/.test(MASTER_COD), "master.js no puede volver a gatear con clasico.nivel");
  /* y el save del clasico, efectivamente, no lo guarda */
  var props = (INDEX.match(/career\.[a-zA-Z_]+/g) || []).map(function (s) { return s.slice(7); });
  assert(props.indexOf("nivel") < 0,
    "si el clasico empieza a guardar career.nivel hay que revisar este test (hoy NO lo guarda, por eso el gate estaba muerto)");
  console.log("[2] el gate fantasma no existe mas en ninguna de las dos escenas");
})();

/* ---------- [3] EN EL MASTER EL NIVEL ES LA ESCALERA ---------- */
(function () {
  assert(typeof Ma.nivelDeDivision === "function", "tiene que existir nivelDeDivision");
  var esperado = { primera_b: 1, primera_a: 2, regional: 3, nacional: 4, mundial: 5 };
  Object.keys(esperado).forEach(function (id) {
    assert(Ma.nivelDeDivision(id) === esperado[id], id + " tiene que dar nivel " + esperado[id]);
  });
  /* las megacosas piden nivel 1, 2, 3 y 5: ese rango ES la escalera de cinco
     divisiones, no un contador de goles sin techo */
  var pedidos = [].concat(MEGA.megatiros || [], MEGA.megadefensas || []).map(function (m) { return m.nivel || 1; });
  assert(Math.max.apply(null, pedidos) <= Ma.DIVISIONES.length,
    "ninguna megacosa puede pedir mas nivel que divisiones hay (o queda inalcanzable, que es el bug de origen)");
  console.log("[3] cinco divisiones, cinco niveles · la megacosa mas alta pide " + Math.max.apply(null, pedidos));
})();

/* ---------- [4] CADA ASCENSO DESTRABA ALGO ---------- */
(function () {
  /* la prueba de que el nivel SIRVE: si dos divisiones seguidas ofrecen
     exactamente lo mismo en todo el recorrido, el nivel no esta haciendo nada */
  function ofrecidas(nv) {
    return [].concat(
      (MEGA.megatiros || []).filter(function (m) { return nv >= (m.nivel || 1); }).map(function (m) { return "T:" + m.id; }),
      (MEGA.megadefensas || []).filter(function (m) { return nv >= (m.nivel || 1); }).map(function (m) { return "D:" + m.id; }),
      nv >= 2 ? ["S:megacorrida", "S:combinada"] : []
    );
  }
  assert(ofrecidas(1).length >= 1, "en Primera B tenes que tener al menos el Caldenazo");
  var nuevas = 0;
  for (var nv = 2; nv <= Ma.DIVISIONES.length; nv++) if (ofrecidas(nv).length > ofrecidas(nv - 1).length) nuevas++;
  assert(nuevas >= 3, "al menos 3 de los 4 ascensos tienen que destrabar algo (dieron " + nuevas + ")");
  /* y lo que antes estaba muerto, ahora se alcanza */
  var top = Ma.nivelDeDivision("mundial");
  assert(ofrecidas(top).filter(function (s) { return s.indexOf("D:") === 0; }).length === (MEGA.megadefensas || []).length,
    "las TRES megadefensas tienen que ser alcanzables (antes ninguna lo era)");
  assert(ofrecidas(top).indexOf("S:megacorrida") >= 0 && ofrecidas(top).indexOf("S:combinada") >= 0,
    "las dos secuencias tienen que ser alcanzables (antes ninguna lo era)");
  console.log("[4] " + nuevas + " de 4 ascensos destraban algo · las 3 megadefensas y las 2 secuencias ya son alcanzables");
})();

/* ---------- [5] EL NIVEL NO BAJA CON EL DESCENSO ---------- */
(function () {
  assert(/nivelDeLaCarrera\(\)/.test(MASTER), "tiene que existir el helper de escena");
  assert(/Math\.max\(nv, s\.nivelMax \| 0\)/.test(MASTER), "el nivel que viaja tiene que ser marca de agua alta");
  assert(/this\.save\.nivelMax = Math\.max/.test(MASTER), "el ascenso tiene que subir la marca de agua");
  /* y tiene que VIAJAR: si no entra al registry, la cancha vuelve a caer en 1 */
  assert(/nivel: this\.nivelDeLaCarrera\(\)/.test(MASTER), "el nivel tiene que viajar en masterPartido");
  assert(/mp0 && mp0\.nivel/.test(MATCH), "y la cancha tiene que leerlo de ahi");
  console.log("[5] marca de agua alta: un descenso no te saca un especial ya ganado");
})();

/* ---------- [6] Y CADA MEGADEFENSA TIENE UNA PUERTA ---------- */
(function () {
  /* segunda capa del mismo bug, y esta el nivel la tapaba: aunque el nivel
     hubiera estado bien, ¡PAMPERO! (quite) y ¡MEDANO! (bloqueo) no tenian UN
     SOLO llamador. En D1 el centro de la cruz de defensa paso de SUPERBLOQUEO
     a TU CARTA y nadie las mudo; el unico sitio que preguntaba por
     megaDefensaDisponible era la definicion, y preguntaba por "atajada".
     La regla que fija esto: cada TIPO declarado en los datos tiene que ser
     pedido por alguien. Si manana se agrega una megadefensa de tipo "corte",
     este test se pone rojo hasta que alguien la ofrezca. */
  var ESCENAS = ["match.js", "definicion_ui.js", "jugadon_ui.js", "escenas_v9.js"].map(function (f) {
    try { return fs.readFileSync(path.join(RAIZ, "phaser/scenes/" + f), "utf8"); } catch (e) { return ""; }
  }).join("\n");
  /* dos formas de pedirla, y las dos valen: la literal de la definicion
     (megaDefensaDisponible(["atajada"])) y la de la cruz, que pasa el tipo por
     variable desde megaDe("quite", ...). Mirar una sola daria un rojo falso. */
  var pedidosTxt = []
    .concat(ESCENAS.match(/megaDefensaDisponible\(\[[^\]]*\]/g) || [])
    .concat(ESCENAS.match(/megaDe\(\s*"[^"]*"/g) || [])
    .join(" ");
  /* CORRECCIÓN. La primera versión de este test daba verde para las TRES y era
     mentira: el único que pide "atajada" es definicion_ui.js, adentro de
     defBotonesDef(), que NO TIENE LLAMADOR — la definición defensiva murió
     cuando la V9 C1 sacó la pantalla de gestión. O sea que conté como
     consumidor a una función muerta, que es esta misma enfermedad una capa más
     abajo. Lo vigila desconectados.test.js parte [4].
     Así que TRANQUERA va declarada como lo que es: contenido que existe y no se
     puede alcanzar hasta que Rodri decida si el arquero vuelve a tener un
     momento de decisión. */
  var SIN_MOMENTO = { tranquera: "su único pedido vive en defBotonesDef(), que no tiene llamador" };
  (MEGA.megadefensas || []).forEach(function (d) {
    if (SIN_MOMENTO[d.id]) return;
    assert(pedidosTxt.indexOf('"' + d.tipo + '"') >= 0,
      "la megadefensa " + d.id + " (" + d.grito + ") es de tipo '" + d.tipo + "' y NADIE la pide: queda invisible como estuvo siempre");
  });
  Object.keys(SIN_MOMENTO).forEach(function (id) {
    var d = (MEGA.megadefensas || []).find(function (x) { return x.id === id; });
    assert(d, "si " + id + " ya no existe en los datos, sacalo de SIN_MOMENTO");
  });
  /* y la cruz de defensa tiene que ser una de las que preguntan */
  var def = MATCH.slice(MATCH.indexOf("abrirMenuDefensa() {"));
  def = def.slice(0, def.indexOf("\n  megaDefensaDisponible("));
  assert(/megaDefensaDisponible\(/.test(def), "la cruz de defensa tiene que ofrecer megadefensa");
  /* sin sacarle el lugar a la carta, que se lo gano en D1 */
  assert(/centroDeCarta\(/.test(def), "y el centro tiene que seguir siendo TU CARTA (decision de D1)");
  console.log("[6] los " + (MEGA.megadefensas || []).length + " tipos de megadefensa tienen quien los pida · el centro sigue siendo la carta");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
