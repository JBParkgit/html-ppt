/* 문서 모델, 테마, 레이아웃, 화면 비율, 실행취소, 자동 저장 */
const Core = PlayerCore();

const ASPECTS = {
  '16:9':   { label: '16:9 와이드 (기본)', w: 1920, h: 1080 },
  '4:3':    { label: '4:3 표준', w: 1440, h: 1080 },
  '16:10':  { label: '16:10', w: 1920, h: 1200 },
  '21:9':   { label: '21:9 시네마', w: 2520, h: 1080 },
  '1:1':    { label: '1:1 정사각 (SNS)', w: 1080, h: 1080 },
  '4:5':    { label: '4:5 세로 (인스타)', w: 1080, h: 1350 },
  '9:16':   { label: '9:16 세로 (쇼츠/릴스)', w: 1080, h: 1920 },
  'A4':     { label: 'A4 가로 (인쇄)', w: 1754, h: 1240 },
  'A4P':    { label: 'A4 세로 (인쇄)', w: 1240, h: 1754 },
  'custom': { label: '사용자 지정…', w: 0, h: 0 },
};

const FONTS = [
  ["'Noto Sans KR', sans-serif", '본고딕 (Noto Sans KR)'],
  ["'Nanum Gothic', sans-serif", '나눔고딕'],
  ["'Nanum Myeongjo', serif", '나눔명조'],
  ["'Gowun Dodum', sans-serif", '고운돋움'],
  ["'Black Han Sans', sans-serif", '검은고딕 (제목용)'],
  ["'Do Hyeon', sans-serif", '도현'],
  ["'Jua', sans-serif", '주아'],
  ["'Nanum Pen Script', cursive", '나눔손글씨 펜'],
  ["'Montserrat', sans-serif", 'Montserrat'],
  ["'Playfair Display', serif", 'Playfair Display'],
  ["'Roboto Mono', monospace", 'Roboto Mono'],
  ["Georgia, serif", 'Georgia'],
];

