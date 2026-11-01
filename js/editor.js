/* 캔버스 편집기: 렌더링, 선택, 이동, 크기 조절, 회전, 스냅, 인라인 텍스트 편집 */
const Editor = (() => {
  const E = {
    scale: 1,
    zoom: 'fit',
    editing: null,
    stopPreview: null,
    slideEl: null,
    onion: (() => { try { return localStorage.getItem('hppt.onion') !== '0'; } catch (e) { return true; } })(),
  };
  let wrap, stage, canvas, layer;

  E.init = function () {
    wrap = document.getElementById('stage-wrap');
    stage = document.getElementById('stage');
    canvas = document.getElementById('canvas');
    layer = document.getElementById('sel-layer');
    new ResizeObserver(() => { if (E.zoom === 'fit') E.fit(); }).observe(wrap);
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('dblclick', onDbl);
    wrap.addEventListener('contextmenu', onContext);
    wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('drop'); });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drop'));
    wrap.addEventListener('drop', onDrop);
    wrap.addEventListener('wheel', (e) => {
      if (orbitWheel(e)) return;
      if (!e.ctrlKey) return;
      e.preventDefault();
      E.setZoom(Math.max(0.1, Math.min(3, E.scale * (e.deltaY < 0 ? 1.1 : 0.9))));
    }, { passive: false });
    canvas.addEventListener('focusout', onFocusOut);
    canvas.addEventListener('keydown', (e) => { if (e.key === 'Escape' && E.editing) { e.preventDefault(); document.activeElement.blur(); } });
  };

  /* ---------- 렌더링 ---------- */
  E.render = function () {
    if (E.editing) return; // 인라인 편집 중에는 DOM 유지
    E.playing = null;
    if (E.stopPreview) { E.stopPreview(); E.stopPreview = null; }
    const deck = Store.deck, slide = Store.slide();
    canvas.style.width = deck.width + 'px';
    canvas.style.height = deck.height + 'px';
    const old = canvas.querySelector('.hp-slide');
    const s = Core.renderSlide(deck, slide, { mode: 'edit', resolve: Media.resolve });
    if (old) old.replaceWith(s); else canvas.insertBefore(s, layer);
    E.slideEl = s;
    E.fit();
    E.drawSelection();
    E.updateMorphBanner();
  };

  E.fit = function () {
    const deck = Store.deck;
    if (!deck) return;
    let s;
    wrap.style.overflow = E.zoom === 'fit' ? 'hidden' : 'auto';
    if (E.zoom === 'fit') {
      const pad = 50;
      s = Math.min((wrap.clientWidth - pad) / deck.width, (wrap.clientHeight - pad) / deck.height);
      s = Math.max(0.05, Math.floor(s * 1000) / 1000);
    } else s = E.zoom;
    E.scale = s;
    stage.style.width = deck.width * s + 'px';
    stage.style.height = deck.height * s + 'px';
    canvas.style.transform = `scale(${s})`;
    layer.style.setProperty('--inv', 1 / s);
    const zl = document.getElementById('zoom-label');
    if (zl) zl.textContent = Math.round(s * 100) + '%';
    if (window.Pen && Pen.mode) Pen.redraw();
  };

  E.setZoom = function (z) {
    E.zoom = z;
    E.fit();
  };

  /* ---------- 선택 표시 ---------- */
  E.drawSelection = function (guides) {
    layer.innerHTML = '';
    drawGhosts();
    const sel = Store.selected();
    sel.forEach((el) => {
      const b = document.createElement('div');
      b.className = 'sel-box' + (el.locked ? ' locked' : '');
      Object.assign(b.style, { left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px', transform: el.rotation ? `rotate(${el.rotation}deg)` : '' });
      if (sel.length === 1 && !el.locked && E.editing !== el.id) {
        ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach((d) => {
          const h = document.createElement('div');
          h.className = 'handle h-' + d;
          h.dataset.handle = d;
          b.appendChild(h);
        });
        const r = document.createElement('div');
        r.className = 'handle h-rot';
        r.dataset.handle = 'rot';
        r.title = '회전 (Shift: 15° 단위)';
        b.appendChild(r);
        if (el.type === 'video' && el.src) {
          const pb = document.createElement('button');
          pb.className = 'sel-play' + (E.playing === el.id ? ' on' : '');
          pb.title = E.playing === el.id ? '정지 (Space)' : '그 자리에서 재생 (Space)';
          pb.textContent = E.playing === el.id ? '⏸' : '▶';
          pb.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); });
          pb.addEventListener('click', (e) => { e.stopPropagation(); E.playInPlace(el); });
          b.appendChild(pb);
        }
        if (el.type === 'table') addTableDividers(b, el);
        const info = document.createElement('div');
        info.className = 'sel-info';
        info.textContent = `${Math.round(el.w)} × ${Math.round(el.h)}`;
        b.appendChild(info);
      }
      layer.appendChild(b);
    });
    (guides || []).forEach((g) => {
      const d = document.createElement('div');
      d.className = 'guide ' + g.axis;
      if (g.axis === 'v') d.style.left = g.pos + 'px'; else d.style.top = g.pos + 'px';
      layer.appendChild(d);
    });
  };

  /* ---------- 표: 열·행 경계를 끌어 너비·높이 조절 ---------- */
  // 요소 안 좌표(회전·확대와 무관한 px)로 위치를 잰다
  function localPos(node, root) {
    let x = 0, y = 0;
    while (node && node !== root) { x += node.offsetLeft + (node.clientLeft || 0); y += node.offsetTop + (node.clientTop || 0); node = node.offsetParent; }
    return { x, y };
  }
  function tableDom(el) {
    const w = domFor(el.id);
    const t = w && w.querySelector('table.hp-table');
    return t && t.rows.length ? { w, t } : null;
  }
  function addTableDividers(box, el) {
    const td = tableDom(el);
    if (!td) return;
    const { w, t } = td;
    const cells = Array.from(t.rows[0].cells);
    cells.slice(0, -1).forEach((c, i) => {
      const p = localPos(c, w);
      const d = document.createElement('div');
      d.className = 'tbl-div tbl-col';
      d.dataset.kind = 'col'; d.dataset.i = i;
      d.style.left = (p.x + c.offsetWidth) + 'px';
      d.title = '끌어서 열 너비 조절 · 더블클릭: 모든 열 같은 너비';
      box.appendChild(d);
    });
    Array.from(t.rows).slice(0, -1).forEach((r, i) => {
      const p = localPos(r, w);
      const d = document.createElement('div');
      d.className = 'tbl-div tbl-row';
      d.dataset.kind = 'row'; d.dataset.i = i;
      d.style.top = (p.y + r.offsetHeight) + 'px';
      d.title = '끌어서 행 높이 조절 · 더블클릭: 모든 행 같은 높이';
      box.appendChild(d);
    });
  }
  const pct = (arr) => { const sum = arr.reduce((a, b) => a + b, 0) || 1; return arr.map((v) => Math.round(v / sum * 1000) / 10); };
  function startTableDrag(e, el, kind, i) {
    const td = tableDom(el);
    if (!td || el.locked) return;
    const { t } = td;
    const col = kind === 'col';
    const sizes = col ? Array.from(t.rows[0].cells).map((c) => c.offsetWidth) : Array.from(t.rows).map((r) => r.offsetHeight);
    const s0 = sizes.slice();
    const th = ((el.rotation || 0) * Math.PI) / 180;
    const p0 = toSlide(e);
    // 행은 글자가 들어가는 높이보다 낮게 줄이지 않는다 (높이 없이 그린 복제본으로 잰다)
    let mins = sizes.map(() => 30);
    if (!col) {
      const probe = t.cloneNode(true);
      Object.assign(probe.style, { position: 'absolute', left: '0', top: '0', visibility: 'hidden', height: 'auto', width: t.offsetWidth + 'px' });
      Array.from(probe.rows).forEach((r) => { r.style.height = ''; });
      t.parentNode.appendChild(probe);
      mins = Array.from(probe.rows).map((r) => r.offsetHeight + 2);
      probe.remove();
    }
    let moved = false;
    wrap.setPointerCapture(e.pointerId);
    const apply = () => {
      const tt = tableDom(el);
      if (!tt) return;
      if (col) {
        let cg = tt.t.querySelector('colgroup');
        if (!cg) { cg = document.createElement('colgroup'); sizes.forEach(() => cg.appendChild(document.createElement('col'))); tt.t.insertBefore(cg, tt.t.firstChild); }
        const ps = pct(sizes);
        Array.from(cg.children).forEach((c, k) => { c.style.width = (ps[k] || 0) + '%'; });
      } else Array.from(tt.t.rows).forEach((r, k) => { r.style.height = sizes[k] + 'px'; });
    };
    const move = (ev) => {
      const p = toSlide(ev);
      const dxg = p.x - p0.x, dyg = p.y - p0.y;
      let d = col ? dxg * Math.cos(-th) - dyg * Math.sin(-th) : dxg * Math.sin(-th) + dyg * Math.cos(-th);
      if (!moved && Math.abs(d) * E.scale < 2) return;
      if (!moved) { Store.checkpoint(); moved = true; }
      d = Math.max(Math.min(0, mins[i] - s0[i]), Math.min(Math.max(0, s0[i + 1] - mins[i + 1]), d));
      sizes[i] = s0[i] + d; sizes[i + 1] = s0[i + 1] - d;
      apply();
      E.drawSelection();
      const ps = pct(sizes);
      tip((col ? '열 너비 ' : '행 높이 ') + `${i + 1}번 ${ps[i]}% · ${i + 2}번 ${ps[i + 1]}%`);
    };
    const up = () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerup', up);
      if (!moved) return;
      el[col ? 'colWidths' : 'rowHeights'] = pct(sizes).join(',');
      Store.emit({ content: true });
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', up);
  }

  /* ---------- 동영상 그 자리 재생 ---------- */
  E.playing = null;
  E.playInPlace = function (el) {
    if (!el || !E.slideEl) return;
    const w = E.slideEl.querySelector('.hp-el[data-id="' + el.id + '"]');
    const v = w && w.querySelector('video');
    if (!v) return;
    if (E.playing === el.id && !v.paused) { v.pause(); return; }
    const ts = +el.trimStart || 0, te = +el.trimEnd || 0;
    w.classList.add('hp-playing');
    v.muted = !!el.muted;
    if (v.currentTime < ts - 0.2 || (te && v.currentTime >= te - 0.05) || v.ended) v.currentTime = ts;
    if (!v.dataset.ipBound) {
      v.dataset.ipBound = '1';
      v.addEventListener('timeupdate', () => { const t = +el.trimEnd || 0; if (t && v.currentTime >= t && !v.paused) { v.pause(); v.currentTime = +el.trimStart || 0; } });
      v.addEventListener('pause', () => { if (E.playing === el.id) { E.playing = null; E.drawSelection(); } });
      v.addEventListener('ended', () => { E.playing = null; E.drawSelection(); });
    }
    E.playing = el.id;
    v.play().then(() => E.drawSelection()).catch(() => { v.muted = true; v.play().catch(() => {}); E.drawSelection(); });
  };

  /* ---------- 모핑 표시 ---------- */
  function morphInfo() {
    const deck = Store.deck, i = Store.cur, s = Store.slide();
    const ch = morphChain(deck, i);
    const morphIn = !!(i > 0 && s.transition && s.transition.type === 'morph');
    const pairs = morphIn ? morphPairs(deck.slides[i - 1], s) : new Map();
    return { ch, morphIn, pairs, i };
  }

  // 앞 슬라이드에서의 위치를 점선 상자 + 이동선으로 표시 (겹쳐 보기)
  function drawGhosts() {
    if (!E.onion || E.stopPreview) return;
    const { morphIn, pairs } = morphInfo();
    if (!morphIn || !pairs.size) return;
    const deck = Store.deck;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ghost-lines');
    svg.setAttribute('viewBox', `0 0 ${deck.width} ${deck.height}`);
    Store.slide().elements.forEach((cur) => {
      const o = pairs.get(cur.id);
      if (!o) return;
      const same = o.x === cur.x && o.y === cur.y && o.w === cur.w && o.h === cur.h && (o.rotation || 0) === (cur.rotation || 0);
      if (same) return;
      const g = document.createElement('div');
      g.className = 'ghost-box';
      Object.assign(g.style, { left: o.x + 'px', top: o.y + 'px', width: o.w + 'px', height: o.h + 'px', transform: o.rotation ? `rotate(${o.rotation}deg)` : '' });
      layer.appendChild(g);
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', o.x + o.w / 2); ln.setAttribute('y1', o.y + o.h / 2);
      ln.setAttribute('x2', cur.x + cur.w / 2); ln.setAttribute('y2', cur.y + cur.h / 2);
      svg.appendChild(ln);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', cur.x + cur.w / 2); dot.setAttribute('cy', cur.y + cur.h / 2); dot.setAttribute('r', 9);
      svg.appendChild(dot);
    });
    if (svg.childNodes.length) layer.insertBefore(svg, layer.firstChild);
  }

  E.toggleOnion = function () {
    E.onion = !E.onion;
    try { localStorage.setItem('hppt.onion', E.onion ? '1' : '0'); } catch (e) { /* ignore */ }
    E.drawSelection();
    E.updateMorphBanner();
  };

  E.updateMorphBanner = function () {
    const b = document.getElementById('morph-banner');
    if (!b) return;
    const { ch, morphIn, pairs, i } = morphInfo();
    if (!ch && !morphIn) { b.hidden = true; return; }
    b.hidden = false;
    b.classList.toggle('warn', morphIn && !pairs.size);
    let msg;
    if (morphIn && !pairs.size) msg = '<b>🔀 모핑 연결 끊김</b> · ⚠ 앞 슬라이드와 이어지는 요소가 없어 발표 때 페이드로 넘어갑니다 — 슬라이드 순서를 되돌리거나(Ctrl+Z), 앞 슬라이드를 <u>모핑 슬라이드 만들기</u>로 복제해 만드세요';
    else if (!morphIn || ch.pos === 0) msg = `<b>🔀 모핑 체인의 시작</b> · 다음 슬라이드(#${i + 2})로 이어서 변형됩니다`;
    else msg = `<b>🔀 모핑 슬라이드</b> · 체인 #${ch.start + 1}–#${ch.end + 1} 중 ${ch.pos + 1}/${ch.len}번째 · 앞 슬라이드(#${i})와 연결된 요소 <b>${pairs.size}개</b>`;
    b.innerHTML = '<span class="mb-text">' + msg + '</span>';
    const btn = (label, fn, on) => { const x = document.createElement('button'); x.className = 'mb-btn' + (on ? ' on' : ''); x.textContent = label; x.onclick = fn; b.appendChild(x); };
    if (morphIn) {
      btn('▶ 전환 미리보기', () => App.previewTransition());
      btn('👻 이전 위치 ' + (E.onion ? '숨기기' : '보기'), E.toggleOnion, E.onion);
    }
    btn('＋ 다음 모핑 슬라이드', () => App.morphSlide());
  };

  /* ---------- 좌표 ---------- */
  function toSlide(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / E.scale, y: (e.clientY - r.top) / E.scale };
  }

  function domFor(id) { return canvas.querySelector(`.hp-slide .hp-el[data-id="${id}"]`); }

  function applyDom(el) {
    const d = domFor(el.id);
    if (!d) return;
    d.style.left = el.x + 'px'; d.style.top = el.y + 'px';
    d.style.width = el.w + 'px'; d.style.height = el.h + 'px';
    d.style.transform = el.rotation ? `rotate(${el.rotation}deg)` : '';
  }

  /* ---------- 스냅 ---------- */
  function snapMove(bbox, ignore) {
    const deck = Store.deck, th = 7 / E.scale;
    const xs = [0, deck.width / 2, deck.width], ys = [0, deck.height / 2, deck.height];
    Store.slide().elements.forEach((o) => {
      if (ignore.has(o.id)) return;
      xs.push(o.x, o.x + o.w / 2, o.x + o.w);
      ys.push(o.y, o.y + o.h / 2, o.y + o.h);
    });
    const guides = [];
    let dx = 0, dy = 0;
    const tryAxis = (vals, cands, axis) => {
      let best = null;
      vals.forEach((v) => cands.forEach((c) => {
        const d = c - v;
        if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, pos: c };
      }));
      if (best) guides.push({ axis, pos: best.pos });
      return best ? best.d : 0;
    };
    dx = tryAxis([bbox.x, bbox.x + bbox.w / 2, bbox.x + bbox.w], xs, 'v');
    dy = tryAxis([bbox.y, bbox.y + bbox.h / 2, bbox.y + bbox.h], ys, 'h');
    return { dx, dy, guides };
  }

  /* ---------- 포인터 ---------- */
  function onDown(e) {
    if (e.button === 2) return;
    if (e.target.closest('.ctx-menu')) return;
    hideMenu();
    const p = toSlide(e);
    const tdv = e.target.closest('.tbl-div');
    if (tdv) { e.preventDefault(); e.stopPropagation(); const el = Store.selected()[0]; if (el) startTableDrag(e, el, tdv.dataset.kind, +tdv.dataset.i); return; }
    const handle = e.target.closest('.handle');
    if (handle) { e.preventDefault(); startTransform(e, handle.dataset.handle); return; }
    const elDom = e.target.closest('.hp-slide .hp-el');
    if (E.orbitId && (!elDom || elDom.dataset.id !== E.orbitId)) { E.orbitId = null; wrap.classList.remove('orbit-mode'); }
    if (E.editing) {
      if (elDom && elDom.dataset.id === E.editing) return; // 텍스트 선택 허용
      document.activeElement && document.activeElement.blur();
    }
    // 3D 모델: Alt+끌기(또는 돌리기 모드에서 그냥 끌기) → 보는 각도 돌리기
    if (elDom && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
      const m = Store.el(elDom.dataset.id);
      if (m && m.type === 'model' && (e.altKey || E.orbitId === m.id)) {
        e.preventDefault();
        if (!(Store.sel.length === 1 && Store.sel[0] === m.id)) Store.select([m.id]);
        startOrbit(e, m);
        return;
      }
    }
    if (elDom) {
      const id = elDom.dataset.id;
      let sel = Store.sel.slice();
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        sel = sel.includes(id) ? sel.filter((x) => x !== id) : sel.concat(id);
        Store.select(sel);
        return;
      }
      const wasSelected = sel.length === 1 && sel[0] === id;
      if (!sel.includes(id)) { sel = [id]; Store.select(sel); }
      startMove(e, p, wasSelected ? id : null);
    } else {
      if (!(e.shiftKey || e.ctrlKey)) Store.select([]);
      startMarquee(e, p);
    }
  }

  function startMove(e, p0, clickEditId) {
    const els = Store.selected().filter((x) => !x.locked);
    if (!els.length) return;
    const downAt = { x: e.clientX, y: e.clientY, t: Date.now() };
    const starts = els.map((x) => ({ x: x.x, y: x.y }));
    const ignore = new Set(els.map((x) => x.id));
    let moved = false;
    wrap.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const p = toSlide(ev);
      let dx = p.x - p0.x, dy = p.y - p0.y;
      if (!moved && Math.hypot(dx, dy) * E.scale < 3) return;
      if (!moved) { Store.checkpoint(); moved = true; }
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const minX = Math.min(...els.map((x, i) => starts[i].x)) + dx;
      const minY = Math.min(...els.map((x, i) => starts[i].y)) + dy;
      const maxX = Math.max(...els.map((x, i) => starts[i].x + x.w)) + dx;
      const maxY = Math.max(...els.map((x, i) => starts[i].y + x.h)) + dy;
      let snap = { dx: 0, dy: 0, guides: [] };
      if (!ev.altKey) snap = snapMove({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }, ignore);
      els.forEach((x, i) => { x.x = Math.round(starts[i].x + dx + snap.dx); x.y = Math.round(starts[i].y + dy + snap.dy); applyDom(x); });
      E.drawSelection(snap.guides);
    };
    const up = () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerup', up);
      if (moved) { Store.emit({ content: true }); return; }
      E.drawSelection();
      // 이미 선택된 텍스트를 한 번 더 클릭(끌지 않음) → 클릭한 위치에 커서를 두고 바로 편집
      if (clickEditId && Date.now() - downAt.t < 600) {
        const el = Store.el(clickEditId);
        if (el && isTextual(el) && !el.locked) E.startEdit(el.id, false, downAt);
      }
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', up);
  }

  /* ---------- 3D 모델 시점 (끌어서 돌리기 · 휠로 거리) ---------- */
  const DEG = 180 / Math.PI;
  const modelDom = (id) => canvas.querySelector(`.hp-slide .hp-el[data-id="${id}"] model-viewer`);
  // 자동 회전으로 돌아간 만큼을 카메라 각도에 합쳐, 보이는 그대로를 시작 시점으로 저장할 수 있게 한다
  function modelView(el) {
    const mv = modelDom(el.id);
    if (!mv || !mv.loaded || !mv.getCameraOrbit) { UI.toast('모델을 다 불러온 뒤에 돌릴 수 있습니다'); return null; }
    const o = mv.getCameraOrbit();
    const turn = mv.turntableRotation || 0;
    if (turn && mv.resetTurntableRotation) mv.resetTurntableRotation(0);
    const r = String(el.orbit || '').trim().split(/\s+/)[2] || 'auto';
    return { mv, th: o.theta - turn, ph: o.phi, r };
  }
  const orbitStr = (v) => {
    const th = Math.round(((((v.th * DEG + 180) % 360) + 360) % 360 - 180) * 10) / 10;
    return `${th}deg ${Math.round(v.ph * DEG * 10) / 10}deg ${v.r}`;
  };
  // 돌리는 동안 각도 표시 (알림 하나를 계속 고쳐 씀)
  let tipEl = null, tipT = 0;
  function tip(msg) {
    if (!tipEl || !tipEl.isConnected) { tipEl = document.createElement('div'); tipEl.className = 'toast'; document.getElementById('toasts').appendChild(tipEl); }
    tipEl.classList.remove('out');
    tipEl.textContent = msg;
    clearTimeout(tipT);
    tipT = setTimeout(() => { const t = tipEl; tipEl = null; t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 1500);
  }
  function showView(v) {
    v.mv.cameraOrbit = `${v.th}rad ${v.ph}rad ${v.r}`;
    if (v.mv.jumpCameraToGoal) v.mv.jumpCameraToGoal();
  }
  function saveView(el, v) {
    el.orbit = orbitStr(v);
    Store.emit({ content: true });
    // 바뀐 모습으로 썸네일도 다시 찍는다
    setTimeout(() => { try { const mv = modelDom(el.id); if (mv && Core.hooks.onModelPoster) Core.hooks.onModelPoster(el.id, mv.toDataURL('image/webp', 0.75)); } catch (err) { /* ignore */ } }, 300);
  }
  function startOrbit(e, el) {
    if (el.locked) return;
    const v = modelView(el);
    if (!v) return;
    const spin = v.mv.hasAttribute('auto-rotate');
    v.mv.removeAttribute('auto-rotate');
    const box = v.mv.getBoundingClientRect();
    const k = (2.2 * Math.PI) / Math.max(120, box.width);   // 상자 폭만큼 끌면 약 400°
    const x0 = e.clientX, y0 = e.clientY, th0 = v.th, ph0 = v.ph;
    let moved = false;
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add('orbiting');
    const move = (ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      if (!moved) { Store.checkpoint(); moved = true; }
      v.th = th0 - dx * k;
      v.ph = Math.max(22.5 / DEG, Math.min(157.5 / DEG, ph0 - dy * k));
      if (ev.shiftKey) { v.th = Math.round(v.th * DEG / 15) * 15 / DEG; v.ph = Math.round(v.ph * DEG / 15) * 15 / DEG; }
      showView(v);
      const [a, b] = orbitStr(v).split(' ');
      tip(`좌우 ${parseFloat(a)}° · 위아래 ${parseFloat(b)}°`);
    };
    const up = () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerup', up);
      wrap.classList.remove('orbiting');
      if (spin) v.mv.setAttribute('auto-rotate', '');
      if (moved) saveView(el, v);
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', up);
  }
  // Alt+휠(또는 돌리기 모드에서 휠): 가깝게/멀게
  let wheelSave = 0;
  function orbitWheel(e) {
    const elDom = e.target.closest && e.target.closest('.hp-slide .hp-el');
    const el = elDom && Store.el(elDom.dataset.id);
    if (!el || el.type !== 'model' || el.locked || !(e.altKey || E.orbitId === el.id)) return false;
    e.preventDefault();
    const v = modelView(el);
    if (!v) return true;
    let pct = /%$/.test(v.r) ? parseFloat(v.r) : 100;
    if (/m$/.test(v.r)) pct = 100;   // 미터로 저장된 거리는 기본 거리 기준 %로 바꿔 조절
    pct = Math.max(30, Math.min(300, Math.round(pct * (e.deltaY < 0 ? 0.92 : 1.08))));
    v.r = pct + '%';
    showView(v);
    tip(`거리 ${pct}%`);
    if (!wheelSave) Store.checkpoint();
    clearTimeout(wheelSave);
    wheelSave = setTimeout(() => { wheelSave = 0; saveView(el, v); }, 400);
    el.orbit = orbitStr(v);   // 저장 전에 다시 굴려도 이어지게
    return true;
  }
  // 돌리기 모드: 패널의 버튼으로 켜고 끈다 (다른 요소를 고르면 꺼짐)
  E.orbitId = null;
  E.toggleOrbit = function (id) {
    E.orbitId = E.orbitId === id ? null : id;
    wrap.classList.toggle('orbit-mode', !!E.orbitId);
    UI.toast(E.orbitId ? '돌리기 모드: 모델을 끌면 돌아가고, 휠로 가깝게/멀게 합니다' : '돌리기 모드를 껐습니다');
  };

  function startTransform(e, dir) {
    const el = Store.selected()[0];
    if (!el) return;
    Store.checkpoint();
    const s = { x: el.x, y: el.y, w: el.w, h: el.h, r: el.rotation || 0 };
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const p0 = toSlide(e);
    const th = (s.r * Math.PI) / 180;
    wrap.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const p = toSlide(ev);
      if (dir === 'rot') {
        let ang = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        if (ev.shiftKey) ang = Math.round(ang / 15) * 15;
        ang = ((Math.round(ang) % 360) + 360) % 360;
        if (ang > 180) ang -= 360;
        el.rotation = ang;
      } else {
        const dxg = p.x - p0.x, dyg = p.y - p0.y;
        const lx = dxg * Math.cos(-th) - dyg * Math.sin(-th);
        const ly = dxg * Math.sin(-th) + dyg * Math.cos(-th);
        let w = s.w, h = s.h;
        if (dir.includes('e')) w = s.w + lx;
        if (dir.includes('w')) w = s.w - lx;
        if (dir.includes('s')) h = s.h + ly;
        if (dir.includes('n')) h = s.h - ly;
        const corner = dir.length === 2;
        const keep = corner && ((el.type === 'image' || el.type === 'video' || el.type === 'embed') ? !ev.shiftKey : ev.shiftKey);
        if (keep) {
          const ratio = s.w / s.h;
          if (Math.abs(w / s.w) > Math.abs(h / s.h)) h = w / ratio; else w = h * ratio;
        }
        w = Math.max(10, w); h = Math.max(10, h);
        const dw = w - s.w, dh = h - s.h;
        let ox = 0, oy = 0;
        if (dir.includes('e')) ox = dw / 2;
        if (dir.includes('w')) ox = -dw / 2;
        if (dir.includes('s')) oy = dh / 2;
        if (dir.includes('n')) oy = -dh / 2;
        const gx = ox * Math.cos(th) - oy * Math.sin(th);
        const gy = ox * Math.sin(th) + oy * Math.cos(th);
        el.w = Math.round(w); el.h = Math.round(h);
        el.x = Math.round(cx + gx - w / 2); el.y = Math.round(cy + gy - h / 2);
      }
      applyDom(el);
      E.drawSelection();
    };
    const up = () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerup', up);
      Store.emit({ content: true });
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', up);
  }

  function startMarquee(e, p0) {
    const m = document.createElement('div');
    m.className = 'marquee';
    layer.appendChild(m);
    const base = Store.sel.slice();
    wrap.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const p = toSlide(ev);
      const x = Math.min(p.x, p0.x), y = Math.min(p.y, p0.y), w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
      Object.assign(m.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      if (w * E.scale < 4 && h * E.scale < 4) return;
      const ids = Store.slide().elements.filter((o) => o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y).map((o) => o.id);
      Store.sel = Array.from(new Set(base.concat(ids)));
      E.drawSelection();
      layer.appendChild(m);
    };
    const up = () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerup', up);
      m.remove();
      Store.select(Store.sel);
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', up);
  }

  /* ---------- 인라인 편집 ---------- */
  const isTextual = (el) => el.type === 'text' || (el.type === 'shape' && el.shape !== 'line');
  E.isTextual = isTextual;

  // 선택 상자/핸들 아래에 있는 실제 요소 찾기 (포인터 캡처 때문에 e.target 은 믿을 수 없음)
  function elAt(x, y) {
    const hits = document.elementsFromPoint(x, y);
    for (const h of hits) {
      const d = h.closest && h.closest('#canvas .hp-slide .hp-el');
      if (d) return d;
    }
    return null;
  }

  function onDbl(e) {
    if (E.editing) return;
    const tdv = e.target.closest && e.target.closest('.tbl-div');
    if (tdv) {
      const el = Store.selected()[0];
      if (el && el.type === 'table') { Store.checkpoint(); delete el[tdv.dataset.kind === 'col' ? 'colWidths' : 'rowHeights']; Store.emit({ content: true }); UI.toast(tdv.dataset.kind === 'col' ? '모든 열을 같은 너비로 맞췄습니다' : '모든 행을 같은 높이로 맞췄습니다'); }
      return;
    }
    const elDom = elAt(e.clientX, e.clientY);
    if (!elDom) return;
    const el = Store.el(elDom.dataset.id);
    if (!el) return;
    if (isTextual(el)) E.startEdit(el.id, false, { x: e.clientX, y: e.clientY });
    else if (el.type === 'image') App.replaceMedia(el, 'image');
    else if (el.type === 'video') App.replaceMedia(el, 'video');
    else if (el.type === 'embed') App.editEmbed(el);
    else if (el.type === 'model') App.addModel(el);
    else if (el.type === 'table') Panels.focusTable();
    else if (el.type === 'path') Pen.edit(el);
    else if (el.type === 'code') Panels.focusCode();
    else if (el.type === 'chart') App.chartDataEditor(el);
  }

  // selectAll: 전체 선택 / at: {x,y} 화면 좌표 → 그 위치에 커서
  E.startEdit = function (id, selectAll, at) {
    const d = domFor(id);
    if (!d) return;
    const tc = d.querySelector('.hp-tc');
    if (!tc) return;
    E.editing = id;
    Store.sel = [id];
    d.classList.add('editing');
    tc.contentEditable = 'true';
    tc.spellcheck = false;
    tc.focus();
    let r = null;
    if (at && !selectAll && document.caretRangeFromPoint) {
      const c = document.caretRangeFromPoint(at.x, at.y);
      if (c && tc.contains(c.startContainer)) r = c;
    }
    if (!r) {
      r = document.createRange();
      r.selectNodeContents(tc);
      if (!selectAll) r.collapse(false);
    }
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    E.drawSelection();
    document.body.classList.add('text-editing');
    App.showTextBar(id);
  };

  function onFocusOut(e) {
    const tc = e.target.closest && e.target.closest('.hp-tc');
    if (!tc || !E.editing) return;
    // 툴바/패널 버튼을 누르는 중이면 편집 유지
    setTimeout(() => {
      if (document.activeElement === tc) return;
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-keep-edit]')) return;
      E.commitEdit();
    }, 0);
  }

  E.commitEdit = function () {
    if (!E.editing) return;
    const id = E.editing;
    const d = domFor(id);
    const el = Store.el(id);
    E.editing = null;
    document.body.classList.remove('text-editing');
    App.hideTextBar();
    if (d && el) {
      const tc = d.querySelector('.hp-tc');
      tc.contentEditable = 'false';
      const html = cleanHtml(tc.innerHTML);
      if (html !== el.html) {
        Store.checkpoint();
        el.html = html;
        Store.emit({ content: true });
        return;
      }
    }
    E.render();
  };

  function cleanHtml(h) {
    return h.replace(/\s*<br>\s*$/, '').replace(/\n/g, '');
  }

  /* ---------- 드롭 ---------- */
  function onDrop(e) {
    e.preventDefault();
    wrap.classList.remove('drop');
    const files = Array.from(e.dataTransfer.files || []);
    const p = toSlide(e);
    if (files.length) { files.forEach((f, i) => App.insertFile(f, { x: p.x + i * 30, y: p.y + i * 30 })); return; }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && /^https?:/.test(url)) App.insertUrl(url.trim(), p);
  }

  /* ---------- 컨텍스트 메뉴 ---------- */
  let menuEl = null;
  function hideMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  E.hideMenu = hideMenu;

  function onContext(e) {
    e.preventDefault();
    const elDom = e.target.closest('.hp-slide .hp-el');
    if (elDom && !Store.sel.includes(elDom.dataset.id)) Store.select([elDom.dataset.id]);
    const has = Store.sel.length > 0;
    const items = has ? [
      ['잘라내기', 'Ctrl+X', () => App.cut()],
      ['복사', 'Ctrl+C', () => App.copy()],
      ['붙여넣기', 'Ctrl+V', () => App.pasteInternal()],
      ['복제', 'Ctrl+D', () => App.duplicate()],
      ['삭제', 'Del', () => App.deleteSel()],
      '-',
      ['맨 앞으로', 'Ctrl+Shift+]', () => App.arrange('front')],
      ['앞으로', 'Ctrl+]', () => App.arrange('forward')],
      ['뒤로', 'Ctrl+[', () => App.arrange('backward')],
      ['맨 뒤로', 'Ctrl+Shift+[', () => App.arrange('back')],
      '-',
      ...(Store.sel.length === 1 && (E.isTextual(Store.selected()[0]) || Store.selected()[0].type === 'code') ? [['🪄 Magic Move 다음 단계', '', () => App.magicMoveFrom(Store.sel[0])]] : []),
      ['애니메이션 추가…', '', () => Panels.showTab('anim')],
      [Store.selected()[0] && Store.selected()[0].locked ? '잠금 해제' : '잠금', '', () => App.toggleLock()],
    ] : [
      ['붙여넣기', 'Ctrl+V', () => App.pasteInternal()],
      ['텍스트 추가', '', () => App.addText()],
      ['이미지 삽입', '', () => App.pickFile('image')],
      ['동영상 삽입', '', () => App.pickFile('video')],
      '-',
      ['슬라이드 배경…', '', () => Panels.showTab('slide')],
      ['애니메이션 미리보기', '', () => E.preview()],
    ];
    hideMenu();
    menuEl = document.createElement('div');
    menuEl.className = 'ctx-menu';
    items.forEach((it) => {
      if (it === '-') { menuEl.appendChild(document.createElement('hr')); return; }
      const b = document.createElement('button');
      b.innerHTML = `<span>${it[0]}</span><kbd>${it[1]}</kbd>`;
      b.onclick = () => { hideMenu(); it[2](); };
      menuEl.appendChild(b);
    });
    document.body.appendChild(menuEl);
    const r = menuEl.getBoundingClientRect();
    menuEl.style.left = Math.min(e.clientX, innerWidth - r.width - 8) + 'px';
    menuEl.style.top = Math.min(e.clientY, innerHeight - r.height - 8) + 'px';
  }
  document.addEventListener('pointerdown', (e) => { if (menuEl && !e.target.closest('.ctx-menu')) hideMenu(); });

  /* ---------- 애니메이션 미리보기 ---------- */
  E.preview = function () {
    if (E.editing) E.commitEdit();
    E.render();
    layer.innerHTML = '';
    const slide = Store.slide();
    if (!slide.anims || !slide.anims.length) { UI.toast('이 슬라이드에는 애니메이션이 없습니다'); return; }
    document.body.classList.add('previewing');
    E.stopPreview = Core.previewAll(E.slideEl, slide, Store.deck, () => {
      document.body.classList.remove('previewing');
      setTimeout(() => { if (E.stopPreview) { E.stopPreview = null; E.render(); } }, 900);
    });
  };

  return E;
})();
