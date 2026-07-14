import { appendFileSync, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

/**
 * File logger — writes structured logs to AppData/Local/XMultiverse/log.txt
 * Auto-rotates (deletes) when the file exceeds 100MB.
 */

const MAX_LOG_SIZE = 100 * 1024 * 1024; // 100 MB

function getLogDir(): string {
  const platform = process.platform;
  let base: string;
  if (platform === 'win32') {
    base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
  } else if (platform === 'darwin') {
    base = join(homedir(), 'Library', 'Logs');
  } else {
    base = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
  }
  return join(base, 'XMultiverse');
}

const LOG_DIR = getLogDir();
const LOG_FILE = join(LOG_DIR, 'log.txt');

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

function shouldRotate(): boolean {
  if (!existsSync(LOG_FILE)) return false;
  try {
    const stat = statSync(LOG_FILE);
    return stat.size >= MAX_LOG_SIZE;
  } catch {
    return false;
  }
}

function rotateIfNeeded(): void {
  if (shouldRotate()) {
    try {
      unlinkSync(LOG_FILE);
    } catch {
      // ignore — file might be locked
    }
  }
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatLine(level: LogLevel, scope: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] [${scope}] ${message}\n`;
}

/**
 * Append a log line to the log file.
 * Also mirrors to console if `consoleMirror` is true.
 */
export function log(level: LogLevel, scope: string, message: string, consoleMirror = false): void {
  ensureLogDir();
  rotateIfNeeded();

  const line = formatLine(level, scope, message);
  try {
    appendFileSync(LOG_FILE, line, 'utf-8');
  } catch {
    // If file is locked, try writing fresh
    try {
      writeFileSync(LOG_FILE, line, 'utf-8');
    } catch {
      // give up silently — logging must never crash the app
    }
  }

  if (consoleMirror) {
    if (level === 'ERROR') {
      process.stderr.write(message + '\n');
    } else {
      process.stdout.write(message + '\n');
    }
  }
}

export function info(scope: string, message: string, consoleMirror = false): void {
  log('INFO', scope, message, consoleMirror);
}

export function warn(scope: string, message: string, consoleMirror = false): void {
  log('WARN', scope, message, consoleMirror);
}

export function error(scope: string, message: string, consoleMirror = false): void {
  log('ERROR', scope, message, consoleMirror);
}

export function debug(scope: string, message: string, consoleMirror = false): void {
  if (process.env.XMV_DEBUG === 'true') {
    log('DEBUG', scope, message, consoleMirror);
  }
}

/** Get the current log file path (for display/debug purposes). */
export function getLogFilePath(): string {
  return LOG_FILE;
}

/** Get the log directory path. */
export function getLogDirPath(): string {
  return LOG_DIR;
}

/** Read the last N lines from the log file. */
export function getRecentLogs(lines = 50): string {
  if (!existsSync(LOG_FILE)) return '(no log file)';
  try {
    const content = readFileSyncSafe(LOG_FILE);
    const allLines = content.split('\n').filter((l) => l.length > 0);
    return allLines.slice(-lines).join('\n');
  } catch {
    return '(cannot read log file)';
  }
}

function readFileSyncSafe(path: string): string {
  try {
    return require('fs').readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
}
