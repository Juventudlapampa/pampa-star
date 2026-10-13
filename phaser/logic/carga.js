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
     las ilustraciones de assets/ui que la intro pide por nombre (ui).
     REVISIÓN DEL LOTE: si balance.json no llega en TOPE_JSON_MS (8 s, el
     primero en pasarse con señal muy floja: 35 KB en gzip contra 7 de
     poses_manifest), index.html sigue con BALANCE_FALLBACK, que no trae
     estas listas, y el opening salía sin protagonistas ni tribuna. Antes del
     lote no pasaba: el preload pedía todas las poses del manifiesto. Este
     respaldo es el mismo que balance.intro (carga_liviana.test.js [2] lo
     compara), como el DEF de logic/memoria.js. */
  var OPENING_DEF = {
    poses_intro: ["pelota_vieja", "remate", "chilena", "cabezazo", "barrida", "arquero_vuela", "festejo"],
    fondos_intro: ["tribuna"]
  };
  function listaDelOpening(intro, poses, ui) {
    var out = [], I0 = intro || {}, man = poses || {}, base = man.base || "assets/poses/";
    var I = {
      poses_intro: Array.isArray(I0.poses_intro) ? I0.poses_intro : OPENING_DEF.poses_intro,
      fondos_intro: Array.isArray(I0.fondos_intro) ? I0.fondos_intro : OPENING_DEF.fondos_intro
    };
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

  /* ═══ EL PRECALENTAMIENTO POR TAJADAS (L06, trabas-cine) ═══════════════
     Lo que estaba mal, medido en el navegador con una pinta que no es la
     Original: lo pesado se hacía la PRIMERA vez que hacía falta, adentro del
     momento: teñir el festejo con tu pinta, 70,8 ms en pleno cine del gol (un
     cuadro de 73 ms); teñir el remate, 25,8 ms en el toque de TIRO; los
     retratos del duelo, 67 ms al abrir la cruz; las pinturas del arco y de
     la cancha en fuga, 14 ms cada una en el viaje de la pelota.
     Esta cola hace eso ANTES, en los ratos tranquilos, de a tajadas: cada
     tajada corre trabajos hasta gastar presupuestoMs (12, como la cola del
     halo) y le devuelve el cuadro al juego. Un trabajo es
     { clave, paso(fin, ahora), partible, costoMs }: paso devuelve true
     cuando terminó y false si todavía no (se le acabó la tajada, o espera a
     otro trabajo); los que se pueden partir (partible: el teñido, por
     bandas de filas; los pesos de la toma, por tramos) miran `fin` y cortan
     solos.
     REVISIÓN DEL LOTE: un trabajo que NO se parte (atómico) corría entero
     aunque costara más que la tajada: medido en la compu, tajadas de 24 a
     61 ms (el retrato de VOS 48, los pesos de la toma 31, cada pintura 14),
     y en un teléfono de gama baja (4-6 veces más lento) eso son 200-350 ms
     de traba, en LIBRE o en la cruz del duelo si quien juega elige rápido
     el tempo. La traba se mudaba en vez de irse. Ahora:
       · permitido() dice CUÁNTA calma hay: 0 nada; 1 un rato CORTO (se
         juega o se elige: LIBRE, la cruz, el pase), donde corre SOLO lo que
         se parte; 2 un rato LARGO (un menú quieto: el tempo, la pausa, el
         tutorial; y fuera del partido), donde también corre lo atómico:
         lo grande (más que una tajada), UNO por tajada y antes que lo demás,
         y lo chico si su costo estimado entra en lo que queda. true vale 2 y
         false 0. Lo atómico NO entra en un rato corto ni aunque "quepa":
         su costo se midió en la compu y en el teléfono no se sabe cuánto
         tarda hasta correr el primero (medido en el navegador: medir los
         pies de una pose, declarado 8 ms, tardó 22 la primera vez).
       · el costo estimado es costoMs (lo medido en la compu,
         balance.rendimiento.costo_ms) por el FACTOR del aparato: cada
         atómico que corre se cronometra y factor = la mayor proporción
         medido/declarado de la sesión (de 1 a FACTOR_MAX). Un atómico sin
         costoMs cuenta como grande.
       · en un rato corto, una tajada por cuadro (la empuja el update del
         partido); en uno largo, la siguiente enseguida (MessageChannel).
     o: { ahora(), programar(fn), presupuestoMs, permitido() } */
  var FACTOR_MAX = 8;
  function crearColaPorTajadas(o) {
    var op = o || {};
    var presupuesto = op.presupuestoMs > 0 ? op.presupuestoMs : 12;
    var cola = [], claves = {}, programado = false, factor = 1;
    var stats = { hechos: 0, fallas: 0, tajadas: 0, tajadaMax: 0, ms: 0, grandes: 0, factor: 1, atomicoMax: 0 };
    function ahora() { return typeof op.ahora === "function" ? op.ahora() : Date.now(); }
    function nivel() {
      if (typeof op.permitido !== "function") return 2;
      var p = op.permitido();
      if (p === true) return 2;
      return p > 0 ? Math.min(2, Math.floor(p)) : 0;
    }
    function estimado(t) { return t.costoMs > 0 ? t.costoMs * factor : Infinity; }
    function grande(t) { return !t.partible && estimado(t) > presupuesto; }
    function empujar() {
      if (programado || !cola.length || !nivel() || typeof op.programar !== "function") return false;
      programado = true;
      op.programar(tajada);
      return true;
    }
    /* corre un paso y aprende del reloj (solo lo atómico que terminó) */
    function correr(t, fin) {
      var a0 = ahora(), listo = true;
      try { listo = t.paso(fin, ahora) !== false; } catch (e) { listo = true; stats.fallas++; }
      var d = ahora() - a0;
      if (listo && !t.partible && t.costoMs > 0 && d > 0) {
        factor = Math.max(factor, Math.min(FACTOR_MAX, d / t.costoMs));
        stats.factor = factor;
        if (d > stats.atomicoMax) stats.atomicoMax = d;
      }
      if (listo) stats.hechos++;
      return listo;
    }
    function tajada() {
      programado = false;
      var nv = nivel();
      if (!cola.length || !nv) return 0;
      var t0 = ahora(), fin = t0 + presupuesto, n = 0, i;
      /* rato largo: lo atómico grande primero, uno por tajada */
      if (nv >= 2) {
        for (i = 0; i < cola.length; i++) {
          if (!grande(cola[i])) continue;
          if (correr(cola[i], fin)) { cola.splice(i, 1); n++; stats.grandes++; break; }
        }
      }
      /* lo que entra: lo que se parte, y (en un rato largo) lo atómico que
         cabe en lo que queda.
         Lo que espera (paso dio false con tiempo de sobra) no frena a los de
         atrás: se sigue con el próximo */
      i = 0;
      while (i < cola.length && ahora() < fin) {
        var t = cola[i];
        if (!t.partible && (nv < 2 || estimado(t) > fin - ahora())) { i++; continue; }
        if (correr(t, fin)) { cola.splice(i, 1); n++; } else i++;
      }
      var d = ahora() - t0;
      stats.tajadas++; stats.ms += d;
      if (d > stats.tajadaMax) stats.tajadaMax = d;
      /* encadenar solo si hubo algo que hacer: si todo lo que queda espera
         (a la cola del halo, por ejemplo), la próxima la empuja el cuadro
         siguiente y no se gira en vacío */
      if (nv >= 2 && (n > 0 || d >= 1)) empujar();
      return n;
    }
    return {
      agregar: function (t) {
        if (!t || !t.clave || typeof t.paso !== "function" || claves[t.clave]) return false;
        claves[t.clave] = 1;
        cola.push(t);
        empujar();
        return true;
      },
      empujar: empujar,
      tajada: tajada,
      pendientes: function () { return cola.length; },
      /* ¿este trabajo todavía está en la cola? (los que dependen de otro,
         como los pies de una pose teñida, lo esperan solo mientras esté) */
      tiene: function (clave) {
        for (var k = 0; k < cola.length; k++) if (cola[k].clave === clave) return true;
        return false;
      },
      /* se va la escena: lo que quedaba se tira (y se puede volver a pedir) */
      vaciar: function () { var n = cola.length; cola.length = 0; claves = {}; return n; },
      stats: function () { return stats; }
    };
  }

  /* ═══ EL CUADRO MÁS LARGO (L06, trabas-cine) · para ?perf=1 ═══
     Cada cuadro del juego: cuánto trabajó (del principio del paso al final
     del dibujo) y cuánto pasó desde el anterior (con el navegador marcando
     el paso, ese intervalo es lo que se ve: incluye lo que corrió entre
     cuadros, como las tajadas de las colas). Se guardan los últimos 10 s. */
  var VENTANA_PERF_MS = 10000;
  function anotarCuadro(p, t, trabajo, intervalo) {
    if (!p) return p;
    p.cuadros = p.cuadros || [];
    p.cuadros.push({ t: t, trabajo: trabajo, intervalo: intervalo || 0 });
    while (p.cuadros.length && p.cuadros[0].t < t - VENTANA_PERF_MS) p.cuadros.shift();
    var mt = 0, mi = 0;
    for (var i = 0; i < p.cuadros.length; i++) {
      if (p.cuadros[i].trabajo > mt) mt = p.cuadros[i].trabajo;
      if (p.cuadros[i].intervalo > mi) mi = p.cuadros[i].intervalo;
    }
    p.trabajoMax = mt; p.intervaloMax = mi;
    if (trabajo > (p.trabajoMaxSesion || 0)) p.trabajoMaxSesion = trabajo;
    return p;
  }
  function ms(v) { return Math.round(Number(v) || 0) + " ms"; }
  /* el renglón del cuadro, la cola y el halo (y, si ya se midió, la
     pantalla: "PANTALLA 120 Hz · 1 de cada 2") */
  function textoCuadros(p, cola, halo, pantalla) {
    if (!p || !p.cuadros || !p.cuadros.length) return "";
    var t = "CUADRO máx 10 s " + ms(p.intervaloMax) + " (trabajo " + ms(p.trabajoMax) + ")";
    if (cola) t += " · COLA " + cola.pendientes + (cola.tajadaMax ? " (tajada máx " + ms(cola.tajadaMax) + ")" : "");
    if (halo && halo.ms != null) t += " · HALO " + ms(halo.ms);
    if (pantalla && pantalla.hz > 0) t += " · PANTALLA " + Math.round(pantalla.hz) + " Hz" + (pantalla.divisor > 1 ? " · 1 de cada " + pantalla.divisor : " · sin tope");
    return t;
  }

  /* ═══ EL TOPE DE CUADROS SEGÚN LA PANTALLA (revisión del lote L06) ═══
     Lo que estaba mal, simulado con el algoritmo de Phaser 3.80.1 sacado del
     vendor (TimeStep.stepLimitFPS suma el delta de cada cuadro y, al pasar
     el tope, lo pone en CERO sin guardar el resto): el tope fijo de 61 que
     dejó el lote bajaba a la mitad toda pantalla de entre 61 y 119 Hz. Una
     de 75 Hz pasaba de 75 a 37,5 cuadros por segundo, una de 90 Hz (muchos
     Android de gama media y baja) de 90 a 45, una de 100 Hz de 100 a 50, y
     una de 144 Hz quedaba en 48.
     Ahora el tope se decide MIRANDO la pantalla: el juego anota el intervalo
     crudo entre cuadros (loop.rawDelta, que es el de la pantalla aunque
     haya tope) y con la mediana de una tanda:
       · hasta fps_libre_hasta_hz (100), con un 5% de aire, corre libre:
         60, 75, 90 y 100 Hz quedan como antes del lote;
       · arriba, se toma 1 de cada n cuadros, con el n más chico que deja el
         juego en fps_libre_hasta_hz o menos: 120 Hz → 60, 144 → 72,
         165 → 82,5, 240 → 80. Así 120 Hz no corre el doble, que era lo que
         pedía el ítem;
       · el tope va a MITAD DE CAMINO entre n-1 y n cuadros de la pantalla,
         (n - 0,5) × intervalo, y no justo en n: con el tope justo (61 en
         60 Hz) un cuadro que llegaba una centésima antes se salteaba. Con
         medio cuadro de aire, el temblor normal de la pantalla no cambia la
         cuenta.
     intervalos: ms entre cuadros; cfg: balance.rendimiento. Devuelve
     { hz, divisor, limite } (limite 0 = sin tope) o null si no hay muestras
     que sirvan (la pestaña atrás, un teléfono trabado: se deja lo que hay). */
  function topeDeCuadros(intervalos, cfg) {
    var c = cfg || {}, libre = c.fps_libre_hasta_hz > 0 ? c.fps_libre_hasta_hz : 100;
    /* fuera de 3-50 ms no es la pantalla: es el juego trabado o la pestaña
       que volvió (un intervalo de 2 s), y no tiene que mover la mediana */
    var v = (intervalos || []).filter(function (x) { return x >= 3 && x <= 50; }).sort(function (a, b) { return a - b; });
    if (v.length < Math.max(5, Math.floor((c.fps_muestras || 60) / 2))) return null;
    var med = v[v.length >> 1], hz = 1000 / med;
    if (hz <= libre * 1.05) return { hz: hz, divisor: 1, limite: 0 };
    var n = Math.ceil(hz / libre);
    return { hz: hz, divisor: n, limite: 1000 / ((n - 0.5) * med) };
  }
  /* la tanda de muestras: cada fps_muestras intervalos decide de nuevo (la
     pantalla puede cambiar: un teléfono que baja de 120 a 60 Hz para
     ahorrar batería, la ventana que pasa a otro monitor) y llama a
     aplicar(d) solo si cambió el divisor: dentro del mismo divisor el medio
     cuadro de aire ya cubre las diferencias de medición. */
  function crearMedidorDeCuadros(cfg, aplicar) {
    var n = Math.max(10, (cfg && cfg.fps_muestras) || 60), v = [], actual = null;
    return {
      anotar: function (msCuadro) {
        v.push(Number(msCuadro) || 0);
        if (v.length < n) return null;
        var d = topeDeCuadros(v, cfg);
        v = [];
        if (d && (!actual || d.divisor !== actual.divisor)) {
          actual = d;
          if (typeof aplicar === "function") aplicar(d);
        }
        return d;
      },
      actual: function () { return actual; }
    };
  }

  return {
    crearColaPorTajadas: crearColaPorTajadas, anotarCuadro: anotarCuadro, textoCuadros: textoCuadros,
    topeDeCuadros: topeDeCuadros, crearMedidorDeCuadros: crearMedidorDeCuadros,
    nuevaCuenta: nuevaCuenta, sumarRed: sumarRed, sumarDirecto: sumarDirecto, textoRed: textoRed, textoTex: textoTex,
    reintentarUnaVez: reintentarUnaVez, historial: function () { return historial.slice(); },
    decidirAvisoVersion: decidirAvisoVersion,
    listaDelOpening: listaDelOpening, OPENING_DEF: OPENING_DEF, listaDelEditor: listaDelEditor, listaDelPartido: listaDelPartido,
    claveDeTribuna: claveDeTribuna, crearCalentador: crearCalentador
  };
});
