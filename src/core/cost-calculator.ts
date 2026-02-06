// Cost calculation logic based on token usage and pricing

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PricingConfig, ModelPricing, CostBreakdown, TotalCostSummary } from '../types/pricing.js';
import { ModelUsage } from '../types/claude-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pricingCache: PricingConfig | null = null;

export async function loadPricing(): Promise<PricingConfig> {
  if (pricingCache) {
    return pricingCache;
  }

  const pricingPath = path.join(__dirname, '../../config/pricing.json');
  const content = await fs.readFile(pricingPath, 'utf-8');
  pricingCache = JSON.parse(content) as PricingConfig;
  return pricingCache;
}

export function getPricing(modelId: string, config: PricingConfig): ModelPricing | null {
  // Exact match first
  if (config.models[modelId]) {
    return config.models[modelId];
  }

  // Fuzzy match: strip date suffix (e.g., claude-opus-4-6-20260205 -> claude-opus-4-6)
  // and try matching against known base model IDs
  for (const [knownId, pricing] of Object.entries(config.models)) {
    if (modelId.startsWith(knownId)) {
      return pricing;
    }
  }

  return null;
}

export interface CostCalculationInput {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests?: number;
}

export function calculateModelCost(
  modelId: string,
  usage: CostCalculationInput,
  pricing: ModelPricing
): CostBreakdown {
  // Calculate costs (pricing is per million tokens)
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputTokenPrice;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputTokenPrice;
  const cacheWriteCost = (usage.cacheCreationInputTokens / 1_000_000) * pricing.cacheWritePrice;
  const cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * pricing.cacheReadPrice;

  const totalCost = inputCost + outputCost + cacheWriteCost + cacheReadCost;

  // Calculate what the cost would have been without caching
  // Cache reads would have been regular input tokens
  // Cache creation tokens would also have been regular input tokens
  const totalInputTokensWithoutCache =
    usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
  const costWithoutCache =
    (totalInputTokensWithoutCache / 1_000_000) * pricing.inputTokenPrice + outputCost;

  const cacheSavings = costWithoutCache - totalCost;
  const cacheSavingsPercentage = costWithoutCache > 0
    ? (cacheSavings / costWithoutCache) * 100
    : 0;

  return {
    modelId,
    modelName: pricing.name,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationTokens: usage.cacheCreationInputTokens,
    cacheReadTokens: usage.cacheReadInputTokens,
    inputCost,
    outputCost,
    cacheWriteCost,
    cacheReadCost,
    totalCost,
    totalCostWithoutCache: costWithoutCache,
    cacheSavings,
    cacheSavingsPercentage,
  };
}

export async function calculateTotalCost(
  modelUsage: Record<string, ModelUsage>
): Promise<TotalCostSummary> {
  const pricingConfig = await loadPricing();
  const modelBreakdowns: CostBreakdown[] = [];

  for (const [modelId, usage] of Object.entries(modelUsage)) {
    const pricing = getPricing(modelId, pricingConfig);
    if (!pricing) {
      console.warn(`Warning: No pricing found for model ${modelId}`);
      continue;
    }

    const breakdown = calculateModelCost(modelId, usage, pricing);
    modelBreakdowns.push(breakdown);
  }

  const totalCost = modelBreakdowns.reduce((sum, b) => sum + b.totalCost, 0);
  const totalCostWithoutCache = modelBreakdowns.reduce((sum, b) => sum + b.totalCostWithoutCache, 0);
  const totalCacheSavings = totalCostWithoutCache - totalCost;
  const totalCacheSavingsPercentage = totalCostWithoutCache > 0
    ? (totalCacheSavings / totalCostWithoutCache) * 100
    : 0;

  return {
    modelBreakdowns,
    totalCost,
    totalCostWithoutCache,
    totalCacheSavings,
    totalCacheSavingsPercentage,
  };
}

// Verify calculated cost against Claude Code's stored cost
export function verifyCost(calculated: number, stored: number, tolerance: number = 0.01): boolean {
  if (stored === 0) return calculated === 0;
  const difference = Math.abs(calculated - stored);
  const percentDifference = difference / stored;
  return percentDifference < tolerance;
}
