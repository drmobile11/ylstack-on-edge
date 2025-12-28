// Wallet Management
// Ledger-based wallet operations with atomic transactions

import type { Wallet, Transaction } from '../../../shared/schema';

export type TransactionType = 'credit' | 'debit' | 'lock' | 'unlock' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface TransactionCreateInput {
  tenantId: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface WalletBalance {
  available: number;
  locked: number;
  total: number;
  currency: string;
}

export class WalletError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'WalletError';
  }
}

export class WalletManager {
  /**
   * Calculate wallet balance from transaction ledger
   */
  static calculateBalance(transactions: Transaction[]): WalletBalance {
    let available = 0;
    let locked = 0;

    for (const tx of transactions) {
      if (tx.status !== 'completed') {
        continue;
      }

      switch (tx.type) {
        case 'credit':
          available += tx.amount;
          break;
        case 'debit':
          available -= tx.amount;
          break;
        case 'lock':
          available -= tx.amount;
          locked += tx.amount;
          break;
        case 'unlock':
          available += tx.amount;
          locked -= tx.amount;
          break;
        case 'refund':
          available += tx.amount;
          break;
      }
    }

    return {
      available,
      locked,
      total: available + locked,
      currency: transactions[0]?.currency || 'USD',
    };
  }

  /**
   * Credit wallet (add funds)
   */
  static async credit(
    input: TransactionCreateInput
  ): Promise<Transaction> {
    if (input.amount <= 0) {
      throw new WalletError('Credit amount must be positive', 'INVALID_AMOUNT');
    }

    const transaction: Partial<Transaction> = {
      tenantId: input.tenantId,
      walletId: input.walletId,
      type: 'credit',
      amount: input.amount,
      currency: input.currency || 'USD',
      status: 'completed',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description || 'Wallet credit',
      metadata: input.metadata,
      createdBy: input.createdBy,
      completedAt: new Date().toISOString(),
    };

    return transaction as Transaction;
  }

  /**
   * Debit wallet (remove funds)
   */
  static async debit(
    input: TransactionCreateInput,
    currentBalance: WalletBalance
  ): Promise<Transaction> {
    if (input.amount <= 0) {
      throw new WalletError('Debit amount must be positive', 'INVALID_AMOUNT');
    }

    if (currentBalance.available < input.amount) {
      throw new WalletError('Insufficient balance', 'INSUFFICIENT_BALANCE');
    }

    const transaction: Partial<Transaction> = {
      tenantId: input.tenantId,
      walletId: input.walletId,
      type: 'debit',
      amount: input.amount,
      currency: input.currency || 'USD',
      status: 'completed',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description || 'Wallet debit',
      metadata: input.metadata,
      createdBy: input.createdBy,
      completedAt: new Date().toISOString(),
    };

    return transaction as Transaction;
  }

  /**
   * Lock funds (reserve for pending transaction)
   */
  static async lock(
    input: TransactionCreateInput,
    currentBalance: WalletBalance
  ): Promise<Transaction> {
    if (input.amount <= 0) {
      throw new WalletError('Lock amount must be positive', 'INVALID_AMOUNT');
    }

    if (currentBalance.available < input.amount) {
      throw new WalletError('Insufficient balance to lock', 'INSUFFICIENT_BALANCE');
    }

    const transaction: Partial<Transaction> = {
      tenantId: input.tenantId,
      walletId: input.walletId,
      type: 'lock',
      amount: input.amount,
      currency: input.currency || 'USD',
      status: 'completed',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description || 'Funds locked',
      metadata: input.metadata,
      createdBy: input.createdBy,
      completedAt: new Date().toISOString(),
    };

    return transaction as Transaction;
  }

  /**
   * Unlock funds (release locked funds)
   */
  static async unlock(
    input: TransactionCreateInput,
    lockTransactionId: string,
    currentBalance: WalletBalance
  ): Promise<Transaction> {
    if (input.amount <= 0) {
      throw new WalletError('Unlock amount must be positive', 'INVALID_AMOUNT');
    }

    if (currentBalance.locked < input.amount) {
      throw new WalletError('Insufficient locked balance', 'INSUFFICIENT_LOCKED_BALANCE');
    }

    const transaction: Partial<Transaction> = {
      tenantId: input.tenantId,
      walletId: input.walletId,
      type: 'unlock',
      amount: input.amount,
      currency: input.currency || 'USD',
      status: 'completed',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      parentTransactionId: lockTransactionId,
      description: input.description || 'Funds unlocked',
      metadata: input.metadata,
      createdBy: input.createdBy,
      completedAt: new Date().toISOString(),
    };

    return transaction as Transaction;
  }

