import { api } from '../client.js';
import { emit, printData, fatal } from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdEventAdd(flags: Record<string, string | boolean>): Promise<void> {
  const worldId = requireArg(flags, 'world');
  const title = requireArg(flags, 'title');
  const description = requireArg(flags, 'desc');
  const year = parseInt((flags.year as string) || '0', 10);
  const important = flags.important === true || flags.important === 'true';

  try {
    const world = await api.addEvent(worldId, { year, title, description, important });
    emit('event-add', true, `Đã thêm sự kiện "${title}" (năm ${year}) vào timeline.`, {
      worldId: world.id,
      event: { year, title, description, important },
      totalEvents: world.timeline.length,
    });
    printData({
      worldId: world.id,
      newEvent: { year, title, description, important },
      timeline: world.timeline,
    });
  } catch (err: any) {
    fatal('event-add', err.message);
  }
}
