import { useLayoutEffect, useRef, useState } from "react";

export interface AreaPoint {
  label: string;
  value: number;
}

// Grafic tip "area" desenat manual in SVG, in stilul RingChart — fara librarii.
//
// Latimea se masoara cu ResizeObserver in loc sa fie constanta 640. Cu un
// viewBox fix, SVG-ul se scaleaza intreg: la 420px pe telefon factorul era
// 0.656, deci `fontSize 11` ajungea la ~7px reali — ilizibil — iar graficul
// derula orizontal in fiecare card. Masurand latimea reala, o unitate SVG
// ramane un pixel, deci textul are exact marimea ceruta la orice latime, iar
// restul calculelor (innerW, x(), y()) deriva deja din `width`.
export default function AreaChart({
  data,
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  data: AreaPoint[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  // Valorile stateau doar in <title>, pe cercuri de 6px: hover-only, deci pe
  // telefon inaccesibile. O banda transparenta pe fiecare punct le face
  // atingibile.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Masuram o data sincron, inainte de paint, si abia apoi ne abonam la
  // schimbari. ResizeObserver singur nu e de ajuns: daca browserul nu livreaza
  // niciun callback (se intampla), graficul n-ar aparea deloc. Asa, prima
  // masuratoare e garantata, iar observerul si `resize` doar o actualizeaza.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.round(w));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const pad = { top: 16, right: 12, bottom: 28, left: 12 };

  // Rezervam inaltimea de la inceput ca masurarea sa nu produca un salt.
  if (data.length === 0 || width === null) {
    return (
      <div ref={wrapRef} className="w-full" style={{ height }}>
        {data.length === 0 && (
          <p className="flex h-full items-center justify-center text-sm text-ink-muted">
            Nu sunt date de afișat.
          </p>
        )}
      </div>
    );
  }

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

  // O eticheta de luna are nevoie de ~44px. Cand nu incap toate, le rarim
  // pornind de la ultima, ca luna curenta sa fie mereu scrisa.
  const perLabel = 44;
  const stride = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / perLabel))));

  const highlight = activeIndex ?? points.length - 1;
  const active = points[highlight];
  // Textul valorii nu trebuie sa iasa din grafic la capete.
  const anchor =
    active.px > pad.left + innerW * 0.75 ? "end" : active.px < pad.left + innerW * 0.25 ? "start" : "middle";

  return (
    <div ref={wrapRef} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evoluție pe ${data.length} intervale, de la ${formatValue(data[0].value)} la ${formatValue(data[data.length - 1].value)}`}
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

        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={p.px} cy={p.py} r="3" fill="var(--color-surface)" stroke="#8f70ff" strokeWidth="2" />
            {(points.length - 1 - i) % stride === 0 && (
              <text
                x={p.px}
                y={height - 8}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-ink-muted)"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {/* punctul selectat (implicit ultimul), evidentiat */}
        <circle cx={active.px} cy={active.py} r="6" fill="#7c5aff" fillOpacity="0.25" />
        <circle cx={active.px} cy={active.py} r="3.5" fill="#8f70ff" />
        <text
          x={Math.min(Math.max(active.px, pad.left + 4), pad.left + innerW - 4)}
          y={Math.max(active.py - 12, 12)}
          textAnchor={anchor}
          fontSize="12"
          fontWeight="600"
          fill="var(--color-ink)"
        >
          {activeIndex === null ? formatValue(active.value) : `${active.label}: ${formatValue(active.value)}`}
        </text>

        {/* Benzi transparente de atingere — desenate ultimele ca sa prinda ele
            evenimentul, nu cercul de 6px de dedesubt. */}
        {points.map((p, i) => {
          const bandW = points.length > 1 ? innerW / (points.length - 1) : innerW;
          return (
            <rect
              key={`hit-${p.label}`}
              x={p.px - bandW / 2}
              y={0}
              width={bandW}
              height={height}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onPointerDown={() => setActiveIndex(i)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <title>{`${p.label}: ${formatValue(p.value)}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
