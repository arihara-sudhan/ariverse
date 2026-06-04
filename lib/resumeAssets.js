import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_RESUME_DOC_URL = 'https://arihara-sudhan.github.io/resume/resume.pdf';

export async function readFallbackResumeAssets() {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'generated', 'resume', 'latest.json');
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      pdfUrl: parsed?.source || DEFAULT_RESUME_DOC_URL,
      pageImageUrls: Array.isArray(parsed?.images) ? parsed.images : [],
    };
  } catch (_error) {
    return {
      pdfUrl: DEFAULT_RESUME_DOC_URL,
      pageImageUrls: [],
    };
  }
}