const THEMES = {
  classic:  { name: '클래식 화이트', bg: { type: 'color', color: '#ffffff' }, title: '#1c2333', text: '#495057', accent: '#3b5bdb', accent2: '#e8590c', fontTitle: "'Noto Sans KR', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
  midnight: { name: '미드나잇', bg: { type: 'gradient', color: '#0f1729', gradient: 'linear-gradient(135deg,#0f1729 0%,#1b2a4a 100%)' }, title: '#ffffff', text: '#c5d0e6', accent: '#4dabf7', accent2: '#ffd43b', fontTitle: "'Noto Sans KR', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
  sunset:   { name: '선셋', bg: { type: 'gradient', color: '#ff6b6b', gradient: 'linear-gradient(135deg,#ff8a5b 0%,#e8467c 55%,#7b2ff7 100%)' }, title: '#ffffff', text: '#fff1f3', accent: '#ffe066', accent2: '#ffffff', fontTitle: "'Black Han Sans', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
  forest:   { name: '포레스트', bg: { type: 'color', color: '#f4f1ea' }, title: '#1f3d2b', text: '#4a5a4f', accent: '#2f9e44', accent2: '#c08a3e', fontTitle: "'Nanum Myeongjo', serif", fontBody: "'Gowun Dodum', sans-serif" },
  neon:     { name: '네온', bg: { type: 'gradient', color: '#0b0b12', gradient: 'radial-gradient(circle at 20% 20%,#2a1050 0%,#0b0b12 60%)' }, title: '#ffffff', text: '#b8b8d1', accent: '#f72585', accent2: '#4cc9f0', fontTitle: "'Montserrat', 'Noto Sans KR', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
  pastel:   { name: '파스텔', bg: { type: 'gradient', color: '#fdf6ff', gradient: 'linear-gradient(160deg,#fdf6ff 0%,#eaf4ff 100%)' }, title: '#5f3dc4', text: '#5c5470', accent: '#9775fa', accent2: '#ff8cc6', fontTitle: "'Jua', sans-serif", fontBody: "'Gowun Dodum', sans-serif" },
  mono:     { name: '모노 미니멀', bg: { type: 'color', color: '#f5f5f2' }, title: '#111111', text: '#555555', accent: '#111111', accent2: '#d6336c', fontTitle: "'Playfair Display', 'Nanum Myeongjo', serif", fontBody: "'Noto Sans KR', sans-serif" },
  corporate:{ name: '코퍼레이트 블루', bg: { type: 'color', color: '#f7f9fc' }, title: '#0b2545', text: '#3d4e66', accent: '#1d4ed8', accent2: '#f59e0b', fontTitle: "'Noto Sans KR', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
  startup:  { name: '스타트업 바이올렛', bg: { type: 'gradient', color: '#1e1b4b', gradient: 'linear-gradient(135deg,#1e1b4b 0%,#4c1d95 100%)' }, title: '#ffffff', text: '#ddd6fe', accent: '#a78bfa', accent2: '#f472b6', fontTitle: "'Montserrat', 'Noto Sans KR', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
  warm:     { name: '웜 베이지', bg: { type: 'color', color: '#fbf6ef' }, title: '#5c3d2e', text: '#7a5c4d', accent: '#e07a5f', accent2: '#3d8b7a', fontTitle: "'Nanum Myeongjo', serif", fontBody: "'Gowun Dodum', sans-serif" },
  editorial:{ name: '에디토리얼', bg: { type: 'color', color: '#ffffff' }, title: '#111111', text: '#444444', accent: '#e63946', accent2: '#1d3557', fontTitle: "'Playfair Display', 'Nanum Myeongjo', serif", fontBody: "'Noto Sans KR', sans-serif" },
  mint:     { name: '민트 프레시', bg: { type: 'gradient', color: '#e6fcf5', gradient: 'linear-gradient(160deg,#e6fcf5 0%,#e7f5ff 100%)' }, title: '#087f5b', text: '#34595f', accent: '#12b886', accent2: '#228be6', fontTitle: "'Do Hyeon', sans-serif", fontBody: "'Gowun Dodum', sans-serif" },
  gold:     { name: '블랙 골드', bg: { type: 'color', color: '#0d0d0d' }, title: '#f5e6c8', text: '#bfb6a5', accent: '#d4a24c', accent2: '#ffffff', fontTitle: "'Playfair Display', 'Nanum Myeongjo', serif", fontBody: "'Noto Sans KR', sans-serif" },
  tech:     { name: '테크 그린', bg: { type: 'gradient', color: '#0a0f0d', gradient: 'radial-gradient(circle at 80% 10%,#0f2e22 0%,#0a0f0d 55%)' }, title: '#e6ffed', text: '#9fbfa8', accent: '#39ff88', accent2: '#00d1ff', fontTitle: "'Montserrat', 'Noto Sans KR', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
  ocean:    { name: '오션', bg: { type: 'gradient', color: '#0b7285', gradient: 'linear-gradient(135deg,#0b7285 0%,#1864ab 100%)' }, title: '#ffffff', text: '#d0ebff', accent: '#66d9e8', accent2: '#ffe066', fontTitle: "'Do Hyeon', sans-serif", fontBody: "'Noto Sans KR', sans-serif" },
};

const BG_PRESETS = [
  'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
  'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
  'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  'linear-gradient(135deg,#30cfd0 0%,#330867 100%)',
  'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
  'linear-gradient(180deg,#e0eafc 0%,#cfdef3 100%)',
  'radial-gradient(circle at 30% 30%,#ffecd2 0%,#fcb69f 100%)',
  'linear-gradient(135deg,#232526 0%,#414345 100%)',
  'linear-gradient(120deg,#d4fc79 0%,#96e6a1 100%)',
  'linear-gradient(135deg,#ff9a9e 0%,#fad0c4 100%)',
];

const LAYOUTS = {
  title:       '제목 슬라이드',
  section:     '섹션 구분',
  'section-center': '섹션 구분 · 가운데',
  'section-band':   '섹션 구분 · 가로 띠',
  'section-right':  '섹션 구분 · 오른쪽 블록',
  'section-number': '섹션 구분 · 큰 숫자',
  'section-frame':  '섹션 구분 · 액자',
  bullets:     '제목 + 글머리 기호',
  text:          '본문 (긴 글)',
  'text-2col':   '본문 2단',
  'text-points': '본문 + 요점',
  scripture:     '성경 본문 (긴 구절)',
  'list-2col':   '긴 목록 (2단)',
  'two-column':'2단 비교',
  'image-text':'이미지 + 텍스트',
  quote:       '인용문',
  'big-number':'큰 숫자 강조',
  agenda:      '목차',
  cards:       '카드 3단',
  timeline:    '타임라인',
  stats:       '핵심 지표 3개',
  chart:       '제목 + 차트',
  quiz:        '퀴즈 (클릭형)',
  code:        '제목 + 코드',
  'image-full':'전면 이미지',
  closing:     '마무리',
  blank:       '빈 화면',
};

// 배경색 위에서 읽기 좋은 글자색
function readable(c) {
  const m = String(c || '').match(/^#?([0-9a-f]{6})$/i);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  const l = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  // 흰 글자와 어두운 글자(#1f2430, 밝기 0.0176) 중 대비가 더 큰 쪽
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.0676 ? '#ffffff' : '#1f2430';
}

/* 테마 색 자리(slot) — 요소가 테마의 어느 색을 쓰는지 기억해 두면 테마를 여러 번 바꿔도 제자리 색을 찾는다
   (한 테마 안에서 제목·보조 강조가 둘 다 흰색이어도 섞이지 않게) */
const normColor = (c) => String(c || '').trim().toLowerCase().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
const THEME_PREFER = { title: 'title', body: 'text', scripture: 'title', 'accent-text': 'accent', chart: 'text' };
const COLOR_ORDER = ['title', 'text', 'accent', 'accent2'], FILL_ORDER = ['accent', 'accent2', 'title', 'text'];
function themeSlot(th, v, prefer, order, saved) {
  const k = normColor(v);
  if (!k || !/^#[0-9a-f]{6}$/.test(k)) return null;
  if (saved && normColor(th[saved]) === k) return saved;
  if (prefer && normColor(th[prefer]) === k) return prefer;
  return order.find((s) => normColor(th[s]) === k) || null;
}
// 레이아웃이 만든 요소에 색 자리를 적어 둔다
function tagThemeSlots(t, els) {
  els.forEach((e) => {
    if (!e.role) return;
    const ts = {};
    const c = themeSlot(t, e.color, THEME_PREFER[e.role], COLOR_ORDER);
    const f = e.fill && e.fill !== 'transparent' ? themeSlot(t, e.fill, null, FILL_ORDER) : null;
    if (c) ts.color = c;
    if (f) ts.fill = f;
    if (c || f) e.tslot = ts;
  });
}

// "제목: 설명" 형태를 [제목, 설명] 으로
function splitPair(s) {
  const m = String(s || '').match(/^\s*([^:：]+)[:：]\s*(.*)$/);
  return m ? [m[1].trim(), m[2].trim()] : [String(s || '').trim(), ''];
}

const uid = () => Math.random().toString(36).slice(2, 10);

function escHtml(s) { return Core.esc(s); }
function bulletsHtml(items) {
  items = (items || []).filter((x) => String(x).trim());
  return items.length ? '<ul>' + items.map((x) => '<li>' + escHtml(x) + '</li>').join('') + '</ul>' : '';
}
function textHtml(s) { return escHtml(s).replace(/\n/g, '<br>'); }

/* ---------- 긴 글 레이아웃용: 서식 · 분량 추정 · 글자 크기 맞춤 · 장 나누기 ---------- */
// **굵게**, *기울임*, ==형광펜==, {#ff0000|색 글자}
function richHtml(s) {
  return escHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/==(.+?)==/g, '<span style="background-color: rgba(255, 212, 59, 0.45);">$1</span>')
    .replace(/\{(#[0-9a-fA-F]{3,8})\|(.+?)\}/g, '<span style="color: $1;">$2</span>')
    .replace(/\n/g, '<br>');
}
const plainOf = (s) => String(s || '').replace(/\*\*|==|\*/g, '').replace(/\{#[0-9a-fA-F]{3,8}\|(.+?)\}/g, '$1');
// 글자 폭(em): 한글·한자·전각 1, 공백 0.3, 그 밖 0.55
function textEm(s) {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    w += (c >= 0x1100 && c <= 0x11ff) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef) ? 1 : ch === ' ' ? 0.3 : 0.55;
  }
  return w;
}
// w px 폭에 f px 글자로 쓸 때의 줄 수 (단어 단위 줄바꿈 손실을 감안해 넉넉히)
function lineCount(text, f, w) {
  const per = w / f;
  return plainOf(text).split('\n').reduce((n, p) => n + Math.max(1, Math.ceil((textEm(p) * 1.08) / per)), 0);
}
// 상자(w×h)에 들어가는 가장 큰 글자 크기 (cols 단이면 줄을 나눠 담는다)
function fitFont(text, w, h, lh, max, min, cols) {
  cols = cols || 1;
  for (let f = max; f >= min; f -= 2) if (Math.ceil(lineCount(text, f, w) / cols) * f * lh <= h) return { size: f, fits: true };
  return { size: min, fits: false };
}
// 문단 → 문장 → 어절 순으로 쪼개 maxLines 줄 안에 담기는 덩어리들로
function chunkText(text, f, w, maxLines) {
  const fits = (s) => lineCount(s, f, w) <= maxLines;
  const out = [];
  let cur = '';
  const push = (piece, sep) => {
    const next = cur ? cur + sep + piece : piece;
    if (fits(next)) { cur = next; return; }
    if (cur) { out.push(cur); cur = ''; }
    if (fits(piece)) { cur = piece; return; }
    const sents = piece.split(/(?<=[.!?。다요라니까])\s+/);
    if (sents.length > 1) { sents.forEach((s) => push(s, ' ')); return; }
    piece.split(/\s+/).forEach((wd) => push(wd, ' '));
  };
  String(text || '').split('\n').forEach((p) => push(p, '\n'));
  if (cur) out.push(cur);
  return out;
}

// 긴 글 레이아웃의 본문 상자 크기 · 글자 범위
const TEXT_LAYOUTS = ['text', 'text-2col', 'text-points', 'scripture'];
function textGeom(deck, layout, c) {
  const W = deck.width, H = deck.height, P = H > W * 1.05;
  const k = Math.min(W, H) / 1080, fs = (n) => Math.round(n * k);
  const mx = Math.round(W * 0.07), my = Math.round(H * 0.08);
  const pad = 8;
  if (layout === 'scripture') {
    const capH = c.caption ? fs(60) : 0;
    const y = my + fs(130);
    return { x: mx, y, w: W - mx * 2, h: H - my - y - capH, lh: 1.7, max: fs(P ? 52 : 56), min: fs(30), cols: 1, pad };
  }
  const y = my + fs(170), h = H - my - y;
  if (layout === 'text-2col' && !P) {
    const gap = fs(70), cw = (W - mx * 2 - gap) / 2;
    return { x: mx, y, w: cw, h, gap, lh: 1.6, max: fs(38), min: fs(26), cols: 2, pad };
  }
  if (layout === 'text-points') {
    const gap = fs(50);
    const lw = P ? W - mx * 2 : (W - mx * 2 - gap) * 0.62;
    const lh0 = P ? (h - gap) * 0.6 : h;
    return { x: mx, y, w: lw, h: lh0, gap, lh: 1.6, max: fs(38), min: fs(26), cols: 1, pad };
  }
  return { x: mx, y, w: W - mx * 2, h, lh: 1.6, max: fs(40), min: fs(26), cols: 1, pad };
}

// 최소 글자로도 넘치면 여러 장 분량으로 나눈다 → 슬라이드 내용(c) 배열
function paginateText(deck, layout, c) {
  if (!TEXT_LAYOUTS.includes(layout) || !c || !c.text) return [c];
  const g = textGeom(deck, layout, c);
  const uw = g.w - g.pad * 2;
  // 읽기 좋은 크기(범위의 중간보다 조금 크게) — 한 장에 담으려면 이보다 4px 넘게 작아져야 하면 나눈다
  const f = Math.round((g.max + g.min) / 2 / 2) * 2 + 2;
  const best = fitFont(c.text, uw, g.h - g.pad * 2, g.lh, g.max, g.min, g.cols);
  if (best.fits && best.size >= f - 4) return [c];
  const maxLines = Math.max(1, Math.floor((g.h - g.pad * 2) / (f * g.lh))) * g.cols;
  let parts = chunkText(c.text, f, uw, maxLines);
  if (parts.length < 2) return [c];
  // 장마다 분량이 고르도록 같은 장 수 안에서 줄 수를 평균에 맞춰 다시 나눈다
  const even = chunkText(c.text, f, uw, Math.ceil(lineCount(c.text, f, uw) / parts.length) + 1);
  if (even.length === parts.length) parts = even;
  return parts.map((t, i) => Object.assign({}, c, { text: t, fontSize: f, title: i && layout !== 'scripture' ? (c.title || '') + ' (계속)' : c.title }));
}

function mkEl(type, props) {
  const base = { id: uid(), type, x: 100, y: 100, w: 600, h: 200, rotation: 0, opacity: 1 };
  if (type === 'text') Object.assign(base, { html: '텍스트를 입력하세요', fontSize: 40, color: '#222', align: 'left', valign: 'top', fill: 'transparent', padding: 8, lineHeight: 1.35 });
  if (type === 'shape') Object.assign(base, { shape: 'rounded', fill: '#4dabf7', html: '', fontSize: 36, color: '#fff', align: 'center', valign: 'middle', padding: 16, lineHeight: 1.3 });
  if (type === 'image') Object.assign(base, { src: '', fit: 'cover', radius: 0 });
  if (type === 'video') Object.assign(base, { src: '', fit: 'contain', autoplay: false, loop: false, muted: false, controls: true, fill: '#000' });
  if (type === 'embed') Object.assign(base, { url: '', autoplay: false, muted: false, loop: false, controls: true });
  if (type === 'model') Object.assign(base, { src: '', w: 700, h: 700, fill: 'transparent', autoRotate: true, rotateSpeed: 30, controls: true, zoom: false, exposure: 1, shadowIntensity: 1, envLight: 'neutral', animation: true, orbit: '' });
  if (type === 'chart') Object.assign(base, { chartType: 'bar', data: '항목,2025,2026\n1분기,40,55\n2분기,52,68\n3분기,61,80\n4분기,70,96', fontSize: 26, color: '#333333', colors: '', showValues: true, showLegend: true, showGrid: true, chartAnim: true });
  if (type === 'code') Object.assign(base, { code: 'function greet(name) {\n  return `안녕, ${name}!`;\n}', lang: 'js', codeTheme: 'dark', fontSize: 30, lineNumbers: true, title: '' });
  if (type === 'path') Object.assign(base, { pts: [], closed: false, stroke: '#222222', strokeWidth: 6, fill: 'transparent', dash: 'solid', cap: 'round', join: 'round', arrowStart: false, arrowEnd: false });
  if (type === 'table') Object.assign(base, { data: '항목,값,비고\nA,100,설명\nB,200,설명\nC,300,설명', fontSize: 26, color: '#222', headerColor: '#3b5bdb', headerRow: true, striped: true });
  return Object.assign(base, props || {});
}

function mkSlide(props) {
  return Object.assign({ id: uid(), bg: { type: 'color', color: '#ffffff' }, transition: { type: 'fade', duration: 700 }, duration: 5, notes: '', elements: [], anims: [] }, props || {});
}

function mkAnim(elId, effect, trigger, props) {
  return Object.assign({ id: uid(), elId, effect, trigger: trigger || 'click', duration: Core.ANIMS[effect] && Core.ANIMS[effect].loop ? 2000 : 700, delay: 0, repeat: 1 }, props || {});
}

/* 레이아웃으로 슬라이드 생성. c: { title, subtitle, bullets, left, right, leftTitle, rightTitle, quote, author, number, caption, image, emoji } */
function buildLayout(deck, layout, c, opts) {
  c = c || {};
  opts = opts || {};
  const W = deck.width, H = deck.height, P = H > W * 1.05; // portrait
  const t = deckTheme(deck);
  const k = Math.min(W, H) / 1080;
  const fs = (n) => Math.round(n * k);
  const mx = Math.round(W * 0.07), my = Math.round(H * 0.08);
  const els = [], anims = [];
  const title = (props) => mkEl('text', Object.assign({ role: 'title', color: t.title, fontFamily: t.fontTitle, bold: true, lineHeight: 1.2 }, props));
  const body = (props) => mkEl('text', Object.assign({ role: 'body', color: t.text, fontFamily: t.fontBody, lineHeight: 1.5 }, props));
  const accent = (props) => mkEl('shape', Object.assign({ role: 'accent', shape: 'rect', fill: t.accent, html: '' }, props));
  const anim = opts.animate !== false;
  const A = (el, effect, trigger, extra) => { if (anim && el) anims.push(mkAnim(el.id, effect, trigger || 'after', extra)); };

  // 섹션 번호: 생략하면 '01', 빈 값("")이면 번호 없이 (emoji 가 있으면 emoji)
  const secNum = c.number == null ? (c.emoji || '01') : String(c.number || c.emoji || '');
  const sec = (...a) => a.filter(Boolean);

  switch (layout) {
    case 'title': {
      const bar = accent({ x: W / 2 - fs(60), y: H * 0.36, w: fs(120), h: fs(10), shape: 'pill' });
      const tt = title({ x: mx, y: H * 0.38 + fs(30), w: W - mx * 2, h: H * 0.2, html: textHtml(c.title || '프레젠테이션 제목'), fontSize: fs(P ? 92 : 104), align: 'center', valign: 'middle' });
      const st = body({ x: mx, y: tt.y + tt.h + fs(10), w: W - mx * 2, h: fs(90), html: textHtml(c.subtitle || '부제목을 입력하세요'), fontSize: fs(40), align: 'center', valign: 'top', color: t.text });
      els.push(bar, tt, st);
      A(bar, 'wipe-right', 'after', { duration: 500 }); A(tt, 'rise', 'after'); A(st, 'fade-in', 'after');
      break;
    }
    case 'section': {
      const blk = accent({ x: 0, y: 0, w: P ? W : W * 0.38, h: P ? H * 0.4 : H });
      const num = secNum && mkEl('text', { role: 'accent-text', x: P ? mx : mx, y: P ? H * 0.08 : H * 0.3, w: P ? W - mx * 2 : W * 0.38 - mx * 2, h: H * 0.3, html: escHtml(secNum), fontSize: fs(220), bold: true, color: readable(t.accent), fontFamily: t.fontTitle, align: 'center', valign: 'middle' });
      const tt = title({ x: P ? mx : W * 0.38 + mx, y: P ? H * 0.46 : H * 0.32, w: P ? W - mx * 2 : W * 0.62 - mx * 2, h: H * 0.2, html: textHtml(c.title || '섹션 제목'), fontSize: fs(84), valign: 'bottom' });
      const st = body({ x: tt.x, y: tt.y + tt.h + fs(20), w: tt.w, h: H * 0.2, html: textHtml(c.subtitle || ''), fontSize: fs(36) });
      els.push(...sec(blk, num, tt, st));
      A(blk, P ? 'fly-top' : 'fly-left', 'after', { duration: 600 }); A(num, 'zoom-in', 'after'); A(tt, 'slide-in-left', 'after'); A(st, 'fade-in', 'with', { delay: 200 });
      break;
    }
    case 'section-center': {
      const num = secNum && mkEl('text', { role: 'accent-text', x: mx, y: H * (P ? 0.2 : 0.14), w: W - mx * 2, h: H * 0.2, html: escHtml(secNum), fontSize: fs(170), bold: true, color: t.accent, fontFamily: t.fontTitle, align: 'center', valign: 'bottom', lineHeight: 1 });
      const bar = accent({ x: W / 2 - fs(50), y: num ? num.y + num.h + fs(30) : H * (P ? 0.36 : 0.32), w: fs(100), h: fs(8), shape: 'pill' });
      const tt = title({ x: mx, y: bar.y + fs(40), w: W - mx * 2, h: H * 0.2, html: textHtml(c.title || '섹션 제목'), fontSize: fs(P ? 80 : 92), align: 'center', valign: 'middle' });
      const st = body({ x: mx, y: tt.y + tt.h + fs(10), w: W - mx * 2, h: fs(110), html: textHtml(c.subtitle || ''), fontSize: fs(36), align: 'center' });
      els.push(...sec(num, bar, tt, st));
      A(num, 'zoom-in', 'after', { duration: 600 }); A(bar, 'wipe-right', 'after', { duration: 400 }); A(tt, 'rise', 'after'); A(st, 'fade-in', 'with', { delay: 200 });
      break;
    }
    case 'section-band': {
      const bh = H * (P ? 0.3 : 0.34), by = H * (P ? 0.32 : 0.3);
      const band = accent({ x: 0, y: by, w: W, h: bh });
      const on = readable(t.accent);
      const num = secNum && mkEl('text', { role: 'accent-text', x: mx, y: by, w: P ? W - mx * 2 : W * 0.2, h: P ? bh * 0.4 : bh, html: escHtml(secNum), fontSize: fs(P ? 90 : 150), bold: true, color: on, fontFamily: t.fontTitle, align: P ? 'left' : 'center', valign: P ? 'bottom' : 'middle', opacity: 0.85 });
      const full = P || !num, tt = mkEl('text', { role: 'accent-text', x: full ? mx : mx + W * 0.22, y: P && num ? by + bh * 0.4 : by, w: full ? W - mx * 2 : W - mx * 2 - W * 0.22, h: P && num ? bh * 0.6 : bh, html: textHtml(c.title || '섹션 제목'), fontSize: fs(P ? 72 : 88), bold: true, color: on, fontFamily: t.fontTitle, valign: 'middle', lineHeight: 1.2 });
      const st = body({ x: tt.x, y: by + bh + fs(36), w: tt.w, h: fs(120), html: textHtml(c.subtitle || ''), fontSize: fs(36) });
      els.push(...sec(band, num, tt, st));
      A(band, 'wipe-right', 'after', { duration: 700 }); A(num, 'fade-in', 'after', { duration: 400 }); A(tt, 'slide-in-left', 'with', { delay: 100 }); A(st, 'fade-in', 'after');
      break;
    }
    case 'section-right': {
      const bw = P ? W : W * 0.38, bx = W - bw;
      const blk = accent({ x: P ? 0 : bx, y: P ? H * 0.6 : 0, w: bw, h: P ? H * 0.4 : H, fill: t.accent2 });
      const num = secNum && mkEl('text', { role: 'accent-text', x: P ? mx : bx + mx, y: P ? H * 0.65 : H * 0.3, w: P ? W - mx * 2 : bw - mx * 2, h: H * 0.3, html: escHtml(secNum), fontSize: fs(220), bold: true, color: readable(t.accent2), fontFamily: t.fontTitle, align: 'center', valign: 'middle' });
      const tw = P ? W - mx * 2 : W - bw - mx * 2;
      const tt = title({ x: mx, y: P ? H * 0.14 : H * 0.32, w: tw, h: H * 0.2, html: textHtml(c.title || '섹션 제목'), fontSize: fs(84), align: P ? 'left' : 'right', valign: 'bottom' });
      const bar = accent({ x: P ? mx : mx + tw - fs(90), y: tt.y + tt.h + fs(20), w: fs(90), h: fs(8), shape: 'pill' });
      const st = body({ x: mx, y: bar.y + fs(36), w: tw, h: H * 0.2, html: textHtml(c.subtitle || ''), fontSize: fs(36), align: P ? 'left' : 'right' });
      els.push(...sec(blk, num, tt, bar, st));
      A(blk, P ? 'fly-bottom' : 'fly-right', 'after', { duration: 600 }); A(num, 'zoom-in', 'after'); A(tt, 'fade-in', 'after'); A(bar, 'wipe-right', 'with', { delay: 200 }); A(st, 'fade-in', 'with', { delay: 300 });
      break;
    }
    case 'section-number': {
      const big = secNum && mkEl('text', { role: 'accent-text', x: P ? 0 : W * 0.42, y: P ? H * 0.04 : -H * 0.06, w: P ? W : W * 0.58, h: P ? H * 0.5 : H * 0.9, html: escHtml(secNum), fontSize: fs(P ? 420 : 640), bold: true, color: t.accent, fontFamily: t.fontTitle, align: P ? 'center' : 'right', valign: 'middle', lineHeight: 1, opacity: 0.16 });
      const lab = (c.number == null || String(c.number)) && mkEl('text', { role: 'accent-text', x: mx, y: my, w: W * 0.5, h: fs(60), html: 'PART ' + escHtml(c.number == null ? '01' : String(c.number)), fontSize: fs(32), bold: true, color: t.accent, fontFamily: t.fontBody, letterSpacing: 6 });
      const tt = title({ x: mx, y: H * (P ? 0.5 : 0.36), w: P ? W - mx * 2 : W * 0.62, h: H * 0.22, html: textHtml(c.title || '섹션 제목'), fontSize: fs(P ? 80 : 96), valign: 'bottom' });
      const bar = accent({ x: mx + 6, y: tt.y + tt.h + fs(10), w: fs(120), h: fs(10), shape: 'pill' });
      const st = body({ x: mx, y: bar.y + fs(40), w: tt.w, h: fs(120), html: textHtml(c.subtitle || ''), fontSize: fs(36) });
      els.push(...sec(big, lab, tt, bar, st));
      A(big, 'blur-in', 'after', { duration: 900 }); A(lab, 'fade-in', 'with', { delay: 300 }); A(tt, 'slide-in-left', 'after'); A(bar, 'wipe-right', 'with', { delay: 200 }); A(st, 'fade-in', 'after');
      break;
    }
    case 'section-frame': {
      const fx = mx, fy = my, fw = W - mx * 2, fh = H - my * 2;
      const frame = accent({ x: fx, y: fy, w: fw, h: fh, fill: 'transparent', borderWidth: fs(4), borderColor: t.accent });
      const lab = secNum && mkEl('text', { role: 'accent-text', x: fx, y: H * 0.3, w: fw, h: fs(70), html: '— ' + escHtml(secNum) + ' —', fontSize: fs(44), bold: true, color: t.accent, fontFamily: t.fontTitle, align: 'center', valign: 'middle', letterSpacing: 8 });
      const tt = title({ x: fx + fs(60), y: lab ? lab.y + fs(90) : H * 0.3 + fs(40), w: fw - fs(120), h: H * 0.2, html: textHtml(c.title || '섹션 제목'), fontSize: fs(P ? 80 : 92), align: 'center', valign: 'middle' });
      const st = body({ x: tt.x, y: tt.y + tt.h + fs(20), w: tt.w, h: fs(110), html: textHtml(c.subtitle || ''), fontSize: fs(36), align: 'center' });
      els.push(...sec(frame, lab, tt, st));
      A(frame, 'zoom-in', 'after', { duration: 700 }); A(lab, 'fade-in', 'after', { duration: 400 }); A(tt, 'blur-in', 'after', { duration: 800 }); A(st, 'fade-in', 'after');
      break;
    }
    case 'text':
    case 'text-2col':
    case 'text-points': {
      const g = textGeom(deck, layout, c);
      const text = c.text || c.subtitle || '긴 글을 입력하세요. 문단은 줄을 바꿔 구분합니다.\n글자 양에 맞춰 크기가 자동으로 정해지고, 너무 많으면 여러 장으로 나뉩니다.';
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '제목'), fontSize: fs(60), valign: 'middle' });
      const bar = accent({ x: mx + 8, y: my + fs(128), w: fs(90), h: fs(8), shape: 'pill' });
      els.push(tt, bar);
      A(tt, 'fade-in', 'after', { duration: 500 }); A(bar, 'wipe-right', 'with', { delay: 200 });
      const uw = g.w - g.pad * 2, uh = g.h - g.pad * 2;
      const fit = c.fontSize ? { size: +c.fontSize, fits: true } : fitFont(text, uw, uh, g.lh, g.max, g.min, g.cols);
      if (!fit.fits && opts.warn) opts.warn(`"${plainOf(c.title || '제목')}" — 글이 많아 ${fit.size}px 로도 넘칩니다. 내용을 나누세요.`);
      const box = (x, w, h, s) => body({ x, y: g.y, w, h, html: richHtml(s), fontSize: fit.size, lineHeight: g.lh, align: c.align || 'left' });
      if (g.cols === 2) {
        const cap = Math.ceil(lineCount(text, fit.size, uw) / 2);
        const parts = chunkText(text, fit.size, uw, Math.max(cap, 1));
        const b1 = box(g.x, g.w, g.h, parts[0] || ''), b2 = box(g.x + g.w + g.gap, g.w, g.h, parts.slice(1).join('\n'));
        const rule = mkEl('shape', { role: 'accent', shape: 'rect', x: g.x + g.w + g.gap / 2 - fs(1), y: g.y + fs(10), w: fs(2), h: g.h - fs(20), fill: t.text, opacity: 0.2 });
        els.push(b1, rule, b2);
        A(b1, 'fade-in', 'after'); A(rule, 'wipe-down', 'with', { delay: 150 }); A(b2, 'fade-in', 'with', { delay: 300 });
      } else {
        const b = box(g.x, g.w, g.h, text);
        els.push(b); A(b, 'fade-in', 'after');
      }
      if (layout === 'text-points') {
        const px = P ? mx : g.x + g.w + g.gap, py = P ? g.y + g.h + g.gap : g.y;
        const pw = P ? W - mx * 2 : W - mx - px, ph = P ? H - my - py : g.h;
        const items = c.bullets && c.bullets.length ? c.bullets : ['핵심 요점 1', '핵심 요점 2', '핵심 요점 3'];
        const card = mkEl('shape', { role: 'card', shape: 'rounded', x: px, y: py, w: pw, h: ph, fill: t.accent, opacity: 0.12, html: '', radius: fs(24) });
        const hd = title({ x: px + fs(30), y: py + fs(26), w: pw - fs(60), h: fs(70), html: textHtml(c.pointsTitle || '핵심'), fontSize: fs(38), color: t.accent });
        const ih = ph - fs(116);
        const pf = fitFont(items.join('\n'), pw - fs(110) - 16, ih - 16, 1.5, fs(36), fs(26));
        const pb = body({ x: px + fs(30), y: py + fs(100), w: pw - fs(60), h: ih, html: bulletsHtml(items.map(plainOf)), fontSize: pf.size });
        els.push(card, hd, pb);
        A(card, 'zoom-in', 'after', { duration: 500 }); A(hd, 'fade-in', 'with', { delay: 150 }); A(pb, 'rise', 'with', { delay: 250 });
      }
      break;
    }
    case 'scripture': {
      const g = textGeom(deck, layout, c);
      const text = c.text || c.quote || '1 본문 구절을 입력하세요. 줄 앞의 숫자는 절 번호로 표시됩니다.\n2 구절이 길면 글자 크기가 자동으로 맞춰집니다.';
      const ref = title({ x: mx, y: my, w: W - mx * 2, h: fs(80), html: textHtml(c.title || '성경 본문'), fontSize: fs(40), color: t.accent, valign: 'middle', fontFamily: t.fontBody });
      const bar = accent({ x: mx + 8, y: my + fs(92), w: W - mx * 2 - 16, h: fs(2), opacity: 0.4 });
      const uw = g.w - g.pad * 2, uh = g.h - g.pad * 2;
      const fit = c.fontSize ? { size: +c.fontSize, fits: true } : fitFont(text, uw, uh, g.lh, g.max, g.min);
      if (!fit.fits && opts.warn) opts.warn(`"${plainOf(c.title || '성경 본문')}" — 구절이 많아 ${fit.size}px 로도 넘칩니다. 구절을 나누세요.`);
      // 줄 앞 숫자 → 작은 강조색 절 번호
      const html = String(text).split('\n').map((ln) => {
        const m = ln.match(/^\s*(\d{1,3})\s+(.*)$/);
        return m ? `<span style="color: ${t.accent}; font-size: 0.6em; font-weight: 700; vertical-align: 0.5em;">${m[1]}</span> ` + richHtml(m[2]) : richHtml(ln);
      }).join('<br>');
      const b = title({ x: g.x, y: g.y, w: g.w, h: g.h, html, fontSize: fit.size, lineHeight: g.lh, bold: false, valign: 'top' });
      b.role = 'scripture'; // 본문이지만 테마의 제목 색·글꼴을 따른다
      els.push(ref, bar, b);
      A(ref, 'fade-in', 'after', { duration: 500 }); A(bar, 'wipe-right', 'with', { delay: 150 }); A(b, 'fade-in', 'after', { duration: 900 });
      if (c.caption) {
        const cp = body({ x: mx, y: H - my - fs(60), w: W - mx * 2, h: fs(60), html: textHtml(c.caption), fontSize: fs(26), align: 'right', valign: 'bottom', opacity: 0.75 });
        els.push(cp); A(cp, 'fade-in', 'with', { delay: 400 });
      }
      break;
    }
    case 'list-2col': {
      const items = (c.bullets && c.bullets.length ? c.bullets : Array.from({ length: 10 }, (_, i) => `항목 ${i + 1}`)).slice(0, 16);
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '목록'), fontSize: fs(60), valign: 'middle' });
      const bar = accent({ x: mx + 8, y: my + fs(128), w: fs(90), h: fs(8), shape: 'pill' });
      els.push(tt, bar);
      A(tt, 'fade-in', 'after', { duration: 500 }); A(bar, 'wipe-right', 'with', { delay: 200 });
      const cols = P || items.length <= 5 ? 1 : 2, gap = fs(60), top = my + fs(170);
      const cw = (W - mx * 2 - gap * (cols - 1)) / cols, chH = H - my - top;
      const per = Math.ceil(items.length / cols);
      const num = (i) => `<span style="color: ${t.accent}; font-weight: 700;">${String(i + 1).padStart(2, '0')}</span>  `;
      const fit = fitFont(items.map((x, i) => '00  ' + x).join('\n'), cw - 16, chH - 16, 1.7, fs(40), fs(26), cols);
      if (!fit.fits && opts.warn) opts.warn(`"${plainOf(c.title || '목록')}" — 항목이 많거나 길어 넘칩니다. 항목을 줄이거나 나누세요.`);
      for (let ci = 0; ci < cols; ci++) {
        const part = items.slice(ci * per, ci * per + per);
        const b = body({ x: mx + ci * (cw + gap), y: top, w: cw, h: chH, html: part.map((x, j) => num(ci * per + j) + richHtml(x)).join('<br>'), fontSize: fit.size, lineHeight: 1.7 });
        els.push(b); A(b, 'rise', ci ? 'with' : 'after', { delay: ci * 200 });
      }
      break;
    }
    case 'bullets': {
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '제목'), fontSize: fs(64), valign: 'middle' });
      const bar = accent({ x: mx + 8, y: my + fs(128), w: fs(90), h: fs(8), shape: 'pill' });
      const b = body({ x: mx, y: my + fs(170), w: W - mx * 2, h: H - my * 2 - fs(170), html: bulletsHtml(c.bullets && c.bullets.length ? c.bullets : ['첫 번째 요점', '두 번째 요점', '세 번째 요점']), fontSize: fs(40) });
      els.push(tt, bar, b);
      A(tt, 'fade-in', 'after', { duration: 500 }); A(bar, 'wipe-right', 'with', { delay: 200 }); A(b, 'rise', 'after');
      break;
    }
    case 'two-column': {
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '비교'), fontSize: fs(60), valign: 'middle' });
      const top = my + fs(160);
      const gap = fs(40);
      const cw = P ? W - mx * 2 : (W - mx * 2 - gap) / 2;
      const ch = P ? (H - top - my - gap) / 2 : H - top - my;
      const box = (i, head, items) => {
        const x = P ? mx : mx + i * (cw + gap), y = P ? top + i * (ch + gap) : top;
        const card = mkEl('shape', { role: 'card', shape: 'rounded', x, y, w: cw, h: ch, fill: i ? t.accent2 : t.accent, opacity: 0.12, html: '' });
        const hd = title({ x: x + fs(30), y: y + fs(24), w: cw - fs(60), h: fs(70), html: textHtml(head), fontSize: fs(40), color: i ? t.accent2 : t.accent });
        const bd = body({ x: x + fs(30), y: y + fs(104), w: cw - fs(60), h: ch - fs(124), html: bulletsHtml(items), fontSize: fs(32) });
        els.push(card, hd, bd);
        A(card, 'zoom-in', i ? 'click' : 'after', { duration: 500 }); A(hd, 'fade-in', 'after', { duration: 400 }); A(bd, 'rise', 'with', { delay: 150 });
      };
      els.push(tt); A(tt, 'fade-in', 'after', { duration: 500 });
      box(0, c.leftTitle || '왼쪽', c.left && c.left.length ? c.left : ['내용 1', '내용 2']);
      box(1, c.rightTitle || '오른쪽', c.right && c.right.length ? c.right : ['내용 1', '내용 2']);
      break;
    }
    case 'image-text': {
      const iw = P ? W - mx * 2 : W * 0.46, ih = P ? H * 0.42 : H - my * 2;
      const img = c.image
        ? mkEl('image', { role: 'image', src: c.image, x: mx, y: my, w: iw, h: ih, radius: fs(24) })
        : mkEl('shape', { role: 'image-placeholder', shape: 'rounded', x: mx, y: my, w: iw, h: ih, fill: t.accent, opacity: 0.18, html: '🖼️<br>이미지 영역<br><small>이미지를 끌어다 놓으세요</small>', color: t.title, fontSize: fs(40) });
      const tx = P ? mx : mx + iw + fs(60), tw = P ? W - mx * 2 : W - tx - mx;
      const ty = P ? my + ih + fs(50) : my + fs(30);
      const tt = title({ x: tx, y: ty, w: tw, h: fs(150), html: textHtml(c.title || '제목'), fontSize: fs(56), valign: 'bottom' });
      const b = body({ x: tx, y: ty + fs(170), w: tw, h: (P ? H - my : H - my) - (ty + fs(170)), html: c.bullets && c.bullets.length ? bulletsHtml(c.bullets) : textHtml(c.subtitle || '설명 텍스트를 입력하세요.'), fontSize: fs(34) });
      els.push(img, tt, b);
      A(img, P ? 'fly-top' : 'fly-left', 'after'); A(tt, 'fade-in', 'after'); A(b, 'rise', 'with', { delay: 200 });
      break;
    }
    case 'quote': {
      const q = mkEl('text', { role: 'accent-text', x: mx, y: H * 0.12, w: fs(200), h: fs(200), html: '“', fontSize: fs(300), color: t.accent, fontFamily: 'Georgia, serif', bold: true, lineHeight: 1 });
      const tt = title({ x: mx + fs(40), y: H * 0.28, w: W - mx * 2 - fs(80), h: H * 0.4, html: textHtml(c.quote || c.title || '인용문을 입력하세요'), fontSize: fs(P ? 56 : 64), align: 'center', valign: 'middle', italic: false });
      const au = body({ x: mx, y: H * 0.7, w: W - mx * 2, h: fs(70), html: textHtml(c.author ? '— ' + c.author : ''), fontSize: fs(34), align: 'center' });
      els.push(q, tt, au);
      A(q, 'zoom-in', 'after', { duration: 500 }); A(tt, 'blur-in', 'after', { duration: 900 }); A(au, 'fade-in', 'after');
      break;
    }
    case 'big-number': {
      const n = title({ x: mx, y: H * 0.18, w: W - mx * 2, h: H * 0.38, html: escHtml(c.number || '87%'), fontSize: fs(P ? 260 : 300), align: 'center', valign: 'middle', color: t.accent });
      const cap = title({ x: mx, y: H * 0.58, w: W - mx * 2, h: fs(100), html: textHtml(c.title || '핵심 지표'), fontSize: fs(56), align: 'center' });
      const st = body({ x: mx, y: H * 0.58 + fs(110), w: W - mx * 2, h: fs(140), html: textHtml(c.caption || c.subtitle || '숫자에 대한 설명'), fontSize: fs(34), align: 'center' });
      els.push(n, cap, st);
      A(n, 'count-up', 'after', { duration: 1600 }); A(cap, 'rise', 'after'); A(st, 'fade-in', 'after');
      break;
    }
    case 'agenda': {
      const items = (c.bullets && c.bullets.length ? c.bullets : ['배경', '현황', '전략', '실행 계획']).slice(0, 7);
      const tt = title({ x: mx, y: my, w: P ? W - mx * 2 : W * 0.32, h: fs(P ? 140 : 300), html: textHtml(c.title || '목차'), fontSize: fs(P ? 80 : 88), valign: P ? 'middle' : 'top' });
      const bar = accent({ x: mx + 6, y: tt.y + tt.h + fs(10), w: fs(90), h: fs(10), shape: 'pill' });
      els.push(tt, bar);
      A(tt, 'fade-in', 'after', { duration: 500 }); A(bar, 'wipe-right', 'with', { delay: 200 });
      const lx = P ? mx : W * 0.42, top0 = P ? my + fs(220) : my + fs(10);
      const rh = Math.min(fs(130), (H - my - top0) / items.length);
      const top = P ? top0 : Math.max(top0, (H - rh * items.length) / 2);
      items.forEach((it, i) => {
        const y = top + i * rh;
        const circ = mkEl('shape', { role: 'accent', shape: 'ellipse', x: lx, y: y + rh * 0.12, w: rh * 0.7, h: rh * 0.7, fill: t.accent, html: String(i + 1).padStart(2, '0'), fontSize: Math.round(rh * 0.28), color: readable(t.accent), bold: true, fontFamily: t.fontTitle });
        const tx = body({ x: lx + rh * 0.95, y: y + rh * 0.08, w: W - mx - (lx + rh * 0.95), h: rh * 0.78, html: textHtml(it), fontSize: fs(42), valign: 'middle', color: t.title });
        els.push(circ, tx);
        A(circ, 'zoom-in', 'after', { duration: 350, delay: i ? 60 : 200 }); A(tx, 'slide-in-left', 'with', { duration: 450, delay: 100 });
      });
      break;
    }
    case 'cards': {
      const items = (c.bullets && c.bullets.length ? c.bullets : ['🚀 속도: 더 빠르게', '🎯 정확성: 더 정확하게', '🤝 협업: 함께 더 멀리']).slice(0, 4);
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '핵심 가치'), fontSize: fs(64), valign: 'middle', align: P ? 'left' : 'center' });
      els.push(tt); A(tt, 'fade-in', 'after', { duration: 500 });
      const n = items.length, gap = fs(36), top0 = my + fs(170);
      const cw = P ? W - mx * 2 : (W - mx * 2 - gap * (n - 1)) / n;
      const ch = P ? Math.min(fs(380), (H - top0 - my - gap * (n - 1)) / n) : Math.min(fs(440), H - top0 - my);
      const top = P ? top0 + Math.max(0, (H - top0 - my - (ch * n + gap * (n - 1))) / 2) : top0 + Math.max(0, (H - top0 - my - ch) / 2);
      items.forEach((it, i) => {
        const [head, desc] = splitPair(it);
        const x = P ? mx : mx + i * (cw + gap), y = P ? top + i * (ch + gap) : top;
        const card = mkEl('shape', { role: 'card', shape: 'rounded', x, y, w: cw, h: ch, fill: t.accent, opacity: 0.12, html: '', radius: fs(28) });
        const stripe = accent({ x: x + fs(30), y: y + fs(30), w: fs(70), h: fs(8), shape: 'pill', fill: i % 2 ? t.accent2 : t.accent });
        const hd = title({ x: x + fs(30), y: y + fs(56), w: cw - fs(60), h: fs(P ? 80 : 130), html: textHtml(head), fontSize: fs(P ? 40 : 46), valign: 'top' });
        const bd = body({ x: x + fs(30), y: y + fs(P ? 140 : 196), w: cw - fs(60), h: ch - fs(P ? 160 : 220), html: textHtml(desc), fontSize: fs(32), lineHeight: 1.45 });
        els.push(card, stripe, hd, bd);
        A(card, 'rise', i ? 'after' : 'after', { duration: 500, delay: i ? 0 : 150 }); A(stripe, 'wipe-right', 'with', { delay: 200, duration: 400 }); A(hd, 'fade-in', 'with', { delay: 150 }); A(bd, 'fade-in', 'with', { delay: 300 });
        card.hover = 'lift';
      });
      break;
    }
    case 'timeline': {
      const items = (c.bullets && c.bullets.length ? c.bullets : ['2023: 아이디어', '2024: 출시', '2025: 성장', '2026: 확장']).slice(0, 6);
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '로드맵'), fontSize: fs(64), valign: 'middle' });
      els.push(tt); A(tt, 'fade-in', 'after', { duration: 500 });
      const n = items.length;
      if (!P) {
        const ly = H * 0.52, x0 = mx + fs(40), x1 = W - mx - fs(40);
        const line = mkEl('shape', { role: 'accent', shape: 'line', x: x0, y: ly - fs(20), w: x1 - x0, h: fs(40), fill: t.accent, lineWidth: fs(8) });
        els.push(line); A(line, 'wipe-right', 'after', { duration: 900 });
        items.forEach((it, i) => {
          const [when, what] = splitPair(it);
          const cx = x0 + ((x1 - x0) * (i + 0.5)) / n, cw = (x1 - x0) / n - fs(20);
          const dot = mkEl('shape', { role: 'accent', shape: 'ellipse', x: cx - fs(26), y: ly - fs(26), w: fs(52), h: fs(52), fill: i % 2 ? t.accent2 : t.accent, borderWidth: fs(6), borderColor: '#ffffff' });
          const up = i % 2 === 0;
          const wl = title({ x: cx - cw / 2, y: up ? ly - fs(190) : ly + fs(50), w: cw, h: fs(80), html: textHtml(when), fontSize: fs(44), align: 'center', valign: up ? 'bottom' : 'top', color: i % 2 ? t.accent2 : t.accent });
          const ds = body({ x: cx - cw / 2, y: up ? ly - fs(110) : ly + fs(130), w: cw, h: fs(100), html: textHtml(what), fontSize: fs(28), align: 'center', valign: up ? 'bottom' : 'top' });
          if (!up) { wl.y = ly + fs(50); ds.y = ly + fs(130); } else { wl.y = ly - fs(250); ds.y = ly - fs(160); }
          els.push(dot, wl, ds);
          A(dot, 'zoom-in', 'after', { duration: 300 }); A(wl, up ? 'sink' : 'rise', 'with', { duration: 450 }); A(ds, 'fade-in', 'with', { delay: 150 });
        });
      } else {
        const lx = mx + fs(40), y0 = my + fs(200), y1 = H - my;
        const line = mkEl('shape', { role: 'accent', shape: 'rect', x: lx - fs(4), y: y0, w: fs(8), h: y1 - y0, fill: t.accent });
        els.push(line); A(line, 'wipe-down', 'after', { duration: 900 });
        items.forEach((it, i) => {
          const [when, what] = splitPair(it);
          const cy = y0 + ((y1 - y0) * (i + 0.5)) / n;
          const dot = mkEl('shape', { role: 'accent', shape: 'ellipse', x: lx - fs(24), y: cy - fs(24), w: fs(48), h: fs(48), fill: i % 2 ? t.accent2 : t.accent, borderWidth: fs(6), borderColor: '#ffffff' });
          const wl = title({ x: lx + fs(50), y: cy - fs(70), w: W - lx - mx - fs(50), h: fs(70), html: textHtml(when), fontSize: fs(44), color: i % 2 ? t.accent2 : t.accent, valign: 'bottom' });
          const ds = body({ x: lx + fs(50), y: cy, w: W - lx - mx - fs(50), h: fs(100), html: textHtml(what), fontSize: fs(32) });
          els.push(dot, wl, ds);
          A(dot, 'zoom-in', 'after', { duration: 300 }); A(wl, 'slide-in-left', 'with'); A(ds, 'fade-in', 'with', { delay: 150 });
        });
      }
      break;
    }
    case 'stats': {
      const items = (c.bullets && c.bullets.length ? c.bullets : ['120만: 누적 사용자', '98%: 고객 만족도', '35개국: 서비스 국가']).slice(0, 4);
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '숫자로 보는 성과'), fontSize: fs(64), valign: 'middle', align: 'center' });
      els.push(tt); A(tt, 'fade-in', 'after', { duration: 500 });
      const n = items.length, top = my + fs(200);
      const cw = P ? W - mx * 2 : (W - mx * 2) / n, ch = P ? (H - top - my) / n : H - top - my;
      items.forEach((it, i) => {
        const [num, lab] = splitPair(it);
        const x = P ? mx : mx + i * cw, y = P ? top + i * ch : top;
        const nb = title({ x, y: y + (P ? 0 : ch * 0.18), w: cw, h: P ? ch * 0.6 : ch * 0.4, html: escHtml(num), fontSize: fs(P ? 120 : 130), align: 'center', valign: 'bottom', color: i % 2 ? t.accent2 : t.accent });
        const lb = body({ x, y: nb.y + nb.h + fs(10), w: cw, h: fs(110), html: textHtml(lab), fontSize: fs(34), align: 'center' });
        els.push(nb, lb);
        if (i && !P) { const sep = mkEl('shape', { role: 'accent', shape: 'rect', x: x - fs(2), y: y + ch * 0.2, w: fs(4), h: ch * 0.55, fill: t.text, opacity: 0.25 }); els.push(sep); }
        A(nb, 'count-up', i ? 'with' : 'after', { duration: 1600, delay: i * 200 }); A(lb, 'rise', 'with', { delay: 300 + i * 200 });
      });
      break;
    }
    case 'chart': {
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(120), html: textHtml(c.title || '성장 추이'), fontSize: fs(60), valign: 'middle' });
      const capH = c.caption || c.subtitle ? fs(90) : 0;
      const ch = mkEl('chart', { role: 'chart', x: mx, y: my + fs(150), w: W - mx * 2, h: H - my * 2 - fs(150) - capH, chartType: c.chartType || 'bar', fontSize: fs(28), color: t.text, colors: [t.accent, t.accent2, '#51cf66', '#fcc419', '#ff6b6b', '#845ef7'].join(',') });
      if (c.chartData) ch.data = c.chartData;
      els.push(tt, ch);
      A(tt, 'fade-in', 'after', { duration: 500 }); A(ch, 'chart-draw', 'after', { duration: 1600 });
      if (capH) { const cp = body({ x: mx, y: H - my - capH, w: W - mx * 2, h: capH, html: textHtml(c.caption || c.subtitle), fontSize: fs(30), align: 'center', valign: 'middle' }); els.push(cp); A(cp, 'fade-in', 'after'); }
      break;
    }
    case 'quiz': {
      const answers = (c.bullets && c.bullets.length ? c.bullets : ['보기 1', '보기 2', '보기 3', '보기 4']).slice(0, 4);
      const correct = Math.max(1, Math.min(answers.length, +c.correct || 1)) - 1;
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(170), html: textHtml(c.title || '퀴즈: 질문을 입력하세요'), fontSize: fs(58), valign: 'middle', align: 'center' });
      els.push(tt); A(tt, 'zoom-in', 'after', { duration: 500 });
      const top = my + fs(210), gap = fs(30);
      const cols = P ? 1 : 2, rowsN = Math.ceil(answers.length / cols);
      const bw = (W - mx * 2 - gap * (cols - 1)) / cols, bh = Math.min(fs(150), (H - top - my - fs(170) - gap * (rowsN - 1)) / rowsN);
      const exp = body({ x: mx, y: H - my - fs(140), w: W - mx * 2, h: fs(140), html: textHtml(c.caption || '💡 정답 해설을 입력하세요'), fontSize: fs(34), align: 'center', valign: 'middle', startHidden: true, fill: t.accent2, radius: fs(20), color: readable(t.accent2) });
      answers.forEach((ans, i) => {
        const x = mx + (i % cols) * (bw + gap), y = top + Math.floor(i / cols) * (bh + gap);
        const b = mkEl('shape', { role: 'button', shape: 'pill', x, y, w: bw, h: bh, fill: t.accent, html: escHtml(String.fromCharCode(65 + i) + '.  ' + ans), fontSize: fs(38), color: readable(t.accent), bold: true, fontFamily: t.fontBody, hover: 'grow', action: { type: 'answer', correct: i === correct, target: i === correct ? exp.id : '' } });
        els.push(b);
        A(b, 'rise', 'after', { duration: 400, delay: i ? 0 : 200 });
      });
      els.push(exp);
      break;
    }
    case 'code': {
      const tt = title({ x: mx, y: my, w: W - mx * 2, h: fs(110), html: textHtml(c.title || '코드 예제'), fontSize: fs(56), valign: 'middle' });
      const capH = c.caption || c.subtitle ? fs(80) : 0;
      const cd = mkEl('code', { role: 'code', x: mx, y: my + fs(140), w: W - mx * 2, h: H - my * 2 - fs(140) - capH, code: c.code || mkEl('code').code, lang: c.lang || 'js', title: c.fileName || '', fontSize: fs(P ? 30 : 34), codeTheme: t.bg && /^#(f|e|d)/i.test(t.bg.color || '') ? 'light' : 'dark' });
      els.push(tt, cd);
      A(tt, 'fade-in', 'after', { duration: 500 }); A(cd, 'rise', 'after');
      if (capH) { const cp = body({ x: mx, y: H - my - capH, w: W - mx * 2, h: capH, html: textHtml(c.caption || c.subtitle), fontSize: fs(30), valign: 'middle' }); els.push(cp); A(cp, 'fade-in', 'after'); }
      break;
    }
    case 'image-full': {
      const bgImg = c.image ? mkEl('image', { role: 'image', src: c.image, x: 0, y: 0, w: W, h: H, fit: 'cover' })
        : mkEl('shape', { role: 'image-placeholder', shape: 'rect', x: 0, y: 0, w: W, h: H, fill: t.accent, opacity: 0.25, html: '🖼️ 전면 이미지 — 이미지를 끌어다 놓으세요', fontSize: fs(40), color: t.title, valign: 'top', align: 'right', padding: fs(40) });
      const shade = mkEl('shape', { role: 'overlay', shape: 'rect', x: 0, y: H * 0.45, w: W, h: H * 0.55, fill: 'linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.75) 100%)' });
      const tt = mkEl('text', { role: 'title-on-image', x: mx, y: H * 0.6, w: W - mx * 2, h: H * 0.2, html: textHtml(c.title || '강렬한 한 문장'), fontSize: fs(P ? 90 : 100), color: '#ffffff', bold: true, fontFamily: t.fontTitle, valign: 'bottom', textShadow: true, lineHeight: 1.15 });
      const st = mkEl('text', { role: 'subtitle-on-image', x: mx, y: H * 0.8 + fs(10), w: W - mx * 2, h: fs(100), html: textHtml(c.subtitle || ''), fontSize: fs(38), color: '#f1f3f5', fontFamily: t.fontBody });
      els.push(bgImg, shade, tt, st);
      A(bgImg, 'zoom-down', 'after', { duration: 1400 }); A(tt, 'rise', 'with', { delay: 500 }); A(st, 'fade-in', 'after');
      break;
    }
    case 'closing': {
      const tt = title({ x: mx, y: H * 0.3, w: W - mx * 2, h: H * 0.25, html: textHtml(c.title || '감사합니다'), fontSize: fs(P ? 110 : 130), align: 'center', valign: 'middle' });
      const st = body({ x: mx, y: H * 0.57, w: W - mx * 2, h: fs(120), html: textHtml(c.subtitle || '질문과 의견을 환영합니다'), fontSize: fs(40), align: 'center' });
      const dot1 = accent({ shape: 'ellipse', x: W * 0.08, y: H * 0.12, w: fs(120), h: fs(120), opacity: 0.25 });
      const dot2 = accent({ shape: 'ellipse', x: W * 0.84, y: H * 0.7, w: fs(180), h: fs(180), fill: t.accent2, opacity: 0.25 });
      els.push(dot1, dot2, tt, st);
      A(tt, 'zoom-down', 'after', { duration: 900 }); A(st, 'fade-in', 'after');
      if (anim) { anims.push(mkAnim(dot1.id, 'float', 'with', { duration: 3000 })); anims.push(mkAnim(dot2.id, 'float', 'with', { duration: 3600 })); }
      break;
    }
    default: break;
  }
  els.forEach((e) => { e.x = Math.round(e.x); e.y = Math.round(e.y); e.w = Math.round(e.w); e.h = Math.round(e.h); });
  tagThemeSlots(t, els);
  return mkSlide({ layout, bg: JSON.parse(JSON.stringify(t.bg)), elements: els, anims, notes: c.notes || '', transition: { type: opts.transition || 'fade', duration: 700 } });
}

