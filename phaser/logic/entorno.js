/* ============================================================================
   PAMPA STAR · phaser/logic/entorno.js — EL LUGAR DONDE CORRE EL JUEGO
   (lógica pura, tanda 1.0, lote L07-celular)

   El juego se difunde por link: se abre en el teléfono de una piba o un pibe
   de 12 a 25 años, casi siempre desde un mensaje o una red social, muchas
   veces en vertical y a veces adentro de la nota de un medio. Lo que estaba
   mal, medido con grep sobre phaser/ antes de este lote:
     · requestFullscreen, startFullscreen y orientation.lock: 0. Con la barra
       del navegador el lienzo se ve a 0,659; a pantalla completa, a 0,763 (16%
       más grande). Y quien tiene la rotación bloqueada quedaba trabado en
       "Girá el celular";
     · self !== top, embed y beforeinstallprompt: 0. Embebido como lo embebe
       un medio (iframe de 100% de ancho y 1100 px de alto) el juego quedaba
       en "Girá el celular" a 358, 700 y 780 px;
     · userAgent y las firmas de las redes sociales: 0. Abierta desde una red social,
       la carrera quedaba en el navegador de la app; y si guardar fallaba,
       master.js lo tragaba en silencio.

   Acá van las DECISIONES, como funciones puras que reciben lo que hay que
   saber del navegador (index.html, embed.html y las escenas lo miden y se lo
   pasan): así corren en node y se prueban sin teléfono
   (phaser/test/pantalla_completa.test.js, portada.test.js y entorno.test.js).
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
     Android, lock() solo anda con la página a pantalla completa, y
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
       · y en los dos, 360 px de ALTO (revisión L07): solo se miraba el
         ancho, y un recuadro de 700x150 contaba como "adentro". Pasa con
         el iframe de PARA_MEDIOS en un navegador que no entiende
         aspect-ratio (los de antes de 2021): queda en su alto por defecto,
         150, y el juego arrancaba a escala 0,28, ilegible. 360 es el alto
         de un teléfono de 800x360 apaisado, donde ya se juega (0,667).
     Van acá y no en balance.json porque se usan antes de que el balance baje
     (como TOPE_JSON_MS en index.html). */
  E.EMBED_MIN = { tactil: 820, mouse: 640, alto: 360 };
  E.embebido = function (e) {
    e = e || {};
    return !!(e.enIframe || /[?&]embed=1(?:[&#]|$)/.test(String(e.busqueda || "")));
  };
  E.modoEmbebido = function (e) {
    e = e || {};
    var w = +e.ancho || 0, h = +e.alto || 0;
    if (!(w > h)) return "poster";
    if (h < E.EMBED_MIN.alto) return "poster";
    return w >= (e.tactil ? E.EMBED_MIN.tactil : E.EMBED_MIN.mouse) ? "adentro" : "poster";
  };
  /* el link del póster: la misma página, sin el embed. Revisión L07: y SIN
     ?ref=embed. Lo llevaba "para saber que la visita vino de una nota"
     (docs/PARA_MEDIOS.md), pero no lo leía nada (ni el juego ni el sitio,
     que no registra visitas) y la decisión de Rodri es que no se mide
     nada: un dato que sugiere una medición que no existe, afuera. El ref
     de un link viejo se sigue sacando (linkLimpio, abajo). */
  E.urlParaJugar = function (href) {
    var s = String(href || "");
    var hash = s.indexOf("#");
    if (hash >= 0) s = s.slice(0, hash);
    var q = s.indexOf("?"), base = q >= 0 ? s.slice(0, q) : s, busq = q >= 0 ? s.slice(q + 1) : "";
    var partes = busq.split("&").filter(function (p) { return p && !/^(embed|ref)=/.test(p); });
    return base + (partes.length ? "?" + partes.join("&") : "");
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

  /* ══════════════════════════════════════════════════════════════════════
     EL NAVEGADOR DE UNA RED SOCIAL (navegadores-de-redes-y-guardado)

     La difusión es por redes, y en las redes sociales el link se abre
     adentro del navegador de la app. La carrera vive en el almacenamiento
     del navegador donde se juega: empezada ahí, no aparece después en el
     navegador del teléfono ni en la app instalada (y esos navegadores no
     ofrecen instalar; la pantalla completa varía según la app: datos de
     plataforma, no reproducidos acá).

     navegadorIntegrado(ua) devuelve la clave de la app (las de NOMBRE_APP,
     con la app de mensajes de la misma familia adentro de la segunda),
     "otro" (el navegador de otra app) o null (un navegador de verdad). Cada
     app firma su user agent; las firmas que se buscan son las de las
     expresiones de abajo, probadas con 18 user agents de verdad en
     entorno.test.js [1]. Otra app en Android: el ";wv)" del WebView del
     sistema, que los navegadores de verdad no llevan; en iPhone, las que se
     presentan con su nombre. El orden importa: las dos primeras, en
     Android, también llevan ";wv)".

     SECCIÓN 11 · LA EXCEPCIÓN ACOTADA (revisión L07). Los nombres de las
     apps y de los navegadores son marcas reales. Entran SOLO entre las dos
     marcas de abajo, y solo en el código (las firmas que se buscan, el
     paquete del link de Android y los textos del cartel, donde quien juega
     tiene que reconocer la app en la que está y el botón que busca); ni en
     los comentarios ni en el resto del juego. seccion11.test.js [1c] lo
     controla. Lo pidió el ítem (el cartel "Estás en el navegador de…
     abrilo en…"); está anotado en docs/TANDA_1_0.md para que lo confirme
     Rodri. */
  /* §11 EXCEPCIÓN ACOTADA · desde acá */
  E.navegadorIntegrado = function (ua) {
    var s = String(ua || "");
    if (!s) return null;
    if (/\bInstagram\b/i.test(s)) return "instagram";
    /* revisión L07: con \b adelante. Suelto, el token también agarraba el
       de otra app de mensajería, que lo lleva pegado a otra palabra, y la
       mandaba acá: su regla de "otro", dos renglones abajo, nunca se
       alcanzaba (entorno.test.js [1]) */
    if (/FBAN\/|FBAV\/|FB_IAB|FB4A|\bMessenger/i.test(s)) return "facebook";
    if (/musical_ly|trill_|BytedanceWebview|\bTikTok\b/i.test(s)) return "tiktok";
    if (/;\s*wv\)/.test(s)) return "otro";
    if (/\b(Twitter|Snapchat|LinkedInApp|Line\/|MicroMessenger|Pinterest|GSA\/)/i.test(s)) return "otro";
    return null;
  };
  /* el nombre que se lee en el cartel, por app; y el navegador al que se
     manda, por sistema (en los dos textos de COPIAR EL LINK también) */
  E.NOMBRE_APP = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };
  E.NAVEGADOR = { android: "Chrome", ios: "Safari" };
  /* EL LINK PARA ABRIRLO AFUERA (Android): un intent:// que le pide al
     sistema abrir esta misma dirección con el navegador del teléfono (el
     paquete). Si no está, el sistema va a browser_fallback_url, que es la
     misma dirección (abre con el navegador que haya). La dirección va
     limpia: sin ?ref, sin ?embed y sin #. */
  E.linkIntentAndroid = function (href) {
    var limpio = E.linkLimpio(href);
    var m = limpio.match(/^https?:\/\/(.+)$/i);
    if (!m) return null;
    return "intent://" + m[1] + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
      encodeURIComponent(limpio) + ";end";
  };
  /* el texto del cartel, por app y por sistema: se habla de "tu carrera" y
     de lo que hay que tocar (sin masculino genérico). abrir: si va el botón
     del link de Android; boton: lo que dice; navegador: a dónde se pega el
     link si se copia */
  E.textoIntegrado = function (app, sistema) {
    if (!app) return null;
    var nombre = E.NOMBRE_APP[app];
    var nav = E.NAVEGADOR[sistema] || null;
    var t = {
      titulo: nombre ? "Estás en el navegador de " + nombre : "Estás en el navegador de una app",
      texto: "", pasos: null, abrir: false, boton: null,
      navegador: nav || "el navegador",
      nota: "Se puede jugar igual, pero lo que juegues acá queda solo adentro de esta app."
    };
    if (sistema === "android") {
      t.texto = "Para que tu carrera quede guardada y se juegue a pantalla completa, abrilo en " + nav + ".";
      t.abrir = true;
      t.boton = "ABRIR EN " + nav.toUpperCase();
    } else if (sistema === "ios") {
      t.texto = "Para que tu carrera quede guardada, abrilo en " + nav + ".";
      t.pasos = "Tocá el menú ··· (arriba a la derecha) y elegí «Abrir en el navegador».";
    } else {
      t.texto = "Para que tu carrera quede guardada, abrilo en el navegador del teléfono.";
    }
    return t;
  };
  /* §11 EXCEPCIÓN ACOTADA · hasta acá */
  /* la dirección para llevarse a otro navegador: sin ?ref, ?embed ni # */
  E.linkLimpio = function (href) {
    var s = String(href || "");
    var hash = s.indexOf("#");
    if (hash >= 0) s = s.slice(0, hash);
    var q = s.indexOf("?"), base = q >= 0 ? s.slice(0, q) : s, busq = q >= 0 ? s.slice(q + 1) : "";
    var partes = busq.split("&").filter(function (p) { return p && !/^(embed|ref)=/.test(p); });
    return base + (partes.length ? "?" + partes.join("&") : "");
  };

  /* ══════════════════════════════════════════════════════════════════════
     ¿EL GUARDADO ANDA? Escribe, lee y borra una clave de prueba. false si no
     hay almacenamiento (en un iframe de otro sitio con las cookies de
     terceros bloqueadas, LEER window.localStorage ya tira: quien llama pasa
     null), si setItem tira (bloqueado o lleno) o si lo escrito no vuelve.
     Antes master.js lo tragaba en silencio ("try { localStorage.setItem(…) }
     catch (e) { }") y se jugaban horas creyendo que quedaba guardado. */
  E.CLAVE_PRUEBA = "pampa_prueba_guardado";
  E.guardadoAndando = function (storage) {
    if (!storage || typeof storage.setItem !== "function") return false;
    try {
      storage.setItem(E.CLAVE_PRUEBA, "1");
      var ok = storage.getItem(E.CLAVE_PRUEBA) === "1";
      storage.removeItem(E.CLAVE_PRUEBA);
      return ok;
    } catch (e) { return false; }
  };

  return E;
});
