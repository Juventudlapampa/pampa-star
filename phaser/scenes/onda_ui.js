/* ============================================================================
   PAMPA STAR · phaser/scenes/onda_ui.js · LA ONDA DE LAS JUGADAS

   Pedido de Rodri del 20/oct: la animación de la gambeta (y otras) está
   floja, y el juego se tiene que sentir épico, como un anime de fútbol de los
   80. Las ilustraciones no se animan (pose quieta, corte seco); lo que se
   mueve es lo que las rodea. Esto se suma a las viñetas de la gambeta, la
   pared, el pase, el quite, el corte y el bloqueo, ganadas o perdidas:

     entrada   líneas de velocidad paralelas en el sentido de la jugada (las
               radiales quedan para el impacto), la pelota con estela y, al
               caer la pose, el nombre de la jugada grande;
     clavar    en el silencio, corte seco a un plano más cerca del contacto;
     impacto   UN cuadro con las figuras en tinta sobre papel (en negativo si
               la jugada fue contra vos) y líneas de foco; en los choques, el
               sacudón corto de cámara;
     revelar   corte seco al plano del resultado, la pelota que sale para el
               que se la queda y la tribuna en primer plano con la hinchada
               grabada: brazos arriba con el rumor (el festejo si bloqueaste
               un tiro), o las manos en la cabeza con el "uhhh".

   Lo único que suma tiempo es el cuadro de impacto (balance.onda.impacto_ms);
   lo demás pasa encima de tiempos que ya existían. Con intensidad 0 la viñeta
   queda como antes. Con "reducir movimiento" del sistema operativo
   (prefers-reduced-motion) no hay sacudón ni cuadro de impacto, y las líneas
   y la tribuna quedan quietas.

   Nada de esto dice algo que no digan el cartel y las placas. El negativo del
   impacto es luz contra sombra, no un color.
   ========================================================================== */
