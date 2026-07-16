import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { SourceType, World, WorldScale } from '../types';

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
    async (
      story: string,
      sourceType: SourceType = 'story',
      scale: WorldScale = 'standard',
    ): Promise<World> => {
      setLoading(true);
      setError('');
      try {
        const world = await api.createWorld(story, sourceType, scale);
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

  const importWorld = useCallback(async (file: File): Promise<World> => {
    setLoading(true);
    setError('');
    try {
      const text = await file.text();
      const pack = JSON.parse(text);
      const world = await api.importWorld(pack);
      setWorlds((prev) => [world, ...prev]);
      return world;
    } catch (err: any) {
      setError(err.message || 'Import thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { worlds, loading, error, refresh, createWorld, removeWorld, importWorld, setError };
}
