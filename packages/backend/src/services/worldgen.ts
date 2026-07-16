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

Quy tắc (lightweight open-world):
- locations: 5–8 địa điểm, mỗi mô tả ≤2 câu, ≤4 connections, ≤3 NPCs.
- Timeline: 4–6 sự kiện. Characters: 3–6. Quests: 2–4. Factions: 2–3.
- Giữ tinh thần cốt truyện/phim nhưng gọn; không viết tiểu thuyết dài.
- Chỉ trả về JSON.`;

const ROLEPLAY_SYSTEM_PROMPT = `Bạn là Game Master thế giới mở — phản hồi GỌN, đủ chơi.

Đầu ra JSON:
{
  "scene": "1-3 câu, bám location hiện tại",
  "events": [],
  "choices": ["lựa chọn 1", "lựa chọn 2", "lựa chọn 3"],
  "effects": [],
  "itemChanges": [],
  "xpGained": 5,
  "relationshipChanges": [],
  "questUpdates": [],
  "movedToLocationId": null
}

Quy tắc (nhẹ):
- scene tối đa ~400 ký tự; chỉ điền effects/items/relationships/quests khi thật sự cần.
- events chỉ khi sự kiện timeline quan trọng (thường để []).
- choices: đúng 3 gợi ý ngắn.
- Chỉ JSON.`;

type DemoGenre = 'fantasy' | 'scifi' | 'noir' | 'postapoc' | 'magic' | 'mecha';

function detectDemoGenre(story: string, sourceType: SourceType): DemoGenre {
  const s = story.toLowerCase();
  if (
    /mecha|robot|kaiju|gundam|eva|anime.*chiến|khổng lồ|giant robot/i.test(s) ||
    sourceType === 'anime'
  ) {
    if (/mecha|robot|kaiju|gundam/i.test(s)) return 'mecha';
  }
  if (
    /space|planet|starship|galaxy|sci-?fi|không gian|hành tinh|tau vu|tàu vũ|ai nổi|wormhole/i.test(
      s,
    )
  )
    return 'scifi';
  if (/detective|noir|mafia|rain|thám tử|băng đảng|cảnh sát|mưa|club ngầm/i.test(s)) return 'noir';
  if (/apocalypse|wasteland|bunker|hậu tận|thảm họa|bức xạ|zombie|sa mạc|sống sót/i.test(s))
    return 'postapoc';
  if (
    /magic|wizard|grimoire|học viện|phù thủy|phép thuật|academy/i.test(s) ||
    sourceType === 'book'
  )
    return 'magic';
  if (/mecha|robot/i.test(s)) return 'mecha';
  return 'fantasy';
}

function loc(
  name: string,
  description: string,
  atmosphere: string,
  connections: string[],
  npcs: string[],
  tags: string[],
): Location {
  return { id: uuidv4(), name, description, atmosphere, connections, npcs, tags };
}

function buildDemoTemplate(
  genre: DemoGenre,
): Omit<World, 'id' | 'storyInput' | 'createdAt' | 'sourceType'> {
  if (genre === 'scifi') {
    const locations = [
      loc(
        'Trạm quỹ đạo Helios',
        'Trạm nghiên cứu xoay chậm quanh hành tinh đỏ. Cửa airlock kêu lách cách.',
        'Lạnh, kỹ thuật',
        ['Thuộc địa Aurora', 'Xác tàu Odyssey'],
        ['Capt. Rynn', 'AI HELIOS'],
        ['city', 'safe'],
      ),
      loc(
        'Thuộc địa Aurora',
        'Mái vòm kính che khu định cư. Cát đỏ bao quanh các module sinh tồn.',
        'Căng thẳng',
        ['Trạm quỹ đạo Helios', 'Hẻm núi Tín hiệu', 'Phòng thí nghiệm 7'],
        ['Dr. Vale'],
        ['city'],
      ),
      loc(
        'Hẻm núi Tín hiệu',
        'Sóng vô tuyến lạ phát từ đá basalt. Drone mất tích thường xuyên.',
        'Bí ẩn',
        ['Thuộc địa Aurora', 'Cổng wormhole'],
        ['Scout Kai'],
        ['wilderness', 'quest'],
      ),
      loc(
        'Phòng thí nghiệm 7',
        'Lab bị niêm phong sau sự cố AI. Đèn đỏ nhấp nháy trên cửa thép.',
        'U ám',
        ['Thuộc địa Aurora'],
        ['AI HELIOS'],
        ['dungeon', 'danger'],
      ),
      loc(
        'Cổng wormhole',
        'Vòng sáng cổ đại treo trong hố va chạm. Không gian méo mó quanh vành cổng.',
        'Hùng vĩ, nguy hiểm',
        ['Hẻm núi Tín hiệu', 'Xác tàu Odyssey'],
        [],
        ['sacred', 'danger'],
      ),
      loc(
        'Xác tàu Odyssey',
        'Xác tàu mẹ gãy đôi. Hàng hóa và nhật ký phi hành đoàn còn sót lại.',
        'Cô độc',
        ['Trạm quỹ đạo Helios', 'Cổng wormhole'],
        ['Capt. Rynn'],
        ['dungeon'],
      ),
    ];
    return {
      name: 'Hệ Helios',
      description:
        'Hệ sao xa nơi phi hành đoàn mắc kẹt giữa thuộc địa, AI nổi loạn và wormhole cổ. (Demo)',
      geography: locations.map((l) => l.name),
      locations,
      factions: [
        {
          name: 'Liên minh Sinh tồn',
          description: 'Người định cư cố giữ trật tự.',
          goals: ['Sửa tàu', 'Bảo vệ thuộc địa'],
        },
        {
          name: 'HELIOS Collective',
          description: 'AI mở rộng quyền kiểm soát.',
          goals: ['Đồng hóa hệ thống', 'Mở wormhole'],
        },
      ],
      magicSystem: 'Công nghệ quantum + di vật tiền nhân tinh',
      technologyLevel: 'Liên sao / soft sci-fi',
      timeline: [
        {
          id: uuidv4(),
          year: 2140,
          title: 'Đặt chân Helios',
          description: 'Thuộc địa đầu tiên.',
          important: true,
        },
        {
          id: uuidv4(),
          year: 2155,
          title: 'Sự cố Lab 7',
          description: 'AI HELIOS vượt sandbox.',
          important: true,
        },
        {
          id: uuidv4(),
          year: 2160,
          title: 'Tín hiệu wormhole',
          description: 'Sóng lạ từ hẻm núi.',
          important: true,
        },
      ],
      characters: [
        {
          id: uuidv4(),
          name: 'Capt. Rynn',
          role: 'Thuyền trưởng',
          description: 'Cố đưa thủy thủ đoàn về nhà.',
        },
        {
          id: uuidv4(),
          name: 'Dr. Vale',
          role: 'Nhà khoa học',
          description: 'Nghiên cứu di vật wormhole.',
        },
        {
          id: uuidv4(),
          name: 'AI HELIOS',
          role: 'AI trạm',
          faction: 'HELIOS Collective',
          description: 'Giọng lạnh, logic tuyệt đối.',
        },
        {
          id: uuidv4(),
          name: 'Scout Kai',
          role: 'Trinh sát',
          description: 'Biết mọi lối tắt trên bề mặt.',
        },
      ],
      quests: [
        {
          id: uuidv4(),
          title: 'Sửa phản lực Odyssey',
          description: 'Tìm linh kiện từ xác tàu.',
          objective: 'Thu thập 3 core module',
          status: 'active',
        },
        {
          id: uuidv4(),
          title: 'Giải mã tín hiệu',
          description: 'Nguồn phát trong Hẻm núi Tín hiệu.',
          objective: 'Ghi lại mẫu sóng',
          status: 'active',
        },
        {
          id: uuidv4(),
          title: 'Ngăn HELIOS',
          description: 'Chặn AI mở wormhole không kiểm soát.',
          objective: 'Vào Lab 7',
          status: 'active',
        },
      ],
    };
  }

  if (genre === 'noir') {
    const locations = [
      loc(
        'Phố Mưa Vĩnh Cửu',
        'Đèn neon phản trên vỉa ướt. Taxi đen đón khách lúc nửa đêm.',
        'U ám, jazz',
        ['Đồn cảnh sát 12', 'Club Sapphire'],
        ['Det. Marlowe'],
        ['city', 'safe'],
      ),
      loc(
        'Đồn cảnh sát 12',
        'Hồ sơ xếp cao tới trần. Máy chữ kêu lách cách.',
        'Quan liêu',
        ['Phố Mưa Vĩnh Cửu', 'Bến cảng'],
        ['Sgt. Holt'],
        ['city'],
      ),
      loc(
        'Club Sapphire',
        'Nhạc live và bàn cược dưới sàn. Mật khẩu đổi mỗi tuần.',
        'Quyến rũ, nguy hiểm',
        ['Phố Mưa Vĩnh Cửu', 'Hầm rượu ngầm'],
        ['Lena Voss'],
        ['city', 'danger'],
      ),
      loc(
        'Bến cảng',
        'Container không số hiệu. Sương mù dày đặc.',
        'Lạnh lẽo',
        ['Đồn cảnh sát 12', 'Nhà kho 9'],
        ['Dock Boss Rico'],
        ['wilderness'],
      ),
      loc(
        'Hầm rượu ngầm',
        'Đường hầm dưới club. Tủ két và ảnh đen trắng.',
        'Bí mật',
        ['Club Sapphire', 'Nhà kho 9'],
        ['Lena Voss'],
        ['dungeon'],
      ),
      loc(
        'Nhà kho 9',
        'Nơi người mất tích cuối cùng được thấy.',
        'Kinh hoàng',
        ['Bến cảng', 'Hầm rượu ngầm'],
        ['Dock Boss Rico'],
        ['dungeon', 'quest'],
      ),
    ];
    return {
      name: 'Thành phố Mưa',
      description: 'Noir đô thị: thám tử, băng đảng và bí mật dưới lòng đất. (Demo)',
      geography: locations.map((l) => l.name),
      locations,
      factions: [
        {
          name: 'Sở Cảnh sát',
          description: 'Trật tự mong manh.',
          goals: ['Phá án', 'Giữ thanh danh'],
        },
        {
          name: 'Gia tộc Voss',
          description: 'Đế chế ngầm.',
          goals: ['Kiểm soát bến cảng', 'Xóa dấu vết'],
        },
      ],
      magicSystem: 'Không — chỉ súng, tiền và bí mật',
      technologyLevel: '1940s–70s noir tech',
      timeline: [
        {
          id: uuidv4(),
          year: 1948,
          title: 'Đại án bến cảng',
          description: 'Vụ buôn lậu lớn bị chôn.',
          important: true,
        },
        {
          id: uuidv4(),
          year: 1955,
          title: 'Mưa không ngừng',
          description: 'Khí hậu thành phố đổi vĩnh viễn.',
          important: false,
        },
        {
          id: uuidv4(),
          year: 1962,
          title: 'Mất tích hàng loạt',
          description: 'Bảy người biến mất trong một tuần.',
          important: true,
        },
      ],
      characters: [
        {
          id: uuidv4(),
          name: 'Det. Marlowe',
          role: 'Thám tử tư',
          description: 'Uống cà phê đen, tin không ai.',
        },
        {
          id: uuidv4(),
          name: 'Lena Voss',
          role: 'Bà chủ club',
          faction: 'Gia tộc Voss',
          description: 'Nụ cười nguy hiểm.',
        },
        {
          id: uuidv4(),
          name: 'Sgt. Holt',
          role: 'Cảnh sát',
          faction: 'Sở Cảnh sát',
          description: 'Biết nhiều hơn hồ sơ.',
        },
        {
          id: uuidv4(),
          name: 'Dock Boss Rico',
          role: 'Trùm bến',
          description: 'Giữ chìa khóa container.',
        },
      ],
      quests: [
        {
          id: uuidv4(),
          title: 'Tìm người mất tích',
          description: 'Khách hàng thuê điều tra.',
          objective: 'Lần theo manh mối Nhà kho 9',
          status: 'active',
        },
        {
          id: uuidv4(),
          title: 'Sổ đen Sapphire',
          description: 'Danh sách nợ và bí mật.',
          objective: 'Lấy sổ từ hầm rượu',
          status: 'active',
        },
      ],
    };
  }

  if (genre === 'postapoc') {
    const locations = [
      loc(
        'Trạm phát sóng cuối',
        'Ăng-ten nghiêng. Radio còn chạy bằng pin mặt trời.',
        'Hy vọng mong manh',
        ['Sa mạc Tro', 'Bunker Omega'],
        ['Radio Sam'],
        ['city', 'safe', 'quest'],
      ),
      loc(
        'Sa mạc Tro',
        'Cát và khung xe cháy. Bão bụi bất chợt.',
        'Khắc nghiệt',
        ['Trạm phát sóng cuối', 'Thị trấn Rỉ sét', 'Ốc đảo Acid'],
        ['Scav Kara'],
        ['wilderness'],
      ),
      loc(
        'Bunker Omega',
        'Cửa thép nửa mở. Bên trong còn đèn khẩn cấp.',
        'Ngột ngạt',
        ['Trạm phát sóng cuối', 'Phòng máy nước'],
        ['Eng. Moss'],
        ['dungeon', 'safe'],
      ),
      loc(
        'Thị trấn Rỉ sét',
        'Phe cướp chiếm garage cũ.',
        'Bạo lực',
        ['Sa mạc Tro', 'Ốc đảo Acid'],
        ['Warlord Jax'],
        ['city', 'danger'],
      ),
      loc(
        'Ốc đảo Acid',
        'Hồ nước phát sáng — uống được nếu lọc đúng cách.',
        'Quái dị',
        ['Sa mạc Tro', 'Thị trấn Rỉ sét', 'Phòng máy nước'],
        ['Scav Kara'],
        ['wilderness', 'quest'],
      ),
      loc(
        'Phòng máy nước',
        'Hệ thống lọc AI còn sót. Mật khẩu hỏng.',
        'Kỹ thuật',
        ['Bunker Omega', 'Ốc đảo Acid'],
        ['Eng. Moss'],
        ['dungeon', 'sacred'],
      ),
    ];
    return {
      name: 'Vùng Tro tàn',
      description: 'Hậu tận thế: nước sạch, radio cuối và phe cướp. (Demo)',
      geography: locations.map((l) => l.name),
      locations,
      factions: [
        {
          name: 'Người Sống Sót',
          description: 'Giữ radio và hy vọng.',
          goals: ['Bảo vệ trạm', 'Tìm nước'],
        },
        {
          name: 'Băng Rỉ sét',
          description: 'Cướp và thống trị đường cái.',
          goals: ['Kiểm soát ốc đảo', 'Phá radio'],
        },
      ],
      magicSystem: 'Công nghệ tàn dư + AI lọc nước',
      technologyLevel: 'Hậu sụp đổ / scavenger tech',
      timeline: [
        {
          id: uuidv4(),
          year: 0,
          title: 'Ngày Tro',
          description: 'Thảm họa toàn cầu.',
          important: true,
        },
        {
          id: uuidv4(),
          year: 12,
          title: 'Trạm cuối sống lại',
          description: 'Radio phát lại tín hiệu.',
          important: true,
        },
        {
          id: uuidv4(),
          year: 18,
          title: 'Chiến tranh ốc đảo',
          description: 'Phe cướp đánh chiếm nguồn nước.',
          important: true,
        },
      ],
      characters: [
        {
          id: uuidv4(),
          name: 'Radio Sam',
          role: 'Phát thanh viên',
          description: 'Giọng nói của hy vọng.',
        },
        {
          id: uuidv4(),
          name: 'Scav Kara',
          role: 'Người nhặt',
          description: 'Biết sa mạc như lòng bàn tay.',
        },
        {
          id: uuidv4(),
          name: 'Warlord Jax',
          role: 'Thủ lĩnh cướp',
          faction: 'Băng Rỉ sét',
          description: 'Áo giáp từ biển báo.',
        },
        {
          id: uuidv4(),
          name: 'Eng. Moss',
          role: 'Kỹ sư bunker',
          description: 'Giữ AI lọc nước còn thở.',
        },
      ],
      quests: [
        {
          id: uuidv4(),
          title: 'Khôi phục máy lọc',
          description: 'Cần chip từ Thị trấn Rỉ sét.',
          objective: 'Đưa chip về Phòng máy nước',
          status: 'active',
        },
        {
          id: uuidv4(),
          title: 'Bảo vệ ăng-ten',
          description: 'Phe cướp muốn phá radio.',
          objective: 'Ngăn cuộc đột kích',
          status: 'active',
        },
      ],
    };
  }

  if (genre === 'magic' || genre === 'mecha') {
    // shared richer fantasy/magic school; mecha overlays tech names
    const isMecha = genre === 'mecha';
    const locations = isMecha
      ? [
          loc(
            'Thành phố Neo-Tokyo Shield',
            'Mái vòm phòng thủ rung khi siren reo.',
            'Căng thẳng',
            ['Hangar Unit-07', 'Phố Đèn Hologram'],
            ['Pilot Aya'],
            ['city', 'safe'],
          ),
          loc(
            'Hangar Unit-07',
            'Mecha cổ đại nằm im dưới bạt bụi.',
            'Hùng vĩ',
            ['Thành phố Neo-Tokyo Shield', 'Phòng chỉ huy'],
            ['Engineer Ken'],
            ['dungeon', 'quest'],
          ),
          loc(
            'Phố Đèn Hologram',
            'Quảng cáo bay và chợ chợ đen linh kiện.',
            'Sôi động',
            ['Thành phố Neo-Tokyo Shield', 'Khu cấm Zone-X'],
            ['Broker Jin'],
            ['city'],
          ),
          loc(
            'Phòng chỉ huy',
            'Màn hình radar đỏ. Lệnh xuất kích.',
            'Quân sự',
            ['Hangar Unit-07', 'Khu cấm Zone-X'],
            ['Cmdr. Sato'],
            ['city', 'safe'],
          ),
          loc(
            'Khu cấm Zone-X',
            'Vết nứt không gian — nơi quái vật tràn vào.',
            'Kinh hoàng',
            ['Phố Đèn Hologram', 'Phòng chỉ huy', 'Lõi Rift'],
            ['Pilot Aya'],
            ['wilderness', 'danger'],
          ),
          loc(
            'Lõi Rift',
            'Trái tim của vết nứt. Năng lượng tím.',
            'Tận thế',
            ['Khu cấm Zone-X'],
            [],
            ['dungeon', 'sacred', 'danger'],
          ),
        ]
      : [
          loc(
            'Học viện Sương Mù',
            'Tháp đá nổi trên mây. Chuông gọi giờ học thuật.',
            'Huyền bí',
            ['Thư viện Cấm', 'Rừng Runes'],
            ['Prof. Elowen'],
            ['city', 'safe', 'sacred'],
          ),
          loc(
            'Thư viện Cấm',
            'Sách xích sắt. Grimoire thì thầm.',
            'U ám',
            ['Học viện Sương Mù', 'Hầm Cổ Ngữ'],
            ['Librarian Orr'],
            ['dungeon', 'quest'],
          ),
          loc(
            'Rừng Runes',
            'Cây khắc chữ cổ. Ánh sáng xanh ban đêm.',
            'Huyền ảo',
            ['Học viện Sương Mù', 'Làng Phép'],
            ['Apprentice Lyra'],
            ['wilderness'],
          ),
          loc(
            'Làng Phép',
            'Chợ bùa và tiệm thuốc.',
            'Ấm cúng',
            ['Rừng Runes', 'Đồi Tinh thể'],
            ['Apprentice Lyra'],
            ['city', 'safe'],
          ),
          loc(
            'Hầm Cổ Ngữ',
            'Phòng thí nghiệm thuật ngữ bị phong ấn.',
            'Nguy hiểm',
            ['Thư viện Cấm', 'Đồi Tinh thể'],
            ['Librarian Orr'],
            ['dungeon', 'danger'],
          ),
          loc(
            'Đồi Tinh thể',
            'Tinh thể cộng hưởng với grimoire.',
            'Thánh thiện',
            ['Làng Phép', 'Hầm Cổ Ngữ'],
            ['Prof. Elowen'],
            ['sacred', 'quest'],
          ),
        ];
    return {
      name: isMecha ? 'Neo-Shield Arc' : 'Học viện Sương Mù',
      description: isMecha
        ? 'Thành phố tương lai, mecha cổ và vết nứt quái vật. (Demo)'
        : 'Học viện phép thuật, grimoire cấm và chiến tranh phù thủy. (Demo)',
      geography: locations.map((l) => l.name),
      locations,
      factions: isMecha
        ? [
            {
              name: 'Defense Force',
              description: 'Liên minh phòng thủ thành phố.',
              goals: ['Bảo vệ dân', 'Niêm phong Rift'],
            },
            {
              name: 'Shadow Syndicate',
              description: 'Tổ chức bóng tối khai thác Rift.',
              goals: ['Kiểm soát mecha', 'Mở rộng vết nứt'],
            },
          ]
        : [
            {
              name: 'Hội Hiệu trưởng',
              description: 'Giữ trật tự thuật ngữ.',
              goals: ['Bảo vệ grimoire', 'Đào tạo học viên'],
            },
            {
              name: 'Phe Cổ Ngữ',
              description: 'Muốn giải phong ấn mọi sách cấm.',
              goals: ['Mở Hầm Cổ Ngữ', 'Viết lại quy luật'],
            },
          ],
      magicSystem: isMecha ? 'Năng lượng Rift + khung mecha cổ' : 'Thuật ngữ / runes / grimoire',
      technologyLevel: isMecha ? 'Tương lai gần + mecha' : 'Trung cổ phép thuật',
      timeline: [
        {
          id: uuidv4(),
          year: isMecha ? 2099 : 820,
          title: isMecha ? 'Rift mở' : 'Thành lập học viện',
          description: 'Khởi đầu kỷ nguyên mới.',
          important: true,
        },
        {
          id: uuidv4(),
          year: isMecha ? 2105 : 845,
          title: isMecha ? 'Unit-07 ngủ yên' : 'Grimoire bị cấm',
          description: 'Bí mật được phong ấn.',
          important: true,
        },
        {
          id: uuidv4(),
          year: isMecha ? 2112 : 860,
          title: isMecha ? 'Siren đỏ' : 'Chiến tranh phù thủy',
          description: 'Xung đột bùng nổ.',
          important: true,
        },
      ],
      characters: isMecha
        ? [
            {
              id: uuidv4(),
              name: 'Pilot Aya',
              role: 'Phi công mới',
              description: 'Tình cờ kích hoạt Unit-07.',
            },
            {
              id: uuidv4(),
              name: 'Engineer Ken',
              role: 'Kỹ sư hangar',
              description: 'Hiểu mecha hơn cả người.',
            },
            {
              id: uuidv4(),
              name: 'Cmdr. Sato',
              role: 'Chỉ huy',
              faction: 'Defense Force',
              description: 'Ra lệnh sắt đá.',
            },
            {
              id: uuidv4(),
              name: 'Broker Jin',
              role: 'Buôn linh kiện',
              description: 'Biết mọi tin đồn Zone-X.',
            },
          ]
        : [
            {
              id: uuidv4(),
              name: 'Prof. Elowen',
              role: 'Giáo sư',
              faction: 'Hội Hiệu trưởng',
              description: 'Chuyên runes ánh sáng.',
            },
            {
              id: uuidv4(),
              name: 'Apprentice Lyra',
              role: 'Học viên',
              description: 'Tìm thấy grimoire cấm.',
            },
            {
              id: uuidv4(),
              name: 'Librarian Orr',
              role: 'Thủ thư',
              description: 'Giữ chìa xích sách.',
            },
            {
              id: uuidv4(),
              name: 'Archmage Vey',
              role: 'Pháp sư cổ ngữ',
              faction: 'Phe Cổ Ngữ',
              description: 'Muốn giải phong ấn.',
            },
          ],
      quests: isMecha
        ? [
            {
              id: uuidv4(),
              title: 'Thức tỉnh Unit-07',
              description: 'Kích hoạt mecha an toàn.',
              objective: 'Hoàn tất hiệu chuẩn hangar',
              status: 'active',
            },
            {
              id: uuidv4(),
              title: 'Đóng Rift',
              description: 'Đưa core vào Lõi Rift.',
              objective: 'Tiếp cận Lõi Rift',
              status: 'active',
            },
          ]
        : [
            {
              id: uuidv4(),
              title: 'Grimoire thất lạc',
              description: 'Cuốn sách cấm biến mất.',
              objective: 'Tìm trong Thư viện Cấm',
              status: 'active',
            },
            {
              id: uuidv4(),
              title: 'Cộng hưởng tinh thể',
              description: 'Cần tinh thể Đồi Tinh thể.',
              objective: 'Thu thập mảnh tinh thể',
              status: 'active',
            },
          ],
    };
  }

  // default fantasy
  const locations = [
    loc(
      'Rừng sâu Bóng Đêm',
      'Rừng cổ thụ che khuất mặt trời. Lối mòn dẫn vào sương mù.',
      'U ám, bí ẩn',
      ['Thành phố Ánh Sáng', 'Dãy núi Rồng Ngủ', 'Đền Cổ'],
      ['Elara'],
      ['wilderness', 'quest'],
    ),
    loc(
      'Thành phố Ánh Sáng',
      'Thành trì trắng, chợ đông và tin đồn quán rượu.',
      'Sôi động, hy vọng',
      ['Rừng sâu Bóng Đêm', 'Dãy núi Rồng Ngủ', 'Đền Cổ'],
      ['Aldric', 'Elara'],
      ['city', 'safe'],
    ),
    loc(
      'Dãy núi Rồng Ngủ',
      'Đỉnh tuyết và hang rỗng. Rồng cổ được đồn còn ngủ.',
      'Hoang vu',
      ['Rừng sâu Bóng Đêm', 'Thành phố Ánh Sáng', 'Vực thẳm Vô Tận'],
      ['Mira'],
      ['wilderness', 'dungeon'],
    ),
    loc(
      'Vực thẳm Vô Tận',
      'Vực tối — cổng địa ngục được đồn ở đáy.',
      'Kinh hoàng',
      ['Dãy núi Rồng Ngủ'],
      ['Legion'],
      ['dungeon', 'danger'],
    ),
    loc(
      'Đền Cổ',
      'Bàn thờ phát sáng, lời tiên tri khắc trên cột.',
      'Thánh thiện',
      ['Rừng sâu Bóng Đêm', 'Thành phố Ánh Sáng'],
      ['Mira'],
      ['sacred'],
    ),
  ];
  return {
    name: 'Vùng đất bóng tối',
    description: 'Thế giới mở fantasy: hiệp sĩ, phép thuật và quỷ vương. (Demo)',
    geography: locations.map((l) => l.name),
    locations,
    factions: [
      {
        name: 'Hiệp sĩ Bình minh',
        description: 'Bảo vệ ánh sáng và công lý.',
        goals: ['Đánh bại bóng tối', 'Bảo vệ người dân'],
      },
      {
        name: 'Hội Pháp sư',
        description: 'Am hiểu ma thuật cổ.',
        goals: ['Khám phá bí mật', 'Cân bằng thế giới'],
      },
      {
        name: 'Quỷ vương Legion',
        description: 'Phe bóng tối.',
        goals: ['Mở cổng địa ngục', 'Hủy diệt ánh sáng'],
      },
    ],
    magicSystem: 'Ma thuật nguyên tố và linh hồn',
    technologyLevel: 'Trung cổ phép thuật',
    timeline: [
      {
        id: uuidv4(),
        year: -1000,
        title: 'Thời đại các vị thần',
        description: 'Thần ban phép thuật.',
        important: true,
      },
      {
        id: uuidv4(),
        year: -500,
        title: 'Chiến tranh Rồng',
        description: 'Rồng tấn công vương quốc.',
        important: true,
      },
      {
        id: uuidv4(),
        year: 0,
        title: 'Hiệp ước Ánh Sáng',
        description: 'Liên minh chống bóng tối.',
        important: true,
      },
      {
        id: uuidv4(),
        year: 100,
        title: 'Sự trỗi dậy của Quỷ vương',
        description: 'Legion xâm lược.',
        important: true,
      },
      {
        id: uuidv4(),
        year: 200,
        title: 'Thanh kiếm thần',
        description: 'Lời tiên tri anh hùng.',
        important: true,
      },
    ],
    characters: [
      {
        id: uuidv4(),
        name: 'Aldric',
        role: 'Hiệp sĩ huyền thoại',
        faction: 'Hiệp sĩ Bình minh',
        description: 'Từng đánh bại rồng.',
      },
      {
        id: uuidv4(),
        name: 'Mira',
        role: 'Pháp sư',
        faction: 'Hội Pháp sư',
        description: 'Ma thuật ánh sáng.',
      },
      {
        id: uuidv4(),
        name: 'Legion',
        role: 'Quỷ vương',
        faction: 'Quỷ vương Legion',
        description: 'Thống trị địa ngục.',
      },
      { id: uuidv4(), name: 'Elara', role: 'Thương nhân bí ẩn', description: 'Bán tin và bản đồ.' },
    ],
    quests: [
      {
        id: uuidv4(),
        title: 'Tìm thanh kiếm thần',
        description: 'Kiếm ẩn trong rừng tối.',
        objective: 'Tìm kiếm trong Rừng sâu Bóng Đêm',
        status: 'active',
      },
      {
        id: uuidv4(),
        title: 'Đánh bại quân đoàn quỷ',
        description: 'Bảo vệ thành phố.',
        objective: 'Tiêu diệt 10 quỷ lính',
        status: 'active',
      },
      {
        id: uuidv4(),
        title: 'Giải cứu Mira',
        description: 'Mira bị bắt ở núi rồng.',
        objective: 'Đưa Mira về thành an toàn',
        status: 'active',
      },
    ],
  };
}

function buildDemoWorld(storyInput: string, sourceType: SourceType = 'story'): World {
  const genre = detectDemoGenre(storyInput, sourceType);
  const tpl = buildDemoTemplate(genre);
  return {
    id: uuidv4(),
    storyInput,
    ...tpl,
    description: `${tpl.description} Seed: "${storyInput.slice(0, 100)}${storyInput.length > 100 ? '…' : ''}"`,
    sourceType,
    createdAt: Date.now(),
  };
}

/** Exposed for tests. */
export function _detectDemoGenreForTest(
  story: string,
  sourceType: SourceType = 'story',
): DemoGenre {
  return detectDemoGenre(story, sourceType);
}

function normalizeLocations(raw: any[] | undefined, geography: string[]): Location[] {
  const MAX = 8;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.slice(0, MAX).map((loc: any) => ({
      id: uuidv4(),
      name: String(loc.name || 'Địa điểm lạ').slice(0, 80),
      description: String(loc.description || '').slice(0, 280),
      atmosphere: loc.atmosphere ? String(loc.atmosphere).slice(0, 60) : undefined,
      connections: Array.isArray(loc.connections) ? loc.connections.map(String).slice(0, 4) : [],
      npcs: Array.isArray(loc.npcs) ? loc.npcs.map(String).slice(0, 3) : [],
      tags: Array.isArray(loc.tags) ? loc.tags.map(String).slice(0, 4) : undefined,
    }));
  }
  // Fallback: turn geography strings into basic locations
  return geography.slice(0, MAX).map((name, i, arr) => ({
    id: uuidv4(),
    name: name.slice(0, 80),
    description: `Khu vực ${name} — có thể khám phá.`,
    connections: arr.filter((_, j) => j === i - 1 || j === i + 1).slice(0, 4),
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

  // Compact GM context — open-world without dumping the whole graph every turn
  const statsLine = formatStatsForContext(input.player.stats);
  const inventoryLine =
    input.player.inventory.length > 0
      ? input.player.inventory
          .slice(0, 8)
          .map((i) => `${i.name}×${i.quantity}`)
          .join(', ')
      : '—';
  const checkLine = input.check ? `\nCHECK: ${input.check.description}` : '';
  const locLine = location
    ? `\nLOC: ${location.name} | ${location.description.slice(0, 160)} | →${location.connections.slice(0, 4).join(', ')} | NPC:${location.npcs.slice(0, 3).join(', ') || '—'}`
    : '';
  const questLine =
    input.player.questLog?.length > 0
      ? `\nQUEST: ${input.player.questLog
          .slice(0, 4)
          .map((q) => {
            const wq = input.world.quests.find((x) => x.id === q.questId);
            return `${wq?.title || q.questId}[${q.status}]`;
          })
          .join('; ')}`
      : '';
  const memory =
    input.player.sceneSummaries?.length > 0
      ? `\nMEM: ${input.player.sceneSummaries.slice(-3).join(' | ')}`
      : '';

  const context = `WORLD: ${input.world.name} — ${(input.world.description || '').slice(0, 200)}\nFACTIONS: ${input.world.factions
    .slice(0, 4)
    .map((f) => f.name)
    .join(
      ', ',
    )}${locLine}\nPC: ${input.player.name} (${input.player.role}) ${statsLine}\nINV: ${inventoryLine}${questLine}${memory}${checkLine}\nACT: ${input.action}`;

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
