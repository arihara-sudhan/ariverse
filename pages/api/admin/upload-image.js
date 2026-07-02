import { readFile } from 'node:fs/promises';
import formidable from 'formidable';
import sharp from 'sharp';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';
import { toPublicStorageUrl } from '../../../lib/storage';

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

function getSupabaseBaseUrl() {
  return String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qbghhenrxoupaykgnxyj.supabase.co').trim().replace(/\/+$/, '');
}

function getSupabaseBucket() {
  return String(
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      'ariverse',
  ).trim() || 'ariverse';
}

function getSupabaseUploadKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();
}

function resolveSectionFolder(section, sectionHref = '') {
  const rawSection = String(section || '').trim();
  const rawHref = String(sectionHref || '').trim().toLowerCase();
  if (rawHref === '/ariyin-kavithaigal' || rawSection === 'அரியின் கவிதைகள்' || rawSection === 'Ariyin Kavithaigal' || rawSection === 'Kavithaigal') {
    return 'ariyin-kavithaigal';
  }
  if (rawHref === '/arizone' || rawSection === 'AriZone' || rawSection === 'AriZone (Blog)') return 'arizone';
  if (rawHref === '/arichuvadi' || rawSection === 'Arichuvadi' || rawSection === 'Arichuvadi (Blog)' || rawSection === 'Arichuvadu') return 'arichuvadi';
  if (rawHref === '/ari-read-books' || rawSection === 'Books Read') return 'books-read';
  if (rawHref === '/guest-lectures' || rawSection === 'Guest Lectures') return 'guest-lectures';
  if (rawHref === '/book-reviews' || rawSection === 'Book Reviews') return 'book-reviews';
  if (rawHref === '/ari-resume' || rawSection === 'Resume') return 'ari-resume';
  if (rawHref === '/clay-play' || rawSection === 'Clay Play') return 'clay-play';
  if (rawHref === '/aris-xperiments' || rawSection === 'Experiments') return 'experiments';
  if (rawHref === '/mini-projects' || rawSection === 'Mini-Projects') return 'mini-projects';
  if (rawHref === '/projects' || rawSection === 'Projects') return 'projects';
  if (rawHref === '/aris-books' || rawSection === 'My Books') return 'aris-books';
  if (rawHref === '/aris-shelf' || rawSection === 'Shelf') return 'aris-shelf';
  if (rawHref === '/ari-career' || rawSection === 'Career' || rawSection === 'Works' || rawSection === 'Experience') return 'careers';
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
  const subcategoryFolder = toFolderName(subcategory);
  const rawCategory = String(category || '').trim().toLowerCase();
  const rawSubcategory = String(subcategory || '').trim().toLowerCase();
  const titleBase = toFileNameBase(title) || baseName;
  const looksLikeLogo = titleFolder.endsWith('-company-logo') || titleFolder.includes('company-logo') || titleFolder.includes('logo');

  if (titleFolder === 'hero') {
    return `${sectionFolder}/hero${ext}`;
  }

  if (sectionFolder === 'ariyin-kavithaigal') {
    return `ariyin-kavithaigal/${titleBase}${ext}`;
  }

  if (sectionFolder === 'arizone') {
    if (looksLikeLogo) {
      return `arizone/categories/${titleBase}/logo${ext}`;
    }
    if (titleFolder === 'hero') {
      return `arizone/assets/hero${ext}`;
    }
    return joinBlobPath('arizone', 'posts', titleBase, `${baseName}${ext}`);
  }

  if (sectionFolder === 'careers') {
    if (looksLikeLogo) {
      return `careers/company-logos/${baseName}${ext}`;
    }
    return `careers/company-photos/${titleBase}${ext}`;
  }

  if (sectionFolder === 'projects') {
    if (titleFolder === 'hero') {
      return `projects/hero${ext}`;
    }
    if (looksLikeLogo) {
      return `projects/company-logos/${titleBase}${ext}`;
    }
    return `projects/company-photos/${titleBase}${ext}`;
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

  if (sectionFolder === 'aris-shelf') {
    if (titleFolder === 'hero') {
      return `aris-shelf/hero${ext}`;
    }
    return joinBlobPath('aris-shelf', `${titleBase}${ext}`);
  }

  if (sectionFolder === 'book-reviews') {
    return joinBlobPath('book-reviews', titleBase, `${baseName}${ext}`);
  }

  if (sectionFolder === 'ari-resume') {
    if (titleFolder === 'hero') {
      return `ari-resume/hero${ext}`;
    }
    return joinBlobPath('ari-resume', 'pages', `${titleBase}${ext}`);
  }

  if (sectionFolder === 'mini-projects' || sectionFolder === 'experiments' || sectionFolder === 'guest-lectures' || sectionFolder === 'binomial-names') {
    return joinBlobPath(sectionFolder, `${titleBase}${ext}`);
  }

  if (sectionFolder === 'clay-play') {
    return joinBlobPath('ari-clay', titleBase, `${baseName}${ext}`);
  }

  return joinBlobPath(sectionFolder, titleFolder || titleBase, `${baseName}${ext}`);
}

function toCleanRelativePath(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  const stripped = input.split('?')[0].split('#')[0].replace(/^\/+/, '');
  if (!stripped) return '';
  return stripped
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (_error) {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

function normalizeStorageUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const parsed = new URL(input);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch (_error) {
    return toPublicStorageUrl(input);
  }
}

function replaceBlobExt(pathname, ext = '.webp') {
  const clean = String(pathname || '').trim();
  if (!clean) return '';
  return clean.replace(/\.[^/.]+$/, ext);
}

function resolveExplicitUploadPath(fields) {
  const rawTarget = Array.isArray(fields?.targetPath) ? fields.targetPath[0] : fields?.targetPath;
  const rawPath = Array.isArray(fields?.path) ? fields.path[0] : fields?.path;
  const target = toCleanRelativePath(rawTarget || rawPath || '');
  if (!target) return '';
  return replaceBlobExt(target, '.webp');
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

    const section = Array.isArray(fields?.section) ? fields.section[0] : fields?.section;
    const sectionHref = Array.isArray(fields?.sectionHref) ? fields.sectionHref[0] : fields?.sectionHref;
    const title = Array.isArray(fields?.title) ? fields.title[0] : fields?.title;
    const category = Array.isArray(fields?.category) ? fields.category[0] : fields?.category;
    const subcategory = Array.isArray(fields?.subcategory) ? fields.subcategory[0] : fields?.subcategory;
    const currentUrl = Array.isArray(fields?.currentUrl) ? fields.currentUrl[0] : fields?.currentUrl;
    const baseName = toFileBaseFromOriginalName(file.originalFilename || '');
    const sectionFolder = resolveSectionFolder(section, sectionHref);
    const explicitPath = resolveExplicitUploadPath(fields);
    const currentPath = toCleanRelativePath(currentUrl);
    const outputExt = '.webp';
    const fileName = explicitPath || (isCleanSectionPath(currentPath, sectionFolder)
      ? replaceBlobExt(currentPath, outputExt)
      : buildBlobPath({ section, sectionHref, title, category, subcategory, baseName, ext: outputExt }));

    if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'File too large.' });
      return;
    }

    const fileBuffer = await readFile(file.filepath);
    const webpBuffer = await sharp(fileBuffer, { animated: true })
      .webp({ quality: 100, effort: 3 })
      .toBuffer();
    const uploadKey = getSupabaseUploadKey();
    if (!uploadKey) {
      res.status(500).json({ error: 'Supabase upload key is missing. Set SUPABASE_SERVICE_ROLE_KEY (recommended).' });
      return;
    }

    const supabaseUrl = getSupabaseBaseUrl();
    const bucket = getSupabaseBucket();
    const objectPath = String(fileName || '').replace(/^\/+/, '');
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${uploadKey}`,
        apikey: uploadKey,
        'x-upsert': 'true',
        'content-type': 'image/webp',
      },
      body: webpBuffer,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      res.status(response.status).json({ error: details || 'Upload failed.' });
      return;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
    res.status(200).json({ imageUrl: `${publicUrl}?v=${Date.now()}`, storageUrl: publicUrl });
  } catch (_error) {
    res.status(500).json({ error: 'Upload failed.' });
  }
}
