import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { notifyAdminContactMessage } from '../../lib/formspree';
import { enforceRateLimit, enforceSameOriginWrite } from '../../lib/security';

loadEnv({ path: path.join(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

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

export default async function handler(req, res) {
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!(await enforceRateLimit(req, res, 'contact-form', 8, 10 * 60 * 1000))) return;

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
    if (sql) {
      await sql`
        INSERT INTO contact_messages (name, email, subject, message, source_ip)
        VALUES (${name}, ${email}, ${subject || 'Contact Form Message'}, ${message}, ${ip})
      `;
    }

    const delivery = await notifyAdminContactMessage({ name, email, subject, message });
    if (!delivery.ok) {
      res.status(502).json({
        error: 'Your message was saved, but email delivery failed. Please try again shortly.',
      });
      return;
    }

    res.status(200).json({ message: 'Message sent. ARI will get back to you soon.' });
  } catch (_error) {
    res.status(500).json({ error: 'Unable to send your message right now. Please try again.' });
  }
}
