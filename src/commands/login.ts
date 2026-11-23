import { confirm, password, text } from '@clack/prompts';

import { handleCancel, showCancel, showIntro, showOutro } from '../utils/banners.js';
import { describeServerError, isUntrustedCertificate, normalizeServerUrl, requestServer, saveLogin } from '../utils/server.js';

import type { ServerLogin } from '../utils/server.js';

export interface LoginOptions {
  insecure?: boolean;
}

export async function loginServer(address: string | undefined, options: LoginOptions): Promise<void> {
  showIntro();

  const input = address ?? handleCancel(await text({ message: 'Server address', placeholder: '192.168.1.10 or https://cameraui.example.com' }));
  const token = handleCancel(await password({ message: 'API token, created under Settings → Account → API tokens' }));
  const login: ServerLogin = { url: normalizeServerUrl(input), token: token.trim(), insecure: options.insecure };

  try {
    await checkLogin(login);
  } catch (error) {
    if (login.insecure || !isUntrustedCertificate(error)) {
      fail(error);
    }

    const trust = handleCancel(await confirm({ message: `${login.url} uses a certificate this computer does not trust. Connect anyway?` }));
    if (!trust) {
      showCancel('Not logged in');
      process.exit(1);
    }

    login.insecure = true;
    await checkLogin(login).catch(fail);
  }

  const file = await saveLogin(login);
  showOutro(`Logged in to ${login.url}, saved in ${file}`);
}

async function checkLogin(login: ServerLogin): Promise<void> {
  await requestServer(login, 'GET', '/api/plugins/local');
}

function fail(error: unknown): never {
  showCancel(describeServerError(error));
  process.exit(1);
}
