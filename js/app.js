/* 앱 초기화, 툴바, 단축키, 삽입/정렬/슬라이드 조작, 모달 */
const UI = (() => {
  const U = {};
  U.toast = function (msg, kind) {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), kind === 'error' ? 5000 : 2600);
    setTimeout(() => t.remove(), kind === 'error' ? 5400 : 3000);
  };
  // 버튼이 있는 알림 (한 번에 하나만, 10초 뒤 자동으로 사라짐)
  U.notify = function (msg, actions, kind) {
    document.querySelectorAll('.notify').forEach((x) => x.remove());
    const n = document.createElement('div');
    n.className = 'notify ' + (kind || '');
    const t = document.createElement('div');
    t.className = 'notify-text';
    t.textContent = msg;
    n.appendChild(t);
    const row = document.createElement('div');
    row.className = 'notify-actions';
    const close = () => { n.classList.add('out'); setTimeout(() => n.remove(), 250); };
    (actions || []).forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = () => { close(); fn(); };
      row.appendChild(b);
    });
    const x = document.createElement('button');
    x.className = 'notify-x';
    x.textContent = '✕';
    x.title = '닫기';
    x.onclick = close;
    row.appendChild(x);
    n.appendChild(row);
    document.body.appendChild(n);
    let timer = setTimeout(close, 10000);
    n.addEventListener('mouseenter', () => clearTimeout(timer));
    n.addEventListener('mouseleave', () => { timer = setTimeout(close, 5000); });
    return close;
  };

  U.modal = function (title, body, buttons, opts) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    const m = document.createElement('div');
    m.className = 'modal' + (opts && opts.wide ? ' wide' : '');
    m.innerHTML = `<div class="modal-head"><b></b><button class="modal-x" title="닫기">✕</button></div><div class="modal-body"></div><div class="modal-foot"></div>`;
    m.querySelector('b').textContent = title;
    m.querySelector('.modal-body').appendChild(typeof body === 'string' ? Object.assign(document.createElement('div'), { innerHTML: body }) : body);
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    (buttons || [['닫기', () => true]]).forEach(([label, fn, cls]) => {
      const b = document.createElement('button');
      b.className = 'p-btn ' + (cls || '');
      b.textContent = label;
      b.onclick = async () => { if (await fn()) close(); };
      m.querySelector('.modal-foot').appendChild(b);
    });
    m.querySelector('.modal-x').onclick = close;
    bg.addEventListener('pointerdown', (e) => { if (e.target === bg) close(); });
    bg.appendChild(m);
    document.body.appendChild(bg);
    const f = m.querySelector('input,textarea,select');
    if (f) setTimeout(() => f.focus(), 30);
    return close;
  };
  // 숨겨진(더보기로 옮긴) 버튼이면 "더보기" 버튼 위치를 쓴다
  U.rectOf = function (anchor) {
    const r = anchor.getBoundingClientRect();
    if (r.width || r.height) return r;
    const more = document.getElementById('btn-more');
    return more ? more.getBoundingClientRect() : r;
  };
  U.menu = function (anchor, items) {
    document.querySelectorAll('.pop-menu').forEach((x) => x.remove());
    const m = document.createElement('div');
    m.className = 'pop-menu ctx-menu';
    items.forEach((it) => {
      if (it === '-') { m.appendChild(document.createElement('hr')); return; }
      const b = document.createElement('button');
      b.innerHTML = `<span>${it[0]}</span><kbd>${it[2] || ''}</kbd>`;
      b.onclick = () => { m.remove(); it[1](); };
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = U.rectOf(anchor);
    const mr = m.getBoundingClientRect();
    m.style.left = Math.min(r.left, innerWidth - mr.width - 8) + 'px';
    m.style.top = (r.bottom + 4) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off); } }), 0);
    return m;
  };
  return U;
})();

