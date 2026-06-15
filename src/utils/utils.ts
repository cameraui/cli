import { copyFile, cp, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import * as log from '../utils/logger.js';

import type { PluginLanguage } from '../types.js';

export interface RequiredFile {
  target: string;
  pattern: RegExp;
  optional?: boolean;
}

export async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function findFile(targetDir: string, file: RequiredFile): Promise<string | null> {
  try {
    const files = await readdir(targetDir);
    return files.find((f) => file.pattern.test(f)) ?? null;
  } catch {
    log.warn(`Unable to read directory ${targetDir}`);
    return null;
  }
}

export async function detectLanguage(rootDir: string): Promise<PluginLanguage> {
  try {
    const srcDir = resolve(rootDir, 'src');

    // Check for Go
    const hasGoMod = await findFile(rootDir, { target: 'go.mod', pattern: /^go\.mod$/ });
    const hasMainGo = await findFile(srcDir, { target: 'main.go', pattern: /^main\.go$/ });
    if (hasGoMod || hasMainGo) return 'go';

    const hasPythonFiles = await findFile(srcDir, {
      target: 'main.py',
      pattern: /^main\.py$/i,
    });

    const hasRequirements = await findFile(rootDir, {
      target: 'requirements.txt',
      pattern: /^requirements\.txt$/i,
    });

    if (hasPythonFiles || hasRequirements) {
      return 'python';
    }

    // Default to TypeScript (JavaScript is no longer supported)
    return 'typescript';
  } catch {
    return 'typescript';
  }
}

export async function copyPath(rootDir: string, source: string, dest: string, targetFilename?: string): Promise<void> {
  try {
    const sourcePath = resolve(rootDir, source);
    const destPath = resolve(dest, targetFilename ?? source);

    await ensureDir(dirname(destPath));
    const stats = await stat(sourcePath);

    if (stats.isDirectory()) {
      await cp(sourcePath, destPath, {
        recursive: true,
        force: true,
        preserveTimestamps: true,
      });
      log.fileOperation('dir', source, true);
    } else {
      await copyFile(sourcePath, destPath);
      log.fileOperation('file', source, true);
    }
  } catch {
    log.fileOperation('file', source, false);
  }
}
