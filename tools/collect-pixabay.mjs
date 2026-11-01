#!/usr/bin/env node
/*
 * Pixabay 추천곡 수집기
 * 다운로드 폴더에서 Pixabay 추천곡(파일 이름 끝의 곡 번호로 구분)을 찾아 music/pixabay/ 로 복사하고,
 * 편집기가 읽는 목록(js/music-local.js)을 만든다. 추천 목록에 없는 파일은 건드리지 않는다.
 *
 *   node tools/collect-pixabay.mjs                 # 한 번 수집
 *   node tools/collect-pixabay.mjs --watch [분]    # 다운로드 폴더를 지켜보며 계속 수집 (기본 40분)
 *   node tools/collect-pixabay.mjs --open          # 받지 않은 곡의 Pixabay 페이지를 브라우저에서 열기
 *   node tools/collect-pixabay.mjs --dir "D:\받은파일"
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'music', 'pixabay');
const LOCAL_JS = path.join(ROOT, 'js', 'music-local.js');
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const val = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const DIR = val('--dir', path.join(os.homedir(), 'Downloads'));

// js/music.js 에서 추천 목록과 번호 인식 함수를 그대로 읽어 온다
const ctx = vm.createContext({ localStorage: { getItem: () => null, setItem() {} } });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'music.js'), 'utf8') + ';this.PICKS = PIXABAY_PICKS; this.idOf = pixabayIdFromName; this.CATS = PIXABAY_CATS;', ctx);
const PICKS = ctx.PICKS, idOf = ctx.idOf;

function loadLocal() {
  try {
    const txt = fs.readFileSync(LOCAL_JS, 'utf8');
    const m = txt.match(/PIXABAY_LOCAL = (\{[\s\S]*\});/);
    return m ? JSON.parse(m[1]) : {};
  } catch (e) { return {}; }
}

function saveLocal(local) {
  // 실제로 파일이 있는 것만
  for (const k of Object.keys(local)) if (!fs.existsSync(path.join(ROOT, local[k].file))) delete local[k];
  fs.writeFileSync(LOCAL_JS, '/* Pixabay 추천곡 중 프로젝트에 받아 둔 곡 (tools/collect-pixabay.mjs 가 자동으로 만듦) */\nconst PIXABAY_LOCAL = ' + JSON.stringify(local, null, 1) + ';\n');
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function collectOnce(local, quiet) {
  fs.mkdirSync(OUT, { recursive: true });
  let files = [];
  try { files = fs.readdirSync(DIR); } catch (e) { console.error('다운로드 폴더를 읽을 수 없습니다:', DIR); return []; }
  const got = [];
  for (const name of files) {
    if (!/\.(mp3|wav|m4a|ogg)$/i.test(name)) continue;
    const id = idOf(name);
    const pk = id && PICKS.find((x) => x.id === id);
    if (!pk || local[id]) continue;
    const src = path.join(DIR, name);
    let st;
    try { st = fs.statSync(src); } catch (e) { continue; }
    if (st.size < 20000) continue; // 다운로드 중이거나 깨진 파일
    // 다운로드가 아직 진행 중이면(크기 변화) 다음 차례에
    if (Date.now() - st.mtimeMs < 1500) continue;
    const ext = path.extname(name).toLowerCase();
    const rel = `music/pixabay/${id}-${slug(pk.title)}${ext}`;
    fs.copyFileSync(src, path.join(ROOT, rel));
    local[id] = { file: rel, size: st.size, from: name, at: new Date().toISOString() };
    got.push(pk);
    if (!quiet) console.log(`✓ ${pk.ko || pk.title} (${pk.artist}) ← ${name}`);
  }
  if (got.length) saveLocal(local);
  return got;
}

function report(local) {
  const have = PICKS.filter((x) => local[x.id]);
  console.log(`\n받은 곡 ${have.length} / ${PICKS.length}`);
  const miss = PICKS.filter((x) => !local[x.id]);
  if (miss.length && miss.length <= 12) miss.forEach((x) => console.log(`  · 아직: ${x.ko || x.title} — ${x.url}`));
  else if (miss.length) console.log(`  · 아직 ${miss.length}곡 남음`);
}

function openPages(local) {
  const todo = PICKS.filter((x) => !local[x.id]);
  todo.forEach((x, i) => setTimeout(() => {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', x.url]] : process.platform === 'darwin' ? ['open', [x.url]] : ['xdg-open', [x.url]];
    spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }, i * 700));
  console.log(`브라우저에서 ${todo.length}개 페이지를 엽니다. 각 탭에서 Download 를 눌러 주세요.`);
  return todo.length;
}

const local = loadLocal();
if (!fs.existsSync(LOCAL_JS)) saveLocal(local);
if (flag('--open')) openPages(local);
collectOnce(local);
if (flag('--watch')) {
  const minutes = +val('--watch', 40) || 40;
  const until = Date.now() + minutes * 60000;
  console.log(`다운로드 폴더를 지켜보는 중: ${DIR} (최대 ${minutes}분, 33곡을 모두 받으면 자동 종료)`);
  const tick = () => {
    collectOnce(local);
    const have = PICKS.filter((x) => local[x.id]).length;
    if (have >= PICKS.length || Date.now() > until) { report(local); process.exit(0); }
    setTimeout(tick, 3000);
  };
  setTimeout(tick, 3000);
} else report(local);
