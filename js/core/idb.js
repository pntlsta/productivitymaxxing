// Minimal IndexedDB key/value wrapper. Binary files (epubs, covers, images) and search
// indexes live here, never in GitHub issues.
const DB_NAME = 'workbench';
const STORES = ['books', 'covers', 'images', 'search', 'locations'];
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { STORES.forEach(s => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbp = null; reject(req.error); };
    });
  }
  return dbp;
}
async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('IndexedDB transaction aborted (storage full?)'));
  });
}
export const idbGet = (store, key) => tx(store, 'readonly', s => s.get(key));
export const idbPut = (store, key, val) => tx(store, 'readwrite', s => s.put(val, key));
export const idbDel = (store, key) => tx(store, 'readwrite', s => s.delete(key));
export const idbKeys = (store) => tx(store, 'readonly', s => s.getAllKeys());

const urlCache = new Map();
/** Object URL for a blob stored in IDB (cached per session). */
export async function blobUrl(store, key) {
  const k = `${store}:${key}`;
  if (urlCache.has(k)) return urlCache.get(k);
  const b = await idbGet(store, key).catch(() => null);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urlCache.set(k, u);
  return u;
}
