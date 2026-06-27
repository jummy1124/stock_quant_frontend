// src/components/LanguageSwitcher.tsx
// 繁中 / 英文切換鈕。讀寫 i18n context，選擇會記在 localStorage。
import { LOCALES, useI18n, type Locale } from "../i18n";

const LABELS: Record<Locale, string> = {
  "zh-TW": "繁中",
  en: "EN",
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t("lang.label")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={`lang-switch__btn ${locale === l ? "is-active" : ""}`}
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
