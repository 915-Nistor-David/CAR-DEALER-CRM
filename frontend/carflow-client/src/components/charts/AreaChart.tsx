export interface AreaPoint {
  label: string;
  value: number;
}

// Grafic tip "area" desenat manual in SVG, in stilul RingChart — fara librarii.
export default function AreaChart({
  data,
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  data: AreaPoint[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const width = 640;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const x = (i: number) =>
    pad.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => pad.top + innerH - ((v - min) / range) * innerH;

  const points = data.map((d, i) => ({ px: x(i), py: y(d.value), ...d }));

  // curba lina (catmull-rom simplificat prin puncte de control la 1/3)
  const line = points
    .map((p, i) => {
      if (i === 0) return `M ${p.px} ${p.py}`;
      const prev = points[i - 1];
      const dx = (p.px - prev.px) / 3;
      return `C ${prev.px + dx} ${prev.py}, ${p.px - dx} ${p.py}, ${p.px} ${p.py}`;
    })
    .join(" ");

  const area = `${line} L ${points[points.length - 1].px} ${pad.top + innerH} L ${points[0].px} ${pad.top + innerH} Z`;

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => pad.top + innerH * f);
  const last = points[points.length - 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[420px]"
        role="img"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5aff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7c5aff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridYs.map((gy) => (
          <line
            key={gy}
            x1={pad.left}
            x2={pad.left + innerW}
            y1={gy}
            y2={gy}
            stroke="var(--color-border)"
            strokeOpacity="0.5"
            strokeDasharray="3 5"
          />
        ))}

        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="#8f70ff" strokeWidth="2.5" strokeLinecap="round" />

        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.px} cy={p.py} r="3" fill="var(--color-surface)" stroke="#8f70ff" strokeWidth="2">
              <title>{`${p.label}: ${formatValue(p.value)}`}</title>
            </circle>
            <text
              x={p.px}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-ink-muted)"
            >
              {p.label}
            </text>
          </g>
        ))}

        {/* punctul curent, evidentiat */}
        <circle cx={last.px} cy={last.py} r="6" fill="#7c5aff" fillOpacity="0.25" />
        <circle cx={last.px} cy={last.py} r="3.5" fill="#8f70ff" />
        <text
          x={Math.min(last.px, pad.left + innerW - 4)}
          y={Math.max(last.py - 12, 12)}
          textAnchor="end"
          fontSize="12"
          fontWeight="600"
          fill="var(--color-ink)"
        >
          {formatValue(last.value)}
        </text>
      </svg>
    </div>
  );
}
