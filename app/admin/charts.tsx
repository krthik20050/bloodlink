// ponytail: hand-rolled SVG charts; no chart lib needed for counts and trends.
export const PALETTE = {
  crimson: "#8F2638",
  ink: "#171717",
  gray: "#969794",
  line: "#E3E3DF",
  green: "#2E7D46",
  amber: "#B7791F",
  red: "#B83E3F",
  blue: "#3A6EA5",
};

export function Donut({ segments, size = 168 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label="Request outcomes">
        <circle cx="70" cy="70" r={radius} fill="none" stroke={PALETTE.line} strokeWidth="18" />
        {total > 0 && segments.map(segment => {
          if (!segment.value) return null;
          const length = (segment.value / total) * circumference;
          const dash = `${length} ${circumference - length}`;
          const el = (
            <circle
              key={segment.label}
              cx="70" cy="70" r={radius} fill="none"
              stroke={segment.color} strokeWidth="18"
              strokeDasharray={dash} strokeDashoffset={-offset}
              transform="rotate(-90 70 70)" strokeLinecap="butt"
            />
          );
          offset += length;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="donut-total">{total}</text>
        <text x="70" y="84" textAnchor="middle" className="donut-caption">requests</text>
      </svg>
      <ul className="donut-legend">
        {segments.map(segment => (
          <li key={segment.label}>
            <i style={{ background: segment.color }} />
            {segment.label} <b>{segment.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return (
    <ul className="bar-list">
      {rows.map(row => (
        <li key={row.label}>
          <span className="bar-label">{row.label}</span>
          <span className="bar-track"><i style={{ width: `${(row.value / max) * 100}%`, background: row.color }} /></span>
          <b>{row.value}</b>
        </li>
      ))}
    </ul>
  );
}

export function ActivityChart({ days, series }: { days: string[]; series: { label: string; color: string; values: number[] }[] }) {
  const width = 560;
  const height = 180;
  const pad = 8;
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const x = (i: number) => pad + (i / Math.max(1, days.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2 - 14);
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="activity-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="14-day activity">
        {[0.25, 0.5, 0.75].map(frac => (
          <line key={frac} x1={pad} x2={width - pad} y1={height * frac} y2={height * frac} stroke={PALETTE.line} strokeWidth="1" />
        ))}
        {series.map(s => (
          <g key={s.label}>
            <path d={`${path(s.values)} L${x(s.values.length - 1).toFixed(1)},${height - pad} L${x(0).toFixed(1)},${height - pad} Z`} fill={s.color} opacity="0.12" />
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="activity-days">
        <span>{days[0]}</span>
        <span>{days[Math.floor(days.length / 2)]}</span>
        <span>{days[days.length - 1]}</span>
      </div>
      <ul className="chart-key">
        {series.map(s => (
          <li key={s.label}><i style={{ background: s.color }} />{s.label}</li>
        ))}
      </ul>
    </div>
  );
}
