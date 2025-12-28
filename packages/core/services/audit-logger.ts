// Audit Logging System
// Track all security-relevant actions

export interface AuditLogEntry {
  tenantId: string;
  actorId: string;
  actorType: 'user' | 'api_key';
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  /**
   * Log user action
   */
  static logUserAction(
    tenantId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string
  ): AuditLogEntry {
    return {
      tenantId,
      actorId: userId,
      actorType: 'user',
      action,
      resource,
      resourceId,
      metadata,
      ipAddress,
    };
  }

  /**
   * Log API key action
   */
  static logApiKeyAction(
    tenantId: string,
    apiKeyId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string
  ): AuditLogEntry {
    return {
      tenantId,
      actorId: apiKeyId,
      actorType: 'api_key',
      action,
      resource,
      resourceId,
      metadata,
      ipAddress,
    };
  }

  /**
   * Log authentication event
   */
  static logAuth(
    tenantId: string,
    userId: string,
    action: 'login' | 'logout' | 'login_failed',
    ipAddress?: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      action,
      'auth',
      undefined,
      metadata,
      ipAddress
    );
  }

  /**
   * Log order action
   */
  static logOrder(
    tenantId: string,
    userId: string,
    action: 'create' | 'update' | 'approve' | 'cancel' | 'refund',
    orderId: string,
    metadata?: Record<string, any>,
    ipAddress?: string
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      `order.${action}`,
      'order',
      orderId,
      metadata,
      ipAddress
    );
  }

  /**
   * Log wallet transaction
   */
  static logWallet(
    tenantId: string,
    userId: string,
    action: 'credit' | 'debit' | 'lock' | 'unlock' | 'refund',
    walletId: string,
    amount: number,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      `wallet.${action}`,
      'wallet',
      walletId,
      { ...metadata, amount },
      undefined
    );
  }

  /**
   * Log service action
   */
  static logService(
    tenantId: string,
    userId: string,
    action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate',
    serviceId: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      `service.${action}`,
      'service',
      serviceId,
      metadata,
      undefined
    );
  }

  /**
   * Log user management action
   */
  static logUserManagement(
    tenantId: string,
    actorId: string,
    action: 'create' | 'update' | 'delete' | 'activate' | 'disable' | 'ban' | 'warn',
    targetUserId: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      actorId,
      `user.${action}`,
      'user',
      targetUserId,
      metadata,
      undefined
    );
  }

  /**
   * Log provider action
   */
  static logProvider(
    tenantId: string,
    userId: string,
    action: 'create' | 'update' | 'delete' | 'sync',
    providerId: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      `provider.${action}`,
      'provider',
      providerId,
      metadata,
      undefined
    );
  }

  /**
   * Log pricing rule action
   */
  static logPricing(
    tenantId: string,
    userId: string,
    action: 'create' | 'update' | 'delete',
    ruleId: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      `pricing.${action}`,
      'pricing_rule',
      ruleId,
      metadata,
      undefined
    );
  }

  /**
   * Log webhook action
   */
  static logWebhook(
    tenantId: string,
    userId: string,
    action: 'create' | 'update' | 'delete' | 'approve' | 'trigger',
    webhookId: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      `webhook.${action}`,
      'webhook',
      webhookId,
      metadata,
      undefined
    );
  }

  /**
   * Log API key action
   */
  static logApiKey(
    tenantId: string,
    userId: string,
    action: 'create' | 'delete' | 'revoke',
    apiKeyId: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      `api_key.${action}`,
      'api_key',
      apiKeyId,
      metadata,
      undefined
    );
  }

  /**
   * Log permission denied
   */
  static logAccessDenied(
    tenantId: string,
    actorId: string,
    actorType: 'user' | 'api_key',
    action: string,
    resource: string,
    resourceId?: string,
    reason?: string,
    ipAddress?: string
  ): AuditLogEntry {
    return {
      tenantId,
      actorId,
      actorType,
      action: `access_denied.${action}`,
      resource,
      resourceId,
      metadata: { reason },
      ipAddress,
    };
  }

  /**
   * Log data export
   */
  static logDataExport(
    tenantId: string,
    userId: string,
    resource: string,
    recordCount: number,
    ipAddress?: string
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      'export',
      resource,
      undefined,
      { recordCount },
      ipAddress
    );
  }

  /**
   * Log configuration change
   */
  static logConfigChange(
    tenantId: string,
    userId: string,
    configKey: string,
    oldValue: any,
    newValue: any
  ): AuditLogEntry {
    return this.logUserAction(
      tenantId,
      userId,
      'config.update',
      'configuration',
      configKey,
      { oldValue, newValue },
      undefined
    );
  }

  /**
   * Format audit log for display
   */
  static format(entry: AuditLogEntry): string {
    const actor = entry.actorType === 'user' ? 'User' : 'API Key';
    const resource = entry.resourceId ? `${entry.resource}:${entry.resourceId}` : entry.resource;
    return `${actor} ${entry.actorId} performed ${entry.action} on ${resource}`;
  }

  /**
   * Filter logs by action
   */
  static filterByAction(logs: AuditLogEntry[], action: string): AuditLogEntry[] {
    return logs.filter(log => log.action === action);
  }

  /**
   * Filter logs by resource
   */
  static filterByResource(logs: AuditLogEntry[], resource: string): AuditLogEntry[] {
    return logs.filter(log => log.resource === resource);
  }

  /**
   * Filter logs by actor
   */
  static filterByActor(logs: AuditLogEntry[], actorId: string): AuditLogEntry[] {
    return logs.filter(log => log.actorId === actorId);
  }

  /**
   * Get security-relevant logs
   */
  static getSecurityLogs(logs: AuditLogEntry[]): AuditLogEntry[] {
    const securityActions = [
      'login',
      'logout',
      'login_failed',
      'access_denied',
      'user.ban',
      'user.delete',
      'api_key.create',
      'api_key.delete',
      'config.update',
    ];

    return logs.filter(log => 
      securityActions.some(action => log.action.includes(action))
    );
  }

  /**
   * Get failed actions
   */
  static getFailedActions(logs: AuditLogEntry[]): AuditLogEntry[] {
    return logs.filter(log => 
      log.action.includes('failed') || log.action.includes('denied')
    );
  }
}

/**
 * Middleware for automatic audit logging
 */
export function createAuditMiddleware() {
  return async (c: any, next: any) => {
    const startTime = Date.now();
    const tenantId = c.get('tenantId');
    const userId = c.get('userId');
    const apiKeyId = c.get('apiKeyId');
    const ipAddress = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP');

    await next();

    // Log after request completes
    const duration = Date.now() - startTime;
    const method = c.req.method;
    const path = c.req.path;
    const status = c.res.status;

    // Only log state-changing operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const actorId = userId || apiKeyId;
      const actorType = userId ? 'user' : 'api_key';

      if (actorId && tenantId) {
        const entry: AuditLogEntry = {
          tenantId,
          actorId,
          actorType,
          action: `${method.toLowerCase()}.${path}`,
          resource: 'api',
          metadata: {
            method,
            path,
            status,
            duration,
          },
          ipAddress,
        };

        // Store audit log (would be saved to database)
        c.set('auditLog', entry);
      }
    }
  };
}
