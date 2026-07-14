import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { callAi, stripCodeFences } from './ai-client';
import type { World, RoleplayResult } from '../types';

const WORLD_SYSTEM_PROMPT = `Bạn là một kiến trúc sư thế giới (world builder) và lịch sử gia. Nhiệm vụ của bạn là phân tích câu chuyện/cốt truyện người dùng cung cấp và tạo ra một thế giới hoàn chỉnh theo định dạng JSON.

Yêu cầu đầu ra JSON với cấu trúc sau:
{
  "name": "Tên thế giới",
  "description": "Mô tả ngắn gọn về thế giới, bối cảnh, không khí",
  "geography": ["địa điểm 1", "địa điểm 2", ...],
  "factions": [
    {"name": "Tên phe", "description": "Mô tả", "goals": ["mục tiêu 1", "mục tiêu 2"]}
  ],
  "magicSystem": "Mô tả hệ thống phép thuật/công nghệ/sức mạnh đặc biệt (nếu có)",
  "technologyLevel": "Mức độ công nghệ/kỹ thuật",
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
- Năm có thể âm (trước công nguyên) hoặc dương.
- Timeline nên có 6-10 sự kiện quan trọng.
- Characters nên có 4-8 nhân vật.
- Quests nên có 3-5 nhiệm vụ dành cho người chơi.
- Chỉ trả về JSON, không thêm giải thích ngoài.`;

const ROLEPLAY_SYSTEM_PROMPT = `Bạn là Game Master của một thế giới mở. Dựa trên thông tin thế giới, timeline, nhân vật và người chơi dưới đây, hãy tiếp tục câu chuyện khi người chơi thực hiện một hành động.

Đầu ra JSON:
{
  "scene": "Mô tả cảnh và hệ quả của hành động người chơi, 2-4 câu, hấp dẫn như tiểu thuyết",
  "events": ["sự kiện mới xảy ra với thế giới/timeline nếu có"],
  "choices": ["lựa chọn 1", "lựa chọn 2", "lựa chọn 3"]
}

Quy tắc:
- events chỉ ghi nếu hành động thực sự tạo ra sự kiện timeline đáng kể, không thì để mảng rỗng.
- choices là 3 gợi ý hành động tiếp theo cho người chơi.
- Chỉ trả về JSON.`;

function buildDemoWorld(storyInput: string): World {
  return {
    id: uuidv4(),
    storyInput,
    name: 'Vùng đất bóng tối',
    description: `Một thế giới được sinh ra từ câu chuyện: "${storyInput}". Đây là bản demo khi chưa có AI API key.`,
    geography: ['Rừng sâu Bóng Đêm', 'Thành phố Ánh Sáng', 'Dãy núi Rồng Ngủ', 'Vực thẳm Vô Tận'],
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
      },
      {
        id: uuidv4(),
        title: 'Đánh bại quân đoàn quỷ',
        description: 'Ngăn chặn quân đoàn quỷ xâm chiếm thành phố.',
        objective: 'Tiêu diệt 10 quỷ lính',
      },
      {
        id: uuidv4(),
        title: 'Giải cứu pháp sư Mira',
        description: 'Mira bị bắt ở Dãy núi Rồng Ngủ.',
        objective: 'Đưa Mira về thành phố an toàn',
      },
    ],
    createdAt: Date.now(),
  };
}

export async function generateWorldFromStory(storyInput: string): Promise<World> {
  if (config.ai.demoMode || !config.ai.apiKey) {
    return buildDemoWorld(storyInput);
  }

  const content = await callAi([
    { role: 'system', content: WORLD_SYSTEM_PROMPT },
    { role: 'user', content: `Cốt truyện: ${storyInput}` },
  ]);

  const parsed = JSON.parse(stripCodeFences(content));

  return {
    id: uuidv4(),
    storyInput,
    name: parsed.name,
    description: parsed.description,
    geography: parsed.geography || [],
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
    })),
    createdAt: Date.now(),
  };
}

export interface RoleplayInput {
  world: World;
  player: { name: string; role: string; backstory: string; currentScene: string };
  history: { role: 'user' | 'assistant'; content: string }[];
  action: string;
}

export async function generateRoleplayResponse(input: RoleplayInput): Promise<RoleplayResult> {
  if (config.ai.demoMode || !config.ai.apiKey) {
    return {
      scene: `Bạn vừa thực hiện: "${input.action}". Trong bản demo, AI chưa được kích hoạt, nhưng cảnh tưởng tượng như sau: ${input.player.name} dùng khả năng ${input.player.role} để đối mặt với thử thách trong ${input.world.name}. Mọi thứ bắt đầu thay đổi xung quanh bạn.`,
      events: input.action.toLowerCase().includes('chiến đấu')
        ? [`${input.player.name} tham gia một trận chiến lớn`]
        : [],
      choices: ['Tiếp tục khám phá', 'Quay về thành phố', 'Tìm kiếm đồng minh'],
    };
  }

  const context = `THẾ GIỚI: ${input.world.name}\nMô tả: ${input.world.description}\nĐịa lý: ${input.world.geography.join(', ')}\nPhe phái: ${input.world.factions.map((f) => f.name).join(', ')}\nHệ thống sức mạnh: ${input.world.magicSystem || 'Không'}\nCông nghệ: ${input.world.technologyLevel || 'Bình thường'}\n\nNHÂN VẬT NGƯỜI CHƠI: ${input.player.name} (${input.player.role})\nTiểu sử: ${input.player.backstory}\nCảnh hiện tại: ${input.player.currentScene}\n\nHÀNH ĐỘNG: ${input.action}`;

  const content = await callAi([
    { role: 'system', content: ROLEPLAY_SYSTEM_PROMPT },
    { role: 'user', content: context },
  ]);

  return JSON.parse(stripCodeFences(content));
}
