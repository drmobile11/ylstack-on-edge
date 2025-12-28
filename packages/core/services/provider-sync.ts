// Provider Synchronization
// Admin-only provider status sync and order updates

import type { Provider, Order } from '../../../shared/schema';
import { ProviderRegistry, type ProviderConfig } from '../providers';
import { OrderStateMachine, type OrderStatus } from './order-state-machine';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors?: Array<{
    orderId: string;
    error: string;
  }>;
}

export interface OrderSyncUpdate {
  orderId: string;
  providerStatus: string;
  normalizedStatus: OrderStatus;
  outputData?: Record<string, any>;
  completedAt?: string;
}

export class ProviderSyncError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProviderSyncError';
  }
}

export class ProviderSync {
  /**
   * Sync single order status with provider
   */
  static async syncOrder(
    order: Order,
    provider: Provider
  ): Promise<{ success: boolean; update?: OrderSyncUpdate; error?: string }> {
    try {
      if (!order.providerOrderId) {
        return {
          success: false,
          error: 'Order has no provider order ID',
        };
      }

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

      // Check status with provider
      const statusResponse = await providerInstance.checkStatus(order.providerOrderId);

      // Normalize status
      const normalizedStatus = providerInstance.normalizeStatus(statusResponse.status);
      const orderStatus = this.mapProviderStatusToOrderStatus(normalizedStatus);

      // Validate transition is allowed
      const transition = OrderStateMachine.canTransition(
        order.status as OrderStatus,
        orderStatus
      );

      if (!transition.allowed) {
        return {
          success: false,
          error: `Invalid status transition: ${transition.reason}`,
        };
      }

      return {
        success: true,
        update: {
          orderId: order.id,
          providerStatus: statusResponse.status,
          normalizedStatus: orderStatus,
          outputData: statusResponse.data,
          completedAt: statusResponse.completedAt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync multiple orders with provider
   */
  static async syncOrders(
    orders: Order[],
    provider: Provider
  ): Promise<SyncResult> {
    const errors: Array<{ orderId: string; error: string }> = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const order of orders) {
      const result = await this.syncOrder(order, provider);

      if (result.success) {
        syncedCount++;
      } else {
        failedCount++;
        errors.push({
          orderId: order.id,
          error: result.error || 'Unknown error',
        });
      }
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Sync all pending orders for a provider
   */
  static async syncPendingOrders(
    orders: Order[],
    provider: Provider
  ): Promise<SyncResult> {
    // Filter orders that need syncing
    const pendingOrders = orders.filter(order => 
      order.providerId === provider.id &&
      order.providerOrderId &&
      !OrderStateMachine.isTerminalState(order.status as OrderStatus)
    );

    return this.syncOrders(pendingOrders, provider);
  }

  /**
   * Get orders requiring sync
   */
  static getOrdersRequiringSync(orders: Order[], providerId: string): Order[] {
    return orders.filter(order =>
      order.providerId === providerId &&
      order.providerOrderId &&
      !OrderStateMachine.isTerminalState(order.status as OrderStatus)
    );
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
      'success': 'delivered',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
    };

    return statusMap[providerStatus.toLowerCase()] || 'processing';
  }

  /**
   * Validate provider credentials before sync
   */
  static validateProviderCredentials(provider: Provider): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!provider.credentials || Object.keys(provider.credentials).length === 0) {
      errors.push('Provider credentials are missing');
    }

    if (!provider.config || !provider.config.apiUrl) {
      errors.push('Provider API URL is not configured');
    }

    if (!provider.statusMapping || Object.keys(provider.statusMapping).length === 0) {
      errors.push('Provider status mapping is not configured');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Update provider last sync timestamp
   */
  static markSynced(provider: Provider): Partial<Provider> {
    return {
      ...provider,
      lastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if provider needs sync
   */
  static needsSync(provider: Provider, syncIntervalMinutes: number = 5): boolean {
    if (!provider.lastSyncAt) {
      return true;
    }

    const lastSync = new Date(provider.lastSyncAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

    return diffMinutes >= syncIntervalMinutes;
  }

  /**
   * Get sync statistics
   */
  static getSyncStats(orders: Order[], providerId: string): {
    total: number;
    pending: number;
    processing: number;
    delivered: number;
    failed: number;
    needsSync: number;
  } {
    const providerOrders = orders.filter(o => o.providerId === providerId);

    return {
      total: providerOrders.length,
      pending: providerOrders.filter(o => o.status === 'pending').length,
      processing: providerOrders.filter(o => o.status === 'processing').length,
      delivered: providerOrders.filter(o => o.status === 'delivered').length,
      failed: providerOrders.filter(o => o.status === 'failed').length,
      needsSync: this.getOrdersRequiringSync(orders, providerId).length,
    };
  }

  /**
   * Batch sync with rate limiting
   */
  static async syncWithRateLimit(
    orders: Order[],
    provider: Provider,
    batchSize: number = 10,
    delayMs: number = 1000
  ): Promise<SyncResult> {
    const batches: Order[][] = [];
    
    // Split into batches
    for (let i = 0; i < orders.length; i += batchSize) {
      batches.push(orders.slice(i, i + batchSize));
    }

    let totalSynced = 0;
    let totalFailed = 0;
    const allErrors: Array<{ orderId: string; error: string }> = [];

    // Process batches with delay
    for (const batch of batches) {
      const result = await this.syncOrders(batch, provider);
      
      totalSynced += result.syncedCount;
      totalFailed += result.failedCount;
      
      if (result.errors) {
        allErrors.push(...result.errors);
      }

      // Delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return {
      success: totalFailed === 0,
      syncedCount: totalSynced,
      failedCount: totalFailed,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }
}

/**
 * Scheduled sync manager
 */
export class ScheduledSync {
  private static syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start scheduled sync for provider
   */
  static startSync(
    providerId: string,
    intervalMinutes: number,
    syncCallback: () => Promise<void>
  ): void {
    // Clear existing interval
    this.stopSync(providerId);

    // Start new interval
    const interval = setInterval(async () => {
      try {
        await syncCallback();
      } catch (error) {
        console.error(`Scheduled sync failed for provider ${providerId}:`, error);
      }
    }, intervalMinutes * 60 * 1000);

    this.syncIntervals.set(providerId, interval);
  }

  /**
   * Stop scheduled sync for provider
   */
  static stopSync(providerId: string): void {
    const interval = this.syncIntervals.get(providerId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(providerId);
    }
  }

  /**
   * Stop all scheduled syncs
   */
  static stopAllSyncs(): void {
    for (const [providerId, interval] of this.syncIntervals.entries()) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();
  }

  /**
   * Get active sync count
   */
  static getActiveSyncCount(): number {
    return this.syncIntervals.size;
  }
}
