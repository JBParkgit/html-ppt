// GET /api/state[?results=1][&device=id] — 현재 문항 (+ 결과, + 내 선택)
const store = require('../lib/store');
const questions = require('../lib/questions');

module.exports = async (req, res) => {
  try {
    const st = await store.getState();
    const q = st.current >= 0 ? questions[st.current] : null;
    const out = { session: st.session, current: st.current, open: st.open, done: !!st.done, total: questions.length, question: q };
    const url = new URL(req.url, 'http://x');
    if (q && url.searchParams.get('results')) {
      out.counts = await store.counts(st.session, st.current, q.options.length);
    }
    const device = url.searchParams.get('device');
    if (q && device) out.mine = await store.myVote(st.session, st.current, device);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
