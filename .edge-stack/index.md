# .edge-stack Documentation

This directory contains the rules, requirements, and guidelines for the Edge-Ready Monorepo.

## 🤖 AI Assistant Integration

**IMPORTANT**: This project includes AI assistant configuration files in the root directory:
- **`.cursorrules`**: Configuration for Cursor AI
- **`.clinerules`**: Configuration for Cline AI
- **`.windsurfrules`**: Configuration for Windsurf/Claude
- **`.naorules`**: Configuration for Nao AI (comprehensive workflows)
- **`.kirorules`**: Configuration for Kiro AI (behavioral steering)
- **`.aiconfig`**: Universal AI configuration (JSON)
- **`.aidigestignore`**: Files AI should ignore

These files ensure AI assistants understand the edge-first architecture and follow project conventions. **All AI assistants MUST read this `.edge-stack/` directory before making code changes.**

## 📚 Documentation Index

### Core Documentation
- **[Architecture](./architecture.md)**: System design, project structure, and patterns.
- **[Tech Stack](./tech-stack.md)**: Libraries, tools, and dependencies.
- **[Coding Standards](./coding-standards.md)**: Style guides, conventions, and best practices.
- **[Workflows](./workflows.md)**: Development processes, migration guides, and troubleshooting.
- **[Deployment](./deployment.md)**: Guide to adapters (Cloudflare, Vercel, Node.js) and switching runtimes.
- **[Requirements](./requirements.md)**: Core technical requirements and constraints.
- **[Checklist](./checklist.md)**: Pre-commit and pre-deployment checklists.

### Performance & Optimization
- **[Cloudflare Performance Guide](./cloudflare-performance.md)**: Comprehensive performance optimization guide
- **[Performance Checklist](./PERFORMANCE-CHECKLIST.md)**: Quick reference for maintaining optimal performance
- **[Deno Deploy Guide](./deno-deploy.md)**: Complete guide for deploying to Deno Deploy
- **[Deno Deploy Checklist](./deno-deploy-checklist.md)**: Pre-deployment checklist for Deno Deploy

## 🚀 Quick Start

1.  **Read [Requirements](./requirements.md)** to understand the constraints.
2.  **Check [Coding Standards](./coding-standards.md)** for rules on what is allowed/forbidden.
3.  **Use [Workflows](./workflows.md)** to find the right template for your task.
4.  **Verify with [Checklist](./checklist.md)** before committing code.

## 🤖 AI Assistant Instructions

When working with this codebase, please load the relevant files from `.edge-stack/` to understand the context.
Always prioritize **Web Standard APIs** and avoid Node.js-specific modules in the `/src/` directory.
