# HTML 프레젠테이션 스튜디오 — 기획서

## 1. 목표
브라우저만으로 동작하는 파워포인트형 프레젠테이션 편집/발표 프로그램.
설치·빌드 없이 `index.html`을 열거나 `start.bat`(로컬 서버)로 실행한다.

## 2. 핵심 기능
| 영역 | 기능 |
|---|---|
| 편집기 | 슬라이드 목록(썸네일, 드래그 정렬, 복제/삭제), WYSIWYG 캔버스(드래그 이동, 8방향 크기조절, 회전, 스냅 가이드, 다중/범위 선택), 더블클릭 인라인 텍스트 편집, 실행취소/다시실행, 복사/붙여넣기, 우클릭 메뉴 |
| 요소 | 텍스트, 도형(사각/둥근/원/삼각/마름모/오각/육각/별/화살표 등, 도형 안 텍스트), 이미지, 동영상(파일), 웹 동영상(YouTube/Vimeo/임의 URL 임베드), 표 |
| 미디어 | 파일 선택·드래그&드롭·클립보드 붙여넣기로 이미지/동영상 삽입, IndexedDB에 저장, 슬라이드 배경 이미지/동영상 |
| 애니메이션 | 나타내기 20종, 강조 10종, 반복 4종, 끝내기 7종 / 트리거(클릭 시·이전과 함께·이전 다음) / 지속·지연·반복 / 순서 변경 / 미리보기 |
| 화면 전환 | 페이드, 밀기, 슬라이드(4방향), 확대/축소, 플립, 큐브, 와이프, 원형, 블러 등 |
| 화면 비율 | 16:9(기본), 4:3, 16:10, 1:1, 9:16(세로), 4:5, A4, 사용자 지정 — 변경 시 요소 위치/크기 자동 재배치 |
| 발표 | 전체화면, 키보드/클릭 진행, 단계별 애니메이션, 발표자 노트, 타이머, 검은/흰 화면, 레이저 포인터, 슬라이드 번호 이동 |
| 발표 중 수정 | 발표(프리뷰) 화면에서 `E` 키로 편집 모드 → 텍스트 바로 수정, 원본에 반영 |
| 동영상 만들기 | 자동 재생(슬라이드별 시간) + 화면 녹화 → WebM 동영상 저장 |
| AI (Claude) | 주제로 전체 프레젠테이션 생성, 현재 슬라이드 AI 편집(자연어 지시), 텍스트 다듬기/요약/확장/번역, 발표자 노트 생성, SVG 일러스트 생성 |
| 테마/레이아웃 | 테마 8종, 레이아웃 8종(제목/섹션/글머리/2단/이미지+텍스트/인용/큰 숫자/빈 화면) |
| 저장/내보내기 | 자동 저장(localStorage+IndexedDB), 프로젝트 파일(.json, 미디어 포함) 저장/열기, 단독 실행 HTML 내보내기, PDF 인쇄 |

## 3. 구조
```
index.html          — 편집기 UI
css/app.css         — 편집기 스타일
js/core.js          — 렌더러 + 애니메이션/전환 정의 + 발표 플레이어 (단독 HTML 내보내기에도 그대로 포함됨)
js/media.js         — IndexedDB 미디어 저장소
js/store.js         — 문서 모델, 실행취소, 자동 저장, 테마/레이아웃/비율
js/editor.js        — 캔버스 상호작용(선택/이동/크기/회전/스냅/인라인 편집)
js/panels.js        — 속성·애니메이션·슬라이드 패널, 슬라이드 목록
js/ai.js            — Claude API 연동 (공식 @anthropic-ai/sdk, 브라우저 모드)
js/io.js            — 파일 저장/열기, HTML/PDF 내보내기
js/app.js           — 초기화, 상단 툴바, 단축키, 모달
```

## 4. 데이터 모델
```js
deck  = { title, aspect, width, height, theme, slides:[slide] }
slide = { id, bg:{type,color,gradient,src}, transition:{type,duration}, duration, notes, elements:[el], anims:[anim] }
el    = { id, type:'text'|'shape'|'image'|'video'|'embed'|'table', x,y,w,h, rotation, opacity, role, ...style }
anim  = { id, elId, effect, trigger:'click'|'with'|'after', duration, delay, repeat }
```
미디어는 `idb:<id>` 로 참조하고 실제 Blob 은 IndexedDB에 저장한다.

## 5. AI 연동
- 설정에서 Anthropic API 키 입력(브라우저 localStorage 에만 저장), 모델 선택(기본 `claude-opus-5-5`).
- 구조화 출력(JSON Schema)으로 슬라이드 구조를 받아 레이아웃·테마로 변환.
- 텍스트 작업은 스트리밍으로 실시간 반영.
- 안전 분류기 거절 시 서버 측 대체 모델(fallbacks: "default") 사용.
