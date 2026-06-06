import { addTestimonial, listTestimonialsForAdmin } from '../../lib/adminData';
import { notifyAdminTestimonialApproval } from '../../lib/formspree';
import { toCleanText } from '../../lib/requestUtils';
import { checkRateLimit, enforceSameOriginWrite } from '../../lib/security';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const testimonials = await listTestimonialsForAdmin({ includePending: false });
      res.status(200).json({ testimonials });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) return;
      const limit = checkRateLimit(req, 'testimonials-form', 8, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const name = toCleanText(req.body?.name, 80);
      const relation = toCleanText(req.body?.relation, 80);
      const testimonial = toCleanText(req.body?.testimonial, 1200);

      if (!testimonial) {
        res.status(400).json({ error: 'Testimonial is required.' });
        return;
      }

      const entry = await addTestimonial({ name, relation, testimonial });
      if (!entry) {
        res.status(400).json({ error: 'Could not submit testimonial.' });
        return;
      }

      await notifyAdminTestimonialApproval({
        name,
        relation,
        testimonial,
      }).catch(() => null);

      res.status(201).json({ ok: true, queued: true, message: 'Testimonial submitted for approval.' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
