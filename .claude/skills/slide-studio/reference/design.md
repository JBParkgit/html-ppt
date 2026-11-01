# 디자인 가이드 — 포맷 · 팔레트 · 글꼴 · 구성 레시피

## 1. 디자인 포맷 (목적별 구성 레시피)

| 포맷 | 비율 | 분량 | 구성 순서 (layout) | 추천 팔레트 | 전환/효과 |
|---|---|---|---|---|---|
| **투자 피치덱** | 16:9 | 10–12 | title → big-number(문제 규모) → two-column(문제/해결) → image-text(제품) → stats(시장) → cards(비즈니스 모델) → chart(성장/재무) → timeline(로드맵) → cards(팀) → big-number(투자 요청) → closing | 네이비 골드, 로열 퍼플, 클린 블루 | fade + push-left, 표지·마무리 fx aurora |
| **경영/업무 보고** | 16:9 · A4 | 6–12 | title → big-number(결론 먼저) → agenda → stats → chart → two-column(이슈/대응) → timeline(일정) → bullets(요청 사항) → closing | 클린 블루, 미니멀 모노, 메디컬 클린 | fade 통일, fx 없음 |
| **강의/교육** | 16:9 | 12–25 | title → agenda → section → bullets/image-text … → quiz(파트마다 1개) → bullets(요약) → closing | 포레스트, 파스텔 드림, 코랄 틸 | cover-left, 섹션 zoom-in, quiz 배경 fx bubbles |
| **제품 소개/런칭** | 16:9 | 8–12 | image-full(임팩트) → quote(문제 공감) → cards(핵심 기능) → big-number → image-text(시연) → stats → quote(고객 후기) → closing(+버튼) | 네온 사이버, 선셋, 로열 퍼플 | morph 로 제품 확대, fx particles |
| **키노트/세미나** | 16:9 | 15–30 | 큰 글씨 한 문장 위주: image-full, quote, big-number, section 반복 | 블랙 화이트, 에디토리얼 레드, 다크 그래파이트 | fade-black, blur, fx stars |
| **SNS 카드뉴스** | 4:5 · 1:1 · 9:16 | 6–10 | 표지(title, 큰 훅 문장) → bullets/stats/big-number 한 장 한 메시지 → closing(CTA: 저장·공유) | 비비드 팝, 체리 블라썸, 선셋 | push-left 통일, 숫자 count-up |
| **쇼츠/릴스 영상** (자동재생 녹화) | 9:16 | 5–8 | title → big-number → stats → quote → closing, 슬라이드 `duration` 3–4초 | 네온 사이버, 비비드 팝 | zoom-in/push-up, fx 적극, 모든 애니 `after` |
| **포트폴리오** | 16:9 | 8–15 | image-full → image-text 반복 → stats(성과) → quote(추천사) → closing | 에디토리얼 레드, 미니멀 모노, 테라코타 | fade, morph 로 이미지 확대 |
| **워크숍/인터랙티브** | 16:9 | 자유 | agenda(버튼으로 각 파트 goto) → quiz → startHidden + toggle 버튼으로 정답/힌트 공개 | 파스텔 드림, 코랄 틸 | hover grow 버튼 |
| **회고/히스토리** | 16:9 | 6–10 | title → timeline → (morph 로 각 시점 확대) → stats → closing | 사막 샌드, 테라코타 | morph 시퀀스 |

## 2. 팔레트 (spec 의 `"theme"` + `"palette"` 에 그대로 복사)

