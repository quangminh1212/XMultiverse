import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { SourceType, World } from '../types';

export function useWorlds() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await api.listWorlds();
      setWorlds(data);
    } catch {
      setError('Không thể kết nối backend. Hãy chắc chắn server đang chạy.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createWorld = useCallback(
    async (story: string, sourceType: SourceType = 'story'): Promise<World> => {
      setLoading(true);
      setError('');
      try {
        const world = await api.createWorld(story, sourceType);
        setWorlds((prev) => [world, ...prev]);
        return world;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const removeWorld = useCallback(async (id: string) => {
    await api.deleteWorld(id);
    setWorlds((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return { worlds, loading, error, refresh, createWorld, removeWorld, setError };
}
