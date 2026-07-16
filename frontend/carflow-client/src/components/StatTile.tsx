import type { ReactNode } from "react";
import Card from "./ui/Card";

const tones = {
  accent: "bg-accent/15 text-accent",
  good: "bg-good/15 text-good",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
} as const;

export default function StatTile({
  icon,
  label,
  value,
  delta,
  tone = "accent",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: keyof typeof tones;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="truncate text-sm text-ink-secondary">{label}</p>
        {delta && <p className="mt-0.5 text-xs text-ink-muted">{delta}</p>}
      </div>
    </Card>
  );
}
