// Manual Provider - Orders require manual fulfillment

import { BaseProvider, ProviderOrderInput, ProviderOrderResponse, ProviderStatusResponse } from './base';

export class ManualProvider extends BaseProvider {
  async validateInput(input: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  async placeOrder(input: ProviderOrderInput): Promise<ProviderOrderResponse> {
    return {
      success: true,
      providerOrderId: `manual-${Date.now()}`,
      status: 'pending_manual',
      data: {
        requiresManualFulfillment: true,
        inputData: input.inputData,
      },
    };
  }

  async checkStatus(providerOrderId: string): Promise<ProviderStatusResponse> {
    return {
      providerOrderId,
      status: 'pending_manual',
      data: {
        message: 'Awaiting manual fulfillment',
      },
    };
  }

  normalizeStatus(providerStatus: string): string {
    return this.mapStatus(providerStatus);
  }
}
