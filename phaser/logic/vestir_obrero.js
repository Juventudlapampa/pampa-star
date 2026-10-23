/* ============================================================================
   PAMPA STAR · phaser/logic/vestir_obrero.js — VESTIR EN UN HILO APARTE

   Tanda 1.0, lote L08c (deudas de la ola 2). logic/vestir.js separa la tela
   de la piel recorriendo la pose entera por regiones: 120-240 ms por pose en
   node y 313-382 ms medidos en el navegador de la compu, de una sola pieza.
   En el hilo de la página eso es un cuadro trabado entero (era el arranque
   de cada partido). Acá corre la MISMA función, sin cambiarle nada, en un
   Worker: la página le manda los píxeles, este hilo los viste y se los
   devuelve, y el juego no se entera.

   Mensaje que recibe: { n, w, h, buf (ArrayBuffer RGBA, transferido), destino,
                         numero (opcional: poses.<id>.numero del manifiesto) }
   Mensaje que manda:  { n, ok: true, buf (transferido), ms, tela, rayas }
                    o  { n, ok: false, error }

   Sin DOM ni Phaser: solo la lógica pura. Se prueba en node
   (deudas_ola2.test.js [1]) cargándolo con un importScripts de mentira.
   ========================================================================== */
/* global importScripts */
"use strict";
importScripts("vestir.js");
importScripts("halo.js");

self.onmessage = function (e) {
  var m = e.data || {};
  try {
    var d = new Uint8ClampedArray(m.buf);
    var t0 = Date.now();
    var r = self.PampaVestir.vestir(d, m.w, m.h, { destino: m.destino });
    /* 23/oct: el número que trae dibujado la pose (el 4 de la barrida) se
       borra sobre la tela ya vestida (logic/halo.js, borrarNumero) */
    if (m.numero) self.PampaHalo.borrarNumero(d, m.w, m.h, self.PampaHalo.cajaDeNumero(m.numero, m.w, m.h, 0, 0), r.m);
    self.postMessage({ n: m.n, ok: true, buf: d.buffer, ms: Date.now() - t0, tela: r.tela, rayas: r.rayas }, [d.buffer]);
  } catch (err) {
    self.postMessage({ n: m.n, ok: false, error: String((err && err.message) || err) });
  }
};
