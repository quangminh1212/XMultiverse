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
            <div className="stat-num">6</div>
            <div className="stat-label">Thành phần thế giới</div>
          </div>
          <div className="stat">
            <div className="stat-num">∞</div>
            <div className="stat-label">Cốt truyện khả thi</div>
          </div>
          <div className="stat">
            <div className="stat-num">3</div>
            <div className="stat-label">Lựa chọn mỗi hành động</div>
          </div>
          <div className="stat">
            <div className="stat-num">CLI</div>
            <div className="stat-label">Cho AI agent</div>
          </div>
        </div>
      </section>

      {/* Feature cards 01-04 */}
      <section className="section container" id="how">
        <div className="section-label">Cách hoạt động</div>
        <h2 className="section-title">Từ câu chuyện đến thế giới nhập vai</h2>
        <p className="section-subtitle">
          Bốn bước từ ý tưởng đến thế giới sống động mà bạn có thể bước vào.
        </p>
        <div className="features" style={{ marginTop: 40 }}>
          <div className="feature-card">
            <div className="feature-num">01</div>
            <div className="feature-icon">✍️</div>
            <h3>Viết cốt truyện</h3>
            <p>
              Nhập mô tả câu chuyện của bạn — dù ngắn hay dài, AI sẽ phân tích và xây dựng thế giới
              phù hợp.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-num">02</div>
            <div className="feature-icon">🌍</div>
            <h3>AI kiến tạo</h3>
            <p>
              AI tạo geography, factions, magic system, timeline, characters, quests — tất cả từ một
              câu chuyện.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-num">03</div>
            <div className="feature-icon">🎭</div>
            <h3>Tạo nhân vật</h3>
            <p>
              Chọn tên, vai trò, phe phái, tiểu sử. Bước vào thế giới với nhân vật của riêng bạn.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-num">04</div>
            <div className="feature-icon">⚔️</div>
            <h3>Nhập vai</h3>
            <p>
              Thực hiện hành động, AI phản hồi với scene mới, sự kiện timeline, và 3 lựa chọn tiếp
              theo.
            </p>
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
