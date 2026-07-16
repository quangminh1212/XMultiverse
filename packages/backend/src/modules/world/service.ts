/** World module — generation, packing, caps. */
export { generateWorldFromStory, expandLocationGraph } from '../../platform/worldgen';
export {
  exportWorldPack,
  importWorldPack,
  slimWorld,
  capTimeline,
} from '../../platform/player-state';
export { resolveScale, listScales, type WorldScaleId } from '../../config/world-scale';
