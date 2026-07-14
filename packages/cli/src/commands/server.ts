import { spawn } from 'child_process';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { emit, fatal, step, stepDone, stepFail, info, warn, beginSteps } from '../feedback.js';

const PID_FILE = join(process.cwd(), 'data', '.xmv-backend.pid');
const LOG_FILE = join(process.cwd(), 'data', 'backend.log');
const BACKEND_DIR = join(process.cwd(), 'packages', 'backend');
const BACKEND_DIST = join(BACKEND_DIR, 'dist', 'index.js');
const BACKEND_SRC = join(BACKEND_DIR, 'src', 'index.ts');
const HEALTH_URL = 'http://localhost:3001/health';
const BOOT_TIMEOUT_MS = 20000;
const BOOT_POLL_INTERVAL_MS = 500;

function ensureDataDir(): void {
  const dir = dirname(PID_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Decide how to launch the backend:
 *  - If dist/index.js exists (build đã chạy): dùng `node dist/index.js` — production, nhanh, ổn định.
 *  - Else nếu src/index.ts tồn tại: dùng `npx tsx src/index.ts` — dev mode.
 *  - Else: lỗi.
 */
function buildLaunchCommand(): { cmd: string; args: string[]; label: string } {
  if (existsSync(BACKEND_DIST)) {
    return { cmd: process.execPath, args: [BACKEND_DIST], label: `node dist/index.js` };
  }
  if (existsSync(BACKEND_SRC)) {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    return { cmd: npx, args: ['tsx', BACKEND_SRC], label: `npx tsx src/index.ts` };
  }
  throw new Error(`Không tìm thấy backend entry point: ${BACKEND_DIST} hoặc ${BACKEND_SRC}`);
}

/** Poll health endpoint until it responds or timeout. */
async function waitForBoot(): Promise<{
  ok: boolean;
  health?: { status: string; demoMode: boolean };
  error?: string;
}> {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) {
        const health = (await res.json()) as { status: string; demoMode: boolean };
        return { ok: true, health };
      }
      lastError = `health trả HTTP ${res.status}`;
    } catch (err: any) {
      lastError = err.message;
    }
    await sleep(BOOT_POLL_INTERVAL_MS);
  }
  return { ok: false, error: lastError };
}

export async function cmdStart(): Promise<void> {
  beginSteps(4);
  ensureDataDir();

  // Step 1: Check if already running (PID file + health)
  const s0 = step('Kiểm tra backend đã chạy chưa');
  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSafe(PID_FILE), 10);
    if (pid && isProcessAlive(pid)) {
      // Verify via health that it's really our backend
      try {
        const res = await fetch(HEALTH_URL);
        if (res.ok) {
          stepDone(s0);
          info(`Backend đã đang chạy (PID ${pid})`);
          emit('start', true, `Backend đã đang chạy (PID ${pid})`, { pid, alreadyRunning: true });
          return;
        }
      } catch {
        // PID alive but health not responding — stale PID, fall through to restart
      }
    }
    info('PID file stale, sẽ khởi động lại...');
    try {
      unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
  }
  stepDone(s0);
  info('Backend chưa chạy, tiến hành khởi động...');

  // Step 2: Check .env exists
  const s1 = step('Kiểm tra file .env');
  const envPaths = [
    join(process.cwd(), 'packages', 'backend', '.env'),
    join(process.cwd(), '.env'),
  ];
  let envFound = false;
  for (const p of envPaths) {
    if (existsSync(p)) {
      envFound = true;
      info(`Tìm thấy .env tại: ${p}`);
      break;
    }
  }
  if (!envFound) {
    stepFail(s1);
    warn('Không tìm thấy file .env — backend sẽ dùng giá trị mặc định');
    warn('Tạo file .env từ: copy .env.example .env');
  } else {
    stepDone(s1);
  }

  // Step 3: Start backend process
  const launch = buildLaunchCommand();
  const s2 = step(`Khởi động backend (${launch.label})`);

  // Truncate log and create write streams for stdout/stderr
  writeFileSync(LOG_FILE, `Backend started with ${launch.label} at ${new Date().toISOString()}\n`);
  const logStream = createWriteStream(LOG_FILE, { flags: 'a' });

  const child = spawn(launch.cmd, launch.args, {
    cwd: BACKEND_DIR,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false,
  });

  // Pipe child stdout/stderr to log file
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  child.unref();

  const pid = child.pid;
  if (!pid) {
    stepFail(s2);
    logStream.end();
    fatal('start', 'Không thể spawn backend process.', undefined, {
      missing: ['spawn trả pid undefined'],
      nextSteps: ['Chạy: xmv doctor để chẩn đoán', `Kiểm tra log: ${LOG_FILE}`],
    });
  }

  writeFileSync(PID_FILE, String(pid));
  info(`Process spawned (PID ${pid})`);

  // Step 4: Wait for boot via health polling
  const s3 = step('Đợi backend health sẵn sàng');
  const boot = await waitForBoot();

  if (!boot.ok) {
    stepFail(s2);
    stepFail(s3);
    logStream.end();
    fatal(
      'start',
      `Backend không health sau ${BOOT_TIMEOUT_MS / 1000}s. Log: ${LOG_FILE}`,
      undefined,
      {
        missing: [`Backend không phản hồi health — last error: ${boot.error}`],
        nextSteps: [
          `Kiểm tra log: type "${LOG_FILE}"`,
          'Kiểm tra port 3001 có bị chiếm không',
          'Chạy: xmv doctor để chẩn đoán đầy đủ',
        ],
      },
    );
  }

  stepDone(s2);
  stepDone(s3);
  info(`Health OK: demoMode=${boot.health!.demoMode}`);
  logStream.end();

  emit(
    'start',
    true,
    `Backend đã khởi động (PID ${pid}, ${launch.label}). Log: ${LOG_FILE}`,
    {
      pid,
      logFile: LOG_FILE,
      launchMode: launch.label,
      health: boot.health,
    },
    {
      nextSteps: ['Tạo thế giới: xmv world create --story "..."', 'Kiểm tra: xmv health'],
    },
  );
}

