# 덱 사양(spec) · 수정 연산(ops) 레퍼런스

정확한 키 목록은 항상 `deck catalog <종류>` 로 확인할 수 있다.

## 1. 덱 사양 — `deck build spec.json`

```json
{
  "title": "프레젠테이션 제목",
  "aspect": "16:9",                 // 16:9 | 4:3 | 16:10 | 21:9 | 1:1 | 4:5 | 9:16 | A4 | A4P
  "size": "1200x800",               // (선택) 사용자 지정 크기 — aspect 대신
  "theme": "midnight",              // 기본 테마 키 (catalog themes)
  "palette": {                      // (선택) 테마 색 덮어쓰기 — design.md 팔레트 복사
    "bg": "#0f1b2d",                //   색 또는 "linear-gradient(…)" 문자열
    "title": "#f8f1e5", "text": "#c9d1dc", "accent": "#d4a24c", "accent2": "#5b8def",
    "fontTitle": "'Playfair Display', 'Nanum Myeongjo', serif", "fontBody": "'Noto Sans KR', sans-serif"
  },
  "transition": "fade",             // 기본 전환 (슬라이드별로 덮어쓰기 가능)
  "animate": true,                  // 레이아웃 기본 애니메이션 사용 여부
  "autoDuration": 5,                // 자동 재생 시 기본 표시 시간(초)
  "slides": [ { …슬라이드 사양… } ]
}
```

### 배경음악 (deck)

```json
"music": [
  { "track": "05", "slides": "1-6", "volume": 0.6 },   // 내장 곡 번호(01~10) 또는 아이디, 슬라이드 범위
  { "track": "my-song.mp3", "slides": "8-10" }          // 로컬 파일 경로도 가능
],
"musicOptions": { "fadeIn": 1.5, "fadeOut": 2, "duck": true }
```
같은 곡이 이어지는 슬라이드는 끊기지 않고 재생되고, 곡이 바뀌면 크로스페이드, 지정 안 된 슬라이드는 무음. 내장 곡 목록: `deck catalog music`.
patch: `{ "op": "music", "track": "01", "slides": "2-4", "volume": 0.5 }`, `{ "op": "music.clear", "slides": "all" }`.

## 2. 슬라이드 사양

공통 필드:

| 필드 | 설명 |
|---|---|
| `layout` | 레이아웃 키 (아래 표). 생략 시 `elements` 가 있으면 `blank`, 아니면 `bullets` |
| `notes` | 발표자 노트 |
| `transition` | `"cube"` 또는 `{ "type": "cube", "duration": 900 }` (catalog transitions; `morph` 포함) |
| `duration` | 자동 재생 시 표시 시간(초) |
| `bg` | `"#112233"` / `"linear-gradient(…)"` / 이미지·동영상 경로 / `{ "type":"image","src":"…","overlay":0.4,"fit":"cover" }` / **배경 동영상** `{ "type":"video","src":"loop.mp4","overlay":0.4,"fit":"cover","speed":0.5,"blur":6,"start":2,"end":9,"sound":false,"volume":0.6,"continue":true }` — speed(재생 속도, 0.5=슬로모션) · blur(px) · start/end(초, 이 구간만 반복) · sound(영상 소리, 기본 꺼짐) · continue(기본 true: 앞 슬라이드와 같은 영상이면 이어서 재생). 글자를 올리면 overlay 0.3–0.5 |
| `fx` | 움직이는 배경: `"particles"` 또는 `{ "type":"aurora","color":"#63e6be","color2":"#74c0fc","speed":1 }` |
| `animate` | `false` 면 레이아웃 애니메이션 없음 |
| `replaceAnims` | `true` 면 레이아웃 애니메이션을 지우고 `anims` 만 사용 |
| `anims` | `[ { "el": 선택자, "effect": "rise", "trigger": "click\|with\|after", "duration": 700, "delay": 0, "repeat": 1, "dim": true } ]` (레이아웃 애니메이션 뒤에 추가). `dim: true` = 다음 클릭 묶음이 나오면 이 요소를 흐리게 |
| `dimPrev` | `true` 면 **지난 항목 흐리게**: 클릭으로 나온 항목이 다음 클릭 때 모두 30% 로 흐려져 지금 말하는 항목만 밝다 (처음 자동으로 나오는 제목 등은 그대로). 단계별 요점·성경 해설·①②③ 설명에 |
| `elements` | 직접 배치할 요소 배열 (3장) — 레이아웃 위에 추가됨 |
| `override` | `[ { "el": 선택자, "set": { 요소 속성… } } ]` — 레이아웃이 만든 요소 일부 수정 |
| `hide` | `[ 선택자, … ]` — 레이아웃이 만든 요소 제거 |
| `morph` | `true` 면 앞 슬라이드와 같은 역할·순서의 요소를 이어 붙여 **모핑 전환** (레이아웃 애니메이션은 자동 제거, `keepAnims: true` 로 유지) |

