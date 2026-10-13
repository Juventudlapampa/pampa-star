/* ============================================================================
   PAMPA STAR · phaser/logic/entorno.js — EL LUGAR DONDE CORRE EL JUEGO
   (lógica pura, tanda 1.0, lote L07-celular)

   El juego se difunde por link: se abre en el teléfono de una piba o un pibe
   de 12 a 25 años, casi siempre desde un mensaje o una red social, muchas
   veces en vertical y a veces adentro de la nota de un medio. Lo que estaba
   mal, medido con grep sobre phaser/ antes de este lote:
     · requestFullscreen, startFullscreen y orientation.lock: 0. Con la barra
       de Chrome el lienzo se ve a 0,659; a pantalla completa, a 0,763 (16%
       más grande). Y quien tiene la rotación bloqueada quedaba trabado en
       "Girá el celular";
     · self !== top, embed y beforeinstallprompt: 0. Embebido como lo embebe
       un medio (iframe de 100% de ancho y 1100 px de alto) el juego quedaba
       en "Girá el celular" a 358, 700 y 780 px.

   Acá van las DECISIONES, como funciones puras que reciben lo que hay que
   saber del navegador (index.html, embed.html y las escenas lo miden y se lo
   pasan): así corren en node y se prueban sin teléfono
   (phaser/test/pantalla_completa.test.js y portada.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaEntorno = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var E = {};

  /* ══════════════════════════════════════════════════════════════════════
     PANTALLA COMPLETA (pantalla-completa)

     e = { origen: "compuerta" | "boton", disponible, activa, instalada,
           tactil, embebido, auto }
       · disponible: el navegador tiene la API y la deja usar (Phaser dice
         fullscreen.available y document.fullscreenEnabled no es false: en
         un iframe sin allow="fullscreen" es false). En iPhone no hay API
         para elementos: queda en false y no se pide nada;
       · instalada: display-mode standalone. La app instalada ya abre sin
         barra y apaisada (manifest: orientation landscape);
       · tactil: el puntero principal es un dedo (pointer: coarse).
     auto (balance.pantalla.auto): cuándo la COMPUERTA la pide sola.
       "tactil"  (por defecto) solo en teléfonos y tabletas;
       "siempre" también en la compu;
       "nunca"   solo con el botón.
     El botón la pide siempre que se pueda: lo tocó quien juega. */
  E.AUTO = ["tactil", "siempre", "nunca"];
  E.decidirPantallaCompleta = function (e) {
    e = e || {};
    if (!e.disponible) return { pedir: false, motivo: "sin_api" };
    if (e.activa) return { pedir: false, motivo: "ya_esta" };
    if (e.origen === "boton") return { pedir: true, motivo: "boton" };
    if (e.instalada) return { pedir: false, motivo: "instalada" };
    /* adentro de la página de otro sitio no se agranda sola: el juego es un
       invitado ahí (le queda el botón) */
    if (e.embebido) return { pedir: false, motivo: "embebido" };
    var auto = E.AUTO.indexOf(e.auto) >= 0 ? e.auto : "tactil";
    if (auto === "nunca") return { pedir: false, motivo: "apagada" };
    if (auto === "tactil" && !e.tactil) return { pedir: false, motivo: "no_tactil" };
    return { pedir: true, motivo: "compuerta" };
  };
  /* el botón PANTALLA se ofrece si sirve: hay API y no está instalada */
  E.mostrarBotonPantalla = function (e) {
    return !!(e && e.disponible && !e.instalada);
  };
  /* JUGAR EN HORIZONTAL (la portada en vertical, portada-vertical-y-embebido):
     pantalla completa + trabar la orientación. Hacen falta las dos: en
     Chrome de Android lock() solo anda con la página a pantalla completa, y
     es lo que gira el teléfono aunque la rotación automática esté apagada.
     e = { disponible, lock (screen.orientation.lock existe), instalada, embebido } */
  E.horizontalPosible = function (e) {
    return !!(e && e.disponible && e.lock && !e.instalada && !e.embebido);
  };
  /* ══════════════════════════════════════════════════════════════════════
     EMBEBIDO EN LA PÁGINA DE UN MEDIO (portada-vertical-y-embebido)

     Medido en la auditoría con el iframe exacto que usa un medio local
     (width:100%; height:1100px, sin allow): a 358, 700 y 780 px de ancho el
     juego quedaba en "Girá el celular", porque el @media de la portada se
     evalúa contra el iframe y un iframe de 1100 de alto es siempre vertical.

     embebido: adentro de un iframe (self !== top) o con ?embed=1 en el link.
     index.html hace la misma cuenta en el <head>, ANTES de pintar, para que
     no se vea ni un cuadro de la portada (portada.test.js controla que las
     dos digan lo mismo).

     modoEmbebido: ¿se juega adentro o va el PÓSTER que abre otra pestaña?
     Adentro solo si el recuadro es apaisado y alcanza:
       · con el dedo, 820 px (el mismo corte de la portada): en el teléfono
         el iframe tiene el ancho de la columna y alto fijo, y queda vertical
         o cortado por la pantalla. Ahí se juega mejor en su propia pestaña,
         con su guardado (en un iframe de otro sitio el almacenamiento queda
         aparte, o bloqueado);
       · con el mouse, 640 px: un iframe 16:9 de 640x360 tiene la misma
         escala (0,667) que un teléfono de 800x360, donde ya se juega. Una
         columna de noticias en la compu mide de 640 a 760: el iframe 16:9
         de docs/PARA_MEDIOS.md se juega adentro.
     Van acá y no en balance.json porque se usan antes de que el balance baje
     (como TOPE_JSON_MS en index.html). */
  E.EMBED_MIN = { tactil: 820, mouse: 640 };
  E.embebido = function (e) {
    e = e || {};
    return !!(e.enIframe || /[?&]embed=1(?:[&#]|$)/.test(String(e.busqueda || "")));
  };
  E.modoEmbebido = function (e) {
    e = e || {};
    var w = +e.ancho || 0, h = +e.alto || 0;
    if (!(w > h)) return "poster";
    return w >= (e.tactil ? E.EMBED_MIN.tactil : E.EMBED_MIN.mouse) ? "adentro" : "poster";
  };
  /* el link del póster: la misma página, sin el embed y con ?ref=embed (de
     dónde vino; no lleva ningún dato de quien juega) */
  E.urlParaJugar = function (href) {
    var s = String(href || "");
    var hash = s.indexOf("#");
    if (hash >= 0) s = s.slice(0, hash);
    var q = s.indexOf("?"), base = q >= 0 ? s.slice(0, q) : s, busq = q >= 0 ? s.slice(q + 1) : "";
    var partes = busq.split("&").filter(function (p) { return p && !/^(embed|ref)=/.test(p); });
    partes.push("ref=embed");
    return base + "?" + partes.join("&");
  };
  /* ══════════════════════════════════════════════════════════════════════
     INSTALAR (📲 en la portada): qué se ofrece.
       "prompt"  Android (o la compu) con el evento beforeinstallprompt
                 guardado: el botón abre el diálogo del navegador;
       "ios"     iPhone sin instalar: no hay diálogo, se muestran los pasos
                 (Compartir → Agregar a inicio);
       null      nada: ya instalada, embebida (se instalaría la página del
                 medio) o adentro del navegador de una red social (esos no
                 instalan).
     Instalada, la carrera no se borra por no abrir el juego una semana (el
     navegador de algunos teléfonos borra lo de un sitio sin uso) y abre
     apaisada y sin barra. */
  E.ofrecerInstalar = function (e) {
    e = e || {};
    if (e.instalada || e.embebido || e.integrado) return null;
    if (e.hayPrompt) return "prompt";
    if (e.sistema === "ios") return "ios";
    return null;
  };
  E.sistema = function (ua) {
    var s = String(ua || "");
    if (/Android/i.test(s)) return "android";
    if (/iPhone|iPad|iPod/i.test(s)) return "ios";
    return "otro";
  };

  return E;
});
