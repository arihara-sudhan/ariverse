import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderMarkdownToSafeHtml, sanitizeRenderedMarkdown } from '../lib/markdownRenderer.js';

test('public Markdown rendering preserves formatting, Tamil text, and rewritten storage images', () => {
  const html = renderMarkdownToSafeHtml(
    '# தமிழ் English\n\n**bold** and `code`\n\n| ஒன்று | two |\n| --- | --- |\n| ஒன்று | two |\n\n![A flower](images/flower.webp)\n\n[site](https://example.com)',
    'arizone/posts/demo',
    { section: 'arizone', breaks: false },
  );

  assert.match(html, /தமிழ்/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<table>/);
  assert.match(html, /https:\/\/qbghhenrxoupaykgnxyj\.supabase\.co\/storage\/v1\/object\/public\/ariverse\/arizone\/posts\/demo\/images\/flower\.webp/);
  assert.match(html, /<a href="https:\/\/example\.com">site<\/a>/);
});

test('the shared admin preview renderer keeps safe formatting and removes executable markup', () => {
  const html = renderMarkdownToSafeHtml(
    '## Preview\n\n<iframe src="https://www.youtube.com/embed/abc123" title="Video"></iframe>\n\n<script>alert(1)</script><img src="x.webp" onerror="alert(1)">',
    'arichuvadi/posts/demo',
    { section: 'arichuvadi', slug: 'demo' },
  );

  assert.match(html, /<h2>Preview<\/h2>/);
  assert.match(html, /<iframe src="https:\/\/www\.youtube\.com\/embed\/abc123" title="Video"><\/iframe>/);
  assert.doesNotMatch(html, /script|alert|onerror/i);
  assert.match(html, /src="https:\/\/qbghhenrxoupaykgnxyj\.supabase\.co\/storage\/v1\/object\/public\/ariverse\/arichuvadi\/posts\/demo\/x\.webp"/);
});

test('unsafe attributes and URL schemes are removed immediately before HTML insertion', () => {
  const html = sanitizeRenderedMarkdown(
    '<p onclick="alert(1)">ok</p>' +
    '<a href="javascript:alert(1)" onmouseover="alert(1)">bad link</a>' +
    '<img src="data:text/html,<script>alert(1)</script>" onerror="alert(1)">' +
    '<iframe src="https://evil.example/embed/1"></iframe>',
  );

  assert.match(html, /<p>ok<\/p>/);
  assert.match(html, /bad link/);
  assert.doesNotMatch(html, /onclick|onmouseover|onerror|javascript:|data:|evil\.example|script/i);
});

test('public and admin insertion points both use the shared sanitizer', async () => {
  const [publicAriZone, publicArichuvadi, adminAriZone, adminArichuvadi] = await Promise.all([
    readFile(new URL('../src/components/AriZoneBlog.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ArichuvadiBlog.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../pages/admin/arizone.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../pages/admin/arichuvadi.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(publicAriZone, /sanitizeRenderedMarkdown\(normalizedPost\.html\)/);
  assert.match(publicArichuvadi, /sanitizeRenderedMarkdown\(articleHtml\)/);
  assert.match(adminAriZone, /renderMarkdownToSafeHtml\(draft\.contentMarkdown/);
  assert.match(adminArichuvadi, /renderMarkdownToSafeHtml\(draft\.contentMarkdown/);
});
