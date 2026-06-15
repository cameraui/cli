#!/usr/bin/env node

import { Command } from 'commander';

import { artifactsCommand } from './commands/artifacts.js';
import { buildProject } from './commands/bundle.js';
import { createProject } from './commands/create.js';
import { publishProject } from './commands/publish.js';
import pJson from './utils/pjson.js';

const program = new Command();

program.name('cui').version(pJson.version);

program
  .command('bundle')
  .description('Bundle the project')
  .option('-t, --target <goos-goarch>', 'Restrict the Go build to a single target (e.g. linux-amd64) — used by CI matrix jobs')
  .action(async (options: { target?: string }) => {
    await buildProject({ target: options.target });
  });

program
  .command('artifacts')
  .description('Aggregate per-platform binaries downloaded from CI matrix jobs into a publish-ready bundle (Go plugins only)')
  .option('-d, --dir <path>', 'Directory containing downloaded artifacts (default: ./artifacts)')
  .action(async (options: { dir?: string }) => {
    await artifactsCommand({ dir: options.dir });
  });

program
  .command('create <project-name>')
  .description('Create a new camera.ui plugin project')
  .action(async (name) => {
    await createProject(name);
  });

program
  .command('publish')
  .description('Publish the project to NPM')
  .option('-a, --alpha', 'Publish an alpha version')
  .option('-b, --beta', 'Publish a beta version')
  .option('-l, --latest', 'Publish a latest version')
  .action(async (options) => {
    await publishProject(options);
  });

program.parse(process.argv);
