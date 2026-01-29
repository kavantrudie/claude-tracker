// Formatting utilities for output

import { format } from 'date-fns';
import chalk from 'chalk';

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatDate(date: Date): string {
  return format(date, 'MMM dd, yyyy');
}

export function formatDateTime(date: Date): string {
  return format(date, 'MMM dd, h:mm a');
}

export function formatDateShort(date: Date): string {
  return format(date, 'MMM dd');
}

// Color coding for costs
export function formatCostWithColor(cost: number): string {
  if (cost < 1) return chalk.green(formatCurrency(cost));
  if (cost < 5) return chalk.yellow(formatCurrency(cost));
  return chalk.red(formatCurrency(cost));
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

// Format model name for display
export function formatModelName(modelId: string): string {
  const modelNames: Record<string, string> = {
    'claude-opus-4-5-20251101': 'Claude Opus 4.5',
    'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
    'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
  };

  return modelNames[modelId] || modelId;
}

// Create a simple horizontal bar chart
export function createBar(value: number, maxValue: number, width: number = 20): string {
  const filled = Math.round((value / maxValue) * width);
  const empty = width - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

// Create a sparkline from an array of numbers
export function createSparkline(values: number[]): string {
  if (values.length === 0) return '';

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  if (range === 0) return '▄'.repeat(values.length);

  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  return values
    .map(value => {
      const normalized = (value - min) / range;
      const index = Math.floor(normalized * (chars.length - 1));
      return chars[index];
    })
    .join('');
}
