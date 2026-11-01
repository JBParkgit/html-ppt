// 로컬 테스트 서버: node dev-server.js [port] — Vercel 과 같은 /api/* 와 public/ 을 흉내 낸다 (메모리 저장)
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = +process.argv[2] || 3100;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (p.startsWith('/api/')) {
    const file = path.join(__dirname, 'api', p.slice(5).replace(/[^a-z]/g, '') + '.js');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    let body = '';
    for await (const c of req) body += c;
    req.body = body ? JSON.parse(body) : {};
    res.status = (s) => { res.statusCode = s; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return require(file)(req, res);
  }
  let f = path.join(__dirname, 'public', p === '/' ? 'index.html' : p);
  if (!path.extname(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!f.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`live-poll dev: http://localhost:${PORT}/  (screen: /screen?key=local, admin: /admin)`));
