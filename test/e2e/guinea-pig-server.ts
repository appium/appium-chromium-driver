import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {sleep} from 'asyncbox';
import {compileLodashTemplate, getFreePort} from './helpers/index.js';

const PKG_ROOT = path.resolve(import.meta.dirname, '../../..');
const FIXTURE_ROOT = path.join(PKG_ROOT, 'test/fixtures/guinea-pig');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

export type GuineaPigServer = {
  host: string;
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
};

export async function startGuineaPigServer(opts?: {host?: string}): Promise<GuineaPigServer> {
  const host = opts?.host ?? '127.0.0.1';
  const port = await getFreePort();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${host}`);
      if (url.pathname === '/test/guinea-pig' && (req.method === 'GET' || req.method === 'POST')) {
        await serveGuineaPig(req, res, url.searchParams);
        return;
      }
      await serveStatic(req, res, url.pathname);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  const baseUrl = `http://${host}:${port}`;
  return {
    host,
    port,
    baseUrl,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

let guineaPigTemplate: ((params: Record<string, unknown>) => string) | undefined;

async function getGuineaPigTemplate(): Promise<(params: Record<string, unknown>) => string> {
  if (!guineaPigTemplate) {
    const content = await fs.readFile(path.join(FIXTURE_ROOT, 'test', 'guinea-pig.html'), 'utf8');
    guineaPigTemplate = compileLodashTemplate(content);
  }
  return guineaPigTemplate;
}

function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(body)) {
    params[key] = value;
  }
  return params;
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function serveGuineaPig(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  query: URLSearchParams,
): Promise<void> {
  const throwError = query.get('throwError') ?? '';
  const delay = parseInt(query.get('delay') ?? '0', 10);
  const params: Record<string, unknown> = {
    throwError,
    serverTime: new Date(),
    userAgent: req.headers['user-agent'],
    comment: 'None',
  };

  if (req.method === 'POST') {
    const body = await readBody(req);
    const form = parseFormBody(body);
    if ('comments' in form) {
      params.comment = form.comments;
    }
  }

  if (delay) {
    await sleep(delay);
  }

  const template = await getGuineaPigTemplate();
  res.setHeader('content-type', 'text/html');
  res.setHeader('Set-Cookie', [
    'guineacookie1=i am a cookie value; Path=/',
    'guineacookie2=cookié2; Path=/',
    'guineacookie3=cant access this; Domain=.blargimarg.com; Path=/',
  ]);
  res.end(template(params));
}

async function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
): Promise<void> {
  const filePath = path.resolve(FIXTURE_ROOT, `.${pathname}`);
  const relative = path.relative(FIXTURE_ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  let content: Buffer;
  try {
    content = await fs.readFile(filePath);
  } catch {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
  res.setHeader('content-type', mime);
  res.end(content);
}
