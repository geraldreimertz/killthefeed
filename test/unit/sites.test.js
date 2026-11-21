import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findSite, matchPatterns, rulesForPath } from '../../src/core/sites.js';

const forum = {
  id: 'forum',
  name: 'Forum',
  domains: ['forum.example', 'forum-mirror.example'],
  rules: [
    { id: 'feed', description: 'Start page', paths: ['/', '/popular/**'], replace: ['.feed'] },
    { id: 'badges', description: 'Counters', paths: ['/**'], hide: ['.badge'] },
  ],
};
const sites = [forum];

test('a site is found by its domain and by any subdomain', () => {
  assert.equal(findSite(sites, 'forum.example'), forum);
  assert.equal(findSite(sites, 'www.forum.example'), forum);
  assert.equal(findSite(sites, 'old.forum-mirror.example'), forum);
});

test('lookalike hostnames do not count', () => {
  assert.equal(findSite(sites, 'notforum.example'), undefined);
  assert.equal(findSite(sites, 'forum.example.evil.test'), undefined);
  assert.equal(findSite(sites, 'example'), undefined);
});

test('match patterns cover every domain including subdomains', () => {
  assert.deepEqual(matchPatterns(forum), [
    'https://*.forum.example/*',
    'https://*.forum-mirror.example/*',
  ]);
});

test('only the rules for the current path apply', () => {
  const ids = (pathname) => rulesForPath(forum, pathname).map((rule) => rule.id);

  assert.deepEqual(ids('/'), ['feed', 'badges']);
  assert.deepEqual(ids('/popular/today'), ['feed', 'badges']);
  assert.deepEqual(ids('/thread/42'), ['badges']);
});
