import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { callAi, stripCodeFences } from './ai-client';
import type {
  World,
  RoleplayResult,
  Player,
  PlayerStats,
  InventoryItem,
  DiceCheckResult,
  Location,
  SourceType,
  RelationshipChange,
  QuestProgress,
} from '../types';

const WORLD_SYSTEM_PROMPT = `Bạn là kiến trúc sư thế giới mở (open-world builder). Phân tích cốt truyện / phim / sách người dùng cung cấp và tạo một thế giới khám phá được.

Đầu ra JSON:
{
  "name": "Tên thế giới",
  "description": "Mô tả bối cảnh, không khí, xung đột trung tâm",
  "sourceType": "story|movie|book|anime|original",
  "geography": ["vùng 1", "vùng 2"],
  "locations": [
    {
      "name": "Tên địa điểm",
      "description": "Mô tả có thể khám phá (2-3 câu)",
      "atmosphere": "không khí (u ám, sôi động...)",
      "connections": ["Tên địa điểm liền kề"],
      "npcs": ["Tên NPC thường xuất hiện"],
      "tags": ["city|dungeon|wilderness|sacred"]
    }
  ],
  "factions": [
    {"name": "Tên phe", "description": "Mô tả", "goals": ["mục tiêu 1", "mục tiêu 2"]}
  ],
  "magicSystem": "Hệ thống phép/công nghệ/sức mạnh (nếu có)",
  "technologyLevel": "Mức công nghệ",
  "timeline": [
    {"year": -500, "title": "Sự kiện", "description": "Mô tả", "important": true}
  ],
  "characters": [
    {"name": "Tên", "role": "vai trò", "faction": "Phe", "description": "Mô tả"}
  ],
  "quests": [
    {"title": "Tên nhiệm vụ", "description": "Mô tả", "objective": "Mục tiêu cụ thể"}
  ]
}

Quy tắc:
- locations: 5-10 địa điểm nối thành đồ thị (mỗi nơi có ≥1 connection hợp lệ).
- Timeline: 6-10 sự kiện. Characters: 4-8. Quests: 3-5. Factions: 2-5.
- Nếu nguồn là phim/sách, giữ tinh thần và bối cảnh gốc nhưng biến thành thế giới mở để khám phá (không spoil cứng; cho nhánh lựa chọn).
- Chỉ trả về JSON.`;

const ROLEPLAY_SYSTEM_PROMPT = `Bạn là Game Master của một thế giới mở. Dựa trên thế giới, vị trí hiện tại, timeline, NPC, chỉ số và hành động, tiếp tục câu chuyện.

Đầu ra JSON:
{
  "scene": "Mô tả cảnh 2-4 câu, tiểu thuyết, phản ánh địa điểm hiện tại",
  "events": ["sự kiện timeline mới nếu có"],
  "choices": ["lựa chọn 1", "lựa chọn 2", "lựa chọn 3"],
  "effects": [{"stat": "hp|mp|strength|agility|intelligence|charisma|luck", "delta": -5, "reason": "lý do"}],
  "itemChanges": [{"item": {"id": "uuid", "name": "tên", "description": "mô tả", "type": "weapon|armor|potion|key|misc|quest", "quantity": 1, "value": 10}, "action": "add|remove"}],
  "xpGained": 10,
  "relationshipChanges": [{"npc": "Tên NPC", "trust": 5, "respect": 0, "friendship": 3, "fear": 0, "note": "ghi chú"}],
  "questUpdates": [{"questId": "id hoặc title", "status": "active|completed|failed", "progress": "tiến độ"}],
  "movedToLocationId": "id địa điểm nếu nhân vật đã di chuyển (hoặc null)"
}

Quy tắc:
- Phản ánh location hiện tại và connections.
- relationshipChanges khi tương tác NPC; questUpdates khi nhiệm vụ tiến triển.
- effects/itemChanges/xpGained chỉ khi hợp lý. choices: 3 gợi ý (có thể gồm di chuyển).
- Chỉ trả về JSON.`;

