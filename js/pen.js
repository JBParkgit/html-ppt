/* 펜 툴 (일러스트레이터 방식) — 패스 그리기와 점 편집
 *  그리기: 클릭 = 모서리점, 끌기 = 곡선점(핸들), 첫 점 클릭 = 닫힌 도형, Enter/Esc/더블클릭 = 끝내기, Backspace = 마지막 점 지우기, Shift = 45° 단위
 *  편집 : 패스 더블클릭 → 앵커/핸들 끌기, Alt+핸들 = 한쪽만(모서리로 꺾기), 앵커 더블클릭 = 모서리↔곡선, 선 위 클릭 = 점 추가,
 *         Delete = 점 삭제, 방향키 = 점 이동, Esc/Enter/빈 곳 클릭 = 편집 끝
 *  좌표: el.pts 는 요소 안 좌표(px). 기준 크기 pw×ph 에서 요소 크기로 늘려 그린다. */
const Pen = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const P = { mode: null };
  let wrap, canvas, svg;
  // 그리기 상태
  let pts = [], drag = null, hover = null;
  // 편집 상태
  let el = null, selIdx = -1, changed = false, op = null;
  // 더블클릭은 브라우저 dblclick 대신 직접 판정 (누를 때 표시층을 다시 그려 dblclick 이 오지 않는 경우가 있음)
  let lastDown = null, dblDone = 0;
  const DBL_MS = 400;
  function isDouble(e, key) {
    const now = performance.now();
    const hit = lastDown && lastDown.key === key && now - lastDown.t < DBL_MS && Math.hypot(e.clientX - lastDown.cx, e.clientY - lastDown.cy) < 8;
    lastDown = hit ? null : { t: now, cx: e.clientX, cy: e.clientY, key };
    if (hit) dblDone = now;
    return hit;
  }

  const inv = () => 1 / (Editor.scale || 1);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const hasH = (p, k) => p[k + 'x'] != null && (p[k + 'x'] !== p.x || p[k + 'y'] !== p.y);

  P.init = function () {
    wrap = document.getElementById('stage-wrap');
    canvas = document.getElementById('canvas');
    svg = document.createElementNS(NS, 'svg');
    svg.id = 'pen-layer';
    canvas.appendChild(svg);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('dblclick', onDbl, true);
    document.addEventListener('keydown', onKey, true);
    Store.on((ev) => {
      if (ev && ev.slideChanged) { if (P.mode === 'edit') P.exitEdit(true); if (P.mode === 'draw') cancelDraw(); }
      if (P.mode === 'edit' && el && !Store.slide().elements.includes(el)) { el = null; P.mode = null; wrap.classList.remove('pen-edit'); }
      P.redraw();
    });
  };

  function toSlide(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (Editor.scale || 1), y: (e.clientY - r.top) / (Editor.scale || 1) };
  }
  const inStage = (e) => e.target && e.target.closest && e.target.closest('#stage-wrap') && !e.target.closest('.ctx-menu, .sel-play');
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
  // Shift: 앞 점 기준 45° 단위로
  function snap45(from, p) {
    const a = Math.round(Math.atan2(p.y - from.y, p.x - from.x) / (Math.PI / 4)) * (Math.PI / 4);
    const d = dist(from, p);
    return { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
  }

  /* ================= 그리기 ================= */
  P.startDraw = function () {
    if (P.mode === 'edit') P.exitEdit();
    if (Editor.editing) Editor.commitEdit();
    Store.select([]);
    P.mode = 'draw';
    pts = []; drag = null; hover = null;
    wrap.classList.add('pen-mode');
    UI.toast('✒ 펜: 클릭 = 모서리점 · 끌기 = 곡선점 · 첫 점 클릭 = 닫기 · Enter/더블클릭 = 끝 · Backspace = 마지막 점 지우기 · Shift = 45°');
    P.redraw();
  };
  function cancelDraw() {
    P.mode = null; pts = []; drag = null;
    wrap.classList.remove('pen-mode');
    P.redraw();
  }
  function finishDraw(closed) {
    const list = pts;
    cancelDraw();
    if (list.length < 2) { UI.toast('점이 2개 이상이어야 선이 됩니다'); return; }
    const d = Store.deck, t = deckTheme(d), k = Math.min(d.width, d.height) / 1080;
    const e = mkEl('path', {
      pts: list, closed: !!closed, x: 0, y: 0, w: d.width, h: d.height, pw: d.width, ph: d.height,
      stroke: t.accent || '#222222', strokeWidth: Math.max(2, Math.round(6 * k)),
    });
    normalize(e);
    App.addElement(e);
    UI.toast(closed ? '닫힌 도형을 만들었습니다 — 더블클릭하면 점을 고칠 수 있습니다' : '선을 만들었습니다 — 더블클릭하면 점을 고칠 수 있습니다');
  }

  /* ================= 좌표 정리 ================= */
  // 요소 크기에 맞춰 늘어난 만큼을 점 좌표에 반영 (편집 전에)
  function bake(e) {
    const sx = e.pw ? e.w / e.pw : 1, sy = e.ph ? e.h / e.ph : 1;
    if (sx !== 1 || sy !== 1) e.pts.forEach((p) => { ['x', 'ix', 'ox'].forEach((k) => { if (p[k] != null) p[k] *= sx; }); ['y', 'iy', 'oy'].forEach((k) => { if (p[k] != null) p[k] *= sy; }); });
    e.pw = e.w; e.ph = e.h;
  }
  // 상자를 선에 꼭 맞게 (회전한 요소도 제자리 유지)
  function normalize(e) {
    bake(e);
    const s = Core.samplePath(e.pts, e.closed, 32);
    if (!s.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    s.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    const W = Math.max(1, x1 - x0), H = Math.max(1, y1 - y0);
    const r = ((e.rotation || 0) * Math.PI) / 180;
    const c0 = { x: e.w / 2, y: e.h / 2 }, c1 = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    const dx = c1.x - c0.x, dy = c1.y - c0.y;
    const gx = dx * Math.cos(r) - dy * Math.sin(r), gy = dx * Math.sin(r) + dy * Math.cos(r);
    const nx = e.x + c0.x + gx - W / 2, ny = e.y + c0.y + gy - H / 2;
    e.pts.forEach((p) => { ['x', 'ix', 'ox'].forEach((k) => { if (p[k] != null) p[k] = Math.round((p[k] - x0) * 10) / 10; }); ['y', 'iy', 'oy'].forEach((k) => { if (p[k] != null) p[k] = Math.round((p[k] - y0) * 10) / 10; }); });
    e.x = Math.round(nx * 10) / 10; e.y = Math.round(ny * 10) / 10;
    e.w = Math.round(W * 10) / 10; e.h = Math.round(H * 10) / 10;
    e.pw = e.w; e.ph = e.h;
  }
  // 슬라이드 좌표 ↔ 요소 안 좌표
  function toLocal(p) {
    const r = -((el.rotation || 0) * Math.PI) / 180;
    const qx = p.x - el.x - el.w / 2, qy = p.y - el.y - el.h / 2;
    return { x: qx * Math.cos(r) - qy * Math.sin(r) + el.w / 2, y: qx * Math.sin(r) + qy * Math.cos(r) + el.h / 2 };
  }

  /* ================= 점 편집 ================= */
  P.edit = function (e) {
    if (!e || e.type !== 'path') return;
    if (e.locked) { UI.toast('잠긴 요소입니다 — 잠금을 풀고 편집하세요'); return; }
    if (P.mode === 'draw') cancelDraw();
    if (P.mode === 'edit' && el !== e) P.exitEdit();
    bake(e);
    el = e; selIdx = -1; changed = false;
    P.mode = 'edit';
    Store.select([e.id]);
    wrap.classList.add('pen-edit');
    UI.toast('점 편집: 점·핸들 끌기 · Alt+점 끌기 = 핸들 뽑기 · Alt+핸들 = 한쪽만 · 점 더블클릭 = 모서리↔곡선 · 선 위 클릭 = 점 추가 · Delete = 점 삭제 · Esc = 끝');
    P.redraw();
  };
  P.exitEdit = function (silent) {
    if (P.mode !== 'edit' || !el) return;
    const e = el;
    el = null; selIdx = -1; op = null;
    P.mode = null;
    wrap.classList.remove('pen-edit');
    if (Store.slide().elements.includes(e)) {
      normalize(e);
      Store.emit({ content: true });
      if (!silent) Store.select([e.id]);
    }
    P.redraw();
  };
  function touch() { if (!changed) { Store.checkpoint(); changed = true; } }
  function rerender() {
    const slideEl = canvas.querySelector('.hp-slide');
    const old = slideEl && slideEl.querySelector(`.hp-el[data-id="${el.id}"]`);
    if (!old) return;
    const idx = Store.slide().elements.indexOf(el);
    old.replaceWith(Core.renderElement(Store.deck, el, idx, 'edit', Media.resolve));
  }
  function moveAnchor(p, dx, dy) {
    ['x', 'ix', 'ox'].forEach((k) => { if (p[k] != null) p[k] += dx; });
    ['y', 'iy', 'oy'].forEach((k) => { if (p[k] != null) p[k] += dy; });
  }
  // 모서리 ↔ 곡선
  function toggleSmooth(i) {
    const p = el.pts[i], n = el.pts.length;
    touch();
    if (hasH(p, 'i') || hasH(p, 'o')) { delete p.ix; delete p.iy; delete p.ox; delete p.oy; p.s = false; return; }
    const prev = el.pts[i - 1] || (el.closed ? el.pts[n - 1] : null), next = el.pts[i + 1] || (el.closed ? el.pts[0] : null);
    const a = prev || p, b = next || p;
    let tx = b.x - a.x, ty = b.y - a.y;
    const L = Math.hypot(tx, ty) || 1;
    tx /= L; ty /= L;
    const li = prev ? dist(p, prev) / 3 : 0, lo = next ? dist(p, next) / 3 : 0;
    if (prev) { p.ix = p.x - tx * li; p.iy = p.y - ty * li; }
    if (next) { p.ox = p.x + tx * lo; p.oy = p.y + ty * lo; }
    p.s = true;
  }
  // 선 위의 가장 가까운 곳 (세그먼트 번호, t)
  function nearest(lp) {
    let best = null;
    Core.pathSegs(el.pts, el.closed).forEach((s) => {
      for (let k = 0; k <= 60; k++) {
        const t = k / 60, q = Core.bez(s, t), d = dist(q, lp);
        if (!best || d < best.d) best = { d, seg: s[4], t };
      }
    });
    return best;
  }
  // 세그먼트를 t 에서 둘로 나눠 점 추가 (모양은 그대로)
  function insertAt(seg, t) {
    const n = el.pts.length;
    const a = el.pts[seg], b = el.pts[(seg + 1) % n];
    const L = (u, v) => ({ x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t });
    const p0 = { x: a.x, y: a.y }, p1 = { x: a.ox != null ? a.ox : a.x, y: a.oy != null ? a.oy : a.y };
    const p2 = { x: b.ix != null ? b.ix : b.x, y: b.iy != null ? b.iy : b.y }, p3 = { x: b.x, y: b.y };
    const q0 = L(p0, p1), q1 = L(p1, p2), q2 = L(p2, p3), r0 = L(q0, q1), r1 = L(q1, q2), m = L(r0, r1);
    const curved = !(p1.x === p0.x && p1.y === p0.y && p2.x === p3.x && p2.y === p3.y);
    const np = { x: m.x, y: m.y };
    if (curved) {
      a.ox = q0.x; a.oy = q0.y; b.ix = q2.x; b.iy = q2.y;
      np.ix = r0.x; np.iy = r0.y; np.ox = r1.x; np.oy = r1.y; np.s = true;
    }
    el.pts.splice(seg + 1, 0, np);
    return seg + 1;
  }

  // 선 방향 뒤집기 (점 순서와 들어오는/나가는 핸들을 바꿈)
  P.reverse = function (e) {
    if (!e || e.type !== 'path') return;
    const editing = P.mode === 'edit' && el === e;
    Store.checkpoint();
    e.pts.reverse();
    e.pts.forEach((p) => {
      const ix = p.ix, iy = p.iy;
      if (p.ox != null) { p.ix = p.ox; p.iy = p.oy; } else { delete p.ix; delete p.iy; }
      if (ix != null) { p.ox = ix; p.oy = iy; } else { delete p.ox; delete p.oy; }
    });
    if (editing) { selIdx = selIdx >= 0 ? e.pts.length - 1 - selIdx : -1; rerender(); P.redraw(); }
    else Store.emit({ content: true });
    UI.toast('선 방향을 뒤집었습니다 — 화살표와 "선 그리기" 방향이 반대가 됩니다');
  };

  // 선택한 점에 핸들 추가(on) / 제거(off) — 속성 패널 버튼용
  P.setHandles = function (on) {
    if (P.mode !== 'edit' || !el) { UI.toast('먼저 선을 더블클릭해 점 편집을 시작하세요'); return; }
    if (selIdx < 0) { UI.toast('핸들을 바꿀 점을 먼저 클릭해 선택하세요'); return; }
    const p = el.pts[selIdx];
    const has = hasH(p, 'i') || hasH(p, 'o');
    if (on && has) { UI.toast('이미 핸들이 있는 점입니다 — 핸들을 끌어 모양을 바꾸세요'); return; }
    if (!on && !has) { UI.toast('핸들이 없는 점입니다'); return; }
    toggleSmooth(selIdx);
    rerender(); P.redraw();
  };

  /* ================= 포인터 ================= */
  function onDown(e) {
    if (!P.mode || e.button !== 0 || !inStage(e)) return;
    const sp = toSlide(e);
    if (P.mode === 'draw') {
      stop(e);
      // 더블클릭 = 끝내기 (첫 클릭이 이미 점을 찍었으므로 두 번째는 찍지 않음)
      if (isDouble(e, 'draw') && pts.length) { drag = null; finishDraw(false); return; }
      if (pts.length >= 2 && dist(sp, pts[0]) <= 10 * inv()) { finishDraw(true); return; }
      const p = e.shiftKey && pts.length ? snap45(pts[pts.length - 1], sp) : sp;
      const np = { x: p.x, y: p.y };
      pts.push(np);
      drag = { p: np };
      P.redraw();
      return;
    }
    // 편집
    const k = e.target.closest && e.target.closest('#pen-layer [data-kind]');
    const lp = toLocal(sp);
    if (k) {
      stop(e);
      const i = +k.dataset.i, p = el.pts[i];
      if (k.dataset.kind === 'anchor') {
        // 같은 점을 빠르게 두 번 = 모서리 ↔ 곡선
        if (!e.altKey && isDouble(e, 'a' + i)) {
          op = null; selIdx = i;
          toggleSmooth(i);
          rerender(); P.redraw();
          return;
        }
        selIdx = i;
        // Alt + 점 끌기 = 그 점에서 핸들을 새로 뽑아냄 (모서리점 → 곡선점)
        op = e.altKey ? { kind: 'pull', i, start: lp, moved: false } : { kind: 'anchor', i, start: lp, orig: clone(p), moved: false };
      } else op = { kind: k.dataset.kind, i, alt: e.altKey, moved: false };
      P.redraw();
      return;
    }
    const nb = el.pts.length > 1 ? nearest(lp) : null;
    const tol = Math.max(8 * inv(), (+el.strokeWidth || 6) / 2 + 4 * inv());
    if (nb && nb.d <= tol) {
      stop(e);
      touch();
      selIdx = insertAt(nb.seg, nb.t);
      op = { kind: 'anchor', i: selIdx, start: lp, orig: clone(el.pts[selIdx]), moved: true };
      rerender(); P.redraw();
      return;
    }
    // 빈 곳 → 편집 끝 (이 클릭은 편집기가 그대로 처리)
    P.exitEdit();
  }

  function onMove(e) {
    if (!P.mode) return;
    const sp = toSlide(e);
    if (P.mode === 'draw') {
      if (drag) {
        const p = drag.p;
        if (dist(sp, p) > 3 * inv()) { p.ox = sp.x; p.oy = sp.y; p.ix = 2 * p.x - sp.x; p.iy = 2 * p.y - sp.y; p.s = true; }
      }
      hover = e.shiftKey && pts.length ? snap45(pts[pts.length - 1], sp) : sp;
      if (inStage(e) || drag) P.redraw();
      return;
    }
    if (!op || !el) return;
    stop(e);
    const lp = toLocal(sp), p = el.pts[op.i];
    if (!op.moved && op.start && dist(lp, op.start) * (Editor.scale || 1) < 2) return;
    touch();
    op.moved = true;
    if (op.kind === 'pull') {
      const q = e.shiftKey ? snap45(p, lp) : lp;
      p.ox = q.x; p.oy = q.y; p.ix = 2 * p.x - q.x; p.iy = 2 * p.y - q.y; p.s = true;
    } else if (op.kind === 'anchor') {
      let tx = op.orig.x + (lp.x - op.start.x), ty = op.orig.y + (lp.y - op.start.y);
      if (e.shiftKey) { const nb = el.pts[op.i - 1] || el.pts[op.i + 1]; if (nb) { const q = snap45(nb, { x: tx, y: ty }); tx = q.x; ty = q.y; } }
      Object.assign(p, clone(op.orig));
      moveAnchor(p, tx - op.orig.x, ty - op.orig.y);
    } else {
      const me = op.kind === 'hin' ? 'i' : 'o', other = me === 'i' ? 'o' : 'i';
      let q = lp;
      if (e.shiftKey) q = snap45(p, lp);
      p[me + 'x'] = q.x; p[me + 'y'] = q.y;
      if (op.alt || e.altKey) p.s = false;
      else if (p.s !== false && hasH(p, other)) {
        // 반대쪽 핸들은 방향만 맞추고 길이는 유지 (부드러운 점)
        const lo = Math.hypot(p[other + 'x'] - p.x, p[other + 'y'] - p.y);
        const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
        p[other + 'x'] = p.x - (dx / L) * lo; p[other + 'y'] = p.y - (dy / L) * lo;
        p.s = true;
      }
    }
    rerender(); P.redraw();
  }

  function onUp() {
    if (P.mode === 'draw') { drag = null; P.redraw(); return; }
    if (P.mode === 'edit' && op) { op = null; P.redraw(); }
  }

  function onDbl(e) {
    // 이미 직접 판정으로 처리한 더블클릭이면 브라우저 dblclick 은 버린다 (편집기로 넘어가 다른 동작을 하지 않게)
    if (performance.now() - dblDone < 600 && e.target && e.target.closest && e.target.closest('#stage-wrap')) { stop(e); return; }
    if (!P.mode || !inStage(e)) return;
    stop(e);
    if (P.mode === 'draw') {
      // 더블클릭으로 생긴 겹친 점 정리
      while (pts.length >= 2 && dist(pts[pts.length - 1], pts[pts.length - 2]) < 4 * inv()) {
        const last = pts.pop(), prev = pts[pts.length - 1];
        if (last.ox != null && prev.ox == null) Object.assign(prev, { ix: last.ix, iy: last.iy, ox: last.ox, oy: last.oy, s: true });
      }
      finishDraw(false);
      return;
    }
    // 첫 클릭 때 표시층을 다시 그려 대상 요소가 바뀌므로, e.target 이 아니라 위치로 가장 가까운 점을 찾는다
    const lp = toLocal(toSlide(e));
    let hit = -1, best = 12 * inv();
    el.pts.forEach((p, i) => { const d = dist(p, lp); if (d <= best) { best = d; hit = i; } });
    if (hit >= 0) { toggleSmooth(hit); selIdx = hit; rerender(); P.redraw(); }
  }

  function onKey(e) {
    if (!P.mode || document.querySelector('.modal-bg')) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (P.mode === 'draw') {
      if (k === 'Enter') { stop(e); finishDraw(false); }
      else if (k === 'Escape') { stop(e); if (pts.length >= 2) finishDraw(false); else cancelDraw(); }
      else if (k === 'Backspace' || k === 'Delete') { stop(e); pts.pop(); if (!pts.length) drag = null; P.redraw(); }
      else if (!ctrl) stop(e);
      return;
    }
    // 편집
    if (k === 'Escape' || k === 'Enter') { stop(e); P.exitEdit(); return; }
    if (ctrl && /^[zy]$/i.test(k)) { P.exitEdit(true); return; } // 실행 취소는 편집을 끝낸 뒤 그대로
    if ((k === 'Delete' || k === 'Backspace') && selIdx >= 0) {
      stop(e);
      if (el.pts.length <= 2) { UI.toast('점이 2개뿐이라 더 지울 수 없습니다 — 선을 지우려면 편집을 끝내고 Delete'); return; }
      touch();
      el.pts.splice(selIdx, 1);
      if (el.closed && el.pts.length < 3) el.closed = false;
      selIdx = -1;
      rerender(); P.redraw();
      return;
    }
    if (k.startsWith('Arrow') && selIdx >= 0) {
      stop(e);
      touch();
      const st = e.shiftKey ? 10 : 1;
      moveAnchor(el.pts[selIdx], k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0);
      rerender(); P.redraw();
      return;
    }
    if (!ctrl) stop(e);
  }

  /* ================= 화면 표시 ================= */
  function node(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    (parent || svg).appendChild(n);
    return n;
  }
  function anchorBox(p, attrs, parent) {
    const s = 9 * inv();
    return node('rect', Object.assign({ x: p.x - s / 2, y: p.y - s / 2, width: s, height: s, class: 'pk-a', 'stroke-width': 1.5 * inv() }, attrs), parent);
  }
  function handle(p, k, i, parent) {
    const hxv = p[k + 'x'], hyv = p[k + 'y'];
    node('line', { x1: p.x, y1: p.y, x2: hxv, y2: hyv, class: 'pk-l', 'stroke-width': 1.2 * inv() }, parent);
    node('circle', { cx: hxv, cy: hyv, r: 5 * inv(), class: 'pk-h', 'stroke-width': 1.5 * inv(), 'data-kind': k === 'i' ? 'hin' : 'hout', 'data-i': i }, parent);
  }
  P.redraw = function () {
    if (!svg) return;
    svg.innerHTML = '';
    const d = Store.deck;
    if (!d) return;
    svg.setAttribute('width', d.width); svg.setAttribute('height', d.height);
    if (P.mode === 'draw') {
      if (pts.length) {
        node('path', { d: Core.pathD(pts, false), class: 'pk-path', 'stroke-width': 1.6 * inv() });
        const last = pts[pts.length - 1];
        if (hover && !drag) {
          const c1 = last.ox != null ? `${last.ox} ${last.oy}` : `${last.x} ${last.y}`;
          node('path', { d: `M${last.x} ${last.y} C${c1} ${hover.x} ${hover.y} ${hover.x} ${hover.y}`, class: 'pk-rubber', 'stroke-width': 1.2 * inv(), 'stroke-dasharray': `${5 * inv()} ${4 * inv()}` });
        }
        pts.forEach((p, i) => anchorBox(p, { class: 'pk-a' + (i === 0 && pts.length >= 2 && hover && dist(hover, pts[0]) <= 10 * inv() ? ' close' : '') }));
        if (hasH(last, 'o')) { handle(last, 'i', pts.length - 1); handle(last, 'o', pts.length - 1); }
      }
      if (hover && !drag) node('circle', { cx: hover.x, cy: hover.y, r: 3 * inv(), class: 'pk-cur' });
      return;
    }
    if (P.mode === 'edit' && el) {
      const g = node('g', { transform: `translate(${el.x} ${el.y}) rotate(${el.rotation || 0} ${el.w / 2} ${el.h / 2})` });
      node('path', { d: Core.pathD(el.pts, el.closed), class: 'pk-path', 'stroke-width': 1.4 * inv() }, g);
      // 핸들은 선택한 점의 것만 보인다 (다른 점은 앵커만)
      const show = new Set([selIdx]);
      el.pts.forEach((p, i) => {
        if (!show.has(i)) return;
        if (hasH(p, 'i')) handle(p, 'i', i, g);
        if (hasH(p, 'o')) handle(p, 'o', i, g);
      });
      el.pts.forEach((p, i) => anchorBox(p, { class: 'pk-a' + (i === selIdx ? ' on' : '') + (hasH(p, 'i') || hasH(p, 'o') ? ' smooth' : ''), 'data-kind': 'anchor', 'data-i': i, 'stroke-width': 1.5 * inv() }, g));
    }
  };

  return P;
})();
