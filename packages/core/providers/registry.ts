// Provider Registry - Factory for creating provider instances

import { BaseProvider, ProviderConfig, ProviderType } from './base';
import { ManualProvider } from './manual';
import { ApiProvider } from './api';

export class ProviderRegistry {
  private static providers: Map<string, typeof BaseProvider> = new Map();

  static {
    ProviderRegistry.register('manual', ManualProvider);
    ProviderRegistry.register('api', ApiProvider);
  }

  static register(type: string, providerClass: typeof BaseProvider): void {
    this.providers.set(type, providerClass);
  }

  static create(config: ProviderConfig): BaseProvider {
    const ProviderClass = this.providers.get(config.type);
    
    if (!ProviderClass) {
      throw new Error(`Provider type '${config.type}' not registered`);
    }

    return new ProviderClass(config);
  }

  static getSupportedTypes(): string[] {
    return Array.from(this.providers.keys());
  }

  static isSupported(type: string): boolean {
    return this.providers.has(type);
  }
}