// 모핑 짝 찾기 — core.js 의 morphTransition 과 같은 규칙 (같은 키 우선, 없으면 같은 내용)
// 반환: Map(현재 요소 id → 앞 슬라이드 요소)
function morphPairs(prev, slide) {
  const out = new Map();
  if (!prev || !slide) return out;
  const used = new Set();
  const key = (e) => e.mkey || e.id;
  const sigs = new Map(prev.elements.map((e) => [e, Core.elSig(e)]));
  slide.elements.forEach((n) => {
    let o = prev.elements.find((x) => !used.has(x) && key(x) === key(n));
    if (!o) { const sg = Core.elSig(n); if (sg) o = prev.elements.find((x) => !used.has(x) && sigs.get(x) === sg); }
    if (o) { used.add(o); out.set(n.id, o); }
  });
  return out;
}

// 앞 슬라이드와 연결된 요소가 하나도 없는 모핑 슬라이드들의 id (순서 변경 등으로 체인이 끊긴 곳)
function brokenMorphs(deck) {
  const out = [];
  deck.slides.forEach((s, i) => {
    if (i > 0 && s.transition && s.transition.type === 'morph' && !morphPairs(deck.slides[i - 1], s).size) out.push(s.id);
  });
  return out;
}

// i 번 슬라이드 뒤에 새 슬라이드를 넣을 위치 — 모핑 체인 한가운데면 체인이 끝난 뒤로 미룬다
function chainSafeIndex(deck, i) {
  let at = i + 1;
  const isM = (k) => deck.slides[k] && deck.slides[k].transition && deck.slides[k].transition.type === 'morph';
  while (isM(at)) at++;
  return at;
}

