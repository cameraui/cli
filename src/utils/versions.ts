import { exec } from 'node:child_process';
import https from 'node:https';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface NodeVersion {
  version: string;
  lts: boolean;
  releaseDate: string;
}

export interface CameraUiVersionInfo {
  latest: string;
  alpha?: string;
  beta?: string;
}

interface NodeVersionInfo {
  version: string;
  date: string;
  files: string[];
  npm: string;
  v8: string;
  uv: string;
  zlib: string;
  openssl: string;
  modules: string;
  lts: boolean;
  security: boolean;
}

export function getLatestNodeLTSVersion(): Promise<NodeVersion> {
  return new Promise((resolve, reject) => {
    https
      .get('https://nodejs.org/dist/index.json', (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const versions: NodeVersionInfo[] = JSON.parse(data);
            const latestLTS = versions.filter((node) => node.lts).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            resolve({
              version: latestLTS.version.split('v')[1],
              lts: latestLTS.lts,
              releaseDate: latestLTS.date,
            });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export async function getLatestCameraUiVersion(): Promise<CameraUiVersionInfo> {
  const { stdout } = await execAsync('npm view @camera.ui/server dist-tags --json');
  const info: CameraUiVersionInfo = JSON.parse(stdout);
  return info;
}
