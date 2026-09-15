import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.webp':'image/webp', '.mp3':'audio/mpeg' };
// Local stand-in for the Vercel Node runtime: /api/share runs the real handler, /api/ranking answers 503.
const loadShare = () => import('../api/share.js').then(m => m.default);
function vercelResponse(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return res; };
  res.send = body => { res.end(body); return res; };
  return res;
}
const readBody = req => new Promise(done => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => done(Buffer.concat(chunks).toString('utf8'))); req.on('error', () => done('')); });
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (path === '/api/share') { req.body = await readBody(req); return (await loadShare())(req, vercelResponse(res)); }
    if (path === '/api/ranking') { res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end('{"error":"UNAVAILABLE"}'); return; }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(data);
  } catch (e) { if (!res.headersSent) res.writeHead(e?.code === 'ENOENT' ? 404 : 500).end(e?.code === 'ENOENT' ? 'Not found' : 'Error'); }
}).listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => console.log('http://localhost:' + (Number(process.env.PORT) || 3000)));
