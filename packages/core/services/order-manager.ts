// Order Management
// Order placement, fulfillment, and lifecycle management

import type { Order, Service, Provider } from '../../../shared/schema';
import { OrderStateMachine, type OrderStatus } from './order-state-machine';
import { PricingEngine, type PricingRule } from './pricing-engine';
import { ServiceManager } from './service-manager';
import { ProviderRegistry, type ProviderConfig } from '../providers';

export interface OrderCreateInput {
  tenantId: string;
  userId: string;
  serviceId: string;
  inputData: Record<string, any>;
  userRole: string;
  metadata?: Record<string, any>;
}

export interface OrderPlacementResult {
  success: boolean;
  order?: Order;
  error?: {
    code: string;
    message: string;
    validationErrors?: Record<string, string[]>;
  };
}

export interface OrderFulfillmentResult {
  success: boolean;
  status: OrderStatus;
  outputData?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

export class OrderManager {
  /**
   * Place a new order
   */
  static async placeOrder(
    input: OrderCreateInput,
    service: Service,
    pricingRules: PricingRule[]
  ): Promise<OrderPlacementResult> {
    // Validate input against service schema
    const validation = ServiceManager.validateOrderInput(service, input.inputData);
    
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          validationErrors: validation.errors,
        },
      };
    }

    // Check if user role can access service
    if (!ServiceManager.canAccessService(service, input.userRole)) {
      return {
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Service not available for your role',
        },
      };
    }

    // Calculate pricing
    const pricing = PricingEngine.calculatePrice(
      service.baseCost,
      pricingRules,
      input.userRole,
      1,
      service.currency
    );

    // Generate order number
    const orderNumber = this.generateOrderNumber();

    // Determine initial status
    const initialStatus: OrderStatus = service.requiresApproval 
      ? 'pending' 
      : 'payment_confirmed';

    const order: Partial<Order> = {
      tenantId: input.tenantId,
      userId: input.userId,
      serviceId: input.serviceId,
      orderNumber,
      status: initialStatus,
      inputData: validation.data!,
      baseCost: service.baseCost,
      markup: pricing.markup,
      totalAmount: pricing.totalAmount,
      paidAmount: 0,
      currency: service.currency,
      metadata: input.metadata || {},
    };

    return {
      success: true,
      order: order as Order,
    };
  }

  /**
   * Execute order with provider
   */
  static async fulfillOrder(
    order: Order,
    service: Service,
    provider: Provider
  ): Promise<OrderFulfillmentResult> {
    try {
      // Create provider instance
      const providerConfig: ProviderConfig = {
        id: provider.id,
        name: provider.name,
        type: provider.type as any,
        credentials: provider.credentials,
        config: provider.config,
        statusMapping: provider.statusMapping,
      };

      const providerInstance = ProviderRegistry.create(providerConfig);

      // Validate input with provider
      const inputValidation = await providerInstance.validateInput(order.inputData);
      if (!inputValidation.valid) {
        return {
          success: false,
          status: 'failed',
          error: {
            code: 'PROVIDER_VALIDATION_ERROR',
            message: inputValidation.errors?.join(', ') || 'Provider validation failed',
          },
        };
      }

      // Place order with provider
      const providerResponse = await providerInstance.placeOrder({
        serviceId: service.id,
        inputData: order.inputData,
        metadata: order.metadata,
      });

      if (!providerResponse.success) {
        return {
          success: false,
          status: 'failed',
          error: providerResponse.error,
        };
      }

      // Normalize provider status
      const normalizedStatus = providerInstance.normalizeStatus(providerResponse.status);

      return {
        success: true,
        status: this.mapProviderStatusToOrderStatus(normalizedStatus),
        outputData: providerResponse.data,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: 'FULFILLMENT_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Transition order to new status
   */
  static transitionOrder(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    userRole?: string
  ): { allowed: boolean; reason?: string } {
    return OrderStateMachine.canTransition(currentStatus, newStatus, userRole);
  }

  /**
   * Get available transitions for order
   */
  static getAvailableTransitions(
    order: Order,
    userRole?: string
  ): OrderStatus[] {
    return OrderStateMachine.getAvailableTransitions(order.status as OrderStatus, userRole);
  }

  /**
   * Check if order is in terminal state
   */
  static isTerminal(order: Order): boolean {
    return OrderStateMachine.isTerminalState(order.status as OrderStatus);
  }

  /**
   * Approve order (admin only)
   */
  static approveOrder(
    order: Order,
    approvedBy: string,
    userRole: string
  ): { allowed: boolean; reason?: string } {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return {
        allowed: false,
        reason: 'Only admins can approve orders',
      };
    }

    const transition = this.transitionOrder(
      order.status as OrderStatus,
      'approved',
      userRole
    );

    return transition;
  }

  /**
   * Cancel order
   */
  static cancelOrder(
    order: Order,
    userRole: string
  ): { allowed: boolean; reason?: string } {
    return this.transitionOrder(
      order.status as OrderStatus,
      'cancelled',
      userRole
    );
  }

  /**
   * Refund order
   */
  static refundOrder(
    order: Order,
    userRole: string
  ): { allowed: boolean; reason?: string } {
    return this.transitionOrder(
      order.status as OrderStatus,
      'refunded',
      userRole
    );
  }

  /**
   * Generate unique order number
   */
  private static generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Map provider status to order status
   */
  private static mapProviderStatusToOrderStatus(providerStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'pending': 'processing',
      'processing': 'processing',
      'completed': 'delivered',
      'delivered': 'delivered',
      'failed': 'failed',
      'error': 'failed',
    };

    return statusMap[providerStatus] || 'processing';
  }
}

// Bulk order management
export class BulkOrderManager {
  /**
   * Place bulk order
   */
  static async placeBulkOrder(
    input: OrderCreateInput,
    service: Service,
    pricingRules: PricingRule[],
    items: Array<Record<string, any>>
  ): Promise<OrderPlacementResult> {
    if (!service.supportsBulk) {
      return {
        success: false,
        error: {
          code: 'BULK_NOT_SUPPORTED',
          message: 'Service does not support bulk orders',
        },
      };
    }

    // Validate all items
    const validationErrors: Array<{ index: number; errors: Record<string, string[]> }> = [];
    
    for (let i = 0; i < items.length; i++) {
      const validation = ServiceManager.validateOrderInput(service, items[i]);
      if (!validation.valid && validation.errors) {
        validationErrors.push({ index: i, errors: validation.errors });
      }
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: {
          code: 'BULK_VALIDATION_ERROR',
          message: `${validationErrors.length} items failed validation`,
          validationErrors: validationErrors.reduce((acc, item) => {
            acc[`item_${item.index}`] = Object.values(item.errors).flat();
            return acc;
          }, {} as Record<string, string[]>),
        },
      };
    }

    // Calculate total pricing
    const pricing = PricingEngine.calculatePrice(
      service.baseCost,
      pricingRules,
      input.userRole,
      items.length,
      service.currency
    );

    const orderNumber = OrderManager['generateOrderNumber']();

    const order: Partial<Order> = {
      tenantId: input.tenantId,
      userId: input.userId,
      serviceId: input.serviceId,
      orderNumber,
      status: service.requiresApproval ? 'pending' : 'payment_confirmed',
      inputData: { bulkCount: items.length },
      baseCost: service.baseCost * items.length,
      markup: pricing.markup,
      totalAmount: pricing.totalAmount,
      paidAmount: 0,
      currency: service.currency,
      metadata: {
        ...input.metadata,
        isBulk: true,
        itemCount: items.length,
      },
    };

    return {
      success: true,
      order: order as Order,
    };
  }
}
