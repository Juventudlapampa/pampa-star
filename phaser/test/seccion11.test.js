/* PAMPA STAR · test de SECCIÓN 11 (V8) — el guardián automático: ninguna
   marca de terceros ni terminología ajena vuelve a colarse en el PRODUCTO.
   Cuarta vez que aparece "GUTS" visible = cuarta vez que lo cazamos a mano;
   desde acá lo caza el test. node phaser/test/seccion11.test.js */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");

/* ---------- qué se revisa ----------
   PRODUCTO = lo que se ejecuta o se sirve. La documentación (docs/ y los .md
   de la raíz) queda EXCLUIDA a propósito: ahí se cita como análisis. */
const EXT = [".js", ".html", ".json", ".webmanifest", ".css"];
/* los TESTS quedan fuera del barrido: listan las palabras prohibidas para
   poder cazarlas (si no, el guardián se acusa a sí mismo) */
const EXCLUIR_DIR = ["node_modules", ".git", "docs", "assets_drive", "vendor", ".assets_tmp", ".claude", "test"];
function archivos(dir, acc) {
  acc = acc || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    if (e.name.startsWith(".") && e.name !== ".gitignore") return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (EXCLUIR_DIR.indexOf(e.name) < 0) archivos(full, acc); return; }
    if (e.name.endsWith(".md")) return;                 // documentación
    if (EXT.indexOf(path.extname(e.name)) >= 0) acc.push(full);
  });
  return acc;
}
const FILES = archivos(RAIZ);
assert(FILES.length > 20, "el barrido encuentra los archivos de producto (" + FILES.length + ")");

/* ---------- 1) MARCAS Y TERMINOLOGÍA DE TERCEROS ---------- */
const MARCAS = [
  { re: /tsubasa/i, que: "marca de terceros" },
  { re: /tecmo/i, que: "marca de terceros" },
  { re: /captain\s+tsubasa/i, que: "marca de terceros" },
  { re: /new\s+star\s+soccer/i, que: "marca de terceros" },
  { re: /\bfifa\b/i, que: "marca de terceros" },
  { re: /\bkonami\b|\bpes\b\s|\bea\s+sports\b/i, que: "marca de terceros" }
];
FILES.forEach(f => {
  const s = fs.readFileSync(f, "utf8");
  const rel = path.relative(RAIZ, f);
  MARCAS.forEach(m => {
    const hit = s.match(m.re);
    assert(!hit, "§11 " + m.que + " en " + rel + ": «" + (hit ? hit[0] : "") + "»");
  });
});

/* ---------- 2) "GUTS" COMO TEXTO VISIBLE ----------
   Los identificadores internos y keys de save (gutsProximo, PS.guts, GUTS_*,
   clases CSS .guts) son retrocompatibilidad y NO se tocan: solo se caza el
   texto que el jugador LEE (dentro de comillas, en mayúsculas). */
const RE_GUTS_VISIBLE = /["'`][^"'`]*\bGUTS\b[^"'`]*["'`]/g;
FILES.forEach(f => {
  const s = fs.readFileSync(f, "utf8");
  const rel = path.relative(RAIZ, f);
  const hits = (s.match(RE_GUTS_VISIBLE) || []).filter(h => {
    /* descartar identificadores: GUTS_ALGO, id="guts-fill", clases, keys */
    if (/GUTS_[A-Z]/.test(h)) return false;
    if (/guts-|#guts|\.guts|"guts"|'guts'/i.test(h) && !/\bGUTS\b\s*[^"'`]*[a-záéíóúñ]/i.test(h)) return false;
    return /\bGUTS\b/.test(h);
  });
  hits.forEach(h => assert(false, "§11 'GUTS' VISIBLE en " + rel + ": " + h.slice(0, 70) + " → debe decir AGUANTE"));
});

/* ---------- 3) APUESTAS / DINERO REAL ---------- */
const PLATA = [/\bapuest/i, /\bapostar\b/i, /quiniela/i, /\bcasino\b/i, /\bruleta\b/i, /dinero real/i];
FILES.forEach(f => {
  const s = fs.readFileSync(f, "utf8");
  const rel = path.relative(RAIZ, f);
  PLATA.forEach(re => {
    const hits = (s.match(new RegExp("[^\\n]*" + re.source + "[^\\n]*", "gi")) || [])
      /* las NOTAS que documentan la prohibición son válidas */
      .filter(l => !/cero apuestas|sin apuestas|nada de apuestas|prohib/i.test(l));
    hits.forEach(l => assert(false, "§11 apuestas/dinero en " + rel + ": " + l.trim().slice(0, 80)));
  });
});

/* ---------- 4) DATA: clubes y nombres ---------- */
const div = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "divisiones.json"), "utf8"));
const CLUBES_PROF = ["river plate", "boca juniors", "racing club", "independiente", "san lorenzo", "velez", "huracan", "argentinos juniors", "estudiantes de la plata", "newell", "rosario central", "talleres de cordoba", "belgrano de cordoba"];
Object.values(div.divisiones).forEach(d => d.rivales.forEach(r => {
  CLUBES_PROF.forEach(c => assert(r.toLowerCase() !== c && !r.toLowerCase().startsWith(c), "§11 club profesional real en divisiones.json: " + r));
}));
const roster = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "roster_pampeano.json"), "utf8"));
assert(roster.jugadores.every(j => j.nombre && j.nombre.trim().split(/s+/).length <= 2 && !j.apellido), "§11 el roster usa nombres de pila (sin apellidos: nadie identificable)");

/* ---------- 5) la UI dice AGUANTE ---------- */
const mm = fs.readFileSync(path.join(RAIZ, "phaser", "scenes", "match.js"), "utf8");
assert(/AGUANTE/.test(mm), "la UI del partido dice AGUANTE");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron. (§11 limpia en " + FILES.length + " archivos de producto)");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
