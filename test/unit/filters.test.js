// What the bundled filter lists promise: which pages lose their feed, and
// which pages are left alone.

import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { test } from 'node:test';

import { sites } from '../../filters/index.js';
import { validateSites } from '../../src/core/filter-schema.js';
import { rulesForPath } from '../../src/core/sites.js';

const expectations = {
  instagram: {
    killed: ['/'],
    untouched: [
      '/p/Cabc123xyz/',
      '/reel/Cabc123xyz/',
      '/reels/Cabc123xyz/',
      '/someone/',
      '/someone/tagged/',
      '/direct/inbox/',
      '/stories/someone/3123456789/',
      '/accounts/edit/',
    ],
  },
  reddit: {
    killed: ['/', '/best/', '/hot', '/new/', '/top/', '/r/popular/', '/r/popular/top/', '/r/all/', '/news/'],
    untouched: [
      '/r/programming/',
      '/r/programming/comments/1abc23/some_title/',
      '/r/popularopinion/',
      '/search/',
      '/user/someone/',
      '/submit',
      '/notifications',
      '/settings',
    ],
  },
  linkedin: {
    killed: ['/', '/feed/', '/feed'],
    untouched: [
      '/feed/update/urn:li:activity:7123456789/',
      '/posts/someone_a-post-activity-7123456789-abcd',
      '/in/someone/',
      '/search/results/all/',
      '/messaging/',
      '/notifications/',
      '/jobs/',
      '/mynetwork/',
    ],
  },
  x: {
    killed: ['/home', '/explore', '/explore/tabs/for-you'],
    untouched: [
      '/someone',
      '/someone/status/1234567890',
      '/search',
      '/notifications',
      '/messages',
      '/compose/post',
      '/i/bookmarks',
      '/homepage',
    ],
  },
  youtube: {
    killed: ['/', '/watch'],
    untouched: [
      '/feed/subscriptions',
      '/feed/history',
      '/feed/playlists',
      '/results',
      '/playlist',
      '/@somechannel',
      '/@somechannel/videos',
      '/channel/UCabc123',
      '/shorts/abc123',
    ],
  },
};

const appliesTo = (site, pathname) => rulesForPath(site, pathname).length > 0;

test('the bundled lists are valid', () => {
  assert.deepEqual(validateSites(sites), []);
});

test('every filter file is registered', async () => {
  const files = await readdir(new URL('../../filters/', import.meta.url));
  const ids = files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));

  assert.deepEqual(ids.sort(), sites.map((site) => site.id).sort());
});

test('every site has expectations', () => {
  assert.deepEqual(Object.keys(expectations).sort(), sites.map((site) => site.id).sort());
});

for (const site of sites) {
  const { killed, untouched } = expectations[site.id] ?? { killed: [], untouched: [] };

  test(`${site.name}: feed pages lose their feed`, () => {
    for (const pathname of killed) {
      assert.ok(appliesTo(site, pathname), pathname);
    }
  });

  test(`${site.name}: posts, search and everything else are left alone`, () => {
    for (const pathname of untouched) {
      assert.ok(!appliesTo(site, pathname), pathname);
    }
  });
}
