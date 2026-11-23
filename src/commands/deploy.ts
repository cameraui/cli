import { watch } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';
import { io } from 'socket.io-client';
import { create } from 'tar';

import { showCancel, showIntro, showOutro } from '../utils/banners.js';
import * as log from '../utils/logger.js';
import { describeServerError, multipartFile, requestServer, resolveLogin } from '../utils/server.js';
import { bundleProject, nodeArchToGoarch, nodeOsToGoos } from './bundle.js';

import type { GoTarget } from '../types.js';
import type { ServerLogin } from '../utils/server.js';

export interface DeployOptions {
  server?: string;
  insecure?: boolean;
  watch?: boolean;
}

interface HostPlatform {
  os: string;
  arch: string;
  libc?: GoTarget['libc'];
}

interface DeployedPlugin {
  pluginName: string;
  installedVersion?: string;
}

const WATCH_DEBOUNCE_MS = 300;
const IGNORED_DIRS = new Set(['node_modules', 'bundle', 'dist', 'artifacts', '__pycache__', 'venv']);

export async function deployProject(options: DeployOptions): Promise<void> {
  showIntro();

  let login: ServerLogin;
  let target: GoTarget;
  try {
    login = await resolveLogin(options.server, options.insecure);
    const host = await requestServer<HostPlatform>(login, 'GET', '/api/plugins/local');
    target = { goos: nodeOsToGoos(host.os) as GoTarget['goos'], goarch: nodeArchToGoarch(host.arch) as GoTarget['goarch'], libc: host.libc };
  } catch (error) {
    showCancel(describeServerError(error));
    process.exit(1);
  }

  if (options.watch) {
    watchAndDeploy(login, target);
    return;
  }

  await deploy(login, target).catch(() => process.exit(1));
  showOutro('Deployed!');
}

async function deploy(login: ServerLogin, target: GoTarget): Promise<DeployedPlugin> {
  const bundleDir = await bundleProject({ deployTo: target });
  const staging = await mkdtemp(join(tmpdir(), 'cui-deploy-'));

  try {
    const archive = join(staging, 'plugin.tgz');
    await create({ gzip: true, portable: true, cwd: bundleDir, prefix: 'package', file: archive }, await readdir(bundleDir));

    log.info(`Installing on ${login.url}...`);
    const startTime = Date.now();
    const plugin = await requestServer<DeployedPlugin>(login, 'POST', '/api/plugins/local', multipartFile('upload', 'plugin.tgz', await readFile(archive)));
    log.success(`${plugin.pluginName}@${plugin.installedVersion} is running the new build ${pc.dim(`(${Date.now() - startTime}ms)`)}`);
    return plugin;
  } catch (error) {
    log.error(describeServerError(error));
    throw error;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function watchAndDeploy(login: ServerLogin, target: GoTarget): void {
  let streaming = false;
  let running = false;
  let again = false;
  let timer: NodeJS.Timeout | undefined;

  const run = async (): Promise<void> => {
    if (running) {
      again = true;
      return;
    }

    running = true;
    try {
      const plugin = await deploy(login, target);
      if (!streaming) {
        streaming = true;
        streamPluginLog(login, plugin.pluginName);
      }
    } catch {
      // deploy reported it, the next change tries again
    } finally {
      running = false;
    }

    if (again) {
      again = false;
      await run();
      return;
    }
    log.info(pc.dim('Watching for changes, Ctrl+C to stop'));
  };

  watch(process.cwd(), { recursive: true }, (_event, file) => {
    if (!file || isIgnored(file)) return;
    clearTimeout(timer);
    timer = setTimeout(run, WATCH_DEBOUNCE_MS);
  });

  run();
}

function streamPluginLog(login: ServerLogin, pluginName: string): void {
  const socket = io(`${login.url}/logs`, {
    path: '/api/socket.io',
    transports: ['websocket'],
    auth: { token: `Bearer ${login.token}` },
    rejectUnauthorized: !login.insecure,
  });

  let warned = false;

  socket.on('connect', () => {
    warned = false;
    socket.emit('get-plugin-log', pluginName, { sinceLastStart: true });
  });
  socket.on(`stdout/${pluginName}`, (chunk: string) => {
    process.stdout.write(chunk);
  });
  // retries on its own, a server restart would print this on every attempt
  socket.on('connect_error', (error) => {
    if (warned) return;
    warned = true;
    log.warn(`Plugin log not available: ${error.message}`);
  });
}

function isIgnored(file: string): boolean {
  return file.split(/[\\/]/).some((part) => part.startsWith('.') || IGNORED_DIRS.has(part) || part.endsWith('~'));
}
