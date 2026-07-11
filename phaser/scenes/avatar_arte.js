/* ============================================================================
   PAMPA STAR · phaser/scenes/avatar_arte.js — EL DIBUJO del avatar por capas
   Hornea texturas Phaser a partir de un "look" (logic/avatar.js). Todo por
   código, original. Regla daltonismo: cada corte/ojo/boca es una FORMA
   distinta; los colores llegan del catálogo con nombre y HEX.
   Tres tamaños: CARA grande (editor + zoom del cine), JUGADOR de cancha
   (34×50, idle+run) y CINE-JUGADOR (96×112, pose esfuerzo con TU cara).
   ========================================================================== */
window.PampaAvatarArte = (function () {
  "use strict";
  var A = window.PampaAvatar;
  var VINCHA = 0xf6c11d, BLANCO = 0xffffff, TINTA = 0x14110c, BOCA = 0x7a3b2a;
  var CAM_MIA = 0x5bb8e8, RIV1 = 0xe3503e, RIV2 = 0x8a1f3a;

  function bake(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    var g = scene.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* ============ CARA GRANDE (120×140): editor + primer plano ============ */
  function cara(scene, key, look) {
    var r = A.resolver(look), piel = A.hexNum(r.piel.hex), pelo = A.hexNum(r.colorPelo.hex);
    bake(scene, key, 120, 140, function (g) {
      /* cuello + hombros con la camiseta (celeste del equipo, estilo = forma) */
      g.fillStyle(piel); g.fillRect(50, 96, 20, 14);
      g.fillStyle(CAM_MIA); g.fillRoundedRect(22, 104, 76, 34, 10);
      if (r.camiseta.id === "banda") { g.fillStyle(BLANCO, 0.85); g.fillRect(30, 108, 10, 30); g.fillRect(40, 112, 8, 26); }
      if (r.camiseta.id === "cuello") { g.fillStyle(BLANCO, 0.9); g.fillTriangle(52, 104, 68, 104, 60, 118); g.fillStyle(piel); g.fillTriangle(55, 104, 65, 104, 60, 113); }
      /* orejas + cabeza */
      g.fillStyle(piel); g.fillRoundedRect(24, 54, 10, 16, 4); g.fillRoundedRect(86, 54, 10, 16, 4);
      g.fillStyle(piel); g.fillRoundedRect(30, 26, 60, 74, 18);
      /* PELO por CORTE (forma propia cada uno) */
      g.fillStyle(pelo);
      if (r.corte.id === "rapado") { g.fillRoundedRect(32, 24, 56, 10, 5); }
      else if (r.corte.id === "corto") { g.fillRoundedRect(28, 20, 64, 20, 9); }
      else if (r.corte.id === "flequillo") {
        g.fillRoundedRect(28, 20, 64, 18, 9);
        for (var f = 0; f < 5; f++) g.fillRect(34 + f * 11, 34, 8, 8 + (f % 2) * 4);   // dientes del flequillo
      } else if (r.corte.id === "rulos") {
        g.fillRoundedRect(30, 22, 60, 14, 7);
        for (var q = 0; q < 5; q++) { g.fillCircle(36 + q * 12, 24, 8); }
        g.fillCircle(30, 34, 7); g.fillCircle(90, 34, 7);
      } else if (r.corte.id === "colita") {
        g.fillRoundedRect(28, 20, 64, 18, 9);
        g.fillRoundedRect(88, 30, 14, 34, 6);                                          // la colita al costado
        g.fillStyle(VINCHA); g.fillRect(88, 38, 14, 4); g.fillStyle(pelo);
      } else { /* melena */
        g.fillRoundedRect(28, 20, 64, 20, 9);
        g.fillRoundedRect(26, 32, 12, 48, 5); g.fillRoundedRect(82, 32, 12, 48, 5);    // caída a los costados
      }
      /* VINCHA (banda con puntos, forma clara) */
      if (r.conVincha) {
        g.fillStyle(VINCHA); g.fillRect(29, 38, 62, 9);
        g.fillStyle(TINTA); g.fillRect(36, 41, 4, 3); g.fillRect(58, 41, 4, 3); g.fillRect(80, 41, 4, 3);
      }
      /* CEJAS (forma) */
      g.fillStyle(TINTA);
      if (r.cejas.id === "finas") { g.fillRect(40, 54, 14, 3); g.fillRect(66, 54, 14, 3); }
      else if (r.cejas.id === "gruesas") { g.fillRect(38, 52, 17, 6); g.fillRect(65, 52, 17, 6); }
      else { g.fillRect(40, 52, 14, 4); g.fillRect(50, 56, 5, 4); g.fillRect(66, 56, 14, 4); g.fillRect(65, 52, 5, 4); }  // fruncidas (en ángulo)
      /* OJOS (forma) */
      if (r.ojos.id === "despiertos") {
        g.fillStyle(BLANCO); g.fillRoundedRect(40, 62, 14, 12, 3); g.fillRoundedRect(66, 62, 14, 12, 3);
        g.fillStyle(TINTA); g.fillRect(45, 66, 5, 6); g.fillRect(71, 66, 5, 6);
      } else if (r.ojos.id === "tranquilos") {
        g.fillStyle(BLANCO); g.fillRoundedRect(40, 66, 14, 7, 3); g.fillRoundedRect(66, 66, 14, 7, 3);
        g.fillStyle(TINTA); g.fillRect(45, 68, 5, 4); g.fillRect(71, 68, 5, 4);
        g.fillRect(40, 64, 14, 2); g.fillRect(66, 64, 14, 2);                          // párpado
      } else { /* pícaros: pupilas al costado + un guiño de ceja */
        g.fillStyle(BLANCO); g.fillRoundedRect(40, 62, 14, 11, 3); g.fillRoundedRect(66, 62, 14, 11, 3);
        g.fillStyle(TINTA); g.fillRect(48, 65, 5, 6); g.fillRect(74, 65, 5, 6);
      }
      /* nariz + BOCA (forma) */
      g.fillStyle(TINTA, 0.35); g.fillRect(58, 74, 4, 8);
      if (r.boca.id === "sonrisa") { g.fillStyle(BOCA); g.fillRect(48, 86, 24, 4); g.fillRect(45, 83, 4, 4); g.fillRect(71, 83, 4, 4); }
      else if (r.boca.id === "seria") { g.fillStyle(BOCA); g.fillRect(49, 86, 22, 3); }
      else { g.fillStyle(TINTA); g.fillRoundedRect(49, 82, 22, 13, 5); g.fillStyle(0xc65a4a); g.fillRect(53, 90, 14, 4); }  // gritando
    });
  }

  /* ============ JUGADOR DE CANCHA (34×50, idle + run) ============ */
  function jugador(scene, keyBase, look, esRival) {
    var r = A.resolver(look), piel = A.hexNum(r.piel.hex), pelo = A.hexNum(r.colorPelo.hex);
    var camisa = function (g) {
      if (esRival) {   // el RIVAL siempre A FRANJAS (identidad por forma, no se toca)
        for (var i = 0; i < 16; i += 4) { g.fillStyle(RIV1); g.fillRect(8 + i, 14, 2, 15); g.fillStyle(RIV2); g.fillRect(10 + i, 14, 2, 15); }
        g.fillStyle(0x1a1a1a); g.fillRoundedRect(9, 27, 14, 6, 2);
      } else {
        g.fillStyle(CAM_MIA); g.fillRoundedRect(8, 14, 16, 15, 4);
        if (r.camiseta.id === "banda") { g.fillStyle(BLANCO, 0.9); g.fillRect(11, 14, 3, 15); }
        if (r.camiseta.id === "cuello") { g.fillStyle(BLANCO, 0.9); g.fillTriangle(13, 14, 19, 14, 16, 19); }
        g.fillStyle(0xf6efdc); g.fillRoundedRect(9, 27, 14, 6, 2);
      }
    };
    var cabeza = function (g) {
      /* pelo por corte, chiquito pero con forma */
      g.fillStyle(pelo);
      if (r.corte.id === "rapado") g.fillRoundedRect(10, 3, 12, 4, 2);
      else if (r.corte.id === "rulos") { g.fillRoundedRect(9, 2, 14, 7, 3); g.fillCircle(10, 4, 3); g.fillCircle(16, 2, 3); g.fillCircle(22, 4, 3); }
      else if (r.corte.id === "colita") { g.fillRoundedRect(9, 2, 14, 8, 3); g.fillRect(23, 5, 4, 9); }
      else if (r.corte.id === "melena") { g.fillRoundedRect(9, 2, 14, 8, 3); g.fillRect(8, 6, 3, 10); g.fillRect(21, 6, 3, 10); }
      else g.fillRoundedRect(9, 2, 14, 8, 3);                        // corto / flequillo
      g.fillStyle(piel); g.fillRoundedRect(10, 5, 12, 9, 3);
      if (r.corte.id === "flequillo") { g.fillStyle(pelo); g.fillRect(11, 5, 3, 3); g.fillRect(16, 5, 3, 2); g.fillRect(20, 5, 2, 3); }
      if (r.conVincha) { g.fillStyle(VINCHA); g.fillRect(10, 6, 12, 2); }
      g.fillStyle(BOCA); g.fillRect(13, 12, 6, 1);
      g.fillStyle(TINTA); if (esRival) g.fillRect(12, 8, 2, 2); else g.fillRect(18, 8, 2, 2);
    };
    var pierna = function (g, x, y) { g.fillStyle(piel); g.fillRect(x, y, 4, 8); g.fillStyle(0xe8e4d4); g.fillRect(x, y + 8, 4, 4); g.fillStyle(TINTA); g.fillRect(x - 1, y + 12, 6, 3); };
    var brazo = function (g, x, y, h) {
      g.fillStyle(esRival ? RIV1 : CAM_MIA); g.fillRect(x, y, 3, h);
      if (r.conMunequeras) { g.fillStyle(VINCHA); g.fillRect(x, y + h - 1, 3, 2); }
      g.fillStyle(piel); g.fillRect(x, y + h + 1, 3, 3);
    };
    bake(scene, keyBase + "_idle", 34, 50, function (g) {
      g.fillStyle(0x0a1f13, 0.30); g.fillEllipse(16, 45, 22, 6);
      cabeza(g); camisa(g);
      pierna(g, 11, 32); pierna(g, 19, 32);
      brazo(g, 5, 16, 9); brazo(g, 24, 16, 9);
    });
    bake(scene, keyBase + "_run", 34, 50, function (g) {
      g.fillStyle(0x0a1f13, 0.30); g.fillEllipse(16, 45, 22, 6);
      cabeza(g); camisa(g);
      pierna(g, 8, 32); pierna(g, 21, 30);
      brazo(g, 24, 14, 9); brazo(g, 6, 18, 8);
    });
  }

  /* ============ CINE-JUGADOR (96×112): la pose esfuerzo con TU cara ============ */
  function cineJugador(scene, key, look) {
    var r = A.resolver(look), piel = A.hexNum(r.piel.hex), pelo = A.hexNum(r.colorPelo.hex);
    bake(scene, key, 96, 112, function (g) {
      /* pelo grande por corte */
      g.fillStyle(pelo);
      if (r.corte.id === "rapado") g.fillRoundedRect(32, 6, 32, 8, 4);
      else if (r.corte.id === "rulos") { g.fillRoundedRect(30, 2, 36, 14, 7); g.fillCircle(32, 6, 6); g.fillCircle(48, 1, 6); g.fillCircle(64, 6, 6); }
      else if (r.corte.id === "colita") { g.fillRoundedRect(30, 2, 36, 18, 8); g.fillRoundedRect(64, 8, 9, 22, 4); }
      else if (r.corte.id === "melena") { g.fillRoundedRect(30, 2, 36, 20, 8); g.fillRect(28, 12, 7, 26); g.fillRect(61, 12, 7, 26); }
      else g.fillRoundedRect(30, 2, 36, 20, 8);                                  // corto / flequillo
      /* cara */
      g.fillStyle(piel); g.fillRoundedRect(33, 10, 30, 30, 8);
      if (r.corte.id === "flequillo") { g.fillStyle(pelo); g.fillRect(35, 10, 6, 5); g.fillRect(44, 10, 6, 4); g.fillRect(53, 10, 6, 5); }
      if (r.conVincha) { g.fillStyle(VINCHA); g.fillRect(33, 14, 30, 5); g.fillStyle(TINTA); g.fillRect(40, 16, 2, 2); g.fillRect(54, 16, 2, 2); }
      /* cejas / ojos / boca del look (TU cara en el zoom) */
      g.fillStyle(TINTA);
      if (r.cejas.id === "finas") { g.fillRect(37, 21, 9, 2); g.fillRect(50, 21, 9, 2); }
      else if (r.cejas.id === "gruesas") { g.fillRect(36, 20, 10, 4); g.fillRect(50, 20, 10, 4); }
      else { g.fillRect(37, 20, 9, 3); g.fillRect(43, 23, 3, 3); g.fillRect(50, 23, 9, 3); g.fillRect(50, 20, 3, 3); }
      if (r.ojos.id === "tranquilos") { g.fillStyle(TINTA); g.fillRect(39, 27, 6, 2); g.fillRect(52, 27, 6, 2); }
      else {
        g.fillStyle(BLANCO); g.fillRect(38, 25, 8, 6); g.fillRect(51, 25, 8, 6);
        g.fillStyle(TINTA);
        var ox = r.ojos.id === "picaros" ? 3 : 1;
        g.fillRect(38 + ox + 1, 26, 4, 4); g.fillRect(51 + ox + 1, 26, 4, 4);
      }
      if (r.boca.id === "sonrisa") { g.fillStyle(BOCA); g.fillRect(41, 33, 14, 3); g.fillRect(39, 31, 3, 3); g.fillRect(55, 31, 3, 3); }
      else if (r.boca.id === "seria") { g.fillStyle(BOCA); g.fillRect(42, 33, 12, 3); }
      else { g.fillStyle(TINTA); g.fillRoundedRect(41, 30, 14, 8, 3); g.fillStyle(0xc65a4a); g.fillRect(44, 35, 8, 2); }
      /* torso + estilo de camiseta */
      g.fillStyle(CAM_MIA); g.fillRoundedRect(20, 38, 56, 60, 12);
      g.fillStyle(BLANCO); g.fillRect(24, 44, 48, 3);
      if (r.camiseta.id === "banda") { g.fillStyle(BLANCO, 0.85); g.fillRect(28, 38, 12, 60); }
      if (r.camiseta.id === "cuello") { g.fillStyle(BLANCO, 0.9); g.fillTriangle(40, 38, 56, 38, 48, 52); g.fillStyle(piel); g.fillTriangle(44, 38, 52, 38, 48, 47); }
      /* brazos abiertos por el impulso + muñequeras */
      g.fillStyle(CAM_MIA); g.fillRoundedRect(4, 46, 18, 16, 6); g.fillRoundedRect(74, 46, 18, 16, 6);
      if (r.conMunequeras) { g.fillStyle(VINCHA); g.fillRect(4, 58, 12, 5); g.fillRect(80, 58, 12, 5); }
      g.fillStyle(piel); g.fillCircle(8, 66, 8); g.fillCircle(88, 66, 8);
    });
  }

  /* ============ ETAPA 4 · SPRITE HEROICO (dirección de arte de Rodri) ============
     Pixel art original de CUERPO ENTERO, proporción heroica (~4.5 cabezas),
     visto de ¾ TRASEROS corriendo hacia el arco lejano. 4 frames por animación:
     correr, gambeta, pase, tiro, volea, cabezazo, festejo (+ arquero: parado,
     estirada, atajada, despeje). Kits parametrizables: titular celeste #4FC3F7
     liso con vivos blancos vs rival naranja #FF8A50 A RAYAS con vivos negros —
     la distinción se sostiene por DISEÑO (rayas vs liso) y por el NÚMERO en la
     espalda, nunca por color solo. */
  var KITS = {
    mio: { cam: 0x4fc3f7, vivo: 0xffffff, short: 0xf6efdc, media: 0xffffff, rayas: false },
    rival: { cam: 0xff8a50, vivo: 0x000000, short: 0x1a1a1a, media: 0x000000, rayas: true },
    arqMio: { cam: 0x1d4fd6, vivo: 0xffffff, short: 0x14110c, media: 0xffffff, rayas: false },
    arqRival: { cam: 0xf6c11d, vivo: 0x000000, short: 0x1a1a1a, media: 0x000000, rayas: true }
  };
  var W_H = 48, H_H = 108, AIRE = 14, CX = 24, PISO = 86;   // AIRE arriba: los saltos no se clipean

  function _tramo(g, x0, y0, x1, y1, w, col) {   // "hueso" pixelado: cadena de cuadraditos
    var n = 4;
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      g.fillStyle(col);
      g.fillRect(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w);
    }
  }
  function _cuerpo(g, look, kit, numero, p) {
    var r = A.resolver(look), piel = A.hexNum(r.piel.hex), pelo = A.hexNum(r.colorPelo.hex);
    var dy = -(p.salto || 0), lean = p.lean || 0;
    var hipY = 52 + dy, hombroY = 30 + dy, cabX = CX + lean;
    g.fillStyle(0x0a1f13, 0.3); g.fillEllipse(CX, PISO + 3, 26, 5);
    /* piernas: muslo piel → media → botín (pie en p.pi / p.pd) */
    var pierna = function (hx, f) {
      /* rodilla = punto medio real cadera→pie (ambos ABSOLUTOS, con el salto incluido) */
      var px2 = CX + f[0], py2 = f[1] + dy;
      var kx = (hx + px2) / 2 + (f[2] || 0), ky = (hipY + py2) / 2;
      _tramo(g, hx, hipY, kx, ky, 7, piel);
      _tramo(g, kx, ky, px2, py2, 6, kit.media);
      g.fillStyle(0x14110c); g.fillRect(px2 - 4, py2 - 3, 9, 5);   // botín
    };
    pierna(CX - 5, p.pi); pierna(CX + 5, p.pd);
    /* short */
    g.fillStyle(kit.short); g.fillRect(CX - 10 + lean / 2, hipY - 8, 20, 10);
    /* torso DE ESPALDAS: camiseta con diseño del kit + NÚMERO en la espalda */
    g.fillStyle(kit.cam); g.fillRect(CX - 11 + lean, hombroY, 22, hipY - 6 - hombroY);
    if (kit.rayas) { for (var rx = -9; rx <= 9; rx += 6) { g.fillStyle(kit.vivo, 0.85); g.fillRect(CX + rx + lean - 1, hombroY, 3, hipY - 6 - hombroY); } }
    else { g.fillStyle(kit.vivo, 0.9); g.fillRect(CX - 11 + lean, hombroY + 2, 22, 2); g.fillRect(CX - 11 + lean, hipY - 9, 22, 2); }
    /* brazos: hombro → mano (p.bi / p.bd), manga con vivo */
    var brazo = function (sx, m) {
      _tramo(g, sx + lean, hombroY + 3, CX + m[0], m[1] + dy, 5, kit.cam);
      g.fillStyle(piel); g.fillRect(CX + m[0] - 2, m[1] + dy - 2, 5, 5);       // mano
      if (r.conMunequeras) { g.fillStyle(0xf6c11d); g.fillRect(CX + m[0] - 3, m[1] + dy + 2, 7, 2); }
    };
    brazo(CX - 12, p.bi); brazo(CX + 12, p.bd);
    /* número en la espalda (identidad + accesibilidad, no solo color) —
       sobre un PARCHE liso del color de la camiseta: legible también en la rayada */
    if (numero != null && !p.sinNumero) {
      var nx = CX + lean, dígitos = String(numero);
      var anchoNum = dígitos.length * 8 + 2;
      g.fillStyle(kit.cam, 1); g.fillRect(nx - anchoNum / 2 - 1, hombroY + 4, anchoNum + 2, 14);
      g.fillStyle(kit.vivo, 1);
      var seg = { "0": [0,1,2,5,7,10,12,15,17,20,21,22], "1": [2,7,12,17,22], "2": [0,1,2,7,10,11,12,15,20,21,22], "3": [0,1,2,7,10,11,12,17,20,21,22], "4": [0,5,10,11,12,2,7,17,22], "5": [0,1,2,5,10,11,12,17,20,21,22], "6": [0,1,2,5,10,11,12,15,17,20,21,22], "7": [0,1,2,7,12,17,22], "8": [0,1,2,5,7,10,11,12,15,17,20,21,22], "9": [0,1,2,5,7,10,11,12,17,20,21,22] };
      var offX = nx - (dígitos.length * 8 - 2) / 2;
      for (var di = 0; di < dígitos.length; di++) {
        (seg[dígitos[di]] || []).forEach(function (celda) {
          g.fillRect(offX + di * 8 + (celda % 5) * 2, hombroY + 6 + Math.floor(celda / 5) * 2, 2, 2);
        });
      }
    }
    /* cabeza desde atrás (GRANDE, proporción heroica ~3.7 cabezas): nuca con la FORMA del corte */
    g.fillStyle(piel); g.fillRect(cabX - 8, 8 + dy, 16, 20);
    g.fillStyle(piel); g.fillRect(cabX - 10, 16 + dy, 3, 6); g.fillRect(cabX + 7, 16 + dy, 3, 6);
    g.fillStyle(pelo);
    if (r.corte.id === "rapado") g.fillRect(cabX - 8, 8 + dy, 16, 7);
    else if (r.corte.id === "rulos") { g.fillRect(cabX - 9, 6 + dy, 18, 12); g.fillCircle(cabX - 7, 9 + dy, 4); g.fillCircle(cabX, 5 + dy, 4); g.fillCircle(cabX + 7, 9 + dy, 4); }
    else if (r.corte.id === "colita") { g.fillRect(cabX - 9, 6 + dy, 18, 14); g.fillRect(cabX - 2, 20 + dy, 4, 9); }
    else if (r.corte.id === "melena") { g.fillRect(cabX - 9, 6 + dy, 18, 21); }
    else g.fillRect(cabX - 9, 6 + dy, 18, 13);                    // corto / flequillo
    if (r.conVincha) { g.fillStyle(0xf6c11d); g.fillRect(cabX - 9, 18 + dy, 18, 3); }
  }
  /* poses: pi/pd = pie [dx, y, rodillaDx] · bi/bd = mano [dx, y] · salto · lean */
  var POSES = {
    /* Feel B7: ciclo de correr de 6 frames (contacto → transición → paso, espejado) */
    correr: [
      { pi: [-9, PISO], pd: [11, PISO - 13, 3], bi: [-14, 40], bd: [13, 52] },
      { pi: [-6, PISO], pd: [8, PISO - 8, 2], bi: [-14, 43], bd: [13, 49], salto: 1 },
      { pi: [-3, PISO], pd: [5, PISO - 5, 2], bi: [-13, 46], bd: [13, 46] },
      { pi: [11, PISO - 13, 3], pd: [-9, PISO], bi: [13, 52], bd: [-14, 40] },
      { pi: [8, PISO - 8, 2], pd: [-6, PISO], bi: [13, 49], bd: [-14, 43], salto: 1 },
      { pi: [5, PISO - 5, 2], pd: [-3, PISO], bi: [13, 46], bd: [-13, 46] }
    ],
    gambeta: [
      { pi: [-15, PISO], pd: [7, PISO - 5, 2], bi: [-17, 44], bd: [14, 42], lean: -5 },
      { pi: [-6, PISO], pd: [4, PISO], bi: [-14, 48], bd: [14, 48], lean: -2 },
      { pi: [-7, PISO - 5, -2], pd: [15, PISO], bi: [-14, 42], bd: [17, 44], lean: 5 },
      { pi: [-4, PISO], pd: [6, PISO], bi: [-14, 48], bd: [14, 48], lean: 2 }
    ],
    pase: [
      { pi: [-6, PISO], pd: [12, PISO - 3, 4], bi: [-15, 44], bd: [12, 50] },
      { pi: [-6, PISO], pd: [4, PISO - 1, 2], bi: [-15, 46], bd: [13, 48] },
      { pi: [-6, PISO], pd: [16, PISO - 7, 5], bi: [-16, 42], bd: [14, 46] },
      { pi: [-6, PISO], pd: [18, PISO - 11, 5], bi: [-16, 40], bd: [14, 44] }
    ],
    tiro: [
      { pi: [-7, PISO], pd: [-14, PISO - 12, -6], bi: [-16, 40], bd: [15, 44], lean: 4 },
      { pi: [-7, PISO], pd: [2, PISO - 2, 0], bi: [-16, 42], bd: [15, 46], lean: 1 },
      { pi: [-7, PISO], pd: [19, PISO - 18, 7], bi: [-17, 38], bd: [16, 48], lean: -5 },
      { pi: [-7, PISO], pd: [21, PISO - 26, 8], bi: [-17, 36], bd: [16, 50], lean: -7 }
    ],
    volea: [
      { pi: [-8, PISO - 6, -2], pd: [8, PISO - 10, 3], bi: [-15, 42], bd: [15, 42], salto: 6 },
      { pi: [-10, PISO - 12, -3], pd: [18, PISO - 22, 6], bi: [-17, 40], bd: [16, 44], salto: 12, lean: -4 },
      { pi: [-10, PISO - 12, -3], pd: [22, PISO - 26, 8], bi: [-17, 38], bd: [17, 46], salto: 13, lean: -6 },
      { pi: [-8, PISO - 4, -2], pd: [10, PISO - 8, 3], bi: [-15, 44], bd: [15, 44], salto: 5 }
    ],
    cabezazo: [
      { pi: [-7, PISO - 2], pd: [7, PISO - 2], bi: [-16, 52], bd: [16, 52], salto: 3, lean: -4 },
      { pi: [-8, PISO - 10], pd: [8, PISO - 8], bi: [-18, 58], bd: [18, 58], salto: 11, lean: -1 },
      { pi: [-9, PISO - 12], pd: [7, PISO - 9], bi: [-19, 62], bd: [17, 60], salto: 13, lean: 9 },   // la cabeza EMBISTE
      { pi: [-7, PISO - 5], pd: [7, PISO - 5], bi: [-16, 54], bd: [16, 54], salto: 6, lean: 4 }
    ],
    festejo: [
      { pi: [-6, PISO], pd: [6, PISO], bi: [-15, 18], bd: [15, 18] },
      { pi: [-6, PISO - 4], pd: [6, PISO - 4], bi: [-16, 14], bd: [16, 14], salto: 6 },
      { pi: [-6, PISO - 8], pd: [6, PISO - 8], bi: [-16, 12], bd: [16, 12], salto: 11 },
      { pi: [-6, PISO - 2], pd: [6, PISO - 2], bi: [-15, 16], bd: [15, 16], salto: 3 }
    ],
    /* arquero */
    parado: [
      { pi: [-8, PISO], pd: [8, PISO], bi: [-16, 48], bd: [16, 48] },
      { pi: [-8, PISO], pd: [8, PISO], bi: [-17, 46], bd: [17, 46], lean: -2 },
      { pi: [-8, PISO], pd: [8, PISO], bi: [-15, 50], bd: [15, 50], salto: 1 },
      { pi: [-8, PISO], pd: [8, PISO], bi: [-17, 46], bd: [17, 46], lean: 2 }
    ],
    estirada: [
      { pi: [-10, PISO - 2, -3], pd: [6, PISO - 6, 2], bi: [-18, 38], bd: [12, 40], lean: -4 },
      { pi: [-16, PISO - 8, -5], pd: [2, PISO - 14, 0], bi: [-21, 30], bd: [8, 36], lean: -9, salto: 6 },
      { pi: [-20, PISO - 12, -7], pd: [-2, PISO - 20, -2], bi: [-23, 24], bd: [4, 32], lean: -13, salto: 10 },
      { pi: [-21, PISO - 10, -7], pd: [-4, PISO - 16, -2], bi: [-23, 26], bd: [2, 34], lean: -14, salto: 7 }
    ],
    atajada: [
      { pi: [-8, PISO - 2], pd: [8, PISO - 2], bi: [-14, 30], bd: [14, 30], salto: 3 },
      { pi: [-8, PISO - 8], pd: [8, PISO - 8], bi: [-10, 16], bd: [10, 16], salto: 10 },
      { pi: [-8, PISO - 10], pd: [8, PISO - 10], bi: [-6, 12], bd: [6, 12], salto: 13 },
      { pi: [-8, PISO - 4], pd: [8, PISO - 4], bi: [-8, 20], bd: [8, 20], salto: 5 }
    ],
    despeje: [
      { pi: [-8, PISO - 2], pd: [8, PISO - 2], bi: [-15, 46], bd: [12, 34], salto: 3 },
      { pi: [-9, PISO - 8], pd: [7, PISO - 8], bi: [-16, 48], bd: [14, 16], salto: 10 },
      { pi: [-9, PISO - 10], pd: [7, PISO - 10], bi: [-16, 50], bd: [15, 10], salto: 14 },
      { pi: [-8, PISO - 4], pd: [8, PISO - 4], bi: [-15, 48], bd: [13, 24], salto: 5 }
    ]
  };
  function heroico(scene, keyBase, look, kitId, numero, anims, fuerza) {
    var kit = KITS[kitId] || KITS.mio;
    (anims || ["correr", "gambeta", "pase", "tiro", "volea", "cabezazo", "festejo"]).forEach(function (anim) {
      (POSES[anim] || POSES.correr).forEach(function (p, f) {
        var key = keyBase + "_" + anim + "_" + f;
        /* cache por partido; con fuerza se re-hornea (la pinta pudo cambiar en el editor) */
        if (!fuerza && scene.textures.exists(key)) return;
        bake(scene, key, W_H, H_H, function (g) { g.translateCanvas(0, AIRE); _cuerpo(g, look, kit, numero, p); });
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      });
    });
    return keyBase;
  }

  return { cara: cara, jugador: jugador, cineJugador: cineJugador, heroico: heroico, KITS: KITS, bake: bake };
})();
