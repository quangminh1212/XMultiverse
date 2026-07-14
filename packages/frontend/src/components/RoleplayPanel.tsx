import type { Player, ChatMessage, RoleplayResult } from '../types';

interface RoleplayPanelProps {
  player: Player | null;
  history: ChatMessage[];
  lastResult: RoleplayResult | null;
  loading: boolean;
  onAct: (action: string) => void;
  onPickChoice: (choice: string) => void;
  actionInput: string;
  setActionInput: (v: string) => void;
}

export function RoleplayPanel({
  player,
  history,
  lastResult,
  loading,
  onAct,
  onPickChoice,
  actionInput,
  setActionInput,
}: RoleplayPanelProps) {
  if (!player) return null;

  return (
    <div className="card">
      <p>
        Đang nhập vai: <strong>{player.name}</strong> — {player.role}
      </p>
      <div className="chat">
        {history.length === 0 && (
          <div className="message ai">Bạn đang đứng giữa thế giới. {player.currentScene}</div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <strong>{m.role === 'user' ? player.name : 'Game Master'}</strong>
            <p style={{ margin: '4px 0 0' }}>{m.content}</p>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAct(actionInput);
        }}
      >
        <input
          placeholder="Nhập hành động của bạn..."
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !actionInput.trim()} style={{ marginTop: 8 }}>
          {loading && <span className="spinner" />}
          Hành động
        </button>
      </form>
      {lastResult && lastResult.choices.length > 0 && (
        <div className="choices">
          {lastResult.choices.map((choice, idx) => (
            <button
              key={idx}
              type="button"
              className="secondary"
              onClick={() => onPickChoice(choice)}
            >
              {choice}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
