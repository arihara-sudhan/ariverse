import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_TARGET_TABLES,
  likeSubmissionDelta,
  isPendingCommentOwner,
  normalizeLikeBatchCount,
  replyTargetMatches,
} from '../lib/publicMutationPolicy.js';
import { runPublicMutationMigrations } from '../lib/reactionData.js';
import {
  PUBLIC_CONTENT_STATUS,
  loadPublicContent,
  throwIfPublicContentUnavailable,
} from '../lib/publicContent.js';
import {
  PUBLIC_REFRESH_FAILURE_MESSAGE,
  publicPathsForBlogPost,
  publicPathsForLinkItem,
  revalidatePublicPaths,
} from '../lib/publicRevalidation.js';
import {
  RESUME_BLOB_MAX_BYTES,
  RESUME_PAGE_MAX_FILES,
  SUPABASE_IMAGE_MAX_BYTES,
  validateResumePageFiles,
  validateResumePdf,
  validateSupabaseImage,
} from '../lib/uploadPolicy.js';
import {
  UPLOAD_BATCH_PARTIAL_FAILURE_MESSAGE,
  UPLOAD_METADATA_FAILURE_MESSAGE,
  metadataSaveFailure,
  retainSuccessfulBatchUploads,
} from '../lib/uploadRecovery.js';

test('like batches accept legitimate counts and reject oversized submissions', () => {
  assert.equal(normalizeLikeBatchCount(1), 1);
  assert.equal(normalizeLikeBatchCount(25), 25);
  assert.equal(normalizeLikeBatchCount(26), null);
  assert.equal(normalizeLikeBatchCount('26'), null);
});

test('idempotency retries apply only the unapplied delta, including concurrent-style repeats', () => {
  assert.equal(likeSubmissionDelta(0, 5), 5);
  assert.equal(likeSubmissionDelta(5, 5), 0);
  assert.equal(likeSubmissionDelta(5, 7), 2);
  assert.equal(likeSubmissionDelta(7, 5), 0);
});

test('content target sections and comment ownership contracts remain explicit', () => {
  assert.equal(CONTENT_TARGET_TABLES.projects, 'projects_entries');
  assert.equal(CONTENT_TARGET_TABLES.arizone, 'arizone');
  assert.equal(CONTENT_TARGET_TABLES.kavithaigal, 'ariyin_kavithaigal');
  assert.equal(CONTENT_TARGET_TABLES['missing-section'], undefined);
  assert.equal(isPendingCommentOwner({ status: 'pending', storedToken: 'same', providedToken: 'same' }), true);
  assert.equal(isPendingCommentOwner({ status: 'green', storedToken: 'same', providedToken: 'same' }), false);
  assert.equal(isPendingCommentOwner({ status: 'pending', storedToken: 'same', providedToken: 'other' }), false);
  assert.equal(replyTargetMatches('projects:10', 'projects:10'), true);
  assert.equal(replyTargetMatches('projects:10', 'projects:11'), false);
});

test('migration contract includes the shared rate-limit and atomic like primitives', async () => {
  const queries = [];
  const fakeDatabase = (strings, ...values) => {
    queries.push(strings.join('?'));
    void values;
    return Promise.resolve([]);
  };
  await runPublicMutationMigrations(fakeDatabase);
  const source = queries.join('\n');
  assert.match(source, /CREATE TABLE IF NOT EXISTS public_like_submissions/i);
  assert.match(source, /CREATE TABLE IF NOT EXISTS ariverse_rate_limits/i);
  assert.match(source, /CREATE OR REPLACE FUNCTION ariverse_apply_like_submission/i);
  assert.match(source, /ON CONFLICT \(idempotency_key\) DO UPDATE/i);
  assert.match(source, /GREATEST\(stored_requested_count - stored_applied_count, 0\)/i);
  assert.match(source, /ariverse_content_target_exists/i);
});

