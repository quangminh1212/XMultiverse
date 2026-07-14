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
      <p className="world-card-desc">{world.description}</p>
      <div className="world-card-meta">
        <span>📅 {created}</span>
        <span>🗺️ {world.geography.length} vùng</span>
        <span>👥 {world.characters.length} nhân vật</span>
      </div>
    </div>
  );
}
