import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { importMetaOptions } from './importMeta.js';

let dir: string;
let outfile: string;

beforeEach(async () => {
  dir = await realpath(await mkdtemp(join(tmpdir(), 'cui-import-meta-')));
  outfile = join(dir, 'bundle', 'dist', 'index.js');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(rel: string, content: string): Promise<void> {
  const full = join(dir, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content);
}

async function bundle(entry: string): Promise<void> {
  await write('src/index.ts', entry);
  await esbuild.build({
    entryPoints: [join(dir, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile,
    minify: true,
    logLevel: 'silent',
    ...importMetaOptions(outfile),
  });
}

describe('importMetaOptions', () => {
  beforeEach(async () => {
    await write('node_modules/esm-dep/package.json', JSON.stringify({ name: 'esm-dep', version: '1.2.3', type: 'module', main: 'lib/index.js' }));
    await write(
      'node_modules/esm-dep/lib/index.js',
      [
        "import { readFileSync } from 'node:fs';",
        "export const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')).version;",
        'export const dir = import.meta.dirname;',
        'export const url = import.meta.url;',
      ].join('\n'),
    );
  });

  it('ships files a dependency reads relative to import.meta.url', async () => {
    await bundle("export { version } from 'esm-dep';");

    const assets = await readdir(join(dirname(outfile), 'assets'));
    expect(assets).toEqual([expect.stringMatching(/^package-[0-9a-f]{8}\.json$/)]);
    expect(createRequire(import.meta.url)(outfile).version).toBe('1.2.3');
  });

  it('points import.meta.url and dirname at the bundle', async () => {
    await bundle("export { dir, url } from 'esm-dep';");

    const mod = createRequire(import.meta.url)(outfile);
    expect(mod.dir).toBe(dirname(outfile));
    expect(mod.url).toMatch(/\/bundle\/dist\/index\.js$/);
  });

  it('keeps use strict at the top of the bundle', async () => {
    await bundle("'use strict';\nexport { version } from 'esm-dep';");

    expect(await readFile(outfile, 'utf8')).toMatch(/^"use strict";/);
  });

  it('leaves the bundle untouched without import.meta', async () => {
    await bundle('export const answer = 42;');

    expect(existsSync(join(dirname(outfile), 'assets'))).toBe(false);
    expect(await readFile(outfile, 'utf8')).not.toContain('pathToFileURL');
  });

  it('fails the build on import.meta it cannot map', async () => {
    await expect(bundle("export const resolved = import.meta.resolve('esm-dep');")).rejects.toThrow(/import\.meta/);
  });
});
