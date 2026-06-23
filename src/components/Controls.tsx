// src/components/Controls.tsx

interface Props {
  top: number; // 0 = 全部
  onTopChange: (v: number) => void;
}

const TOP_OPTIONS = [
  { value: 0, label: "全部" },
  { value: 10, label: "前 10" },
  { value: 20, label: "前 20" },
  { value: 50, label: "前 50" },
  { value: 100, label: "前 100" },
];

export function Controls({ top, onTopChange }: Props) {
  return (
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
    </div>
  );
}
