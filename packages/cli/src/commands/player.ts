import { api, type Player } from '../client.js';
import { emit, printData, fatal, step, stepDone, stepFail, info, beginSteps } from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdPlayerCreate(flags: Record<string, string | boolean>): Promise<void> {
  const worldId = requireArg(flags, 'world');
  const name = requireArg(flags, 'name');
  const role = requireArg(flags, 'role');
  const backstory = (flags.backstory as string) || '';
  const faction = (flags.faction as string) || '';

  beginSteps(3);

  const s0 = step('Validate input');
  if (!worldId || !name || !role) {
    stepFail(s0);
    fatal('player-create', 'Thiếu tham số bắt buộc', undefined, {
      missing: ['Cần: --world <id> --name "..." --role "..."'],
    });
  }
  stepDone(s0);
  info(
    `World: ${worldId} | Name: "${name}" | Role: "${role}"${faction ? ` | Faction: "${faction}"` : ''}`,
  );

  const s1 = step('Gọi API tạo nhân vật');
  try {
    const player = await api.createPlayer(worldId, { name, role, backstory, faction });
    stepDone(s1);
    info(`Nhân vật đã tạo: ID ${player.id}`);

    const s2 = step('Sẵn sàng nhập vai');
    stepDone(s2);

    emit('player-create', true, `Đã tạo nhân vật "${player.name}" (ID: ${player.id})`, player, {
      nextSteps: [
        `Nhập vai: xmv act --id ${player.id} --action "..."`,
        `Xem lịch sử: xmv history --id ${player.id}`,
      ],
    });
    printData({
      id: player.id,
      worldId: player.worldId,
      name: player.name,
      role: player.role,
      faction: player.faction,
      backstory: player.backstory,
      currentScene: player.currentScene,
    });
  } catch (err: any) {
    stepFail(s1);
    fatal('player-create', err.message, undefined, {
      missing: [err.message],
      nextSteps: ['Kiểm tra world ID: xmv world list', 'Kiểm tra backend: xmv health'],
    });
  }
}

export async function cmdPlayerList(flags: Record<string, string | boolean>): Promise<void> {
  const worldId = requireArg(flags, 'world');
  beginSteps(2);

  const s0 = step(`Lấy danh sách nhân vật trong world ${worldId}`);
  try {
    const players = await api.listPlayers(worldId);
    stepDone(s0);
    info(`Tìm thấy ${players.length} nhân vật`);

    const s1 = step('Hiển thị');
    stepDone(s1);

    emit(
      'player-list',
      true,
      `Tìm thấy ${players.length} nhân vật trong thế giới.`,
      { count: players.length },
      {
        nextSteps:
          players.length > 0
            ? [`Nhập vai: xmv act --id <playerId> --action "..."`]
            : [`Tạo nhân vật: xmv player create --world ${worldId} --name "..." --role "..."`],
      },
    );
    printData(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        faction: p.faction,
      })),
    );
  } catch (err: any) {
    stepFail(s0);
    fatal('player-list', err.message, undefined, {
      missing: ['Không thể kết nối backend hoặc world không tồn tại'],
      nextSteps: ['Kiểm tra: xmv world list', 'Khởi động: xmv start'],
    });
  }
}
