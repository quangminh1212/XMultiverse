import { useState } from 'react';
import type { World, Player } from '../types';
import { api } from '../services/api';
import { EventForm } from '../components/EventForm';
import { Timeline } from '../components/Timeline';
import { FactionList, CharacterList, QuestList } from '../components/WorldDetails';
import { RoleplayPanel } from '../components/RoleplayPanel';

interface WorldViewProps {
  world: World;
  onWorldUpdated: (world: World) => void;
  onBack: () => void;
}

export function WorldView({ world, onWorldUpdated, onBack }: WorldViewProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerForm, setPlayerForm] = useState({ name: '', role: '', backstory: '', faction: '' });
  const [actionInput, setActionInput] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [lastResult, setLastResult] = useState<{
    scene: string;
    events: string[];
    choices: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchPlayers() {
    const data = await api.listPlayers(world.id);
    setPlayers(data);
  }

  async function createPlayer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await api.createPlayer(world.id, playerForm);
      setPlayer(p);
      setHistory([]);
      setLastResult(null);
      fetchPlayers();
      setPlayerForm({ name: '', role: '', backstory: '', faction: '' });
    } finally {
      setLoading(false);
    }
  }

  async function act(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!player || !actionInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.act(player.id, actionInput);
      setLastResult(result);
      setHistory([
        ...history,
        { role: 'user', content: actionInput },
        { role: 'assistant', content: result.scene },
      ]);
      setPlayer({ ...player, currentScene: result.scene });
      setActionInput('');
      const updated = await api.getWorld(world.id);
      onWorldUpdated(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      {error && <div className="error">{error}</div>}

      {/* World header */}
      <div className="card">
        <button className="secondary back-btn" onClick={onBack}>
          ← Quay lại danh sách
        </button>
        <div className="section-label">Thế giới</div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>{world.name}</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 20 }}>{world.description}</p>

        <div className="detail-row">
          <strong>🗺️ Địa lý:</strong>
          {world.geography.map((g) => (
            <span key={g} className="tag">
              {g}
            </span>
          ))}
        </div>
        <div className="detail-row">
          <strong>✨ Magic:</strong> {world.magicSystem || 'Không có'}
        </div>
        <div className="detail-row">
          <strong>⚙️ Công nghệ:</strong> {world.technologyLevel || 'Bình thường'}
        </div>
      </div>

      {/* Factions + Characters */}
      <div className="grid-2">
        <FactionList factions={world.factions} />
        <CharacterList characters={world.characters} />
      </div>

      {/* Timeline + Quests */}
      <div className="grid-2">
        <div className="card">
          <h2>📅 Dòng thời gian</h2>
          <Timeline events={world.timeline} />
          <EventForm world={world} onUpdated={onWorldUpdated} />
        </div>
        <QuestList quests={world.quests} />
      </div>

      {/* Roleplay */}
      <div className="card">
        <div className="section-label">Nhập vai</div>
        <h2>Tham gia thế giới</h2>
        {!player ? (
          <form onSubmit={createPlayer}>
            <div className="grid-2" style={{ gap: 12 }}>
              <input
                placeholder="Tên nhân vật"
                value={playerForm.name}
                onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                required
              />
              <input
                placeholder="Vai trò (kiếm sĩ, pháp sư...)"
                value={playerForm.role}
                onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}
                required
              />
            </div>
            <input
              placeholder="Phe phái (tùy chọn)"
              value={playerForm.faction}
              onChange={(e) => setPlayerForm({ ...playerForm, faction: e.target.value })}
              style={{ marginTop: 12 }}
            />
            <textarea
              placeholder="Tiểu sử nhân vật"
              value={playerForm.backstory}
              onChange={(e) => setPlayerForm({ ...playerForm, backstory: e.target.value })}
              style={{ marginTop: 12 }}
              rows={2}
            />
            <button type="submit" disabled={loading} className="lg" style={{ marginTop: 16 }}>
              {loading && <span className="spinner" />}
              Bước vào thế giới
            </button>
            {players.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 8 }}>
                  Hoặc chọn nhân vật cũ:
                </p>
                {players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setPlayer(p);
                      setHistory([]);
                    }}
                    style={{ marginRight: 8, marginBottom: 8 }}
                  >
                    {p.name} — {p.role}
                  </button>
                ))}
              </div>
            )}
          </form>
        ) : (
          <RoleplayPanel
            player={player}
            history={history}
            lastResult={lastResult}
            loading={loading}
            onAct={() => act()}
            onPickChoice={(c) => setActionInput(c)}
            actionInput={actionInput}
            setActionInput={setActionInput}
          />
        )}
      </div>
    </div>
  );
}
