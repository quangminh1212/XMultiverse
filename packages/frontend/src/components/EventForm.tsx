import { useState } from 'react';
import type { World } from '../types';
import { api } from '../services/api';

interface EventFormProps {
  world: World;
  onUpdated: (world: World) => void;
}

export function EventForm({ world, onUpdated }: EventFormProps) {
  const [form, setForm] = useState({ year: '', title: '', description: '', important: false });
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.description) return;
    const updated = await api.addTimelineEvent(world.id, form);
    onUpdated(updated);
    setForm({ year: '', title: '', description: '', important: false });
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="ghost" style={{ marginTop: 16 }} onClick={() => setOpen(true)}>
        + Thêm sự kiện
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}
    >
      <h4>Thêm sự kiện timeline</h4>
      <div className="grid-2" style={{ gap: 12 }}>
        <input
          placeholder="Năm"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        />
        <input
          placeholder="Tiêu đề"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <textarea
        placeholder="Mô tả sự kiện"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        style={{ marginTop: 12 }}
        rows={2}
      />
      <label style={{ display: 'block', marginTop: 12 }}>
        <input
          type="checkbox"
          checked={form.important}
          onChange={(e) => setForm({ ...form, important: e.target.checked })}
        />
        Sự kiện quan trọng
      </label>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button type="submit">Thêm</button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Hủy
        </button>
      </div>
    </form>
  );
}
