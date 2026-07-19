/* ============================================================================
   PAMPA STAR · phaser/logic/master.js — MODO MASTER (lógica pura, V6 §8)
   La escalera de divisiones con dificultad FIJA (nunca elástica: los de la B
   son flojos, los de la A son duros, cada ascenso SE SIENTE) y los PERFILES
   DE IA por rival (un rival estrella se siente distinto de uno de pueblo).
   La carrera (temporada, ascensos, mejora entre temporadas) vive HOY en el
   motor clásico: este módulo le da al partido Phaser la dificultad y el
   carácter del rival según el nivel de esa carrera. Corre en node (tests).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaMaster = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* del potrero al Mundial: dificultad FIJA por división */
  var DIVISIONES = [
    { id: "primera_b", n: "PRIMERA B", mult_stats: 0.82, keeper: 40 },
    { id: "primera_a", n: "PRIMERA A", mult_stats: 0.95, keeper: 50 },
    { id: "regional", n: "REGIONAL", mult_stats: 1.05, keeper: 62 },
    { id: "nacional", n: "NACIONAL", mult_stats: 1.16, keeper: 74 },
    { id: "mundial", n: "EL MUNDIAL", mult_stats: 1.3, keeper: 88 }
  ];
  function divisionPorNivel(nivel) {
    var i = Math.min(DIVISIONES.length - 1, Math.max(0, Math.floor(((nivel || 1) - 1) / 2)));
    return DIVISIONES[i];
  }

  /* perfiles de IA: determinista por club → mismo rival, misma identidad SIEMPRE */
  /* V8 §2: `linea` = cuánto adelanta (o repliega, negativo) la línea entera
     del club en px de equipo — un club de garra presiona arriba, uno de
     pelotazo se mete atrás. Lo consume la IA de los 21 (partido.ia_linea). */
  var PERFILES = [
    { id: "garra", n: "pura garra", cpu_pesos: { quite: 0.55, corte: 0.25, bloqueo: 0.2 }, persecutores: 2, mult: 1.0, linea: 30 },
    { id: "toque", n: "de toque", cpu_pesos: { quite: 0.25, corte: 0.5, bloqueo: 0.25 }, persecutores: 1, mult: 1.0, linea: 0 },
    { id: "pelotazo", n: "de pelotazo", cpu_pesos: { quite: 0.3, corte: 0.25, bloqueo: 0.45 }, persecutores: 1, mult: 0.96, linea: -40 },
    { id: "estrella", n: "con una ESTRELLA", cpu_pesos: { quite: 0.34, corte: 0.33, bloqueo: 0.33 }, persecutores: 2, mult: 1.1, linea: 15 }
  ];
  function hashClub(nombre) {
    var h = 0, s = String(nombre || "rival");
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function perfilRival(nombreClub) {
    return PERFILES[hashClub(nombreClub) % PERFILES.length];
  }

  /* aplica división + perfil al estado del partido (una vez, tras crearPartido) */
  function aplicar(st, division, perfil) {
    st.rivalKeeperSkill = division.keeper;
    var m = division.mult_stats * (perfil.mult || 1);
    st.rivales.forEach(function (j) {
      if (!j.stats) return;
      Object.keys(j.stats).forEach(function (k) {
        j.stats[k] = Math.max(20, Math.min(99, Math.round(j.stats[k] * m)));
      });
    });
    /* SIN mutar el balance compartido: se reasigna una copia solo para este partido */
    if (st.bal && perfil.cpu_pesos) {
      st.bal = Object.assign({}, st.bal, {
        partido: Object.assign({}, st.bal.partido, { cpu_pesos: perfil.cpu_pesos, ia_linea: perfil.linea || 0 }),
        ritmo: Object.assign({}, st.bal.ritmo, { persecutores: perfil.persecutores || st.bal.ritmo.persecutores })
      });
    }
    st._master = { division: division.id, perfil: perfil.id };
    return st;
  }

  return { DIVISIONES: DIVISIONES, divisionPorNivel: divisionPorNivel, PERFILES: PERFILES, perfilRival: perfilRival, aplicar: aplicar, hashClub: hashClub };
});
