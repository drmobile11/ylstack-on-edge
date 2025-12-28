# 🦕 Deno Deploy Performance Checklist

Use this checklist before deploying to Deno Deploy to ensure optimal performance and reliability.

---

## 📋 Pre-Deployment Checklist

### ✅ Code Quality

- [ ] **TypeScript check passes**: `deno task check`
- [ ] **No linting errors**: `deno lint apps/api/deploy/deno.ts`
- [ ] **All imports have `.ts` extensions** for local files
- [ ] **No Node.js APIs** in `apps/api/src/` (use Web Standards)
- [ ] **All routes defined** in `shared/routes.ts`
- [ ] **Zod validation** on all API inputs

### ✅ Environment Configuration

- [ ] **Environment variables set** in Deno Deploy dashboard
  - `NODE_ENV=production`
  - `API_VERSION=x.x.x`
  - `DATABASE_URL` (if using database)
- [ ] **No hardcoded secrets** in code
- [ ] **`.env` file in `.gitignore`**
- [ ] **Environment variables accessed** via `c.env` in routes

### ✅ Permissions

- [ ] **Required permissions declared** in `deno.json`:
  - `--allow-net` (network access)
  - `--allow-env` (environment variables)
  - `--allow-read` (file system read)
- [ ] **No unnecessary permissions** granted
- [ ] **Deno KV permissions** if using (`--unstable-kv` for older versions)

### ✅ Dependencies

- [ ] **All npm packages** use `npm:` prefix in `deno.json`
- [ ] **No native Node.js modules** (bcrypt, better-sqlite3, etc.)
- [ ] **Hono version** compatible with Deno (`^4.0.0+`)
- [ ] **No deprecated Deno APIs** (check Deno version compatibility)

### ✅ Performance

- [ ] **Bundle size** under 100KB (check with `deno info`)
- [ ] **Lazy loading** for heavy modules
- [ ] **Cache headers** set for static responses
- [ ] **Database queries optimized** (indexes, limit results)
- [ ] **No blocking operations** in request handlers

### ✅ Error Handling

- [ ] **Try-catch blocks** around async operations
- [ ] **Proper HTTP status codes** (200, 201, 400, 404, 500)
- [ ] **Error responses** include helpful messages
- [ ] **Zod validation errors** caught and formatted
- [ ] **Logging** for unexpected errors

### ✅ Security

- [ ] **CORS configured** properly (if needed)
- [ ] **Rate limiting** implemented (use Deno KV)
- [ ] **Input validation** with Zod on all endpoints
- [ ] **SQL injection prevention** (use parameterized queries)
- [ ] **XSS prevention** (sanitize user inputs)

### ✅ Testing

- [ ] **Local dev server works**: `deno task dev`
- [ ] **All endpoints tested**:
  - `/api/health` → 200
  - `/api/hello` → 200
  - `/api/status` → 200
  - Custom routes → Expected responses
- [ ] **Query parameters tested**
- [ ] **POST/PUT request bodies validated**
- [ ] **Error cases tested** (404, 400, 500)

---

## 🚀 Deployment Steps

### 1. Pre-Deployment

```bash
# Type check
deno task check

# Test locally
deno task dev

# Verify all endpoints
curl http://localhost:8000/api/health
curl http://localhost:8000/api/hello
curl http://localhost:8000/api/status
```

### 2. Deploy

```bash
# Option A: GitHub integration (recommended)
git add .
git commit -m "Deploy to Deno Deploy"
git push origin main

# Option B: CLI deployment
deno task deploy
```

### 3. Post-Deployment Verification

```bash
# Test production endpoints
curl https://your-project.deno.dev/api/health
curl https://your-project.deno.dev/api/hello
curl https://your-project.deno.dev/api/status

# Check response times
curl -w "\nTime: %{time_total}s\n" https://your-project.deno.dev/api/health

# Test from multiple regions (use VPN or global testing service)
```

### 4. Monitor

- [ ] **Check Deno Deploy dashboard** for errors
- [ ] **Monitor response times** (should be <200ms globally)
- [ ] **Check logs** for unexpected errors
- [ ] **Verify environment variables** loaded correctly
- [ ] **Test custom domain** (if configured)

---

## 📊 Performance Benchmarks

### Expected Metrics

| Metric | Target | Good | Needs Improvement |
|--------|--------|------|-------------------|
| **Cold Start** | <100ms | <150ms | >150ms |
| **Warm Request** | <10ms | <50ms | >50ms |
| **Bundle Size** | <80KB | <100KB | >100KB |
| **Time to First Byte (TTFB)** | <50ms | <100ms | >100ms |
| **Global P95 Latency** | <200ms | <300ms | >300ms |

### Measure Performance

