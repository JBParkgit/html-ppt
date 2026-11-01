// POST /api/vote { device, session, q, option } — 무기명 투표 (기기 id 는 무작위 값)
const store = require('../lib/store');
const questions = require('../lib/questions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { device, session, q, option } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!/^[a-z0-9]{8,40}$/i.test(String(device || ''))) return res.status(400).json({ error: '잘못된 요청' });
    const st = await store.getState();
    if (session !== st.session || q !== st.current) return res.status(409).json({ error: '문항이 바뀌었습니다' });
    if (!st.open) return res.status(409).json({ error: '투표가 마감되었습니다' });
    const n = questions[st.current].options.length;
    if (!Number.isInteger(option) || option < 0 || option >= n) return res.status(400).json({ error: '잘못된 선택' });
    await store.vote(st.session, st.current, device, option);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
