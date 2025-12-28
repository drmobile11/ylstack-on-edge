import app from "../src/index.ts";
import type { AppEnv } from "../src/types.ts";

// Deno Deploy Adapter
// This file is the entry point for Deno Deploy.
// Deno Deploy uses Web Standard APIs and has built-in support for Hono.

// Deno Deploy handler using Deno.serve()
// This is the modern Deno Deploy API (replaces addEventListener)
Deno.serve({
  port: 8000, // Default port for Deno Deploy
  onListen: ({ hostname, port }) => {
    console.log(`🦕 Deno Deploy server running on http://${hostname}:${port}`);
    console.log(`📊 Environment: ${Deno.env.get("NODE_ENV") || "production"}`);
    console.log(`🚀 API Version: ${Deno.env.get("API_VERSION") || "1.0.0"}`);
  },
}, async (request: Request): Promise<Response> => {
  // Create environment object from Deno.env
  const env: AppEnv = {
    NODE_ENV: Deno.env.get("NODE_ENV"),
    API_VERSION: Deno.env.get("API_VERSION"),
    DATABASE_URL: Deno.env.get("DATABASE_URL"),
  };

  // Hono's fetch method is compatible with Deno Deploy
  return app.fetch(request, env);
});

// Export the app for testing purposes
export default app;
