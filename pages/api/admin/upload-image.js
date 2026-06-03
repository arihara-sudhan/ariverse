import { readFile } from 'node:fs/promises';
import { del, put } from '@vercel/blob';
import formidable from 'formidable';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_UPLOAD_BYTES,
    filter: ({ mimetype }) => Boolean(mimetype && ALLOWED_MIME_TO_EXT[mimetype]),
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function toFolderName(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const slug = text
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug;
}

function toFileNameBase(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const slug = text
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `img-${Date.now()}`;
}

function toFileBaseFromOriginalName(fileName) {
  const raw = typeof fileName === 'string' ? fileName : '';
  const base = raw.replace(/\.[^/.]+$/, '');
  return toFileNameBase(base);
}

function resolveSectionFolder(section, sectionHref = '') {
  const rawSection = String(section || '').trim();
  const rawHref = String(sectionHref || '').trim().toLowerCase();
  if (rawHref === '/ariyin-kavithaigal' || rawSection === 'அரியின் கவிதைகள்' || rawSection === 'Ariyin Kavithaigal' || rawSection === 'Kavithaigal') {
    return 'ariyin-kavithaigal';
  }
  if (rawHref === '/ari-read-books' || rawSection === 'Books Read') return 'books-read';
  if (rawHref === '/guest-lectures' || rawSection === 'Guest Lectures') return 'guest-lectures';
  if (rawHref === '/clay-play' || rawSection === 'Clay Play') return 'clay-play';
  if (rawHref === '/aris-xperiments' || rawSection === 'Experiments') return 'experiments';
  if (rawHref === '/mini-projects' || rawSection === 'Mini-Projects') return 'mini-projects';
  if (rawHref === '/projects' || rawSection === 'Projects') return 'projects';
  if (rawHref === '/aris-books' || rawSection === 'My Books') return 'aris-books';
  if (rawHref === '/ari_career' || rawSection === 'Career' || rawSection === 'Works' || rawSection === 'Experience') return 'careers';
  if (rawHref === '/binomial-names' || rawSection === 'Binomial Names') return 'binomial-names';
  return toFolderName(rawSection) || 'misc';
}

function joinBlobPath(...parts) {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('/');
}

function buildBlobPath({ section, sectionHref, title, category, subcategory, baseName, ext }) {
  const sectionFolder = resolveSectionFolder(section, sectionHref);
  const titleFolder = toFolderName(title);
  const categoryFolder = toFolderName(category);
  const subcategoryFolder = toFolderName(subcategory);
  const rawCategory = String(category || '').trim().toLowerCase();
  const rawSubcategory = String(subcategory || '').trim().toLowerCase();
  const titleBase = toFileNameBase(title) || baseName;

  if (titleFolder === 'hero') {
    return `${sectionFolder}/hero${ext}`;
  }

  if (sectionFolder === 'ariyin-kavithaigal') {
    return `ariyin-kavithaigal/${titleBase}${ext}`;
  }

  if (sectionFolder === 'careers') {
    const isCompanyLogo = titleFolder.endsWith('-company-logo') || titleFolder.includes('company-logo');
    if (isCompanyLogo) {
      return `careers/company-logos/${baseName}${ext}`;
    }
    return `careers/company-photos/${titleBase}${ext}`;
  }

  if (sectionFolder === 'books-read') {
    const languageFolder = rawCategory === 'tamil' ? 'tamil' : 'english';
    const typeFolder = languageFolder === 'tamil'
      ? (rawSubcategory.includes('புனைவிலி') ? 'non-fiction' : 'fiction')
      : (subcategoryFolder === 'non-fiction' ? 'non-fiction' : 'fiction');
    return joinBlobPath('books-read', languageFolder, typeFolder, `${titleBase}${ext}`);
  }

  if (sectionFolder === 'aris-books') {
    return joinBlobPath('aris-books', 'book-covers', `${titleBase}${ext}`);
  }

  if (sectionFolder === 'mini-projects' || sectionFolder === 'projects' || sectionFolder === 'experiments' || sectionFolder === 'guest-lectures' || sectionFolder === 'binomial-names') {
    return joinBlobPath(sectionFolder, `${titleBase}${ext}`);
  }

  if (sectionFolder === 'clay-play') {
    return joinBlobPath('clay-play', titleBase, `${baseName}${ext}`);
  }

  return joinBlobPath(sectionFolder, titleFolder || titleBase, `${baseName}${ext}`);
}

function normalizeBlobUrl(url) {
  const input = String(url || '').trim();
  if (!input) return '';
  try {
    const parsed = new URL(input);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeBlobPath(url) {
  const normalizedUrl = normalizeBlobUrl(url);
  if (!normalizedUrl) return '';
  try {
    return new URL(normalizedUrl).pathname.replace(/^\/+/, '');
  } catch {
    return '';
  }
}

function isCleanSectionPath(pathname, sectionFolder) {
  const path = String(pathname || '').trim();
  const section = String(sectionFolder || '').trim();
  if (!path || !section) return false;
  if (!path.startsWith(`${section}/`)) return false;
  return !path.includes('/uploads/');
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { files, fields } = await parseForm(req);
    const file = files?.image?.[0] || files?.image;

    if (!file) {
      res.status(400).json({ error: 'No image provided.' });
      return;
    }

    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || '.png';
    const section = Array.isArray(fields?.section) ? fields.section[0] : fields?.section;
    const sectionHref = Array.isArray(fields?.sectionHref) ? fields.sectionHref[0] : fields?.sectionHref;
    const title = Array.isArray(fields?.title) ? fields.title[0] : fields?.title;
    const category = Array.isArray(fields?.category) ? fields.category[0] : fields?.category;
    const subcategory = Array.isArray(fields?.subcategory) ? fields.subcategory[0] : fields?.subcategory;
    const currentUrl = Array.isArray(fields?.currentUrl) ? fields.currentUrl[0] : fields?.currentUrl;
    const baseName = toFileBaseFromOriginalName(file.originalFilename || '');
    const sectionFolder = resolveSectionFolder(section, sectionHref);
    const currentPath = normalizeBlobPath(currentUrl);
    const fileName = isCleanSectionPath(currentPath, sectionFolder)
      ? currentPath
      : buildBlobPath({ section, sectionHref, title, category, subcategory, baseName, ext });

    if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'File too large.' });
      return;
    }

    const fileBuffer = await readFile(file.filepath);
    const existingUrl = normalizeBlobUrl(currentUrl);
    if (existingUrl && normalizeBlobPath(existingUrl) !== fileName) {
      try {
        await del(existingUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (_deleteError) {
      }
    }

    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.mimetype,
    });

    res.status(200).json({ imageUrl: `${blob.url}?v=${Date.now()}`, storageUrl: blob.url });
  } catch (_error) {
    res.status(500).json({ error: 'Upload failed.' });
  }
}
