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

  return { cara: cara, jugador: jugador, cineJugador: cineJugador, bake: bake };
})();
