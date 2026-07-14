import type { Faction, Character, Quest } from '../types';

export function FactionList({ factions }: { factions: Faction[] }) {
  return (
    <div className="card">
      <h2>Phe phái</h2>
      {factions.map((f) => (
        <div key={f.name} style={{ marginBottom: 12 }}>
          <strong>{f.name}</strong>
          <p style={{ color: 'var(--muted)', margin: '4px 0' }}>{f.description}</p>
          {f.goals.map((g) => (
            <span key={g} className="badge">
              {g}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CharacterList({ characters }: { characters: Character[] }) {
  return (
    <div className="card">
      <h2>Nhân vật chính</h2>
      {characters.map((c) => (
        <div key={c.id} style={{ marginBottom: 12 }}>
          <strong>{c.name}</strong> <span className="badge">{c.role}</span>
          <p style={{ color: 'var(--muted)', margin: '4px 0' }}>{c.description}</p>
        </div>
      ))}
    </div>
  );
}

export function QuestList({ quests }: { quests: Quest[] }) {
  return (
    <div className="card">
      <h2>Nhiệm vụ</h2>
      {quests.map((q) => (
        <div key={q.id} style={{ marginBottom: 12 }}>
          <strong>{q.title}</strong>
          <p style={{ color: 'var(--muted)', margin: '4px 0' }}>{q.description}</p>
          <span className="badge">{q.objective}</span>
        </div>
      ))}
    </div>
  );
}
