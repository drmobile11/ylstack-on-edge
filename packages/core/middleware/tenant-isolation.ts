// Tenant Isolation Middleware
// Ensures all queries are scoped to the current tenant

import type { RequestMetadata } from '../types';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  userRole?: string;
}

export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantIsolationError';
  }
}

export class TenantIsolation {
  /**
   * Validate that a resource belongs to the current tenant
   */
  static validateTenantAccess(
    resourceTenantId: string,
    contextTenantId: string
  ): void {
    if (resourceTenantId !== contextTenantId) {
      throw new TenantIsolationError('Access denied: Resource belongs to different tenant');
    }
  }

  /**
   * Ensure query includes tenant filter
   */
  static enforceTenantFilter<T extends { tenantId?: string }>(
    query: T,
    tenantId: string
  ): T & { tenantId: string } {
    return {
      ...query,
      tenantId,
    };
  }

  /**
   * Filter results to only include current tenant's data
   */
  static filterByTenant<T extends { tenantId: string }>(
    items: T[],
    tenantId: string
  ): T[] {
    return items.filter(item => item.tenantId === tenantId);
  }

  /**
   * Validate user belongs to tenant
   */
  static validateUserTenant(
    userTenantId: string,
    contextTenantId: string
  ): void {
    if (userTenantId !== contextTenantId) {
      throw new TenantIsolationError('User does not belong to this tenant');
    }
  }

  /**
   * Create tenant context from request metadata
   */
  static createContext(metadata: RequestMetadata): TenantContext {
    if (!metadata.tenantId) {
      throw new TenantIsolationError('Tenant ID is required');
    }

    return {
      tenantId: metadata.tenantId,
      userId: metadata.userId,
      userRole: metadata.userRole,
    };
  }

  /**
   * Validate cross-tenant operation is allowed
   * Only super_admin can perform cross-tenant operations
   */
  static validateCrossTenantAccess(
    userRole?: string,
    targetTenantId?: string,
    contextTenantId?: string
  ): void {
    if (targetTenantId && contextTenantId && targetTenantId !== contextTenantId) {
      if (userRole !== 'super_admin') {
        throw new TenantIsolationError('Cross-tenant access denied');
      }
    }
  }
}

/**
 * Middleware factory for Hono
 */
export function createTenantIsolationMiddleware() {
  return async (c: any, next: any) => {
    // Extract tenant from JWT, API key, or subdomain
    const tenantId = c.get('tenantId') || c.req.header('X-Tenant-ID');
    
    if (!tenantId) {
      return c.json({ error: 'Tenant ID required' }, 400);
    }

    // Store in context
    c.set('tenantContext', {
      tenantId,
      userId: c.get('userId'),
      userRole: c.get('userRole'),
    });

    await next();
  };
}

/**
 * Helper to get tenant context from Hono context
 */
export function getTenantContext(c: any): TenantContext {
  const context = c.get('tenantContext');
  if (!context) {
    throw new TenantIsolationError('Tenant context not found');
  }
  return context;
}
