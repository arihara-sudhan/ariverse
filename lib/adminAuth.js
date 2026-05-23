import { parse, serialize } from 'cookie';
import crypto from 'node:crypto';

const ADMIN_COOKIE = 'ariverse_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getAdminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
  return String(secret);
}

function isStrongSecretConfigured() {
  return getAdminSecret().length >= 24;
}

function signPayload(payload) {
  const secret = getAdminSecret();
  if (!isStrongSecretConfigured()) {
    return '';
  }
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSessionToken() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const encodedPayload = toBase64Url(payload);
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function isValidSessionToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    return Number(payload?.exp) > Date.now();
  } catch (_error) {
    return false;
  }
}

export function isAdminRequest(req) {
  if (!isStrongSecretConfigured()) {
    return false;
  }
  const cookies = parse(req.headers.cookie || '');
  return isValidSessionToken(cookies[ADMIN_COOKIE]);
}

export function setAdminCookie(res) {
  if (!isStrongSecretConfigured()) {
    throw new Error('ADMIN_SESSION_SECRET must be set to a strong value (>= 24 chars).');
  }
  res.setHeader(
    'Set-Cookie',
    serialize(ADMIN_COOKIE, createSessionToken(), {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
    }),
  );
}

export function clearAdminCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serialize(ADMIN_COOKIE, '', {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    }),
  );
}

export function isValidAdminPassword(password) {
  const expected = String(process.env.ADMIN_PASSWORD || '');
  const received = String(password || '');

  if (!expected || !received) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isAdminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD) && isStrongSecretConfigured();
}
