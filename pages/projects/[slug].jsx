import Link from 'next/link';
import Header from '../../src/components/Header';
import { listProjectEntries } from '../../lib/adminData';

function slugify(input) {
  return (
    String(input || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

function toLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/^[\-\u2022\*\d\.\)\s]+/, '').trim())
    .filter(Boolean);
}

export async function getServerSideProps({ params }) {
  const projects = await listProjectEntries();
  const slug = String(params?.slug || '');
  const project = (projects || []).find((item) => slugify(item.title) === slug) || null;
  if (!project) return { notFound: true };
  return { props: { project } };
}

export default function ProjectDetailPage({ project }) {
  const lines = toLines(project?.caption);
  const summary = lines.slice(0, 3);
  const learnings = lines.length > 0 ? lines : ['More learnings will be added soon.'];

  return (
    <div className="site">
      <Header subPage />
      <main className="content project-detail-page">
        <section className="project-detail-hero">
          <div className="project-detail-hero-left">
            <p className="project-detail-kicker">{project?.category || 'Project'}</p>
            <h1>{project?.title || 'Project'}</h1>
            <div className="project-detail-actions">
              <Link href="/projects" className="project-detail-btn primary">View Projects</Link>
              <a href="#what-i-learned" className="project-detail-btn">Read Full Writeup</a>
            </div>
          </div>
          <div className="project-detail-hero-right">
            {project?.logo ? (
              <img src={project.logo} alt={project.title || 'Project image'} />
            ) : (
              <div className="project-detail-image-placeholder">No Image</div>
            )}
          </div>
        </section>

        <section className="project-detail-overview">
          <h2>Overview &amp; Methodology</h2>
          {summary.map((line, idx) => (
            <p key={`${line}-${idx}`}>{line}</p>
          ))}
        </section>

        <section id="what-i-learned" className="project-detail-learnings">
          <h2>What I learned</h2>
          <ul>
            {learnings.map((line, idx) => (
              <li key={`${line}-${idx}`}>
                <span aria-hidden="true">★</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

