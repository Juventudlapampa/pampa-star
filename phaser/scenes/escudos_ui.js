/* ============================================================================
   PAMPA STAR · phaser/scenes/escudos_ui.js — N3, EL DIBUJO DEL ESCUDO
   Mixin de render. La DESCRIPCIÓN del escudo (silueta, patrón, colores,
   inicial) la decide logic/escudos.js; acá solo se dibuja lo que ese módulo
   dice. Se puede colgar de cualquier escena.

   Todo se dibuja con Graphics sobre un Container, sin texturas: 45 escudos que
   no pesan un byte de assets. El recorte del patrón usa una máscara geométrica
   del propio contorno, así el patrón nunca se sale de la silueta.
   ========================================================================== */
(function () {
  "use strict";

  var num = function (hex) { return parseInt(String(hex).replace("#", ""), 16); };

  /* EL CONTORNO de cada silueta, en coordenadas -1..1 (después se escala).
     Devuelve un array de puntos, o null si es un círculo (caso aparte). */
  function contorno(forma) {
    switch (forma) {
      case "escudo":   /* hombros rectos, punta abajo */
        return [[-1, -1], [1, -1], [1, 0.25], [0, 1], [-1, 0.25]];
      case "rombo":
        return [[0, -1], [1, 0], [0, 1], [-1, 0]];
      case "hexagono":
        return [[-0.55, -1], [0.55, -1], [1, 0], [0.55, 1], [-0.55, 1], [-1, 0]];
      case "cuadrado":
        return [[-0.92, -0.92], [0.92, -0.92], [0.92, 0.92], [-0.92, 0.92]];
      case "punta":    /* triángulo invertido, base ancha arriba */
        return [[-1, -0.9], [1, -0.9], [0, 1]];
      case "banderin": /* rectángulo con muesca en V abajo */
        return [[-0.85, -1], [0.85, -1], [0.85, 0.7], [0, 0.25], [-0.85, 0.7]];
      default:
        return null;   // circulo
    }
  }

  function poligono(g, pts, cx, cy, r) {
    g.beginPath();
    pts.forEach(function (p, i) {
      var x = cx + p[0] * r, y = cy + p[1] * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.closePath();
  }

  window.PampaEscudosUI = {
    /* dibujarEscudo(escena, x, y, alto, esc) → Container.
       `alto` es el alto total en px lógicos; el ancho sale igual (son cuadrados
       de contorno). `esc` es lo que devuelve logic/escudos.escudoDe(). */
    dibujar: function (sc, x, y, alto, esc) {
      var cont = sc.add.container(x, y);
      if (!esc) return cont;
      var r = alto / 2;
      var pts = contorno(esc.forma);

      /* 1 · la silueta, del color de fondo */
      var base = sc.add.graphics();
      base.fillStyle(num(esc.colorA), 1);
      if (pts) { poligono(base, pts, 0, 0, r); base.fillPath(); }
      else base.fillCircle(0, 0, r);
      cont.add(base);

      /* 2 · el patrón, recortado contra la silueta.
         La máscara se arma con una figura idéntica: si el patrón se dibujara
         suelto, una banda diagonal se saldría por los costados del escudo. */
      if (esc.patron !== "liso") {
        var pat = sc.add.graphics();
        pat.fillStyle(num(esc.colorB), 1);
        var d = r * 0.42;
        switch (esc.patron) {
          case "vertical":   pat.fillRect(-d / 2, -r, d, r * 2); break;
          case "horizontal": pat.fillRect(-r, -d / 2, r * 2, d); break;
          case "diagonal":
            pat.beginPath();
            pat.moveTo(-r, r * 0.15); pat.lineTo(r * 0.15, -r);
            pat.lineTo(r, -r * 0.5); pat.lineTo(-r * 0.5, r);
            pat.closePath(); pat.fillPath();
            break;
          case "cuartos":
            pat.fillRect(-r, -r, r, r);
            pat.fillRect(0, 0, r, r);
            break;
          case "aro":
            pat.lineStyle(r * 0.26, num(esc.colorB), 1);
            pat.strokeCircle(0, 0, r * 0.55);
            break;
          case "chevron":
            pat.lineStyle(r * 0.24, num(esc.colorB), 1);
            pat.beginPath();
            pat.moveTo(-r * 0.75, -r * 0.15); pat.lineTo(0, r * 0.45); pat.lineTo(r * 0.75, -r * 0.15);
            pat.strokePath();
            break;
        }
        var mascara = sc.make.graphics({ x: x, y: y, add: false });
        mascara.fillStyle(0xffffff, 1);
        if (pts) { poligono(mascara, pts, 0, 0, r); mascara.fillPath(); }
        else mascara.fillCircle(0, 0, r);
        pat.setMask(mascara.createGeometryMask());
        cont.add(pat);
        cont._mascara = mascara;   // para poder destruirla con el container
      }

      /* 3 · el borde, siempre del mismo tono oscuro: es lo que hace que el
         escudo se despegue del fondo de la pantalla sea cual sea su color */
      var borde = sc.add.graphics();
      borde.lineStyle(Math.max(1.5, alto * 0.06), 0x0A1F13, 1);
      if (pts) { poligono(borde, pts, 0, 0, r); borde.strokePath(); }
      else borde.strokeCircle(0, 0, r);
      cont.add(borde);

      /* 4 · la inicial. Solo desde cierto tamaño: por debajo de 18 px de alto
         no se lee y ensucia — ahí manda la silueta sola. */
      if (alto >= 18 && esc.inicial) {
        var t = sc.add.text(0, esc.forma === "punta" ? -alto * 0.12 : 0, esc.inicial, {
          fontFamily: window.PF ? window.PF.display : "sans-serif",
          fontSize: Math.round(alto * (esc.inicial.length > 2 ? 0.3 : 0.38)) + "px",
          color: esc.colorC
        }).setOrigin(0.5);
        cont.add(t);
      }
      return cont;
    },

    /* el escudo de un club, cacheado por división para que el desempate de
       silueta+patrón se resuelva una sola vez y sea el mismo en toda la app */
    deClub: function (sc, club, clubesDeLaDivision) {
      var E = window.PampaEscudos;
      if (!E) return null;
      sc._cacheEscudos = sc._cacheEscudos || {};
      var llave = (clubesDeLaDivision || []).slice().sort().join("|");
      if (!sc._cacheEscudos[llave]) sc._cacheEscudos[llave] = E.escudosDe(clubesDeLaDivision || [club]);
      return sc._cacheEscudos[llave][club] || E.escudoDe(club);
    }
  };
})();
