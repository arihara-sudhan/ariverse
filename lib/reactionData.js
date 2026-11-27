export async function runPublicMutationMigrations(database) {
  if (!database) throw new Error('A migration database connection is required.');

  await database`
    CREATE TABLE IF NOT EXISTS public_like_submissions (
      idempotency_key TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      section_key TEXT,
      entry_id INTEGER NOT NULL,
      requested_count INTEGER NOT NULL,
      applied_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT public_like_submissions_count_check CHECK (
        requested_count > 0 AND applied_count >= 0 AND applied_count <= requested_count
      )
    )
  `;

  await database`
    CREATE TABLE IF NOT EXISTS ariverse_rate_limits (
      bucket_key TEXT PRIMARY KEY,
      window_started_at TIMESTAMPTZ NOT NULL,
      hit_count INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await database`
    CREATE INDEX IF NOT EXISTS idx_ariverse_rate_limits_updated_at
      ON ariverse_rate_limits(updated_at)
  `;

  await database`
    CREATE OR REPLACE FUNCTION ariverse_content_target_exists(
      p_section_key TEXT,
      p_entry_id INTEGER
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    STABLE
    AS $function$
    BEGIN
      IF p_section_key = 'ari-career' THEN
        RETURN EXISTS (SELECT 1 FROM career_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'ari-read-books' THEN
        RETURN EXISTS (SELECT 1 FROM books_read_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'aris-books' THEN
        RETURN EXISTS (SELECT 1 FROM aris_books_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'aris-shelf' THEN
        RETURN EXISTS (SELECT 1 FROM shelf_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'binomial-names' THEN
        RETURN EXISTS (SELECT 1 FROM binomial_names WHERE id = p_entry_id);
      ELSIF p_section_key = 'book-reviews' THEN
        RETURN EXISTS (SELECT 1 FROM book_reviews_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'clay-play' THEN
        RETURN EXISTS (SELECT 1 FROM clay_play_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'guest-lectures' THEN
        RETURN EXISTS (SELECT 1 FROM guest_lectures_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'kavithaigal' THEN
        RETURN EXISTS (SELECT 1 FROM ariyin_kavithaigal WHERE id = p_entry_id);
      ELSIF p_section_key = 'mini-projects' THEN
        RETURN EXISTS (SELECT 1 FROM mini_projects_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'projects' THEN
        RETURN EXISTS (SELECT 1 FROM projects_entries WHERE id = p_entry_id);
      ELSIF p_section_key = 'arichuvadi' THEN
        RETURN EXISTS (SELECT 1 FROM arichuvadi WHERE id = p_entry_id AND kind = 'post');
      ELSIF p_section_key = 'arizone' THEN
        RETURN EXISTS (SELECT 1 FROM arizone WHERE id = p_entry_id AND kind = 'post');
      ELSIF p_section_key = 'xperiments' THEN
        RETURN EXISTS (SELECT 1 FROM experiments_entries WHERE id = p_entry_id);
      END IF;
      RETURN FALSE;
    END;
    $function$
  `;

  await database`
    CREATE OR REPLACE FUNCTION ariverse_apply_like_submission(
      p_idempotency_key TEXT,
      p_source TEXT,
      p_section_key TEXT,
      p_entry_id INTEGER,
      p_requested_count INTEGER,
      p_person_name TEXT
    )
    RETURNS TABLE(applied_count INTEGER)
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      stored_source TEXT;
      stored_section_key TEXT;
      stored_entry_id INTEGER;
      stored_requested_count INTEGER;
      stored_applied_count INTEGER;
      delta_count INTEGER;
    BEGIN
      IF p_requested_count < 1 OR p_requested_count > 25 THEN
        RAISE EXCEPTION 'LIKE_BATCH_LIMIT_EXCEEDED' USING ERRCODE = '22023';
      END IF;

      IF p_source = 'content' AND NOT ariverse_content_target_exists(p_section_key, p_entry_id) THEN
        RAISE EXCEPTION 'LIKE_TARGET_NOT_FOUND' USING ERRCODE = 'P0002';
      ELSIF p_source = 'book-reviews' AND NOT EXISTS (SELECT 1 FROM book_reviews_entries WHERE id = p_entry_id) THEN
        RAISE EXCEPTION 'LIKE_TARGET_NOT_FOUND' USING ERRCODE = 'P0002';
      ELSIF p_source = 'clay-play' AND NOT EXISTS (SELECT 1 FROM clay_play_entries WHERE id = p_entry_id) THEN
        RAISE EXCEPTION 'LIKE_TARGET_NOT_FOUND' USING ERRCODE = 'P0002';
      END IF;

      INSERT INTO public_like_submissions (
        idempotency_key, source, section_key, entry_id, requested_count, applied_count
      )
      VALUES (
        p_idempotency_key, p_source, p_section_key, p_entry_id, p_requested_count, 0
      )
      ON CONFLICT (idempotency_key) DO UPDATE
      SET requested_count = GREATEST(public_like_submissions.requested_count, EXCLUDED.requested_count),
          updated_at = now()
      WHERE public_like_submissions.source = EXCLUDED.source
        AND public_like_submissions.section_key IS NOT DISTINCT FROM EXCLUDED.section_key
        AND public_like_submissions.entry_id = EXCLUDED.entry_id
      RETURNING
        source, section_key, entry_id, requested_count, applied_count
      INTO stored_source, stored_section_key, stored_entry_id, stored_requested_count, stored_applied_count;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'LIKE_IDEMPOTENCY_KEY_REUSED' USING ERRCODE = '22023';
      END IF;

      delta_count := GREATEST(stored_requested_count - stored_applied_count, 0);
      IF delta_count > 0 THEN
        IF stored_source = 'content' THEN
          INSERT INTO content_entry_likes (section_key, entry_id, person_name)
          SELECT stored_section_key, stored_entry_id, p_person_name
          FROM generate_series(1, delta_count);
        ELSIF stored_source = 'book-reviews' THEN
          INSERT INTO book_reviews_entry_likes (entry_id, person_name)
          SELECT stored_entry_id, p_person_name
          FROM generate_series(1, delta_count);
        ELSIF stored_source = 'clay-play' THEN
          INSERT INTO clay_play_entry_likes (entry_id, person_name)
          SELECT stored_entry_id, p_person_name
          FROM generate_series(1, delta_count);
        ELSE
          RAISE EXCEPTION 'LIKE_SOURCE_NOT_SUPPORTED' USING ERRCODE = '22023';
        END IF;
      END IF;

      UPDATE public_like_submissions
      SET applied_count = stored_requested_count, updated_at = now()
      WHERE idempotency_key = p_idempotency_key;

      RETURN QUERY SELECT stored_requested_count;
    END;
    $function$
  `;
}
