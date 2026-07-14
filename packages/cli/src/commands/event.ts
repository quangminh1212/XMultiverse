import { api } from '../client.js';
import { emit, printData, fatal, step, stepDone, stepFail, info, beginSteps } from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdEventAdd(flags: Record<string, string | boolean>): Promise<void> {
  const worldId = requireArg(flags, 'world');
  const title = requireArg(flags, 'title');
  const description = requireArg(flags, 'desc');
  const year = parseInt((flags.year as string) || '0', 10);
  const important = flags.important === true || flags.important === 'true';

  beginSteps(3);

  const s0 = step('Validate input');
  if (!worldId || !title || !description) {
    stepFail(s0);
    fatal('event-add', 'Thiếu tham số', undefined, {
      missing: ['Cần: --world <id> --title "..." --desc "..."'],
    });
  }
  stepDone(s0);
  info(`World: ${worldId} | Year: ${year} | Title: "${title}" | Important: ${important}`);

  const s1 = step('Gửi sự kiện đến API');
  try {
    const world = await api.addEvent(worldId, { year, title, description, important });
    stepDone(s1);
    info(`Đã thêm. Timeline hiện có: ${world.timeline.length} events`);

    const s2 = step('Xác nhận');
    stepDone(s2);

    emit(
      'event-add',
      true,
      `Đã thêm sự kiện "${title}" (năm ${year}) vào timeline.`,
      {
        worldId: world.id,
        event: { year, title, description, important },
        totalEvents: world.timeline.length,
      },
      {
        nextSteps: [
          `Xem timeline: xmv world get --id ${world.id}`,
          `Nhập vai: xmv act --id <playerId> --action "..."`,
        ],
      },
    );
    printData({
      worldId: world.id,
      newEvent: { year, title, description, important },
      timeline: world.timeline,
    });
  } catch (err: any) {
    stepFail(s1);
    fatal('event-add', err.message, undefined, {
      missing: [err.message],
      nextSteps: ['Kiểm tra world ID: xmv world list', 'Kiểm tra backend: xmv health'],
    });
  }
}
