import { api, type Player } from '../client.js';
import { emit, printData, fatal } from '../feedback.js';
import { requireArg } from '../args.js';

export async function cmdPlayerCreate(flags: Record<string, string | boolean>): Promise<void> {
  const worldId = requireArg(flags, 'world');
  const name = requireArg(flags, 'name');
  const role = requireArg(flags, 'role');
  const backstory = (flags.backstory as string) || '';
  const faction = (flags.faction as string) || '';

  try {
    const player = await api.createPlayer(worldId, { name, role, backstory, faction });
    emit('player-create', true, `Đã tạo nhân vật "${player.name}" (ID: ${player.id})`, player);
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
    fatal('player-create', err.message);
  }
}

export async function cmdPlayerList(flags: Record<string, string | boolean>): Promise<void> {
  const worldId = requireArg(flags, 'world');
  try {
    const players = await api.listPlayers(worldId);
    emit('player-list', true, `Tìm thấy ${players.length} nhân vật trong thế giới.`, {
      count: players.length,
    });
    printData(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        faction: p.faction,
      })),
    );
  } catch (err: any) {
    fatal('player-list', err.message);
  }
}
