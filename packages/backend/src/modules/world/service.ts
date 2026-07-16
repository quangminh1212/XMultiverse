/** World module — generation, packing, caps. */
export { generateWorldFromStory, expandLocationGraph } from '../../services/worldgen';
export {
  exportWorldPack,
  importWorldPack,
  slimWorld,
  capTimeline,
} from '../../services/player-state';
export { resolveScale, listScales, type WorldScaleId } from '../../config/world-scale';
