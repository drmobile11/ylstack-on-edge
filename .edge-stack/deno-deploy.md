# 🦕 Deno Deploy Adapter Guide

## Overview

The Deno Deploy adapter enables your Edge Starter Kit to run on Deno Deploy with **zero code changes** to your business logic. This guide covers setup, deployment, and optimization for Deno's edge runtime.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Local Development](#local-development)
4. [Environment Variables](#environment-variables)
5. [Deployment](#deployment)
6. [Performance Optimization](#performance-optimization)
7. [Deno KV Integration](#deno-kv-integration)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# Install Deno (if not already installed)
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# Verify installation
deno --version
```

### Install Deno Deploy CLI

```bash
# Install deployctl globally
deno install -A --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# Verify installation
deployctl --version
```

### Run Locally

```bash
# Start development server with hot reload
deno task dev

# Or using npm scripts
npm run deno:dev
```

**Expected Output**:
```
🦕 Deno Deploy server running on http://localhost:8000
📊 Environment: development
🚀 API Version: 1.0.0
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/api/health

# Hello endpoint
curl http://localhost:8000/api/hello

# Hello with query parameter
curl "http://localhost:8000/api/hello?name=Deno"

# Status endpoint
curl http://localhost:8000/api/status
```

---

## Architecture

### Adapter Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    Deno Deploy Runtime                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  apps/api/deploy/deno.ts (Adapter Layer)        │   │
│  │  • Deno.serve() handler                          │   │
│  │  • Environment variable mapping                  │   │
│  │  • Deno KV integration (optional)                │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                    │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │  apps/api/src/index.ts (Core Hono App)          │   │
│  │  • Platform-agnostic business logic              │   │
│  │  • Route handlers                                │   │
│  │  • Middleware                                    │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                    │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │  Web Standard APIs                               │   │
│  │  • fetch(), Request, Response                    │   │
│  │  • crypto.randomUUID()                           │   │
│  │  • URL, Headers                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Key Differences from Cloudflare

| Feature | Cloudflare Workers | Deno Deploy | Adapter Handles |
|---------|-------------------|-------------|-----------------|
| **Entry Point** | `export default { fetch }` | `Deno.serve()` | ✅ Yes |
| **Environment** | `env` parameter | `Deno.env.get()` | ✅ Yes |
| **Port Config** | Managed by CF | Port 8000 default | ✅ Yes |
| **TypeScript** | Via wrangler | Native support | ✅ No change needed |
| **Permissions** | Automatic | Explicit flags | ✅ Configured in deno.json |

---

## Local Development

### Development Server

```bash
# Start with hot reload (recommended)
deno task dev

# Start without hot reload
deno task start

# Type check without running
deno task check
```

### Development Workflow

1. **Make changes** to `apps/api/src/` files
2. **Save** - Deno automatically reloads (with `--watch` flag)
3. **Test** endpoints using curl or browser
4. **Check types** with `deno task check`

### Deno Configuration

The `deno.json` file controls:

```json
{
  "tasks": {
    "dev": "deno run --allow-net --allow-env --allow-read --watch apps/api/deploy/deno.ts",
    "start": "deno run --allow-net --allow-env --allow-read apps/api/deploy/deno.ts",
    "deploy": "deployctl deploy --project=edge-starter-kit apps/api/deploy/deno.ts",
    "check": "deno check apps/api/deploy/deno.ts"
  }
}
```

**Permissions Explained**:
- `--allow-net`: Network access (required for HTTP server)
- `--allow-env`: Environment variable access
- `--allow-read`: File system read (for imports)
- `--watch`: Hot reload on file changes

---

## Environment Variables

### Local Development

Create `.env` file in project root:

```bash
# .env
NODE_ENV=development
API_VERSION=1.0.0
DATABASE_URL=your_database_url_here
```

**Load in Deno**:

```bash
# Option 1: Use --env flag (Deno 1.38+)
deno run --allow-net --allow-env --env apps/api/deploy/deno.ts

# Option 2: Use dotenv library
# Add to deno.json imports:
# "dotenv": "https://deno.land/std@0.208.0/dotenv/mod.ts"
```

### Production (Deno Deploy)

Set environment variables in Deno Deploy dashboard:

1. Go to https://dash.deno.com/projects/your-project
2. Click **Settings** → **Environment Variables**
3. Add variables:
   - `NODE_ENV=production`
   - `API_VERSION=1.0.0`
   - `DATABASE_URL=your_production_url`

### Accessing in Code

```typescript
// ✅ In adapter (apps/api/deploy/deno.ts)
const env = {
  NODE_ENV: Deno.env.get("NODE_ENV"),
  API_VERSION: Deno.env.get("API_VERSION"),
};

// ✅ In routes (apps/api/src/routes/*.ts)
app.get('/status', (c) => {
  const env = c.env; // Injected by adapter
  return c.json({
    environment: env.NODE_ENV,
    version: env.API_VERSION,
  });
});
```

---

## Deployment

### Method 1: GitHub Integration (Recommended)

**One-time setup**:

1. **Create Deno Deploy project**:
   - Go to https://dash.deno.com
   - Click **New Project**
   - Connect your GitHub repository
   - Select branch: `main`
   - Set entry point: `apps/api/deploy/deno.ts`

2. **Configure build settings**:
   - Build command: (leave empty - no build needed)
   - Install command: (leave empty - Deno handles imports)

3. **Set environment variables** (see above)

4. **Deploy**:
   ```bash
   git push origin main
   ```
   Deno Deploy automatically deploys on push!

### Method 2: CLI Deployment

```bash
# Login to Deno Deploy
deployctl login

# Deploy to production
deno task deploy

# Or specify project name
deployctl deploy --project=your-project-name apps/api/deploy/deno.ts

# Deploy with environment variables
deployctl deploy \
  --project=your-project-name \
  --env=NODE_ENV=production \
  --env=API_VERSION=1.0.0 \
  apps/api/deploy/deno.ts
```

### Method 3: GitHub Actions

Create `.github/workflows/deno-deploy.yml`:

```yaml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Type check
        run: deno task check

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: edge-starter-kit
          entrypoint: apps/api/deploy/deno.ts
          root: .
```

### Verify Deployment

```bash
# Test production endpoint
curl https://your-project.deno.dev/api/health

# Check all endpoints
curl https://your-project.deno.dev/api/hello
curl https://your-project.deno.dev/api/status
```

---

## Performance Optimization

### Bundle Size

Deno Deploy automatically optimizes:
- **Tree shaking**: Removes unused code
- **Minification**: Compresses JavaScript
- **Compression**: Gzip/Brotli for responses

**Expected bundle size**: ~50-80KB (similar to Cloudflare)

### Cold Start Performance

**Typical cold start times**:
- **First request**: 50-150ms
- **Subsequent requests**: <10ms (kept warm)

**Optimization tips**:
1. **Minimize dependencies**: Use Web Standard APIs when possible
2. **Lazy load heavy modules**: Import only when needed
3. **Use Deno KV**: Built-in key-value store (faster than external DB for caching)

### Edge Caching

```typescript
// Add cache headers to responses
app.get('/api/data', async (c) => {
  const data = await fetchData();
  
  return c.json(data, 200, {
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    'CDN-Cache-Control': 'public, max-age=600',
  });
});
```

### Deno Deploy Regions

Deno Deploy automatically deploys to **35+ global regions**:
- North America: 8 regions
- Europe: 12 regions
- Asia-Pacific: 10 regions
- South America: 3 regions
- Africa: 2 regions

**No configuration needed** - requests are automatically routed to the nearest region.

---

## Deno KV Integration

Deno KV is a built-in key-value database, perfect for:
- Session storage
- Rate limiting
- Caching
- Feature flags

### Setup Deno KV

```typescript
// apps/api/deploy/deno.ts
const kv = await Deno.openKv();

Deno.serve(async (request: Request): Promise<Response> => {
  const env = {
    NODE_ENV: Deno.env.get("NODE_ENV"),
    API_VERSION: Deno.env.get("API_VERSION"),
    KV: kv, // Inject KV into context
  };
  
  return app.fetch(request, env);
});
```

### Use in Routes

```typescript
// apps/api/src/routes/cache.ts
import { Hono } from 'hono';

const cache = new Hono();

cache.get('/get/:key', async (c) => {
  const kv = c.env.KV as Deno.Kv;
  const key = c.req.param('key');
  
  const result = await kv.get([key]);
  
  if (!result.value) {
    return c.json({ error: 'Key not found' }, 404);
  }
  
  return c.json({ value: result.value });
});

cache.post('/set/:key', async (c) => {
  const kv = c.env.KV as Deno.Kv;
  const key = c.req.param('key');
  const body = await c.req.json();
  
  await kv.set([key], body.value);
  
  return c.json({ success: true });
});

export default cache;
```

### Deno KV Best Practices

1. **Use structured keys**: `['users', userId, 'profile']`
2. **Set expiration**: `kv.set([key], value, { expireIn: 3600000 })`
3. **Atomic operations**: Use `kv.atomic()` for consistency
4. **Batch operations**: Combine multiple operations for efficiency

---

## Troubleshooting

### Common Issues

#### 1. "Module not found" Error

**Problem**: Import paths don't include `.ts` extension

```typescript
// ❌ Wrong
import app from "../src/index";

// ✅ Correct
import app from "../src/index.ts";
```

**Solution**: Deno requires explicit file extensions for local imports.

#### 2. "Permission denied" Error

**Problem**: Missing permission flags

```bash
# ❌ Wrong
deno run apps/api/deploy/deno.ts

# ✅ Correct
deno run --allow-net --allow-env --allow-read apps/api/deploy/deno.ts
```

**Solution**: Add required permissions to `deno.json` tasks.

#### 3. "Cannot find npm package" Error

**Problem**: Missing npm: prefix for Node.js packages

```json
// ❌ Wrong
{
  "imports": {
    "hono": "hono"
  }
}

// ✅ Correct
{
  "imports": {
    "hono": "npm:hono@^4.0.0"
  }
}
```

#### 4. Environment Variables Not Loading

**Problem**: `.env` file not loaded automatically

**Solution**: Use `--env` flag or dotenv library:

```bash
# Option 1: Deno 1.38+
deno run --allow-net --allow-env --env apps/api/deploy/deno.ts

# Option 2: Use dotenv
import "https://deno.land/std@0.208.0/dotenv/load.ts";
```

#### 5. Port Already in Use

**Problem**: Port 8000 is occupied

**Solution**: Change port in `deno.ts`:

```typescript
Deno.serve({
  port: 8001, // Change to available port
  // ...
});
```

### Debug Mode

Enable verbose logging:

```bash
# Run with debug logs
DENO_LOG=debug deno task dev

# Check TypeScript errors
deno task check

# Lint code
deno lint apps/api/deploy/deno.ts
```

### Performance Monitoring

```typescript
// Add timing middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${duration}ms`);
});
```

---

## Comparison: Deno Deploy vs. Cloudflare Workers

| Feature | Deno Deploy | Cloudflare Workers | Notes |
|---------|-------------|-------------------|-------|
| **Cold Start** | 50-150ms | 10-50ms | CF slightly faster |
| **Global Regions** | 35+ | 300+ | CF has more edge locations |
| **Bundle Size** | ~50-80KB | ~60KB | Similar |
| **TypeScript** | Native | Via build step | Deno advantage |
| **Built-in KV** | Yes (Deno KV) | Yes (Workers KV) | Both have KV stores |
| **Pricing** | Free tier: 100K req/day | Free tier: 100K req/day | Similar free tiers |
| **Developer Experience** | Excellent | Excellent | Both are great |
| **npm Compatibility** | Via npm: prefix | Via nodejs_compat | Deno cleaner |

### When to Choose Deno Deploy

✅ **Choose Deno Deploy if**:
- You prefer native TypeScript support
- You want simpler npm package imports
- You like Deno's security model (explicit permissions)
- You're already using Deno for other projects

✅ **Choose Cloudflare Workers if**:
- You need the absolute fastest cold starts
- You require maximum global coverage (300+ locations)
- You're using other Cloudflare services (R2, D1, etc.)
- You need more advanced features (Durable Objects, etc.)

---

## Next Steps

1. ✅ **Test locally**: `deno task dev`
2. ✅ **Deploy to Deno Deploy**: Follow deployment guide above
3. ✅ **Set up monitoring**: Use Deno Deploy dashboard
4. ✅ **Add Deno KV**: For caching and sessions
5. ✅ **Configure custom domain**: In Deno Deploy settings

---

## Resources

- **Deno Documentation**: https://deno.land/manual
- **Deno Deploy Docs**: https://deno.com/deploy/docs
- **Hono on Deno**: https://hono.dev/getting-started/deno
- **Deno KV Guide**: https://deno.com/kv
- **deployctl CLI**: https://github.com/denoland/deployctl

---

## Support

- **Deno Discord**: https://discord.gg/deno
- **GitHub Issues**: https://github.com/denoland/deno/issues
- **Deno Deploy Status**: https://status.deno.com/

---

**🎉 You're ready to deploy to Deno!** Your Edge Starter Kit now supports both Cloudflare Workers and Deno Deploy with zero changes to your business logic.
