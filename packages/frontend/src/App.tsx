import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <>
      {/* Nav bar */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <img src="/logo.svg" alt="XMultiverse" />
            <span className="nav-brand-text">
              X<span>Multiverse</span>
            </span>
          </a>
          <div className="nav-links">
            <a href="#create">Tạo thế giới</a>
            <a href="#worlds">Thế giới</a>
            <a href="#how">Cách hoạt động</a>
            <span className="nav-badge">AI Ready</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero container">
        <div className="hero-badge">AI-Powered World Builder</div>
        <h1>
          Nhập một câu chuyện.
          <br />
          <span className="grad">AI kiến tạo thế giới.</span>
        </h1>
        <p>
          Từ cốt truyện của bạn, AI tạo ra geography, factions, magic system, timeline, characters,
          quests — rồi bạn bước vào sống trong đó.
        </p>
        <div className="hero-actions">
          <a href="#create">
            <button className="lg">Bắt đầu kiến tạo</button>
          </a>
          <a href="#how">
            <button className="secondary lg">Cách hoạt động</button>
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="container">
        <div className="stats">
          <div className="stat">
            <div className="stat-num">8</div>
            <div className="stat-label">Tính năng RPG</div>
          </div>
          <div className="stat">
            <div className="stat-num">∞</div>
            <div className="stat-label">Cốt truyện khả thi</div>
          </div>
          <div className="stat">
            <div className="stat-num">1d20</div>
            <div className="stat-label">Dice system</div>
          </div>
          <div className="stat">
            <div className="stat-num">CLI</div>
            <div className="stat-label">Cho AI agent</div>
          </div>
        </div>
      </section>

      {/* Feature cards 01-08 */}
      <section className="section container" id="how">
        <div className="section-label">Cách hoạt động</div>
        <h2 className="section-title">Từ câu chuyện đến thế giới nhập vai</h2>
        <p className="section-subtitle">
          Tám tính năng RPG đầy đủ — từ world building đến dice checks, inventory, và NPC
          relationships.
        </p>
        <div className="features" style={{ marginTop: 40 }}>
          <div className="feature-card">
            <div className="feature-num">01</div>
            <div className="feature-icon">✍️</div>
            <h3>Viết cốt truyện</h3>
            <p>Nhập mô tả câu chuyện — AI phân tích và xây dựng thế giới phù hợp.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">02</div>
            <div className="feature-icon">🌍</div>
            <h3>AI kiến tạo</h3>
            <p>Geography, factions, magic, timeline, characters, quests — từ một câu chuyện.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">03</div>
            <div className="feature-icon">📊</div>
            <h3>Stats & Inventory</h3>
            <p>HP/MP/level/XP, 5 attributes, túi đồ với vũ khí, giáp, thuốc — dùng và vứt bỏ.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">04</div>
            <div className="feature-icon">�</div>
            <h3>Dice & Skill Checks</h3>
            <p>1d20 + modifier vs DC. Critical, fumble, auto-infer stat từ hành động.</p>
          </div>
        </div>
        <div className="features" style={{ marginTop: 20 }}>
          <div className="feature-card">
            <div className="feature-num">05</div>
            <div className="feature-icon">🤝</div>
            <h3>NPC Relationships</h3>
            <p>Trust, respect, friendship, fear — NPCs thay đổi thái độ theo tương tác.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">06</div>
            <div className="feature-icon">⚔️</div>
            <h3>Nhập vai</h3>
            <p>AI phản hồi scene, effects, items, XP, và 3 lựa chọn tiếp theo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">07</div>
            <div className="feature-icon">💾</div>
            <h3>Save / Load</h3>
            <p>Lưu snapshot thế giới + nhân vật + chat. Khôi phục bất cứ lúc nào.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">08</div>
            <div className="feature-icon">🖥️</div>
            <h3>CLI cho AI Agent</h3>
            <p>xmv doctor, world create, act, log — tất cả qua command line.</p>
          </div>
        </div>
      </section>

      {/* Main app */}
      <HomePage />

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>
            XMultiverse — Thế giới mở từ cốt truyện. Powered by AI. Built with Express + React +
            TypeScript.
          </p>
        </div>
      </footer>
    </>
  );
}
