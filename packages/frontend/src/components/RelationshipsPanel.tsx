import type { NPCDisposition } from '../types';

interface RelationshipsPanelProps {
  relationships: Record<string, NPCDisposition>;
}

function getDispositionLabel(d: NPCDisposition): string {
  const avg = (d.trust + d.respect + d.friendship) / 3;
  if (d.fear > 50) return 'Kinh sợ';
  if (avg > 60) return 'Thân thiết';
  if (avg > 20) return 'Thân thiện';
  if (avg > -20) return 'Trung lập';
  if (avg > -60) return 'Thù ghét';
  return 'Kẻ thù';
}

function getDispositionColor(d: NPCDisposition): string {
  const avg = (d.trust + d.respect + d.friendship) / 3;
  if (d.fear > 50) return '#f59e0b';
  if (avg > 60) return '#22c55e';
  if (avg > 20) return '#4ade80';
  if (avg > -20) return '#7a8094';
  if (avg > -60) return '#f87171';
  return '#ef4444';
}

function DispositionBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = (Math.abs(value) / 100) * 50;
  const isPositive = value >= 0;
  return (
    <div className="disp-bar-wrap">
      <span className="disp-bar-label">{label}</span>
      <div className="disp-bar-track">
        <div className="disp-bar-center" />
        <div
          className="disp-bar-fill"
          style={{
            width: `${pct}%`,
            background: color,
            left: isPositive ? '50%' : `${50 - pct}%`,
          }}
        />
      </div>
      <span className="disp-bar-value">{value}</span>
    </div>
  );
}

export function RelationshipsPanel({ relationships }: RelationshipsPanelProps) {
  const npcNames = Object.keys(relationships);

  return (
    <div className="card relationships-panel">
      <div className="section-label">Mối quan hệ</div>
      <h2>🤝 NPCs</h2>

      {npcNames.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Chưa có mối quan hệ nào. Tương tác với NPCs để xây dựng quan hệ.
        </p>
      ) : (
        <div className="rel-list">
          {npcNames.map((name) => {
            const d = relationships[name];
            const color = getDispositionColor(d);
            return (
              <div key={name} className="rel-item">
                <div className="rel-header">
                  <span className="rel-name">{name}</span>
                  <span className="rel-status" style={{ color, borderColor: color }}>
                    {getDispositionLabel(d)}
                  </span>
                </div>
                <div className="rel-bars">
                  <DispositionBar label="Trust" value={d.trust} color="#22c55e" />
                  <DispositionBar label="Respect" value={d.respect} color="#3b82f6" />
                  <DispositionBar label="Friend" value={d.friendship} color="#a78bfa" />
                  <DispositionBar label="Fear" value={d.fear} color="#f59e0b" />
                </div>
                {d.notes.length > 0 && (
                  <div className="rel-notes">
                    {d.notes.slice(-3).map((note, i) => (
                      <p key={i} className="rel-note">
                        • {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
