import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isPathPattern, matchesPath } from '../../src/core/paths.js';

test('a plain pattern matches its own path only', () => {
  assert.ok(matchesPath('/feed', '/feed'));
  assert.ok(!matchesPath('/feed', '/feed/update/urn:li:activity:1'));
  assert.ok(!matchesPath('/feed', '/feeds'));
  assert.ok(!matchesPath('/feed', '/'));
});

test('a trailing slash makes no difference', () => {
  assert.ok(matchesPath('/feed', '/feed/'));
  assert.ok(matchesPath('/feed/', '/feed'));
});

test('upper and lower case are treated alike', () => {
  assert.ok(matchesPath('/r/popular/**', '/r/Popular/'));
});

test('the root pattern matches the start page only', () => {
  assert.ok(matchesPath('/', '/'));
  assert.ok(!matchesPath('/', '/home'));
});

test('"*" stands for exactly one segment', () => {
  assert.ok(matchesPath('/r/*/wiki', '/r/programming/wiki'));
  assert.ok(!matchesPath('/r/*/wiki', '/r/wiki'));
  assert.ok(!matchesPath('/r/*/wiki', '/r/a/b/wiki'));
});

test('"/**" matches the path itself and everything below it', () => {
  assert.ok(matchesPath('/explore/**', '/explore'));
  assert.ok(matchesPath('/explore/**', '/explore/'));
  assert.ok(matchesPath('/explore/**', '/explore/tabs/for-you'));
  assert.ok(!matchesPath('/explore/**', '/explorer'));
  assert.ok(matchesPath('/**', '/'));
  assert.ok(matchesPath('/**', '/anything/at/all'));
});

test('characters with a meaning in regular expressions are taken literally', () => {
  assert.ok(matchesPath('/a.b', '/a.b'));
  assert.ok(!matchesPath('/a.b', '/axb'));
});

test('well-formed patterns are recognised', () => {
  for (const pattern of ['/', '/feed', '/feed/', '/r/*/wiki', '/explore/**', '/**']) {
    assert.ok(isPathPattern(pattern), pattern);
  }
});

test('malformed patterns are rejected', () => {
  const malformed = ['', 'feed', '/a//b', '/**/a', '/a*', '/a/b*c', '/a?b=1', '/a#b', '/a b', 5, null];
  for (const pattern of malformed) {
    assert.ok(!isPathPattern(pattern), String(pattern));
  }
});
