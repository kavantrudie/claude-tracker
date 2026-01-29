// Parser for stats-cache.json

import fs from 'fs/promises';
import { StatsCache } from '../types/claude-data.js';
import { CorruptedFileError } from '../utils/errors.js';

export async function parseStatsCache(filePath: string): Promise<StatsCache> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as StatsCache;

    // Validate the structure
    if (!data.modelUsage || !data.dailyActivity || !Array.isArray(data.dailyActivity)) {
      throw new Error('Invalid stats-cache structure');
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CorruptedFileError(filePath, error);
    }
    throw error;
  }
}
