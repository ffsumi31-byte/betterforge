// Zero-dependency server (Render / any Node host). Serves /public and POST /api/ai
const http = require('http'), fs = require('fs'), path = require('path');
const { run } = require('./lib/ai');
const PUB = path.join(__dirname, 'public');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const send = (res, c, o) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/api/ai') {
    let b = '', n = 0;
    req.on('data', c => { n += c.length; if (n > 12e6) req.destroy(); else b += c; });
    req.on('end', async () => { try { send(res, 200, await run(JSON.parse(b || '{}'))); } catch (e) { send(res, 500, { error: e.message }); } });
    return;
  }
  if (u.pathname === '/healthz') return res.end('ok');
  const f = path.normalize(path.join(PUB, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname)));
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('BlockForge on port ' + (process.env.PORT || 3000)));
