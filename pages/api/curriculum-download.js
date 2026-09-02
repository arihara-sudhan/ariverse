function sanitizeFileName(value) {
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return text || 'curriculum';
}

function resolveDownloadUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    const url = new URL(text);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }

    if (url.hostname === 'github.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 5 && parts[2] === 'blob') {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const filePath = parts.slice(4).join('/');
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      }
    }

    return url.toString();
  } catch (_error) {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const sourceUrl = resolveDownloadUrl(req.query?.url);
  if (!sourceUrl) {
    res.status(400).json({ error: 'Valid curriculum URL is required.' });
    return;
  }

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      res.status(502).json({ error: 'Could not fetch curriculum PDF.' });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const baseName = sanitizeFileName(req.query?.title);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}-curriculum.pdf"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
