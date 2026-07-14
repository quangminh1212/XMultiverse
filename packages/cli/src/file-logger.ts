import { appendFileSync, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

/**
 * CLI file logger — writes to AppData/Local/XMultiverse/log.txt
 * Same file as backend, so all logs are in one place.
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
      // ignore
    }
  }
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatLine(level: LogLevel, scope: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] [${scope}] ${message}\n`;
}

export function fileLog(level: LogLevel, scope: string, message: string): void {
  ensureLogDir();
  rotateIfNeeded();
  const line = formatLine(level, scope, message);
  try {
    appendFileSync(LOG_FILE, line, 'utf-8');
  } catch {
    try {
      writeFileSync(LOG_FILE, line, 'utf-8');
    } catch {
      // give up silently
    }
  }
}

export function getLogFilePath(): string {
  return LOG_FILE;
}

export function getLogDirPath(): string {
  return LOG_DIR;
}
