/* ============================================================================
   PAMPA STAR · phaser/logic/informe.js — EL INFORME DE ERROR (lógica pura)

   Si alguien de una localidad avisa "se me trabó", hasta ahora no había forma
   de saber qué versión tenía ni en qué pantalla estaba: `version` y `VERSION`
   no aparecían en intro.js ni en editor.js, y la única versión del juego vivía
   adentro de sw.js, donde nadie la ve. La red de errores de index.html guarda
   el último error en pampa_ultimo_error y, en el aviso "Algo se trabó", el
   botón COPIAR INFORME arma ESTE texto: corto, para pegar en un WhatsApp.

   LO QUE NUNCA LLEVA: nombre, apodo, club, localidad ni nada del save. El
   informe no lee el save para escribir; lo lee sólo para TAPAR. El mensaje de
   un error lo arma el código con datos vivos, y un "Cannot read 'x' of Rocío"
   es improbable pero posible: lo que coincide con un dato privado del save se
   reemplaza por […] antes de que el texto salga del juego.

   Sin DOM ni Phaser: index.html junta los datos y llama a armar().
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaInforme = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* las claves del save que guardan algo de la persona. Se compara la CLAVE,
     no el valor: un apodo puede ser cualquier palabra. "equipo" tapa de más
     (los clubes de la tabla son ficticios), y tapar de más no le hace mal a
     nadie; tapar de menos sí. */
  var CLAVES_PRIVADAS = /^(name|nombre|apodo|alias|club|miclub|clubnombre|club_nombre|equipo|pueblo|localidad|ciudad|barrio|escuela|amigos?)$/i;
  var TAPA = "[…]";
  var MIN_SECRETO = 3;      // "Lu" o "Mi" taparían media frase del error
  var MAX_LINEA = 160;      // un mensaje de error de Phaser puede traer un objeto entero
  var MAX_UA = 180;

  /* recorre un save (o varios) y junta los valores de las claves privadas.
     Un arreglo hereda la clave del padre: amigos: ["Pato", "Ceci"] cuenta. */
  function secretosDelSave(saves) {
    var lista = [];
    function andar(v, privada, prof) {
      if (prof > 8 || v == null) return;
      if (typeof v === "string") {
        var s = v.trim();
        if (privada && s.length >= MIN_SECRETO && lista.indexOf(s) < 0) lista.push(s);
        return;
      }
      if (Array.isArray(v)) { v.forEach(function (x) { andar(x, privada, prof + 1); }); return; }
      if (typeof v === "object") {
        Object.keys(v).forEach(function (k) { andar(v[k], CLAVES_PRIVADAS.test(k), prof + 1); });
      }
    }
    (Array.isArray(saves) ? saves : [saves]).forEach(function (s) { andar(s, false, 0); });
    /* los largos primero: "Rocío Benítez" antes que "Rocío", si no queda "[…] Benítez" */
    return lista.sort(function (a, b) { return b.length - a.length; });
  }

  function escaparRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* reemplaza cada secreto (sin importar mayúsculas) por […] */
  function tapar(texto, secretos) {
    var out = String(texto == null ? "" : texto);
    (secretos || []).forEach(function (s) {
      if (!s || String(s).length < MIN_SECRETO) return;
      out = out.replace(new RegExp(escaparRegex(String(s)), "gi"), TAPA);
    });
    return out;
  }

  /* la primera línea del error, sea un Error, un string o cualquier cosa */
  function primeraLinea(err) {
    var s;
    if (err == null) s = "";
    else if (typeof err === "string") s = err;
    else if (err.message != null) s = (err.name && err.name !== "Error" ? err.name + ": " : "") + err.message;
    else { try { s = String(err); } catch (e) { s = "?"; } }
    s = String(s).split("\n")[0].trim();
    return s.length > MAX_LINEA ? s.slice(0, MAX_LINEA - 1) + "…" : s;
  }

  /* dónde: el primer archivo .js:línea:columna del stack, con la ruta corta.
     Chrome: "    at PampaMatch.avisar (http://x/phaser/scenes/match.js:5447:12)"
     Firefox y Safari: "avisar@http://x/phaser/scenes/match.js:5447:12"
     Se prefiere el primer renglón que NO es del motor: un error que salta
     adentro de phaser.min.js casi siempre lo provocó una escena que le pasó
     algo roto, y "vendor/phaser.min.js:1:812345" no le dice nada a nadie. */
  function lugar(stack) {
    var lineas = String(stack || "").split("\n"), primero = "";
    for (var i = 0; i < lineas.length; i++) {
      var m = lineas[i].match(/([^\s()@]+\.js)(?:\?[^\s:()]*)?:(\d+):(\d+)/);
      if (!m) continue;
      var ruta = m[1];
      var k = ruta.lastIndexOf("/phaser/");
      ruta = k >= 0 ? ruta.slice(k + 8) : ruta.split("/").pop();
      var aca = ruta + ":" + m[2] + ":" + m[3];
      if (!/(^|\/)vendor\//.test(ruta)) return aca;
      if (!primero) primero = aca;
    }
    return primero;
  }

  /* el estado del partido en una línea, SÓLO con números y el estado: los
     nombres de los equipos no entran (el club propio puede ser inventado). */
  function resumenEstado(e) {
    if (!e) return "";
    var partes = [];
    if (e.estado) partes.push(String(e.estado).replace(/[^A-Z_]/g, "").slice(0, 20));   // los estados son constantes en mayúscula (LIBRE, MENU…)
    if (e.tiempo != null && e.minuto != null) partes.push((e.tiempo | 0) + "T " + Math.floor(+e.minuto || 0) + "'");
    if (e.golesMio != null && e.golesRival != null) partes.push((e.golesMio | 0) + "-" + (e.golesRival | 0));
    return partes.join(" · ");
  }

  function dos(n) { return (n < 10 ? "0" : "") + n; }
  function fecha(h) {
    var d = h instanceof Date ? h : new Date(+h || 0);
    if (isNaN(d.getTime())) return "?";
    return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()) + " " +
      dos(d.getHours()) + ":" + dos(d.getMinutes()) + ":" + dos(d.getSeconds());
  }

  /* EL INFORME. d = {version, escena, estado:{...}, error, stack, lugar,
     faltan, noArranco, pantalla:{w,h,dpr,horizontal}, instalada, ua, hora, errores}.
     op.secretos = lo que hay que tapar (secretosDelSave). Cualquier otro
     campo de d se ignora: no hay forma de que un save entre por la ventana. */
  function armar(d, op) {
    d = d || {}; op = op || {};
    var L = ["PAMPA STAR · informe de error"];
    L.push("versión: " + (d.version || "?"));
    var est = resumenEstado(d.estado);
    L.push("escena: " + (d.escena || "ninguna") + (est ? " · " + est : ""));
    if (d.error != null) L.push("error: " + (primeraLinea(d.error) || "?"));
    var donde = lugar(d.stack || (d.error && d.error.stack));
    /* un SyntaxError no trae renglones "at …" en el stack: el lugar lo da el
       evento (index.html lo guarda ya corto). Sólo se acepta con esa forma. */
    if (!donde && /^[\w.\/-]+\.js:\d+:\d+$/.test(String(d.lugar || ""))) donde = String(d.lugar);
    if (donde) L.push("dónde: " + donde);
    if (d.faltan && d.faltan.length) {
      L.push("no bajó: " + d.faltan.slice(0, 4).map(function (f) { return lugar(f + ":0:0").replace(/:0:0$/, "") || String(f); }).join(", "));
    }
    /* las clases obligatorias que no aparecieron aunque su script bajó: son
       nombres del código (PampaMatch…), no hay nada de la persona */
    if (d.noArranco && d.noArranco.length) {
      L.push("no arrancó: " + d.noArranco.slice(0, 6).map(function (n) { return String(n).replace(/[^\w.\/-]/g, ""); }).join(", "));
    }
    if (d.errores > 1) L.push("errores en la sesión: " + (d.errores | 0));
    var P = d.pantalla;
    if (P && P.w && P.h) {
      L.push("pantalla: " + Math.round(P.w) + "x" + Math.round(P.h) +
        (P.dpr ? " · x" + (Math.round(P.dpr * 100) / 100) : "") +
        (P.horizontal != null ? " · " + (P.horizontal ? "horizontal" : "vertical") : ""));
    }
    L.push("instalada: " + (d.instalada ? "sí" : "no"));
    if (d.ua) L.push("navegador: " + String(d.ua).slice(0, MAX_UA));
    L.push("hora: " + fecha(d.hora != null ? d.hora : Date.now()));
    return tapar(L.join("\n"), op.secretos);
  }

  return {
    CLAVES_PRIVADAS: CLAVES_PRIVADAS,
    secretosDelSave: secretosDelSave,
    tapar: tapar,
    primeraLinea: primeraLinea,
    lugar: lugar,
    resumenEstado: resumenEstado,
    armar: armar
  };
});