function buildDemoLocations(): Location[] {
  const ids = {
    forest: uuidv4(),
    city: uuidv4(),
    mountain: uuidv4(),
    abyss: uuidv4(),
    temple: uuidv4(),
  };
  return [
    {
      id: ids.forest,
      name: 'Rừng sâu Bóng Đêm',
      description:
        'Rừng cổ thụ che khuất mặt trời. Lối mòn dẫn sâu vào sương mù; tiếng gió mang theo lời thì thầm.',
      atmosphere: 'U ám, bí ẩn',
      connections: ['Thành phố Ánh Sáng', 'Dãy núi Rồng Ngủ', 'Đền Cổ'],
      npcs: ['Elara'],
      tags: ['wilderness', 'quest'],
    },
    {
      id: ids.city,
      name: 'Thành phố Ánh Sáng',
      description:
        'Thành trì trắng với tháp canh vàng. Chợ đông đúc, lính canh tuần tra, tin đồn lan khắp quán rượu.',
      atmosphere: 'Sôi động, hy vọng',
      connections: ['Rừng sâu Bóng Đêm', 'Dãy núi Rồng Ngủ', 'Đền Cổ'],
      npcs: ['Aldric', 'Elara'],
      tags: ['city', 'safe'],
    },
    {
      id: ids.mountain,
      name: 'Dãy núi Rồng Ngủ',
      description:
        'Đỉnh núi phủ tuyết và hang rỗng. Tương truyền rồng cổ vẫn ngủ dưới lớp đá basalt.',
      atmosphere: 'Hoang vu, nguy hiểm',
      connections: ['Rừng sâu Bóng Đêm', 'Thành phố Ánh Sáng', 'Vực thẳm Vô Tận'],
      npcs: ['Mira'],
      tags: ['wilderness', 'dungeon'],
    },
    {
      id: ids.abyss,
      name: 'Vực thẳm Vô Tận',
      description:
        'Vực tối hun hút nơi bóng tối đặc quánh. Cổng địa ngục được đồn đại nằm dưới đáy vực.',
      atmosphere: 'Kinh hoàng, tuyệt vọng',
      connections: ['Dãy núi Rồng Ngủ'],
      npcs: ['Legion'],
      tags: ['dungeon', 'danger'],
    },
    {
      id: ids.temple,
      name: 'Đền Cổ',
      description:
        'Đền đá phủ rêu với bàn thờ phát sáng. Lời tiên tri về thanh kiếm thần được khắc trên cột đá.',
      atmosphere: 'Thánh thiện, cổ xưa',
      connections: ['Rừng sâu Bóng Đêm', 'Thành phố Ánh Sáng'],
      npcs: ['Mira'],
      tags: ['sacred'],
    },
  ];
}

