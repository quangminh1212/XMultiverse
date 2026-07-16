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
}: {
  quests: Quest[];
  questLog?: QuestProgress[];
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
          </div>
        );
      })}
    </div>
  );
}

export function LocationMap({
  locations,
  currentLocationId,
  onTravel,
  canTravel,
  loading,
}: {
  locations: Location[];
  currentLocationId?: string;
  onTravel?: (locationId: string) => void;
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

  return (
    <div className="card">
      <div className="section-label">Thế giới mở</div>
      <h2>🗺️ Bản đồ địa điểm</h2>
      {current && (
        <p style={{ color: 'var(--accent3)', fontSize: '0.9rem', marginBottom: 16 }}>
          Đang ở: <strong>{current.name}</strong>
          {current.atmosphere ? ` — ${current.atmosphere}` : ''}
        </p>
      )}
      <div className="location-grid">
        {locations.map((loc) => {
          const isHere = loc.id === currentLocationId;
          const reachable =
            !current ||
            isHere ||
            current.connections.some(
              (c) => c.toLowerCase() === loc.name.toLowerCase() || c === loc.id,
            );
          return (
            <div
              key={loc.id}
              className={`location-card ${isHere ? 'here' : ''} ${reachable ? 'reachable' : 'locked'}`}
            >
              <div className="location-card-header">
                <h3>{loc.name}</h3>
                {isHere && <span className="badge">Bạn ở đây</span>}
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
