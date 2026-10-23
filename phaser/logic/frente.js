/* ============================================================================
   PAMPA STAR · phaser/logic/frente.js — EL TIRO DE FRENTE AL ARCO y EL TIRO
   LIBRE (lógica PURA). Pedido de Rodri del 23/oct: cuando pateás con la
   pelota al pie, una escena de frente al arco, desde atrás de quien remata,
   con el arquero y los defensores REALES donde están en el partido. Elegís a
   qué hueco (la mira, en el plano del arco) y cómo le pegás; un toque en el
   momento justo te perfila.

   Todo va en px de la cancha del partido (st.W x st.H). La mira es { u, h }:
   u de -1 a 1 entre los palos (positivo, a la derecha de quien patea) y h de
   0 (al ras) a 1 (el travesaño). Lo que sale es la geometría: quién se cruza
   en la línea, adónde fue de verdad y cuánto le queda lejos al arquero.
   El gol lo sigue decidiendo duel.resolveShot con la zona que se arma acá.
   Perillas en balance.frente. SIN Phaser: corre en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaFrente = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rng(semilla) {
    var a = (semilla >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }

  /* el marco de quien patea: f mira al arco, l es su derecha */
  function marco(tirador, arco, am) {
    var dx = arco.x - tirador.x, dy = arco.y - tirador.y, n = Math.hypot(dx, dy) || 1;
    var f = { x: dx / n, y: dy / n };
    return { S: { x: tirador.x, y: tirador.y }, G: { x: arco.x, y: arco.y }, f: f, l: { x: -f.y, y: f.x },
      dir: arco.x >= tirador.x ? 1 : -1, am: am, dist: n };
  }
  function local(m, p) {
    var dx = p.x - m.S.x, dy = p.y - m.S.y;
    return { d: dx * m.f.x + dy * m.f.y, u: dx * m.l.x + dy * m.l.y };
  }
  function puntoDeArco(m, u) { return { x: m.G.x, y: m.G.y + u * m.am * m.dir }; }
  function uDe(m, y) { return (y - m.G.y) * m.dir / m.am; }

  /* la pelota en vuelo: t de 0 (el pie) a 1 (la línea del arco), z en altos
     de arco. CON EFECTO la abre hacia afuera del palo y la cierra adentro */
  function trayectoria(m, mira, tipo) {
    var T = puntoDeArco(m, mira.u), S = m.S;
    var lado = mira.lado || (mira.u >= 0 ? 1 : -1), cur = tipo.curva || 0, arco = tipo.arco || 0;
    return function (t) {
      var b = cur * 4 * t * (1 - t) * lado;
      return { x: S.x + (T.x - S.x) * t + m.l.x * b, y: S.y + (T.y - S.y) * t + m.l.y * b, z: mira.h * t + arco * 4 * t * (1 - t) };
    };
  }

  /* la foto: quién está, dónde y a qué profundidad, vista desde la pelota.
     defensores: [{ x, y, nombre, numero, ref }] (los reales del partido);
     arquero: { x, y, nivel }; barrera: [{...}] si es tiro libre */
  function foto(o) {
    var m = marco(o.tirador, o.arco, o.am);
    var mapa = function (j, enBarrera) {
      var L = local(m, j);
      return { ref: j.ref, nombre: j.nombre, numero: j.numero, x: j.x, y: j.y, d: L.d, u: L.u, barrera: !!enBarrera };
    };
    var defs = (o.defensores || []).map(function (j) { return mapa(j, false); })
      .concat((o.barrera || []).map(function (j) { return mapa(j, true); }))
      .filter(function (j) { return j.d > 4 && j.d < m.dist + 6; });
    var arq = o.arquero || { x: o.arco.x, y: o.arco.y, nivel: 55 };
    return {
      m: m, defensores: defs,
      arquero: { ref: arq.ref, nombre: arq.nombre, numero: arq.numero, x: arq.x, y: arq.y, nivel: arq.nivel || 55,
        u: clamp(uDe(m, arq.y), -0.9, 0.9), seTira: arq.seTira || 0 },
      libre: !!(o.barrera && o.barrera.length), salta: !!o.salta, tipos: o.tipos
    };
  }

  /* quién se cruza: el primero en el camino (t chico) que la pelota no pasa
     por arriba. La barrera que salta llega más alto, pero la rasante le pasa
     por abajo */
  function cruces(F, tray, cfg, salta) {
    var out = { tapa: null, roza: null };
    F.defensores.forEach(function (j) {
      var best = 1e9, tb = 0;
      for (var k = 1; k <= 40; k++) {
        var t = k / 40, p = tray(t), dd = Math.hypot(p.x - j.x, p.y - j.y);
        if (dd < best) { best = dd; tb = t; }
      }
      if (tb < 0.03 || tb > 0.985) return;
      var z = tray(tb).z;
      var alcance = j.barrera && salta ? cfg.alcance_barrera_salta : cfg.alcance_defensor;
      if (z >= alcance) return;
      if (j.barrera && salta && z < cfg.rasante_bajo) return;
      if (best < cfg.cuerpo_px && (!out.tapa || tb < out.tapa.t)) out.tapa = { j: j, t: tb, dist: best };
      else if (best < cfg.roce_px && (!out.roza || tb < out.roza.t)) out.roza = { j: j, t: tb, dist: best };
    });
    if (out.tapa && out.roza && out.roza.t > out.tapa.t) out.roza = null;
    return out;
  }

  function alcanceArquero(F, tipo, cfg) {
    var A = cfg.arquero, tiempo = (F.m.dist / A.tiempo_ref_px) / (tipo.vel || 1);
    return A.alcance * Math.sqrt((F.arquero.nivel || A.nivel_ref) / A.nivel_ref) * clamp(tiempo, A.tiempo_min, A.tiempo_max) * (tipo.arquero || 1) * (F.libre ? A.libre_mult : 1);
  }
  function margenArquero(F, punto, tipo, cfg, uArq) {
    var A = cfg.arquero;
    var dK = Math.abs(punto.u - uArq) + A.angulo * Math.max(0, punto.h - A.alto_desde);
    return dK - alcanceArquero(F, tipo, cfg);
  }

  /* LA LECTURA: lo que se ve antes de patear (la barrera quieta y el arquero
     donde está; lo que esconden se sabe al patear) */
  function leer(F, mira, tipoId, cfg) {
    var tipo = cfg.tipos[tipoId], mi = ajustarMira(mira, tipo);
    var c = cruces(F, trayectoria(F.m, mi, tipo), cfg, false);
    return {
      mira: mi, tapa: c.tapa ? c.tapa.j : null, roza: c.roza ? c.roza.j : null,
      fuera: Math.abs(mi.u) > 1 || mi.h > 1,
      margen: margenArquero(F, mi, tipo, cfg, F.arquero.u)
    };
  }
  function ajustarMira(mira, tipo) {
    var h = mira.h;
    if (tipo.h_min != null) h = Math.max(h, tipo.h_min);
    if (tipo.h_max != null) h = Math.min(h, tipo.h_max);
    var mi = { u: clamp(mira.u, -1.4, 1.4), h: clamp(h, 0, 1.3) };
    if (mira.lado) mi.lado = mira.lado;
    return mi;
  }

  /* el error de la pegada: peor cuanto peor el perfil (el toque a tiempo),
     el tiro, el aguante y más lejos; FUERTE tiembla más y COLOCADO menos */
  function errorDe(F, tipo, jug, calidad, cfg) {
    var E = cfg.error;
    return E.base * (tipo.error || 1) * (E.stat_techo - (jug.tiro || 55) / 100) * (1 - E.por_perfil * clamp(calidad, 0, 1))
      * (1 + E.por_cansancio * (1 - clamp(jug.aguanteFrac != null ? jug.aguanteFrac : 1, 0, 1))) * (1 + F.m.dist / E.dist_px);
  }

  /* LA VERDAD. dec: { mira, tipo, calidad }; jug: { tiro, aguanteFrac }.
     resultado: bloqueo · desvio (al córner) · afuera · palo · al_arco */
  function resolver(F, dec, jug, cfg, r) {
    r = r || Math.random;
    var tipo = cfg.tipos[dec.tipo], mi = ajustarMira(dec.mira, tipo);
    var sd = errorDe(F, tipo, jug, dec.calidad, cfg);
    var fin = { u: mi.u + gauss(r) * sd, h: clamp(mi.h + gauss(r) * sd * cfg.error.alto + (tipo.sube || 0), 0, 1.6) };
    if (mi.lado) fin.lado = mi.lado;
    var tray = trayectoria(F.m, fin, tipo);
    var c = cruces(F, tray, cfg, F.salta);
    var D = cfg.desvio;
    var uArq = clamp(F.arquero.u + (F.arquero.seTira || 0), -1, 1);
    var out = { tipo: dec.tipo, mira: mi, fin: fin, error: sd, salta: F.salta, uArquero: uArq, quien: null, desviada: false };
    if (c.tapa && r() < D.bloquea) { out.resultado = "bloqueo"; out.quien = c.tapa.j; return out; }
    var roce = c.tapa || (c.roza && r() < D.roce ? c.roza : null);
    if (roce) {
      out.desviada = true; out.quien = roce.j;
      fin.u += (r() < 0.5 ? -1 : 1) * (D.u[0] + r() * (D.u[1] - D.u[0]));
      fin.h = clamp(fin.h + D.h, 0, 1.6);
      if (Math.abs(fin.u) > 1 || fin.h > 1) { out.resultado = "desvio"; return out; }
    }
    var P = cfg.palo;
    if (Math.abs(fin.u) > 1 || fin.h > 1) {
      var au = Math.abs(fin.u);
      out.resultado = (au > 1 && au <= 1 + P.ancho && fin.h <= 1) || (fin.h > 1 && fin.h <= 1 + P.ancho && au <= 1) ? "palo" : "afuera";
      return out;
    }
    out.resultado = "al_arco";
    /* desviada, el arquero ya estaba yendo para el otro lado */
    out.margen = margenArquero(F, fin, tipo, cfg, uArq) + (out.desviada ? D.arquero_vendido : 0);
    out.zona = zonaDe(out, tipo, cfg);
    return out;
  }

  /* para duel.resolveShot: lejos del arquero suma, encima de él resta */
  function zonaDe(res, tipo, cfg) {
    var A = cfg.arquero, Z = cfg.zona;
    var b = clamp(res.margen * A.bonus_por_margen, -A.bonus_neg_max, A.bonus_pos_max) + (tipo.bonus || 0) + (res.desviada ? Z.desviada_bonus : 0);
    var esquina = Math.abs(res.fin.u) > Z.palo_desde, alto = res.fin.h > Z.alto_desde;
    var id = esquina && alto ? "angulo" : esquina ? "palo" : alto ? "medio_alto" : "medio";
    return { id: id, n: Z.nombres[id], bonus: Math.round(b * 10) / 10, fuera: 0, gy: Math.round(clamp(res.fin.u, -1, 1) * Z.gy_max) };
  }

  /* ---------------- EL TIRO LIBRE ---------------- */
  /* ¿hubo falta? accion del que quita (quite, bloqueo); perfil del club que
     la comete (o "vos"); holgura: cuánto le sobró al ganar el duelo (justo,
     más falta); cansancio de quien la comete (0 entero, 1 fundido) */
  function hayFalta(o, cfg, r) {
    var F = cfg.falta;
    if (o.enArea && !F.en_area) return false;
    var base = F.base[o.accion] || 0;
    if (!base) return false;
    var mult = F.agresividad[o.perfil] != null ? F.agresividad[o.perfil] : F.agresividad.otro;
    var justo = 1 + F.por_justo * (1 - clamp((o.holgura || 0) / F.holgura_justa, 0, 1));
    var p = clamp(base * mult * justo * (1 + F.por_cansancio * clamp(o.cansancio || 0, 0, 1)), 0, F.max);
    return (r || Math.random)() < p;
  }
  /* cerca y con ángulo, al arco; lejos, se juega rápido */
  function tiroLibre(x, y, arco, cfg) {
    var T = cfg.tiro_libre, d = Math.hypot(arco.x - x, arco.y - y);
    return { directo: d <= T.directo_max_px && Math.abs(y - arco.y) <= T.directo_ancho_px, distancia: d, metros: Math.round(d / T.px_por_metro) };
  }
  /* la barrera: los N más cerca, a la distancia reglamentaria, el de afuera
     tapando el palo de su lado y el resto hacia el medio. El arquero cubre
     lo que queda. salta y seTira se esconden hasta que pegás */
  function barrera(tirador, arco, am, candidatos, cfg, r) {
    r = r || Math.random;
    var B = cfg.barrera, m = marco(tirador, arco, am);
    var n = m.dist < B.cerca_px ? B.n[0] : m.dist < B.media_px ? B.n[1] : B.n[2];
    var lado = uDe(m, tirador.y) >= 0 ? 1 : -1;
    if (Math.abs(uDe(m, tirador.y)) < B.centrado) lado = 1;
    var palo = local(m, puntoDeArco(m, lado)), db = Math.min(B.dist_px, m.dist * 0.6);
    var lat0 = palo.u * db / palo.d + lado * B.afuera_px;
    var centro = { x: m.S.x + m.f.x * db, y: m.S.y + m.f.y * db };
    var elegidos = candidatos.slice().sort(function (a, b) {
      return Math.hypot(a.x - centro.x, a.y - centro.y) - Math.hypot(b.x - centro.x, b.y - centro.y);
    }).slice(0, n);
    var lugares = elegidos.map(function (j, k) {
      var lat = lat0 - lado * k * B.hombro_px;
      return { ref: j.ref, nombre: j.nombre, numero: j.numero, x: m.S.x + m.f.x * db + m.l.x * lat, y: m.S.y + m.f.y * db + m.l.y * lat };
    });
    var uArq = -lado * B.arquero_u;
    var pa = puntoDeArco(m, uArq);
    return {
      jugadores: lugares, lado: lado,
      arquero: { x: pa.x - m.dir * B.arquero_adelante_px, y: pa.y, seTira: r() < B.arquero_adivina ? lado * B.arquero_se_tira : 0 },
      salta: r() < B.salta
    };
  }
  /* el rival patea su tiro libre: mira la grilla como la verías vos y elige
     lo mejor que ve, con ruido según su nivel; el perfil también lo elige */
  function elegirCPU(F, cfg, r, nivel) {
    r = r || Math.random;
    var C = cfg.cpu, menu = F.libre ? cfg.menu_libre : cfg.menu_remate, mejor = null;
    menu.forEach(function (tid) {
      C.grilla_u.forEach(function (u) {
        C.grilla_h.forEach(function (h) {
          var L = leer(F, { u: u, h: h }, tid, cfg);
          var v = (L.tapa ? -2 : 0) + (L.roza ? -0.5 : 0) + (L.fuera ? -3 : 0) + L.margen + gauss(r) * C.ruido * (1.5 - clamp((nivel || 50) / 100, 0, 1));
          if (!mejor || v > mejor.v) mejor = { v: v, tipo: tid, mira: L.mira };
        });
      });
    });
    return { tipo: mejor.tipo, mira: mejor.mira, calidad: clamp(C.calidad[0] + r() * (C.calidad[1] - C.calidad[0]), 0, 1) };
  }

  /* el toque para perfilarte: la marca barre de 0 a 1 y el punto dulce es
     una franja. Sin tocar, le pega como puede */
  function calidadDePerfil(pos, cfg) {
    var P = cfg.perfil;
    if (pos == null) return P.sin_tocar;
    return clamp(1 - Math.abs(pos - P.dulce) / P.ancho, 0, 1);
  }

  /* EL TIRO CON EL DEDO (idea de Rodri del 23/oct). puntos: el camino del
     dedo en pantalla, del primero al último. o: { menu, pelota: {x, y},
     palos: [el izquierdo (u = -1), el derecho (u = +1)] en pantalla, sobre
     el pasto }. La DIRECCIÓN del arrastre elige el hueco: la recta que sale
     de la pelota con esa dirección corta la línea de los palos en u. El
     LARGO pone la fuerza. La CURVA (lo más que se aparta el dedo del camino
     recto) da el efecto, para el lado que curvó. La pegada es una de las del
     menú, sin reglas nuevas: con curva, la que más curva tiene; recta, por
     fuerza, de la más lenta a la más rápida (tipos.vel). Adentro de cada
     pegada, más fuerza la levanta, y de más se va por arriba. null: corto o
     para atrás */
  function gesto(puntos, o, cfg) {
    var G = cfg.gesto, T = cfg.tipos;
    if (!puntos || puntos.length < 2) return null;
    var A = puntos[0], Z = puntos[puntos.length - 1], dx = Z.x - A.x, dy = Z.y - A.y, largo = Math.hypot(dx, dy);
    if (largo < G.min_px) return null;
    var P = o.pelota, a = o.palos[0], b = o.palos[1], ex = b.x - a.x, ey = b.y - a.y, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) return null;
    var apx = a.x - P.x, apy = a.y - P.y;
    if ((apx * ey - apy * ex) / den <= 0) return null;
    var u = -1 + 2 * (apx * dy - apy * dx) / den;
    /* la derecha de la pantalla, mirando hacia adonde va el dedo */
    var nx = -dy / largo, ny = dx / largo, dev = 0;
    puntos.forEach(function (p) { var e = (p.x - A.x) * nx + (p.y - A.y) * ny; if (Math.abs(e) > Math.abs(dev)) dev = e; });
    var curva = dev / largo, fuerza = clamp(largo / G.largo_px, 0, G.fuerza_max);
    var conCurva = o.menu.slice().sort(function (x, y) { return (T[y].curva || 0) - (T[x].curva || 0); })[0];
    var curvo = Math.abs(curva) >= G.curva_min && (T[conCurva].curva || 0) > 0;
    var tipo;
    if (curvo) tipo = conCurva;
    else {
      var rectas = o.menu.filter(function (t) { return t !== conCurva; }).sort(function (x, y) { return T[x].vel - T[y].vel; });
      var n = rectas.length, k = Math.min(n - 1, Math.floor(Math.min(fuerza, 0.999) * n));
      tipo = rectas[k];
    }
    /* revisión del 23/oct: la altura sube pareja con el largo, en todas las
       pegadas. Antes subía adentro de cada una y volvía al ras al pasar a la
       siguiente: 150 px era al travesaño y 160 px al pasto */
    var mira = { u: clamp(u, -1.4, 1.4), h: clamp(G.alto[0] + (G.alto[1] - G.alto[0]) * fuerza, 0, 1.3) };
    if (curvo) mira.lado = curva > 0 ? 1 : -1;
    var nivel = 0;
    while (nivel < G.cortes.length && fuerza >= G.cortes[nivel]) nivel++;
    return { tipo: tipo, mira: mira, fuerza: fuerza, curva: curva, curvo: curvo, nivel: nivel, palabra: G.palabras[nivel] };
  }

  return {
    gesto: gesto,
    rng: rng, marco: marco, local: local, puntoDeArco: puntoDeArco, uDe: uDe,
    trayectoria: trayectoria, foto: foto, leer: leer, resolver: resolver, hayFalta: hayFalta, tiroLibre: tiroLibre, barrera: barrera,
    elegirCPU: elegirCPU, calidadDePerfil: calidadDePerfil
  };
});
