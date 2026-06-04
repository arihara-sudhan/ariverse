import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';
import { subscribeNewsletter } from '../../../lib/newsletter';

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export default async function handler(req, res) {
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rate = checkRateLimit(req, 'newsletter-subscribe', 6, 10 * 60 * 1000);
  if (!rate.ok) {
    res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    return;
  }

  const email = cleanEmail(req.body?.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  try {
    let baseUrl = req.headers.origin || '';
    if (!baseUrl && req.headers.referer) {
      try {
        baseUrl = new URL(req.headers.referer).origin;
      } catch (_error) {
        baseUrl = '';
      }
    }

    const result = await subscribeNewsletter({
      email,
      source: 'newsletter-form',
      baseUrl,
    });

    if (!result.ok) {
      res.status(500).json({ error: result.error || 'Unable to subscribe right now.' });
      return;
    }

    res.status(200).json({ message: result.message || 'Subscribed! You will receive Ariverse updates.' });
  } catch (_error) {
    res.status(500).json({ error: 'Unable to subscribe right now. Please try again.' });
  }
}
