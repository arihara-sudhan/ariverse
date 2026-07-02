import { isAdminRequest } from '../../../lib/adminAuth';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';
import { buildArichuvadiPathsFromDraft, createArichuvadiPost, listArichuvadiAdminPosts, listArichuvadiCategories } from '../../../lib/arichuvadiAdmin';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const [posts, categories] = await Promise.all([listArichuvadiAdminPosts(), listArichuvadiCategories()]);
      res.status(200).json({ posts, categories });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const limit = checkRateLimit(req, 'admin-arichuvadi-create', 20, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const draft = req.body || {};
      const paths = buildArichuvadiPathsFromDraft(draft);
      const created = await createArichuvadiPost({
        ...draft,
        ...paths,
      });

      if (!created) {
        res.status(500).json({ error: 'Could not create அரிச்சுவடி post.' });
        return;
      }

      res.status(201).json({ ok: true, post: created });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
