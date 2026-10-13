/* ============================================================================
   PAMPA STAR · L08 — UN SOLO LINK OFICIAL: LA RAÍZ LLEVA AL JUEGO NUEVO

   Lo que estaba mal (medido en el sitio en vivo con curl y en el repo): la
   raíz, juventudlapampa.github.io/pampa-star/, servía el CLÁSICO ("Liga de
   la Llanura", una sola división, "Sigue: ascensos" en su pantalla final),
   con el partido nuevo detrás del flag partido_phaser, apagado. No había
   ningún link visible a phaser/: el link que se difundía abría la versión
   vieja, y el GDD (16.4) seguía diciendo que la carrera vivía en el clásico.

   Ahora (decisión de Rodri): la raíz es una PORTADA liviana con ▶ JUGAR a
   phaser/, y el clásico se mudó a clasico/ con su carrera intacta
   (localStorage es por ORIGEN, no por carpeta).

   REVISIÓN DEL LOTE (SOLO MODO CARRERA, decisión de Rodri del 13/oct: "hacé
   el juego para que tenga SOLO modo carrera, porque ahora está raro, como
   que está opcional"). El lote había dejado la portada ofreciendo el
   clásico a cualquiera: un link en el pie ("Modo retro: la versión anterior
   del juego") y, con una carrera vieja, "▶ SEGUIR EN EL MODO RETRO". Y este
   test EXIGÍA el link (assert "la portada lleva al modo retro"), así que la
   suite quedaba verde contra la decisión. Ahora es al revés: la portada no
   linkea clasico/ en ningún lado; a quien tiene una carrera vieja le dice
   que la traiga al juego nuevo con la mudanza del Master (⬆ IMPORTAR TU
   CARRERA). La URL de clasico/ sigue viva, sin links, para esa carrera.

     [1] la raíz es la portada: sin el motor, liviana, con JUGAR a phaser/,
         SIN link al clásico, instalar, medios y créditos, y legible en el
         teléfono;
     [2] su texto, en lenguaje institucional;
     [3] clasico/index.html resuelve TODO lo que pide (scripts, imágenes,
         fondos, links) desde su carpeta nueva, y el puente con el partido
         nuevo va y vuelve por las rutas nuevas;
     [4] el save del clásico es la misma clave (pampa_star_v1) y la raíz ya
         no es el clásico;
     [5] la portada corriendo con un DOM de mentira: con carrera del juego
         nuevo, JUGAR dice SEGUIR MI CARRERA; con carrera del clásico (y sin
         una del juego nuevo), aparece el aviso de la mudanza; con el
         guardado bloqueado, nada tira;
     [6] los documentos: el GDD, PARA_MEDIOS y el README dicen cuál es el
         link, y ninguno reparte clasico/ como un lugar para jugar.

   (Los metadatos de la raíz los vigila metadatos.test.js.)

   Corré:  node phaser/test/url_oficial.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function existe(f) { return fs.existsSync(path.join(RAIZ, f)); }
function tam(f) { return fs.statSync(path.join(RAIZ, f)).size; }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var PORTADA = leer("index.html");
var CLASICO = existe("clasico/index.html") ? leer("clasico/index.html") : "";

/* lo que una página pide con rutas relativas: src, href, url() y el
   location.href del puente. Devuelve [{ ref, de }] */
