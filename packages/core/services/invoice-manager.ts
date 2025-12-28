// Invoice Management
// Invoice generation, tracking, and payment processing

import type { Invoice, Order, User } from '../../../shared/schema';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export interface InvoiceCreateInput {
  tenantId: string;
  userId: string;
  orders?: Order[];
  subtotal: number;
  tax?: number;
  currency?: string;
  dueDate?: string;
  metadata?: Record<string, any>;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  orderId?: string;
}

export class InvoiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'InvoiceError';
  }
}

export class InvoiceManager {
  /**
   * Generate invoice number
   */
  static generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${timestamp}-${random}`;
  }

  /**
   * Create invoice from orders
   */
  static createFromOrders(
    tenantId: string,
    userId: string,
    orders: Order[],
    taxRate: number = 0,
    currency: string = 'USD'
  ): Partial<Invoice> {
    if (orders.length === 0) {
      throw new InvoiceError('Cannot create invoice without orders', 'NO_ORDERS');
    }

    // Calculate subtotal
    const subtotal = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Calculate tax
    const tax = Math.floor(subtotal * taxRate);

    // Calculate total
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = this.generateInvoiceNumber();

    // Set due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice: Partial<Invoice> = {
      tenantId,
      userId,
      invoiceNumber,
      status: 'draft',
      subtotal,
      tax,
      total,
      currency,
      dueDate: dueDate.toISOString(),
      metadata: {
        orderIds: orders.map(o => o.id),
        orderCount: orders.length,
      },
    };

    return invoice;
  }

  /**
   * Create manual invoice
   */
  static createManual(input: InvoiceCreateInput): Partial<Invoice> {
    const tax = input.tax || 0;
    const total = input.subtotal + tax;
    const invoiceNumber = this.generateInvoiceNumber();

    const invoice: Partial<Invoice> = {
      tenantId: input.tenantId,
      userId: input.userId,
      invoiceNumber,
      status: 'draft',
      subtotal: input.subtotal,
      tax,
      total,
      currency: input.currency || 'USD',
      dueDate: input.dueDate,
      metadata: input.metadata || {},
    };

    return invoice;
  }

  /**
   * Issue invoice (make it official)
   */
  static issue(invoice: Invoice): Partial<Invoice> {
    if (invoice.status !== 'draft') {
      throw new InvoiceError('Only draft invoices can be issued', 'INVALID_STATUS');
    }

    return {
      ...invoice,
      status: 'issued',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mark invoice as paid
   */
  static markPaid(invoice: Invoice): Partial<Invoice> {
    if (invoice.status !== 'issued') {
      throw new InvoiceError('Only issued invoices can be marked as paid', 'INVALID_STATUS');
    }

    return {
      ...invoice,
      status: 'paid',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Cancel invoice
   */
  static cancel(invoice: Invoice): Partial<Invoice> {
    if (invoice.status === 'paid') {
      throw new InvoiceError('Cannot cancel paid invoice', 'CANNOT_CANCEL');
    }

    return {
      ...invoice,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if invoice is overdue
   */
  static isOverdue(invoice: Invoice): boolean {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return false;
    }

    if (!invoice.dueDate) {
      return false;
    }

    const dueDate = new Date(invoice.dueDate);
    return dueDate < new Date();
  }

  /**
   * Get days until due
   */
  static getDaysUntilDue(invoice: Invoice): number | null {
    if (!invoice.dueDate) {
      return null;
    }

    const dueDate = new Date(invoice.dueDate);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Calculate invoice line items from orders
   */
  static calculateLineItems(orders: Order[]): InvoiceLineItem[] {
    return orders.map(order => ({
      description: `Order ${order.orderNumber}`,
      quantity: 1,
      unitPrice: order.totalAmount,
      amount: order.totalAmount,
      orderId: order.id,
    }));
  }

  /**
   * Validate invoice data
   */
  static validate(invoice: Partial<Invoice>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!invoice.userId) {
      errors.push('User ID is required');
    }

    if (!invoice.subtotal || invoice.subtotal < 0) {
      errors.push('Subtotal must be a positive number');
    }

    if (invoice.tax !== undefined && invoice.tax < 0) {
      errors.push('Tax cannot be negative');
    }

    if (!invoice.total || invoice.total < 0) {
      errors.push('Total must be a positive number');
    }

    if (invoice.subtotal && invoice.tax !== undefined && invoice.total) {
      if (invoice.subtotal + invoice.tax !== invoice.total) {
        errors.push('Total must equal subtotal plus tax');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get invoice summary
   */
  static getSummary(invoices: Invoice[]): {
    total: number;
    draft: number;
    issued: number;
    paid: number;
    cancelled: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  } {
    const summary = {
      total: invoices.length,
      draft: 0,
      issued: 0,
      paid: 0,
      cancelled: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    };

    for (const invoice of invoices) {
      // Count by status
      switch (invoice.status) {
        case 'draft':
          summary.draft++;
          break;
        case 'issued':
          summary.issued++;
          break;
        case 'paid':
          summary.paid++;
          break;
        case 'cancelled':
          summary.cancelled++;
          break;
      }

      // Check overdue
      if (this.isOverdue(invoice)) {
        summary.overdue++;
      }

      // Calculate amounts
      summary.totalAmount += invoice.total;
      
      if (invoice.status === 'paid') {
        summary.paidAmount += invoice.total;
      } else if (invoice.status === 'issued') {
        summary.unpaidAmount += invoice.total;
      }
    }

    return summary;
  }

  /**
   * Filter invoices by status
   */
  static filterByStatus(invoices: Invoice[], status: InvoiceStatus): Invoice[] {
    return invoices.filter(inv => inv.status === status);
  }

  /**
   * Get overdue invoices
   */
  static getOverdueInvoices(invoices: Invoice[]): Invoice[] {
    return invoices.filter(inv => this.isOverdue(inv));
  }

  /**
   * Get invoices for user
   */
  static getByUser(invoices: Invoice[], userId: string): Invoice[] {
    return invoices.filter(inv => inv.userId === userId);
  }

  /**
   * Calculate tax amount
   */
  static calculateTax(subtotal: number, taxRate: number): number {
    return Math.floor(subtotal * taxRate);
  }

  /**
   * Format invoice amount for display
   */
  static formatAmount(amount: number, currency: string = 'USD'): string {
    const dollars = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(dollars);
  }

  /**
   * Generate invoice PDF data (placeholder)
   */
  static generatePdfData(invoice: Invoice, user: User, lineItems: InvoiceLineItem[]): Record<string, any> {
    return {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.createdAt,
      dueDate: invoice.dueDate,
      customer: {
        name: user.name,
        email: user.email,
      },
      lineItems,
      subtotal: this.formatAmount(invoice.subtotal, invoice.currency),
      tax: this.formatAmount(invoice.tax || 0, invoice.currency),
      total: this.formatAmount(invoice.total, invoice.currency),
      status: invoice.status,
    };
  }
}
