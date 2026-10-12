/* ============================================================================
   PAMPA STAR · EL CÓDIGO DE CARRERA (tanda 1.0, L03 · codigo-de-carrera)

   POR QUÉ: una carrera del Master son de 10 a 37 horas y vivía SOLO en
   localStorage: grep de exportar / importar / storage.persist daba 0, y el
   respaldo de borrarCarrera está en el mismo almacenamiento. Si el navegador
   lo borra (el de algunos teléfonos lo hace a los 7 días sin uso si el juego
   no está instalado), o si cambiás de teléfono, la carrera se perdía.

   Lo que fija este test:
     [1] la ida y vuelta: exportar → importar da el MISMO save (deepEqual),
         con tildes, ñ, emojis y a cualquier altura de la temporada
     [2] un código alterado se rechaza CON MENSAJE: una letra cambiada, uno
         cortado, otro prefijo, otra versión, vacío. Y el que viene con
         espacios, saltos de línea o el texto del mensaje adelante, entra
     [3] 300 alteraciones de una letra al azar: ninguna tira, ninguna entra
     [4] las piezas (UTF-8, LZW de 9 a 16 bits, base64) con datos al azar,
         incluido un diccionario lleno
     [5] master.js REAL con una caja de DOM de mentira: pegar un código
         alterado dice el motivo y NO pisa el save; pegar uno bueno respalda
         lo que había en pampa_master_v1_borrada, trae la carrera y pide
         storage.persist; la tabla tiene "💾 código de carrera"
     [6] cableado: index.html, sw.js, crear carrera pide persist

   Corré:  node phaser/test/codigo_carrera.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), assertNode = require("assert");
var M = require("./_escena_de_mentira.js");
var RAIZ = M.RAIZ;
var C = require(path.join(RAIZ, "phaser/logic/carrera.js"));
var T = require(path.join(RAIZ, "phaser/logic/temporada.js"));
var Ma = require(path.join(RAIZ, "phaser/logic/master.js"));
var DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8"));
var IDS = Ma.DIVISIONES.map(function (d) { return d.id; });
var SANEO = {
  rivalesDe: function (d) { return (DIV.divisiones[d] || {}).rivales || null; },
  crearTemporada: function (d, club, n) { return T.crear({ division: d, miClub: club, rivales: DIV.divisiones[d].rivales, semilla: Ma.hashClub(club) * 31 + (n || 1) }); }
};
var OPTS = { ids: IDS, saneo: SANEO };

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function igual(a, b) { try { assertNode.deepStrictEqual(a, b); return true; } catch (e) { return false; } }

function carrera(div, fechas, club) {
  club = club || "El Bagual de Winifreda";
  var t = T.crear({ division: div, miClub: club, rivales: DIV.divisiones[div].rivales, semilla: 4242 });
  for (var f = 0; f < fechas; f++) T.jugarFecha(t, f % 3, (f + 1) % 2);
  return { v: 1, club: club, pueblo: "Realicó", division: div, temporadaN: 3,
    titulos: [{ division: "primera_b", temporada: 1 }, { division: "primera_a", temporada: 2 }],
    origen: { stats: { tiro: 2, gambeta: 1 }, frases: ["el que aprendió en el potrero"], marcas: ["potrero"] },
    bolsaEventos: ["hermanito", "asado"], racha: -1, mejoras: { tiro: 4.25, resistencia: 12 },
    modFecha: { eventoId: "hermanito", opcion: "Lo llevo 🏆", frase: "ñandú, pingüino, acción", mod: { envion: 10 } },
    animo: 77, desgaste: 12, molestia: false, nivelMax: 3,
    semana: { energia: 63, animo: 70, elegidas: ["entrenar_tiro", null, null], molestia: false, fecha: 1, permanentes: { tiro: 1 } },
    eventoFecha: { temporadaN: 3, fecha: fechas, id: "hermanito", resuelto: true },
    temporada: t };
}

/* ---------- [1] LA IDA Y VUELTA ---------- */
(function () {
  var casos = [
    ["recién creada (Primera B, fecha 1)", carrera("primera_b", 0)],
    ["a mitad (Regional, fecha 10)", carrera("regional", 9)],
    ["terminada (El Mundial, 18 de 18)", carrera("mundial", 18)],
    ["club con tildes y ñ", carrera("nacional", 5, "Los Ñandúes de Guatraché")]
  ];
  var largos = [];
  casos.forEach(function (c) {
    var cod = C.exportar(c[1]);
    largos.push(cod.length);
    assert(/^PAMPA1\.[0-9a-f]{8}\.[A-Za-z0-9_-]+$/.test(cod), c[0] + ": el código tiene la forma PAMPA1.<crc>.<datos> (sin puntos en los datos)");
    var r = C.importar(cod, OPTS);
    assert(r.ok && !r.error, c[0] + ": se importa (" + r.error + ")");
    assert(igual(r.save, c[1]), "SÍNTOMA: " + c[0] + ": la ida y vuelta da el MISMO save (deepEqual)");
    assert(r.reparado.length === 0, c[0] + ": un save sano no se repara (" + r.reparado.join(", ") + ")");
  });
  var j = JSON.stringify(casos[2][1]).length;
  console.log("[1] " + casos.length + " carreras: ida y vuelta idéntica · largos " + largos.join(", ") +
    " letras (la terminada: JSON " + j + " → " + largos[2] + ", " + (j / largos[2]).toFixed(1) + " veces menos)");
})();

