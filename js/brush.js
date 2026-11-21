/* 브러시 — 손으로 긋는 그리기 도구 (연필·마커·붓·캘리그래피·네온·점선·스프레이·도장)
 *  B 키 또는 🖌 브러시 버튼으로 시작. 슬라이드 위에서 끌면 한 획이 요소(path) 하나가 된다. Esc = 끝내기.
 *  직선: Shift 를 누른 채 끌거나 "직선으로 긋기"를 켠다. Ctrl 을 함께 누르면 15° 단위로 맞춘다.
 *  - 연필·마커·네온·점선: 점(pts)으로 된 선 → 더블클릭해 점 편집 가능. 마커는 opacity·blend, 네온은 glow, 점선은 dashArr 를 쓴다.
 *  - 붓·캘리그래피·스프레이·도장: 윤곽을 직접 만든 채워진 도형 → el.d (경로 문자열, 기준 크기 pw×ph). 점 편집은 안 된다.
 *  설정은 localStorage('hppt.brush'), 내 프리셋은 localStorage('hppt.brushPresets') 에 둔다. */
const Brush = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const B = { mode: false };
  let wrap, canvas, svg, panel;
  let stroke = null; // 긋는 중인 획
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = (v) => Math.round(v * 10) / 10;
  const pct = (v) => Math.round(v) + '%';
  const CAPS = [['round', '둥글게'], ['butt', '평평하게'], ['square', '네모']];

  /* ---------- 브러시 종류와 옵션 ---------- */
  const TYPES = [
    { id: 'pencil', label: '연필', icon: '✏', hint: '손으로 그은 그대로의 고른 선입니다.', widthLabel: '굵기', max: 120, defaults: { width: 8, smooth: 3, cap: 'round' }, options: [
      { key: 'smooth', label: '매끄러움', type: 'range', min: 0, max: 12, step: 1 },
      { key: 'cap', label: '끝 모양', type: 'select', options: CAPS }] },
    { id: 'marker', label: '마커', icon: '🖍', hint: '넓고 반투명한 형광펜입니다. 글자 위에 덧칠하기 좋습니다.', widthLabel: '굵기', max: 160, defaults: { width: 34, opacity: 45, cap: 'butt', multiply: true }, options: [
      { key: 'opacity', label: '진하기', type: 'range', min: 10, max: 100, step: 1, format: pct },
      { key: 'cap', label: '끝 모양', type: 'select', options: [['butt', '평평하게'], ['square', '네모'], ['round', '둥글게']] },
      { key: 'multiply', label: '아래 내용과 겹치면 진하게', type: 'check' }] },
    { id: 'brush', label: '붓', icon: '🖌', hint: '빠르게 그으면 가늘어지고 천천히 그으면 굵어집니다. 펜 태블릿이면 필압을 따릅니다.', widthLabel: '최대 굵기', max: 160, defaults: { width: 26, thin: 25, sens: 60, taper: true, pressure: true }, options: [
      { key: 'thin', label: '가는 쪽', type: 'range', min: 5, max: 100, step: 1, format: pct },
      { key: 'sens', label: '속도 반응', type: 'range', min: 0, max: 100, step: 1, format: pct },
      { key: 'taper', label: '시작과 끝을 가늘게', type: 'check' },
      { key: 'pressure', label: '펜 필압 사용', type: 'check' }] },
    { id: 'calli', label: '캘리', icon: '✒', hint: '납작한 펜촉입니다. 긋는 방향에 따라 굵기가 달라집니다.', widthLabel: '펜촉 너비', max: 160, defaults: { width: 26, angle: 40, thin: 15 }, options: [
      { key: 'angle', label: '펜촉 각도', type: 'range', min: 0, max: 180, step: 5, format: (v) => Math.round(v) + '°' },
      { key: 'thin', label: '가는 획', type: 'range', min: 5, max: 100, step: 1, format: pct }] },
    { id: 'neon', label: '네온', icon: '⚡', hint: '빛이 번지는 선입니다. 어두운 배경에서 잘 보입니다.', widthLabel: '굵기', max: 80, defaults: { width: 8, glow: 2.5, strength: 2, core: false }, options: [
      { key: 'glow', label: '빛 크기', type: 'range', min: 0.5, max: 6, step: 0.1, format: (v) => (+v).toFixed(1) + '×' },
      { key: 'strength', label: '빛 세기', type: 'range', min: 1, max: 4, step: 1 },
      { key: 'core', label: '선은 흰색, 빛만 색으로', type: 'check' }] },
    { id: 'dash', label: '점선', icon: '┅', hint: '끊어진 선입니다. 선 길이를 0 으로 하고 끝을 둥글게 하면 점이 됩니다.', widthLabel: '굵기', max: 80, defaults: { width: 6, len: 3, gap: 2.5, cap: 'round' }, options: [
      { key: 'len', label: '선 길이', type: 'range', min: 0, max: 10, step: 0.5, format: (v) => v + '×' },
      { key: 'gap', label: '간격', type: 'range', min: 0.5, max: 10, step: 0.5, format: (v) => v + '×' },
      { key: 'cap', label: '끝 모양', type: 'select', options: CAPS }] },
    { id: 'spray', label: '스프레이', icon: '💨', hint: '지나간 자리에 작은 점을 뿌립니다. 천천히 움직이면 더 촘촘해집니다.', widthLabel: '뿌리는 폭', max: 300, defaults: { width: 70, density: 35, dot: 10 }, options: [
      { key: 'density', label: '밀도', type: 'range', min: 5, max: 100, step: 1 },
      { key: 'dot', label: '점 크기', type: 'range', min: 3, max: 40, step: 1, format: pct }] },
    { id: 'stamp', label: '도장', icon: '★', hint: '지나간 길을 따라 모양을 찍습니다.', widthLabel: '모양 크기', max: 300, defaults: { width: 44, shape: 'star', spacing: 120, scatter: 0, vary: 0, rotate: 'follow' }, options: [
      { key: 'shape', label: '모양', type: 'select', options: [['star', '별'], ['heart', '하트'], ['circle', '원'], ['square', '네모'], ['triangle', '세모'], ['leaf', '잎']] },
      { key: 'spacing', label: '간격', type: 'range', min: 40, max: 400, step: 5, format: pct },
      { key: 'scatter', label: '흩뿌림', type: 'range', min: 0, max: 200, step: 5, format: pct },
      { key: 'vary', label: '크기 변화', type: 'range', min: 0, max: 90, step: 5, format: pct },
      { key: 'rotate', label: '방향', type: 'select', options: [['follow', '길 따라'], ['random', '무작위'], ['none', '고정']] }] },
  ];
  const info = (id) => TYPES.find((t) => t.id === id) || TYPES[0];
  const OUTLINE = ['brush', 'calli', 'spray', 'stamp'];

  // 설정: { type, color, [브러시 id]: 옵션 }
  const S = { type: 'pencil', color: '#222222' };
  try { Object.assign(S, JSON.parse(localStorage.getItem('hppt.brush') || '{}')); } catch (e) { /* 저장소 막힘 */ }
  const persist = () => { try { localStorage.setItem('hppt.brush', JSON.stringify(S)); } catch (e) { /* ignore */ } };
  const optsOf = (id) => { const t = info(id || S.type); return Object.assign({}, t.defaults, S[t.id] || {}); };

  /* ---------- 프리셋 ---------- */
  const P = (id, name, type, opts, color) => ({ id: 'b-' + id, name, type, opts, color, builtin: true });
  const BUILTIN = [
    P('fine', '가는 연필', 'pencil', { width: 3, smooth: 3, cap: 'round' }),
    P('bold', '굵은 연필', 'pencil', { width: 18, smooth: 4, cap: 'round' }),
    P('hl-yellow', '노란 형광펜', 'marker', { width: 38, opacity: 45, cap: 'butt', multiply: true }, '#ffd43b'),
    P('hl-pink', '분홍 형광펜', 'marker', { width: 38, opacity: 40, cap: 'butt', multiply: true }, '#f783ac'),
    P('felt', '사인펜', 'marker', { width: 12, opacity: 90, cap: 'round', multiply: false }),
    P('ink', '먹붓', 'brush', { width: 44, thin: 8, sens: 85, taper: true, pressure: true }, '#111827'),
    P('soft', '부드러운 붓', 'brush', { width: 24, thin: 45, sens: 40, taper: true, pressure: true }),
    P('calli', '캘리 펜', 'calli', { width: 28, angle: 40, thin: 12 }, '#1f2430'),
    P('flat', '납작붓', 'calli', { width: 48, angle: 0, thin: 30 }),
    P('neon-pink', '네온 핑크', 'neon', { width: 8, glow: 3, strength: 3, core: true }, '#f06595'),
    P('neon-cyan', '네온 블루', 'neon', { width: 6, glow: 2.5, strength: 2, core: false }, '#22d3ee'),
    P('dash', '점선', 'dash', { width: 6, len: 3, gap: 2.5, cap: 'butt' }),
    P('dots', '점 줄', 'dash', { width: 12, len: 0, gap: 2, cap: 'round' }),
    P('mist', '고운 스프레이', 'spray', { width: 90, density: 70, dot: 5 }),
    P('splat', '굵은 스프레이', 'spray', { width: 110, density: 25, dot: 22 }),
    P('stars', '별 뿌리기', 'stamp', { width: 34, shape: 'star', spacing: 110, scatter: 90, vary: 60, rotate: 'random' }, '#f59f00'),
    P('hearts', '하트 길', 'stamp', { width: 40, shape: 'heart', spacing: 115, scatter: 0, vary: 0, rotate: 'none' }, '#fa5252'),
    P('vine', '잎 덩굴', 'stamp', { width: 42, shape: 'leaf', spacing: 70, scatter: 35, vary: 30, rotate: 'follow' }, '#2f9e44'),
  ];
  let mine = [];
  try { const v = JSON.parse(localStorage.getItem('hppt.brushPresets') || '[]'); if (Array.isArray(v)) mine = v; } catch (e) { /* ignore */ }
  const saveMine = () => { try { localStorage.setItem('hppt.brushPresets', JSON.stringify(mine)); } catch (e) { UI.toast('브러시 프리셋을 저장하지 못했습니다 (브라우저 저장소가 막혀 있음)', 'error'); } };
  const presets = () => mine.concat(BUILTIN);
  function applyPreset(p) {
    const t = info(p.type);
    S.type = t.id;
    S[t.id] = Object.assign({}, t.defaults, p.opts || {});
    if (p.color) S.color = p.color;
    persist();
  }

  /* ---------- 획 만들기 (윤곽) ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // 점열을 일정 간격으로 다시 찍는다 (반폭 h 도 함께)
  function resample(pts, step) {
    if (pts.length < 2) return pts.slice();
    const out = [pts[0]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y);
      if (!d) continue;
      let t = step - carry;
      while (t <= d) { const k = t / d; out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, h: a.h + (b.h - a.h) * k }); t += step; }
      carry = d - (t - step);
    }
    const last = pts[pts.length - 1], tail = out[out.length - 1];
    if (Math.hypot(last.x - tail.x, last.y - tail.y) > step * 0.3) out.push(last);
    return out;
  }
  function easeWidths(pts, n) {
    const hs = pts.map((p) => p.h);
    for (let i = 0; i < pts.length; i++) {
      let s = 0, c = 0;
      for (let k = Math.max(0, i - n); k <= Math.min(pts.length - 1, i + n); k++) { s += hs[k]; c++; }
      pts[i].h = s / c;
    }
    return pts;
  }
  // 경로 명령은 [글자, x, y, ...] 배열로 모은다 (좌표는 모두 절대 좌표 쌍)
  function smoothLine(out, pts) {
    out.push(['L', pts[0].x, pts[0].y]);
    for (let i = 1; i < pts.length - 1; i++) out.push(['Q', pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2]);
    const e = pts[pts.length - 1];
    out.push(['L', e.x, e.y]);
  }
  // 반원 끝 (c 를 중심으로 from 에서 반대쪽까지, 진행 방향 바깥으로)
  function capArc(out, c, from, hw) {
    const a0 = Math.atan2(from.y - c.y, from.x - c.x);
    for (let k = 1; k <= 6; k++) { const a = a0 - (Math.PI * k) / 6; out.push(['L', c.x + Math.cos(a) * hw, c.y + Math.sin(a) * hw]); }
  }
  // 중심선과 점마다의 반폭으로 띠 모양 윤곽
  function ribbon(pts) {
    const out = [];
    if (!pts.length) return out;
    if (pts.length === 1) {
      const p = pts[0], r = Math.max(0.5, p.h);
      out.push(['M', p.x + r, p.y]);
      for (let k = 1; k < 16; k++) { const a = (Math.PI * 2 * k) / 16; out.push(['L', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r]); }
      out.push(['Z']);
      return out;
    }
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, hw = Math.max(0.25, pts[i].h);
      L.push({ x: pts[i].x + nx * hw, y: pts[i].y + ny * hw });
      R.push({ x: pts[i].x - nx * hw, y: pts[i].y - ny * hw });
    }
    R.reverse();
    const end = pts[pts.length - 1], start = pts[0];
    out.push(['M', L[0].x, L[0].y]);
    smoothLine(out, L);
    capArc(out, end, L[L.length - 1], Math.max(0.25, end.h));
    smoothLine(out, R);
    capArc(out, start, R[R.length - 1], Math.max(0.25, start.h));
    out.push(['Z']);
    return out;
  }
  const POLY = {
    star: Array.from({ length: 10 }, (_, i) => { const a = ((-90 + 36 * i) * Math.PI) / 180, r = i % 2 ? 0.2 : 0.5; return [Math.cos(a) * r, Math.sin(a) * r]; }),
    square: [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]],
    triangle: [[0, -0.5], [0.48, 0.38], [-0.48, 0.38]],
  };
  // 크기 1 짜리 모양을 (x, y) 에 크기 s, 각도 rot 으로 찍는다
  function stampCmds(out, shape, x, y, s, rot) {
    const c = Math.cos(rot), sn = Math.sin(rot);
    const T = (px, py) => [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s];
    const curve = (list) => {
      out.push(['M'].concat(T(list[0][0], list[0][1])));
      for (let i = 1; i < list.length; i += 3) out.push(['C'].concat(T(list[i][0], list[i][1]), T(list[i + 1][0], list[i + 1][1]), T(list[i + 2][0], list[i + 2][1])));
      out.push(['Z']);
    };
    if (shape === 'circle') { const k = 0.2761; return curve([[-0.5, 0], [-0.5, -k], [-k, -0.5], [0, -0.5], [k, -0.5], [0.5, -k], [0.5, 0], [0.5, k], [k, 0.5], [0, 0.5], [-k, 0.5], [-0.5, k], [-0.5, 0]]); }
    if (shape === 'heart') return curve([[0, 0.45], [-0.3, 0.2], [-0.5, 0], [-0.5, -0.2], [-0.5, -0.36], [-0.38, -0.45], [-0.24, -0.45], [-0.14, -0.45], [-0.05, -0.4], [0, -0.31], [0.05, -0.4], [0.14, -0.45], [0.24, -0.45], [0.38, -0.45], [0.5, -0.36], [0.5, -0.2], [0.5, 0], [0.3, 0.2], [0, 0.45]]);
    if (shape === 'leaf') return curve([[-0.5, 0], [-0.2, -0.38], [0.2, -0.38], [0.5, 0], [0.2, 0.38], [-0.2, 0.38], [-0.5, 0]]);
    const pts = POLY[shape] || POLY.star;
    pts.forEach((p, i) => out.push([i ? 'L' : 'M'].concat(T(p[0], p[1]))));
    out.push(['Z']);
  }
  const MAX_ITEMS = 1500;

  // 한 획의 상태를 만들고 점을 더해 간다. at = 시각(ms). 미리보기 그림도 같은 함수로 만든다.
  function newStroke(type, o, color) {
    const seed = (Math.random() * 1e9) | 0;
    return { type, o, color, seed, raw: [], items: [], count: 0, dist: 0, next: 0, speed: 0, rand: rng(seed) };
  }
  // 직선: 시작점에서 p 까지 곧게 다시 긋는다 (고른 속도로 그은 것처럼 점을 채운다)
  function straighten(st, p, zoom, snap) {
    const a = st.raw[0];
    let q = p;
    if (snap) {
      const step = Math.PI / 12, ang = Math.round(Math.atan2(p.y - a.y, p.x - a.x) / step) * step, d = Math.hypot(p.x - a.x, p.y - a.y);
      q = { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d };
    }
    Object.assign(st, { raw: [], items: [], count: 0, dist: 0, next: 0, speed: 0, rand: rng(st.seed), line: true });
    const len = Math.hypot(q.x - a.x, q.y - a.y), n = Math.max(1, Math.ceil((len * (zoom || 1)) / 6));
    // 화면에서 6px 를 8ms 에 가는 속도 (붓이 중간 굵기가 되는 정도)
    for (let i = 0; i <= n; i++) addPoint(st, { x: a.x + ((q.x - a.x) * i) / n, y: a.y + ((q.y - a.y) * i) / n }, a.t + i * 8, 0, zoom);
  }
  function addPoint(st, p, at, pressure, zoom) {
    const last = st.raw[st.raw.length - 1];
    const seg = last ? Math.hypot(p.x - last.x, p.y - last.y) : 0;
    const o = st.o, W = Math.max(1, o.width);
    let h = W / 2;
    if (st.type === 'brush') {
      let k;
      if (o.pressure && pressure > 0) k = pressure;
      else {
        // 화면에서의 속도(px/ms)가 빠를수록 가늘게
        const v = last ? (seg * (zoom || 1)) / Math.max(1, at - last.t) : 0;
        st.speed = st.speed * 0.7 + v * 0.3;
        k = 1 - (o.sens / 100) * clamp(st.speed / 2.2, 0, 1);
      }
      h = (W / 2) * (o.thin / 100 + (1 - o.thin / 100) * clamp(k, 0, 1));
    } else if (st.type === 'calli') {
      const nib = (o.angle * Math.PI) / 180;
      const th = last ? Math.atan2(p.y - last.y, p.x - last.x) : nib + Math.PI / 2;
      h = (W / 2) * (o.thin / 100 + (1 - o.thin / 100) * Math.abs(Math.sin(th - nib)));
    }
    st.raw.push({ x: p.x, y: p.y, t: at, h });
    st.dist += seg;
    const a = last || p;
    if (st.type === 'spray') {
      const R = Math.max(2, W / 2), r = Math.max(0.4, W * (o.dot / 100) * 0.5);
      let n = Math.round((o.density / 100) * (last ? Math.max(1, seg / 2.5 + 1.5) : 14));
      while (n-- > 0 && st.count < MAX_ITEMS) {
        const k = st.rand(), ang = st.rand() * Math.PI * 2, rad = R * Math.sqrt(st.rand()), s = r * (0.55 + st.rand() * 0.7) * 0.6;
        const x = a.x + (p.x - a.x) * k + Math.cos(ang) * rad, y = a.y + (p.y - a.y) * k + Math.sin(ang) * rad;
        // 작은 마름모 + 둥근 테두리 = 동그란 점 (원보다 훨씬 가볍다)
        st.items.push(['M', x, y - s], ['L', x + s, y], ['L', x, y + s], ['L', x - s, y], ['Z']);
        st.count++;
      }
    } else if (st.type === 'stamp') {
      const size = Math.max(2, W), gap = Math.max(2, size * (o.spacing / 100));
      const th = Math.atan2(p.y - a.y, p.x - a.x);
      const put = (x, y) => {
        if (st.count >= MAX_ITEMS) return;
        const s = size * (1 - (o.vary / 100) * st.rand()), off = (st.rand() - 0.5) * 2 * size * (o.scatter / 100);
        const rot = o.rotate === 'random' ? st.rand() * Math.PI * 2 : o.rotate === 'follow' && seg ? th + Math.PI / 2 : 0;
        stampCmds(st.items, o.shape, x - Math.sin(th) * off, y + Math.cos(th) * off, s, rot);
        st.count++;
      };
      if (!seg) { put(p.x, p.y); st.next = gap; }
      else { const start = st.dist - seg; while (st.next <= st.dist) { const k = (st.next - start) / seg; put(a.x + (p.x - a.x) * k, a.y + (p.y - a.y) * k); st.next += gap; } }
    }
  }
  // 윤곽 브러시의 경로 명령
  function outlineCmds(st, final) {
    if (st.type === 'spray' || st.type === 'stamp') return st.items;
    if (!st.raw.length) return [];
    const W = Math.max(1, st.o.width), step = Math.max(1.5, W / 6);
    const pts = easeWidths(resample(st.raw.map((p) => ({ x: p.x, y: p.y, h: p.h })), step), st.type === 'calli' ? 1 : 3);
    if (st.type === 'brush' && st.o.taper && pts.length > 2) {
      // 시작은 바로, 끝은 손을 뗀 뒤에만 가늘게 한다
      const len = Math.max(W * 1.5, 12), n = pts.length, minH = (W / 2) * 0.08;
      for (let i = 0; i < n; i++) {
        let k = Math.min(1, (i * step) / len);
        if (final) k = Math.min(k, ((n - 1 - i) * step) / len);
        pts[i].h = Math.max(minH, pts[i].h * (0.08 + 0.92 * k));
      }
    }
    return ribbon(pts);
  }
  const cmdsToD = (cmds, dx, dy) => cmds.map((c) => { let s = c[0]; for (let i = 1; i < c.length; i += 2) s += (i > 1 ? ' ' : '') + r1(c[i] - dx) + ' ' + r1(c[i + 1] - dy); return s; }).join(' ');
  function cmdsBox(cmds) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    cmds.forEach((c) => { for (let i = 1; i < c.length; i += 2) { x0 = Math.min(x0, c[i]); x1 = Math.max(x1, c[i]); y0 = Math.min(y0, c[i + 1]); y1 = Math.max(y1, c[i + 1]); } });
    return x0 === Infinity ? null : { x0, y0, x1, y1 };
  }

  /* ---------- 획 만들기 (선) ---------- */
  // 허용 오차 안에서 점을 덜어 낸다 (Ramer–Douglas–Peucker)
  function simplify(pts, tol) {
    if (pts.length < 3 || tol <= 0) return pts.slice();
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const A = pts[a], Bp = pts[b], vx = Bp.x - A.x, vy = Bp.y - A.y, l2 = vx * vx + vy * vy;
      let m = -1, md = tol;
      for (let i = a + 1; i < b; i++) {
        const t = l2 ? clamp(((pts[i].x - A.x) * vx + (pts[i].y - A.y) * vy) / l2, 0, 1) : 0;
        const d = Math.hypot(pts[i].x - A.x - vx * t, pts[i].y - A.y - vy * t);
        if (d > md) { md = d; m = i; }
      }
      if (m >= 0) { keep[m] = true; stack.push([a, m], [m, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  // 남은 점을 부드럽게 잇는 핸들을 단다 (이웃 두 점을 잇는 방향으로)
  function toSmoothPts(list) {
    return list.map((p, i) => {
      const prev = list[i - 1], next = list[i + 1], np = { x: r1(p.x), y: r1(p.y) };
      if (prev && next) {
        let tx = next.x - prev.x, ty = next.y - prev.y;
        const L = Math.hypot(tx, ty) || 1;
        tx /= L; ty /= L;
        const li = Math.hypot(p.x - prev.x, p.y - prev.y) / 3, lo = Math.hypot(next.x - p.x, next.y - p.y) / 3;
        np.ix = r1(p.x - tx * li); np.iy = r1(p.y - ty * li); np.ox = r1(p.x + tx * lo); np.oy = r1(p.y + ty * lo); np.s = true;
      }
      return np;
    });
  }
  const dashOf = (o) => { const w = Math.max(1, o.width); return [Math.max(0.01, r1(o.len * w)), Math.max(1, r1(o.gap * w + (o.cap === 'butt' ? 0 : w)))]; };
  // 선 브러시가 요소에 주는 모양 속성
  function lineProps(type, o, color) {
    const p = { stroke: color, strokeWidth: Math.max(1, o.width), cap: 'round', join: 'round', fill: 'transparent', dash: 'solid' };
    if (type === 'pencil') p.cap = o.cap;
    else if (type === 'marker') { p.cap = o.cap; p.join = o.cap === 'round' ? 'round' : 'bevel'; p.opacity = o.opacity / 100; if (o.multiply) p.blend = 'multiply'; }
    else if (type === 'neon') { p.stroke = o.core ? '#ffffff' : color; p.glow = { color, size: r1(Math.max(1, o.width * o.glow)), strength: o.strength }; }
    else if (type === 'dash') { p.cap = o.cap; p.dashArr = dashOf(o); }
    return p;
  }

  /* ---------- 요소로 만들기 ---------- */
  function finish(st) {
    const d = Store.deck;
    let el = null;
    if (OUTLINE.includes(st.type)) {
      const cmds = outlineCmds(st, true), box = cmdsBox(cmds);
      if (!box) return;
      const spray = st.type === 'spray', sw = spray ? r1(Math.max(0.4, st.o.width * (st.o.dot / 100) * 0.5)) : 0;
      const pad = sw / 2, W = Math.max(1, box.x1 - box.x0 + pad * 2), H = Math.max(1, box.y1 - box.y0 + pad * 2);
      el = mkEl('path', {
        d: cmdsToD(cmds, box.x0 - pad, box.y0 - pad), brush: st.type, pts: [], closed: true,
        x: r1(box.x0 - pad), y: r1(box.y0 - pad), w: r1(W), h: r1(H), pw: r1(W), ph: r1(H),
        fill: st.color, stroke: st.color, strokeWidth: sw, join: 'round', cap: 'round',
      });
    } else {
      if (st.raw.length < 2) st.raw.push({ x: st.raw[0].x + 0.5, y: st.raw[0].y });
      const tol = st.type === 'pencil' ? 0.4 + st.o.smooth * 0.5 : 1.6;
      // 직선은 양 끝 두 점만 남긴다 (모서리점)
      const a = st.raw[0], z = st.raw[st.raw.length - 1];
      const pts = st.line ? [{ x: r1(a.x), y: r1(a.y) }, { x: r1(z.x), y: r1(z.y) }] : toSmoothPts(simplify(st.raw, tol));
      el = mkEl('path', Object.assign({ pts, closed: false, x: 0, y: 0, w: d.width, h: d.height, pw: d.width, ph: d.height, brush: st.type }, lineProps(st.type, st.o, st.color)));
      // 상자를 선에 꼭 맞게
      const s = Core.samplePath(el.pts, false, 16);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      s.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
      el.pts.forEach((p) => { ['x', 'ix', 'ox'].forEach((k) => { if (p[k] != null) p[k] = r1(p[k] - x0); }); ['y', 'iy', 'oy'].forEach((k) => { if (p[k] != null) p[k] = r1(p[k] - y0); }); });
      el.x = r1(x0); el.y = r1(y0); el.w = r1(Math.max(1, x1 - x0)); el.h = r1(Math.max(1, y1 - y0)); el.pw = el.w; el.ph = el.h;
    }
    // 계속 그릴 수 있게 선택하지 않고 넣는다
    Store.checkpoint();
    Store.slide().elements.push(el);
    Store.sel = [];
    Store.emit({ content: true });
  }

  /* ---------- 포인터 ---------- */
  function toSlide(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (Editor.scale || 1), y: (e.clientY - r.top) / (Editor.scale || 1) };
  }
  const inStage = (e) => e.target && e.target.closest && e.target.closest('#stage-wrap') && !e.target.closest('.ctx-menu, .sel-play');
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
  function onDown(e) {
    if (!B.mode || e.button !== 0 || !inStage(e)) return;
    stop(e);
    stroke = newStroke(info(S.type).id, optsOf(), S.color);
    addPoint(stroke, toSlide(e), performance.now(), e.pointerType === 'pen' ? e.pressure : 0, Editor.scale);
    draw();
  }
  function onMove(e) {
    if (!B.mode || !stroke) return;
    stop(e);
    const p = toSlide(e), last = stroke.raw[stroke.raw.length - 1];
    if (e.shiftKey || S.straight || stroke.line) {
      // 한 번 직선으로 긋기 시작한 획은 Shift 를 떼어도 끝까지 직선으로 둔다
      straighten(stroke, p, Editor.scale, e.ctrlKey || e.metaKey);
      draw();
      return;
    }
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2 / (Editor.scale || 1)) return;
    addPoint(stroke, p, performance.now(), e.pointerType === 'pen' ? e.pressure : 0, Editor.scale);
    draw();
  }
  function onUp(e) {
    if (!B.mode || !stroke) return;
    stop(e);
    const st = stroke;
    stroke = null;
    draw();
    try { finish(st); } catch (err) { console.error(err); UI.toast('획을 만들지 못했습니다: ' + err.message, 'error'); }
  }
  function onKey(e) {
    if (!B.mode || document.querySelector('.modal-bg')) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 'Escape' || e.key === 'Enter') { stop(e); B.stop(); return; }
    const ctrl = e.ctrlKey || e.metaKey;
    // 브러시 중에는 다른 단축키(삭제·글자 입력 등)가 먹지 않게 한다. 실행 취소·저장 같은 Ctrl 조합은 그대로 둔다.
    if (!ctrl) stop(e);
  }

  /* ---------- 긋는 중 표시 ---------- */
  function node(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null && v !== '') n.setAttribute(k, v); });
    svg.appendChild(n);
    return n;
  }
  function draw() {
    if (!svg) return;
    svg.innerHTML = '';
    const d = Store.deck;
    if (!d || !stroke) return;
    svg.setAttribute('width', d.width); svg.setAttribute('height', d.height);
    const st = stroke;
    if (OUTLINE.includes(st.type)) {
      const sw = st.type === 'spray' ? Math.max(0.4, st.o.width * (st.o.dot / 100) * 0.5) : 0;
      node('path', { d: cmdsToD(outlineCmds(st, false), 0, 0), fill: st.color, stroke: sw ? st.color : 'none', 'stroke-width': sw, 'stroke-linejoin': 'round' });
      return;
    }
    const lp = lineProps(st.type, st.o, st.color);
    const n = node('path', {
      d: 'M' + st.raw.map((p) => r1(p.x) + ' ' + r1(p.y)).join(' L'), fill: 'none', stroke: lp.stroke, 'stroke-width': lp.strokeWidth,
      'stroke-linecap': lp.cap, 'stroke-linejoin': lp.join, 'stroke-dasharray': lp.dashArr ? lp.dashArr.join(' ') : '', opacity: lp.opacity != null ? lp.opacity : '',
    });
    if (lp.glow) n.style.filter = Core.glowFilter(lp.glow);
    if (lp.blend) n.style.mixBlendMode = lp.blend;
  }

  /* ---------- 미리보기 그림 (프리셋·종류) ---------- */
  const previews = new Map();
  function preview(p) {
    const color = p.color || S.color, sig = JSON.stringify([p.type, p.opts, color]);
    const hit = previews.get(p.id);
    if (hit && hit.sig === sig) return hit.html;
    const t = info(p.type), o = Object.assign({}, t.defaults, p.opts || {});
    // 가상 600×192 공간에 물결 한 줄을 긋고 절반 크기로 보여 준다
    const pts = [];
    for (let i = 0; i <= 48; i++) { const u = i / 48; pts.push({ x: 50 + u * 500, y: 96 + Math.sin(u * Math.PI * 2) * 46 }); }
    let dark = t.id === 'neon';
    const m = /^#?([0-9a-f]{6})$/i.exec(color);
    if (m && t.id !== 'marker') { const v = parseInt(m[1], 16); if ((((v >> 16) & 255) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000 > 190) dark = true; }
    let inner;
    if (OUTLINE.includes(t.id)) {
      const st = newStroke(t.id, o, color);
      st.rand = rng(7);
      let at = 0;
      // 앞쪽은 천천히, 뒤쪽은 빠르게 그은 것처럼 (붓의 굵기 변화가 보이게)
      pts.forEach((q, i) => { at += i < 20 ? 22 : 5; addPoint(st, q, at, 0, 1); });
      const sw = t.id === 'spray' ? Math.max(0.4, o.width * (o.dot / 100) * 0.5) : 0;
      inner = `<path d="${cmdsToD(outlineCmds(st, true), 0, 0)}" fill="${color}"${sw ? ` stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`;
    } else {
      const lp = lineProps(t.id, o, color);
      inner = `<path d="M${pts.map((q) => r1(q.x) + ' ' + r1(q.y)).join(' L')}" fill="none" stroke="${lp.stroke}" stroke-width="${lp.strokeWidth}" stroke-linecap="${lp.cap}" stroke-linejoin="${lp.join}"`
        + (lp.dashArr ? ` stroke-dasharray="${lp.dashArr.join(' ')}"` : '') + (lp.opacity != null ? ` opacity="${lp.opacity}"` : '') + (lp.glow ? ` style="filter:${Core.glowFilter(lp.glow)}"` : '') + '/>';
    }
    const html = `<svg viewBox="0 0 600 192" preserveAspectRatio="xMidYMid meet" style="background:${dark ? '#1f2430' : '#f3f4f8'}">${inner}</svg>`;
    previews.set(p.id, { sig, html });
    return html;
  }

  /* ---------- 옵션 창 ---------- */
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k in n && typeof v !== 'string') n[k] = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return n;
  }
  const SWATCHES = ['#222222', '#ffffff', '#fa5252', '#f59f00', '#ffd43b', '#40c057', '#22b8cf', '#4dabf7', '#7950f2', '#f06595'];
  function setOpt(key, v) {
    const t = info(S.type);
    S[t.id] = Object.assign(optsOf(t.id), { [key]: v });
    persist();
  }
  function ask(title, value) {
    const v = window.prompt(title, value);
    return v == null ? null : v.trim();
  }
  function build() {
    if (!panel) return;
    const t = info(S.type), o = optsOf(t.id);
    const row = (label, ctrl) => h('label', { class: 'br-row' }, h('span', null, label), ctrl);
    const range = (key, min, max, step, format) => {
      const out = h('output', null, (format || ((v) => Math.round(v * 10) / 10))(o[key]));
      const inp = h('input', { type: 'range', min, max, step: step || 1, value: o[key], oninput: () => { setOpt(key, +inp.value); out.textContent = (format || ((v) => Math.round(v * 10) / 10))(+inp.value); } });
      return h('span', { class: 'br-range' }, inp, out);
    };
    const rows = [row(t.widthLabel, range('width', 1, t.max, 1))];
    t.options.forEach((op) => {
      if (op.type === 'range') rows.push(row(op.label, range(op.key, op.min, op.max, op.step, op.format)));
      else if (op.type === 'select') {
        const sel = h('select', { onchange: () => setOpt(op.key, sel.value) }, op.options.map(([v, l]) => h('option', { value: v }, l)));
        sel.value = o[op.key];
        rows.push(row(op.label, sel));
      } else {
        const box = h('input', { type: 'checkbox', checked: !!o[op.key], onchange: () => setOpt(op.key, box.checked) });
        rows.push(h('label', { class: 'br-check' }, box, h('span', null, op.label)));
      }
    });
    const straightBox = h('input', { type: 'checkbox', checked: !!S.straight, onchange: () => { S.straight = straightBox.checked; persist(); } });
    const colorInp = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(S.color) ? S.color : '#222222', title: '선 색', oninput: () => { S.color = colorInp.value; persist(); refreshPresets(); } });
    const withColor = h('input', { type: 'checkbox', checked: true });
    const presetGrid = h('div', { class: 'br-presets' });
    const refreshPresets = () => {
      presetGrid.replaceChildren(...presets().map((p) => h('button', {
        type: 'button', class: 'br-preset' + (p.builtin ? '' : ' mine'), 'data-id': p.id, title: p.name + ' · ' + info(p.type).label + (p.builtin ? '' : ' (내 브러시 · 우클릭: 이름 바꾸기·삭제)'),
        onclick: () => { applyPreset(p); build(); },
        oncontextmenu: (e) => {
          e.preventDefault(); e.stopPropagation();
          if (p.builtin) return;
          const name = ask(`"${p.name}" — 새 이름을 넣으면 이름이 바뀌고, 비우고 확인을 누르면 삭제합니다.`, p.name);
          if (name == null) return;
          if (!name) { if (window.confirm(`"${p.name}" 브러시를 삭제할까요?`)) { mine = mine.filter((x) => x.id !== p.id); saveMine(); refreshPresets(); } return; }
          p.name = name; saveMine(); refreshPresets();
        },
      }, h('span', { class: 'br-thumb', html: preview(p) }), h('span', { class: 'br-name' }, p.name))));
    };
    refreshPresets();
    panel.replaceChildren(
      h('div', { class: 'br-head' }, h('b', null, '🖌 브러시'), h('span', { class: 'br-tip' }, '끌어서 그리기 · Esc = 끝'), h('button', { type: 'button', class: 'br-x', title: '브러시 끝내기 (Esc)', onclick: () => B.stop() }, '✕')),
      h('div', { class: 'br-types' }, TYPES.map((x) => h('button', { type: 'button', class: 'br-type' + (x.id === t.id ? ' on' : ''), 'data-type': x.id, title: x.hint, onclick: () => { S.type = x.id; persist(); build(); } }, h('i', null, x.icon), h('span', null, x.label)))),
      h('div', { class: 'br-colors' }, colorInp, SWATCHES.map((c) => h('button', { type: 'button', class: 'br-sw' + (c.toLowerCase() === String(S.color).toLowerCase() ? ' on' : ''), style: `background:${c}`, title: c, onclick: () => { S.color = c; persist(); build(); } }))),
      h('label', { class: 'br-check br-straight', title: 'Shift 를 누른 채 끌어도 직선이 됩니다. Ctrl 을 함께 누르면 15° 단위로 맞춥니다.' }, straightBox, h('span', null, '직선으로 긋기'), h('small', null, 'Shift = 직선 · +Ctrl = 15°')),
      h('div', { class: 'br-opts' }, rows, h('p', { class: 'br-hint' }, t.hint),
        h('button', { type: 'button', class: 'br-btn', title: '이 브러시의 옵션을 처음 값으로', onclick: () => { delete S[t.id]; persist(); build(); } }, '↺ 기본값으로')),
      h('div', { class: 'br-sub' }, '브러시 프리셋'),
      presetGrid,
      h('div', { class: 'br-save' },
        h('button', { type: 'button', class: 'br-btn primary', title: '지금 고른 브러시 종류와 옵션을 프리셋으로 저장', onclick: () => {
          const name = ask('브러시 프리셋 이름', '내 ' + t.label);
          if (!name) return;
          mine = [{ id: 'u-' + Date.now().toString(36), name, type: t.id, opts: optsOf(t.id), ...(withColor.checked ? { color: S.color } : {}) }].concat(mine);
          saveMine(); refreshPresets();
          UI.toast('브러시 프리셋으로 저장했습니다');
        } }, '＋ 지금 브러시 저장'),
        h('label', { class: 'br-check', title: '끄면 프리셋을 골라도 지금 쓰는 색이 그대로 유지됩니다' }, withColor, h('span', null, '색도 함께'))));
  }

  /* ---------- 시작 / 끝 ---------- */
  B.init = function () {
    wrap = document.getElementById('stage-wrap');
    canvas = document.getElementById('canvas');
    svg = document.createElementNS(NS, 'svg');
    svg.id = 'brush-layer';
    canvas.appendChild(svg);
    panel = document.createElement('div');
    panel.id = 'brush-panel';
    panel.hidden = true;
    document.body.appendChild(panel);
    // 옵션 창 안에서 누른 것이 편집기의 선택·끌기로 넘어가지 않게 한다
    ['pointerdown', 'mousedown', 'dblclick', 'wheel'].forEach((ev) => panel.addEventListener(ev, (e) => e.stopPropagation()));
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
    document.addEventListener('keydown', onKey, true);
    Store.on((ev) => { if (ev && ev.slideChanged && stroke) { stroke = null; draw(); } });
  };
  B.start = function () {
    if (B.mode) return;
    if (window.Pen && Pen.mode === 'edit') Pen.exitEdit();
    if (window.Pen && Pen.mode === 'draw') Pen.cancelDraw();
    if (Editor.editing) Editor.commitEdit();
    Store.select([]);
    B.mode = true;
    stroke = null;
    wrap.classList.add('brush-mode');
    const btn = document.getElementById('btn-brush');
    if (btn) btn.classList.add('active');
    // 상단 바 바로 아래, 왼쪽 슬라이드 목록 위에 놓는다
    const main = document.getElementById('main');
    if (main) panel.style.top = Math.round(main.getBoundingClientRect().top + 6) + 'px';
    panel.hidden = false;
    build();
  };
  B.stop = function () {
    if (!B.mode) return;
    B.mode = false;
    stroke = null;
    wrap.classList.remove('brush-mode');
    const btn = document.getElementById('btn-brush');
    if (btn) btn.classList.remove('active');
    panel.hidden = true;
    draw();
  };
  B.toggle = () => (B.mode ? B.stop() : B.start());
  // 시험·스킬에서 쓰기 위한 창구
  B.state = S;
  B.TYPES = TYPES;
  B.presets = presets;
  return B;
})();
