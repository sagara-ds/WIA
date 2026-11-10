// Kriptografi sisi klien (WebCrypto native, tanpa library baru).
// Alur: data key AES-256 acak per tiket -> wrap dengan KEK dari kunci pemulihan 128-bit
// (PBKDF2-SHA256 310.000 iterasi + salt acak). Server hanya menyimpan ciphertext.

const enc = new TextEncoder()
const dec = new TextDecoder()

export function b64(bytes: Uint8Array): string {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s)
}
export function unb64(s: string): Uint8Array {
  const bin = atob(s)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
function rand(n: number): Uint8Array { return crypto.getRandomValues(new Uint8Array(n)) }

export async function generateRecoveryKey(): Promise<string> { return b64(rand(16)) }
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}
export async function generateSalt(): Promise<string> { return b64(rand(16)) }

async function deriveKEK(recoveryKey: string, saltB64: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', unb64(recoveryKey) as BufferSource, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: unb64(saltB64) as BufferSource, iterations: 310000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  )
}

export async function wrapDataKey(dataKey: CryptoKey, recoveryKey: string, saltB64: string): Promise<string> {
  const kek = await deriveKEK(recoveryKey, saltB64)
  const raw = await crypto.subtle.exportKey('raw', dataKey)
  const iv = rand(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, kek, raw)
  return `${b64(iv)}.${b64(new Uint8Array(ct))}`
}

export async function unwrapDataKey(wrapped: string, recoveryKey: string, saltB64: string): Promise<CryptoKey> {
  const kek = await deriveKEK(recoveryKey, saltB64)
  const [ivB, ctB] = wrapped.split('.')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB) as BufferSource }, kek, unb64(ctB) as BufferSource)
  return crypto.subtle.importKey('raw', pt, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function encryptText(plain: string, dataKey: CryptoKey): Promise<string> {
  const iv = rand(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, dataKey, enc.encode(plain))
  return `${b64(iv)}.${b64(new Uint8Array(ct))}`
}
export async function decryptText(payload: string, dataKey: CryptoKey): Promise<string> {
  const [ivB, ctB] = payload.split('.')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB) as BufferSource }, dataKey, unb64(ctB) as BufferSource)
  return dec.decode(pt)
}

export async function encryptBytes(buf: ArrayBuffer, dataKey: CryptoKey): Promise<ArrayBuffer> {
  const iv = rand(12)
  const ivBytes = new Uint8Array(iv)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes as BufferSource }, dataKey, buf)
  const out = new Uint8Array(ivBytes.length + ct.byteLength)
  out.set(ivBytes); out.set(new Uint8Array(ct), ivBytes.length)
  return out.buffer
}
export async function decryptBytes(buf: ArrayBuffer, dataKey: CryptoKey): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buf)
  const iv = bytes.slice(0, 12)
  const ct = bytes.slice(12)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, dataKey, ct as BufferSource)
}

// Berbagi akses ke admin: RSA-OAEP 4096 (demo) ΓÇö pelapor membungkus data key pakai public key admin.
export async function generateAdminKeyPair(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey; publicKey: CryptoKey; privateKey: CryptoKey }> {
  const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])
  const publicJwk = await crypto.subtle.exportKey('jwk', kp.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  return { publicJwk, privateJwk, publicKey: kp.publicKey, privateKey: kp.privateKey }
}
export async function importAdminPublic(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt'])
}
export async function importAdminPrivate(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt'])
}
export async function wrapWithAdmin(dataKey: CryptoKey, adminPublic: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', dataKey)
  const ct = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, adminPublic, raw)
  return b64(new Uint8Array(ct))
}
export async function unwrapWithAdmin(wrapped: string, adminPrivate: CryptoKey): Promise<CryptoKey> {
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, adminPrivate, unb64(wrapped) as BufferSource)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export function storeAdminKeys(jwk: JsonWebKey) { localStorage.setItem('siap.admin-jwk', JSON.stringify(jwk)) }
export function loadAdminKeys(): JsonWebKey | null {
  const raw = localStorage.getItem('siap.admin-jwk'); if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}
