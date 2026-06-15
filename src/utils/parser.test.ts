import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectJsProjectType } from './parser.js';

vi.mock('./logger.js');

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cui-parser-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(rel: string, content = ''): Promise<void> {
  const full = join(dir, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content);
}

describe('detectJsProjectType', () => {
  it('detects typescript-esm (type:module + tsconfig)', async () => {
    await write('package.json', JSON.stringify({ type: 'module' }));
    await write('tsconfig.json', '{}');
    expect(await detectJsProjectType(dir)).toBe('typescript-esm');
  });

  it('detects typescript-cjs (no type + tsconfig)', async () => {
    await write('package.json', JSON.stringify({}));
    await write('tsconfig.json', '{}');
    expect(await detectJsProjectType(dir)).toBe('typescript-cjs');
  });

  it('detects javascript-esm (type:module, no tsconfig)', async () => {
    await write('package.json', JSON.stringify({ type: 'module' }));
    expect(await detectJsProjectType(dir)).toBe('javascript-esm');
  });

  it('detects javascript-cjs (no type, no tsconfig)', async () => {
    await write('package.json', JSON.stringify({}));
    expect(await detectJsProjectType(dir)).toBe('javascript-cjs');
  });

  it('falls back to javascript-cjs without a package.json', async () => {
    expect(await detectJsProjectType(dir)).toBe('javascript-cjs');
  });

  it('falls back to javascript-cjs for a python project', async () => {
    await write('package.json', JSON.stringify({ type: 'module' }));
    await write('src/main.py', 'print()');
    expect(await detectJsProjectType(dir)).toBe('javascript-cjs');
  });
});
