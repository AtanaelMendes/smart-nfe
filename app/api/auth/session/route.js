import { NextResponse } from 'next/server';

import { getAuthSecret, SESSION_COOKIE } from '@/lib/auth/config';
import { verifySessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token, { secret: getAuthSecret() });

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: { username: session.sub, name: session.name },
  });
}
