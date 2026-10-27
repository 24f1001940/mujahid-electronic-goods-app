import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'meg_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getAuthConfig() {
  return {
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD,
    secret: process.env.AUTH_SECRET
  };
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createAdminSession() {
  const { secret } = getAuthConfig();
  if (!secret) throw new Error('AUTH_SECRET is not configured.');

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${expiresAt}`;
  return {
    value: `${payload}.${sign(payload, secret)}`,
    expiresAt
  };
}

export function verifyAdminCredentials(email, password) {
  const config = getAuthConfig();
  if (!config.email || !config.password || !config.secret) return false;
  return email.trim().toLowerCase() === config.email && password === config.password;
}

export function verifyAdminSession(value) {
  const { secret } = getAuthConfig();
  if (!value || !secret) return false;

  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  const actualBuffer = Buffer.from(parts[2]);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
