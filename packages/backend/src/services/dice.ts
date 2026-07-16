/**
 * Dice and skill check system — inspired by GameMaster-GPT (1d20 + modifier vs DC).
 */
import type { PlayerStats, DiceCheckResult } from '../types';

/** Roll a single die with `sides` faces. */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll NdM format (e.g. "3d6" → roll 3 six-sided dice, sum results). */
export function rollDice(notation: string): number {
  const match = notation.toLowerCase().match(/^(\d+)?d(\d+)$/);
  if (!match) return 0;
  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDie(sides);
  }
  return total;
}

/** Get modifier for a stat (D&D-style: (stat - 10) / 2, rounded down). */
export function getStatModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

/** Map an action keyword to a relevant stat. */
export function inferStatFromAction(action: string): keyof PlayerStats | null {
  const lower = action.toLowerCase();
  if (
    /fight|attack|hit|slash|punch|kick|lift|break|force|chiến|chien|đánh|danh|đấm|dam|đạp|dap|phá|pha|mạnh|manh/i.test(
      lower,
    )
  ) {
    return 'strength';
  }
  if (
    /sneak|hide|dodge|run|jump|climb|steal|quick|fast|nhanh|lén|len|trốn|tron|chạy|chay|nhảy|nhay|leo|ăn cắp|an cap/i.test(
      lower,
    )
  ) {
    return 'agility';
  }
  if (
    /think|solve|research|magic|spell|analyze|remember|study|cast|tính|tinh|nghiên|nghien|phép|phep|phân|phan|nhớ|nho|học|hoc|thuật|thuat/i.test(
      lower,
    )
  ) {
    return 'intelligence';
  }
  if (
    /persuade|charm|talk|negotiate|bribe|threaten|convince|sing|perform|thuyết|thuyet|nói|noi|thương|thuong|đe|de doa|hát|hat|biểu|bieu|chuyện|chuyen/i.test(
      lower,
    )
  ) {
    return 'charisma';
  }
  if (/gamble|luck|random|guess|try|chance|cược|cuoc|may|ngẫu|ngau|đoán|doan|thử|thu|may mắn/i.test(lower)) {
    return 'luck';
  }
  return null;
}

/** Difficulty class tiers. */
export const DC = {
  trivial: 5,
  easy: 8,
  medium: 12,
  hard: 16,
  veryHard: 20,
  nearlyImpossible: 24,
} as const;

/** Infer DC from action description. */
export function inferDC(action: string): number {
  const lower = action.toLowerCase();
  if (/impossible|miracle|legendary|không thể|phép màu|huyền thoại/i.test(lower))
    return DC.nearlyImpossible;
  if (/very hard|extremely|master|rất khó|cực|bậc thầy/i.test(lower)) return DC.veryHard;
  if (/hard|difficult|expert|khó|chuyên/i.test(lower)) return DC.hard;
  if (/medium|normal|average|thường|trung bình/i.test(lower)) return DC.medium;
  if (/easy|simple|basic|dễ|đơn giản|cơ bản/i.test(lower)) return DC.easy;
  return DC.medium;
}

/** Perform a skill check: 1d20 + stat modifier vs DC. */
export function skillCheck(
  stat: keyof PlayerStats,
  stats: PlayerStats,
  dc: number,
): DiceCheckResult {
  const roll = rollDie(20);
  const statValue = stats[stat] as number;
  const modifier = getStatModifier(statValue);
  const total = roll + modifier;
  const success = total >= dc;

  const statNames: Record<string, string> = {
    level: 'Cấp độ',
    xp: 'XP',
    xpToNext: 'XP cần',
    hp: 'HP',
    maxHp: 'HP tối đa',
    mp: 'MP',
    maxMp: 'MP tối đa',
    strength: 'Sức mạnh',
    agility: 'Nhanh nhẹn',
    intelligence: 'Trí tuệ',
    charisma: 'Quyến rũ',
    luck: 'May mắn',
  };

  let description: string;
  if (roll === 20) {
    description = `🎯 Critical! (${statNames[stat]}) Roll: 20 + ${modifier} = ${total} vs DC ${dc}`;
  } else if (roll === 1) {
    description = `💀 Fumble! (${statNames[stat]}) Roll: 1 + ${modifier} = ${total} vs DC ${dc}`;
  } else if (success) {
    description = `✅ Thành công (${statNames[stat]}) Roll: ${roll} + ${modifier} = ${total} vs DC ${dc}`;
  } else {
    description = `❌ Thất bại (${statNames[stat]}) Roll: ${roll} + ${modifier} = ${total} vs DC ${dc}`;
  }

  return { roll, modifier, total, dc, success, stat, description };
}

