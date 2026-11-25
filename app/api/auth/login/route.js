import { NextResponse } from 'next/server';

import {
  getAuthSecret,
  REMEMBER_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from '@/lib/auth/config';
import { authService } from '@/lib/auth/service';
import { createSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function isSecureRequest(request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return request.nextUrl?.protocol === 'https:';
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!username.trim() || !password) {
    return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 });
  }

  const result = await authService.authenticate({ username, password });

  if (!result.ok) {
    const message =
      result.reason === 'mock_disabled'
        ? 'Autenticação de demonstração desativada.'
        : 'Usuário ou senha inválidos.';
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const secret = getAuthSecret();
  if (!secret) {
    return NextResponse.json(
      { error: 'Serviço de autenticação indisponível.' },
      { status: 500 }
    );
  }

  const remember = Boolean(body?.remember);
  const ttlSeconds = remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS;

  const token = await createSessionToken(
    { sub: result.user.username, name: result.user.name, remember },
    { secret, ttlSeconds }
  );

  const response = NextResponse.json({
    ok: true,
    user: { username: result.user.username, name: result.user.name },
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    path: '/',
    ...(remember ? { maxAge: ttlSeconds } : {}),
  });

  return response;
}
