// Servidor estático mínimo para previsualizar PAMPA STAR
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 8123;
/* L08c: .ico con su tipo, como lo sirve el hosting (el favicon.ico de la raíz) */
const TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".svg":"image/svg+xml", ".json":"application/json", ".ico":"image/x-icon" };

/* EL SILENCIO DE DESARROLLO (oct 2026). Rodri trabaja con el navegador de
   pruebas abierto en su compu y el audio del juego le salía por los
   parlantes cada vez que un agente lo probaba. Si existe .claude/silencio_dev.js
   (carpeta ignorada por git: solo en la compu de desarrollo), se inyecta al
   principio de cada página HTML, antes que cualquier script, y la salida de
   audio queda en cero sin que el juego se entere. GitHub Pages no usa este
   server: a quien juega no le llega nada de esto. */
const SILENCIO = path.join(ROOT, ".claude", "silencio_dev.js");
function conSilencio(html) {
  if (!fs.existsSync(SILENCIO)) return html;
  const tag = '<script src="/.claude/silencio_dev.js"></script>';
  const s = html.toString("utf8");
  const i = s.search(/<head[^>]*>/i);
  if (i < 0) return tag + s;
  const fin = s.indexOf(">", i) + 1;
  return s.slice(0, fin) + tag + s.slice(fin);
}

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  if (url.endsWith("/")) url += "index.html";
  const file = path.join(ROOT, path.normalize(url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
    res.end(ext === ".html" ? conSilencio(data) : data);
  });
}).listen(PORT, () => console.log(`PAMPA STAR en http://localhost:${PORT}`));
