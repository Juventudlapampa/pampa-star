/* ============================================================================
   PAMPA STAR · BLOQUE 3 — LAS DECISIONES YA TOMADAS (D1 a D5)

     D1 · cartas por puesto en vez del superbloqueo
     D2 · la semana se elige por ACCIÓN, no por día (y el reloj, apagado)
     D3 · cada acción de la semana tiene su animación
     D4 · el mapa de La Pampa en vez de la lista con flechitas
     D5 · primero el editor, después la entrevista

   Lo que este test cuida de verdad no es que las pantallas existan: es que las
   REGLAS que las hacen valer la pena no se aflojen sin que nadie se entere.
   Que un delantero no pueda barrer. Que el reloj de la semana siga apagado.
   Que el mapa no invente coordenadas. Que las poses de prestado sigan
   declaradas como prestadas y no se olviden en el camino.

   Corré:  node phaser/test/d_decisiones.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");
var EDITOR = fs.readFileSync(path.join(RAIZ, "phaser/scenes/editor.js"), "utf8");
var MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var CUI = fs.readFileSync(path.join(RAIZ, "phaser/scenes/cartas_ui.js"), "utf8");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var MEGA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/megacosas.json"), "utf8"));
var SEM = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/semana.json"), "utf8"));
var ROS = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/roster_pampeano.json"), "utf8"));
var MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/poses_manifest.json"), "utf8"));
var C = require(path.join(RAIZ, "phaser/logic/cartas.js"));
var Mapa = require(path.join(RAIZ, "phaser/logic/mapa.js"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] D1 · EL PUESTO DECIDE QUÉ PODÉS HACER ---------- */
(function () {
  var PUESTOS = ["ARQ", "DEF", "VOL", "ATA"];
  PUESTOS.forEach(function (p) {
    var cs = C.cartasDe(MEGA, p);
    assert(cs.length === 2, "D1: " + p + " tiene que tener DOS cartas (tiene " + cs.length + ")");
  });
  /* el reparto que pidió la orden, con todas las letras */
  var por = {};
  PUESTOS.forEach(function (p) { por[p] = C.cartasDe(MEGA, p).map(function (c) { return c.clase; }).sort().join("+"); });
  assert(por.ATA === "ataque+ataque", "D1: el delantero lleva DOS de ataque (dio " + por.ATA + ")");
  assert(por.VOL === "ataque+recuperacion", "D1: el volante, una y una (dio " + por.VOL + ")");
  assert(por.DEF === "ataque+recuperacion", "D1: el defensor, megapase y supersacada (dio " + por.DEF + ")");
  assert(por.ARQ === "ataque+recuperacion", "D1: el arquero, atajada especial y saque largo (dio " + por.ARQ + ")");

  /* LA REGLA QUE HACE QUE ESTO IMPORTE: un delantero NO puede recuperar.
     Si esto se afloja, elegir a quién le pasás vuelve a dar lo mismo. */
  var est = C.estadoNuevo();
  var ata = { pos: "ATA", aguante: 1000 };
  var recu = C.cartasDe(MEGA, "DEF").filter(function (c) { return c.clase === "recuperacion"; })[0];
  assert(!C.puedeUsar(est, 0, recu, ata, 0).puede,
    "D1: un DELANTERO no puede usar la carta de un DEFENSOR — es el punto entero del bloque");
  var manoAta = C.manoDe(MEGA, est, 0, ata, 0);
  assert(manoAta.filter(function (m) { return m.carta.clase === "recuperacion"; }).length === 0,
    "D1: la mano de un delantero no puede traer nada de recuperación");

  /* la recarga es en MINUTOS de partido y muerde */
  MEGA.cartas.forEach(function (c) {
    assert(typeof c.recarga_min === "number" && c.recarga_min >= 10,
      "D1: " + c.n + " necesita recarga_min de al menos 10' (dio " + c.recarga_min + ")");
    assert(!("recarga_s" in c), "D1: recarga_s quedó en " + c.n + " — la simulación mostró que en segundos no muerde");
  });
  /* y cuesta aguante en la liga del Caldén, que es la referencia del propio juego */
  var calden = (MEGA.megatiros || []).find(function (m) { return m.id === "calden"; });
  var masCara = MEGA.cartas.reduce(function (a, b) { return (b.aguante > a.aguante) ? b : a; });
  assert(masCara.aguante >= calden.aguante * 0.8 && masCara.aguante <= calden.aguante,
    "D1: la carta más cara (" + masCara.n + ", " + masCara.aguante + ") juega en la liga del Caldén (" +
    calden.aguante + "): más barata y del mismo orden");

  /* el estado se limpia POR PARTIDO (lección de P1) */
  var init = MATCH.slice(MATCH.indexOf("  init() {"), MATCH.indexOf("  create() {"));
  assert(/_cartas = null/.test(init), "D1: las cartas se reinician en init() o llegan gastadas al partido siguiente");

  /* el superbloqueo se fue del centro de la cruz */
  assert(/centro: this\.centroDeCarta/.test(MATCH),
    "D1: el centro del menú de defensa tiene que ser la carta, no la megadefensa");
  console.log("[1] D1 · 2 cartas por puesto · el delantero no recupera · recarga en minutos · el centro es la carta");
})();

