/* ============================================================================
   PAMPA STAR · phaser/logic/carga.js — LA CARGA CON SEÑAL FLOJA (lógica pura)

   La meta de la tanda 1.0 es el celular de una localidad con mala señal.
   Este módulo junta lo que decide index.html alrededor de la red, sin DOM ni
   Phaser, para poder probarlo en node:

     · cuánto vino de la red en la sesión (window.__PAMPA_RED, se ve con
       ?perf=1). Lo cuentan dos: el service worker, que avisa lo que bajó
       de verdad (el transferSize de sus tiempos de recurso: un 304 cuenta
       sus pocos bytes) y cada respuesta que dio desde su caché, y la
       página, que suma lo que bajó sin pasar por él (la primera visita,
       antes de que el worker controle la página). Así se puede VER que un
       deploy nuevo no le hace bajar las poses de nuevo a quien ya jugó.
     · el reintento del loader de Phaser: un archivo que falla se vuelve a
       pedir una vez, y si falla otra vez se sigue (reintentarUnaVez);
     · cuándo mostrar "Hay una versión nueva · TOCÁ PARA ACTUALIZAR"
       (decidirAvisoVersion);
     · (L06, carga-liviana) qué baja cada pantalla y qué se baja ANTES, en
       segundo plano: lo del opening (logic: listaDelOpening), lo del editor
       (listaDelEditor) y lo del partido (listaDelPartido), y la cola que lo
       baja sin apurar a nadie (crearCalentador).

   Lo prueban phaser/test/cache_versiones.test.js, red_lenta.test.js,
   aviso_version.test.js y carga_liviana.test.js.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaCarga = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function nuevaCuenta() {
    return { bytes: 0, pedidos: 0, deCache: 0, directos: 0, topes: [], arranqueMs: null };
  }

  /* un aviso del service worker: { origen: "red", bytes, pedidos } (lo que
     bajó, en tandas) o { origen: "cache", ruta } (una respuesta de su caché) */
  function sumarRed(c, msg) {
    var m = msg || {};
    var deRed = m.origen === "red";
    var b = deRed ? Math.max(0, Number(m.bytes) || 0) : 0;
    var n = deRed ? Math.max(0, Math.round(Number(m.pedidos) || 0)) : 0;
    if (c) {
      c.bytes += b;
      c.pedidos += n;
      c.deCache += m.origen === "cache" ? 1 : 0;
    }
    return c;
  }

  /* una entrada de PerformanceResourceTiming: cuenta solo si NO pasó por el
     worker (workerStart 0) y vino de la red (transferSize > 0; la caché
     HTTP del navegador da 0). Lo que pasó por el worker ya lo contó él. */
  function sumarDirecto(c, entrada) {
    var e = entrada || {};
    var b = Number(e.transferSize) || 0;
    var cuenta = !(e.workerStart > 0) && b > 0;
    if (c && cuenta) { c.bytes += b; c.pedidos++; c.directos++; }
    return c;
  }

  function mb(b) { return (b / 1048576).toFixed(2).replace(".", ",") + " MB"; }

  /* el renglón de ?perf=1 */
  function textoRed(c) {
    if (!c) return "";
    var t = "RED " + mb(c.bytes) + " en " + c.pedidos + " pedidos · de la caché " + c.deCache;
    if (c.topes && c.topes.length) t += " · topes " + c.topes.length;
    if (c.arranqueMs != null) t += " · arrancó en " + (c.arranqueMs / 1000).toFixed(1).replace(".", ",") + " s";
    return t;
  }

  /* L06 (texturas-presupuesto): el renglón de las texturas en ?perf=1,
     con window.__PAMPA_TEX = { n, mb } (lo cuenta scenes/cine_arte.js) */
  function textoTex(t) {
    if (!t || !(t.n >= 0)) return "";
    return "TEX " + (Number(t.mb) || 0).toFixed(1).replace(".", ",") + " MB en " + t.n + " texturas";
  }

  /* ═══ EL REINTENTO DEL LOADER DE PHASER (L05, arranque-con-senal-floja) ═══
     Antes los cuatro preload (intro, editor, master, partido) se tragaban el
     "loaderror" sin hacer nada: con una raya de señal, una pose que no bajaba
     al primer intento quedaba en el sprite de código toda la sesión. Ahora,
     la primera vez que un archivo falla (o vence el tope de
     balance.red_floja.loader_timeout_ms) se vuelve a encolar con la misma
     clave y la misma dirección; la segunda, se deja y el juego sigue con su
     respaldo. Se encola ADENTRO del aviso de error: Phaser lo emite antes de
     mirar si la carga terminó (LoaderPlugin.nextFile → fileProcessComplete),
     así que el archivo nuevo entra en la misma tanda.
     El registro vive en el cierre de cada preload, no en la escena: Phaser
     borra todos los oyentes del loader al apagar la escena
     (LoaderPlugin.shutdown → removeAllListeners), así que cada scene.start
     arranca de cero sin dejar memoria en la instancia (patrón P1).
     load: el LoaderPlugin (this.load). Devuelve { reintentados, perdidos }. */
  var HISTORIAL_MAX = 30;
  var historial = [];
  function anotar(que, f) {
    historial.push({ que: que, clave: f.key || "?", tipo: f.type || "?" });
    if (historial.length > HISTORIAL_MAX) historial.shift();
  }
  function reintentarUnaVez(load) {
    var vistos = {};
    var reg = { reintentados: [], perdidos: [] };
    if (!load || typeof load.on !== "function") return reg;
    load.on("loaderror", function (file) {
      var f = file || {};
      var id = (f.type || "?") + ":" + (f.key || "?");
      var encolar = f.type === "image" ? load.image : f.type === "json" ? load.json : null;
      if (!vistos[id] && encolar && f.key && typeof f.url === "string") {
        vistos[id] = true;
        reg.reintentados.push(f.key);
        anotar("reintento", f);
        encolar.call(load, f.key, f.url);
      } else {
        reg.perdidos.push(f.key);
        anotar("perdido", f);
      }
    });
    return reg;
  }

  /* ═══ EL AVISO DE VERSIÓN NUEVA (L05, sw-robusto) ═══
     Antes no había oyente de controllerchange: cuando entraba un worker
     nuevo, la página seguía con el código viejo hasta que alguien la
     cerraba, y nadie se enteraba. index.html pregunta la versión al worker
     nuevo y esto decide qué hacer con el cartel "Hay una versión nueva ·
     TOCÁ PARA ACTUALIZAR":
       'nada'     el worker trae la MISMA versión que la página (la página ya
                  bajó el código nuevo de la red: recargar no cambia nada; es
                  lo que pasa en casi toda primera carga después de un
                  deploy), no se sabe la versión, ya se mostró, o quien juega
                  tocó DESPUÉS para esta versión;
       'esperar'  hay versión nueva pero se está jugando un partido, o está
                  el aviso "Algo se trabó": se vuelve a mirar en un rato;
       'esconder' (revisión L05) el cartel YA ESTABA a la vista y arrancó un
                  partido, apareció "Algo se trabó" o la versión dejó de ser
                  nueva. Antes el cartel solo se mostraba: si aparecía en el
                  Master y quien juega entraba a la fecha sin tocarlo, quedaba
                  arriba a la izquierda todo el partido, encima del 🔊, de
                  ⏸ PAUSA y de la mano de cartas (a 800x360, x lógico 0 a 573,
                  y 0 a 84), y un toque ahí recargaba y se perdía el partido.
                  Se esconde SIN darlo por descartado: vuelve al terminar;
       'mostrar'  todo lo demás.
     e: { versionPagina, versionSW, enPartido, trabado, descartado, mostrado } */
  function decidirAvisoVersion(e) {
    var x = e || {};
    var nueva = !!x.versionSW && x.versionSW !== x.versionPagina;
    var decision = "mostrar";
    if (!nueva || x.descartado) decision = x.mostrado ? "esconder" : "nada";
    else if (x.enPartido || x.trabado) decision = x.mostrado ? "esconder" : "esperar";
    else if (x.mostrado) decision = "nada";
    return decision;
  }

  /* ═══ LA CARGA LIVIANA (tanda 1.0, L06 · carga-liviana) ═════════════════
     Lo que estaba mal, medido con node sobre los archivos: antes de la
     compuerta ("TOCÁ PARA EMPEZAR") bajaban 4,28 MB con la pantalla en
     negro: 0,73 MB de scripts (gzip), 0,07 de JSON, 0,15 de tipografías y
     3,33 MB del preload de la intro, que pedía las 40 imágenes de los
     manifiestos y el opening usa 18 (1,45 MB). A 1 Mbps, 35 s de negro.

     Ahora cada pantalla baja lo suyo y lo de la siguiente se baja ANTES, en
     segundo plano, mientras se mira la actual:
       · la intro precarga solo la compuerta (el logo, 94 KB) y baja lo del
         opening mientras la compuerta está a la vista (listaDelOpening);
       · terminado eso, las caras del editor (listaDelEditor);
       · el editor y el Master bajan lo del partido (listaDelPartido).
     Las rutas son las MISMAS que pide el preload de cada escena ("../" +
     la ruta del manifiesto): el navegador (o el service worker) las guarda
     y el preload de después las encuentra sin ir a la red. */

  /* las piezas del opening: balance.intro.poses_intro y fondos_intro, más
     las ilustraciones de assets/ui que la intro pide por nombre (ui) */
  function listaDelOpening(intro, poses, ui) {
    var out = [], I = intro || {}, man = poses || {}, base = man.base || "assets/poses/";
    (ui || []).forEach(function (u) { if (u && u.clave && u.ruta) out.push({ clave: u.clave, ruta: u.ruta }); });
    (I.poses_intro || []).forEach(function (id) {
      var p = man.poses && man.poses[id];
      if (p && p.archivo && p.cargar !== false) out.push({ clave: "pose_" + id, ruta: "../" + base + p.archivo });
    });
    (I.fondos_intro || []).forEach(function (id) {
      var f = man.fondos && man.fondos[id];
      if (f && f.archivo && f.cargar !== false) out.push({ clave: "fondo_" + id, ruta: "../" + base + f.archivo });
    });
    return out;
  }

  /* los bustos del editor (data/caras_manifest.json) */
  function listaDelEditor(caras) {
    var CM = caras || {}, base = CM.base || "assets/poses/caras/";
    return (CM.caras || []).filter(function (c) { return c && c.archivo && c.id; })
      .map(function (c) { return { clave: "cara_" + c.id, ruta: "../" + base + c.archivo }; });
  }

  /* lo que pide el preload del partido (scenes/match.js), con las mismas
     reglas: cargar:false no se baja, los cuadros del ciclo, las siluetas de
     la hinchada, los fondos, las caras, los retratos del banco, los de la
     tribuna (con la clave del personaje: una sola por archivo, ver
     claveDeTribuna) y las identidades si su manifiesto ya está.
     reg: { poses, caras, portraits, tribuna, identidades } (los JSON) */
  function listaDelPartido(reg) {
    var R = reg || {}, out = [];
    var man = R.portraits;
    if (man && Array.isArray(man.retratos)) man.retratos.forEach(function (r, i) {
      if (r && r.archivo) out.push({ clave: "retrato_" + i, ruta: "../" + r.archivo });
    });
    var tri = R.tribuna;
    if (tri && Array.isArray(tri.personajes)) tri.personajes.forEach(function (p) {
      if (p && p.retrato && p.id) out.push({ clave: claveDeTribuna(p), ruta: "../" + p.retrato });
    });
    var P = R.poses;
    if (P && P.poses) {
      var base = P.base || "assets/poses/";
      Object.keys(P.poses).forEach(function (id) {
        var p = P.poses[id];
        if (!p || p.cargar === false) return;
        if (p.archivo) out.push({ clave: "pose_" + id, ruta: "../" + base + p.archivo });
        if (p.ciclo && p.ciclo.cuadros) p.ciclo.cuadros.forEach(function (f, k) {
          out.push({ clave: "pose_" + id + "_c" + k, ruta: "../" + base + f });
        });
      });
      var H = P.hinchada;
      if (H && Array.isArray(H.siluetas)) H.siluetas.forEach(function (s) {
        if (s && s.archivo && s.id) out.push({ clave: "pose_" + s.id, ruta: "../" + (H.base || base) + s.archivo });
      });
      if (P.fondos) Object.keys(P.fondos).forEach(function (id) {
        var f = P.fondos[id];
        if (f && f.archivo) out.push({ clave: "fondo_" + id, ruta: "../" + base + f.archivo });
      });
      listaDelEditor(R.caras).forEach(function (c) { out.push(c); });
    }
    var ID = R.identidades;
    if (ID && Array.isArray(ID.identidades)) {
      var bi = ID.base || "assets/poses/identidades/";
      ID.identidades.forEach(function (d) {
        if (d && d.id && d.archivo) out.push({ clave: "ident_" + d.id, ruta: "../" + bi + d.archivo });
      });
    }
    return out;
  }

  /* UNA SOLA CLAVE POR ARCHIVO (L06, texturas-presupuesto). Nelda y el Tuli
     se cargaban dos veces: "personaje_nelda" en el Master (de
     portraits_manifest) y "tribuna_nelda" en el partido (de tribuna.json),
     el mismo archivo con dos claves: dos texturas de 1600x1542 en la placa
     de video (19 MB las dos, a tamaño completo). La tribuna usa la clave del
     personaje; si tribuna.json apuntara a OTRO archivo para ese id,
     presupuesto_texturas.test.js lo frena (dos archivos con una clave sería
     peor: el primero que llega gana). */
  function claveDeTribuna(p) { return "personaje_" + ((p && p.id) || "?"); }

  /* LA COLA DE SEGUNDO PLANO. Baja de a `paralelas` (2) lo que se le pide,
     sin repetir, y frena cuando una escena empieza su propio preload (la
     carga que alguien ESPERA va primero; lo que no se bajó se vuelve a pedir
     en la pantalla siguiente). pedir(ruta) devuelve una promesa: en el
     juego es un fetch de prioridad baja que lee el cuerpo entero, así la
     respuesta queda en la caché del navegador o del service worker. */
  function crearCalentador(opts) {
    var o = opts || {};
    var pedir = o.pedir, paralelas = Math.max(1, o.paralelas || 2);
    var cola = [], vistos = {}, enCurso = 0, hechos = 0, fallados = 0;
    /* cada pedido en su propia función: con los var sueltos en el while,
       los .then de todos los pedidos veían el ÚLTIMO "fin" y el que
       terminaba primero cerraba el de otro (lo cazó carga_liviana.test.js) */
    function lanzar(ruta) {
      var listo = false;
      function fin(bien) {
        if (listo) return;
        listo = true;
        enCurso--;
        if (bien) hechos++; else { fallados++; delete vistos[ruta]; }
        siguiente();
      }
      var p = null;
      try { p = typeof pedir === "function" ? pedir(ruta) : null; } catch (e) { p = null; }
      if (p && typeof p.then === "function") p.then(function () { fin(true); }, function () { fin(false); });
      else fin(false);
    }
    function siguiente() {
      while (enCurso < paralelas && cola.length) {
        enCurso++;
        lanzar(cola.shift());
      }
    }
    return {
      /* rutas (o {ruta}) a la cola; devuelve cuántas entraron (las ya
         pedidas no se repiten) */
      agregar: function (lista) {
        var n = 0;
        (lista || []).forEach(function (x) {
          var r = typeof x === "string" ? x : (x && x.ruta);
          if (!r || vistos[r]) return;
          vistos[r] = 1; cola.push(r); n++;
        });
        siguiente();
        return n;
      },
      /* lo que todavía no salió se saca de la cola (y se puede volver a
         pedir); lo que está bajando termina */
      frenar: function () {
        var n = cola.length;
        cola.forEach(function (r) { delete vistos[r]; });
        cola.length = 0;
        return n;
      },
      estado: function () { return { pendientes: cola.length, enCurso: enCurso, hechos: hechos, fallados: fallados }; }
    };
  }

  return {
    nuevaCuenta: nuevaCuenta, sumarRed: sumarRed, sumarDirecto: sumarDirecto, textoRed: textoRed, textoTex: textoTex,
    reintentarUnaVez: reintentarUnaVez, historial: function () { return historial.slice(); },
    decidirAvisoVersion: decidirAvisoVersion,
    listaDelOpening: listaDelOpening, listaDelEditor: listaDelEditor, listaDelPartido: listaDelPartido,
    claveDeTribuna: claveDeTribuna, crearCalentador: crearCalentador
  };
});
