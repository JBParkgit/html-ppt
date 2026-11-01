#!/usr/bin/env node
/*
 * slide-studio CLI — HTML 프레젠테이션 스튜디오를 Claude 에서 제어한다.
 * 앱의 레이아웃 엔진(js/core.js + js/store.js)을 그대로 불러와 사용하므로, 편집기와 결과가 동일하다.
 *
 *   node deck.mjs <command> [args]      (도움말: node deck.mjs help)
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.HPPT_ROOT || findRoot(HERE);
const URL_BASE = (process.env.HPPT_URL || 'http://localhost:8080').replace(/\/$/, '');
// --file <경로> 또는 HPPT_FILE: 실시간 덱 대신 별도 덱 파일을 대상으로 (서버 사용 안 함)
const FILE_ARG = (() => { const i = process.argv.indexOf('--file'); if (i > 0 && process.argv[i + 1]) { const v = process.argv[i + 1]; process.argv.splice(i, 2); return v; } return process.env.HPPT_FILE || ''; })();
const SEPARATE = !!FILE_ARG;
const DECK_FILE = SEPARATE ? path.resolve(FILE_ARG) : path.join(ROOT, 'decks', 'live.hppt.json');
const SOURCE = 'claude-cli';

function findRoot(dir) {
  let d = dir;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'index.html')) && fs.existsSync(path.join(d, 'js', 'core.js'))) return d;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return process.cwd();
}

/* ------------------------------------------------------------------ */
/* 앱 엔진 로드                                                         */
/* ------------------------------------------------------------------ */
let E = null;
function engine() {
  if (E) return E;
  const core = fs.readFileSync(path.join(ROOT, 'js', 'core.js'), 'utf8');
  const store = fs.readFileSync(path.join(ROOT, 'js', 'store.js'), 'utf8');
  const src = core + '\n' + store + '\n;({ PlayerCore, Core, ASPECTS, THEMES, LAYOUTS, FONTS, BG_PRESETS, buildLayout, paginateText, mkEl, mkSlide, mkAnim, newDeck, resizeDeck, applyTheme, deckTheme, readable, splitPair, uid, demoDeck, textHtml, bulletsHtml, morphPairs, brokenMorphs, morphChain, chainSafeIndex })';
  const ctx = vm.createContext({ console, localStorage: { getItem: () => null, setItem: () => {} } });
  E = vm.runInContext(src, ctx, { filename: 'engine.js' });
  E.coreSource = core;
  return E;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ------------------------------------------------------------------ */
/* 덱 읽기/쓰기 (서버 우선, 없으면 파일)                                 */
/* ------------------------------------------------------------------ */
async function serverUp() {
  try {
    const r = await fetch(URL_BASE + '/api/state', { signal: AbortSignal.timeout(1500) });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

async function readDeck() {
  if (!SEPARATE) try {
    const r = await fetch(URL_BASE + '/api/deck', { signal: AbortSignal.timeout(3000) });
    if (r.ok) { const d = await r.json(); return { deck: d.deck, rev: d.rev, via: 'server' }; }
  } catch (e) { /* 서버 없음 */ }
  if (fs.existsSync(DECK_FILE)) {
    const d = JSON.parse(fs.readFileSync(DECK_FILE, 'utf8'));
    return { deck: d.deck || d, rev: d.rev || 0, via: 'file' };
  }
  return { deck: null, rev: 0, via: 'none' };
}

async function writeDeck(deck, baseRev) {
  if (!SEPARATE) try {
    const r = await fetch(URL_BASE + '/api/deck', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deck, source: SOURCE, baseRev }), signal: AbortSignal.timeout(8000) });
    if (r.status === 409) { const e = new Error('conflict'); e.conflict = true; throw e; }
    if (r.ok) return { rev: (await r.json()).rev, via: 'server' };
  } catch (e) { if (e.conflict) throw e; }
  fs.mkdirSync(path.dirname(DECK_FILE), { recursive: true });
  let rev = 1;
  try { rev = (JSON.parse(fs.readFileSync(DECK_FILE, 'utf8')).rev || 0) + 1; } catch (e) { /* new */ }
  fs.writeFileSync(DECK_FILE, JSON.stringify({ format: 'html-presentation-studio', rev, source: SOURCE, updatedAt: new Date().toISOString(), deck }, null, 1));
  return { rev, via: 'file' };
}

// 읽기 → 수정 → 쓰기 (충돌 시 3회 재시도)
async function mutate(fn) {
  for (let i = 0; i < 3; i++) {
    const cur = await readDeck();
    const deck = cur.deck ? clone(cur.deck) : null;
    const res = await fn(deck);
    const next = res && res.deck ? res.deck : res;
    try {
      const w = await writeDeck(next, cur.via === 'server' ? cur.rev : undefined);
      return { deck: next, ...w, info: res && res.info };
    } catch (e) {
      if (!e.conflict) throw e;
    }
  }
  throw new Error('편집기와 동시에 수정되어 저장하지 못했습니다. 다시 시도하세요.');
}

async function command(cmd) {
  if (SEPARATE) return false;
  try {
    const r = await fetch(URL_BASE + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd }), signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch (e) { return false; }
}

