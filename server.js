#!/usr/bin/env node
/*
 * HTML 프레젠테이션 스튜디오 — 로컬 서버 (외부 패키지 없음)
 *  - 정적 파일 제공 (index.html 등)
 *  - 실시간 덱 공유 API: 편집기 ↔ Claude(스킬 CLI)
 *      GET  /api/state            { rev, source, cmdSeq, cmd }   (가벼운 폴링용)
 *      GET  /api/deck             { rev, source, deck }
 *      PUT  /api/deck             { deck, source, baseRev? }  → { rev }   (baseRev 불일치 시 409)
 *      POST /api/command          { cmd: { type: 'goto'|'present'|'stop'|'next'|'prev', slide? } }
 *      GET  /api/selection        { selection, editorOnline }   편집기에서 지금 선택한 슬라이드·개체·글자
 *      POST /api/selection        { source, slideId, slide, ids, text }   (편집기가 선택이 바뀔 때 보냄, 메모리에만 보관)
 *      GET  /api/decks            { files: [{ path, size, mtime }] }  decks 폴더의 덱 파일 목록 (파일 ▸ 열기, 내 발표)
 *      PUT  /api/decks/file?path=<decks 안 경로>[&overwrite=1]  (JSON 본문)  발표 파일 저장 — 내 발표 ▸ 지금 발표 저장 (이미 있으면 409)
 *      DELETE /api/decks/file?path=<decks 안 경로>             발표 파일 삭제 — 내 발표 ▸ 완전히 삭제 (그 발표만 쓰던 media/ 파일도 함께)
 *      GET  /api/decks/media?dir=<발표 폴더>                  { files: [{ name, size }] }  그 발표 폴더의 media/ 안 파일
 *      PUT  /api/decks/media?dir=<발표 폴더>&name=<파일 이름>  (파일 내용) → decks/<발표 폴더>/media/<파일 이름>
 *      GET/PUT /api/library       { folders, items }   내 발표의 별표·모음·휴지통 정보 (decks/library.json)
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

// 발표 폴더의 media/ 에 둘 수 있는 파일 (내 발표 ▸ 지금 발표 저장)
const DECK_MEDIA_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.mp4', '.webm', '.mov', '.m4v', '.mp3', '.wav', '.m4a', '.ogg', '.glb', '.gltf', '.bin']);
// 발표 파일이 자기 폴더의 media/ 에서 쓰는 파일 이름들. 읽을 수 없는 파일이면 null
function ownedMedia(text) {
  try {
    const m = JSON.parse(text).media;
    if (!m || typeof m !== 'object') return [];
    return Object.values(m).filter((v) => typeof v === 'string' && /^media\/[^\/\\]+$/.test(v)).map((v) => v.slice(6));
  } catch (e) { return null; }
}
// names 가운데 같은 폴더의 다른 발표 파일(사본·백업)이 쓰지 않는 것만 지운다. 비게 된 폴더도 정리한다.
function pruneMedia(dir, names) {
  const mdir = path.join(dir, 'media');
  if (dir === DECK_DIR || mdir === MEDIA_DIR) return 0;
  let removed = 0;
  if (names && names.length) {
    const keep = new Set();
    let jsons = [];
    try { jsons = fs.readdirSync(dir).filter((n) => /\.json$/i.test(n)); } catch (e) { return 0; }
    for (const n of jsons) {
      let own = null;
      try { own = ownedMedia(fs.readFileSync(path.join(dir, n), 'utf8')); } catch (e) { /* 아래에서 중단 */ }
      if (!own) return 0; // 읽지 못한 발표 파일이 있으면 아무것도 지우지 않는다
      own.forEach((x) => keep.add(x));
    }
    for (const name of new Set(names)) {
      if (keep.has(name) || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) continue;
      try { fs.unlinkSync(path.join(mdir, name)); removed++; } catch (e) { /* 이미 없음 */ }
    }
  }
  try { fs.rmdirSync(mdir); } catch (e) { /* 비어 있지 않음 */ }
  try { fs.rmdirSync(dir); } catch (e) { /* 비어 있지 않음 */ }
  return removed;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.ogg': 'video/ogg',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