/* ---------- [2] LOS CÓDIGOS QUE NO SIRVEN ---------- */
(function () {
  var s = carrera("primera_a", 7), cod = C.exportar(s);
  var punto = cod.lastIndexOf(".");
  var cambiar = function (i) {
    var ch = cod.charAt(i), nuevo = ch === "A" ? "B" : "A";
    return cod.slice(0, i) + nuevo + cod.slice(i + 1);
  };
  var rechazos = [
    ["una letra cambiada en los datos", cambiar(punto + 40)],
    ["una letra cambiada al final", cambiar(cod.length - 2)],
    ["cortado a la mitad", cod.slice(0, Math.floor(cod.length / 2))],
    ["sin las últimas 3 letras", cod.slice(0, cod.length - 3)],
    ["con 4 letras de más", cod + "AbCd"],
    ["el crc cambiado", cod.replace(/^PAMPA1\.[0-9a-f]/, function (m) { return m.slice(0, -1) + (m.slice(-1) === "0" ? "1" : "0"); })],
    ["dos códigos pegados", cod + cod]
  ];
  rechazos.forEach(function (c) {
    var r = C.importar(c[1], OPTS);
    assert(!r.ok && r.save === null, "SÍNTOMA: " + c[0] + " se rechaza");
    assert(r.error === C.ERRORES.roto, c[0] + ": con el mensaje de código incompleto o cambiado (" + r.error + ")");
  });
  var otros = [
    ["vacío", "", "vacio"], ["solo espacios", "  \n ", "vacio"], ["un texto cualquiera", "hola, ¿cómo va?", "ajeno"],
    ["de otro juego", "XYZ1.0000.AAAA", "ajeno"], ["de una versión más nueva", cod.replace(/^PAMPA1\./, "PAMPA9."), "nuevo"]
  ];
  otros.forEach(function (c) {
    var r = C.importar(c[1], OPTS);
    assert(!r.ok && r.error === C.ERRORES[c[2]], c[0] + ": se rechaza diciendo \"" + C.ERRORES[c[2]] + "\" (dijo: " + r.error + ")");
  });
  /* lo que hace un teléfono o un mensaje con el texto: tiene que entrar igual */
  var envuelto = [
    ["con saltos de línea cada 60", cod.replace(/(.{60})/g, "$1\n")],
    ["con espacios y comillas", "  \"" + cod + "\"  "],
    ["con el texto del mensaje adelante", "Mi carrera de Pampa Star. Para seguirla: MODO MASTER → PEGAR UN CÓDIGO.\n\n" + cod]
  ];
  envuelto.forEach(function (c) {
    var r = C.importar(c[1], OPTS);
    assert(r.ok && igual(r.save, s), c[0] + ": entra igual (" + r.error + ")");
  });
  /* uno bien formado pero que no es una carrera jugable */
  var raro = C.exportar({ hola: "mundo" });
  var rr = C.importar(raro, OPTS);
  assert(!rr.ok && rr.error === C.ERRORES.injugable, "un código bien hecho pero sin carrera adentro se rechaza (" + rr.error + ")");
  console.log("[2] " + rechazos.length + " alterados rechazados con mensaje · " + otros.length + " ajenos con el suyo · " + envuelto.length + " envueltos entran");
})();

/* ---------- [3] 300 ALTERACIONES AL AZAR ---------- */
(function () {
  var s = carrera("regional", 11), cod = C.exportar(s);
  var a = 777; var rnd = function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  var ALF = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var tiros = 0, entraron = 0, rechazados = 0;
  for (var i = 0; i < 300; i++) {
    var p = 7 + Math.floor(rnd() * (cod.length - 7));
    var ch = ALF.charAt(Math.floor(rnd() * 64));
    if (cod.charAt(p) === ch || cod.charAt(p) === ".") { i--; continue; }
    var alt = cod.slice(0, p) + ch + cod.slice(p + 1);
    try { var r = C.importar(alt, OPTS); if (r.ok) entraron++; else if (typeof r.error === "string" && r.error) rechazados++; }
    catch (e) { tiros++; }
  }
  assert(tiros === 0, "300 alteraciones: importar no tira nunca (" + tiros + ")");
  assert(entraron === 0, "300 alteraciones: ninguna entra como carrera (" + entraron + ")");
  console.log("[3] 300 alteraciones de una letra: " + rechazados + " rechazadas con mensaje, " + entraron + " entraron, " + tiros + " excepciones");
})();