/* ------------------------------------------------------------------ */
/* 텍스트/요소 변환                                                     */
/* ------------------------------------------------------------------ */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function textToHtml(t) {
  const lines = String(t == null ? '' : t).replace(/\r/g, '').split('\n');
  const isB = (l) => /^\s*([-•*·]|\d+[.)])\s+/.test(l);
  const strip = (l) => l.replace(/^\s*([-•*·]|\d+[.)])\s+/, '');
  let out = '', inList = false;
  lines.forEach((l) => {
    if (isB(l)) { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + inline(strip(l)) + '</li>'; }
    else { if (inList) { out += '</ul>'; inList = false; } else if (out) out += '<br>'; out += inline(l); }
  });
  if (inList) out += '</ul>';
  return out;
}
// **굵게**, *기울임*, ==형광펜==, {#ff0000|색 글자}
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/==(.+?)==/g, '<span style="background-color: rgba(255, 212, 59, 0.45);">$1</span>')
    .replace(/\{(#[0-9a-fA-F]{3,8})\|(.+?)\}/g, '<span style="color: $1;">$2</span>');
}
function htmlToText(h) {
  return String(h || '').replace(/<li>/gi, '\n- ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{2,}/g, '\n').trim();
}

function toCsv(data) {
  if (Array.isArray(data)) return data.map((r) => (Array.isArray(r) ? r : [r]).join(',')).join('\n');
  return String(data || '');
}

// 로컬 파일은 assets/ 로 복사하고 상대 경로로 참조
function resolveSrc(src) {
  if (!src || /^(https?:|data:|idb:|assets\/)/.test(src)) return src;
  const p = path.resolve(src);
  if (!fs.existsSync(p)) { warn(`파일 없음: ${src}`); return src; }
  const buf = fs.readFileSync(p);
  const name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12) + path.extname(p).toLowerCase();
  const dir = path.join(ROOT, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(path.join(dir, name))) fs.writeFileSync(path.join(dir, name), buf);
  return 'assets/' + name;
}

function unit(v, total) {
  if (typeof v === 'string' && v.trim().endsWith('%')) return Math.round((parseFloat(v) / 100) * total);
  return v == null ? v : Math.round(+v);
}

const EL_TEXT_TYPES = new Set(['text', 'shape']);

// 펜 선: points = [[x,y], …] (슬라이드 좌표, px 또는 "50%"), smooth = true 면 부드러운 곡선(캣멀-롬), closed = 닫힌 도형
// 또는 pts = [{x,y,ix,iy,ox,oy}] 를 직접 (슬라이드 좌표). 상자(x,y,w,h)는 선에 맞춰 자동 계산
function pathFromPoints(deck, e) {
  let pts;
  if (Array.isArray(e.pts)) pts = clone(e.pts);
  else if (Array.isArray(e.points)) {
    const a = e.points.map((q) => ({ x: unit(Array.isArray(q) ? q[0] : q.x, deck.width), y: unit(Array.isArray(q) ? q[1] : q.y, deck.height) }));
    pts = a.map((p) => ({ x: p.x, y: p.y }));
    if (e.smooth) {
      const n = a.length, cl = !!e.closed;
      a.forEach((p, i) => {
        const prev = a[i - 1] || (cl ? a[n - 1] : null), next = a[i + 1] || (cl ? a[0] : null);
        if (!prev || !next) return;
        const tx = (next.x - prev.x) / 6, ty = (next.y - prev.y) / 6;
        Object.assign(pts[i], { ix: p.x - tx, iy: p.y - ty, ox: p.x + tx, oy: p.y + ty, s: true });
      });
    }
  } else return {};
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach((p) => [['x', 'y'], ['ix', 'iy'], ['ox', 'oy']].forEach(([kx, ky]) => {
    if (p[kx] == null) return;
    x0 = Math.min(x0, p[kx]); x1 = Math.max(x1, p[kx]); y0 = Math.min(y0, p[ky]); y1 = Math.max(y1, p[ky]);
  }));
  pts.forEach((p) => { ['x', 'ix', 'ox'].forEach((k) => { if (p[k] != null) p[k] -= x0; }); ['y', 'iy', 'oy'].forEach((k) => { if (p[k] != null) p[k] -= y0; }); });
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const out = { pts, x: x0, y: y0, w, h, pw: w, ph: h };
  return out;
}
function normEl(deck, e) {
  const X = engine();
  const type = e.type || 'text';
  const props = clone(e);
  delete props.type; delete props.text; delete props.key; delete props.anim; delete props.points; delete props.smooth;
  ['x', 'w'].forEach((k) => { if (k in props) props[k] = unit(props[k], deck.width); });
  ['y', 'h'].forEach((k) => { if (k in props) props[k] = unit(props[k], deck.height); });
  if (e.text != null && EL_TEXT_TYPES.has(type)) props.html = textToHtml(e.text);
  if (type === 'code' && e.text != null && props.code == null) props.code = String(e.text);
  if (e.key) props.mkey = e.key;
  if (props.src) props.src = resolveSrc(props.src);
  if (type === 'path') Object.assign(props, pathFromPoints(deck, e));
  if (type === 'chart' && props.data != null) props.data = toCsv(props.data);
  if (type === 'table' && props.data != null) props.data = toCsv(props.data);
  if (e.fullscreen && (type === 'video' || type === 'embed' || type === 'image')) {
    Object.assign(props, { x: 0, y: 0, w: deck.width, h: deck.height, rotation: 0, radius: 0 });
    if (type !== 'embed') props.fit = props.fit || 'contain';
    props.fill = props.fill || '#000000';
  }
  if (type === 'chart' && !props.colors) { const t = X.deckTheme(deck); props.colors = [t.accent, t.accent2, '#51cf66', '#fcc419', '#ff6b6b', '#845ef7'].join(','); props.color = props.color || t.text; }
  return X.mkEl(type, props);
}

function applyBg(deck, slide, bg) {
  if (bg == null) return;
  if (typeof bg === 'string') {
    if (/gradient\(/.test(bg)) slide.bg = Object.assign({}, slide.bg, { type: 'gradient', gradient: bg, color: (bg.match(/#[0-9a-fA-F]{6}/) || [slide.bg.color || '#000000'])[0] });
    else if (/^(https?:|assets\/|\.|\/|[A-Za-z]:)/.test(bg) && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(bg)) slide.bg = Object.assign({}, slide.bg, { type: 'image', src: resolveSrc(bg) });
    else if (/\.(mp4|webm|mov|m4v)$/i.test(bg)) slide.bg = Object.assign({}, slide.bg, { type: 'video', src: resolveSrc(bg) });
    else slide.bg = Object.assign({}, slide.bg, { type: 'color', color: bg });
  } else {
    const b = clone(bg);
    if (b.src) b.src = resolveSrc(b.src);
    slide.bg = Object.assign({}, slide.bg, b);
  }
}

function applyFx(slide, fx) {
  if (fx == null) return;
  if (typeof fx === 'string') fx = { type: fx };
  const retired = engine().Core.BG_FX_RETIRED || {};
  if (retired[fx.type]) {
    console.warn(`⚠ 배경 효과 "${fx.type}" 는 삭제되어 "${retired[fx.type]}" 로 바꿨습니다.`);
    fx = Object.assign({}, fx, { type: retired[fx.type] });
  }
  slide.bg.fx = fx.type || 'none';
  // 색을 안 주면 효과별 추천 색 (꽃잎=분홍, 심전도=초록 …)
  const pc = !fx.color && !fx.color2 && engine().Core.BG_FX_COLORS && engine().Core.BG_FX_COLORS[slide.bg.fx];
  if (pc) { slide.bg.fxColor = pc[0]; slide.bg.fxColor2 = pc[1]; }
  if (fx.color) slide.bg.fxColor = fx.color;
  if (fx.color2) slide.bg.fxColor2 = fx.color2;
  if (fx.speed) slide.bg.fxSpeed = fx.speed;
}

function findEl(slide, sel) {
  const els = slide.elements;
  if (sel === 'last') return els[els.length - 1];
  if (typeof sel === 'number') return els[sel];
  if (/^\d+$/.test(String(sel))) return els[+sel];
  const s = String(sel);
  if (s.startsWith('role:')) { const [r, n] = s.slice(5).split('#'); return els.filter((e) => e.role === r)[+(n || 0)]; }
  if (s.startsWith('type:')) { const [t, n] = s.slice(5).split('#'); return els.filter((e) => e.type === t)[+(n || 0)]; }
  if (s.startsWith('text:')) { const q = s.slice(5); return els.find((e) => htmlToText(e.html).includes(q)); }
  if (s.startsWith('key:')) return els.find((e) => e.mkey === s.slice(4));
  return els.find((e) => e.id === s || e.mkey === s);
}

function addAnims(slide, list) {
  const X = engine();
  (list || []).forEach((a) => {
    const el = findEl(slide, a.el);
    if (!el) { warn(`애니메이션 대상 없음: ${a.el}`); return; }
    if (!X.Core.ANIMS[a.effect]) { warn(`알 수 없는 효과: ${a.effect}`); return; }
    const an = X.mkAnim(el.id, a.effect, a.trigger || 'after', { duration: a.duration || (X.Core.ANIMS[a.effect].loop ? 2000 : 700), delay: a.delay || 0, repeat: a.repeat || 1 });
    if (a.dim) an.dim = true;
    if (a.rowTrigger) an.rowTrigger = a.rowTrigger;
    if (a.rowDelay) an.rowDelay = +a.rowDelay;
    if (a.drawFx) an.drawFx = a.drawFx;
    if (a.drawDir) an.drawDir = a.drawDir;
    slide.anims.push(an);
  });
}

function transitionOf(t, dur) {
  if (!t) return null;
  if (typeof t === 'string') return { type: t, duration: dur || (t === 'morph' ? 1000 : 700) };
  return { type: t.type || 'fade', duration: t.duration || 700 };
}

// 긴 글 레이아웃은 최소 글자로도 넘치면 "(계속)" 슬라이드로 나눈다 (split: false 로 끔)
function buildSlides(deck, s, opts, prev) {
  const X = engine();
  const parts = s && s.split !== false && s.text ? X.paginateText(deck, s.layout, s) : [s];
  if (parts.length > 1) warn(`"${s.title || s.layout}" — 글이 많아 ${parts.length}장으로 나눴습니다.`);
  const out = [];
  parts.forEach((p, i) => { const sl = buildSlide(deck, i ? Object.assign({}, p, { transition: s.transition || 'fade' }) : p, opts, prev); out.push(sl); prev = sl; });
  return out;
}

// 슬라이드 사양 → 슬라이드
function buildSlide(deck, s, opts, prev) {
  const X = engine();
  s = s || {};
  const layout = s.layout || (s.elements ? 'blank' : 'bullets');
  if (!X.LAYOUTS[layout]) throw new Error(`알 수 없는 레이아웃: ${layout} (사용 가능: ${Object.keys(X.LAYOUTS).join(', ')})`);
  const c = clone(s);
  if (c.chartData != null) c.chartData = toCsv(c.chartData);
  if (c.image) c.image = resolveSrc(c.image);
  const animate = s.animate != null ? s.animate : opts.animate !== false;
  const slide = layout === 'blank'
    ? X.mkSlide({ layout: 'blank', bg: clone(X.deckTheme(deck).bg) })
    : X.buildLayout(deck, layout, c, { animate, transition: 'fade', warn });
  slide.transition = transitionOf(s.transition || opts.transition || 'fade', s.transitionDuration);
  slide.notes = s.notes || '';
  if (s.duration) slide.duration = s.duration;
  if (s.dimPrev) slide.dimPrev = true;
  applyBg(deck, slide, s.bg);
  applyFx(slide, s.fx);
  if (s.replaceAnims || s.animate === false) slide.anims = [];
  if (Array.isArray(s.hide)) s.hide.forEach((sel) => { const el = findEl(slide, sel); if (el) { slide.elements = slide.elements.filter((x) => x !== el); slide.anims = slide.anims.filter((a) => a.elId !== el.id); } });
  if (Array.isArray(s.override)) s.override.forEach((o) => { const el = findEl(slide, o.el); if (el) setElProps(deck, el, o.set || {}); else warn(`override 대상 없음: ${o.el}`); });
  (s.elements || []).forEach((e) => {
    const el = normEl(deck, e);
    slide.elements.push(el);
    if (e.anim) addAnims(slide, [Object.assign({ el: el.id }, typeof e.anim === 'string' ? { effect: e.anim } : e.anim)]);
  });
  // 버튼/퀴즈: action.target 에 요소 key/역할 선택자 사용 가능
  slide.elements.forEach((el) => {
    if (el.action && el.action.target && !slide.elements.some((x) => x.id === el.action.target)) {
      const t = findEl(slide, el.action.target);
      if (t) el.action.target = t.id;
    }
  });
  if (s.morph && prev) { linkMorph(prev, slide); if (!s.keepAnims) slide.anims = []; }
  addAnims(slide, s.anims);
  return slide;
}

// 같은 역할(role)·순서의 요소끼리 모핑 키를 이어 준다
function linkMorph(prev, slide) {
  const count = {};
  const prevBy = {};
  prev.elements.forEach((e) => { const k = (e.role || e.type) + '#' + (count[e.role || e.type] = (count[e.role || e.type] || 0) + 1); prevBy[k] = e; });
  const c2 = {};
  slide.elements.forEach((e) => {
    if (e.mkey) return;
    const k = (e.role || e.type) + '#' + (c2[e.role || e.type] = (c2[e.role || e.type] || 0) + 1);
    if (prevBy[k]) e.mkey = prevBy[k].mkey || prevBy[k].id;
  });
  slide.transition = { type: 'morph', duration: (slide.transition && slide.transition.type === 'morph' && slide.transition.duration) || 1000 };
}

function setElProps(deck, el, set) {
  const p = clone(set);
  if ('text' in p) { if (EL_TEXT_TYPES.has(el.type)) el.html = textToHtml(p.text); else if (el.type === 'code') el.code = String(p.text); delete p.text; }
  ['x', 'w'].forEach((k) => { if (k in p) p[k] = unit(p[k], deck.width); });
  ['y', 'h'].forEach((k) => { if (k in p) p[k] = unit(p[k], deck.height); });
  if (p.src) p.src = resolveSrc(p.src);
  if (p.data != null && (el.type === 'chart' || el.type === 'table')) p.data = toCsv(p.data);
  if (p.key) { p.mkey = p.key; delete p.key; }
  Object.assign(el, p);
}

function applyPalette(deck, palette, themeId, reset) {
  const X = engine();
  if (!palette && !themeId) return;
  const custom = palette ? clone(palette) : undefined;
  if (custom && typeof custom.bg === 'string') custom.bg = /gradient\(/.test(custom.bg) ? { type: 'gradient', gradient: custom.bg, color: (custom.bg.match(/#[0-9a-fA-F]{6}/) || ['#000000'])[0] } : { type: 'color', color: custom.bg };
  X.applyTheme(deck, themeId || deck.theme.id || 'classic', null, custom, { reset: !!reset });
}

function deckFromSpec(spec, base) {
  const X = engine();
  let deck;
  if (base) deck = base;
  else {
    deck = X.newDeck(spec.aspect && X.ASPECTS[spec.aspect] ? spec.aspect : '16:9', X.THEMES[spec.theme] ? spec.theme : 'classic');
    if (spec.size) { const m = String(spec.size).match(/(\d+)\s*[x×]\s*(\d+)/); if (m) { deck.width = +m[1]; deck.height = +m[2]; deck.aspect = 'custom'; } }
    if (spec.palette) deck.theme.custom = normPalette(spec.palette);
    if (spec.theme && !X.THEMES[spec.theme]) warn(`알 수 없는 테마 "${spec.theme}" → classic 사용`);
  }
  if (spec.title) deck.title = spec.title;
  if (spec.autoDuration) deck.autoDuration = spec.autoDuration;
  if (spec.loop) deck.loop = { range: String(spec.loop.range || `1-${(spec.slides || []).length || 1}`), seconds: +spec.loop.seconds || 8 };
  const slides = [];
  let prev = base && base.slides.length ? base.slides[base.slides.length - 1] : null;
  (spec.slides || []).forEach((s) => { buildSlides(deck, s, spec, prev).forEach((sl) => { slides.push(sl); prev = sl; }); });
  return { deck, slides };
}

function normPalette(p) {
  const c = clone(p);
  if (typeof c.bg === 'string') c.bg = /gradient\(/.test(c.bg) ? { type: 'gradient', gradient: c.bg, color: (c.bg.match(/#[0-9a-fA-F]{6}/) || ['#000000'])[0] } : { type: 'color', color: c.bg };
  return c;
}

/* ------------------------------------------------------------------ */
/* 배경음악                                                             */
/* ------------------------------------------------------------------ */
const MUSIC_COLORS = ['#845ef7', '#4dabf7', '#51cf66', '#fcc419', '#ff8787', '#20c997', '#e599f7', '#ffa94d'];
function musicLib() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'music', 'library.json'), 'utf8')).tracks; } catch (e) { return []; }
}
// track: 라이브러리 번호/아이디("05", "05-amazing-grace") 또는 파일 경로
function musicTrack(deck, spec) {
  const X = engine();
  deck.bgm = deck.bgm || { tracks: [], fadeIn: 1.5, fadeOut: 2, duck: true };
  const ref = String(spec.track || spec.src || '');
  const lib = musicLib().find((t) => t.id === ref || t.id.slice(0, 2) === ref.padStart(2, '0').slice(0, 2) && /^\d+$/.test(ref));
  const src = lib ? lib.file : resolveSrc(ref);
  let tr = deck.bgm.tracks.find((t) => t.src === src);
  if (!tr) {
    tr = { id: X.uid(), src, title: spec.title || (lib ? lib.title : path.basename(ref).replace(/\.[^.]+$/, '')), volume: spec.volume != null ? +spec.volume : 0.6, color: MUSIC_COLORS[deck.bgm.tracks.length % MUSIC_COLORS.length], lib: lib ? lib.id : null };
    deck.bgm.tracks.push(tr);
  } else if (spec.volume != null) tr.volume = +spec.volume;
  return tr;
}
function slideIdx(deck, sel) {
  if (sel == null || sel === 'all') return deck.slides.map((_, i) => i);
  const out = new Set();
  String(sel).split(',').forEach((part) => {
    const m = part.trim().match(/^(\d+)(?:\s*[-~]\s*(\d+))?$/);
    if (m) for (let i = +m[1]; i <= +(m[2] || m[1]); i++) if (i >= 1 && i <= deck.slides.length) out.add(i - 1);
  });
  return [...out];
}
function applyMusic(deck, list) {
  (list || []).forEach((m) => {
    const tr = musicTrack(deck, m);
    slideIdx(deck, m.slides).forEach((i) => { deck.slides[i].music = tr.id; });
  });
  if (deck.bgm) deck.bgm.tracks = deck.bgm.tracks.filter((t) => deck.slides.some((s) => s.music === t.id));
}

/* ------------------------------------------------------------------ */
/* patch 연산                                                           */
/* ------------------------------------------------------------------ */
function slideAt(deck, n) {
  const i = (+n || 1) - 1;
  if (i < 0 || i >= deck.slides.length) throw new Error(`슬라이드 번호 범위 밖: ${n} (총 ${deck.slides.length}장)`);
  return deck.slides[i];
}

function runOps(deck, ops) {
  const X = engine();
  let focus = null;
  for (const op of ops) {
    const kind = op.op;
    if (kind === 'title') deck.title = op.value;
    else if (kind === 'theme') { applyPalette(deck, op.palette ? normPalette(op.palette) : null, op.id || deck.theme.id, op.reset); }
    else if (kind === 'aspect') {
      const a = X.ASPECTS[op.value];
      let w, h;
      if (a && a.w) ({ w, h } = a); else { const m = String(op.value).match(/(\d+)\s*[x×]\s*(\d+)/); if (!m) throw new Error('aspect 값 오류: ' + op.value); w = +m[1]; h = +m[2]; }
      X.resizeDeck(deck, w, h);
      deck.aspect = a && a.w ? op.value : 'custom';
    } else if (kind === 'slide.add') {
      const at = op.at ? Math.max(1, Math.min(deck.slides.length + 1, +op.at)) : deck.slides.length + 1;
      const prev = deck.slides[at - 2] || null;
      deck.slides.splice(at - 1, 0, ...buildSlides(deck, op, {}, prev));
      focus = focus || at;
    } else if (kind === 'slide.replace') {
      const i = (+op.slide) - 1;
      slideAt(deck, op.slide);
      deck.slides.splice(i, 1, ...buildSlides(deck, op, {}, deck.slides[i - 1] || null));
      focus = focus || +op.slide;
    } else if (kind === 'slide.update') {
      const s = slideAt(deck, op.slide);
      const set = op.set || {};
      if ('notes' in set) s.notes = set.notes;
      if ('duration' in set) s.duration = set.duration;
      if ('dimPrev' in set) { if (set.dimPrev) s.dimPrev = true; else delete s.dimPrev; }
      if ('transition' in set) s.transition = transitionOf(set.transition, set.transitionDuration);
      if ('bg' in set) applyBg(deck, s, set.bg);
      if ('fx' in set) applyFx(s, set.fx);
      if (set.morph) linkMorph(deck.slides[(+op.slide) - 2] || s, s);
      focus = focus || +op.slide;
    } else if (kind === 'slide.remove') {
      slideAt(deck, op.slide);
      if (deck.slides.length <= 1) throw new Error('마지막 슬라이드는 삭제할 수 없습니다');
      deck.slides.splice(+op.slide - 1, 1);
    } else if (kind === 'slide.move') {
      const s = slideAt(deck, op.slide);
      deck.slides.splice(+op.slide - 1, 1);
      deck.slides.splice(Math.max(0, Math.min(deck.slides.length, +op.to - 1)), 0, s);
      focus = focus || +op.to;
    } else if (kind === 'slide.duplicate') {
      const s = clone(slideAt(deck, op.slide));
      s.id = X.uid();
      const map = {};
      s.elements.forEach((e) => { const n = X.uid(); map[e.id] = n; e.mkey = e.mkey || e.id; e.id = n; });
      s.elements.forEach((e) => { if (e.action && map[e.action.target]) e.action.target = map[e.action.target]; });
      s.anims = op.morph ? [] : s.anims.map((a) => Object.assign(a, { id: X.uid(), elId: map[a.elId] || a.elId }));
      if (op.morph) s.transition = { type: 'morph', duration: op.duration || 1000 };
      deck.slides.splice(+op.slide, 0, s);
      (op.changes || []).forEach((ch) => { const el = findEl(s, ch.el); if (el) setElProps(deck, el, ch.set || {}); else warn(`changes 대상 없음: ${ch.el}`); });
      focus = focus || +op.slide + 1;
    } else if (kind === 'el.update') {
      const s = slideAt(deck, op.slide);
      const el = findEl(s, op.el);
      if (!el) throw new Error(`요소 없음: 슬라이드 ${op.slide}, ${op.el}`);
      setElProps(deck, el, op.set || {});
      focus = focus || +op.slide;
    } else if (kind === 'el.add') {
      const s = slideAt(deck, op.slide);
      const el = normEl(deck, op.element || {});
      s.elements.push(el);
      if (op.element && op.element.anim) addAnims(s, [Object.assign({ el: el.id }, typeof op.element.anim === 'string' ? { effect: op.element.anim } : op.element.anim)]);
      focus = focus || +op.slide;
    } else if (kind === 'el.remove') {
      const s = slideAt(deck, op.slide);
      const el = findEl(s, op.el);
      if (!el) throw new Error(`요소 없음: ${op.el}`);
      s.elements = s.elements.filter((x) => x !== el);
      s.anims = s.anims.filter((a) => a.elId !== el.id);
      focus = focus || +op.slide;
    } else if (kind === 'el.order') {
      const s = slideAt(deck, op.slide);
      const el = findEl(s, op.el);
      if (!el) throw new Error(`요소 없음: ${op.el}`);
      s.elements = s.elements.filter((x) => x !== el);
      if (op.to === 'front') s.elements.push(el); else if (op.to === 'back') s.elements.unshift(el); else s.elements.splice(+op.to, 0, el);
    } else if (kind === 'anim.set') {
      const s = slideAt(deck, op.slide);
      s.anims = [];
      addAnims(s, op.anims);
      focus = focus || +op.slide;
    } else if (kind === 'anim.add') {
      addAnims(slideAt(deck, op.slide), [op]);
      focus = focus || +op.slide;
    } else if (kind === 'anim.clear') {
      (op.slide === 'all' ? deck.slides : [slideAt(deck, op.slide)]).forEach((s) => { s.anims = []; });
    } else if (kind === 'all.update') {
      deck.slides.forEach((s) => {
        const set = op.set || {};
        if ('transition' in set) s.transition = transitionOf(set.transition, set.transitionDuration);
        if ('fx' in set) applyFx(s, set.fx);
        if ('bg' in set) applyBg(deck, s, set.bg);
        if ('duration' in set) s.duration = set.duration;
      });
    } else if (kind === 'music') {
      applyMusic(deck, [op]);
      if (op.fadeIn != null) deck.bgm.fadeIn = +op.fadeIn;
      if (op.fadeOut != null) deck.bgm.fadeOut = +op.fadeOut;
      if (op.duck != null) deck.bgm.duck = !!op.duck;
    } else if (kind === 'music.clear') {
      slideIdx(deck, op.slides).forEach((i) => { delete deck.slides[i].music; });
      if (deck.bgm) deck.bgm.tracks = deck.bgm.tracks.filter((t) => deck.slides.some((s) => s.music === t.id));
    } else throw new Error('알 수 없는 op: ' + kind);
  }
  return focus;
}

/* ------------------------------------------------------------------ */
/* 출력                                                                 */
/* ------------------------------------------------------------------ */
function summary(deck, only) {
  const X = engine();
  const lines = [];
  const th = X.deckTheme(deck);
  lines.push(`"${deck.title}" — ${deck.width}×${deck.height} (${deck.aspect}), 테마 ${deck.theme.id}${deck.theme.custom ? ' + 사용자 팔레트' : ''} (${th.name || ''}), ${deck.slides.length}장`);
  deck.slides.forEach((s, i) => {
    if (only && only !== i + 1) return;
    const tr = s.transition ? s.transition.type : 'none';
    const fx = s.bg && s.bg.fx && s.bg.fx !== 'none' ? ` fx:${s.bg.fx}` : '';
    const ttl = s.elements.find((e) => e.role === 'title' && e.html);
    const mt = s.music && deck.bgm ? (deck.bgm.tracks || []).find((t) => t.id === s.music) : null;
    lines.push(`#${i + 1} [${s.layout || 'custom'}] 전환:${tr}${fx} 애니:${(s.anims || []).length}${mt ? ' ♪' + mt.title : ''}  ${ttl ? '“' + htmlToText(ttl.html).replace(/\n/g, ' ').slice(0, 50) + '”' : ''}`);
    if (only) {
      lines.push(`   배경: ${JSON.stringify(s.bg)}`);
      if (s.notes) lines.push(`   노트: ${s.notes.slice(0, 120)}`);
      if (s.dimPrev) lines.push('   지난 항목 흐리게: 켬 (dimPrev)');
      s.elements.forEach((e, j) => {
        const t = e.html ? htmlToText(e.html).replace(/\n/g, ' ⏎ ').slice(0, 60) : e.src || e.url || (e.data ? e.data.split('\n')[0] + '…' : '');
        const extra = [e.role && 'role:' + e.role, e.mkey && 'key:' + e.mkey, e.action && e.action.type !== 'none' && 'action:' + e.action.type, e.startHidden && 'startHidden', e.hover && 'hover:' + e.hover].filter(Boolean).join(' ');
        lines.push(`   [${j}] ${e.id} ${e.type}${e.shape ? '/' + e.shape : ''}${e.chartType ? '/' + e.chartType : ''} (${e.x},${e.y} ${e.w}×${e.h}) ${extra}  ${t}`);
      });
      (s.anims || []).forEach((a, j) => {
        const k = s.elements.findIndex((e) => e.id === a.elId);
        lines.push(`   anim${j}: [${k}] ${a.effect} ${a.trigger} ${a.duration}ms${a.delay ? ' +' + a.delay : ''}${a.dim ? ' dim' : ''}${a.drawFx ? ' fx:' + a.drawFx : ''}${a.drawDir ? ' dir:' + a.drawDir : ''}`);
      });
    }
  });
  return lines.join('\n');
}

function warn(m) { process.stderr.write('⚠ ' + m + '\n'); }

/* ------------------------------------------------------------------ */
/* HTML 생성 (내보내기 / 렌더)                                          */
/* ------------------------------------------------------------------ */
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700&family=Gowun+Dodum&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Nanum+Pen+Script&family=Montserrat:wght@400;700;900&family=Playfair+Display:wght@400;700&family=Roboto+Mono&display=swap';
const MIME = { '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json' };

// 편집기가 서버에 백업한 브라우저 미디어(idb:<id>) → decks/media/<id>.<확장자>
function idbFile(src) {
  const id = String(src).slice(4), dir = path.join(ROOT, 'decks', 'media');
  try { const f = fs.readdirSync(dir).find((n) => n.slice(0, n.lastIndexOf('.')) === id); return f ? path.join(dir, f) : null; } catch (e) { return null; }
}

function inlineMedia(deck) {
  const d = clone(deck);
  let missing = 0;
  const conv = (src) => {
    if (!src) return src;
    if (src.startsWith('idb:')) {
      const f = idbFile(src);
      if (!f) { missing++; return ''; }
      return `data:${MIME[path.extname(f).toLowerCase()] || 'application/octet-stream'};base64,${fs.readFileSync(f).toString('base64')}`;
    }
    if (src.startsWith('assets/') || src.startsWith('music/')) {
      const p = path.join(ROOT, src);
      if (fs.existsSync(p)) return `data:${MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'};base64,${fs.readFileSync(p).toString('base64')}`;
    }
    return src;
  };
  d.slides.forEach((s) => { if (s.bg && s.bg.src) s.bg.src = conv(s.bg.src); s.elements.forEach((e) => { if (e.src) e.src = conv(e.src); }); });
  ((d.bgm && d.bgm.tracks) || []).forEach((t) => {
    if (t.src && t.src.startsWith('music/')) { const f = path.join(ROOT, t.src); if (fs.existsSync(f)) t.src = 'data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64'); }
    else t.src = conv(t.src);
  });
  if (missing) warn(`브라우저에만 저장되고 아직 백업되지 않은 미디어 ${missing}개는 포함되지 않았습니다. (서버를 켠 채 편집기를 열면 decks/media 로 자동 백업됩니다)`);
  return d;
}

// 3D 모델이 있으면 표시 라이브러리(vendor/model-viewer.min.js)를 HTML 에 직접 넣는다 (인터넷 없이 동작)
function mvInline(deck) {
  if (!deck.slides.some((s) => s.elements.some((e) => e.type === 'model'))) return '';
  const f = path.join(ROOT, 'vendor', 'model-viewer.min.js');
  if (!fs.existsSync(f)) { warn('vendor/model-viewer.min.js 가 없어 3D 는 인터넷이 연결된 곳에서만 보입니다.'); return ''; }
  return `<script type="module" data-hp-mv="1">${fs.readFileSync(f, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`;
}

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');

function exportHtml(deck) {
  const X = engine();
  const d = inlineMedia(deck);
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title || '프레젠테이션')}</title><link rel="stylesheet" href="${FONT_LINK}">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
.start{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(0,0,0,.55);color:#fff;font-family:'Noto Sans KR',sans-serif;z-index:9999;cursor:pointer}
.start b{font-size:28px}.start span{opacity:.8;font-size:15px}.start button{font:inherit;font-size:18px;padding:12px 28px;border-radius:12px;border:0;background:#4dabf7;color:#fff;cursor:pointer}</style>
</head><body>${mvInline(d)}<script>
${X.coreSource}
(function(){var C=PlayerCore();C.injectCSS();var deck=${safeJson(d)};var p=new C.Presenter(document.body,deck,{standalone:true});
var s=document.createElement('div');s.className='start';s.innerHTML='<b>'+C.esc(deck.title||'')+'</b><button>▶ 발표 시작</button>'+(deck.loop?'<button data-loop style="background:#495057">🔁 반복 재생 ('+C.esc(deck.loop.range)+')</button>':'')+'<span>→/Space 다음 · ← 이전 · F 전체화면 · A 자동재생 · G 전체 보기 · Z 돋보기 · N 노트</span>';
s.onclick=function(e){var lp=e.target.closest&&e.target.closest('[data-loop]');s.remove();p.enterFullscreen(lp?{presenterView:false}:undefined);if(lp)p.startLoop(deck.loop);else p.go(p.o.start||0,0,true);};document.body.appendChild(s);
if(/[#&]loop(?![a-z])/.test(location.hash)&&deck.loop){s.remove();p.startLoop(deck.loop);}})();
</script></body></html>`;
}

function renderHtml(deck, which, cellW) {
  const X = engine();
  const d = clone(deck);
  const base = 'file:///' + ROOT.replace(/\\/g, '/').replace(/^\//, '') + '/';
  // 백업된 브라우저 미디어는 파일 경로로 바꿔 미리보기에도 보이게 한다
  const fixIdb = (src) => { if (!src || !src.startsWith('idb:')) return src; const f = idbFile(src); return f ? 'file:///' + f.replace(/\\/g, '/').replace(/^\//, '') : src; };
  d.slides.forEach((s) => { if (s.bg && s.bg.src) s.bg.src = fixIdb(s.bg.src); s.elements.forEach((e) => { if (e.src) e.src = fixIdb(e.src); }); });
  const single = which !== 'all';
  const idx = single ? [which - 1] : d.slides.map((_, i) => i);
  const cols = single ? 1 : idx.length <= 4 ? 2 : idx.length <= 9 ? 3 : 4;
  const W = single ? cellW : cellW;
  const sc = W / d.width, H = Math.round(d.height * sc);
  const gap = single ? 0 : 16, lab = single ? 0 : 26;
  const rows = Math.ceil(idx.length / cols);
  const pageW = cols * W + (cols + 1) * gap, pageH = rows * (H + lab) + (rows + 1) * gap;
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT_LINK}">
<style>html,body{margin:0;background:${single ? '#000' : '#d9dce3'};font-family:'Noto Sans KR',sans-serif}
.grid{display:grid;grid-template-columns:repeat(${cols},${W}px);gap:${gap}px;padding:${gap}px}
.cell{width:${W}px}.lab{height:${lab}px;font:600 14px/26px 'Noto Sans KR',sans-serif;color:#333}
.view{width:${W}px;height:${H}px;overflow:hidden;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.2)}</style></head>
<body><div class="grid" id="g"></div>${mvInline(d)}<script>${X.coreSource}
var C=PlayerCore();C.injectCSS();C.setLive3d(true);var deck=${safeJson(d)};var base=${JSON.stringify(base)};
var resolve=function(s){if(!s)return'';if(s.indexOf('idb:')===0)return'';if(s.indexOf('assets/')===0)return base+s;return s;};
${JSON.stringify(idx)}.forEach(function(i){var c=document.createElement('div');c.className='cell';
${single ? '' : "var l=document.createElement('div');l.className='lab';var s=deck.slides[i];l.textContent='#'+(i+1)+'  '+(s.layout||'')+'  · 전환 '+((s.transition||{}).type||'none')+((s.bg&&s.bg.fx&&s.bg.fx!=='none')?'  · '+s.bg.fx:'');c.appendChild(l);"}
var v=document.createElement('div');v.className='view';var r=C.renderSlide(deck,deck.slides[i],{mode:'thumb',resolve:resolve});r.style.transform='scale(${sc})';r.style.transformOrigin='0 0';v.appendChild(r);c.appendChild(v);document.getElementById('g').appendChild(c);});
</script></body></html>`;
  return { html, pageW, pageH: single ? H : pageH };
}

// 미리보기용으로 미디어 경로를 파일 주소로 바꾼다
function fileDeck(deck) {
  const d = clone(deck);
  const fixIdb = (src) => { if (!src || !src.startsWith('idb:')) return src; const f = idbFile(src); return f ? 'file:///' + f.replace(/\\/g, '/').replace(/^\//, '') : src; };
  d.slides.forEach((s) => { if (s.bg && s.bg.src) s.bg.src = fixIdb(s.bg.src); s.elements.forEach((e) => { if (e.src) e.src = fixIdb(e.src); }); });
  return d;
}
const FILE_BASE = () => 'file:///' + ROOT.replace(/\\/g, '/').replace(/^\//, '') + '/';
const RESOLVE_JS = "var resolve=function(s){if(!s)return'';if(s.indexOf('idb:')===0)return'';if(s.indexOf('assets/')===0||s.indexOf('music/')===0)return base+s;return s;};";

// PDF: 슬라이드 한 장 = 한 쪽. notes 이면 슬라이드 아래에 발표자 노트를 함께 싣는다
function pdfHtml(deck, notes) {
  const X = engine();
  const d = fileDeck(deck);
  const W = d.width, H = d.height;
  const NH = notes ? Math.round(H * 0.62) : 0;
  const noteJs = notes ? "var n=document.createElement('div');n.className='nt';n.innerHTML='<b>#'+(i+1)+' 발표자 노트</b>'+(s.notes?C.esc(s.notes):'<i style=\"color:#aaa\">노트 없음</i>');pg.appendChild(n);" : '';
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT_LINK}">
<style>@page{size:${W}px ${H + NH}px;margin:0}html,body{margin:0;background:#fff;font-family:'Noto Sans KR',sans-serif}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
.pg{width:${W}px;height:${H + NH}px;overflow:hidden;position:relative;break-after:page}.pg:last-child{break-after:auto}
.nt{box-sizing:border-box;height:${NH}px;padding:${Math.round(H * 0.04)}px ${Math.round(W * 0.05)}px;font-size:${Math.round(H * 0.028)}px;line-height:1.6;color:#222;border-top:4px solid #ddd;white-space:pre-wrap;overflow:hidden}
.nt b{display:block;color:#888;font-size:.8em;margin-bottom:.4em}</style></head>
<body><div id="r"></div>${mvInline(d)}<script>${X.coreSource}
var C=PlayerCore();C.injectCSS();C.setLive3d(true);var deck=${safeJson(d)};var base=${JSON.stringify(FILE_BASE())};${RESOLVE_JS}
deck.slides.forEach(function(s,i){var pg=document.createElement('div');pg.className='pg';pg.appendChild(C.renderSlide(deck,s,{mode:'thumb',resolve:resolve}));
${noteJs}
document.getElementById('r').appendChild(pg);});
</script></body></html>`;
}

// 스타일 시안 비교: 행 = 시안, 열 = 슬라이드
function sheetHtml(rows, cellW) {
  const X = engine();
  const decks = rows.map((r) => fileDeck(r.deck));
  const cols = Math.max(...rows.map((r) => r.idx.length));
  const d0 = decks[0], sc = cellW / d0.width, H = Math.round(d0.height * sc);
  const gap = 18, lab = 34;
  const pageW = cols * cellW + (cols + 1) * gap, pageH = rows.length * (H + lab + gap * 3) + gap;
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT_LINK}">
<style>html,body{margin:0;background:#d9dce3;font-family:'Noto Sans KR',sans-serif}
.row{display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:${gap}px;padding:0 ${gap}px ${gap}px}
.lab{grid-column:1/-1;height:${lab}px;font:700 20px/${lab}px 'Noto Sans KR',sans-serif;color:#222;margin-top:${gap}px}
.view{width:${cellW}px;height:${H}px;overflow:hidden;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.25)}</style></head>
<body><div id="g"></div>${mvInline(decks[0])}<script>${X.coreSource}
var C=PlayerCore();C.injectCSS();C.setLive3d(true);var decks=${safeJson(decks)};var rows=${safeJson(rows.map((r) => ({ label: r.label, idx: r.idx })))};var base=${JSON.stringify(FILE_BASE())};${RESOLVE_JS}
rows.forEach(function(r,k){var row=document.createElement('div');row.className='row';var l=document.createElement('div');l.className='lab';l.textContent=r.label;row.appendChild(l);
r.idx.forEach(function(i){var deck=decks[k];var v=document.createElement('div');v.className='view';var s=C.renderSlide(deck,deck.slides[i],{mode:'thumb',resolve:resolve});s.style.transform='scale(${sc})';s.style.transformOrigin='0 0';v.appendChild(s);row.appendChild(v);});
document.getElementById('g').appendChild(row);});
</script></body></html>`;
  return { html, pageW, pageH };
}

function printPdf(html, out) {
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome/Edge 를 찾지 못했습니다. CHROME_PATH 환경변수로 지정하세요.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hppt-pdf-'));
  const file = path.join(tmp, 'print.html');
  fs.writeFileSync(file, html);
  const outAbs = path.resolve(out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  try { fs.rmSync(outAbs, { force: true }); } catch (e) { /* ignore */ }
  const r = spawnSync(chrome, ['--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(tmp, 'profile')}`,
    '--allow-file-access-from-files', '--no-pdf-header-footer', `--virtual-time-budget=${/model-viewer|"type":"model"/.test(html) ? 25000 : 8000}`, '--run-all-compositor-stages-before-draw', `--print-to-pdf=${outAbs}`, 'file:///' + file.replace(/\\/g, '/')], { encoding: 'utf8', timeout: 180000 });
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  if (!fs.existsSync(outAbs)) throw new Error('PDF 만들기 실패: ' + (r.stderr || r.error || '').toString().slice(0, 400));
  return outAbs;
}

function findChrome() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'].filter(Boolean);
  return c.find((p) => fs.existsSync(p));
}

function screenshot(html, w, h, out) {
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome/Edge 를 찾지 못했습니다. CHROME_PATH 환경변수로 지정하세요.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hppt-render-'));
  const file = path.join(tmp, 'render.html');
  fs.writeFileSync(file, html);
  const outAbs = path.resolve(out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  const r = spawnSync(chrome, ['--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(tmp, 'profile')}`,
    // 3D 모델이 있으면 모델 파일을 받아 그릴 시간을 더 준다
    '--allow-file-access-from-files', `--window-size=${w},${h}`, `--virtual-time-budget=${/model-viewer|"type":"model"/.test(html) ? 25000 : 6000}`, '--run-all-compositor-stages-before-draw', `--screenshot=${outAbs}`, 'file:///' + file.replace(/\\/g, '/')], { encoding: 'utf8', timeout: 90000 });
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  if (!fs.existsSync(outAbs)) throw new Error('스크린샷 실패: ' + (r.stderr || r.error || '').toString().slice(0, 400));
  return outAbs;
}

/* ------------------------------------------------------------------ */
/* 명령                                                                 */
/* ------------------------------------------------------------------ */
function args(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; flags[k] = v; }
    else pos.push(a);
  }
  return { pos, flags };
}

function readJsonArg(p) {
  if (!p) throw new Error('JSON 파일 경로가 필요합니다 (- 이면 표준입력)');
  const txt = p === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(p), 'utf8');
  try { return JSON.parse(txt); } catch (e) { throw new Error(`JSON 파싱 오류 (${p}): ${e.message}`); }
}

function openUrl(u) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', u]] : process.platform === 'darwin' ? ['open', [u]] : ['xdg-open', [u]];
  spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref();
}

const HELP = `slide-studio CLI (앱 경로: ${ROOT}, 서버: ${URL_BASE})

  start [--open]              로컬 서버 실행(백그라운드). --open 이면 편집기를 브라우저로 엶
  status                      서버/덱 상태
  catalog [종류]              themes | layouts | anims | transitions | fx | shapes | actions | charts | codeLangs | music | fonts | aspects | hovers
  show [n]                    덱 요약 / n번 슬라이드 상세(요소 id·좌표·애니메이션)
  get [--out file]            덱 전체 JSON
  build <spec.json> [--append] [--at n] [--no-goto]   사양으로 덱 생성(기본: 교체)
  --file <deck.hppt.json>     (모든 명령) 실시간 덱 대신 별도 덱 파일을 대상으로 — 기존 덱을 건드리지 않음
  patch <ops.json|-> [--no-goto]                      부분 수정 연산 실행
  put <deck.json>             덱 JSON 통째로 교체
  render [n|all] [--out file.png] [--width px]        PNG 미리보기 (기본 all → 한 장의 목록 이미지)
  export <out.html>           단독 실행 HTML 내보내기
  export <out.pdf> [--notes]  PDF (슬라이드 1장 = 1쪽, --notes 면 아래에 발표자 노트)
  styles <spec.json> --variants v.json [--slides 1,2] [--out f.png]   스타일 시안 비교 이미지 (덱은 바꾸지 않음)
  goto <n> | next | prev      편집기/발표 화면 이동
  present [n] [--auto]        발표 시작 (--auto: 자동 재생)
  stop                        발표 종료
  toast "<메시지>"            편집기에 알림 표시
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, flags } = args(rest);
  const X = () => engine();

  switch (cmd) {
    case undefined: case 'help': case '-h': case '--help':
      console.log(HELP); return;

    case 'start': {
      let st = await serverUp();
      if (!st) {
        const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true });
        child.unref();
        for (let i = 0; i < 30 && !st; i++) { await new Promise((r) => setTimeout(r, 300)); st = await serverUp(); }
        if (!st) throw new Error('서버를 시작하지 못했습니다. 직접 실행해 보세요: node "' + path.join(ROOT, 'server.js') + '"');
        console.log('서버 시작됨: ' + URL_BASE);
      } else console.log('서버가 이미 실행 중입니다: ' + URL_BASE);
      if (flags.open) { openUrl(URL_BASE + '/index.html'); console.log('브라우저에서 편집기를 열었습니다.'); }
      return;
    }

    case 'status': {
      const st = await serverUp();
      const cur = await readDeck();
      console.log(st ? `서버: 실행 중 (${URL_BASE}) rev ${st.rev}, 마지막 수정: ${st.source || '-'}` : `서버: 꺼짐 — "node deck.mjs start --open" 으로 실행하세요. (파일 모드로 동작: ${DECK_FILE})`);
      console.log(cur.deck ? summary(cur.deck) : '덱 없음 — build 또는 편집기에서 시작하세요.');
      return;
    }

    case 'catalog': {
      const E2 = X();
      const what = pos[0] || 'all';
      const out = {
        themes: Object.fromEntries(Object.entries(E2.THEMES).map(([k, t]) => [k, `${t.name} — bg ${t.bg.gradient || t.bg.color}, title ${t.title}, text ${t.text}, accent ${t.accent}/${t.accent2}, 글꼴 ${t.fontTitle.split(',')[0]}`])),
        layouts: E2.LAYOUTS,
        anims: Object.fromEntries(Object.entries(E2.Core.ANIMS).map(([k, d]) => [k, `${E2.Core.ANIM_CATS[d.cat]} · ${d.label}`])),
        transitions: Object.fromEntries(Object.entries(E2.Core.TRANSITIONS).map(([k, d]) => [k, d.label])),
        fx: E2.Core.BG_FX, shapes: Object.fromEntries(Object.entries(E2.Core.SHAPES).map(([k, d]) => [k, d.label])),
        actions: E2.Core.ACTIONS, hovers: E2.Core.HOVERS, charts: E2.Core.CHART_TYPES, codeLangs: E2.Core.CODE_LANGS,
        music: Object.fromEntries(musicLib().map((t) => [t.id, `${t.title} — ${t.mood} · ${t.tags.join('/')} · ${t.duration}s · ${t.use}`])),
        fonts: Object.fromEntries(E2.FONTS.map(([v, l]) => [l, v])),
        aspects: Object.fromEntries(Object.entries(E2.ASPECTS).map(([k, a]) => [k, `${a.label} ${a.w ? a.w + '×' + a.h : ''}`])),
      };
      console.log(JSON.stringify(what === 'all' ? out : out[what] || { error: '종류: ' + Object.keys(out).join(', ') }, null, 1));
      return;
    }

    case 'show': {
      const cur = await readDeck();
      if (!cur.deck) { console.log('덱 없음'); return; }
      console.log(summary(cur.deck, pos[0] ? +pos[0] : null));
      return;
    }

    case 'get': {
      const cur = await readDeck();
      const txt = JSON.stringify(cur.deck, null, 1);
      if (flags.out) { fs.writeFileSync(path.resolve(flags.out), txt); console.log('저장: ' + path.resolve(flags.out)); } else console.log(txt);
      return;
    }

    case 'build': {
      const spec = readJsonArg(pos[0]);
      const res = await mutate((deck) => {
        if (flags.append && deck) {
          const { slides } = deckFromSpec(spec, deck);
          const at = flags.at ? Math.max(1, Math.min(deck.slides.length + 1, +flags.at)) : deck.slides.length + 1;
          deck.slides.splice(at - 1, 0, ...slides);
          return { deck, info: { focus: at, added: slides.length } };
        }
        const { deck: nd, slides } = deckFromSpec(spec, null);
        nd.slides = slides;
        applyMusic(nd, spec.music);
        if (spec.musicOptions && nd.bgm) Object.assign(nd.bgm, spec.musicOptions);
        if (!slides.length) nd.slides.push(X().buildLayout(nd, 'title', { title: nd.title }, {}));
        return { deck: nd, info: { focus: 1, added: slides.length } };
      });
      console.log(`✓ ${res.info.added}장 ${flags.append ? '추가' : '생성'} (rev ${res.rev}, ${SEPARATE ? '별도 파일: ' + DECK_FILE : res.via === 'server' ? '편집기에 실시간 반영' : '파일에 저장 — 서버를 켜면 편집기에 반영'})`);
      console.log(summary(res.deck));
      if (!flags['no-goto']) await command({ type: 'goto', slide: res.info.focus });
      return;
    }

    case 'patch': {
      let ops = readJsonArg(pos[0]);
      if (!Array.isArray(ops)) ops = ops.ops || [ops];
      const res = await mutate((deck) => {
        if (!deck) throw new Error('덱이 없습니다. 먼저 build 하세요.');
        const before = new Set(X().brokenMorphs(deck));
        const focus = runOps(deck, ops);
        const broken = X().brokenMorphs(deck).filter((id) => !before.has(id)).map((id) => deck.slides.findIndex((x) => x.id === id) + 1);
        return { deck, info: { focus, broken } };
      });
      console.log(`✓ ${ops.length}개 연산 적용 (rev ${res.rev}, ${res.via})`);
      if (res.info.broken && res.info.broken.length) warn(`모핑 연결이 끊긴 슬라이드: #${res.info.broken.join(', #')} — 앞 슬라이드와 이어지는 요소가 없어 발표 때 페이드로 넘어갑니다. 체인은 slide.move 로 한꺼번에(연속 번호를 차례로) 옮기거나, 끊긴 슬라이드의 transition 을 바꾸세요.`);
      if (res.info.focus) console.log(summary(res.deck, res.info.focus));
      else console.log(summary(res.deck));
      if (res.info.focus && !flags['no-goto']) await command({ type: 'goto', slide: res.info.focus });
      return;
    }

    case 'put': {
      const data = readJsonArg(pos[0]);
      const deck = data.deck || data;
      if (!Array.isArray(deck.slides)) throw new Error('slides 배열이 없습니다');
      const res = await mutate(() => deck);
      console.log(`✓ 덱 교체 (rev ${res.rev}, ${res.via})`);
      return;
    }

    case 'render': {
      const cur = await readDeck();
      if (!cur.deck) throw new Error('덱 없음');
      const which = pos[0] && pos[0] !== 'all' ? +pos[0] : 'all';
      if (which !== 'all' && (which < 1 || which > cur.deck.slides.length)) throw new Error('슬라이드 번호 범위 밖');
      const width = +flags.width || (which === 'all' ? (cur.deck.slides.length > 9 ? 360 : 480) : 1280);
      const { html, pageW, pageH } = renderHtml(cur.deck, which, width);
      const out = flags.out || path.join(SEPARATE ? path.dirname(DECK_FILE) : path.join(ROOT, 'decks'), 'renders', (SEPARATE ? path.basename(DECK_FILE).replace(/..*$/, '') + '-' : '') + (which === 'all' ? 'overview.png' : `slide-${which}.png`));
      const file = screenshot(html, pageW, pageH, out);
      console.log('🖼  ' + file);
      if (cur.deck.slides.some((s) => s.elements.some((e) => e.src && e.src.startsWith('idb:') && !idbFile(e.src)))) warn('아직 백업되지 않은 브라우저 미디어(idb:)는 미리보기에 표시되지 않습니다.');
      return;
    }

    case 'export': {
      const cur = await readDeck();
      if (!cur.deck) throw new Error('덱 없음');
      const out = path.resolve(pos[0] || path.join(ROOT, 'decks', (cur.deck.title || 'presentation').replace(/[\\/:*?"<>|]+/g, '_') + '.html'));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      if (/\.pdf$/i.test(out)) {
        printPdf(pdfHtml(cur.deck, !!flags.notes), out);
        console.log(`✓ PDF 내보냄 (${cur.deck.slides.length}쪽${flags.notes ? ', 발표자 노트 포함' : ''}): ` + out);
        if (cur.deck.slides.some((s) => s.elements.some((e) => e.src && e.src.startsWith('idb:') && !idbFile(e.src)))) warn('아직 백업되지 않은 브라우저 미디어(idb:)는 PDF 에 나오지 않습니다.');
        return;
      }
      fs.writeFileSync(out, exportHtml(cur.deck));
      console.log('✓ 내보냄: ' + out);
      return;
    }

    case 'styles': {
      // 같은 내용을 시안 여러 개(무난·과감·의외)로 만들어 한 장에 비교 — 덱은 저장하지 않는다
      const spec = readJsonArg(pos[0]);
      const variants = flags.variants ? readJsonArg(flags.variants) : spec.variants;
      if (!Array.isArray(variants) || !variants.length) throw new Error('시안 목록이 필요합니다: --variants variants.json  ([{ "name": "무난 — 네이비 골드", "theme": "gold", "palette": {…} }, …])');
      const pick = String(flags.slides || '1,2').split(',').map((x) => +x.trim()).filter((x) => x >= 1);
      const rows = variants.map((v, k) => {
        const sp = Object.assign({}, spec, { theme: v.theme || spec.theme, palette: v.palette || undefined, aspect: v.aspect || spec.aspect });
        if (sp.slides) sp.slides = sp.slides.filter((_, i) => pick.includes(i + 1));
        if (v.fx != null && sp.slides && sp.slides[0]) sp.slides[0] = Object.assign({}, sp.slides[0], { fx: v.fx });
        const { deck, slides } = deckFromSpec(sp, null);
        deck.slides = slides;
        return { label: `${String.fromCharCode(65 + k)}. ${v.name || v.theme || '시안 ' + (k + 1)}`, deck, idx: slides.map((_, i) => i).slice(0, 4) };
      });
      const { html, pageW, pageH } = sheetHtml(rows, +flags.width || 560);
      const out = flags.out || path.join(ROOT, 'decks', 'renders', 'styles.png');
      console.log('🎨 ' + screenshot(html, pageW, pageH, out));
      rows.forEach((r) => console.log('   ' + r.label));
      return;
    }

    case 'goto': case 'present': case 'stop': case 'next': case 'prev': case 'toast': {
      const c = { type: cmd };
      if (cmd === 'goto' || cmd === 'present') c.slide = +(pos[0] || 1);
      if (cmd === 'present' && flags.auto) c.autoplay = true;
      if (cmd === 'toast') c.text = pos.join(' ');
      const ok = await command(c);
      console.log(ok ? `✓ ${cmd} 전송` : '서버가 꺼져 있어 명령을 보낼 수 없습니다. (start 먼저)');
      return;
    }

    default:
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((e) => { console.error('✕ ' + (e && e.message ? e.message : e)); process.exitCode = 1; });
