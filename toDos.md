## Performance and system design audit

Priority order for making the site feel fast and keeping the system maintainable:

1. Move database schema and migration work out of public read paths.
   - `lib/adminData.js`, `lib/arichuvadiData.js`, `lib/arizoneData.js`, and `lib/newsletter.js` run `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, advisory locks, or legacy migration checks from request/build-time data functions.
   - Keep these in one explicit migration script or admin-only setup command. Public reads should only read data, otherwise cold starts and ISR rebuilds pay schema costs.

2. Add shared read caches for section metadata and blog category maps.
   - `getProfileLinkByLabel`, `getSectionHero`, `listArichuvadiPosts`, `listArichuvadiCategories`, `listArizonePosts`, and `listArizoneCategories` are called repeatedly across SSG pages and API handlers.
   - Cache stable lookup tables per process with a short TTL and invalidate them after admin writes. This removes repeated Neon round trips during static generation and request bursts.

3. Batch comment loading for public list pages.
   - `pages/clay-play.jsx`, `pages/guest-lectures.jsx`, and `pages/binomial-names.jsx` load comments with one query per entry.
   - Add a `listContentCommentsForEntries({ sectionKey, entryIds })` query and group results in memory. This avoids N+1 queries as entries grow.

4. Make blog detail lookups O(1) and avoid broad fallback scans.
   - `getArichuvadiPostBySlug` and `getArizonePostBySlug` fetch all posts as a fallback and scan in JS when slug lookup misses.
   - Add normalized title/slug lookup support in SQL, or remove fallback after data cleanup. Detail pages should not query every post for one slug.

5. Stop mutating global `marked` options during render.
   - `lib/arichuvadiData.js` and `lib/arizoneData.js` call `marked.setOptions`, which changes parser state globally.
   - Use separate `Marked` instances or local parser options per render so concurrent requests cannot leak poem/blog formatting rules into each other.

6. Use optimized image delivery on public pages.
   - Most public pages use raw `<img>` tags for Supabase/blob images; several hero/above-the-fold images are eager.
   - Configure `next/image` remote patterns for Supabase and Vercel Blob, then migrate public hero/card/gallery images to fixed dimensions or responsive `sizes`. Keep raw `<img>` only where markdown HTML requires it.

7. Reduce home page boot blocking.
   - `pages/index.jsx` hides main content until multiple images are preloaded and then fetches testimonials on mount.
   - Show the first viewport after the critical hero image only, lazy-load non-critical testimonial/feature media, and consider moving approved testimonials into `getStaticProps`.

8. Increase ISR duration for mostly static content.
   - `lib/pageCache.js` currently revalidates public pages every 60 seconds.
   - Use longer defaults for portfolio/blog pages and trigger manual/on-demand revalidation after admin edits. This lowers rebuild frequency and database load.

9. Add targeted database indexes for actual access patterns.
   - Add compound indexes for common public queries: `profile_links(label)`, `profile_links(href)`, `profile_links(is_hidden, sort_order, id)`, content comments by `(section_key, entry_id, status, created_at DESC, id DESC)`, and blog rows by `(kind, slug, is_published)`.
   - Check Neon query plans before and after, especially for comments, reactions, and blog detail pages.

10. Split the large admin data module by bounded context.
    - `lib/adminData.js` mixes schema initialization, profile links, content entries, comments, likes, testimonials, feature images, and resume assets.
    - Split into domain modules with shared DB/bootstrap helpers. This will make caching, migrations, and test coverage safer to evolve.

11. Add performance checks to the normal workflow.
    - Add Lighthouse or `next build` bundle reporting for public pages, and track DB query counts for `getStaticProps`/`getServerSideProps`.
    - Use the output to prevent regressions before adding more sections.

2. PAGINATION FOR APT PAGES
6. Index in Google
7. Qn Polling section
1. skillset: broken svgs, add photoshop
2. in /ari_career, need heart emoji for liking
4. tweets
9. slow rendering of svg icons in http://localhost:3000/ariyin-kavithaigal?id=1
12. like options as well
13. check hardcoded stuffs in data
14. need filter categories for http://localhost:3000/aris-xperiments: after hero All, DL- Computer Vision
15. REMOVE LOCALLY
 create mode 100644 public/generated/resume/05ed8882157ce3c7/manifest.json
 create mode 100644 public/generated/resume/05ed8882157ce3c7/page-1.png
 create mode 100644 public/generated/resume/05ed8882157ce3c7/page-2.png
 create mode 100644 public/generated/resume/05ed8882157ce3c7/page-3.png
 create mode 100644 public/generated/resume/05ed8882157ce3c7/page-4.png
 create mode 100644 public/generated/resume/05ed8882157ce3c7/source.pdf
 Keep only on blobs for each generations and write over
 16. Internalizing Thirukkural & Blog
 17. Testimonials
