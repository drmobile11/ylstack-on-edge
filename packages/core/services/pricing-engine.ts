// Role-Based Pricing Engine
// Calculates final price based on base cost and role-specific markup rules

export type MarkupType = 'fixed' | 'percentage' | 'tiered';

export interface PricingRule {
  id: string;
  serviceId: string;
  role: string;
  markupType: MarkupType;
  markupValue: number; // In cents for fixed, basis points for percentage (e.g., 1000 = 10%)
  minProfit?: number; // In cents
  maxProfit?: number; // In cents
  tierConfig?: TierConfig;
}

export interface TierConfig {
  tiers: Array<{
    minQuantity: number;
    maxQuantity?: number;
    markupValue: number;
  }>;
}

export interface PriceCalculation {
  baseCost: number;
  markup: number;
  totalAmount: number;
  profit: number;
  currency: string;
  appliedRule?: PricingRule;
}

export class PricingEngine {
  /**
   * Calculate price for a service based on role and quantity
   */
  static calculatePrice(
    baseCost: number,
    rules: PricingRule[],
    userRole: string,
    quantity: number = 1,
    currency: string = 'USD'
  ): PriceCalculation {
    // Find applicable rule for user role
    const rule = rules.find(r => r.role === userRole);

    if (!rule) {
      // No markup rule - return base cost
      return {
        baseCost,
        markup: 0,
        totalAmount: baseCost * quantity,
        profit: 0,
        currency,
      };
    }

    let markup = 0;

    switch (rule.markupType) {
      case 'fixed':
        markup = rule.markupValue;
        break;

      case 'percentage':
        // markupValue is in basis points (1000 = 10%)
        markup = Math.floor((baseCost * rule.markupValue) / 10000);
        break;

      case 'tiered':
        if (rule.tierConfig) {
          markup = this.calculateTieredMarkup(baseCost, rule.tierConfig, quantity);
        }
        break;
    }

    // Apply profit limits
    if (rule.minProfit !== undefined && markup < rule.minProfit) {
      markup = rule.minProfit;
    }

    if (rule.maxProfit !== undefined && markup > rule.maxProfit) {
      markup = rule.maxProfit;
    }

    const totalAmount = (baseCost + markup) * quantity;
    const profit = markup * quantity;

    return {
      baseCost,
      markup,
      totalAmount,
      profit,
      currency,
      appliedRule: rule,
    };
  }

  /**
   * Calculate tiered markup based on quantity
   */
  private static calculateTieredMarkup(
    baseCost: number,
    tierConfig: TierConfig,
    quantity: number
  ): number {
    const tier = tierConfig.tiers.find(t => {
      const meetsMin = quantity >= t.minQuantity;
      const meetsMax = t.maxQuantity === undefined || quantity <= t.maxQuantity;
      return meetsMin && meetsMax;
    });

    if (!tier) {
      // No matching tier, use first tier
      const firstTier = tierConfig.tiers[0];
      return Math.floor((baseCost * firstTier.markupValue) / 10000);
    }

    return Math.floor((baseCost * tier.markupValue) / 10000);
  }

  /**
   * Calculate profit distribution across role hierarchy
   */
  static calculateProfitDistribution(
    baseCost: number,
    finalPrice: number,
    roleHierarchy: Array<{ role: string; userId: string }>,
    rules: PricingRule[]
  ): Array<{ userId: string; role: string; profit: number }> {
    const distribution: Array<{ userId: string; role: string; profit: number }> = [];
    let remainingProfit = finalPrice - baseCost;

    // Calculate profit for each role in hierarchy (bottom-up)
    for (let i = roleHierarchy.length - 1; i >= 0; i--) {
      const { role, userId } = roleHierarchy[i];
      const rule = rules.find(r => r.role === role);

      if (!rule || remainingProfit <= 0) {
        distribution.push({ userId, role, profit: 0 });
        continue;
      }

      let roleProfit = 0;

      switch (rule.markupType) {
        case 'fixed':
          roleProfit = Math.min(rule.markupValue, remainingProfit);
          break;

        case 'percentage':
          roleProfit = Math.min(
            Math.floor((baseCost * rule.markupValue) / 10000),
            remainingProfit
          );
          break;
      }

      // Apply profit limits
      if (rule.minProfit !== undefined && roleProfit < rule.minProfit) {
        roleProfit = Math.min(rule.minProfit, remainingProfit);
      }

      if (rule.maxProfit !== undefined && roleProfit > rule.maxProfit) {
        roleProfit = rule.maxProfit;
      }

      distribution.push({ userId, role, profit: roleProfit });
      remainingProfit -= roleProfit;
    }

    return distribution.reverse();
  }

  /**
   * Validate pricing rule configuration
   */
  static validateRule(rule: PricingRule): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (rule.markupValue < 0) {
      errors.push('Markup value cannot be negative');
    }

    if (rule.markupType === 'percentage' && rule.markupValue > 10000) {
      errors.push('Percentage markup cannot exceed 100% (10000 basis points)');
    }

    if (rule.minProfit !== undefined && rule.maxProfit !== undefined) {
      if (rule.minProfit > rule.maxProfit) {
        errors.push('Minimum profit cannot exceed maximum profit');
      }
    }

    if (rule.markupType === 'tiered') {
      if (!rule.tierConfig || rule.tierConfig.tiers.length === 0) {
        errors.push('Tiered markup requires tier configuration');
      } else {
        // Validate tier ranges don't overlap
        const tiers = rule.tierConfig.tiers.sort((a, b) => a.minQuantity - b.minQuantity);
        for (let i = 0; i < tiers.length - 1; i++) {
          const current = tiers[i];
          const next = tiers[i + 1];
          if (current.maxQuantity && current.maxQuantity >= next.minQuantity) {
            errors.push('Tier ranges cannot overlap');
            break;
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
