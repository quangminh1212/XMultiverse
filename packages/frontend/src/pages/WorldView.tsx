import { useEffect, useState } from 'react';
import type { World, Player, RoleplayResult, SaveSnapshot, ChatMessage } from '../types';
import { api } from '../services/api';
import { EventForm } from '../components/EventForm';
import { Timeline } from '../components/Timeline';
import {
  FactionList,
  CharacterList,
  QuestList,
  LocationMap,
} from '../components/WorldDetails';
import { RoleplayPanel } from '../components/RoleplayPanel';
import { StatsPanel } from '../components/StatsPanel';
import { InventoryPanel } from '../components/InventoryPanel';
import { RelationshipsPanel } from '../components/RelationshipsPanel';
import { DiceRoller } from '../components/DiceRoller';

interface WorldViewProps {
  world: World;
  onWorldUpdated: (world: World) => void;
  onBack: () => void;
}

type Tab = 'stats' | 'inventory' | 'relationships' | 'dice' | 'map' | 'saves';

export function WorldView({ world, onWorldUpdated, onBack }: WorldViewProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerForm, setPlayerForm] = useState({
    name: '',
    role: '',
    backstory: '',
    faction: '',
  });
  const [actionInput, setActionInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [lastResult, setLastResult] = useState<RoleplayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [saves, setSaves] = useState<SaveSnapshot[]>([]);

  useEffect(() => {
    fetchPlayers();
  }, [world.id]);

  async function fetchPlayers() {
    try {
      const data = await api.listPlayers(world.id);
      setPlayers(data);
    } catch {
      /* ignore */
    }
  }

  async function selectPlayer(p: Player) {
    setPlayer(p);
    setLastResult(null);
    setActiveTab('map');
    try {
      const hist = await api.getHistory(p.id);
      setHistory(
        hist
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content:
              m.role === 'assistant' && m.content.startsWith('{')
                ? (() => {
                    try {
                      return JSON.parse(m.content).scene || m.content;
                    } catch {
                      return m.content;
                    }
                  })()
                : m.content,
          })),
      );
      const list = await api.listSaves(p.id);
      setSaves(list);
    } catch {
      setHistory([]);
      setSaves([]);
    }
  }

  async function createPlayer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const p = await api.createPlayer(world.id, playerForm);
      setPlayerForm({ name: '', role: '', backstory: '', faction: '' });
      await fetchPlayers();
      await selectPlayer(p);
    } catch (err: any) {
      setError(err.message);
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
      if (result.player) {
        setPlayer(result.player);
      } else {
        setPlayer({ ...player, currentScene: result.scene });
      }
      setActionInput('');
      const updated = await api.getWorld(world.id);
      onWorldUpdated(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTravel(locationId: string) {
    if (!player) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.travel(player.id, locationId);
      setPlayer(result.player);
      setLastResult(result);
      setHistory([
        ...history,
        { role: 'user', content: `Di chuyển tới ${result.location?.name || 'địa điểm mới'}` },
        { role: 'assistant', content: result.scene },
      ]);
      setActiveTab('map');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!player) return;
    const name = prompt('Tên save:', `Save ${new Date().toLocaleString('vi-VN')}`);
    if (!name) return;
    try {
      await api.createSave(player.id, name);
      const list = await api.listSaves(player.id);
      setSaves(list);
      alert('Đã lưu!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  }

  async function handleLoad(saveId: string) {
    if (!confirm('Load save này? Tiến độ hiện tại sẽ bị ghi đè.')) return;
    setLoading(true);
    try {
      const data = await api.loadSave(saveId);
      onWorldUpdated(data.world);
      setPlayer(data.player);
      setHistory(
        data.chatHistory
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content:
              m.role === 'assistant' && m.content.startsWith('{')
                ? (() => {
                    try {
                      return JSON.parse(m.content).scene || m.content;
                    } catch {
                      return m.content;
                    }
                  })()
                : m.content,
          })),
      );
      setLastResult(null);
      alert('Đã load save!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSave(saveId: string) {
    await api.deleteSave(saveId);
    if (player) setSaves(await api.listSaves(player.id));
  }

  const currentLocName =
    world.locations?.find((l) => l.id === player?.currentLocationId)?.name ||
    (player ? 'Chưa xác định' : undefined);

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <button className="secondary back-btn" onClick={onBack}>
          ← Quay lại danh sách
        </button>
        <div className="section-label">
          Thế giới mở{world.sourceType ? ` · ${world.sourceType}` : ''}
        </div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>{world.name}</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 20 }}>{world.description}</p>

        <div className="detail-row">
          <strong>🗺️ Địa lý:</strong>
          {(world.geography || []).map((g) => (
            <span key={g} className="tag">
              {g}
            </span>
          ))}
        </div>
        <div className="detail-row">
          <strong>📍 Địa điểm khám phá:</strong> {world.locations?.length || 0} locations
        </div>
        <div className="detail-row">
          <strong>✨ Magic:</strong> {world.magicSystem || 'Không có'}
        </div>
        <div className="detail-row">
          <strong>⚙️ Công nghệ:</strong> {world.technologyLevel || 'Bình thường'}
        </div>
      </div>

      {/* Open world map always visible */}
      <LocationMap
        locations={world.locations || []}
        currentLocationId={player?.currentLocationId}
        onTravel={player ? handleTravel : undefined}
        canTravel={!!player}
        loading={loading}
      />

      <div className="grid-2">
        <FactionList factions={world.factions} />
        <CharacterList characters={world.characters} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>📅 Dòng thời gian</h2>
          <Timeline events={world.timeline} />
          <EventForm world={world} onUpdated={onWorldUpdated} />
        </div>
        <QuestList quests={world.quests} questLog={player?.questLog} />
      </div>

      <div className="card">
        <div className="section-label">Nhập vai & khám phá</div>
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
                    onClick={() => selectPlayer(p)}
                    style={{ marginRight: 8, marginBottom: 8 }}
                  >
                    {p.name} — {p.role} (Lv{p.stats?.level || 1})
                  </button>
                ))}
              </div>
            )}
          </form>
        ) : (
          <>
            <p style={{ color: 'var(--text2)', marginBottom: 12 }}>
              <strong style={{ color: 'var(--text)' }}>{player.name}</strong> · {player.role}
              {currentLocName && (
                <span className="badge" style={{ marginLeft: 8 }}>
                  📍 {currentLocName}
                </span>
              )}
            </p>

            <div className="tab-nav">
              {(
                [
                  ['map', '🗺️ Map'],
                  ['stats', '📊 Stats'],
                  ['inventory', `🎒 Túi đồ (${player.inventory?.length || 0})`],
                  [
                    'relationships',
                    `🤝 NPCs (${Object.keys(player.relationships || {}).length})`,
                  ],
                  ['dice', '🎲 Dice'],
                  ['saves', `💾 Saves (${saves.length})`],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={activeTab === id ? 'tab-active' : 'tab'}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
              <button className="tab save-btn" onClick={handleSave}>
                💾 Save now
              </button>
              <button className="tab ghost" onClick={() => setPlayer(null)}>
                Đổi NV
              </button>
            </div>

            {activeTab === 'map' && (
              <LocationMap
                locations={world.locations || []}
                currentLocationId={player.currentLocationId}
                onTravel={handleTravel}
                canTravel
                loading={loading}
              />
            )}
            {activeTab === 'stats' && player.stats && <StatsPanel stats={player.stats} />}
            {activeTab === 'inventory' && (
              <InventoryPanel player={player} onUpdate={setPlayer} />
            )}
            {activeTab === 'relationships' && (
              <RelationshipsPanel relationships={player.relationships || {}} />
            )}
            {activeTab === 'dice' && <DiceRoller playerId={player.id} />}
            {activeTab === 'saves' && (
              <div className="saves-panel">
                {saves.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>Chưa có save. Nhấn Save now để lưu.</p>
                ) : (
                  saves.map((s) => (
                    <div key={s.id} className="save-row">
                      <div>
                        <strong>{s.name}</strong>
                        <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                          {new Date(s.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => handleLoad(s.id)}
                          disabled={loading}
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleDeleteSave(s.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
