// Cross-platform path resolution for Windows and Unix-like systems

import os from 'os';
import path from 'path';

export function resolveClaudePath(claudePath: string): string {
  // Handle Windows-specific paths
  if (process.platform === 'win32') {
    // Expand ~ to USERPROFILE
    if (claudePath.startsWith('~/') || claudePath.startsWith('~\\')) {
      const userProfile = process.env.USERPROFILE || os.homedir();
      return path.join(userProfile, claudePath.slice(2));
    }

    // Convert forward slashes to backslashes
    return path.normalize(claudePath);
  }

  // Unix-like systems
  if (claudePath.startsWith('~/')) {
    return path.join(os.homedir(), claudePath.slice(2));
  }

  return claudePath;
}

export function getClaudeDirectory(): string {
  const homeDir = process.env.USERPROFILE || os.homedir();
  return path.join(homeDir, '.claude');
}

export function getStatsCachePath(): string {
  return path.join(getClaudeDirectory(), 'stats-cache.json');
}

export function getConfigPath(): string {
  const homeDir = process.env.USERPROFILE || os.homedir();
  return path.join(homeDir, '.claude.json');
}

export function getHistoryPath(): string {
  return path.join(getClaudeDirectory(), 'history.jsonl');
}

export function normalizeProjectPath(projectPath: string): string {
  // Normalize project paths for consistent comparison
  // Converts backslashes to forward slashes and removes trailing slashes
  return projectPath
    .replace(/\\/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
}

export function getProjectName(projectPath: string): string {
  // Extract project name from path
  // e.g., "C:/snaptrude/codebase/snapai" -> "snapai"
  const normalized = projectPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(p => p.length > 0);
  return parts[parts.length - 1] || 'unknown';
}
