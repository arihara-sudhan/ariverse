export const UPLOAD_METADATA_FAILURE_MESSAGE =
  'The upload completed, but saving its metadata failed. The current published file is unchanged; retry saving this upload instead of uploading it again.';

export const UPLOAD_BATCH_PARTIAL_FAILURE_MESSAGE =
  'Some files uploaded, but the batch did not finish. The current published files are unchanged; retry to continue without re-uploading the completed files.';

export function metadataSaveFailure(uploadedUrl, error = null) {
  return {
    ok: false,
    uploadedUrl: String(uploadedUrl || '').trim(),
    error,
    message: UPLOAD_METADATA_FAILURE_MESSAGE,
  };
}

export function retainSuccessfulBatchUploads(results = []) {
  return (Array.isArray(results) ? results : []).map((result) => (
    result?.status === 'fulfilled' ? String(result.value || '').trim() : ''
  ));
}
