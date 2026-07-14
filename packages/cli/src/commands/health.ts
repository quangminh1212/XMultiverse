import { api } from '../client.js';
import { emit, printData, fatal, step, stepDone, stepFail, beginSteps, info } from '../feedback.js';

export async function cmdHealth(): Promise<void> {
  beginSteps(1);
  const s0 = step('Gọi /health endpoint');
  try {
    const status = await api.health();
    stepDone(s0);
    info(`Backend phản hồi: status=${status.status}, demoMode=${status.demoMode}`);
    emit(
      'health',
      true,
      `Backend ${status.status} | Demo mode: ${status.demoMode ? 'BẬT' : 'TẮT'}`,
      status,
      {
        nextSteps: [
          'Tạo thế giới: xmv world create --story "..."',
          'Xem danh sách: xmv world list',
        ],
      },
    );
    printData(status);
  } catch (err: any) {
    stepFail(s0);
    fatal('health', `Backend không phản hồi: ${err.message}`, undefined, {
      missing: ['Backend chưa chạy hoặc không phản hồi'],
      nextSteps: ['Khởi động backend: xmv start', 'Kiểm tra đầy đủ: xmv doctor'],
    });
  }
}
