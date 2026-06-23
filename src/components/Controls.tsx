// src/components/Controls.tsx
import { useState } from "react";
import type { ScreenSettings } from "../types/screen";

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

const TOP_OPTIONS = [
  { value: 0, label: "全部" },
  { value: 10, label: "前 10" },
  { value: 20, label: "前 20" },
  { value: 50, label: "前 50" },
  { value: 100, label: "前 100" },
];

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
  const set = <K extends keyof ScreenSettings>(key: K, value: ScreenSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  return (
    <div className="controls-wrap">
      <div className="controls">
        <label className="controls__field">
          <span className="controls__label">顯示筆數</span>
          <select
            className="controls__select"
            value={top}
            onChange={(e) => onTopChange(Number(e.target.value))}
          >
            {TOP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
          篩選條件
          {!isDefault && <span className="controls__badge">已調整</span>}
          <span className="controls__chevron">{open ? "▲" : "▼"}</span>
        </button>
      </div>

      {open && (
        <div className="settings">
          <section className="settings__group">
            <h3 className="settings__group-title">漲幅池（第一層）</h3>
            <div className="settings__grid">
              <NumField
                label="漲幅下限"
                hint="%"
                value={settings.min_change}
                step={0.5}
                onChange={(v) => set("min_change", v)}
              />
              <ToggleField
                label="排除已鎖漲停"
                hint="收盤 ≤ 漲停前一檔"
                checked={settings.exclude_limit_up}
                onChange={(v) => set("exclude_limit_up", v)}
              />
            </div>
          </section>

          <section className="settings__group">
            <h3 className="settings__group-title">起漲點 6 條件（第二層）</h3>
            <div className="settings__grid">
              <NumField
                label="量增倍數"
                hint="當日量/昨量 ≥"
                value={settings.vol_ratio}
                min={0.1}
                step={0.1}
                onChange={(v) => set("vol_ratio", v)}
              />
              <NumField
                label="短均線天數"
                hint="預設 5MA"
                value={settings.ma_short}
                min={1}
                onChange={(v) => set("ma_short", v)}
              />
              <NumField
                label="月均線天數"
                hint="預設 20MA"
                value={settings.ma_mid}
                min={1}
                onChange={(v) => set("ma_mid", v)}
              />
              <NumField
                label="月線上彎回看"
                hint="今日 vs N 日前"
                value={settings.ma_slope_lookback}
                min={0}
                onChange={(v) => set("ma_slope_lookback", v)}
              />
              <ToggleField
                label="量能用全日預估"
                hint="盤中早盤較公允"
                checked={settings.vol_projection}
                onChange={(v) => set("vol_projection", v)}
              />
            </div>
          </section>

          <div className="settings__actions">
            <span className="settings__note">
              紅K、突破昨高、昨日在短均線下為固定條件，不可調整。
            </span>
            <button
              type="button"
              className="settings__reset"
              onClick={onReset}
              disabled={isDefault}
            >
              恢復預設
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
