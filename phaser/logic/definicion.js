/* ============================================================================
   PAMPA STAR · phaser/logic/definicion.js — LA DEFINICIÓN v2 (lógica pura)
   V6 §4: el duelo de SEIS ZONAS del arco (elección a ciegas y simultánea),
   la tirada de bloqueo del defensor en la línea, y los modificadores del
   remate/atajada. La ESCENA solo compone; los números viven acá y en balance.
   Accesibilidad: cada zona tiene ETIQUETA y posición de grilla propias —
   nunca se distinguen solo por color. Corre en node (tests) y en el browser.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaDefinicion = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* las 6 zonas del arco: grilla 3×2 (col 0-2, fila 0 arriba / 1 abajo) */
  var ZONAS = [
    { id: "alto_izq", n: "ÁNGULO IZQ", col: 0, fila: 0, gy: -44 },
    { id: "alto_centro", n: "ALTO MEDIO", col: 1, fila: 0, gy: 0 },
    { id: "alto_der", n: "ÁNGULO DER", col: 2, fila: 0, gy: 44 },
    { id: "bajo_izq", n: "PALO IZQ", col: 0, fila: 1, gy: -38 },
    { id: "bajo_centro", n: "AL MEDIO", col: 1, fila: 1, gy: 0 },
    { id: "bajo_der", n: "PALO DER", col: 2, fila: 1, gy: 38 }
  ];
  function zona(id) { return ZONAS.find(function (z) { return z.id === id; }) || ZONAS[4]; }
  /* distancia de adivinanza: Chebyshev en la grilla (0 = coincide, 1 = al lado, 2 = lejos) */
  function distZonas(idA, idB) {
    var a = zona(idA), b = zona(idB);
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.fila - b.fila));
  }
  /* el arquero CPU elige a ciegas (leve sesgo al centro, como un arquero real) */
  function eleccionCPU(rng) {
    rng = rng || Math.random;
    var pesos = [0.14, 0.18, 0.14, 0.16, 0.22, 0.16];
    var r = rng(), acc = 0;
    for (var i = 0; i < ZONAS.length; i++) { acc += pesos[i]; if (r < acc) return ZONAS[i].id; }
    return ZONAS[4].id;
  }
  /* la adivinanza modula al ARQUERO: coincide → atajada casi segura; a una → difícil; a 2+ → llega mal */
  function bonusArqueroPorZona(dist, cfg) {
    cfg = cfg || {};
    if (dist <= 0) return cfg.coincide != null ? cfg.coincide : 55;
    if (dist === 1) return cfg.a_una != null ? cfg.a_una : 10;
    return cfg.a_dos != null ? cfg.a_dos : -25;
  }
  /* ══════════════════════════════════════════════════════════════════════
     EL DESVÍO DE LA EJECUCIÓN · la fórmula que estaba DADA VUELTA.

     Desde la V9 §4 la ejecución del remate no la mide una aguja: sale del que
     patea, su stat y lo que le queda de aguante. Pero la fórmula vivía en la
     ESCENA (definicion_ui.js), donde no se puede correr en node — y estaba
     invertida:

         off = (0.5 - pun) * 0.5      con pun = tiro*0.6 + tanque*0.4

     Cuanto MEJOR definías y más entero llegabas, MÁS LEJOS quedaba la zona
     dulce. Medido con el balance real: con el tanque lleno los cinco niveles de
     tiro (58, 70, 82, 90, 99) comían floja_penal −22, y el dulce_bonus de +8 no
     se veía nunca en ese estado. Para tocar el punto dulce había que estar
     fundido, tanto más cuanto mejor fueras: tiro 58 al 88% del tanque, tiro 99
     al 27%. El juego premiaba ser peor y llegar roto.

     Ahora es MONÓTONA —mejorar siempre te acerca al cero— y vive acá, en la
     lógica pura, que es lo único que se puede simular antes de tocar el balance.
     Que la fórmula estuviera en la escena es la razón por la que nadie la pudo
     medir en tres tandas de calibración.

     EL LADO lo decide lo que te FALTA, y así las dos colas de efectoTiming
     siguen vivas (con una sola, pasada_fuera_mult y pasada_fuera_max quedaban
     de adorno — la misma enfermedad que estamos matando):
       · te sobra muñeca y te falta tanque  → la pegás floja
       · te sobra tanque y te falta muñeca  → se te va larga
     ══════════════════════════════════════════════════════════════════════ */
  function desvioDeEjecucion(calidad, tanque, cfg) {
    cfg = cfg || {};
    var c = clamp(calidad, 0, 1), t = clamp(tanque, 0, 1);
    var pun = c * (cfg.timing_peso_stat != null ? cfg.timing_peso_stat : 0.6)
      + t * (cfg.timing_peso_tanque != null ? cfg.timing_peso_tanque : 0.4);
    var desvio = (1 - pun) * (cfg.timing_desvio != null ? cfg.timing_desvio : 0.3);
    return desvio * (c >= t ? -1 : 1);
  }
  /* el TIMING modula la potencia: punto dulce; floja la ataja, pasada se va */
  function efectoTiming(off, zonaAncho, cfg) {
    cfg = cfg || {};
    var enZona = Math.abs(off) <= zonaAncho / 2;
    if (enZona) return { enZona: true, dPoder: cfg.dulce_bonus != null ? cfg.dulce_bonus : 8, fueraProb: 0 };
    if (off < 0) return { enZona: false, dPoder: cfg.floja_penal != null ? -cfg.floja_penal : -22, fueraProb: 0 };
    return { enZona: false, dPoder: 0, fueraProb: clamp((off - zonaAncho / 2) * (cfg.pasada_fuera_mult || 1.6), 0, cfg.pasada_fuera_max || 0.55) };
  }
  /* tirada de BLOQUEO del defensor en la línea (fase previa al arquero) */
  function chanceBloqueo(defensoresEnLinea, distMedia, cfg) {
    cfg = cfg || {};
    if (!defensoresEnLinea) return 0;
    var base = (cfg.bloqueo_base != null ? cfg.bloqueo_base : 0.18) * defensoresEnLinea;
    var cercania = clamp(1 - distMedia / (cfg.bloqueo_radio || 120), 0, 1);
    return clamp(base + cercania * (cfg.bloqueo_cercania != null ? cfg.bloqueo_cercania : 0.25), 0, cfg.bloqueo_max || 0.6);
  }
  /* ACHICAR del arquero: reduce las zonas útiles del rematador, pero lo alto lo vende */
  function efectoAchicar(zonaTiro, cfg) {
    cfg = cfg || {};
    var z = zona(zonaTiro);
    if (z.fila === 0 && z.col !== 1) return { dArquero: -(cfg.achicar_vendido != null ? cfg.achicar_vendido : 18), vendido: true };
    return { dArquero: cfg.achicar_bonus != null ? cfg.achicar_bonus : 14, vendido: false };
  }
  /* ============ V9 C1 · TE REMATAN: SE RESUELVE SOLO ============
     Sin pantalla de gestión defensiva. El rival elige, y lo que pasa lo
     deciden cuatro cosas que YA construiste jugando: DÓNDE están tus
     defensores respecto de la línea de tiro, CUÁNTOS son, el NIVEL de tu
     arquero y el CANSANCIO del equipo. Función pura: recibe la foto de la
     jugada, devuelve el desenlace y por qué.
     params = {
       tirador:{x,y}, arco:{x,y}, defensores:[{x,y,nombre,aguante}],
       arquero:{nivel,aguante}, aguanteMax, cfg (balance.definicion), rng
     } */
  function remateRivalAuto(params) {
    var p = params || {}, cfg = p.cfg || {}, rng = p.rng || Math.random;
    var t = p.tirador || { x: 0, y: 0 }, arco = p.arco || { x: 0, y: 0 };
    var defs = p.defensores || [], aguanteMax = p.aguanteMax || 1000;
    var dx = arco.x - t.x, dy = arco.y - t.y;
    var largo = Math.sqrt(dx * dx + dy * dy) || 1;
    /* 1) QUIÉN está en el camino: proyección sobre la línea tirador→arco */
    var enLinea = [], dTotal = 0, masCerca = null, dMasCerca = 1e9;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      var u = ((d.x - t.x) * dx + (d.y - t.y) * dy) / (largo * largo);
      if (u < 0.02 || u > 1) continue;                       // detrás del tirador o pasado el arco
      var px = t.x + dx * u, py = t.y + dy * u;
      var dist = Math.sqrt((d.x - px) * (d.x - px) + (d.y - py) * (d.y - py));
      if (dist > (cfg.bloqueo_radio || 120)) continue;
      enLinea.push({ j: d, dist: dist, u: u });
      dTotal += dist;
      if (dist < dMasCerca) { dMasCerca = dist; masCerca = d; }
    }
    var distMedia = enLinea.length ? dTotal / enLinea.length : 999;
    var pBloqueo = chanceBloqueo(enLinea.length, distMedia, cfg);
    /* 25/oct (EL BLOQUEO): con p.salidas, el que está en la línea no bloquea
       o no bloquea: hay seis salidas (bloqueoDelTiro) y la pose sale de dónde
       está respecto del tiro (poseDeBloqueo). Sin p.salidas, la tirada de siempre */
    var S = p.salidas && p.salidas.activo && masCerca ? p.salidas : null, sal = null, pose = null, recupera = null;
    if (S) {
      var cerca = Math.sqrt((masCerca.x - t.x) * (masCerca.x - t.x) + (masCerca.y - t.y) * (masCerca.y - t.y));
      var vecinos = defs.filter(function (o) { return o !== masCerca && Math.abs(o.x - masCerca.x) + Math.abs(o.y - masCerca.y) < S.companero_px; });
      sal = bloqueoDelTiro({ pBloqueo: pBloqueo, tiro: p.tiro, cerca: cerca, lat: dMasCerca, companeros: vecinos.length, cfg: S, rng: rng });
      pose = poseDeBloqueo(t, arco, masCerca, S);
      if (sal.salida === "bloquea_otro") {
        recupera = defs.filter(function (o) { return o !== masCerca; })
          .sort(function (a, b) { return Math.abs(a.x - masCerca.x) + Math.abs(a.y - masCerca.y) - Math.abs(b.x - masCerca.x) - Math.abs(b.y - masCerca.y); })[0] || masCerca;
      } else if (sal.salida === "bloquea_mismo") recupera = masCerca;
    }
    var bloqueado = S ? (sal.salida === "bloquea_mismo" || sal.salida === "bloquea_otro") : rng() < pBloqueo;
    /* 2) el ARQUERO: su nivel, su tanque y la distancia del remate */
    var nivel = clamp((p.arquero && p.arquero.nivel) || 55, 1, 99);
    var fracArq = clamp(((p.arquero && p.arquero.aguante) != null ? p.arquero.aguante : aguanteMax) / aguanteMax, 0, 1);
    var lejos = clamp(largo / (cfg.remate_lejos || 420), 0, 1);      // de lejos el arquero llega mejor
    var bonus = Math.round((nivel - 55) * (cfg.arquero_peso_nivel || 0.6)
      + (fracArq - 0.5) * (cfg.arquero_peso_aguante || 20)
      + lejos * (cfg.arquero_peso_lejos || 18));
    /* la rozó: el tiro pierde fuerza; la desvió: el arquero quedó vendido */
    if (sal && sal.salida === "roza") bonus += S.roza_bonus;
    if (sal && sal.salida === "descoloca") bonus -= S.descoloca_malus;
    /* 3) POR QUÉ salió así (vocabulario cerrado, lo traduce la UI) */
    /* el motivo nombra lo que MÁS movió la aguja, no lo primero que se cumple:
       un arquero en el piso explica más que "quedó solo" (las dos son ciertas) */
    var MOT = { roza: "roce", descoloca: "descoloco", queda_atacante: "no_alcanza" };
    var motivo = bloqueado ? "bloqueo"
      : (sal && MOT[sal.salida]) ? MOT[sal.salida]
      : (fracArq < 0.4 ? "arquero_fundido"
        : (lejos > 0.75 ? "de_lejos"
          : (enLinea.length === 0 ? "solo_ante_el_arquero" : "mano_a_mano")));
    var out = {
      bloqueado: bloqueado, bonusArquero: bonus, pBloqueo: Math.round(pBloqueo * 100) / 100,
      defensoresEnLinea: enLinea.length, defensorMasCerca: masCerca,
      distMedia: Math.round(distMedia), distanciaRemate: Math.round(largo),
      motivo: motivo
    };
    if (sal) { out.salida = sal.salida; out.probs = sal.probs; out.poseBloqueo = pose; out.recupera = recupera; }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     25/oct, pedido de Rodri · EL BLOQUEO.

     "En el bloqueo se pone de brazos cruzados. Que haga la animación como
     que salta o se tira, o se da vuelta, de acuerdo a la posición en el mapa
     respecto del tiro." poseDeBloqueo mira dónde está el que bloquea
     respecto de la línea tirador→arco: pegado al que patea no llega a
     reaccionar y se da vuelta (espaldas); corrido de la línea se tira al
     piso de costado (piso, lado = de qué lado de la línea está); en la
     línea y con tiempo, salta abierto de frente (salto).

     bloqueoDelTiro reparte las seis salidas. toca = pBloqueo (la chance de
     siempre, por cuántos y qué tan cerca de la línea) por toca_mult: no
     todo lo que se toca se frena. Entre lo que se toca, los pesos w: un
     remate fuerte (TIRO de quien patea) y un cuerpo corrido de la línea
     rozan y desvían más y frenan menos; pegado al que patea, la pelota le
     pega en el cuerpo y rebota (frena más y la controla menos). Lo que se
     frena lo agarra el mismo o, con compañeros cerca, otro de su equipo.
     Las perillas en balance.definicion.bloqueo_salidas.
     ══════════════════════════════════════════════════════════════════════ */
  function poseDeBloqueo(tirador, arco, def, cfg) {
    var dx = arco.x - tirador.x, dy = arco.y - tirador.y, L2 = dx * dx + dy * dy || 1;
    var u = ((def.x - tirador.x) * dx + (def.y - tirador.y) * dy) / L2;
    var px = tirador.x + dx * u, py = tirador.y + dy * u;
    var lat = Math.sqrt((def.x - px) * (def.x - px) + (def.y - py) * (def.y - py));
    var cerca = Math.sqrt((def.x - tirador.x) * (def.x - tirador.x) + (def.y - tirador.y) * (def.y - tirador.y));
    var lado = dx * (def.y - tirador.y) - dy * (def.x - tirador.x) >= 0 ? 1 : -1;
    var pose = cerca < cfg.espaldas_px ? "espaldas" : (lat > cfg.costado_px ? "piso" : "salto");
    return { pose: pose, lado: lado, lat: Math.round(lat), cerca: Math.round(cerca) };
  }
  var SALIDAS = ["no_toca", "queda_atacante", "roza", "descoloca", "bloquea_mismo", "bloquea_otro"];
  function bloqueoDelTiro(p) {
    var B = p.cfg, W = B.w, rng = p.rng || Math.random;
    var fuerza = clamp(((p.tiro != null ? p.tiro : 50) - B.tiro_desde) / B.tiro_escala, 0, 1);
    var corrido = clamp(p.lat / B.lat_ref, 0, 1);
    var pegado = 1 - clamp(p.cerca / B.cerca_ref, 0, 1);
    var toca = clamp(p.pBloqueo * B.toca_mult, 0, B.toca_max);
    var w = {
      queda_atacante: W.queda_atacante * (1 + pegado),
      roza: W.roza * (1 + fuerza) * (0.5 + corrido),
      descoloca: W.descoloca * (1 + fuerza) * (0.5 + corrido),
      bloquea: W.bloquea * (1.5 - 0.5 * fuerza) * (1.25 - 0.5 * corrido) * (1 + 0.5 * pegado)
    };
    var suma = w.queda_atacante + w.roza + w.descoloca + w.bloquea;
    var otro = clamp(B.otro_base + (p.companeros || 0) * B.otro_por_companero + pegado * B.otro_por_pegado, 0, B.otro_max);
    var probs = {
      no_toca: 1 - toca,
      queda_atacante: toca * w.queda_atacante / suma,
      roza: toca * w.roza / suma,
      descoloca: toca * w.descoloca / suma,
      bloquea_mismo: toca * w.bloquea / suma * (1 - otro),
      bloquea_otro: toca * w.bloquea / suma * otro
    };
    var r = rng(), acum = 0, salida = "no_toca";
    for (var i = 0; i < SALIDAS.length; i++) {
      acum += probs[SALIDAS[i]];
      if (r < acum) { salida = SALIDAS[i]; break; }
    }
    return { salida: salida, probs: probs, fuerza: fuerza };
  }

  /* ══════════════════════════════════════════════════════════════════════
     A3 · LA MISMA LEY PARA LOS DOS ARCOS.

     remateRivalAuto() nunca tuvo nada de "rival": recibe tirador, arco,
     defensores y arquero, y no le importa de quién son. Se llamaba así porque
     el único que la usaba era el remate del rival contra vos — y por eso los
     rivales podían cortarte a vos pero vos no podías cortarlos a ellos.

     remateAuto es el MISMO código con el nombre honesto. El viejo queda como
     alias porque hay tests y una escena que lo llaman por su nombre.

     Consecuencia medida (20.000 remates, tres semillas): con el bloqueo del
     lado tuyo se bloquea el 28% de tus remates y los goles por remate pasan
     de 51,7% a 46,0%. La perilla es bloqueo_base y es COMPARTIDA: bajarla
     afloja los dos arcos a la vez, que es exactamente lo que se quiere.
     ══════════════════════════════════════════════════════════════════════ */
  var remateAuto = remateRivalAuto;

  /* ══════════════════════════════════════════════════════════════════════
     L04b · LA SÚPER DEFENSA, CON PUERTA.

     El GDD (5.4) dice que el envión lleno se gasta en potenciar al equipo
     o en una Súper Defensa que bloquea un remate de forma segura. El
     consumo (partido.gastarEnvionSuper) y su botón vivían en la pantalla de
     defensa que la V9 C1 sacó, así que la mitad del envión no se podía usar
     jugando. Ahora, cuando el rival te va a rematar y tenés el envión lleno,
     la escena te pregunta (escenas_v9.js, preguntarSuperDefensa). Esto es lo
     que pasa si decís que sí: la lectura del remate queda BLOQUEADA, con su
     motivo propio, y el que pone el cuerpo es quien juega (si no hay nadie
     en la línea, igual aparece uno: es el envión el que lo pone ahí). No toca al
     arquero ni la distancia: lo demás de la lectura se conserva tal cual. */
  function conSuperDefensa(lectura, vos) {
    var l = {}, k;
    lectura = lectura || {};
    for (k in lectura) if (Object.prototype.hasOwnProperty.call(lectura, k)) l[k] = lectura[k];
    l.bloqueado = true;
    l.superDefensa = true;
    l.motivo = "super_defensa";
    if (vos) l.defensorMasCerca = vos;
    l.defensoresEnLinea = Math.max(1, l.defensoresEnLinea | 0);
    return l;
  }

  /* qué pasa DESPUÉS de un bloqueo. Un bloqueo no es una pelota perdida: la
     pelota rebota. Sale al córner, queda picando o el defensor la despeja.
     El reparto es dato (balance.definicion.bloqueo_reparto) porque de eso
     depende cuánto duele: con el rebote adentro la caída de goles es 11%
     en vez de 17%, y los córners suben un 49%. */
  function desenlaceBloqueo(cfg, rng) {
    cfg = cfg || {}; rng = rng || Math.random;
    var R = cfg.bloqueo_reparto || { corner: 0.35, rebote: 0.30 };
    var u = rng();
    if (u < R.corner) return "corner";                       // la desvió afuera: seguís vos
    if (u < R.corner + R.rebote) return "rebote";            // queda picando: segunda pelota
    return "despeje";                                        // se la llevó puesta: es de ellos
  }

  return {
    ZONAS: ZONAS, zona: zona, distZonas: distZonas, eleccionCPU: eleccionCPU,
    remateAuto: remateAuto, desenlaceBloqueo: desenlaceBloqueo,   // A3: la misma ley para los dos arcos
    conSuperDefensa: conSuperDefensa,                             // L04b: el envión lleno bloquea un remate
    bloqueoDelTiro: bloqueoDelTiro, poseDeBloqueo: poseDeBloqueo, SALIDAS: SALIDAS,   // 25/oct: EL BLOQUEO
    bonusArqueroPorZona: bonusArqueroPorZona, efectoTiming: efectoTiming,
    desvioDeEjecucion: desvioDeEjecucion,
    chanceBloqueo: chanceBloqueo, efectoAchicar: efectoAchicar,
    remateRivalAuto: remateRivalAuto
  };
});
