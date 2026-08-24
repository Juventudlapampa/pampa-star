/* ============================================================================
   PAMPA STAR · phaser/logic/jugadon.js — EL JUGADÓN (lógica PURA, V8 §3)
   La plataforma de acción con fichas limitadas: 2 SÚPER QUITES + 2 GAMBETAS
   + 2 SÚPER TIROS por partido. Acá viven:
   - la GAMBETA/ESQUIVE: rivales que VIENEN, opciones según la carta del
     jugador, LECTURA MUTUA (el rival INSINÚA su intención — elegida por sus
     stats + azar acotado ANTES de ver la tuya; la CPU nunca copia).
   - el SÚPER QUITE: el espejo defensivo (te metés en la jugada del rival).
   - el SÚPER TIRO con FÍSICA REAL: fuerza del pateador vs manos del arquero
     vs zona elegida. GEOMETRÍA, no dados: si el arquero no llega a la
     trayectoria en el tiempo de vuelo, es gol; si llega, fuerza vs manos
     (la pelota puede REVENTARLE las manos). El azar existe pero acotado
     por la física (el error de lectura del arquero y el desempate).
   SIN Phaser, SIN Math.random suelto (PRNG con semilla): corre en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaJugadon = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function rng(semilla) {
    var a = (semilla >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- LAS FICHAS (6 por partido) ---------- */
  function fichasNuevas() { return { quites: 2, gambetas: 2, tiros: 2 }; }
  function gastarFicha(fichas, tipo) {
    if (!fichas || !fichas[tipo] || fichas[tipo] <= 0) return false;
    fichas[tipo]--;
    return true;
  }

  /* ---------- LA CARTA: qué opciones tiene cada jugador ----------
     Un jugador random tiene pocas; un crack tiene más — por eso al crack
     no lo pasás con lo básico y hay que arriesgar el caño o el sombrerito. */
  var MOVIDAS = [
    { id: "izq", n: "A LA IZQUIERDA", min: 0 },
    { id: "der", n: "A LA DERECHA", min: 0 },
    { id: "enganche", n: "ENGANCHE", min: 55 },
    { id: "canio", n: "CAÑO", min: 70 },
    { id: "sombrerito", n: "SOMBRERITO", min: 82 }
  ];
  function opcionesDe(statGambeta) {
    return MOVIDAS.filter(function (m) { return (statGambeta || 0) >= m.min; });
  }

  /* ---------- LA GAMBETA: lectura mutua, sin trampa ----------
     El rival DECLARA su cierre (insinuado en pantalla) ANTES de tu elección:
     sale de sus stats + azar acotado — nunca de copiarte. La matriz decide:
     - cierra_izq pierde contra "der" (y viceversa): leíste el cierre.
     - se_tira (barrida) pierde contra "sombrerito" (salta) y "enganche"
       (frenás y la barrida pasa de largo); gana contra izq/der.
     - cierra el medio (firme) pierde contra "canio"; gana contra enganche.
     El desempate fino: tu gambeta vs su quite (+azar acotado). */
  var CIERRES = [
    { id: "cierra_izq", n: "TE CIERRA LA IZQUIERDA" },
    { id: "cierra_der", n: "TE CIERRA LA DERECHA" },
    { id: "firme", n: "SE PLANTA FIRME" },
    { id: "se_tira", n: "SE TIRA AL PISO" }
  ];
  function elegirCierre(defensor, r) {
    /* por sus stats: quite alto → más "firme" y "se_tira"; sin ver al jugador */
    var q = (defensor && defensor.quite) || 50;
    var pesos = [1, 1, q / 50, q / 60];
    var total = pesos.reduce(function (a, b) { return a + b; }, 0);
    var t = r() * total, acc = 0;
    for (var i = 0; i < CIERRES.length; i++) {
      acc += pesos[i];
      if (t < acc) return CIERRES[i];
    }
    return CIERRES[0];
  }
  function resolverMovida(movida, cierre, atacante, defensor, r) {
    var gana;   // ¿lo pasás?
    if (cierre.id === "cierra_izq") gana = movida === "der" || movida === "canio";
    else if (cierre.id === "cierra_der") gana = movida === "izq" || movida === "canio";
    else if (cierre.id === "firme") gana = movida === "canio" || movida === "sombrerito";
    else gana = movida === "sombrerito" || movida === "enganche";   // se_tira
    /* el desempate fino: stats + azar ACOTADO (±18%) — leer bien manda */
    var g = (atacante && atacante.gambeta) || 50, q = (defensor && defensor.quite) || 50;
    var margen = (g - q) / 100 + (r() - 0.5) * 0.36;
    if (gana && margen < -0.32) gana = false;    // te leyó el cuerpo igual (crack defensivo)
    if (!gana && margen > 0.38) gana = true;     // tu jerarquía lo pasa por arriba
    return { gana: gana, cierre: cierre, margen: margen };
  }

  /* ══════════════════════════════════════════════════════════════════════
     P7 · LA GAMBETA DEJA DE SER SIEMPRE LA MISMA.

     El reclamo de Rodri: "hoy el minijuego es esquivar y siempre aparece lo
     mismo". Era cierto de la PLATAFORMA (la corrida hacia el arco): todos los
     obstáculos eran el mismo objeto —un rival al que esquivabas de costado— y
     la única respuesta era moverse a un lado.

     Ahora la corrida es una SECUENCIA DE OBSTÁCULOS CON TIPO. Cada tipo pide
     un gesto distinto, y no siempre es esquivar:

       marca_izq / marca_der  te cierra un lado   → salís por el OTRO
       barrida                se tira al piso     → SALTÁS las piernas
       pozo                   el potrero, no un rival → SALTÁS
       firme                  se planta de frente → CAÑO (o amagás)
       dos_juntos             dos cerrando        → AMAGUE, los partís al medio

     Dos reglas de diseño, las dos verificables:
       1. NUNCA dos obstáculos iguales seguidos. Que la secuencia no se repita
          es lo que hace que haya que MIRAR en vez de apretar de memoria.
       2. Lo que no sabés hacer, no aparece. El caño pide 70 de gambeta: si no
          llegás, el obstáculo "firme" no sale en tu secuencia — no se puede
          poner una traba que el jugador no tiene con qué pasar.

     El pozo es el único que no es un rival, y es a propósito: en el potrero la
     cancha también juega.
     ══════════════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════════
     P1 · LA VARIEDAD DEL PASILLO.

     EL DIAGNÓSTICO, MEDIDO: había seis obstáculos y cinco gestos, y los SEIS
     pedían exactamente lo mismo — leer una etiqueta y tocar el botón que le
     corresponde. Cambiaba cuál era la respuesta, no qué clase de cosa te
     preguntaban. Y de seis obstáculos salían solo CUATRO respuestas distintas,
     porque `pozo` y `barrida` se vencen los dos con saltar y `firme` acepta
     dos gestos. Por eso a la tercera corrida ya no había pasillo: había una
     tabla de seis filas que te sabías.

     Un obstáculo no se define por CUÁL es la respuesta sino por QUÉ TE OBLIGA
     A HACER. Ahora hay cinco CLASES y cada una pide un músculo distinto:

       gesto       elegir el que lo vence          ← las seis de siempre
       lectura     leer al que te está leyendo     ← no tiene respuesta fija
       aguante     no se esquiva: elegís qué pagás ← y arrastra al siguiente
       envenenada  dos salidas, las dos cuestan    ← se cobra en el remate
       reloj       decidí antes de que se cierre   ← el único con tiempo

     La regla que las mantiene distintas está en secuenciaObstaculos: nunca dos
     de la misma clase seguidas, y como mucho UNA de reloj por corrida, al
     final. Sobre el reloj hay una advertencia larga allá abajo — el proyecto
     ya sacó dos QTE a propósito y esta clase es la única que puede desandarlo.
     ══════════════════════════════════════════════════════════════════════ */
  var OBSTACULOS = [
    /* ── CLASE gesto: las seis de siempre, intactas ── */
    { id: "marca_izq",  n: "TE CIERRA LA IZQUIERDA", clase: "gesto", gesto: "esquivar", vence: ["der"],              min: 0,  pose: "bloqueo" },
    { id: "marca_der",  n: "TE CIERRA LA DERECHA",   clase: "gesto", gesto: "esquivar", vence: ["izq"],              min: 0,  pose: "bloqueo" },
    { id: "barrida",    n: "SE TIRA AL PISO",        clase: "gesto", gesto: "saltar",   vence: ["saltar"],           min: 0,  pose: "barrida" },
    { id: "pozo",       n: "UN POZO EN EL PASTO",    clase: "gesto", gesto: "saltar",   vence: ["saltar"],           min: 0,  pose: null },
    { id: "firme",      n: "SE PLANTA DE FRENTE",    clase: "gesto", gesto: "caño",     vence: ["canio", "amague"],  min: 70, pose: "bloqueo" },
    { id: "dos_juntos", n: "DOS CERRÁNDOTE",         clase: "gesto", gesto: "amague",   vence: ["amague"],           min: 55, pose: "bloqueo" },

    /* ── CLASE lectura: DECLARA una intención, y puede estar mintiendo ──
       Es la única que no se resuelve con una tabla: no hay respuesta correcta,
       hay una lectura con información incompleta. Se puede jugar cien veces sin
       agotarse, que es exactamente lo que a las otras les falta. */
    { id: "te_lee",     n: "TE ESTÁ LEYENDO",        clase: "lectura", min: 0,  pose: "bloqueo" },

    /* ── CLASE aguante: NO SE ESQUIVA ──
       No te cierra un lado: se te tira encima y te va a pegar igual. Lo que
       elegís es cuánto pagás, y lo que elegiste ARRASTRA al obstáculo
       siguiente. Es lo que convierte una corrida en una jugada y no en tres
       preguntas sueltas. */
    { id: "se_te_viene", n: "SE TE TIRA ENCIMA",     clase: "aguante", min: 0,  pose: "bloqueo" },

    /* ── CLASE envenenada: dos salidas, las dos cuestan ──
       La consecuencia NO se ve acá: se ve al final, en el remate. Salir por
       afuera es casi seguro pero el arco te queda de costado; por el medio
       quedás de frente pero pasás menos veces. */
    { id: "te_encajona", n: "TE ENCAJONA CONTRA LA LÍNEA", clase: "envenenada", min: 0, pose: "bloqueo" },

    /* ── CLASE reloj: el único con tiempo ── */
    { id: "se_cierra",  n: "SE ESTÁ CERRANDO",       clase: "reloj",   min: 55, pose: "bloqueo" }
  ];

  /* las cinco clases, con lo que le pide cada una al jugador. El texto se
     muestra: si el jugador no sabe qué clase de pregunta le están haciendo,
     la variedad no existe aunque esté implementada. */
  /* La etiqueta dice QUE TE ESTAN PIDIENDO, no que esta pasando — eso ya lo
     dice el nombre del obstaculo. En la primera vuelta "se esta cerrando"
     aparecia DOS VECES en la misma pantalla (la etiqueta y el globo), que es
     ruido y encima tapa la unica informacion nueva. */
  var CLASES = {
    gesto:      { n: "¿con qué lo pasás?",  pide: "reconocer" },
    lectura:    { n: "leelo",               pide: "leer" },
    aguante:    { n: "esto no se esquiva",  pide: "aguantar" },
    envenenada: { n: "las dos te cuestan",  pide: "elegir qué perder" },
    reloj:      { n: "decidí YA",           pide: "decidir ya" }
  };
  function claseDe(obsOId) {
    if (obsOId && obsOId.clase) return obsOId.clase;
    for (var i = 0; i < OBSTACULOS.length; i++) if (OBSTACULOS[i].id === obsOId) return OBSTACULOS[i].clase || "gesto";
    return "gesto";
  }
  function obstaculoPorId(id) {
    for (var i = 0; i < OBSTACULOS.length; i++) if (OBSTACULOS[i].id === id) return OBSTACULOS[i];
    return null;
  }
  /* los gestos que el juego ofrece como botón/tecla */
  var GESTOS = [
    { id: "izq",    n: "◀ SALIR POR IZQUIERDA", min: 0 },
    { id: "der",    n: "SALIR POR DERECHA ▶",   min: 0 },
    { id: "saltar", n: "▲ SALTAR",              min: 0 },
    { id: "amague", n: "✦ AMAGAR",              min: 55 },
    { id: "canio",  n: "◎ CAÑO",                min: 70 }
  ];
  function gestosDe(statGambeta) {
    return GESTOS.filter(function (g) { return (statGambeta || 0) >= g.min; });
  }
  function obstaculosDe(statGambeta) {
    return OBSTACULOS.filter(function (o) { return (statGambeta || 0) >= o.min; });
  }

  /* La SECUENCIA de la corrida. Determinista por semilla (mismo save, misma
     corrida) y con la regla de no repetir el tipo anterior. Si el jugador es
     tan flojo que solo le entra un tipo de obstáculo, se permite repetir —
     antes que devolver una secuencia más corta de lo pedido. */
  function secuenciaObstaculos(cuantos, statGambeta, semilla, cfg) {
    cfg = cfg || {};
    var r = rng(semilla || 3);
    var pool = obstaculosDe(statGambeta);
    var n = Math.max(1, cuantos || 3);
    var out = [], ultimoId = null, ultimaClase = null;
    var relojes = 0, topeReloj = cfg.reloj_max_por_corrida != null ? cfg.reloj_max_por_corrida : 1;
    for (var i = 0; i < n; i++) {
      var esUltimo = (i === n - 1);
      var eleg = pool.filter(function (o) {
        if (o.id === ultimoId) return false;
        /* P1 · LA REGLA QUE HACE QUE LA VARIEDAD SE NOTE: nunca dos de la
           misma CLASE seguidas. Sin esto, tres obstáculos de gesto en fila se
           sienten igual que antes aunque existan las otras cuatro clases. */
        if ((o.clase || "gesto") === ultimaClase) return false;
        /* el reloj: como mucho uno por corrida, y solo en el último tramo.
           Ver la advertencia larga en resolverObstaculo. */
        if ((o.clase || "gesto") === "reloj" && (relojes >= topeReloj || !esUltimo)) return false;
        return true;
      });
      /* si la regla no deja nada, se afloja de a poco antes que devolver una
         corrida más corta: primero se permite repetir clase, después todo */
      if (!eleg.length) eleg = pool.filter(function (o) { return o.id !== ultimoId && (o.clase || "gesto") !== "reloj"; });
      if (!eleg.length) eleg = pool.filter(function (o) { return (o.clase || "gesto") !== "reloj"; });
      if (!eleg.length) eleg = pool;
      /* ══════════════════════════════════════════════════════════════════
         SE ELIGE LA CLASE PRIMERO, Y RECIEN DESPUES EL OBSTACULO.

         Medido: eligiendo del pool plano, la clase gesto se llevaba el 47%
         de los obstaculos — porque hay SEIS de gesto y uno de cada una de las
         otras cuatro. La variedad estaba implementada y no se notaba, que es
         la peor forma de no existir.

         Eligiendo la clase primero, las cinco pesan parejo y la corrida de
         tres obstaculos casi nunca repite el tipo de pregunta. Que haya seis
         obstaculos de gesto ahora sirve para lo que tiene que servir: que
         DENTRO de esa clase no se repita el mismo. */
      var clases = [];
      eleg.forEach(function (o) { var k = o.clase || "gesto"; if (clases.indexOf(k) < 0) clases.push(k); });
      var claseElegida = clases[Math.floor(r() * clases.length) % clases.length];
      var deLaClase = eleg.filter(function (o) { return (o.clase || "gesto") === claseElegida; });
      var o = deLaClase[Math.floor(r() * deLaClase.length) % deLaClase.length];
      out.push(o);
      ultimoId = o.id;
      ultimaClase = o.clase || "gesto";
      if (ultimaClase === "reloj") relojes++;
    }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     P1 · LA PUERTA ÚNICA DEL OBSTÁCULO.

     Es la misma lección del bloque de la música: si hay dos maneras de
     resolver un obstáculo, la segunda se va a olvidar de algo. Todas las
     clases entran por acá, devuelven la MISMA forma, y el render no sabe de
     qué clase es lo que está mostrando.

     Devuelve:
       pasa       ¿seguís?
       motivo     por qué (para que el aviso NOMBRE lo que pasó, nunca "no")
       costo      aguante que te comió (0 en casi todas)
       arrastre   lo que se lleva al obstáculo siguiente, o null
       lateral    cuánto te corriste hacia la línea (0..1), para el remate final

     ctx trae lo que dejó el obstáculo anterior: { arrastre, lateral }.
     ══════════════════════════════════════════════════════════════════════ */
  function resolverObstaculo(obs, eleccion, ctx, cfg, r) {
    obs = (typeof obs === "string") ? obstaculoPorId(obs) : obs;
    cfg = cfg || {}; ctx = ctx || {}; r = r || Math.random;
    if (!obs) return { pasa: false, motivo: "obstáculo desconocido", costo: 0, arrastre: null, lateral: 0 };
    var clase = obs.clase || "gesto";
    var base = { pasa: false, motivo: obs.n, costo: 0, arrastre: null, lateral: ctx.lateral || 0, clase: clase };

    /* el ARRASTRE del obstáculo anterior se cobra acá: si venías protegiendo la
       pelota, salís más lento y el siguiente te encuentra a contrapié. */
    var penal = (ctx.arrastre === "lento") ? (cfg.arrastre_penal != null ? cfg.arrastre_penal : 0.25) : 0;

    if (clase === "gesto") {
      base.pasa = obs.vence.indexOf(eleccion) >= 0;
      base.motivo = base.pasa ? "lo dejaste pagando" : obs.n;
      /* con arrastre, hasta el gesto correcto puede no alcanzar */
      if (base.pasa && penal > 0 && r() < penal) {
        base.pasa = false;
        base.motivo = "saliste lento de la anterior y te alcanzó";
      }
      return base;
    }

    if (clase === "lectura") {
      /* ctx.declarado y ctx.real los pone declaracionDe() ANTES de que elijas.
         El rival declara un lado; a veces miente. Vos ganás si tu gesto le
         gana a su intención REAL, no a la declarada. */
      var real = ctx.real || "izq";
      base.pasa = (real === "izq" && eleccion === "der") || (real === "der" && eleccion === "izq");
      if (base.pasa && penal > 0 && r() < penal) { base.pasa = false; base.motivo = "saliste lento y te alcanzó"; }
      else base.motivo = base.pasa
        ? (ctx.declarado !== real ? "te amagó y se la viste" : "se la leíste")
        : (ctx.declarado !== real ? "te amagó y te comió" : "lo tenías y te ganó igual");
      return base;
    }

    if (clase === "aguante") {
      if (eleccion === "proteger") {
        /* pasás seguro, pero pagás aguante y salís lento al siguiente */
        base.pasa = true;
        base.costo = cfg.proteger_costo != null ? cfg.proteger_costo : 90;
        base.arrastre = "lento";
        base.motivo = "metiste el cuerpo y no la soltaste";
        return base;
      }
      /* seguir de largo: mantenés la velocidad y tirás una moneda con el físico */
      var riesgo = cfg.seguir_riesgo != null ? cfg.seguir_riesgo : 0.35;
      base.pasa = r() >= riesgo;
      base.arrastre = base.pasa ? "rapido" : null;
      base.motivo = base.pasa ? "seguiste de largo y zafaste" : "seguiste de largo y te la sacó";
      return base;
    }

    if (clase === "envenenada") {
      var afuera = (eleccion === "afuera");
      var pasa = afuera
        ? (cfg.afuera_pasa != null ? cfg.afuera_pasa : 0.86)
        : (cfg.medio_pasa != null ? cfg.medio_pasa : 0.55);
      base.pasa = r() < pasa - penal;
      /* LO QUE SE COBRA DESPUÉS: salir por afuera te corre hacia la línea, y
         el remate del final sale desde un ángulo peor. logic/tiro.js ya sabe
         leer eso (usa centrado); acá solo se acumula. */
      if (afuera) base.lateral = Math.min(1, (ctx.lateral || 0) + (cfg.afuera_lateral != null ? cfg.afuera_lateral : 0.42));
      base.motivo = base.pasa
        ? (afuera ? "saliste por afuera: pasaste, pero te fuiste a la banda" : "te metiste por el medio y saliste de frente")
        : (afuera ? "te cerró contra la línea" : "por el medio había demasiada gente");
      return base;
    }

    if (clase === "reloj") {
      /* eleccion === null significa QUE SE TE ACABÓ EL TIEMPO: el rival cierra
         el lado que estabas mirando (ctx.mirando). No es azar, es tu inercia. */
      if (eleccion == null) {
        base.pasa = false;
        base.motivo = "no te decidiste y te cerró";
        return base;
      }
      var cierra = ctx.real || "izq";
      base.pasa = (cierra === "izq" && eleccion === "der") || (cierra === "der" && eleccion === "izq");
      base.motivo = base.pasa ? "saliste antes de que se cerrara" : "se cerró justo donde ibas";
      return base;
    }

    return base;
  }

  /* qué DECLARA el rival antes de que elijas. Solo tiene sentido en lectura y
     en reloj; en las demás devuelve null. El bluff es lo que hace que la clase
     lectura no se agote: si nunca mintiera, sería otra tabla. */
  function declaracionDe(obs, cfg, r, statGambeta) {
    obs = (typeof obs === "string") ? obstaculoPorId(obs) : obs;
    cfg = cfg || {}; r = r || Math.random;
    if (!obs) return null;
    var clase = obs.clase || "gesto";
    if (clase !== "lectura" && clase !== "reloj") return null;
    var real = r() < 0.5 ? "izq" : "der";
    if (clase === "reloj") return { declarado: null, real: real };
    var bluff = cfg.bluff_prob != null ? cfg.bluff_prob : 0.35;
    var miente = r() < bluff;
    /* ══════════════════════════════════════════════════════════════════
       EL CANTITO. Sin esto, la clase LECTURA es una moneda: contra un bluff
       del 35%, la mejor estrategia posible es creerle siempre y aun asi te
       comes el 35% — medido, era de lejos la clase donde mas se caia todo el
       mundo (38% incluso jugando bien), y eso en una jugada que te cuesta
       una ficha es injusto y no ensena nada.

       Ahora el rival SE CANTA, y cuanto lo ves depende de tu gambeta: el
       crack le ve la cadera y el pibe no. Es la misma idea que las cartas por
       puesto — quien sos decide que podes hacer — y usa la stat que ya
       estaba. Con cantito, adivinar deja de ser adivinar y pasa a ser leer.

       cantito viene solo cuando HAY bluff: si el rival no esta mintiendo no
       hay nada que cantar, y la declaracion ya es la verdad. */
    var pista = false;
    if (miente) {
      var st = clamp(((statGambeta || 50) - 50) / 49, 0, 1);
      var pMax = cfg.cantito_max != null ? cfg.cantito_max : 0.75;
      var pMin = cfg.cantito_min != null ? cfg.cantito_min : 0.10;
      pista = r() < (pMin + (pMax - pMin) * st);
    }
    return { declarado: miente ? (real === "izq" ? "der" : "izq") : real, real: real, bluff: miente, pista: pista };
  }

  /* qué BOTONES ofrece cada clase. El render pregunta acá y no sabe de clases:
     si mañana entra una sexta, no hay que tocar la pantalla. */
  function opcionesDeObstaculo(obs, statGambeta) {
    obs = (typeof obs === "string") ? obstaculoPorId(obs) : obs;
    if (!obs) return [];
    var clase = obs.clase || "gesto";
    if (clase === "aguante") return [
      { id: "proteger", n: "🛡 PROTEGERLA", sub: "pasás seguro, pero salís lento" },
      { id: "seguir",   n: "💨 SEGUIR DE LARGO", sub: "mantenés la velocidad y jugás al físico" }
    ];
    if (clase === "envenenada") return [
      { id: "afuera", n: "↗ POR AFUERA", sub: "casi seguro, pero el arco te queda de costado" },
      { id: "medio",  n: "↑ POR EL MEDIO", sub: "menos veces sale, pero quedás de frente" }
    ];
    /* lectura y reloj usan los dos lados de siempre; gesto, todos los gestos */
    if (clase === "lectura" || clase === "reloj") return [
      { id: "izq", n: "◀ SALIR POR IZQUIERDA", sub: null },
      { id: "der", n: "SALIR POR DERECHA ▶", sub: null }
    ];
    return gestosDe(statGambeta).map(function (g) { return { id: g.id, n: g.n, sub: null }; });
  }

  /* ¿el gesto pasa el obstáculo? Sin azar: la LECTURA manda. El desempate por
     stats sigue viviendo en resolverMovida, que es el duelo cara a cara. */
  function pasaObstaculo(obstaculoId, gestoId) {
    var o = null;
    for (var i = 0; i < OBSTACULOS.length; i++) if (OBSTACULOS[i].id === obstaculoId) o = OBSTACULOS[i];
    if (!o) return false;
    return o.vence.indexOf(gestoId) >= 0;
  }

  /* estado de la PLATAFORMA (cancha más ancha que larga) */
  function crearGambeta(opts) {
    var r = rng(opts.semilla || 7);
    var n = clamp(opts.marcadores || 1, 1, 2);   // ves cuántos vienen: uno o dos
    var defs = [];
    for (var i = 0; i < n; i++) {
      var d = opts.defensores && opts.defensores[i] ? opts.defensores[i] : { quite: 55 };
      defs.push({
        quite: d.quite || 55, nombre: d.nombre || "RIVAL",
        x: 480 + (i === 0 ? 0 : (r() < 0.5 ? -170 : 170)),
        y: 70 + i * 60,
        cierre: elegirCierre(d, r)   // su intención YA declarada (se insinúa)
      });
    }
    return {
      W: 960, H: 400,                 // más ancha que larga (el prototipo aprobado)
      modo: "gambeta",
      atacante: opts.atacante || { gambeta: 60 },
      defensores: defs, paso: 0,
      opciones: opcionesDe((opts.atacante && opts.atacante.gambeta) || 0),
      _r: r, terminado: false, exito: null
    };
  }
  /* un CRUCE de la plataforma: tu movida contra el defensor del paso */
  function cruceGambeta(g, movidaId) {
    if (g.terminado) return null;
    var d = g.defensores[g.paso];
    var res = resolverMovida(movidaId, d.cierre, g.atacante, d, g._r);
    res.defensor = d;
    if (!res.gana) { g.terminado = true; g.exito = false; }
    else {
      g.paso++;
      if (g.paso >= g.defensores.length) { g.terminado = true; g.exito = true; }
      else g.defensores[g.paso].cierre = elegirCierre(g.defensores[g.paso], g._r);
    }
    return res;
  }

  /* ---------- EL SÚPER QUITE: el espejo defensivo ----------
     El rival conduce; vos elegís CÓMO meterte. Él insinúa su movida (por sus
     stats, sin verte); tu respuesta correcta se la roba. */
  function crearQuite(opts) {
    var r = rng(opts.semilla || 11);
    var mov = MOVIDAS[Math.floor(r() * Math.min(3 + Math.floor(((opts.rival && opts.rival.gambeta) || 50) / 30), MOVIDAS.length))];
    return {
      W: 960, H: 400, modo: "quite",
      defensor: opts.defensor || { quite: 60 },
      rival: opts.rival || { gambeta: 55, nombre: "RIVAL" },
      movidaRival: mov,   // se INSINÚA en pantalla
      _r: r, terminado: false, exito: null
    };
  }
  function resolverQuite(q, cierreId) {
    if (q.terminado) return null;
    var cierre = null;
    for (var i = 0; i < CIERRES.length; i++) if (CIERRES[i].id === cierreId) cierre = CIERRES[i];
    if (!cierre) cierre = CIERRES[2];
    /* el espejo exacto de la matriz: si TU cierre vence su movida, se la robás */
    var res = resolverMovida(q.movidaRival.id, cierre, q.rival, q.defensor, q._r);
    q.terminado = true;
    q.exito = !res.gana;   // si su movida NO lo pasa, el quite fue tuyo
    return { gana: q.exito, movidaRival: q.movidaRival, margen: res.margen };
  }

  /* ---------- EL SÚPER TIRO: FÍSICA REAL (lo clave) ----------
     Arco de 400×140 (px de plataforma). zona = {x: -200..200, y: 0..140}
     (0 = centro abajo; |x| grande = palo; y alto = ángulo).
     1) el ARQUERO ELIGE dónde volar: lee tu cuerpo con ERROR según sus
        reflejos (mejor arquero = menos error) — NUNCA conoce la zona exacta.
     2) GEOMETRÍA: ¿llega? distancia de su vuelo vs alcance en el tiempo de
        vuelo (la fuerza acorta el tiempo). Si no llega: GOL. Sin dados.
     3) si llega: FUERZA vs MANOS — pAtaja = manos/(manos + fuerza·k). Si la
        fuerza lo revienta (margen grande), la pelota se le escapa: REBOTE.
     4) la PRECISIÓN del pateador mueve la zona real (un tiro al ángulo con
        poca técnica puede irse AFUERA). */
  var ARCO = { w: 400, h: 140 };
  function resolverSuperTiro(opts) {
    var r = rng(opts.semilla || 13);
    var fuerza = clamp(opts.fuerza || 60, 1, 200);          // stat tiro + energía
    var precision = clamp(opts.precision || 60, 1, 99);
    var A = opts.arquero || {};
    var reflejos = clamp(A.reflejos || 50, 1, 99);
    var manos = clamp(A.manos || reflejos, 1, 120);
    var zona = { x: clamp(opts.zona.x, -ARCO.w / 2, ARCO.w / 2), y: clamp(opts.zona.y || 0, 0, ARCO.h) };

    /* 4) la zona REAL: el error del pateador crece con la ambición (al ángulo)
       y baja con su técnica */
    var ambicion = (Math.abs(zona.x) / (ARCO.w / 2) + zona.y / ARCO.h) / 2;
    var errPate = (1 - precision / 100) * 90 * (0.5 + ambicion);
    var zx = zona.x + (r() * 2 - 1) * errPate;
    var zy = clamp(zona.y + (r() * 2 - 1) * errPate * 0.5, 0, ARCO.h + 40);
    if (Math.abs(zx) > ARCO.w / 2 + 6 || zy > ARCO.h + 6) {
      return { outcome: "afuera", detalle: { zonaReal: { x: zx, y: zy }, errPate: errPate } };
    }
    zx = clamp(zx, -ARCO.w / 2, ARCO.w / 2); zy = clamp(zy, 0, ARCO.h);

    /* 1) el arquero LEE con error (nunca 0: no adivina) y a veces se la juega */
    var errArq = Math.max(24, (100 - reflejos) * 2.2);
    var lee = zona.x + (r() * 2 - 1) * errArq;
    if (r() < 0.12) lee = (r() < 0.5 ? -1 : 1) * ARCO.w * 0.33;   // se la jugó a un palo
    var arqX = clamp(lee, -ARCO.w / 2, ARCO.w / 2);

    /* 2) GEOMETRÍA: tiempo de vuelo (la fuerza lo achica) vs su alcance */
    var tVuelo = clamp(0.9 - fuerza / 260, 0.25, 0.9);            // seg
    var alcance = 36 + reflejos * 2.1 * tVuelo;                    // px que cubre volando
    var dist = Math.hypot(zx - arqX, zy * 0.55);                   // llegar ARRIBA cuesta más
    if (dist > alcance) {
      return { outcome: "gol", detalle: { llego: false, dist: dist, alcance: alcance, arqX: arqX, zonaReal: { x: zx, y: zy } } };
    }

    /* 3) llegó: FUERZA vs MANOS (k=0.55: el tiro flojo se retiene; el
       fuerte pelea; el brutal revienta) */
    var pAtaja = manos / (manos + fuerza * 0.55);
    var tirada = r();
    if (tirada < pAtaja) {
      return { outcome: "atajada", detalle: { llego: true, dist: dist, alcance: alcance, arqX: arqX, pAtaja: pAtaja } };
    }
    /* no la retuvo: ¿se la reventó (rebote vivo) o se le escapó adentro? */
    var reventada = fuerza > manos * 1.35;
    return {
      outcome: reventada && tirada < pAtaja + 0.22 ? "rebote" : "gol",
      detalle: { llego: true, dist: dist, alcance: alcance, arqX: arqX, pAtaja: pAtaja, reventada: reventada }
    };
  }

  return {
    fichasNuevas: fichasNuevas, gastarFicha: gastarFicha,
    MOVIDAS: MOVIDAS, CIERRES: CIERRES, opcionesDe: opcionesDe,
    elegirCierre: elegirCierre, resolverMovida: resolverMovida,
    crearGambeta: crearGambeta, cruceGambeta: cruceGambeta,
    crearQuite: crearQuite, resolverQuite: resolverQuite,
    OBSTACULOS: OBSTACULOS, GESTOS: GESTOS, gestosDe: gestosDe, obstaculosDe: obstaculosDe,
    CLASES: CLASES, claseDe: claseDe, obstaculoPorId: obstaculoPorId,
    resolverObstaculo: resolverObstaculo, declaracionDe: declaracionDe, opcionesDeObstaculo: opcionesDeObstaculo,
    secuenciaObstaculos: secuenciaObstaculos, pasaObstaculo: pasaObstaculo,
    ARCO: ARCO, resolverSuperTiro: resolverSuperTiro, rng: rng
  };
});
