import { useEffect, useState } from 'react';
import { useWorlds } from '../hooks/useWorlds';
import { WorldCard } from '../components/WorldCard';
import { PlatformPanel } from '../components/PlatformPanel';
import { WorldView } from './WorldView';
import { api } from '../services/api';
import type { SourceType, World, WorldScale } from '../types';

const DEFAULT_SCALES: { id: WorldScale; label: string; hint: string }[] = [
  { id: 'compact', label: 'Compact', hint: '~5 địa điểm' },
  { id: 'standard', label: 'Standard', hint: '~8 địa điểm' },
  { id: 'expansive', label: 'Expansive', hint: '~16 địa điểm' },
  { id: 'epic', label: 'Epic', hint: '~28 địa điểm' },
];

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
  const { worlds, loading, error, createWorld, removeWorld, importWorld } = useWorlds();
  const [storyInput, setStoryInput] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('story');
  const [scale, setScale] = useState<WorldScale>('standard');
  const [scales, setScales] = useState(DEFAULT_SCALES);
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .getConfig()
      .then((cfg) => {
        if (cfg.defaultScale) setScale(cfg.defaultScale as WorldScale);
        if (cfg.scales?.length) {
          setScales(
            cfg.scales
              .filter((s) => s.id !== 'custom')
              .map((s) => ({
                id: s.id as WorldScale,
                label: s.label,
                hint: `~${s.locationsTarget} địa điểm (max ${s.locationsMax})`,
              })),
          );
        }
      })
      .catch(() => {
        /* keep defaults when backend offline */
      });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const world = await createWorld(storyInput, sourceType, scale);
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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const world = await importWorld(file);
      setCurrentWorld(world);
    } catch {
      /* error in hook */
    }
    e.target.value = '';
  }

  const filtered = worlds.filter((w) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.description?.toLowerCase().includes(q) ||
      w.sourceType?.toLowerCase().includes(q) ||
      w.storyInput?.toLowerCase().includes(q)
    );
  });

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
            <div className="source-type-row" style={{ marginBottom: 12 }}>
              {scales.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={scale === s.id ? 'tab-active' : 'tab'}
                  onClick={() => setScale(s.id)}
                  title={s.hint}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 12 }}>
              Open-world scale: <strong>{scale}</strong> —{' '}
              {scales.find((s) => s.id === scale)?.hint}. Module hóa + feature flags trên backend.
            </p>
            <textarea
              rows={5}
              placeholder="Ví dụ: Một hiệp sĩ lang thang tìm kiếm thanh kiếm thần... hoặc tóm tắt phim bạn muốn biến thành thế giới mở."
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              required
            />
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button type="submit" disabled={loading || !storyInput.trim()} className="lg">
                {loading && <span className="spinner" />}
                {loading ? 'Đang kiến tạo...' : 'Kiến tạo thế giới'}
              </button>
              <label
                className="secondary"
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'inline-block',
                }}
              >
                📥 Import world JSON
                <input type="file" accept="application/json,.json" hidden onChange={handleImport} />
              </label>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                {storyInput.trim().length > 0
                  ? `${storyInput.trim().length} ký tự · ${sourceType} · ${scale}`
                  : ''}
              </span>
            </div>
          </form>
        </div>
      </section>

      <PlatformPanel
        onInstalledWorld={async (id) => {
          try {
            const w = await api.getWorld(id);
            setCurrentWorld(w);
          } catch {
            /* ignore */
          }
        }}
      />

      {worlds.length > 0 && (
        <section className="section container" id="worlds">
          <div className="section-label">Thế giới đã tạo</div>
          <h2 className="section-title">Your Multiverse</h2>
          <p className="section-subtitle" style={{ marginBottom: 16 }}>
            {worlds.length} thế giới · hiển thị {filtered.length}
          </p>
          <input
            type="search"
            placeholder="Tìm theo tên, mô tả, sourceType..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 420, marginBottom: 24 }}
          />
          <div className="world-list">
            {filtered.map((w) => (
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
