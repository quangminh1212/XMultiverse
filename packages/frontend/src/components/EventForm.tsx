import { useState } from 'react';
import type { World } from '../types';
import { api } from '../services/api';

interface EventFormProps {
  world: World;
  onUpdated: (world: World) => void;
}

export function EventForm({ world, onUpdated }: EventFormProps) {
  const [form, setForm] = useState({ year: '', title: '', description: '', important: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.description) return;
    const updated = await api.addTimelineEvent(world.id, form);
    onUpdated(updated);
    setForm({ year: '', title: '', description: '', important: false });
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <h4>Thêm sự kiện</h4>
      <input
        placeholder="Năm"
        value={form.year}
        onChange={(e) => setForm({ ...form, year: e.target.value })}
      />
      <input
        placeholder="Tiêu đề"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        style={{ marginTop: 8 }}
      />
      <textarea
        placeholder="Mô tả"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        style={{ marginTop: 8 }}
        rows={2}
      />
      <label style={{ display: 'block', marginTop: 8 }}>
        <input
          type="checkbox"
          checked={form.important}
          onChange={(e) => setForm({ ...form, important: e.target.checked })}
        />
        Sự kiện quan trọng
      </label>
      <button type="submit" style={{ marginTop: 8 }}>
        Thêm sự kiện
      </button>
    </form>
  );
}
