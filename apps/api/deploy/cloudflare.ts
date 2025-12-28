import { ExecutionContext } from "hono";
import app from "../src/index";

// Cloudflare Workers Adapter
// This file is the entry point for Cloudflare Workers.
// It exports the Hono app which has a .fetch method compatible with the Workers runtime.

// Type definitions for Cloudflare Workers environment bindings
export interface Env {
  // Environment variables
  NODE_ENV?: string;
  API_VERSION?: string;
  
  // D1 Database binding (uncomment when configured)
  // DB?: D1Database;
  
  // KV Namespace binding (uncomment when configured)
  // KV?: KVNamespace;
  
  // R2 Bucket binding (uncomment when configured)
  // BUCKET?: R2Bucket;
  
  // Durable Object bindings (uncomment when configured)
  // COUNTER?: DurableObjectNamespace;
  
  // Service bindings (uncomment when configured)
  // AUTH_SERVICE?: Fetcher;
  
  // Analytics Engine binding (uncomment when configured)
  // ANALYTICS?: AnalyticsEngineDataset;
}

// Export the Worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Inject Cloudflare-specific bindings into Hono context
    // This allows routes to access env.DB, env.KV, etc.
    return app.fetch(request, env, ctx);
  },
};