function buildDemoWorld(storyInput: string, sourceType: SourceType = 'story'): World {
  const locations = buildDemoLocations();
  return {
    id: uuidv4(),
    storyInput,
    name: 'Vùng đất bóng tối',
    description: `Một thế giới mở được sinh ra từ: "${storyInput.slice(0, 120)}". Bạn có thể du hành giữa các địa điểm, gặp NPC và nhận nhiệm vụ. (Demo mode)`,
    geography: locations.map((l) => l.name),
    locations,
    sourceType,
    factions: [
      {
        name: 'Hiệp sĩ Bình minh',
        description: 'Những người bảo vệ ánh sáng và công lý.',
        goals: ['Đánh bại bóng tối', 'Bảo vệ người dân'],
      },
      {
        name: 'Hội Pháp sư',
        description: 'Những kẻ am hiểu ma thuật cổ xưa.',
        goals: ['Khám phá bí mật phép thuật', 'Duy trì cân bằng thế giới'],
      },
      {
        name: 'Quỷ vương Legion',
        description: 'Phe bóng tối muốn nuốt chửng thế giới.',
        goals: ['Mở cổng địa ngục', 'Hủy diệt ánh sáng'],
      },
    ],
    magicSystem: 'Ma thuật dựa trên năng lượng của nguyên tố và linh hồn.',
    technologyLevel: 'Trung cổ với yếu tố ma thuật',
    timeline: [
      {
        id: uuidv4(),
        year: -1000,
        title: 'Thời đại các vị thần',
        description: 'Các vị thần tạo ra thế giới và ban phép thuật.',
        important: true,
      },
      {
        id: uuidv4(),
        year: -500,
        title: 'Chiến tranh Rồng',
        description: 'Rồng tấn công các vương quốc loài người.',
        important: true,
      },
      {
        id: uuidv4(),
        year: 0,
        title: 'Hiệp ước Ánh Sáng',
        description: 'Các phe phái liên minh chống lại bóng tối.',
        important: true,
      },
      {
        id: uuidv4(),
        year: 100,
        title: 'Sự trỗi dậy của Quỷ vương',
        description: 'Quỷ vương Legion bắt đầu xâm lược.',
        important: true,
      },
      {
        id: uuidv4(),
        year: 200,
        title: 'Thanh kiếm thần xuất hiện',
        description: 'Lời tiên tri nói về người anh hùng sẽ cầm thanh kiếm thần.',
        important: true,
      },
    ],
    characters: [
      {
        id: uuidv4(),
        name: 'Aldric',
        role: 'Hiệp sĩ huyền thoại',
        faction: 'Hiệp sĩ Bình minh',
        description: 'Người từng đánh bại một con rồng.',
      },
      {
        id: uuidv4(),
        name: 'Mira',
        role: 'Pháp sư tài ba',
        faction: 'Hội Pháp sư',
        description: 'Thông thạo ma thuật ánh sáng.',
      },
      {
        id: uuidv4(),
        name: 'Legion',
        role: 'Quỷ vương',
        faction: 'Quỷ vương Legion',
        description: 'Kẻ thống trị địa ngục.',
      },
      {
        id: uuidv4(),
        name: 'Elara',
        role: 'Thương nhân bí ẩn',
        description: 'Cung cấp thông tin cho các hiệp sĩ.',
      },
    ],
    quests: [
      {
        id: uuidv4(),
        title: 'Tìm thanh kiếm thần',
        description: 'Khám phá nơi thanh kiếm thần được cất giấu.',
        objective: 'Tìm thanh kiếm thần trong Rừng sâu Bóng Đêm',
        status: 'active',
      },
      {
        id: uuidv4(),
        title: 'Đánh bại quân đoàn quỷ',
        description: 'Ngăn chặn quân đoàn quỷ xâm chiếm thành phố.',
        objective: 'Tiêu diệt 10 quỷ lính',
        status: 'active',
      },
      {
        id: uuidv4(),
        title: 'Giải cứu pháp sư Mira',
        description: 'Mira bị bắt ở Dãy núi Rồng Ngủ.',
        objective: 'Đưa Mira về thành phố an toàn',
        status: 'active',
      },
    ],
    createdAt: Date.now(),
  };
}

function normalizeLocations(raw: any[] | undefined, geography: string[]): Location[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((loc: any) => ({
      id: uuidv4(),
      name: String(loc.name || 'Địa điểm lạ'),
      description: String(loc.description || ''),
      atmosphere: loc.atmosphere ? String(loc.atmosphere) : undefined,
      connections: Array.isArray(loc.connections) ? loc.connections.map(String) : [],
      npcs: Array.isArray(loc.npcs) ? loc.npcs.map(String) : [],
      tags: Array.isArray(loc.tags) ? loc.tags.map(String) : undefined,
    }));
  }
  // Fallback: turn geography strings into basic locations
  return geography.map((name, i) => ({
    id: uuidv4(),
    name,
    description: `Khu vực ${name} — nơi bạn có thể khám phá và gặp gỡ nhân vật.`,
    connections: geography.filter((_, j) => j === i - 1 || j === i + 1),
    npcs: [],
    tags: ['region'],
  }));
}

