import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWindows = platform() === 'win32';

function chmod() {
  const scriptPath = resolve(__dirname, '../dist/index.js');
  const arg = isWindows ? 'echo "Skipping chmod command on Windows"' : `chmod +x ${scriptPath}`;
  execSync(arg, { stdio: 'inherit' });
}

chmod();
