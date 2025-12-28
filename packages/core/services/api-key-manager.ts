// API Key Management
// API key generation, validation, and scope enforcement

import type { ApiKey } from '../../../shared/schema';

export interface ApiKeyCreateInput {
  tenantId: string;
  userId: string;
  name: string;
  scopes: string[];
  allowedDomains?: string[];
  expiresAt?: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: {
    code: string;
    message: string;
  };
}

export class ApiKeyError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

export class ApiKeyManager {
  /**
   * Generate API key
   */
  static generateKey(): { key: string; prefix: string; hash: string } {
    const prefix = 'gsmf'; // GSMFlow prefix
    const random = this.generateRandomString(32);
    const key = `${prefix}_${random}`;
    const hash = this.hashKey(key);

    return {
      key,
      prefix: `${prefix}_${random.substring(0, 8)}`,
      hash,
    };
  }

  /**
   * Hash API key for storage
   */
  private static hashKey(key: string): string {
    // In production, use proper crypto hashing (SHA-256)
    // This is a placeholder
    return Buffer.from(key).toString('base64');
  }

  /**
   * Verify API key against hash
   */
  static verifyKey(key: string, hash: string): boolean {
    const computedHash = this.hashKey(key);
    return computedHash === hash;
  }

  /**
   * Generate random string
   */
  private static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    
    return result;
  }

  /**
   * Validate API key
   */
  static validateKey(
    providedKey: string,
    storedApiKey: ApiKey
  ): ApiKeyValidationResult {
    // Check if key matches hash
    if (!this.verifyKey(providedKey, storedApiKey.keyHash)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_KEY',
          message: 'Invalid API key',
        },
      };
    }

    // Check if key is expired
    if (storedApiKey.expiresAt) {
      const expiresAt = new Date(storedApiKey.expiresAt);
      if (expiresAt < new Date()) {
        return {
          valid: false,
          error: {
            code: 'KEY_EXPIRED',
            message: 'API key has expired',
          },
        };
      }
    }

    return {
      valid: true,
      apiKey: storedApiKey,
    };
  }

  /**
   * Validate domain access
   */
  static validateDomain(
    requestDomain: string,
    allowedDomains: string[]
  ): { valid: boolean; error?: string } {
    // If no domain restrictions, allow all
    if (!allowedDomains || allowedDomains.length === 0) {
      return { valid: true };
    }

    // Normalize domain
    const normalizedDomain = this.normalizeDomain(requestDomain);

    // Check exact match or wildcard
    for (const allowed of allowedDomains) {
      if (this.matchDomain(normalizedDomain, allowed)) {
        return { valid: true };
      }
    }

    return {
      valid: false,
      error: `Domain '${requestDomain}' is not allowed for this API key`,
    };
  }

  /**
   * Normalize domain (remove protocol, port, path)
   */
  private static normalizeDomain(domain: string): string {
    try {
      const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
      return url.hostname.toLowerCase();
    } catch {
      return domain.toLowerCase();
    }
  }

  /**
   * Match domain against pattern (supports wildcards)
   */
  private static matchDomain(domain: string, pattern: string): boolean {
    const normalizedPattern = this.normalizeDomain(pattern);

    // Exact match
    if (domain === normalizedPattern) {
      return true;
    }

    // Wildcard match (*.example.com)
    if (normalizedPattern.startsWith('*.')) {
      const baseDomain = normalizedPattern.substring(2);
      return domain.endsWith(baseDomain);
    }

    return false;
  }

  /**
   * Validate scope access
   */
  static validateScope(
    requiredScope: string,
    apiKeyScopes: string[]
  ): { valid: boolean; error?: string } {
    // Check if API key has required scope
    if (apiKeyScopes.includes(requiredScope)) {
      return { valid: true };
    }

    // Check for wildcard scope
    if (apiKeyScopes.includes('*')) {
      return { valid: true };
    }

    // Check for parent scope (e.g., 'orders' includes 'orders:read')
    const scopeParts = requiredScope.split(':');
    if (scopeParts.length > 1) {
      const parentScope = scopeParts[0];
      if (apiKeyScopes.includes(parentScope)) {
        return { valid: true };
      }
    }

    return {
      valid: false,
      error: `API key does not have required scope: ${requiredScope}`,
    };
  }

  /**
   * Get available scopes
   */
  static getAvailableScopes(): string[] {
    return [
      'services:read',
      'services:create',
      'orders:read',
      'orders:create',
      'orders:update',
      'wallet:read',
      'users:read',
      'users:create',
      'webhooks:create',
      'webhooks:read',
      '*', // Full access
    ];
  }

  /**
   * Validate scope format
   */
  static validateScopeFormat(scopes: string[]): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const availableScopes = this.getAvailableScopes();

    for (const scope of scopes) {
      if (!availableScopes.includes(scope)) {
        // Check if it's a valid pattern (resource:action)
        if (!scope.match(/^[a-z_]+:[a-z_]+$/) && scope !== '*') {
          errors.push(`Invalid scope format: ${scope}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Extract API key from Authorization header
   */
  static extractFromHeader(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer <key>" and "<key>" formats
    const parts = authHeader.split(' ');
    
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }

    if (parts.length === 1) {
      return parts[0];
    }

    return null;
  }

  /**
   * Update last used timestamp
   */
  static markAsUsed(apiKey: ApiKey): Partial<ApiKey> {
    return {
      ...apiKey,
      lastUsedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if API key is about to expire
   */
  static isExpiringSoon(apiKey: ApiKey, daysThreshold: number = 7): boolean {
    if (!apiKey.expiresAt) {
      return false;
    }

    const expiresAt = new Date(apiKey.expiresAt);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    return expiresAt <= threshold;
  }

  /**
   * Validate API key creation input
   */
  static validateCreateInput(
    input: ApiKeyCreateInput
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('API key name is required');
    }

    if (!input.scopes || input.scopes.length === 0) {
      errors.push('At least one scope is required');
    } else {
      const scopeValidation = this.validateScopeFormat(input.scopes);
      if (!scopeValidation.valid && scopeValidation.errors) {
        errors.push(...scopeValidation.errors);
      }
    }

    if (input.allowedDomains) {
      for (const domain of input.allowedDomains) {
        if (!domain || domain.trim().length === 0) {
          errors.push('Invalid domain in allowed domains list');
        }
      }
    }

    if (input.expiresAt) {
      const expiresAt = new Date(input.expiresAt);
      if (expiresAt <= new Date()) {
        errors.push('Expiration date must be in the future');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * Middleware for API key authentication
 */
export function createApiKeyMiddleware() {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization') || c.req.header('X-API-Key');
    
    if (!authHeader) {
      return c.json({ error: 'API key required' }, 401);
    }

    const apiKey = ApiKeyManager.extractFromHeader(authHeader);
    
    if (!apiKey) {
      return c.json({ error: 'Invalid API key format' }, 401);
    }

    // Store extracted key in context for validation
    c.set('providedApiKey', apiKey);
    
    await next();
  };
}

/**
 * Middleware for domain validation
 */
export function createDomainValidationMiddleware() {
  return async (c: any, next: any) => {
    const apiKey = c.get('apiKey') as ApiKey;
    
    if (!apiKey || !apiKey.allowedDomains || apiKey.allowedDomains.length === 0) {
      await next();
      return;
    }

    const origin = c.req.header('Origin') || c.req.header('Referer');
    
    if (!origin) {
      return c.json({ error: 'Origin header required for domain validation' }, 403);
    }

    const validation = ApiKeyManager.validateDomain(origin, apiKey.allowedDomains);
    
    if (!validation.valid) {
      return c.json({ error: validation.error }, 403);
    }

    await next();
  };
}

/**
 * Middleware for scope validation
 */
export function requireScope(scope: string) {
  return async (c: any, next: any) => {
    const apiKey = c.get('apiKey') as ApiKey;
    
    if (!apiKey) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const validation = ApiKeyManager.validateScope(scope, apiKey.scopes);
    
    if (!validation.valid) {
      return c.json({ error: validation.error }, 403);
    }

    await next();
  };
}
