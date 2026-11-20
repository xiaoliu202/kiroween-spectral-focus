'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const publicFiles = new Set(['index.html', 'style.css', 'model.js', 'art.js', 'lore.js', 'ambience.js', 'app.js', 'favicon.svg']);
const types = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml'};
function createServer() {
  return http.createServer((request, response) => {
    let file;
    try { file = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1) || 'index.html'; }
    catch { response.writeHead(400).end('Bad request'); return; }
    if (!publicFiles.has(file) || !['GET','HEAD'].includes(request.method)) { response.writeHead(404).end('Not found'); return; }
    fs.readFile(path.join(root, file), (error, contents) => {
      if (error) { response.writeHead(404).end('Not found'); return; }
      response.writeHead(200, {'Content-Type':types[path.extname(file)], 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      response.end(request.method === 'HEAD' ? undefined : contents);
    });
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 8000);
  const server = createServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Spectral Focus: http://127.0.0.1:${port}`));
}
module.exports = {createServer};
