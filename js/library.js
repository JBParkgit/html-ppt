/* 내 발표 — decks 폴더에 있는 발표 파일을 모아 보는 보관함
 *  📚 내 발표 버튼(Ctrl+Shift+O). 미리보기 카드로 보고, 검색·정렬·격자/목록 전환, 크게 보기, 열기,
 *  별표·모음(가상 폴더)·휴지통으로 정리한다. "지금 발표 저장"은 decks/<날짜>_<제목>/<제목>.hppt.json 으로 저장한다.
 *  - 로컬 서버(start.bat)로 실행했을 때만 쓸 수 있다 (파일 목록·저장은 server.js 가 한다).
 *  - 발표에 든 이미지·영상·소리는 같은 폴더의 media/ 에 파일로 따로 저장한다 (발표 폴더만 옮겨도 그대로 열린다).
 *  - 별표·모음·휴지통 정보는 발표 파일을 건드리지 않고 decks/library.json 에 따로 둔다.
 *    휴지통에 넣는 것은 목록에서 숨기는 것이고, "완전히 삭제"를 해야 디스크의 파일이 지워진다. */
const Library = (() => {
  const L = {};
  const h = (...a) => Panels.h(...a);
  const SKIP = new Set(['live.hppt.json', 'library.json']);
  const isBackup = (p) => /backup|백업/i.test(p);
  const fmtDate = (t) => { const d = new Date(t), z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`; };
  const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const fileUrl = (p) => '/decks/' + p.split('/').map(encodeURIComponent).join('/');
  const baseName = (p) => p.slice(p.lastIndexOf('/') + 1).replace(/\.hppt\.json$|\.json$/i, '');
  const dirName = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const safe = (s) => String(s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || '제목 없는 발표';
  const api = async (url, opt) => {
    const r = await fetch(url, Object.assign({ cache: 'no-store' }, opt || {}));
    let data = null;
    try { data = await r.json(); } catch (e) { /* 본문 없음 */ }
    if (!r.ok) { const err = new Error((data && data.error) || 'HTTP ' + r.status); err.status = r.status; throw err; }
    return data;
  };
  const fail = (e) => UI.toast(e.message || String(e), 'error');
  // 보관함 창(모달) 위에 뜨도록 메뉴를 한 층 올린다
  const popMenu = (anchor, items) => { const m = UI.menu(anchor, items); m.style.zIndex = 31000; return m; };

  /* ---------- 정리 정보 (decks/library.json) ---------- */
  let lib = { folders: [], items: {} };
  const meta = (p) => lib.items[p] || {};
  const saveLib = () => api('/api/library', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lib) });
  function setMeta(paths, patch) {
    paths.forEach((p) => {
      const m = Object.assign({}, meta(p), patch);
      Object.keys(m).forEach((k) => { if (m[k] == null || m[k] === false) delete m[k]; });
      if (Object.keys(m).length) lib.items[p] = m; else delete lib.items[p];
    });
    return saveLib();
  }

  /* ---------- 발표 파일 읽기 (미리보기용, 필요할 때만) ---------- */
  const cache = new Map(); // path → { mtime, promise }
  let active = 0;
  const waiting = [];
  const pump = () => { while (active < 3 && waiting.length) { active++; const job = waiting.shift(); job().finally(() => { active--; pump(); }); } };
  function loadDeck(f) {
    const hit = cache.get(f.path);
    if (hit && hit.mtime === f.mtime) return hit.promise;
    const promise = new Promise((resolve, reject) => {
      waiting.push(async () => {
        try {
          const data = await (await fetch(fileUrl(f.path), { cache: 'no-store' })).json();
          const deck = data.deck || data;
          if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) throw new Error('발표 파일이 아닙니다');
          const media = data.media || {};
          // media 표의 값: 파일 안에 든 data URL(예전 방식) 또는 발표 폴더 기준 경로(media/<파일>)
          resolve({ deck, resolve: (src) => { const m = src && media[src]; return !m ? Media.resolve(src) : /^data:/.test(m) ? m : fileUrl((dirName(f.path) ? dirName(f.path) + '/' : '') + m); } });
        } catch (e) { reject(e); }
      });
      pump();
    });
    cache.set(f.path, { mtime: f.mtime, promise });
    return promise;
  }
  // 슬라이드 한 장을 상자 크기에 맞춰 그린다
  function slideView(info, index, boxW, boxH) {
    const d = info.deck, sc = Math.min(boxW / d.width, boxH / d.height);
    const r = Core.renderSlide(d, d.slides[index], { mode: 'thumb', resolve: info.resolve });
    r.style.transform = `scale(${sc})`;
    r.style.transformOrigin = '0 0';
    const view = h('div', { class: 'lib-slide', style: `width:${Math.round(d.width * sc)}px;height:${Math.round(d.height * sc)}px` });
    view.appendChild(r);
    return view;
  }

  /* ---------- 지금 발표를 저장 ---------- */
  // 미디어(이미지·영상·소리·3D)는 발표 폴더의 media/ 에 파일로 따로 두고, 발표 파일에는 { 원래 참조: 'media/<파일>' } 표만 적는다.
  //  - idb:<id>  → media/<id>.<확장자>      - assets/<파일> → media/<파일>
  //  - 이미 같은 파일이 있으면 다시 올리지 않는다. music/ 내장 곡과 웹 주소는 그대로 둔다.
  //  - decks 바로 아래에 저장하는 파일(폴더 없음)만 예전처럼 파일 안에 넣는다.
  const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mp4': '.m4a', 'audio/ogg': '.ogg', 'model/gltf-binary': '.glb', 'model/gltf+json': '.gltf' };
  async function currentData(path) {
    const dir = dirName(path), media = {}, out = { saved: 0, missing: 0 };
    const srcs = [...new Set(Store.allMediaSrcs())];
    if (!dir) {
      for (const src of srcs) { if (src.startsWith('idb:')) media[src] = await Media.toDataURL(src); }
      out.data = { format: 'html-presentation-studio', version: 1, savedAt: new Date().toISOString(), deck: Store.deck, media };
      return out;
    }
    const q = '/api/decks/media?dir=' + encodeURIComponent(dir);
    const have = new Map((await api(q)).files.map((x) => [x.name, x.size]));
    const used = new Set();
    const upload = async (name, blob) => { await api(q + '&name=' + encodeURIComponent(name), { method: 'PUT', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob }); have.set(name, blob.size); };
    for (const src of srcs) {
      try {
        if (src.startsWith('idb:')) {
          const id = src.slice(4);
          let name = [...have.keys()].find((n) => n.slice(0, n.lastIndexOf('.')) === id);
          if (!name) {
            const blob = await Media.blobOf(id);
            if (!blob) { out.missing++; continue; }
            name = id + (EXT[String(blob.type || '').split(';')[0].trim().toLowerCase()] || '.bin');
            await upload(name, blob);
          }
          media[src] = 'media/' + name;
          out.saved++;
        } else if (/^assets\//.test(src)) {
          const r = await fetch(src, { cache: 'no-store' });
          if (!r.ok) { out.missing++; continue; }
          const blob = await r.blob();
          const raw = src.slice(src.lastIndexOf('/') + 1).split(/[?#]/)[0], dot = raw.lastIndexOf('.');
          const stem = (dot > 0 ? raw.slice(0, dot) : raw).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+/, '').slice(0, 80) || 'file';
          const ext = dot > 0 ? raw.slice(dot).toLowerCase() : '.bin';
          // 이름이 같은데 내용(크기)이 다른 파일이 이미 있으면 -2, -3 … 을 붙인다
          let name = stem + ext;
          for (let n = 2; used.has(name) || (have.has(name) && have.get(name) !== blob.size); n++) name = `${stem}-${n}${ext}`;
          if (!have.has(name)) await upload(name, blob);
          used.add(name);
          media[src] = 'media/' + name;
          out.saved++;
        }
      } catch (e) { out.missing++; }
    }
    out.data = { format: 'html-presentation-studio', version: 2, savedAt: new Date().toISOString(), deck: Store.deck, media };
    return out;
  }
  const putFile = (path, text, overwrite) => api('/api/decks/file?path=' + encodeURIComponent(path) + (overwrite ? '&overwrite=1' : ''), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: text });
  const linked = () => { try { return localStorage.getItem('hppt.libPath') || ''; } catch (e) { return ''; } };
  const setLinked = (p) => { try { if (p) localStorage.setItem('hppt.libPath', p); else localStorage.removeItem('hppt.libPath'); } catch (e) { /* ignore */ } };
  // 새 파일 경로: decks/<오늘 날짜>_<제목>/<제목>.hppt.json (같은 이름이 있으면 -2, -3 …)
  async function freshPath(title, taken) {
    const d = new Date(), z = (n) => String(n).padStart(2, '0'), name = safe(title);
    const dir = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${name}`;
    for (let n = 1; n < 200; n++) { const p = `${dir}/${name}${n > 1 ? '-' + n : ''}.hppt.json`; if (!taken.has(p)) return p; }
    return `${dir}/${name}-${Date.now()}.hppt.json`;
  }
  L.saveCurrent = async function (opts) {
    opts = opts || {};
    if (!(await L.available())) { UI.toast('"내 발표"는 start.bat(로컬 서버)로 실행했을 때 쓸 수 있습니다 — 지금은 파일 ▸ 파일로 저장을 쓰세요', 'warn'); return null; }
    if (typeof Editor !== 'undefined' && Editor.editing) Editor.commitEdit();
    Store.saveNow();
    const files = (await api('/api/decks')).files;
    const taken = new Set(files.map((f) => f.path));
    let path = linked(), overwrite = false;
    if (path && taken.has(path) && !opts.asNew) {
      // 내 발표에서 연 파일이면 그 파일에 덮어쓸지 묻는다
      overwrite = window.confirm(`"decks/${path}" 에 덮어쓸까요?\n\n확인 = 이 파일에 덮어쓰기\n취소 = 새 파일로 따로 저장`);
      if (!overwrite) path = '';
    } else path = '';
    if (!path) path = await freshPath(Store.deck.title, taken);
    UI.toast('내 발표에 저장하는 중…');
    try {
      const cur = await currentData(path);
      await putFile(path, JSON.stringify(cur.data), overwrite);
      setLinked(path);
      cache.delete(path);
      if (cur.missing) UI.toast(`내 발표에 저장했지만 미디어 ${cur.missing}개는 찾지 못해 폴더에 넣지 못했습니다 — decks/${path}`, 'warn');
      else UI.toast(`내 발표에 저장했습니다 — decks/${path}${cur.saved && dirName(path) ? ` (미디어 ${cur.saved}개는 같은 폴더의 media 에)` : ''}`);
      return path;
    } catch (e) { UI.toast('저장하지 못했습니다: ' + e.message, 'error'); return null; }
  };
  L.available = async function () {
    if (!/^https?:$/.test(location.protocol)) return false;
    try { await api('/api/library'); return true; } catch (e) { return false; }
  };

  /* ---------- 화면 ---------- */
  const NAV = [['recent', '최근 발표', '🕘'], ['all', '모든 발표', '▦'], ['starred', '별표', '★']];
  const NAV2 = [['trash', '휴지통', '🗑']];
  L.open = async function () {
    if (!(await L.available())) {
      UI.toast('"내 발표"는 start.bat(로컬 서버)로 실행했을 때 쓸 수 있습니다. 서버를 방금 업데이트했다면 서버 창을 닫고 start.bat 을 다시 실행하세요.', 'warn');
      return;
    }
    let nav = { type: 'recent', id: null }, sort = 'recent', query = '', layout = 'grid', showBackups = false, files = [];
    try { layout = localStorage.getItem('hppt.libLayout') === 'list' ? 'list' : 'grid'; } catch (e) { /* ignore */ }
    const picked = new Set();
    let dragPaths = null;

    const side = h('nav', { class: 'lib-side' });
    const title = h('div', { class: 'lib-title' });
    const search = h('input', { type: 'search', class: 'lib-search', placeholder: '🔍 제목·폴더·파일 이름', oninput: () => { query = search.value.trim().toLowerCase(); drawMain(); } });
    const sortSel = h('select', { class: 'lib-sort', title: '정렬', onchange: () => { sort = sortSel.value; drawMain(); } },
      h('option', { value: 'recent' }, '최근 수정순'), h('option', { value: 'old' }, '오래된순'), h('option', { value: 'name' }, '이름순'));
    const layoutBtn = h('button', { class: 'p-btn', title: '격자 ↔ 목록', onclick: () => { layout = layout === 'grid' ? 'list' : 'grid'; try { localStorage.setItem('hppt.libLayout', layout); } catch (e) { /* ignore */ } drawMain(); } });
    const backupBox = h('input', { type: 'checkbox', onchange: () => { showBackups = backupBox.checked; draw(); } });
    const tools = h('div', { class: 'lib-tools' });
    const selBar = h('div', { class: 'lib-selbar', hidden: true });
    const body = h('div', { class: 'lib-body' });
    const root = h('div', { class: 'lib-layout' }, side,
      h('div', { class: 'lib-main' },
        h('div', { class: 'lib-bar' }, title, h('span', { class: 'lib-grow' }), search, sortSel, layoutBtn, tools),
        selBar, body));
    const close = UI.modal('📚 내 발표', root, [
      [h('label', { class: 'lib-backup', title: '이름에 backup·백업이 들어간 파일도 보여 줍니다' }, backupBox, ' 백업 파일도 보기'), () => false, 'lib-footleft'],
      ['닫기', () => true],
    ], { wide: true });
    const modalEl = root.closest('.modal');
    if (modalEl) modalEl.classList.add('lib-modal');
    // 모달 버튼은 글자만 받으므로 체크 상자 줄을 직접 넣는다
    const foot = modalEl && modalEl.querySelector('.modal-foot');
    if (foot && foot.firstChild) { const first = foot.firstChild; first.replaceWith(h('label', { class: 'lib-backup', title: '이름에 backup·백업이 들어간 파일도 보여 줍니다' }, backupBox, h('span', null, ' 백업 파일도 보기'))); }

    const shown = () => files.filter((f) => showBackups || !isBackup(f.path));
    const live = () => shown().filter((f) => !meta(f.path).trashedAt);
    const folderName = (id) => { const f = lib.folders.find((x) => x.id === id); return f ? f.name : null; };
    const titleOf = (f) => f.title || baseName(f.path);
    const go = (type, id) => { nav = { type, id: id || null }; picked.clear(); draw(); };

    const openDeck = async (f) => {
      try {
        const r = await fetch(fileUrl(f.path), { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        close();
        await IO.openProject(new File([await r.blob()], baseName(f.path) + '.hppt.json', { type: 'application/json' }), { url: fileUrl(f.path) });
        setLinked(f.path);
      } catch (e) { UI.toast('파일을 열 수 없습니다: decks/' + f.path, 'error'); }
    };
    const star = async (paths, on) => { await setMeta(paths, { starred: on || null }); draw(); };
    const moveTo = async (paths, folder) => { await setMeta(paths, { folder: folder || null }); picked.clear(); UI.toast(folder ? `"${folderName(folder)}" 모음에 넣었습니다` : '모음에서 꺼냈습니다'); draw(); };
    const trash = async (paths) => { await setMeta(paths, { trashedAt: Date.now() }); picked.clear(); UI.toast(`휴지통으로 옮겼습니다 (${paths.length}개) — 파일은 그대로 있고, 휴지통에서 되살릴 수 있습니다`); draw(); };
    const restore = async (paths) => { await setMeta(paths, { trashedAt: null }); picked.clear(); UI.toast('되살렸습니다'); draw(); };
    const destroy = async (paths) => {
      if (!window.confirm(`발표 파일 ${paths.length}개를 디스크에서 완전히 삭제할까요?\n\n${paths.slice(0, 6).map((p) => 'decks/' + p).join('\n')}${paths.length > 6 ? '\n…' : ''}\n\n그 발표만 쓰던 media 폴더의 파일도 함께 지워집니다. 되돌릴 수 없습니다.`)) return;
      for (const p of paths) {
        await api('/api/decks/file?path=' + encodeURIComponent(p), { method: 'DELETE' });
        delete lib.items[p]; cache.delete(p);
        if (linked() === p) setLinked('');
      }
      await saveLib();
      picked.clear();
      await load();
    };
    const duplicate = async (f) => {
      const text = await (await fetch(fileUrl(f.path), { cache: 'no-store' })).text();
      const taken = new Set(files.map((x) => x.path)), dir = dirName(f.path), base = baseName(f.path);
      let p = '';
      for (let n = 1; n < 100; n++) { p = (dir ? dir + '/' : '') + base + ' 사본' + (n > 1 ? ' ' + n : '') + '.hppt.json'; if (!taken.has(p)) break; }
      await putFile(p, text, false);
      UI.toast('사본을 만들었습니다 — decks/' + p);
      await load();
    };
    const newFolder = async () => {
      const name = (window.prompt('새 모음 이름', '새 모음') || '').trim();
      if (!name) return null;
      const f = { id: 'f' + Date.now().toString(36), name, createdAt: Date.now() };
      lib.folders.push(f);
      await saveLib();
      draw();
      return f;
    };
    const renameFolder = async (f) => { const name = (window.prompt('모음 이름', f.name) || '').trim(); if (!name || name === f.name) return; f.name = name; await saveLib(); draw(); };
    const deleteFolder = async (f) => {
      if (!window.confirm(`"${f.name}" 모음을 없앨까요? 안에 든 발표는 지워지지 않습니다.`)) return;
      lib.folders = lib.folders.filter((x) => x.id !== f.id);
      Object.keys(lib.items).forEach((p) => { if (lib.items[p].folder === f.id) { delete lib.items[p].folder; if (!Object.keys(lib.items[p]).length) delete lib.items[p]; } });
      await saveLib();
      if (nav.type === 'folder' && nav.id === f.id) nav = { type: 'all', id: null };
      draw();
    };
    const pickFolder = (anchor, paths) => popMenu(anchor, [
      ['▦ 모음 없음', () => moveTo(paths, null).catch(fail), ''],
      ...lib.folders.map((f) => ['📁 ' + f.name, () => moveTo(paths, f.id).catch(fail), '']),
      '-',
      ['＋ 새 모음 만들어 넣기', async () => { const f = await newFolder(); if (f) await moveTo(paths, f.id).catch(fail); }, ''],
    ]);
    // 크게 보기: 편집기에 열지 않고 슬라이드를 넘겨 본다
    const view = async (f) => {
      const stage = h('div', { class: 'lib-stage' }, '불러오는 중…');
      const strip = h('div', { class: 'lib-strip' });
      const cap = h('span', { class: 'lib-cap' });
      let i = 0, info = null;
      const show = (n) => {
        if (!info) return;
        i = Math.max(0, Math.min(info.deck.slides.length - 1, n));
        stage.replaceChildren(slideView(info, i, Math.min(900, window.innerWidth - 160), Math.min(506, window.innerHeight - 320)));
        [...strip.children].forEach((b, k) => b.classList.toggle('on', k === i));
        cap.textContent = `${i + 1} / ${info.deck.slides.length}`;
      };
      const vclose = UI.modal(titleOf(f), h('div', { class: 'lib-viewer' }, stage, h('div', { class: 'lib-vnav' }, h('button', { class: 'p-btn', onclick: () => show(i - 1) }, '◀ 이전'), cap, h('button', { class: 'p-btn', onclick: () => show(i + 1) }, '다음 ▶')), strip, h('p', { class: 'p-hint' }, `decks/${f.path} · ${fmtSize(f.size)} · ${fmtDate(f.mtime)}`)), [
        ['닫기', () => true],
        ...(meta(f.path).trashedAt ? [] : [['✎ 편집기에서 열기', () => { openDeck(f); return true; }, 'primary']]),
      ], { wide: true });
      void vclose;
      try {
        info = await loadDeck(f);
        info.deck.slides.forEach((_, k) => strip.appendChild(h('button', { class: 'lib-pg', onclick: () => show(k) }, String(k + 1))));
        show(0);
      } catch (e) { stage.textContent = '미리보기를 만들지 못했습니다: ' + e.message; }
    };

    /* --- 왼쪽 메뉴 --- */
    const dropOn = (el, folder) => {
      el.addEventListener('dragover', (e) => { if (!dragPaths) return; e.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drop'); const p = dragPaths; dragPaths = null; if (p) moveTo(p, folder).catch(fail); });
      return el;
    };
    function drawSide() {
      const count = { recent: live().length, all: live().length, starred: live().filter((f) => meta(f.path).starred).length, trash: shown().length - live().length };
      const item = (type, label, icon, id) => h('button', { class: 'lib-nav' + (nav.type === type && nav.id === (id || null) ? ' on' : ''), 'data-nav': id || type, onclick: () => go(type, id) },
        h('i', null, icon), h('span', null, label), h('small', null, String(type === 'folder' ? live().filter((f) => meta(f.path).folder === id).length : count[type])));
      side.replaceChildren(
        h('button', { class: 'p-btn primary lib-save', title: '지금 편집 중인 발표를 decks 폴더에 저장합니다', onclick: async () => { const p = await L.saveCurrent(); if (p) await load(); } }, '💾 지금 발표 저장'),
        ...NAV.map(([t, l, i]) => (t === 'all' ? dropOn(item(t, l, i), null) : item(t, l, i))),
        h('div', { class: 'lib-sidehead' }, h('span', null, '모음'), h('button', { class: 'lib-mini', title: '새 모음', onclick: () => newFolder().catch(fail) }, '＋')),
        ...(lib.folders.length ? lib.folders.map((f) => dropOn(item('folder', f.name, '📁', f.id), f.id)) : [h('p', { class: 'p-hint lib-sidehint' }, '모음을 만들어 발표를 묶어 두세요. 카드를 끌어다 놓으면 들어갑니다.')]),
        h('div', { class: 'lib-sep' }),
        ...NAV2.map(([t, l, i]) => item(t, l, i)));
    }

    /* --- 카드 / 줄 --- */
    const workMenu = (anchor, f) => popMenu(anchor, [
      ['✎ 편집기에서 열기', () => openDeck(f), ''],
      ['🔍 크게 보기', () => view(f), ''],
      '-',
      [meta(f.path).starred ? '☆ 별표 해제' : '★ 별표', () => star([f.path], !meta(f.path).starred).catch(fail), ''],
      ['📁 모음에 넣기…', () => pickFolder(anchor, [f.path]), ''],
      ['⧉ 사본 만들기', () => duplicate(f).catch(fail), ''],
      '-',
      ['🗑 휴지통으로', () => trash([f.path]).catch(fail), ''],
    ]);
    const trashMenu = (anchor, f) => popMenu(anchor, [
      ['↩ 되살리기', () => restore([f.path]).catch(fail), ''],
      ['🔍 크게 보기', () => view(f), ''],
      '-',
      ['✖ 완전히 삭제 (파일 삭제)', () => destroy([f.path]).catch(fail), ''],
    ]);
    const pickBox = (f) => h('input', { type: 'checkbox', class: 'lib-check', title: '선택', checked: picked.has(f.path), onclick: (e) => e.stopPropagation(), onchange: (e) => { if (e.target.checked) picked.add(f.path); else picked.delete(f.path); e.target.closest('[data-path]').classList.toggle('picked', e.target.checked); drawSel(); } });
    const starBtn = (f) => { const on = !!meta(f.path).starred; return h('button', { class: 'lib-star' + (on ? ' on' : ''), title: on ? '별표 해제' : '별표', onclick: (e) => { e.stopPropagation(); star([f.path], !on).catch(fail); } }, on ? '★' : '☆'); };
    const dragProps = (f) => ({ draggable: 'true', ondragstart: (e) => { dragPaths = picked.has(f.path) ? [...picked] : [f.path]; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.path); }, ondragend: () => setTimeout(() => { dragPaths = null; }, 0) });
    // 미리보기와 제목은 파일을 읽은 뒤에 채운다
    function fill(f, thumb, nameEl, subEl, w, hgt) {
      loadDeck(f).then((info) => {
        f.title = info.deck.title || baseName(f.path);
        f.slides = info.deck.slides.length;
        if (nameEl) { nameEl.textContent = f.title; nameEl.title = f.title; }
        if (subEl) subEl.textContent = subText(f);
        if (thumb && thumb.isConnected) { thumb.querySelector('.lib-ph') && thumb.querySelector('.lib-ph').remove(); thumb.prepend(slideView(info, 0, w, hgt)); }
      }).catch(() => { if (thumb && thumb.querySelector('.lib-ph')) thumb.querySelector('.lib-ph').textContent = '미리보기 없음'; });
    }
    const subText = (f) => `${f.slides ? f.slides + '장 · ' : ''}${fmtDate(f.mtime)}`;
    function card(f, trashed) {
      const more = h('button', { class: 'lib-more', title: '더 보기', onclick: (e) => { e.stopPropagation(); (trashed ? trashMenu : workMenu)(more, f); } }, '⋯');
      const thumb = h('button', { class: 'lib-thumb', title: trashed ? '크게 보기' : '크게 보기 (두 번 누르면 편집기에서 열기)', onclick: () => view(f), ondblclick: () => { if (!trashed) openDeck(f); } }, h('span', { class: 'lib-ph' }, '…'), linked() === f.path ? h('span', { class: 'lib-now' }, '편집 중') : null, isBackup(f.path) ? h('span', { class: 'lib-bk' }, '백업') : null);
      const name = h('b', { title: titleOf(f) }, titleOf(f)), sub = h('small', null, trashed ? fmtDate(meta(f.path).trashedAt) + ' 에 버림' : subText(f));
      const el = h('div', Object.assign({ class: 'lib-card' + (picked.has(f.path) ? ' picked' : ''), 'data-path': f.path }, trashed ? {} : dragProps(f)),
        thumb, pickBox(f), trashed ? null : starBtn(f),
        h('div', { class: 'lib-meta' }, h('div', { class: 'lib-text' }, name, sub, h('small', { class: 'lib-dir', title: 'decks/' + f.path }, '📁 ' + (dirName(f.path) || 'decks') + (folderName(meta(f.path).folder) ? ' · ' + folderName(meta(f.path).folder) : ''))), more),
        h('div', { class: 'lib-actions' }, trashed
          ? [h('button', { class: 'p-btn', onclick: () => restore([f.path]).catch(fail) }, '↩ 되살리기'), h('button', { class: 'p-btn danger', onclick: () => destroy([f.path]).catch(fail) }, '완전히 삭제')]
          : [h('button', { class: 'p-btn primary', onclick: () => openDeck(f) }, '✎ 열기'), h('button', { class: 'p-btn', onclick: () => view(f) }, '🔍 크게 보기')]));
      fill(f, thumb, name, trashed ? null : sub, 236, 133);
      return el;
    }
    function rowEl(f, trashed) {
      const more = h('button', { class: 'lib-more', title: '더 보기', onclick: (e) => { e.stopPropagation(); (trashed ? trashMenu : workMenu)(more, f); } }, '⋯');
      const thumb = h('button', { class: 'lib-mini-thumb', title: '크게 보기', onclick: () => view(f) }, h('span', { class: 'lib-ph' }, '…'));
      const name = h('b', { class: 'lib-rname', title: titleOf(f) }, titleOf(f)), sub = h('span', { class: 'lib-rcol' }, subText(f));
      const el = h('div', Object.assign({ class: 'lib-row' + (picked.has(f.path) ? ' picked' : ''), 'data-path': f.path, ondblclick: (e) => { if (!trashed && !e.target.closest('button, input')) openDeck(f); } }, trashed ? {} : dragProps(f)),
        pickBox(f), thumb, name, h('span', { class: 'lib-rcol wide', title: 'decks/' + f.path }, dirName(f.path) || 'decks'), h('span', { class: 'lib-rcol' }, folderName(meta(f.path).folder) || (trashed ? '휴지통' : '—')), sub,
        trashed ? h('span', { class: 'lib-starpad' }) : starBtn(f), more);
      fill(f, thumb, name, sub, 64, 36);
      return el;
    }
    const sorted = (list) => {
      list = list.filter((f) => !query || f.path.toLowerCase().includes(query) || (f.title || '').toLowerCase().includes(query));
      if (sort === 'old') return [...list].sort((a, b) => a.mtime - b.mtime);
      if (sort === 'name') return [...list].sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'ko'));
      return [...list].sort((a, b) => b.mtime - a.mtime);
    };
    const empty = (icon, head, text) => h('div', { class: 'lib-empty' }, h('i', null, icon), h('b', null, head), h('p', { class: 'p-hint' }, text));
    const works = (list, trashed) => (layout === 'list'
      ? h('div', { class: 'lib-list' }, list.map((f) => rowEl(f, trashed)))
      : h('div', { class: 'lib-grid' }, list.map((f) => card(f, trashed))));

    function drawSel() {
      selBar.replaceChildren();
      selBar.hidden = !picked.size;
      if (!picked.size) return;
      const paths = [...picked];
      const mv = h('button', { class: 'p-btn', onclick: () => pickFolder(mv, paths) }, '📁 모음에 넣기');
      selBar.append(h('b', null, `${paths.length}개 선택`),
        ...(nav.type === 'trash'
          ? [h('button', { class: 'p-btn', onclick: () => restore(paths).catch(fail) }, '↩ 되살리기'), h('button', { class: 'p-btn danger', onclick: () => destroy(paths).catch(fail) }, '완전히 삭제')]
          : [h('button', { class: 'p-btn', onclick: () => star(paths, true).catch(fail) }, '★ 별표'), mv, h('button', { class: 'p-btn', onclick: () => trash(paths).catch(fail) }, '🗑 휴지통으로')]),
        h('span', { class: 'lib-grow' }), h('button', { class: 'p-btn', onclick: () => { picked.clear(); drawMain(); } }, '선택 해제'));
    }
    function drawMain() {
      const t = nav.type;
      layoutBtn.textContent = layout === 'grid' ? '☰ 목록' : '▦ 격자';
      tools.replaceChildren();
      body.replaceChildren();
      const fd = t === 'folder' ? lib.folders.find((x) => x.id === nav.id) : null;
      title.replaceChildren(...(fd ? [h('button', { class: 'lib-crumb', onclick: () => go('all') }, '모든 발표'), ' › ', fd.name] : [(NAV.concat(NAV2).find((x) => x[0] === t) || [])[1] || '']));
      let list = [];
      if (t === 'recent') list = sorted(live());
      else if (t === 'all') {
        tools.append(h('button', { class: 'p-btn', onclick: () => newFolder().catch(fail) }, '＋ 새 모음'));
        if (lib.folders.length && !query) {
          body.append(h('div', { class: 'lib-h' }, '모음'), h('div', { class: 'lib-folders' }, lib.folders.map((f) => {
            const more = h('button', { class: 'lib-more', title: '더 보기', onclick: (e) => { e.stopPropagation(); popMenu(more, [['📂 열기', () => go('folder', f.id), ''], ['✎ 이름 바꾸기', () => renameFolder(f).catch(fail), ''], '-', ['✖ 모음 없애기', () => deleteFolder(f).catch(fail), '']]); } }, '⋯');
            return dropOn(h('div', { class: 'lib-folder', 'data-folder': f.id, onclick: (e) => { if (!e.target.closest('.lib-more')) go('folder', f.id); } }, h('i', null, '📁'), h('div', { class: 'lib-text' }, h('b', null, f.name), h('small', null, `발표 ${live().filter((x) => meta(x.path).folder === f.id).length}개`)), more), f.id);
          })), h('div', { class: 'lib-h' }, '발표'));
        }
        list = sorted(live().filter((f) => !folderName(meta(f.path).folder)));
      } else if (fd) {
        tools.append(h('button', { class: 'p-btn', onclick: () => renameFolder(fd).catch(fail) }, '✎ 이름 바꾸기'), h('button', { class: 'p-btn', onclick: () => deleteFolder(fd).catch(fail) }, '✖ 모음 없애기'));
        list = sorted(live().filter((f) => meta(f.path).folder === fd.id));
      } else if (t === 'starred') list = sorted(live().filter((f) => meta(f.path).starred));
      else if (t === 'trash') {
        list = sorted(shown().filter((f) => meta(f.path).trashedAt));
        if (list.length) body.append(h('p', { class: 'p-hint' }, '휴지통에 넣은 발표는 목록에서만 숨겨진 것이고, 파일은 decks 폴더에 그대로 있습니다. "완전히 삭제"를 눌러야 파일이 지워집니다.'));
      }
      if (list.length) body.append(works(list, t === 'trash'));
      else if (!shown().length) body.append(empty('📚', '저장된 발표가 없습니다', '왼쪽 위 "지금 발표 저장"을 누르면 decks 폴더에 저장되어 여기에 나타납니다.'));
      else body.append(empty(query ? '🔍' : t === 'trash' ? '🗑' : t === 'starred' ? '★' : '📁', query ? '찾는 발표가 없습니다' : t === 'trash' ? '휴지통이 비어 있습니다' : t === 'starred' ? '별표한 발표가 없습니다' : t === 'folder' ? '빈 모음입니다' : '모음 밖에 있는 발표가 없습니다', t === 'folder' && !query ? '발표 카드의 ⋯ ▸ 모음에 넣기를 고르거나, 카드를 왼쪽 모음 이름 위로 끌어다 놓으세요.' : ''));
      drawSel();
    }
    function draw() { drawSide(); drawMain(); }
    async function load() {
      const [a, b] = await Promise.all([api('/api/decks'), api('/api/library')]);
      const old = new Map(files.map((f) => [f.path, f]));
      files = a.files.filter((f) => /\.json$/i.test(f.path) && !SKIP.has(f.path)).map((f) => Object.assign({}, f, old.has(f.path) && old.get(f.path).mtime === f.mtime ? { title: old.get(f.path).title, slides: old.get(f.path).slides } : {}));
      lib = { folders: Array.isArray(b.folders) ? b.folders : [], items: b.items && typeof b.items === 'object' ? b.items : {} };
      [...picked].forEach((p) => { if (!files.some((f) => f.path === p)) picked.delete(p); });
      draw();
    }
    body.append(h('p', { class: 'p-hint' }, '불러오는 중…'));
    try { await load(); } catch (e) { body.replaceChildren(h('p', { class: 'p-hint' }, '목록을 불러오지 못했습니다: ' + e.message)); }
  };
  return L;
})();
