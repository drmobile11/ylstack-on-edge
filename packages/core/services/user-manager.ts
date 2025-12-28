// User Management
// User status, lifecycle, and administrative operations

import type { User } from '../../../shared/schema';
import type { RoleType } from '../policies/access';

export type UserStatus = 'active' | 'disabled' | 'banned' | 'warned';

export interface UserStatusUpdate {
  status: UserStatus;
  reason?: string;
  updatedBy: string;
}

export interface UserCreateInput {
  tenantId: string;
  parentUserId?: string;
  email: string;
  passwordHash: string;
  name?: string;
  username?: string;
  country?: string;
  role: RoleType;
}

export interface UserUpdateInput {
  name?: string;
  username?: string;
  country?: string;
  email?: string;
}

export class UserManagementError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'UserManagementError';
  }
}

export class UserManager {
  /**
   * Validate user can be activated
   */
  static canActivate(user: User): { allowed: boolean; reason?: string } {
    if (user.status === 'active') {
      return {
        allowed: false,
        reason: 'User is already active',
      };
    }

    if (user.status === 'banned') {
      return {
        allowed: false,
        reason: 'Banned users must be unbanned first',
      };
    }

    return { allowed: true };
  }

  /**
   * Activate user
   */
  static activate(user: User, updatedBy: string): Partial<User> {
    const validation = this.canActivate(user);
    
    if (!validation.allowed) {
      throw new UserManagementError(validation.reason!, 'CANNOT_ACTIVATE');
    }

    return {
      ...user,
      status: 'active',
      statusReason: undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Disable user (temporary suspension)
   */
  static disable(user: User, reason: string, updatedBy: string): Partial<User> {
    if (user.status === 'banned') {
      throw new UserManagementError('Cannot disable banned user', 'CANNOT_DISABLE');
    }

    return {
      ...user,
      status: 'disabled',
      statusReason: reason,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Ban user (permanent suspension)
   */
  static ban(user: User, reason: string, updatedBy: string): Partial<User> {
    return {
      ...user,
      status: 'banned',
      statusReason: reason,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Warn user (flag for review)
   */
  static warn(user: User, reason: string, updatedBy: string): Partial<User> {
    return {
      ...user,
      status: 'warned',
      statusReason: reason,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Unban user
   */
  static unban(user: User, updatedBy: string): Partial<User> {
    if (user.status !== 'banned') {
      throw new UserManagementError('User is not banned', 'NOT_BANNED');
    }

    return {
      ...user,
      status: 'active',
      statusReason: undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if user can perform actions
   */
  static canPerformActions(user: User): boolean {
    return user.status === 'active' || user.status === 'warned';
  }

  /**
   * Check if user can login
   */
  static canLogin(user: User): { allowed: boolean; reason?: string } {
    if (user.status === 'banned') {
      return {
        allowed: false,
        reason: 'Account has been banned',
      };
    }

    if (user.status === 'disabled') {
      return {
        allowed: false,
        reason: 'Account has been disabled',
      };
    }

    return { allowed: true };
  }

  /**
   * Validate user creation input
   */
  static validateCreateInput(input: UserCreateInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!input.email || !this.isValidEmail(input.email)) {
      errors.push('Valid email is required');
    }

    if (!input.passwordHash) {
      errors.push('Password is required');
    }

    if (!input.role) {
      errors.push('Role is required');
    }

    if (input.username && input.username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate role change
   */
  static canChangeRole(
    currentRole: RoleType,
    newRole: RoleType,
    performedByRole: RoleType
  ): { allowed: boolean; reason?: string } {
    // Super admin can change any role
    if (performedByRole === 'super_admin') {
      return { allowed: true };
    }

    // Admin can change roles below admin
    if (performedByRole === 'admin') {
      const adminManagedRoles: RoleType[] = ['distributor', 'reseller', 'web_owner', 'customer'];
      if (adminManagedRoles.includes(newRole)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Admins cannot assign admin or super_admin roles',
      };
    }

    return {
      allowed: false,
      reason: 'Insufficient permissions to change roles',
    };
  }

  /**
   * Change user role
   */
  static changeRole(
    user: User,
    newRole: RoleType,
    performedByRole: RoleType,
    updatedBy: string
  ): Partial<User> {
    const validation = this.canChangeRole(user.role as RoleType, newRole, performedByRole);
    
    if (!validation.allowed) {
      throw new UserManagementError(validation.reason!, 'CANNOT_CHANGE_ROLE');
    }

    return {
      ...user,
      role: newRole,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Delete user (soft delete - mark as deleted)
   */
  static canDelete(user: User, performedByRole: RoleType): { allowed: boolean; reason?: string } {
    // Super admin can delete anyone
    if (performedByRole === 'super_admin') {
      return { allowed: true };
    }

    // Admin can delete non-admin users
    if (performedByRole === 'admin') {
      if (user.role === 'super_admin' || user.role === 'admin') {
        return {
          allowed: false,
          reason: 'Admins cannot delete other admins',
        };
      }
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Insufficient permissions to delete users',
    };
  }

  /**
   * Get user status summary
   */
  static getStatusSummary(users: User[]): Record<UserStatus, number> {
    const summary: Record<UserStatus, number> = {
      active: 0,
      disabled: 0,
      banned: 0,
      warned: 0,
    };

    for (const user of users) {
      const status = user.status as UserStatus;
      if (status in summary) {
        summary[status]++;
      }
    }

    return summary;
  }

  /**
   * Filter users by status
   */
  static filterByStatus(users: User[], status: UserStatus): User[] {
    return users.filter(u => u.status === status);
  }

  /**
   * Get active users
   */
  static getActiveUsers(users: User[]): User[] {
    return this.filterByStatus(users, 'active');
  }

  /**
   * Get users requiring attention (warned or disabled)
   */
  static getUsersRequiringAttention(users: User[]): User[] {
    return users.filter(u => u.status === 'warned' || u.status === 'disabled');
  }

  /**
   * Validate username uniqueness
   */
  static isUsernameUnique(username: string, existingUsers: User[], excludeUserId?: string): boolean {
    return !existingUsers.some(
      u => u.username === username && u.id !== excludeUserId
    );
  }

  /**
   * Validate email uniqueness
   */
  static isEmailUnique(email: string, existingUsers: User[], excludeUserId?: string): boolean {
    return !existingUsers.some(
      u => u.email === email && u.id !== excludeUserId
    );
  }

  /**
   * Generate username from email
   */
  static generateUsername(email: string): string {
    const localPart = email.split('@')[0];
    return localPart.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Validate user update
   */
  static validateUpdateInput(
    input: UserUpdateInput,
    existingUsers: User[],
    userId: string
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (input.email && !this.isValidEmail(input.email)) {
      errors.push('Invalid email format');
    }

    if (input.email && !this.isEmailUnique(input.email, existingUsers, userId)) {
      errors.push('Email already in use');
    }

    if (input.username && !this.isUsernameUnique(input.username, existingUsers, userId)) {
      errors.push('Username already in use');
    }

    if (input.username && input.username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
