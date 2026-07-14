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
    <>
      {error && <div className="card error">{error}</div>}

      <div className="card">
        <button className="secondary" onClick={onBack} style={{ marginBottom: 12 }}>
          ← Quay lại danh sách
        </button>
        <h2>{world.name}</h2>
        <p>{world.description}</p>
        <div style={{ marginTop: 12 }}>
          <strong>Địa lý:</strong>
          {world.geography.map((g) => (
            <span key={g} className="tag">
              {g}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Hệ thống sức mạnh:</strong> {world.magicSystem || 'Không có'}
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Công nghệ:</strong> {world.technologyLevel || 'Bình thường'}
        </div>
      </div>

      <div className="grid-2">
        <FactionList factions={world.factions} />
        <CharacterList characters={world.characters} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Dòng thời gian</h2>
          <Timeline events={world.timeline} />
          <EventForm world={world} onUpdated={onWorldUpdated} />
        </div>
        <QuestList quests={world.quests} />
      </div>

      <div className="card">
        <h2>Tham gia thế giới</h2>
        {!player ? (
          <form onSubmit={createPlayer}>
            <input
              placeholder="Tên nhân vật"
              value={playerForm.name}
              onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
              required
            />
            <input
              placeholder="Vai trò (ví dụ: kiếm sĩ, pháp sư, thương nhân)"
              value={playerForm.role}
              onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}
              required
              style={{ marginTop: 8 }}
            />
            <input
              placeholder="Phe phái (tùy chọn)"
              value={playerForm.faction}
              onChange={(e) => setPlayerForm({ ...playerForm, faction: e.target.value })}
              style={{ marginTop: 8 }}
            />
            <textarea
              placeholder="Tiểu sử nhân vật"
              value={playerForm.backstory}
              onChange={(e) => setPlayerForm({ ...playerForm, backstory: e.target.value })}
              style={{ marginTop: 8 }}
              rows={2}
            />
            <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
              Bước vào thế giới
            </button>
            {players.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p>Hoặc chọn nhân vật cũ:</p>
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
                    {p.name}
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
    </>
  );
}
