// src/components/Header.tsx

export function Header() {
  return (
    <header className="app-header">
      <div className="app-header__title">
        <h1>台股盤中起漲篩選</h1>
        <p className="app-header__subtitle">
          即時顯示通過 6 項硬條件的起漲個股
        </p>
      </div>
      <p className="disclaimer" role="note">
        ⚠️ 篩選結果為機率性資訊參考，<strong>非投資建議</strong>。
      </p>
    </header>
  );
}
