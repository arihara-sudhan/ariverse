import test from 'node:test';
import assert from 'node:assert/strict';
import { runProfileLinkSectionKeyMigration } from '../lib/profileLinkSectionMigration.js';
import { sectionKeyForProfileLink, sectionTable } from '../lib/sectionRegistry.js';
import { publicPathsForLinkItem, publicPathsForProfileLink } from '../lib/publicRevalidation.js';

test('renaming a display label keeps the route and section identity stable', () => {
  const result = sectionKeyForProfileLink({
    sectionKey: 'projects',
    label: 'Research archive',
    href: '/projects',
  });
  assert.deepEqual(result, { status: 'matched', sectionKey: 'projects', candidates: ['projects'] });
});

test('a renamed section keeps its entry table and public refresh path', () => {
  const renamedLink = { id: 7, sectionKey: 'projects', label: 'Research archive', href: '/projects' };
  assert.equal(sectionTable(renamedLink.sectionKey), 'projects_entries');
  assert.deepEqual(publicPathsForProfileLink(renamedLink), ['/', '/projects']);
  assert.deepEqual(
    publicPathsForLinkItem(renamedLink, { kavithaiFrom: 'New entry' }),
    ['/', '/projects', '/projects/project', '/projects/new-entry'],
  );
});

test('registered routes repair legacy placeholder hrefs for refreshes', () => {
  assert.deepEqual(
    publicPathsForProfileLink({ sectionKey: 'ari-read-books', label: 'Renamed books', href: '#' }),
    ['/', '/ari-read-books'],
  );
});

test('legacy labels backfill to their canonical section keys', () => {
  assert.equal(sectionKeyForProfileLink({ label: 'Works', href: '/legacy-career' }).sectionKey, 'ari-career');
  assert.equal(sectionKeyForProfileLink({ label: 'AriZone (Blog)', href: '/arizone' }).sectionKey, 'arizone');
  assert.equal(sectionKeyForProfileLink({ label: 'My Poems', href: '/arichuvadi?category=kavithaigal' }).sectionKey, 'kavithaigal');
});

test('ordinary navigation links remain unassigned', () => {
  assert.deepEqual(sectionKeyForProfileLink({ label: 'Contact', href: '/contact' }), {
    status: 'unknown',
    sectionKey: '',
    candidates: [],
  });
});

test('conflicting route and legacy label are reported as ambiguous', () => {
  const result = sectionKeyForProfileLink({ label: 'Projects', href: '/book-reviews' });
  assert.equal(result.status, 'ambiguous');
  assert.deepEqual(result.candidates, ['book-reviews', 'projects']);
});

test('migration backfills legacy rows and aborts with ambiguous row IDs', async () => {
  const updates = [];
  const rows = [
    { id: 11, label: 'Works', href: '/legacy-career', sectionKey: null },
    { id: 12, label: 'Contact', href: '/contact', sectionKey: null },
  ];
  const sql = async (strings, ...values) => {
    const query = strings.join('?');
    if (query.includes('SELECT id, label, href, section_key')) return rows;
    if (query.includes('UPDATE profile_links')) updates.push(values);
    return [];
  };

  const result = await runProfileLinkSectionKeyMigration(sql);
  assert.deepEqual(result.backfilledIds, [11]);
  assert.deepEqual(result.unknownIds, [12]);
  assert.equal(updates[0][0], 'ari-career');

  await assert.rejects(
    runProfileLinkSectionKeyMigration(async (strings) => {
      const query = strings.join('?');
      if (query.includes('SELECT id, label, href, section_key')) {
        return [{ id: 99, label: 'Projects', href: '/book-reviews', sectionKey: null }];
      }
      return [];
    }),
    /ambiguous IDs: 99/,
  );
});
