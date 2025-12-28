// Order State Machine
// Enforces valid state transitions and prevents illegal changes

export type OrderStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'approved'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface StateTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiresRole?: string[];
  requiresApproval?: boolean;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

export class OrderStateMachine {
  private static readonly transitions: StateTransition[] = [
    // Initial transitions
    { from: 'pending', to: 'payment_confirmed' },
    { from: 'pending', to: 'cancelled' },
    
    // Payment confirmed transitions
    { from: 'payment_confirmed', to: 'approved', requiresRole: ['super_admin', 'admin'] },
    { from: 'payment_confirmed', to: 'processing' }, // Auto-approve if not required
    { from: 'payment_confirmed', to: 'cancelled', requiresRole: ['super_admin', 'admin'] },
    
    // Approved transitions
    { from: 'approved', to: 'processing' },
    { from: 'approved', to: 'cancelled', requiresRole: ['super_admin', 'admin'] },
    
    // Processing transitions
    { from: 'processing', to: 'delivered' },
    { from: 'processing', to: 'failed' },
    
    // Failed transitions
    { from: 'failed', to: 'processing' }, // Retry
    { from: 'failed', to: 'refunded', requiresRole: ['super_admin', 'admin'] },
    { from: 'failed', to: 'cancelled', requiresRole: ['super_admin', 'admin'] },
    
    // Delivered transitions
    { from: 'delivered', to: 'refunded', requiresRole: ['super_admin', 'admin'] },
  ];

  static canTransition(
    from: OrderStatus,
    to: OrderStatus,
    userRole?: string
  ): TransitionResult {
    // Same state is always allowed (idempotent)
    if (from === to) {
      return { allowed: true };
    }

    const transition = this.transitions.find(
      t => t.from === from && t.to === to
    );

    if (!transition) {
      return {
        allowed: false,
        reason: `Transition from '${from}' to '${to}' is not allowed`,
      };
    }

    // Check role requirements
    if (transition.requiresRole && userRole) {
      if (!transition.requiresRole.includes(userRole)) {
        return {
          allowed: false,
          reason: `Role '${userRole}' cannot perform this transition`,
        };
      }
    }

    return { allowed: true };
  }

  static getAvailableTransitions(
    currentStatus: OrderStatus,
    userRole?: string
  ): OrderStatus[] {
    return this.transitions
      .filter(t => t.from === currentStatus)
      .filter(t => {
        if (!t.requiresRole || !userRole) return true;
        return t.requiresRole.includes(userRole);
      })
      .map(t => t.to);
  }

  static isTerminalState(status: OrderStatus): boolean {
    const terminalStates: OrderStatus[] = ['delivered', 'refunded', 'cancelled'];
    return terminalStates.includes(status);
  }

  static requiresApproval(status: OrderStatus): boolean {
    return status === 'payment_confirmed';
  }

  static getAllStates(): OrderStatus[] {
    return [
      'pending',
      'payment_confirmed',
      'approved',
      'processing',
      'delivered',
      'failed',
      'refunded',
      'cancelled',
    ];
  }
}

// State machine for order items (bulk orders)
export type OrderItemStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'failed';

export class OrderItemStateMachine {
  private static readonly transitions: Array<{ from: OrderItemStatus; to: OrderItemStatus }> = [
    { from: 'pending', to: 'processing' },
    { from: 'processing', to: 'delivered' },
    { from: 'processing', to: 'failed' },
    { from: 'failed', to: 'processing' }, // Retry
  ];

  static canTransition(from: OrderItemStatus, to: OrderItemStatus): TransitionResult {
    if (from === to) {
      return { allowed: true };
    }

    const transition = this.transitions.find(
      t => t.from === from && t.to === to
    );

    if (!transition) {
      return {
        allowed: false,
        reason: `Item transition from '${from}' to '${to}' is not allowed`,
      };
    }

    return { allowed: true };
  }

  static getAvailableTransitions(currentStatus: OrderItemStatus): OrderItemStatus[] {
    return this.transitions
      .filter(t => t.from === currentStatus)
      .map(t => t.to);
  }

  static isTerminalState(status: OrderItemStatus): boolean {
    return status === 'delivered' || status === 'failed';
  }
}
