import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SectionHero from './SectionHero';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatHours(minutes = 0) {
  const total = Number(minutes) || 0;
  if (total <= 0) return '0h';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function buildSectionTree(sections = [], parentSectionId = null) {
  return sections
    .filter((section) => Number(section.parentSectionId || 0) === Number(parentSectionId || 0))
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((section) => ({
      ...section,
      children: buildSectionTree(sections, section.id),
    }));
}

function MarkdownBlock({ value = '' }) {
  if (!String(value || '').trim()) return null;
  return (
    <div className="ari-xpands-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(value || '')}</ReactMarkdown>
    </div>
  );
}

function StatsGrid({ stats }) {
  const items = [
    ['Days logged', stats.daysLogged || 0],
    ['Time invested', formatHours(stats.timeSpentMinutes || 0)],
    ['Questions', stats.questions || 0],
    ['Evidence', stats.evidence || 0],
    ['Experiments', stats.experiments || 0],
    ['Milestones done', stats.milestonesCompleted || 0],
  ];

  return (
    <div className="ari-xpands-stats-grid">
      {items.map(([label, value]) => (
        <article key={label} className="ari-xpands-stat-tile">
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}

function hasVisibleActivity(stats = {}) {
  return Object.values(stats).some((value) => Number(value) > 0);
}

function PrimerCard({ label, title, body }) {
  return (
    <article className="ari-xpands-primer-card">
      <span>{label}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function XpandCard({ xpand }) {
  return (
    <Link className="ari-xpand-card" href={`/ari-xpands/${xpand.slug}`}>
      <div className="ari-xpand-card__top">
        <span className="ari-xpand-card__status">{xpand.status}</span>
        {xpand.lastTouched ? <span className="ari-xpand-card__date">{formatDate(xpand.lastTouched)}</span> : null}
      </div>
      <h3>{xpand.title}</h3>
      {xpand.subtitle ? <p>{xpand.subtitle}</p> : null}
      <div className="ari-xpand-card__meta">
        {xpand.startDate ? <span>Started {formatDate(xpand.startDate)}</span> : null}
      </div>
      <div className="ari-xpand-card__stats">
        <span>{xpand.stats.daysLogged || 0} days</span>
        <span>{formatHours(xpand.stats.timeSpentMinutes || 0)}</span>
        <span>{xpand.stats.questions || 0} questions</span>
      </div>
    </Link>
  );
}

export function AriXpandsIndexView({ xpands = [], stats = {}, hero = {} }) {
  const totalStats = {
    daysLogged: stats.totalLoggedDays || 0,
    timeSpentMinutes: Math.round((stats.totalLearningHours || 0) * 60),
    questions: stats.questions || 0,
    evidence: stats.evidence || 0,
    experiments: stats.experiments || 0,
    milestonesCompleted: stats.completedXpands || 0,
  };
  const hasPublicXpands = xpands.length > 0;
  const hasActivity = hasVisibleActivity(totalStats);
  const heroHeading = String(hero?.heading || '').trim() || "#Ari'sXpands";
  const heroDescription = String(hero?.description || '').trim()
    || "A living record of things I'm learning, building, questioning, and exploring.";
  const heroQuote = String(hero?.quote || '').trim();
  const heroImageUrl = String(hero?.imageUrl || '').trim();

  return (
    <main className="content ari-xpands-content">
      <section aria-labelledby="ari-xpands-title">
        <SectionHero
          heading={heroHeading}
          description={heroDescription}
          imageUrl={heroImageUrl}
          fallbackHeading="#Ari'sXpands"
        >
          {heroQuote ? <p className="clay-play-quote">"{heroQuote}"</p> : null}
        </SectionHero>
        <h1 id="ari-xpands-title" style={{ display: 'none' }}>ARI XPands</h1>
      </section>

      {hasPublicXpands || hasActivity ? (
        <StatsGrid stats={totalStats} />
      ) : (
        <section className="ari-xpands-primer-grid" aria-label="What an Xpand tracks">
          <PrimerCard
            label="1"
            title="Progress before polish"
            body="An Xpand can start as rough notes, field logs, or partial experiments. It does not need to become an essay before it is real."
          />
          <PrimerCard
            label="2"
            title="Questions stay attached"
            body="Open threads, uncertainty, and failed attempts live beside the work instead of getting cleaned out of the public record."
          />
          <PrimerCard
            label="3"
            title="Evidence over vibes"
            body="Links, screenshots, milestones, resources, and logs make the page useful even when the larger journey is still unfolding."
          />
        </section>
      )}

      <section className="ari-xpands-index-section">
        <div className="ari-xpands-index-head">
          <div>
            <p className="eyebrow">Published journeys</p>
            <h2>{hasPublicXpands ? 'All XPands' : 'First publication pending'}</h2>
          </div>
          <p>{hasPublicXpands ? `${xpands.length} public journeys` : 'The public shelf is ready.'}</p>
        </div>
        {hasPublicXpands ? (
          <div className="ari-xpands-grid">
            {xpands.map((xpand) => (
              <XpandCard key={xpand.id} xpand={xpand} />
            ))}
          </div>
        ) : (
          <div className="ari-xpands-empty ari-xpands-empty--feature">
            <div>
              <h3>No public XPands yet.</h3>
              <p>
                The first published Xpand will turn this into a live shelf of work, notes, experiments, and questions instead of an empty placeholder.
              </p>
            </div>
            <div className="ari-xpands-empty__rail">
              <span>Ready now</span>
              <ul className="ari-xpands-empty__list">
                <li>Public detail pages already support logs, evidence, resources, and milestones.</li>
                <li>The hero section is editable from admin like the other major pages.</li>
                <li>The index will populate itself as soon as one Xpand is made public.</li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function TimelineEntry({ event }) {
  if (event.kind === 'log') {
    const log = event.payload || {};
    return (
      <article className="ari-xpands-timeline-item">
        <span className="ari-xpands-timeline-item__label">Log</span>
        <h4>{log.title || 'Daily log'}</h4>
        {log.learned?.length > 0 ? <p><strong>Learned:</strong> {log.learned.join(' / ')}</p> : null}
        {log.done?.length > 0 ? <p><strong>Done:</strong> {log.done.join(' / ')}</p> : null}
        {log.questions?.length > 0 ? <p><strong>Questions:</strong> {log.questions.join(' / ')}</p> : null}
        {log.failed?.length > 0 ? <p><strong>Failed:</strong> {log.failed.join(' / ')}</p> : null}
        {log.blockers?.length > 0 ? <p><strong>Blockers:</strong> {log.blockers.join(' / ')}</p> : null}
        {log.next?.length > 0 ? <p><strong>Next:</strong> {log.next.join(' / ')}</p> : null}
        {log.freeformNote ? <MarkdownBlock value={log.freeformNote} /> : null}
      </article>
    );
  }

  return (
    <article className="ari-xpands-timeline-item">
      <span className="ari-xpands-timeline-item__label">{event.label}</span>
      <h4>{event.title}</h4>
      {event.body ? <MarkdownBlock value={event.body} /> : null}
    </article>
  );
}

function StructureTree({ sections = [] }) {
  const tree = buildSectionTree(sections);
  if (tree.length === 0) return null;

  const renderNodes = (nodes) => (
    <ul className="ari-xpands-structure-tree">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="ari-xpands-structure-node">
            <strong>{node.title}</strong>
            <span>{node.status}</span>
          </div>
          {node.description ? <p>{node.description}</p> : null}
          {node.children.length > 0 ? renderNodes(node.children) : null}
        </li>
      ))}
    </ul>
  );

  return renderNodes(tree);
}

export function AriXpandDetailView({ xpand }) {
  const latestLog = xpand.logs?.[0] || null;
  const openQuestions = (xpand.notes || []).filter(
    (note) => note.kind === 'question' && note.status !== 'answered' && note.status !== 'abandoned',
  );

  return (
    <main className="content ari-xpands-content">
      <section className="ari-xpands-detail-hero">
        <div className="ari-xpands-detail-hero__copy">
          <p className="eyebrow">
            <Link href="/ari-xpands">ARI XPands</Link> / {xpand.slug}
          </p>
          <h1>{xpand.title}</h1>
          {xpand.subtitle ? <p className="ari-xpands-detail-hero__subtitle">{xpand.subtitle}</p> : null}
          <div className="ari-xpands-detail-hero__meta">
            <span>{xpand.status}</span>
            {xpand.startDate ? <span>Started {formatDate(xpand.startDate)}</span> : null}
            {xpand.lastTouched ? <span>Last touched {formatDate(xpand.lastTouched)}</span> : null}
          </div>
          {xpand.description ? <MarkdownBlock value={xpand.description} /> : null}
        </div>
        {xpand.coverImage ? (
          <div className="ari-xpands-detail-hero__cover">
            <img src={xpand.coverImage} alt={xpand.title} />
          </div>
        ) : null}
      </section>

      <StatsGrid stats={xpand.stats || {}} />

      <section className="ari-xpands-detail-section">
        <h2>Latest</h2>
        {latestLog ? (
          <TimelineEntry event={{ kind: 'log', payload: latestLog }} />
        ) : (
          <div className="ari-xpands-empty">
            <h3>Nothing logged yet.</h3>
            <p>This Xpand exists. Its timeline has not started publicly yet.</p>
          </div>
        )}
      </section>

      {xpand.timeline?.length > 0 ? (
        <section className="ari-xpands-detail-section">
          <h2>Timeline</h2>
          <div className="ari-xpands-timeline">
            {xpand.timeline.map((event) => (
              <div key={event.id} className="ari-xpands-timeline-row">
                <div className="ari-xpands-timeline-date">{formatDate(event.date)}</div>
                <TimelineEntry event={event} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

        {openQuestions.length > 0 ? (
          <section className="ari-xpands-detail-section">
            <h2>Open Questions</h2>
            <div className="ari-xpands-stack">
              {openQuestions.map((question) => (
                <article key={question.id} className="ari-xpands-note-card">
                  <span>{question.status || 'open'}</span>
                  <MarkdownBlock value={question.content} />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {xpand.milestones?.length > 0 ? (
          <section className="ari-xpands-detail-section">
            <h2>Milestones</h2>
            <div className="ari-xpands-stack">
              {xpand.milestones.map((milestone) => (
                <article key={milestone.id} className="ari-xpands-compact-card">
                  <div>
                    <strong>{milestone.title}</strong>
                    <span>{milestone.status}</span>
                  </div>
                  {milestone.description ? <p>{milestone.description}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {xpand.evidence?.length > 0 ? (
          <section className="ari-xpands-detail-section">
            <h2>Evidence</h2>
            <div className="ari-xpands-stack">
              {xpand.evidence.map((item) => (
                <article key={item.id} className="ari-xpands-compact-card">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.type}</span>
                  </div>
                  {item.description ? <p>{item.description}</p> : null}
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Open evidence
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {xpand.resources?.length > 0 ? (
          <section className="ari-xpands-detail-section">
            <h2>Resources</h2>
            <div className="ari-xpands-stack">
              {xpand.resources.map((item) => (
                <article key={item.id} className="ari-xpands-compact-card">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.status}</span>
                  </div>
                  {item.notes ? <p>{item.notes}</p> : null}
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Open resource
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {xpand.experiments?.length > 0 ? (
          <section className="ari-xpands-detail-section">
            <h2>Experiments</h2>
            <div className="ari-xpands-stack">
              {xpand.experiments.map((experiment) => (
                <article key={experiment.id} className="ari-xpands-compact-card">
                  <div>
                    <strong>{experiment.title}</strong>
                    <span>{experiment.status}</span>
                  </div>
                  {experiment.question ? <p><strong>Question:</strong> {experiment.question}</p> : null}
                  {experiment.result ? <p><strong>Result:</strong> {experiment.result}</p> : null}
                  {experiment.failureAnalysis ? <p><strong>Failure analysis:</strong> {experiment.failureAnalysis}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {xpand.sections?.length > 0 ? (
          <section className="ari-xpands-detail-section">
            <h2>Structure</h2>
            <StructureTree sections={xpand.sections} />
          </section>
        ) : null}
    </main>
  );
}