// 모핑 체인 정보: i 번 슬라이드가 속한 연속 모핑 구간 { start, end, pos } (없으면 null)
function morphChain(deck, i) {
  // 전환이 모핑이고 앞 슬라이드와 실제로 이어지는 요소가 있을 때만 "연결됨"
  const isM = (k) => k > 0 && deck.slides[k] && deck.slides[k].transition && deck.slides[k].transition.type === 'morph' && morphPairs(deck.slides[k - 1], deck.slides[k]).size > 0;
  if (!isM(i) && !isM(i + 1)) return null;
  let start = i, end = i;
  while (start > 0 && isM(start)) start--;
  while (isM(end + 1)) end++;
  return { start, end, pos: i - start, len: end - start + 1 };
}

// 덱의 테마 (기본 테마 + deck.theme.custom 으로 덮어쓴 사용자 팔레트)
function deckTheme(deck) {
  const th = (deck && deck.theme) || {};
  return Object.assign({}, THEMES[th.id] || THEMES.classic, th.custom || {});
}

function newDeck(aspect, themeId) {
  const a = ASPECTS[aspect] || ASPECTS['16:9'];
  const deck = { version: 1, title: '새 프레젠테이션', aspect: aspect || '16:9', width: a.w, height: a.h, theme: { id: themeId || 'classic' }, autoDuration: 5, slides: [] };
  return deck;
}

