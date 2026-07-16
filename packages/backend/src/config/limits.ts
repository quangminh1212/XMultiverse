/**
 * Hard caps for a lightweight open-world runtime.
 * Keep the world explorable without unbounded growth.
 */
export const LIMITS = {
  /** Max locations kept on a world (generation / import). */
  locationsMax: 8,
  /** Max timeline events stored. */
  timelineMax: 24,
  /** Max quests / characters / factions kept. */
  questsMax: 5,
  charactersMax: 6,
  factionsMax: 4,
  /** Truncate seed text stored on world. */
  storyInputMax: 800,
  /** Player journal entries. */
  journalMax: 12,
  journalTextMax: 160,
  /** Short scene memory for AI (not full chat). */
  sceneSummariesMax: 5,
  sceneSummaryLen: 120,
  /** Chat rows used for AI context / client history / saves. */
  chatHistoryAi: 8,
  chatHistoryClient: 30,
  autosaveChat: 12,
  manualSaveChat: 40,
  /** Inventory / relationship note caps. */
  inventoryMax: 24,
  relationshipNotesMax: 4,
  questLogMax: 8,
  /** Autosave at most once per this many ms (when enabled). */
  autosaveMinIntervalMs: 45_000,
  /** Action / description hard caps (API). */
  actionMax: 800,
  descriptionMax: 2000,
} as const;
