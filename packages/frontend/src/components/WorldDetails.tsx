import type { Faction, Character, Quest } from '../types';

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

export function QuestList({ quests }: { quests: Quest[] }) {
  return (
    <div className="card">
      <div className="section-label">Nhiệm vụ</div>
      <h2>Quests</h2>
      {quests.map((q) => (
        <div
          key={q.id}
          style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}
        >
          <h3 style={{ marginBottom: 4 }}>⚔️ {q.title}</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 8 }}>
            {q.description}
          </p>
          <span className="tag">{q.objective}</span>
        </div>
      ))}
    </div>
  );
}