function pedidos(html) {
  var out = [], m, re;
  re = /\b(src|href)="([^"]+)"/g;
  while ((m = re.exec(html))) out.push({ ref: m[2], de: m[1] });
  re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  while ((m = re.exec(html))) out.push({ ref: m[1], de: "url()" });
  re = /location\.href\s*=\s*"([^"]+)"/g;
  while ((m = re.exec(html))) out.push({ ref: m[1], de: "location.href" });
  return out.filter(function (p) { return !/^(https?:|data:|#|javascript:|mailto:|\/\/|\$\{)/.test(p.ref) && p.ref.indexOf("${") < 0; });
}
/* "clasico/" + "../phaser/" → "phaser/index.html" (como el server: carpeta → index.html) */
function resolver(dir, ref) {
  var r = path.posix.normalize(path.posix.join(dir, ref.split("?")[0].split("#")[0]));
  if (r === "." || r === "./") r = "";
  if (r === "" || r.slice(-1) === "/") r += "index.html";
  return r;
}

/* ---------- [1] LA RAÍZ ES LA PORTADA ---------- */
(function () {
  assert(!/<script\b[^>]*\bsrc=/i.test(PORTADA), "la portada no carga scripts (ni el motor ni nada): solo HTML, CSS y unas líneas adentro");
  assert(!/phaser\.min\.js|Phaser\.Game/.test(PORTADA), "la portada no arma el juego");
  var jugar = (PORTADA.match(/<a class="jugar" id="jugar" href="([^"]+)"/) || [])[1];
  assert(jugar === "phaser/" && existe(resolver("", jugar)), "SÍNTOMA: hay un ▶ JUGAR que lleva a phaser/ (" + jugar + ")");
  assert(/>▶ JUGAR</.test(PORTADA), "el botón dice ▶ JUGAR");
  /* SOLO MODO CARRERA (13/oct): antes este assert pedía el link a clasico/;
     ahora no puede haber ninguno (ni en el pie ni en el aviso) */
  var aClasico = PORTADA.match(/href="[^"]*clasico[^"]*"/g) || [];
  assert(aClasico.length === 0, "SÍNTOMA: la portada no linkea el clásico, SOLO MODO CARRERA (" + aClasico.join(", ") + ")");
  assert(!/modo retro/i.test(PORTADA.replace(/<!--[\s\S]*?-->/g, "")), "la portada no ofrece un \"modo retro\"");
  ["Cómo se juega", "Instalalo en el celular", "Para medios", "Créditos", "Subsecretaría de Juventudes de La Pampa"].forEach(function (t) {
    assert(PORTADA.indexOf(t) >= 0, "la portada tiene \"" + t + "\"");
  });
  assert(/<meta name="viewport" content="width=device-width, initial-scale=1/.test(PORTADA), "la portada se ve al ancho del teléfono (viewport)");
  assert(/body\{font:17px/.test(PORTADA), "el cuerpo va a 17 px (se lee en el teléfono sin zoom)");
  assert(/min-height:100vh;min-height:100svh;/.test(PORTADA), "el alto de la primera pantalla con respaldo (100vh antes de 100svh)");
  /* liviana: la página y lo que pide */
  var refs = pedidos(PORTADA).map(function (p) { return resolver("", p.ref); });
  var faltan = refs.filter(function (r) { return !existe(r); });
  assert(faltan.length === 0, "todo lo que pide la portada existe (faltan: " + faltan.join(", ") + ")");
  var baja = ["assets/ui/portada.webp", "assets/ui/pampa-star-logo.webp", "assets/fonts/ArchivoBlack-Regular.ttf"];
  baja.forEach(function (r) { assert(refs.indexOf(r) >= 0, "la portada usa " + r); });
  var peso = tam("index.html") + baja.reduce(function (t, r) { return t + tam(r); }, 0);
  assert(peso < 300 * 1024, "la portada pesa menos de 300 KB con lo que baja (" + (peso / 1024).toFixed(0) + " KB; el juego, unos 13 MB)");
  /* los MB que dice, los mismos que la portada del juego (que los mide portada.test.js) */
  var mbJuego = (leer("phaser/index.html").match(/data-mb="(\d+)"/) || [])[1];
  var mbRaiz = (PORTADA.match(/<span id="mb">(\d+)<\/span> MB/) || [])[1];
  assert(!!mbJuego && mbRaiz === mbJuego, "los MB de la primera vez son los mismos que dice el juego (" + mbRaiz + " y " + mbJuego + ")");
  /* el código para medios es el de PARA_MEDIOS */
  var para = leer("docs/PARA_MEDIOS.md");
  var ifr = (para.match(/<iframe src="([^"]+)"/) || [])[1];
  assert(!!ifr && PORTADA.indexOf("&lt;iframe src=\"" + ifr + "\"") >= 0 && existe(ifr.replace("https://juventudlapampa.github.io/pampa-star/", "")),
    "el código para medios de la portada es el de docs/PARA_MEDIOS.md y apunta a un archivo que existe (" + ifr + ")");
  console.log("[1] la portada: sin scripts, ▶ JUGAR a phaser/, sin link al clásico, instalar, medios y créditos; " + (peso / 1024).toFixed(0) + " KB con la ilustración, el logo y la tipografía");
})();

/* ---------- [2] EL LENGUAJE ---------- */
(function () {
  var visible = PORTADA.slice(PORTADA.indexOf("<body>")).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<textarea[\s\S]*?<\/textarea>/g, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ")
    .replace(/[a-z0-9.-]+\.github\.io\/\S*/gi, " ")   // el link escrito no es una barra de género
    .replace(/\s+/g, " ");
  var MALO = /\bpib[ea]s?\b|\blos jugadores\b|\bjugadores\b|\bbienvenid[oa]s?\b|\bpueblos?\b|\btodos\b|\blos chicos\b|@|\w\/\w|\b\w+[oa]\(a\)/i;
  var m = visible.match(MALO);
  assert(!m, "SÍNTOMA: la portada tiene \"" + (m && m[0]) + "\" (masculino genérico, \"pibe\", \"pueblo\", arroba o barra)");
  assert(/localidad/.test(visible), "dice \"localidad\"");
  assert(visible.length > 600, "y hay texto que medir (" + visible.length + " caracteres)");
  /* el aviso de la música, como decidió Rodri, sin afirmar una licencia que no consta */
  assert(/Música: autoría y licencia a confirmar por la Subsecretaría antes de la difusión institucional/.test(visible), "los créditos de la música dicen que la licencia está a confirmar");
  console.log("[2] el texto de la portada (" + visible.length + " caracteres) sin masculino genérico, \"pibe\" ni \"pueblo\"");
})();

/* ---------- [3] EL CLÁSICO EN clasico/ ---------- */
(function () {
  assert(!!CLASICO, "SÍNTOMA: existe clasico/index.html");
  if (!CLASICO) return;
  var ps = pedidos(CLASICO);
  var scripts = ps.filter(function (p) { return p.de === "src" && /\.js$/.test(p.ref); });
  assert(scripts.length === 2 && scripts.every(function (p) { return existe(resolver("clasico", p.ref)); }),
    "SÍNTOMA: clasico/index.html resuelve sus dos scripts (" + scripts.map(function (p) { return p.ref + "→" + resolver("clasico", p.ref); }).join(", ") + ")");
  var rotos = ps.filter(function (p) { return !existe(resolver("clasico", p.ref)); });
  assert(rotos.length === 0, "todo lo que pide el clásico existe desde su carpeta nueva (rotos: " + rotos.map(function (p) { return p.de + " " + p.ref; }).join(", ") + ")");
  assert(ps.length >= 8, "y se miraron sus pedidos (" + ps.length + ")");
  /* nada quedó apuntando a la raíz vieja */
  var viejas = ps.filter(function (p) { return /^(assets|data|phaser)\//.test(p.ref); });
  assert(viejas.length === 0, "ninguna ruta del clásico quedó como si siguiera en la raíz (" + viejas.map(function (p) { return p.ref; }).join(", ") + ")");
  /* el puente: el clásico pide el partido nuevo y el partido nuevo vuelve */
  var ida = (CLASICO.match(/function lanzarPartidoPhaser[\s\S]*?location\.href = "([^"]+)"/) || [])[1];
  assert(ida === "../phaser/index.html" && existe(resolver("clasico", ida)), "el clásico pide el partido nuevo en ../phaser/index.html (" + ida + ")");
  var match = leer("phaser/scenes/match.js");
  var vuelta = (match.match(/setItem\("pampa_resultado_phaser"[\s\S]{0,900}?window\.location\.href = "([^"]+)"/) || [])[1];
  assert(vuelta === "../clasico/index.html" && existe(resolver("phaser", vuelta)), "SÍNTOMA: APLICAR Y VOLVER del partido vuelve al clásico en su carpeta nueva (" + vuelta + ")");
  assert(/consumirResultadoPhaser\(\);/.test(CLASICO), "y el clásico aplica el resultado al abrir (consumirResultadoPhaser)");
  assert(!existe("pampa-star-sprites.js") && !existe("pampa-star-audio.js"), "los dos scripts del clásico se mudaron con él (no quedaron en la raíz)");
  assert(/<a class="a-portada" href="\.\.\/">/.test(CLASICO), "el modo retro tiene el link a la portada del juego nuevo");
  console.log("[3] clasico/index.html: " + ps.length + " pedidos, todos resueltos; el puente va a ../phaser/ y vuelve a ../clasico/");
})();

/* ---------- [4] LA MISMA CARRERA, Y LA RAÍZ YA NO ES EL CLÁSICO ---------- */
(function () {
  var clave = (CLASICO.match(/const STORE = "([^"]+)";/) || [])[1];
  var claves = (CLASICO.match(/localStorage\.(?:get|set)Item\(STORE/g) || []).length;
  assert(clave === "pampa_star_v1" && claves >= 2, "el clásico sigue leyendo y escribiendo pampa_star_v1 (STORE): la carrera de antes es la misma (" + clave + ", " + claves + " usos)");
  assert(!/function loadCareer|const CLUBES = \[/.test(PORTADA), "la raíz ya no es el clásico (sin loadCareer ni CLUBES)");
  assert(!/Liga de la Llanura/.test(PORTADA.replace(/<!--[\s\S]*?-->/g, "")), "la raíz no dice \"Liga de la Llanura\" (eso es el modo retro)");
  assert(/<title>PAMPA STAR · Modo retro<\/title>/.test(CLASICO), "el clásico se llama MODO RETRO");
  console.log("[4] pampa_star_v1 en el clásico (" + claves + " usos) y la raíz sin el clásico adentro");
})();

/* ---------- [5] LA PORTADA CORRIENDO ---------- */
function correr(almacen) {
  var els = {};
  ["jugar", "mudanza", "copiar", "codigo", "copiado"].forEach(function (id) {
    els[id] = { id: id, hidden: id === "mudanza" || id === "copiado", textContent: id === "jugar" ? "▶ JUGAR" : "", value: "<iframe>", oyentes: {},
      addEventListener: function (n, fn) { this.oyentes[n] = fn; }, focus: function () { }, select: function () { } };
  });
  var copiado = [];
  var ctx = {
    document: { getElementById: function (id) { return els[id]; }, execCommand: function () { return false; } },
    localStorage: almacen, console: console,
    navigator: { clipboard: { writeText: function (t) { copiado.push(t); return { then: function (a) { a(); } }; } } }
  };
  vm.createContext(ctx);
  var js = PORTADA.slice(PORTADA.lastIndexOf("<script>") + 8, PORTADA.lastIndexOf("</script>"));
  var tiro = null;
  try { vm.runInContext(js, ctx); } catch (e) { tiro = e; }
  return { els: els, tiro: tiro, copiado: copiado };
}
function guardado(datos, bloqueado) {
  return { getItem: function (k) { if (bloqueado) throw new Error("SecurityError"); return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; } };
}
(function () {
  var nada = correr(guardado({}));
  assert(!nada.tiro && nada.els.jugar.textContent === "▶ JUGAR" && nada.els.mudanza.hidden === true, "sin carreras: ▶ JUGAR y sin el aviso de la mudanza");
  var master = correr(guardado({ pampa_master_v1: "{}" }));
  assert(master.els.jugar.textContent === "▶ SEGUIR MI CARRERA", "con una carrera del juego nuevo, el mismo link dice ▶ SEGUIR MI CARRERA");
  /* el aviso sale con el MISMO gate que el botón de la mudanza del Master
     (master.js vistaElegir: `clasico && clasico.name`) y solo si todavía no
     hay carrera del juego nuevo: con una, el Master abre la tabla y no el
     paso donde está IMPORTAR, así que el aviso mandaría a un botón que no ve */
  var vieja = correr(guardado({ pampa_star_v1: "{\"name\":\"x\"}" }));
  assert(vieja.els.mudanza.hidden === false && vieja.els.jugar.textContent === "▶ JUGAR", "con una carrera del clásico, aparece el aviso de traerla al juego nuevo");
  var lasDos = correr(guardado({ pampa_star_v1: "{\"name\":\"x\"}", pampa_master_v1: "{}" }));
  assert(lasDos.els.mudanza.hidden === true && lasDos.els.jugar.textContent === "▶ SEGUIR MI CARRERA", "con las dos carreras, SEGUIR MI CARRERA y sin el aviso");
  var sinNombre = correr(guardado({ pampa_star_v1: "{}" }));
  assert(sinNombre.els.mudanza.hidden === true, "un save del clásico sin nombre no muestra el aviso (el Master tampoco ofrece importarlo)");
  var rota = correr(guardado({ pampa_star_v1: "{no es json" }));
  assert(!rota.tiro && rota.els.mudanza.hidden === true, "un save del clásico roto no tira ni muestra el aviso");
  var bloq = correr(guardado({}, true));
  assert(!bloq.tiro && bloq.els.jugar.textContent === "▶ JUGAR", "con el guardado bloqueado, nada tira y la portada queda como está");
  nada.els.copiar.oyentes.click();
  assert(nada.copiado.length === 1 && nada.els.copiado.hidden === false, "COPIAR EL CÓDIGO copia y dice ✓ CÓDIGO COPIADO");
  /* el aviso nombra el botón del Master tal como se lee: si la entrada lo
     renombra (ENTRADA-1), este assert pide cambiar también la portada */
  var aviso = (PORTADA.match(/<section id="mudanza"[\s\S]*?<\/section>/) || [""])[0];
  var MASTER = leer("phaser/scenes/master.js");
  assert(/IMPORTAR TU CARRERA/.test(aviso) && /"⬆ IMPORTAR TU CARRERA/.test(MASTER), "el aviso nombra ⬆ IMPORTAR TU CARRERA, el botón de la mudanza que existe en master.js");
  assert(!/<a\b/.test(aviso) && /▶ JUGAR/.test(aviso), "el aviso no tiene links: manda a ▶ JUGAR");
  console.log("[5] la portada corriendo: JUGAR o SEGUIR MI CARRERA, el aviso de la mudanza (sin link al clásico), bloqueada sin errores, y COPIAR");
})();

/* ---------- [6] LOS DOCUMENTOS DICEN CUÁL ES EL LINK ---------- */
(function () {
  var gdd = leer("docs/PAMPA_STAR_GDD.md");
  var enVivo = (gdd.match(/\*\*En vivo:\*\*([^\n]*)/) || [])[1] || "";
  var estado = (gdd.match(/\*\*Estado:\*\*([^\n]*)/) || [])[1] || "";
  assert(/juventudlapampa\.github\.io\/pampa-star\//.test(enVivo) && /phaser\//.test(enVivo) && !/\(clásico\)/.test(enVivo),
    "la cabecera del GDD dice que la raíz es la portada y el juego está en phaser/ (" + enVivo.trim() + ")");
  /* SOLO MODO CARRERA: el clásico ya no figura como un lugar para jugar */
  assert(!/clasico|modo retro/i.test(enVivo), "SÍNTOMA: la cabecera del GDD no ofrece el clásico como modo retro (" + enVivo.trim() + ")");
  assert(/clasico\//.test(estado) && /sin links/.test(estado) && !/modo retro/i.test(estado),
    "el estado del GDD dice que clasico/ sigue vivo sin links (" + estado.trim() + ")");
  var d162 = gdd.slice(gdd.indexOf("## 16.2"), gdd.indexOf("## 16.3"));
  assert(/SOLO MODO CARRERA/.test(d162) && /no se linkea/.test(d162), "el GDD 16.2 anota la decisión SOLO MODO CARRERA: el clásico no se linkea");
  var d164 = gdd.slice(gdd.indexOf("## 16.4"), gdd.indexOf("\n---", gdd.indexOf("## 16.4")));
  assert(/~~La carrera \(temporada, vida, progresión\) sigue viviendo en el motor clásico[^~]*~~ \*\*Saldada:\*\* la carrera entera corre en el juego Phaser/.test(d164),
    "SÍNTOMA: el GDD 16.4 tacha \"la carrera sigue viviendo en el motor clásico\" y dice dónde vive hoy");
  var para = leer("docs/PARA_MEDIOS.md");
  assert(/```\nhttps:\/\/juventudlapampa\.github\.io\/pampa-star\/\n```/.test(para.replace(/\r\n/g, "\n")), "PARA_MEDIOS: el link es la raíz");
  assert(!/Provisorio/.test(para), "PARA_MEDIOS: sin el recuadro de provisorio");
  assert(!/clasico|modo retro/i.test(para), "SÍNTOMA: PARA_MEDIOS no reparte el clásico (clasico/ ni \"modo retro\")");
  var readme = leer("README.md");
  assert(/https:\/\/juventudlapampa\.github\.io\/pampa-star\//.test(readme) && !/github\.io\/pampa-star\/clasico/.test(readme) && !/modo retro/i.test(readme),
    "el README da el link oficial y no reparte el clásico como un lugar para jugar");
  console.log("[6] el GDD (cabecera, 16.2 y 16.4), PARA_MEDIOS y el README: el link oficial es la raíz, y el clásico no se reparte");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
