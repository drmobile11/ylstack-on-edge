// Dynamic Service Schema Validator
// Validates input data against service-defined schemas

import { z } from 'zod';

export interface FieldSchema {
  name: string;
  type: 'text' | 'number' | 'email' | 'file' | 'select' | 'textarea' | 'checkbox';
  label: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    options?: string[];
    unique?: boolean;
    custom?: string;
  };
}

export interface ServiceInputSchema {
  fields: FieldSchema[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string[]>;
  data?: Record<string, any>;
}

export class SchemaValidator {
  private schema: ServiceInputSchema;

  constructor(schema: ServiceInputSchema) {
    this.schema = schema;
  }

  validate(input: Record<string, any>): ValidationResult {
    const errors: Record<string, string[]> = {};
    const data: Record<string, any> = {};

    for (const field of this.schema.fields) {
      const value = input[field.name];
      const fieldErrors: string[] = [];

      // Required validation
      if (field.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${field.label} is required`);
        errors[field.name] = fieldErrors;
        continue;
      }

      // Skip further validation if not required and empty
      if (!field.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      switch (field.type) {
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            fieldErrors.push(`${field.label} must be a number`);
          } else {
            data[field.name] = Number(value);
          }
          break;

        case 'email':
          if (typeof value !== 'string' || !this.isValidEmail(value)) {
            fieldErrors.push(`${field.label} must be a valid email`);
          } else {
            data[field.name] = value;
          }
          break;

        case 'checkbox':
          data[field.name] = Boolean(value);
          break;

        default:
          data[field.name] = value;
      }

      // Additional validation rules
      if (field.validation && fieldErrors.length === 0) {
        const validation = field.validation;

        // Pattern validation
        if (validation.pattern && typeof value === 'string') {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            fieldErrors.push(`${field.label} format is invalid`);
          }
        }

        // Length validation
        if (validation.minLength && typeof value === 'string' && value.length < validation.minLength) {
          fieldErrors.push(`${field.label} must be at least ${validation.minLength} characters`);
        }

        if (validation.maxLength && typeof value === 'string' && value.length > validation.maxLength) {
          fieldErrors.push(`${field.label} must be at most ${validation.maxLength} characters`);
        }

        // Number range validation
        if (validation.min !== undefined && Number(value) < validation.min) {
          fieldErrors.push(`${field.label} must be at least ${validation.min}`);
        }

        if (validation.max !== undefined && Number(value) > validation.max) {
          fieldErrors.push(`${field.label} must be at most ${validation.max}`);
        }

        // Select options validation
        if (validation.options && !validation.options.includes(String(value))) {
          fieldErrors.push(`${field.label} must be one of: ${validation.options.join(', ')}`);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      data: Object.keys(errors).length === 0 ? data : undefined,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getFields(): FieldSchema[] {
    return this.schema.fields;
  }

  getRequiredFields(): string[] {
    return this.schema.fields
      .filter(f => f.required)
      .map(f => f.name);
  }
}

// Example schema for IMEI service
export const exampleIMEISchema: ServiceInputSchema = {
  fields: [
    {
      name: 'imei',
      type: 'text',
      label: 'IMEI Number',
      required: true,
      placeholder: '123456789012345',
      description: '15-digit IMEI number',
      validation: {
        pattern: '^[0-9]{15}$',
        minLength: 15,
        maxLength: 15,
      },
    },
    {
      name: 'model',
      type: 'text',
      label: 'Device Model',
      required: false,
      placeholder: 'iPhone 14 Pro',
    },
  ],
};

// Example schema for file service
export const exampleFileSchema: ServiceInputSchema = {
  fields: [
    {
      name: 'file',
      type: 'file',
      label: 'Upload File',
      required: true,
      description: 'Upload the file to process',
    },
    {
      name: 'format',
      type: 'select',
      label: 'Output Format',
      required: true,
      validation: {
        options: ['pdf', 'docx', 'txt'],
      },
    },
  ],
};
