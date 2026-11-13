// Passphrase-encrypted text (AES-GCM, key from PBKDF2-SHA256). The ciphertext can be stored in a
// public GitHub issue safely; only someone with the passphrase can read it. The passphrase itself
// is never stored or synced (kept in sessionStorage only while unlocked in this tab).
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const ITER = 250000;

async function key(pass, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function seal(text, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(pass, salt), enc.encode(text));
  return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) };
}
/** Throws if the passphrase is wrong. */
export async function open(box, pass) {
  const k = await key(pass, unb64(box.salt));
  try { return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, k, unb64(box.data))); }
  catch { throw new Error('Wrong passphrase.'); }
}
const SKEY = 'wb.trip.pass';
export const rememberPass = (p) => { try { sessionStorage.setItem(SKEY, p); } catch {} };
export const sessionPass = () => { try { return sessionStorage.getItem(SKEY); } catch { return null; } };
export const forgetPass = () => { try { sessionStorage.removeItem(SKEY); } catch {} };
