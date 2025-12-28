// Payment Gateway Registry
// Factory for creating payment gateway instances

import { BasePaymentGateway, type PaymentGatewayConfig } from './base';
import { WalletPaymentGateway } from './wallet-gateway';

export class PaymentGatewayRegistry {
  private static gateways: Map<string, typeof BasePaymentGateway> = new Map();

  static {
    PaymentGatewayRegistry.register('wallet', WalletPaymentGateway);
  }

  static register(type: string, gatewayClass: typeof BasePaymentGateway): void {
    this.gateways.set(type, gatewayClass);
  }

  static create(config: PaymentGatewayConfig): BasePaymentGateway {
    const GatewayClass = this.gateways.get(config.type);
    
    if (!GatewayClass) {
      throw new Error(`Payment gateway type '${config.type}' not registered`);
    }

    return new GatewayClass(config);
  }

  static getSupportedTypes(): string[] {
    return Array.from(this.gateways.keys());
  }

  static isSupported(type: string): boolean {
    return this.gateways.has(type);
  }
}
