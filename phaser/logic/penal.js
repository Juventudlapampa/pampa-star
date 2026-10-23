/* ============================================================================
   PAMPA STAR · phaser/logic/penal.js — LÓGICA PURA (sin Phaser, sin DOM)
   EL PENAL (decisión que Rodri delegó, 23/oct): una falta dentro del área es
   penal. Lo pateás en la escena de frente al arco (frente_ui.js) contra el
   arquero solo; el de ellos lo atajás eligiendo para qué lado tirarte
   mientras el que patea se perfila, con su postura como pista.

   El arco se mira como se ve en la pantalla: u de -1 (palo de la izquierda)
   a 1 (palo de la derecha), h de 0 (el piso) a 1 (el travesaño). Seis zonas:
   izq, medio y der, cada una baja o alta. El arquero va a uno de cinco
   lados (DIRS) y cada lado cubre las zonas con lo que dice balance.penal.cubre.

   La tanda (nuevaTanda, anotar) queda para definir copas o el Mundial.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaPenal = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DIRS = ["izquierda", "medio", "derecha", "arriba", "abajo"];
  var ZONAS = ["izq_bajo", "izq_alto", "medio_bajo", "medio_alto", "der_bajo", "der_alto"];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sortear(pesos, r) {
    var ks = Object.keys(pesos), tot = 0, i;
    for (i = 0; i < ks.length; i++) tot += pesos[ks[i]];
    var x = r() * tot;
    for (i = 0; i < ks.length; i++) { if (x < pesos[ks[i]]) return ks[i]; x -= pesos[ks[i]]; }
    return ks[ks.length - 1];
  }

  function zonaDe(u, h, cfg) {
    var col = u < -cfg.tercio ? "izq" : u > cfg.tercio ? "der" : "medio";
    return col + "_" + (h >= cfg.alto_desde ? "alto" : "bajo");
  }
  /* para dónde tiene que ir el arquero para esa zona */
  function dirDeZona(z) {
    if (z.indexOf("izq") === 0) return "izquierda";
    if (z.indexOf("der") === 0) return "derecha";
    return z === "medio_alto" ? "arriba" : "medio";
  }

  /* cuánto ataja el que se tiró a dir un tiro que llega a (u, h). tipo: la
     pegada de balance.frente.tipos (vel: la fuerte entra más) */
  function probAtajar(dir, u, h, tipo, nivel, cfg) {
    var cub = ((cfg.cubre[dir] || {})[zonaDe(u, h, cfg)]) || 0;
    var esquina = clamp((Math.abs(u) - cfg.esquina_desde) / (1 - cfg.esquina_desde), 0, 1);
    cub *= 1 - cfg.por_esquina * esquina;
    cub *= 1 - cfg.por_vel * Math.max(0, ((tipo && tipo.vel) || 1) - 1);
    cub *= 1 + cfg.por_nivel * ((nivel != null ? nivel : cfg.nivel_ref) - cfg.nivel_ref);
    return clamp(cub, 0, cfg.max);
  }

  /* o: { u, h, fuera, palo, tipo, dir, nivel }. fuera y palo salen de la
     geometría del remate (frente.resolver); el resto lo decide el arquero */
  function resolver(o, cfg, r) {
    var z = zonaDe(o.u, o.h, cfg);
    if (o.palo) return { resultado: "palo", zona: z, dir: o.dir, p: 0 };
    if (o.fuera) return { resultado: "afuera", zona: z, dir: o.dir, p: 0 };
    var p = probAtajar(o.dir, o.u, o.h, o.tipo, o.nivel, cfg);
    return { resultado: r() < p ? "atajada" : "gol", zona: z, dir: o.dir, p: p };
  }

  /* EL ARQUERO DE LA CPU, en tu penal: con lee lo adivina (va para el lado
     al que apuntaste); si no, se tira a la suerte con cpu.pesos */
  function arqueroCPU(apunta, nivel, cfg, r) {
    var C = cfg.cpu;
    var lee = clamp(C.lee_base + ((nivel != null ? nivel : cfg.nivel_ref) - cfg.nivel_ref) * C.lee_por_nivel, 0, C.lee_max);
    if (r() < lee) return { dir: dirDeZona(zonaDe(apunta.u, apunta.h, cfg)), leyo: true, lee: lee };
    return { dir: sortear(C.pesos, r), leyo: false, lee: lee };
  }

  /* EL QUE PATEA DE LA CPU, en el penal de ellos: adónde va, con qué pegada,
     y la postura que se le ve mientras se perfila. La pista dice la verdad con
     fiable (uno con más TIRO disimula mejor); si no, apunta a otro lado */
  function pateadorCPU(tiro, cfg, r) {
    var C = cfg.cpu, PI = cfg.pista;
    var z = sortear(C.zonas, r), col = z.split("_")[0], fila = z.split("_")[1];
    var lado = C.u_lado[0] + r() * (C.u_lado[1] - C.u_lado[0]);
    var u = col === "izq" ? -lado : col === "der" ? lado : (r() - 0.5) * 2 * C.u_medio;
    var h = fila === "alto" ? C.h_alto[0] + r() * (C.h_alto[1] - C.h_alto[0]) : C.h_bajo[0] + r() * (C.h_bajo[1] - C.h_bajo[0]);
    var verdad = dirDeZona(z);
    var fiable = clamp(PI.fiable - ((tiro != null ? tiro : cfg.nivel_ref) - cfg.nivel_ref) * PI.por_tiro, PI.min, PI.max);
    var dir = verdad;
    if (r() >= fiable) {
      var otras = DIRS.filter(function (d) { return d !== verdad; });
      dir = otras[Math.floor(r() * otras.length) % otras.length];
    }
    var frases = PI.textos[dir] || [""];
    return {
      tipo: r() < C.fuerte ? "fuerte" : "colocado", mira: { u: u, h: h },
      calidad: clamp(C.calidad[0] + r() * (C.calidad[1] - C.calidad[0]), 0, 1),
      zona: z, verdad: verdad,
      pista: { dir: dir, texto: frases[Math.floor(r() * frases.length) % frases.length], fiable: fiable }
    };
  }

  /* la elección del arquero con el mouse o el dedo: el punto del arco que
     tocaste. A los costados, ese lado; al medio, arriba, abajo o quedarse */
  function dirDePunto(u, h, cfg) {
    if (u < -cfg.tercio) return "izquierda";
    if (u > cfg.tercio) return "derecha";
    if (h >= cfg.alto_desde) return "arriba";
    return h < cfg.abajo_hasta ? "abajo" : "medio";
  }

  /* ══ LA TANDA ══ cinco por lado y, si siguen iguales, de a uno hasta que
     uno meta y el otro no. a patea primero. */
  function nuevaTanda(n) { return { n: n || 5, a: [], b: [], turno: "a", terminada: false, ganador: null }; }
  function cuenta(l) { return l.filter(Boolean).length; }
  function anotar(t, gol) {
    if (t.terminada) throw new Error("la tanda ya terminó: ganó " + t.ganador);
    t[t.turno].push(!!gol);
    t.turno = t.turno === "a" ? "b" : "a";
    var ga = cuenta(t.a), gb = cuenta(t.b), na = t.a.length, nb = t.b.length;
    if (na <= t.n && nb <= t.n) {
      if (ga > gb + (t.n - nb)) t.ganador = "a";
      else if (gb > ga + (t.n - na)) t.ganador = "b";
    } else if (na === nb && ga !== gb) t.ganador = ga > gb ? "a" : "b";
    t.terminada = !!t.ganador;
    return t;
  }
  function marcador(t) { return { a: cuenta(t.a), b: cuenta(t.b) }; }

  return {
    DIRS: DIRS, ZONAS: ZONAS, zonaDe: zonaDe, dirDeZona: dirDeZona, dirDePunto: dirDePunto,
    probAtajar: probAtajar, resolver: resolver, arqueroCPU: arqueroCPU, pateadorCPU: pateadorCPU,
    nuevaTanda: nuevaTanda, anotar: anotar, marcador: marcador
  };
});
