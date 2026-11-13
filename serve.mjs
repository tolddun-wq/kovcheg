// Local preview: node serve.mjs [port]  →  http://localhost:5190
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5190);
const T = { html: 'text/html; charset=utf-8', js: 'text/javascript', jpg: 'image/jpeg', svg: 'image/svg+xml' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  const f = path.join(dir, path.normalize(u).replace(/^([/\\])+/, ''));
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': T[path.extname(f).slice(1)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('Ковчег: http://localhost:' + port));
