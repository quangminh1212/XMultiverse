import { exec, spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { emit, fatal } from '../feedback.js';

const PID_FILE = join(process.cwd(), 'data', '.xmv-backend.pid');
const LOG_FILE = join(process.cwd(), 'data', 'backend.log');

function ensureDataDir(): void {
  const dir = dirname(PID_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export async function cmdStart(): Promise<void> {
  ensureDataDir();

  // Check if already running
  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSafe(PID_FILE), 10);
    if (pid && isProcessAlive(pid)) {
      emit('start', true, `Backend đã đang chạy (PID ${pid})`);
      return;
    }
  }

  // Start backend in background
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', 'src/index.ts'], {
    cwd: join(process.cwd(), 'packages', 'backend'),
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
    shell: true,
    windowsHide: true,
  });

  child.unref();

  writeFileSync(PID_FILE, String(child.pid));
  writeFileSync(LOG_FILE, `Backend started with PID ${child.pid} at ${new Date().toISOString()}\n`);

  // Wait a moment for server to boot
  await sleep(3000);

  // Verify
  if (isProcessAlive(child.pid!)) {
    emit('start', true, `Backend đã khởi động (PID ${child.pid}). Log: ${LOG_FILE}`);
  } else {
    fatal('start', 'Backend khởi động nhưng đã thoát ngay. Kiểm tra log: ' + LOG_FILE);
  }
}

export async function cmdStop(): Promise<void> {
  if (!existsSync(PID_FILE)) {
    emit('stop', true, 'Backend không đang chạy (không tìm thấy PID file).');
    return;
  }

  const pid = parseInt(readFileSafe(PID_FILE), 10);
  if (!pid) {
    emit('stop', false, 'PID file rỗng hoặc không hợp lệ.');
    return;
  }

  try {
    process.kill(pid);
    emit('stop', true, `Backend đã dừng (PID ${pid}).`);
  } catch (err: any) {
    emit('stop', false, `Không thể dừng PID ${pid}: ${err.message}`);
  }

  // Clean up PID file
  try {
    unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}

export async function cmdStatus(): Promise<void> {
  if (!existsSync(PID_FILE)) {
    emit('status', false, 'Backend chưa chạy. Dùng "xmv start" để khởi động.');
    return;
  }

  const pid = parseInt(readFileSafe(PID_FILE), 10);
  if (pid && isProcessAlive(pid)) {
    emit('status', true, `Backend đang chạy (PID ${pid}).`);
  } else {
    emit('status', false, 'Backend đã dừng (PID không còn sống).');
  }
}

function readFileSafe(path: string): string {
  try {
    return readFileSync(path, 'utf-8').trim();
  } catch {
    return '';
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
