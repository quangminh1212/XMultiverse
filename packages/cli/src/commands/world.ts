import { api, type World } from '../client.js';
import { emit, printData, fatal } from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdWorldCreate(flags: Record<string, string | boolean>): Promise<void> {
  const story = requireArg(flags, 'story');
  try {
    const world = await api.createWorld(story);
    emit('world-create', true, `Đã tạo thế giới "${world.name}" (ID: ${world.id})`, world);
    printData({
      id: world.id,
      name: world.name,
      description: world.description,
      geography: world.geography,
      factions: world.factions.map((f) => f.name),
      timeline: world.timeline.map((e) => ({
        year: e.year,
        title: e.title,
        important: e.important,
      })),
      characters: world.characters.map((c) => ({ name: c.name, role: c.role })),
      quests: world.quests.map((q) => q.title),
    });
  } catch (err: any) {
    fatal('world-create', err.message);
  }
}

export async function cmdWorldList(): Promise<void> {
  try {
    const worlds = await api.listWorlds();
    emit('world-list', true, `Tìm thấy ${worlds.length} thế giới.`, { count: worlds.length });
    printData(
      worlds.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description.slice(0, 80) + '...',
        createdAt: new Date(w.createdAt).toISOString(),
      })),
    );
  } catch (err: any) {
    fatal('world-list', err.message);
  }
}

export async function cmdWorldGet(flags: Record<string, string | boolean>): Promise<void> {
  const id = requireArg(flags, 'id');
  try {
    const world = await api.getWorld(id);
    emit('world-get', true, `Thế giới: ${world.name}`, world);
    printData({
      id: world.id,
      name: world.name,
      description: world.description,
      geography: world.geography,
      magicSystem: world.magicSystem,
      technologyLevel: world.technologyLevel,
      factions: world.factions,
      timeline: world.timeline,
      characters: world.characters,
      quests: world.quests,
    });
  } catch (err: any) {
    fatal('world-get', err.message);
  }
}
