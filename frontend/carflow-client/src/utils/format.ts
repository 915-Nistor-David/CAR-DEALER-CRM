const eur = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number) => eur.format(value);

// Backend-ul trimite DateOnly ca "2026-07-17". JS parseaza asa ceva ca miezul
// noptii UTC, dar il afiseaza local — deci in fusuri negative ziua apare cu una
// mai putin. Construim data direct din componente ca sa ramana ziua calendaristica.
export const parseDateOnly = (iso: string): Date => {
  if (iso.includes("T")) return new Date(iso); // timestamp complet — conversia locala e corecta
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Ziua de azi in format "YYYY-MM-DD", din calendarul LOCAL.
// toISOString() ar da ziua UTC — pentru Romania, "ieri" dupa miezul noptii.
export const todayIso = (): string => toDateOnlyIso(new Date());

export const toDateOnlyIso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const formatDate = (iso: string) =>
  parseDateOnly(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export const daysLabel = (days: number) =>
  days === 0 ? "azi" : days === 1 ? "1 zi" : `${days} zile`;

export const formatKm = (km: number) => `${km.toLocaleString("ro-RO")} km`;

// Cate zile mai sunt pana la o data (negativ = depasita); ignora ora.
// Conduce si logica de badge (act depasit, RAR aproape), nu doar textul.
export const daysUntil = (iso: string): number => {
  const target = parseDateOnly(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};
