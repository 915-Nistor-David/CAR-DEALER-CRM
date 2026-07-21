import {
  CarIcon, CheckIcon, ClockIcon, EuroIcon, KanbanIcon, TrendUpIcon,
} from "../components/icons";

type Tone = "neutral" | "info" | "good" | "warning" | "critical";

interface Meta {
  Icon: typeof CarIcon;
  tone: Tone;
  // clase Tailwind pentru pastila cu iconita
  chip: string;
}

const TONE_CHIP: Record<Tone, string> = {
  neutral: "bg-surface-alt text-ink-secondary",
  info: "bg-accent/15 text-accent",
  good: "bg-good/15 text-good",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
};

const BY_TYPE: Record<string, { Icon: typeof CarIcon; tone: Tone }> = {
  StageMove: { Icon: KanbanIcon, tone: "info" },
  Sale: { Icon: TrendUpIcon, tone: "good" },
  Cost: { Icon: EuroIcon, tone: "warning" },
  StuckInStage: { Icon: ClockIcon, tone: "warning" },
  StockAging: { Icon: ClockIcon, tone: "critical" },
  RAR: { Icon: CarIcon, tone: "critical" },
  Document: { Icon: CheckIcon, tone: "info" },
};

// Iconita si culoarea pentru un tip de notificare / intrare de agenda.
// Aceleasi denumiri de tip ca pe backend (NotificationTypes).
export function notificationMeta(type: string): Meta {
  const base = BY_TYPE[type] ?? { Icon: KanbanIcon, tone: "neutral" as Tone };
  return { ...base, chip: TONE_CHIP[base.tone] };
}

// "acum 5 min", "acum 2 h", altfel data
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "chiar acum";
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h} h`;
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}
