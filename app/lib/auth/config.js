export const SESSION_COOKIE = 'smartnfe_session';

export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const REMEMBER_TTL_SECONDS = 30 * 24 * 60 * 60;

export const PROTECTED_PREFIXES = Object.freeze([
  '/dashboard',
  '/documentos',
  '/notas-preparadas',
  '/preparacoes',
  '/notas',
  '/configuracoes',
]);

export function getAuthSecret() {
  return process.env.AUTH_SECRET || '';
}

export function isMockAuthEnabled() {
  return process.env.AUTH_MOCK_ENABLED === 'true';
}

export function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
