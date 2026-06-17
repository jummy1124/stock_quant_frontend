// src/components/Reasons.tsx

export function Reasons({ reasons }: { reasons: string[] }) {
  if (!reasons || reasons.length === 0) return <span className="dash">—</span>;
  return (
    <div className="reasons">
      {reasons.map((r, i) => (
        <span className="reason-tag" key={`${r}-${i}`}>
          {r}
        </span>
      ))}
    </div>
  );
}
