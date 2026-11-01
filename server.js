#!/usr/bin/env node
/*
 * HTML 프레젠테이션 스튜디오 — 로컬 서버 (외부 패키지 없음)
 *  - 정적 파일 제공 (index.html 등)
 *  - 실시간 덱 공유 API: 편집기 ↔ Claude(스킬 CLI)
 *      GET  /api/state            { rev, source, cmdSeq, cmd }   (가벼운 폴링용)
 *      GET  /api/deck             { rev, source, deck }
 *      PUT  /api/deck             { deck, source, baseRev? }  → { rev }   (baseRev 불일치 시 409)
 *      POST /api/command          { cmd: { type: 'goto'|'present'|'stop'|'next'|'prev', slide? } }
 *      GET  /api/decks            { files: [{ path, size, mtime }] }  decks 폴더의 덱 파일 목록 (파일 ▸ 열기)
 *      GET  /api/media            { ids: [...] }       편집기가 브라우저(IndexedDB)에 넣은 미디어의 백업 목록
 *      PUT  /api/media/<id>       (파일 내용)            → decks/media/<id>.<확장자> 로 백업
 *      GET  /api/media/<id>       백업된 파일 (다른 브라우저에서 열 때 복원용)
 *  덱은 decks/live.hppt.json 에 저장된다.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = +process.env.PORT || +process.argv[2] || 8080;
const DECK_DIR = path.join(ROOT, 'decks');
const DECK_FILE = path.join(DECK_DIR, 'live.hppt.json');
const MEDIA_DIR = path.join(DECK_DIR, 'media');
const MEDIA_EXT = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/mp4': '.m4a', 'audio/ogg': '.ogg',
  'model/gltf-binary': '.glb', 'model/gltf+json': '.gltf',
};
// 백업 파일 찾기: <id>.<확장자> (확장자를 모르면 .bin)
function mediaFile(id) {
  try { const f = fs.readdirSync(MEDIA_DIR).find((n) => n.slice(0, n.lastIndexOf('.')) === id); return f ? path.join(MEDIA_DIR, f) : null; } catch (e) { return null; }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.ogg': 'video/ogg',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

let state = { rev: 0, source: '', deck: null, cmdSeq: 0, cmd: null, updatedAt: null };
try {
  const saved = JSON.parse(fs.readFileSync(DECK_FILE, 'utf8'));
  state.deck = saved.deck || null;
  state.rev = saved.rev || 1;
  state.source = saved.source || 'file';
  state.updatedAt = saved.updatedAt || null;
} catch (e) { /* 아직 덱 없음 */ }

// 다른 프로그램(예: Claude 가 파일을 직접 수정)이 파일을 바꾸면 다시 읽음
let writing = false;
function watchFile() {
  try {
    fs.mkdirSync(DECK_DIR, { recursive: true });
    fs.watch(DECK_DIR, (ev, name) => {
      if (writing || name !== 'live.hppt.json') return;
      setTimeout(() => {
        try {
          const saved = JSON.parse(fs.readFileSync(DECK_FILE, 'utf8'));
          const deck = saved.deck || saved;
          if (!deck || !Array.isArray(deck.slides)) return;
          if (JSON.stringify(deck) === JSON.stringify(state.deck)) return;
          state.deck = deck;
          state.rev += 1;
          state.source = saved.source || 'file';
          state.updatedAt = new Date().toISOString();
          console.log(`[deck] file changed -> rev ${state.rev}`);
        } catch (e) { /* 쓰는 중일 수 있음 */ }
      }, 120);
    });
  } catch (e) { /* watch 미지원 */ }
}

function persist() {
  writing = true;
  try {
    fs.mkdirSync(DECK_DIR, { recursive: true });
    const tmp = DECK_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ format: 'html-presentation-studio', rev: state.rev, source: state.source, updatedAt: state.updatedAt, deck: state.deck }, null, 1));
    fs.renameSync(tmp, DECK_FILE);
  } finally {
    setTimeout(() => { writing = false; }, 300);
  }
}

