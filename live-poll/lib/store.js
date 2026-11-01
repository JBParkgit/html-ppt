// 저장소: Upstash Redis(REST) — 환경 변수가 없으면 메모리(로컬 테스트용)
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const PREFIX = process.env.POLL_PREFIX || 'livepoll';
const TTL = 60 * 60 * 24 * 7; // 투표 기록은 7일 뒤 자동 삭제

async function redis(commands) {
  const r = await fetch(URL_.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map((x) => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}

// 로컬 테스트용 메모리 저장소 (서버가 다시 시작되면 사라짐)
const mem = global.__livepollMem || (global.__livepollMem = { kv: {}, hash: {} });

const DEFAULT_STATE = { session: 's1', current: -1, open: false };
const stateKey = `${PREFIX}:state`;
const votesKey = (session, q) => `${PREFIX}:${session}:q${q}`;

module.exports = {
  persistent: !!(URL_ && TOKEN),

  async getState() {
    if (!this.persistent) return { ...DEFAULT_STATE, ...(mem.kv[stateKey] || {}) };
    const [raw] = await redis([['GET', stateKey]]);
    return { ...DEFAULT_STATE, ...(raw ? JSON.parse(raw) : {}) };
  },

  async setState(st) {
    if (!this.persistent) { mem.kv[stateKey] = st; return; }
    await redis([['SET', stateKey, JSON.stringify(st), 'EX', TTL]]);
  },

  // 기기마다 한 표 — 다시 누르면 선택을 바꾼다 (기기 id 는 무작위, 이름과 무관)
  async vote(session, q, device, option) {
    const k = votesKey(session, q);
    if (!this.persistent) { (mem.hash[k] = mem.hash[k] || {})[device] = String(option); return; }
    await redis([['HSET', k, device, String(option)], ['EXPIRE', k, TTL]]);
  },

  async counts(session, q, n) {
    const k = votesKey(session, q);
    const vals = this.persistent ? (await redis([['HVALS', k]]))[0] || [] : Object.values(mem.hash[k] || {});
    const c = Array(n).fill(0);
    vals.forEach((v) => { const i = +v; if (i >= 0 && i < n) c[i]++; });
    return c;
  },

  async myVote(session, q, device) {
    const k = votesKey(session, q);
    if (!this.persistent) { const v = (mem.hash[k] || {})[device]; return v == null ? null : +v; }
    const [v] = await redis([['HGET', k, device]]);
    return v == null ? null : +v;
  },
};
