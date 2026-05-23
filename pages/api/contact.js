import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { checkRateLimit, enforceSameOriginWrite } from '../../lib/security';

loadEnv({ path: path.join(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let contactTableReady = false;

function cleanText(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  return text.slice(0, maxLength);
}

function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

async function ensureContactTable() {
  if (!sql || contactTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      source_ip TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  contactTableReady = true;
}

async function forwardViaResend({ name, email, subject, message }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!resendApiKey || !toEmail || !fromEmail) {
    return { delivered: false, skipped: true };
  }

  const plainText = [
    `Name: ${name}`,
    `Email: ${email}`,
    '',
    message,
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: subject || 'New message from ARIVERSE contact form',
      text: plainText,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { delivered: false, skipped: false, error: text || 'Mail provider error' };
  }

  return { delivered: true, skipped: false };
}

export default async function handler(req, res) {
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rate = checkRateLimit(req, 'contact-form', 8, 10 * 60 * 1000);
  if (!rate.ok) {
    res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    return;
  }

  const name = cleanText(req.body?.name, 80);
  const email = cleanText(req.body?.email, 120).toLowerCase();
  const subject = cleanText(req.body?.subject, 140);
  const message = cleanText(req.body?.message, 2000);
  const website = cleanText(req.body?.website, 120);

  if (website) {
    res.status(200).json({ message: 'Message sent.' });
    return;
  }

  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const ip = getClientIp(req);

  try {
    await ensureContactTable();
    if (sql) {
      await sql`
        INSERT INTO contact_messages (name, email, subject, message, source_ip)
        VALUES (${name}, ${email}, ${subject || 'Contact Form Message'}, ${message}, ${ip})
      `;
    }

    const delivery = await forwardViaResend({ name, email, subject, message });
    if (!delivery.delivered && !delivery.skipped) {
      res.status(202).json({
        message: 'Message received. ARI will get back to you soon.',
      });
      return;
    }

    res.status(200).json({ message: 'Message sent. ARI will get back to you soon.' });
  } catch (_error) {
    res.status(500).json({ error: 'Unable to send your message right now. Please try again.' });
  }
}

