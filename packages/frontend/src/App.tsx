import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <div className="container">
      <header>
        <h1>XMultiverse</h1>
        <p>
          Nhập một câu chuyện — AI sẽ kiến tạo thế giới, timeline, và cho bạn bước vào sống trong
          đó.
        </p>
      </header>
      <HomePage />
    </div>
  );
}
