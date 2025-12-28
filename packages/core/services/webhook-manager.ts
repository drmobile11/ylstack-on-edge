// Webhook Management
// Webhook registration, triggering, and admin approval

import type { Webhook } from '../../../shared/schema';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
  webhookId: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export class WebhookError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'WebhookError';
  }
}

export class WebhookManager {
  /**
   * Available webhook events
   */
  static getAvailableEvents(): string[] {
    return [
      'order.created',
      'order.updated',
      'order.completed',
      'order.failed',
      'order.refunded',
      'payment.received',
      'payment.failed',
      'user.created',
      'user.updated',
      'wallet.credited',
      'wallet.debited',
      'service.created',
      'service.updated',
    ];
  }

  /**
   * Validate webhook URL
   */
  static validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);
      
      if (parsed.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Webhook URL must use HTTPS',
        };
      }

      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return {
          valid: false,
          error: 'Localhost URLs are not allowed',
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid URL format',
      };
    }
  }

  /**
   * Validate webhook events
   */
  static validateEvents(events: string[]): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const availableEvents = this.getAvailableEvents();

    if (events.length === 0) {
      errors.push('At least one event is required');
    }

    for (const event of events) {
      if (!availableEvents.includes(event)) {
        errors.push(`Invalid event: ${event}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate webhook secret
   */
  static generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    const randomValues = new Uint8Array(32);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < 32; i++) {
      secret += chars[randomValues[i] % chars.length];
    }
    
    return secret;
  }

  /**
   * Generate webhook signature
   */
  static generateSignature(payload: string, secret: string): string {
    // In production, use HMAC-SHA256
    // This is a placeholder
    return Buffer.from(`${secret}:${payload}`).toString('base64');
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return signature === expectedSignature;
  }

  /**
   * Approve webhook (admin only)
   */
  static approve(webhook: Webhook, approvedBy: string): Partial<Webhook> {
    if (!webhook.requiresApproval) {
      throw new WebhookError('Webhook does not require approval', 'NO_APPROVAL_REQUIRED');
    }

    if (webhook.approvedBy) {
      throw new WebhookError('Webhook is already approved', 'ALREADY_APPROVED');
    }

    return {
      ...webhook,
      approvedBy,
      approvedAt: new Date().toISOString(),
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Revoke webhook approval
   */
  static revokeApproval(webhook: Webhook): Partial<Webhook> {
    return {
      ...webhook,
      approvedBy: undefined,
      approvedAt: undefined,
      isActive: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if webhook can receive events
   */
  static canReceiveEvents(webhook: Webhook): boolean {
    if (!webhook.isActive) {
      return false;
    }

    if (webhook.requiresApproval && !webhook.approvedBy) {
      return false;
    }

    return true;
  }

  /**
   * Trigger webhook
   */
  static async trigger(
    webhook: Webhook,
    event: string,
    data: Record<string, any>
  ): Promise<WebhookDeliveryResult> {
    if (!this.canReceiveEvents(webhook)) {
      return {
        success: false,
        error: 'Webhook is not active or not approved',
      };
    }

    if (!webhook.events.includes(event)) {
      return {
        success: false,
        error: `Webhook is not subscribed to event: ${event}`,
      };
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      webhookId: webhook.id,
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-ID': webhook.id,
        },
        body: payloadString,
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        statusCode: response.status,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Trigger webhooks for event
   */
  static async triggerAll(
    webhooks: Webhook[],
    event: string,
    data: Record<string, any>
  ): Promise<Array<{ webhookId: string; result: WebhookDeliveryResult }>> {
    const results: Array<{ webhookId: string; result: WebhookDeliveryResult }> = [];

    // Filter webhooks subscribed to this event
    const subscribedWebhooks = webhooks.filter(
      wh => this.canReceiveEvents(wh) && wh.events.includes(event)
    );

    // Trigger all webhooks in parallel
    const promises = subscribedWebhooks.map(async webhook => {
      const result = await this.trigger(webhook, event, data);
      return { webhookId: webhook.id, result };
    });

    const settled = await Promise.allSettled(promises);

    for (const promise of settled) {
      if (promise.status === 'fulfilled') {
        results.push(promise.value);
      } else {
        // Handle rejected promises
        results.push({
          webhookId: 'unknown',
          result: {
            success: false,
            error: promise.reason?.message || 'Unknown error',
          },
        });
      }
    }

    return results;
  }

  /**
   * Update last triggered timestamp
   */
  static markTriggered(webhook: Webhook): Partial<Webhook> {
    return {
      ...webhook,
      lastTriggeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get webhooks requiring approval
   */
  static getPendingApproval(webhooks: Webhook[]): Webhook[] {
    return webhooks.filter(wh => wh.requiresApproval && !wh.approvedBy);
  }

  /**
   * Get active webhooks
   */
  static getActive(webhooks: Webhook[]): Webhook[] {
    return webhooks.filter(wh => this.canReceiveEvents(wh));
  }

  /**
   * Get webhooks by event
   */
  static getByEvent(webhooks: Webhook[], event: string): Webhook[] {
    return webhooks.filter(wh => wh.events.includes(event));
  }

  /**
   * Validate webhook creation
   */
  static validateCreate(
    url: string,
    events: string[]
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    const urlValidation = this.validateUrl(url);
    if (!urlValidation.valid) {
      errors.push(urlValidation.error!);
    }

    const eventsValidation = this.validateEvents(events);
    if (!eventsValidation.valid && eventsValidation.errors) {
      errors.push(...eventsValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get webhook statistics
   */
  static getStats(webhooks: Webhook[]): {
    total: number;
    active: number;
    pendingApproval: number;
    inactive: number;
  } {
    return {
      total: webhooks.length,
      active: this.getActive(webhooks).length,
      pendingApproval: this.getPendingApproval(webhooks).length,
      inactive: webhooks.filter(wh => !wh.isActive).length,
    };
  }

  /**
   * Test webhook delivery
   */
  static async test(webhook: Webhook): Promise<WebhookDeliveryResult> {
    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
      },
      webhookId: webhook.id,
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'webhook.test',
          'X-Webhook-ID': webhook.id,
        },
        body: payloadString,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.ok,
        statusCode: response.status,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }
  }
}
