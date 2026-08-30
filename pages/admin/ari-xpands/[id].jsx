import Link from 'next/link';
import { useState } from 'react';
import Header from '../../../src/components/Header';
import { isAdminRequest } from '../../../lib/adminAuth';
import { getXpandById } from '../../../lib/ariXpands';
import {
  XPAND_EVIDENCE_TYPES,
  XPAND_EXPERIMENT_STATUSES,
  XPAND_MILESTONE_STATUSES,
  XPAND_NOTE_KINDS,
  XPAND_QUESTION_STATUSES,
  XPAND_RESOURCE_STATUSES,
  XPAND_RESOURCE_TYPES,
  XPAND_SECTION_STATUSES,
  XPAND_STATUSES,
  XPAND_VISIBILITIES,
} from '../../../lib/ariXpandsCore.mjs';

function linesToText(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function textToLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildLogDraft(log = {}) {
  return {
    id: log.id || null,
    xpandId: log.xpandId || null,
    date: log.date || new Date().toISOString().slice(0, 10),
    title: log.title || '',
    summary: log.summary || '',
    doneText: linesToText(log.done),
    learnedText: linesToText(log.learned),
    failedText: linesToText(log.failed),
    questionsText: linesToText(log.questions),
    blockersText: linesToText(log.blockers),
    nextText: linesToText(log.next),
    freeformNote: log.freeformNote || '',
    timeSpentMinutes: log.timeSpentMinutes || 0,
    visibility: log.visibility || 'public',
  };
}

function buildEmptyLogDraft(xpandId) {
  return buildLogDraft({ xpandId });
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
  const [quickLog, setQuickLog] = useState('');
  const [logDraft, setLogDraft] = useState(buildEmptyLogDraft(initialXpand.id));
  const [newNote, setNewNote] = useState({ title: '', content: '', kind: 'note', status: 'open', visibility: 'public' });
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', status: 'todo', targetDate: '', visibility: 'public' });
  const [newEvidence, setNewEvidence] = useState({ title: '', description: '', type: 'other', url: '', date: '', visibility: 'public' });
  const [newResource, setNewResource] = useState({ title: '', type: 'other', url: '', author: '', notes: '', status: 'queued', visibility: 'public' });
  const [newExperiment, setNewExperiment] = useState({ title: '', question: '', result: '', failureAnalysis: '', status: 'planned', visibility: 'public' });
  const [newSection, setNewSection] = useState({ title: '', description: '', status: 'planned', order: 0, parentSectionId: '' });
  const [saving, setSaving] = useState(false);
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

  async function submitQuickLog(event) {
    event.preventDefault();
    setSaving(true);
    setInfo('');
    setError('');
    const response = await fetch('/api/admin/ari-xpand-quick-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xpandId: xpand.id,
        input: quickLog,
        visibility: settings.visibility || 'public',
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError((payload.errors || [payload.error || 'Quick log failed.']).join(' '));
      return;
    }
    await reloadXpand();
    setQuickLog('');
    setSaving(false);
    setInfo('Quick log saved.');
  }

  async function saveLogDraft(event) {
    event.preventDefault();
    setSaving(true);
    setInfo('');
    setError('');
    const response = await fetch('/api/admin/ari-xpand-entities', {
      method: logDraft.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'log',
        id: logDraft.id,
        xpandId: xpand.id,
        date: logDraft.date,
        title: logDraft.title,
        summary: logDraft.summary,
        done: textToLines(logDraft.doneText),
        learned: textToLines(logDraft.learnedText),
        failed: textToLines(logDraft.failedText),
        questions: textToLines(logDraft.questionsText),
        blockers: textToLines(logDraft.blockersText),
        next: textToLines(logDraft.nextText),
        freeformNote: logDraft.freeformNote,
        timeSpentMinutes: Number(logDraft.timeSpentMinutes) || 0,
        visibility: logDraft.visibility,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error || 'Could not save log.');
      return;
    }
    await reloadXpand();
    setLogDraft(buildEmptyLogDraft(xpand.id));
    setSaving(false);
    setInfo('Log saved.');
  }

  async function deleteEntity(entityType, id) {
    setSaving(true);
    setInfo('');
    setError('');
    const response = await fetch('/api/admin/ari-xpand-entities', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, id, xpandId: xpand.id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error || 'Could not delete item.');
      return;
    }
    await reloadXpand();
    setSaving(false);
    setInfo('Item deleted.');
  }

  async function saveEntity(entityType, data, method = 'POST') {
    setSaving(true);
    setInfo('');
    setError('');
    const response = await fetch('/api/admin/ari-xpand-entities', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, xpandId: xpand.id, ...data }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error || 'Could not save item.');
      return false;
    }
    await reloadXpand();
    setSaving(false);
    setInfo('Item saved.');
    return true;
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
            <div className="admin-item-actions">
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
              <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={archiveXpandNow} disabled={saving}>Archive</button>
              <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={deleteXpandNow} disabled={saving}>Delete</button>
            </div>
          </form>

          <form id="quick-log" className="contact-card" onSubmit={submitQuickLog}>
            <h3>Quick Log</h3>
            <p className="contact-note">Supported commands: /done /learned /failed /question /idea /insight /blocker /next /read /evidence /time /note</p>
            <textarea rows="10" value={quickLog} onChange={(event) => setQuickLog(event.target.value)} placeholder={'/question Why are warps 32 threads?\n/learned A warp is the basic scheduling unit on NVIDIA GPUs.\n/time 35m'} />
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Quick Log'}</button>
          </form>

          <form className="contact-card" onSubmit={saveLogDraft}>
            <h3>Log Editor</h3>
            <label htmlFor="log-date">Date</label>
            <input id="log-date" type="date" value={logDraft.date} onChange={(event) => setLogDraft((prev) => ({ ...prev, date: event.target.value }))} />
            <label htmlFor="log-title">Title</label>
            <input id="log-title" value={logDraft.title} onChange={(event) => setLogDraft((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="log-summary">Summary</label>
            <textarea id="log-summary" rows="3" value={logDraft.summary} onChange={(event) => setLogDraft((prev) => ({ ...prev, summary: event.target.value }))} />
            <label htmlFor="log-done">Done</label>
            <textarea id="log-done" rows="3" value={logDraft.doneText} onChange={(event) => setLogDraft((prev) => ({ ...prev, doneText: event.target.value }))} />
            <label htmlFor="log-learned">Learned</label>
            <textarea id="log-learned" rows="3" value={logDraft.learnedText} onChange={(event) => setLogDraft((prev) => ({ ...prev, learnedText: event.target.value }))} />
            <label htmlFor="log-failed">Failed</label>
            <textarea id="log-failed" rows="3" value={logDraft.failedText} onChange={(event) => setLogDraft((prev) => ({ ...prev, failedText: event.target.value }))} />
            <label htmlFor="log-questions">Questions</label>
            <textarea id="log-questions" rows="3" value={logDraft.questionsText} onChange={(event) => setLogDraft((prev) => ({ ...prev, questionsText: event.target.value }))} />
            <label htmlFor="log-blockers">Blockers</label>
            <textarea id="log-blockers" rows="3" value={logDraft.blockersText} onChange={(event) => setLogDraft((prev) => ({ ...prev, blockersText: event.target.value }))} />
            <label htmlFor="log-next">Next</label>
            <textarea id="log-next" rows="3" value={logDraft.nextText} onChange={(event) => setLogDraft((prev) => ({ ...prev, nextText: event.target.value }))} />
            <label htmlFor="log-note">Markdown note</label>
            <textarea id="log-note" rows="6" value={logDraft.freeformNote} onChange={(event) => setLogDraft((prev) => ({ ...prev, freeformNote: event.target.value }))} />
            <label htmlFor="log-time">Time spent minutes</label>
            <input id="log-time" type="number" min="0" value={logDraft.timeSpentMinutes} onChange={(event) => setLogDraft((prev) => ({ ...prev, timeSpentMinutes: event.target.value }))} />
            <label htmlFor="log-visibility">Visibility</label>
            <select id="log-visibility" value={logDraft.visibility} onChange={(event) => setLogDraft((prev) => ({ ...prev, visibility: event.target.value }))}>
              {XPAND_VISIBILITIES.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}
            </select>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : logDraft.id ? 'Update Log' : 'Add Log'}</button>
          </form>

          <div className="ari-xpands-admin-list">
            <h3>Existing Logs</h3>
            {(xpand.logs || []).map((log) => (
              <article key={log.id} className="playlist-card">
                <h4>{log.date}</h4>
                <p>{log.title || 'Daily log'}</p>
                <p>{log.visibility}</p>
                <div className="admin-item-actions">
                  <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => setLogDraft(buildLogDraft(log))}>Edit</button>
                  <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteEntity('log', log.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>

          <form className="contact-card" onSubmit={async (event) => {
            event.preventDefault();
            const ok = await saveEntity('note', newNote);
            if (ok) setNewNote({ title: '', content: '', kind: 'note', status: 'open', visibility: 'public' });
          }}>
            <h3>Notes / Questions</h3>
            <label htmlFor="note-kind">Kind</label>
            <select id="note-kind" value={newNote.kind} onChange={(event) => setNewNote((prev) => ({ ...prev, kind: event.target.value }))}>
              {XPAND_NOTE_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
            {newNote.kind === 'question' ? (
              <>
                <label htmlFor="note-status">Question status</label>
                <select id="note-status" value={newNote.status} onChange={(event) => setNewNote((prev) => ({ ...prev, status: event.target.value }))}>
                  {XPAND_QUESTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </>
            ) : null}
            <label htmlFor="note-title">Title</label>
            <input id="note-title" value={newNote.title} onChange={(event) => setNewNote((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="note-content">Content</label>
            <textarea id="note-content" rows="5" value={newNote.content} onChange={(event) => setNewNote((prev) => ({ ...prev, content: event.target.value }))} />
            <label htmlFor="note-visibility">Visibility</label>
            <select id="note-visibility" value={newNote.visibility} onChange={(event) => setNewNote((prev) => ({ ...prev, visibility: event.target.value }))}>
              {XPAND_VISIBILITIES.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}
            </select>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Note'}</button>
          </form>

          <div className="ari-xpands-admin-list">
            {(xpand.notes || []).map((note) => (
              <article key={note.id} className="playlist-card">
                <h4>{note.kind}</h4>
                <p>{note.title || note.content}</p>
                <p>{note.visibility}</p>
                <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteEntity('note', note.id)}>Delete</button>
              </article>
            ))}
          </div>

          <form className="contact-card" onSubmit={async (event) => {
            event.preventDefault();
            const ok = await saveEntity('milestone', newMilestone);
            if (ok) setNewMilestone({ title: '', description: '', status: 'todo', targetDate: '', visibility: 'public' });
          }}>
            <h3>Milestones</h3>
            <label htmlFor="milestone-title">Title</label>
            <input id="milestone-title" value={newMilestone.title} onChange={(event) => setNewMilestone((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="milestone-description">Description</label>
            <textarea id="milestone-description" rows="4" value={newMilestone.description} onChange={(event) => setNewMilestone((prev) => ({ ...prev, description: event.target.value }))} />
            <label htmlFor="milestone-status">Status</label>
            <select id="milestone-status" value={newMilestone.status} onChange={(event) => setNewMilestone((prev) => ({ ...prev, status: event.target.value }))}>
              {XPAND_MILESTONE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <label htmlFor="milestone-target-date">Target date</label>
            <input id="milestone-target-date" type="date" value={newMilestone.targetDate} onChange={(event) => setNewMilestone((prev) => ({ ...prev, targetDate: event.target.value }))} />
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Milestone'}</button>
          </form>

          <div className="ari-xpands-admin-list">
            {(xpand.milestones || []).map((milestone) => (
              <article key={milestone.id} className="playlist-card">
                <h4>{milestone.title}</h4>
                <p>{milestone.status}</p>
                <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteEntity('milestone', milestone.id)}>Delete</button>
              </article>
            ))}
          </div>

          <form className="contact-card" onSubmit={async (event) => {
            event.preventDefault();
            const ok = await saveEntity('evidence', newEvidence);
            if (ok) setNewEvidence({ title: '', description: '', type: 'other', url: '', date: '', visibility: 'public' });
          }}>
            <h3>Evidence</h3>
            <label htmlFor="evidence-title">Title</label>
            <input id="evidence-title" value={newEvidence.title} onChange={(event) => setNewEvidence((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="evidence-type">Type</label>
            <select id="evidence-type" value={newEvidence.type} onChange={(event) => setNewEvidence((prev) => ({ ...prev, type: event.target.value }))}>
              {XPAND_EVIDENCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <label htmlFor="evidence-url">URL</label>
            <input id="evidence-url" value={newEvidence.url} onChange={(event) => setNewEvidence((prev) => ({ ...prev, url: event.target.value }))} />
            <label htmlFor="evidence-description">Description</label>
            <textarea id="evidence-description" rows="4" value={newEvidence.description} onChange={(event) => setNewEvidence((prev) => ({ ...prev, description: event.target.value }))} />
            <label htmlFor="evidence-date">Date</label>
            <input id="evidence-date" type="date" value={newEvidence.date} onChange={(event) => setNewEvidence((prev) => ({ ...prev, date: event.target.value }))} />
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Evidence'}</button>
          </form>

          <div className="ari-xpands-admin-list">
            {(xpand.evidence || []).map((item) => (
              <article key={item.id} className="playlist-card">
                <h4>{item.title}</h4>
                <p>{item.type}</p>
                <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteEntity('evidence', item.id)}>Delete</button>
              </article>
            ))}
          </div>

          <form className="contact-card" onSubmit={async (event) => {
            event.preventDefault();
            const ok = await saveEntity('resource', newResource);
            if (ok) setNewResource({ title: '', type: 'other', url: '', author: '', notes: '', status: 'queued', visibility: 'public' });
          }}>
            <h3>Resources</h3>
            <label htmlFor="resource-title">Title</label>
            <input id="resource-title" value={newResource.title} onChange={(event) => setNewResource((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="resource-type">Type</label>
            <select id="resource-type" value={newResource.type} onChange={(event) => setNewResource((prev) => ({ ...prev, type: event.target.value }))}>
              {XPAND_RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <label htmlFor="resource-url">URL</label>
            <input id="resource-url" value={newResource.url} onChange={(event) => setNewResource((prev) => ({ ...prev, url: event.target.value }))} />
            <label htmlFor="resource-author">Author</label>
            <input id="resource-author" value={newResource.author} onChange={(event) => setNewResource((prev) => ({ ...prev, author: event.target.value }))} />
            <label htmlFor="resource-notes">Notes</label>
            <textarea id="resource-notes" rows="4" value={newResource.notes} onChange={(event) => setNewResource((prev) => ({ ...prev, notes: event.target.value }))} />
            <label htmlFor="resource-status">Status</label>
            <select id="resource-status" value={newResource.status} onChange={(event) => setNewResource((prev) => ({ ...prev, status: event.target.value }))}>
              {XPAND_RESOURCE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Resource'}</button>
          </form>

          <div className="ari-xpands-admin-list">
            {(xpand.resources || []).map((item) => (
              <article key={item.id} className="playlist-card">
                <h4>{item.title}</h4>
                <p>{item.status}</p>
                <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteEntity('resource', item.id)}>Delete</button>
              </article>
            ))}
          </div>

          <form className="contact-card" onSubmit={async (event) => {
            event.preventDefault();
            const ok = await saveEntity('experiment', newExperiment);
            if (ok) setNewExperiment({ title: '', question: '', result: '', failureAnalysis: '', status: 'planned', visibility: 'public' });
          }}>
            <h3>Experiments</h3>
            <label htmlFor="experiment-title">Title</label>
            <input id="experiment-title" value={newExperiment.title} onChange={(event) => setNewExperiment((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="experiment-question">Question</label>
            <textarea id="experiment-question" rows="3" value={newExperiment.question} onChange={(event) => setNewExperiment((prev) => ({ ...prev, question: event.target.value }))} />
            <label htmlFor="experiment-result">Result</label>
            <textarea id="experiment-result" rows="3" value={newExperiment.result} onChange={(event) => setNewExperiment((prev) => ({ ...prev, result: event.target.value }))} />
            <label htmlFor="experiment-failure">Failure analysis</label>
            <textarea id="experiment-failure" rows="3" value={newExperiment.failureAnalysis} onChange={(event) => setNewExperiment((prev) => ({ ...prev, failureAnalysis: event.target.value }))} />
            <label htmlFor="experiment-status">Status</label>
            <select id="experiment-status" value={newExperiment.status} onChange={(event) => setNewExperiment((prev) => ({ ...prev, status: event.target.value }))}>
              {XPAND_EXPERIMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Experiment'}</button>
          </form>

          <div className="ari-xpands-admin-list">
            {(xpand.experiments || []).map((item) => (
              <article key={item.id} className="playlist-card">
                <h4>{item.title}</h4>
                <p>{item.status}</p>
                <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteEntity('experiment', item.id)}>Delete</button>
              </article>
            ))}
          </div>

          <form className="contact-card" onSubmit={async (event) => {
            event.preventDefault();
            const ok = await saveEntity('section', newSection);
            if (ok) setNewSection({ title: '', description: '', status: 'planned', order: 0, parentSectionId: '' });
          }}>
            <h3>Structure</h3>
            <label htmlFor="section-title">Title</label>
            <input id="section-title" value={newSection.title} onChange={(event) => setNewSection((prev) => ({ ...prev, title: event.target.value }))} />
            <label htmlFor="section-description">Description</label>
            <textarea id="section-description" rows="3" value={newSection.description} onChange={(event) => setNewSection((prev) => ({ ...prev, description: event.target.value }))} />
            <label htmlFor="section-status">Status</label>
            <select id="section-status" value={newSection.status} onChange={(event) => setNewSection((prev) => ({ ...prev, status: event.target.value }))}>
              {XPAND_SECTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <label htmlFor="section-parent">Parent section</label>
            <select id="section-parent" value={newSection.parentSectionId} onChange={(event) => setNewSection((prev) => ({ ...prev, parentSectionId: event.target.value }))}>
              <option value="">None</option>
              {(xpand.sections || []).map((section) => (
                <option key={section.id} value={section.id}>{section.title}</option>
              ))}
            </select>
            <label htmlFor="section-order">Order</label>
            <input id="section-order" type="number" value={newSection.order} onChange={(event) => setNewSection((prev) => ({ ...prev, order: event.target.value }))} />
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Section'}</button>
          </form>

          <div className="ari-xpands-admin-list">
            {(xpand.sections || []).map((item) => (
              <article key={item.id} className="playlist-card">
                <h4>{item.title}</h4>
                <p>{item.status}</p>
                <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteEntity('section', item.id)}>Delete</button>
              </article>
            ))}
          </div>

          {info ? <p className="contact-note">{info}</p> : null}
          {error ? <p className="contact-note">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
