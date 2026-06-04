import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const NEWSLETTER_FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || '';
const DEFAULT_SITE_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

let subscribersTableReady = false;

function cleanText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function resolveBaseUrl(baseUrl) {
  const cleaned = cleanText(baseUrl, 200);
  if (!cleaned) return DEFAULT_SITE_BASE_URL;
  return cleaned.replace(/\/+$/, '');
}

function sectionPathFromLabel(label) {
  const normalized = cleanText(label, 80).toLowerCase();
  if (normalized === 'career' || normalized === 'works' || normalized === 'experience') return '/ari_career';
  if (normalized === 'projects') return '/projects';
  if (normalized === 'mini-projects') return '/mini-projects';
  if (normalized === 'experiments') return '/aris-xperiments';
  if (normalized === 'guest lectures') return '/guest-lectures';
  if (normalized === 'clay play') return '/clay-play';
  if (normalized === 'books read') return '/ari-read-books';
  if (normalized === 'my books') return '/aris-books';
  return '';
}

function toAbsoluteUrl(pathnameOrUrl, baseUrl) {
  const input = cleanText(pathnameOrUrl, 500);
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  const path = input.startsWith('/') ? input : `/${input}`;
  return `${resolveBaseUrl(baseUrl)}${path}`;
}

async function ensureSubscribersTable() {
  if (!sql || subscribersTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`;
  await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  subscribersTableReady = true;
}

async function sendResendEmail({ to, subject, text }) {
  if (!RESEND_API_KEY || !NEWSLETTER_FROM_EMAIL) {
    return { delivered: false, skipped: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: NEWSLETTER_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { delivered: false, skipped: false, error: errorText || 'Mail provider error' };
  }

  return { delivered: true, skipped: false };
}

function buildAnnouncementText({ sectionLabel, itemTitle, summary, itemUrl }) {
  const lines = [
    `A new update has been added to ${sectionLabel || 'Ariverse'}.`,
    itemTitle ? `Title: ${itemTitle}` : '',
    summary ? `Details: ${summary}` : '',
    itemUrl ? `Read more: ${itemUrl}` : '',
    '',
    'You are receiving this because you subscribed to Ariverse updates.',
  ];
  return lines.filter(Boolean).join('\n');
}

export async function subscribeNewsletter({ email, source = 'home', baseUrl } = {}) {
  const normalizedEmail = cleanEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!sql) {
    return { ok: false, error: 'Database is unavailable right now.' };
  }

  await ensureSubscribersTable();
  const existingRows = await sql`
    SELECT id, is_active AS "isActive"
    FROM newsletter_subscribers
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;
  const wasExisting = Boolean(existingRows[0]);
  const wasActive = Boolean(existingRows[0]?.isActive);

  await sql`
    INSERT INTO newsletter_subscribers (email, is_active, subscribed_at, updated_at)
    VALUES (${normalizedEmail}, TRUE, NOW(), NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      is_active = TRUE,
      updated_at = NOW()
  `;

  const message = wasActive
    ? 'You are already subscribed. You will keep receiving Ariverse updates.'
    : 'Subscribed! You will receive Ariverse updates when new items are added.';

  if (RESEND_API_KEY && NEWSLETTER_FROM_EMAIL) {
    await sendResendEmail({
      to: normalizedEmail,
      subject: 'Welcome to Ariverse updates',
      text: [
        'You are subscribed to Ariverse updates.',
        '',
        'You will receive emails when new posts are added to sections like Career, Projects, Mini-Projects, Experiments, Guest Lectures, Clay Play, and Books Read.',
        '',
        `Source: ${cleanText(source, 40) || 'home'}`,
        `Site: ${resolveBaseUrl(baseUrl)}`,
      ].join('\n'),
    });
  }

  return {
    ok: true,
    wasExisting,
    wasActive,
    message,
  };
}

export async function notifyNewsletterSubscribers({ sectionLabel, itemTitle, summary, itemUrl, baseUrl } = {}) {
  if (!sql) {
    return { ok: false, skipped: true };
  }

  await ensureSubscribersTable();
  const subscriberRows = await sql`
    SELECT email
    FROM newsletter_subscribers
    WHERE is_active = TRUE
    ORDER BY subscribed_at ASC, id ASC
  `;

  const emails = subscriberRows.map((row) => cleanEmail(row.email)).filter(Boolean);
  if (emails.length === 0) {
    return { ok: true, skipped: true, deliveredCount: 0 };
  }

  const targetUrl = toAbsoluteUrl(
    itemUrl || sectionPathFromLabel(sectionLabel),
    baseUrl,
  );
  const subject = itemTitle
    ? `New Ariverse update: ${cleanText(sectionLabel, 60) || 'Update'} - ${cleanText(itemTitle, 120)}`
    : `New Ariverse update: ${cleanText(sectionLabel, 60) || 'Update'}`;
  const text = buildAnnouncementText({
    sectionLabel,
    itemTitle,
    summary,
    itemUrl: targetUrl,
  });

  const results = await Promise.allSettled(
    emails.map((email) => sendResendEmail({ to: email, subject, text })),
  );
  const deliveredCount = results.reduce((count, result) => {
    if (result.status === 'fulfilled' && result.value?.delivered) return count + 1;
    return count;
  }, 0);

  return {
    ok: true,
    skipped: false,
    deliveredCount,
    total: emails.length,
  };
}
