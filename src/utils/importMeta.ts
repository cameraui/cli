import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';

import type { BuildOptions, Loader, Plugin } from 'esbuild';

const IMPORT_META_URL = '__cui_import_meta_url';
const SHIM_PATH = 'cui:import-meta-url';
const RELATIVE_FILE_URL = /new URL\(\s*(['"])(\.\.?\/[^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g;

const LOADERS: Record<string, Loader> = {
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.jsx': 'jsx',
  '.ts': 'ts',
  '.mts': 'ts',
  '.cts': 'ts',
  '.tsx': 'tsx',
};

export function importMetaOptions(outfile: string): Required<Pick<BuildOptions, 'define' | 'inject' | 'logOverride' | 'plugins'>> {
  return {
    define: {
      'import.meta.url': IMPORT_META_URL,
      'import.meta.dirname': '__dirname',
      'import.meta.filename': '__filename',
      'import.meta.main': 'false',
    },
    inject: [SHIM_PATH],
    logOverride: { 'empty-import-meta': 'error' },
    plugins: [importMetaPlugin(resolve(dirname(outfile), 'assets'))],
  };
}

function importMetaPlugin(assetsDir: string): Plugin {
  return {
    name: 'cui-import-meta',
    setup(build) {
      build.onResolve({ filter: /^cui:import-meta-url$/ }, (args) => ({ path: args.path, namespace: 'cui', sideEffects: false }));

      // an injected module instead of a banner, which would land above "use strict"
      build.onLoad({ filter: /.*/, namespace: 'cui' }, () => ({
        contents: `export const ${IMPORT_META_URL} = require('node:url').pathToFileURL(__filename).href;`,
        loader: 'js',
      }));

      build.onLoad({ filter: /\.[cm]?[jt]sx?$/, namespace: 'file' }, async (args) => {
        const source = await readFile(args.path, 'utf8');
        if (!source.includes('import.meta.url')) return undefined;

        const contents = await rewriteFileUrls(source, dirname(args.path), assetsDir);
        if (contents === source) return undefined;

        return { contents, loader: LOADERS[extname(args.path)], resolveDir: dirname(args.path) };
      });
    },
  };
}

async function rewriteFileUrls(source: string, sourceDir: string, assetsDir: string): Promise<string> {
  let contents = source;

  for (const [expression, , relativePath] of source.matchAll(RELATIVE_FILE_URL)) {
    const file = resolve(sourceDir, relativePath);
    if (!(await isFile(file))) continue;

    const asset = await emitAsset(file, assetsDir);
    contents = contents.replace(expression, () => `new URL('./assets/${asset}', import.meta.url)`);
  }

  return contents;
}

async function emitAsset(file: string, assetsDir: string): Promise<string> {
  const data = await readFile(file);
  const ext = extname(file);
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 8);
  const name = `${basename(file, ext)}-${hash}${ext}`;

  await mkdir(assetsDir, { recursive: true });
  await writeFile(resolve(assetsDir, name), data);
  return name;
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}
