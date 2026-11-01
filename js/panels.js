/* 슬라이드 목록 + 오른쪽 패널 (속성 / 애니메이션 / 슬라이드) */
const Panels = (() => {
  const P = { tab: 'props', suppress: false };
  const thumbCache = new Map(); // slideId -> json
  let listEl, propsEl;

  /* ---------- DOM 헬퍼 ---------- */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((k) => { if (k != null && k !== false) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return e;
  }
  P.h = h;

  // 선택된 요소들에 값 적용
  let pending = false;
  function setEls(key, val, opts) {
    if (!pending) { Store.checkpoint(); pending = true; }
    Store.selected().forEach((el) => { el[key] = val; });
    P.suppress = true;
    Store.emit({ content: true });
    P.suppress = false;
    if (opts && opts.rebuild) P.renderProps();
  }
  function done() { pending = false; }

  function section(title, ...kids) {
    return h('div', { class: 'p-sec' }, h('div', { class: 'p-sec-title' }, title), ...kids);
  }
  function row(label, ...ctrls) { return h('label', { class: 'p-row' }, h('span', { class: 'p-lab' }, label), h('div', { class: 'p-ctrl' }, ...ctrls)); }

  function num(el, key, o) {
    o = o || {};
    const v = el[key] == null ? (o.def != null ? o.def : '') : el[key];
    return h('input', {
      type: 'number', value: o.mul ? Math.round(v * o.mul) : (typeof v === 'number' ? Math.round(v * 100) / 100 : v), step: o.step || 1, min: o.min, max: o.max, class: 'p-num',
      oninput: (e) => { if (e.target.value === '') return; let n = +e.target.value; if (o.mul) n /= o.mul; setEls(key, n); },
      onchange: done,
    });
  }
  function range(el, key, min, max, step, def) {
    const v = el[key] == null ? def : el[key];
    const out = h('span', { class: 'p-rv' }, String(v));
    return h('div', { class: 'p-range' },
      h('input', { type: 'range', min, max, step, value: v, oninput: (e) => { out.textContent = e.target.value; setEls(key, +e.target.value); }, onchange: done }), out);
  }
  function color(el, key, def) {
    const v = el[key] && el[key] !== 'transparent' ? toHex(el[key]) : (def || '#000000');
    return h('input', { type: 'color', value: v, class: 'p-color', oninput: (e) => setEls(key, e.target.value), onchange: done });
  }
  // 색 선택 옆 '투명' 버튼 (투명 상태면 눌린 모양)
  function clearBtn(el, key) {
    const on = el[key] === 'transparent';
    return h('button', { class: 'p-btn' + (on ? ' on' : ''), title: on ? '지금 투명입니다 — 왼쪽 색을 고르면 다시 색이 생깁니다' : '투명하게', onclick: () => { setEls(key, 'transparent'); done(); P.renderProps(); } }, '투명');
  }
  function check(el, key, label, opts) {
    return h('label', { class: 'p-check' }, h('input', { type: 'checkbox', checked: !!el[key], onchange: (e) => { setEls(key, e.target.checked, opts); done(); } }), label);
  }
  function select(el, key, options, opts) {
    const s = h('select', { class: 'p-sel', onchange: (e) => { setEls(key, e.target.value, opts); done(); } },
      options.map(([v, l]) => h('option', { value: v, selected: String(el[key] == null ? (opts && opts.def) : el[key]) === String(v) }, l)));
    return s;
  }
  function text(el, key, ph) {
    return h('input', { type: 'text', class: 'p-text', value: el[key] || '', placeholder: ph || '', oninput: (e) => setEls(key, e.target.value), onchange: done });
  }
  function btns(list) {
    return h('div', { class: 'p-btns' }, list.map(([label, fn, active, title]) => h('button', { class: 'p-btn' + (active ? ' on' : ''), title: title || '', onclick: fn, html: label })));
  }

  // 3D 시점(camera-orbit "θdeg φdeg r") 의 각도 한 부분 읽기/바꾸기
  function orbitPart(orbit, k) {
    const m = String(orbit || '').match(/(-?[\d.]+)deg\s+(-?[\d.]+)deg/);
    return m ? +(k === 'theta' ? m[1] : m[2]) : (k === 'theta' ? 0 : 75);
  }
  function orbitSet(orbit, k, v) {
    const th = k === 'theta' ? v : orbitPart(orbit, 'theta'), ph = k === 'phi' ? v : orbitPart(orbit, 'phi');
    const r = (String(orbit || '').match(/deg\s+-?[\d.]+deg\s+(\S+)/) || [])[1] || 'auto';
    return `${th}deg ${ph}deg ${r}`;
  }

  // 시간 표시: 83.4 → "1:23.4"
  function fmtT(s) {
    s = Math.max(0, +s || 0);
    const m = Math.floor(s / 60), r = s - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
  }
  // "1:23.4" / "83.4" → 83.4
  function parseT(str) {
    str = String(str || '').trim();
    if (!str) return 0;
    const p = str.split(':').map(Number);
    if (p.some(isNaN)) return NaN;
    return p.reduce((a, b) => a * 60 + b, 0);
  }
  P.fmtT = fmtT;

  // 동영상 미리보기 + 트림(시작·끝) 편집기
  function videoTrimmer(el) {
    const src = Media.resolve(el.src);
    const v = h('video', { class: 'vt-video', src, preload: 'metadata', playsinline: true, controls: true });
    let dur = 0;
    const sStart = h('input', { type: 'range', class: 'vt-r vt-r-start', min: 0, max: 1, step: 0.1, value: 0 });
    const sEnd = h('input', { type: 'range', class: 'vt-r vt-r-end', min: 0, max: 1, step: 0.1, value: 1 });
    const fill = h('div', { class: 'vt-fill' });
    const head = h('div', { class: 'vt-head' });
    const tStart = h('input', { type: 'text', class: 'p-text vt-t', title: '시작 (분:초)' });
    const tEnd = h('input', { type: 'text', class: 'p-text vt-t', title: '끝 (분:초)' });
    const info = h('span', { class: 'vt-info' });
    const ts = () => +el.trimStart || 0;
    const te = () => (+el.trimEnd || 0) || dur;
    const paint = () => {
      if (!dur) return;
      const a = ts() / dur * 100, b = te() / dur * 100;
      fill.style.left = a + '%'; fill.style.width = Math.max(0, b - a) + '%';
      head.style.left = (v.currentTime / dur * 100) + '%';
      sStart.value = ts(); sEnd.value = te();
      if (document.activeElement !== tStart) tStart.value = fmtT(ts());
      if (document.activeElement !== tEnd) tEnd.value = fmtT(te());
      const cut = ts() > 0.05 || te() < dur - 0.05;
      info.textContent = (cut ? '재생 구간 ' : '전체 ') + fmtT(te() - ts()) + (cut ? ' / 원본 ' + fmtT(dur) : '');
    };
    const set = (a, b) => {
      a = Math.max(0, Math.min(a, dur - 0.2));
      b = Math.max(a + 0.2, Math.min(b, dur));
      setEls('trimStart', Math.round(a * 10) / 10 || undefined);
      setEls('trimEnd', b >= dur - 0.05 ? undefined : Math.round(b * 10) / 10);
      paint();
    };
    v.addEventListener('loadedmetadata', () => {
      dur = v.duration && isFinite(v.duration) ? v.duration : 0;
      [sStart, sEnd].forEach((s) => { s.max = dur; });
      v.currentTime = ts();
      paint();
    });
    v.addEventListener('timeupdate', () => {
      if (!v.paused && dur && v.currentTime >= te() - 0.03 && te() < dur - 0.05) { v.pause(); v.currentTime = te(); }
      paint();
    });
    v.addEventListener('play', () => { if (v.currentTime < ts() - 0.2 || v.currentTime >= te() - 0.05) v.currentTime = ts(); });
    sStart.addEventListener('input', () => { set(+sStart.value, te()); v.currentTime = ts(); });
    sEnd.addEventListener('input', () => { set(ts(), +sEnd.value); v.currentTime = te(); });
    [sStart, sEnd].forEach((s) => s.addEventListener('change', done));
    const onT = (inp, isStart) => inp.addEventListener('change', () => {
      const n = parseT(inp.value);
      if (!isNaN(n) && dur) { if (isStart) set(n, te()); else set(ts(), n); done(); }
      inp.value = fmtT(isStart ? ts() : te());
    });
    onT(tStart, true); onT(tEnd, false);
    const playRange = () => { v.currentTime = ts(); v.muted = false; v.play().catch(() => {}); };
    return h('div', { class: 'vt' },
      v,
      h('div', { class: 'vt-bar', title: '재생 구간 — 양쪽 손잡이를 끌어 시작·끝을 정하세요' }, h('div', { class: 'vt-track' }, fill, head), sStart, sEnd),
      h('div', { class: 'vt-row' }, h('span', { class: 'vt-lab' }, '시작'), tStart, h('span', { class: 'vt-lab' }, '끝'), tEnd, info),
      h('div', { class: 'p-btns wrap' },
        h('button', { class: 'p-btn', title: '재생 위치를 시작점으로', onclick: () => { if (dur) { set(v.currentTime, te()); done(); } } }, '[ 지금을 시작으로'),
        h('button', { class: 'p-btn', title: '재생 위치를 끝점으로', onclick: () => { if (dur) { set(ts(), v.currentTime); done(); } } }, '지금을 끝으로 ]'),
        h('button', { class: 'p-btn', onclick: playRange }, '▶ 구간 재생'),
        h('button', { class: 'p-btn', title: '자른 구간을 없애고 처음부터 끝까지', onclick: () => { if (dur) { set(0, dur); done(); v.currentTime = 0; } } }, '↺ 처음부터 끝까지')),
      h('p', { class: 'p-hint' }, '원본 파일은 그대로 두고, 발표·녹화·내보내기에서 이 구간만 재생합니다.'));
  }

  // 웹 동영상: 시작·끝 시간 입력
  function embedTrim(el) {
    const mk = (key, ph) => {
      const inp = h('input', { type: 'text', class: 'p-text vt-t', placeholder: ph, value: el[key] ? fmtT(el[key]) : '' });
      inp.addEventListener('change', () => {
        const n = parseT(inp.value);
        if (isNaN(n)) { inp.value = el[key] ? fmtT(el[key]) : ''; return; }
        setEls(key, n > 0 ? n : undefined); done();
        inp.value = n > 0 ? fmtT(n) : '';
      });
      return inp;
    };
    return row('구간', h('span', { class: 'vt-lab' }, '시작'), mk('trimStart', '0:00'), h('span', { class: 'vt-lab' }, '끝'), mk('trimEnd', '끝까지'));
  }

  // 움직이는 배경 갤러리: 현재 슬라이드 배경 위에서 실제로 움직이는 미리보기
  P.fxGallery = function (pick) {
    const deck = Store.deck, slide = Store.slide(), bg = slide.bg || {};
    const TW = 232, sc = TW / deck.width, TH = Math.round(deck.height * sc);
    const body = h('div', { class: 'fxg' });
    let close;
    Core.BG_FX_CATS.forEach(([cat, keys]) => {
      body.appendChild(h('div', { class: 'fxg-cat' }, cat));
      const grid = h('div', { class: 'fxg-grid' });
      keys.forEach((k) => {
        const pc = Core.BG_FX_COLORS[k];
        const b2 = Object.assign({}, bg, { fx: k }, pc ? { fxColor: pc[0], fxColor2: pc[1] } : {});
        if ((!bg.type || bg.type === 'color') && /^#f|^#e|^#ff/i.test(bg.color || '#fff') && !pc && !bg.fxColor) b2.fxColor = '#4dabf7';
        const sl = Core.renderSlide(deck, { id: 'fxg-' + k, bg: b2, elements: [] }, { mode: 'gallery', resolve: Media.resolve });
        sl.style.transform = 'scale(' + sc + ')';
        sl.style.transformOrigin = '0 0';
        sl.style.position = 'absolute';
        const tile = h('button', { class: 'fxg-tile' + (bg.fx === k ? ' on' : ''), title: Core.BG_FX[k] + ' — 클릭하면 적용', onclick: () => { pick(k); if (close) close(); } },
          h('div', { class: 'fxg-view', style: 'width:' + TW + 'px;height:' + TH + 'px' }, sl),
          h('span', null, Core.BG_FX[k] + (pc ? ' 🎨' : '')));
        grid.appendChild(tile);
      });
      body.appendChild(grid);
    });
    body.appendChild(h('p', { class: 'p-hint' }, '지금 슬라이드의 배경 위에서 움직이는 모습입니다. 🎨 표시는 고르면 어울리는 색이 함께 들어갑니다(나중에 바꿀 수 있음). 밝은 배경에서는 흰색 효과가 잘 보이지 않으니 색 1·2 를 바꾸세요.'));
    close = UI.modal('움직이는 배경 고르기', body, [['없음으로', () => { pick('none'); return true; }], ['닫기', () => true]], { wide: true });
  };

  function toHex(c) {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('');
    const d = document.createElement('div');
    d.style.color = c;
    document.body.appendChild(d);
    const m = getComputedStyle(d).color.match(/\d+/g);
    d.remove();
    return m ? '#' + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, '0')).join('') : '#000000';
  }
  P.toHex = toHex;

  /* ---------- 초기화 ---------- */
  P.init = function () {
    listEl = document.getElementById('slide-list');
    // 목록 너비가 바뀌면(창 크기 변경 등) 썸네일 크기를 다시 맞춤
    let lastW = 0;
    new ResizeObserver(() => {
      if (listEl.clientWidth === lastW) return;
      lastW = listEl.clientWidth;
      if (Store.deck) P.resizeThumbs();
    }).observe(listEl);
    propsEl = document.getElementById('props-body');
    document.querySelectorAll('#props-tabs button').forEach((b) => b.addEventListener('click', () => P.showTab(b.dataset.tab)));
    // 슬라이드 목록 드래그 정렬
    let dragIdx = -1;
    listEl.addEventListener('dragstart', (e) => {
      const it = e.target.closest('.thumb');
      if (!it) return;
      dragIdx = +it.dataset.idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/x-slide', String(dragIdx));
    });
    listEl.addEventListener('dragover', (e) => {
      if (dragIdx < 0) return;
      e.preventDefault();
      const it = e.target.closest('.thumb');
      listEl.querySelectorAll('.thumb').forEach((t) => t.classList.remove('drop-before', 'drop-after'));
      if (it) {
        const r = it.getBoundingClientRect();
        it.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
      }
    });
    listEl.addEventListener('drop', (e) => {
      if (dragIdx < 0) return;
      e.preventDefault();
      const it = e.target.closest('.thumb');
      listEl.querySelectorAll('.thumb').forEach((t) => t.classList.remove('drop-before', 'drop-after'));
      if (!it) { dragIdx = -1; return; }
      const r = it.getBoundingClientRect();
      let to = +it.dataset.idx + (e.clientY < r.top + r.height / 2 ? 0 : 1);
      const from = dragIdx;
      dragIdx = -1;
      if (to > from) to--;
      if (to === from) return;
      App.moveSlide(from, to);
    });
    listEl.addEventListener('dragend', () => { dragIdx = -1; });
  };

  P.showTab = function (t) {
    P.tab = t;
    document.querySelectorAll('#props-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    document.querySelectorAll('.tab-pane').forEach((p) => { p.hidden = p.dataset.pane !== t; });
    P.renderProps();
  };

  /* ---------- 슬라이드 목록 ---------- */
  // 썸네일 크기만 다시 맞춤 (다시 그리지 않음)
  P.resizeThumbs = function () {
    const deck = Store.deck;
    const cs = getComputedStyle(listEl);
    const inner = listEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const tw = Math.max(80, Math.floor(inner - 18 - 4)), sc = tw / deck.width, th = Math.round(deck.height * sc);
    if (P._thumbW === tw) return;
    P._thumbW = tw;
    listEl.querySelectorAll('.thumb-view').forEach((v) => {
      v.style.width = tw + 'px'; v.style.height = th + 'px';
      const r = v.firstElementChild;
      if (r) r.style.transform = `scale(${sc})`;
    });
  };

  P.renderList = function (full) {
    const deck = Store.deck;
    // 썸네일 너비 = 목록의 실제 안쪽 너비 − 번호 칸(18) − 간격(4) → 세로 스크롤바가 생겨도 좌우로 넘치지 않음
    const cs = getComputedStyle(listEl);
    const inner = listEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const tw = Math.max(80, Math.floor(inner - 18 - 4)), sc = tw / deck.width, th = Math.round(deck.height * sc);
    if (P._thumbW !== tw) { P._thumbW = tw; thumbCache.clear(); }
    const items = Array.from(listEl.querySelectorAll('.thumb'));
    if (full || items.length !== deck.slides.length || items.some((it, i) => it.dataset.id !== deck.slides[i].id)) {
      listEl.innerHTML = '';
      thumbCache.clear();
      deck.slides.forEach((s, i) => {
        const it = h('div', { class: 'thumb', draggable: 'true', 'data-idx': i, 'data-id': s.id },
          h('div', { class: 'thumb-num' }, String(i + 1), s.anims && s.anims.length ? h('span', { class: 'thumb-star', title: '애니메이션 있음' }, '★') : null),
          h('div', { class: 'thumb-view', style: `width:${tw}px;height:${th}px` }),
          h('div', { class: 'thumb-tools' },
            h('button', { title: '복제', onclick: (e) => { e.stopPropagation(); App.duplicateSlide(i); } }, '⧉'),
            h('button', { title: '삭제', onclick: (e) => { e.stopPropagation(); App.deleteSlide(i); } }, '✕')));
        it.addEventListener('click', () => { if (Editor.editing) Editor.commitEdit(); Store.goto(i); });
        it.addEventListener('contextmenu', (e) => { e.preventDefault(); Store.goto(i); App.slideMenu(e, i); });
        listEl.appendChild(it);
      });
    }
    listEl.querySelectorAll('.thumb').forEach((it, i) => {
      it.classList.toggle('on', i === Store.cur);
      it.dataset.idx = i;
      it.querySelector('.thumb-num').firstChild.textContent = String(i + 1);
      const s = deck.slides[i];
      // 모핑 체인 표시: 🔀 배지 + 앞 슬라이드와의 연결선
      const ch = morphChain(deck, i);
      const morphIn = !!(s.transition && s.transition.type === 'morph') && i > 0;
      it.classList.toggle('morph-in', morphIn);
      // 앞 슬라이드와의 연결선 (가상 요소 대신 실제 요소 — 드래그 위치 표시선과 겹치지 않게)
      let ln = it.querySelector('.thumb-link');
      if (morphIn && !ln) { ln = h('div', { class: 'thumb-link', title: '앞 슬라이드에서 모핑으로 이어집니다' }, '🔀'); it.appendChild(ln); }
      else if (!morphIn && ln) ln.remove();
      if (ln) ln.classList.toggle('broken', !morphPairs(deck.slides[i - 1], s).size);
      it.classList.toggle('morph-chain', !!ch);
      let mb = it.querySelector('.thumb-morph');
      const linked = morphIn ? morphPairs(deck.slides[i - 1], s).size : 0;
      const broken = morphIn && linked === 0;
      if (ch || broken) {
        if (!mb) { mb = h('div', { class: 'thumb-morph' }); it.appendChild(mb); }
        if (broken) {
          mb.textContent = '🔀 연결 끊김';
          mb.title = '전환은 모핑인데 앞 슬라이드와 이어지는 요소가 없습니다 (발표 때 페이드로 넘어감). 순서를 되돌리거나 전환을 바꾸세요.';
        } else {
          mb.textContent = ch.pos === 0 ? '🔀 시작' : `🔀 ${ch.pos + 1}/${ch.len}`;
          mb.title = ch.pos === 0
            ? `모핑 체인의 시작 — 다음 슬라이드(#${i + 2})로 모핑됩니다`
            : `모핑 체인 #${ch.start + 1}–#${ch.end + 1} 중 ${ch.pos + 1}번째 · 앞 슬라이드와 연결된 요소 ${linked}개`;
        }
        mb.classList.toggle('warn', broken);
      } else if (mb) mb.remove();
      // 배경음악 ♪ 표시 (곡 색)
      const mt = s.music && deck.bgm && deck.bgm.tracks ? deck.bgm.tracks.find((t) => t.id === s.music) : null;
      let mn = it.querySelector('.thumb-music');
      if (mt) {
        if (!mn) { mn = h('span', { class: 'thumb-music' }, '♪'); it.querySelector('.thumb-num').appendChild(mn); }
        mn.style.background = mt.color || '#845ef7';
        mn.title = '배경음악: ' + (mt.title || '');
      } else if (mn) mn.remove();
      const json = JSON.stringify(s) + deck.width + 'x' + deck.height;
      if (thumbCache.get(s.id) === json) return;
      thumbCache.set(s.id, json);
      const view = it.querySelector('.thumb-view');
      view.style.width = tw + 'px'; view.style.height = th + 'px';
      const r = Core.renderSlide(deck, s, { mode: 'thumb', resolve: Media.resolve });
      r.style.transform = `scale(${sc})`;
      r.style.transformOrigin = '0 0';
      view.innerHTML = '';
      view.appendChild(r);
      const star = it.querySelector('.thumb-star');
      if (!!(s.anims && s.anims.length) !== !!star) {
        const n = it.querySelector('.thumb-num');
        if (star) star.remove(); else n.appendChild(h('span', { class: 'thumb-star', title: '애니메이션 있음' }, '★'));
      }
    });
    const on = listEl.querySelector('.thumb.on');
    if (on && P._scrollTo !== Store.cur) { on.scrollIntoView({ block: 'nearest' }); P._scrollTo = Store.cur; }
  };

  P.invalidateThumbs = function () { thumbCache.clear(); };

  /* ---------- 오른쪽 패널 ---------- */
  P.renderProps = function () {
    if (P.suppress) return;
    if (P.tab === 'props') renderElementProps();
    else if (P.tab === 'anim') renderAnimPanel();
    else if (P.tab === 'slide') renderSlidePanel();
  };

  function elLabel(el) {
    const names = { path: '펜 선', text: '텍스트', shape: '도형', image: '이미지', video: '동영상', embed: '웹 동영상', model: '3D 모델', table: '표', chart: '차트', code: '코드' };
    let t = '';
    if (el.html) { const d = document.createElement('div'); d.innerHTML = el.html; t = d.textContent.trim().slice(0, 18); }
    else if (el.type === 'code' && el.code) t = (el.title || el.code.split('\n')[0]).trim().slice(0, 18);
    return (names[el.type] || el.type) + (t ? ' · ' + t : '');
  }
  P.elLabel = elLabel;

  function renderElementProps() {
    const pane = document.querySelector('[data-pane="props"]');
    const body = pane.querySelector('.pane-body');
    body.innerHTML = '';
    const sel = Store.selected();
    if (!sel.length) {
      body.appendChild(section('삽입',
        h('div', { class: 'insert-grid' },
          [['T', '텍스트', () => App.addText()], ['▭', '도형', () => App.addShape('rounded')], ['🖼', '이미지', () => App.pickFile('image')], ['🎬', '동영상', () => App.pickFile('video')],
            ['▶', '웹 동영상', () => App.addEmbed()], ['🧊', '3D 모델', () => App.addModel()], ['▦', '표', () => App.addTable()], ['📊', '차트', () => App.addChart()], ['</>', '코드', () => App.addCode()], ['🔘', '버튼', () => App.addButton()],
            ['😀', '아이콘', () => App.addIcon()], ['❓', '퀴즈', () => App.addSlide('quiz')], ['🔀', '모핑 복제', () => App.morphSlide()]]
            .map(([i, l, f]) => h('button', { class: 'insert-btn', onclick: f }, h('b', null, i), h('span', null, l))))));
      body.appendChild(h('p', { class: 'p-hint' }, '캔버스에서 요소를 클릭하면 속성을 편집할 수 있습니다. 더블클릭하면 텍스트를 바로 수정합니다. 파일을 캔버스로 끌어다 놓아도 삽입됩니다.'));
      return;
    }
    const el = sel[0];
    const multi = sel.length > 1;
    body.appendChild(h('div', { class: 'p-head' }, multi ? `${sel.length}개 요소 선택됨` : elLabel(el)));

    body.appendChild(section('위치와 크기',
      h('div', { class: 'p-grid4' },
        h('label', null, 'X', num(el, 'x')), h('label', null, 'Y', num(el, 'y')),
        h('label', null, '너비', num(el, 'w', { min: 1 })), h('label', null, '높이', num(el, 'h', { min: 1 }))),
      row('회전', num(el, 'rotation', { def: 0 }), h('span', { class: 'p-unit' }, '°')),
      row('투명도', range(el, 'opacity', 0, 1, 0.05, 1))));

    if (el.type === 'text' || el.type === 'shape') {
      if (el.type === 'shape') {
        body.appendChild(section('도형',
          row('모양', select(el, 'shape', Object.entries(Core.SHAPES).map(([k, v]) => [k, v.label]), { rebuild: true })),
          row('채우기', color(el, 'fill', '#4dabf7'), h('button', { class: 'p-mini', onclick: () => { setEls('fill', 'transparent'); done(); } }, '없음')),
          el.shape === 'line' ? row('선 두께', num(el, 'lineWidth', { def: 6, min: 1 })) : null,
          el.shape !== 'line' ? row('테두리', num(el, 'borderWidth', { def: 0, min: 0 }), color(el, 'borderColor', '#000000')) : null,
          el.shape === 'rect' || el.shape === 'rounded' ? row('모서리', num(el, 'radius', { def: el.shape === 'rounded' ? 32 : 0, min: 0 })) : null,
          row('그림자', range(el, 'shadow', 0, 40, 1, 0))));
      }
      if (el.type !== 'shape' || el.shape !== 'line') {
        body.appendChild(section('텍스트',
          row('글꼴', select(el, 'fontFamily', [['', '테마 기본']].concat(FONTS))),
          row('크기', num(el, 'fontSize', { min: 6 }), btns([['A−', () => bump(-4), false, '작게'], ['A+', () => bump(4), false, '크게']])),
          row('색', color(el, 'color', '#222222'), check(el, 'textShadow', '그림자')),
          row('스타일', btns([['<b>B</b>', () => toggle('bold'), el.bold, '굵게 (Ctrl+B)'], ['<i>I</i>', () => toggle('italic'), el.italic, '기울임'], ['<u>U</u>', () => toggle('underline'), el.underline, '밑줄']])),
          row('가로 정렬', btns([['⯇', () => setOne('align', 'left'), el.align === 'left', '왼쪽'], ['≡', () => setOne('align', 'center'), el.align === 'center', '가운데'], ['⯈', () => setOne('align', 'right'), el.align === 'right', '오른쪽'], ['☰', () => setOne('align', 'justify'), el.align === 'justify', '양쪽']])),
          row('세로 정렬', btns([['위', () => setOne('valign', 'top'), (el.valign || 'top') === 'top'], ['중간', () => setOne('valign', 'middle'), el.valign === 'middle'], ['아래', () => setOne('valign', 'bottom'), el.valign === 'bottom']])),
          row('줄 간격', range(el, 'lineHeight', 0.8, 2.5, 0.05, 1.3)),
          row('자간', range(el, 'letterSpacing', -5, 20, 0.5, 0)),
          row('안쪽 여백', num(el, 'padding', { def: 8, min: 0 })),
          h('div', { class: 'p-btns wrap' },
            h('button', { class: 'p-btn', onclick: () => Editor.startEdit(el.id, true) }, '✎ 텍스트 편집'))));
        if (!multi) body.appendChild(magicSection(el));
      }
      if (el.type === 'text') {
        body.appendChild(section('배경과 테두리',
          row('배경', color(el, 'fill', '#ffffff'), h('button', { class: 'p-mini', onclick: () => { setEls('fill', 'transparent'); done(); } }, '없음')),
          row('테두리', num(el, 'borderWidth', { def: 0, min: 0 }), color(el, 'borderColor', '#000000')),
          row('모서리', num(el, 'radius', { def: 0, min: 0 })),
          row('그림자', range(el, 'shadow', 0, 40, 1, 0))));
      }
    }
    if (el.type === 'image') {
      body.appendChild(section('이미지',
        h('div', { class: 'p-btns wrap' }, h('button', { class: 'p-btn', onclick: () => App.replaceMedia(el, 'image') }, '이미지 바꾸기'), h('button', { class: 'p-btn', onclick: () => App.fitNatural(el) }, '원본 비율')),
        row('맞춤', select(el, 'fit', [['cover', '채우기 (자르기)'], ['contain', '맞추기 (전체 보기)'], ['fill', '늘이기']])),
        row('모서리', num(el, 'radius', { def: 0, min: 0 })),
        row('테두리', num(el, 'borderWidth', { def: 0, min: 0 }), color(el, 'borderColor', '#ffffff')),
        row('그림자', range(el, 'shadow', 0, 40, 1, 0)),
        row('흑백', range(el, 'grayscale', 0, 1, 0.05, 0)),
        row('밝기', range(el, 'brightness', 0.2, 2, 0.05, 1)),
        row('대비', range(el, 'contrast', 0.2, 2, 0.05, 1)),
        row('세피아', range(el, 'sepia', 0, 1, 0.05, 0)),
        row('흐림', range(el, 'blur', 0, 20, 0.5, 0)),
        row('', check(el, 'flipH', '좌우 반전')),
        row('대체 텍스트', text(el, 'alt', '이미지 설명'))));
    }
    if (el.type === 'video') {
      body.appendChild(section('동영상',
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn primary', title: '슬라이드 전체 크기로 — 비율은 유지하고 남는 부분은 여백 색으로', onclick: () => App.fitFullScreen(el) }, '⛶ 전체 화면으로 맞추기'),
          h('button', { class: 'p-btn', onclick: () => App.replaceMedia(el, 'video') }, '동영상 바꾸기')),
        row('맞춤', select(el, 'fit', [['contain', '맞추기 (비율 유지 · 여백)'], ['cover', '채우기 (비율 유지 · 잘림)'], ['fill', '늘이기 (비율 무시)']], { rebuild: true })),
        el.fit !== 'cover' && el.fit !== 'fill' ? row('여백 색', color(el, 'fill', '#000000'), h('button', { class: 'p-mini', onclick: () => { setEls('fill', '#000000'); done(); } }, '검정')) : null,
        row('재생', check(el, 'autoplay', '자동 재생'), check(el, 'loop', '반복')),
        row('', check(el, 'muted', '음소거'), check(el, 'controls', '컨트롤 표시')),
        h('label', { class: 'p-check p-strong' }, h('input', { type: 'checkbox', checked: !!el.clickFull, onchange: (e) => { setEls('clickFull', e.target.checked || undefined); done(); } }), '⛶ 발표 중 클릭하면 전체 화면으로 재생'),
        h('p', { class: 'p-hint' }, '켜면 발표 화면에 ▶ 표시가 나오고, 클릭하면 슬라이드 전체로 커지며 소리와 함께 재생됩니다. ✕ 또는 Esc 로 원래 크기로 돌아갑니다.'),
        row('모서리', num(el, 'radius', { def: 0, min: 0 })),
        row('그림자', range(el, 'shadow', 0, 40, 1, 0))));
      if (el.src) {
        body.appendChild(section('재생 · 자르기 (트림)',
          videoTrimmer(el),
          h('div', { class: 'p-btns wrap' },
            h('button', { class: 'p-btn', title: '큰 창에서 미리보기 (자른 구간만)', onclick: () => App.previewVideo(el) }, '⛶ 크게 보기'),
            h('button', { class: 'p-btn', title: '캔버스에서 그 자리 재생 (Space 로도 가능)', onclick: () => Editor.playInPlace(el) }, '▶ 슬라이드에서 재생'))));
      }
    }
    if (el.type === 'embed') {
      body.appendChild(section('웹 동영상 (YouTube / Vimeo / URL)',
        h('div', { class: 'p-btns wrap' }, h('button', { class: 'p-btn primary', title: '슬라이드 전체 크기로 (남는 부분은 검은색)', onclick: () => App.fitFullScreen(el) }, '⛶ 전체 화면으로 맞추기')),
        row('URL', text(el, 'url', 'https://youtu.be/...')),
        row('재생', check(el, 'autoplay', '자동 재생'), check(el, 'loop', '반복')),
        row('', check(el, 'muted', '음소거'), check(el, 'controls', '컨트롤 표시')),
        embedTrim(el),
        h('label', { class: 'p-check p-strong' }, h('input', { type: 'checkbox', checked: !!el.clickFull, onchange: (e) => { setEls('clickFull', e.target.checked || undefined); done(); } }), '⛶ 발표 중 클릭하면 전체 화면으로 재생'),
        row('모서리', num(el, 'radius', { def: 0, min: 0 })),
        el.url ? h('div', { class: 'p-btns wrap' }, h('button', { class: 'p-btn', onclick: () => App.previewVideo(el) }, '⛶ 크게 보기 (미리보기)')) : null,
        h('p', { class: 'p-hint' }, '구간은 YouTube(초 단위)·Vimeo(시작만)에 적용됩니다. YouTube 임베드는 로컬 서버(start.bat)로 실행할 때 가장 잘 동작합니다.')));
    }
    if (el.type === 'model') {
      // 지금 편집 화면에 보이는 각도를 시작 시점으로 저장
      const saveView = () => {
        const mv = document.querySelector(`#canvas .hp-el[data-id="${el.id}"] model-viewer`);
        if (!mv || !mv.getCameraOrbit) return;
        const o = mv.getCameraOrbit();
        setEls('orbit', `${Math.round(o.theta * 180 / Math.PI)}deg ${Math.round(o.phi * 180 / Math.PI)}deg ${Math.round(o.radius * 100) / 100}m`);
        done();
      };
      const ang = (k, label, min, max) => {
        const out = h('span', { class: 'p-rv' }, orbitPart(el.orbit, k) + '°');
        return row(label, h('div', { class: 'p-range' }, h('input', { type: 'range', min, max, step: 5, value: orbitPart(el.orbit, k),
          oninput: (e) => { out.textContent = e.target.value + '°'; setEls('orbit', orbitSet(el.orbit, k, +e.target.value)); }, onchange: done }), out));
      };
      body.appendChild(section('3D 모델',
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn primary', onclick: () => App.addModel(el) }, '🔄 모델 바꾸기'),
          h('button', { class: 'p-btn', title: '자동 회전 중 지금 보이는 각도를 시작 시점으로', onclick: saveView }, '📷 지금 각도로 고정'),
          el.orbit ? h('button', { class: 'p-btn', onclick: () => { setEls('orbit', ''); done(); } }, '↺ 기본 시점') : null),
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn' + (Editor.orbitId === el.id ? ' primary' : ''), title: '켜면 모델을 그냥 끌어서 돌리고, 휠로 가깝게/멀게 합니다', onclick: (e) => { const b = e.currentTarget; Editor.toggleOrbit(el.id); const on = Editor.orbitId === el.id; b.classList.toggle('primary', on); b.textContent = on ? '🖐 돌리기 모드 켜짐' : '🖐 돌리기 모드'; } }, Editor.orbitId === el.id ? '🖐 돌리기 모드 켜짐' : '🖐 돌리기 모드')),
        row('회전', check(el, 'autoRotate', '자동 회전')),
        row('회전 속도', range(el, 'rotateSpeed', -90, 90, 5, 30)),
        ang('theta', '좌우 각도', -180, 180),
        ang('phi', '위아래 각도', 10, 170),
        row('밝기', range(el, 'exposure', 0.2, 2.5, 0.1, 1)),
        row('그림자', range(el, 'shadowIntensity', 0, 2, 0.1, 1)),
        row('조명', select(el, 'envLight', [['neutral', '부드러운 실내광'], ['legacy', '선명한 조명']], { def: 'neutral' })),
        row('움직임', check(el, 'animation', '모델 애니메이션 재생')),
        row('발표 중', check(el, 'controls', '마우스로 돌려 보기'), check(el, 'zoom', '휠로 확대')),
        row('배경', color(el, 'fill', '#ffffff'), h('button', { class: 'p-btn', onclick: () => { setEls('fill', 'transparent'); done(); } }, '투명')),
        h('p', { class: 'p-hint' }, '편집 화면: Alt+끌기로 돌리기(Shift 를 함께 누르면 15° 단위), Alt+휠로 가깝게/멀게 — 놓은 각도가 시작 시점으로 저장됩니다. 그냥 끌면 이동합니다. 발표 중에는 그냥 끌어서 돌리고, 잠시 뒤 자동 회전이 다시 시작됩니다.')));
    }
    if (el.type === 'path') {
      body.appendChild(section('펜 선',
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn primary', onclick: () => Pen.edit(el) }, '✎ 점 편집 (더블클릭)'),
          h('button', { class: 'p-btn', onclick: () => Pen.startDraw() }, '✒ 새로 그리기 (P)'),
          h('button', { class: 'p-btn', title: '선의 시작과 끝을 바꿉니다 — 화살표가 반대쪽으로 가고, "선 그리기"도 반대쪽부터 그려집니다', onclick: () => Pen.reverse(el) }, '⇄ 선 방향 뒤집기')),
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn', title: '점 편집 중 선택한 점에서 양쪽 핸들을 뽑아 곡선점으로 (또는 Alt+점 끌기로 직접 뽑기)', onclick: () => Pen.setHandles(true) }, '⟲ 선택한 점에 핸들 추가'),
          h('button', { class: 'p-btn', title: '선택한 점의 핸들을 없애 모서리점으로', onclick: () => Pen.setHandles(false) }, '⌐ 핸들 제거')),
        h('p', { class: 'p-hint' }, '점 편집 중: Alt+점 끌기 = 그 점에서 핸들을 직접 뽑기 · Alt+핸들 끌기 = 한쪽만 움직이기 · 점 더블클릭 = 모서리↔곡선'),
        row('선 색', color(el, 'stroke', '#222222'), clearBtn(el, 'stroke')),
        row('선 굵기', num(el, 'strokeWidth', { def: 6, min: 0, step: 1 })),
        row('채우기', color(el, 'fill', '#4dabf7'), clearBtn(el, 'fill')),
        row('선 모양', select(el, 'dash', [['solid', '실선'], ['dash', '점선 (짧게)'], ['longdash', '점선 (길게)'], ['dot', '동그란 점']], { def: 'solid' })),
        row('끝 모양', select(el, 'cap', [['round', '둥글게'], ['butt', '평평하게'], ['square', '네모'] ], { def: 'round' })),
        row('꺾인 곳', select(el, 'join', [['round', '둥글게'], ['miter', '뾰족하게'], ['bevel', '깎아서']], { def: 'round' })),
        row('화살표', check(el, 'arrowStart', '시작'), check(el, 'arrowEnd', '끝')),
        row('닫힌 도형', check(el, 'closed', '처음과 끝을 잇기', { rebuild: true })),
        h('p', { class: 'p-hint' }, '채우기는 닫힌 도형에서 가장 잘 보입니다. "선 그리기" 애니메이션을 넣으면 발표 때 선이 그려지며 나타납니다.')));
    }

    if (el.type === 'table') {
      const ta = h('textarea', { class: 'p-area', id: 'table-data', rows: 7, oninput: (e) => setEls('data', e.target.value), onchange: done });
      ta.value = el.data || '';
      body.appendChild(section('표',
        h('p', { class: 'p-hint' }, '한 줄 = 한 행, 쉼표(,) 또는 탭으로 열 구분. 엑셀에서 복사해 붙여넣어도 됩니다.'),
        ta,
        row('글자 크기', num(el, 'fontSize', { min: 6 })),
        h('p', { class: 'p-hint' }, '↔ 캔버스에서 표의 열·행 경계선을 끌면 너비·높이가 바뀝니다 (경계선 더블클릭: 같은 크기로).'),
        row('열 너비', text(el, 'colWidths', '예: 15,42,43 (비우면 균등)')),
        row('행 높이', text(el, 'rowHeights', '예: 20,40,40 (비우면 균등)')),
        (el.colWidths || el.rowHeights) ? h('div', { class: 'p-btns wrap' }, h('button', { class: 'p-btn', onclick: () => { Store.checkpoint(); Store.selected().forEach((x) => { delete x.colWidths; delete x.rowHeights; }); Store.emit({ content: true }); } }, '⊞ 모든 칸 같은 크기로')) : null,
        row('글자 색', color(el, 'color', '#222222')),
        row('머리글', check(el, 'headerRow', '첫 행 머리글'), color(el, 'headerColor', '#3b5bdb')),
        row('줄무늬', check(el, 'striped', '사용'), color(el, 'stripeColor', '#f3f5fa')),
        row('셀 배경', color(el, 'cellColor', '#ffffff'), clearBtn(el, 'cellColor')),
        row('선 색', color(el, 'borderColor', '#cfd6e4'), clearBtn(el, 'borderColor'))));
    }

    if (el.type === 'chart') {
      const ta = h('textarea', { class: 'p-area', id: 'chart-data', rows: 7, oninput: (e) => setEls('data', e.target.value), onchange: done });
      ta.value = el.data || '';
      const palettes = [
        ['', '테마/기본'],
        ['#4dabf7,#ff6b6b,#51cf66,#fcc419,#845ef7,#ff922b', '선명하게'],
        ['#a5d8ff,#ffc9c9,#b2f2bb,#ffec99,#d0bfff,#ffd8a8', '파스텔'],
        ['#1c7ed6,#4dabf7,#a5d8ff,#d0ebff,#e7f5ff', '블루 계열'],
        ['#2b8a3e,#51cf66,#8ce99a,#d3f9d8', '그린 계열'],
        ['#e8590c,#ff922b,#ffc078,#ffe8cc', '오렌지 계열'],
        ['#212529,#495057,#868e96,#ced4da', '모노'],
        ['#f72585,#7209b7,#3a0ca3,#4361ee,#4cc9f0', '네온'],
      ];
      const ct = el.chartType || 'bar';
      const axis = !/^(pie|donut|gauge|funnel|radar)$/.test(ct);
      const hint = {
        pie: '원형/도넛/깔때기는 첫 번째 값 열을 사용합니다.', donut: '원형/도넛/깔때기는 첫 번째 값 열을 사용합니다.', funnel: '원형/도넛/깔때기는 첫 번째 값 열을 사용합니다.',
        gauge: '게이지: 첫 행의 첫 값이 현재 값입니다 (최댓값은 아래에서 지정).', combo: '혼합: 첫 번째 계열은 막대, 나머지 계열은 선으로 그립니다.',
        stacked100: '100% 누적: 항목마다 계열 비율로 그립니다.', radar: '방사형: 항목이 꼭짓점, 계열이 다각형입니다.',
      }[ct] || '';
      body.appendChild(section('차트',
        row('종류', select(el, 'chartType', Object.entries(Core.CHART_TYPES), { rebuild: true })),
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn primary', onclick: () => App.chartDataEditor(el) }, '▦ 표로 데이터 편집')),
        h('p', { class: 'p-hint' }, '첫 행: 항목,계열1,계열2… / 다음 행: 이름,값,값… (엑셀에서 복사해 붙여넣기 가능). ' + hint),
        ta,
        row('색상', select(el, 'colors', palettes, { def: '' })),
        row('직접 색', text(el, 'colors', '#ff0000,#00ff00,…')),
        row('글자', num(el, 'fontSize', { min: 8 }), color(el, 'color', '#333333')),
        row('표시', check(el, 'showValues', '값'), axis ? check(el, 'showGrid', '눈금') : null),
        row('범례', select(el, 'legendPos', [['top', '위'], ['bottom', '아래'], ['right', '오른쪽'], ['none', '숨김']], { def: 'top' })),
        row('단위', text(el, 'prefix', '앞 (예: $)'), text(el, 'unit', '뒤 (예: %, 억)')),
        row('강조 항목', text(el, 'highlight', '번호(1부터) 또는 항목 이름')),
        /line|area|combo/.test(ct) ? row('', check(el, 'smooth', '부드러운 곡선')) : null,
        axis ? row('축 범위', text(el, 'yMin', '최솟값 (자동)'), text(el, 'yMax', '최댓값 (자동)')) : null,
        axis ? row('축 제목', text(el, 'xTitle', '가로축'), text(el, 'yTitle', '세로축')) : null,
        axis || ct === 'gauge' ? row('목표선', text(el, 'target', '값 (예: 80)'), text(el, 'targetLabel', '이름 (기본: 목표)')) : null,
        ct === 'gauge' ? row('최댓값', num(el, 'gaugeMax', { def: 100, min: 1 })) : null,
        ct === 'donut' || ct === 'gauge' ? row('가운데 글자', text(el, 'centerText', ct === 'gauge' ? '비우면 값 표시' : '예: 75%')) : null,
        /^(bar|hbar|stacked|stacked100|combo)$/.test(ct) ? row('막대 둥글기', num(el, 'barRadius', { def: 6, min: 0 })) : null,
        row('애니메이션', check(el, 'chartAnim', '나타날 때 그리기'), num(el, 'chartDur', { def: 1400, min: 200, step: 100 }), h('span', { class: 'p-unit' }, 'ms')),
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn', onclick: () => Core.animateChart(document.querySelector(`#canvas .hp-el[data-id="${el.id}"]`), 0, el.chartDur) }, '▶ 그리기 미리보기'),
          h('button', { class: 'p-btn', title: '슬라이드를 복제하고 모핑을 설정합니다. 복제된 슬라이드에서 값을 바꾸면 막대·선이 새 값으로 이어서 움직입니다', onclick: () => App.morphSlide() }, '🔀 값 변화 모핑 만들기')),
        h('p', { class: 'p-hint' }, '💡 "값 변화 모핑": 다음 슬라이드에서 같은 차트의 값만 바꾸면 발표 때 막대·점·선이 새 값으로 부드럽게 바뀝니다.')));
    }

    if (el.type === 'code') {
      const ta = h('textarea', { class: 'p-area p-code', id: 'code-data', rows: 10, spellcheck: 'false', oninput: (e) => setEls('code', e.target.value), onchange: done });
      ta.value = el.code || '';
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      });
      body.appendChild(section('코드',
        row('언어', select(el, 'lang', Object.entries(Core.CODE_LANGS), { def: 'js' })),
        ta,
        row('색 테마', select(el, 'codeTheme', [['dark', '어둡게'], ['light', '밝게']], { def: 'dark', rebuild: true })),
        row('글자 크기', num(el, 'fontSize', { def: 30, min: 8 })),
        row('파일 이름', text(el, 'title', '예: app.js (비우면 숨김)')),
        row('', check(el, 'lineNumbers', '줄 번호', { rebuild: true })),
        row('줄 강조', text(el, 'highlightLines', '예: 2-3,5 (나머지는 흐리게)')),
        row('모서리', num(el, 'radius', { def: 18, min: 0 })),
        h('div', { class: 'p-btns wrap' },
          h('button', { class: 'p-btn primary', title: '슬라이드를 복제하고 모핑을 설정합니다', onclick: () => App.magicMoveFrom(el.id) }, '🪄 Magic Move 단계 만들기')),
        h('p', { class: 'p-hint' }, '🪄 Magic Move: 다음 슬라이드에서 코드를 고치면, 발표 때 바뀌지 않은 단어는 새 자리로 날아가고 바뀐 부분만 사라지고 나타납니다. 일반 텍스트도 같은 방식으로 단어 단위 모핑이 됩니다.')));
    }

    // 상호작용
    const act = el.action || { type: el.link ? (/^#slide-/.test(el.link) ? 'goto' : 'url') : 'none' };
    const setAct = (k, v, rebuild) => {
      if (!pending) { Store.checkpoint(); pending = true; }
      Store.selected().forEach((x) => { x.action = Object.assign({}, x.action || act, { [k]: v }); if (k === 'type') delete x.link; });
      P.suppress = !rebuild; Store.emit({ content: true }); P.suppress = false;
      if (rebuild) { pending = false; P.renderProps(); }
    };
    const others = Store.slide().elements.filter((x) => x.id !== el.id);
    const targetSel = () => h('select', { class: 'p-sel', onchange: (e) => setAct('target', e.target.value, true) },
      [h('option', { value: '' }, '— 대상 요소 선택 —')].concat(others.map((x) => h('option', { value: x.id, selected: act.target === x.id }, elLabel(x) + (x.startHidden ? ' (처음 숨김)' : '')))));
    const actSec = section('상호작용 (발표 중 클릭)',
      row('클릭하면', h('select', { class: 'p-sel', onchange: (e) => setAct('type', e.target.value, true) }, Object.entries(Core.ACTIONS).map(([k, l]) => h('option', { value: k, selected: act.type === k }, l)))));
    if (act.type === 'goto') actSec.appendChild(row('슬라이드', h('input', { type: 'number', class: 'p-num', min: 1, max: Store.deck.slides.length, value: act.slide || (el.link ? +(el.link.match(/\d+/) || [1])[0] : 1), onchange: (e) => setAct('slide', +e.target.value) }), h('span', { class: 'p-unit' }, `/ ${Store.deck.slides.length}`)));
    if (act.type === 'url') actSec.appendChild(row('주소', h('input', { type: 'url', class: 'p-text', value: act.url || el.link || '', placeholder: 'https://', onchange: (e) => setAct('url', e.target.value.trim()) })));
    if (['toggle', 'show', 'hide', 'play'].includes(act.type)) actSec.appendChild(row('대상', targetSel()));
    if (act.type === 'answer') {
      actSec.appendChild(row('', h('label', { class: 'p-check' }, h('input', { type: 'checkbox', checked: !!act.correct, onchange: (e) => setAct('correct', e.target.checked, true) }), '이 보기가 정답')));
      actSec.appendChild(row('정답 시 표시', targetSel()));
    }
    actSec.appendChild(row('마우스 올리면', select(el, 'hover', Object.entries(Core.HOVERS), { def: 'none' })));
    actSec.appendChild(row('', check(el, 'startHidden', '처음에는 숨김 (버튼으로 보이기)', { rebuild: true })));
    actSec.appendChild(h('p', { class: 'p-hint' }, '버튼으로 슬라이드 이동, 숨긴 내용 펼치기, 동영상 재생, 퀴즈(정답 시 축하 효과)를 만들 수 있습니다. ⚡ 표시가 있는 요소에 동작이 있습니다.'));
    body.appendChild(actSec);

    body.appendChild(section('정렬과 순서',
      row('슬라이드 기준', btns([['⇤', () => App.alignSel('left'), false, '왼쪽'], ['↔', () => App.alignSel('center'), false, '가로 가운데'], ['⇥', () => App.alignSel('right'), false, '오른쪽'], ['⤒', () => App.alignSel('top'), false, '위'], ['↕', () => App.alignSel('middle'), false, '세로 가운데'], ['⤓', () => App.alignSel('bottom'), false, '아래']])),
      multi ? row('간격 균등', btns([['가로', () => App.distribute('h')], ['세로', () => App.distribute('v')]])) : null,
      row('순서', btns([['맨 앞', () => App.arrange('front')], ['앞', () => App.arrange('forward')], ['뒤', () => App.arrange('backward')], ['맨 뒤', () => App.arrange('back')]])),
      h('div', { class: 'p-btns wrap' },
        h('button', { class: 'p-btn', onclick: () => App.duplicate() }, '⧉ 복제'),
        h('button', { class: 'p-btn', onclick: () => App.toggleLock() }, el.locked ? '🔓 잠금 해제' : '🔒 잠금'),
        h('button', { class: 'p-btn danger', onclick: () => App.deleteSel() }, '🗑 삭제'))));
  }

  // 텍스트의 Magic Move 칸: 앞 슬라이드와의 연결 상태 + 다음 단계 만들기
  function magicSection(el) {
    const deck = Store.deck, i = Store.cur, slide = Store.slide();
    const words = (html) => { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|div|li)>/gi, ' '); return d.textContent.split(/\s+/).filter(Boolean); };
    let status = null;
    if (i > 0 && slide.transition && slide.transition.type === 'morph') {
      const o = morphPairs(deck.slides[i - 1], slide).get(el.id);
      if (!o) status = h('div', { class: 'mm-status none' }, `앞 슬라이드(#${i})에 이어지는 텍스트가 없습니다 — 이 텍스트는 새로 나타납니다`);
      else {
        const a = words(o.html), b = words(el.html);
        const keep = Core.matchTokens(a, b).length;
        if (a.join(' ') === b.join(' ')) status = h('div', { class: 'mm-status same' }, `🔗 앞 슬라이드(#${i})와 연결됨 · 내용이 같아서 위치·크기·색만 이어서 변형됩니다`);
        else status = h('div', { class: 'mm-status on' }, h('b', null, `🪄 앞 슬라이드(#${i})와 연결됨`),
          h('div', { class: 'mm-counts' },
            h('span', { class: 'k' }, `이어서 움직임 ${keep}`), h('span', { class: 'a' }, `새로 나타남 ${b.length - keep}`), h('span', { class: 'r' }, `사라짐 ${a.length - keep}`)));
      }
    }
    return section('🪄 Magic Move',
      status,
      h('button', { class: 'p-btn primary wide', onclick: () => App.magicMoveFrom(el.id) }, '🪄 이 텍스트로 다음 단계 만들기'),
      h('p', { class: 'p-hint' }, '누르면 다음 슬라이드가 만들어지고 이 텍스트가 바로 편집 상태가 됩니다. 내용을 고치면 발표 때 그대로 둔 단어는 새 자리로 날아가고, 바뀐 단어만 사라지고 나타납니다. (띄어쓰기 단위로 비교)'));
  }

  function setOne(key, val) { setEls(key, val, { rebuild: true }); done(); }
  function toggle(key) {
    if (Editor.editing) { document.execCommand(key); return; }
    const v = !Store.selected()[0][key];
    setEls(key, v, { rebuild: true }); done();
  }
  function bump(d) {
    Store.checkpoint();
    Store.selected().forEach((el) => { el.fontSize = Math.max(6, (el.fontSize || 32) + d); });
    Store.emit({ content: true });
  }
  P.bump = bump;
  P.toggle = toggle;

  P.focusCode = function () {
    P.showTab('props');
    const t = document.getElementById('code-data');
    if (t) { t.focus(); t.scrollIntoView({ block: 'center' }); }
  };

  P.focusTable = function () {
    P.showTab('props');
    const t = document.getElementById('table-data');
    if (t) t.focus();
  };

  /* ---------- 애니메이션 패널 ---------- */
  let animCat = 'in';
  function renderAnimPanel() {
    const body = document.querySelector('[data-pane="anim"] .pane-body');
    body.innerHTML = '';
    const slide = Store.slide();
    const sel = Store.selected();
    body.appendChild(h('div', { class: 'p-btns wrap' },
      h('button', { class: 'p-btn primary', onclick: () => Editor.preview() }, '▶ 미리보기'),
      h('button', { class: 'p-btn', onclick: () => App.autoAnimate() }, '⚡ 자동 적용'),
      slide.anims.length ? h('button', { class: 'p-btn danger', onclick: () => { Store.checkpoint(); slide.anims = []; Store.emit({ content: true }); } }, '모두 제거') : null));

    const grid = h('div', { class: 'anim-grid' });
    Object.entries(Core.ANIMS).filter(([, d]) => d.cat === animCat).forEach(([k, d]) => {
      grid.appendChild(h('button', {
        class: 'anim-btn', title: d.label,
        onclick: () => App.addAnim(k),
        onmouseenter: (e) => demo(e.currentTarget.querySelector('i'), k),
      }, h('i', null, '■'), h('span', null, d.label)));
    });
    body.appendChild(section(sel.length ? `효과 추가 — 선택한 ${sel.length}개 요소` : '효과 추가 (먼저 요소를 선택하세요)',
      h('div', { class: 'seg' }, Object.entries(Core.ANIM_CATS).map(([k, l]) => h('button', { class: animCat === k ? 'on' : '', onclick: () => { animCat = k; renderAnimPanel(); } }, l))),
      grid));

    const list = h('div', { class: 'anim-list' });
    const groups = Core.buildGroups(slide);
    let gi = 0;
    const gOf = {};
    groups.forEach((g, i) => g.items.forEach((it) => { gOf[it.a.id] = g.auto ? '자동' : String(i + (groups[0] && groups[0].auto ? 0 : 1)); }));
    slide.anims.forEach((a, i) => {
      const el = slide.elements.find((x) => x.id === a.elId);
      if (!el) return;
      const def = Core.ANIMS[a.effect] || {};
      const upd = (k, v, rebuild) => { Store.checkpoint(); a[k] = v; P.suppress = !rebuild; Store.emit({ content: true }); P.suppress = false; if (rebuild) renderAnimPanel(); };
      const effSel = h('select', { class: 'p-sel', onchange: (e) => upd('effect', e.target.value, true) },
        Object.entries(Core.ANIM_CATS).map(([ck, cl]) => h('optgroup', { label: cl },
          Object.entries(Core.ANIMS).filter(([, d]) => d.cat === ck).map(([k, d]) => h('option', { value: k, selected: k === a.effect }, d.label)))));
      const card = h('div', { class: 'anim-item cat-' + def.cat + (Store.sel.includes(el.id) ? ' on' : '') },
        h('div', { class: 'anim-top' },
          h('span', { class: 'anim-step', title: '클릭 단계' }, gOf[a.id] || ''),
          h('span', { class: 'anim-el', onclick: () => Store.select([el.id]) }, elLabel(el)),
          h('button', { class: 'p-mini', title: '위로', onclick: () => moveAnim(i, -1) }, '↑'),
          h('button', { class: 'p-mini', title: '아래로', onclick: () => moveAnim(i, 1) }, '↓'),
          h('button', { class: 'p-mini', title: '삭제', onclick: () => { Store.checkpoint(); slide.anims.splice(i, 1); Store.emit({ content: true }); } }, '✕')),
        effSel,
        h('div', { class: 'anim-opts' },
          h('select', { class: 'p-sel', onchange: (e) => upd('trigger', e.target.value, true) },
            [['click', '클릭할 때'], ['with', '이전과 함께'], ['after', '이전 다음에']].map(([v, l]) => h('option', { value: v, selected: a.trigger === v }, l))),
          h('label', null, '시간', h('input', { type: 'number', class: 'p-num', value: (a.duration / 1000).toFixed(1), step: 0.1, min: 0.1, onchange: (e) => upd('duration', Math.round(+e.target.value * 1000)) }), '초'),
          h('label', null, '지연', h('input', { type: 'number', class: 'p-num', value: ((a.delay || 0) / 1000).toFixed(1), step: 0.1, min: 0, onchange: (e) => upd('delay', Math.round(+e.target.value * 1000)) }), '초'),
          def.loop ? null : h('label', null, '반복', h('input', { type: 'number', class: 'p-num', value: a.repeat || 1, step: 1, min: 1, max: 20, onchange: (e) => upd('repeat', Math.max(1, +e.target.value)) }), '회'),
          def.special === 'draw' ? h('select', { class: 'p-sel', title: '선 그리기 꾸밈', onchange: (e) => upd('drawFx', e.target.value === 'none' ? undefined : e.target.value, true) },
            Object.entries(Core.DRAW_FX).map(([v, l]) => h('option', { value: v, selected: (a.drawFx || 'none') === v }, '✨ ' + l))) : null,
          def.special === 'draw' ? h('select', { class: 'p-sel', title: '그려 나가는 방향', onchange: (e) => upd('drawDir', e.target.value === 'forward' ? undefined : e.target.value, true) },
            Object.entries(Core.DRAW_DIRS).map(([v, l]) => h('option', { value: v, selected: (a.drawDir || 'forward') === v }, '↦ ' + l))) : null,
          def.special === 'rows' ? h('select', { class: 'p-sel', title: '두 번째 행부터 나오는 방식', onchange: (e) => upd('rowTrigger', e.target.value === 'click' ? undefined : e.target.value, true) },
            [['click', '다음 행: 클릭할 때마다'], ['after', '다음 행: 이어서 자동']].map(([v, l]) => h('option', { value: v, selected: (a.rowTrigger || 'click') === v }, l))) : null,
          def.cat === 'in' ? h('label', { title: def.special === 'rows' ? '다음 행이 나오면 앞 행을 흐리게 해 지금 설명하는 행에 시선이 가게 합니다' : '다음 클릭 내용이 나오면 이 요소를 흐리게 해 지금 설명하는 항목에 시선이 가게 합니다' }, h('input', { type: 'checkbox', checked: !!a.dim, onchange: (e) => upd('dim', e.target.checked || undefined) }), def.special === 'rows' ? '지난 행 흐리게' : '다음 클릭 때 흐리게') : null));
      list.appendChild(card);
      gi++;
    });
    body.appendChild(section(`애니메이션 순서 (${slide.anims.length})`, gi ? list : h('p', { class: 'p-hint' }, '아직 애니메이션이 없습니다. 요소를 선택하고 위에서 효과를 고르세요.'),
      gi ? h('label', { class: 'p-check', title: '클릭으로 나온 항목이 다음 클릭 때 모두 흐려집니다 (처음에 자동으로 나오는 제목 등은 제외)' },
        h('input', { type: 'checkbox', checked: !!slide.dimPrev, onchange: (e) => { Store.checkpoint(); if (e.target.checked) slide.dimPrev = true; else delete slide.dimPrev; Store.emit({ content: true }); } }),
        ' 🔦 지난 항목 흐리게 (이 슬라이드 전체) — 지금 말하는 항목만 밝게') : null));
    body.appendChild(h('p', { class: 'p-hint' }, '발표 중에는 "클릭할 때" 항목마다 클릭/→ 키로 진행합니다. "이전과 함께"는 동시에, "이전 다음에"는 이어서 실행됩니다.'));
  }

  function moveAnim(i, d) {
    const a = Store.slide().anims;
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    Store.checkpoint();
    [a[i], a[j]] = [a[j], a[i]];
    Store.emit({ content: true });
  }

  function demo(node, key) {
    const def = Core.ANIMS[key];
    if (!node || !def) return;
    node.getAnimations().forEach((x) => x.cancel());
    const fake = { x: 0, y: 0, w: 30, h: 30 };
    const kf = def.kf(fake, { width: 60, height: 60 }).map((f) => {
      const o = Object.assign({}, f);
      if (o.transform) o.transform = o.transform.replace(/translate([XY])\((-?[\d.]+)px\)/g, (m, ax, v) => `translate${ax}(${Math.max(-30, Math.min(30, +v))}px)`);
      return o;
    });
    node.animate(kf, { duration: 800, easing: def.easing || 'ease-out', iterations: def.loop ? 2 : 1 });
  }

  /* ---------- 슬라이드 패널 ---------- */
  function renderSlidePanel() {
    const body = document.querySelector('[data-pane="slide"] .pane-body');
    body.innerHTML = '';
    const deck = Store.deck, slide = Store.slide();
    const bg = slide.bg || (slide.bg = { type: 'color', color: '#ffffff' });
    const setBg = (k, v, rebuild) => { if (!pending) { Store.checkpoint(); pending = true; } bg[k] = v; P.suppress = !rebuild; Store.emit({ content: true }); P.suppress = false; if (rebuild) { pending = false; renderSlidePanel(); } };

    const bgSec = section('배경',
      h('div', { class: 'seg' }, [['color', '단색'], ['gradient', '그라데이션'], ['image', '이미지'], ['video', '동영상']].map(([v, l]) =>
        h('button', { class: bg.type === v ? 'on' : '', onclick: () => setBg('type', v, true) }, l))));
    if (bg.type === 'color' || !bg.type) {
      bgSec.appendChild(row('색', h('input', { type: 'color', class: 'p-color', value: toHex(bg.color || '#ffffff'), oninput: (e) => setBg('color', e.target.value), onchange: done })));
      bgSec.appendChild(h('div', { class: 'swatches' }, ['#ffffff', '#f8f9fa', '#f1f3f5', '#fff9db', '#e7f5ff', '#ebfbee', '#fff0f6', '#212529', '#0f1729', '#1b2a4a', '#2b2d42', '#000000'].map((c) =>
        h('button', { style: `background:${c}`, title: c, onclick: () => setBg('color', c, true) }))));
    }
    if (bg.type === 'gradient') {
      bgSec.appendChild(h('div', { class: 'grad-grid' }, BG_PRESETS.map((g) => h('button', { style: `background:${g}`, class: bg.gradient === g ? 'on' : '', onclick: () => setBg('gradient', g, true) }))));
      const gc = h('div', { class: 'grad-custom' });
      const ga = h('input', { type: 'color', value: '#667eea' }), gb = h('input', { type: 'color', value: '#764ba2' });
      const ang = h('input', { type: 'number', value: 135, class: 'p-num', step: 15 });
      const mk = () => setBg('gradient', `linear-gradient(${ang.value}deg,${ga.value} 0%,${gb.value} 100%)`);
      [ga, gb, ang].forEach((x) => { x.oninput = mk; x.onchange = done; });
      gc.append('직접: ', ga, gb, ang, '°');
      bgSec.appendChild(gc);
      bgSec.appendChild(h('input', { type: 'text', class: 'p-text', value: bg.gradient || '', placeholder: 'CSS gradient', onchange: (e) => setBg('gradient', e.target.value, true) }));
    }
    if (bg.type === 'image' || bg.type === 'video') {
      bgSec.appendChild(h('div', { class: 'p-btns wrap' },
        h('button', { class: 'p-btn primary', onclick: () => App.pickBg(bg.type) }, bg.src ? '파일 바꾸기' : '파일 선택…'),
        h('button', { class: 'p-btn', onclick: () => { const u = prompt('이미지/동영상 URL'); if (u) setBg('src', u.trim(), true); } }, 'URL 입력')));
      bgSec.appendChild(row('맞춤', h('select', { class: 'p-sel', onchange: (e) => setBg('fit', e.target.value, true) }, [['cover', '채우기'], ['contain', '맞추기']].map(([v, l]) => h('option', { value: v, selected: (bg.fit || 'cover') === v }, l)))));
      if (bg.type === 'video') {
        bgSec.appendChild(row('재생 속도', h('select', { class: 'p-sel', onchange: (e) => setBg('speed', +e.target.value === 1 ? undefined : +e.target.value, true) },
          [[0.25, '0.25× 아주 느리게'], [0.5, '0.5× 슬로모션'], [0.75, '0.75×'], [1, '1× 보통'], [1.25, '1.25×'], [1.5, '1.5×']].map(([v, l]) => h('option', { value: v, selected: (+bg.speed || 1) === v }, l)))));
        bgSec.appendChild(row('흐림', h('div', { class: 'p-range' }, h('input', { type: 'range', min: 0, max: 30, step: 1, value: bg.blur || 0, oninput: (e) => setBg('blur', +e.target.value || undefined), onchange: done }))));
        bgSec.appendChild(row('구간(초)', h('div', { class: 'p-inline' },
          h('input', { type: 'number', class: 'p-num', min: 0, step: 0.5, value: bg.start || 0, title: '시작', onchange: (e) => setBg('start', +e.target.value || undefined, true) }), ' ~ ',
          h('input', { type: 'number', class: 'p-num', min: 0, step: 0.5, value: bg.end || '', placeholder: '끝', title: '끝 (비우면 영상 끝까지)', onchange: (e) => setBg('end', +e.target.value || undefined, true) }))));
        bgSec.appendChild(h('label', { class: 'p-check', title: '배경 영상의 소리를 냅니다 (배경음악과 겹치지 않게 주의)' },
          h('input', { type: 'checkbox', checked: !!bg.sound, onchange: (e) => setBg('sound', e.target.checked || undefined, true) }), ' 🔊 영상 소리 켜기'));
        if (bg.sound) bgSec.appendChild(row('소리 크기', h('div', { class: 'p-range' }, h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: bg.volume != null ? bg.volume : 0.6, oninput: (e) => setBg('volume', +e.target.value), onchange: done }))));
        bgSec.appendChild(h('label', { class: 'p-check', title: '앞 슬라이드와 같은 영상이면 처음부터 다시 틀지 않고 이어서 재생합니다' },
          h('input', { type: 'checkbox', checked: bg.continue !== false, onchange: (e) => setBg('continue', e.target.checked ? undefined : false, true) }), ' ⏯ 앞 슬라이드에서 이어 재생'));
        bgSec.appendChild(h('p', { class: 'p-hint' }, '무료 배경 영상: Pexels·Pixabay·Mixkit 의 "loop background" 검색. 글자 위에 쓰려면 "어둡게"를 0.3~0.5 로.'));
      }
      bgSec.appendChild(row('어둡게', h('div', { class: 'p-range' }, h('input', { type: 'range', min: 0, max: 0.9, step: 0.05, value: bg.overlay || 0, oninput: (e) => setBg('overlay', +e.target.value), onchange: done }))));
      bgSec.appendChild(row('바탕색', h('input', { type: 'color', class: 'p-color', value: toHex(bg.color || '#000000'), oninput: (e) => setBg('color', e.target.value), onchange: done })));
    }
    bgSec.appendChild(h('div', { class: 'p-btns wrap' },
      h('button', { class: 'p-btn', onclick: () => { Store.checkpoint(); const j = JSON.stringify(bg); deck.slides.forEach((s) => { s.bg = JSON.parse(j); }); Store.emit({ content: true, structure: true }); UI.toast('모든 슬라이드에 배경을 적용했습니다'); } }, '모든 슬라이드에 적용'),
      h('button', { class: 'p-btn', onclick: () => { Store.checkpoint(); const t = deckTheme(deck); slide.bg = JSON.parse(JSON.stringify(t.bg)); Store.emit({ content: true }); renderSlidePanel(); } }, '테마 배경으로')));
    body.appendChild(bgSec);

    // 배경음악 (이 슬라이드에서 나올 곡)
    const bgm = deck.bgm && deck.bgm.tracks && deck.bgm.tracks.length ? deck.bgm : null;
    const musicSec = section('🎵 배경음악',
      bgm ? row('이 슬라이드', h('select', { class: 'p-sel', onchange: (e) => { Store.checkpoint(); if (e.target.value) slide.music = e.target.value; else delete slide.music; Store.emit({ content: true }); renderSlidePanel(); } },
        [h('option', { value: '' }, '🔇 음악 없음')].concat(bgm.tracks.map((t) => h('option', { value: t.id, selected: slide.music === t.id }, '🎵 ' + (t.title || '음악')))))) : h('p', { class: 'p-hint' }, '아직 배경음악이 없습니다. 음악을 추가하고 나올 슬라이드를 정하세요.'),
      bgm ? h('div', { class: 'music-strip', title: '슬라이드별 음악 (색 = 곡)' }, deck.slides.map((s2, k) => {
        const tr = bgm.tracks.find((t) => t.id === s2.music);
        return h('i', { class: k === Store.cur ? 'on' : '', style: tr ? 'background:' + (tr.color || '#845ef7') : '', title: '#' + (k + 1) + ' ' + (tr ? tr.title : '음악 없음'), onclick: () => Store.goto(k) });
      })) : null,
      h('div', { class: 'p-btns wrap' }, h('button', { class: 'p-btn primary', onclick: () => App.musicDialog() }, '🎵 배경음악 설정…')));
    body.appendChild(musicSec);

    const pickFx = (k) => {
      if (!pending) { Store.checkpoint(); pending = true; }
      const pc = Core.BG_FX_COLORS[k];
      if (pc) { bg.fxColor = pc[0]; bg.fxColor2 = pc[1]; }
      setBg('fx', k, true);
    };
    const fxSel = h('select', { class: 'p-sel', onchange: (e) => pickFx(e.target.value) },
      h('option', { value: 'none', selected: !bg.fx || bg.fx === 'none' }, '없음'),
      Core.BG_FX_CATS.map(([cat, keys]) => h('optgroup', { label: cat }, keys.map((k) => h('option', { value: k, selected: bg.fx === k }, Core.BG_FX[k])))));
    const fxSec = section('움직이는 배경',
      row('효과', fxSel),
      h('div', { class: 'p-btns wrap' }, h('button', { class: 'p-btn primary', onclick: () => P.fxGallery(pickFx) }, '🎞 효과 미리보기 갤러리')));
    if (bg.fx && bg.fx !== 'none') {
      fxSec.appendChild(row('색 1', h('input', { type: 'color', class: 'p-color', value: toHex(bg.fxColor || '#ffffff'), oninput: (e) => setBg('fxColor', e.target.value), onchange: () => { done(); renderSlidePanel(); } }),
        '색 2', h('input', { type: 'color', class: 'p-color', value: toHex(bg.fxColor2 || '#ff6ec7'), oninput: (e) => setBg('fxColor2', e.target.value), onchange: () => { done(); renderSlidePanel(); } })));
      fxSec.appendChild(row('속도', h('select', { class: 'p-sel', onchange: (e) => setBg('fxSpeed', +e.target.value, true) }, [[0.5, '느리게'], [1, '보통'], [1.5, '빠르게'], [2.5, '매우 빠르게']].map(([v, l]) => h('option', { value: v, selected: (+bg.fxSpeed || 1) === v }, l)))));
      if (bg.fx === 'flow') fxSec.appendChild(h('p', { class: 'p-hint' }, '그라데이션 배경일 때 가장 잘 보입니다. 단색 배경이면 색 1·2 로 그라데이션을 만듭니다.'));
    }
    fxSec.appendChild(h('div', { class: 'p-btns wrap' },
      h('button', { class: 'p-btn', onclick: () => { Store.checkpoint(); deck.slides.forEach((s) => { s.bg = s.bg || {}; s.bg.fx = bg.fx; s.bg.fxColor = bg.fxColor; s.bg.fxColor2 = bg.fxColor2; s.bg.fxSpeed = bg.fxSpeed; }); Store.emit({ content: true, structure: true }); UI.toast('모든 슬라이드에 배경 효과를 적용했습니다'); } }, '모든 슬라이드에 적용')));
    body.appendChild(fxSec);

    const tr = slide.transition || (slide.transition = { type: 'none', duration: 700 });
    const trSel = h('select', { class: 'p-sel', onchange: (e) => { Store.checkpoint(); tr.type = e.target.value; Store.emit({ content: true }); } },
      Object.entries(Core.TRANSITIONS).map(([k, d]) => h('option', { value: k, selected: tr.type === k }, d.label)));
    body.appendChild(section('화면 전환',
      row('효과', trSel),
      row('시간', h('input', { type: 'number', class: 'p-num', value: ((tr.duration || 700) / 1000).toFixed(1), step: 0.1, min: 0.1, onchange: (e) => { Store.checkpoint(); tr.duration = Math.round(+e.target.value * 1000); Store.emit({ content: true }); } }), h('span', { class: 'p-unit' }, '초')),
      h('div', { class: 'p-btns wrap' },
        h('button', { class: 'p-btn', onclick: () => App.previewTransition() }, '▶ 전환 미리보기'),
        h('button', { class: 'p-btn', title: '현재 슬라이드를 복제하고 모핑 전환을 설정합니다', onclick: () => App.morphSlide() }, '🔀 모핑 슬라이드 만들기'),
        h('button', { class: 'p-btn', onclick: () => { Store.checkpoint(); deck.slides.forEach((s) => { s.transition = Object.assign({}, tr); }); Store.emit({ content: true }); UI.toast('모든 슬라이드에 전환을 적용했습니다'); } }, '모두 적용'),
        h('button', { class: 'p-btn', onclick: () => { Store.checkpoint(); const keys = Object.keys(Core.TRANSITIONS).filter((k) => k !== 'none'); deck.slides.forEach((s) => { s.transition = { type: keys[Math.floor(Math.random() * keys.length)], duration: tr.duration || 700 }; }); Store.emit({ content: true }); renderSlidePanel(); UI.toast('슬라이드마다 무작위 전환을 적용했습니다'); } }, '🎲 무작위'))));

    body.appendChild(section('자동 재생 / 동영상 만들기',
      row('이 슬라이드', h('input', { type: 'number', class: 'p-num', value: slide.duration || deck.autoDuration || 5, min: 1, step: 0.5, onchange: (e) => { Store.checkpoint(); slide.duration = +e.target.value; Store.emit({ content: true }); } }), h('span', { class: 'p-unit' }, '초 표시')),
      h('div', { class: 'p-btns wrap' },
        h('button', { class: 'p-btn', onclick: () => { Store.checkpoint(); deck.slides.forEach((s) => { s.duration = slide.duration || 5; }); Store.emit({ content: true }); UI.toast('모든 슬라이드에 적용했습니다'); } }, '모든 슬라이드에 적용'),
        h('button', { class: 'p-btn primary', onclick: () => App.makeVideo() }, '🎬 동영상으로 녹화')),
      h('p', { class: 'p-hint' }, '자동 재생으로 발표를 시작하고 화면 녹화를 켜면 WebM 동영상 파일로 저장됩니다. 녹화 창 선택에서 "이 탭"을 선택하세요.')));

    const themeGrid = h('div', { class: 'theme-grid' }, Object.entries(THEMES).map(([k, t]) =>
      h('button', { class: 'theme-card' + (deck.theme.id === k ? ' on' : ''), style: `background:${t.bg.gradient || t.bg.color}`, onclick: () => App.setTheme(k) },
        h('b', { style: `color:${t.title};font-family:${t.fontTitle}` }, '가나 Aa'),
        h('i', { style: `background:${t.accent}` }),
        h('span', { style: `color:${t.text}` }, t.name))));
    body.appendChild(section('테마 (전체 문서)', h('button', { class: 'p-btn wide', onclick: () => App.themeGallery('apply') }, '🎨 테마 한눈에 보기 (미리보기로 비교)'), themeGrid));

    body.appendChild(section('문서',
      row('제목', h('input', { type: 'text', class: 'p-text', value: deck.title, onchange: (e) => { Store.checkpoint(); deck.title = e.target.value; document.getElementById('doc-title').value = deck.title; Store.emit({}); } })),
      row('화면 비율', h('select', { class: 'p-sel', onchange: (e) => App.setAspect(e.target.value) }, Object.entries(ASPECTS).map(([k, a]) => h('option', { value: k, selected: deck.aspect === k }, a.label)))),
      h('p', { class: 'p-hint' }, `현재 크기: ${deck.width} × ${deck.height}px · 슬라이드 ${deck.slides.length}장`)));
  }

  return P;
})();
