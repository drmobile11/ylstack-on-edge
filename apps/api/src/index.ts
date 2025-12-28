// Edge Starter Core API Application
// Runtime-agnostic using Hono + tRPC
// Can run on: Cloudflare Workers, Vercel Edge, Deno Deploy, Node.js

import { Hono } from 'hono';
import type { AppEnv } from './types.ts';

const app = new Hono<{ Bindings: AppEnv }>().basePath('/api');

// === Middleware ===

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[Hono] ${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
});

// Tenant context injection (multi-tenancy)
app.use('*', async (c, next) => {
  const tenantId = c.req.header('x-tenant-id') || 'default';
  (c as any).tenantId = tenantId;
  await next();
});

// === Health Check ===
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    runtime: 'hono',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// === Example Route ===
app.get('/hello', (c) => {
  const name = c.req.query('name') || 'World';
  return c.json({
    message: `Hello, ${name}!`,
    runtime: c.env?.NODE_ENV || 'edge', // ✅ Use Hono context env, not process.env
  });
});

// === tRPC Endpoint ===
// All business logic flows through tRPC for type safety
app.all('/trpc/*', async (c) => {
  // Extract path after /api/trpc
  const path = c.req.path.replace('/api/trpc', '');
  
  return new Response(
    JSON.stringify({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'tRPC adapter implementation pending for this runtime',
      },
    }),
    {
      status: 501,
      headers: { 'content-type': 'application/json' },
    }
  );
});

// === System Routes ===
app.get('/status', (c) => {
  return c.json({
    name: 'Edge Starter Platform',
    phase: 'Foundation',
    features: {
      multiTenant: true,
      edgeNative: true,
      runtimeAgnostic: true,
    },
  });
});

// === Error Handler ===
app.onError((err, c) => {
  console.error('[Hono Error]', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
      },
    },
    { status: 500 }
  );
});

// === 404 Handler ===
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    },
    { status: 404 }
  );
});

export default app;
