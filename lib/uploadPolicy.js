export const SUPABASE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const RESUME_BLOB_MAX_BYTES = 20 * 1024 * 1024;
export const RESUME_PAGE_MAX_FILES = 20;

export const IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const RESUME_PDF_MIME_TYPES = Object.freeze(['application/pdf']);

export const UPLOAD_POLICY_MESSAGES = Object.freeze({
  imageType: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.',
  imageSize: `Image files must be ${formatBytes(SUPABASE_IMAGE_MAX_BYTES)} or smaller.`,
  resumePdfType: 'Unsupported résumé file type. Choose a PDF file.',
  resumePdfSize: `Résumé PDFs must be ${formatBytes(RESUME_BLOB_MAX_BYTES)} or smaller.`,
  resumePageType: 'Unsupported résumé page image type. Use JPEG, PNG, WebP, or GIF.',
  resumePageSize: `Each résumé page image must be ${formatBytes(RESUME_BLOB_MAX_BYTES)} or smaller.`,
  resumePageCount: `Select no more than ${RESUME_PAGE_MAX_FILES} résumé page images.`,
});

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value % (1024 * 1024) === 0) return `${value / (1024 * 1024)} MiB`;
  if (value % 1024 === 0) return `${value / 1024} KiB`;
  return `${value} B`;
}

function fileType(file) {
  return String(file?.type || file?.mimetype || '').trim().toLowerCase();
}

export function validateUploadFile(file, { allowedTypes = [], maxBytes, messageType, messageSize } = {}) {
  if (!file) return { code: 'MISSING_FILE', message: 'Choose a file before uploading.' };
  if (!allowedTypes.includes(fileType(file))) {
    return { code: 'UNSUPPORTED_TYPE', message: messageType || 'Unsupported file type.' };
  }
  if (!Number.isFinite(Number(file.size)) || Number(file.size) < 0) {
    return { code: 'INVALID_SIZE', message: 'The selected file size could not be read.' };
  }
  if (Number(file.size) > maxBytes) {
    return { code: 'FILE_TOO_LARGE', message: messageSize || 'The selected file is too large.' };
  }
  return null;
}

export function validateSupabaseImage(file) {
  return validateUploadFile(file, {
    allowedTypes: IMAGE_MIME_TYPES,
    maxBytes: SUPABASE_IMAGE_MAX_BYTES,
    messageType: UPLOAD_POLICY_MESSAGES.imageType,
    messageSize: UPLOAD_POLICY_MESSAGES.imageSize,
  });
}

export function validateResumePdf(file) {
  return validateUploadFile(file, {
    allowedTypes: RESUME_PDF_MIME_TYPES,
    maxBytes: RESUME_BLOB_MAX_BYTES,
    messageType: UPLOAD_POLICY_MESSAGES.resumePdfType,
    messageSize: UPLOAD_POLICY_MESSAGES.resumePdfSize,
  });
}

export function validateResumePageFiles(files) {
  const input = Array.isArray(files) ? files : [];
  if (input.length > RESUME_PAGE_MAX_FILES) {
    return { code: 'TOO_MANY_FILES', message: UPLOAD_POLICY_MESSAGES.resumePageCount };
  }
  for (let index = 0; index < input.length; index += 1) {
    const error = validateUploadFile(input[index], {
      allowedTypes: IMAGE_MIME_TYPES,
      maxBytes: RESUME_BLOB_MAX_BYTES,
      messageType: UPLOAD_POLICY_MESSAGES.resumePageType,
      messageSize: UPLOAD_POLICY_MESSAGES.resumePageSize,
    });
    if (error) return { ...error, index };
  }
  return null;
}
