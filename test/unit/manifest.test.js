import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createManifest } from '../../build/manifest.js';
import { sites } from '../../filters/index.js';

const manifest = createManifest({
  version: '1.2.3',
  description: 'A description.',
  homepage: 'https://example.com/',
  sites,
});

test('version, description and homepage come from the caller', () => {
  assert.equal(manifest.version, '1.2.3');
  assert.equal(manifest.description, 'A description.');
  assert.equal(manifest.homepage_url, 'https://example.com/');
});

test('the extension asks for storage and nothing else', () => {
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.background, undefined);
});

test('every site gets its own stylesheet and the shared script, before the page renders', () => {
  assert.equal(manifest.content_scripts.length, sites.length);

  for (const [index, site] of sites.entries()) {
    assert.deepEqual(manifest.content_scripts[index], {
      matches: site.domains.map((domain) => `https://*.${domain}/*`),
      css: [`filters/${site.id}.css`],
      js: ['content.js'],
      run_at: 'document_start',
    });
  }
});
