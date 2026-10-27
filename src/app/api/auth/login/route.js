import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  verifyAdminCredentials
} from '@/lib/auth';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      { success: false, message: 'Admin authentication is not configured on the server.' },
      { status: 503 }
    );
  }

  if (!verifyAdminCredentials(email, password)) {
    return NextResponse.json({ success: false, message: 'Incorrect admin credentials.' }, { status: 401 });
  }

  const session = createAdminSession();
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.expiresAt - Math.floor(Date.now() / 1000)
  });
  return response;
}
