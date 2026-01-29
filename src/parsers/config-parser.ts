// Parser for .claude.json

import fs from 'fs/promises';
import { ClaudeConfig } from '../types/claude-data.js';
import { CorruptedFileError } from '../utils/errors.js';

export async function parseConfig(filePath: string): Promise<ClaudeConfig> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as ClaudeConfig;

    // Validate the structure
    if (!data.projects) {
      throw new Error('Invalid .claude.json structure');
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CorruptedFileError(filePath, error);
    }
    throw error;
  }
}
