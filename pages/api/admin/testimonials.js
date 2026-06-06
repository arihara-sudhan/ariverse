import { deleteTestimonial, listTestimonialsForAdmin, updateTestimonialForAdmin } from '../../../lib/adminData';
import { isAdminRequest } from '../../../lib/adminAuth';
import { toCleanText, toPositiveInt } from '../../../lib/requestUtils';
import { enforceSameOriginWrite } from '../../../lib/security';

export default async function handler(req, res) {
  try {
    if (!isAdminRequest(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      const testimonials = await listTestimonialsForAdmin({ includePending: true });
      res.status(200).json({ testimonials });
      return;
    }

    if (req.method === 'PATCH') {
      if (!enforceSameOriginWrite(req, res)) return;
      const id = toPositiveInt(req.body?.id);
      const name = typeof req.body?.name === 'string' ? toCleanText(req.body.name, 80) : null;
      const relation = typeof req.body?.relation === 'string' ? toCleanText(req.body.relation, 80) : null;
      const testimonial = typeof req.body?.testimonial === 'string' ? toCleanText(req.body.testimonial, 1200) : null;
      const status = toCleanText(req.body?.status, 20).toLowerCase();

      if (!id) {
        res.status(400).json({ error: 'Invalid testimonial update payload.' });
        return;
      }

      const updated = await updateTestimonialForAdmin({
        id,
        name,
        relation,
        testimonial,
        status,
      });
      res.status(200).json({ ok: true, testimonial: updated });
      return;
    }

    if (req.method === 'DELETE') {
      if (!enforceSameOriginWrite(req, res)) return;
      const id = toPositiveInt(req.body?.id);
      if (!id) {
        res.status(400).json({ error: 'Invalid delete payload.' });
        return;
      }
      await deleteTestimonial({ id });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