function demoDeck() {
  const d = newDeck('16:9', 'midnight');
  d.title = 'HTML 프레젠테이션 스튜디오';
  d.slides.push(buildLayout(d, 'title', { title: 'HTML 프레젠테이션 스튜디오', subtitle: '웹 브라우저에서 만드는 애니메이션 프레젠테이션', notes: '데모 프레젠테이션입니다. 자유롭게 수정해 보세요.' }));
  d.slides.push(buildLayout(d, 'bullets', { title: '주요 기능', bullets: ['텍스트·도형·이미지·동영상·표 삽입', '40여 가지 애니메이션과 16가지 화면 전환', '16:9, 4:3, 1:1, 9:16 등 다양한 화면 비율', '터미널의 Claude 로 슬라이드 자동 생성·편집', '발표 화면에서 바로 텍스트 수정 (E 키)'] }, { transition: 'push-left' }));
  d.slides.push(buildLayout(d, 'two-column', { title: '편집과 발표', leftTitle: '편집기', left: ['드래그로 이동·크기 조절·회전', '더블클릭으로 텍스트 편집', '스냅 가이드 및 정렬'], rightTitle: '발표', right: ['전체화면 + 단계별 애니메이션', '자동 재생 + 녹화 → 동영상', '레이저 포인터, 노트, 타이머'] }, { transition: 'cube' }));
  d.slides.push(buildLayout(d, 'big-number', { number: '40+', title: '애니메이션 효과', caption: '나타내기 · 강조 · 반복 · 끝내기' }, { transition: 'zoom-in' }));
  const st = buildLayout(d, 'stats', { title: '숫자로 보는 기능', bullets: ['45: 애니메이션', '17: 화면 전환', '15: 디자인 테마'] }, { transition: 'push-up' });
  st.bg.fx = 'particles'; st.bg.fxColor = '#74c0fc';
  d.slides.push(st);
  d.slides.push(buildLayout(d, 'chart', { title: '움직이는 차트', chartType: 'bar', chartData: '분기,2025,2026\n1분기,40,55\n2분기,52,68\n3분기,61,80\n4분기,70,96', caption: '데이터를 바꾸면 차트가 바로 다시 그려집니다' }, { transition: 'fade' }));
  const tl = buildLayout(d, 'timeline', { title: '모핑 전환 예시', bullets: ['1단계: 기획', '2단계: 디자인', '3단계: 개발', '4단계: 발표'] }, { transition: 'cover-left' });
  d.slides.push(tl);
  const tl2 = JSON.parse(JSON.stringify(tl));
  tl2.id = uid();
  tl2.transition = { type: 'morph', duration: 1200 };
  tl2.anims = [];
  tl2.elements.forEach((e) => { e.mkey = e.id; e.id = uid(); });
  tl2.elements.forEach((e, i) => {
    if (e.type === 'text' && e.role === 'title' && i === 0) { e.html = '모핑: 같은 요소가 이어서 변형됩니다'; e.fontSize = 52; e.align = 'center'; }
    else if (e.shape === 'ellipse') { const cx = e.x + e.w / 2, cy = e.y + e.h / 2; e.w = Math.round(e.w * 1.7); e.h = Math.round(e.h * 1.7); e.x = Math.round(cx - e.w / 2); e.y = Math.round(cy - e.h / 2); e.fill = '#ff6b6b'; }
    else if (e.shape === 'line') { e.fill = '#ff6b6b'; }
  });
  d.slides.push(tl2);
  const qz = buildLayout(d, 'quiz', { title: '발표 중 퀴즈! 이 프로그램의 AI 는?', bullets: ['Claude', '계산기', '메모장', '없음'], correct: 1, caption: '💡 정답: Claude — 슬라이드 생성·편집·노트 작성까지 도와줍니다' }, { transition: 'zoom-in' });
  qz.bg.fx = 'aurora'; qz.bg.fxColor = '#4dabf7'; qz.bg.fxColor2 = '#f06595';
  d.slides.push(qz);
  d.slides.push(buildLayout(d, 'quote', { quote: '좋은 발표는 좋은 이야기에서 시작됩니다.', author: 'HTML Presentation Studio' }, { transition: 'blur' }));
  d.slides.push(buildLayout(d, 'closing', { title: '감사합니다', subtitle: '왼쪽 상단 [＋ 슬라이드]로 새 슬라이드를 추가해 보세요' }, { transition: 'circle' }));
  return d;
}

