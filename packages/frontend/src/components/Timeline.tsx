import type { TimelineEvent } from '../types';

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => a.year - b.year);
  return (
    <div className="timeline">
      {sorted.map((ev) => (
        <div key={ev.id} className={`timeline-item ${ev.important ? 'important' : ''}`}>
          <div className="timeline-year">Năm {ev.year}</div>
          <div className="timeline-title">{ev.title}</div>
          <div className="timeline-desc">{ev.description}</div>
        </div>
      ))}
    </div>
  );
}
