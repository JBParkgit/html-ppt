// UserPromptSubmit 훅: HTML-ppt 폴더 안에서 작업할 때, 편집기에서 지금 선택한 슬라이드·개체를
// 프롬프트마다 Claude 에게 알려 준다. 편집기가 꺼져 있거나 선택이 없으면 아무것도 출력하지 않는다.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

let cwd = process.cwd();
try { const inp = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, '').trim() || '{}'); if (inp.cwd) cwd = inp.cwd; } catch {}
if (!resolve(cwd).toLowerCase().startsWith(ROOT.toLowerCase())) process.exit(0);

let out = '';
try {
  out = execFileSync(process.execPath, [join(ROOT, '.claude/skills/slide-studio/scripts/deck.mjs'), 'selection'],
    { cwd: ROOT, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch { process.exit(0); }

if (!out || !out.startsWith('편집기: 연결됨') || !out.includes('슬라이드 #')) process.exit(0);

console.log(`[편집기 현재 선택 — 사용자가 슬라이드 번호나 대상을 따로 말하지 않고 "여기", "이거", "이 문장", "이 슬라이드"처럼 말하거나 대상 없이 수정을 요청하면 이 선택을 대상으로 삼는다. 선택한 개체가 있으면 그 개체, 없으면 그 슬라이드.]
${out}`);
