import { describe, it, expect } from 'vitest';
import {
  rollDie,
  rollDice,
  getStatModifier,
  inferStatFromAction,
  skillCheck,
  createDefaultStats,
  addXp,
  DC,
} from './dice';

describe('dice', () => {
  it('rollDie returns value in 1..sides', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollDie(20);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    }
  });

  it('rollDice parses NdM notation', () => {
    const total = rollDice('3d6');
    expect(total).toBeGreaterThanOrEqual(3);
    expect(total).toBeLessThanOrEqual(18);
  });

  it('rollDice returns 0 for invalid notation', () => {
    expect(rollDice('xyz')).toBe(0);
  });

  it('getStatModifier uses D&D style', () => {
    expect(getStatModifier(10)).toBe(0);
    expect(getStatModifier(16)).toBe(3);
    expect(getStatModifier(8)).toBe(-1);
  });

  it('inferStatFromAction maps combat/social/explore keywords', () => {
    expect(inferStatFromAction('attack the dragon')).toBe('strength');
    expect(inferStatFromAction('danh quai')).toBe('strength');
    expect(inferStatFromAction('sneak past guards')).toBe('agility');
    expect(inferStatFromAction('cast a fire spell')).toBe('intelligence');
    expect(inferStatFromAction('noi chuyen voi npc')).toBe('charisma');
    expect(inferStatFromAction('try my luck')).toBe('luck');
    expect(inferStatFromAction('wait quietly')).toBeNull();
  });

  it('skillCheck returns structured result', () => {
    const stats = createDefaultStats('warrior');
    const check = skillCheck('strength', stats, DC.medium);
    expect(check.roll).toBeGreaterThanOrEqual(1);
    expect(check.roll).toBeLessThanOrEqual(20);
    expect(check.total).toBe(check.roll + check.modifier);
    expect(check.dc).toBe(DC.medium);
    expect(typeof check.success).toBe('boolean');
    expect(check.description.length).toBeGreaterThan(0);
  });

  it('createDefaultStats boosts warrior strength', () => {
    const w = createDefaultStats('kiếm sĩ');
    const m = createDefaultStats('pháp sư');
    expect(w.strength).toBeGreaterThan(m.strength);
    expect(m.intelligence).toBeGreaterThan(w.intelligence);
  });

  it('addXp levels up when threshold reached', () => {
    const stats = createDefaultStats('adventurer');
    stats.xp = stats.xpToNext - 1;
    const level = addXp(stats, 50);
    expect(level).toBe(2);
    expect(stats.level).toBe(2);
    expect(stats.hp).toBe(stats.maxHp);
  });
});