let state = { rev: 0, source: '', deck: null, cmdSeq: 0, cmd: null, updatedAt: null, selection: null, editorSeenAt: 0 };
const EDITOR_ONLINE_MS = 5000; // 편집기는 1.2초마다 폴링한다
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
    if (url.searchParams.has('editor')) state.editorSeenAt = Date.now();
    return send(res, 200, { rev: state.rev, source: state.source, cmdSeq: state.cmdSeq, cmd: state.cmd, updatedAt: state.updatedAt, slides: state.deck ? state.deck.slides.length : 0, hasSelection: !!state.selection });
  }
  if (p === '/api/selection' && req.method === 'GET') {
    return send(res, 200, { selection: state.selection, editorOnline: Date.now() - state.editorSeenAt < EDITOR_ONLINE_MS });
  }
  if (p === '/api/selection' && req.method === 'POST') {
    let data;
    try { data = JSON.parse(await readBody(req, 1024 * 64)); } catch (e) { return send(res, 400, { error: 'invalid json' }); }
    state.selection = { source: String(data.source || ''), slideId: String(data.slideId || ''), slide: +data.slide || 0, ids: Array.isArray(data.ids) ? data.ids.map(String) : [], text: String(data.text || ''), at: Date.now() };
    return send(res, 200, { ok: true });
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
        if (d.isDirectory()) { if (depth < 3 && d.name !== 'media' && d.name !== 'renders') walk(full, depth + 1); continue; }
        if (!/\.json$/i.test(d.name) || d.name.endsWith('.tmp')) continue;
        if (depth === 0 && d.name === 'library.json') continue; // 내 발표의 정리 정보는 발표 파일이 아니다
        try { const st = fs.statSync(full); files.push({ path: path.relative(DECK_DIR, full).split(path.sep).join('/'), size: st.size, mtime: st.mtimeMs }); } catch (e) { /* 무시 */ }
      }
    };
    walk(DECK_DIR, 0);
    return send(res, 200, { root: 'decks', files });
  }
  if (p === '/api/library') {
    // 내 발표의 정리 정보 — 발표 파일은 건드리지 않고 여기에만 적는다
    const file = path.join(DECK_DIR, 'library.json');
    if (req.method === 'GET') {
      let lib = {};
      try { lib = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* 아직 없음 */ }
      return send(res, 200, { folders: Array.isArray(lib.folders) ? lib.folders : [], items: lib.items && typeof lib.items === 'object' ? lib.items : {} });
    }
    if (req.method === 'PUT') {
      let data;
      try { data = JSON.parse(await readBody(req, 5 * 1024 * 1024)); } catch (e) { return send(res, 400, { error: 'bad json' }); }
      if (!Array.isArray(data.folders) || !data.items || typeof data.items !== 'object') return send(res, 400, { error: 'folders 배열과 items 객체가 필요합니다' });
      fs.mkdirSync(DECK_DIR, { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify({ folders: data.folders, items: data.items }, null, 1));
      fs.renameSync(file + '.tmp', file);
      return send(res, 200, { ok: true });
    }
  }
  if (p === '/api/decks/file' && (req.method === 'PUT' || req.method === 'DELETE')) {
    // decks 폴더 안의 발표 파일(.json)만 다룬다. 실시간 덱·정리 정보·미디어 백업은 건드리지 않는다.
    const rel = String(url.searchParams.get('path') || '').replace(/\\/g, '/');
    const file = path.normalize(path.join(DECK_DIR, rel));
    const inside = file.startsWith(DECK_DIR + path.sep) && !rel.split('/').some((s) => !s || s.startsWith('.'));
    if (!inside || !/\.json$/i.test(rel) || ['live.hppt.json', 'library.json'].includes(rel) || file.startsWith(MEDIA_DIR + path.sep)) return send(res, 400, { error: '쓸 수 없는 경로입니다: ' + rel });
    if (req.method === 'DELETE') {
      if (!fs.existsSync(file)) return send(res, 404, { error: 'not found' });
      let own = null;
      try { own = ownedMedia(fs.readFileSync(file, 'utf8')); } catch (e) { /* 미디어는 그대로 둔다 */ }
      fs.unlinkSync(file);
      const removed = pruneMedia(path.dirname(file), own || []);
      console.log(`[library] delete decks/${rel}${removed ? ` (+ media ${removed})` : ''}`);
      return send(res, 200, { ok: true, mediaRemoved: removed });
    }
    let text;
    try { text = await readBody(req, 1024 * 1024 * 1024); } catch (e) { return send(res, 413, { error: 'too large' }); }
    try { const d = JSON.parse(text); if (!Array.isArray((d.deck || d).slides)) throw new Error('no slides'); } catch (e) { return send(res, 400, { error: '발표 파일 형식이 아닙니다' }); }
    if (fs.existsSync(file) && !url.searchParams.has('overwrite')) return send(res, 409, { error: '이미 있는 파일입니다: ' + rel });
    let before = null;
    try { before = ownedMedia(fs.readFileSync(file, 'utf8')); } catch (e) { /* 새 파일 */ }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', text);
    fs.renameSync(file + '.tmp', file);
    // 덮어쓰면서 더는 쓰지 않게 된 미디어를 정리한다
    const removed = before && before.length ? pruneMedia(path.dirname(file), before) : 0;
    console.log(`[library] save decks/${rel} (${Math.round(text.length / 1024)} KB)${removed ? ` (- media ${removed})` : ''}`);
    return send(res, 200, { ok: true, path: rel, mediaRemoved: removed });
  }
  if (p === '/api/decks/media' && (req.method === 'GET' || req.method === 'PUT')) {
    // 발표 폴더(decks/<폴더>)의 media/ — 그 발표가 쓰는 이미지·영상·소리를 발표 파일 옆에 둔다
    const rel = String(url.searchParams.get('dir') || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const dir = path.normalize(path.join(DECK_DIR, rel));
    const mdir = path.join(dir, 'media');
    const ok = rel && dir.startsWith(DECK_DIR + path.sep) && !rel.split('/').some((s) => !s || s.startsWith('.')) && mdir !== MEDIA_DIR && !dir.startsWith(MEDIA_DIR + path.sep) && dir !== MEDIA_DIR;
    if (!ok) return send(res, 400, { error: '쓸 수 없는 폴더입니다: ' + rel });
    if (req.method === 'GET') {
      const files = [];
      try { for (const n of fs.readdirSync(mdir)) { if (n.endsWith('.tmp')) continue; const st = fs.statSync(path.join(mdir, n)); if (st.isFile()) files.push({ name: n, size: st.size }); } } catch (e) { /* 아직 없음 */ }
      return send(res, 200, { files });
    }
    const name = String(url.searchParams.get('name') || '');
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name) || !DECK_MEDIA_EXT.has(path.extname(name).toLowerCase())) return send(res, 400, { error: '쓸 수 없는 파일 이름입니다: ' + name });
    let buf;
    try { buf = await readRaw(req, 1024 * 1024 * 1024); } catch (e) { return send(res, 413, { error: 'too large' }); }
    fs.mkdirSync(mdir, { recursive: true });
    const file = path.join(mdir, name);
    fs.writeFileSync(file + '.tmp', buf);
    fs.renameSync(file + '.tmp', file);
    console.log(`[library] media decks/${rel}/media/${name} (${Math.round(buf.length / 1024)} KB)`);
    return send(res, 200, { ok: true, name, size: buf.length });
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
