import { useState } from 'react';
import type { DiceCheckResult } from '../types';
import { api } from '../services/api';

interface DiceRollerProps {
  playerId?: string;
  onCheckResult?: (result: DiceCheckResult) => void;
}

export function DiceRoller({ playerId, onCheckResult }: DiceRollerProps) {
  const [notation, setNotation] = useState('1d20');
  const [result, setResult] = useState<{ notation: string; result: number } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [checkResult, setCheckResult] = useState<DiceCheckResult | null>(null);
  const [stat, setStat] = useState('strength');
  const [dc, setDc] = useState(12);

  async function handleRoll() {
    setRolling(true);
    try {
      const res = await api.roll(notation);
      setResult(res);
    } finally {
      setRolling(false);
    }
  }

  async function handleCheck() {
    if (!playerId) return;
    setRolling(true);
    try {
      const res = await api.skillCheck(playerId, stat, dc);
      setCheckResult(res);
      onCheckResult?.(res);
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="card dice-panel">
      <div className="section-label">Xúc xắc</div>
      <h2>🎲 Dice Roller</h2>

      <div className="dice-section">
        <h4>Roll nhanh</h4>
        <div className="dice-input-row">
          <input
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            placeholder="1d20, 3d6, 2d10..."
            className="dice-input"
          />
          <button onClick={handleRoll} disabled={rolling}>
            {rolling ? <span className="spinner" /> : 'Roll!'}
          </button>
        </div>
        {result && (
          <div className="dice-result">
            <span className="dice-notation">{result.notation}</span>
            <span className="dice-equals">=</span>
            <span className="dice-value">{result.result}</span>
          </div>
        )}
      </div>

      {playerId && (
        <div
          className="dice-section"
          style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}
        >
          <h4>Skill Check (1d20 + modifier vs DC)</h4>
          <div className="dice-input-row">
            <select value={stat} onChange={(e) => setStat(e.target.value)} className="dice-select">
              <option value="strength">💪 Sức mạnh</option>
              <option value="agility">🏃 Nhanh nhẹn</option>
              <option value="intelligence">🧠 Trí tuệ</option>
              <option value="charisma">✨ Quyến rũ</option>
              <option value="luck">🍀 May mắn</option>
            </select>
            <input
              type="number"
              value={dc}
              onChange={(e) => setDc(parseInt(e.target.value) || 12)}
              min="1"
              max="30"
              className="dice-dc"
            />
            <button onClick={handleCheck} disabled={rolling}>
              {rolling ? <span className="spinner" /> : 'Check!'}
            </button>
          </div>
          {checkResult && (
            <div
              className={`check-result ${checkResult.success ? 'success' : 'fail'} ${checkResult.roll === 20 ? 'crit' : ''} ${checkResult.roll === 1 ? 'fumble' : ''}`}
            >
              <div className="check-roll-display">
                <span className="check-roll-num">{checkResult.roll}</span>
                <span className="check-modifier">+ {checkResult.modifier}</span>
                <span className="check-equals">=</span>
                <span className="check-total">{checkResult.total}</span>
                <span className="check-vs">vs DC {checkResult.dc}</span>
              </div>
              <p className="check-desc">{checkResult.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
