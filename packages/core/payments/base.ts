// Payment Gateway Plugin Base
// All payment gateways must implement this interface

export type PaymentMethodType = 'wallet' | 'stripe' | 'paypal' | 'bank_transfer' | 'custom';

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
  config: Record<string, any>;
  feeType?: 'fixed' | 'percentage';
  feeValue?: number; // In cents for fixed, basis points for percentage
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  amount?: number;
  fee?: number;
  data?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: {
    code: string;
    message: string;
  };
}

export abstract class BasePaymentGateway {
  protected config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  /**
   * Process payment
   */
  abstract processPayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Verify payment status
   */
  abstract verifyPayment(transactionId: string): Promise<PaymentResponse>;

  /**
   * Process refund
   */
  abstract processRefund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Calculate payment fee
   */
  calculateFee(amount: number): number {
    if (!this.config.feeType || !this.config.feeValue) {
      return 0;
    }

    if (this.config.feeType === 'fixed') {
      return this.config.feeValue;
    }

    if (this.config.feeType === 'percentage') {
      return Math.floor((amount * this.config.feeValue) / 10000);
    }

    return 0;
  }

  /**
   * Get total amount including fees
   */
  getTotalWithFees(amount: number): number {
    const fee = this.calculateFee(amount);
    return amount + fee;
  }

  /**
   * Validate payment request
   */
  validateRequest(request: PaymentRequest): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (request.amount <= 0) {
      errors.push('Payment amount must be positive');
    }

    if (!request.currency) {
      errors.push('Currency is required');
    }

    if (!request.orderId) {
      errors.push('Order ID is required');
    }

    if (!request.userId) {
      errors.push('User ID is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  getName(): string {
    return this.config.name;
  }

  getType(): PaymentMethodType {
    return this.config.type;
  }

  isActive(): boolean {
    return this.config.isActive;
  }
}
