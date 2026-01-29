// Service for syncing usage data from Anthropic API

import { AnthropicClient } from './anthropic-client.js';
import { APISyncResult } from '../types/anthropic-api.js';
import { ModelUsage } from '../types/claude-data.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface SyncOptions {
  apiKey: string;
  startDate?: Date;
  endDate?: Date;
  timeBucket?: '1m' | '1h' | '1d';
  workspaceId?: string;
}

export class APISyncService {
  private client: AnthropicClient;

  constructor(apiKey: string) {
    this.client = new AnthropicClient({ apiKey });
  }

  /**
   * Sync usage and cost data from Anthropic API
   */
  async sync(options: SyncOptions): Promise<APISyncResult> {
    try {
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
      const endDate = options.endDate || new Date();

      // Format dates as ISO 8601
      const start_time = startDate.toISOString();
      const end_time = endDate.toISOString();

      console.log(`Fetching usage data from ${start_time} to ${end_time}...`);

      // Fetch usage report
      const usageData = await this.client.getUsageReport({
        start_time,
        end_time,
        time_bucket: options.timeBucket || '1d',
        workspace_id: options.workspaceId,
      });

      console.log(`Fetched ${usageData.data.length} usage records`);

      // Fetch cost report
      const costData = await this.client.getCostReport({
        start_time,
        end_time,
        workspace_id: options.workspaceId,
      });

      console.log(`Total cost from API: $${costData.total_cost_usd.toFixed(2)}`);

      return {
        success: true,
        usageData,
        costData,
        syncedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Convert API usage data to local ModelUsage format
   */
  static convertToModelUsage(usageData: any): Record<string, ModelUsage> {
    const modelUsage: Record<string, ModelUsage> = {};

    for (const record of usageData.data) {
      const modelId = record.model;

      if (!modelUsage[modelId]) {
        modelUsage[modelId] = {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        };
      }

      modelUsage[modelId].inputTokens += record.input_tokens || 0;
      modelUsage[modelId].outputTokens += record.output_tokens || 0;
      modelUsage[modelId].cacheReadInputTokens += record.cache_read_input_tokens || 0;
      modelUsage[modelId].cacheCreationInputTokens += record.cache_creation_input_tokens || 0;
    }

    return modelUsage;
  }

  /**
   * Cache API response to local file
   */
  static async cacheAPIResponse(result: APISyncResult): Promise<void> {
    const cacheDir = path.join(os.homedir(), '.claude', 'api-cache');
    await fs.mkdir(cacheDir, { recursive: true });

    const cachePath = path.join(cacheDir, 'anthropic-api-sync.json');
    await fs.writeFile(cachePath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`Cached API response to ${cachePath}`);
  }

  /**
   * Load cached API response
   */
  static async loadCachedResponse(): Promise<APISyncResult | null> {
    const cachePath = path.join(os.homedir(), '.claude', 'api-cache', 'anthropic-api-sync.json');

    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const result = JSON.parse(content) as APISyncResult;
      result.syncedAt = new Date(result.syncedAt); // Parse date
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Merge API data with local file data
   */
  static mergeWithLocalData(
    localModelUsage: Record<string, ModelUsage>,
    apiModelUsage: Record<string, ModelUsage>
  ): Record<string, ModelUsage> {
    const merged: Record<string, ModelUsage> = { ...localModelUsage };

    // Add or update with API data
    for (const [modelId, usage] of Object.entries(apiModelUsage)) {
      if (merged[modelId]) {
        // Take the maximum values (API should be authoritative)
        merged[modelId] = {
          inputTokens: Math.max(merged[modelId].inputTokens, usage.inputTokens),
          outputTokens: Math.max(merged[modelId].outputTokens, usage.outputTokens),
          cacheReadInputTokens: Math.max(merged[modelId].cacheReadInputTokens, usage.cacheReadInputTokens),
          cacheCreationInputTokens: Math.max(merged[modelId].cacheCreationInputTokens, usage.cacheCreationInputTokens),
        };
      } else {
        merged[modelId] = usage;
      }
    }

    return merged;
  }
}