| 이름 | theme | palette |
|---|---|---|
| 네이비 골드 (임원/투자) | `gold` | `{"bg":"#0f1b2d","title":"#f8f1e5","text":"#c9d1dc","accent":"#d4a24c","accent2":"#5b8def"}` |
| 클린 블루 (기업) | `corporate` | `{"bg":"#ffffff","title":"#0b2545","text":"#475569","accent":"#2563eb","accent2":"#f59e0b"}` |
| 미니멀 모노 | `mono` | `{"bg":"#fafafa","title":"#111111","text":"#555555","accent":"#111111","accent2":"#e11d48"}` |
| 테라코타 (라이프스타일) | `warm` | `{"bg":"#f6efe7","title":"#4a2c2a","text":"#6d4c41","accent":"#c8553d","accent2":"#588b8b"}` |
| 포레스트 (ESG/교육) | `forest` | `{"bg":"#f1f5ef","title":"#1b4332","text":"#40513b","accent":"#2d6a4f","accent2":"#e9a03b"}` |
| 오션 브리즈 | `ocean` | `{"bg":"linear-gradient(160deg,#e0f7fa 0%,#e3f2fd 100%)","title":"#01579b","text":"#37474f","accent":"#0288d1","accent2":"#26a69a"}` |
| 선셋 (마케팅) | `sunset` | `{"bg":"linear-gradient(135deg,#ff7e5f 0%,#feb47b 100%)","title":"#ffffff","text":"#fff4ec","accent":"#2b2d42","accent2":"#ffd166"}` |
| 네온 사이버 (테크) | `neon` | `{"bg":"#0b0b12","title":"#ffffff","text":"#a0a0c0","accent":"#00f5d4","accent2":"#f15bb5"}` |
| 파스텔 드림 (어린이/교육) | `pastel` | `{"bg":"#fff7fb","title":"#6a4c93","text":"#5c5470","accent":"#ff7eb6","accent2":"#7fb3ff"}` |
| 비비드 팝 (SNS) | `classic` | `{"bg":"#ffde59","title":"#111111","text":"#222222","accent":"#ff3131","accent2":"#004aad","fontTitle":"'Black Han Sans', sans-serif"}` |
| 다크 그래파이트 (개발자) | `tech` | `{"bg":"#1e1e2e","title":"#cdd6f4","text":"#a6adc8","accent":"#89b4fa","accent2":"#f38ba8","fontTitle":"'Roboto Mono', monospace"}` |
| 로열 퍼플 (프리미엄) | `startup` | `{"bg":"linear-gradient(135deg,#2e1065 0%,#581c87 100%)","title":"#ffffff","text":"#e9d5ff","accent":"#f0abfc","accent2":"#fbbf24"}` |
| 체리 블라썸 | `pastel` | `{"bg":"#fff1f2","title":"#881337","text":"#6b4f57","accent":"#e11d48","accent2":"#fb7185"}` |
| 사막 샌드 (여행/역사) | `warm` | `{"bg":"#f4e9d8","title":"#5c4033","text":"#7a6a58","accent":"#d97706","accent2":"#0e7490"}` |
| 메디컬 클린 (의료/헬스) | `corporate` | `{"bg":"#f8fbff","title":"#0c4a6e","text":"#475569","accent":"#0ea5e9","accent2":"#10b981"}` |
| 에디토리얼 레드 (매거진) | `editorial` | `{"bg":"#ffffff","title":"#111111","text":"#3f3f46","accent":"#dc2626","accent2":"#1e3a8a"}` |
| 코랄 틸 | `mint` | `{"bg":"#fffaf5","title":"#134e4a","text":"#475569","accent":"#f97316","accent2":"#14b8a6"}` |
| 블랙 화이트 하이콘트라스트 | `mono` | `{"bg":"#000000","title":"#ffffff","text":"#d4d4d4","accent":"#facc15","accent2":"#ffffff"}` |

기본 테마 15종(키): classic, midnight, sunset, forest, neon, pastel, mono, corporate, startup, warm, editorial, mint, gold, tech, ocean — `deck catalog themes` 로 색을 확인.

팔레트 규칙: 배경·제목·본문은 명도 차이를 크게, `accent` 는 버튼·숫자·강조선, `accent2` 는 두 번째 계열·하이라이트. 밝은 accent(노랑·민트·네온) 위 버튼 글자는 엔진이 자동으로 어둡게 바꾼다.

## 3. 글꼴 조합 (`fontTitle` / `fontBody`)

| 분위기 | 제목 | 본문 |
|---|---|---|
| 기본·신뢰 | `'Noto Sans KR', sans-serif` | `'Noto Sans KR', sans-serif` |
| 고급·클래식 | `'Playfair Display', 'Nanum Myeongjo', serif` | `'Noto Sans KR', sans-serif` |
| 따뜻함·감성 | `'Nanum Myeongjo', serif` | `'Gowun Dodum', sans-serif` |
| 강렬·임팩트 | `'Black Han Sans', sans-serif` | `'Noto Sans KR', sans-serif` |
| 친근·발랄 | `'Jua', sans-serif` 또는 `'Do Hyeon', sans-serif` | `'Gowun Dodum', sans-serif` |
| 테크·모던 | `'Montserrat', 'Noto Sans KR', sans-serif` | `'Noto Sans KR', sans-serif` |
| 손글씨 포인트 | `'Nanum Pen Script', cursive` (짧은 문구만) | 기본 |
| 코드·데이터 | `'Roboto Mono', monospace` | 기본 |

## 4. 타이포그래피·배치 규칙 (1920×1080 기준, 다른 비율은 짧은 변 기준으로 비례)

- 크기: 표지 제목 96–110 · 슬라이드 제목 56–68 · 본문 32–44 · 캡션 24–30 · 큰 숫자 200–300. 24px 미만 금지.
- 여백: 좌우 7%(≈134px), 상하 8%(≈86px). 요소끼리 최소 30px 간격. 슬라이드 밖으로 나가지 않게.
- 텍스트 상자 높이 = 줄 수 × fontSize × lineHeight + padding×2 이상. 넘치면 글자를 줄이거나 내용을 나눈다.
- 한 슬라이드 = 한 메시지. 글머리 ≤ 6개, 항목 ≤ 40자, 문장은 짧게. 설명은 `notes`.
- 세로(9:16)·정사각(1:1) 카드뉴스: 제목 80–110, 본문 44–56, 한 장에 핵심 1–3줄, 아래 20%는 비워 두기(SNS UI 가림).
- 시선 흐름: 왼쪽 위 → 오른쪽 아래. 핵심 숫자/결론은 가장 크게 + accent 색.

## 5. 동적 기능 사용 레시피

