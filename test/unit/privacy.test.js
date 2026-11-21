// The promises made in PRIVACY.md, checked against the code that ships.
// If one of these tests has to change, PRIVACY.md has to change with it.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

import { createManifest } from '../../build/manifest.js';
import { sites } from '../../filters/index.js';

const root = new URL('../../', import.meta.url);

/** Everything that ends up in the extension is built from these folders. */
const SHIPPED_FOLDERS = ['src/', 'filters/'];

async function shippedFiles() {
  const files = [];
  for (const folder of SHIPPED_FOLDERS) {
    const entries = await readdir(new URL(folder, root), { recursive: true, withFileTypes: true });
    for (const entry of entries.filter((item) => item.isFile())) {
      const url = new URL(`${entry.parentPath ?? entry.path}/${entry.name}`, 'file://');
      files.push({ name: url.pathname.slice(root.pathname.length), text: await readFile(url, 'utf8') });
    }
  }
  return files;
}

/** Fails with the file and the offending text for every match of `pattern`. */
async function assertAbsent(pattern, what, read = (text) => text) {
  for (const { name, text } of await shippedFiles()) {
    const found = read(text).match(pattern);
    assert.equal(found, null, `${name} contains ${what}: ${found?.[0]}`);
  }
}

/** Type annotations in doc comments say `import('./file.js')` without importing anything. */
const withoutDocComments = (text) => text.replace(/\/\*\*[\s\S]*?\*\//g, '');

test('the shipped code has no way to send anything anywhere', async () => {
  await assertAbsent(
    /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bsendBeacon\b|\bimportScripts\b|\bimport\s*\(/,
    'a way to reach the network',
    withoutDocComments,
  );
});

test('the shipped code names no web address', async () => {
  // The one exception is the pattern that tells the browser which sites the
  // extension runs on: "https://*.<domain>/*".
  await assertAbsent(/https?:\/\/(?!\*\.)/, 'a web address');
});

test('the shipped code leaves cookies and the storage of the page alone', async () => {
  await assertAbsent(/document\.cookie|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/, 'access to page data');
});

test('storage is the only browser extension feature in use', async () => {
  const used = new Set();
  for (const { text } of await shippedFiles()) {
    for (const [, feature] of text.matchAll(/\bchrome\.(\w+)/g)) used.add(feature);
  }
  assert.deepEqual([...used], ['storage']);
});

test('the panel loads nothing from outside the extension', async () => {
  const html = await readFile(new URL('src/popup/popup.html', root), 'utf8');
  const references = [...html.matchAll(/\b(?:src|href)="([^"]*)"/g)].map(([, target]) => target);

  assert.deepEqual(references, ['popup.css', 'popup.js']);
});

test('the manifest asks for nothing beyond what the extension needs', () => {
  const manifest = createManifest({
    version: '1.0.0',
    description: 'A description.',
    homepage: 'https://example.com/',
    sites,
  });

  // A new key here means a new capability. Add it on purpose or not at all.
  assert.deepEqual(Object.keys(manifest), [
    'manifest_version',
    'name',
    'version',
    'description',
    'homepage_url',
    'minimum_chrome_version',
    'icons',
    'action',
    'permissions',
    'content_scripts',
  ]);
  assert.deepEqual(manifest.permissions, ['storage']);
});
