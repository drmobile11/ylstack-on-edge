// Provider Plugin Base Interface
// All providers must implement this interface

export type ProviderType = 'manual' | 'api' | 'async_api' | 'webhook' | 'file_based';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  credentials: Record<string, any>;
  config: Record<string, any>;
  statusMapping: Record<string, string>;
}

export interface ProviderOrderInput {
  serviceId: string;
  inputData: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ProviderOrderResponse {
  success: boolean;
  providerOrderId?: string;
  status: string;
  data?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

export interface ProviderStatusResponse {
  providerOrderId: string;
  status: string;
  data?: Record<string, any>;
  completedAt?: string;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract validateInput(input: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }>;
  
  abstract placeOrder(input: ProviderOrderInput): Promise<ProviderOrderResponse>;
  
  abstract checkStatus(providerOrderId: string): Promise<ProviderStatusResponse>;
  
  abstract normalizeStatus(providerStatus: string): string;

  protected mapStatus(providerStatus: string): string {
    return this.config.statusMapping[providerStatus] || 'processing';
  }

  getName(): string {
    return this.config.name;
  }

  getType(): ProviderType {
    return this.config.type;
  }
}
