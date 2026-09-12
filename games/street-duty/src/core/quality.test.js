import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuality, shouldPrewarm, resolveQuality } from './quality.js';

test('normalizeQuality accepts the four presets', () => {
  assert.equal(normalizeQuality('low'), 'low');
  assert.equal(normalizeQuality('ULTRA'), 'ultra');
  assert.equal(normalizeQuality('nope'), null);
});

test('shouldPrewarm is off by default except ultra', () => {
  assert.equal(shouldPrewarm('low', ''), false);
  assert.equal(shouldPrewarm('medium', ''), false);
  assert.equal(shouldPrewarm('high', ''), false);
  assert.equal(shouldPrewarm('ultra', ''), true);
  assert.equal(shouldPrewarm('low', '?prewarm=1'), true);
  assert.equal(shouldPrewarm('ultra', '?prewarm=0'), false);
});

test('resolveQuality honors ?q= override', () => {
  assert.deepEqual(resolveQuality('?q=high'), { quality: 'high', source: 'query' });
  assert.deepEqual(resolveQuality('?q=ultra'), { quality: 'ultra', source: 'query' });
  assert.deepEqual(resolveQuality('?q=low'), { quality: 'low', source: 'query' });
});