/* ---------- [4] LAS PIEZAS, CON DATOS AL AZAR ---------- */
(function () {
  var a = 99; var rnd = function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  var fallas = 0;
  for (var k = 0; k < 60; k++) {
    var n = Math.floor(rnd() * 3000), bytes = [];
    var alfabeto = 1 + Math.floor(rnd() * 255);
    for (var i = 0; i < n; i++) bytes.push(Math.floor(rnd() * alfabeto));
    var vuelta = C.descomprimir(C.deBase64(C.aBase64(C.comprimir(bytes))));
    if (!igual(vuelta, bytes)) fallas++;
  }
  assert(fallas === 0, "LZW + base64: 60 tiras al azar vuelven iguales (" + fallas + " no)");
  /* el diccionario se llena (16 bits) y sigue andando */
  var grande = [];
  for (var j = 0; j < 160000; j++) grande.push(Math.floor(rnd() * 256));
  assert(igual(C.descomprimir(C.comprimir(grande)), grande), "con el diccionario lleno (160.000 bytes al azar) vuelve igual");
  var txt = "Ñandú · Realicó · Guatraché · 🏆⚽ · é́";
  assert(C.deUtf8(C.aUtf8(txt)) === txt, "UTF-8: tildes, ñ, emojis y combinados vuelven iguales");
  assert(C.crc32(C.aUtf8("123456789")) === "cbf43926", "el CRC-32 es el estándar (123456789 → cbf43926)");
  console.log("[4] LZW 9-16 bits, base64 y UTF-8: 60 tiras al azar + diccionario lleno + CRC estándar");
})();

