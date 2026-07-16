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
            <a href="#platform">Platform</a>
            <a href="#worlds">Thế giới</a>
            <a href="#how">Cách hoạt động</a>
            <span className="nav-badge">v1.2+</span>
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
          Từ cốt truyện hoặc phim, AI kiến tạo thế giới mở: bản đồ địa điểm, factions, magic,
          timeline, NPC, quests — rồi bạn du hành và nhập vai khám phá.
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
            <div className="stat-num">10</div>
            <div className="stat-label">Tính năng platform</div>
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
          Platform thế giới mở — từ seed cốt truyện/phim đến bản đồ, du hành, RPG và CLI agent.
        </p>
        <div className="features" style={{ marginTop: 40 }}>
          <div className="feature-card">
            <div className="feature-num">01</div>
            <div className="feature-icon">✍️</div>
            <h3>Cốt truyện / Phim</h3>
            <p>Preset hoặc tự nhập — story, movie, book, anime làm hạt giống thế giới.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">02</div>
            <div className="feature-icon">🌍</div>
            <h3>AI kiến tạo</h3>
            <p>Locations, factions, magic, timeline, characters, quests — một lần sinh.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">03</div>
            <div className="feature-icon">🗺️</div>
            <h3>Bản đồ & Du hành</h3>
            <p>Đồ thị địa điểm nối nhau — khám phá open world, gặp NPC theo vùng.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">04</div>
            <div className="feature-icon">📊</div>
            <h3>Stats & Inventory</h3>
            <p>HP/MP/level/XP, 5 attributes, túi đồ vũ khí, giáp, thuốc.</p>
          </div>
        </div>
        <div className="features" style={{ marginTop: 20 }}>
          <div className="feature-card">
            <div className="feature-num">05</div>
            <div className="feature-icon">🎲</div>
            <h3>Dice & Skill Checks</h3>
            <p>1d20 + modifier vs DC. Critical, fumble, auto-infer stat.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">06</div>
            <div className="feature-icon">🤝</div>
            <h3>NPC & Quests</h3>
            <p>Disposition 4 trục + quest log theo dõi tiến độ nhiệm vụ.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">07</div>
            <div className="feature-icon">⚔️</div>
            <h3>Nhập vai</h3>
            <p>AI GM: scene, effects, items, XP, relationships, choices.</p>
          </div>
          <div className="feature-card">
            <div className="feature-num">08</div>
            <div className="feature-icon">💾</div>
            <h3>Save / Load + CLI</h3>
            <p>Snapshot đầy đủ + xmv travel/act/world cho AI agent.</p>
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
