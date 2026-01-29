// Pricing model types

export interface ModelPricing {
  name: string;
  inputTokenPrice: number;      // per million tokens
  outputTokenPrice: number;     // per million tokens
  cacheWritePrice: number;      // per million tokens
  cacheReadPrice: number;       // per million tokens
}

export interface PricingConfig {
  version: string;
  models: Record<string, ModelPricing>;
  webSearchPrice?: number;
}

export interface CostBreakdown {
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  inputCost: number;
  outputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  totalCost: number;
  totalCostWithoutCache: number;
  cacheSavings: number;
  cacheSavingsPercentage: number;
}

export interface TotalCostSummary {
  modelBreakdowns: CostBreakdown[];
  totalCost: number;
  totalCostWithoutCache: number;
  totalCacheSavings: number;
  totalCacheSavingsPercentage: number;
}
