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
    <div>
      <p style={{ marginBottom: 16, color: 'var(--text2)' }}>
        Đang nhập vai: <strong style={{ color: 'var(--text)' }}>{player.name}</strong> —{' '}
        {player.role}
        {player.faction && (
          <span className="badge" style={{ marginLeft: 8 }}>
            {player.faction}
          </span>
        )}
      </p>

      <div className="chat">
        {history.length === 0 && (
          <div className="message ai">
            <strong>Game Master</strong>
            <p>Bạn đang đứng giữa thế giới. {player.currentScene}</p>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <strong>{m.role === 'user' ? player.name : 'Game Master'}</strong>
            <p>{m.content}</p>
          </div>
        ))}
      </div>

      {/* Dice check result */}
      {lastResult?.check && (
        <div className={`check-banner ${lastResult.check.success ? 'success' : 'fail'}`}>
          <span className="check-banner-icon">
            {lastResult.check.roll === 20
              ? '🎯'
              : lastResult.check.roll === 1
                ? '💀'
                : lastResult.check.success
                  ? '✅'
                  : '❌'}
          </span>
          <span>{lastResult.check.description}</span>
        </div>
      )}

      {/* Stat effects */}
      {lastResult?.effects && lastResult.effects.length > 0 && (
        <div className="effects-banner">
          {lastResult.effects.map((eff, i) => (
            <span key={i} className={`effect-tag ${eff.delta > 0 ? 'pos' : 'neg'}`}>
              {eff.stat.toUpperCase()} {eff.delta > 0 ? '+' : ''}
              {eff.delta} — {eff.reason}
            </span>
          ))}
        </div>
      )}

      {/* XP gained */}
      {lastResult?.xpGained && lastResult.xpGained > 0 && (
        <div className="xp-banner">✨ +{lastResult.xpGained} XP</div>
      )}

      {/* Item changes */}
      {lastResult?.itemChanges && lastResult.itemChanges.length > 0 && (
        <div className="item-changes-banner">
          {lastResult.itemChanges.map((ic, i) => (
            <span key={i} className={`item-change-tag ${ic.action}`}>
              {ic.action === 'add' ? '📦 Nhận:' : '📉 Mất:'} {ic.item.name}
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAct(actionInput);
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            placeholder="Nhập hành động của bạn... (vd: tấn công quỷ, khám phá hang động, thuyết phục NPC)"
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !actionInput.trim()}>
            {loading && <span className="spinner" />}
            Hành động
          </button>
        </div>
      </form>

      {lastResult && lastResult.choices.length > 0 && (
        <div className="choices">
          {lastResult.choices.map((choice, idx) => (
            <button
              key={idx}
              type="button"
              className="choice-btn"
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
