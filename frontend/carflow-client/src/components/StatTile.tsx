import type { ReactNode } from "react";
import Card from "./ui/Card";

const tones = {
  accent: "bg-accent/15 text-accent-hover",
  good: "bg-good/15 text-good",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
} as const;

const deltaTones = {
  good: "text-good",
  critical: "text-critical",
  neutral: "text-ink-muted",
} as const;

export default function StatTile({
  icon,
  label,
  value,
  delta,
  deltaTone = "neutral",
  tone = "accent",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: keyof typeof deltaTones;
  tone?: keyof typeof tones;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm text-ink-secondary">{label}</p>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </div>
      </div>
      {/* Sumele mari („1.234.567 €") depasesc cardul la text-3xl pe telefon. */}
      <p className="mt-2 break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">{value}</p>
      {delta && (
        <p className={`mt-1.5 text-xs font-medium ${deltaTones[deltaTone]}`}>{delta}</p>
      )}
    </Card>
  );
}