/* 화면 비율 변경: 모든 요소를 비례 재배치 */
function resizeDeck(deck, w, h) {
  const sx = w / deck.width, sy = h / deck.height, sf = Math.min(sx, sy);
  deck.slides.forEach((s) => s.elements.forEach((e) => {
    e.x = Math.round(e.x * sx); e.w = Math.round(e.w * sx);
    e.y = Math.round(e.y * sy); e.h = Math.round(e.h * sy);
    if (e.fontSize && sf < 1) e.fontSize = Math.max(8, Math.round(e.fontSize * sf));
  }));
  deck.width = w; deck.height = h;
}

/* 테마 적용: role 이 있는 요소의 색/글꼴을 테마에 맞춤 */
/*
 * 테마 적용
 * - 기본: 테마에서 온 값(이전 테마의 제목·본문·강조색·글꼴·배경과 같은 값)만 새 테마 값으로 바꾼다.
 *   직접 바꾼 색·글꼴·배경, 배경 이미지·동영상, 움직이는 배경(fx)은 그대로 둔다.
 * - opts.reset: 직접 바꾼 서식도 역할(role)에 따라 테마 값으로 되돌린다 (배경 이미지·동영상은 유지).
 * 반환: { keptBg, keptEls } — 그대로 둔 배경·개체 수
 */