```bash
# Check bundle size
deno info apps/api/deploy/deno.ts

# Measure cold start (first request after idle)
time curl https://your-project.deno.dev/api/health

# Measure warm request (subsequent requests)
for i in {1..10}; do
  time curl https://your-project.deno.dev/api/health
done
```

---

## 🔧 Optimization Tips

### Bundle Size Optimization

```typescript
// ❌ Avoid: Import entire library
import _ from "npm:lodash";

// ✅ Better: Import specific functions
import { debounce } from "npm:lodash-es";

// ✅ Best: Use Web Standard APIs
const unique = [...new Set(array)]; // Instead of _.uniq()
```

### Cold Start Optimization

```typescript
// ❌ Avoid: Top-level await for heavy operations
const db = await connectDatabase(); // Blocks cold start

// ✅ Better: Lazy initialization
let db: Database | null = null;
const getDb = async () => {
  if (!db) db = await connectDatabase();
  return db;
};
```

### Response Time Optimization

```typescript
// ✅ Add cache headers
app.get('/api/data', async (c) => {
  const data = await fetchData();
  
  return c.json(data, 200, {
    'Cache-Control': 'public, max-age=300',
    'CDN-Cache-Control': 'public, max-age=600',
  });
});

// ✅ Use Deno KV for caching
const kv = c.env.KV as Deno.Kv;
const cached = await kv.get(['cache', key]);
if (cached.value) return c.json(cached.value);

const data = await fetchData();
await kv.set(['cache', key], data, { expireIn: 300000 }); // 5 min
return c.json(data);
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Slow Cold Starts

**Symptoms**: First request takes >200ms

**Solutions**:
- [ ] Reduce bundle size (remove unused dependencies)
- [ ] Move heavy imports inside route handlers (lazy load)
- [ ] Use Deno KV instead of external database for hot data
- [ ] Minimize top-level initialization

### Issue 2: High P95 Latency

**Symptoms**: 95th percentile response time >300ms

**Solutions**:
- [ ] Add database indexes
- [ ] Implement caching (Deno KV or HTTP cache headers)
- [ ] Optimize database queries (use EXPLAIN ANALYZE)
- [ ] Use edge-compatible databases (Turso, Neon HTTP)

### Issue 3: Memory Errors

**Symptoms**: "Out of memory" errors in logs

**Solutions**:
- [ ] Limit query result sizes (add LIMIT clauses)
- [ ] Stream large responses instead of buffering
- [ ] Avoid storing large objects in memory
- [ ] Use Deno KV for session storage instead of in-memory

### Issue 4: Timeout Errors

**Symptoms**: Requests timeout after 30s

**Solutions**:
- [ ] Optimize slow database queries
- [ ] Add timeouts to external API calls
- [ ] Use background tasks for long operations (Deno.cron)
- [ ] Return 202 Accepted for async operations

---

## 📈 Monitoring & Observability

### Deno Deploy Dashboard

Monitor these metrics:
- [ ] **Request count**: Should match expected traffic
- [ ] **Error rate**: Should be <1%
- [ ] **Response time**: P50 <50ms, P95 <200ms
- [ ] **CPU usage**: Should be <50% average
- [ ] **Memory usage**: Should be stable (no leaks)

### Custom Logging

```typescript
// Add request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method,
    url,
    status,
    duration,
    userAgent: c.req.header('user-agent'),
  }));
});
```

### Error Tracking

```typescript
// Global error handler
app.onError((err, c) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
  }));
  
  return c.json({ error: 'Internal server error' }, 500);
});
```

---

## 🔄 Rollback Plan

If deployment fails:

### Option 1: Revert via Git

```bash
# Revert last commit
git revert HEAD
git push origin main

# Deno Deploy auto-deploys the reverted version
```

### Option 2: Rollback in Dashboard

1. Go to Deno Deploy dashboard
2. Click **Deployments**
3. Find previous working deployment
4. Click **Promote to Production**

### Option 3: Redeploy Previous Version

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Deploy via CLI
deno task deploy
```

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] All endpoints respond correctly
- [ ] Response times meet targets (<200ms P95)
- [ ] No errors in Deno Deploy logs
- [ ] Environment variables loaded correctly
- [ ] Custom domain works (if configured)
- [ ] CORS configured properly (if needed)
- [ ] Rate limiting active (if implemented)
- [ ] Monitoring dashboards show healthy metrics
- [ ] Rollback plan documented and tested
- [ ] Team notified of deployment

---

## 📚 Resources

- **Deno Deploy Docs**: https://deno.com/deploy/docs
- **Performance Best Practices**: https://deno.com/deploy/docs/performance-best-practices
- **Deno KV Guide**: https://deno.com/kv
- **Monitoring Guide**: https://deno.com/deploy/docs/monitoring

---

**🎉 Deployment Complete!** Your Edge Starter Kit is now running on Deno Deploy with optimal performance.
