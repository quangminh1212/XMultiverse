import { api, type RoleplayResult } from '../client.js';
import { emit, printData, fatal } from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdAct(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  const action = requireArg(flags, 'action');

  try {
    const result = await api.act(playerId, action);
    emit('act', true, `Hành động đã được xử lý.`, result);
    printData({
      scene: result.scene,
      events: result.events,
      choices: result.choices,
    });

    if (result.events.length > 0) {
      console.error(`\n[EVENTS] ${result.events.length} sự kiện mới đã được thêm vào timeline.`);
    }
    if (result.choices.length > 0) {
      console.error(`\n[CHOICES] Lựa chọn tiếp theo:`);
      result.choices.forEach((c, i) => console.error(`  ${i + 1}. ${c}`));
    }
  } catch (err: any) {
    fatal('act', err.message);
  }
}

export async function cmdHistory(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  try {
    const history = await api.getHistory(playerId);
    emit('history', true, `${history.length} tin nhắn trong lịch sử.`, { count: history.length });
    printData(history);
  } catch (err: any) {
    fatal('history', err.message);
  }
}