레이아웃별 내용 필드:

| layout | 필드 |
|---|---|
| `title` | title, subtitle |
| `section` | number("01" — 생략하면 01, `""` 이면 번호 없이), emoji(번호 대신 이모지), title, subtitle |
| `section-center` · `section-band` · `section-right` · `section-number` · `section-frame` | section 과 같은 필드 — 섹션 구분 변형(가운데 정렬 · 가로 띠 · 오른쪽 블록 · 큰 숫자 배경 · 액자 테두리). 섹션이 여러 개면 같은 변형으로 통일하거나 덱 분위기에 맞게 고른다 |
| `bullets` | title, bullets[] |
| `text` | title, text(긴 글 — 줄바꿈으로 문단 구분, **굵게**·==형광펜== 등 서식 가능), align |
| `text-2col` | title, text — 긴 글을 두 단으로 나눠 배치 (세로 화면은 1단) |
| `text-points` | title, text, pointsTitle("핵심"), bullets[](오른쪽 요점 카드) |
| `scripture` | title(본문 위치, 예: "욥기 19:25-27"), text(줄 앞 숫자 = 절 번호: `"25 내가 알기에는…\n26 …"`), caption(번역본 표기) |
| `list-2col` | title, bullets[] (6–16개, 6개 이상이면 2단 · 번호 자동) |

**긴 글 레이아웃 (`text` · `text-2col` · `text-points` · `scripture`)**: 글 양에 맞춰 글자 크기를 자동으로 정한다(본문 40→26, 성경 본문 56→30). 읽기 좋은 크기로 담기지 않으면 문단·문장 단위로 **여러 장으로 자동 분할**하고 다음 장 제목에 "(계속)"을 붙인다(성경 본문은 제목 유지). 분할하지 않으려면 `"split": false`, 글자 크기를 고정하려면 `"fontSize": 34`. 분할·넘침은 CLI 가 ⚠ 로 알린다.
| `two-column` | title, leftTitle, left[], rightTitle, right[] |
| `image-text` | title, image(경로/URL), bullets[] 또는 subtitle |
| `quote` | quote, author |
| `big-number` | number("87%"), title, caption — 숫자는 카운트업 |
| `agenda` | title, bullets[] (3–7) |
| `cards` | title, bullets[] = `"🚀 제목: 설명"` (3–4) |
| `timeline` | title, bullets[] = `"2026: 내용"` (3–6) |
| `stats` | title, bullets[] = `"98%: 설명"` (3–4) — 카운트업 |
| `chart` | title, chartType(bar\|hbar\|stacked\|line\|area\|pie\|donut), chartData, caption |
| `quiz` | title(질문), bullets[](보기 ≤4), correct(1부터), caption(정답 해설, 정답 클릭 시 등장) |
| `image-full` | image, title, subtitle |
| `code` | title, code, lang, fileName, caption |
| `closing` | title, subtitle |
| `blank` | (elements 로 직접 구성) |

`chartData` 는 CSV 문자열 `"항목,2025,2026\n1분기,40,55"` 또는 2차원 배열 `[["항목","2025"],["1분기",40]]`. 첫 행 = 머리글(계열 이름), 첫 열 = 항목 이름. 원형/도넛은 첫 값 열만 사용. 숫자에 단위·쉼표를 넣지 않는다.

레이아웃이 만드는 요소의 `role`: `title`(제목·소제목), `body`(본문), `accent`(장식 도형), `accent-text`, `card`, `button`, `chart`, `image`, `image-placeholder`, `overlay`.

## 3. 요소 (elements / el.add / override.set)

공통: `type`, `x`, `y`, `w`, `h` (px 또는 `"12%"`), `rotation`, `opacity`(0–1), `shadow`(0–40), `role`, `key`(모핑용 이름 — 다른 슬라이드에서 같은 key 끼리 변형),
`anim`(이 요소에 붙일 애니메이션: `"rise"` 또는 `{effect, trigger, duration, delay}`), `action`, `hover`, `startHidden`.

