import type { TimelineEvent } from '../types';

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => a.year - b.year);
  return (
    <div className="timeline">
      {sorted.map((ev) => (
        <div key={ev.id} className={`timeline-item ${ev.important ? 'important' : ''}`}>
          <strong>Năm {ev.year}</strong>: {ev.title}
          <p style={{ color: 'var(--muted)', margin: '4px 0' }}>{ev.description}</p>
        </div>
      ))}
    </div>
  );
}
