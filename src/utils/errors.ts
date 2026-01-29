// Error handling classes

export class ClaudeTrackerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ClaudeTrackerError';
  }
}

export class FileNotFoundError extends ClaudeTrackerError {
  constructor(filePath: string) {
    super(
      `Claude file not found: ${filePath}\n` +
      `Make sure Claude Code is installed and has been run at least once.`,
      'FILE_NOT_FOUND'
    );
  }
}

export class CorruptedFileError extends ClaudeTrackerError {
  constructor(filePath: string, parseError: Error) {
    super(
      `Corrupted Claude file: ${filePath}\n` +
      `Parse error: ${parseError.message}\n` +
      `Try running Claude Code again to regenerate the file.`,
      'CORRUPTED_FILE'
    );
  }
}

export class IncompatibleVersionError extends ClaudeTrackerError {
  constructor(expectedVersion: number, foundVersion: number) {
    super(
      `Incompatible stats-cache version: expected ${expectedVersion}, found ${foundVersion}\n` +
      `Update claude-tracker to support this version.`,
      'INCOMPATIBLE_VERSION'
    );
  }
}

export class NoDataError extends ClaudeTrackerError {
  constructor() {
    super(
      'No Claude Code data found. Make sure Claude Code is installed and has been used at least once.',
      'NO_DATA'
    );
  }
}
