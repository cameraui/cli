import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import type { RequestOptions } from 'node:https';

export interface ServerLogin {
  url: string;
  token: string;
  insecure?: boolean;
}

export interface RequestBody {
  type: string;
  data: Buffer;
}

interface LoginStore {
  default?: string;
  servers: Record<string, Omit<ServerLogin, 'url'>>;
}

const DEFAULT_PORT = 3443;
const LOGIN_FILE = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'camera.ui-cli', 'login.json');
const UNTRUSTED_CERT_CODES = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

export class ServerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export function normalizeServerUrl(input: string): string {
  const hasScheme = /^https?:\/\//i.test(input);
  const url = new URL(hasScheme ? input : `https://${input}`);
  if (!hasScheme && !url.port) url.port = String(DEFAULT_PORT);
  return url.origin;
}

export function describeServerError(error: unknown): string {
  if (error instanceof ServerError) {
    if (error.statusCode === 401) return 'The server did not accept the token, log in again with "cui login".';
    if (error.statusCode === 403) return 'The token belongs to a user without admin rights. Installing plugins needs an admin.';
    if (error.statusCode === 404) return 'This camera.ui cannot install plugins from a file yet, update it first.';
  }
  if (isUntrustedCertificate(error)) return 'The server uses a certificate this computer does not trust. Confirm it with "cui login", or pass --insecure.';
  return error instanceof Error ? error.message : String(error);
}

export function isUntrustedCertificate(error: unknown): boolean {
  return UNTRUSTED_CERT_CODES.has((error as NodeJS.ErrnoException)?.code ?? '');
}

export async function saveLogin(login: ServerLogin): Promise<string> {
  const store = await readLogins();
  store.servers[login.url] = { token: login.token, ...(login.insecure && { insecure: true }) };
  store.default = login.url;

  await mkdir(dirname(LOGIN_FILE), { recursive: true });
  await writeFile(LOGIN_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
  return LOGIN_FILE;
}

export async function resolveLogin(server?: string, insecure?: boolean): Promise<ServerLogin> {
  const store = await readLogins();
  const address = server ?? process.env.CAMERAUI_SERVER;
  const url = address ? normalizeServerUrl(address) : store.default;
  if (!url) {
    throw new Error('No server yet. Run "cui login <address>" first.');
  }

  const saved = store.servers[url];
  const token = process.env.CAMERAUI_TOKEN ?? saved?.token;
  if (!token) {
    throw new Error(`Not logged in to ${url}. Run "cui login ${url}" first.`);
  }

  return { url, token, insecure: insecure ?? saved?.insecure };
}

export function requestServer<T>(login: ServerLogin, method: string, path: string, body?: RequestBody): Promise<T> {
  const url = new URL(path, login.url);
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
  const options: RequestOptions = {
    method,
    headers: {
      authorization: `Bearer ${login.token}`,
      ...(body && { 'content-type': body.type, 'content-length': body.data.length }),
    },
    rejectUnauthorized: !login.insecure,
  };

  return new Promise((resolve, reject) => {
    const req = request(url, options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const json = parseJson(text);
        const status = res.statusCode ?? 0;
        if (status >= 400) {
          reject(new ServerError(json?.message ?? `${status} ${res.statusMessage ?? ''}`.trim(), status));
          return;
        }
        resolve(json as T);
      });
    });
    req.on('error', reject);
    req.end(body?.data);
  });
}

export function multipartFile(field: string, filename: string, data: Buffer): RequestBody {
  const boundary = `----cui${randomBytes(12).toString('hex')}`;
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: application/gzip\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { type: `multipart/form-data; boundary=${boundary}`, data: Buffer.concat([head, data, tail]) };
}

async function readLogins(): Promise<LoginStore> {
  try {
    return JSON.parse(await readFile(LOGIN_FILE, 'utf8'));
  } catch {
    return { servers: {} };
  }
}

function parseJson(text: string): any {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}
