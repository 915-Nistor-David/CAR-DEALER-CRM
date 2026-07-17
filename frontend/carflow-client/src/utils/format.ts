const eur = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number) => eur.format(value);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export const daysLabel = (days: number) =>
  days === 0 ? "azi" : days === 1 ? "1 zi" : `${days} zile`;

export const formatKm = (km: number) => `${km.toLocaleString("ro-RO")} km`;

// Cate zile mai sunt pana la o data (negativ = depasita); ignora ora
export const daysUntil = (iso: string): number => {
  const target = new Date(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};
