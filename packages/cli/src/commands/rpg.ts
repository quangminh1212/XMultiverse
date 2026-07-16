import { api, type Player } from '../client.js';
import { emit, printData, fatal, step, stepDone, stepFail, info, beginSteps } from '../feedback.js';
import { requireArg } from '../args.js';

/** xmv stats --id <playerId> — Show player stats. */
export async function cmdStats(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  beginSteps(2);

  const s0 = step('Lấy thông tin nhân vật');
  let player: Player;
  try {
    player = await api.getPlayer(playerId);
    stepDone(s0);
    info(`Nhân vật: ${player.name} (${player.role})`);
  } catch (err: any) {
    stepFail(s0);
    fatal('stats', err.message, undefined, {
      missing: ['Không tìm thấy nhân vật hoặc backend chưa chạy'],
      nextSteps: ['Kiểm tra: xmv player list --world <id>', 'Khởi động: xmv start'],
    });
    return;
  }

  const s1 = step('Hiển thị chỉ số');
  stepDone(s1);

  const s = player.stats;
  if (!s) {
    info('Nhân vật chưa có stats (có thể được tạo trước khi update stats system)');
    emit('stats', true, 'Nhân vật chưa có stats.', { playerId });
    return;
  }

  const statData = {
    name: player.name,
    role: player.role,
    level: s.level,
    xp: s.xp,
    xpToNext: s.xpToNext,
    hp: `${s.hp}/${s.maxHp}`,
    mp: `${s.mp}/${s.maxMp}`,
    strength: s.strength,
    agility: s.agility,
    intelligence: s.intelligence,
    charisma: s.charisma,
    luck: s.luck,
    inventoryCount: player.inventory?.length || 0,
    relationships: Object.keys(player.relationships || {}).length,
  };

  info(`Lv ${s.level} | HP ${s.hp}/${s.maxHp} | MP ${s.mp}/${s.maxMp}`);
  info(
    `STR ${s.strength} | AGI ${s.agility} | INT ${s.intelligence} | CHA ${s.charisma} | LCK ${s.luck}`,
  );
  info(
    `XP: ${s.xp}/${s.xpToNext} | Inventory: ${player.inventory?.length || 0} items | NPCs: ${Object.keys(player.relationships || {}).length}`,
  );

  emit('stats', true, `Stats cho "${player.name}" (Lv ${s.level})`, statData, {
    nextSteps: [
      `Nhập vai: xmv act --id ${playerId} --action "..."`,
      `Xem túi đồ: xmv inventory --id ${playerId}`,
    ],
  });
  printData(statData);
}

/** xmv inventory --id <playerId> — Show inventory. */
export async function cmdInventory(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  beginSteps(2);

  const s0 = step('Lấy thông tin nhân vật');
  let player: Player;
  try {
    player = await api.getPlayer(playerId);
    stepDone(s0);
  } catch (err: any) {
    stepFail(s0);
    fatal('inventory', err.message, undefined, {
      missing: ['Không tìm thấy nhân vật'],
      nextSteps: ['Kiểm tra: xmv player list --world <id>'],
    });
    return;
  }

  const s1 = step('Hiển thị túi đồ');
  stepDone(s1);

  const items = player.inventory || [];
  info(`Túi đồ: ${items.length} vật phẩm`);

  if (items.length > 0) {
    for (const item of items) {
      const effects = item.effects?.map((e) => `${e.stat}+${e.modifier}`).join(', ') || '';
      info(
        `  [${item.type}] ${item.name} x${item.quantity}${effects ? ` (${effects})` : ''} — ${item.description}`,
      );
    }
  }

  emit(
    'inventory',
    true,
    `${items.length} vật phẩm`,
    { count: items.length, items },
    {
      nextSteps:
        items.length > 0
          ? [`Sử dụng: xmv use-item --id ${playerId} --item <itemId>`]
          : [`Khám phá: xmv act --id ${playerId} --action "khám phá khu vực"`],
    },
  );
  printData(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      quantity: i.quantity,
      description: i.description,
      effects: i.effects,
    })),
  );
}

/** xmv use-item --id <playerId> --item <itemId> — Use an item. */
export async function cmdUseItem(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  const itemId = requireArg(flags, 'item');
  beginSteps(2);

  const s0 = step('Sử dụng vật phẩm');
  try {
    const { player, effects } = await api.useItem(playerId, itemId);
    stepDone(s0);
    info(`Effects: ${effects.join(', ')}`);

    const s1 = step('Cập nhật');
    stepDone(s1);

    emit(
      'use-item',
      true,
      `Đã sử dụng vật phẩm. Effects: ${effects.join(', ')}`,
      { effects, player },
      {
        nextSteps: [`Xem stats: xmv stats --id ${playerId}`],
      },
    );
    printData({ effects, hp: player.stats.hp, mp: player.stats.mp });
  } catch (err: any) {
    stepFail(s0);
    fatal('use-item', err.message, undefined, {
      missing: [err.message],
      nextSteps: [`Xem túi đồ: xmv inventory --id ${playerId}`],
    });
  }
}

/** xmv roll --notation "1d20" — Roll dice. */
export async function cmdRoll(flags: Record<string, string | boolean>): Promise<void> {
  const notation = requireArg(flags, 'notation') || '1d20';
  beginSteps(1);

  const s0 = step(`Roll ${notation}`);
  try {
    const result = await api.roll(notation);
    stepDone(s0);
    info(`🎲 ${notation} = ${result.result}`);

    emit('roll', true, `${notation} = ${result.result}`, result, {
      nextSteps: ['Roll khác: xmv roll --notation "3d6"'],
    });
    printData(result);
  } catch (err: any) {
    stepFail(s0);
    fatal('roll', err.message, undefined, {
      missing: [err.message],
      nextSteps: ['Kiểm tra: xmv health', 'Khởi động: xmv start'],
    });
  }
}

