/* ============================================================================
   PAMPA STAR · phaser/scenes/vestidas_ui.js — LAS POSES VESTIDAS, ANTES
   Tanda 1.0, lote L08c (deudas de la ola 2).

   LO QUE ESTABA MAL, MEDIDO. pose_bloqueo y pose_barrida están dibujadas con
   el kit del rival; cuando las usa alguien de tu equipo, logic/vestir.js
   separa la tela de la piel y la viste con tu camiseta. Eso se hacía en el
   create del partido (dos delayedCall, a los 900 y a los 1700 ms) y es de
   una sola pieza: en el navegador de la compu, los dos cuadros más largos de
   los primeros 3 s del partido eran esos, de 382 y 313 ms. Hasta ahora caían
   detrás del menú de tempo; con el tempo elegido al crear la carrera (TEMPO-1)
   ese menú se va y la traba quedaba a la vista en pleno arranque. En un
   teléfono de gama baja, cada una puede pasar el segundo.

   LO QUE HAY ACÁ. Una cola de vestidas para todo el juego (las texturas
   viven en el administrador de texturas del juego y sobreviven al cambio
   de escena):
     · la TABLA DEL MASTER las pide un rato después de dibujarse (quieta, y
       se pasa por ahí antes de cada fecha), con los colores que va a
       necesitar el partido: el celeste del equipo y, si elegiste otra
       camiseta en el editor, la tuya (scenes/master.js, prepararVestidas);
     · se visten en UN HILO APARTE (logic/vestir_obrero.js, un Worker con la
       misma función, sin cambiarle nada): acá solo se leen los píxeles de la
       pose (drawImage + getImageData) y se pone el resultado como textura;
     · el PARTIDO solo las usa si ya están. En su create las vuelve a pedir
       por si se entró sin pasar por la tabla, pero solo al hilo aparte:
       nunca viste en el arranque. Si al usarla todavía no está (no debería:
       el primer bloqueo es mucho después), se viste en el acto como antes
       (cine_arte.poseDelEquipo): un defensor tuyo con las rayas del rival
       confunde justo a quien distingue por forma (GDD §10.5);
     · SIN WORKER (un navegador muy viejo, o si el hilo falla o no contesta
       en balance.vestidas.obrero_tope_ms): la tabla las viste en este hilo,
       de a una y con balance.vestidas.hilo_espera_ms de aire entre una y
       otra, MIENTRAS SIGA A LA VISTA (puedeAca). El partido no: ahí espera
       a usarlas.
   Un error del Worker (el archivo que no bajó) se ataja acá: no llega a la
   red de errores como "Algo se trabó".

   REVISIÓN DEL LOTE L08c. El aire entre vestida y vestida es un setTimeout
   de la VENTANA, no de la escena: sobrevive al cambio de escena. Sin Worker
   (obrero:false, que es la forma documentada de revertir) la tabla pide 2
   o 4 vestidas a los 700 ms, la primera sale 400 ms después y cada una
   tarda unos 300 ms en la compu y cerca de 1 s en un teléfono: si se toca
   JUGAR LA FECHA y se pasa la semana rápido, las que faltaban se vestían
   de una pieza en los primeros segundos del partido, que es justo la traba
   que el lote sacó del arranque. Ahora el permiso para este hilo es de la
   pantalla que lo dio (op.escena) y se pregunta otra vez justo antes de
   vestir: si ya no está a la vista, la vestida se suelta y la viste
   poseDelEquipo al usarla, como lo que pide el partido.

   window.__PAMPA_VESTIDAS cuenta cuántas hizo cada camino, cuánto tardó lo
   que queda en este hilo y cuántas se soltaron para vestirse al usarlas (se
   mira en el navegador para medir).
   ========================================================================== */