/* ---------- [2] D1 · CADA CARTA TIENE SU MOMENTO, Y SU POSE EXISTE ---------- */
(function () {
  var sinPose = [], sinMomento = [], prestadas = [];
  MEGA.cartas.forEach(function (c) {
    if (!c.pose || !MAN.poses[c.pose]) sinPose.push(c.n + " → " + c.pose);
    if (!c.momento) sinMomento.push(c.n);
  });
  assert(sinPose.length === 0, "D1: estas cartas apuntan a una pose que no existe: " + sinPose.join(", "));
  assert(sinMomento.length === 0, "D1: estas cartas no dicen qué plano les toca: " + sinMomento.join(", "));
  /* los cinco planos del brief */
  var planos = MEGA.cartas.map(function (c) { return c.momento; });
  ["carga", "salto", "giro", "piernas", "horizonte"].forEach(function (m) {
    assert(/carga|salto|giro|piernas|horizonte/.test(m), "plano conocido: " + m);
  });
  assert(planos.every(function (m) { return ["carga", "salto", "giro", "piernas", "horizonte"].indexOf(m) >= 0; }),
    "D1: los planos tienen que ser de los cinco del brief (dio " + planos.join(", ") + ")");
  /* el momento usa el Bloque B que ya estaba, no uno nuevo */
  assert(/FE\.hitstop\(this, "fuerte", 3\)/.test(CUI), "D1: el momento arranca con HITSTOP");
  assert(/escenaCine\(\{/.test(CUI) && /especial: true/.test(CUI), "D1: y sigue con el cut-in de la figura recortada");
  assert(/if \(!this\.hayEscenas\(\)\)/.test(CUI),
    "D1: con las escenas apagadas la carta igual se tiene que contar — una carta muda es peor que una fea");
  /* las poses de prestado quedan DECLARADAS: son el pedido de arte */
  assert(typeof MEGA._cartas_arte === "string" && MEGA._cartas_arte.length > 40,
    "D1: las poses de prestado tienen que quedar anotadas en el dato, no en la cabeza de nadie");
  console.log("[2] D1 · las 8 poses existen · los 5 planos declarados · hitstop + cut-in + el aviso de arte");
})();

/* ---------- [3] D2 · LA SEMANA SE ELIGE POR ACCIÓN ---------- */
(function () {
  /* ya no se elige un día y después se abre otra pantalla */
  assert(!/vistaElegirDia\(i\)/.test(MASTER),
    "D2: no puede quedar el camino viejo de tocar un DÍA para abrir la lista");
  assert(/ponerEnLaSemana\(/.test(MASTER) && /sacarDeLaSemana\(/.test(MASTER),
    "D2: tiene que poder ponerse y sacarse una acción");
  assert(/const ranura = sem\.elegidas\.findIndex\(e => !e\);/.test(MASTER),
    "D2: EL JUEGO reparte los días (la primera ranura libre), no vos");
  /* la lógica de abajo no se tocó: mismos números */
  var LOG = fs.readFileSync(path.join(RAIZ, "phaser/logic/semana.js"), "utf8");
  assert(/function elegir\(/.test(LOG), "D2: logic/semana.js sigue siendo quien pone los números");
  assert(/S\.elegir\(D, sem, ranura, op\.id, bal\)/.test(MASTER),
    "D2: y se lo sigue pidiendo con la misma firma — misma lógica, mismos números");
  /* sacar REHACE la semana en vez de restar a mano */
  assert(/let nueva = S\.nuevaSemana\(this\.save, bal\);/.test(MASTER),
    "D2: sacar una acción rehace la semana desde cero; restar a mano es de donde salen los desajustes");

  /* EL RELOJ: OPCIONAL Y APAGADO */
  assert(BAL.semana.reloj_seg === 0,
    "D2: el reloj de la semana tiene que venir APAGADO (reloj_seg = 0, dio " + BAL.semana.reloj_seg + ")");
  assert(/if \(seg <= 0\) return false;/.test(MASTER),
    "D2: y en 0 no se arma ningún temporizador, no solo no se dibuja");
  assert(/this\.cerrarSemana\(alJugar\)/.test(MASTER.slice(MASTER.indexOf("relojDeLaSemana"))),
    "D2: al llegar a cero se juega CON LO QUE HAYA — el reloj nunca elige por vos");
  assert(typeof BAL.semana._reloj === "string" && /opcional/i.test(BAL.semana._reloj),
    "D2: y queda escrito por qué está apagado");
  console.log("[3] D2 · se elige la acción, el juego reparte los días · el reloj apagado por defecto");
})();

/* ---------- [4] D3 · CADA ACCIÓN TIENE SU POSE, Y LAS DE PRESTADO ESTÁN MARCADAS ---------- */
(function () {
  var sin = [], rotas = [], prestadas = [];
  SEM.opciones.forEach(function (o) {
    if (!o.pose) { sin.push(o.id); return; }
    if (!MAN.poses[o.pose]) rotas.push(o.id + " → " + o.pose);
    if (o.pose_falta) prestadas.push(o.id);
  });
  assert(sin.length === 0, "D3: estas acciones no tienen pose: " + sin.join(", "));
  assert(rotas.length === 0, "D3: estas acciones apuntan a una pose que no existe: " + rotas.join(", "));
  assert(prestadas.length > 0,
    "D3: las poses de prestado tienen que estar MARCADAS con pose_falta y su motivo — es el pedido de arte");
  prestadas.forEach(function (id) {
    var o = SEM.opciones.find(function (x) { return x.id === id; });
    assert(o.pose_falta.length > 25, "D3: '" + id + "' tiene que decir POR QUÉ la pose está de prestado");
  });
  /* la animación usa el Bloque B que ya existe, sin arte nuevo */
  assert(/PampaFeel\.aparecer\(this, im,/.test(MASTER), "D3: el momento entra con anticipación y rebote");
  assert(/PampaSemanaUI\.escenario\(this, MX, MY, MW, MH/.test(MASTER), "D3: y el escenario N4 detrás");
  /* lo que se aprendió mirándolo con tiempo real: el rebote de PampaFeel se pasa
     del destino a propósito, así que la figura necesita máscara o asoma fuera
     del marco; y el texto necesita banda opaca o las líneas del escenario lo
     tachan. Las dos cosas se ven en la captura de la primera versión. */
  assert(/im\.setMask\(mk\.createGeometryMask\(\)\)/.test(MASTER),
    "D3: la figura del momento va enmascarada contra el marco, o el rebote la saca afuera");
  assert(/const banda = this\.add\.rectangle\(x0, y0, bw, MH, 0x0a1f13, 0\.88\)/.test(MASTER),
    "D3: el texto va sobre banda opaca, o las líneas del escenario lo tachan");
  assert(typeof BAL.semana.momento_ms === "number", "D3: cuánto dura es una perilla");
  /* el master carga las poses POR DATO, no por lista a mano */
  assert(/dSem\.opciones\.forEach\(\(o\) => \{ if \(o && o\.pose/.test(MASTER),
    "D3: la lista de poses a cargar sale de data/semana.json — una acción nueva se carga sola");
  console.log("[4] D3 · las 10 acciones con pose · " + prestadas.length + " de prestado, declaradas · carga por dato");
})();

/* ---------- [5] D4 · EL MAPA NO INVENTA COORDENADAS ---------- */
(function () {
  var pueblos = Object.keys(ROS.clubes_por_pueblo);
  var sinZona = pueblos.filter(function (p) { return !ROS.clubes_por_pueblo[p].zona; });
  assert(sinZona.length === 0, "D4: estos pueblos no tienen zona: " + sinZona.join(", "));
  var zonasValidas = Object.keys(Mapa.ZONAS);
  var malas = pueblos.filter(function (p) { return zonasValidas.indexOf(ROS.clubes_por_pueblo[p].zona) < 0; });
  assert(malas.length === 0, "D4: zona desconocida en: " + malas.join(", "));

  /* LO QUE NO SE PUEDE HACER: inventar coordenadas. Mientras nadie cargue x/y,
     TODOS los puntos tienen que declararse esquemáticos. */
  var ubic = Mapa.ubicar(pueblos.map(function (p) {
    return Object.assign({ nombre: p }, ROS.clubes_por_pueblo[p]);
  }));
  assert(ubic.length === pueblos.length, "D4: se ubican los " + pueblos.length + " pueblos");
  ubic.forEach(function (u) {
    assert(u.x >= 0 && u.x <= 1 && u.y >= 0 && u.y <= 1, "D4: " + u.nombre + " tiene que caer en 0..1");
  });
  var exactos = Mapa.cuantosExactos(ubic);
  assert(/mapa por zonas · las ubicaciones exactas van cuando estén los datos/.test(MASTER),
    "D4: mientras no haya coordenadas, la pantalla lo tiene que DECIR — un esquema que se presenta como exacto miente");
  /* estable: el mismo roster da siempre el mismo mapa */
  var otra = Mapa.ubicar(pueblos.map(function (p) {
    return Object.assign({ nombre: p }, ROS.clubes_por_pueblo[p]);
  }));
  assert(JSON.stringify(ubic) === JSON.stringify(otra),
    "D4: el mapa tiene que ser estable — si los pueblos se mudan entre partidas, no es un mapa");
  /* y cuando lleguen las coordenadas, mandan ellas */
  var conXY = Mapa.ubicar([{ nombre: "X", zona: "norte", x: 0.11, y: 0.77 }]);
  assert(conXY[0].x === 0.11 && conXY[0].y === 0.77 && conXY[0].exacto === true,
    "D4: si un pueblo trae x/y, se usan ESOS y la zona se ignora");
  /* la lista con flechitas se fue */
  assert(!/◀ Club " \+ p \+ " ▶/.test(MASTER), "D4: quedó el stepper viejo con flechas");
  assert(/dibujarMapa\(\)/.test(MASTER), "D4: tiene que existir el mapa");
  /* el elegido se marca por FORMA, no solo por color (regla del proyecto) */
  var mapaFn = MASTER.slice(MASTER.indexOf("  dibujarMapa() {"));
  assert(/setStrokeStyle\(3, 0xffd84d, 1\)/.test(mapaFn) && /"★"/.test(mapaFn),
    "D4: el punto elegido lleva anillo Y estrella — nunca solo un color distinto");
  console.log("[5] D4 · " + pueblos.length + " pueblos por zona · " + exactos + " con coordenada exacta · " +
    "estable · el elegido por forma");
})();

/* ---------- [6] D5 · PRIMERO EL EDITOR, DESPUÉS LA ENTREVISTA ---------- */
(function () {
  assert(/this\.game\.registry\.set\("carreraPendiente", \{ division: divId \}\);/.test(MASTER),
    "D5: arrancar una carrera tiene que dejar el pendiente y mandarte al editor");
  /* el cambio de pantalla dejó de ser scene.start() y pasa por irA(), que hace
     el fundido y RECIÉN AHÍ arranca la escena. Lo que este assert cuida no es
     cómo se llama la función: es que arrancar una carrera te mande al editor
     ANTES que a la entrevista. Se aceptan las dos formas para que el test siga
     hablando de la conducta y no del mecanismo. */
  assert(/arrancarEn = \(divId\) => \{[\s\S]{0,400}?(irA|scene\.start)\("editor"\)/.test(MASTER),
    "D5: y el editor va PRIMERO");
  assert(/if \(this\._pendienteOrigen\)/.test(MASTER),
    "D5: al volver del editor se va derecho a la entrevista, sin pasar de nuevo por elegir club");
  assert(/PASO 1 DE 2/.test(EDITOR),
    "D5: el editor tiene que decir que es un paso de arrancar, no una parada opcional");
  assert(/entrevistado\(\)/.test(MASTER), "D5: y en la entrevista tiene que haber alguien de este lado");
  assert(/poseConTuPinta\("recibiendo"\)/.test(MASTER),
    "D5: con TU pinta, la misma que usa el panel del partido");
  /* el contenido de la entrevista no cambió: es un cambio de ORDEN */
  var ENT = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/entrevista.json"), "utf8"));
  var VIDA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/eventos_temporada.json"), "utf8"));
  assert(!!ENT.preguntas, "la entrevista sigue teniendo sus preguntas");
  Object.keys(ENT.preguntas).forEach(function (id) {
    var o = (VIDA.origen || []).find(function (x) { return x.id === id; });
    assert(!!o, "D5: la pregunta '" + id + "' tiene que seguir existiendo en vida.json");
    if (o) assert(ENT.preguntas[id].respuestas.length === o.opciones.length,
      "D5: '" + id + "' cambió de cantidad de respuestas — eso SÍ cambiaría las consecuencias");
  });
  console.log("[6] D5 · editor → entrevista · el entrevistado con tu pinta · el contenido intacto");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
