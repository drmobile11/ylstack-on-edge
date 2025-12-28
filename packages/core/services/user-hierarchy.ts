// User Hierarchy Management
// Sub-user relationships and parent-child access control

import type { User } from '../../../shared/schema';
import type { RoleType } from '../policies/access';

export interface UserHierarchyNode {
  user: User;
  children: UserHierarchyNode[];
  depth: number;
}

export class UserHierarchyError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'UserHierarchyError';
  }
}

export class UserHierarchy {
  /**
   * Validate parent-child role relationship
   */
  static canCreateSubUser(parentRole: RoleType, childRole: RoleType): boolean {
    const roleHierarchy: Record<RoleType, RoleType[]> = {
      super_admin: ['admin', 'distributor', 'reseller', 'web_owner', 'customer'],
      admin: ['distributor', 'reseller', 'web_owner', 'customer'],
      distributor: ['reseller', 'customer'],
      reseller: ['customer'],
      web_owner: ['customer'],
      customer: [],
    };

    return roleHierarchy[parentRole]?.includes(childRole) || false;
  }

  /**
   * Get allowed child roles for parent
   */
  static getAllowedChildRoles(parentRole: RoleType): RoleType[] {
    const roleHierarchy: Record<RoleType, RoleType[]> = {
      super_admin: ['admin', 'distributor', 'reseller', 'web_owner', 'customer'],
      admin: ['distributor', 'reseller', 'web_owner', 'customer'],
      distributor: ['reseller', 'customer'],
      reseller: ['customer'],
      web_owner: ['customer'],
      customer: [],
    };

    return roleHierarchy[parentRole] || [];
  }

  /**
   * Validate sub-user creation
   */
  static validateSubUserCreation(
    parentUser: User,
    childRole: RoleType
  ): { valid: boolean; error?: string } {
    if (!this.canCreateSubUser(parentUser.role as RoleType, childRole)) {
      return {
        valid: false,
        error: `Role '${parentUser.role}' cannot create sub-users with role '${childRole}'`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if user is ancestor of another user
   */
  static isAncestor(
    potentialAncestorId: string,
    userId: string,
    allUsers: User[]
  ): boolean {
    let currentUser = allUsers.find(u => u.id === userId);

    while (currentUser?.parentUserId) {
      if (currentUser.parentUserId === potentialAncestorId) {
        return true;
      }
      currentUser = allUsers.find(u => u.id === currentUser!.parentUserId);
    }

    return false;
  }

  /**
   * Get all descendants of a user
   */
  static getDescendants(userId: string, allUsers: User[]): User[] {
    const descendants: User[] = [];
    const directChildren = allUsers.filter(u => u.parentUserId === userId);

    for (const child of directChildren) {
      descendants.push(child);
      descendants.push(...this.getDescendants(child.id, allUsers));
    }

    return descendants;
  }

  /**
   * Get direct children of a user
   */
  static getChildren(userId: string, allUsers: User[]): User[] {
    return allUsers.filter(u => u.parentUserId === userId);
  }

  /**
   * Get ancestors of a user (parent chain)
   */
  static getAncestors(userId: string, allUsers: User[]): User[] {
    const ancestors: User[] = [];
    let currentUser = allUsers.find(u => u.id === userId);

    while (currentUser?.parentUserId) {
      const parent = allUsers.find(u => u.id === currentUser!.parentUserId);
      if (parent) {
        ancestors.push(parent);
        currentUser = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Build hierarchy tree from flat user list
   */
  static buildTree(users: User[], rootUserId?: string): UserHierarchyNode[] {
    const userMap = new Map<string, UserHierarchyNode>();

    // Initialize nodes
    for (const user of users) {
      userMap.set(user.id, {
        user,
        children: [],
        depth: 0,
      });
    }

    // Build tree structure
    const roots: UserHierarchyNode[] = [];

    for (const user of users) {
      const node = userMap.get(user.id)!;

      if (rootUserId) {
        // Build tree from specific root
        if (user.id === rootUserId) {
          roots.push(node);
        } else if (user.parentUserId) {
          const parent = userMap.get(user.parentUserId);
          if (parent) {
            parent.children.push(node);
            node.depth = parent.depth + 1;
          }
        }
      } else {
        // Build full tree (multiple roots)
        if (!user.parentUserId) {
          roots.push(node);
        } else {
          const parent = userMap.get(user.parentUserId);
          if (parent) {
            parent.children.push(node);
            node.depth = parent.depth + 1;
          }
        }
      }
    }

    return roots;
  }

  /**
   * Get hierarchy depth for user
   */
  static getDepth(userId: string, allUsers: User[]): number {
    return this.getAncestors(userId, allUsers).length;
  }

  /**
   * Validate no circular references
   */
  static hasCircularReference(
    userId: string,
    parentUserId: string,
    allUsers: User[]
  ): boolean {
    // Check if parentUserId is a descendant of userId
    return this.isAncestor(userId, parentUserId, allUsers);
  }

  /**
   * Get root user (top of hierarchy)
   */
  static getRootUser(userId: string, allUsers: User[]): User | null {
    const ancestors = this.getAncestors(userId, allUsers);
    return ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
  }

  /**
   * Count total descendants
   */
  static countDescendants(userId: string, allUsers: User[]): number {
    return this.getDescendants(userId, allUsers).length;
  }

  /**
   * Check if user can manage another user
   */
  static canManageUser(
    managerId: string,
    targetUserId: string,
    managerRole: RoleType,
    allUsers: User[]
  ): boolean {
    // Super admin can manage anyone
    if (managerRole === 'super_admin') {
      return true;
    }

    // Admin can manage anyone in tenant (checked elsewhere)
    if (managerRole === 'admin') {
      return true;
    }

    // User can manage their descendants
    return this.isAncestor(managerId, targetUserId, allUsers);
  }

  /**
   * Get user's wallet inheritance chain
   * Sub-user orders deduct from parent's wallet
   */
  static getWalletOwner(userId: string, allUsers: User[]): string {
    const user = allUsers.find(u => u.id === userId);
    
    // If user has parent, wallet owner is the parent
    if (user?.parentUserId) {
      return this.getWalletOwner(user.parentUserId, allUsers);
    }

    // Root user owns their wallet
    return userId;
  }

  /**
   * Validate sub-user limits (optional feature)
   */
  static validateSubUserLimit(
    parentUserId: string,
    allUsers: User[],
    maxSubUsers: number = 100
  ): { valid: boolean; error?: string } {
    const children = this.getChildren(parentUserId, allUsers);

    if (children.length >= maxSubUsers) {
      return {
        valid: false,
        error: `Maximum sub-user limit (${maxSubUsers}) reached`,
      };
    }

    return { valid: true };
  }
}
