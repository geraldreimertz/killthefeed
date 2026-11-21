// Packs the built extension into kill-the-feed.zip, the file people download.
// The zip holds a single folder, so unzipping it gives exactly the folder
// Chrome asks for.
//
//   npm run package     builds first, then packs
//
// Needs the `zip` command, which macOS and Linux bring along.

import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'kill-the-feed';

const root = fileURLToPath(new URL('..', import.meta.url));
const archive = path.join(root, `${NAME}.zip`);
const staging = await mkdtemp(path.join(tmpdir(), `${NAME}-`));

try {
  await cp(path.join(root, 'dist'), path.join(staging, NAME), { recursive: true });
  await rm(archive, { force: true });
  // -X leaves out file attributes that differ from machine to machine.
  execFileSync('zip', ['-r', '-X', '-q', archive, NAME], { cwd: staging });
} finally {
  await rm(staging, { recursive: true, force: true });
}

console.log(`Packed dist/ into ${NAME}.zip`);
