import Header from '../../src/components/Header';
import LikeButton from '../../src/components/LikeButton';
import DiscussionThread from '../../src/components/DiscussionThread';
import { getProjectEntryBySlug, listContentEntryReactions, listProjectComments } from '../../lib/adminData';

function toLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/^[\-\u2022\*\d\.\)\s]+/, '').trim())
    .filter(Boolean);
}

function renderReadme(text) {
  function renderInlineMarkdown(line, keyPrefix) {
    const tokens = String(line || '').split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return <strong key={`${keyPrefix}-b-${idx}`}>{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return <em key={`${keyPrefix}-i-${idx}`}>{token.slice(1, -1)}</em>;
      }
      if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
        return <code key={`${keyPrefix}-c-${idx}`}>{token.slice(1, -1)}</code>;
      }
      return <span key={`${keyPrefix}-t-${idx}`}>{token}</span>;
    });
  }

  const rawLines = String(text || '').split('\n');
  return rawLines
    .map((raw, idx) => {
      const line = String(raw || '').trim();
      if (!line) return null;
      if (line.startsWith('[LINKEDIN_POST_URL]')) {
        const url = line.replace('[LINKEDIN_POST_URL]', '').trim();
        const isLinkedInEmbed = /^https:\/\/www\.linkedin\.com\/embed\/feed\/update\/urn:li:[a-zA-Z]+:\d+/.test(url);
        if (!isLinkedInEmbed) {
          return <p key={`md-linkedin-invalid-${idx}`}>Invalid LinkedIn embed URL.</p>;
        }
        return (
          <div key={`md-linkedin-${idx}`} className="project-linkedin-embed">
            <iframe
              src={url}
              title={`linkedin-post-${idx}`}
              width="100%"
              height="620"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        );
      }
      if (line.startsWith('### ')) return <h4 key={`md-h4-${idx}`}>{renderInlineMarkdown(line.slice(4).trim(), `md-h4-${idx}`)}</h4>;
      if (line.startsWith('## ')) return <h3 key={`md-h3-${idx}`}>{renderInlineMarkdown(line.slice(3).trim(), `md-h3-${idx}`)}</h3>;
      if (line.startsWith('# ')) return <h2 key={`md-h2-${idx}`}>{renderInlineMarkdown(line.slice(2).trim(), `md-h2-${idx}`)}</h2>;
      return <p key={`md-p-${idx}`}>{renderInlineMarkdown(line, `md-p-${idx}`)}</p>;
    })
    .filter(Boolean);
}

export async function getServerSideProps({ params }) {
  const slug = String(params?.slug || '');
  const project = await getProjectEntryBySlug(slug);
  if (!project) return { notFound: true };
  const [comments, likesByEntry] = await Promise.all([
    listProjectComments(project.id),
    listContentEntryReactions({
      sectionKey: 'projects',
      entryIds: [project.id],
    }),
  ]);
  return { props: { project, comments, likesByEntry } };
}

export default function ProjectDetailPage({ project, comments, likesByEntry }) {
  const shortLines = toLines(project?.caption);
  const readmeContent = String(project?.bigDescription || project?.caption || '');
  const summary = shortLines.slice(0, 3);
  const legendNodes = renderReadme(readmeContent);

  return (
    <div className="site">
      <Header subPage />
      <main className="content project-detail-page">
        <section className="project-detail-hero">
          <div className="project-detail-hero-left">
            <p className="project-detail-kicker">{project?.category || 'Project'}</p>
            <h1>{project?.title || 'Project'}</h1>
            {summary.map((line, idx) => (
              <p key={`overview-${line}-${idx}`}>{line}</p>
            ))}
            {Array.isArray(project?.projectTags) && project.projectTags.length > 0 ? (
              <div className="projects-skill-tags" aria-label="Skills used">
                {project.projectTags.map((tag) => (
                  <span key={`${project?.id || project?.title}-${tag}`} className="projects-skill-tag">{tag}</span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="project-detail-hero-right">
            {project?.logo ? (
              <img src={project.logo} alt={project.title || 'Project image'} />
            ) : (
              <div className="project-detail-image-placeholder">No Image</div>
            )}
          </div>
          <div className="project-legend-full">
            <hr className="project-legend-rule" />
            {legendNodes.length > 0 ? legendNodes : <p>More learnings will be added soon.</p>}
            <LikeButton
              endpoint="/api/content/reactions"
              entryId={project.id}
              initialCount={likesByEntry?.[project.id]?.likesCount || 0}
              storageNamespace="projects"
              className="project-detail-like"
            />
            <DiscussionThread
              title="Comments"
              endpoint="/api/projects/comments"
              itemId={project.id}
              itemIdField="projectEntryId"
              initialComments={comments}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
