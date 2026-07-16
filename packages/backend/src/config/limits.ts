/**
 * Scale-aware limits for lightweight-or-expansive open worlds.
 * Prefer getLimits(scale) over the static LIMITS snapshot.
 */
import {
  resolveScale,
  type WorldScaleId,
  type WorldScaleLimits,
  type ScaleOverrides,
} from './world-scale';

export type RuntimeLimits = Omit<
  WorldScaleLimits,
  'id' | 'label' | 'description' | 'genHint' | 'locationsTarget'
> & {
  locationsTarget: number;
  scaleId: WorldScaleId;
};

export function getLimits(
  scale?: WorldScaleId | string | null,
  overrides?: ScaleOverrides,
): RuntimeLimits {
  const s = resolveScale(scale, overrides);
  const { id, label, description, genHint, ...rest } = s;
  return { ...rest, scaleId: id };
}

/**
 * @deprecated Prefer getLimits(world.scale). Kept as standard-scale defaults
 * for modules that have not yet been scale-wired.
 */
export const LIMITS = getLimits('standard');