export async function cmdStop(): Promise<void> {
  beginSteps(2);

  const s0 = step('Kiểm tra PID file');
  if (!existsSync(PID_FILE)) {
    stepDone(s0);
    info('Không tìm thấy PID file — backend không đang chạy');
    emit('stop', true, 'Backend không đang chạy (không tìm thấy PID file).');
    return;
  }
  stepDone(s0);

  const s1 = step('Dừng backend process');
  const pid = parseInt(readFileSafe(PID_FILE), 10);
  if (!pid) {
    stepFail(s1);
    emit('stop', false, 'PID file rỗng hoặc không hợp lệ.', undefined, {
      missing: ['PID file rỗng — xóa thủ công: del data\\.xmv-backend.pid'],
    });
    try {
      unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
    return;
  }

  info(`Đang dừng PID ${pid}...`);
  try {
    killProcessTree(pid);
    stepDone(s1);
    info('Process đã dừng');
    emit('stop', true, `Backend đã dừng (PID ${pid}).`, { pid });
  } catch (err: any) {
    stepFail(s1);
    emit(
      'stop',
      false,
      `Không thể dừng PID ${pid}: ${err.message}`,
      { pid },
      {
        missing: [`Không thể kill PID ${pid} — có thể process đã chết`],
        nextSteps: ['Xóa PID file thủ công: del data\\.xmv-backend.pid'],
      },
    );
  }

  try {
    unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}

export async function cmdStatus(): Promise<void> {
  beginSteps(1);
  const s0 = step('Kiểm tra backend');

  // First check PID file
  let pid = 0;
  if (existsSync(PID_FILE)) {
    pid = parseInt(readFileSafe(PID_FILE), 10);
  }

  // Verify via health endpoint (most reliable — PID could be stale/reused)
  try {
    const res = await fetch(HEALTH_URL);
    if (res.ok) {
      const health = (await res.json()) as { status: string; demoMode: boolean };
      stepDone(s0);
      info(`Backend phản hồi health: status=${health.status}, demoMode=${health.demoMode}`);
      emit('status', true, `Backend đang chạy${pid ? ` (PID ${pid})` : ''}.`, {
        pid: pid || undefined,
        running: true,
        health,
      });
      return;
    }
  } catch {
    // health not responding
  }

  // Health failed — check if PID at least alive
  if (pid && isProcessAlive(pid)) {
    stepDone(s0);
    warn(`PID ${pid} đang sống nhưng health không phản hồi (có thể đang boot hoặc bị treo)`);
    emit(
      'status',
      false,
      `Backend process sống nhưng health không phản hồi (PID ${pid}).`,
      { pid, running: false },
      {
        missing: ['Health không phản hồi — backend có thể đang boot hoặc bị treo'],
        nextSteps: ['Đợi vài giây rồi thử lại: xmv status', 'Restart: xmv stop && xmv start'],
      },
    );
  } else {
    stepFail(s0);
    emit(
      'status',
      false,
      'Backend chưa chạy.',
      { pid: pid || undefined, running: false },
      {
        missing: ['Backend chưa chạy'],
        nextSteps: ['Khởi động: xmv start'],
      },
    );
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

/**
 * Kill a process and its children. On Windows, uses `taskkill /F /T /PID`
 * to force-kill the entire process tree. On other platforms, sends SIGTERM.
 */
function killProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    // /T = kill child processes too, /F = force
    const result = require('child_process').spawnSync(
      'taskkill',
      ['/F', '/T', '/PID', String(pid)],
      {
        stdio: 'ignore',
        windowsHide: true,
      },
    );
    if (result.status !== 0 && isProcessAlive(pid)) {
      // taskkill failed and process still alive — fall back to process.kill
      process.kill(pid);
    }
  } else {
    process.kill(pid, 'SIGTERM');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
