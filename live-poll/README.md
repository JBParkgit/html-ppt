# live-poll — 무기명 실시간 투표

스마트폰으로 투표하고 큰 화면에 결과가 실시간으로 나오는 작은 프로그램입니다.

| 주소 | 용도 |
|---|---|
| `https://live-poll-wheat.vercel.app/` | 참여자 투표 화면 (단톡방 링크 · QR 코드) |
| `https://live-poll-wheat.vercel.app/screen` | 큰 화면용 결과 + QR 코드 (발표 덱 3장에 들어 있음) |
| `https://live-poll-wheat.vercel.app/screen?key=진행자키` | 큰 화면 + 진행 버튼 · 키보드 조작 (→ ← Space Esc) |
| `https://live-poll-wheat.vercel.app/admin` | 휴대폰 진행 리모컨 (진행자 키 입력) |

- 무기명: 이름 · 연락처를 받지 않습니다. 같은 폰에서 두 번 투표하지 않도록 무작위 기기 값만 브라우저에 저장합니다. 결과는 합계만 보입니다.
- 투표 기록은 7일 뒤 자동으로 지워집니다. 다음 모임 전에는 리모컨의 `전체 초기화`를 누릅니다.
- 문항 수정: `lib/questions.js` 를 고친 뒤 `vercel deploy --prod`.
- 저장소: Upstash Redis (환경 변수 `KV_REST_API_URL`, `KV_REST_API_TOKEN`), 키 접두어 `livepoll:`. 진행자 키는 `ADMIN_KEY`.
- 로컬 테스트: `node dev-server.js` → http://localhost:3100 (메모리 저장, 진행자 키 `local`).
