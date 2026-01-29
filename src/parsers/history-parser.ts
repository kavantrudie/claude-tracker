// Parser for history.jsonl (JSON Lines format)

import fs from 'fs';
import readline from 'readline';
import { HistoryEntry } from '../types/claude-data.js';
import { CorruptedFileError } from '../utils/errors.js';

export async function parseHistory(filePath: string, limit?: number): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = [];

  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.trim() === '') continue;

      try {
        const entry = JSON.parse(line) as HistoryEntry;
        entries.push(entry);

        if (limit && entries.length >= limit) {
          rl.close();
          break;
        }
      } catch (parseError) {
        // Skip invalid lines but continue parsing
        console.warn(`Warning: Skipping invalid line in history.jsonl`);
        continue;
      }
    }

    return entries;
  } catch (error) {
    if (error instanceof Error) {
      throw new CorruptedFileError(filePath, error);
    }
    throw error;
  }
}

// Get the last N entries (most recent)
export async function parseRecentHistory(filePath: string, count: number): Promise<HistoryEntry[]> {
  const allEntries = await parseHistory(filePath);
  return allEntries.slice(-count);
}
