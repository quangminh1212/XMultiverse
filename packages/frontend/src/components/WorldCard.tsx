import type { World } from '../types';

interface WorldCardProps {
  world: World;
  onClick: (id: string) => void;
}

export function WorldCard({ world, onClick }: WorldCardProps) {
  const created = world.createdAt
    ? new Date(world.createdAt).toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="world-card" onClick={() => onClick(world.id)}>
      <h3>{world.name}</h3>
      {world.sourceType && <span className="badge">{world.sourceType}</span>}
      {world.scale && <span className="badge">{world.scale}</span>}
      <p className="world-card-desc">{world.description}</p>
      <div className="world-card-meta">
        <span>📅 {created}</span>
        <span>📍 {world.locations?.length || world.geography?.length || 0} địa điểm</span>
        <span>👥 {world.characters?.length || 0} NV</span>
        <span>⚔️ {world.quests?.length || 0} quest</span>
      </div>
    </div>
  );
}
