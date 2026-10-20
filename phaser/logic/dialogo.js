/* ============================================================================
   PAMPA STAR · phaser/logic/dialogo.js — LOS DIÁLOGOS (lógica PURA)
   Playtest de Rodri del 20/oct, puntos 3 y 4: el texto de la entrevista, del
   evento de la semana y de la previa de la fecha aparece letra por letra, con
   una "voz" de madera por personaje; cada opción lleva su dibujito; la previa
   cuenta quién es el rival, su estrella, algo de su localidad y una frase del
   relator. Acá van las cuentas; el dibujo vive en scenes/master.js y el
   sonido en audio/sfx.js (voz). Perillas en balance.dialogo. SIN Phaser.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaDialogo = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function letrasA(ms, total, msLetra) {
    return Math.max(0, Math.min(total, Math.floor(ms / msLetra)));
  }
  /* los espacios y la puntuación no hablan: la voz cae en las letras */
  function conVoz(ch) {
    return /[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(ch);
  }
  /* la voz del que habla: un tono base y una vuelta chica cada tres letras,
     que es lo que la hace sonar a frase y no a reloj */
  function tono(cfg, quien, n) {
    var v = cfg.voces[quien];
    if (!v) throw new Error("balance.dialogo.voces no tiene a " + quien);
    var vuelta = cfg.vuelta[n % cfg.vuelta.length];
    return { rate: v.rate * vuelta, gain: v.gain };
  }

  /* EL DIBUJITO DEL EVENTO sale de lo que la opción cambia: el efecto más
     grande a favor. La palabra de abajo dice lo mismo sin números. */
  var ICONO_DE_EFECTO = {
    tiro: "botin", pase: "pase", gambeta: "gambeta", aguante: "corazon",
    fisico: "pesa", recuperacion: "cruz", arranque: "reloj1", final: "reloj2",
    envion: "rayo", caracter: "flecha", duelo: "choque", keeper: "guante"
  };
  var PALABRA_DE_EFECTO = {
    tiro: "tiro", pase: "pase", gambeta: "gambeta", aguante: "aguante",
    fisico: "físico", recuperacion: "recuperación", arranque: "primer tiempo",
    final: "segundo tiempo", envion: "envión", caracter: "carácter",
    duelo: "mano a mano", keeper: "tu arquero"
  };
  /* recuperacion es un multiplicador (1 = igual); el resto, un bonus */
  function signo(k, v) { return k === "recuperacion" ? v - 1 : v; }
  function efectosOrdenados(efecto) {
    return Object.keys(efecto || {}).filter(function (k) { return PALABRA_DE_EFECTO[k] && signo(k, efecto[k]) !== 0; })
      .sort(function (a, b) {
        var sa = signo(a, efecto[a]), sb = signo(b, efecto[b]);
        if ((sa > 0) !== (sb > 0)) return sa > 0 ? -1 : 1;
        return Math.abs(sb) - Math.abs(sa);
      });
  }
  /* seis opciones no cambian nada (efecto vacío): "Las dejo para la vuelta",
     "Estudio después"... también llevan dibujito y bajada */
  function iconoDeEfecto(efecto) {
    var ks = efectosOrdenados(efecto);
    return ks.length ? ICONO_DE_EFECTO[ks[0]] : "igual";
  }
  function bajadaDeEfecto(efecto) {
    var ks = efectosOrdenados(efecto);
    if (!ks.length) return "todo igual";
    return ks.slice(0, 2).map(function (k) {
      return (signo(k, efecto[k]) > 0 ? "más " : "menos ") + PALABRA_DE_EFECTO[k];
    }).join(", ");
  }

  /* ══════════════════════════════════════════════════════════════════════
     LA PREVIA DE LA FECHA.

     La localidad del rival sale del roster: el club que una localidad tiene
     declarado como clásico, o la localidad que aparece en el nombre. La
     estrella es la mejor de esa localidad (sin el arquero); en la Primera B
     y la A, si el club no tiene localidad, la elige el nombre del club entre
     las del roster. Más arriba juegan equipos de región, de país y
     selecciones: ahí el roster pampeano no tiene a nadie y no se inventa.

     o: { rival, division, roster, previa (relatos.previa_fecha), relatores
     (relatos.relatores), perfil (texto), puesto, fecha, hash(texto) }
     ══════════════════════════════════════════════════════════════════════ */
  function localidadDe(rival, roster) {
    var cp = roster.clubes_por_pueblo;
    var porNombre = Object.keys(cp).filter(function (p) { return rival.indexOf(p) >= 0; })[0];
    if (porNombre) return porNombre;
    return Object.keys(cp).filter(function (p) { return cp[p].clasico === rival; })[0] || null;
  }
  function sumaStats(j) {
    var s = j.stats_auto || {};
    return Object.keys(s).reduce(function (a, k) { return a + s[k]; }, 0);
  }
  function estrellaDe(rival, division, roster, hash) {
    var loc = localidadDe(rival, roster);
    var campo = roster.jugadores.filter(function (j) { return j.posicion_motor !== "ARQ"; });
    if (loc) {
      var deAhi = campo.filter(function (j) { return j.pueblo === loc; })
        .sort(function (a, b) { return sumaStats(b) - sumaStats(a); });
      if (deAhi.length) return deAhi[0];
    }
    if (division !== "primera_b" && division !== "primera_a") return null;
    return campo[hash(rival) % campo.length];
  }
  function llenar(t, d) {
    return String(t).replace(/\{(\w+)\}/g, function (m, k) {
      if (d[k] == null) throw new Error("la previa pide {" + k + "} y no hay dato");
      return d[k];
    });
  }
  function previaDeLaFecha(o) {
    var P = o.previa, h = o.hash;
    var loc = localidadDe(o.rival, o.roster);
    var est = estrellaDe(o.rival, o.division, o.roster, h);
    var de = function (lista, sal) { return lista[(h(o.rival) + sal + (o.fecha | 0)) % lista.length]; };
    /* en la primera fecha la tabla está en cero y el puesto no dice nada */
    var tabla = (o.fecha | 0) > 0 ? o.puesto + " en la tabla" : P.tabla_en_cero;
    var datos = { rival: o.rival, perfil: o.perfil, tabla: tabla, localidad: loc };
    var paginas = [llenar(de(P.rival, 0), datos)];
    if (est) {
      paginas.push(llenar(de(P.estrella, 1), { nombre: est.nombre, apodo: est.apodo, puesto_cancha: P.puestos[est.posicion_motor] }) + " " + est.historia);
    }
    var lugar = loc ? P.localidad : (o.division === "primera_b" || o.division === "primera_a" ? P.sin_localidad : P.lejos);
    paginas.push(llenar(de(lugar, 2), datos));
    /* el relator de la previa va rotando entre los que tienen frases de previa */
    var conPrevia = o.relatores.filter(function (r) { return r.previa && r.previa.length; });
    var rel = conPrevia[(o.fecha | 0) % conPrevia.length];
    paginas.push(de(rel.previa, 3));
    return { relator: rel.id, nombre: rel.nombre, paginas: paginas, estrella: est ? est.id : null, localidad: loc };
  }

  /* un hash chico y estable para elegir sin azar (la misma fecha, la misma previa) */
  function hash(s) {
    var x = 0;
    for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return x;
  }

  return {
    letrasA: letrasA, conVoz: conVoz, tono: tono,
    iconoDeEfecto: iconoDeEfecto, bajadaDeEfecto: bajadaDeEfecto,
    localidadDe: localidadDe, estrellaDe: estrellaDe, previaDeLaFecha: previaDeLaFecha, hash: hash
  };
});
