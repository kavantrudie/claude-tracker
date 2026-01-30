// Coordinate loading of all Claude Code data files

import fs from 'fs/promises';
import chalk from 'chalk';
import { ClaudeData } from '../types/claude-data.js';
import { parseStatsCache } from '../parsers/stats-cache-parser.js';
import { parseConfig } from '../parsers/config-parser.js';
import { parseHistory } from '../parsers/history-parser.js';
import { FileNotFoundError, NoDataError } from '../utils/errors.js';
import {
  getStatsCachePath,
  getConfigPath,
  getHistoryPath,
} from '../utils/path-resolver.js';
import {
  needsUpdate,
  getAggregationStartDate,
  aggregateHistoryByDay,
  mergeWithStatsCache,
} from '../utils/history-aggregator.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function loadClaudeData(options?: {
  includeHistory?: boolean;
  historyLimit?: number;
}): Promise<Partial<ClaudeData>> {
  const data: Partial<ClaudeData> = {};
  const warnings: string[] = [];

  // Try loading stats-cache.json
  const statsCachePath = getStatsCachePath();
  if (await fileExists(statsCachePath)) {
    try {
      data.statsCache = await parseStatsCache(statsCachePath);

      // Check if stats-cache is outdated and supplement with recent history
      if (data.statsCache && needsUpdate(data.statsCache)) {
        const historyPath = getHistoryPath();
        if (await fileExists(historyPath)) {
          try {
            console.log(chalk.yellow(`⚠ stats-cache.json is outdated (last computed: ${data.statsCache.lastComputedDate})`));
            console.log(chalk.cyan('📊 Supplementing with recent data from history.jsonl...'));

            // Get start date for aggregation
            const fromDate = getAggregationStartDate(data.statsCache);

            // Load and filter history entries
            const historyEntries = await parseHistory(historyPath);

            // Aggregate history into daily stats
            const newDailyStats = aggregateHistoryByDay(historyEntries, fromDate);

            if (newDailyStats.length > 0) {
              // Merge with existing stats-cache
              data.statsCache = mergeWithStatsCache(data.statsCache, newDailyStats);
              console.log(chalk.green(`✓ Added ${newDailyStats.length} day(s) of recent activity`));
            }
          } catch (error) {
            warnings.push(`Could not supplement with history data: ${(error as Error).message}`);
          }
        }
      }
    } catch (error) {
      warnings.push(`Could not load stats-cache.json: ${(error as Error).message}`);
    }
  } else {
    warnings.push(`stats-cache.json not found at ${statsCachePath}`);
  }

  // Try loading .claude.json
  const configPath = getConfigPath();
  if (await fileExists(configPath)) {
    try {
      data.config = await parseConfig(configPath);
    } catch (error) {
      warnings.push(`Could not load .claude.json: ${(error as Error).message}`);
    }
  } else {
    warnings.push(`.claude.json not found at ${configPath}`);
  }

  // Try loading history.jsonl (optional)
  if (options?.includeHistory) {
    const historyPath = getHistoryPath();
    if (await fileExists(historyPath)) {
      try {
        data.history = await parseHistory(historyPath, options.historyLimit);
      } catch (error) {
        warnings.push(`Could not load history.jsonl: ${(error as Error).message}`);
      }
    } else {
      warnings.push(`history.jsonl not found at ${historyPath}`);
    }
  }

  // Display warnings if any
  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(chalk.yellow('⚠ ' + warning));
    }
  }

  // Check if we have enough data to proceed
  if (!data.statsCache && !data.config) {
    throw new NoDataError();
  }

  return data;
}
