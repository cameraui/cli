import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { showIntro, showOutro } from '../utils/banners.js';
import * as log from '../utils/logger.js';
import { parseConfig } from '../utils/parser.js';
import { detectLanguage, ensureDir } from '../utils/utils.js';

import type { GoTarget } from '../types.js';

export interface ArtifactsOptions {
  dir?: string;
}

export interface DiscoveredBinary {
  goos: string;
  goarch: string;
  sourcePath: string;
}

async function discoverBinaries(artifactsDir: string, pluginName: string, knownTargets: GoTarget[]): Promise<DiscoveredBinary[]> {
  const found: DiscoveredBinary[] = [];
  const targetSet = new Set(knownTargets.map((t) => `${t.goos}-${t.goarch}`));

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      // Match `<pluginName>-<goos>-<goarch>` or `<pluginName>-<goos>-<goarch>.exe`
      const stripped = entry.name.endsWith('.exe') ? entry.name.slice(0, -4) : entry.name;
      const prefix = `${pluginName}-`;
      if (!stripped.startsWith(prefix)) continue;
      const rest = stripped.slice(prefix.length); // "<goos>-<goarch>"
      if (!targetSet.has(rest)) continue;
      const dashIdx = rest.lastIndexOf('-');
      const goos = rest.slice(0, dashIdx);
      const goarch = rest.slice(dashIdx + 1);
      found.push({ goos, goarch, sourcePath: fullPath });
    }
  }

  if (!existsSync(artifactsDir)) {
    throw new Error(`Artifacts directory not found: ${artifactsDir}`);
  }
  await walk(artifactsDir);
  return found;
}

export async function artifactsCommand(options: ArtifactsOptions = {}): Promise<void> {
  const startTime = Date.now();
  showIntro();

  const artifactsDir = resolve(process.cwd(), options.dir ?? 'artifacts');
  log.info(`Aggregating artifacts from: ${artifactsDir}`);

  const { userConfig, targetRootDir } = await parseConfig();
  const rootDir = userConfig.rootDir ? resolve(process.cwd(), userConfig.rootDir) : process.cwd();
  const pluginLanguage = userConfig.language ?? (await detectLanguage(rootDir));

  if (pluginLanguage !== 'go') {
    throw new Error(`'artifacts' command is only supported for Go plugins (detected: ${pluginLanguage})`);
  }

  const packageJsonPath = resolve(rootDir, 'package.json');
  const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent) as { name?: string; version?: string; license?: string };
  if (!packageJson.name) {
    throw new Error('package.json is missing required "name" field.');
  }
  const pluginName = packageJson.name.replace(/^@[^/]+\//, '');
  const packageScope = packageJson.name.includes('/') ? packageJson.name.split('/')[0] : undefined;

  // The plugin's configured targets are the source of truth for which
  // platforms it ships. If a binary for an unconfigured target shows up in
  // the artifacts dir, it's silently skipped (operator error or stale CI run).
  const goOpts = userConfig.go;
  const knownTargets = goOpts?.targets ?? [];
  if (knownTargets.length === 0) {
    throw new Error("No `go.targets` configured in cameraui.config.ts — can't determine which artifacts to consume.");
  }

  const discovered = await discoverBinaries(artifactsDir, pluginName, knownTargets);
  if (discovered.length === 0) {
    throw new Error(`No matching binaries found in ${artifactsDir} (looking for "${pluginName}-<goos>-<goarch>[.exe]")`);
  }

  log.info(`Found ${discovered.length}/${knownTargets.length} target binaries:`);
  for (const b of discovered) {
    log.info(`  ${b.goos}-${b.goarch}`);
  }
  const missingTargets = knownTargets.filter((t) => !discovered.some((d) => d.goos === t.goos && d.goarch === t.goarch));
  if (missingTargets.length > 0) {
    log.error(`  Missing: ${missingTargets.map((t) => `${t.goos}-${t.goarch}`).join(', ')}`);
    throw new Error('Some target binaries are missing — refusing to ship a partial bundle.');
  }

  // Stage binaries into bundle/dist/bin/ with the canonical naming convention
  // `<pluginName>-<goos>-<goarch>[.exe]`, then hand off to the same staging
  // routine that the multi-target build uses.
  const bundleDir = resolve(targetRootDir, 'bundle');
  const binDir = resolve(bundleDir, 'dist', 'bin');
  await ensureDir(binDir);

  for (const b of discovered) {
    const ext = b.goos === 'windows' ? '.exe' : '';
    const targetPath = resolve(binDir, `${pluginName}-${b.goos}-${b.goarch}${ext}`);
    await mkdir(dirname(targetPath), { recursive: true });
    await rename(b.sourcePath, targetPath);
  }

  // Late import of staging helper avoids a top-level require cycle between
  // bundle.ts and artifacts.ts.
  const { stagePlatformPackages } = await import('./bundle.js');
  await stagePlatformPackages({
    targets: knownTargets,
    binDir,
    bundleDir,
    pluginName,
    packageScope,
    packageJson,
    rootDir,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log.success(`Artifacts aggregated in ${elapsed}s — bundle/ is ready to publish`);
  showOutro('Done');
}