(function () {
  "use strict";

  var W = 960, H = 540;
  var PAPEL = 0xf6efdc, TINTA = 0x0a1f13;
  var NOMBRES = {
    gambeta: "¡GAMBETA!", pared: "¡PARED!", pase: "¡PASE!", vacio: "¡AL VACÍO!", centro: "¡CENTRO!", aire: "¡AL AIRE!",
    quite: "¡QUITE!", corte: "¡CORTE!", bloqueo: "¡BLOQUEO!"
  };

  function cfg(sc) {
    var o = sc.BAL && sc.BAL.onda;
    if (!o || !(o.intensidad > 0)) return null;
    return {
      k: o.intensidad,
      quieto: sc.movimientoSuave(),
      impacto_ms: sc.msV(o.impacto_ms),
      corte_cerca: o.corte_cerca, corte_revela: o.corte_revela,
      sacudon_ms: o.sacudon_ms, sacudon: o.sacudon, lineas: o.lineas
    };
  }

  /* el corte seco: figuras, pintura y lo dibujado en el fondo saltan juntos a
     otro encuadre, sin tween. Los carteles (cineInfo, cineBig) no se tocan. */
  function encuadre(sc, s, fx, fy) {
    var px = fx * (1 - s), py = fy * (1 - s);
    sc.cineContent.setScale(s).setPosition(px, py);
    sc.cineBG.setScale(s).setPosition(px, py);
    if (sc.cineFondo && sc.cineFondo.visible) sc.cineFondo.setScale(s).setPosition(px + W / 2 * s, py + H / 2 * s);
  }

  function focoDe(sp, sr) {
    if (!sr || !sr.active) return { x: sp.x, y: sp.y };
    return { x: (sp.x + sr.x) / 2, y: (sp.y + sr.y) / 2 };
  }

  /* fantasmas de la pelota mientras viaja; se apaga sola cuando la pelota
     deja de existir (la viñeta se cerró) */
  function estela(sc, bola) {
    if (bola._estela) return;
    bola._estela = true;
    var ult = { x: bola.x, y: bola.y };
    var ev = sc.time.addEvent({
      delay: 30, loop: true, callback: function () {
        var cont = bola.parentContainer;
        if (!bola.active || !cont) { ev.remove(false); return; }
        if (Math.hypot(bola.x - ult.x, bola.y - ult.y) < 5) return;
        ult.x = bola.x; ult.y = bola.y;
        var f = sc.add.image(bola.x, bola.y, bola.texture.key, bola.frame.name)
          .setScale(bola.scaleX, bola.scaleY).setAngle(bola.angle).setAlpha(0.5).setTintFill(PAPEL);
        cont.addAt(f, cont.getIndex(bola));
        sc.tweens.add({
          targets: f, alpha: 0, scaleX: bola.scaleX * 0.55, scaleY: bola.scaleY * 0.55, duration: 200,
          onComplete: function () { f.destroy(); }
        });
      }
    });
  }

  /* las líneas paralelas: cuñas finas en la punta que va hacia `flujo`.
     Las posiciones salen de una cuenta fija y no del azar: la misma jugada se
     ve igual cada vez. */
  function lineas(sc, C, flujo) {
    var g = sc.add.graphics();
    sc.cineContent.addAt(g, 0);
    var n = Math.max(4, Math.round(C.lineas * Math.min(1.5, C.k)));
    var tramo = W + 600, rayos = [];
    for (var i = 0; i < n; i++) {
      rayos.push({
        x: (i * 331) % tramo - 300, y: 60 + (i * 197) % 410,
        largo: 160 + (i * 89) % 300, ancho: i % 5 === 0 ? 8 : 3 + (i % 3), vel: 1.5 + (i % 5) * 0.35
      });
    }
    /* debajo de las líneas, la pintura se apaga un poco: sobre el cielo claro
       las líneas no se veían, y el fondo que cae mientras pasa la jugada es
       el recurso del anime; vuelve entero en el plano del resultado */
    var pintar = function (dt) {
      g.clear();
      g.fillStyle(TINTA, 0.4);
      g.fillRect(-W, -H, W * 3, H * 3);
      rayos.forEach(function (r) {
        r.x = ((r.x + flujo * r.vel * dt + 300) % tramo + tramo) % tramo - 300;
        var punta = flujo < 0 ? r.x : r.x + r.largo, cola = flujo < 0 ? r.x + r.largo : r.x;
        g.fillStyle(PAPEL, r.ancho >= 8 ? 0.85 : 0.6);
        g.fillTriangle(punta, r.y, cola, r.y - r.ancho, cola, r.y + r.ancho);
      });
    };
    pintar(0);
    if (C.quieto) return { g: g, tw: null };
    var antes = 0;
    var correr = function (t) {
      var v = t.getValue(), dt = v - antes;
      if (dt < 0) dt += 1000;
      antes = v;
      pintar(dt);
    };
    var tw = sc.tweens.addCounter({ from: 0, to: 1000, duration: 1000, repeat: -1, onUpdate: correr });
    g.once("destroy", function () { tw.stop(); });
    return { g: g, tw: tw };
  }

  function focoRadial(g, cx, cy, color, k) {
    var n = Math.round(30 * Math.min(1.5, k));
    g.fillStyle(color, 1);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + (i % 3) * 0.05;
      var r0 = 90 + (i * 37) % 70, r1 = 1100, w = 5 + (i % 3) * 5;
      var co = Math.cos(a), si = Math.sin(a);
      g.fillTriangle(cx + co * r0, cy + si * r0,
        cx + co * r1 - si * w, cy + si * r1 + co * w,
        cx + co * r1 + si * w, cy + si * r1 - co * w);
    }
  }

  /* la tribuna en primer plano, de espaldas, pegada al borde de abajo */
  function tribuna(sc, aFavor, C) {
    var n = 15, paso = W / (n - 1);
    for (var i = 0; i < n; i++) {
      var g = sc.add.graphics();
      var e = 0.85 + ((i * 7) % 5) * 0.08;
      g.fillStyle(TINTA, 0.94);
      g.fillCircle(0, -30 * e, 17 * e);
      g.fillRoundedRect(-27 * e, -14 * e, 54 * e, 44 * e, 10 * e);
      g.lineStyle(9 * e, TINTA, 0.94);
      if (aFavor) {
        var abre = i % 2 ? 1 : 0.7;
        g.lineBetween(-20 * e, -6 * e, -34 * e * abre, -66 * e);
        g.lineBetween(20 * e, -6 * e, 34 * e * abre, -64 * e);
        g.fillCircle(-34 * e * abre, -68 * e, 7 * e); g.fillCircle(34 * e * abre, -66 * e, 7 * e);
      } else {
        /* las manos a la cabeza, con los codos afuera; esta no salta */
        g.lineBetween(-22 * e, -6 * e, -42 * e, -38 * e); g.lineBetween(-42 * e, -38 * e, -17 * e, -50 * e);
        g.lineBetween(22 * e, -6 * e, 42 * e, -38 * e); g.lineBetween(42 * e, -38 * e, 17 * e, -50 * e);
        g.fillCircle(-15 * e, -50 * e, 7 * e); g.fillCircle(15 * e, -50 * e, 7 * e);
      }
      g.setPosition(i * paso + ((i * 13) % 9) - 4, H + 14 + ((i * 5) % 4) * 3);
      sc.cineInfo.add(g);
      if (C.quieto || !aFavor) continue;
      sc.tweens.add({ targets: g, y: g.y - (10 + (i * 3) % 8), duration: 150 + (i % 4) * 30, yoyo: true, repeat: -1, delay: (i % 5) * 40 });
      g.once("destroy", function () { sc.tweens.killTweensOf(this); }, g);
    }
  }

  function hinchada(sc, jugada, aFavor) {
    var S = sc.SFX;
    if (!S) return;
    if (!aFavor) { S.afuera(); return; }          // el "uhhh"
    if (jugada === "bloqueo") S.festejo(700);       // le tapaste un tiro: es casi un atajadón
    else S.crowd(900, 120);
  }

  /* la pelota sale para el que se la queda: si es el protagonista, de largo
     en el sentido en que mira; si no, hacia el otro cuerpo del plano. Sin
     pelota dibujada (el quite, el corte, el bloqueo) salta del contacto. */
  function soltarPelota(sc, o, foco) {
    var sp = o.sp, sr = o.sr, bola = o.bola;
    var protaSeLaQueda = o.protaEsVos === o.aFavor;
    var alPie = function (f) { return { x: f.x, y: f.y + f.displayHeight * 0.42 }; };
    var x1, y1, d;
    if (!bola) {
      if (!sr || !sr.active) return;
      var TP = sc.texPelota(34);
      bola = sc.add.sprite(foco.x, sp.y + sp.displayHeight * 0.38, TP.key).setScale(TP.esc);
      sc.cineContent.add(bola);
      d = alPie(protaSeLaQueda ? sp : sr);
      x1 = d.x; y1 = d.y;
    } else if (protaSeLaQueda || !sr || !sr.active) { x1 = bola.x + o.dir * 150; y1 = bola.y + 8; }
    else { d = alPie(sr); x1 = d.x; y1 = d.y; }
    var x0 = bola.x, y0 = bola.y;
    estela(sc, bola);
    var p = { v: 0 };
    var volar = function () {
      if (!bola.active) return;
      bola.setPosition(x0 + (x1 - x0) * p.v, y0 + (y1 - y0) * p.v - 90 * Math.sin(Math.PI * p.v));
      bola.setAngle(720 * p.v * (x1 >= x0 ? 1 : -1));
    };
    sc.tweens.add({ targets: p, v: 1, duration: sc.msV(260), ease: "Quad.easeOut", onUpdate: volar });
  }

  function limpiarEntrada(h) {
    if (h.nombre) { h.nombre.remove(false); h.nombre = null; }
    if (h.texto) { h.texto.destroy(); h.texto = null; }
    if (h.lineas) { h.lineas.g.destroy(); h.lineas = null; }
  }

  window.PampaOnda = {
    cfg: cfg,
    NOMBRES: NOMBRES,

    /* o = { jugada, flujo (-1 o 1: hacia dónde corren las líneas), bola,
             tNombre (cuándo cae la pose), aFavor }. Devuelve el manejo que
             piden clavar, impacto y revelar, o null con la perilla en 0. */
    entrada: function (sc, o) {
      var C = cfg(sc);
      if (!C) return null;
      var h = { C: C, o: o, lineas: lineas(sc, C, o.flujo), nombre: null, texto: null };
      if (o.bola) estela(sc, o.bola);
      h.nombre = sc.time.delayedCall(o.tNombre, function () {
        h.nombre = null;
        var t = sc.add.text(o.nombreX || 560, 74, NOMBRES[o.jugada], {
          fontFamily: window.PF.display, fontSize: "56px", color: "#ffd84d",
          stroke: "#0a1f13", strokeThickness: 10
        }).setOrigin(0.5).setAngle(-7);
        t.setShadow(6, 6, "#0a1f13", 0, true, true);
        sc.cineInfo.add(t);
        h.texto = t;
        /* entra un 30% más grande y al cuadro siguiente queda en su lugar:
           es un sello, no un tween */
        t.setScale(1.3);
        sc.time.delayedCall(50, function () { if (t.active) t.setScale(1); });
      });
      return h;
    },

    /* el primer plano del silencio va al contacto: la pelota si está en el
       plano, si no los pies de los dos */
    clavar: function (sc, h, sp, sr, bola) {
      if (h.lineas && h.lineas.tw) { h.lineas.tw.stop(); h.lineas.tw = null; }
      var f;
      if (bola && bola.active) f = { x: bola.x, y: bola.y - 30 };
      else {
        var pie = function (o) { return o.y + o.displayHeight * 0.35; };
        f = sr && sr.active ? { x: (sp.x + sr.x) / 2, y: (pie(sp) + pie(sr)) / 2 - 30 } : { x: sp.x, y: pie(sp) - 30 };
      }
      encuadre(sc, 1 + h.C.corte_cerca * h.C.k, f.x, f.y);
    },

    /* o = { sp, sr, bola, choque, alTerminar }. Devuelve cuánto dura. */
    impacto: function (sc, h, o) {
      var C = h.C;
      limpiarEntrada(h);
      /* L11: el cuadro de impacto es un destello (papel contra tinta en toda
         la pantalla): sin cupo en la escena, no sale */
      if (C.quieto || !sc.cupoDestello()) { o.alTerminar(); return 0; }
      if (o.choque) sc.sacudir(sc.uiCam, C.sacudon_ms, C.sacudon * C.k, true);
      var aFavor = h.o.aFavor, cont = sc.cineContent, capa = [];
      var fondo = sc.add.rectangle(W / 2, H / 2, W * 3, H * 3, aFavor ? PAPEL : TINTA);
      cont.add(fondo); capa.push(fondo);
      var g = sc.add.graphics();
      cont.add(g); capa.push(g);
      var f = focoDe(o.sp, o.sr);
      focoRadial(g, f.x, f.y, aFavor ? TINTA : PAPEL, C.k);
      [o.sp, o.sr, o.bola].forEach(function (fig) {
        if (!fig || !fig.active) return;
        var s = sc.add.image(fig.x, fig.y, fig.texture.key, fig.frame.name)
          .setOrigin(fig.originX, fig.originY).setScale(fig.scaleX, fig.scaleY)
          .setFlipX(fig.flipX).setAngle(fig.angle).setTintFill(aFavor ? TINTA : PAPEL);
        cont.add(s); capa.push(s);
      });
      sc.time.delayedCall(C.impacto_ms, function () {
        capa.forEach(function (x) { x.destroy(); });
        o.alTerminar();
      });
      return C.impacto_ms;
    },

    /* o = { sp, sr, bola, protaEsVos, dir, foco, soltar } con foco el cuerpo
       que se lleva el golpe del cartel; sin soltar, la pelota la mueve la
       escena (el pase ya la lleva a destino o al pie del que cortó). */
    revelar: function (sc, h, o) {
      var C = h.C;
      limpiarEntrada(h);
      var f = o.foco || focoDe(o.sp, o.sr);
      encuadre(sc, 1 + C.corte_revela * C.k, f.x, f.y);
      if (o.soltar) soltarPelota(sc, { sp: o.sp, sr: o.sr, bola: o.bola, protaEsVos: o.protaEsVos, aFavor: h.o.aFavor, dir: o.dir }, focoDe(o.sp, o.sr));
      tribuna(sc, h.o.aFavor, C);
      hinchada(sc, h.o.jugada, h.o.aFavor);
    }
  };
})();
