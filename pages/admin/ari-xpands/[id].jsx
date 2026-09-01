import Link from 'next/link';
import { useState } from 'react';
import Header from '../../../src/components/Header';
import { isAdminRequest } from '../../../lib/adminAuth';
import { getXpandById } from '../../../lib/ariXpands';
import {
  XPAND_STATUSES,
  XPAND_VISIBILITIES,
} from '../../../lib/ariXpandsCore.mjs';

function textToLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getTodayDateInputValue() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function getLogOutcome(log = {}) {
  return Array.isArray(log.failed) && log.failed.length > 0 ? 'failure' : 'success';
}

function buildDailyNoteDraft(log = null) {
  return {
    date: log?.date || getTodayDateInputValue(),
    note: log?.freeformNote || log?.summary || '',
    outcome: getLogOutcome(log || {}),
  };
}

export async function getServerSideProps({ req, params }) {
  if (!isAdminRequest(req)) {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  const xpand = await getXpandById(Number(params?.id), { includePrivate: true, includeChildren: true });
  if (!xpand) {
    return { notFound: true };
  }

  return {
    props: {
      initialXpand: xpand,
    },
  };
}

export default function AriXpandAdminDetailPage({ initialXpand }) {
  const [xpand, setXpand] = useState(initialXpand);
  const [settings, setSettings] = useState({
    title: initialXpand.title || '',
    slug: initialXpand.slug || '',
    subtitle: initialXpand.subtitle || '',
    description: initialXpand.description || '',
    status: initialXpand.status || 'active',
    visibility: initialXpand.visibility || 'public',
    startDate: initialXpand.startDate || '',
    endDate: initialXpand.endDate || '',
    tags: Array.isArray(initialXpand.tags) ? initialXpand.tags.join(', ') : '',
    coverImage: initialXpand.coverImage || '',
  });
  const [dailyNote, setDailyNote] = useState(buildDailyNoteDraft());
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  async function reloadXpand() {
    const response = await fetch(`/api/admin/ari-xpands/${xpand.id}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Could not refresh Xpand.');
    }
    setXpand(payload.xpand);
    setSettings({
      title: payload.xpand.title || '',
      slug: payload.xpand.slug || '',
      subtitle: payload.xpand.subtitle || '',
      description: payload.xpand.description || '',
      status: payload.xpand.status || 'active',
      visibility: payload.xpand.visibility || 'public',
      startDate: payload.xpand.startDate || '',
      endDate: payload.xpand.endDate || '',
      tags: Array.isArray(payload.xpand.tags) ? payload.xpand.tags.join(', ') : '',
      coverImage: payload.xpand.coverImage || '',
    });
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setInfo('');
    setError('');
    const response = await fetch(`/api/admin/ari-xpands/${xpand.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        tags: textToLines(settings.tags.replace(/,/g, '\n')),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error || 'Could not save settings.');
      return;
    }
    await reloadXpand();
    setSaving(false);
    setInfo('Xpand settings saved.');
  }

  async function uploadCoverImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('section', 'ARI XPands');
    formData.append('sectionHref', '/ari-xpands');
    formData.append('title', settings.title || xpand.title || 'cover');
    if (settings.coverImage) {
      formData.append('currentUrl', settings.coverImage);
    }

    const response = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Cover upload failed.');
    }
    return payload.imageUrl;
  }

  async function saveDailyNote(event) {
    event.preventDefault();
    setSaving(true);
    setInfo('');
    setError('');
    const existingLog = (xpand.logs || []).find((log) => log.date === dailyNote.date);
    const response = await fetch('/api/admin/ari-xpand-entities', {
      method: existingLog?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'log',
        id: existingLog?.id || null,
        xpandId: xpand.id,
        date: dailyNote.date,
        title: '',
        summary: '',
        done: dailyNote.outcome === 'success' ? ['Success'] : [],
        learned: [],
        failed: dailyNote.outcome === 'failure' ? ['Failure'] : [],
        questions: [],
        blockers: [],
        next: [],
        freeformNote: dailyNote.note,
        timeSpentMinutes: 0,
        visibility: settings.visibility || 'public',
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError((payload.errors || [payload.error || 'Could not save daily note.']).join(' '));
      return;
    }
    await reloadXpand();
    setDailyNote(buildDailyNoteDraft({
      date: dailyNote.date,
      freeformNote: dailyNote.note,
      failed: dailyNote.outcome === 'failure' ? ['Failure'] : [],
    }));
    setSaving(false);
    setInfo('Daily note saved.');
  }

  async function archiveXpandNow() {
    setSaving(true);
    setInfo('');
    setError('');
    const response = await fetch(`/api/admin/ari-xpands/${xpand.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error || 'Could not archive Xpand.');
      return;
    }
    await reloadXpand();
    setSaving(false);
    setInfo('Xpand archived.');
  }

  async function deleteXpandNow() {
    const confirmed = window.confirm('Delete this Xpand and every child record? This cannot be undone.');
    if (!confirmed) return;
    setSaving(true);
    setInfo('');
    setError('');
    const response = await fetch(`/api/admin/ari-xpands/${xpand.id}`, {
      method: 'DELETE',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error || 'Could not delete Xpand.');
      return;
    }
    window.location.href = '/admin/ari-xpands';
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="ari-xpand-detail-title">
          <p className="eyebrow">Admin</p>
          <h2 id="ari-xpand-detail-title">{xpand.title}</h2>
          <p className="contact-note">
            <Link href="/admin/ari-xpands">Back to ARI XPands</Link> · <Link href={`/ari-xpands/${xpand.slug}`}>Open public page</Link>
          </p>

          <form className="contact-card" onSubmit={saveSettings}>
            <h3>Settings</h3>
            <label htmlFor="xpand-title">Title</label>
            <input id="xpand-title" value={settings.title} onChange={(event) => setSettings((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="xpand-slug">Slug</label>
            <input id="xpand-slug" value={settings.slug} onChange={(event) => setSettings((prev) => ({ ...prev, slug: event.target.value }))} />
            <label htmlFor="xpand-subtitle">Subtitle</label>
            <input id="xpand-subtitle" value={settings.subtitle} onChange={(event) => setSettings((prev) => ({ ...prev, subtitle: event.target.value }))} />
            <label htmlFor="xpand-description">Description</label>
            <textarea id="xpand-description" rows="6" value={settings.description} onChange={(event) => setSettings((prev) => ({ ...prev, description: event.target.value }))} />
            <label htmlFor="xpand-status">Status</label>
            <select id="xpand-status" value={settings.status} onChange={(event) => setSettings((prev) => ({ ...prev, status: event.target.value }))}>
              {XPAND_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <label htmlFor="xpand-visibility">Visibility</label>
            <select id="xpand-visibility" value={settings.visibility} onChange={(event) => setSettings((prev) => ({ ...prev, visibility: event.target.value }))}>
              {XPAND_VISIBILITIES.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}
            </select>
            <label htmlFor="xpand-start-date">Start date</label>
            <input id="xpand-start-date" type="date" value={settings.startDate} onChange={(event) => setSettings((prev) => ({ ...prev, startDate: event.target.value }))} />
            <label htmlFor="xpand-end-date">End date</label>
            <input id="xpand-end-date" type="date" value={settings.endDate} onChange={(event) => setSettings((prev) => ({ ...prev, endDate: event.target.value }))} />
            <label htmlFor="xpand-tags">Tags</label>
            <input id="xpand-tags" value={settings.tags} onChange={(event) => setSettings((prev) => ({ ...prev, tags: event.target.value }))} placeholder="cuda, gpu, systems" />
            <label htmlFor="xpand-cover-image">Cover image URL</label>
            <input id="xpand-cover-image" value={settings.coverImage} onChange={(event) => setSettings((prev) => ({ ...prev, coverImage: event.target.value }))} />
            <label htmlFor="xpand-cover-image-upload">Cover image upload</label>
            <input
              id="xpand-cover-image-upload"
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const files = Array.from(event.target.files || []);
                if (files.length === 0) return;
                setUploadingCover(true);
                setInfo('');
                setError('');
                try {
                  const uploadedUrl = await uploadCoverImage(files[0]);
                  setSettings((prev) => ({ ...prev, coverImage: uploadedUrl }));
                  setInfo('Cover image uploaded.');
                } catch (uploadError) {
                  setError(uploadError.message || 'Cover upload failed.');
                } finally {
                  setUploadingCover(false);
                }
              }}
            />
            <div className="admin-item-actions">
              <button type="submit" disabled={saving || uploadingCover}>{saving ? 'Saving...' : uploadingCover ? 'Uploading...' : 'Save Settings'}</button>
              <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={archiveXpandNow} disabled={saving}>Archive</button>
              <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={deleteXpandNow} disabled={saving}>Delete</button>
            </div>
          </form>

          <form className="contact-card" onSubmit={saveDailyNote}>
            <h3>Daily Note</h3>
            <p className="contact-note">Use one note for one day. Mark it green for success or red for failure.</p>
            <label htmlFor="daily-note-date">Date</label>
            <input
              id="daily-note-date"
              type="date"
              value={dailyNote.date}
              onChange={(event) => setDailyNote((prev) => ({ ...prev, date: event.target.value }))}
            />
            <label htmlFor="daily-note-outcome">Result</label>
            <select
              id="daily-note-outcome"
              value={dailyNote.outcome}
              onChange={(event) => setDailyNote((prev) => ({ ...prev, outcome: event.target.value }))}
            >
              <option value="success">Success / Green</option>
              <option value="failure">Failure / Red</option>
            </select>
            <label htmlFor="daily-note-text">Note</label>
            <textarea
              id="daily-note-text"
              rows="6"
              value={dailyNote.note}
              onChange={(event) => setDailyNote((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Write the note for this day."
            />
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Daily Note'}</button>
          </form>

          {info ? <p className="contact-note">{info}</p> : null}
          {error ? <p className="contact-note">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
