import { pathExists } from 'fs-extra/esm';
import { readFile, rm } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import * as tsImport from 'ts-import';

import { error } from './logger.js';
import { detectLanguage } from './utils.js';

import type { CameraUiBuildOptions } from '../types.js';

type ProjectType = 'javascript-cjs' | 'javascript-esm' | 'typescript-cjs' | 'typescript-esm';

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectJsProjectType(rootDir: string): Promise<ProjectType> {
  try {
    const pluginLanguage = await detectLanguage(rootDir);
    if (pluginLanguage === 'python') {
      throw new Error(`Invalid project type: ${pluginLanguage}`);
    }

    const packageJson = JSON.parse(await readFile(resolve(rootDir, 'package.json'), 'utf-8'));
    const hasTypeScript = await fileExists(resolve(rootDir, 'tsconfig.json'));
    const isESM = packageJson.type === 'module';

    return hasTypeScript ? (isESM ? 'typescript-esm' : 'typescript-cjs') : isESM ? 'javascript-esm' : 'javascript-cjs';
  } catch {
    return 'javascript-cjs';
  }
}

export async function loadConfig(): Promise<CameraUiBuildOptions> {
  const tsConfigPath = resolve(process.cwd(), 'cameraui.config.ts');
  const jsConfigPath = resolve(process.cwd(), 'cameraui.config.js');

  try {
    if (await pathExists(tsConfigPath)) {
      const asyncResult = await tsImport.load(tsConfigPath, { useCache: false });
      const cacheDir = resolve(process.cwd(), '.cache');
      await rm(cacheDir, { force: true, recursive: true });
      return asyncResult.default ?? asyncResult;
    }

    if (await pathExists(jsConfigPath)) {
      const config = await import(jsConfigPath);
      return config.default ?? config;
    }

    return {};
  } catch (err) {
    error(`Failed to load config: ${err instanceof Error ? err.message : String(err)}`);
    return {};
  }
}

export interface ParsedConfig {
  userConfig: CameraUiBuildOptions;
  projectType: ProjectType;
  targetRootDir: string;
  entryPoint: string;
  outputFile: string;
}

export async function parseConfig(): Promise<ParsedConfig> {
  const userConfig = await loadConfig();
  const cliRootDir = process.cwd();
  const targetRootDir = userConfig.rootDir ? (isAbsolute(userConfig.rootDir) ? userConfig.rootDir : resolve(cliRootDir, userConfig.rootDir)) : cliRootDir;

  const projectType = await detectJsProjectType(targetRootDir);
  const outputDir = resolve(targetRootDir, 'bundle', 'dist');
  const isTypeScript = projectType.startsWith('typescript');

  // Determine entry point
  let entryPoint: string;
  if (typeof userConfig.input === 'string') {
    entryPoint = resolve(targetRootDir, userConfig.input);
  } else if (Array.isArray(userConfig.input) && userConfig.input.length > 0) {
    entryPoint = resolve(targetRootDir, userConfig.input[0]);
  } else {
    entryPoint = resolve(targetRootDir, isTypeScript ? 'src/index.ts' : 'src/index.js');
  }

  return {
    userConfig,
    projectType,
    targetRootDir,
    entryPoint,
    outputFile: resolve(outputDir, 'index.js'),
  };
}
