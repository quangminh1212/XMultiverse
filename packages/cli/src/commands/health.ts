import { api } from '../client.js';
import { emit, printData, fatal } from '../feedback.js';

export async function cmdHealth(): Promise<void> {
  try {
    const status = await api.health();
    emit(
      'health',
      true,
      `Backend ${status.status} | Demo mode: ${status.demoMode ? 'BẬT' : 'TẮT'}`,
      status,
    );
    printData(status);
  } catch (err: any) {
    fatal(
      'health',
      `Backend không phản hồi: ${err.message}. Có thể server chưa chạy. Dùng "xmv start" để khởi động.`,
    );
  }
}
