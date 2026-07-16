import { describe, it, expect } from 'vitest';
import { requireString, parseSourceType, parseQuestStatus } from './validate';
import { HttpError } from './http-error';

describe('validate', () => {
  it('requireString trims and enforces bounds', () => {
    expect(requireString('  hello  ', 'field')).toBe('hello');
    expect(() => requireString('', 'story')).toThrow(HttpError);
    expect(() => requireString('ab', 'story', { min: 5 })).toThrow(/at least 5/);
  });

  it('parseSourceType defaults and validates', () => {
    expect(parseSourceType(undefined)).toBe('story');
    expect(parseSourceType('movie')).toBe('movie');
    expect(() => parseSourceType('tv')).toThrow(HttpError);
  });

  it('parseQuestStatus accepts only known values', () => {
    expect(parseQuestStatus('active')).toBe('active');
    expect(parseQuestStatus('completed')).toBe('completed');
    expect(() => parseQuestStatus('done')).toThrow(HttpError);
  });
});
