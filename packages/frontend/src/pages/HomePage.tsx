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
      /* error đã được set trong hook */
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
      {error && <div className="card error">{error}</div>}

      <div className="card">
        <h2>Tạo thế giới mới</h2>
        <form onSubmit={handleCreate}>
          <textarea
            rows={4}
            placeholder="Nhập cốt truyện hoặc mô tả câu chuyện của bạn ở đây..."
            value={storyInput}
            onChange={(e) => setStoryInput(e.target.value)}
            required
          />
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={loading || !storyInput.trim()}>
              {loading && <span className="spinner" />}
              Kiến tạo thế giới
            </button>
          </div>
        </form>
      </div>

      {worlds.length > 0 && (
        <div className="card">
          <h2>Các thế giới đã tạo</h2>
          <div className="world-list">
            {worlds.map((w) => (
              <WorldCard key={w.id} world={w} onClick={loadWorld} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
