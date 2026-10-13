/* ============================================================================
   PAMPA STAR — Módulo de arte (pixel-art ORIGINAL generado por código)
   Ver ARTE.md (biblia de arte). Nada de assets de terceros: todo el arte es original y generado por código.
   Regla dura: variantes con nombre/etiqueta o FORMA, nunca solo color. HEX siempre.
   ========================================================================== */
"use strict";
var PSART = (function(){

  /* ---------- catálogo de variantes etiquetadas ---------- */
  const PIELES = [
    {n:"Piel clara",    hex:"#e9b58c"},
    {n:"Piel trigueña", hex:"#c68e5f"},
    {n:"Piel morena",   hex:"#8d5a3a"},
  ];
  /* cada pelo tiene FORMA propia (rapado / corto / corto+flequillo / largo / largo+vincha),
     no solo color: dos variantes nunca se distinguen únicamente por el hex */
  const PELOS = [
    {n:"Rapado",                estilo:"rapado", rasgo:null,        hex:"#2a2a2a"},
    {n:"Corto oscuro",          estilo:"corto",  rasgo:null,        hex:"#3a2a1a"},
    {n:"Corto claro (flequillo)",estilo:"corto", rasgo:"flequillo", hex:"#c9a227"},
    {n:"Largo oscuro",          estilo:"largo",  rasgo:null,        hex:"#241a10"},
    {n:"Largo colorado (vincha)",estilo:"largo", rasgo:"vincha",    hex:"#a53f1f"},
  ];
  const CAMISETAS = [
    {n:"Lisa",      estilo:"lisa"},
    {n:"A franjas", estilo:"franjas"},
    {n:"Con banda", estilo:"banda"},
  ];

  /* ---------- mundo (lo configura el juego) ---------- */
  let W = {CW:280, CH:156, TOP:8, BOT:148, WORLD_W:640, GOAL_X:632, AREA_X:536, MY_AREA_X:104, MIDY:78};
  function config(world){ W = Object.assign(W, world); }

  function px(c,x,y,w,h,col){ c.fillStyle=col; c.fillRect(x|0,y|0,w|0,h|0); }

  function lookResolved(l){
    const k=l||{};
    const si=(x,n)=> Math.abs(((x|0)))%n;   // índice a prueba de negativos/NaN/strings (un save corrupto no debe crashear draw)
    const piel=PIELES[si(k.piel,PIELES.length)], pelo=PELOS[si(k.pelo,PELOS.length)], cam=CAMISETAS[si(k.camiseta,CAMISETAS.length)];
    return {pielHex:piel.hex, peloHex:pelo.hex, peloEstilo:pelo.estilo, peloRasgo:pelo.rasgo, camEstilo:cam.estilo};
  }

  /* ---------- cancha completa (pasto, líneas, arcos, banderines) ---------- */
  function drawPitch(c, cam, camY){
    camY = camY||0;
    px(c,0,0,W.CW,W.CH,"#2a9d4f");
    const first=Math.floor(cam/18)*18;
    for(let wx=first; wx<cam+W.CW; wx+=18){ if(((wx/18)|0)%2===0) px(c, wx-cam, 0, 18, W.CH, "#259247"); }
    px(c,0,W.TOP-camY,W.CW,2,"#eafff0"); px(c,0,W.BOT-camY,W.CW,2,"#eafff0");
    px(c, W.WORLD_W/2 - cam, W.TOP-camY, 2, W.BOT-W.TOP, "#eafff0");
    ring(c, W.WORLD_W/2 - cam, W.MIDY-camY, W.CIRCULO||24);
    px(c, W.WORLD_W/2 - cam, W.MIDY-camY, 2, 2, "#eafff0");                 // punto central
    px(c, W.GOAL_X-(W.PENAL_D||58)-cam, W.MIDY-camY, 2, 2, "#eafff0");      // punto penal rival
    px(c, (W.PENAL_D2||66)-cam, W.MIDY-camY, 2, 2, "#eafff0");              // punto penal propio
    drawGoalRight(c, cam, camY);
    drawGoalLeft(c, cam, camY);
    flag(c, 10-cam, W.TOP-camY); flag(c, 10-cam, W.BOT-camY);               // banderines
    flag(c, W.GOAL_X-2-cam, W.TOP-camY); flag(c, W.GOAL_X-2-cam, W.BOT-camY);
  }
  function ring(c,sx,sy,r){ if(sx<-r||sx>W.CW+r) return; c.strokeStyle="#eafff0"; c.lineWidth=2; c.beginPath(); c.arc(sx,sy,r,0,Math.PI*2); c.stroke(); }
  function flag(c,sx,sy){
    if(sx<-4||sx>W.CW+4) return;
    px(c,sx,sy-7,1,7,"#f6efdc");            // mástil
    px(c,sx+1,sy-7,3,2,"#f6c11d");          // banderín sol
  }
  function drawGoalRight(c, cam, camY){
    camY=camY||0;
    const AM=W.AREA_MEDIO||46, CM=W.CHICA_MEDIO||24, GM=W.GOAL_MEDIO||20, CD=W.CHICA_D||30;
    const gx=W.GOAL_X-cam, ax=W.AREA_X-cam, y1=W.MIDY-AM-camY, y2=W.MIDY+AM-camY;
    px(c, ax, y1, 2, y2-y1, "#eafff0"); px(c, ax, y1, gx-ax, 2, "#eafff0"); px(c, ax, y2, gx-ax, 2, "#eafff0");
    const bx=W.GOAL_X-CD-cam, z1=W.MIDY-CM-camY, z2=W.MIDY+CM-camY;
    px(c, bx, z1, 2, z2-z1, "#eafff0"); px(c, bx, z1, gx-bx, 2, "#eafff0"); px(c, bx, z2, gx-bx, 2, "#eafff0");
    const ny=W.MIDY-GM-camY, nh=GM*2;
    px(c, gx, ny, 8, nh, "#d9e6ee");
    for(let y=ny;y<ny+nh;y+=4) px(c, gx, y, 8, 1, "#9fb6c4");
    for(let x=gx;x<gx+8;x+=3) px(c, x, ny, 1, nh, "#9fb6c4");
    px(c, gx-2, ny, 2, 2, "#ffffff"); px(c, gx-2, ny+nh-2, 2, 2, "#ffffff");
  }
  function drawGoalLeft(c, cam, camY){
    camY=camY||0;
    const AM=W.AREA_MEDIO||46, CM=W.CHICA_MEDIO||24, GM=W.GOAL_MEDIO||20, CD=W.CHICA_D||30;
    const gx=8-cam, ax=W.MY_AREA_X-cam, y1=W.MIDY-AM-camY, y2=W.MIDY+AM-camY;
    px(c, ax, y1, 2, y2-y1, "#eafff0"); px(c, gx, y1, ax-gx, 2, "#eafff0"); px(c, gx, y2, ax-gx, 2, "#eafff0");
    const bx=8+CD-cam, z1=W.MIDY-CM-camY, z2=W.MIDY+CM-camY;
    px(c, bx, z1, 2, z2-z1, "#eafff0"); px(c, gx, z1, bx-gx, 2, "#eafff0"); px(c, gx, z2, bx-gx, 2, "#eafff0");
    const ny=W.MIDY-GM-camY, nh=GM*2;
    px(c, gx-8, ny, 8, nh, "#d9e6ee");
    for(let y=ny;y<ny+nh;y+=4) px(c, gx-8, y, 8, 1, "#9fb6c4");
    for(let x=gx-8;x<gx;x+=3) px(c, x, ny, 1, nh, "#9fb6c4");
    px(c, gx, ny, 2, 2, "#ffffff"); px(c, gx, ny+nh-2, 2, 2, "#ffffff");
  }

  /* ---------- sprites de gente (8×16) con variantes de FORMA ---------- */
  function drawKit(c, cx, cy, shirt, shorts, gloves, anim, look){
    if(cx<-12 || cx>W.CW+12 || cy<-16 || cy>W.CH+12) return;
    const x=Math.round(cx-4), y=Math.round(cy-13);
    const piel=(look&&look.pielHex)||"#e9b58c";
    const peloHex=(look&&look.peloHex)||"#3a2a1a";
    const peloEstilo=(look&&look.peloEstilo)||"corto";
    const camEstilo=(look&&look.camEstilo)||"lisa";
    c.fillStyle="rgba(0,0,0,0.22)"; c.fillRect(x,y+15,8,2);
    px(c,x+2,y,4,4,piel);
    if(peloEstilo==="rapado"){ px(c,x+2,y,4,1,"rgba(0,0,0,.28)"); }
    else px(c,x+2,y,4,1,peloHex);
    if(peloEstilo==="largo"){ px(c,x+1,y,1,4,peloHex); px(c,x+6,y,1,4,peloHex); }
    const rasgo=(look&&look.peloRasgo)||null;
    if(rasgo==="flequillo"){ px(c,x+2,y+1,1,1,peloHex); px(c,x+5,y+1,1,1,peloHex); } // mechones sobre la frente (FORMA)
    if(rasgo==="vincha"){ px(c,x+2,y+1,4,1,"#0a1f13"); }                              // vincha oscura (FORMA)
    if(camEstilo==="franjas"){ for(let i=0;i<8;i+=2){ px(c,x+i,y+4,1,6,shirt); px(c,x+i+1,y+4,1,6,shorts); } }
    else px(c,x,y+4,8,6,shirt);
    if(camEstilo==="banda"){ px(c,x,y+7,8,2,shorts); }
    px(c,x,y+5,8,1,"rgba(255,255,255,.18)");
    px(c,x+1,y+10,6,3,shorts);
    px(c,x+1,y+13,2,3,"#2a2a2a"); px(c,x+5,y+13,2,3,"#2a2a2a");
    if(anim){ if(Math.floor(anim)%2){ px(c,x+1,y+15,2,1,"#000"); } else { px(c,x+5,y+15,2,1,"#000"); } }
    if(gloves){ px(c,x-1,y+6,2,2,"#fff"); px(c,x+7,y+6,2,2,"#fff"); }
  }
  function drawBall(c, cx, cy){
    if(cx<-6||cx>W.CW+6||cy<-6||cy>W.CH+6) return;
    const x=Math.round(cx-2), y=Math.round(cy-2);
    px(c,x,y,4,4,"#ffffff"); px(c,x+1,y+1,2,2,"#1d1d1d"); px(c,x,y,1,1,"#cfcfcf");
  }
  /* flecha ▼ blanca con borde tinta sobre TU jugador (forma, no color) */
  function drawMarker(c, cx, cy){
    if(cx<-8 || cx>W.CW+8) return;
    const x=Math.round(cx), y=Math.round(cy)-21;
    px(c,x-3,y,7,1,"#0a1f13");
    px(c,x-3,y+1,1,1,"#0a1f13"); px(c,x-2,y+1,5,1,"#ffffff"); px(c,x+3,y+1,1,1,"#0a1f13");
    px(c,x-2,y+2,1,1,"#0a1f13"); px(c,x-1,y+2,3,1,"#ffffff"); px(c,x+2,y+2,1,1,"#0a1f13");
    px(c,x-1,y+3,1,1,"#0a1f13"); px(c,x,y+3,1,1,"#ffffff"); px(c,x+1,y+3,1,1,"#0a1f13");
    px(c,x,y+4,1,1,"#0a1f13");
  }

  /* ---------- V4.1 · CUADRO DE ANIMACIÓN: sprites GRANDES (16×26) para las escenas ----------
     El "dibujito" de la acción, estilo serie animada NES: arte original por código, mismas
     variantes de FORMA que el sprite chico. Poses: parado | correr | encarar | patear | arquero | festejo */
  function drawKitBig(c, cx, cy, S, flip, pose, t, shirt, shorts, look, gloves){
    const piel=(look&&look.pielHex)||"#e9b58c";
    const peloHex=(look&&look.peloHex)||"#3a2a1a";
    const estilo=(look&&look.peloEstilo)||"corto";
    const rasgo=(look&&look.peloRasgo)||null;
    const camEstilo=(look&&look.camEstilo)||"lisa";
    const ph=Math.floor((t||0)/7)%2;                    // fase de zancada/brazos
    c.save();
    c.translate(cx, cy);
    c.scale(S*(flip||1), S);
    const P=(x,y,w,h,col)=>{ c.fillStyle=col; c.fillRect(x,y,w,h); };
    P(-7,-1,14,2,"rgba(0,0,0,.35)");                    // sombra al piso
    const up=(pose==="festejo" && ph)?-2:0;             // saltito del festejo
    const B=-26+up;                                     // techo del sprite (los pies apoyan en y=0)
    const bot="#1d1d1d", med="#e8e4d4";
    /* piernas + medias + botines según pose */
    if(pose==="patear"){
      P(-4,B+19,3,4,piel); P(-4,B+22,3,3,med); P(-5,B+25,4,1,bot);                    // pierna de apoyo
      P(1,B+17,3,3,piel); P(3,B+15,3,3,med); P(5,B+13,3,2,bot); P(6,B+12,2,2,bot);    // ¡la patada, al frente-arriba!
    } else if(pose==="encarar"){
      P(-6,B+20,3,3,piel); P(-6,B+22,3,3,med); P(-7,B+25,4,1,bot);                    // piernas abiertas, cuerpo bajo
      P(3,B+20,3,3,piel);  P(3,B+22,3,3,med);  P(3,B+25,4,1,bot);
    } else if(pose==="arquero"){
      P(-5,B+19,3,4,piel); P(-5,B+22,3,3,med); P(-6,B+25,4,1,bot);
      P(2,B+19,3,4,piel);  P(2,B+22,3,3,med);  P(2,B+25,4,1,bot);
    } else if(pose==="correr"){
      if(ph){ P(-5,B+19,3,4,piel); P(-5,B+22,3,3,med); P(-6,B+25,4,1,bot);
              P(2,B+19,3,3,piel);  P(3,B+21,3,3,med);  P(4,B+24,4,1,bot); }
      else  { P(-2,B+19,3,4,piel); P(-2,B+22,3,3,med); P(-2,B+25,4,1,bot);
              P(0,B+19,3,3,piel);  P(-1,B+21,3,3,med); P(-2,B+24,4,1,bot); }
    } else {  // parado / festejo
      P(-4,B+19,3,4,piel); P(-4,B+22,3,3,med); P(-5,B+25,4,1,bot);
      P(1,B+19,3,4,piel);  P(1,B+22,3,3,med);  P(1,B+25,4,1,bot);
    }
    P(-5,B+16,10,3,shorts);                             // pantaloncito
    /* torso: la camiseta conserva su FORMA (lisa / franjas / banda) */
    if(camEstilo==="franjas"){ for(let i=-5;i<5;i+=2){ P(i,B+8,1,8,shirt); P(i+1,B+8,1,8,shorts); } }
    else P(-5,B+8,10,8,shirt);
    if(camEstilo==="banda") P(-5,B+11,10,2,shorts);
    P(-5,B+9,10,1,"rgba(255,255,255,.2)");              // brillo del pecho
    /* brazos según pose (la mano del arquero lleva guante blanco) */
    const arm=(x,y,h)=>{ P(x,y,2,h,shirt); P(x,y+h,2,2,piel); };
    if(pose==="arquero"||pose==="festejo"){
      P(-7,B+2,2,7,shirt); P(6,B+2,2,7,shirt);          // ¡brazos arriba!
      const man=gloves?"#ffffff":piel;
      P(-7,B,2,2,man); P(6,B,2,2,man);
    }
    else if(pose==="patear"){ arm(-7,B+7,5); arm(5,B+10,4); }
    else if(pose==="encarar"){ arm(-8,B+9,4); arm(6,B+9,4); }
    else if(pose==="correr"){ if(ph){ arm(-7,B+7,5); arm(5,B+10,4); } else { arm(-7,B+10,4); arm(5,B+7,5); } }
    else { arm(-7,B+9,5); arm(5,B+9,5); }
    /* cabeza mirando al frente (el flip da la dirección) */
    P(-3,B+1,7,7,piel);
    P(2,B+3,1,2,"#1d1d1d");                             // ojo
    P(1,B+6,2,1,"rgba(0,0,0,.35)");                     // boca
    if(estilo==="rapado"){ P(-3,B+1,7,2,"rgba(0,0,0,.3)"); }
    else { P(-3,B,7,3,peloHex); P(-4,B+1,1,3,peloHex); }
    if(estilo==="largo"){ P(-4,B+1,1,7,peloHex); P(-5,B+3,1,5,peloHex); P(3,B,1,4,peloHex); }
    if(rasgo==="flequillo"){ P(-1,B+3,1,1,peloHex); P(1,B+3,1,1,peloHex); }
    if(rasgo==="vincha"){ P(-3,B+3,7,1,"#0a1f13"); }
    c.restore();
  }
  function drawBallBig(c, x, y, S){
    c.save(); c.translate(x,y); c.scale(S,S);
    c.fillStyle="#ffffff"; c.beginPath(); c.arc(0,0,3.2,0,Math.PI*2); c.fill();
    c.fillStyle="#1d1d1d"; c.fillRect(-1,-1,2,2);
    c.fillStyle="#cfcfcf"; c.fillRect(-3,-2,1,1);
    c.restore();
  }
  /* fondo del cuadro: panel oscuro con líneas de velocidad que corren + piso; esp lo tiñe de fuego */
  function drawCineFondo(c, t, esp){
    c.fillStyle = esp ? "#2a130b" : "#0b2416"; c.fillRect(0,0,W.CW,W.CH);
    for(let i=0;i<7;i++){
      const y=10+i*20, len=54+(i%3)*16, sp=3+(i%3);
      const off=((t*sp)%(W.CW+len))-len;
      c.fillStyle = esp ? "rgba(255,140,58,"+(0.10+0.05*(i%2))+")" : "rgba(246,239,220,"+(0.06+0.04*(i%2))+")";
      c.fillRect(off, y, len, 3);
    }
    c.fillStyle = esp ? "#3a1a10" : "#123b22"; c.fillRect(0,W.CH-20,W.CW,20);   // piso
    c.fillStyle="rgba(234,255,240,.25)"; c.fillRect(0,W.CH-20,W.CW,2);
    c.strokeStyle = esp ? "rgba(255,140,58,.6)" : "rgba(246,193,29,.45)";        // marco del cuadro
    c.lineWidth=2; c.strokeRect(1,1,W.CW-2,W.CH-2);
  }

  return {config, px, drawPitch, drawGoalRight, drawGoalLeft, drawKit, drawBall, drawMarker,
          drawKitBig, drawBallBig, drawCineFondo,
          lookResolved, PIELES, PELOS, CAMISETAS};
})();
