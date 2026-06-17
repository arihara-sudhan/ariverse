import Header from '../src/components/Header';
import { getProfileLinkByLabel, getResumeAssets } from '../lib/adminData';
import { toPublicStorageUrl } from '../lib/storage';

const RESUME_PAGE_FALLBACK_URLS = [
  toPublicStorageUrl('ari-resume/f30b9869-0280-4242-9df4-f69c160dc7d4-0.webp'),
  toPublicStorageUrl('ari-resume/f30b9869-0280-4242-9df4-f69c160dc7d4-1.webp'),
  toPublicStorageUrl('ari-resume/f30b9869-0280-4242-9df4-f69c160dc7d4-2.webp'),
  toPublicStorageUrl('ari-resume/f30b9869-0280-4242-9df4-f69c160dc7d4-3.webp'),
].filter(Boolean);
const RESUME_PDF_FALLBACK_URL = toPublicStorageUrl('ari-resume/resume.pdf');

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Resume');
  const resumeAsset = link ? await getResumeAssets(link.id) : null;

  return {
    props: {
      resumeAsset,
    },
  };
}

export default function ResumePage({ resumeAsset }) {
  const pageImageUrls = Array.isArray(resumeAsset?.pageImageUrls)
    ? resumeAsset.pageImageUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  const resolvedPageImageUrls = pageImageUrls.length > 0 ? pageImageUrls : RESUME_PAGE_FALLBACK_URLS;
  const pdfUrl = String(resumeAsset?.pdfUrl || '').trim() || RESUME_PDF_FALLBACK_URL;
  const hasPdf = Boolean(pdfUrl);

  return (
    <div className="site resume-site">
      <Header subPage />
      <main className="content resume-stage">
        <section className="resume-document-section">
          <div className="resume-document-wrap">
            {resolvedPageImageUrls.length > 0 ? (
              <div className="resume-images-list">
                {resolvedPageImageUrls.map((url, index) => (
                  <figure key={`${url}-${index}`} className="resume-page-frame">
                    <img
                      className="resume-page-image"
                      src={url}
                      alt={`Resume page ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </figure>
                ))}
              </div>
            ) : (
              <div className="resume-empty-state">
                <p className="contact-note">No resume page images have been uploaded yet.</p>
              </div>
            )}

            {hasPdf ? (
              <div className="resume-download-row">
                <a className="resume-download-btn" href="/api/resume-download">
                  Download PDF
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
