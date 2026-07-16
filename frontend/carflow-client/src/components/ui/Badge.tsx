import type { ReactNode } from "react";

const tones = {
  neutral: "bg-surface-alt text-ink-secondary",
  info: "bg-accent/15 text-accent",
  good: "bg-good/15 text-good",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
} as const;

export default function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