- **결론 숫자**: `big-number` 또는 `stats` (count-up 자동). 직접 만들 땐 text 요소 + `"anim":{"effect":"count-up","duration":1600}`.
- **데이터**: `chart` 레이아웃. 추세=line/area, 비교=bar/hbar, 구성비=pie/donut(`centerText`), 누적=stacked. 계열 ≤ 4, 항목 ≤ 12.
- **모핑 스토리텔링**: 같은 레이아웃을 두 번 쓰고 두 번째에 `"morph": true` + `override` 로 위치·크기·색 변경 (예: 타임라인의 한 시점 확대, 제목이 작아지며 위로 이동, 제품 이미지 확대).
  또는 `patch` 의 `slide.duplicate` + `"morph": true` + `changes`.
- **퀴즈**: `quiz` 레이아웃 (정답 클릭 시 축하 효과 + 해설 등장). 배경 `fx: "bubbles"` 추천.
- **분기형 발표**: agenda 위에 버튼(`action: goto`)을 올려 원하는 파트로 이동, 각 파트 끝에 "목차로" 버튼.
- **펼쳐 보기**: 힌트/정답 상자에 `"startHidden": true, "key": "hint"`, 버튼에 `"action": {"type":"toggle","target":"key:hint"}`.
- **움직이는 배경**: 표지·섹션·마무리에만. 어두운 배경 + 밝은 fx 색 (particles/stars/grid), 밝은 배경 + 진한 fx 색 (bubbles/shapes/waves), 그라데이션 배경엔 flow/aurora.
- **전환 조합**: 기본 1종(fade 또는 push-left) + 섹션 시작 zoom-in + 마지막 circle. cube/flip 은 한두 번만.

## 6. 'AI 티' 나는 디자인 금지 규칙

AI 가 만든 슬라이드는 비슷한 버릇이 있다. 아래에 걸리면 고친다. 기준 질문: **"제목만 바꾸면 전혀 다른 주제에도 그대로 쓸 수 있는가?"** — 그렇다면 그 덱만의 디자인이 아니다.

| 하지 말 것 | 대신 |
|---|---|
| 내용과 무관한 보라→파랑 그라데이션 + 흰 글자 (막연한 "테크 느낌") | 주제에서 색을 고른다: 예배·성경 = 깊은 남색/골드·따뜻한 크림, 병원 = 맑은 흰 바탕 + 청록, 보고 = 흰 바탕 + 한 가지 강조색 |
| 모든 슬라이드가 "아이콘 + 제목 + 두 줄 설명" 카드 3단 | 카드는 덱 전체에서 1–2번. 나머지는 큰 숫자·인용·사진·표·한 문장 |
| 카드·제목마다 이모지 (🚀✨💡🎯) | 이모지는 한 레이아웃(예: cards)에서만, 교회·의료·보고 자료에서는 쓰지 않는 것이 기본 |
| 의미 없는 장식: 모서리 원·반투명 얼룩·글로우·두꺼운 그림자·그라데이션 글자 | 장식은 강조선·번호·여백으로. 그림자는 사진 위 글자 가독성용으로만 |
| 모든 요소 가운데 정렬, 좌우 대칭만 | 왼쪽 정렬 기본, 비대칭 배치(큰 숫자 왼쪽 + 설명 오른쪽 등)로 시선 흐름을 만든다 |
| "혁신", "새로운 시대", "미래를 여는" 같은 일반 문구 제목 | 구체적 명사·숫자·질문으로 된 제목 ("수술 후 3일, 통증이 가장 심한 이유") |
| 강조색을 한 슬라이드 여러 곳에 | 강조는 한 슬라이드 한두 곳 |
| 매 슬라이드 다른 전환, 모든 요소에 애니메이션 | 전환 1–2종 통일, 애니메이션은 발표 흐름에 필요한 곳만 (단계 설명은 `dimPrev`) |
| 지어낸 통계·가짜 로고·가짜 후기·출처 없는 숫자 | 실제 자료만, 예시면 "예시"라고 표기 |
| 작은 회색 캡션 남발 (24px 미만) | 설명은 발표자 노트로 |
| 한 점에서 퍼지는 빛살·선버스트(욱일기 연상) | 사용 금지 — glow·dust·bokeh·stars 로 대신 |

새 덱은 처음에 **스타일 시안 3개**(무난 · 과감 · 의외)를 `deck styles` 로 보여 주고 고르게 하면 이런 '기본값 디자인'을 피하기 쉽다 (SKILL.md 작업 순서 3).

## 7. 검토 체크리스트 (render 후)

1. 글자가 상자를 넘거나 다른 요소와 겹치지 않는가
2. 배경 대비가 충분한가 (특히 이미지·그라데이션 위 글자 → overlay 나 textShadow)
3. 슬라이드마다 레이아웃이 단조롭지 않은가, 정렬선이 맞는가
4. 숫자/차트 단위·출처 표기, 오탈자
5. 발표자 노트가 채워졌는가 (요청 시)
6. 6장의 'AI 티' 규칙에 걸리는 슬라이드가 없는가