test('public loaders distinguish missing content from transient database failures', async () => {
  const missing = await loadPublicContent(async () => null);
  assert.equal(missing.status, PUBLIC_CONTENT_STATUS.MISSING);

  const databaseError = new Error('temporary database outage');
  const unavailable = await loadPublicContent(async () => {
    throw databaseError;
  });
  assert.equal(unavailable.status, PUBLIC_CONTENT_STATUS.UNAVAILABLE);
  assert.equal(unavailable.error, databaseError);
  assert.throws(() => throwIfPublicContentUnavailable(unavailable), databaseError);

  const found = await loadPublicContent(async () => ({ slug: 'published-post' }));
  assert.equal(found.status, PUBLIC_CONTENT_STATUS.FOUND);
  assert.deepEqual(found.value, { slug: 'published-post' });
});

test('blog revalidation covers listing, new detail, and old detail paths', () => {
  assert.deepEqual(
    publicPathsForBlogPost('arizone', { slug: 'new-title' }, 'old-title'),
    ['/arizone', '/arizone/old-title', '/arizone/new-title'],
  );
  assert.deepEqual(
    publicPathsForLinkItem({ href: '/projects' }, { kavithaiFrom: 'New Project' }, { kavithaiFrom: 'Old Project' }),
    ['/', '/projects', '/projects/old-project', '/projects/new-project'],
  );
});

test('a saved mutation remains successful when on-demand refresh fails', async () => {
  const attempted = [];
  const refresh = await revalidatePublicPaths(
    {
      async revalidate(path) {
        attempted.push(path);
        if (path.endsWith('/old-title')) {
          const error = new Error('refresh failed');
          error.code = 'E_REFRESH';
          throw error;
        }
      },
    },
    publicPathsForBlogPost('arichuvadi', { slug: 'new-title' }, 'old-title'),
  );

  assert.deepEqual(attempted, ['/arichuvadi', '/arichuvadi/old-title', '/arichuvadi/new-title']);
  assert.equal(refresh.ok, false);
  assert.deepEqual(refresh.failedPaths, ['/arichuvadi/old-title']);
  assert.equal(refresh.message, PUBLIC_REFRESH_FAILURE_MESSAGE);
});

test('upload policies accept exact boundaries and reject oversized or unsupported files', () => {
  assert.equal(validateSupabaseImage({ type: 'image/webp', size: SUPABASE_IMAGE_MAX_BYTES }), null);
  assert.equal(validateSupabaseImage({ type: 'image/webp', size: SUPABASE_IMAGE_MAX_BYTES + 1 })?.code, 'FILE_TOO_LARGE');
  assert.equal(validateSupabaseImage({ type: 'image/svg+xml', size: 10 })?.code, 'UNSUPPORTED_TYPE');
  assert.equal(validateResumePdf({ type: 'application/pdf', size: RESUME_BLOB_MAX_BYTES }), null);
  assert.equal(validateResumePdf({ type: 'application/pdf', size: RESUME_BLOB_MAX_BYTES + 1 })?.code, 'FILE_TOO_LARGE');
  assert.equal(validateResumePageFiles(Array.from({ length: RESUME_PAGE_MAX_FILES }, () => ({ type: 'image/png', size: 1 }))), null);
  assert.equal(validateResumePageFiles(Array.from({ length: RESUME_PAGE_MAX_FILES + 1 }, () => ({ type: 'image/png', size: 1 })))?.code, 'TOO_MANY_FILES');
});

test('partial batches retain completed uploads without replacing published media', () => {
  const retained = retainSuccessfulBatchUploads([
    { status: 'fulfilled', value: 'https://blob.example/page-1.png' },
    { status: 'rejected', reason: new Error('provider unavailable') },
    { status: 'fulfilled', value: 'https://blob.example/page-3.png' },
  ]);
  assert.deepEqual(retained, ['https://blob.example/page-1.png', '', 'https://blob.example/page-3.png']);
  assert.match(UPLOAD_BATCH_PARTIAL_FAILURE_MESSAGE, /current published files are unchanged/);
});

test('metadata-save failure preserves the uploaded URL for a safe retry', () => {
  const failure = metadataSaveFailure('https://blob.example/new-resume.pdf', new Error('database unavailable'));
  assert.equal(failure.ok, false);
  assert.equal(failure.uploadedUrl, 'https://blob.example/new-resume.pdf');
  assert.equal(failure.error.message, 'database unavailable');
  assert.equal(failure.message, UPLOAD_METADATA_FAILURE_MESSAGE);
});
