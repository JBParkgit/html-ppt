---
name: slide-studio
description: Create, design, and live-control slide decks in the local "HTML 프레젠테이션 스튜디오" app (this repo). Use whenever the user asks to make or edit 슬라이드/프레젠테이션/발표자료/덱/피치덱/카드뉴스/강의자료 with this app, apply a design format, color palette, theme or layout, add charts, count-up numbers, quizzes, buttons, morph transitions, animations or animated backgrounds, or to present, navigate, render previews, or export the deck to HTML. Builds decks from a JSON spec with the app's own layout engine and pushes changes to the open editor in real time.
---

# Slide Studio — Claude 가 HTML 프레젠테이션 스튜디오를 제어하는 스킬

이 스킬은 저장소의 편집기(`index.html`)와 **같은 레이아웃 엔진**(`js/core.js`, `js/store.js`)을 CLI 로 불러와
덱을 만들고 고친다. 로컬 서버(`server.js`)가 켜져 있으면 열린 편집기 화면에 **실시간으로 반영**되고,
발표 시작/이동/종료도 원격으로 할 수 있다.

CLI: `node .claude/skills/slide-studio/scripts/deck.mjs <command>` (이하 `deck`)

## 작업 순서

1. **서버 확인/실행** — `deck status`. 꺼져 있으면 `deck start --open` (서버를 백그라운드로 띄우고 편집기를 브라우저로 연다).
   서버가 없어도 `decks/live.hppt.json` 파일 모드로 동작하지만, 그러면 편집기에 바로 보이지 않는다.
2. **기존 덱 파악** — 수정 요청이면 먼저 `deck show` (전체 요약) → `deck show <n>` (요소 id·좌표·애니메이션)으로 읽는다.
   사용자가 편집기에서 직접 고친 내용이 있을 수 있으니 **매번 새로 읽고** 부분 수정(`patch`)을 쓴다. 통째로 다시 `build` 하면 사용자의 수정이 사라진다.
3. **기획** — 목적·청중·분량을 정하고 [reference/design.md](reference/design.md) 에서 **디자인 포맷**(피치덱, 보고서, 강의, 카드뉴스 …),
   **팔레트**, **글꼴 조합**, 화면 비율을 고른다. 슬라이드마다 레이아웃을 정한다(같은 레이아웃 3연속 금지, 수치는 stats/chart/big-number).
   design.md 6장 **'AI 티' 금지 규칙**을 지킨다.
   - **스타일 시안 (새 덱일 때)**: 사용자가 스타일을 정해 주지 않았으면, spec 을 쓴 뒤 시안 3개 — **A 무난**(포맷 추천 팔레트) · **B 과감**(대비 강한 색·임팩트 글꼴) · **C 의외**(주제에서 떠올린 색다른 조합) — 를 variants.json 으로 만들고
     `deck styles spec.json --variants variants.json --slides 1,<대표 본문 번호>` 로 한 장에 렌더해 보여 준 뒤 고르게 한다(AskUserQuestion). 말로 묻지 말고 이미지로 보여 준다. 사용자가 스타일을 지정했거나 "알아서" 라고 하면 건너뛴다.
4. **사양 작성 → 생성** — 스크래치 파일에 spec JSON 을 쓰고 `deck build spec.json` (새 덱) 또는 `deck build spec.json --append [--at n]`.
   전체 형식은 [reference/spec.md](reference/spec.md). 예시는 `examples/` 폴더.
5. **눈으로 검토** — `deck render all` → 출력된 PNG 를 Read 로 열어 본다. 글자 넘침, 겹침, 대비, 빈 공간을 확인하고
   `deck render <n>` 으로 자세히 본 뒤 `deck patch ops.json` 으로 고친다. 검토 없이 끝내지 않는다.
6. **보여 주기/전달** — `deck goto <n>`, `deck present [n] [--auto]`, `deck stop`, `deck export <out.html>`, PDF 는 `deck export <out.pdf> [--notes]`(인쇄 창 없이 바로, --notes 면 발표자 노트 포함).

## 명령 요약

| 명령 | 설명 |
|---|---|
| `start [--open]` | 서버 실행 (+ 편집기 열기) |
| `status` / `show [n]` / `get [--out f]` | 상태, 요약/상세, 전체 JSON |
| `catalog [themes\|layouts\|anims\|transitions\|fx\|shapes\|actions\|charts\|fonts\|aspects\|hovers]` | 사용 가능한 값 목록 (확실하지 않으면 먼저 확인) |
| `build <spec.json> [--append] [--at n]` | 사양으로 덱 생성/추가 |
| `patch <ops.json\|->` | 부분 수정 (요소/슬라이드/테마/비율/애니메이션) |
| `put <deck.json>` | 덱 JSON 통째로 교체 (고급) |
| `render [n\|all] [--out f.png] [--width px]` | PNG 미리보기 (헤드리스 Chrome/Edge) |
| `export [out.html]` | 단독 실행 HTML (주소 끝 `#n` = 그 슬라이드부터) |
| `export <out.pdf> [--notes]` | PDF 바로 만들기 (1장 = 1쪽, 노트 포함 선택) |
| `styles <spec.json> --variants v.json [--slides 1,2]` | 스타일 시안 비교 이미지 (덱은 그대로) |
| `goto n` · `next` · `prev` · `present [n] [--auto]` · `stop` · `toast "msg"` | 편집기/발표 원격 제어 |

