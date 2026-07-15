import { useState } from 'react';
import type { Player, ItemType } from '../types';
import { api } from '../services/api';

interface InventoryPanelProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

const typeIcons: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  potion: '🧪',
  key: '🔑',
  misc: '📦',
  quest: '📜',
};

const typeColors: Record<string, string> = {
  weapon: '#ef4444',
  armor: '#3b82f6',
  potion: '#22c55e',
  key: '#f59e0b',
  misc: '#7a8094',
  quest: '#8b5cf6',
};

export function InventoryPanel({ player, onUpdate }: InventoryPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<{
    name: string;
    description: string;
    type: ItemType;
    quantity: number;
  }>({ name: '', description: '', type: 'misc', quantity: 1 });
  const [using, setUsing] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name) return;
    const updated = await api.addItem(player.id, newItem);
    onUpdate(updated);
    setNewItem({ name: '', description: '', type: 'misc', quantity: 1 });
    setShowAdd(false);
  }

  async function handleRemove(itemId: string) {
    const updated = await api.removeItem(player.id, itemId);
    onUpdate(updated);
  }

  async function handleUse(itemId: string) {
    setUsing(itemId);
    try {
      const { player: updated } = await api.useItem(player.id, itemId);
      onUpdate(updated);
    } finally {
      setUsing(null);
    }
  }

  return (
    <div className="card inventory-panel">
      <div className="section-label">Túi đồ</div>
      <h2>🎒 Inventory ({player.inventory.length})</h2>

      {player.inventory.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Túi đồ trống. Khám phá thế giới để tìm vật phẩm!
        </p>
      ) : (
        <div className="inventory-grid">
          {player.inventory.map((item) => (
            <div
              key={item.id}
              className="inv-item"
              style={{ borderLeftColor: typeColors[item.type] }}
            >
              <div className="inv-item-header">
                <span className="inv-icon">{typeIcons[item.type] || '📦'}</span>
                <span className="inv-name">{item.name}</span>
                {item.quantity > 1 && <span className="inv-qty">x{item.quantity}</span>}
              </div>
              <p className="inv-desc">{item.description}</p>
              {item.effects && item.effects.length > 0 && (
                <div className="inv-effects">
                  {item.effects.map((eff, i) => (
                    <span key={i} className="inv-effect-tag">
                      {eff.stat} {eff.modifier > 0 ? '+' : ''}
                      {eff.modifier}
                    </span>
                  ))}
                </div>
              )}
              <div className="inv-actions">
                {item.effects && item.effects.length > 0 && (
                  <button
                    className="ghost inv-btn"
                    onClick={() => handleUse(item.id)}
                    disabled={using === item.id}
                  >
                    {using === item.id ? <span className="spinner" /> : 'Sử dụng'}
                  </button>
                )}
                <button className="ghost inv-btn danger" onClick={() => handleRemove(item.id)}>
                  Vứt bỏ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <form onSubmit={handleAdd} className="inv-add-form">
          <input
            placeholder="Tên vật phẩm"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            required
          />
          <div className="grid-2" style={{ gap: 12, marginTop: 8 }}>
            <select
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value as ItemType })}
              className="inv-select"
            >
              <option value="weapon">⚔️ Vũ khí</option>
              <option value="armor">🛡️ Giáp</option>
              <option value="potion">🧪 Thuốc</option>
              <option value="key">🔑 Chìa khóa</option>
              <option value="quest">📜 Nhiệm vụ</option>
              <option value="misc">📦 Khác</option>
            </select>
            <input
              type="number"
              min="1"
              placeholder="Số lượng"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
          <input
            placeholder="Mô tả"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            style={{ marginTop: 8 }}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="submit">Thêm</button>
            <button type="button" className="secondary" onClick={() => setShowAdd(false)}>
              Hủy
            </button>
          </div>
        </form>
      ) : (
        <button className="ghost" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
          + Thêm vật phẩm
        </button>
      )}
    </div>
  );
}
