/* IndexedDB 기반 미디어 저장소. 슬라이드에서는 "idb:<id>" 로 참조한다. */
const Media = (() => {
  const DB = 'hppt-media', STORE = 'blobs';
  const urls = new Map();     // id -> objectURL
  const pending = new Map();  // id -> Promise
  let dbp = null;
  let onLoaded = () => {};

  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }

  function tx(mode, fn) {
    return db().then((d) => new Promise((res, rej) => {
      const t = d.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    }));
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  async function put(blob) {
    const id = uid();
    await tx('readwrite', (s) => s.put(blob, id));
    urls.set(id, URL.createObjectURL(blob));
    return 'idb:' + id;
  }

  function getBlob(id) {
    return tx('readonly', (s) => s.get(id));
  }

  // 이 브라우저에 없으면 로컬 서버의 백업(decks/media)에서 가져와 다시 넣는다
  async function fromServer(id) {
    if (!/^https?:$/.test(location.protocol)) return null;
    try {
      const r = await fetch('/api/media/' + encodeURIComponent(id), { cache: 'no-store' });
      if (!r.ok) return null;
      const b = await r.blob();
      await tx('readwrite', (s) => s.put(b, id));
      return b;
    } catch (e) { return null; }
  }

  function load(id) {
    if (pending.has(id)) return pending.get(id);
    const p = getBlob(id).catch(() => null).then((b) => b || fromServer(id)).then((b) => {
      if (b) { urls.set(id, URL.createObjectURL(b)); onLoaded(id); }
      return b;
    }).catch(() => null);
    pending.set(id, p);
    return p;
  }

  // 동기 해석: 아직 로드되지 않았으면 빈 문자열을 반환하고 로드가 끝나면 onLoaded 콜백
  function resolve(src) {
    if (!src) return '';
    if (!src.startsWith('idb:')) return src;
    const id = src.slice(4);
    if (urls.has(id)) return urls.get(id);
    load(id);
    return '';
  }

  async function preload(srcs) {
    await Promise.all(srcs.filter((s) => s && s.startsWith('idb:')).map((s) => load(s.slice(4))));
  }

  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
  }

  async function toDataURL(src) {
    if (!src || !src.startsWith('idb:')) return src;
    const b = await getBlob(src.slice(4));
    return b ? blobToDataURL(b) : '';
  }

  async function fromDataURL(dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    return put(blob);
  }

  async function clearUnused(usedSrcs) {
    const used = new Set(usedSrcs.filter((s) => s && s.startsWith('idb:')).map((s) => s.slice(4)));
    const keys = await tx('readonly', (s) => s.getAllKeys());
    const del = (keys || []).filter((k) => !used.has(k));
    if (del.length) await tx('readwrite', (s) => { del.forEach((k) => s.delete(k)); return null; });
    return del.length;
  }

  return { put, resolve, preload, toDataURL, fromDataURL, getBlob, blobToDataURL, clearUnused, set onLoaded(fn) { onLoaded = fn; } };
})();
