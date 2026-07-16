import { useEffect, useState } from 'react';
import { api } from '../services/api';

const TOKEN_KEY = 'xmv_token';
const USER_KEY = 'xmv_user';

export function PlatformPanel({ onInstalledWorld }: { onInstalledWorld?: (id: string) => void }) {
  const [, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [joinCode, setJoinCode] = useState('');
  const [packs, setPacks] = useState<
    Array<{ id: string; title: string; author: string; description: string; downloads: number }>
  >([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .listMarket()
      .then((r) => setPacks(r.packs || []))
      .catch(() => {});
  }, []);

  function persistAuth(t: string, u: any) {
    setToken(t);
    setUser(u);
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }

  function logout() {
    setToken('');
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function doRegister() {
    setLoading(true);
    setErr('');
    try {
      const r = await api.register(authForm.username, authForm.password);
      persistAuth(r.token, r.user);
      setMsg(`Đã đăng ký: ${r.user.displayName}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function doLogin() {
    setLoading(true);
    setErr('');
    try {
      const r = await api.login(authForm.username, authForm.password);
      persistAuth(r.token, r.user);
      setMsg(`Xin chào ${r.user.displayName}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function doJoin() {
    setLoading(true);
    setErr('');
    try {
      const r = await api.joinByCode(joinCode.trim());
      setMsg(`Join OK: ${r.name} (${r.worldId.slice(0, 8)}…)`);
      onInstalledWorld?.(r.worldId);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function installPack(id: string) {
    setLoading(true);
    setErr('');
    try {
      const w = await api.installMarket(id);
      setMsg(`Đã cài pack → ${w.name}`);
      onInstalledWorld?.(w.id);
      const list = await api.listMarket();
      setPacks(list.packs || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section container" id="platform">
      <div className="section-label">Platform v2</div>
      <h2 className="section-title">Auth · Multiplayer · Marketplace</h2>
      <p className="section-subtitle" style={{ marginBottom: 24 }}>
        Tài khoản local, mã share thế giới, và chợ pack — tối ưu cả desktop lẫn mobile (PWA).
      </p>
      {err && <div className="error">{err}</div>}
      {msg && (
        <div className="card" style={{ borderColor: 'rgba(34,197,94,0.3)', marginBottom: 16 }}>
          {msg}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>🔐 Tài khoản</h3>
          {user ? (
            <div>
              <p>
                Đang đăng nhập: <strong>{user.displayName}</strong> (@{user.username})
              </p>
              <button type="button" className="secondary" onClick={logout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                placeholder="username"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              />
              <input
                type="password"
                placeholder="password (min 6)"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" disabled={loading} onClick={doLogin}>
                  Login
                </button>
                <button type="button" className="secondary" disabled={loading} onClick={doRegister}>
                  Register
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>👥 Join multiplayer</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 10 }}>
            Nhập share code từ chủ phòng (tạo trong world → Share).
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              style={{ flex: 1, minWidth: 120 }}
            />
            <button type="button" disabled={loading || !joinCode.trim()} onClick={doJoin}>
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>🛒 Marketplace packs</h3>
        {packs.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>Chưa có pack — publish từ world view.</p>
        ) : (
          <div className="location-grid">
            {packs.map((p) => (
              <div key={p.id} className="location-card">
                <h3 style={{ marginBottom: 4 }}>{p.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {p.author} · {p.downloads} downloads
                </p>
                <p style={{ fontSize: '0.88rem', margin: '8px 0' }}>{p.description}</p>
                <button
                  type="button"
                  className="secondary"
                  disabled={loading}
                  onClick={() => installPack(p.id)}
                >
                  Install
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}
