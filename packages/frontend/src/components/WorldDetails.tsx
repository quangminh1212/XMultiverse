import type { Faction, Character, Quest, Location, QuestProgress } from '../types';

export function FactionList({ factions }: { factions: Faction[] }) {
  return (
    <div className="card">
      <div className="section-label">Phe phái</div>
      <h2>Factions</h2>
      {factions.map((f) => (
        <div
          key={f.name}
          style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}
        >
          <h3 style={{ marginBottom: 4 }}>{f.name}</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 8 }}>
            {f.description}
          </p>
          <div>
            {f.goals.map((g) => (
              <span key={g} className="badge">
                {g}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CharacterList({ characters }: { characters: Character[] }) {
  return (
    <div className="card">
      <div className="section-label">Nhân vật</div>
      <h2>Characters</h2>
      {characters.map((c) => (
        <div
          key={c.id}
          style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ marginBottom: 0 }}>{c.name}</h3>
            <span className="badge">{c.role}</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{c.description}</p>
        </div>
      ))}
    </div>
  );
}

export function QuestList({
  quests,
  questLog,
  onStatusChange,
}: {
  quests: Quest[];
  questLog?: QuestProgress[];
  onStatusChange?: (questId: string, status: 'active' | 'completed' | 'failed') => void;
}) {
  return (
    <div className="card">
      <div className="section-label">Nhiệm vụ</div>
      <h2>Quests</h2>
      {quests.map((q) => {
        const progress = questLog?.find((ql) => ql.questId === q.id);
        const status = progress?.status || q.status || 'available';
        return (
          <div
            key={q.id}
            style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ marginBottom: 0 }}>⚔️ {q.title}</h3>
              <span className={`badge quest-status-${status}`}>{status}</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 8 }}>
              {q.description}
            </p>
            <span className="tag">{q.objective}</span>
            {progress?.progress && (
              <p style={{ color: 'var(--accent3)', fontSize: '0.82rem', marginTop: 6 }}>
                Tiến độ: {progress.progress}
              </p>
            )}
            {onStatusChange && status !== 'completed' && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {status !== 'active' && (
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => onStatusChange(q.id, 'active')}
                  >
                    Nhận / Active
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => onStatusChange(q.id, 'completed')}
                >
                  ✓ Hoàn thành
                </button>
                <button
                  type="button"
                  className="ghost"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => onStatusChange(q.id, 'failed')}
                >
                  Thất bại
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LocationMap({
  locations,
  currentLocationId,
  visitedLocations,
  discoveryPercent,
  onTravel,
  onExplore,
  onTalkNpc,
  canTravel,
  loading,
}: {
  locations: Location[];
  currentLocationId?: string;
  visitedLocations?: string[];
  discoveryPercent?: number;
  onTravel?: (locationId: string) => void;
  onExplore?: () => void;
  onTalkNpc?: (npc: string) => void;
  canTravel?: boolean;
  loading?: boolean;
}) {
  if (!locations || locations.length === 0) {
    return (
      <div className="card">
        <div className="section-label">Bản đồ</div>
        <h2>Locations</h2>
        <p style={{ color: 'var(--muted)' }}>Chưa có địa điểm có thể khám phá.</p>
      </div>
    );
  }

  const current = locations.find((l) => l.id === currentLocationId);
  const visited = new Set(visitedLocations || []);

  return (
    <div className="card">
      <div className="section-label">Thế giới mở</div>
      <h2>🗺️ Bản đồ địa điểm</h2>
      {typeof discoveryPercent === 'number' && (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 8 }}>
          Khám phá: <strong style={{ color: 'var(--accent3)' }}>{discoveryPercent}%</strong> (
          {visited.size}/{locations.length} địa điểm)
        </p>
      )}
      {current && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: 'var(--accent3)', fontSize: '0.9rem', marginBottom: 8 }}>
            Đang ở: <strong>{current.name}</strong>
            {current.atmosphere ? ` — ${current.atmosphere}` : ''}
          </p>
          {canTravel && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {onExplore && (
                <button type="button" className="secondary" disabled={loading} onClick={onExplore}>
                  🔍 Khám phá nơi này
                </button>
              )}
              {onTalkNpc &&
                current.npcs?.slice(0, 2).map((npc) => (
                  <button
                    key={npc}
                    type="button"
                    className="ghost"
                    disabled={loading}
                    onClick={() => onTalkNpc(npc)}
                  >
                    💬 Nói với {npc}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
      <div className="location-grid">
        {locations.map((loc) => {
          const isHere = loc.id === currentLocationId;
          const isVisited = visited.has(loc.id);
          const reachable =
            !current ||
            isHere ||
            current.connections.some(
              (c) => c.toLowerCase() === loc.name.toLowerCase() || c === loc.id,
            );
          return (
            <div
              key={loc.id}
              className={`location-card ${isHere ? 'here' : ''} ${reachable ? 'reachable' : 'locked'} ${isVisited ? 'visited' : ''}`}
            >
              <div className="location-card-header">
                <h3>{loc.name}</h3>
                {isHere && <span className="badge">Bạn ở đây</span>}
                {!isHere && isVisited && <span className="badge">Đã khám phá</span>}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 8 }}>
                {loc.description}
              </p>
              {loc.npcs?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {loc.npcs.map((n) => (
                    <span key={n} className="badge">
                      👤 {n}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                {loc.connections.map((c) => (
                  <span key={c} className="tag">
                    → {c}
                  </span>
                ))}
              </div>
              {canTravel && onTravel && !isHere && reachable && (
                <button
                  type="button"
                  className="secondary"
                  disabled={loading}
                  onClick={() => onTravel(loc.id)}
                  style={{ marginTop: 4 }}
                >
                  {loading ? 'Đang đi...' : 'Du hành tới đây'}
                </button>
              )}
              {!isHere && !reachable && canTravel && (
                <span style={{ color: 'var(--dim)', fontSize: '0.78rem' }}>
                  Không có đường trực tiếp
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
