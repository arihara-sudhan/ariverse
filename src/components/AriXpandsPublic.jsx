import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatReadableDate } from '../../lib/ariXpandsCore.mjs';
import SectionHero from './SectionHero';

function formatDate(value) {
  return formatReadableDate(value, { timeZone: 'Asia/Kolkata' });
}

function formatMonthLabel(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ''))) return '';
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function excerptText(value, maxLength = 170) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function buildMonthHref(slug, monthKey) {
  return monthKey ? `/ari-xpands/${slug}?month=${monthKey}` : `/ari-xpands/${slug}`;
}

function MarkdownBlock({ value = '' }) {
  if (!String(value || '').trim()) return null;
  return (
    <div className="ari-xpands-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(value || '')}</ReactMarkdown>
    </div>
  );
}

function XpandCard({ xpand }) {
  const summary = xpand.subtitle || excerptText(xpand.description);

  return (
    <Link className="ari-xpand-list-card" href={`/ari-xpands/${xpand.slug}`}>
      {xpand.coverImage ? (
        <div className="ari-xpand-list-card__media">
          <img src={xpand.coverImage} alt={xpand.title} />
        </div>
      ) : null}
      <div className="ari-xpand-list-card__copy">
        <h2>{xpand.title}</h2>
        {summary ? <p>{summary}</p> : null}
      </div>
    </Link>
  );
}

function SnippetList({ label, items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className="ari-xpand-snippet__group">
      <h3>{label}</h3>
      <ul>
        {items.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function LogSnippet({ log }) {
  const outcome = Array.isArray(log.failed) && log.failed.length > 0 ? 'failure' : 'success';
  const outcomeLabel = outcome === 'failure' ? 'Failure' : 'Success';
  const noteText = String(log.freeformNote || log.summary || '').trim();

  return (
    <article className={`ari-xpand-snippet ari-xpand-snippet--${outcome}`}>
      <div className="ari-xpand-snippet__head">
        <span className={`ari-xpand-snippet__status ari-xpand-snippet__status--${outcome}`}>{outcomeLabel}</span>
        <span>{formatDate(log.date)}</span>
      </div>
      <div className="ari-xpand-snippet__body">
        {noteText ? <p className="ari-xpand-snippet__summary">{noteText}</p> : <p className="ari-xpand-snippet__summary">No note for this day.</p>}
      </div>
    </article>
  );
}

function MonthPagination({ slug, months = [], selectedMonth = '' }) {
  if (!Array.isArray(months) || months.length === 0) return null;

  return (
    <div className="ari-xpands-month-nav">
      <div className="ari-xpands-month-nav__list">
        {months.map((entry) => (
          <Link
            key={entry.monthKey}
            href={buildMonthHref(slug, entry.monthKey)}
            className={entry.monthKey === selectedMonth ? 'is-active' : ''}
          >
            {formatMonthLabel(entry.monthKey)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AriXpandsIndexView({ xpands = [], hero = {} }) {
  const heroHeading = String(hero?.heading || '').trim() || "#Ari'sXpands";
  const heroDescription = String(hero?.description || '').trim()
    || "A living record of things I'm learning, building, questioning, and exploring.";
  const heroQuote = String(hero?.quote || '').trim();
  const heroImageUrl = String(hero?.imageUrl || '').trim();
  const hasXpands = xpands.length > 0;

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

      <section className="ari-xpands-index-section">
        {hasXpands ? (
          <div className="ari-xpands-list">
            {xpands.map((xpand) => (
              <XpandCard key={xpand.id} xpand={xpand} />
            ))}
          </div>
        ) : (
          <article className="ari-xpands-empty-state">
            <h2>Nothing public yet.</h2>
            <p>The first published xpand will show up here as a clean catalog item with its own monthly snippet pages.</p>
          </article>
        )}
      </section>
    </main>
  );
}

export function AriXpandDetailView({ xpand }) {
  const logs = Array.isArray(xpand?.logs) ? xpand.logs : [];
  const months = Array.isArray(xpand?.availableMonths) ? xpand.availableMonths : [];
  const selectedMonth = xpand?.selectedMonth || months[0]?.monthKey || '';

  return (
    <main className="content ari-xpands-content">
      <div className="ari-xpand-detail-frame">
        <section className="ari-xpands-detail-hero" aria-labelledby="ari-xpand-detail-title">
          <div className="ari-xpands-detail-hero__copy">
            <p className="eyebrow">
              <Link href="/ari-xpands">ARI XPands</Link> / {xpand.slug}
            </p>
            <h1 id="ari-xpand-detail-title" className="ari-xpands-detail-hero__title">#{xpand.title}</h1>
            {xpand.subtitle ? <p className="ari-xpands-detail-hero__subtitle">{xpand.subtitle}</p> : null}
            {xpand.description ? <MarkdownBlock value={xpand.description} /> : null}
          </div>
          {xpand.coverImage ? (
            <div className="ari-xpands-detail-hero__media">
              <div className="ari-xpands-detail-hero__cover">
                <img src={xpand.coverImage} alt={xpand.title} />
              </div>
            </div>
          ) : null}
        </section>

        <section className="ari-xpand-detail-shell">
          <MonthPagination slug={xpand.slug} months={months} selectedMonth={selectedMonth} />

          {logs.length > 0 ? (
            <div className="ari-xpand-snippet-stack">
              {logs.map((log, index) => (
                <div key={log.id || `${log.date}-${index}`} className="ari-xpand-snippet-stack__item">
                  <LogSnippet log={log} />
                </div>
              ))}
            </div>
          ) : (
            <article className="ari-xpands-empty-state">
              <h2>No snippets for {formatMonthLabel(selectedMonth) || 'this month'}.</h2>
              <p>This xpand is public, but there are no public log snippets in the selected month yet.</p>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
