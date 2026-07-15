import type { PlayerStats } from '../types';

interface StatsPanelProps {
  stats: PlayerStats;
}

function StatBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="stat-bar-wrap">
      <div className="stat-bar-label">
        <span>{label}</span>
        <span className="stat-bar-value">
          {current}/{max}
        </span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function AttrRow({ label, value, icon }: { label: string; value: number; icon: string }) {
  const mod = Math.floor((value - 10) / 2);
  return (
    <div className="attr-row">
      <span className="attr-icon">{icon}</span>
      <span className="attr-label">{label}</span>
      <span className="attr-value">{value}</span>
      {mod !== 0 && (
        <span className={`attr-mod ${mod > 0 ? 'pos' : 'neg'}`}>
          {mod > 0 ? '+' : ''}
          {mod}
        </span>
      )}
    </div>
  );
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const xpPct = (stats.xp / stats.xpToNext) * 100;

  return (
    <div className="card stats-panel">
      <div className="section-label">Nhân vật</div>
      <h2>📊 Chỉ số</h2>

      <div className="level-badge">
        <span className="level-num">Lv {stats.level}</span>
        <div className="xp-bar-wrap">
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="xp-text">
            XP {stats.xp}/{stats.xpToNext}
          </span>
        </div>
      </div>

      <div className="stat-bars">
        <StatBar
          label="HP"
          current={stats.hp}
          max={stats.maxHp}
          color="linear-gradient(90deg, #ef4444, #f87171)"
        />
        <StatBar
          label="MP"
          current={stats.mp}
          max={stats.maxMp}
          color="linear-gradient(90deg, #3b82f6, #60a5fa)"
        />
      </div>

      <div className="attr-grid">
        <AttrRow label="Sức mạnh" value={stats.strength} icon="💪" />
        <AttrRow label="Nhanh nhẹn" value={stats.agility} icon="🏃" />
        <AttrRow label="Trí tuệ" value={stats.intelligence} icon="🧠" />
        <AttrRow label="Quyến rũ" value={stats.charisma} icon="✨" />
        <AttrRow label="May mắn" value={stats.luck} icon="🍀" />
      </div>
    </div>
  );
}
