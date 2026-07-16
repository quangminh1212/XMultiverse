import { writeFileSync, readFileSync } from 'fs';
import { api, type World } from '../client.js';
import { emit, printData, fatal, step, stepDone, stepFail, info, beginSteps } from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdWorldCreate(flags: Record<string, string | boolean>): Promise<void> {
  const story = requireArg(flags, 'story');
  const sourceType =
    typeof flags['source'] === 'string'
      ? flags['source']
      : typeof flags['type'] === 'string'
        ? flags['type']
        : 'story';
  const scale = typeof flags['scale'] === 'string' ? flags['scale'] : 'standard';
  beginSteps(3);

  const s0 = step('Validate input');
  if (story.length < 5) {
    stepFail(s0);
    fatal('world-create', 'Cốt truyện quá ngắn (cần ít nhất 5 ký tự)', undefined, {
      missing: ['--story cần nội dung dài hơn'],
    });
  }
  stepDone(s0);
  info(
    `Scale: ${scale} | Source: ${sourceType} | Story: "${story.slice(0, 60)}${story.length > 60 ? '...' : ''}" (${story.length} ký tự)`,
  );

  const s1 = step('Gọi AI tạo thế giới mở');
  try {
    const world = await api.createWorld(story, sourceType, scale);
    stepDone(s1);
    info(`AI đã trả về thế giới: "${world.name}"`);

    const s2 = step('Phân tích kết quả');
    stepDone(s2);
    info(
      `Locations: ${world.locations?.length || 0} | Timeline: ${world.timeline.length} | Characters: ${world.characters.length} | Quests: ${world.quests.length}`,
    );

    emit('world-create', true, `Đã tạo thế giới "${world.name}" (ID: ${world.id})`, world, {
      nextSteps: [
        `Tạo nhân vật: xmv player create --world ${world.id} --name "..." --role "..."`,
        `Xem chi tiết: xmv world get --id ${world.id}`,
        `Du hành: xmv travel --id <playerId> --to "<location name|id>"`,
      ],
    });
    printData({
      id: world.id,
      name: world.name,
      description: world.description,
      sourceType: world.sourceType || sourceType,
      geography: world.geography,
      locations: (world.locations || []).map((l) => ({
        id: l.id,
        name: l.name,
        connections: l.connections,
      })),
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
    stepFail(s1);
    fatal('world-create', err.message, undefined, {
      missing: [err.message],
      nextSteps: [
        'Kiểm tra backend: xmv health',
        'Kiểm tra AI_API_KEY: xmv doctor',
        'Nếu chưa có key, set DEMO_MODE=true trong .env',
      ],
    });
  }
}

export async function cmdWorldList(): Promise<void> {
  beginSteps(2);
  const s0 = step('Gọi API lấy danh sách thế giới');
  try {
    const worlds = await api.listWorlds();
    stepDone(s0);
    info(`Nhận được ${worlds.length} thế giới`);

    const s1 = step('Hiển thị kết quả');
    stepDone(s1);

    emit(
      'world-list',
      true,
      `Tìm thấy ${worlds.length} thế giới.`,
      { count: worlds.length },
      {
        nextSteps:
          worlds.length > 0
            ? [
                `Xem chi tiết: xmv world get --id <worldId>`,
                `Tạo nhân vật: xmv player create --world <id> --name "..." --role "..."`,
              ]
            : ['Tạo thế giới mới: xmv world create --story "..."'],
      },
    );
    printData(
      worlds.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description.slice(0, 80) + '...',
        createdAt: new Date(w.createdAt).toISOString(),
      })),
    );
  } catch (err: any) {
    stepFail(s0);
    fatal('world-list', err.message, undefined, {
      missing: ['Không thể kết nối backend'],
      nextSteps: ['Khởi động backend: xmv start', 'Chẩn đoán: xmv doctor'],
    });
  }
}

export async function cmdWorldGet(flags: Record<string, string | boolean>): Promise<void> {
  const id = requireArg(flags, 'id');
  beginSteps(2);

  const s0 = step(`Lấy thế giới ID: ${id}`);
  try {
    const world = await api.getWorld(id);
    stepDone(s0);
    info(`Thế giới: "${world.name}"`);

    const s1 = step('Phân tích chi tiết');
    stepDone(s1);
    info(
      `Factions: ${world.factions.length} | Timeline: ${world.timeline.length} | Characters: ${world.characters.length} | Quests: ${world.quests.length}`,
    );

    emit('world-get', true, `Thế giới: ${world.name}`, world, {
      nextSteps: [
        `Tạo nhân vật: xmv player create --world ${world.id} --name "..." --role "..."`,
        `Thêm sự kiện: xmv event add --world ${world.id} --title "..." --desc "..."`,
      ],
    });
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
    stepFail(s0);
    fatal('world-get', err.message, undefined, {
      missing: [`Không tìm thấy thế giới ID: ${id}`],
      nextSteps: ['Xem danh sách: xmv world list', 'Tạo mới: xmv world create --story "..."'],
    });
  }
}

/** xmv world export --id <worldId> [--out pack.json] */
export async function cmdWorldExport(flags: Record<string, string | boolean>): Promise<void> {
  const id = requireArg(flags, 'id');
  const out =
    typeof flags.out === 'string'
      ? flags.out
      : typeof flags.file === 'string'
        ? flags.file
        : `world-${id.slice(0, 8)}.xmv.json`;
  beginSteps(2);
  const s0 = step('Export world pack');
  try {
    const pack = await api.exportWorld(id);
    stepDone(s0);
    writeFileSync(out, JSON.stringify(pack, null, 2), 'utf8');
    const s1 = step(`Ghi file ${out}`);
    stepDone(s1);
    emit(
      'world-export',
      true,
      `Đã export "${pack.world.name}" → ${out}`,
      { file: out, id },
      {
        nextSteps: [`Import: xmv world import --file ${out}`],
      },
    );
    printData({ file: out, worldId: pack.world.id, name: pack.world.name });
  } catch (err: any) {
    stepFail(s0);
    fatal('world-export', err.message);
  }
}

/** xmv world import --file pack.json */
export async function cmdWorldImport(flags: Record<string, string | boolean>): Promise<void> {
  const file = requireArg(flags, 'file');
  beginSteps(2);
  const s0 = step(`Đọc ${file}`);
  try {
    const raw = readFileSync(file, 'utf8');
    const pack = JSON.parse(raw);
    stepDone(s0);
    const s1 = step('Import world pack');
    const world = await api.importWorld(pack);
    stepDone(s1);
    emit('world-import', true, `Đã import "${world.name}" (ID: ${world.id})`, world, {
      nextSteps: [
        `Tạo NV: xmv player create --world ${world.id} --name "..." --role "..."`,
        `Xem: xmv world get --id ${world.id}`,
      ],
    });
    printData({ id: world.id, name: world.name, locations: world.locations?.length || 0 });
  } catch (err: any) {
    stepFail(s0);
    fatal('world-import', err.message, undefined, {
      nextSteps: ['Kiểm tra file JSON format xmultiverse-world-v1'],
    });
  }
}