/* ---------- [5] master.js REAL, CON UNA CAJA DE DOM DE MENTIRA ---------- */
function domDeMentira() {
  function el(tag) {
    var e = { tagName: tag, children: [], attrs: {}, oyentes: {}, parentNode: null, textContent: "", value: "", className: "", style: {},
      setAttribute: function (k, v) { this.attrs[k] = v; },
      appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; },
      addEventListener: function (t, fn) { (this.oyentes[t] = this.oyentes[t] || []).push(fn); },
      focus: function () { }, select: function () { }
    };
    return e;
  }
  var body = el("body");
  return { body: body, createElement: el, execCommand: function () { return false; },
    buscar: function (pred) {
      var out = [];
      (function b(n) { n.children.forEach(function (c) { if (pred(c)) out.push(c); b(c); }); })(body);
      return out;
    } };
}
(function () {
  var A = M.armar();
  var doc = domDeMentira();
  A.ctx.document = doc;
  var copiado = null;
  A.ctx.navigator.clipboard = { writeText: function (t) { copiado = t; return Promise.resolve(); } };
  var W = A.window;

  /* una carrera en curso en este "teléfono" */
  var mia = carrera("primera_a", 6);
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(mia));
  var s = A.nueva(); s.create();
  assert(s.textos().indexOf("💾 código de carrera") >= 0, "la tabla tiene \"💾 código de carrera\"");
  var acceso = s.tocables().find(function (o) { return o.text === "💾 código de carrera"; });
  s.tocar(acceso.x - 40, acceso.y);
  var tx = s.textos();
  assert(tx.indexOf("💾 CÓDIGO DE CARRERA") >= 0 && tx.some(function (t) { return /letras · empieza con PAMPA1\./.test(t); }),
    "tocarlo abre la vista del código, que dice cuántas letras tiene y cómo empieza");
  s.teclas("ENTER");                                      // el cursor arranca en COPIAR
  assert(copiado === C.exportar(mia), "COPIAR EL CÓDIGO copia el código de esta carrera");

  /* el otro teléfono: tiene OTRA carrera y le pegan un código ALTERADO */
  var otra = carrera("primera_b", 2, "Los del Caldén de Toay");
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(otra));
  A.localStorage.removeItem("pampa_master_v1_borrada");
  var s2 = A.nueva(); s2.save = null; s2.T = W.PampaTemporada; s2.Ma = W.PampaMaster; s2.DIV = A.datos.divisiones;
  s2.vistaElegir();
  assert(s2.textos().indexOf("📋 PEGAR UN CÓDIGO") >= 0, "elegir club tiene \"📋 PEGAR UN CÓDIGO\"");
  var bPegar = s2.tocables().find(function (o) { return o.type === "Rectangle" && o.x > 480 && o.y > 480; });
  s2.tocar(bPegar.x, bPegar.y);
  var ta = doc.buscar(function (n) { return n.tagName === "textarea"; })[0];
  assert(!!ta && s2.input.keyboard.enabled === false, "se abre la caja para pegar, y el teclado es de la caja");
  /* los toques tampoco pasan a la pantalla de atrás: con un clic de verdad,
     SEGUIR ESA CARRERA apretaba también ARRANCAR EN LA PRIMERA B (debajo) */
  var fondoCaja = doc.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; })[0];
  assert(fondoCaja && ["mousedown", "touchstart", "pointerdown"].every(function (k) { return (fondoCaja.oyentes[k] || []).length > 0; }),
    "la caja corta mousedown, touchstart y pointerdown (Phaser los escucha en window)");
  var corto = false; fondoCaja.oyentes.mousedown[0]({ stopPropagation: function () { corto = true; } });
  assert(corto, "y los corta de verdad (stopPropagation)");
  assert(s2.input.enabled === false && s2.tocar(480, 384) === null && s2._irA.length === 0,
    "SÍNTOMA: con la caja abierta, un toque sobre ARRANCAR no hace nada (la entrada de la escena está apagada)");
  var botones = doc.buscar(function (n) { return n.tagName === "button"; });
  var seguir = botones.find(function (b) { return /SEGUIR ESA CARRERA/.test(b.textContent); });
  var cod = C.exportar(mia);
  ta.value = cod.slice(0, cod.length - 5) + "Zz9_-";
  seguir.oyentes.click[0]();
  var msg = doc.buscar(function (n) { return n.className && /msg/.test(n.className); })[0];
  assert(msg && msg.textContent === "✗ " + C.ERRORES.roto && /mal/.test(msg.className), "SÍNTOMA: un código alterado se rechaza CON MENSAJE (" + (msg && msg.textContent) + ")");
  assert(A.localStorage.getItem("pampa_master_v1") === JSON.stringify(otra), "SÍNTOMA: y el save que había NO se pisa");
  assert(A.localStorage.getItem("pampa_master_v1_borrada") === null && s2._restarts === 0, "ni se respalda ni se reinicia nada");
  /* ahora el bueno */
  var persistAntes = W.__persistPedido | 0;
  ta.value = "Mi carrera:\n" + cod.replace(/(.{70})/g, "$1\n");
  seguir.oyentes.click[0]();
  assert(doc.buscar(function (n) { return n.tagName === "textarea"; }).length === 0 && s2.input.keyboard.enabled === true && s2.input.enabled === true,
    "con el bueno la caja se cierra y vuelven el teclado y los toques");
  assert(igual(JSON.parse(A.localStorage.getItem("pampa_master_v1")), mia), "el save es la carrera del código, igual");
  assert(A.localStorage.getItem("pampa_master_v1_borrada") === JSON.stringify(otra), "lo que había quedó respaldado en pampa_master_v1_borrada");
  assert((W.__persistPedido | 0) === persistAntes + 1, "se pidió storage.persist");
  assert(s2._restarts === 1, "y la escena arranca de nuevo, en la tabla");
  var s3 = A.nueva(); s3.create();
  var fila = s3.save.temporada.tabla.find(function (f) { return f.equipo === s3.save.temporada.miClub; });
  assert(s3.save.temporada.fecha === 6 && fila.pj === 6 && s3.textos().indexOf("PRIMERA A · TEMPORADA 3") >= 0,
    "en el otro navegador sigue la MISMA fecha (7 de 18) con la MISMA tabla");
  console.log("[5] master real: 💾 en la tabla → copiar · pegar alterado: mensaje y save intacto · pegar bueno: respaldo, persist y misma fecha");
})();

/* ---------- [6] CABLEADO ---------- */
(function () {
  var html = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
  var sw = fs.readFileSync(path.join(RAIZ, "phaser/sw.js"), "utf8");
  var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");
  assert(html.indexOf('<script src="logic/carrera.js"></script>') >= 0, "index.html carga logic/carrera.js");
  assert(/#cajacodigo\{/.test(html), "index.html tiene la piel de la caja");
  assert(sw.indexOf('"./logic/carrera.js"') >= 0, "sw.js lo precachea");
  assert((MASTER.match(/this\.accesoAlCodigo\(W, H\);/g) || []).length >= 2, "el 💾 está en las dos ramas de la tabla");
  var crear = MASTER.slice(MASTER.indexOf("this._crearCarrera = (divId, origen) => {"));
  crear = crear.slice(0, crear.indexOf("ARRANCAR EN LA PRIMERA B"));
  assert(/this\.pedirQueNoSeBorre\(\)/.test(crear), "crear la carrera pide storage.persist");
  console.log("[6] index.html, la caja, sw.js y storage.persist al crear la carrera");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
