export interface RingSegment {
  label: string;
  value: number;
  color: string;
}

export default function RingChart({
  segments,
  centerValue,
  centerLabel,
  size = 160,
  strokeWidth = 18,
}: {
  segments: RingSegment[];
  centerValue?: string | number;
  centerLabel?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let cumulative = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = total > 0 ? s.value / total : 0;
      const dash = fraction * circumference;
      const dashoffset = -cumulative;
      cumulative += dash;
      return { ...s, dash, dashoffset };
    });

  return (
    <div className="flex flex-col items-center gap-3">
      {/* `size` ramane doar spatiul de coordonate al SVG-ului. Latimea reala o
          da CSS-ul: pana la 160px, dar se strange daca nu are loc. Inainte era
          fixata prin `style` inline, deci imuna la orice clasa Tailwind. */}
      <div className="relative aspect-square w-full" style={{ maxWidth: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-alt)"
            strokeWidth={strokeWidth}
          />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${a.dash} ${circumference - a.dash}`}
              strokeDashoffset={a.dashoffset}
            >
              <title>{`${a.label}: ${a.value}`}</title>
            </circle>
          ))}
        </svg>
        {(centerValue !== undefined || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && <span className="text-xl font-bold text-ink">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-ink-muted">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} <span className="text-ink-muted">({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
