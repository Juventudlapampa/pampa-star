/* PAMPA STAR · toda llamada a un método propio de las escenas tiene definición.

   El 20/oct el súper quite se colgaba con "this.avisoJugadon is not a function":
   la corrida del 17/oct borró avisoJugadon creyendo que no tenía llamadores y
   quedaban dos. Ningún test lo vio porque el súper quite solo se juega en el
   navegador. Este barrido junta los métodos definidos en phaser/scenes/*.js y
   exige que cada this.X( o self.X( de esos archivos apunte a uno de ellos o a
   un método de Phaser. */
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "scenes");
const archivos = fs.readdirSync(DIR).filter((f) => f.endsWith(".js"));
/* sin comentarios, conservando los renglones para que el número de línea sirva */
const sinComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
  .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
const fuentes = archivos.map((f) => ({ f, txt: sinComentarios(fs.readFileSync(path.join(DIR, f), "utf8")) }));

const definidos = new Set();
const DEF = [
  /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm,
  /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function\b/gm,
  /\b(?:this|self|proto|P|[A-Z][\w$]*\.prototype)\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/g,
  /* callbacks guardados en la escena: this._menuVolver = cfg.volver */
  /\b(?:this|self)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g,
];
for (const { txt } of fuentes) for (const re of DEF) for (const m of txt.matchAll(re)) definidos.add(m[1]);

/* métodos de Phaser que se llaman directo: los de la escena y, en pantalla_ui.js,
   los del ScaleManager dentro del startFullscreen reemplazado */
const PHASER = new Set(["init", "preload", "create", "update", "emit", "getFullscreenTarget", "fullscreenErrorHandler"]);

const faltan = [];
for (const { f, txt } of fuentes) {
  txt.split(/\r?\n/).forEach((l, i) => {
    for (const m of l.matchAll(/\b(?:this|self)\.([A-Za-z_$][\w$]*)\s*\(/g)) {
      const n = m[1];
      if (definidos.has(n) || PHASER.has(n)) continue;
      /* llamada protegida: "this.X && this.X(...)" */
      if (new RegExp("\\b(?:this|self)\\." + n + "\\s*&&\\s*$").test(l.slice(0, m.index))) continue;
      faltan.push(f + ":" + (i + 1) + " " + n);
    }
  });
}

if (faltan.length) {
  console.error("✗ llamadas a métodos que no existen en ninguna escena:\n  " + faltan.join("\n  "));
  process.exit(1);
}
console.log("✓ llamadas_existen: " + definidos.size + " métodos definidos, ninguna llamada suelta");
