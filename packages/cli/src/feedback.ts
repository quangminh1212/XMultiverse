/**
 * Feedback helpers — all output goes through here so we can toggle
 * between human-readable text and machine-readable JSON.
 *
 * All feedback is also written to the log file at AppData/XMultiverse/log.txt
 * (auto-rotates when >100MB).
 *
 * Logging layers (all go to stderr in JSON mode, so stdout stays clean
 * for the final JSON result):
 *   step()   — progress steps:  "[1/3] Đang tạo thế giới..."
 *   info()   — informational:   "→ Demo mode đang BẬT, sẽ dùng template"
 *   warn()   — warnings:        "⚠ Chưa có AI_API_KEY, dùng demo mode"
 *   missing()— missing prereq:  "THIẾU: AI_API_KEY — thêm vào .env"
 *   emit()   — final result:    { ok, command, message, data, steps, timestamp }
 */

import { fileLog, getLogFilePath, type LogLevel } from './file-logger.js';

export type OutputMode = 'text' | 'json';

export interface Step {
  index: number;
  total: number;
  label: string;
  status: 'pending' | 'done' | 'fail';
}

export interface ChecklistItem {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

export interface Feedback {
  ok: boolean;
  command: string;
  message: string;
  data?: unknown;
  steps: Step[];
  checklist?: ChecklistItem[];
  missing?: string[];
  nextSteps?: string[];
  timestamp: string;
}

let currentMode: OutputMode = 'text';
let verbose = false;
let steps: Step[] = [];
let stepTotal = 0;
let currentCommand = 'cli';

export function setMode(mode: OutputMode): void {
  currentMode = mode;
}

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function isVerbose(): boolean {
  return verbose;
}

export function isJson(): boolean {
  return currentMode === 'json';
}

export function setCommand(cmd: string): void {
  currentCommand = cmd;
}

/** Start a multi-step process. */
export function beginSteps(total: number): void {
  steps = [];
  stepTotal = total;
}

/** Log a progress step. Returns the step index for later update. */
export function step(label: string): number {
  const index = steps.length + 1;
  const s: Step = { index, total: stepTotal || index, label, status: 'pending' };
  steps.push(s);

  const logMsg = `[${index}/${stepTotal}] ${label}`;
  fileLog('INFO', currentCommand, logMsg);

  if (currentMode === 'json') {
    process.stderr.write(`[step ${index}/${stepTotal}] ${label}...\n`);
  } else {
    console.log(`[${index}/${stepTotal || '?'}] ${label}...`);
  }
  return steps.length - 1;
}

/** Mark a step as done. */
export function stepDone(idx: number): void {
  if (steps[idx]) {
    steps[idx].status = 'done';
    fileLog(
      'INFO',
      currentCommand,
      `Step ${steps[idx].index}/${steps[idx].total} DONE: ${steps[idx].label}`,
    );
  }
}

/** Mark a step as failed. */
export function stepFail(idx: number): void {
  if (steps[idx]) {
    steps[idx].status = 'fail';
    fileLog(
      'ERROR',
      currentCommand,
      `Step ${steps[idx].index}/${steps[idx].total} FAIL: ${steps[idx].label}`,
    );
  }
}

/** Informational message (goes to stderr in JSON mode). */
export function info(message: string): void {
  fileLog('INFO', currentCommand, message);
  if (currentMode === 'json') {
    process.stderr.write(`[info] ${message}\n`);
  } else {
    console.log(`  → ${message}`);
  }
}

/** Warning message. */
export function warn(message: string): void {
  fileLog('WARN', currentCommand, message);
  if (currentMode === 'json') {
    process.stderr.write(`[warn] ${message}\n`);
  } else {
    console.log(`  ⚠ ${message}`);
  }
}

/** Missing prerequisite — tells the agent exactly what's missing and how to fix. */
export function missing(what: string, fix: string): void {
  fileLog('WARN', currentCommand, `MISSING: ${what} — FIX: ${fix}`);
  if (currentMode === 'json') {
    process.stderr.write(`[MISSING] ${what} — FIX: ${fix}\n`);
  } else {
    console.log(`  ✗ THIẾU: ${what}`);
    console.log(`    → Cách sửa: ${fix}`);
  }
}

/** Emit the final result. */
export function emit(
  command: string,
  ok: boolean,
  message: string,
  data?: unknown,
  extra?: { checklist?: ChecklistItem[]; missing?: string[]; nextSteps?: string[] },
): void {
  const feedback: Feedback = {
    ok,
    command,
    message,
    data,
    steps,
    checklist: extra?.checklist,
    missing: extra?.missing,
    nextSteps: extra?.nextSteps,
    timestamp: new Date().toISOString(),
  };

  // Log final result to file
  const level: LogLevel = ok ? 'INFO' : 'ERROR';
  fileLog(level, command, `${ok ? 'OK' : 'FAIL'}: ${message}`);

  if (currentMode === 'json') {
    console.log(JSON.stringify(feedback, null, 2));
  } else {
    const icon = ok ? '[OK]' : '[FAIL]';
    console.log(`\n${icon} ${message}`);

    // Show checklist if provided
    if (extra?.checklist && extra.checklist.length > 0) {
      console.log('\n  Checklist:');
      for (const item of extra.checklist) {
        console.log(`    ${item.ok ? '✓' : '✗'} ${item.name}: ${item.detail}`);
        if (!item.ok && item.fix) {
          console.log(`      → Fix: ${item.fix}`);
        }
      }
    }

    // Show missing items
    if (extra?.missing && extra.missing.length > 0) {
      console.log('\n  Đang thiếu:');
      extra.missing.forEach((m) => console.log(`    ✗ ${m}`));
    }

    // Show next steps
    if (extra?.nextSteps && extra.nextSteps.length > 0) {
      console.log('\n  Bước tiếp theo:');
      extra.nextSteps.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
    }

    if (verbose && data !== undefined) {
      console.log('\n  Data:');
      console.log(JSON.stringify(data, null, 2));
    }
  }

  // Reset steps for next command
  steps = [];
  stepTotal = 0;
}

/** Print data in a readable way (used by list/get commands). */
export function printData(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/** Print an error and exit. */
export function fatal(
  command: string,
  message: string,
  data?: unknown,
  extra?: { checklist?: ChecklistItem[]; missing?: string[]; nextSteps?: string[] },
): never {
  emit(command, false, message, data, extra);
  process.exit(1);
}

/** Get the log file path (for display). */
export function getLogFile(): string {
  return getLogFilePath();
}