| type | 주요 속성 |
|---|---|
| `text` | `text`(서식 문법), fontSize, color, fontFamily, bold, italic, underline, align(left\|center\|right\|justify), valign(top\|middle\|bottom), lineHeight, letterSpacing, padding, fill(배경), borderWidth, borderColor, radius, textShadow |
| `shape` | shape(catalog shapes: rect, rounded, ellipse, pill, triangle, diamond, star, arrow-right, chevron, hexagon, speech, line …), fill(색 또는 gradient), borderWidth/borderColor, radius, lineWidth(line) + 텍스트 속성 전부 (도형 안 글자) |
| `image` | src, fit(cover\|contain\|fill), radius, borderWidth, borderColor, grayscale, brightness, contrast, sepia, blur, flipH, alt |
| `video` | src, fit, autoplay, loop, muted, controls, radius, **fullscreen: true** (슬라이드 전체 크기 · 비율 유지 · 남는 부분 fill 색, 기본 검정), **trimStart / trimEnd** (초 — 원본은 그대로, 이 구간만 재생), **clickFull: true** (발표 중 클릭하면 슬라이드 전체로 커지며 소리와 함께 재생, Esc/✕ 로 복귀) |
| `embed` | url (YouTube/Vimeo/웹페이지), autoplay, muted, loop, controls, trimStart / trimEnd (YouTube), clickFull |
| `model` | **3D 모델** (glTF/GLB, Google model-viewer 로 표시): src(로컬 .glb 경로 → assets/ 복사, 또는 URL), autoRotate(true), rotateSpeed(초당 도, 기본 30, 음수면 반대), orbit(시작 시점 `"30deg 75deg auto"` = 좌우 · 위아래 · 거리), exposure(밝기 1), shadowIntensity(그림자 1), envLight(neutral\|legacy), animation(모델 애니메이션 재생, true), controls(발표 중 마우스로 돌리기, true), zoom(휠 확대, false), fill(배경, 기본 투명). 정사각형에 가깝게 배치. **모핑**: 다음 슬라이드에 같은 src 모델을 두고 `"transition":"morph"` 면 다시 불러오지 않고 위치·크기·orbit 이 전환 시간 동안 이어서 바뀐다(짧은 쪽으로 회전, 자동 회전으로 돈 만큼도 되돌림). 예제: `https://modelviewer.dev/shared-assets/models/Astronaut.glb` |
| `path` | **펜 선** — points(`[[x,y],…]` 슬라이드 좌표 px 또는 "50%"), smooth(true 면 부드러운 곡선), closed(닫힌 도형), stroke(선 색), strokeWidth, fill(닫힌 도형 채우기, 기본 투명), dash(solid·dash·longdash·dot), cap(round·butt·square), join(round·miter·bevel), arrowStart, arrowEnd. 상자는 자동 계산. 애니메이션 `draw-line` 이면 선이 그려지며 나타남 — `drawFx`: none·glow(빛나는 선)·tip(펜 끝 빛)·sparkle(불꽃 튀기)·neon(전부 + 끝에 번쩍), `drawDir`: forward·reverse(끝→처음)·center(가운데→양쪽). 예: `"anim": {"effect":"draw-line","duration":2400,"drawFx":"neon","drawDir":"reverse"}`. 편집기에서 더블클릭해 점 편집 |
| `table` | data(CSV/배열), fontSize, color, headerRow, headerColor, headerText, striped, stripeColor, cellColor, borderColor, colWidths("15,42.5,42.5" 열 너비 비율), rowHeights("20,40,40" 행 높이 비율 — 행 수와 같아야 적용, 글자보다 낮게는 안 줄어듦). 편집기에서는 표를 선택하고 경계선을 끌어 조절 |
| `chart` | chartType(bar·hbar·stacked·stacked100·combo·line·area·pie·donut·radar·gauge·funnel), data(CSV/배열), fontSize, color(글자), colors("#a,#b,…"), showValues, showGrid, legendPos(top·bottom·right·none), smooth, prefix("$"), unit("%","억"), yMin, yMax, xTitle, yTitle, target, targetLabel, highlight(1부터 번호 또는 항목 이름 — 나머지는 흐리게), barRadius, centerText(도넛·게이지), gaugeMax, chartAnim, chartDur(ms) |
| `code` | code(또는 text), lang(js·ts·py·html·css·json·sql·bash·java·text), title(파일 이름 표시줄), codeTheme(dark·light), fontSize, lineNumbers, highlightLines("2-3,5" — 나머지 줄은 흐리게), radius |