발표자 보기(현재·다음 슬라이드, 노트, 타이머가 있는 별도 창)는 브라우저 팝업이라 사람이 열어야 한다: 발표 중 **P** 키 또는 발표 메뉴 ▸ "발표자 보기와 함께 발표". 원격 `present` 명령으로는 열리지 않는다고 사용자에게 안내한다.

`build`/`patch` 후에는 편집기가 바뀐 슬라이드로 자동 이동한다(`--no-goto` 로 끔).

**별도 파일로 작업**: 사용자가 "기존 덱 말고 새로/따로" 만들어 달라고 하면 모든 명령에 `--file "decks/<YYYY-MM-DD>_<덱 제목>/<이름>.hppt.json"` 을 붙인다.
decks 폴더는 **덱마다 `생성날짜_제목` 하위 폴더**로 정리한다(예: `decks/2026-10-29_창세기 2장 — 본문과 질문으로 읽기/`). 덱 JSON·내보낸 HTML·그 덱의 백업을 같은 폴더에 둔다.
제목에 Windows 금지 문자(`\ / : * ? " < > |`)가 있으면 빼거나 바꾼다. `decks/live.hppt.json`(실시간 덱)과 `decks/media/`(미디어 백업)는 서버가 쓰므로 decks 바로 아래에 그대로 둔다.
실시간 덱과 편집기는 건드리지 않으며, 결과는 편집기의 **파일 ▸ 열기**로 열 수 있다. 전달할 때는 `export "decks/<날짜_제목>/<이름>.html" --file …` 도 함께 만든다.
실시간 덱을 다른 덱으로 바꾸기 전에는 `get --out` 으로 백업을 남기되, 그 덱의 폴더에 `live-backup-<YYYYMMDD>.hppt.json` 으로 저장한다.

## 핵심 개념 (자세한 내용은 reference/spec.md)

- **레이아웃 슬라이드**: `{"layout":"stats","title":"…","bullets":["98%: 만족도", …]}` — 엔진이 테마에 맞춰 배치·애니메이션까지 만든다.
  레이아웃: title, section(+변형 section-center·section-band·section-right·section-number·section-frame), bullets, **긴 글용 text·text-2col·text-points·scripture·list-2col(글자 크기 자동 · 넘치면 자동 분할)**, two-column, image-text, quote, big-number, agenda, cards, timeline, stats, chart, quiz, image-full, closing, blank.
- **직접 배치**: `"layout":"blank"` + `"elements":[…]` (좌표는 px 또는 `"10%"`). 레이아웃 위에 `elements` 를 덧붙이거나 `override`/`hide` 로 일부만 바꿀 수도 있다.
- **텍스트 서식**: `text` 필드에 줄바꿈 `\n`, 글머리 `- `, `**굵게**`, `*기울임*`, `==형광펜==`, `{#ff6b6b|색 글자}`.
- **팔레트**: `"theme":"midnight"` + `"palette":{ "accent":"#…", … }` 로 기본 테마 색을 덮어쓴다 (design.md 의 팔레트를 그대로 복사해 쓰면 된다).
- **동적 기능**: 차트(`chart`, 12종 — 막대·누적·100%누적·혼합·선·영역·원형·도넛·방사형·게이지·깔때기, 그려지며 등장, 목표선·강조·단위), 숫자 카운트업(`count-up` 효과), 버튼·퀴즈(`action`), 모핑(`"morph": true` 또는 `slide.duplicate` + `changes`),
  **Magic Move**(같은 key 의 code/텍스트 내용이 바뀌면 단어 단위로 이어서 움직임 — `examples/magic-move.json`), **차트 값 모핑**(같은 key 차트의 data 만 바꾸고 yMax 고정),
  움직이는 배경(`fx` 26종: glow·bokeh·dust·stars(예배 — 'rays' 빛줄기는 욱일기를 연상시켜 삭제됨. 한 점에서 퍼지는 방사형 빛살·선버스트는 fx 로도 도형으로도 만들지 않는다), petals·leaves·rain·clouds·fireflies(자연), heartbeat·dna·hex·ripple(의료), lines·dotwave·matrix(비즈니스), confetti·fireworks(축하) 외 — `deck catalog fx`).
