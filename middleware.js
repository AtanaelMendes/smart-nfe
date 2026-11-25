import { NextResponse } from 'next/server';

import {
  getAuthSecret,
  isProtectedPath,
  SESSION_COOKIE,
} from './app/lib/auth/config.js';
import { verifySessionToken } from './app/lib/auth/session.js';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token, { secret: getAuthSecret() });

  if (pathname === '/login' && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    url.hash = '';
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.hash = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/documentos/:path*',
    '/notas-preparadas/:path*',
    '/preparacoes/:path*',
    '/notas/:path*',
    '/configuracoes/:path*',
  ],
};