function send(res, code, obj, headers) {
  const body = typeof obj === 'string' || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}));
  res.end(body);
}

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function api(req, res, url) {
  const p = url.pathname;
  if (p === '/api/state' && req.method === 'GET') {
    return send(res, 200, { rev: state.rev, source: state.source, cmdSeq: state.cmdSeq, cmd: state.cmd, updatedAt: state.updatedAt, slides: state.deck ? state.deck.slides.length : 0 });
  }
  if (p === '/api/deck' && req.method === 'GET') {
    return send(res, 200, { rev: state.rev, source: state.source, updatedAt: state.updatedAt, deck: state.deck });
  }
  if (p === '/api/deck' && req.method === 'PUT') {
    let data;
    try { data = JSON.parse(await readBody(req, 200 * 1024 * 1024)); } catch (e) { return send(res, 400, { error: 'invalid json' }); }
    if (!data.deck || !Array.isArray(data.deck.slides)) return send(res, 400, { error: 'deck.slides required' });
    if (data.baseRev != null && +data.baseRev !== state.rev) return send(res, 409, { error: 'conflict', rev: state.rev, source: state.source });
    state.deck = data.deck;
    state.rev += 1;
    state.source = String(data.source || 'unknown');
    state.updatedAt = new Date().toISOString();
    persist();
    console.log(`[deck] rev ${state.rev} <- ${state.source} (${state.deck.slides.length} slides)`);
    return send(res, 200, { rev: state.rev });
  }
  if (p === '/api/command' && req.method === 'POST') {
    let data;
    try { data = JSON.parse(await readBody(req, 1024 * 64)); } catch (e) { return send(res, 400, { error: 'invalid json' }); }
    if (!data.cmd || !data.cmd.type) return send(res, 400, { error: 'cmd.type required' });
    state.cmdSeq += 1;
    state.cmd = Object.assign({}, data.cmd, { at: Date.now() });
    console.log(`[cmd] #${state.cmdSeq} ${JSON.stringify(data.cmd)}`);
    return send(res, 200, { cmdSeq: state.cmdSeq });
  }
  if (p === '/api/decks' && req.method === 'GET') {
    // decks 폴더의 덱 파일(.json) 목록 — 편집기의 파일 ▸ 열기 창에서 사용
    const files = [];
    const walk = (dir, depth) => {
      let ents = [];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const d of ents) {
        if (d.name.startsWith('.')) continue;
        const full = path.join(dir, d.name);
        if (d.isDirectory()) { if (depth < 3 && full !== MEDIA_DIR && d.name !== 'renders') walk(full, depth + 1); continue; }
        if (!/\.json$/i.test(d.name) || d.name.endsWith('.tmp')) continue;
        try { const st = fs.statSync(full); files.push({ path: path.relative(DECK_DIR, full).split(path.sep).join('/'), size: st.size, mtime: st.mtimeMs }); } catch (e) { /* 무시 */ }
      }
    };
    walk(DECK_DIR, 0);
    return send(res, 200, { root: 'decks', files });
  }
  if (p === '/api/media' && req.method === 'GET') {
    let ids = [];
    try { ids = fs.readdirSync(MEDIA_DIR).filter((n) => !n.endsWith('.tmp')).map((n) => n.slice(0, n.lastIndexOf('.'))); } catch (e) { /* 아직 없음 */ }
    return send(res, 200, { ids });
  }
  const mm = /^\/api\/media\/([A-Za-z0-9_-]{4,64})$/.exec(p);
  if (mm && req.method === 'PUT') {
    let buf;
    try { buf = await readRaw(req, 1024 * 1024 * 1024); } catch (e) { return send(res, 413, { error: 'too large' }); }
    const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const old = mediaFile(mm[1]);
    if (old) fs.unlinkSync(old);
    const file = path.join(MEDIA_DIR, mm[1] + (MEDIA_EXT[type] || '.bin'));
    fs.writeFileSync(file + '.tmp', buf);
    fs.renameSync(file + '.tmp', file);
    console.log(`[media] backup ${path.basename(file)} (${Math.round(buf.length / 1024)} KB)`);
    return send(res, 200, { ok: true });
  }
  if (mm && req.method === 'GET') {
    const file = mediaFile(mm[1]);
    if (!file) return send(res, 404, { error: 'not found' });
    const type = TYPES[path.extname(file).toLowerCase()] || (path.extname(file) === '.glb' ? 'model/gltf-binary' : 'application/octet-stream');
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': fs.statSync(file).size, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
    return;
  }
  return send(res, 404, { error: 'not found' });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || /[\\/]\.(?!well-known)/.test(path.relative(ROOT, file))) return send(res, 403, 'forbidden', { 'Content-Type': 'text/plain' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found', { 'Content-Type': 'text/plain' });
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range && /^bytes=/.test(range)) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = +s || 0, end = e ? +e : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    api(req, res, url).catch((e) => send(res, 500, { error: e.message }));
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, '127.0.0.1', () => {
  watchFile();
  console.log(`HTML Presentation Studio: http://localhost:${PORT}/  (live sync ON, deck file: decks/live.hppt.json)`);
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Close the other server window (or it is already running): http://localhost:${PORT}/`);
  else console.error(e);
  process.exit(1);
});
