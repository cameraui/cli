import { pathExists } from 'fs-extra/esm';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ModuleResolutionPaths {
  customPaths?: string[];
  includeLocalModules?: boolean;
  includeCliModules?: boolean;
  includeGlobalModules?: boolean;
}

export class ModuleResolver {
  private readonly cwd: string;
  private readonly cliRoot: string;
  private readonly globalRoot: string;

  constructor() {
    this.cwd = process.cwd();
    this.cliRoot = resolve(__dirname, '../..');
    this.globalRoot = dirname(dirname(process.execPath));
  }

  public async resolveModule(modulePath: string, options: ModuleResolutionPaths & { silent?: boolean } = {}): Promise<string> {
    // If path is absolute, just check if it exists
    if (isAbsolute(modulePath)) {
      if (await pathExists(modulePath)) {
        return modulePath;
      }
      if (!options.silent) {
        throw new Error(`Could not resolve module: ${modulePath}`);
      }
      return modulePath;
    }

    const paths = this.getNodeModulesPaths(options);
    const possiblePaths = paths.map((p) => resolve(p, modulePath));

    for (const path of possiblePaths) {
      if (await pathExists(path)) {
        return path;
      }
    }

    if (!options.silent) {
      throw new Error(`Could not resolve module: ${modulePath}\nSearched in:\n${possiblePaths.map((p) => `- ${p}`).join('\n')}`);
    }

    return possiblePaths[0];
  }

  public async resolveModules(modulePaths: string[], options: ModuleResolutionPaths & { silent?: boolean } = {}): Promise<string[]> {
    return Promise.all(modulePaths.map((p) => this.resolveModule(p, options)));
  }

  public getWebpackLoaderConfig(options: ModuleResolutionPaths = {}): { resolveLoader: { modules: string[] } } {
    return {
      resolveLoader: {
        modules: this.getNodeModulesPaths(options),
      },
    };
  }

  public getWebpackResolveConfig(options: ModuleResolutionPaths = {}): { resolve: { modules: string[] } } {
    return {
      resolve: {
        modules: this.getNodeModulesPaths(options),
      },
    };
  }

  public async resolveBabelModule(modulePath: string, options: { config?: any; silent?: boolean } = {}): Promise<[string, any] | string> {
    const resolvedPath = await this.resolveModule(modulePath, { silent: options.silent });
    return options.config ? [resolvedPath, options.config] : resolvedPath;
  }

  public getCliRoot(): string {
    return this.cliRoot;
  }

  public getCwd(): string {
    return this.cwd;
  }

  public getGlobalRoot(): string {
    return this.globalRoot;
  }

  private getNodeModulesPaths(options: ModuleResolutionPaths = {}): string[] {
    const { customPaths = [], includeLocalModules = true, includeCliModules = true, includeGlobalModules = true } = options;

    const paths: string[] = [];

    // Add custom paths first
    paths.push(...customPaths.map((p) => resolve(p)));

    // Add local node_modules (when installed as dependency)
    if (includeLocalModules) {
      paths.push(resolve(this.cwd, 'node_modules'));
    }

    // Add CLI package node_modules
    if (includeCliModules) {
      paths.push(resolve(this.cliRoot, 'node_modules'));
    }

    // Add global node_modules
    if (includeGlobalModules) {
      if (process.platform === 'win32') {
        paths.push(resolve(this.globalRoot, 'node_modules'));
      } else {
        paths.push(resolve(this.globalRoot, 'lib/node_modules'), '/usr/local/lib/node_modules', '/usr/lib/node_modules');
      }
    }

    return paths;
  }
}

export const moduleResolver = new ModuleResolver();
export const resolveModule = moduleResolver.resolveModule.bind(moduleResolver);
export const resolveModules = moduleResolver.resolveModules.bind(moduleResolver);
export const resolveBabelModule = moduleResolver.resolveBabelModule.bind(moduleResolver);
export const getWebpackLoaderConfig = moduleResolver.getWebpackLoaderConfig.bind(moduleResolver);
export const getWebpackResolveConfig = moduleResolver.getWebpackResolveConfig.bind(moduleResolver);
