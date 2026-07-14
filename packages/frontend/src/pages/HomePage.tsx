import { useState } from 'react';
import { useWorlds } from '../hooks/useWorlds';
import { WorldCard } from '../components/WorldCard';
import { WorldView } from './WorldView';
import { api } from '../services/api';
import type { World } from '../types';

export function HomePage() {
  const { worlds, loading, error, createWorld } = useWorlds();
  const [storyInput, setStoryInput] = useState('');
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const world = await createWorld(storyInput);
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
      {/* Create world section */}
      <section className="section container" id="create">
        <div className="section-label">Kiến tạo thế giới</div>
        <h2 className="section-title">Nhập cốt truyện của bạn</h2>
        <p className="section-subtitle" style={{ marginBottom: 32 }}>
          AI sẽ phân tích và tạo ra toàn bộ thế giới: geography, factions, magic, timeline,
          characters, quests.
        </p>

        {error && <div className="error">{error}</div>}

        <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
          <form onSubmit={handleCreate}>
            <textarea
              rows={5}
              placeholder="Ví dụ: Một hiệp sĩ lang thang tìm kiếm thanh kiếm thần để đánh bại quỷ vương đang xâm lược vương quốc..."
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
                {storyInput.trim().length > 0 ? `${storyInput.trim().length} ký tự` : ''}
              </span>
            </div>
          </form>
        </div>
      </section>

      {/* World list */}
      {worlds.length > 0 && (
        <section className="section container" id="worlds">
          <div className="section-label">Thế giới đã tạo</div>
          <h2 className="section-title">Your Multiverse</h2>
          <p className="section-subtitle" style={{ marginBottom: 32 }}>
            {worlds.length} thế giới đang chờ bạn bước vào.
          </p>
          <div className="world-list">
            {worlds.map((w) => (
              <WorldCard key={w.id} world={w} onClick={loadWorld} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
