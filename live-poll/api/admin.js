// POST /api/admin { key, action } — 진행자 전용 (goto / next / prev / open / close / reset / end)
const store = require('../lib/store');
const questions = require('../lib/questions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const KEY = process.env.ADMIN_KEY || 'local';
    if (body.key !== KEY) return res.status(401).json({ error: '진행자 키가 올바르지 않습니다' });
    const st = await store.getState();
    const last = questions.length - 1;
    switch (body.action) {
      case 'goto': st.current = Math.max(0, Math.min(last, +body.q || 0)); st.open = true; st.done = false; break;
      case 'next': st.current = Math.min(last, st.current + 1); st.open = true; st.done = false; break;
      case 'prev': st.current = Math.max(0, st.current - 1); st.open = true; st.done = false; break;
      case 'open': if (st.current < 0) st.current = 0; st.open = true; st.done = false; break;
      case 'close': st.open = false; break;
      // 대기 화면: done 이면 참여자 폰에 '투표가 끝났습니다' 표시
      case 'end': st.done = st.current === last || !!body.done; st.current = -1; st.open = false; break;
      // 새 세션: 모든 문항의 표를 비우고 처음(대기 화면)으로
      case 'reset': st.session = 's' + Date.now().toString(36); st.current = -1; st.open = false; st.done = false; break;
      default: return res.status(400).json({ error: '알 수 없는 동작' });
    }
    await store.setState(st);
    res.status(200).json({ ok: true, state: st, persistent: store.persistent });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
