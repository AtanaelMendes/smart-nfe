const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(payload, { secret, ttlSeconds }) {
  if (!secret) throw new Error('AUTH_SECRET não configurado');
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const payloadPart = toBase64Url(encoder.encode(JSON.stringify(body)));
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(payloadPart));
  return `${payloadPart}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token, { secret }) {
  if (!secret || typeof token !== 'string') return null;

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await importKey(secret),
      fromBase64Url(signaturePart),
      encoder.encode(payloadPart)
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(payloadPart)));
    if (!payload || typeof payload.exp !== 'number') return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
