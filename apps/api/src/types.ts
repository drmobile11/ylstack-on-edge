// Type definitions for the Edge Starter Kit API

// Environment variables available in all runtimes
export interface AppEnv {
  NODE_ENV?: string;
  API_VERSION?: string;
  DATABASE_URL?: string;
  
  // Database binding (injected by adapters)
  db?: any; // Drizzle database instance
  
  // KV binding (optional, runtime-specific)
  KV?: any; // Cloudflare KV, Deno KV, etc.
}

// Extend Hono's context with our environment
declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string;
  }
}
