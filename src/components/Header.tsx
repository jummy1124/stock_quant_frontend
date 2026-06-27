// src/components/Header.tsx
import { useT } from "../i18n";

export function Header() {
  const t = useT();
  return (
    <header className="app-header">
      <div className="app-header__title">
        <h1>{t("header.title")}</h1>
        <p className="app-header__subtitle">{t("header.subtitle")}</p>
      </div>
      {/* 下載頁是獨立頁面 (download.html)，僅以一個 URL 連結，方便日後拆成獨立專案。 */}
      <a className="app-header__downloadlink" href="/download.html">
        {t("header.downloadLink")}
      </a>
      <p className="disclaimer" role="note">
        {t("disclaimer.pre")}
        <strong>{t("common.notAdvice")}</strong>
        {t("disclaimer.post")}
      </p>
    </header>
  );
}
