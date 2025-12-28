// Role-Based Access Control Middleware

import { canAccess, type RoleType } from '../policies/access';

export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export class RoleGuard {
  /**
   * Check if user has permission to perform action on resource
   */
  static checkPermission(
    userRole: RoleType,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'execute'
  ): void {
    if (!canAccess(userRole, resource, action)) {
      throw new AccessDeniedError(
        `Role '${userRole}' does not have permission to ${action} ${resource}`
      );
    }
  }

  /**
   * Validate user has one of the required roles
   */
  static requireRole(userRole: RoleType, allowedRoles: RoleType[]): void {
    if (!allowedRoles.includes(userRole)) {
      throw new AccessDeniedError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
    }
  }

  /**
   * Check if user is admin or super_admin
   */
  static requireAdmin(userRole: RoleType): void {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new AccessDeniedError('Admin access required');
    }
  }

  /**
   * Check if user is super_admin
   */
  static requireSuperAdmin(userRole: RoleType): void {
    if (userRole !== 'super_admin') {
      throw new AccessDeniedError('Super admin access required');
    }
  }

  /**
   * Validate user can access resource owned by another user
   */
  static validateResourceOwnership(
    resourceOwnerId: string,
    currentUserId: string,
    userRole: RoleType
  ): void {
    // Owner can always access their own resources
    if (resourceOwnerId === currentUserId) {
      return;
    }

    // Admins can access any resource
    if (userRole === 'super_admin' || userRole === 'admin') {
      return;
    }

    throw new AccessDeniedError('Access denied: Resource belongs to another user');
  }

  /**
   * Check if user can manage another user (parent-child relationship)
   */
  static validateUserHierarchy(
    targetUserId: string,
    currentUserId: string,
    userRole: RoleType,
    targetUserParentId?: string
  ): void {
    // Super admin can manage anyone
    if (userRole === 'super_admin') {
      return;
    }

    // Admin can manage users in their tenant
    if (userRole === 'admin') {
      return;
    }

    // User can manage their sub-users
    if (targetUserParentId === currentUserId) {
      return;
    }

    throw new AccessDeniedError('Access denied: Cannot manage this user');
  }
}

/**
 * Middleware factory for role-based access control
 */
export function requireRole(...allowedRoles: RoleType[]) {
  return async (c: any, next: any) => {
    const userRole = c.get('userRole') as RoleType;

    if (!userRole) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    try {
      RoleGuard.requireRole(userRole, allowedRoles);
      await next();
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return c.json({ error: error.message }, 403);
      }
      throw error;
    }
  };
}

/**
 * Middleware to require admin access
 */
export function requireAdmin() {
  return async (c: any, next: any) => {
    const userRole = c.get('userRole') as RoleType;

    if (!userRole) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    try {
      RoleGuard.requireAdmin(userRole);
      await next();
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return c.json({ error: error.message }, 403);
      }
      throw error;
    }
  };
}

/**
 * Middleware to check specific permission
 */
export function requirePermission(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'execute'
) {
  return async (c: any, next: any) => {
    const userRole = c.get('userRole') as RoleType;

    if (!userRole) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    try {
      RoleGuard.checkPermission(userRole, resource, action);
      await next();
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return c.json({ error: error.message }, 403);
      }
      throw error;
    }
  };
}
