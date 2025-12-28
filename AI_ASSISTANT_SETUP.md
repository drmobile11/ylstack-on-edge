# 🤖 AI Assistant Configuration Guide

This document explains the AI assistant configuration files included in the Edge Starter Kit and how to use them with different AI coding assistants.

## 📋 Table of Contents

- [Overview](#overview)
- [Configuration Files](#configuration-files)
- [Supported AI Assistants](#supported-ai-assistants)
- [How to Use](#how-to-use)
- [What These Rules Enforce](#what-these-rules-enforce)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Edge Starter Kit includes comprehensive AI assistant configuration files that:

✅ **Enforce edge compatibility** - Prevent Node.js APIs in edge-compatible code  
✅ **Guide workflows** - Step-by-step templates for common tasks  
✅ **Maintain quality** - Pre-commit checklists and validation  
✅ **Teach best practices** - Educational responses with examples  
✅ **Support multiple platforms** - Works with Cursor, Cline, Windsurf, Claude, Nao, Kiro, and more  

---

## Configuration Files

### Root-Level Rule Files

| File | AI Assistant | Lines | Purpose |
|------|-------------|-------|---------|
| `.cursorrules` | Cursor AI | 310 | Mandatory documentation reading, edge constraints, workflows |
| `.clinerules` | Cline | 274 | Decision trees, standard workflows, quality checklists |
| `.windsurfrules` | Windsurf/Claude | 382 | Philosophy-focused, debugging guide, code style examples |
| `.naorules` | Nao | 423 | Comprehensive workflows, red flags, teaching moments |
| `.kirorules` | Kiro | 443 | Behavioral steering, decision framework, success metrics |
| `.aiconfig` | Universal | 109 | Machine-readable JSON for all platforms |
| `.aidigestignore` | All | 74 | Files AI should ignore (optimizes token usage) |

### Kiro Steering Directory

Located in `.kiro/steering/` (machine-readable YAML):

| File | Lines | Purpose |
|------|-------|---------|
| `edge-compatibility.yaml` | 156 | Pattern detection, forbidden/required APIs |
| `workflows.yaml` | 360 | Step-by-step task templates with code examples |
| `communication.yaml` | 378 | Response templates, tone guidelines, terminology |
| `README.md` | 217 | Documentation for steering configuration |

**Total**: 10 configuration files, 2,866 lines of AI guidance

---

## Supported AI Assistants

### ✅ Natively Supported

1. **Cursor AI** (`.cursorrules`)
   - Most popular AI coding assistant
   - Reads `.cursorrules` automatically
   - Best for: General development, refactoring

2. **Cline** (`.clinerules`)
   - Code generation focused
   - Reads `.clinerules` automatically
   - Best for: Scaffolding, boilerplate generation

3. **Windsurf** (`.windsurfrules`)
   - Claude-powered AI assistant
   - Reads `.windsurfrules` automatically
   - Best for: Complex reasoning, architecture decisions

4. **Nao** (`.naorules`)
   - Data engineering focused
   - Reads `.naorules` automatically
   - Best for: Database operations, migrations

5. **Kiro** (`.kirorules` + `.kiro/steering/`)
   - Behavioral steering system
   - Reads `.kirorules` and YAML steering files
   - Best for: Pattern enforcement, workflow automation

### 🔄 Universal Fallback

6. **Any AI Assistant** (`.aiconfig`)
   - JSON configuration for platforms without native support
   - Works with: GitHub Copilot, Tabnine, Amazon CodeWhisperer, etc.
   - Manually reference in prompts: "Read .aiconfig for project rules"

---

## How to Use

### Automatic (Native Support)

If you're using Cursor, Cline, Windsurf, Nao, or Kiro:

1. **Open the project** in your AI-enabled editor
2. **Start coding** - The AI will automatically read the appropriate rules file
3. **Verify** - Ask the AI: "What are the edge compatibility rules for this project?"

The AI should reference `.edge-stack/` documentation and enforce constraints automatically.

### Manual (Universal Fallback)

If using GitHub Copilot, Tabnine, or other AI assistants:

1. **Reference in prompts**:
   ```
   "Read .aiconfig for project rules before suggesting code"
   ```

2. **Link to documentation**:
   ```
   "Follow the patterns in .edge-stack/requirements.md"
   ```

3. **Specify constraints**:
   ```
   "This code must be edge-compatible (no Node.js APIs)"
   ```

### Kiro AI (Advanced)

Kiro uses both human-readable rules and machine-readable steering:

1. **Human-readable**: `.kirorules` (behavioral guidelines)
2. **Machine-readable**: `.kiro/steering/*.yaml` (pattern detection, workflows, responses)

Kiro will:
- Scan code against forbidden patterns
- Suggest appropriate workflows
- Format responses using templates
- Validate fixes against success criteria

See `.kiro/steering/README.md` for details.

---

## What These Rules Enforce

### 1. Mandatory Documentation Reading

**Before ANY code changes**, AI must read `.edge-stack/` in this order:

1. `index.md` - Project overview
2. `requirements.md` - Edge constraints (CRITICAL)
3. `architecture.md` - Project structure
4. `coding-standards.md` - Code style
5. `workflows.md` - Step-by-step guides
6. `deployment.md` - Runtime adapters
7. `checklist.md` - Quality checks

### 2. Edge Compatibility Constraints

#### ❌ FORBIDDEN in `apps/api/src/`:

```typescript
// Node.js built-in modules
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

// Node.js-specific APIs
process.env.NODE_ENV;
__dirname;
__filename;

// Native modules
import Database from 'better-sqlite3';
```

#### ✅ ALLOWED in `apps/api/src/`:

```typescript
// Web Standard APIs
crypto.randomUUID();
crypto.subtle.digest();
fetch('https://api.example.com');
new Request('https://example.com');
new Response('Hello', { status: 200 });

// Environment variables (via Hono context)
c.env.DATABASE_URL;

// Platform-agnostic libraries
import { z } from 'zod';
import { Hono } from 'hono';
```

### 3. Code Organization (Strict Boundaries)

```
apps/api/src/       → Platform-agnostic (EDGE-COMPATIBLE ONLY)
apps/api/deploy/    → Platform-specific adapters (Node.js OK)
server/             → Development server (Node.js OK)
shared/             → Type contracts (platform-agnostic)
client/             → React frontend (browser APIs only)
```

**Rule**: If it's in `apps/api/src/`, it MUST run in a Cloudflare Worker.

### 4. Standard Workflows

All rule files include templates for:

- **Add API Route** (6 steps)
  1. Define contract in `shared/routes.ts`
  2. Create route handler in `apps/api/src/routes/`
  3. Register route in `apps/api/src/index.ts`
  4. Add database table in `shared/schema.ts`
  5. Create migration in `server/migrations/`
  6. Test endpoint

- **Add Frontend Page** (2 steps)
  1. Create page component in `apps/client/src/pages/`
  2. Add route in `apps/client/src/App.tsx`

- **Fix Edge Incompatibility** (3 steps)
  1. Identify Node.js API usage
  2. Find Web Standard alternative
  3. Refactor with dependency injection

- **Database Migration** (5 steps)
  1. Update schema in `shared/schema.ts`
  2. Generate migration
  3. Test locally
  4. Update TypeScript types
  5. Deploy

### 5. Quality Checklists

Before committing, AI will verify:

- [ ] All routes defined in `shared/routes.ts`
- [ ] All inputs validated with Zod
- [ ] No Node.js APIs in `apps/api/src/`
- [ ] Database injected via context (`c.get('db')`)
- [ ] Environment variables via `c.env`
- [ ] TypeScript check passes (`npm run check`)
- [ ] Tests pass (`npm test`)
- [ ] Dev server runs (`npm run dev`)

---

## Customization

### Adding New Rules

1. **Choose the appropriate file**:
   - Platform-specific: Edit `.cursorrules`, `.clinerules`, etc.
   - Universal: Edit `.aiconfig`
   - Kiro patterns: Edit `.kiro/steering/*.yaml`

2. **Follow the existing format**:
   - Use markdown headers for organization
   - Include code examples (before/after)
   - Add to relevant section (constraints, workflows, etc.)

3. **Update all files** (for consistency):
   - If adding a constraint, add to ALL rule files
   - Keep `.aiconfig` in sync with platform-specific files

### Example: Adding a New Constraint

**In `.cursorrules`, `.clinerules`, `.windsurfrules`, `.naorules`, `.kirorules`**:

```markdown
### ❌ FORBIDDEN: Direct Environment Variable Access

**Wrong**:
```typescript
const apiKey = process.env.API_KEY; // ❌ Breaks edge compatibility
```

**Correct**:
```typescript
const apiKey = c.env.API_KEY; // ✅ Injected via Hono context
```

**Why**: `process.env` is Node.js-specific and not available in edge runtimes.
```

**In `.kiro/steering/edge-compatibility.yaml`**:

```yaml
forbidden_patterns:
  - pattern: "process\\.env\\."
    message: "Direct process.env access breaks edge compatibility"
    suggestion: "Use c.env.{VAR_NAME} (injected via Hono context)"
    scope: "apps/api/src/**/*.ts"
```

**In `.aiconfig`**:

```json
{
  "constraints": {
    "edge_compatibility": {
      "forbidden": [
        {
          "pattern": "process.env",
          "reason": "Not available in edge runtimes",
          "alternative": "c.env (Hono context)"
        }
      ]
    }
  }
}
```

### Adding New Workflows

1. **Document in `.edge-stack/workflows.md`** (source of truth)
2. **Add to rule files** with step-by-step instructions
3. **Create templates** in `.kiro/steering/workflows.yaml`
4. **Update `.aiconfig`** with workflow metadata

---

## Troubleshooting

### AI Not Following Rules

**Symptoms**:
- AI suggests Node.js APIs in `apps/api/src/`
- AI doesn't reference `.edge-stack/` documentation
- AI doesn't validate inputs with Zod

**Solutions**:

1. **Verify rule file exists**:
   ```bash
   ls -la .cursorrules .clinerules .windsurfrules .naorules .kirorules .aiconfig
   ```

2. **Check AI assistant configuration**:
   - Cursor: Settings → Features → Rules Files → Enabled
   - Cline: Should auto-detect `.clinerules`
   - Windsurf: Should auto-detect `.windsurfrules`

3. **Manually reference rules**:
   ```
   "Read .cursorrules before suggesting code"
   "Follow the edge compatibility rules in .edge-stack/requirements.md"
   ```

4. **Restart AI assistant** (reload window/extension)

### AI Suggests Incompatible Code

**Example**: AI suggests `import fs from 'fs'` in `apps/api/src/`

**Response**:

```
❌ This violates edge compatibility rules.

**Issue**: File system APIs are not available in edge runtimes (Cloudflare Workers, Vercel Edge).

**Solution**:
- If dev-only: Move to `server/` directory
- If production: Use edge-compatible storage (R2, Vercel Blob, S3)
- If data: Store in database instead

See `.edge-stack/requirements.md` for details.
```

### Rule Files Out of Sync

**Symptoms**:
- Different constraints in different rule files
- Workflows missing from some files

**Solution**:

1. **Choose source of truth**: `.edge-stack/` documentation
2. **Update all rule files** to match
3. **Use search-replace** for consistency:
   ```bash
   # Example: Update all files with new constraint
   grep -r "FORBIDDEN" .cursorrules .clinerules .windsurfrules .naorules .kirorules
   ```

### Kiro Patterns Not Matching

**Symptoms**:
- Kiro doesn't detect forbidden patterns
- False positives on valid code

**Solution**:

1. **Test regex patterns**:
   ```javascript
   // In browser console or Node.js
   const pattern = /import.*from ['"]fs['"]/;
   const code = `import fs from 'fs'`;
   console.log(pattern.test(code)); // Should be true
   ```

2. **Check scope** in `.kiro/steering/edge-compatibility.yaml`:
   ```yaml
   scope: "apps/api/src/**/*.ts"  # Only scan edge-compatible code
   ```

3. **Refine pattern**:
   ```yaml
   # Too broad
   pattern: "import.*fs"
   
   # More specific
   pattern: "import.*from ['\"]fs['\"]"
   ```

---

## Testing Your Configuration

### 1. Verify AI Reads Rules

Ask your AI assistant:

```
"What are the edge compatibility constraints for this project?"
```

**Expected response** should mention:
- `.edge-stack/requirements.md`
- No Node.js APIs in `apps/api/src/`
- Web Standard APIs only
- Dependency injection pattern

### 2. Test Constraint Enforcement

Ask your AI assistant:

```
"Add a new API route that reads a file from disk"
```

**Expected response** should:
- ❌ Reject file system approach
- ✅ Suggest edge-compatible alternatives
- 📚 Reference `.edge-stack/requirements.md`

### 3. Test Workflow Guidance

Ask your AI assistant:

```
"I want to add a new API endpoint for managing products"
```

**Expected response** should:
- 📋 Provide step-by-step workflow
- 💻 Include code templates
- ✅ Reference quality checklist

---

## Additional Resources

### Documentation

- **Project Overview**: `.edge-stack/index.md`
- **Edge Constraints**: `.edge-stack/requirements.md`
- **Architecture**: `.edge-stack/architecture.md`
- **Coding Standards**: `.edge-stack/coding-standards.md`
- **Workflows**: `.edge-stack/workflows.md`
- **Deployment**: `.edge-stack/deployment.md`
- **Checklist**: `.edge-stack/checklist.md`

### External Links

- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Zod Documentation](https://zod.dev/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)

### Community

- **Issues**: Report AI configuration issues on GitHub
- **Discussions**: Share AI assistant tips and tricks
- **Contributing**: See `CONTRIBUTING.md` for guidelines

---

## Version History

- **v1.0.0** (2024) - Initial release
  - 5 platform-specific rule files
  - 3 Kiro steering YAML files
  - 1 universal JSON config
  - 1 digest ignore file
  - Comprehensive documentation

---

## License

This configuration is part of the Edge Starter Kit and follows the same license as the main project.

---

**Questions?** Check `.edge-stack/index.md` or open an issue on GitHub.

**Contributing?** See `CONTRIBUTING.md` for guidelines on improving AI configurations.
