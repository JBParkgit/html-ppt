/* 실시간 연동: server.js 로 실행하면 편집기와 Claude(스킬 CLI)가 같은 덱을 공유한다 */
const Live = (() => {
  const L = { on: false, rev: 0, cmdSeq: 0, id: 'editor-' + Math.random().toString(36).slice(2, 8), lastJson: '', deferred: false };
  let pushT = null, polling = false;

  function indicator(text, ok) {
    const el = document.getElementById('live-state');
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle('ok', !!ok);
  }

  L.init = async function () {
    if (!/^https?:$/.test(location.protocol)) return;
    let st;
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (!r.ok) return;
      st = await r.json();
    } catch (e) { return; }
    L.on = true;
    L.cmdSeq = st.cmdSeq || 0;
    if (st.rev > 0 && st.slides > 0) await L.pull(true);
    else { L.rev = st.rev; L.push(true); }
    const orig = Store.saveNow.bind(Store);
    Store.saveNow = function () { const ok = orig(); L.push(); return ok; };
    setInterval(poll, 1200);
    indicator('🔗 Claude 연동', true);
    setTimeout(() => L.backupMedia(), 1500);
    document.getElementById('live-state').title = '로컬 서버(server.js)와 실시간 연동 중입니다. Claude 스킬이 슬라이드를 바꾸면 자동으로 반영됩니다. (덱 파일: decks/live.hppt.json)';
  };

  L.push = function (now) {
    if (!L.on) return;
    clearTimeout(pushT);
    pushT = setTimeout(async () => {
      const j = JSON.stringify(Store.deck);
      if (j === L.lastJson) return;
      try {
        const r = await fetch('/api/deck', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deck: Store.deck, source: L.id, baseRev: L.rev }) });
        if (r.status === 409) { await L.pull(false, '다른 곳(Claude)에서 바뀐 내용으로 갱신했습니다'); return; }
        if (!r.ok) throw new Error(r.status);
        L.rev = (await r.json()).rev;
        L.lastJson = j;
        L.backupMedia();
        indicator('🔗 Claude 연동', true);
      } catch (e) {
        indicator('⚠ 연동 끊김', false);
      }
    }, now ? 0 : 400);
  };

  // 브라우저(IndexedDB)에만 있는 그림·동영상·3D 모델을 서버(decks/media)에 백업한다
  let backed = null, backing = false;
  L.backupMedia = async function () {
    if (!L.on || backing) return;
    backing = true;
    try {
      if (!backed) backed = new Set(((await (await fetch('/api/media', { cache: 'no-store' })).json()).ids) || []);
      const ids = [...new Set(Store.allMediaSrcs().filter((s) => s.startsWith('idb:')).map((s) => s.slice(4)))].filter((id) => !backed.has(id));
      let n = 0;
      for (const id of ids) {
        const b = await Media.getBlob(id);
        if (!b) continue;
        const r = await fetch('/api/media/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': b.type || 'application/octet-stream' }, body: b });
        if (r.ok) { backed.add(id); n++; }
      }
      if (n) {
        const st = document.getElementById('live-state');
        if (st) st.title = st.title.split(' · 미디어 백업')[0] + ` · 미디어 백업: decks/media (${backed.size}개)`;
      }
    } catch (e) { /* 다음 저장 때 다시 시도 */ }
    backing = false;
  };

  L.pull = async function (initial, msg) {
    try {
      const r = await fetch('/api/deck', { cache: 'no-store' });
      const data = await r.json();
      if (!data.deck) return;
      apply(data.deck, data.rev, data.source, initial, msg);
    } catch (e) { indicator('⚠ 연동 끊김', false); }
  };

  function apply(deck, rev, source, initial, msg) {
    if (Editor.editing || document.querySelector('.modal-bg')) { L.deferred = true; return; }
    L.deferred = false;
    deck.theme = deck.theme || { id: 'classic' };
    (deck.slides || []).forEach((s) => { s.elements = s.elements || []; s.anims = s.anims || []; s.bg = s.bg || { type: 'color', color: '#ffffff' }; s.transition = s.transition || { type: 'none', duration: 700 }; });
    L.rev = rev;
    L.lastJson = JSON.stringify(deck);
    if (document.body.classList.contains('presenting') && App.presenter) {
      Store.deck = deck;
      App.presenter.setDeck(deck);
      UI.toast('🤖 Claude 가 슬라이드를 업데이트했습니다');
      return;
    }
    if (!initial) Store.checkpoint();
    Store.deck = deck;
    Store.cur = Math.max(0, Math.min(Store.cur, deck.slides.length - 1));
    Store.sel = Store.sel.filter((id) => Store.slide().elements.some((e) => e.id === id));
    Panels.invalidateThumbs();
    Media.preload(Store.allMediaSrcs());
    Store.emit({ structure: true });
    document.getElementById('doc-title').value = deck.title || '';
    if (!initial) UI.toast(msg || (String(source).startsWith('claude') ? '🤖 Claude 가 슬라이드를 업데이트했습니다' : '슬라이드가 외부에서 업데이트되었습니다'));
  }

  async function poll() {
    if (polling) return;
    polling = true;
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      const st = await r.json();
      indicator('🔗 Claude 연동', true);
      if ((st.rev !== L.rev && st.source !== L.id) || L.deferred) await L.pull(false);
      if (st.cmdSeq > L.cmdSeq) { L.cmdSeq = st.cmdSeq; exec(st.cmd); }
    } catch (e) {
      indicator('⚠ 연동 끊김', false);
    } finally {
      polling = false;
    }
  }

  function exec(cmd) {
    if (!cmd) return;
    const p = document.body.classList.contains('presenting') ? App.presenter : null;
    const n = Math.max(0, (+cmd.slide || 1) - 1);
    switch (cmd.type) {
      case 'goto': if (p) p.go(Math.min(n, Store.deck.slides.length - 1), 0); else Store.goto(Math.min(n, Store.deck.slides.length - 1)); break;
      case 'present': if (!p) App.present(Math.min(n, Store.deck.slides.length - 1), { noFullscreen: true, autoplay: !!cmd.autoplay }); break;
      case 'stop': if (p) p.exit(); break;
      case 'next': if (p) p.next(); else Store.goto(Store.cur + 1); break;
      case 'prev': if (p) p.prev(); else Store.goto(Store.cur - 1); break;
      case 'select': Store.goto(Math.min(n, Store.deck.slides.length - 1)); if (cmd.el) Store.select([cmd.el]); break;
      case 'toast': UI.toast('🤖 ' + (cmd.text || '')); break;
      default: break;
    }
  }

  return L;
})();

window.addEventListener('DOMContentLoaded', () => setTimeout(() => Live.init(), 50));
