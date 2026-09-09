import Header from '../src/components/Header';

const RESUME_PDF_URL = '/resume.pdf';

export default function ResumePage() {
  return (
    <div className="site resume-site">
      <Header subPage />
      <main className="content resume-stage">
        <section className="resume-document-section">
          <div className="resume-document-wrap">
            <div className="resume-download-row">
              <a className="resume-download-btn" href={RESUME_PDF_URL} target="_blank" rel="noreferrer">
                Open Resume PDF
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
