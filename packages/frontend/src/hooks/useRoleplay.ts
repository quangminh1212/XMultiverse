import { useCallback, useState } from 'react';
import { api } from '../services/api';
import type { Player, RoleplayResult, ChatMessage } from '../types';

export function useRoleplay(worldId: string | null) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [lastResult, setLastResult] = useState<RoleplayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createPlayer = useCallback(
    async (form: { name: string; role: string; backstory: string; faction: string }) => {
      if (!worldId) return;
      setLoading(true);
      try {
        const p = await api.createPlayer(worldId, form);
        setPlayer(p);
        setHistory([]);
        setLastResult(null);
        return p;
      } finally {
        setLoading(false);
      }
    },
    [worldId],
  );

  const act = useCallback(
    async (action: string) => {
      if (!player) return;
      setLoading(true);
      setError('');
      try {
        const result = await api.act(player.id, action);
        setLastResult(result);
        setHistory((prev) => [
          ...prev,
          { role: 'user', content: action },
          { role: 'assistant', content: result.scene },
        ]);
        setPlayer({ ...player, currentScene: result.scene });
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [player],
  );

  const reset = useCallback(() => {
    setPlayer(null);
    setHistory([]);
    setLastResult(null);
    setError('');
  }, []);

  return { player, history, lastResult, loading, error, createPlayer, act, reset, setPlayer };
}
