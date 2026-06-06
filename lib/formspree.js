const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xaqddpnz';

function clean(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

export async function sendViaFormspree({ email, message, subject = '' }) {
  const safeEmail = clean(email, 160);
  const safeMessage = clean(message, 4000);
  const safeSubject = clean(subject, 160);
  if (!safeEmail || !safeMessage) return { ok: false, skipped: true };

  const payload = {
    email: safeEmail,
    message: safeSubject ? `${safeSubject}\n\n${safeMessage}` : safeMessage,
  };

  const res = await fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok };
}

export async function notifyAdminCommentApproval({ source, sectionKey, entryId, name, comment }) {
  const msg = [
    'New comment submitted for approval.',
    `Source: ${source}`,
    `Section: ${sectionKey || '-'}`,
    `Entry ID: ${entryId}`,
    `Name: ${name || 'anonymous'}`,
    '',
    comment || '',
  ].join('\n');
  return sendViaFormspree({
    email: 'comments@ariverse.local',
    subject: 'ARIVERSE comment approval required',
    message: msg,
  });
}

export async function notifyAdminTestimonialApproval({ name, relation, testimonial }) {
  const msg = [
    'New testimonial submitted for approval.',
    `Name: ${name || 'anonymous'}`,
    `Relation: ${relation || '-'}`,
    '',
    testimonial || '',
  ].join('\n');
  return sendViaFormspree({
    email: 'comments@ariverse.local',
    subject: 'ARIVERSE testimonial approval required',
    message: msg,
  });
}
