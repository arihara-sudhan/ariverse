import { readFile } from 'node:fs/promises';
import formidable from 'formidable';
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

function getFileExtension(file) {
  const mime = String(file?.mimetype || '').trim().toLowerCase();
  if (mime && ALLOWED_MIME_TO_EXT[mime]) {
    return ALLOWED_MIME_TO_EXT[mime];
  }

  const originalName = String(file?.originalFilename || '').trim();
  const match = originalName.match(/\.[^/.]+$/);
  if (match) {
    return match[0].toLowerCase();
  }

  return '.bin';
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
    ''
  ).trim();
}

function resolveSectionFolder(section, sectionHref = '') {
  const rawSection = String(section || '').trim();
  const rawHref = String(sectionHref || '').trim().toLowerCase();
  if (
    rawHref === '/arichuvadi' ||
    rawHref === '/arichuvadi?category=kavithaigal' ||
    rawSection === 'Ariyin Kavithaigal' ||
    rawSection === 'Kavithaigal' ||
    rawSection === 'Arichuvadi'
  ) {
    return 'arichuvadi';
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

  if (sectionFolder === 'arizone') {
    if (looksLikeLogo) {
      return `arizone/categories/${titleBase}/logo${ext}`;
    }
    if (titleFolder === 'hero') {
      return `arizone/assets/hero${ext}`;
    }
    return joinBlobPath('arizone', 'posts', titleBase, `${baseName}${ext}`);
  }

  if (sectionFolder === 'arichuvadi') {
    const postFolder = titleBase;
    if (!postFolder) {
      return '';
    }
    if (titleFolder === 'hero') {
      return `arichuvadi/hero${ext}`;
    }
    if (titleFolder === 'cover') {
      return `arichuvadi/posts/${postFolder}/images/cover${ext}`;
    }
    return `arichuvadi/posts/${postFolder}/images/${baseName}${ext}`;
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
    return joinBlobPath('ari-reads', `${titleBase}${ext}`);
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
    return joinBlobPath('ari-reviews', titleBase, `${baseName}${ext}`);
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

function resolveExplicitUploadPath(fields, ext) {
  const rawTarget = Array.isArray(fields?.targetPath) ? fields.targetPath[0] : fields?.targetPath;
  const rawPath = Array.isArray(fields?.path) ? fields.path[0] : fields?.path;
  const target = toCleanRelativePath(rawTarget || rawPath || '');
  if (!target) return '';
  return replaceBlobExt(target, ext);
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
    const outputExt = getFileExtension(file);
    const sectionFolder = resolveSectionFolder(section, sectionHref);
    const explicitPath = resolveExplicitUploadPath(fields, outputExt);
    const currentPath = toCleanRelativePath(currentUrl);
    const fileName = explicitPath || (isCleanSectionPath(currentPath, sectionFolder)
      ? replaceBlobExt(currentPath, outputExt)
      : buildBlobPath({ section, sectionHref, title, category, subcategory, baseName, ext: outputExt }));

    if (!fileName && sectionFolder === 'arichuvadi') {
      res.status(400).json({ error: 'Arichuvadi uploads need a post name before they can be stored.' });
      return;
    }

    if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'File too large.' });
      return;
    }

    const fileBuffer = await readFile(file.filepath);
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
        'content-type': file.mimetype || 'application/octet-stream',
      },
      body: fileBuffer,
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


