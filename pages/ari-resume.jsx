import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';
import { readFallbackResumeAssets } from '../lib/resumeAssets';

const DEFAULT_DESCRIPTION = 'Resume building is like a bird building its nest, carefully collecting pieces from different places and shaping them into something meaningful. This document is a small reflection of what Ari brings to the table, and a glimpse into the work, learning, and projects built over the years.';
const DEFAULT_RESUME_DOC_URL = 'https://arihara-sudhan.github.io/resume/resume.pdf';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Resume');
  const hero = link
    ? await getSectionHero(link.id, 'Resume')
    : { heading: 'Resume', description: '', quote: '', imageUrl: '' };
  const fallbackAssets = await readFallbackResumeAssets();
  const resumeImages = Array.isArray(fallbackAssets.pageImageUrls) ? fallbackAssets.pageImageUrls : [];
  const resumeDocUrl = fallbackAssets.pdfUrl || process.env.RESUME_PDF_URL || DEFAULT_RESUME_DOC_URL;

  return {
    props: {
      hero,
      resumeDocUrl,
      resumeImages,
    },
  };
}

export default function ResumePage({ hero, resumeDocUrl, resumeImages }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="resume-title">
          <SectionHero
            heading={hero?.heading || 'Resume'}
            description={hero?.description || DEFAULT_DESCRIPTION}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Resume"
          >
            {hero?.quote ? <p className="clay-play-quote">"{hero.quote}"</p> : null}
          </SectionHero>
          <h1 id="resume-title" style={{ display: 'none' }}>Resume</h1>
        </section>

        <section className="resume-document-section" aria-label="Resume document">
          <div className="resume-document-wrap">
            <a
              className="resume-download-btn"
              href={resumeDocUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Download resume"
              title="Download resume"
            >
              <svg id="Download_from_the_Cloud_24" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" stroke="none" fill="#000000" opacity="0" />
                <g transform="matrix(0.83 0 0 0.83 12 12)">
                  <path
                    style={{
                      stroke: 'none',
                      strokeWidth: 1,
                      strokeDasharray: 'none',
                      strokeLinecap: 'butt',
                      strokeDashoffset: 0,
                      strokeLinejoin: 'miter',
                      strokeMiterlimit: 4,
                      fill: 'rgb(0,0,0)',
                      fillRule: 'nonzero',
                      opacity: 1,
                    }}
                    transform="translate(-12, -12)"
                    d="M 19.355 10.036 C 18.674 6.595 15.641 4 12 4 C 9.108 4 6.603 5.639 5.352 8.036 C 2.343 8.36 0 10.906 0 14 C 0 17.314 2.686 20 6 20 L 19 20 C 21.761 20 24 17.761 24 15 C 24 12.36 21.948 10.221 19.355 10.036 z M 12 18 L 7 13 L 10 13 L 10 9 L 14 9 L 14 13 L 17 13 L 12 18 z"
                  />
                </g>
              </svg>
            </a>
          {Array.isArray(resumeImages) && resumeImages.length > 0 ? (
            <div className="resume-images-list">
              {resumeImages.map((imageUrl, index) => (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={`Resume page ${index + 1}`}
                  className="resume-page-image"
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          ) : (
            <p className="contact-note">Resume page images are not available yet.</p>
          )}
        </div>
      </section>
      </main>
    </div>
  );
}
