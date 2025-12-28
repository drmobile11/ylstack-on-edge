// API Provider - Synchronous API calls

import { BaseProvider, ProviderOrderInput, ProviderOrderResponse, ProviderStatusResponse } from './base';

export class ApiProvider extends BaseProvider {
  async validateInput(input: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    
    if (!this.config.config.apiUrl) {
      errors.push('API URL not configured');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async placeOrder(input: ProviderOrderInput): Promise<ProviderOrderResponse> {
    try {
      const apiUrl = this.config.config.apiUrl;
      const apiKey = this.config.credentials.apiKey;

      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          service: input.serviceId,
          data: input.inputData,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: {
            code: 'API_ERROR',
            message: `API returned ${response.status}`,
          },
        };
      }

      const data = await response.json();

      return {
        success: true,
        providerOrderId: data.orderId || data.id,
        status: this.normalizeStatus(data.status),
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: 'NETWORK_ERROR',
          message: error.message,
        },
      };
    }
  }

  async checkStatus(providerOrderId: string): Promise<ProviderStatusResponse> {
    try {
      const apiUrl = this.config.config.apiUrl;
      const apiKey = this.config.credentials.apiKey;

      const response = await fetch(`${apiUrl}/orders/${providerOrderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      return {
        providerOrderId,
        status: this.normalizeStatus(data.status),
        data,
        completedAt: data.completedAt,
      };
    } catch (error: any) {
      return {
        providerOrderId,
        status: 'error',
        data: {
          error: error.message,
        },
      };
    }
  }

  normalizeStatus(providerStatus: string): string {
    return this.mapStatus(providerStatus);
  }
}
