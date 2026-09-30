import http from 'node:http';
import { URL } from 'node:url';
import {
  handleAgentMessage,
  resolveDemoUser,
  runTool,
  getToolsForUser,
} from './orchestrator.mjs';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 65_536);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 600_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);

const defaultAllowedOrigins = [
  'https://boil-dog-94948418.figma.site',
  'http://localhost:8443',
  'http://127.0.0.1:8443',
];

const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || defaultAllowedOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
);

const rateBuckets = new Map();

function originOf(req) {
  const raw = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  return raw.replace(/\/$/, '');
}

function isOriginAllowed(req) {
  const origin = originOf(req);
  if (!origin) return true;
  return allowedOrigins.has(origin);
}

function requestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function rateLimit(req) {
  const now = Date.now();
  const key = requestIp(req);
  const current = rateBuckets.get(key);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.startedAt)) / 1000),
      ),
    };
  }

  return { ok: true, remaining: RATE_LIMIT_MAX - current.count };
}

function baseHeaders(req) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };

  const origin = originOf(req);
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
}

function json(req, res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...baseHeaders(req),
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

async function bodyJson(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error('Corps de requête trop volumineux');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('Corps JSON invalide');
    error.statusCode = 400;
    throw error;
  }
}

function demoUserId(req) {
  return String(req.headers['x-demo-user-id'] || 'amina-benali');
}

function requireUser(req) {
  const userId = demoUserId(req);
  const user = resolveDemoUser(userId);
  if (!user) {
    const error = new Error('Utilisateur de démonstration non reconnu');
    error.statusCode = 401;
    throw error;
  }
  return { userId, user };
}

const server = http.createServer(async (req, res) => {
  if (!isOriginAllowed(req)) {
    json(req, res, 403, { error: 'Origine non autorisée.' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...baseHeaders(req),
      'Access-Control-Allow-Headers': 'Content-Type, x-demo-user-id',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  try {
    const url = new URL(
      req.url || '/',
      `http://${req.headers.host || `${HOST}:${PORT}`}`,
    );

    if (req.method === 'GET' && url.pathname === '/api/health') {
      json(req, res, 200, {
        ok: true,
        service: 'peopleflow-agent',
        provider: 'local',
        environment: process.env.RENDER ? 'render' : 'local',
        now: new Date().toISOString(),
      });
      return;
    }

    const limit = rateLimit(req);
    if (!limit.ok) {
      json(
        req,
        res,
        429,
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        { 'Retry-After': String(limit.retryAfterSeconds) },
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/agent/tools') {
      const { userId, user } = requireUser(req);
      json(req, res, 200, { user, tools: getToolsForUser(userId) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/agent/message') {
      const { userId } = requireUser(req);
      const body = await bodyJson(req);
      if (typeof body.message !== 'string' || !body.message.trim()) {
        json(req, res, 400, { error: 'Le champ message est obligatoire.' });
        return;
      }
      const result = handleAgentMessage({
        userId,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
        message: body.message,
        currentPage: typeof body.currentPage === 'string' ? body.currentPage : undefined,
      });
      json(req, res, 200, result);
      return;
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/agent/workforce/suggestions'
    ) {
      const { user } = requireUser(req);
      const body = await bodyJson(req);
      const result = runTool(user, 'get_workforce_suggestions', {
        date: String(body.date || '2026-10-14'),
        positionId: String(body.positionId || 'l3-setup'),
        assignments: body.assignments,
      });
      if (!result.ok) throw new Error(result.error);
      json(req, res, 200, result.data);
      return;
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/agent/workforce/risks'
    ) {
      const { user } = requireUser(req);
      const body = await bodyJson(req);
      const result = runTool(user, 'get_workforce_risks', {
        date: String(body.date || '2026-10-14'),
        assignments: body.assignments,
      });
      if (!result.ok) throw new Error(result.error);
      json(req, res, 200, result.data);
      return;
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/agent/workforce/skill-backups'
    ) {
      const { user } = requireUser(req);
      const body = await bodyJson(req);
      const result = runTool(user, 'get_skill_backups', {
        skillId: String(body.skillId || 'setup'),
        minimumLevel: Number.isFinite(Number(body.minimumLevel))
          ? Number(body.minimumLevel)
          : 3,
      });
      if (!result.ok) throw new Error(result.error);
      json(req, res, 200, result.data);
      return;
    }

    json(req, res, 404, {
      error: `Route inconnue: ${req.method} ${url.pathname}`,
    });
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    json(req, res, status, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`PeopleFlow Agent API listening on ${HOST}:${PORT}`);
  console.log(`Allowed origins: ${[...allowedOrigins].join(', ')}`);
});
