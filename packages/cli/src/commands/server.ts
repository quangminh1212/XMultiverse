import { spawn, spawnSync } from 'child_process';
import {
  appendFileSync,
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
    return { cmd: process.execPath, args: [BACKEND_DIST], label: 'node dist/index.js' };
  }
  if (existsSync(BACKEND_SRC)) {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    return { cmd: npx, args: ['tsx', BACKEND_SRC], label: 'npx tsx src/index.ts' };
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

/** Escape a string for safe embedding in a PowerShell single-quoted string. */
function escapePsString(s: string): string {
  return s.replace(/'/g, "''");
}

export async function cmdStart(): Promise<void> {
  beginSteps(4);
  ensureDataDir();

  // Step 1: Check if already running (health first, then PID file)
  const s0 = step('Kiểm tra backend đã chạy chưa');

  try {
    const res = await fetch(HEALTH_URL);
    if (res.ok) {
      const health = (await res.json()) as { status: string; demoMode: boolean };
      let pid = 0;
      if (existsSync(PID_FILE)) {
        pid = parseInt(readFileSafe(PID_FILE), 10);
      }
      stepDone(s0);
      info(`Backend đã đang chạy${pid ? ` (PID ${pid})` : ' (không có PID file)'} — health OK`);
      emit('start', true, `Backend đã đang chạy${pid ? ` (PID ${pid})` : ''}.`, {
        pid: pid || undefined,
        alreadyRunning: true,
        health,
      });
      return;
    }
  } catch {
    // Health not responding — backend not running, proceed to start
  }

  // Clean up stale PID file if any
  if (existsSync(PID_FILE)) {
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

  // Truncate log file
  writeFileSync(LOG_FILE, `Backend started with ${launch.label} at ${new Date().toISOString()}\n`);

  let pid: number | undefined;

  if (process.platform === 'win32') {
    // On Windows, use WMI Win32_Process.Create to start a process that breaks
    // away from the parent's job object. npx/tsx create jobs that kill all
    // child processes when they exit. Start-Process and detached spawn do NOT
    // break away from jobs. WMI-created processes run in their own session.
    // Wrap in cmd /c for stdout/stderr redirection to log file.
    const nodeCmd = `cmd /c ""${escapePsString(process.execPath)}" "${escapePsString(BACKEND_DIST)}" > "${escapePsString(LOG_FILE)}" 2>&1"`;
    const psScript = [
      `$proc = Invoke-WmiMethod -Class Win32_Process -Name Create `,
      `-ArgumentList @('${escapePsString(nodeCmd)}', '${escapePsString(BACKEND_DIR)}')`,
      '; if ($proc.ReturnValue -ne 0) { Write-Error "WMI Create failed: $($proc.ReturnValue)"; exit 1 }',
      '; Write-Output $proc.ProcessId',
    ].join('');

    info('Khởi động qua WMI Win32_Process.Create...');
    const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 15000,
    });

    if (result.status !== 0 || !result.stdout.trim()) {
      stepFail(s2);
      try {
        writeFileSync(LOG_FILE, `\nPowerShell error: ${result.stderr}\n`);
      } catch {
        /* ignore */
      }
      fatal('start', `Không thể khởi động backend qua PowerShell. Log: ${LOG_FILE}`, undefined, {
        missing: [`PowerShell exit=${result.status}: ${result.stderr?.slice(0, 200)}`],
        nextSteps: [`Kiểm tra log: type "${LOG_FILE}"`, 'Chạy: xmv doctor để chẩn đoán'],
      });
    }

    pid = parseInt(result.stdout.trim(), 10);
    if (!pid) {
      stepFail(s2);
      fatal('start', 'PowerShell không trả PID hợp lệ.', undefined, {
        missing: [`PowerShell output: ${result.stdout.slice(0, 200)}`],
        nextSteps: [`Kiểm tra log: type "${LOG_FILE}"`],
      });
    }
  } else {
    // On Unix, detached spawn works reliably
    const logStream = createWriteStream(LOG_FILE, { flags: 'a' });
    const child = spawn(launch.cmd, launch.args, {
      cwd: BACKEND_DIR,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);
    child.unref();

    pid = child.pid;
    if (!pid) {
      stepFail(s2);
      logStream.end();
      fatal('start', 'Không thể spawn backend process.', undefined, {
        missing: ['spawn trả pid undefined'],
        nextSteps: ['Chạy: xmv doctor để chẩn đoán', `Kiểm tra log: ${LOG_FILE}`],
      });
    }

    // Close log stream after a delay (let pipes drain)
    setTimeout(() => logStream.end(), 5000);
  }

  writeFileSync(PID_FILE, String(pid));
  info(`Process spawned (PID ${pid})`);

  // Step 4: Wait for boot via health polling
  const s3 = step('Đợi backend health sẵn sàng');
  const boot = await waitForBoot();

  if (!boot.ok) {
    stepFail(s2);
    stepFail(s3);
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

  const s0 = step('Kiểm tra backend đang chạy');

  // Check health first
  let healthOk = false;
  try {
    const res = await fetch(HEALTH_URL);
    healthOk = res.ok;
  } catch {
    // not running
  }

  if (!healthOk && !existsSync(PID_FILE)) {
    stepDone(s0);
    info('Backend không đang chạy (health không phản hồi, không có PID file)');
    emit('stop', true, 'Backend không đang chạy.');
    return;
  }
  stepDone(s0);

  const s1 = step('Dừng backend process');

  // Try PID file first
  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSafe(PID_FILE), 10);
    if (pid) {
      info(`Thử dừng qua PID ${pid}...`);
      try {
        process.kill(pid);
        info(`Đã gửi signal đến PID ${pid}`);
        // Wait a moment for process to die
        await sleep(1000);
        // Verify
        try {
          const res = await fetch(HEALTH_URL);
          if (!res.ok) {
            stepDone(s1);
            info('Backend đã dừng');
            cleanupPidFile();
            emit('stop', true, `Backend đã dừng (PID ${pid}).`, { pid });
            return;
          }
        } catch {
          stepDone(s1);
          info('Backend đã dừng');
          cleanupPidFile();
          emit('stop', true, `Backend đã dừng (PID ${pid}).`, { pid });
          return;
        }
      } catch (err: any) {
        warn(`Không thể kill PID ${pid}: ${err.message}`);
      }
    }
  }

  // If still running, try finding process on port 3001
  if (process.platform === 'win32') {
    info('Thử dừng qua port 3001...');
    try {
      const result = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          '$c = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue; if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }',
        ],
        { encoding: 'utf-8', windowsHide: true, timeout: 10000 },
      );
      if (result.status === 0) {
        await sleep(1000);
        try {
          const res = await fetch(HEALTH_URL);
          if (!res.ok) {
            stepDone(s1);
            info('Backend đã dừng');
            cleanupPidFile();
            emit('stop', true, 'Backend đã dừng (qua port 3001).');
            return;
          }
        } catch {
          stepDone(s1);
          info('Backend đã dừng');
          cleanupPidFile();
          emit('stop', true, 'Backend đã dừng (qua port 3001).');
          return;
        }
      }
    } catch {
      // ignore
    }
  }

  stepFail(s1);
  cleanupPidFile();
  emit('stop', false, 'Không thể dừng backend.', undefined, {
    missing: ['Không thể kill process — có thể cần quyền admin'],
    nextSteps: ['Kiểm tra: xmv status', 'Dừng thủ công: taskkill /F /PID <pid>'],
  });
}

export async function cmdStatus(): Promise<void> {
  beginSteps(1);
  const s0 = step('Kiểm tra backend');

  // Check health first
  try {
    const res = await fetch(HEALTH_URL);
    if (res.ok) {
      const health = (await res.json()) as { status: string; demoMode: boolean };
      let pid = 0;
      if (existsSync(PID_FILE)) {
        pid = parseInt(readFileSafe(PID_FILE), 10);
      }
      stepDone(s0);
      info(`Health OK: demoMode=${health.demoMode}`);
      emit('status', true, `Backend đang chạy${pid ? ` (PID ${pid})` : ''}.`, {
        pid: pid || undefined,
        running: true,
        health,
      });
      return;
    }
  } catch {
    // not running
  }

  stepFail(s0);
  info('Health không phản hồi');
  emit('status', false, 'Backend chưa chạy.', undefined, {
    missing: ['Backend chưa chạy'],
    nextSteps: ['Khởi động: xmv start'],
  });
}

function cleanupPidFile(): void {
  try {
    unlinkSync(PID_FILE);
  } catch {
    /* ignore */
  }
}

function readFileSafe(path: string): string {
  try {
    return readFileSync(path, 'utf-8').trim();
  } catch {
    return '';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