const App = (() => {
  const A = {};
  const $ = (s) => document.querySelector(s);
  let clip = null;

  /* ---------------- 초기화 ---------------- */
  A.init = async function () {
    Core.injectCSS();
    // 예전 앱 내 AI 기능이 저장해 둔 설정(API 키 포함)을 지운다 — AI 는 터미널의 Claude 로 사용
    try { localStorage.removeItem('hppt.ai.v1'); } catch (e) { /* ignore */ }
    Store.init();
    Editor.init();
    Pen.init();
    A.initToolbarFit();
    Panels.init();
    Media.onLoaded = debounce(() => { Panels.invalidateThumbs(); Editor.render(); Panels.renderList(); }, 120);
    Store.on(onChange);
    bindToolbar();
    bindKeys();
    bindClipboard();
    bindNotes();
    $('#doc-title').value = Store.deck.title;
    Panels.showTab('props');
    Editor.render();
    Panels.renderList(true);
    updateStatus();
    Media.preload(Store.allMediaSrcs());
    window.addEventListener('beforeunload', () => { if (Store.dirty) Store.saveNow(); });
  };

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  const listLater = debounce(() => Panels.renderList(), 250);

  function onChange(info) {
    if (info.select) {
      Editor.drawSelection();
      Panels.renderProps();
      updateStatus();
      return;
    }
    if (info.slideChanged) {
      Editor.render();
      Panels.renderList();
      Panels.renderProps();
      syncNotes();
      updateStatus();
      return;
    }
    Editor.render();
    if (info.structure) Panels.renderList(true); else listLater();
    Panels.renderProps();
    syncNotes();
    updateStatus();
    $('#aspect-sel').value = Store.deck.aspect in ASPECTS ? Store.deck.aspect : 'custom';
  }

  function updateStatus() {
    const d = Store.deck;
    $('#status-left').textContent = `슬라이드 ${Store.cur + 1} / ${d.slides.length}  ·  ${d.width}×${d.height} (${d.aspect})  ·  요소 ${Store.slide().elements.length}개` + (Store.sel.length ? `  ·  ${Store.sel.length}개 선택` : '');
    $('#btn-undo').disabled = !Store.canUndo();
    $('#btn-redo').disabled = !Store.canRedo();
  }

  /* ---------------- 노트 ---------------- */
  function bindNotes() {
    const n = $('#notes');
    n.addEventListener('focus', () => Store.checkpoint());
    n.addEventListener('input', () => { Store.slide().notes = n.value; Store.scheduleSave(); });
  }
  function syncNotes() {
    const n = $('#notes');
    if (document.activeElement !== n) n.value = Store.slide().notes || '';
  }

  /* ---------------- 툴바 ---------------- */
  function bindToolbar() {
    const on = (sel, fn) => { const e = $(sel); if (e) e.addEventListener('click', fn); };
    on('#btn-file', (e) => UI.menu(e.currentTarget, [
      ['📄 새 프레젠테이션', () => A.newDeck(), ''],
      ['📂 열기…', () => A.pickProject(), 'Ctrl+O'],
      ['💾 파일로 저장', () => IO.saveProject(), 'Ctrl+S'],
      '-',
      ['🌐 HTML로 내보내기 (단독 실행)', () => IO.exportHTML(), ''],
      ['🖨 PDF로 인쇄', () => IO.printPDF(), 'Ctrl+P'],
      ['🎬 동영상으로 만들기', () => A.makeVideo(), ''],
      '-',
      ['✨ 예제 프레젠테이션 불러오기', () => { if (confirm('현재 문서를 예제로 바꿀까요? (Ctrl+Z 로 되돌리기 가능)')) { Panels.invalidateThumbs(); Store.setDeck(demoDeck()); $('#doc-title').value = Store.deck.title; } }, ''],
      ['🧹 사용하지 않는 미디어 정리', async () => { const n = await Media.clearUnused(Store.allMediaSrcs().concat(MusicBox.srcs())); UI.toast(`미디어 ${n}개를 정리했습니다`); }, ''],
      ['⌨ 단축키 도움말', () => A.help(), 'F1'],
    ]));
    on('#btn-new-slide', (e) => A.layoutPicker(e.currentTarget));
    on('#btn-text', () => A.addText());
    on('#btn-shape', (e) => A.shapePicker(e.currentTarget));
    on('#btn-image', () => A.pickFile('image'));
    on('#btn-video', (e) => UI.menu(e.currentTarget, [
      ['⛶ 전체 화면 동영상 (비율 유지 · 검은 여백)', () => A.pickFile('video', { full: true }), ''],
      ['🎬 새 슬라이드에 전체 화면 동영상', () => A.videoSlide(), ''],
      ['▭ 일반 동영상 (크기 조절)', () => A.pickFile('video'), ''],
    ]));
    on('#btn-embed', () => A.addEmbed());
    on('#btn-model', () => A.addModel());
    on('#btn-table', () => A.addTable());
    on('#btn-icon', () => A.addIcon());
    on('#btn-chart', () => A.addChart());
    on('#btn-code', () => A.addCode());
    on('#btn-button', () => A.addButton());
    on('#btn-music', () => A.musicDialog());
    on('#btn-overview', () => A.overview());
    on('#btn-pen', () => (Pen.mode === 'draw' ? null : Pen.startDraw()));
    on('#btn-undo', () => { Editor.commitEdit(); Store.undo(); });
    on('#btn-redo', () => { Editor.commitEdit(); Store.redo(); });
    on('#btn-zoom-in', () => Editor.setZoom(Math.min(3, Editor.scale * 1.2)));
    on('#btn-zoom-out', () => Editor.setZoom(Math.max(0.1, Editor.scale / 1.2)));
    on('#zoom-label', () => Editor.setZoom('fit'));
    on('#btn-present', () => A.present(0));
    on('#btn-present-menu', (e) => UI.menu(e.currentTarget, [
      ['▶ 처음부터', () => A.present(0), 'F5 · Ctrl+Enter'],
      ['▶ 현재 슬라이드부터', () => A.present(Store.cur), 'Shift+F5 · Ctrl+Shift+Enter'],
      ['🖥 발표자 보기와 함께 발표', () => A.present(Store.cur, { presenterView: true, noFullscreen: true }), 'P'],
      ['⏵ 자동 재생', () => A.present(0, { autoplay: true }), ''],
      ['🔁 반복 재생 (광고·대기 화면)…', () => A.loopDialog(), ''],
      ['🎬 녹화해서 동영상 만들기', () => A.makeVideo(), ''],
      ['🪟 새 창에서 미리보기', () => A.previewWindow(), ''],
    ]));
    const asp = $('#aspect-sel');
    Object.entries(ASPECTS).forEach(([k, a]) => asp.appendChild(Object.assign(document.createElement('option'), { value: k, textContent: a.label })));
    asp.value = Store.deck.aspect in ASPECTS ? Store.deck.aspect : 'custom';
    asp.addEventListener('change', () => A.setAspect(asp.value));
    $('#doc-title').addEventListener('change', (e) => { Store.checkpoint(); Store.deck.title = e.target.value || '제목 없음'; Store.emit({}); });
    $('#file-input').addEventListener('change', onFilePicked);
  }

  /* ---------------- 파일 선택 ---------------- */
  let pickCb = null;
  function onFilePicked(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (pickCb) { const cb = pickCb; pickCb = null; cb(files); }
  }
  function pick(accept, multiple, cb) {
    const fi = $('#file-input');
    fi.accept = accept;
    fi.multiple = !!multiple;
    pickCb = cb;
    fi.click();
  }
  A.pickFile = function (type, opts) {
    pick(type === 'image' ? 'image/*' : 'video/*,audio/*', true, (files) => files.forEach((f, i) => A.insertFile(f, null, i, opts)));
  };

  // 동영상을 슬라이드 전체 크기로: 비율은 유지(맞추기)하고 남는 부분은 여백 색(기본 검정)
  function makeFull(el) {
    const d = Store.deck;
    Object.assign(el, { x: 0, y: 0, w: d.width, h: d.height, rotation: 0, radius: 0, borderWidth: 0, shadow: 0, opacity: 1 });
    if (el.type === 'video') el.fit = 'contain';
    el.fill = el.fill && el.fill !== 'transparent' ? el.fill : '#000000';
    el.fullscreen = true;
    return el;
  }
  A.fitFullScreen = function (el) {
    if (!el) return;
    Store.checkpoint();
    makeFull(el);
    // 다른 요소에 가려지지 않게 맨 앞으로
    const s = Store.slide();
    s.elements = s.elements.filter((x) => x !== el).concat(el);
    Store.emit({ content: true });
    UI.toast('⛶ 전체 화면으로 맞췄습니다 — 비율은 그대로, 남는 부분은 ' + (el.fill === '#000000' || el.fill === '#000' ? '검은색' : '여백 색') + '으로 채워집니다');
  };

  // 동영상 크게 보기 (편집 화면 미리보기 창, 자른 구간만 재생)
  A.previewVideo = function (el) {
    const h = Panels.h;
    let media;
    if (el.type === 'video') {
      const ts = +el.trimStart || 0, te = +el.trimEnd || 0;
      media = h('video', { class: 'vp-media', src: Media.resolve(el.src), controls: true, autoplay: true, playsinline: true });
      media.style.objectFit = 'contain';
      media.addEventListener('loadedmetadata', () => { if (ts) media.currentTime = ts; });
      media.addEventListener('timeupdate', () => { if (te && media.currentTime >= te && !media.paused) { media.pause(); media.currentTime = te; } });
      media.addEventListener('play', () => { if (media.currentTime < ts - 0.2 || (te && media.currentTime >= te - 0.05)) media.currentTime = ts; });
    } else {
      media = h('iframe', { class: 'vp-media', src: Core.embedSrc(el, { autoplay: true, sound: true }), allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin' });
    }
    const bg = h('div', { class: 'vp-bg' });
    const close = () => { try { media.pause && media.pause(); } catch (e) { /* noop */ } media.src = ''; bg.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    const full = h('button', { class: 'vp-btn', title: '모니터 전체 화면', onclick: () => (bg.requestFullscreen ? bg.requestFullscreen() : null) }, '⛶');
    const x = h('button', { class: 'vp-btn', title: '닫기 (Esc)', onclick: close }, '✕');
    const t = el.type === 'video' && (el.trimStart || el.trimEnd) ? ' · 구간 ' + Panels.fmtT(el.trimStart || 0) + ' ~ ' + (el.trimEnd ? Panels.fmtT(el.trimEnd) : '끝') : '';
    bg.append(h('div', { class: 'vp-top' }, h('span', null, '동영상 미리보기' + t), full, x), media);
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(bg);
  };

  // 새 슬라이드(검은 배경)를 만들고 전체 화면 동영상 넣기
  A.videoSlide = function () {
    pick('video/*', false, async (files) => {
      if (!files[0]) return;
      if (Editor.editing) Editor.commitEdit();
      Store.checkpoint();
      const d = Store.deck;
      const at = chainSafeIndex(d, Store.cur);
      const s = mkSlide({ bg: { type: 'color', color: '#000000' }, transition: { type: 'fade', duration: 600 } });
      d.slides.splice(at, 0, s);
      Store.cur = at;
      Store.sel = [];
      Store.emit({ structure: true });
      await A.insertFile(files[0], null, 0, { full: true, autoplay: true });
    });
  };
  const pickLocalProject = () => pick('.json,application/json', false, (f) => f[0] && IO.openProject(f[0]));
  // 파일 ▸ 열기: 로컬 서버가 켜져 있으면 decks 폴더 목록을 보여 준다
  // (브라우저 기본 파일 창은 시작 폴더를 지정할 수 없음) — 서버가 없으면 기본 파일 창
  A.pickProject = async function () {
    let list = null;
    if (/^https?:$/.test(location.protocol)) {
      try { const r = await fetch('/api/decks', { cache: 'no-store' }); if (r.ok) list = (await r.json()).files; } catch (e) { /* 서버 없음 */ }
    }
    if (!list) { pickLocalProject(); return; }
    const h = Panels.h;
    const groups = new Map();
    list.forEach((f) => {
      const i = f.path.lastIndexOf('/');
      const dir = i < 0 ? '' : f.path.slice(0, i);
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir).push(f);
    });
    const dirs = [...groups.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : b.localeCompare(a, 'ko')));
    const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
    let close;
    const open = async (f) => {
      try {
        const r = await fetch('/decks/' + f.path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        const name = f.path.slice(f.path.lastIndexOf('/') + 1);
        close();
        await IO.openProject(new File([await r.blob()], name, { type: 'application/json' }));
      } catch (e) { UI.toast('파일을 열 수 없습니다: ' + f.path, 'error'); }
    };
    const filter = h('input', { type: 'search', class: 'deck-open-filter', placeholder: '🔍 폴더·파일 이름으로 찾기' });
    const box = h('div', { class: 'deck-open-list' });
    const render = () => {
      const q = filter.value.trim().toLowerCase();
      box.innerHTML = '';
      let shown = 0;
      dirs.forEach((dir) => {
        const files = groups.get(dir).filter((f) => !q || f.path.toLowerCase().includes(q))
          .sort((a, b) => (/backup/i.test(a.path) - /backup/i.test(b.path)) || b.mtime - a.mtime);
        if (!files.length) return;
        shown += files.length;
        box.appendChild(h('div', { class: 'deck-open-dir' }, '📁 ' + (dir ? 'decks/' + dir : 'decks')));
        files.forEach((f) => box.appendChild(h('button', { class: 'deck-open-file', title: 'decks/' + f.path, onclick: () => open(f) },
          h('span', null, '📄 ' + f.path.slice(f.path.lastIndexOf('/') + 1)),
          h('small', null, fmtDate(f.mtime) + ' · ' + fmtSize(f.size)))));
      });
      if (!shown) box.appendChild(h('div', { class: 'deck-open-empty' }, q ? '찾는 파일이 없습니다' : 'decks 폴더에 덱 파일이 없습니다'));
    };
    filter.addEventListener('input', render);
    render();
    close = UI.modal('📂 열기 — decks 폴더', h('div', null, filter, box), [
      ['💻 다른 위치에서 찾기…', () => { pickLocalProject(); return true; }],
      ['취소', () => true],
    ], { wide: true });
  };
  A.pickBg = function (type) {
    pick(type === 'image' ? 'image/*' : 'video/*', false, async (f) => {
      if (!f[0]) return;
      const src = await Media.put(f[0]);
      Store.checkpoint();
      const bg = Store.slide().bg;
      bg.type = type; bg.src = src;
      Store.emit({ content: true });
    });
  };
  A.replaceMedia = function (el, type) {
    pick(type === 'image' ? 'image/*' : 'video/*,audio/*', false, async (f) => {
      if (!f[0]) return;
      const src = await Media.put(f[0]);
      Store.checkpoint();
      el.src = src;
      Store.emit({ content: true });
    });
  };

  function mediaSize(file, src) {
    return new Promise((res) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth || 800, h: img.naturalHeight || 600 });
        img.onerror = () => res({ w: 800, h: 600 });
        img.src = Media.resolve(src);
      } else if (file.type.startsWith('audio/')) res({ w: 640, h: 90, audio: true });
      else {
        const v = document.createElement('video');
        v.onloadedmetadata = () => res({ w: v.videoWidth || 1280, h: v.videoHeight || 720 });
        v.onerror = () => res({ w: 1280, h: 720 });
        v.preload = 'metadata';
        v.src = Media.resolve(src);
      }
    });
  }

  function fitBox(w, h, maxFrac) {
    const d = Store.deck;
    const mw = d.width * (maxFrac || 0.6), mh = d.height * (maxFrac || 0.6);
    const s = Math.min(1, mw / w, mh / h);
    return { w: Math.round(w * s), h: Math.round(h * s) };
  }

  A.insertFile = async function (file, pos, i, opts) {
    opts = opts || {};
    if (/\.json$/i.test(file.name)) { IO.openProject(file); return; }
    if (/\.(glb|gltf)$/i.test(file.name)) {
      if (/\.gltf$/i.test(file.name)) UI.toast('.gltf 가 별도 파일(.bin·텍스처)을 쓰면 보이지 않을 수 있습니다 — .glb 를 권장합니다', 'warn');
      A.insertModel(await Media.put(file), pos, file.name.replace(/\.[^.]+$/, ''));
      return;
    }
    const isImg = file.type.startsWith('image/'), isVid = file.type.startsWith('video/') || file.type.startsWith('audio/');
    if (!isImg && !isVid) { UI.toast('지원하지 않는 파일입니다: ' + file.name, 'error'); return; }
    if (file.size > 300 * 1024 * 1024) UI.toast('큰 파일입니다. 저장/내보내기에 시간이 걸릴 수 있습니다', 'warn');
    const src = await Media.put(file);
    const sz = await mediaSize(file, src);
    const b = sz.audio ? { w: sz.w, h: sz.h } : fitBox(sz.w, sz.h);
    const d = Store.deck;
    const off = (i || 0) * 30;
    const x = pos ? pos.x - b.w / 2 : (d.width - b.w) / 2 + off;
    const y = pos ? pos.y - b.h / 2 : (d.height - b.h) / 2 + off;
    const el = isImg
      ? mkEl('image', { src, x, y, w: b.w, h: b.h, alt: file.name.replace(/\.[^.]+$/, '') })
      : mkEl('video', { src, x, y, w: b.w, h: b.h, controls: true, fill: sz.audio ? 'transparent' : '#000' });
    el.x = Math.round(el.x); el.y = Math.round(el.y);
    if (isVid && !sz.audio && opts.full) {
      makeFull(el);
      if (opts.autoplay) el.autoplay = true;
    }
    A.addElement(el);
    if (isVid && !sz.audio && opts.full) UI.toast('⛶ 전체 화면 동영상을 넣었습니다 — 비율이 다르면 남는 부분은 검은색으로 채워집니다');
    else if (isVid && !sz.audio) UI.notify('🎬 동영상을 넣었습니다. 슬라이드 전체 화면으로 맞출까요? (비율 유지, 남는 부분은 검은색)', [['⛶ 전체 화면으로', () => A.fitFullScreen(Store.el(el.id))], ['그대로 두기', () => {}]]);
  };

  A.insertUrl = function (url, pos, opts) {
    opts = opts || {};
    const d = Store.deck;
    const p = Core.parseEmbed(url);
    let el;
    if (/\.(glb|gltf)(\?|$)/i.test(url)) { A.insertModel(url, pos); return; }
    if (p.kind !== 'url') {
      const b = fitBox(1280, 720, 0.7);
      el = mkEl('embed', { url, w: b.w, h: b.h });
    } else if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url)) {
      const b = fitBox(1200, 800);
      el = mkEl('image', { src: url, w: b.w, h: b.h });
    } else if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url)) {
      const b = fitBox(1280, 720, 0.7);
      el = mkEl('video', { src: url, w: b.w, h: b.h });
    } else {
      const b = fitBox(1280, 720, 0.7);
      el = mkEl('embed', { url, w: b.w, h: b.h });
    }
    el.x = Math.round(pos ? pos.x - el.w / 2 : (d.width - el.w) / 2);
    el.y = Math.round(pos ? pos.y - el.h / 2 : (d.height - el.h) / 2);
    if (opts.full && (el.type === 'video' || el.type === 'embed')) makeFull(el);
    A.addElement(el);
  };

  A.fitNatural = function (el) {
    const img = new Image();
    img.onload = () => {
      Store.checkpoint();
      const r = img.naturalHeight / img.naturalWidth;
      el.h = Math.round(el.w * r);
      Store.emit({ content: true });
    };
    img.src = Media.resolve(el.src);
  };

  /* ---------------- 요소 추가 ---------------- */
  function theme() { return deckTheme(Store.deck); }
  function k() { return Math.min(Store.deck.width, Store.deck.height) / 1080; }

  A.addElement = function (el) {
    if (Editor.editing) Editor.commitEdit();
    Store.checkpoint();
    Store.slide().elements.push(el);
    Store.sel = [el.id];
    Store.emit({ content: true });
    Panels.showTab(Panels.tab === 'anim' ? Panels.tab : 'props');
    return el;
  };

  A.addText = function () {
    const d = Store.deck, t = theme();
    const w = Math.round(d.width * 0.5), h = Math.round(120 * k());
    const el = A.addElement(mkEl('text', { x: Math.round((d.width - w) / 2), y: Math.round((d.height - h) / 2), w, h, fontSize: Math.round(48 * k()), color: t.title, fontFamily: t.fontBody, role: 'body', html: '텍스트를 입력하세요' }));
    setTimeout(() => Editor.startEdit(el.id, true), 30);
  };

  A.addShape = function (shape) {
    const d = Store.deck, t = theme();
    const s = Math.round(300 * k());
    const line = shape === 'line';
    A.addElement(mkEl('shape', { shape, x: Math.round((d.width - s) / 2), y: Math.round((d.height - (line ? 40 : s)) / 2), w: line ? s * 1.5 : s, h: line ? 40 : s, fill: t.accent, fontSize: Math.round(36 * k()), lineWidth: 6 }));
  };

  A.addEmbed = function () {
    const inp = Panels.h('input', { type: 'url', class: 'p-text', placeholder: 'https://www.youtube.com/watch?v=… 또는 https://vimeo.com/…' });
    let fullDef = false;
    try { fullDef = localStorage.getItem('hppt.embedFull') === '1'; } catch (e) { /* ignore */ }
    const full = Panels.h('input', { type: 'checkbox', checked: fullDef });
    const body = Panels.h('div', { class: 'form' }, Panels.h('label', null, '동영상/웹페이지 URL', inp),
      Panels.h('label', { class: 'p-check' }, full, '⛶ 전체 화면으로 넣기 (비율 유지, 남는 부분은 검은색)'),
      Panels.h('p', { class: 'p-hint' }, 'YouTube, Vimeo 주소나 .mp4 동영상 주소, 임베드 가능한 웹페이지 주소를 입력하세요.'));
    const go = () => {
      const u = inp.value.trim();
      if (!u) return false;
      try { localStorage.setItem('hppt.embedFull', full.checked ? '1' : '0'); } catch (e) { /* ignore */ }
      A.insertUrl(u, null, { full: full.checked });
      return true;
    };
    const close = UI.modal('웹 동영상 삽입', body, [['취소', () => true], ['삽입', go, 'primary']]);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && go()) close(); });
  };

  /* ---------- 3D 모델 (glTF · GLB) ---------- */
  const MODEL_SAMPLES = [
    ['🧑‍🚀 우주인', 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'],
    ['🤖 로봇 (움직임)', 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb'],
    ['🐎 말 (움직임)', 'https://modelviewer.dev/shared-assets/models/Horse.glb'],
    ['🦆 오리', 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb'],
    ['⛑ 헬멧', 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'],
    ['🏮 등불', 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb'],
  ];
  A.insertModel = function (src, pos, name) {
    const d = Store.deck, s = Math.round(Math.min(d.width, d.height) * 0.62);
    const el = mkEl('model', { src, w: s, h: s, alt: name || '3D 모델' });
    el.x = Math.round(pos ? pos.x - s / 2 : (d.width - s) / 2);
    el.y = Math.round(pos ? pos.y - s / 2 : (d.height - s) / 2);
    A.addElement(el);
    UI.toast('🧊 3D 모델을 넣었습니다 — 발표 중에는 마우스로 끌어 돌려 볼 수 있습니다');
  };
  // 새로 넣기, 또는 el 이 있으면 그 모델 바꾸기
  A.addModel = function (el) {
    let close;
    const use = (src, name) => {
      if (!src) return;
      if (el) {
        Store.checkpoint();
        el.src = src;
        delete el.poster;
        if (name) el.alt = name;
        Store.emit({});
      } else A.insertModel(src, null, name);
      if (close) close();
    };
    const fromFile = () => pick('.glb,.gltf,model/gltf-binary,model/gltf+json', false, async (files) => {
      const f = files[0];
      if (!f) return;
      if (/\.gltf$/i.test(f.name)) UI.toast('.gltf 가 별도 파일(.bin·텍스처)을 쓰면 보이지 않을 수 있습니다 — 한 파일로 된 .glb 를 권장합니다', 'warn');
      use(await Media.put(f), f.name.replace(/\.[^.]+$/, ''));
    });
    const inp = Panels.h('input', { type: 'url', class: 'p-text', placeholder: 'https://…/model.glb', value: el && !String(el.src || '').startsWith('idb:') ? el.src || '' : '' });
    const samples = Panels.h('div', { class: 'p-btns wrap' }, MODEL_SAMPLES.map(([label, url]) => Panels.h('button', { class: 'p-btn', onclick: () => use(url, label.replace(/^\S+\s/, '')) }, label)));
    const body = Panels.h('div', { class: 'form' },
      Panels.h('div', { class: 'p-btns wrap' }, Panels.h('button', { class: 'p-btn primary', onclick: fromFile }, '📁 내 컴퓨터에서 3D 파일 선택 (.glb · .gltf)')),
      Panels.h('label', null, '또는 3D 모델 주소 (URL)', inp),
      Panels.h('label', null, '예제 모델 (인터넷 연결 필요)'), samples,
      Panels.h('p', { class: 'p-hint' }, 'glTF/GLB 형식을 지원합니다. 다른 형식(OBJ·FBX·STL 등)은 Blender 같은 프로그램에서 .glb 로 내보내 사용하세요. 발표 중에는 모델을 마우스로 끌어 돌려 볼 수 있습니다.'));
    const go = () => { const u = inp.value.trim(); if (!u) return false; use(u, ''); return true; };
    close = UI.modal(el ? '3D 모델 바꾸기' : '3D 모델 삽입', body, [['취소', () => true], ['주소로 삽입', go, 'primary']]);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && go()) close(); });
  };
  // 3D 그리기 장치를 다시 만들었으면 편집 화면의 모델도 새로 그린다
  Core.hooks.onModelReset = function () { Editor.render(); };
  // 편집 화면에서 모델을 불러오면 그 모습을 썸네일용으로 저장
  Core.hooks.onModelPoster = function (id, url) {
    if (!url || url.length < 200) return;
    for (const s of Store.deck.slides) {
      const e = s.elements.find((x) => x.id === id);
      if (e) { if (e.poster !== url) { e.poster = url; Panels.invalidateThumbs(); Store.scheduleSave(); } return; }
    }
  };

  A.editEmbed = function (el) {
    const u = prompt('동영상 URL', el.url || '');
    if (u == null) return;
    Store.checkpoint();
    el.url = u.trim();
    Store.emit({ content: true });
  };

  A.addTable = function () {
    const d = Store.deck, t = theme();
    const w = Math.round(d.width * 0.6), h = Math.round(d.height * 0.4);
    A.addElement(mkEl('table', { x: Math.round((d.width - w) / 2), y: Math.round((d.height - h) / 2), w, h, headerColor: t.accent, fontSize: Math.round(28 * k()) }));
  };

  A.addChart = function (type) {
    const d = Store.deck, t = theme();
    const w = Math.round(d.width * 0.62), h = Math.round(d.height * 0.55);
    A.addElement(mkEl('chart', { role: 'chart', chartType: type || 'bar', x: Math.round((d.width - w) / 2), y: Math.round((d.height - h) / 2), w, h, fontSize: Math.round(26 * k()), color: t.text, colors: [t.accent, t.accent2, '#51cf66', '#fcc419', '#ff6b6b', '#845ef7'].join(',') }));
    setTimeout(() => { const el = Store.selected()[0]; if (el) Core.animateChart(document.querySelector(`#canvas .hp-el[data-id="${el.id}"]`), 0); }, 50);
  };

  A.addCode = function () {
    const d = Store.deck;
    const w = Math.round(d.width * 0.6), h = Math.round(d.height * 0.5);
    const el = A.addElement(mkEl('code', { x: Math.round((d.width - w) / 2), y: Math.round((d.height - h) / 2), w, h, fontSize: Math.round(30 * k()), title: 'app.js' }));
    setTimeout(() => Panels.focusCode(), 50);
    return el;
  };

  // 차트 데이터를 표(스프레드시트) 형태로 편집
  A.chartDataEditor = function (el) {
    const h = Panels.h;
    let rows = Core.csvRows(el.data);
    if (!rows.length) rows = [['항목', '계열1'], ['A', '10']];
    const width = Math.max(...rows.map((r) => r.length));
    rows = rows.map((r) => { const c = r.slice(); while (c.length < width) c.push(''); return c; });
    const grid = h('div', { class: 'grid-wrap' });
    const preview = h('div', { class: 'grid-preview' });
    const toCsv = () => rows.map((r) => r.map((c) => String(c).replace(/,/g, '')).join(',')).join('\n');
    const drawPreview = () => {
      const tmp = Object.assign({}, el, { data: toCsv() }); // 실제 크기로 그리고 미리보기 칸에 맞게 축소
      preview.innerHTML = Core.renderChart(tmp);
    };
    const draw = () => {
      grid.innerHTML = '';
      const t = h('table', { class: 'grid' });
      const head = h('tr', null, h('th', null, ''), ...rows[0].map((_, ci) => h('th', null,
        ci === 0 ? '항목' : `계열 ${ci}`,
        ci > 0 && rows[0].length > 2 ? h('button', { class: 'grid-x', title: '열 삭제', onclick: () => { rows.forEach((r) => r.splice(ci, 1)); draw(); } }, '✕') : null)));
      t.appendChild(head);
      rows.forEach((r, ri) => {
        const tr = h('tr', null, h('th', null, ri === 0 ? '이름' : String(ri), ri > 0 && rows.length > 2 ? h('button', { class: 'grid-x', title: '행 삭제', onclick: () => { rows.splice(ri, 1); draw(); } }, '✕') : null));
        r.forEach((c, ci) => {
          const inp = h('input', { value: c, class: ri === 0 ? 'head' : ci === 0 ? 'lab' : 'val', inputmode: ri > 0 && ci > 0 ? 'decimal' : null });
          inp.dataset.r = ri; inp.dataset.c = ci;
          inp.addEventListener('input', () => { rows[ri][ci] = inp.value; drawPreview(); });
          inp.addEventListener('keydown', (e) => {
            const go = (dr, dc) => { const n = grid.querySelector(`input[data-r="${ri + dr}"][data-c="${ci + dc}"]`); if (n) { e.preventDefault(); n.focus(); n.select(); } };
            if (e.key === 'Enter' || e.key === 'ArrowDown') go(1, 0);
            else if (e.key === 'ArrowUp') go(-1, 0);
            else if (e.key === 'Tab' && !e.shiftKey && ci === r.length - 1 && ri === rows.length - 1) { e.preventDefault(); rows.push(rows[0].map(() => '')); draw(); }
          });
          // 엑셀/스프레드시트에서 여러 칸 붙여넣기
          inp.addEventListener('paste', (e) => {
            const txt = e.clipboardData.getData('text/plain');
            if (!/[\t\n]/.test(txt)) return;
            e.preventDefault();
            txt.replace(/\r/g, '').split('\n').filter((l) => l.length).forEach((line, dr) => {
              line.split('\t').forEach((v, dc) => {
                const R = ri + dr, C = ci + dc;
                while (rows.length <= R) rows.push(rows[0].map(() => ''));
                while (rows[0].length <= C) rows.forEach((x, k2) => x.push(k2 === 0 ? `계열${x.length}` : ''));
                rows[R][C] = v.trim();
              });
            });
            draw();
          });
          tr.appendChild(h('td', null, inp));
        });
        t.appendChild(tr);
      });
      grid.appendChild(t);
      grid.appendChild(h('div', { class: 'p-btns wrap' },
        h('button', { class: 'p-btn', onclick: () => { rows.push(rows[0].map(() => '')); draw(); } }, '＋ 행 추가'),
        h('button', { class: 'p-btn', onclick: () => { rows.forEach((r, i) => r.push(i === 0 ? `계열${r.length}` : '')); draw(); } }, '＋ 계열(열) 추가'),
        h('button', { class: 'p-btn', title: '행과 열을 바꿉니다', onclick: () => { rows = rows[0].map((_, c) => rows.map((r) => r[c] || '')); draw(); } }, '⇄ 행/열 바꾸기')));
      drawPreview();
    };
    draw();
    const body = h('div', { class: 'grid-editor' }, h('div', null, grid, h('p', { class: 'p-hint' }, 'Enter/↓ 다음 칸 · 마지막 칸에서 Tab 은 행 추가 · 엑셀에서 여러 칸을 복사해 붙여넣을 수 있습니다.')), preview);
    UI.modal('차트 데이터 편집 — ' + (Core.CHART_TYPES[el.chartType] || '차트'), body, [['취소', () => true], ['적용', () => {
      Store.checkpoint();
      el.data = toCsv();
      Store.emit({ content: true });
      setTimeout(() => Core.animateChart(document.querySelector(`#canvas .hp-el[data-id="${el.id}"]`), 0, el.chartDur), 50);
      return true;
    }, 'primary']], { wide: true });
  };

  /* ---------------- 배경음악 ---------------- */
  const MUSIC_COLORS = ['#845ef7', '#4dabf7', '#51cf66', '#fcc419', '#ff8787', '#20c997', '#e599f7', '#ffa94d'];
  function ensureBgm() {
    const d = Store.deck;
    if (!d.bgm) d.bgm = { tracks: [], fadeIn: 1.5, fadeOut: 2, duck: true };
    if (!d.bgm.tracks) d.bgm.tracks = [];
    return d.bgm;
  }
  // 범위 문자열 "1-3,5" → 슬라이드 인덱스 배열
  function parseRange(str, n) {
    const out = new Set();
    String(str || '').split(',').forEach((p) => {
      const m = p.trim().match(/^(\d+)(?:\s*[-~]\s*(\d+))?$/);
      if (m) for (let i = +m[1]; i <= +(m[2] || m[1]); i++) if (i >= 1 && i <= n) out.add(i - 1);
    });
    return [...out];
  }

  // 프로젝트에 받아 둔 Pixabay 곡 (tools/collect-pixabay.mjs 가 만든 js/music-local.js)
  let pxLocal = typeof PIXABAY_LOCAL !== 'undefined' ? PIXABAY_LOCAL : {};
  async function refreshPxLocal() {
    if (!/^https?:$/.test(location.protocol)) return false;
    try {
      const t = await (await fetch('js/music-local.js?' + Date.now(), { cache: 'no-store' })).text();
      const m = t.match(/PIXABAY_LOCAL = (\{[\s\S]*\});/);
      if (m) { const n = JSON.parse(m[1]); const changed = Object.keys(n).length !== Object.keys(pxLocal).length; pxLocal = n; return changed; }
    } catch (e) { /* ignore */ }
    return false;
  }

  A.musicDialog = function () {
    const h = Panels.h;
    refreshPxLocal().then((changed) => { if (changed && document.querySelector('.music-dlg')) draw(); });
    const d = Store.deck;
    Store.checkpoint();
    const bgm = ensureBgm();
    const preview = new Audio();
    let previewId = null;
    let tagFilter = '전체';
    let libTab = 'builtin';
    const wrap = h('div', { class: 'music-dlg' });
    const stopPreview = () => { preview.pause(); previewId = null; };
    const playPreview = (id, src, vol) => {
      if (previewId === id) { stopPreview(); draw(); return; }
      preview.src = Media.resolve(src) || src;
      preview.volume = vol != null ? vol : 0.7;
      preview.currentTime = 0;
      preview.play().catch(() => UI.toast('미리듣기를 재생하지 못했습니다'));
      previewId = id;
      draw();
    };
    preview.onended = () => { previewId = null; draw(); };
    const commit = () => { Store.emit({ content: true }); };
    const addTrack = (t) => {
      const id = uid();
      const tr = { id, src: t.src, title: t.title, volume: t.volume != null ? t.volume : 0.6, color: MUSIC_COLORS[bgm.tracks.length % MUSIC_COLORS.length], lib: t.lib || null, box: t.box || null, license: t.license || (t.lib ? 'own' : ''), credit: t.credit || '', source: t.source || '' };
      bgm.tracks.push(tr);
      // 첫 곡이면 음악이 없는 모든 슬라이드에 자동 지정
      if (bgm.tracks.length === 1) d.slides.forEach((s) => { if (!s.music) s.music = id; });
      commit();
      draw();
      UI.toast('🎵 “' + tr.title + '” 추가' + (bgm.tracks.length === 1 ? ' — 모든 슬라이드에 지정했습니다' : ' — 아래에서 나올 슬라이드를 정하세요'));
    };
    const removeTrack = (tr) => {
      bgm.tracks = bgm.tracks.filter((x) => x !== tr);
      d.slides.forEach((s) => { if (s.music === tr.id) delete s.music; });
      if (previewId === tr.id) stopPreview();
      commit();
      draw();
    };

    function draw() {
      wrap.innerHTML = '';
      // 1) 사용할 음악
      const tracks = h('div', { class: 'music-tracks' });
      if (!bgm.tracks.length) tracks.appendChild(h('p', { class: 'p-hint' }, '아래 음악 라이브러리에서 곡을 추가하거나, 내 음악 파일을 올리세요.'));
      bgm.tracks.forEach((tr) => {
        const count = d.slides.filter((s) => s.music === tr.id).length;
        const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: tr.volume != null ? tr.volume : 0.6, title: '볼륨' });
        vol.oninput = () => { tr.volume = +vol.value; if (previewId === tr.id) preview.volume = tr.volume; };
        vol.onchange = commit;
        tracks.appendChild(h('div', { class: 'music-track' },
          h('i', { class: 'mt-color', style: 'background:' + tr.color }),
          h('button', { class: 'mt-play' + (previewId === tr.id ? ' on' : ''), title: '미리듣기', onclick: () => playPreview(tr.id, tr.src, tr.volume) }, previewId === tr.id ? '⏸' : '▶'),
          h('b', { class: 'mt-title' }, tr.title || '음악', tr.license && MUSIC_LICENSES[tr.license] && MUSIC_LICENSES[tr.license].needCredit ? h('span', { class: 'lic-badge need', title: tr.credit || '출처 문구를 보관함에서 적어 주세요' }, '출처 표기 필요') : null, tr.license === 'youtube' ? h('span', { class: 'lic-badge yt' }, '유튜브 전용') : null),
          h('span', { class: 'mt-count' }, count ? count + '장' : '지정 안 됨'),
          h('label', { class: 'mt-vol' }, '🔊', vol),
          h('button', { class: 'p-mini', title: '이 곡 빼기', onclick: () => removeTrack(tr) }, '✕')));
      });
      wrap.appendChild(h('div', { class: 'p-sec' }, h('div', { class: 'p-sec-title' }, '① 사용할 음악',
        h('button', { class: 'p-btn', onclick: () => App.importMusic((list) => { list.forEach((m) => addTrack({ src: m.src, title: m.title, box: m.id, license: m.license, credit: m.credit, source: m.source })); libTab = 'box'; draw(); }) }, '📥 음악 파일 가져오기')), tracks));
      // 출처 표기
      const needs = bgm.tracks.filter((t) => d.slides.some((s) => s.music === t.id) && (t.credit || (MUSIC_LICENSES[t.license] || {}).needCredit));
      if (needs.length) {
        const text = needs.map((t) => t.credit || ('♪ ' + t.title + (t.source ? ' — ' + t.source : ''))).join('\n');
        wrap.appendChild(h('div', { class: 'p-sec credit-box' }, h('div', { class: 'p-sec-title' }, '🎼 음악 출처 표기'),
          h('pre', { class: 'credit-text' }, text),
          h('div', { class: 'p-btns wrap' },
            h('button', { class: 'p-btn primary', onclick: () => A.addCreditSlide(needs) }, '＋ 마지막에 "음악 출처" 슬라이드 추가'),
            h('button', { class: 'p-btn', onclick: () => { navigator.clipboard.writeText(text).then(() => UI.toast('출처 문구를 복사했습니다 — 유튜브 설명란에 붙여넣으세요'), () => UI.toast('복사하지 못했습니다')); } }, '📋 유튜브 설명란용 복사')),
          h('p', { class: 'p-hint' }, 'CC BY 곡은 영상 설명란이나 마지막 화면에 출처를 꼭 적어야 합니다.')));
      }

      // 2) 슬라이드별 음악
      if (bgm.tracks.length) {
        const grid = h('div', { class: 'music-grid' });
        d.slides.forEach((s, i) => {
          const tr = bgm.tracks.find((t) => t.id === s.music);
          const sel = h('select', { onchange: (e) => { if (e.target.value) s.music = e.target.value; else delete s.music; commit(); draw(); } },
            [h('option', { value: '' }, '없음')].concat(bgm.tracks.map((t) => h('option', { value: t.id, selected: s.music === t.id }, t.title))));
          const title = (s.elements.find((e) => e.role === 'title' && e.html) || s.elements.find((e) => e.html) || {}).html || '';
          const tmp = document.createElement('div');
          tmp.innerHTML = title;
          grid.appendChild(h('div', { class: 'music-cell' + (tr ? ' has' : ''), style: tr ? '--mc:' + tr.color : '' },
            h('span', { class: 'mc-num' }, '#' + (i + 1)), h('span', { class: 'mc-title' }, tmp.textContent.trim().slice(0, 14) || '(빈 슬라이드)'), sel));
        });
        const trSel = h('select', { class: 'p-sel' }, [h('option', { value: '' }, '🔇 음악 없음')].concat(bgm.tracks.map((t) => h('option', { value: t.id }, '🎵 ' + t.title))));
        const rng = h('input', { class: 'p-text', value: '1-' + d.slides.length, placeholder: '예: 1-5, 8' });
        wrap.appendChild(h('div', { class: 'p-sec' }, h('div', { class: 'p-sec-title' }, '② 음악이 나올 슬라이드'),
          h('div', { class: 'music-bulk' }, trSel, h('span', null, '을(를)'), rng, h('span', null, '번 슬라이드에'),
            h('button', { class: 'p-btn primary', onclick: () => {
              const idx = parseRange(rng.value, d.slides.length);
              if (!idx.length) { UI.toast('슬라이드 번호를 확인하세요 (예: 1-5, 8)'); return; }
              idx.forEach((k) => { if (trSel.value) d.slides[k].music = trSel.value; else delete d.slides[k].music; });
              commit(); draw();
            } }, '적용')),
          h('div', { class: 'music-strip big' }, d.slides.map((s, i) => { const tr = bgm.tracks.find((t) => t.id === s.music); return h('i', { style: tr ? 'background:' + tr.color : '', title: '#' + (i + 1) + ' ' + (tr ? tr.title : '음악 없음') }); })),
          h('p', { class: 'p-hint' }, '같은 곡이 이어지는 슬라이드에서는 끊기지 않고 계속 재생되고, 곡이 바뀌는 곳에서는 자연스럽게 넘어가며(크로스페이드), "없음"인 슬라이드에서는 서서히 꺼집니다.'),
          grid));
      }

      // 3) 옵션
      const fi = h('input', { type: 'number', class: 'p-num', min: 0, max: 10, step: 0.5, value: bgm.fadeIn != null ? bgm.fadeIn : 1.5, onchange: (e) => { bgm.fadeIn = +e.target.value; commit(); } });
      const fo = h('input', { type: 'number', class: 'p-num', min: 0, max: 10, step: 0.5, value: bgm.fadeOut != null ? bgm.fadeOut : 2, onchange: (e) => { bgm.fadeOut = +e.target.value; commit(); } });
      const dk = h('input', { type: 'checkbox', checked: bgm.duck !== false, onchange: (e) => { bgm.duck = e.target.checked; commit(); } });
      wrap.appendChild(h('div', { class: 'p-sec' }, h('div', { class: 'p-sec-title' }, '③ 옵션'),
        h('div', { class: 'music-opts' }, h('label', null, '페이드 인 ', fi, ' 초'), h('label', null, '페이드 아웃 ', fo, ' 초'), h('label', { class: 'p-check' }, dk, '슬라이드 동영상 소리가 날 때 음악 줄이기')),
        h('p', { class: 'p-hint' }, '발표 중 M 키로 음악을 켜고 끌 수 있습니다. 🎬 동영상으로 만들기로 녹화하면 배경음악이 영상에 함께 들어갑니다.')));

      // 4) 라이브러리 (내장 곡 / 내 보관함 / 음악 받는 곳)
      const libTabs = h('div', { class: 'seg lib-tabs' }, [['builtin', '🎼 내장 곡 10'], ['pixabay', '⭐ Pixabay 추천 ' + PIXABAY_PICKS.length], ['box', '📥 내 보관함 ' + MusicBox.list().length], ['guide', '🌐 무료 음악 받는 곳']].map(([k, l]) => h('button', { class: libTab === k ? 'on' : '', onclick: () => { libTab = k; draw(); } }, l)));
      if (libTab === 'box') { wrap.appendChild(h('div', { class: 'p-sec' }, libTabs, drawBox())); return; }
      if (libTab === 'pixabay') { wrap.appendChild(h('div', { class: 'p-sec' }, libTabs, drawPixabay())); return; }
      if (libTab === 'guide') { wrap.appendChild(h('div', { class: 'p-sec' }, libTabs, drawGuide())); return; }
      const lib = h('div', { class: 'music-lib' });
      const tags = ['전체'].concat(MusicLib.tags);
      const seg = h('div', { class: 'seg' }, tags.map((t) => h('button', { class: tagFilter === t ? 'on' : '', onclick: () => { tagFilter = t; draw(); } }, t)));
      MusicLib.tracks.filter((t) => tagFilter === '전체' || t.tags.includes(tagFilter)).forEach((t) => {
        const added = bgm.tracks.some((x) => x.lib === t.id);
        const mm = Math.floor(t.duration / 60) + ':' + String(Math.round(t.duration % 60)).padStart(2, '0');
        lib.appendChild(h('div', { class: 'lib-item' },
          h('button', { class: 'mt-play' + (previewId === 'lib:' + t.id ? ' on' : ''), title: '미리듣기', onclick: () => playPreview('lib:' + t.id, t.file, 0.7) }, previewId === 'lib:' + t.id ? '⏸' : '▶'),
          h('div', { class: 'lib-info' },
            h('b', null, t.title), h('span', { class: 'lib-en' }, t.en),
            h('div', { class: 'lib-meta' }, h('span', { class: 'lib-mood' }, t.mood), ...t.tags.map((g) => h('span', { class: 'lib-tag' }, g)), h('span', { class: 'lib-dur' }, mm + ' · ' + t.bpm + ' BPM')),
            h('div', { class: 'lib-use' }, t.use)),
          h('button', { class: 'p-btn' + (added ? '' : ' primary'), disabled: added, onclick: () => addTrack({ src: t.file, title: t.title, lib: t.id, volume: 0.6 }) }, added ? '추가됨' : '＋ 추가')));
      });
      wrap.appendChild(h('div', { class: 'p-sec' }, libTabs, h('p', { class: 'p-hint' }, '직접 작곡·합성한 곡이라 저작권 걱정 없이 쓸 수 있습니다.'), seg, lib));
    }

    // Pixabay 추천: ⬇ 받기(페이지 열기) → Download → 받은 파일을 끌어다 놓기 → 자동 인식
    let pxCat = 'all';
    function drawPixabay() {
      const g = h('div', { class: 'music-lib' });
      const inBox = new Map(MusicBox.list().filter((m) => m.pixabayId).map((m) => [m.pixabayId, m]));
      let opened = {};
      try { opened = JSON.parse(localStorage.getItem('hppt.pxOpened') || '{}'); } catch (e) { /* ignore */ }
      const markOpened = (id) => { opened[id] = 1; try { localStorage.setItem('hppt.pxOpened', JSON.stringify(opened)); } catch (e) { /* ignore */ } };
      const drop = h('div', { class: 'box-drop px-drop' },
        h('div', { class: 'px-steps' },
          h('span', null, h('b', null, '①'), ' ⬇ 받기 → Pixabay 페이지가 열리면 ', h('b', null, 'Download'), ' 클릭'),
          h('span', null, h('b', null, '②'), ' 받은 파일(다운로드 폴더)을 ', h('b', null, '여기로 끌어다 놓기')),
          h('span', null, h('b', null, '③'), ' 제목·작곡가·라이선스 자동 입력 → ', h('b', null, '＋ 추가'))),
        h('button', { class: 'p-btn primary', onclick: () => App.importMusic(() => draw()) }, '📂 받은 파일 한꺼번에 넣기'));
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); App.importMusic(() => draw(), Array.from(e.dataTransfer.files || [])); });
      g.appendChild(drop);
      const list = PIXABAY_PICKS.filter((x) => pxCat === 'all' || x.cat === pxCat);
      g.appendChild(h('div', { class: 'px-cats' },
        h('div', { class: 'seg' }, [['all', '전체']].concat(Object.entries(PIXABAY_CATS)).map(([k2, l]) => h('button', { class: pxCat === k2 ? 'on' : '', onclick: () => { pxCat = k2; draw(); } }, l))),
        h('button', { class: 'p-btn', title: '이 분류의 곡 페이지를 한꺼번에 엽니다 (브라우저에서 팝업 허용 필요)', onclick: () => {
          const todo = list.filter((x) => !inBox.has(x.id));
          if (!todo.length) { UI.toast('이 분류의 곡은 모두 보관함에 있습니다'); return; }
          if (todo.length > 6 && !confirm(todo.length + '개의 Pixabay 페이지를 새 탭으로 엽니다. 계속할까요?\n(처음 한 번은 주소창에서 팝업을 허용해야 할 수 있습니다)')) return;
          let blocked = 0;
          todo.forEach((x) => { const w = window.open(x.url, '_blank', 'noopener'); if (w === null) blocked++; markOpened(x.id); });
          if (blocked) UI.toast('일부 창이 팝업 차단되었습니다 — 주소창 오른쪽에서 팝업을 허용한 뒤 다시 누르세요', 'warn');
          draw();
        } }, '⬇ 이 분류 모두 열기')));
      const nLocal = PIXABAY_PICKS.filter((x) => pxLocal[x.id]).length;
      if (nLocal) g.appendChild(h('p', { class: 'p-hint px-localinfo' }, '✓ 프로젝트에 받아 둔 곡 ' + nLocal + ' / ' + PIXABAY_PICKS.length + ' (music/pixabay 폴더) — 바로 ＋ 추가할 수 있습니다'));
      list.forEach((x) => {
        const have = inBox.get(x.id);
        const loc = pxLocal[x.id];
        const added = bgm.tracks.some((t) => t.lib === 'px' + x.id || (have && t.box === have.id));
        if (loc && !have) {
          g.appendChild(h('div', { class: 'lib-item px-item have' },
            h('span', { class: 'px-cat' }, PIXABAY_CATS[x.cat].split(' ')[0]),
            h('div', { class: 'lib-info' },
              h('b', null, x.ko || x.title), x.ko ? h('span', { class: 'lib-en' }, x.title) : null,
              h('div', { class: 'lib-meta' }, h('span', { class: 'lib-tag' }, x.artist), h('span', { class: 'lic-badge ok' }, 'Pixabay · 출처 표기 필요 없음'), h('span', { class: 'lib-dur' }, x.dur)),
              h('div', { class: 'lib-use' }, x.use)),
            h('div', { class: 'box-btns' },
              h('button', { class: 'mt-play' + (previewId === 'px:' + x.id ? ' on' : ''), title: '미리듣기', onclick: () => playPreview('px:' + x.id, loc.file, 0.7) }, previewId === 'px:' + x.id ? '⏸' : '▶'),
              h('span', { class: 'px-have' }, '✓ 받음'),
              h('button', { class: 'p-btn' + (added ? '' : ' primary'), disabled: added, onclick: () => addTrack({ src: loc.file, title: x.ko ? x.ko + ' (' + x.title + ')' : x.title, lib: 'px' + x.id, license: 'free', source: 'Pixabay — ' + x.artist }) }, added ? '추가됨' : '＋ 추가'))));
          return;
        }
        g.appendChild(h('div', { class: 'lib-item px-item' + (have ? ' have' : '') },
          h('span', { class: 'px-cat' }, PIXABAY_CATS[x.cat].split(' ')[0]),
          h('div', { class: 'lib-info' },
            h('b', null, x.ko || x.title), x.ko ? h('span', { class: 'lib-en' }, x.title) : null,
            h('div', { class: 'lib-meta' }, h('span', { class: 'lib-tag' }, x.artist), h('span', { class: 'lic-badge ok' }, 'Pixabay · 출처 표기 필요 없음'), h('span', { class: 'lib-dur' }, x.dur)),
            h('div', { class: 'lib-use' }, x.use)),
          have
            ? h('div', { class: 'box-btns' }, h('span', { class: 'px-have' }, '✓ 보관함에 있음'),
              h('button', { class: 'p-btn' + (added ? '' : ' primary'), disabled: added, onclick: () => addTrack({ src: have.src, title: have.title, box: have.id, license: have.license, credit: have.credit, source: have.source }) }, added ? '추가됨' : '＋ 추가'))
            : h('div', { class: 'box-btns' },
              h('a', { class: 'p-btn primary px-get', href: x.url, target: '_blank', rel: 'noopener', onclick: () => { markOpened(x.id); setTimeout(draw, 300); } }, '⬇ 받기'),
              opened[x.id] ? h('span', { class: 'px-opened' }, '페이지 열었음 · 받은 파일을 위로 끌어다 놓으세요') : null)));
      });
      g.appendChild(h('p', { class: 'p-hint' }, '목록은 2026년 10월 Pixabay 검색 결과에서 확인한 곡입니다. Pixabay 사정으로 곡이 내려가거나 조건이 바뀔 수 있으니 받을 때 페이지의 라이선스를 확인하세요. 유튜브에 올릴 영상이면 라이선스 화면을 캡처해 두면 좋습니다.'));
      return g;
    }

    // 내 보관함
    function drawBox() {
      const box = h('div', { class: 'music-lib' });
      const drop = h('div', { class: 'box-drop' }, '📥 여기로 음악 파일을 끌어다 놓거나 ', h('button', { class: 'p-btn primary', onclick: () => App.importMusic(() => draw()) }, '파일 선택'), h('span', { class: 'p-hint' }, ' — MP3, M4A, WAV, OGG · 여러 개 가능'));
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); App.importMusic(() => draw(), Array.from(e.dataTransfer.files || [])); });
      box.appendChild(drop);
      const list = MusicBox.list();
      if (!list.length) box.appendChild(h('p', { class: 'p-hint' }, '아직 보관한 음악이 없습니다. "🌐 무료 음악 받는 곳"에서 음악을 받은 뒤 여기에 넣으세요. 한 번 넣으면 모든 문서에서 다시 쓸 수 있습니다.'));
      list.forEach((m) => {
        const added = bgm.tracks.some((x) => x.box === m.id);
        const lic = MUSIC_LICENSES[m.license] || null;
        const mm = m.duration ? Math.floor(m.duration / 60) + ':' + String(Math.round(m.duration % 60)).padStart(2, '0') : '';
        const form = h('div', { class: 'box-form', hidden: !m._open });
        const fld = (label, el) => h('label', null, h('span', null, label), el);
        const title = h('input', { class: 'p-text', value: m.title || '' });
        const source = h('input', { class: 'p-text', value: m.source || '', placeholder: '예: Pixabay — 작곡가 이름', list: 'music-sources' });
        const url = h('input', { class: 'p-text', value: m.url || '', placeholder: '받은 곳 주소 (선택)' });
        const license = h('select', { class: 'p-sel' }, [h('option', { value: '' }, '— 라이선스 선택 —')].concat(Object.entries(MUSIC_LICENSES).map(([k, v]) => h('option', { value: k, selected: m.license === k }, v.label))));
        const credit = h('textarea', { class: 'p-area', rows: 2, placeholder: 'CC BY 곡이면 출처 문구 — 예: "Wholesome" Kevin MacLeod (incompetech.com), CC BY 4.0' });
        credit.value = m.credit || '';
        const tags = h('input', { class: 'p-text', value: (m.tags || []).join(', '), placeholder: '예: 교회, 묵상' });
        form.append(fld('제목', title), fld('출처', source), fld('라이선스', license), fld('출처 표기 문구', credit), fld('링크', url), fld('태그', tags),
          h('div', { class: 'p-btns wrap' }, h('button', { class: 'p-btn primary', onclick: () => {
            const patch = { title: title.value.trim() || m.title, source: source.value.trim(), url: url.value.trim(), license: license.value, credit: credit.value.trim(), tags: tags.value.split(',').map((x) => x.trim()).filter(Boolean), _open: false };
            if (patch.license === 'ccby' && !patch.credit) patch.credit = '"' + patch.title + '"' + (patch.source ? ' ' + patch.source : '') + ', CC BY 4.0';
            MusicBox.update(m.id, patch);
            bgm.tracks.forEach((t) => { if (t.box === m.id) Object.assign(t, { title: patch.title, license: patch.license, credit: patch.credit, source: patch.source }); });
            commit(); draw();
          } }, '저장'), h('button', { class: 'p-btn danger', onclick: () => { if (confirm('보관함에서 "' + m.title + '" 을(를) 뺄까요? (이미 쓴 문서에는 남아 있습니다)')) { MusicBox.remove(m.id); draw(); } } }, '보관함에서 빼기')));
        box.appendChild(h('div', { class: 'lib-item box-item' },
          h('button', { class: 'mt-play' + (previewId === 'box:' + m.id ? ' on' : ''), title: '미리듣기', onclick: () => playPreview('box:' + m.id, m.src, 0.7) }, previewId === 'box:' + m.id ? '⏸' : '▶'),
          h('div', { class: 'lib-info' },
            h('b', null, m.title), m.source ? h('span', { class: 'lib-en' }, m.source) : null,
            h('div', { class: 'lib-meta' },
              lic ? h('span', { class: 'lic-badge' + (lic.needCredit ? ' need' : lic.ytOnly ? ' yt' : ' ok') }, lic.label) : h('span', { class: 'lic-badge warn' }, '라이선스 미입력'),
              ...(m.tags || []).map((g) => h('span', { class: 'lib-tag' }, g)), mm ? h('span', { class: 'lib-dur' }, mm) : null),
            lic && lic.note ? h('div', { class: 'lib-use' }, lic.note) : null,
            form),
          h('div', { class: 'box-btns' },
            h('button', { class: 'p-btn' + (added ? '' : ' primary'), disabled: added, onclick: () => addTrack({ src: m.src, title: m.title, box: m.id, license: m.license, credit: m.credit, source: m.source }) }, added ? '추가됨' : '＋ 추가'),
            h('button', { class: 'p-mini', onclick: () => { MusicBox.update(m.id, { _open: !m._open }); draw(); } }, '✎ 정보'))));
      });
      box.appendChild(h('datalist', { id: 'music-sources' }, MUSIC_SOURCES.map((s2) => h('option', { value: s2.name }))));
      return box;
    }

    // 무료 음악 받는 곳
    function drawGuide() {
      const g = h('div', { class: 'music-guide' });
      MUSIC_SOURCES.forEach((s2) => {
        const lic = MUSIC_LICENSES[s2.license];
        g.appendChild(h('div', { class: 'guide-item' },
          h('div', { class: 'guide-head' }, h('b', null, s2.name), h('span', { class: 'lic-badge' + (lic.needCredit ? ' need' : lic.ytOnly ? ' yt' : s2.license === 'other' ? ' warn' : ' ok') }, lic.label),
            h('a', { class: 'p-btn', href: s2.url, target: '_blank', rel: 'noopener' }, '사이트 열기 ↗')),
          h('p', null, s2.summary)));
      });
      g.appendChild(h('div', { class: 'guide-item' }, h('div', { class: 'guide-head' }, h('b', null, '🔎 추천 검색어 (영어로 검색하면 결과가 많습니다)')),
        ...Object.entries(MUSIC_KEYWORDS).map(([k, words]) => h('div', { class: 'kw-row' }, h('span', { class: 'kw-k' }, k), ...words.map((w) => h('button', { class: 'chip', title: '복사', onclick: () => navigator.clipboard.writeText(w).then(() => UI.toast('“' + w + '” 복사')) }, w))))));
      g.appendChild(h('div', { class: 'guide-item tips' }, h('b', null, '💡 알아두기'),
        h('ul', null,
          h('li', null, '받은 곡은 "📥 내 보관함"에 넣고 ✎ 정보에서 출처·라이선스를 적어 두세요. 출처 표기가 필요한 곡을 쓰면 자동으로 알려 드립니다.'),
          h('li', null, '유튜브에 올릴 영상이면, 곡을 받을 때 라이선스 화면을 캡처해 두면 저작권 신고가 왔을 때 증거가 됩니다.'),
          h('li', null, '찬송가는 곡 자체가 공개 저작물이어도, 특정 연주·녹음에는 따로 권리가 있을 수 있습니다. 녹음의 사용 조건을 확인하세요.'),
          h('li', null, '교회·병원 등 공공장소에서 음악을 트는 것은 별도 공연 사용료 대상이 될 수 있습니다. 필요하면 해당 기관 규정을 확인하세요.'))));
      return g;
    }
    draw();
    const close = UI.modal('🎵 배경음악', wrap, [['닫기', () => { stopPreview(); Panels.renderProps(); return true; }, 'primary']], { wide: true });
    // 창을 닫는 다른 방법(✕, Esc)에도 미리듣기 정지
    const bgEl = document.querySelector('.modal-bg:last-of-type');
    if (bgEl) new MutationObserver((m, obs) => { if (!document.body.contains(bgEl)) { stopPreview(); obs.disconnect(); Panels.renderProps(); } }).observe(document.body, { childList: true });
    return close;
  };

  // 음악 파일 가져오기 → 내 보관함에 저장 (files 를 주면 바로 처리)
  A.importMusic = function (cb, files) {
    const run = async (list) => {
      const audio = list.filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(f.name));
      if (!audio.length) { UI.toast('음악 파일이 없습니다 (MP3, M4A, WAV, OGG)'); return; }
      const added = [];
      for (const f of audio) {
        const src = await Media.put(f);
        const duration = await new Promise((res) => { const a = new Audio(); a.preload = 'metadata'; a.onloadedmetadata = () => res(isFinite(a.duration) ? Math.round(a.duration * 10) / 10 : 0); a.onerror = () => res(0); a.src = Media.resolve(src); });
        const pid = pixabayIdFromName(f.name);
        const pk = pid ? PIXABAY_PICKS.find((x) => x.id === pid) : null;
        const guess = pk || /pixabay/i.test(f.name) ? 'Pixabay' : '';
        if (pk) {
          added.push(MusicBox.add({ id: uid(), src, title: pk.ko ? pk.ko + ' (' + pk.title + ')' : pk.title, source: 'Pixabay — ' + pk.artist, license: 'free', credit: '', url: pk.url, tags: [PIXABAY_CATS[pk.cat].replace(/^\S+\s/, '')], duration, addedAt: Date.now(), pixabayId: pid }));
        } else {
          added.push(MusicBox.add({ id: uid(), src, title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s\d{5,}$/, '').trim(), source: guess, license: guess ? 'free' : '', credit: '', url: '', tags: [], duration, addedAt: Date.now(), pixabayId: pid || 0, _open: !guess }));
        }
      }
      const known = added.filter((m) => m.pixabayId && PIXABAY_PICKS.some((x) => x.id === m.pixabayId)).length;
      UI.toast('📥 ' + added.length + '곡을 내 보관함에 넣었습니다' + (known ? ' — Pixabay 추천곡 ' + known + '개는 제목·출처·라이선스를 자동으로 채웠습니다' : ' — ✎ 정보에서 출처와 라이선스를 적어 두세요'));
      if (cb) cb(added);
    };
    if (files && files.length) { run(files); return; }
    pick('audio/*,.mp3,.m4a,.wav,.ogg', true, run);
  };

  // 마지막에 "음악 출처" 슬라이드 추가
  A.addCreditSlide = function (tracks) {
    const d = Store.deck;
    const lines = tracks.map((t) => t.credit || ('♪ ' + t.title + (t.source ? ' — ' + t.source : '')));
    Store.checkpoint();
    const s = buildLayout(d, 'bullets', { title: '음악 출처', bullets: lines }, { animate: false, transition: 'fade' });
    s.elements.forEach((e) => { if (e.role === 'body') e.fontSize = Math.max(22, Math.round(e.fontSize * 0.75)); });
    s.notes = '배경음악 출처 표기 (CC BY 등 라이선스 조건)';
    d.slides.push(s);
    Store.cur = d.slides.length - 1;
    Store.emit({ structure: true });
    UI.toast('마지막에 "음악 출처" 슬라이드를 추가했습니다');
  };

  A.pickMusicFile = function (cb) {
    pick('audio/*', false, async (files) => {
      const f = files[0];
      if (!f) return;
      if (f.size > 60 * 1024 * 1024) UI.toast('큰 파일입니다. 저장/내보내기에 시간이 걸릴 수 있습니다', 'warn');
      const src = await Media.put(f);
      cb({ src, title: f.name.replace(/\.[^.]+$/, '') });
    });
  };

  A.addButton = function () {
    const d = Store.deck, t = theme();
    const w = Math.round(380 * k()), h = Math.round(110 * k());
    A.addElement(mkEl('shape', { role: 'button', shape: 'pill', html: '다음으로 ▶', x: Math.round((d.width - w) / 2), y: Math.round(d.height * 0.78), w, h, fill: t.accent, color: readable(t.accent), bold: true, fontSize: Math.round(38 * k()), fontFamily: t.fontBody, hover: 'grow', action: { type: 'next' }, shadow: 8 }));
    UI.toast('버튼을 추가했습니다 — [속성] 탭 → 상호작용에서 동작을 바꿀 수 있습니다');
  };

  // 현재 슬라이드를 복제하고 모핑 전환을 설정 (요소 키 유지)
  A.morphSlide = function (opts) {
    opts = opts || {};
    if (Editor.editing) Editor.commitEdit();
    Store.checkpoint();
    const i = Store.cur;
    const src = Store.deck.slides[i];
    const s = JSON.parse(JSON.stringify(src));
    s.id = uid();
    const map = {};
    s.elements.forEach((e) => { const n = uid(); map[e.id] = n; e.mkey = e.mkey || e.id; e.id = n; });
    s.elements.forEach((e) => { if (e.action && e.action.target && map[e.action.target]) e.action.target = map[e.action.target]; });
    s.anims = [];
    s.transition = { type: 'morph', duration: opts.duration || 1000 };
    Store.deck.slides.splice(i + 1, 0, s);
    Store.cur = i + 1;
    Store.sel = [];
    Store.emit({ structure: true });
    if (!opts.silent) UI.toast('모핑 슬라이드를 만들었습니다. 요소를 옮기거나 크기·색·글자를 바꾸면 발표 때 부드럽게 변형됩니다', 'ok');
    return s;
  };

  // 선택한 텍스트(또는 코드)로 Magic Move 다음 단계 만들기:
  // 슬라이드를 복제해 모핑을 걸고, 새 슬라이드의 같은 요소를 선택해 바로 편집 상태로 만든다
  A.magicMoveFrom = function (elId) {
    if (Editor.editing) Editor.commitEdit();
    const el = Store.el(elId);
    if (!el) { UI.toast('먼저 텍스트를 선택하세요'); return; }
    const key = el.mkey || el.id;
    const s = A.morphSlide({ silent: true, duration: 1400 });
    const n = s.elements.find((e) => e.mkey === key);
    if (!n) return;
    Store.select([n.id]);
    Panels.showTab('props');
    if (n.type === 'code') {
      setTimeout(() => Panels.focusCode(), 60);
      UI.toast(`🪄 다음 단계(#${Store.cur + 1})를 만들었습니다. 코드를 고치면 그대로 둔 단어는 새 자리로 이어서 움직입니다`);
    } else if (Editor.isTextual(n)) {
      setTimeout(() => Editor.startEdit(n.id, false), 80);
      UI.toast(`🪄 다음 단계(#${Store.cur + 1})를 만들었습니다. 바로 내용을 고치세요 — 그대로 둔 단어는 새 자리로 이어서 움직입니다`);
    } else {
      UI.toast(`🔀 다음 단계(#${Store.cur + 1})를 만들었습니다. 위치·크기·색을 바꾸면 이어서 변형됩니다`);
    }
  };

  const ICONS ='😀😎🤩🥳🤔💡🔥⭐✨⚡🎯🚀📈📉📊💰💎🏆🥇🎉🎁❤️👍👏🙌💪🧠👀✅❌⚠️❓❗➡️⬅️⬆️⬇️🔄⏰📅📌📍🔍🔒🔑🛠️⚙️💻📱🖥️🌐☁️📦🧩🎨🎬🎵📷📚✏️📝📣💬🗨️🤝👥🏢🏠🌱🌍🌈☀️🌙❄️🍀🎈'.match(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})(️)?/gu);
  A.addIcon = function () {
    const grid = Panels.h('div', { class: 'icon-grid' });
    let close;
    ICONS.forEach((ic) => grid.appendChild(Panels.h('button', {
      onclick: () => {
        const d = Store.deck, s = Math.round(220 * k());
        A.addElement(mkEl('text', { html: ic, x: Math.round((d.width - s) / 2), y: Math.round((d.height - s) / 2), w: s, h: s, fontSize: Math.round(s * 0.7), align: 'center', valign: 'middle', padding: 0, lineHeight: 1 }));
        close();
      },
    }, ic)));
    close = UI.modal('아이콘 (이모지) 삽입', grid, [['닫기', () => true]]);
  };

  A.shapePicker = function (anchor) {
    document.querySelectorAll('.pop-menu').forEach((x) => x.remove());
    const m = Panels.h('div', { class: 'pop-menu ctx-menu shape-pop' });
    Object.entries(Core.SHAPES).forEach(([key, s]) => {
      const prev = Panels.h('i', { style: key === 'line' ? 'height:4px;margin-top:12px;border-radius:2px' : `${s.clip ? 'clip-path:' + s.clip + ';' : ''}${s.radius != null ? 'border-radius:' + (typeof s.radius === 'number' ? Math.min(8, s.radius) + 'px' : s.radius) : ''}` });
      m.appendChild(Panels.h('button', { title: s.label, onclick: () => { m.remove(); A.addShape(key); } }, prev, Panels.h('span', null, s.label)));
    });
    document.body.appendChild(m);
    const r = UI.rectOf(anchor);
    m.style.left = Math.min(r.left, innerWidth - 330) + 'px';
    m.style.top = r.bottom + 4 + 'px';
    setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off); } }), 0);
  };

  /* ---------------- 슬라이드 ---------------- */
  A.layoutPicker = function (anchor) {
    const deck = Store.deck;
    const grid = Panels.h('div', { class: 'layout-grid' });
    let close;
    const tw = 200, sc = tw / deck.width;
    Object.entries(LAYOUTS).forEach(([key, label]) => {
      const sl = key === 'blank' ? mkSlide({ bg: JSON.parse(JSON.stringify(theme().bg)) }) : buildLayout(deck, key, {}, { animate: false });
      const v = Panels.h('div', { class: 'layout-view', style: `width:${tw}px;height:${Math.round(deck.height * sc)}px` });
      const r = Core.renderSlide(deck, sl, { mode: 'thumb', resolve: Media.resolve });
      r.style.transform = `scale(${sc})`; r.style.transformOrigin = '0 0';
      v.appendChild(r);
      grid.appendChild(Panels.h('button', { class: 'layout-btn', onclick: () => { close(); A.addSlide(key); } }, v, Panels.h('span', null, label)));
    });
    close = UI.modal('새 슬라이드 — 레이아웃 선택', grid, [['취소', () => true]], { wide: true });
  };

  A.addSlide = function (layout) {
    if (Editor.editing) Editor.commitEdit();
    Store.checkpoint();
    const deck = Store.deck;
    const s = layout === 'blank' || !layout ? mkSlide({ bg: JSON.parse(JSON.stringify(theme().bg)) }) : buildLayout(deck, layout, {}, { animate: true });
    // 모핑 체인 한가운데에 끼워 넣으면 체인이 끊기므로 체인이 끝난 뒤에 추가
    const wanted = Store.cur + 1;
    const at = chainSafeIndex(deck, Store.cur);
    deck.slides.splice(at, 0, s);
    Store.cur = at;
    Store.sel = [];
    Store.emit({ structure: true });
    if (at !== wanted) UI.toast(`🔀 모핑 체인이 끊기지 않도록 체인이 끝난 뒤(#${at + 1})에 추가했습니다`);
  };

  A.duplicateSlide = function (i) {
    Store.checkpoint();
    const s = JSON.parse(JSON.stringify(Store.deck.slides[i]));
    s.id = uid();
    const map = {};
    s.elements.forEach((e) => { const n = uid(); map[e.id] = n; e.mkey = e.mkey || e.id; e.id = n; });
    s.elements.forEach((e) => { if (e.action && e.action.target && map[e.action.target]) e.action.target = map[e.action.target]; });
    s.anims.forEach((a) => { a.id = uid(); a.elId = map[a.elId] || a.elId; });
    Store.deck.slides.splice(i + 1, 0, s);
    Store.cur = i + 1;
    Store.sel = [];
    Store.emit({ structure: true });
  };

  A.deleteSlide = function (i) {
    const d = Store.deck;
    if (d.slides.length <= 1) { UI.toast('마지막 슬라이드는 삭제할 수 없습니다'); return; }
    const before = new Set(brokenMorphs(d));
    Store.checkpoint();
    d.slides.splice(i, 1);
    Store.cur = Math.min(Store.cur >= i ? Math.max(0, Store.cur - 1) : Store.cur, d.slides.length - 1);
    Store.sel = [];
    Store.emit({ structure: true });
    warnBrokenMorphs(before, '슬라이드를 삭제해서');
  };

  // 순서 변경/삭제로 새로 끊긴 모핑이 있으면 알리고 해결 방법을 제시
  function warnBrokenMorphs(before, why, extra) {
    const d = Store.deck;
    const now = brokenMorphs(d).filter((id) => !before.has(id));
    if (!now.length) return false;
    const nums = now.map((id) => '#' + (d.slides.findIndex((s) => s.id === id) + 1)).join(', ');
    UI.notify(`⚠ ${why} ${nums} 슬라이드의 모핑 연결이 끊겼습니다. 이대로 발표하면 모핑 대신 페이드로 넘어갑니다.`, [
      ...(extra || []),
      ['되돌리기', () => Store.undo()],
      ['페이드로 바꾸기', () => { Store.checkpoint(); now.forEach((id) => { const s = d.slides.find((x) => x.id === id); if (s) s.transition = { type: 'fade', duration: 700 }; }); Store.emit({ structure: true }); }],
    ], 'warn');
    return true;
  }

  /* ---------- 상단 메뉴 크기 맞춤: 넘치면 덜 쓰는 버튼부터 "⋯ 더보기" 로 ---------- */
  const TB_HIDE_ORDER = ['btn-icon', 'btn-music', 'btn-button', 'btn-code', 'btn-model', 'btn-embed', 'btn-chart', 'btn-table', 'btn-video',
    'btn-overview', 'btn-zoom-out', 'btn-zoom-in', 'btn-pen', 'btn-image', 'btn-shape', 'btn-redo', 'btn-text', 'btn-new-slide', 'btn-undo'];
  const TB_LABELS = { 'btn-icon': '😀 아이콘', 'btn-music': '🎵 배경음악', 'btn-button': '🔘 버튼', 'btn-code': '&lt;/&gt; 코드', 'btn-model': '🧊 3D 모델', 'btn-embed': '▶ 웹 동영상',
    'btn-chart': '📊 차트', 'btn-table': '▦ 표', 'btn-video': '🎬 동영상', 'btn-overview': '⊞ 전체 보기', 'btn-zoom-out': '− 축소', 'btn-zoom-in': '＋ 확대', 'btn-pen': '✒ 펜',
    'btn-image': '🖼 이미지', 'btn-shape': '▭ 도형', 'btn-redo': '↷ 다시 실행', 'btn-text': 'T 텍스트', 'btn-new-slide': '＋ 새 슬라이드', 'btn-undo': '↶ 실행 취소' };
  const TB_KEYS = { 'btn-overview': 'G', 'btn-pen': 'P', 'btn-undo': 'Ctrl+Z', 'btn-redo': 'Ctrl+Y', 'btn-new-slide': 'Ctrl+M', 'btn-zoom-in': 'Ctrl +', 'btn-zoom-out': 'Ctrl -' };
  A.fitToolbar = function () {
    const tb = $('#topbar'), grp = $('#tb-more-group');
    if (!tb) return;
    const items = TB_HIDE_ORDER.map((id) => document.getElementById(id)).filter(Boolean);
    items.forEach((b) => b.classList.remove('tb-hidden'));
    tb.classList.remove('tb-compact', 'tb-tight');
    grp.hidden = true;
    const over = () => tb.scrollWidth > tb.clientWidth + 1;
    if (!over()) return;
    tb.classList.add('tb-compact');   // 제목 칸·화면 비율 칸을 좁게
    if (!over()) return;
    grp.hidden = false;
    for (const b of items) { if (!over()) break; b.classList.add('tb-hidden'); }
    if (over()) tb.classList.add('tb-tight'); // 그래도 넘치면 제목 칸을 더 줄임
  };
  A.initToolbarFit = function () {
    const tb = $('#topbar');
    let raf = 0;
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(A.fitToolbar); };
    new ResizeObserver(later).observe(tb);
    // 저장 상태 글자처럼 폭이 바뀌는 표시가 바뀌어도 다시 맞춤
    ['save-state', 'live-state'].forEach((id) => { const n = document.getElementById(id); if (n) new MutationObserver(later).observe(n, { childList: true, characterData: true, subtree: true, attributes: true }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
    $('#btn-more').addEventListener('click', (e) => {
      const hidden = TB_HIDE_ORDER.map((id) => document.getElementById(id)).filter((b) => b && b.classList.contains('tb-hidden'));
      // 메뉴는 화면 왼쪽부터 원래 순서대로
      hidden.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      UI.menu(e.currentTarget, hidden.map((b) => [TB_LABELS[b.id] || b.title, () => b.click(), TB_KEYS[b.id] || '']));
    });
    A.fitToolbar();
  };

  /* ---------- 전체 보기: 모든 슬라이드 격자 (클릭 이동 · 끌어서 순서 바꾸기) ---------- */
  A.overview = function () {
    if (document.querySelector('.ovw')) return;
    const h = Panels.h;
    if (Editor.editing) Editor.commitEdit();
    let sel = Store.cur, cols = 4, dragIdx = -1;
    const root = h('div', { class: 'ovw' });
    const grid = h('div', { class: 'ovw-grid' });
    const count = h('span', { class: 'ovw-count' });
    const close = () => { root.remove(); document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', draw); };
    const go = (i) => { close(); if (i !== Store.cur) Store.goto(i); };
    const plain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
    function draw() {
      const d = Store.deck, n = d.slides.length;
      cols = n <= 4 ? 2 : n <= 9 ? 3 : n <= 20 ? 4 : n <= 35 ? 5 : 6;
      const tw = Math.max(150, Math.min(340, Math.floor((window.innerWidth - 100 - (cols - 1) * 20) / cols)));
      const sc = tw / d.width, th = Math.round(d.height * sc);
      grid.style.gridTemplateColumns = `repeat(${cols}, ${tw}px)`;
      grid.innerHTML = '';
      d.slides.forEach((s, i) => {
        const view = h('div', { class: 'ovw-view', style: `width:${tw}px;height:${th}px` });
        const r = Core.renderSlide(d, s, { mode: 'thumb', resolve: Media.resolve });
        r.style.transform = `scale(${sc})`;
        r.style.transformOrigin = '0 0';
        view.appendChild(r);
        const t = s.elements.find((e) => e.role === 'title' && e.html) || s.elements.find((e) => e.html);
        const cell = h('div', { class: 'ovw-cell' + (i === Store.cur ? ' cur' : '') + (i === sel ? ' sel' : ''), draggable: 'true', 'data-i': i, title: '클릭: 이 슬라이드로 · 끌어서 순서 바꾸기' },
          view, h('div', { class: 'ovw-lab' }, h('b', null, String(i + 1)), h('span', null, t ? plain(t.html).slice(0, 40) : (s.layout || ''))));
        grid.appendChild(cell);
      });
      count.textContent = `${n}장`;
      const c = grid.querySelector('.ovw-cell.sel');
      if (c) c.scrollIntoView({ block: 'nearest' });
    }
    const mark = () => grid.querySelectorAll('.ovw-cell').forEach((c) => c.classList.toggle('sel', +c.dataset.i === sel));
    function onKey(e) {
      const k = e.key, n = Store.deck.slides.length;
      e.stopPropagation();
      if (k === 'Escape' || k === 'g' || k === 'G') { e.preventDefault(); close(); return; }
      if (k === 'Enter' || k === ' ') { e.preventDefault(); go(sel); return; }
      let s = sel;
      if (k === 'ArrowRight') s++;
      else if (k === 'ArrowLeft') s--;
      else if (k === 'ArrowDown') s += cols;
      else if (k === 'ArrowUp') s -= cols;
      else if (k === 'Home') s = 0;
      else if (k === 'End') s = n - 1;
      else return;
      e.preventDefault();
      sel = Math.max(0, Math.min(n - 1, s));
      mark();
      const c = grid.querySelector('.ovw-cell.sel');
      if (c) c.scrollIntoView({ block: 'nearest' });
    }
    root.append(
      h('div', { class: 'ovw-head' },
        h('b', null, '⊞ 전체 보기'), count,
        h('span', { class: 'ovw-hint' }, '클릭 또는 방향키+Enter: 이동 · 끌어서 놓기: 순서 바꾸기 · Esc/G: 닫기'),
        h('button', { class: 'ovw-x', title: '닫기 (Esc)', onclick: close }, '✕')),
      grid);
    grid.addEventListener('click', (e) => { const c = e.target.closest('.ovw-cell'); if (c) go(+c.dataset.i); });
    const clearMarks = () => grid.querySelectorAll('.ovw-cell').forEach((t) => t.classList.remove('drop-before', 'drop-after', 'dragging'));
    const side = (c, e) => { const r = c.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? 0 : 1; };
    grid.addEventListener('dragstart', (e) => {
      const c = e.target.closest('.ovw-cell');
      if (!c) return;
      dragIdx = +c.dataset.i;
      c.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/x-ovw', String(dragIdx));
    });
    grid.addEventListener('dragover', (e) => {
      if (dragIdx < 0) return;
      e.preventDefault();
      const c = e.target.closest('.ovw-cell');
      grid.querySelectorAll('.ovw-cell').forEach((t) => t.classList.remove('drop-before', 'drop-after'));
      if (c) c.classList.add(side(c, e) ? 'drop-after' : 'drop-before');
    });
    grid.addEventListener('drop', (e) => {
      if (dragIdx < 0) return;
      e.preventDefault();
      const c = e.target.closest('.ovw-cell');
      const from = dragIdx;
      dragIdx = -1;
      clearMarks();
      if (!c) return;
      let to = +c.dataset.i + side(c, e);
      if (to > from) to--;
      if (to === from) return;
      A.moveSlide(from, to);
      sel = Store.cur;
      draw();
    });
    grid.addEventListener('dragend', () => { dragIdx = -1; clearMarks(); });
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', draw);
    draw();
  };

  A.moveSlide = function (from, to) {
    const d = Store.deck;
    const before = new Set(brokenMorphs(d));
    const chain = morphChain(d, from);
    const moving = d.slides[from];
    Store.checkpoint();
    const [s] = d.slides.splice(from, 1);
    const anchor = d.slides[to] ? d.slides[to].id : null; // 옮긴 슬라이드 바로 뒤에 오게 된 슬라이드
    d.slides.splice(to, 0, s);
    Store.cur = to;
    Store.emit({ structure: true });
    const inChain = chain && chain.len > 1;
    // 체인 소속 슬라이드를 혼자 옮겼다면 "체인 통째로 옮기기"를 제안
    const chainMove = [`체인 ${inChain ? chain.len : 0}장 통째로 옮기기`, () => { Store.undo(); A.moveChain(moving.id, anchor); }];
    // 관계없는 슬라이드가 다른 체인 한가운데로 들어갔다면 "체인 뒤로 보내기"를 제안
    const pushAfter = ['체인 뒤로 보내기', () => {
      const k = d.slides.findIndex((x) => x.id === moving.id);
      const tgt = chainSafeIndex(d, k) - 1;
      Store.checkpoint();
      const [m] = d.slides.splice(k, 1);
      d.slides.splice(tgt, 0, m);
      Store.cur = tgt;
      Store.emit({ structure: true });
      UI.toast(`#${tgt + 1} 로 옮겨 모핑 체인을 다시 이었습니다`);
    }];
    if (warnBrokenMorphs(before, '순서를 바꿔서', [inChain ? chainMove : pushAfter])) return;
    if (inChain) UI.notify('🔀 모핑 체인의 한 장만 옮겼습니다. 체인 전체를 함께 옮길까요?', [chainMove, ['그대로 두기', () => {}]]);
  };

  // 모핑 체인 전체를 한 덩어리로 옮긴다 (anchorId 슬라이드 앞, 없으면 맨 끝)
  A.moveChain = function (slideId, anchorId) {
    const d = Store.deck;
    const i = d.slides.findIndex((s) => s.id === slideId);
    const ch = morphChain(d, i);
    if (!ch) return;
    const block = d.slides.slice(ch.start, ch.end + 1);
    if (anchorId && block.some((s) => s.id === anchorId)) { UI.toast('체인 안에서는 위치를 바꿀 수 없습니다'); return; }
    const before = new Set(brokenMorphs(d));
    Store.checkpoint();
    d.slides.splice(ch.start, block.length);
    let at = anchorId ? d.slides.findIndex((s) => s.id === anchorId) : d.slides.length;
    if (at < 0) at = d.slides.length;
    // 다른 체인 한가운데에 떨어지면 그 체인이 끝난 뒤로
    if (at > 0 && at < d.slides.length && d.slides[at].transition && d.slides[at].transition.type === 'morph') at = chainSafeIndex(d, at - 1);
    d.slides.splice(at, 0, ...block);
    Store.cur = at + (i - ch.start);
    Store.emit({ structure: true });
    if (!warnBrokenMorphs(before, '체인을 옮겨서')) UI.toast(`🔀 모핑 체인 ${block.length}장을 #${at + 1}–#${at + block.length} 위치로 옮겼습니다`);
  };

  A.slideMenu = function (e, i) {
    const fake = { getBoundingClientRect: () => ({ left: e.clientX, bottom: e.clientY }) };
    UI.menu(fake, [
      ['새 슬라이드', () => A.layoutPicker(), 'Ctrl+M'],
      ['복제', () => A.duplicateSlide(i), ''],
      ['🔀 모핑 슬라이드 만들기', () => A.morphSlide(), ''],
      ['삭제', () => A.deleteSlide(i), ''],
      '-',
      ['위로 이동', () => i > 0 && A.moveSlide(i, i - 1), ''],
      ['아래로 이동', () => i < Store.deck.slides.length - 1 && A.moveSlide(i, i + 1), ''],
      '-',
      ['여기서부터 발표', () => A.present(i), ''],
    ]);
  };

  /* ---------------- 편집 동작 ---------------- */
  A.deleteSel = function () {
    if (!Store.sel.length) return;
    Store.checkpoint();
    const s = Store.slide();
    const ids = new Set(Store.sel);
    s.elements = s.elements.filter((e) => !ids.has(e.id));
    s.anims = s.anims.filter((a) => !ids.has(a.elId));
    Store.sel = [];
    Store.emit({ content: true });
  };

  function cloneEls(els, offset) {
    const map = {};
    const out = els.map((e) => { const c = JSON.parse(JSON.stringify(e)); map[e.id] = c.id = uid(); c.x += offset; c.y += offset; return c; });
    return { out, map };
  }

  A.duplicate = function () {
    const els = Store.selected();
    if (!els.length) return;
    Store.checkpoint();
    const s = Store.slide();
    const { out, map } = cloneEls(els, 30);
    s.elements.push(...out);
    s.anims.filter((a) => map[a.elId]).forEach((a) => s.anims.push(Object.assign({}, a, { id: uid(), elId: map[a.elId] })));
    Store.sel = out.map((e) => e.id);
    Store.emit({ content: true });
  };

  A.copy = function () {
    const els = Store.selected();
    if (!els.length) return false;
    const s = Store.slide();
    const ids = new Set(els.map((e) => e.id));
    clip = { elements: JSON.parse(JSON.stringify(els)), anims: JSON.parse(JSON.stringify(s.anims.filter((a) => ids.has(a.elId)))), n: 0 };
    UI.toast(`${els.length}개 요소를 복사했습니다`);
    return true;
  };
  A.cut = function () { if (A.copy()) A.deleteSel(); };
  A.pasteInternal = function (data) {
    const c = data || clip;
    if (!c || !c.elements || !c.elements.length) { UI.toast('붙여넣을 내용이 없습니다'); return; }
    c.n = (c.n || 0) + 1;
    Store.checkpoint();
    const s = Store.slide();
    const { out, map } = cloneEls(c.elements, 30 * c.n);
    s.elements.push(...out);
    (c.anims || []).forEach((a) => { if (map[a.elId]) s.anims.push(Object.assign({}, a, { id: uid(), elId: map[a.elId] })); });
    Store.sel = out.map((e) => e.id);
    Store.emit({ content: true });
  };

  A.arrange = function (dir) {
    const s = Store.slide();
    const ids = new Set(Store.sel);
    if (!ids.size) return;
    Store.checkpoint();
    const sel = s.elements.filter((e) => ids.has(e.id));
    const rest = s.elements.filter((e) => !ids.has(e.id));
    if (dir === 'front') s.elements = rest.concat(sel);
    else if (dir === 'back') s.elements = sel.concat(rest);
    else {
      const arr = s.elements;
      if (dir === 'forward') for (let i = arr.length - 2; i >= 0; i--) { if (ids.has(arr[i].id) && !ids.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
      else for (let i = 1; i < arr.length; i++) { if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; }
    }
    Store.emit({ content: true });
  };

  A.alignSel = function (dir) {
    const els = Store.selected();
    if (!els.length) return;
    Store.checkpoint();
    const d = Store.deck;
    // 여러 개 선택 시에는 선택 영역 기준, 하나면 슬라이드 기준
    let box = { x: 0, y: 0, w: d.width, h: d.height };
    if (els.length > 1) {
      const x1 = Math.min(...els.map((e) => e.x)), y1 = Math.min(...els.map((e) => e.y));
      const x2 = Math.max(...els.map((e) => e.x + e.w)), y2 = Math.max(...els.map((e) => e.y + e.h));
      box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    els.forEach((e) => {
      if (dir === 'left') e.x = box.x;
      if (dir === 'center') e.x = Math.round(box.x + (box.w - e.w) / 2);
      if (dir === 'right') e.x = box.x + box.w - e.w;
      if (dir === 'top') e.y = box.y;
      if (dir === 'middle') e.y = Math.round(box.y + (box.h - e.h) / 2);
      if (dir === 'bottom') e.y = box.y + box.h - e.h;
    });
    Store.emit({ content: true });
  };

  A.distribute = function (axis) {
    const els = Store.selected();
    if (els.length < 3) { UI.toast('3개 이상 선택하세요'); return; }
    Store.checkpoint();
    const P = axis === 'h' ? 'x' : 'y', S = axis === 'h' ? 'w' : 'h';
    els.sort((a, b) => a[P] - b[P]);
    const start = els[0][P], end = els[els.length - 1][P] + els[els.length - 1][S];
    const total = els.reduce((s, e) => s + e[S], 0);
    const gap = (end - start - total) / (els.length - 1);
    let cur = start;
    els.forEach((e) => { e[P] = Math.round(cur); cur += e[S] + gap; });
    Store.emit({ content: true });
  };

  A.toggleLock = function () {
    const els = Store.selected();
    if (!els.length) return;
    Store.checkpoint();
    const v = !els[0].locked;
    els.forEach((e) => { e.locked = v; });
    Store.emit({ content: true });
  };

  A.nudge = function (dx, dy) {
    const els = Store.selected().filter((e) => !e.locked);
    if (!els.length) return;
    if (!A._nudging) { Store.checkpoint(); A._nudging = true; }
    clearTimeout(A._nudgeT);
    A._nudgeT = setTimeout(() => { A._nudging = false; }, 600);
    els.forEach((e) => { e.x += dx; e.y += dy; });
    Store.emit({ content: true });
  };

  /* ---------------- 애니메이션 ---------------- */
  A.addAnim = function (effect) {
    const els = Store.selected();
    if (!els.length) { UI.toast('먼저 캔버스에서 요소를 선택하세요'); return; }
    Store.checkpoint();
    const s = Store.slide();
    els.forEach((e, i) => s.anims.push(mkAnim(e.id, effect, i === 0 ? 'click' : 'with')));
    Store.emit({ content: true });
    // 추가 즉시 해당 효과 미리보기
    setTimeout(() => {
      const def = Core.ANIMS[effect];
      els.forEach((e) => {
        const n = document.querySelector(`#canvas .hp-el[data-id="${e.id}"] .hp-anim`);
        if (n) n.animate(def.kf(e, Store.deck), { duration: def.loop ? 2000 : 700, easing: def.easing || 'ease-out', iterations: def.loop ? 2 : 1 });
      });
    }, 30);
  };

  A.autoAnimate = function () {
    const s = Store.slide();
    if (!s.elements.length) return;
    Store.checkpoint();
    const sorted = s.elements.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    s.anims = [];
    sorted.forEach((e, i) => {
      let fx = 'rise';
      if (e.role === 'title') fx = 'fade-in';
      else if (e.role === 'accent' || e.type === 'shape') fx = e.w > e.h * 4 ? 'wipe-right' : 'zoom-in';
      else if (e.type === 'image' || e.type === 'video' || e.type === 'embed') fx = e.x < Store.deck.width / 3 ? 'fly-left' : 'zoom-down';
      else if (e.type === 'table') fx = 'wipe-down';
      else if (e.type === 'path') fx = 'draw-line';
      s.anims.push(mkAnim(e.id, fx, 'after', { delay: i ? 80 : 0, duration: 600 }));
    });
    Store.emit({ content: true });
    setTimeout(() => Editor.preview(), 50);
  };

  A.previewTransition = function () {
    const deck = Store.deck, s = Store.slide();
    const tr = s.transition || {};
    if (!tr.type || tr.type === 'none') { UI.toast('전환 효과가 없습니다'); return; }
    Editor.render();
    const canvas = $('#canvas');
    const prev = deck.slides[Store.cur - 1] || mkSlide({ bg: { type: 'color', color: '#000' } });
    const oldEl = Core.renderSlide(deck, prev, { mode: 'thumb', resolve: Media.resolve });
    const newEl = Editor.slideEl;
    canvas.insertBefore(oldEl, newEl);
    canvas.style.overflow = 'hidden';
    document.body.classList.add('previewing');
    Core.playTransition(oldEl, newEl, tr.type, 1, tr.duration).then(() => { oldEl.remove(); canvas.style.overflow = ''; document.body.classList.remove('previewing'); });
  };

  /* ---------------- 테마/비율 ---------------- */
  A.setTheme = function (id, opts) {
    opts = opts || {};
    Store.checkpoint();
    const r = applyTheme(Store.deck, id, null, opts.custom, { reset: !!opts.reset });
    Panels.invalidateThumbs();
    Store.emit({ structure: true });
    if (opts.reset) { UI.toast('테마 “' + THEMES[id].name + '” 를 모든 개체에 다시 적용했습니다 (배경 이미지·동영상은 유지)'); return; }
    const kept = [];
    if (r.keptBg) kept.push('배경 ' + r.keptBg + '장');
    if (r.keptEls) kept.push('직접 바꾼 색 ' + r.keptEls + '개');
    if (kept.length) UI.notify('🎨 테마 “' + THEMES[id].name + '” 적용 — ' + kept.join(', ') + '는 그대로 두었습니다 (배경 이미지·동영상·움직이는 배경 포함)', [['직접 바꾼 서식까지 모두 테마로', () => A.setTheme(id, { reset: true })], ['이대로 두기', () => {}]]);
    else UI.toast('테마 “' + THEMES[id].name + '” 적용');
  };

  A.setAspect = function (key) {
    let w, h;
    if (key === 'custom') {
      const v = prompt('슬라이드 크기 (너비x높이, px)', `${Store.deck.width}x${Store.deck.height}`);
      const m = v && v.match(/(\d+)\s*[x×*,]\s*(\d+)/);
      if (!m) { $('#aspect-sel').value = Store.deck.aspect; return; }
      w = Math.max(200, Math.min(8000, +m[1])); h = Math.max(200, Math.min(8000, +m[2]));
    } else ({ w, h } = ASPECTS[key]);
    Store.checkpoint();
    resizeDeck(Store.deck, w, h);
    Store.deck.aspect = key;
    Panels.invalidateThumbs();
    Editor.setZoom('fit');
    Store.emit({ structure: true });
    UI.toast(`화면 비율을 ${key === 'custom' ? w + '×' + h : ASPECTS[key].label} 로 변경했습니다`);
  };

  // 테마 한 장 미리보기 (실제 렌더러로 그림)
  function themePreview(themeId, aspect, layout, content, width) {
    const d = newDeck(aspect, themeId);
    if (aspect === 'custom') { d.width = Store.deck.width; d.height = Store.deck.height; }
    const s = buildLayout(d, layout, content || {}, { animate: false });
    const sc = width / d.width;
    const v = Panels.h('div', { class: 'tg-view', style: `width:${width}px;height:${Math.round(d.height * sc)}px` });
    const r = Core.renderSlide(d, s, { mode: 'thumb', resolve: Media.resolve });
    r.style.transform = `scale(${sc})`;
    r.style.transformOrigin = '0 0';
    v.appendChild(r);
    return v;
  }

  const SAMPLE = {
    title: (t) => ({ title: t.name, subtitle: '프레젠테이션 부제목' }),
    bullets: () => ({ title: '핵심 내용', bullets: ['첫 번째 요점', '두 번째 요점', '세 번째 요점'] }),
    stats: () => ({ title: '숫자로 보는 성과', bullets: ['98%: 만족도', '120만: 사용자', '35개: 국가'] }),
    chart: () => ({ title: '성장 추이', chartType: 'bar' }),
  };

  // 테마 갤러리: mode 'new' = 새 프레젠테이션, 'apply' = 현재 문서에 적용
  A.themeGallery = function (mode) {
    const h = Panels.h;
    const isNew = mode !== 'apply';
    let aspect = isNew ? (Store.deck.aspect in ASPECTS && Store.deck.aspect !== 'custom' ? Store.deck.aspect : '16:9') : Store.deck.aspect;
    let pick = Store.deck.theme && THEMES[Store.deck.theme.id] ? Store.deck.theme.id : 'classic';
    let close;
    const create = () => {
      if (isNew) {
        const d = newDeck(aspect, pick);
        if (sample.checked) {
          d.title = THEMES[pick].name + ' 프레젠테이션';
          d.slides.push(buildLayout(d, 'title', { title: '프레젠테이션 제목', subtitle: '부제목을 입력하세요' }, { animate: true }));
          d.slides.push(buildLayout(d, 'agenda', {}, { animate: true, transition: 'push-left' }));
          d.slides.push(buildLayout(d, 'bullets', {}, { animate: true, transition: 'push-left' }));
          d.slides.push(buildLayout(d, 'stats', {}, { animate: true, transition: 'push-left' }));
          d.slides.push(buildLayout(d, 'chart', {}, { animate: true, transition: 'fade' }));
          d.slides.push(buildLayout(d, 'closing', {}, { animate: true, transition: 'circle' }));
        } else d.slides.push(buildLayout(d, 'title', {}, { animate: true }));
        Panels.invalidateThumbs();
        Store.setDeck(d);
        $('#doc-title').value = d.title;
        Editor.setZoom('fit');
      } else A.setTheme(pick);
      return true;
    };

    const aspSel = h('select', { class: 'p-sel', disabled: !isNew }, Object.entries(ASPECTS).filter(([k2]) => k2 !== 'custom').map(([k2, a]) => h('option', { value: k2, selected: k2 === aspect }, a.label)));
    const sample = h('input', { type: 'checkbox', checked: true });
    const grid = h('div', { class: 'tg-grid' });
    const detail = h('div', { class: 'tg-detail' });
    const top = h('div', { class: 'tg-top' },
      h('label', null, '화면 비율 ', aspSel),
      isNew ? h('label', { class: 'p-check' }, sample, '샘플 슬라이드 6장 포함 (표지·목차·글머리·지표·차트·마무리)') : h('span', { class: 'p-hint' }, '선택한 테마의 색·글꼴·배경이 모든 슬라이드에 적용됩니다.'));

    const portrait = () => { const a = ASPECTS[aspect] || { w: Store.deck.width, h: Store.deck.height }; return a.h > a.w * 1.05; };

    function renderDetail() {
      const t = THEMES[pick];
      const w = portrait() ? 100 : 190;
      detail.innerHTML = '';
      detail.appendChild(h('div', { class: 'tg-detail-head' },
        h('b', null, t.name),
        h('span', { class: 'tg-dots' }, [t.title, t.text, t.accent, t.accent2].map((c) => h('i', { style: `background:${c}`, title: c }))),
        h('span', { class: 'tg-font' }, '제목 ' + t.fontTitle.split(',')[0].replace(/'/g, '') + ' · 본문 ' + t.fontBody.split(',')[0].replace(/'/g, ''))));
      detail.appendChild(h('div', { class: 'tg-strip' }, ['title', 'bullets', 'stats', 'chart'].map((l) => themePreview(pick, aspect, l, SAMPLE[l](t), w))));
    }

    function renderGrid() {
      const w = portrait() ? 84 : 150;
      grid.style.setProperty('--tg-w', w + 'px');
      grid.classList.toggle('narrow', portrait());
      grid.innerHTML = '';
      Object.entries(THEMES).forEach(([k2, t]) => {
        const card = h('button', { class: 'tg-card' + (k2 === pick ? ' on' : ''), title: t.name + ' — 더블클릭하면 바로 ' + (isNew ? '만들기' : '적용'),
          onclick: () => { pick = k2; grid.querySelectorAll('.tg-card').forEach((c) => c.classList.toggle('on', c.dataset.k === k2)); renderDetail(); },
          ondblclick: () => { pick = k2; if (create()) close(); } },
          themePreview(k2, aspect, 'title', SAMPLE.title(t), w),
          h('div', { class: 'tg-meta' },
            h('span', { class: 'tg-name' }, t.name),
            h('span', { class: 'tg-dots' }, [t.accent, t.accent2, t.title].map((c) => h('i', { style: `background:${c}` })))));
        card.dataset.k = k2;
        grid.appendChild(card);
      });
    }

    aspSel.addEventListener('change', () => { aspect = aspSel.value; renderGrid(); renderDetail(); });
    renderGrid();
    renderDetail();
    const body = h('div', { class: 'tg-wrap' }, top, grid, detail,
      isNew ? h('p', { class: 'p-hint' }, '현재 문서는 대체됩니다. 필요하면 먼저 파일로 저장하세요. (Ctrl+Z 로 되돌리기 가능)') : null);
    close = UI.modal(isNew ? '새 프레젠테이션 — 테마 선택' : '테마 한눈에 보기', body, [['취소', () => true], [isNew ? '만들기' : '이 테마 적용', create, 'primary']], { wide: true });
  };

  A.newDeck = function () { A.themeGallery('new'); };

  /* ---------------- 발표 ---------------- */
  A.present = function (start, opts) {
    opts = opts || {};
    if (Editor.editing) Editor.commitEdit();
    Store.saveNow();
    const snap = JSON.stringify({ deck: Store.deck, cur: Store.cur });
    let edited = false;
    const p = new Core.Presenter(document.body, Store.deck, {
      start: start || 0,
      resolve: Media.resolve,
      editable: true,
      autoplay: opts.autoplay,
      loop: opts.loop,
      onEdit: () => {
        if (!edited) { Store.pushSnapshot(snap); edited = true; }
        Panels.invalidateThumbs();
        Store.scheduleSave();
      },
      onExit: (idx) => {
        document.body.classList.remove('presenting');
        Store.cur = Math.max(0, Math.min(idx, Store.deck.slides.length - 1));
        Store.sel = [];
        Store.emit({ structure: true });
        Editor.setZoom('fit');
      },
    });
    document.body.classList.add('presenting');
    const multi = !!(window.screen.isExtended && window.getScreenDetails);
    if (opts.presenterView && !multi) { p.openPresenterView(); UI.toast('발표 창을 프로젝터 화면으로 옮긴 뒤 F 키로 전체화면을 켜세요'); }
    // 모니터가 여러 대면 발표는 서브 모니터 전체화면, 발표자 보기는 지금 모니터
    if (multi && !opts.loop && (opts.presenterView || !opts.noFullscreen)) p.enterFullscreen();
    else if (!opts.noFullscreen) p.enterFullscreen({ presenterView: false });   // 반복 재생은 발표자 보기 없이
    A.presenter = p;
    return p;
  };

  // 반복 재생: 범위와 장당 시간을 정해 끝없이 돌린다 (설정은 덱에 저장되어 내보낸 HTML 에서도 쓴다)
  A.loopDialog = function () {
    const d = Store.deck, n = d.slides.length;
    const lp = d.loop || {};
    const h = Panels.h;
    const range = h('input', { class: 'p-text', value: lp.range || `1-${n}`, placeholder: `예: 1-${n}` });
    const secs = h('input', { class: 'p-num', type: 'number', min: 2, max: 600, value: lp.seconds || d.autoDuration || 8 });
    const body = h('div', null,
      h('p', null, '예배 전 광고나 행사장 대기 화면처럼, 고른 슬라이드를 처음부터 끝까지 자동으로 넘기며 계속 반복합니다.'),
      h('label', { class: 'p-row' }, h('span', { class: 'p-lab', style: 'width:96px' }, '슬라이드 범위'), range),
      h('label', { class: 'p-row' }, h('span', { class: 'p-lab', style: 'width:96px' }, '장당 시간(초)'), secs),
      h('p', { class: 'p-hint' }, `모든 장에 이 시간이 적용됩니다(장 안의 애니메이션이 끝난 뒤부터 셉니다). 조작 막대와 마우스 포인터는 숨겨지고, Esc 로 끝냅니다. 서브 모니터가 있으면 서브 모니터에서 재생합니다. 이 설정은 저장되어 내보낸 HTML 의 '🔁 반복 재생' 버튼에도 쓰입니다.`));
    UI.modal('🔁 반복 재생', body, [['취소', () => true], ['반복 재생 시작', () => {
      const m = String(range.value).match(/(\d+)\s*(?:[-~]\s*(\d+))?/);
      if (!m) { UI.toast('범위를 1-5 처럼 적어 주세요', 'warn'); return false; }
      const a = Math.max(1, Math.min(n, +m[1])), b = Math.max(a, Math.min(n, m[2] ? +m[2] : n));
      Store.checkpoint();
      d.loop = { range: `${a}-${b}`, seconds: Math.max(2, +secs.value || 8) };
      Store.scheduleSave();
      A.present(a - 1, { loop: d.loop });
      return true;
    }, 'primary']]);
  };

  // 서브 모니터를 꽂거나 빼면 편집 화면에서도 바로 알려 준다 (발표 중이면 발표 화면이 알아서 옮겨 감)
  if (window.screen && window.screen.addEventListener) {
    let ext = !!window.screen.isExtended;
    window.screen.addEventListener('change', () => {
      const now = !!window.screen.isExtended;
      if (now === ext) return;
      ext = now;
      if (A.presenter && document.body.classList.contains('presenting')) return;
      UI.toast(now ? '🖥 서브 모니터가 연결되었습니다 — 발표를 시작하면 서브 모니터에서 진행하고, 발표자 보기는 이 화면에 나옵니다' : '서브 모니터 연결이 끊겼습니다 — 발표는 이 화면에서 진행합니다');
    });
  }

  A.previewWindow = function () {
    IO.inlineDeck(Store.deck).then((deck) => {
      const w = window.open('', '_blank');
      if (!w) { UI.toast('팝업이 차단되었습니다', 'error'); return; }
      w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${Core.esc(deck.title)} — 미리보기</title><link rel="stylesheet" href="${IO.FONT_LINK}"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}</style></head><body></body></html>`);
      w.document.close();
      const s = w.document.createElement('script');
      s.textContent = PlayerCore.toString() + `\nvar C=PlayerCore();C.injectCSS();new C.Presenter(document.body, ${JSON.stringify(deck).replace(/</g, '\\u003c')}, {standalone:true, start:${Store.cur}});`;
      w.document.body.appendChild(s);
    });
  };

  A.makeVideo = function () {
    const d = Store.deck;
    const total = d.slides.reduce((s, sl) => s + (sl.duration || d.autoDuration || 5), 0);
    const body = Panels.h('div', { class: 'form' },
      Panels.h('p', null, `슬라이드 ${d.slides.length}장을 자동 재생하면서 화면을 녹화해 동영상(WebM) 파일로 저장합니다. 예상 길이: 약 ${Math.round(total)}초 + 애니메이션 시간`),
      Panels.h('ol', { class: 'p-list' },
        Panels.h('li', null, '[녹화 시작]을 누르면 화면 공유 창이 나타납니다.'),
        Panels.h('li', null, '"이 탭" (현재 탭)을 선택하고 [공유]를 누르세요. 소리를 넣으려면 "탭 오디오 공유"를 켜세요.'),
        Panels.h('li', null, '자동 재생이 끝나면 녹화가 멈추고 파일이 다운로드됩니다. (중간에 R 키로 정지 가능)')),
      Panels.h('p', { class: 'p-hint' }, '슬라이드별 표시 시간은 [슬라이드] 탭 → 자동 재생에서 바꿀 수 있습니다. Chrome / Edge 권장.'));
    UI.modal('🎬 동영상으로 만들기', body, [['취소', () => true], ['녹화 시작', () => {
      const p = A.present(0, { noFullscreen: true });
      p.toggleRecord().then(() => {
        if (p.recorder) { setTimeout(() => { p.go(0, 0, true); p.toggleAuto(true); }, 600); }
      });
      return true;
    }, 'primary']]);
  };

  // 붙여넣은 글: "- 항목" / "1. 항목" 줄은 글머리 목록으로
  function textToHtml(t) {
    const lines = String(t || '').replace(/\r/g, '').split('\n');
    const BUL = /^\s*([-•*·]|\d+[.)])\s+/;
    const nonEmpty = lines.filter((l) => l.trim());
    if (nonEmpty.length && nonEmpty.every((l) => BUL.test(l))) return '<ul>' + nonEmpty.map((l) => '<li>' + Core.esc(l.replace(BUL, '')) + '</li>').join('') + '</ul>';
    let out = '', inList = false;
    lines.forEach((l) => {
      if (BUL.test(l)) { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + Core.esc(l.replace(BUL, '')) + '</li>'; }
      else { if (inList) { out += '</ul>'; inList = false; } else if (out) out += '<br>'; out += Core.esc(l); }
    });
    if (inList) out += '</ul>';
    return out;
  }

  A.help = function () {
    const rows = [
      ['F5 / Shift+F5', '처음부터 / 현재 슬라이드부터 발표'],
      ['Ctrl+Enter / Ctrl+Shift+Enter', '발표 (F5 대신 쓸 수 있는 키)'],
      ['Ctrl+R 또는 Ctrl+F5', '브라우저 새로고침 (F5 는 발표 전용)'],
      ['Ctrl+M', '새 슬라이드'],
      ['Ctrl+Z / Ctrl+Y', '실행 취소 / 다시 실행'],
      ['Ctrl+C / X / V', '복사 / 잘라내기 / 붙여넣기 (이미지 붙여넣기 지원)'],
      ['Ctrl+D', '복제'],
      ['Delete', '삭제'],
      ['방향키 (+Shift)', '1px (10px) 이동'],
      ['더블클릭 / 다시 클릭', '텍스트 편집 (클릭한 위치에 커서)'],
      ['선택 후 바로 입력', '텍스트를 새 내용으로 교체'],
      ['Enter / F2', '텍스트 편집 (전체 선택 / 끝에 커서)'],
      ['Ctrl+B / I / U', '굵게 / 기울임 / 밑줄'],
      ['Ctrl+] / Ctrl+[', '앞으로 / 뒤로 (Shift: 맨 앞/뒤)'],
      ['Ctrl+휠, Ctrl +/−/0', '확대 / 축소 / 화면 맞춤'],
      ['Alt + 드래그', '스냅 없이 이동 (3D 모델: 돌리기)'],
      ['Alt + 휠', '3D 모델 가깝게 / 멀게'],
      ['PageUp / PageDown', '이전 / 다음 슬라이드'],
      ['Ctrl+S / Ctrl+O', '파일로 저장 / 열기'],
      ['G', '전체 보기: 모든 슬라이드 격자 (클릭 이동 · 끌어서 순서 바꾸기)'],
      ['P', '펜: 클릭 = 모서리점, 끌기 = 곡선점, 첫 점 클릭 = 닫기, Enter/더블클릭 = 끝, Backspace = 마지막 점 지우기, Shift = 45°'],
      ['펜 선 더블클릭', '점 편집: 점·핸들 끌기, Alt+점 끌기 = 핸들 뽑기, Alt+핸들 = 한쪽만, 점 더블클릭 = 모서리↔곡선, 선 위 클릭 = 점 추가, Delete = 점 삭제'],
      ['— 발표 중 —', ''],
      ['→ Space / ←', '다음 / 이전'],
      ['숫자 + Enter', '해당 슬라이드로 이동'],
      ['G', '전체 보기: 모든 슬라이드를 격자로 보고 클릭/방향키+Enter 로 이동'],
      ['E', '화면에서 텍스트 바로 편집'],
      ['A / R', '자동 재생 / 녹화'],
      ['N / L', '발표자 노트 / 레이저 포인터'],
      ['Z', '돋보기: 클릭한 곳 확대 (휠: 배율, 다시 클릭/Esc: 원래대로)'],
      ['B / W', '검은 화면 / 흰 화면'],
      ['F / Esc', '전체화면 / 종료'],
    ];
    UI.modal('단축키', `<table class="help-table">${rows.map(([a, b]) => `<tr><td><kbd>${a}</kbd></td><td>${b}</td></tr>`).join('')}</table>`);
  };

  /* ---------------- 인라인 텍스트 도구막대 ---------------- */
  A.showTextBar = function (id) {
    const bar = $('#text-bar');
    bar.hidden = false;
    const d = document.querySelector(`#canvas .hp-el[data-id="${id}"]`);
    if (d) {
      const r = d.getBoundingClientRect();
      const ws = $('#stage-wrap').getBoundingClientRect();
      bar.style.left = Math.max(ws.left + 8, Math.min(r.left, ws.right - bar.offsetWidth - 8)) + 'px';
      bar.style.top = Math.max(ws.top + 6, r.top - bar.offsetHeight - 10) + 'px';
    }
  };
  A.hideTextBar = function () { $('#text-bar').hidden = true; };

  function bindTextBar() {
    const bar = $('#text-bar');
    bar.addEventListener('mousedown', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      const cmd = b.dataset.cmd, val = b.dataset.val;
      if (cmd === 'size') { fontSizeSel(+val); return; }
      if (cmd === 'magic') { const id = Editor.editing; A.magicMoveFrom(id); return; }
      if (cmd === 'foreColor' || cmd === 'hiliteColor') document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, val || null);
    });
    const sw = bar.querySelector('.tb-colors');
    ['#000000', '#ffffff', '#e03131', '#f08c00', '#ffd43b', '#2f9e44', '#1971c2', '#7048e8', '#e64980', '#868e96'].forEach((c) => {
      sw.appendChild(Panels.h('button', { 'data-cmd': 'foreColor', 'data-val': c, style: `background:${c}`, title: '글자 색 ' + c }));
    });
    const hl = bar.querySelector('.tb-hl');
    ['#fff3bf', '#d3f9d8', '#d0ebff', '#ffdeeb', 'transparent'].forEach((c) => {
      hl.appendChild(Panels.h('button', { 'data-cmd': 'hiliteColor', 'data-val': c, style: `background:${c === 'transparent' ? 'linear-gradient(135deg,#fff 45%,#e03131 50%,#fff 55%)' : c}`, title: '형광펜' }));
    });
  }

  function fontSizeSel(delta) {
    const el = Store.el(Editor.editing);
    if (!el) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) { UI.toast('크기를 바꿀 글자를 먼저 드래그해 선택하세요'); return; }
    let base = el.fontSize || 32;
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (node) base = parseFloat(getComputedStyle(node).fontSize) || base;
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    const tc = document.querySelector(`#canvas .hp-el[data-id="${el.id}"] .hp-tc`);
    tc.querySelectorAll('font[size="7"]').forEach((f) => {
      const sp = document.createElement('span');
      sp.style.fontSize = Math.max(6, Math.round(base + delta)) + 'px';
      sp.innerHTML = f.innerHTML;
      f.replaceWith(sp);
    });
  }

  /* ---------------- 키보드 ---------------- */
  function bindKeys() {
    bindTextBar();
    // 발표 단축키는 캡처 단계에서 가장 먼저 처리한다.
    // F5 / Shift+F5 는 어떤 상황(발표 중, 창이 열림, 입력 중)에서도 브라우저 새로고침으로 넘기지 않는다.
    // 진짜 새로고침은 Ctrl+R 또는 Ctrl+F5 (가로채지 않음).
    window.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const isF5 = e.key === 'F5' && !ctrl && !e.altKey;
      const isCtrlEnter = e.key === 'Enter' && ctrl && !e.altKey;
      if (!isF5 && !isCtrlEnter) return;
      e.preventDefault();
      if (document.body.classList.contains('presenting')) { if (isCtrlEnter) e.stopPropagation(); return; } // 발표 중: 새로고침 방지 (F5 는 플레이어가 안내 표시)
      if (document.querySelector('.modal-bg')) return;
      if (Editor.editing && isCtrlEnter) Editor.commitEdit();
      e.stopPropagation();
      A.present(e.shiftKey ? Store.cur : 0);
    }, true);

    // 발표 중 실수로 새로고침/창 닫기를 하면 한 번 확인
    window.addEventListener('beforeunload', (e) => {
      if (!document.body.classList.contains('presenting')) return;
      e.preventDefault();
      e.returnValue = '';
    });

    document.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('presenting')) return;
      if (document.querySelector('.modal-bg')) return;
      const t = e.target;
      const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key;
      if (key === 'F1') { e.preventDefault(); A.help(); return; }
      if (ctrl && key.toLowerCase() === 's') { e.preventDefault(); Store.saveNow(); IO.saveProject(); return; }
      if (ctrl && key.toLowerCase() === 'o') { e.preventDefault(); A.pickProject(); return; }
      if (ctrl && key.toLowerCase() === 'p') { e.preventDefault(); IO.printPDF(); return; }
      if (ctrl && key.toLowerCase() === 'm') { e.preventDefault(); A.addSlide('bullets'); return; }
      if (typing) {
        if (t.isContentEditable && ctrl && ['b', 'i', 'u'].includes(key.toLowerCase())) return; // 브라우저 기본 서식
        return;
      }
      if (ctrl && key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) Store.redo(); else Store.undo(); return; }
      if (ctrl && key.toLowerCase() === 'y') { e.preventDefault(); Store.redo(); return; }
      if (ctrl && key.toLowerCase() === 'd') { e.preventDefault(); A.duplicate(); return; }
      if (ctrl && key.toLowerCase() === 'a') { e.preventDefault(); Store.select(Store.slide().elements.map((x) => x.id)); return; }
      if (ctrl && (key === '=' || key === '+')) { e.preventDefault(); Editor.setZoom(Math.min(3, Editor.scale * 1.2)); return; }
      if (ctrl && key === '-') { e.preventDefault(); Editor.setZoom(Math.max(0.1, Editor.scale / 1.2)); return; }
      if (ctrl && key === '0') { e.preventDefault(); Editor.setZoom('fit'); return; }
      if (ctrl && (key === ']' || key === '}')) { e.preventDefault(); A.arrange(e.shiftKey ? 'front' : 'forward'); return; }
      if (ctrl && (key === '[' || key === '{')) { e.preventDefault(); A.arrange(e.shiftKey ? 'back' : 'backward'); return; }
      if (ctrl && ['b', 'i', 'u'].includes(key.toLowerCase()) && Store.sel.length) {
        e.preventDefault();
        Panels.toggle({ b: 'bold', i: 'italic', u: 'underline' }[key.toLowerCase()]);
        return;
      }
      // 텍스트 상자가 하나 선택된 상태에서 바로 타이핑 → 편집 시작 (입력한 글자로 내용 교체, 파워포인트와 동일)
      if (Store.sel.length === 1 && !ctrl && !e.altKey && (key.length === 1 || key === 'Process')) {
        const el = Store.selected()[0];
        if (Editor.isTextual(el) && !el.locked) { Editor.startEdit(el.id, true); return; }
        if (key === ' ' && el.type === 'video' && el.src) { e.preventDefault(); Editor.playInPlace(el); return; }
      }
      if ((key === 'g' || key === 'G') && !ctrl && !e.altKey) { e.preventDefault(); A.overview(); return; }
      if ((key === 'p' || key === 'P') && !ctrl && !e.altKey) { e.preventDefault(); Pen.startDraw(); return; }
      if (key === 'Delete' || key === 'Backspace') { if (Store.sel.length) { e.preventDefault(); A.deleteSel(); } return; }
      if (key === 'Escape') { Store.select([]); Editor.hideMenu(); return; }
      if ((key === 'Enter' || key === 'F2') && Store.sel.length === 1) {
        const el = Store.selected()[0];
        if (Editor.isTextual(el)) { e.preventDefault(); Editor.startEdit(el.id, key === 'Enter'); }
        return;
      }
      if (key.startsWith('Arrow') && Store.sel.length) {
        e.preventDefault();
        const st = e.shiftKey ? 10 : 1;
        A.nudge(key === 'ArrowLeft' ? -st : key === 'ArrowRight' ? st : 0, key === 'ArrowUp' ? -st : key === 'ArrowDown' ? st : 0);
        return;
      }
      if (key === 'PageDown' || (key === 'ArrowDown' && !Store.sel.length)) { e.preventDefault(); Store.goto(Store.cur + 1); return; }
      if (key === 'PageUp' || (key === 'ArrowUp' && !Store.sel.length)) { e.preventDefault(); Store.goto(Store.cur - 1); }
    });
  }

  /* ---------------- 클립보드 ---------------- */
  function bindClipboard() {
    const isTyping = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    document.addEventListener('copy', (e) => {
      if (isTyping(e.target) || !Store.sel.length || document.body.classList.contains('presenting')) return;
      e.preventDefault();
      A.copy();
      e.clipboardData.setData('text/plain', 'HPPT:' + JSON.stringify(clip));
    });
    document.addEventListener('cut', (e) => {
      if (isTyping(e.target) || !Store.sel.length || document.body.classList.contains('presenting')) return;
      e.preventDefault();
      A.copy();
      e.clipboardData.setData('text/plain', 'HPPT:' + JSON.stringify(clip));
      A.deleteSel();
    });
    document.addEventListener('paste', (e) => {
      if (isTyping(e.target) || document.body.classList.contains('presenting') || document.querySelector('.modal-bg')) {
        // 인라인 편집 중에는 서식 없는 텍스트로 붙여넣기
        if (e.target && e.target.isContentEditable && e.target.closest('#canvas')) {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }
        return;
      }
      const files = Array.from(e.clipboardData.files || []);
      if (files.length) { e.preventDefault(); files.forEach((f, i) => A.insertFile(f, null, i)); return; }
      const txt = e.clipboardData.getData('text/plain') || '';
      e.preventDefault();
      if (txt.startsWith('HPPT:')) {
        try { const data = JSON.parse(txt.slice(5)); if (clip && JSON.stringify(clip.elements) === JSON.stringify(data.elements)) A.pasteInternal(); else A.pasteInternal(data); } catch (err) { A.pasteInternal(); }
        return;
      }
      if (/^https?:\/\/\S+$/.test(txt.trim())) { A.insertUrl(txt.trim()); return; }
      if (txt.trim()) {
        const d = Store.deck, t = theme();
        const w = Math.round(d.width * 0.6), h = Math.round(d.height * 0.3);
        A.addElement(mkEl('text', { html: textToHtml(txt.trim()), x: Math.round((d.width - w) / 2), y: Math.round((d.height - h) / 2), w, h, fontSize: Math.round(36 * k()), color: t.text, fontFamily: t.fontBody, role: 'body' }));
        return;
      }
      if (clip) A.pasteInternal();
    });
  }

  return A;
})();

window.addEventListener('DOMContentLoaded', () => App.init());