- **배경음악**: spec 의 `"music": [{ "track": "05", "slides": "1-6" }]` — 내장 10곡(`deck catalog music`: 잔잔한 피아노, 고요한 묵상, Amazing Grace, 맑은 케어, 비즈니스 업비트, 로파이 등) 또는 파일. 슬라이드마다 다른 곡/무음 지정 가능. 용도에 맞게 고른다(병원=01·06·10, 교회=04·05·08, 발표=01·03·07).
- **3D 모델**: `{"type":"model","src":"model.glb"}` — glTF/GLB, 자동 회전 · 발표 중 마우스로 돌리기 · 시점/밝기 조절. 같은 모델(같은 src)을 둔 슬라이드를 `morph` 로 이으면 모델을 다시 불러오지 않고 위치·크기와 함께 **시점(orbit)도 이어서 돈다**(카메라 워크 연출). 표시 라이브러리는 앱에 들어 있고(vendor/model-viewer.min.js) 내보낸 HTML 에도 포함되어 인터넷 없이 동작한다. 웹 주소 모델만 인터넷이 필요하다. `render` 는 3D 를 그리느라 조금 더 걸린다.
- **이미지/동영상**: `src` 에 로컬 파일 경로를 주면 `assets/` 로 복사되어 편집기·내보내기에 쓰인다. URL 도 가능. 사용자가 편집기에서 넣은 미디어는 `idb:` 로 표시되며 그대로 두어야 한다. 서버가 켜져 있으면 편집기가 이 미디어를 `decks/media/<id>.<확장자>` 로 자동 백업하므로 `render`·`export` 에도 나온다(다른 브라우저에서 열면 여기서 복원).
- **단계 설명**: 슬라이드에 `"dimPrev": true` 면 클릭으로 나온 항목이 다음 클릭 때 흐려져 지금 말하는 항목만 밝다(개별 애니메이션은 `"dim": true`). 요점 나열·①②③ 해설·성경 구절 풀이에 쓴다.
- **펜 선**: `{"type":"path","points":[[200,800],[600,450],[960,700]],"smooth":true,"stroke":"#d4a24c","strokeWidth":10,"arrowEnd":true,"anim":{"effect":"draw-line","duration":2000}}` — 흐름선·화살표·강조 밑줄·자유 도형(closed+fill). draw-line 이면 발표 때 선이 그려지며 나타난다. 사용자는 편집기에서 더블클릭해 점을 고칠 수 있다.
- **배경 동영상**: `"bg": { "type": "video", "src": "loop.mp4", "overlay": 0.4, "speed": 0.5, "blur": 6 }` — 슬로모션·흐림·구간 반복(start/end)·소리(sound). 같은 영상을 연속 슬라이드에 두면 끊기지 않고 이어서 재생된다.
- **발표 기능**: 전체 보기(G — 모든 슬라이드 격자, 골라서 이동), 돋보기(Z), 반복 재생(덱의 `"loop": { "range": "1-5", "seconds": 8 }` — 편집기 발표 메뉴 ▸ 🔁 반복 재생, 내보낸 HTML 은 시작 화면 버튼 또는 주소 끝 `#loop`), 서브 모니터를 꽂거나 빼면 실시간으로 감지해 발표 화면을 서브 모니터로 옮긴다.

## 품질 기준

- 1920×1080 기준 글자 크기: 제목 56–104, 본문 30–44, 캡션 ≥ 24. 한 슬라이드 = 한 메시지, 글머리 ≤ 6개, 항목 ≤ 40자. 자세한 설명은 `notes`(발표자 노트)에.
- 배경과 글자 대비를 지킨다(밝은 accent 위 글자는 어둡게). 강조색은 한 슬라이드에 한두 곳만.
- 전환은 1~2종으로 통일하고 특별한 장면에만 morph/cube 등. `fx` 는 전체의 30% 이하(표지·섹션·마무리).
- 애니메이션: 자동 진행은 `after`, 발표자가 클릭으로 풀어갈 내용은 `click`. 과하지 않게.
- 수치·통계는 지어내지 말고, 예시 값이면 캡션/노트에 "예시"라고 밝힌다.
- 끝나면 사용자에게: 만든 장수와 구성, 적용한 디자인 포맷/팔레트, 편집기 주소(`http://localhost:8080`), 검토에서 고친 점을 알린다.

## 문제 해결

- `서버: 꺼짐` → `deck start --open`. 포트를 바꾸려면 서버를 `node server.js 8090` 으로 띄우고 `HPPT_URL=http://localhost:8090` 을 설정.
- `conflict` → 편집기와 동시에 저장됨. CLI 가 자동 재시도하며, 계속되면 `deck show` 로 다시 읽고 재실행.
- 렌더 실패 → Chrome/Edge 경로를 `CHROME_PATH` 로 지정.
- 알 수 없는 레이아웃/효과 경고 → `deck catalog <종류>` 로 정확한 키 확인.