상호작용:

```json
"action": { "type": "next|prev|first|last|goto|url|toggle|show|hide|play|answer",
            "slide": 3,            // goto
            "url": "https://…",    // url
            "target": "key:help",  // toggle/show/hide/play/answer 의 대상 (선택자)
            "correct": true },     // answer
"hover": "grow|lift|glow|pulse|tilt",
"startHidden": true                // 처음엔 숨김 → show/toggle/answer 로 등장
```

## 4. 요소 선택자

`0`, `3` (배열 순서) · `"last"` · `"role:title"`, `"role:body#1"` (같은 역할 중 n번째, 0부터) · `"type:chart"` · `"text:포함된 글자"` · `"key:모핑키"` · 요소 id.
`deck show <n>` 이 각 요소의 순서·id·role·key 를 보여 준다.

## 5. 수정 연산 — `deck patch ops.json`

JSON 배열. 슬라이드 번호는 **1부터**.

```json
[
  { "op": "title", "value": "새 제목" },
  { "op": "theme", "id": "corporate", "palette": { "accent": "#e11d48" } },
  // theme 은 테마에서 온 색·글꼴·배경만 바꾼다 (직접 지정한 색, 배경 이미지·동영상, fx 는 유지). 모두 되돌리려면 "reset": true
  { "op": "aspect", "value": "9:16" },
  { "op": "slide.add", "at": 3, "layout": "stats", "title": "…", "bullets": ["…"] },
  { "op": "slide.replace", "slide": 2, "layout": "cards", "title": "…", "bullets": ["…"] },
  { "op": "slide.update", "slide": 2, "set": { "notes": "…", "transition": "cube", "bg": "#000", "fx": "stars", "duration": 6, "morph": true, "dimPrev": true } },
  { "op": "slide.duplicate", "slide": 4, "morph": true, "changes": [ { "el": "role:title", "set": { "fontSize": 40, "y": 40 } } ] },
  { "op": "slide.move", "slide": 5, "to": 2 },
  { "op": "slide.remove", "slide": 6 },
  { "op": "el.update", "slide": 2, "el": "role:title", "set": { "text": "…", "color": "#ff6b6b", "fontSize": 72 } },
  { "op": "el.add", "slide": 2, "element": { "type": "shape", "shape": "pill", "text": "자세히 ▶", "x": "70%", "y": "82%", "w": "22%", "h": "10%", "action": { "type": "goto", "slide": 5 }, "hover": "grow", "anim": "rise" } },
  { "op": "el.remove", "slide": 2, "el": "type:chart" },
  { "op": "el.order", "slide": 2, "el": "role:title", "to": "front" },
  { "op": "anim.set", "slide": 2, "anims": [ { "el": "role:title", "effect": "fade-in", "trigger": "after" }, { "el": "role:body", "effect": "rise", "trigger": "click" } ] },
  { "op": "anim.add", "slide": 2, "el": "last", "effect": "pulse", "trigger": "after" },
  { "op": "anim.clear", "slide": "all" },
  { "op": "all.update", "set": { "transition": "fade", "fx": "none" } }
]
```

**Magic Move (단어 단위 모핑)**: 모핑으로 이어지는 두 슬라이드에서 같은 key 의 `code` 또는 텍스트 요소 내용이 다르면, 바뀌지 않은 단어(토큰)는 새 자리로 날아가고 바뀐 부분만 사라지고 나타난다. 코드 설명은 같은 key 의 code 요소를 단계별 슬라이드로 나누고 2번째부터 `"transition": "morph"`. 제목 텍스트도 같은 key 로 두면 바뀐 단어만 교체된다.

**차트 값 모핑**: 같은 key 의 chart 가 다음 슬라이드에서 data 만 다르면 막대·점·선·조각이 새 값으로 움직인다. 이때 두 슬라이드의 `yMax`/`yMin` 을 같게 고정하면 축이 흔들리지 않는다. 다음 슬라이드의 chart 에는 `anim` 을 주지 않는다(다시 그리기 방지).

**모핑 체인 주의**: 모핑 슬라이드는 바로 앞 슬라이드와 짝을 맞춘다. `slide.move`/`slide.add --at`/`slide.remove` 로 관계없는 슬라이드가 체인 사이에 끼면 그 뒤 슬라이드는 "연결 끊김"(발표 때 페이드)이 되고 CLI 가 ⚠ 경고를 낸다. 체인은 연속된 번호를 차례로 옮겨 한 덩어리로 유지하고, 새 슬라이드는 체인이 끝난 뒤에 넣는다. 체인 안에서 순서만 바꾸는 것은 같은 key 를 공유하므로 끊기지 않는다.