(function () {
  "use strict";
  var V = window.PampaVestir;
  var URL_OBRERO = "logic/vestir_obrero.js";
  var ESTADO = window.__PAMPA_VESTIDAS = { obrero: 0, hilo: 0, soltadas: 0, hechas: [], fallas: [], msHiloMax: 0 };
  var obrero = null, obreroMuerto = false, cola = [], enCurso = null, nSig = 1, reloj = null;
  var pendientes = {};     // clave → true mientras está en la cola o en el hilo aparte

  function cfg(game) {
    var B = ((game && game.registry && game.registry.get("balance")) || {}).vestidas || {};
    return {
      tope: B.obrero_tope_ms > 0 ? B.obrero_tope_ms : 15000,
      espera: B.hilo_espera_ms != null ? B.hilo_espera_ms : 400,
      obrero: B.obrero !== false
    };
  }
  function ahora() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }

  /* ¿se puede vestir EN ESTE HILO ahora? Solo con el permiso de una pantalla
     quieta (op.escena: la tabla del Master) y mientras siga a la vista: ni
     parada (arrancó el partido, se fue al editor) ni yéndose (el fundido a
     negro de irA, piel_ui.js: 200 ms que una vestida de una pieza trabaría).
     Sin escena no hay permiso. Se pregunta al encolar el turno y otra vez
     justo antes de vestir, porque en el medio pasa hilo_espera_ms */
  function puedeAca(t) {
    var e = t.hilo ? t.escena : null, sys = e && e.sys;
    return !!(sys && typeof sys.isActive === "function" && sys.isActive() && !e._yendo);
  }

  /* la pose de origen, con el anillo del halo ya limpio (como antes) */
  function fuenteDe(game, id) {
    var key = "pose_" + id;
    if (!game.textures.exists(key)) return null;
    if (window.PampaHaloAsegurar) window.PampaHaloAsegurar(key);
    var img = game.textures.get(key).getSourceImage();
    return img && img.width ? img : null;
  }
  /* 23/oct: dónde trae la pose un número dibujado (poses.<id>.numero: el 4
     de la barrida), para borrarlo después de vestirla */
  function numeroDe(game, id) {
    var man = game.registry.get("poses"), def = man && man.poses && man.poses[id];
    return (def && def.numero) || null;
  }
  function leerPixeles(img) {
    var cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    var c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    return c.getImageData(0, 0, img.width, img.height);
  }
  /* el resultado entra como textura recién cuando está vestido: si entrara
     antes, quien pregunta "¿ya está?" usaría la pose sin vestir */
  function ponerTextura(game, clave, datos) {
    if (game.textures.exists(clave)) return false;
    var ct = game.textures.createCanvas(clave, datos.width, datos.height);
    if (!ct) return false;
    ct.getContext().putImageData(datos, 0, 0);
    ct.refresh();
    return true;
  }

  /* EN ESTE HILO, de una sola pieza (el camino de siempre). Lo usan la tabla
     sin Worker y, como último recurso, el partido al usar una que falta */
  function vestirAca(game, id, destino) {
    var clave = V.claveVestida(id, destino);
    if (game.textures.exists(clave)) return clave;
    var src = fuenteDe(game, id);
    if (!src) return null;
    var t0 = ahora();
    try {
      var datos = leerPixeles(src);
      var r = V.vestir(datos.data, datos.width, datos.height, { destino: destino }), num = numeroDe(game, id);
      if (num) window.PampaHalo.borrarNumero(datos.data, datos.width, datos.height, window.PampaHalo.cajaDeNumero(num, datos.width, datos.height, 0, 0), r.m);
      ponerTextura(game, clave, datos);
    } catch (e) {
      console.error("[vestir] " + id + ": " + (e && e.message));
      ESTADO.fallas.push(clave + ": " + (e && e.message));
      if (game.textures.exists(clave)) game.textures.remove(clave);
      return null;
    }
    var ms = ahora() - t0;
    ESTADO.hilo++;
    ESTADO.msHiloMax = Math.max(ESTADO.msHiloMax, ms);
    ESTADO.hechas.push({ clave: clave, por: "hilo", ms: Math.round(ms) });
    return clave;
  }

  /* ---------- el hilo aparte ---------- */
  function obreroListo(game) {
    if (obrero) return obrero;
    if (obreroMuerto || !cfg(game).obrero || typeof Worker === "undefined") return null;
    try { obrero = new Worker(URL_OBRERO); }
    catch (e) { obreroMuerto = true; ESTADO.fallas.push("sin obrero: " + (e && e.message)); return null; }
    obrero.onmessage = alVolver;
    obrero.onerror = function (ev) {
      /* que no llegue a la red de errores: sin el hilo aparte, se sigue sin él */
      if (ev && ev.preventDefault) ev.preventDefault();
      morir("error del obrero: " + ((ev && ev.message) || "no cargó"));
    };
    return obrero;
  }
  function morir(motivo) {
    obreroMuerto = true;
    try { if (obrero) obrero.terminate(); } catch (e) { }
    obrero = null;
    ESTADO.fallas.push(motivo);
    if (reloj) { clearTimeout(reloj); reloj = null; }
    var t = enCurso;
    enCurso = null;
    if (t) { t.soloHilo = true; cola.unshift(t); }
    bombear();
  }
  function alVolver(e) {
    var m = (e && e.data) || {}, t = enCurso;
    if (!t || m.n !== t.n) return;
    if (reloj) { clearTimeout(reloj); reloj = null; }
    enCurso = null;
    delete pendientes[t.clave];
    if (m.ok) {
      var t0 = ahora();
      try {
        ponerTextura(t.game, t.clave, new ImageData(new Uint8ClampedArray(m.buf), t.w, t.h));
        ESTADO.obrero++;
        ESTADO.hechas.push({ clave: t.clave, por: "obrero", ms: m.ms, msLeer: t.msLeer, msPoner: Math.round(ahora() - t0) });
      } catch (err) {
        ESTADO.fallas.push(t.clave + ": " + (err && err.message));
      }
    } else {
      ESTADO.fallas.push(t.clave + ": " + m.error);
      if (t.hilo) { t.soloHilo = true; pendientes[t.clave] = true; cola.unshift(t); }
    }
    bombear();
  }

  /* de a una: la que sigue sale cuando vuelve la anterior */
  function bombear() {
    if (enCurso) return;
    while (cola.length && cola[0].game.textures.exists(cola[0].clave)) delete pendientes[cola.shift().clave];
    if (!cola.length) return;
    var t = cola.shift();
    var ob = t.soloHilo ? null : obreroListo(t.game);
    if (ob) {
      var src = fuenteDe(t.game, t.id), datos = null, t0 = ahora();
      try { datos = src ? leerPixeles(src) : null; } catch (e) { datos = null; ESTADO.fallas.push(t.clave + ": " + (e && e.message)); }
      if (!datos) { delete pendientes[t.clave]; bombear(); return; }
      t.msLeer = Math.round(ahora() - t0);
      t.n = nSig++; t.w = datos.width; t.h = datos.height;
      enCurso = t;
      var tope = cfg(t.game).tope;
      reloj = setTimeout(function () { if (enCurso === t) morir("el obrero no contestó en " + tope + " ms"); }, tope);
      try { ob.postMessage({ n: t.n, w: t.w, h: t.h, buf: datos.data.buffer, destino: t.destino, numero: numeroDe(t.game, t.id) }, [datos.data.buffer]); }
      catch (e) { morir("no se pudo mandar al obrero: " + (e && e.message)); }
      return;
    }
    if (puedeAca(t)) {
      /* sin hilo aparte, y donde se puede (la tabla, quieta): en este hilo,
         con aire entre una y otra. El permiso se vuelve a mirar al vencer
         la espera: el reloj es de la ventana y cruza el cambio de escena */
      enCurso = t;
      setTimeout(function () {
        if (enCurso === t) enCurso = null;
        delete pendientes[t.clave];
        if (puedeAca(t)) vestirAca(t.game, t.id, t.destino);
        else ESTADO.soltadas++;
        bombear();
      }, cfg(t.game).espera);
      return;
    }
    /* sin hilo aparte y sin permiso para este hilo (lo pidió el partido, o
       la tabla ya no está a la vista): se viste al usarla, como antes */
    delete pendientes[t.clave];
    ESTADO.soltadas++;
    bombear();
  }

  window.PampaVestidas = {
    /* pares = [{ id, destino, clave }] (logic/vestir.js paresAVestir).
       op.hilo: true si, sin hilo aparte, se pueden vestir en este hilo, y
       op.escena: la pantalla quieta que da ese permiso (la tabla del
       Master); vale mientras esa escena siga a la vista (puedeAca). El
       partido pasa hilo: false. Devuelve cuántas encoló. */
    preparar: function (game, pares, op) {
      if (!V || !game || !game.textures) return 0;
      op = op || {};
      var n = 0;
      (pares || []).forEach(function (p) {
        var clave = p.clave || V.claveVestida(p.id, p.destino);
        if (game.textures.exists(clave)) return;
        if (pendientes[clave]) {
          /* ya pedida: si ahora se puede usar este hilo, que valga (con el
             permiso de quien lo da ahora). Un pedido sin permiso (el
             partido) no le saca el suyo a la tabla: eso lo resuelve
             puedeAca, que pregunta si la tabla sigue a la vista */
          if (op.hilo) cola.forEach(function (t) { if (t.clave === clave) { t.hilo = true; t.escena = op.escena || null; } });
          return;
        }
        pendientes[clave] = true;
        cola.push({ game: game, id: p.id, destino: p.destino, clave: clave, hilo: !!op.hilo, escena: op.escena || null });
        n++;
      });
      bombear();
      return n;
    },
    vestirYa: vestirAca,
    estado: ESTADO
  };
})();
