// What the bundled filter lists promise: for every rule, the pages it applies
// to and the pages it spares.

import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { test } from 'node:test';

import { sites } from '../../filters/index.js';
import { validateSites } from '../../src/core/filter-schema.js';
import { rulesForPath } from '../../src/core/sites.js';

const expectations = {
  instagram: {
    feed: {
      applies: ['/'],
      spares: [
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
  },
  linkedin: {
    feed: {
      applies: ['/', '/feed/', '/feed'],
      spares: [
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
  },
  reddit: {
    feed: {
      applies: ['/', '/best/', '/hot', '/new/', '/top/', '/r/popular/', '/r/popular/top/', '/r/all/', '/news/'],
      spares: [
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
  },
  x: {
    timeline: {
      applies: ['/home', '/explore', '/explore/tabs/for-you'],
      spares: [
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
    trends: {
      applies: ['/home', '/someone', '/someone/status/1234567890', '/search', '/notifications'],
      spares: [],
    },
  },
  youtube: {
    home: {
      applies: ['/'],
      spares: ['/watch', '/feed/subscriptions', '/feed/history', '/results', '/@somechannel', '/shorts/abc123'],
    },
    'up-next': {
      applies: ['/watch'],
      spares: [
        '/',
        '/feed/subscriptions',
        '/feed/playlists',
        '/results',
        '/playlist',
        '/@somechannel/videos',
        '/channel/UCabc123',
        '/shorts/abc123',
      ],
    },
  },
};

const idsOf = (items) => items.map((item) => item.id).sort();

test('the bundled lists are valid', () => {
  assert.deepEqual(validateSites(sites), []);
});

test('every filter file is registered', async () => {
  const files = await readdir(new URL('../../filters/', import.meta.url));
  const ids = files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));

  assert.deepEqual(ids.sort(), idsOf(sites));
});

test('every rule of every site has expectations', () => {
  assert.deepEqual(Object.keys(expectations).sort(), idsOf(sites));
  for (const site of sites) {
    assert.deepEqual(Object.keys(expectations[site.id]).sort(), idsOf(site.rules), site.name);
  }
});

for (const site of sites) {
  for (const rule of site.rules) {
    const { applies = [], spares = [] } = expectations[site.id]?.[rule.id] ?? {};
    const appliesTo = (pathname) => rulesForPath(site, pathname).includes(rule);

    test(`${site.name}, rule "${rule.id}": applies where it should`, () => {
      for (const pathname of applies) {
        assert.ok(appliesTo(pathname), pathname);
      }
    });

    test(`${site.name}, rule "${rule.id}": spares everything else`, () => {
      for (const pathname of spares) {
        assert.ok(!appliesTo(pathname), pathname);
      }
    });
  }
}