`theme` 연산은 role 이 있는 요소들의 색·글꼴과 배경을 새 테마로 다시 칠한다(직접 지정한 색은 role 이 없으면 유지).

## 6. 애니메이션 · 전환 · 배경 효과 (요약)

- 나타내기: fade-in, fly-left/right/top/bottom, rise, sink, slide-in-left, zoom-in, zoom-down, bounce-in, drop-in, spin-in, flip-x, flip-y, swing-in, blur-in, wipe-right, wipe-down, circle-reveal, typewriter, **count-up**(숫자 세기), **chart-draw**(차트 그리기)
- 강조: pulse, grow, shake, wobble, tada, flash, spin, heartbeat, jelly, color-pop · 반복: float, rotate-loop, breathe, blink · 끝내기: fade-out, fly-out-left/right, zoom-out, blow-out, blur-out, fall-out
- **표 행 하나씩**: rows-prism(삼각기둥 회전 — 빈 면이 위로 넘어가고 내용 면이 올라옴), rows-rise, rows-slide, rows-fade. 표에 효과 하나만 붙이면 머리글을 뺀 행마다 한 단계가 된다. 첫 행은 `trigger`, 다음 행은 `rowTrigger`(기본 `click`, `after` 면 이어서 자동), `rowDelay`(ms). `dim: true` 면 지난 행 글자를 흐리게. 예: `"anim": { "effect": "rows-prism", "trigger": "click", "duration": 900, "dim": true }`
- trigger: `click`(클릭마다 한 단계) · `with`(이전과 동시) · `after`(이전이 끝난 뒤). 첫 항목이 click 이 아니면 슬라이드가 열릴 때 자동 실행.
- 전환: none, **morph**, fade, fade-black, push-left, push-up, cover-left, cover-up, zoom-in, zoom-out, flip, cube, wipe, circle, blinds, blur, rotate
- fx: flow, aurora, waves, shapes, bubbles · 빛/예배: glow, bokeh, dust, stars ('rays' 는 욱일기 연상으로 삭제 — 쓰면 dust 로 바뀜. 방사형 빛살 디자인 금지) · 자연: snow, petals, leaves, rain, clouds, fireflies · 의료/과학: heartbeat, dna, hex, ripple, particles · 비즈니스: lines, dotwave, grid, matrix · 축하: confetti, fireworks (color, color2, speed)

## 7. 덱 JSON 구조 (get/put 용)

```
deck  = { title, aspect, width, height, theme:{ id, custom? }, autoDuration, slides:[slide] }
slide = { id, layout, dimPrev?, bg:{ type:color|gradient|image|video, color, gradient, src, overlay, fit, speed, blur, start, end, sound, volume, continue, fx, fxColor, fxColor2, fxSpeed },
          transition:{ type, duration }, duration, notes, elements:[el], anims:[{ id, elId, effect, trigger, duration, delay, repeat, dim? }] }
el    = { id, type, x, y, w, h, rotation, opacity, role, mkey, html(텍스트는 HTML), …타입별 속성 }
```
`put` 으로 직접 다룰 때는 id 를 유지하고, 새 요소에는 고유 id 를 부여한다. 대부분은 `patch` 가 더 안전하다.

## 8. 발표 화면 기능 (사용자 안내용)

- **G** (또는 O): 전체 보기 — 모든 슬라이드를 격자로 보고 클릭·방향키+Enter 로 이동, Esc/G 로 닫기. 컨트롤 막대의 ▦ 전체 버튼도 같다.
- 내보낸 HTML 은 주소 끝에 지금 슬라이드 번호가 붙는다(`…/deck.html#18`). 이 주소로 열거나 새로고침하면 그 장부터 시작한다.
- `deck export out.pdf [--notes]`: 헤드리스 Chrome 으로 PDF 를 바로 만든다(인쇄 창 없음, 슬라이드 1장 = 1쪽, 애니메이션은 모두 나타난 상태). `--notes` 면 쪽마다 아래에 발표자 노트.
- `deck styles spec.json --variants v.json [--slides 1,2]`: 같은 내용을 시안 여러 개로 렌더해 한 장에 비교(덱은 바뀌지 않음). v.json = `[{ "name": "무난 — 네이비 골드", "theme": "gold", "palette": {…}, "fx": "dust" }, …]`.
