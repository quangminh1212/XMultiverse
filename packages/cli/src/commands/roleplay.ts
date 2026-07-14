import { api, type RoleplayResult } from '../client.js';
import {
  emit,
  printData,
  fatal,
  step,
  stepDone,
  stepFail,
  info,
  warn,
  beginSteps,
} from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdAct(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  const action = requireArg(flags, 'action');

  beginSteps(3);

  const s0 = step('Validate input');
  if (!playerId || !action) {
    stepFail(s0);
    fatal('act', 'Thiếu tham số', undefined, {
      missing: ['Cần: --id <playerId> --action "..."'],
    });
  }
  stepDone(s0);
  info(`Player: ${playerId}`);
  info(`Action: "${action.slice(0, 80)}${action.length > 80 ? '...' : ''}"`);

  const s1 = step('Gửi hành động đến Game Master AI');
  try {
    const result = await api.act(playerId, action);
    stepDone(s1);
    info('AI đã phản hồi');

    const s2 = step('Phân tích kết quả');
    stepDone(s2);
    info(`Scene: ${result.scene.slice(0, 60)}...`);
    if (result.events.length > 0) {
      info(`Events: ${result.events.length} sự kiện mới thêm vào timeline`);
    } else {
      info('Events: không có sự kiện mới');
    }
    info(`Choices: ${result.choices.length} lựa chọn`);

    emit('act', true, `Hành động đã được xử lý.`, result, {
      nextSteps: result.choices.map(
        (c, i) => `Lựa chọn ${i + 1}: xmv act --id ${playerId} --action "${c}"`,
      ),
    });
    printData({
      scene: result.scene,
      events: result.events,
      choices: result.choices,
    });

    if (result.events.length > 0) {
      warn(`${result.events.length} sự kiện mới đã được thêm vào timeline tự động`);
    }
  } catch (err: any) {
    stepFail(s1);
    fatal('act', err.message, undefined, {
      missing: [err.message],
      nextSteps: [
        'Kiểm tra player ID: xmv player list --world <worldId>',
        'Kiểm tra backend: xmv health',
        'Chẩn đoán: xmv doctor',
      ],
    });
  }
}

export async function cmdHistory(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  beginSteps(2);

  const s0 = step(`Lấy lịch sử chat của player ${playerId}`);
  try {
    const history = await api.getHistory(playerId);
    stepDone(s0);
    info(`${history.length} tin nhắn`);

    const s1 = step('Hiển thị');
    stepDone(s1);

    emit(
      'history',
      true,
      `${history.length} tin nhắn trong lịch sử.`,
      { count: history.length },
      {
        nextSteps: [`Tiếp tục nhập vai: xmv act --id ${playerId} --action "..."`],
      },
    );
    printData(history);
  } catch (err: any) {
    stepFail(s0);
    fatal('history', err.message, undefined, {
      missing: ['Không thể lấy lịch sử'],
      nextSteps: ['Kiểm tra player ID', 'Kiểm tra backend: xmv health'],
    });
  }
}
