import type { Player, QuestProgress } from '../../types';

export function clampDisp(n: number): number {
  return Math.max(-100, Math.min(100, n));
}

export function applyQuestUpdate(
  player: Player,
  world: { quests: { id: string; title: string }[] },
  qu: QuestProgress,
): void {
  if (!player.questLog) player.questLog = [];
  let questId = qu.questId;
  const byTitle = world.quests.find(
    (q) => q.title.toLowerCase() === String(qu.questId).toLowerCase(),
  );
  if (byTitle) questId = byTitle.id;

  const existing = player.questLog.find((q) => q.questId === questId);
  if (existing) {
    existing.status = qu.status;
    if (qu.progress) existing.progress = qu.progress;
  } else {
    player.questLog.push({
      questId,
      status: qu.status,
      progress: qu.progress,
    });
  }
}
