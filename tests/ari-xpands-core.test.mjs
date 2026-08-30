import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSlugBase,
  parseDurationToMinutes,
  parseQuickLogInput,
  resolveDuplicateSlug,
} from '../lib/ariXpandsCore.mjs';

test('slug generation handles simple titles', () => {
  assert.equal(normalizeSlugBase('AI Systems Mastery'), 'ai-systems-mastery');
  assert.equal(normalizeSlugBase('CUDA'), 'cuda');
});

test('slug generation strips special characters deterministically', () => {
  assert.equal(normalizeSlugBase('C++ & CUDA'), 'c-cuda');
  assert.equal(normalizeSlugBase('  Few-Shot   Learning  '), 'few-shot-learning');
});

test('slug duplication increments safely', () => {
  assert.equal(resolveDuplicateSlug('cuda', ['cuda']), 'cuda-2');
  assert.equal(resolveDuplicateSlug('cuda', ['cuda', 'cuda-2']), 'cuda-3');
});

test('duration parser supports supported shorthand formats', () => {
  assert.equal(parseDurationToMinutes('30m'), 30);
  assert.equal(parseDurationToMinutes('45min'), 45);
  assert.equal(parseDurationToMinutes('1h'), 60);
  assert.equal(parseDurationToMinutes('1h30m'), 90);
  assert.equal(parseDurationToMinutes('1h 30m'), 90);
  assert.equal(parseDurationToMinutes('2h45m'), 165);
  assert.equal(parseDurationToMinutes('2h 45m'), 165);
});

test('duration parser rejects invalid values', () => {
  assert.equal(parseDurationToMinutes('0m'), null);
  assert.equal(parseDurationToMinutes('abc'), null);
  assert.equal(parseDurationToMinutes('1 hour'), null);
});

test('quick log parser supports one command', () => {
  const parsed = parseQuickLogInput('/learned KV cache grows with sequence length');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.commands.length, 1);
  assert.equal(parsed.commands[0].command, 'learned');
});

test('quick log parser supports multiple commands and repeated commands', () => {
  const parsed = parseQuickLogInput([
    '/done Built tokenizer',
    '/learned BPE merges frequent pairs',
    '/question How does unigram tokenization differ?',
    '/time 1h45m',
    '/done Added tests',
  ].join('\n'));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.commands.length, 5);
  assert.equal(parsed.commands.filter((entry) => entry.command === 'done').length, 2);
  assert.equal(parsed.commands.find((entry) => entry.command === 'time')?.minutes, 105);
});

test('quick log parser rejects malformed or unknown commands', () => {
  const malformed = parseQuickLogInput('plain text line');
  assert.equal(malformed.ok, false);
  assert.match(malformed.errors[0], /commands must look like/);

  const unknown = parseQuickLogInput('/mystery something');
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors[0], /unknown command/);
});
