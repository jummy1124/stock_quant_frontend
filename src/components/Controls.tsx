// src/components/Controls.tsx
import { useState } from "react";
import type { ScreenSettings } from "../types/screen";
import { useT } from "../i18n";

interface Props {
  top: number; // 0 = 全部
  onTopChange: (v: number) => void;
  settings: ScreenSettings;
  onSettingsChange: (next: ScreenSettings) => void;
  /** 恢復原專案預設值 */
  onReset: () => void;
  /** 目前設定是否等於預設 (用來決定「恢復預設」是否可按 / 顯示已調整標記) */
  isDefault: boolean;
}

const TOP_VALUES = [0, 10, 20, 50, 100];

/** 數字輸入欄 */
function NumField(props: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="settings__field">
      <span className="settings__label">
        {props.label}
        {props.hint && <em className="settings__hint">{props.hint}</em>}
      </span>
      <input
        type="number"
        className="settings__input"
        value={props.value}
        min={props.min}
        step={props.step ?? 1}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) props.onChange(v);
        }}
      />
    </label>
  );
}

/** 開關 */
function ToggleField(props: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="settings__field settings__field--toggle">
      <span className="settings__label">
        {props.label}
        {props.hint && <em className="settings__hint">{props.hint}</em>}
      </span>
      <input
        type="checkbox"
        className="settings__checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
    </label>
  );
}

export function Controls({
  top,
  onTopChange,
  settings,
  onSettingsChange,
  onReset,
  isDefault,
}: Props) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const set = <K extends keyof ScreenSettings>(key: K, value: ScreenSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  return (
    <div className="controls-wrap">
      <div className="controls">
        <label className="controls__field">
          <span className="controls__label">{t("controls.show")}</span>
          <select
            className="controls__select"
            value={top}
            onChange={(e) => onTopChange(Number(e.target.value))}
          >
            {TOP_VALUES.map((v) => (
              <option key={v} value={v}>
                {v === 0 ? t("controls.all") : t("controls.topN", { n: v })}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="controls__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {t("controls.filters")}
          {!isDefault && <span className="controls__badge">{t("controls.adjusted")}</span>}
          <span className="controls__chevron">{open ? "▲" : "▼"}</span>
        </button>
      </div>

      {open && (
        <div className="settings">
          <section className="settings__group">
            <h3 className="settings__group-title">{t("controls.group.pool")}</h3>
            <div className="settings__grid">
              <NumField
                label={t("controls.field.minChange")}
                hint="%"
                value={settings.min_change}
                step={0.5}
                onChange={(v) => set("min_change", v)}
              />
              <ToggleField
                label={t("controls.field.excludeLimitUp")}
                hint={t("controls.hint.excludeLimitUp")}
                checked={settings.exclude_limit_up}
                onChange={(v) => set("exclude_limit_up", v)}
              />
            </div>
          </section>

          <section className="settings__group">
            <h3 className="settings__group-title">{t("controls.group.breakout")}</h3>
            <div className="settings__grid">
              <NumField
                label={t("controls.field.volRatio")}
                hint={t("controls.hint.volRatio")}
                value={settings.vol_ratio}
                min={0.1}
                step={0.1}
                onChange={(v) => set("vol_ratio", v)}
              />
              <NumField
                label={t("controls.field.maShort")}
                hint={t("controls.hint.maShort")}
                value={settings.ma_short}
                min={1}
                onChange={(v) => set("ma_short", v)}
              />
              <NumField
                label={t("controls.field.maMid")}
                hint={t("controls.hint.maMid")}
                value={settings.ma_mid}
                min={1}
                onChange={(v) => set("ma_mid", v)}
              />
              <NumField
                label={t("controls.field.maSlope")}
                hint={t("controls.hint.maSlope")}
                value={settings.ma_slope_lookback}
                min={0}
                onChange={(v) => set("ma_slope_lookback", v)}
              />
              <ToggleField
                label={t("controls.field.volProjection")}
                hint={t("controls.hint.volProjection")}
                checked={settings.vol_projection}
                onChange={(v) => set("vol_projection", v)}
              />
            </div>
          </section>

          <div className="settings__actions">
            <span className="settings__note">{t("controls.note")}</span>
            <button
              type="button"
              className="settings__reset"
              onClick={onReset}
              disabled={isDefault}
            >
              {t("controls.reset")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