function applyTheme(deck, themeId, slidesOnly, custom, opts) {
  if (!THEMES[themeId]) return { keptBg: 0, keptEls: 0 };
  opts = opts || {};
  const old = deckTheme(deck);
  deck.theme = custom ? { id: themeId, custom } : { id: themeId };
  const t = deckTheme(deck);
  const N = (c) => String(c || '').trim().toLowerCase().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
  const rgbHex = (c) => /^#[0-9a-f]{6}$/.test(N(c));
  const SLOTS = ['title', 'text', 'accent', 'accent2'];
  const PLAIN = ['#ffffff', '#000000'];
  // 이전 테마 색이면 새 테마의 같은 자리 색으로. 흰색·검정은 역할로 확실할 때만 바꾼다.
  const mapColor = (v, prefer) => {
    if (!v || typeof v !== 'string') return v;
    const k = N(v);
    if (prefer && N(old[prefer]) === k) return t[prefer];
    if (PLAIN.includes(k)) return v;
    for (const s of SLOTS) if (N(old[s]) === k) return t[s];
    return v;
  };
  const mapHtml = (html) => typeof html === 'string' ? html.replace(/#[0-9a-f]{6}\b/gi, (m) => mapColor(m)) : html;
  const codeThemeOf = (th) => (th.bg && /^#(f|e|d)/i.test(th.bg.color || '') ? 'light' : 'dark');
  const sameBg = (a, b) => (a.type || 'color') === (b.type || 'color') && N(a.color) === N(b.color) && ((a.type || 'color') !== 'gradient' || String(a.gradient || '').replace(/\s/g, '') === String(b.gradient || '').replace(/\s/g, ''));
  const FX_KEYS = ['fx', 'fxColor', 'fxColor2', 'fxSpeed', 'fxSeed'];
  const SKIP_ROLES = ['title-on-image', 'subtitle-on-image', 'overlay', 'image', 'user'];
  const PREFER = THEME_PREFER;
  // 요소의 글자색/채우기: 기억해 둔 색 자리 → 역할 → 순서대로 찾아 새 테마의 같은 자리 색으로 (찾으면 자리를 기억)
  const mapSlot = (e, kind, prefer, order) => {
    const v = e[kind];
    if (!v || typeof v !== 'string') return v;
    const saved = e.tslot && e.tslot[kind];
    if (PLAIN.includes(N(v)) && !e.role && !saved) return v;
    const sl = themeSlot(old, v, prefer, order, saved);
    if (!sl) return v;
    (e.tslot = e.tslot || {})[kind] = sl;
    return t[sl];
  };
  const FILL_ROLES = ['accent', 'card', 'button', 'image-placeholder'];
  let keptBg = 0, keptEls = 0;

  (slidesOnly || deck.slides).forEach((s) => {
    /* 배경 */
    const bg = s.bg || {};
    if (bg.type === 'image' || bg.type === 'video') {
      if (N(bg.color) === N(old.bg.color)) bg.color = t.bg.color;
      keptBg++;
    } else if (!s.bg || opts.reset || sameBg(bg, old.bg)) {
      const nb = JSON.parse(JSON.stringify(t.bg));
      FX_KEYS.forEach((k) => { if (bg[k] != null) nb[k] = bg[k]; });
      s.bg = nb;
    } else keptBg++;
    if (s.bg.fx && s.bg.fx !== 'none') {
      if (s.bg.fxColor) s.bg.fxColor = mapColor(s.bg.fxColor);
      if (s.bg.fxColor2) s.bg.fxColor2 = mapColor(s.bg.fxColor2);
    }

    /* 개체 */
    s.elements.forEach((e) => {
      if (SKIP_ROLES.includes(e.role) || e.type === 'image' || e.type === 'video' || e.type === 'embed' || e.type === 'model') return;
      const before = JSON.stringify([e.color, e.fill, e.fontFamily, e.borderColor]);
      const prefer = PREFER[e.role];
      const oldFill = e.fill;
      // 채우기
      if (opts.reset && FILL_ROLES.includes(e.role)) e.fill = N(e.fill) === N(old.accent2) ? t.accent2 : t.accent;
      else e.fill = mapSlot(e, 'fill', null, FILL_ORDER);
      // 글자 색: 테마 색 채우기 위의 자동 글자색(readable)은 새 채우기에 맞춰 다시 계산
      const autoInk = ['#ffffff', '#1f2430'].includes(N(e.color));
      if (e.color && oldFill && (e.fill !== oldFill || FILL_ROLES.includes(e.role)) && rgbHex(e.fill) && (N(e.color) === N(readable(oldFill)) || (autoInk && FILL_ROLES.includes(e.role)))) e.color = readable(e.fill);
      else if (opts.reset && prefer && e.role !== 'chart') {
        if (e.role === 'accent-text') { if (N(e.color) !== '#ffffff') e.color = N(e.color) === N(old.accent2) ? t.accent2 : t.accent; }
        else e.color = t[prefer];
      } else e.color = mapSlot(e, 'color', prefer, COLOR_ORDER);
      e.borderColor = mapColor(e.borderColor);
      if (e.highlight) e.highlight = mapColor(e.highlight);
      // 글꼴
      if (e.fontFamily) {
        const isTitle = e.role === 'title' || e.role === 'accent-text' || e.role === 'scripture';
        if (opts.reset && isTitle) e.fontFamily = t.fontTitle;
        else if (opts.reset && e.role === 'body') e.fontFamily = t.fontBody;
        else if (e.fontFamily === old.fontTitle && (isTitle || e.fontFamily !== old.fontBody)) e.fontFamily = t.fontTitle;
        else if (e.fontFamily === old.fontBody) e.fontFamily = isTitle && old.fontTitle === old.fontBody ? t.fontTitle : t.fontBody;
      }
      // 글 안의 색 글자 {#색|…}
      if (e.html) e.html = mapHtml(e.html);
      // 차트
      if (e.type === 'chart' && e.colors) e.colors = String(e.colors).split(',').map((c) => mapColor(c.trim())).join(',');
      // 표: 머리글 색 (기본 파란색이면 테마 강조색으로)
      if (e.type === 'table') {
        if (!e.headerColor || N(e.headerColor) === '#3b5bdb' || N(e.headerColor) === N(old.accent)) e.headerColor = t.accent;
        else e.headerColor = mapColor(e.headerColor);
      }
      // 코드: 이전 테마에 맞춰진 밝기면 새 테마 밝기로
      if (e.type === 'code' && (opts.reset || !e.codeTheme || e.codeTheme === codeThemeOf(old))) {
        if (e.codeTheme === 'light' || e.codeTheme === 'dark' || !e.codeTheme) e.codeTheme = codeThemeOf(t);
      }
      if (e.type !== 'code' && e.type !== 'table' && (e.color || e.fill) && before === JSON.stringify([e.color, e.fill, e.fontFamily, e.borderColor]) && (e.role || e.type === 'text' || e.type === 'shape')) {
        // 테마와 관계없는 색(직접 지정)이 남아 있으면 '그대로 둔 개체'로 센다
        const themeVals = [old.title, old.text, old.accent, old.accent2].map(N);
        if ((e.color && !PLAIN.includes(N(e.color)) && !themeVals.includes(N(e.color))) || (e.fill && e.fill !== 'transparent' && !PLAIN.includes(N(e.fill)) && !themeVals.includes(N(e.fill)) && e.role)) keptEls++;
      }
    });
    /* 강조 블록 위에 얹힌 글자(섹션 번호 · 가로 띠 제목 등)는 블록 색에 맞춰 흰색/어두운색 */
    s.elements.forEach((e, i) => {
      if (!['title', 'body', 'accent-text', 'scripture'].includes(e.role) || e.type !== 'text' || (e.fill && e.fill !== 'transparent')) return;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      for (let j = i - 1; j >= 0; j--) {
        const o = s.elements[j];
        if (o.type !== 'shape' || o.shape === 'line' || !FILL_ROLES.includes(o.role) || !rgbHex(o.fill) || (o.opacity != null && o.opacity < 0.5)) continue;
        if (cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h) { e.color = readable(o.fill); break; }
      }
    });
  });
  return { keptBg, keptEls };
}

/* ---------------- Store ---------------- */
const Store = (() => {
  const KEY = 'hppt.deck.v1';
  const listeners = [];
  let history = [], future = [];
  let saveT = null;

  const S = {
    deck: null,
    cur: 0,
    sel: [],
    dirty: false,

    init() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.deck = JSON.parse(raw);
      } catch (e) { /* ignore */ }
      if (!this.deck || !this.deck.slides || !this.deck.slides.length) this.deck = demoDeck();
      this.cur = Math.min(+(localStorage.getItem(KEY + '.cur') || 0), this.deck.slides.length - 1);
    },

    on(fn) { listeners.push(fn); },
    emit(info) {
      info = info || {};
      listeners.forEach((fn) => fn(info));
      this.scheduleSave();
    },

    slide() { return this.deck.slides[this.cur]; },
    el(id) { return this.slide().elements.find((e) => e.id === id); },
    selected() { return this.sel.map((id) => this.el(id)).filter(Boolean); },

    checkpoint() {
      history.push(JSON.stringify({ deck: this.deck, cur: this.cur }));
      if (history.length > 150) history.shift();
      future = [];
    },
    undo() {
      if (!history.length) return false;
      future.push(JSON.stringify({ deck: this.deck, cur: this.cur }));
      const s = JSON.parse(history.pop());
      this.deck = s.deck; this.cur = Math.min(s.cur, this.deck.slides.length - 1);
      this.sel = this.sel.filter((id) => this.el(id));
      this.emit({ structure: true });
      return true;
    },
    redo() {
      if (!future.length) return false;
      history.push(JSON.stringify({ deck: this.deck, cur: this.cur }));
      const s = JSON.parse(future.pop());
      this.deck = s.deck; this.cur = Math.min(s.cur, this.deck.slides.length - 1);
      this.sel = this.sel.filter((id) => this.el(id));
      this.emit({ structure: true });
      return true;
    },
    pushSnapshot(json) {
      history.push(json);
      if (history.length > 150) history.shift();
      future = [];
    },
    canUndo() { return history.length > 0; },
    canRedo() { return future.length > 0; },
    resetHistory() { history = []; future = []; },

    scheduleSave() {
      this.dirty = true;
      clearTimeout(saveT);
      saveT = setTimeout(() => this.saveNow(), 600);
    },
    saveNow() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.deck));
        localStorage.setItem(KEY + '.cur', String(this.cur));
        this.dirty = false;
        const st = document.getElementById('save-state');
        if (st) st.textContent = '자동 저장됨 ' + new Date().toLocaleTimeString().replace(/:\d+$/, '').replace(/:\d+ /, ' ');
        return true;
      } catch (e) {
        if (typeof UI !== 'undefined') UI.toast('저장 공간이 부족합니다. 파일로 저장하세요. (' + e.name + ')', 'error');
        return false;
      }
    },

    setDeck(deck) {
      this.checkpoint();
      this.deck = deck;
      this.cur = 0;
      this.sel = [];
      this.emit({ structure: true });
    },

    select(ids) {
      this.sel = ids || [];
      listeners.forEach((fn) => fn({ select: true }));
    },

    goto(i) {
      if (i < 0 || i >= this.deck.slides.length) return;
      this.cur = i;
      this.sel = [];
      try { localStorage.setItem(KEY + '.cur', String(i)); } catch (e) { /* ignore */ }
      listeners.forEach((fn) => fn({ slideChanged: true }));
    },

    allMediaSrcs() {
      const out = [];
      ((this.deck.bgm && this.deck.bgm.tracks) || []).forEach((t) => { if (t.src) out.push(t.src); });
      this.deck.slides.forEach((s) => {
        if (s.bg && s.bg.src) out.push(s.bg.src);
        s.elements.forEach((e) => { if (e.src) out.push(e.src); });
      });
      return out;
    },
  };
  return S;
})();
