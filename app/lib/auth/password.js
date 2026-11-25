import crypto from 'node:crypto';

import { DUMMY_CREDENTIALS, MOCK_USERS } from './users.mock.js';
import { isMockAuthEnabled } from './config.js';

const KEY_LENGTH = 64;

export function verifyPassword(password, saltHex, hashHex) {
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(String(password), salt, expected.length || KEY_LENGTH);
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function authenticateMockUser(username, password) {
  if (!isMockAuthEnabled()) {
    return { ok: false, reason: 'mock_disabled' };
  }

  const normalized = String(username ?? '').trim().toLowerCase();
  const record = Object.prototype.hasOwnProperty.call(MOCK_USERS, normalized)
    ? MOCK_USERS[normalized]
    : null;
  const credentials = record || DUMMY_CREDENTIALS;

  // Mesmo para usuários inexistentes o scrypt é executado, evitando
  // diferenças de tempo que revelem quais contas existem.
  const passwordValid = verifyPassword(password, credentials.salt, credentials.hash);

  if (!record || !passwordValid) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  return {
    ok: true,
    user: { username: normalized, name: record.name },
  };
}
