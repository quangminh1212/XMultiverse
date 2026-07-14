import { existsSync, readFileSync, statSync } from 'fs';
import { getLogFilePath } from '../file-logger.js';
import { emit, printData, fatal, step, stepDone, beginSteps, info } from '../feedback.js';

export async function cmdLog(flags: Record<string, string | boolean>): Promise<void> {
  beginSteps(2);
  const logFile = getLogFilePath();
  const lines = parseInt((flags.lines as string) || '50', 10);

  const s0 = step(`Kiểm tra log file: ${logFile}`);
  if (!existsSync(logFile)) {
    stepDone(s0);
    info('Log file chưa tồn tại (chưa có log nào được ghi)');
    emit(
      'log',
      true,
      'Log file chưa tồn tại.',
      { path: logFile, exists: false },
      {
        nextSteps: [
          'Chạy lệnh bất kỳ (vd: xmv health) để tạo log',
          `Log sẽ được ghi tại: ${logFile}`,
        ],
      },
    );
    return;
  }
  stepDone(s0);

  const s1 = step(`Đọc ${lines} dòng cuối`);
  try {
    const stat = statSync(logFile);
    const content = readFileSync(logFile, 'utf-8');
    const allLines = content.split('\n').filter((l) => l.length > 0);
    const recent = allLines.slice(-lines);

    stepDone(s1);
    info(
      `File size: ${(stat.size / 1024).toFixed(1)} KB | Total lines: ${allLines.length} | Showing: ${recent.length}`,
    );

    emit(
      'log',
      true,
      `Log file: ${logFile} (${(stat.size / 1024).toFixed(1)} KB)`,
      {
        path: logFile,
        sizeBytes: stat.size,
        sizeKB: Math.round((stat.size / 1024) * 10) / 10,
        totalLines: allLines.length,
        showing: recent.length,
      },
      {
        nextSteps: [`Xem thêm: xmv log --lines 100`, `Log file: ${logFile}`],
      },
    );
    printData(recent.join('\n'));
  } catch (err: any) {
    stepDone(s1);
    fatal('log', `Không thể đọc log file: ${err.message}`);
  }
}