  /**
   * Refund (return funds)
   */
  static async refund(
    input: TransactionCreateInput,
    originalTransactionId: string
  ): Promise<Transaction> {
    if (input.amount <= 0) {
      throw new WalletError('Refund amount must be positive', 'INVALID_AMOUNT');
    }

    const transaction: Partial<Transaction> = {
      tenantId: input.tenantId,
      walletId: input.walletId,
      type: 'refund',
      amount: input.amount,
      currency: input.currency || 'USD',
      status: 'completed',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      parentTransactionId: originalTransactionId,
      description: input.description || 'Refund',
      metadata: input.metadata,
      createdBy: input.createdBy,
      completedAt: new Date().toISOString(),
    };

    return transaction as Transaction;
  }

  /**
   * Process order payment (lock funds)
   */
  static async processOrderPayment(
    walletId: string,
    tenantId: string,
    orderId: string,
    amount: number,
    userId: string,
    currentBalance: WalletBalance
  ): Promise<Transaction> {
    return this.lock(
      {
        tenantId,
        walletId,
        type: 'lock',
        amount,
        referenceType: 'order',
        referenceId: orderId,
        description: `Payment for order ${orderId}`,
        createdBy: userId,
      },
      currentBalance
    );
  }

  /**
   * Complete order payment (convert lock to debit)
   */
  static async completeOrderPayment(
    walletId: string,
    tenantId: string,
    orderId: string,
    amount: number,
    lockTransactionId: string,
    userId: string,
    currentBalance: WalletBalance
  ): Promise<{ unlock: Transaction; debit: Transaction }> {
    // Unlock the funds
    const unlock = await this.unlock(
      {
        tenantId,
        walletId,
        type: 'unlock',
        amount,
        referenceType: 'order',
        referenceId: orderId,
        description: `Unlock for order ${orderId}`,
        createdBy: userId,
      },
      lockTransactionId,
      currentBalance
    );

    // Debit the funds
    const debit = await this.debit(
      {
        tenantId,
        walletId,
        type: 'debit',
        amount,
        referenceType: 'order',
        referenceId: orderId,
        description: `Payment for order ${orderId}`,
        createdBy: userId,
      },
      {
        ...currentBalance,
        available: currentBalance.available + amount, // After unlock
      }
    );

    return { unlock, debit };
  }

  /**
   * Cancel order payment (unlock funds)
   */
  static async cancelOrderPayment(
    walletId: string,
    tenantId: string,
    orderId: string,
    amount: number,
    lockTransactionId: string,
    userId: string,
    currentBalance: WalletBalance
  ): Promise<Transaction> {
    return this.unlock(
      {
        tenantId,
        walletId,
        type: 'unlock',
        amount,
        referenceType: 'order',
        referenceId: orderId,
        description: `Cancelled order ${orderId}`,
        createdBy: userId,
      },
      lockTransactionId,
      currentBalance
    );
  }

  /**
   * Refund order (return funds)
   */
  static async refundOrder(
    walletId: string,
    tenantId: string,
    orderId: string,
    amount: number,
    originalTransactionId: string,
    userId: string
  ): Promise<Transaction> {
    return this.refund(
      {
        tenantId,
        walletId,
        type: 'refund',
        amount,
        referenceType: 'order',
        referenceId: orderId,
        description: `Refund for order ${orderId}`,
        createdBy: userId,
      },
      originalTransactionId
    );
  }

  /**
   * Validate transaction integrity
   */
  static validateTransaction(transaction: Transaction): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (transaction.amount <= 0) {
      errors.push('Transaction amount must be positive');
    }

    if (!transaction.walletId) {
      errors.push('Wallet ID is required');
    }

    if (!transaction.type) {
      errors.push('Transaction type is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get transaction history for wallet
   */
  static filterTransactionsByType(
    transactions: Transaction[],
    type: TransactionType
  ): Transaction[] {
    return transactions.filter(tx => tx.type === type);
  }

  /**
   * Get pending transactions
   */
  static getPendingTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter(tx => tx.status === 'pending');
  }

  /**
   * Get completed transactions
   */
  static getCompletedTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter(tx => tx.status === 'completed');
  }
}
