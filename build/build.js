// Builds the loadable extension into dist/.
//
//   npm run build     once
//   npm run dev       again after every change in src/ or filters/

import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sites } from '../filters/index.js';
import { validateSites } from '../src/core/filter-schema.js';
import { compileStylesheet } from '../src/core/stylesheet.js';
import { CONTENT_SCRIPT, POPUP_PAGE, createManifest, stylesheetPath } from './manifest.js';
import { findCssProblems } from './stylesheet-check.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const popupFolder = path.dirname(POPUP_PAGE);

const fromRoot = (...parts) => path.join(root, ...parts);
const toDist = (...parts) => path.join(dist, ...parts);

async function write(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

function assertNoProblems(subject, problems) {
  if (problems.length > 0) {
    throw new Error(`${subject}:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
}

async function compileStylesheets() {
  const stylesheets = sites.map((site) => ({ site, css: compileStylesheet(site) }));
  for (const { site, css } of stylesheets) {
    assertNoProblems(`The stylesheet for "${site.id}" is broken`, await findCssProblems(css));
  }
  return stylesheets;
}

function bundleScripts() {
  return build({
    entryPoints: {
      [path.parse(CONTENT_SCRIPT).name]: fromRoot('src/content/main.js'),
      [`${popupFolder}/popup`]: fromRoot('src/popup/popup.js'),
    },
    outdir: dist,
    bundle: true,
    format: 'iife',
    target: 'chrome105',
    logLevel: 'warning',
  });
}

async function writeManifest() {
  const { version, description, homepage } = JSON.parse(
    await readFile(fromRoot('package.json'), 'utf8'),
  );
  const manifest = createManifest({ version, description, homepage, sites });
  await write(toDist('manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function copyStaticFiles() {
  return Promise.all([
    cp(fromRoot('src/popup/popup.html'), toDist(POPUP_PAGE)),
    cp(fromRoot('src/popup/popup.css'), toDist(popupFolder, 'popup.css')),
    cp(fromRoot('assets/icons'), toDist('icons'), { recursive: true }),
  ]);
}

assertNoProblems('The filter lists need fixing', validateSites(sites));
const stylesheets = await compileStylesheets();

await rm(dist, { recursive: true, force: true });
await mkdir(toDist(popupFolder), { recursive: true });

const [manifest] = await Promise.all([
  writeManifest(),
  bundleScripts(),
  copyStaticFiles(),
  ...stylesheets.map(({ site, css }) => write(toDist(stylesheetPath(site)), css)),
]);

console.log(`Built ${manifest.name} ${manifest.version} for ${sites.length} sites into dist/`);