/** xmv check --id <playerId> --stat strength --dc 12 — Skill check. */
export async function cmdCheck(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  const stat = requireArg(flags, 'stat') || 'strength';
  const dc = parseInt((flags.dc as string) || '12', 10);
  beginSteps(1);

  const s0 = step(`Skill check: ${stat} vs DC ${dc}`);
  try {
    const result = await api.skillCheck(playerId, stat, dc);
    stepDone(s0);
    info(result.description);

    emit('check', true, result.description, result, {
      nextSteps: [`Nhập vai: xmv act --id ${playerId} --action "..."`],
    });
    printData(result);
  } catch (err: any) {
    stepFail(s0);
    fatal('check', err.message, undefined, {
      missing: [err.message],
      nextSteps: ['Kiểm tra: xmv health'],
    });
  }
}

/** xmv save --id <playerId> --name "..." — Create save snapshot. */
export async function cmdSave(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  const name = (flags.name as string) || `Save ${new Date().toISOString()}`;
  beginSteps(2);

  const s0 = step('Tạo save snapshot');
  try {
    const snapshot = await api.createSave(playerId, name);
    stepDone(s0);
    info(`Save ID: ${snapshot.id}`);

    const s1 = step('Hoàn tất');
    stepDone(s1);

    emit('save', true, `Đã lưu "${name}" (ID: ${snapshot.id})`, snapshot, {
      nextSteps: [`Load: xmv load --save ${snapshot.id}`, `Xem saves: xmv saves --id ${playerId}`],
    });
    printData(snapshot);
  } catch (err: any) {
    stepFail(s0);
    fatal('save', err.message, undefined, {
      missing: [err.message],
      nextSteps: ['Kiểm tra: xmv health'],
    });
  }
}

/** xmv load --save <saveId> — Load save snapshot. */
export async function cmdLoad(flags: Record<string, string | boolean>): Promise<void> {
  const saveId = requireArg(flags, 'save');
  beginSteps(2);

  const s0 = step('Load save snapshot');
  try {
    const result = await api.loadSave(saveId);
    stepDone(s0);
    info(`Thế giới: ${result.world.name}`);
    info(`Nhân vật: ${result.player.name} (Lv ${result.player.stats?.level || 1})`);

    const s1 = step('Hoàn tất');
    stepDone(s1);

    emit(
      'load',
      true,
      `Đã load save. Thế giới: ${result.world.name}`,
      {
        worldId: result.world.id,
        playerId: result.player.id,
        worldName: result.world.name,
        playerName: result.player.name,
      },
      {
        nextSteps: [`Nhập vai: xmv act --id ${result.player.id} --action "..."`],
      },
    );
    printData({
      world: { id: result.world.id, name: result.world.name },
      player: { id: result.player.id, name: result.player.name, role: result.player.role },
    });
  } catch (err: any) {
    stepFail(s0);
    fatal('load', err.message, undefined, {
      missing: [err.message],
      nextSteps: ['Xem saves: xmv saves --id <playerId>'],
    });
  }
}

/** xmv saves --id <playerId> — List saves. */
export async function cmdSaves(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  beginSteps(2);

  const s0 = step('Lấy danh sách save');
  try {
    const saves = await api.listSaves(playerId);
    stepDone(s0);
    info(`Tìm thấy ${saves.length} save`);

    const s1 = step('Hiển thị');
    stepDone(s1);

    emit(
      'saves',
      true,
      `${saves.length} saves`,
      { count: saves.length },
      {
        nextSteps:
          saves.length > 0
            ? [`Load: xmv load --save <saveId>`]
            : [`Tạo save: xmv save --id ${playerId} --name "..."`],
      },
    );
    printData(saves);
  } catch (err: any) {
    stepFail(s0);
    fatal('saves', err.message, undefined, {
      missing: [err.message],
      nextSteps: ['Kiểm tra: xmv health'],
    });
  }
}

/** xmv travel --id <playerId> --to "<location name|id>" — Move on the open-world map. */
export async function cmdTravel(flags: Record<string, string | boolean>): Promise<void> {
  const playerId = requireArg(flags, 'id');
  const to = requireArg(flags, 'to');
  beginSteps(2);

  const s0 = step(`Du hành tới "${to}"`);
  try {
    const result = await api.travel(playerId, to);
    stepDone(s0);
    info(`Đã đến: ${result.location?.name || to}`);
    info(result.scene.slice(0, 200));

    const s1 = step('Hoàn tất');
    stepDone(s1);

    emit(
      'travel',
      true,
      `Đã đến ${result.location?.name || to}`,
      {
        location: result.location,
        scene: result.scene,
        choices: result.choices,
        playerId: result.player?.id,
      },
      {
        nextSteps: [
          `Khám phá: xmv act --id ${playerId} --action "Khám phá xung quanh"`,
          `Nói chuyện: xmv act --id ${playerId} --action "Nói với NPC"`,
        ],
      },
    );
    printData({
      location: result.location,
      scene: result.scene,
      choices: result.choices,
      currentLocationId: result.player?.currentLocationId,
    });
  } catch (err: any) {
    stepFail(s0);
    fatal('travel', err.message, undefined, {
      missing: [err.message],
      nextSteps: [
        'Xem world: xmv world get --id <worldId>',
        'Chỉ có thể đi tới địa điểm trong connections của vị trí hiện tại',
      ],
    });
  }
}