/** Create default stats for a new player based on role. */
export function createDefaultStats(role: string): PlayerStats {
  const lower = role.toLowerCase();
  const base: PlayerStats = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    strength: 10,
    agility: 10,
    intelligence: 10,
    charisma: 10,
    luck: 10,
  };

  // Role-based stat adjustments
  if (/warrior|fighter|knight|barbarian|paladin|hiệp sĩ|chiến binh|dũng sĩ/i.test(lower)) {
    base.strength = 16;
    base.agility = 12;
    base.intelligence = 8;
    base.charisma = 10;
    base.maxHp = 120;
    base.hp = 120;
    base.maxMp = 30;
    base.mp = 30;
  } else if (/mage|wizard|sorcerer|witch|pháp sư|pháp sư|thuật sĩ/i.test(lower)) {
    base.strength = 6;
    base.agility = 10;
    base.intelligence = 18;
    base.charisma = 12;
    base.maxHp = 70;
    base.hp = 70;
    base.maxMp = 100;
    base.mp = 100;
  } else if (/rogue|thief|assassin|ranger|scout|trộm|sát thủ|trinh sát|lưu manh/i.test(lower)) {
    base.strength = 10;
    base.agility = 18;
    base.intelligence = 12;
    base.charisma = 10;
    base.maxHp = 90;
    base.hp = 90;
    base.maxMp = 40;
    base.mp = 40;
  } else if (/bard|poet|musician|troubadour|ca sĩ|thi sĩ|nhạc sĩ/i.test(lower)) {
    base.strength = 8;
    base.agility = 12;
    base.intelligence = 12;
    base.charisma = 18;
    base.maxHp = 85;
    base.hp = 85;
    base.maxMp = 60;
    base.mp = 60;
  } else if (/cleric|priest|healer|monk|tu sĩ|thầy tu|thần quan|chữa/i.test(lower)) {
    base.strength = 10;
    base.agility = 8;
    base.intelligence = 14;
    base.charisma = 14;
    base.maxHp = 95;
    base.hp = 95;
    base.maxMp = 80;
    base.mp = 80;
  }

  return base;
}

/** Calculate XP needed for next level. */
export function xpForLevel(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

/** Add XP to player, level up if enough. Returns new level if leveled up. */
export function addXp(stats: PlayerStats, amount: number): number | null {
  stats.xp += amount;
  let leveledUp = null;
  while (stats.xp >= stats.xpToNext) {
    stats.xp -= stats.xpToNext;
    stats.level += 1;
    stats.xpToNext = xpForLevel(stats.level);
    // Level up bonuses
    stats.maxHp += 10;
    stats.hp = stats.maxHp;
    stats.maxMp += 5;
    stats.mp = stats.maxMp;
    // +2 to a random stat
    const stats_arr: (keyof PlayerStats)[] = [
      'strength',
      'agility',
      'intelligence',
      'charisma',
      'luck',
    ];
    const pick = stats_arr[Math.floor(Math.random() * stats_arr.length)];
    (stats[pick] as number) += 2;
    leveledUp = stats.level;
  }
  return leveledUp;
}