export async function generateWorldFromStory(
  storyInput: string,
  sourceType: SourceType = 'story',
): Promise<World> {
  if (config.ai.demoMode || !config.ai.apiKey) {
    return buildDemoWorld(storyInput, sourceType);
  }

  const content = await callAi([
    { role: 'system', content: WORLD_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Loại nguồn: ${sourceType}\nCốt truyện / phim / sách:\n${storyInput}`,
    },
  ]);

  const parsed = JSON.parse(stripCodeFences(content));
  const geography: string[] = parsed.geography || [];
  const locations = normalizeLocations(parsed.locations, geography);

  return {
    id: uuidv4(),
    storyInput,
    name: parsed.name,
    description: parsed.description,
    geography: geography.length > 0 ? geography : locations.map((l) => l.name),
    locations,
    sourceType: (parsed.sourceType as SourceType) || sourceType,
    factions: parsed.factions || [],
    magicSystem: parsed.magicSystem,
    technologyLevel: parsed.technologyLevel,
    timeline: (parsed.timeline || []).map((e: any) => ({
      id: uuidv4(),
      year: Number(e.year),
      title: e.title,
      description: e.description,
      important: e.important ?? false,
    })),
    characters: (parsed.characters || []).map((c: any) => ({
      id: uuidv4(),
      name: c.name,
      role: c.role,
      faction: c.faction,
      description: c.description,
    })),
    quests: (parsed.quests || []).map((q: any) => ({
      id: uuidv4(),
      title: q.title,
      description: q.description,
      objective: q.objective,
      status: 'active' as const,
    })),
    createdAt: Date.now(),
  };
}

export function findLocation(world: World, idOrName: string): Location | undefined {
  const locs = world.locations || [];
  return (
    locs.find((l) => l.id === idOrName) ||
    locs.find((l) => l.name.toLowerCase() === idOrName.toLowerCase())
  );
}

export function getStartingLocation(world: World): Location | undefined {
  const locs = world.locations || [];
  if (locs.length === 0) return undefined;
  const city = locs.find((l) => l.tags?.includes('city') || l.tags?.includes('safe'));
  return city || locs[0];
}

export function canTravel(from: Location, to: Location): boolean {
  return from.connections.some((c) => c.toLowerCase() === to.name.toLowerCase() || c === to.id);
}

export interface TravelResult {
  scene: string;
  location: Location;
  choices: string[];
}

export function travelToLocation(
  world: World,
  player: Player,
  targetIdOrName: string,
): TravelResult {
  const locs = world.locations || [];
  if (locs.length === 0) {
    throw new Error('Thế giới này chưa có bản đồ địa điểm');
  }

  const target = findLocation(world, targetIdOrName);
  if (!target) {
    throw new Error(`Không tìm thấy địa điểm: ${targetIdOrName}`);
  }

  const current = player.currentLocationId
    ? findLocation(world, player.currentLocationId)
    : getStartingLocation(world);

  if (current && current.id !== target.id && !canTravel(current, target)) {
    throw new Error(
      `Không thể đi từ "${current.name}" đến "${target.name}". Các lối đi: ${current.connections.join(', ') || 'không có'}`,
    );
  }

  const npcLine = target.npcs.length > 0 ? ` Bạn có thể gặp: ${target.npcs.join(', ')}.` : '';
  const connLine =
    target.connections.length > 0 ? ` Từ đây có thể đi tới: ${target.connections.join(', ')}.` : '';

  const scene = `${player.name} đến ${target.name}. ${target.description}${
    target.atmosphere ? ` Không khí: ${target.atmosphere}.` : ''
  }${npcLine}${connLine}`;

  const choices = [
    ...target.connections.slice(0, 2).map((c) => `Đi tới ${c}`),
    target.npcs[0] ? `Nói chuyện với ${target.npcs[0]}` : 'Khám phá xung quanh',
    'Tìm manh mối nhiệm vụ',
  ].slice(0, 3);

  return { scene, location: target, choices };
}

export interface RoleplayInput {
  world: World;
  player: Player;
  history: { role: 'user' | 'assistant'; content: string }[];
  action: string;
  /** Optional pre-computed dice check result to include in AI context. */
  check?: DiceCheckResult;
}

export async function generateRoleplayResponse(input: RoleplayInput): Promise<RoleplayResult> {
  if (config.ai.demoMode || !config.ai.apiKey) {
    return buildDemoRoleplayResponse(input);
  }

  const location = input.player.currentLocationId
    ? findLocation(input.world, input.player.currentLocationId)
    : getStartingLocation(input.world);

  const statsLine = formatStatsForContext(input.player.stats);
  const inventoryLine =
    input.player.inventory.length > 0
      ? input.player.inventory.map((i) => `${i.name} x${i.quantity}`).join(', ')
      : 'Không có';
  const checkLine = input.check ? `\nKẾT QUẢ KIỂM TRA: ${input.check.description}` : '';
  const locLine = location
    ? `\nVỊ TRÍ: ${location.name}\nMô tả: ${location.description}\nKết nối: ${location.connections.join(', ')}\nNPC tại đây: ${location.npcs.join(', ') || 'không rõ'}`
    : '';
  const questLine =
    input.player.questLog?.length > 0
      ? `\nNHIỆM VỤ: ${input.player.questLog
          .map((q) => {
            const wq = input.world.quests.find((x) => x.id === q.questId);
            return `${wq?.title || q.questId} [${q.status}] ${q.progress || ''}`;
          })
          .join('; ')}`
      : `\nNHIỆM VỤ THẾ GIỚI: ${input.world.quests.map((q) => q.title).join(', ')}`;

  const context = `THẾ GIỚI: ${input.world.name}\nMô tả: ${input.world.description}\nĐịa lý: ${input.world.geography.join(', ')}\nPhe phái: ${input.world.factions.map((f) => f.name).join(', ')}\nHệ thống sức mạnh: ${input.world.magicSystem || 'Không'}\nCông nghệ: ${input.world.technologyLevel || 'Bình thường'}${locLine}\n\nNHÂN VẬT NGƯỜI CHƠI: ${input.player.name} (${input.player.role})\nTiểu sử: ${input.player.backstory}\nCảnh hiện tại: ${input.player.currentScene}\nChỉ số: ${statsLine}\nTúi đồ: ${inventoryLine}${questLine}${checkLine}\n\nHÀNH ĐỘNG: ${input.action}`;

  const content = await callAi([
    { role: 'system', content: ROLEPLAY_SYSTEM_PROMPT },
    { role: 'user', content: context },
  ]);

  const parsed = JSON.parse(stripCodeFences(content));
  // Resolve movedToLocationId from name if needed
  if (parsed.movedToLocationId && input.world.locations) {
    const loc = findLocation(input.world, parsed.movedToLocationId);
    if (loc) parsed.movedToLocationId = loc.id;
  }
  return parsed;
}

function formatStatsForContext(stats: PlayerStats): string {
  return `Lv${stats.level} HP${stats.hp}/${stats.maxHp} MP${stats.mp}/${stats.maxMp} STR${stats.strength} AGI${stats.agility} INT${stats.intelligence} CHA${stats.charisma}`;
}

function buildDemoRoleplayResponse(input: RoleplayInput): RoleplayResult {
  const action = input.action;
  const player = input.player;
  const world = input.world;
  const lower = action.toLowerCase();
  const location = player.currentLocationId
    ? findLocation(world, player.currentLocationId)
    : getStartingLocation(world);

  // Travel intent (accented + unaccented Vietnamese)
  if (/đi tới|đi đến|di toi|di den|travel|go to|move to|đến |den /i.test(lower)) {
    const match = world.locations?.find((l) => lower.includes(l.name.toLowerCase()));
    if (match) {
      try {
        const result = travelToLocation(world, player, match.id);
        return {
          scene: result.scene,
          events: [],
          choices: result.choices,
          xpGained: 5,
          movedToLocationId: match.id,
          check: input.check,
        };
      } catch {
        /* fall through */
      }
    }
  }

  // Combat
  if (/fight|attack|kill|battle|chiến|chien|đánh|danh|giết|giet/i.test(lower)) {
    const dmg = Math.floor(Math.random() * 20) + 5;
    return {
      scene: `${player.name} rút vũ khí tại ${location?.name || 'nơi này'} và lao vào chiến đấu! Trận đánh nảy lửa. Bạn nhận ${Math.floor(dmg / 2)} sát thương nhưng đứng vững. (Demo mode)`,
      events: [`${player.name} tham gia trận chiến tại ${location?.name || 'chiến trường'}`],
      choices: ['Tiếp tục chiến đấu', 'Rút lui an toàn', 'Loot chiến lợi phẩm'],
      effects: [{ stat: 'hp', delta: -Math.floor(dmg / 2), reason: 'Sát thương chiến đấu' }],
      xpGained: 25,
      check: input.check,
    };
  }

  // Explore
  if (/explore|search|look|find|khám|kham|tìm|tim|nhìn|nhin|pha\b/i.test(lower)) {
    const foundItem = Math.random() > 0.5;
    if (foundItem) {
      const item: InventoryItem = {
        id: crypto.randomUUID(),
        name: 'Bình thuốc hồi phục',
        description: 'Một bình thuốc đỏ phát sáng nhẹ.',
        type: 'potion',
        quantity: 1,
        value: 10,
        effects: [{ stat: 'hp', modifier: 30, duration: 'instant' }],
      };
      return {
        scene: `${player.name} khám phá ${location?.name || 'khu vực'} và tìm thấy một vật phẩm ẩn dưới đống đổ nát!`,
        events: [],
        choices: [
          'Nhặt bình thuốc',
          location?.connections[0] ? `Đi tới ${location.connections[0]}` : 'Đi hướng khác',
          'Kiểm tra kỹ hơn',
        ],
        itemChanges: [{ item, action: 'add' }],
        xpGained: 10,
        check: input.check,
      };
    }
    return {
      scene: `${player.name} đi khắp ${location?.name || 'khu vực'} nhưng chưa thấy gì đặc biệt. ${location?.atmosphere || 'Không gian yên tĩnh một cách đáng ngờ.'}`,
      events: [],
      choices: [
        location?.connections[0] ? `Đi tới ${location.connections[0]}` : 'Đi hướng khác',
        'Nghỉ ngơi',
        'Gọi NPC gần đó',
      ],
      xpGained: 5,
      check: input.check,
    };
  }

  // Talk / social
  if (/talk|speak|ask|negotiate|nói|noi|hỏi|hoi|thuyết|thuyet|chuyện|chuyen/i.test(lower)) {
    const npc = location?.npcs[0] || world.characters[0]?.name || 'Người lạ';
    const relChange: RelationshipChange = {
      npc,
      trust: 5,
      friendship: 3,
      respect: 2,
      fear: 0,
      note: `Trò chuyện tại ${location?.name || 'nơi này'}`,
    };
    return {
      scene: `${player.name} nói chuyện với ${npc} tại ${location?.name || 'đây'}. ${npc} lắng nghe với sự tò mò và hé lộ manh mối về nhiệm vụ gần đây. (Demo mode)`,
      events: [],
      choices: [`Thuyết phục ${npc}`, 'Hỏi về nhiệm vụ', 'Chào tạm biệt'],
      xpGained: 8,
      relationshipChanges: [relChange],
      check: input.check,
    };
  }

  // Quest progress
  if (/quest|nhiệm vụ|nhiem vu|hoàn thành|hoan thanh|accept|nhận nhiệm|nhan nhiem/i.test(lower)) {
    const q = world.quests[0];
    if (q) {
      const questUpdate: QuestProgress = {
        questId: q.id,
        status: 'active',
        progress: 'Đã nhận / đang theo dõi nhiệm vụ',
      };
      return {
        scene: `${player.name} ghi nhận nhiệm vụ "${q.title}": ${q.objective}. Con đường phía trước dần rõ hơn tại ${location?.name || 'thế giới này'}.`,
        events: [],
        choices: ['Bắt đầu tìm manh mối', 'Hỏi NPC về nhiệm vụ', 'Chuẩn bị hành trang'],
        xpGained: 15,
        questUpdates: [questUpdate],
        check: input.check,
      };
    }
  }

  // Default
  return {
    scene: `Bạn vừa thực hiện: "${action}". ${player.name} (${player.role}) đối mặt thử thách tại ${location?.name || world.name}. Mọi thứ bắt đầu thay đổi. (Demo mode)`,
    events: [],
    choices: [
      location?.connections[0] ? `Đi tới ${location.connections[0]}` : 'Tiếp tục khám phá',
      'Tìm kiếm đồng minh',
      'Kiểm tra nhiệm vụ',
    ],
    xpGained: 5,
    check: input.check,
  };
}
