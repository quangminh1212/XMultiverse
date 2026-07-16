import { useState } from 'react';
import { useWorlds } from '../hooks/useWorlds';
import { WorldCard } from '../components/WorldCard';
import { WorldView } from './WorldView';
import { api } from '../services/api';
import type { SourceType, World } from '../types';

const PRESETS: { label: string; type: SourceType; icon: string; story: string }[] = [
  {
    label: 'Hiệp sĩ & Quỷ vương',
    type: 'story',
    icon: '⚔️',
    story:
      'Một hiệp sĩ lang thang tìm kiếm thanh kiếm thần để đánh bại quỷ vương đang xâm lược vương quốc. Rừng tối, thành trì ánh sáng, và lời tiên tri cổ xưa dẫn đường.',
  },
  {
    label: 'Phim không gian',
    type: 'movie',
    icon: '🚀',
    story:
      'Lấy cảm hứng từ phim khoa học viễn tưởng: phi hành đoàn mắc kẹt trên hành tinh xa sau khi tàu hỏng. Có thuộc địa bí ẩn, AI nổi loạn, và cổng wormhole cổ đại.',
  },
  {
    label: 'Thế giới phép thuật',
    type: 'book',
    icon: '🪄',
    story:
      'Học viện phép thuật ẩn giữa sương mù. Học sinh mới phát hiện một cuốn grimoire bị cấm, mở ra chiến tranh giữa các nhà phù thủy và sinh vật cổ đại.',
  },
  {
    label: 'Anime mecha',
    type: 'anime',
    icon: '🤖',
    story:
      'Thành phố tương lai bị quái vật khổng lồ tấn công. Thiếu niên tình cờ kích hoạt mecha cổ đại và bị kéo vào cuộc chiến giữa liên minh phòng thủ và tổ chức bóng tối.',
  },
  {
    label: 'Noir đô thị',
    type: 'story',
    icon: '🕵️',
    story:
      'Thám tử tư tại thành phố mưa không bao giờ tạnh điều tra vụ mất tích liên quan đến băng đảng, chính trị gia tham nhũng, và một câu lạc bộ ngầm dưới lòng đất.',
  },
  {
    label: 'Hậu tận thế',
    type: 'movie',
    icon: '☢️',
    story:
      'Sau thảm họa, nhóm sống sót tìm trạm phát sóng cuối cùng. Sa mạc, khu bunker, phe cướp và một AI còn sót lại giữ chìa khóa nước sạch.',
  },
];

export function HomePage() {
  const { worlds, loading, error, createWorld, removeWorld } = useWorlds();
  const [storyInput, setStoryInput] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('story');
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const world = await createWorld(storyInput, sourceType);
      setCurrentWorld(world);
      setStoryInput('');
    } catch {
      /* error already set in hook */
    }
  }

  async function loadWorld(id: string) {
    const world = await api.getWorld(id);
    setCurrentWorld(world);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Xóa thế giới này? Hành động không thể hoàn tác.')) return;
    await removeWorld(id);
  }

  if (currentWorld) {
    return (
      <WorldView
        world={currentWorld}
        onWorldUpdated={setCurrentWorld}
        onBack={() => setCurrentWorld(null)}
      />
    );
  }

  return (
    <>
      <section className="section container" id="create">
        <div className="section-label">Kiến tạo thế giới mở</div>
        <h2 className="section-title">Từ cốt truyện hoặc phim</h2>
        <p className="section-subtitle" style={{ marginBottom: 32 }}>
          AI sinh geography, bản đồ địa điểm có thể du hành, factions, timeline, NPC, quests — rồi
          bạn bước vào khám phá.
        </p>

        {error && <div className="error">{error}</div>}

        <div className="preset-grid" style={{ marginBottom: 24 }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`preset-card ${storyInput === p.story ? 'active' : ''}`}
              onClick={() => {
                setStoryInput(p.story);
                setSourceType(p.type);
              }}
            >
              <span className="preset-icon">{p.icon}</span>
              <span className="preset-label">{p.label}</span>
              <span className="preset-type">{p.type}</span>
            </button>
          ))}
        </div>

        <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
          <form onSubmit={handleCreate}>
            <div className="source-type-row" style={{ marginBottom: 12 }}>
              {(['story', 'movie', 'book', 'anime', 'original'] as SourceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={sourceType === t ? 'tab-active' : 'tab'}
                  onClick={() => setSourceType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              rows={5}
              placeholder="Ví dụ: Một hiệp sĩ lang thang tìm kiếm thanh kiếm thần... hoặc tóm tắt phim bạn muốn biến thành thế giới mở."
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              required
            />
            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="submit" disabled={loading || !storyInput.trim()} className="lg">
                {loading && <span className="spinner" />}
                {loading ? 'Đang kiến tạo...' : 'Kiến tạo thế giới'}
              </button>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                {storyInput.trim().length > 0
                  ? `${storyInput.trim().length} ký tự · ${sourceType}`
                  : ''}
              </span>
            </div>
          </form>
        </div>
      </section>

      {worlds.length > 0 && (
        <section className="section container" id="worlds">
          <div className="section-label">Thế giới đã tạo</div>
          <h2 className="section-title">Your Multiverse</h2>
          <p className="section-subtitle" style={{ marginBottom: 32 }}>
            {worlds.length} thế giới đang chờ bạn bước vào.
          </p>
          <div className="world-list">
            {worlds.map((w) => (
              <div key={w.id} className="world-card-wrap">
                <WorldCard world={w} onClick={loadWorld} />
                <button
                  type="button"
                  className="ghost world-delete-btn"
                  onClick={(e) => handleDelete(w.id, e)}
                  title="Xóa thế giới"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
