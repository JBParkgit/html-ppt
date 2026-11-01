/* 파일 저장/열기, 단독 HTML 내보내기, PDF 인쇄 */
const IO = (() => {
  const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700&family=Gowun+Dodum&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Nanum+Pen+Script&family=Montserrat:wght@400;700;900&family=Playfair+Display:wght@400;700&family=Roboto+Mono&display=swap';

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function safeName(s) { return (String(s || 'presentation').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'presentation').slice(0, 80); }

  // idb: 참조를 data URL 로 바꾼 사본
  async function inlineDeck(deck) {
    const d = JSON.parse(JSON.stringify(deck));
    const cache = new Map();
    const conv = async (src) => {
      if (!src || !src.startsWith('idb:')) return src;
      if (!cache.has(src)) cache.set(src, await Media.toDataURL(src));
      return cache.get(src);
    };
    for (const s of d.slides) {
      if (s.bg && s.bg.src) s.bg.src = await conv(s.bg.src);
      for (const e of s.elements) if (e.src) e.src = await conv(e.src);
    }
    // 배경음악: 내장 곡(music/…)은 파일을 읽어 HTML 안에 포함
    let musicMissing = 0;
    for (const t of ((d.bgm && d.bgm.tracks) || [])) {
      if (!t.src) continue;
      if (t.src.startsWith('idb:')) t.src = await conv(t.src);
      else if (/^music\//.test(t.src)) {
        try { t.src = await Media.blobToDataURL(await (await fetch(t.src)).blob()); } catch (e) { musicMissing++; }
      }
    }
    if (musicMissing) UI.toast('내장 배경음악을 HTML 에 넣지 못했습니다 — start.bat(로컬 서버)로 실행한 뒤 다시 내보내세요', 'warn');
    return d;
  }

  async function saveProject() {
    UI.toast('저장 파일을 만드는 중…');
    const deck = Store.deck;
    const media = {};
    for (const src of new Set(Store.allMediaSrcs())) {
      if (src.startsWith('idb:')) media[src] = await Media.toDataURL(src);
    }
    const data = { format: 'html-presentation-studio', version: 1, savedAt: new Date().toISOString(), deck, media };
    download(safeName(deck.title) + '.hppt.json', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    UI.toast('프로젝트 파일을 저장했습니다');
  }

  async function openProject(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { UI.toast('파일을 읽을 수 없습니다', 'error'); return; }
    const deck = data.deck || data;
    if (!deck || !Array.isArray(deck.slides)) { UI.toast('올바른 프레젠테이션 파일이 아닙니다', 'error'); return; }
    const map = new Map();
    const media = data.media || {};
    for (const [old, url] of Object.entries(media)) { if (url) map.set(old, await Media.fromDataURL(url)); }
    // data URL 로 직접 들어있는 미디어도 IndexedDB 로 옮김
    const fix = async (src) => {
      if (!src) return src;
      if (map.has(src)) return map.get(src);
      if (src.startsWith('data:') && src.length > 2000) { const n = await Media.fromDataURL(src); map.set(src, n); return n; }
      return src;
    };
    for (const t of ((deck.bgm && deck.bgm.tracks) || [])) if (t.src) t.src = await fix(t.src);
    for (const s of deck.slides) {
      s.elements = s.elements || [];
      s.anims = s.anims || [];
      if (s.bg && s.bg.src) s.bg.src = await fix(s.bg.src);
      for (const e of s.elements) if (e.src) e.src = await fix(e.src);
    }
    deck.theme = deck.theme || { id: 'classic' };
    Panels.invalidateThumbs();
    Store.setDeck(deck);
    document.getElementById('doc-title').value = deck.title || '';
    UI.toast('“' + (deck.title || file.name) + '” 을(를) 열었습니다');
  }

  async function exportHTML() {
    UI.toast('HTML 파일을 만드는 중…');
    const deck = await inlineDeck(Store.deck);
    const BS = String.fromCharCode(92);
    const json = JSON.stringify(deck).replace(/</g, BS + 'u003c').split(String.fromCharCode(0x2028)).join(BS + 'u2028').split(String.fromCharCode(0x2029)).join(BS + 'u2029');
    // 3D 모델이 있으면 표시 라이브러리를 HTML 안에 넣어 인터넷 없이도 보이게 한다
    let mvScript = '';
    if (deck.slides.some((s) => s.elements.some((e) => e.type === 'model'))) {
      try {
        const r = await fetch('vendor/model-viewer.min.js');
        if (!r.ok) throw new Error(r.status);
        mvScript = `<script type="module" data-hp-mv="1">${(await r.text()).replace(/<\/script/gi, '<' + BS + '/script')}</script>\n`;
      } catch (e) { UI.toast('3D 표시 프로그램을 HTML 에 넣지 못했습니다 — 3D 는 인터넷이 연결된 곳에서만 보입니다 (start.bat 로 실행한 뒤 다시 내보내면 포함됩니다)', 'warn'); }
    }
    const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${Core.esc(deck.title || '프레젠테이션')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="${FONT_LINK}">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
.start{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(0,0,0,.55);color:#fff;font-family:'Noto Sans KR',sans-serif;z-index:9999;cursor:pointer}
.start b{font-size:28px}.start span{opacity:.8;font-size:15px}.start button{font:inherit;font-size:18px;padding:12px 28px;border-radius:12px;border:0;background:#4dabf7;color:#fff;cursor:pointer}</style>
</head>
<body>
${mvScript}<script>
${PlayerCore.toString()}
(function(){
  var C = PlayerCore(); C.injectCSS();
  var deck = ${json};
  var p = new C.Presenter(document.body, deck, { standalone: true });
  var s = document.createElement('div'); s.className = 'start';
  s.innerHTML = '<b>' + C.esc(deck.title || '') + '</b><button>▶ 발표 시작</button>' + (deck.loop ? '<button data-loop style="background:#495057">🔁 반복 재생 (' + C.esc(deck.loop.range) + ')</button>' : '') + '<span>→/Space 다음 · ← 이전 · F 전체화면 · A 자동재생 · G 전체 보기 · Z 돋보기 · N 노트</span>';
  s.onclick = function(e){ var lp = e.target.closest && e.target.closest('[data-loop]'); s.remove(); p.enterFullscreen(lp ? { presenterView: false } : undefined); if (lp) p.startLoop(deck.loop); else p.go(p.o.start || 0, 0, true); };
  document.body.appendChild(s);
  if (/[#&]loop(?![a-z])/.test(location.hash) && deck.loop) { s.remove(); p.startLoop(deck.loop); }
})();
</script>
</body>
</html>`;
    download(safeName(deck.title) + '.html', new Blob([html], { type: 'text/html' }));
    UI.toast('HTML 파일로 내보냈습니다 — 브라우저에서 바로 발표할 수 있습니다');
  }

  function printPDF() {
    const deck = Store.deck;
    const root = document.createElement('div');
    root.id = 'print-root';
    const st = document.createElement('style');
    st.id = 'print-style';
    st.textContent = `@page{size:${deck.width}px ${deck.height}px;margin:0}
@media print{body>*:not(#print-root){display:none!important}#print-root{display:block!important}
.print-page{width:${deck.width}px;height:${deck.height}px;break-after:page;page-break-after:always;overflow:hidden;position:relative}
.print-page:last-child{break-after:auto;page-break-after:auto}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
#print-root{display:none}`;
    deck.slides.forEach((s) => {
      const pg = document.createElement('div');
      pg.className = 'print-page';
      pg.appendChild(Core.renderSlide(deck, s, { mode: 'thumb', resolve: Media.resolve }));
      root.appendChild(pg);
    });
    document.head.appendChild(st);
    document.body.appendChild(root);
    const cleanup = () => { root.remove(); st.remove(); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    UI.toast('인쇄 창에서 "PDF로 저장"을 선택하세요');
    setTimeout(() => window.print(), 400);
  }

  return { saveProject, openProject, exportHTML, printPDF, inlineDeck, download, FONT_LINK };
})();
