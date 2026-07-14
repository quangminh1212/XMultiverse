import type { World } from '../types';

interface WorldCardProps {
  world: World;
  onClick: (id: string) => void;
}

export function WorldCard({ world, onClick }: WorldCardProps) {
  return (
    <div className="world-card" onClick={() => onClick(world.id)}>
      <h3>{world.name}</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        {world.description.slice(0, 100)}...
      </p>
    </div>
  );
}
