import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectLanguage, findFile } from './utils.js';

vi.mock('./logger.js');

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cui-utils-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(rel: string, content = ''): Promise<void> {
  const full = join(dir, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content);
}

describe('findFile', () => {
  it('returns the matching file name', async () => {
    await write('go.mod', 'module x');
    expect(await findFile(dir, { target: 'go.mod', pattern: /^go\.mod$/ })).toBe('go.mod');
  });

  it('returns null when nothing matches', async () => {
    await write('readme.md');
    expect(await findFile(dir, { target: 'go.mod', pattern: /^go\.mod$/ })).toBeNull();
  });

  it('returns null for a missing directory', async () => {
    expect(await findFile(join(dir, 'nope'), { target: 'x', pattern: /^x$/ })).toBeNull();
  });
});

describe('detectLanguage', () => {
  it('detects go from go.mod', async () => {
    await write('go.mod', 'module x');
    expect(await detectLanguage(dir)).toBe('go');
  });

  it('detects go from src/main.go', async () => {
    await write('src/main.go', 'package main');
    expect(await detectLanguage(dir)).toBe('go');
  });

  it('detects python from src/main.py', async () => {
    await write('src/main.py', 'print()');
    expect(await detectLanguage(dir)).toBe('python');
  });

  it('detects python from requirements.txt', async () => {
    await write('requirements.txt');
    expect(await detectLanguage(dir)).toBe('python');
  });

  it('defaults to typescript', async () => {
    await write('package.json', '{}');
    expect(await detectLanguage(dir)).toBe('typescript');
  });

  it('prefers go over python when both are present', async () => {
    await write('go.mod', 'module x');
    await write('src/main.py', 'print()');
    expect(await detectLanguage(dir)).toBe('go');
  });
});
