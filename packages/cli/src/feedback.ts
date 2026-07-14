/**
 * Feedback helpers — all output goes through here so we can toggle
 * between human-readable text and machine-readable JSON.
 */

export type OutputMode = 'text' | 'json';

export interface Feedback {
  ok: boolean;
  command: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

let currentMode: OutputMode = 'text';
let verbose = false;

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

export function emit(command: string, ok: boolean, message: string, data?: unknown): void {
  const feedback: Feedback = {
    ok,
    command,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (currentMode === 'json') {
    console.log(JSON.stringify(feedback, null, 2));
  } else {
    const icon = ok ? '[OK]' : '[FAIL]';
    console.log(`${icon} ${message}`);
    if (verbose && data !== undefined) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/** Print data in a readable way (used by list/get commands). */
export function printData(data: unknown): void {
  if (currentMode === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/** Print an error and exit. */
export function fatal(command: string, message: string, data?: unknown): never {
  emit(command, false, message, data);
  process.exit(1);
}
