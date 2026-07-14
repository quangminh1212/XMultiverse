import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { api } from '../client.js';
import {
  emit,
  step,
  stepDone,
  stepFail,
  info,
  warn,
  missing,
  beginSteps,
  type ChecklistItem,
} from '../feedback.js';

interface EnvInfo {
  hasEnvFile: boolean;
  hasApiKey: boolean;
  apiKeyValue: string;
  baseUrl: string;
  model: string;
  demoMode: boolean;
  port: string;
  dbPath: string;
}

function loadEnvInfo(): EnvInfo {
  const envPaths = [
    join(process.cwd(), '.env'),
    join(process.cwd(), 'packages', 'backend', '.env'),
  ];

  let envContent = '';
  let hasEnvFile = false;
  for (const p of envPaths) {
    if (existsSync(p)) {
      envContent = readFileSync(p, 'utf-8');
      hasEnvFile = true;
      break;
    }
  }

  function getEnv(key: string): string {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
  }

  const apiKey = getEnv('AI_API_KEY');
  return {
    hasEnvFile,
    hasApiKey: apiKey !== '' && apiKey !== 'your_api_key_here',
    apiKeyValue: apiKey,
    baseUrl: getEnv('AI_BASE_URL') || 'https://api.openai.com/v1',
    model: getEnv('AI_MODEL') || 'gpt-4o-mini',
    demoMode: getEnv('DEMO_MODE').toLowerCase() === 'true',
    port: getEnv('PORT') || '3001',
    dbPath: getEnv('DB_PATH') || './data/worlds.db',
  };
}

export async function cmdDoctor(): Promise<void> {
  beginSteps(5);
  const checklist: ChecklistItem[] = [];
  const missingItems: string[] = [];
  const nextSteps: string[] = [];

  // Step 1: Check .env file
  const s0 = step('Kiểm tra file .env');
  const env = loadEnvInfo();
  if (env.hasEnvFile) {
    stepDone(s0);
    checklist.push({
      name: 'File .env',
      ok: true,
      detail: 'Đã tìm thấy file .env',
    });
    info(`File .env: OK`);
  } else {
    stepFail(s0);
    checklist.push({
      name: 'File .env',
      ok: false,
      detail: 'Không tìm thấy file .env',
      fix: 'Chạy: cp .env.example .env',
    });
    missingItems.push('File .env — chạy: cp .env.example .env');
  }

  // Step 2: Check AI_API_KEY
  const s1 = step('Kiểm tra AI_API_KEY');
  if (env.hasApiKey) {
    stepDone(s1);
    checklist.push({
      name: 'AI_API_KEY',
      ok: true,
      detail: `Đã cấu hình (model: ${env.model}, base: ${env.baseUrl})`,
    });
    info(`AI_API_KEY: OK (model=${env.model})`);
  } else {
    stepFail(s1);
    checklist.push({
      name: 'AI_API_KEY',
      ok: false,
      detail: 'Chưa có key thật (giá trị mặc định hoặc rỗng)',
      fix: 'Thêm AI_API_KEY=sk-... vào file .env. Hoặc set DEMO_MODE=true để test không cần key.',
    });
    missingItems.push('AI_API_KEY — thêm key thật vào .env, hoặc set DEMO_MODE=true');
  }

  // Step 3: Check demo mode
  const s2 = step('Kiểm tra DEMO_MODE');
  stepDone(s2);
  if (env.demoMode) {
    checklist.push({
      name: 'DEMO_MODE',
      ok: true,
      detail: 'BẬT — sẽ dùng template world, không gọi AI',
    });
    warn('DEMO_MODE đang BẬT — thế giới sẽ dùng template, không phải AI thật');
  } else {
    checklist.push({
      name: 'DEMO_MODE',
      ok: true,
      detail: 'TẮT — sẽ gọi AI thật (cần AI_API_KEY hợp lệ)',
    });
    if (!env.hasApiKey) {
      missingItems.push(
        'DEMO_MODE=false nhưng không có AI_API_KEY — backend sẽ báo lỗi khi tạo world',
      );
    }
  }

  // Step 4: Check backend running
  const s3 = step('Kiểm tra backend đang chạy');
  let backendOk = false;
  let backendDemoMode = false;
  try {
    const health = await api.health();
    stepDone(s3);
    backendOk = true;
    backendDemoMode = health.demoMode;
    checklist.push({
      name: 'Backend',
      ok: true,
      detail: `Đang chạy (port ${env.port}, demo=${health.demoMode})`,
    });
    info(`Backend: OK (demo=${health.demoMode})`);
  } catch {
    stepFail(s3);
    checklist.push({
      name: 'Backend',
      ok: false,
      detail: 'Không phản hồi tại http://localhost:' + env.port,
      fix: 'Chạy: xmv start',
    });
    missingItems.push(`Backend chưa chạy — chạy: xmv start`);
  }

  // Step 5: Check dependencies
  const s4 = step('Kiểm tra node_modules');
  const nodeModulesExists = existsSync(join(process.cwd(), 'node_modules'));
  if (nodeModulesExists) {
    stepDone(s4);
    checklist.push({
      name: 'Dependencies',
      ok: true,
      detail: 'node_modules đã cài',
    });
  } else {
    stepFail(s4);
    checklist.push({
      name: 'Dependencies',
      ok: false,
      detail: 'node_modules chưa cài',
      fix: 'Chạy: npm install',
    });
    missingItems.push('node_modules — chạy: npm install');
  }

  // Determine next steps
  if (!nodeModulesExists) {
    nextSteps.push('Chạy: npm install (cài dependencies)');
  }
  if (!env.hasEnvFile) {
    nextSteps.push('Chạy: cp .env.example .env (tạo file cấu hình)');
  }
  if (!env.hasApiKey && !env.demoMode) {
    nextSteps.push('Thêm AI_API_KEY vào .env HOẶC set DEMO_MODE=true');
  }
  if (!backendOk) {
    nextSteps.push('Chạy: xmv start (khởi động backend)');
  }
  if (backendOk && env.hasApiKey && !env.demoMode) {
    nextSteps.push('Sẵn sàng! Chạy: xmv world create --story "cốt truyện của bạn"');
  }
  if (backendOk && env.demoMode) {
    nextSteps.push('Sẵn sàng (demo)! Chạy: xmv world create --story "cốt truyện của bạn"');
  }

  const allOk = checklist.every((c) => c.ok);
  const ready = nodeModulesExists && env.hasEnvFile && backendOk && (env.hasApiKey || env.demoMode);

  const message = ready
    ? 'Tất cả kiểm tra đạt. Sẵn sàng sử dụng!'
    : `Phát hiện ${missingItems.length} vấn đề cần xử lý.`;

  emit(
    'doctor',
    ready,
    message,
    {
      ready,
      env: {
        hasEnvFile: env.hasEnvFile,
        hasApiKey: env.hasApiKey,
        model: env.model,
        baseUrl: env.baseUrl,
        demoMode: env.demoMode,
        port: env.port,
      },
      backend: { running: backendOk, demoMode: backendDemoMode },
      dependencies: { installed: nodeModulesExists },
    },
    {
      checklist,
      missing: missingItems.length > 0 ? missingItems : undefined,
      nextSteps: nextSteps.length > 0 ? nextSteps : undefined,
    },
  );
}
