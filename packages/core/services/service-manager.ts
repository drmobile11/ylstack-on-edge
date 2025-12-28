// Service Management
// CRUD operations for services with dynamic schema support

import type { Service, InsertService, ServiceGroup } from '../../../shared/schema';
import type { ServiceInputSchema } from './schema-validator';
import { SchemaValidator } from './schema-validator';

export interface ServiceCreateInput {
  tenantId: string;
  groupId?: string;
  name: string;
  slug: string;
  description?: string;
  inputSchema: ServiceInputSchema;
  validationRules?: Record<string, any>;
  baseCost: number;
  currency?: string;
  allowedRoles?: string[];
  supportsBulk?: boolean;
  requiresApproval?: boolean;
  metadata?: Record<string, any>;
}

export interface ServiceUpdateInput {
  name?: string;
  description?: string;
  inputSchema?: ServiceInputSchema;
  validationRules?: Record<string, any>;
  baseCost?: number;
  isActive?: boolean;
  allowedRoles?: string[];
  supportsBulk?: boolean;
  requiresApproval?: boolean;
  metadata?: Record<string, any>;
}

export interface ServiceFilter {
  tenantId: string;
  groupId?: string;
  isActive?: boolean;
  allowedRoles?: string[];
}

export class ServiceManager {
  /**
   * Validate service input schema
   */
  static validateSchema(schema: ServiceInputSchema): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!schema.fields || schema.fields.length === 0) {
      errors.push('Service must have at least one input field');
    }

    // Validate field names are unique
    const fieldNames = new Set<string>();
    for (const field of schema.fields) {
      if (!field.name) {
        errors.push('All fields must have a name');
      } else if (fieldNames.has(field.name)) {
        errors.push(`Duplicate field name: ${field.name}`);
      } else {
        fieldNames.add(field.name);
      }

      if (!field.label) {
        errors.push(`Field '${field.name}' must have a label`);
      }

      if (!field.type) {
        errors.push(`Field '${field.name}' must have a type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate service data before creation
   */
  static validateServiceData(input: ServiceCreateInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Service name is required');
    }

    if (!input.slug || input.slug.trim().length === 0) {
      errors.push('Service slug is required');
    }

    if (input.baseCost < 0) {
      errors.push('Base cost cannot be negative');
    }

    // Validate schema
    const schemaValidation = this.validateSchema(input.inputSchema);
    if (!schemaValidation.valid && schemaValidation.errors) {
      errors.push(...schemaValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Check if user role can access service
   */
  static canAccessService(service: Service, userRole: string): boolean {
    if (!service.allowedRoles || service.allowedRoles.length === 0) {
      return true; // No restrictions
    }

    return service.allowedRoles.includes(userRole);
  }

  /**
   * Filter services by user role
   */
  static filterByRole(services: Service[], userRole: string): Service[] {
    return services.filter(service => this.canAccessService(service, userRole));
  }

  /**
   * Get validator for service
   */
  static getValidator(service: Service): SchemaValidator {
    return new SchemaValidator(service.inputSchema as ServiceInputSchema);
  }

  /**
   * Validate order input against service schema
   */
  static validateOrderInput(
    service: Service,
    input: Record<string, any>
  ): { valid: boolean; errors?: Record<string, string[]>; data?: Record<string, any> } {
    const validator = this.getValidator(service);
    return validator.validate(input);
  }

  /**
   * Generate unique slug from name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Check if service supports bulk orders
   */
  static supportsBulkOrders(service: Service): boolean {
    return service.supportsBulk === true;
  }

  /**
   * Check if service requires approval
   */
  static requiresApproval(service: Service): boolean {
    return service.requiresApproval === true;
  }

  /**
   * Calculate service price for user role
   * Note: This is a placeholder - actual pricing uses PricingEngine
   */
  static getBaseCost(service: Service): number {
    return service.baseCost;
  }
}

// Bulk service operations
export class BulkServiceManager {
  /**
   * Validate bulk service creation data
   */
  static validateBulkData(
    services: ServiceCreateInput[]
  ): { valid: boolean; errors?: Array<{ index: number; errors: string[] }> } {
    const errors: Array<{ index: number; errors: string[] }> = [];

    services.forEach((service, index) => {
      const validation = ServiceManager.validateServiceData(service);
      if (!validation.valid && validation.errors) {
        errors.push({ index, errors: validation.errors });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Check for duplicate slugs in bulk creation
   */
  static checkDuplicateSlugs(services: ServiceCreateInput[]): string[] {
    const slugs = new Set<string>();
    const duplicates: string[] = [];

    for (const service of services) {
      if (slugs.has(service.slug)) {
        duplicates.push(service.slug);
      } else {
        slugs.add(service.slug);
      }
    }

    return duplicates;
  }
}
