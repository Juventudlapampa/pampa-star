/* ============================================================================
   PAMPA STAR · phaser/scenes/sprites.js
   Genera TODOS los sprites por código (originales, nada de terceros) como
   texturas Phaser. Estilo mascota chunky, legible al escalar. Daltonismo:
   el arquero se distingue por FORMA (brazos arriba + guantes), no solo color.
   Es una FUNCIÓN (no una escena): la llama shot.create() al arrancar, así
   evitamos la transición inter-escena durante el boot (que Phaser no procesa
   bien) y todo vive en una sola escena.
   ========================================================================== */
window.PampaSprites = function (scene) {
  const g0 = scene.textures;
  if (g0.exists("player_idle")) return;   // ya generadas (idempotente ante recargas)
  const self = scene;
  {
    const C = {
      piel: 0xe9b58c, pelo: 0x2a1a10, boca: 0x7a3b2a,
      camiseta: 0x5bb8e8, short: 0xf6efdc, botin: 0x14110c,   // jugador propio (celeste)
      arqCam: 0xf6c11d, arqShort: 0x1a1a1a, guante: 0xffffff, // arquero rival (amarillo)
      sombra: 0x0a1f13
    };

    // ---- helper: dibuja un "muñeco" y lo hornea a textura ----
    const bake = (key, w, h, draw) => {
      const g = self.add.graphics();
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    // pierna simple (rect piel + media + botín)
    const pierna = (g, x, y, col) => { g.fillStyle(col.piel); g.fillRect(x, y, 4, 8); g.fillStyle(0xe8e4d4); g.fillRect(x, y + 8, 4, 4); g.fillStyle(col.botin); g.fillRect(x - 1, y + 12, 6, 3); };
    const cuerpo = (g, camCol, shortCol, col) => {
      // sombra
      g.fillStyle(col.sombra, 0.30); g.fillEllipse(16, 45, 22, 6);
      // cabeza
      g.fillStyle(col.pelo); g.fillRoundedRect(9, 2, 14, 8, 3);
      g.fillStyle(col.piel); g.fillRoundedRect(10, 5, 12, 9, 3);
      g.fillStyle(col.boca); g.fillRect(13, 12, 6, 1);
      g.fillStyle(0x14110c); g.fillRect(18, 8, 2, 2);   // ojo
      // torso
      g.fillStyle(camCol); g.fillRoundedRect(8, 14, 16, 15, 4);
      g.fillStyle(0xffffff, 0.15); g.fillRect(9, 16, 14, 2);
      // short
      g.fillStyle(shortCol); g.fillRoundedRect(9, 27, 14, 6, 2);
    };

    // JUGADOR — parado
    bake("player_idle", 34, 50, (g) => {
      cuerpo(g, C.camiseta, C.short, C);
      pierna(g, 11, 32, C); pierna(g, 19, 32, C);
      // brazos al costado
      g.fillStyle(C.camiseta); g.fillRect(5, 16, 3, 10); g.fillRect(24, 16, 3, 10);
      g.fillStyle(C.piel); g.fillRect(5, 25, 3, 3); g.fillRect(24, 25, 3, 3);
    });
    // JUGADOR — corriendo (piernas separadas, brazo adelante)
    bake("player_run", 34, 50, (g) => {
      cuerpo(g, C.camiseta, C.short, C);
      pierna(g, 8, 32, C); pierna(g, 21, 30, C);
      g.fillStyle(C.camiseta); g.fillRect(24, 14, 3, 10); g.fillRect(6, 18, 3, 9);
      g.fillStyle(C.piel); g.fillRect(24, 23, 3, 3); g.fillRect(6, 26, 3, 3);
    });
    // JUGADOR — patada (pierna derecha al frente-arriba)
    bake("player_kick", 40, 50, (g) => {
      cuerpo(g, C.camiseta, C.short, C);
      pierna(g, 10, 32, C);                                   // pierna de apoyo
      g.fillStyle(C.piel); g.fillRect(22, 26, 8, 4);          // muslo al frente
      g.fillStyle(0xe8e4d4); g.fillRect(28, 24, 6, 4);
      g.fillStyle(C.botin); g.fillRect(33, 22, 6, 4);         // botín pateando
      g.fillStyle(C.camiseta); g.fillRect(5, 20, 3, 8); g.fillRect(24, 16, 3, 8);
    });

    // ARQUERO — parado (brazos abiertos, guantes)
    bake("keeper_idle", 40, 50, (g) => {
      cuerpo(g, C.arqCam, C.arqShort, C);
      pierna(g, 11, 32, C); pierna(g, 19, 32, C);
      g.fillStyle(C.arqCam); g.fillRect(4, 15, 3, 9); g.fillRect(25, 15, 3, 9);   // brazos abiertos
      g.fillStyle(C.guante); g.fillCircle(5, 25, 3); g.fillCircle(27, 25, 3);     // GUANTES (forma distintiva)
    });
    // ARQUERO — volando/estirado (horizontal, guantes al frente)
    bake("keeper_dive", 56, 34, (g) => {
      g.fillStyle(C.sombra, 0.25); g.fillEllipse(28, 30, 40, 6);
      // cuerpo horizontal
      g.fillStyle(C.arqCam); g.fillRoundedRect(10, 10, 26, 12, 5);
      g.fillStyle(C.piel); g.fillCircle(10, 14, 6);           // cabeza a la izquierda
      g.fillStyle(C.arqShort); g.fillRoundedRect(30, 12, 12, 9, 3);
      // piernas estiradas
      g.fillStyle(C.piel); g.fillRect(40, 14, 10, 4);
      g.fillStyle(C.botin); g.fillRect(49, 13, 5, 5);
      // brazos + guantes al frente (a la derecha, hacia la pelota)
      g.fillStyle(C.arqCam); g.fillRect(2, 8, 10, 3);
      g.fillStyle(C.guante); g.fillCircle(2, 9, 4);
    });

    // PELOTA
    bake("ball", 16, 16, (g) => {
      g.fillStyle(C.sombra, 0.28); g.fillEllipse(8, 14, 12, 3);
      g.fillStyle(0xffffff); g.fillCircle(8, 7, 6);
      g.fillStyle(0x1d1d1d); g.fillCircle(8, 7, 2);
      g.fillStyle(0xcfcfcf); g.fillCircle(6, 5, 1);
    });
    // CHISPA (partícula de impacto / estela)
    bake("spark", 8, 8, (g) => { g.fillStyle(0xffffff); g.fillCircle(4, 4, 3); });
    bake("spark_sol", 8, 8, (g) => { g.fillStyle(0xffd84d); g.fillCircle(4, 4, 3); });
  }
};
