import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { saleService } from "../services/saleService";
import { authService } from "../services/authService";
import { formatDate, formatMoney } from "../utils/format";
import { Badge } from "../components/ui";
import { CheckIcon, TagIcon } from "../components/icons";
import type { SaleListItem } from "../types";

export default function Sales() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Vanzatorii vad lista, dar pretul de achizitie si profitul sunt doar ale Ownerului
  const isOwner = authService.isOwner();

  const load = async () => {
    try {
      setSales(await saleService.getAll());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleChecklist = async (sale: SaleListItem, field: "docsHandedOver" | "platesDone" | "warrantyGiven") => {
    const updated = { ...sale, [field]: !sale[field] };
    setSales((list) => list.map((s) => (s.saleId === sale.saleId ? updated : s)));
    try {
      await saleService.updateChecklist(sale.saleId, {
        docsHandedOver: updated.docsHandedOver,
        platesDone: updated.platesDone,
        warrantyGiven: updated.warrantyGiven,
      });
    } catch {
      setSales((list) => list.map((s) => (s.saleId === sale.saleId ? sale : s)));
    }
  };

  const totalProfit = sales.reduce((sum, s) => sum + (s.profit ?? 0), 0);

  if (loading) return <p className="text-ink-secondary">Se încarcă vânzările...</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">Vânzări</h1>
          <p className="text-sm text-ink-secondary">{sales.length} mașini vândute</p>
        </div>
        {sales.length > 0 && isOwner && (
          <div className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2 shadow-sm">
            <span className="text-sm text-ink-secondary">Profit total: </span>
            <span className={`text-sm font-bold ${totalProfit >= 0 ? "text-good" : "text-critical"}`}>
              {formatMoney(totalProfit)}
            </span>
          </div>
        )}
      </div>

      {sales.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-good/15 text-good">
            <TagIcon size={26} />
          </div>
          <p className="mt-2 text-ink-secondary">Nicio vânzare înregistrată încă.</p>
          <p className="text-sm text-ink-muted">
            Deschide o mașină din stoc și apasă „Marchează ca vândută".
          </p>
        </div>
      ) : (
        <>
        {/* Sub md, cele 9 coloane ale Ownerului nu incap nici pe departe: doar
            padding-ul lor face 288px, deci dintr-un rand se vedea ~un sfert.
            Aceleasi date, aceiasi atomi, alta asezare — vezi SaleCard. */}
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-alt text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Mașină</th>
                <th className="px-4 py-3">Dată</th>
                <th className="px-4 py-3">Cumpărător</th>
                <th className="px-4 py-3">Tip</th>
                {isOwner && <th className="px-4 py-3">Achiziție</th>}
                <th className="px-4 py-3">Costuri</th>
                <th className="px-4 py-3">Preț vânzare</th>
                {isOwner && <th className="px-4 py-3">Profit</th>}
                <th className="px-4 py-3">Checklist</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.saleId} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-alt/50">
                  <td className="px-4 py-3">
                    <Link to={`/vehicles/${s.vehicleId}`} className="font-medium text-accent hover:underline">
                      {s.vehicleName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{formatDate(s.saleDate)}</td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {s.buyerName}
                    {s.buyerPhone && <span className="block text-xs text-ink-muted">{s.buyerPhone}</span>}
                  </td>
                  <td className="px-4 py-3"><SaleTypeBadge sale={s} /></td>
                  {isOwner && (
                    <td className="px-4 py-3 text-ink-secondary">{formatMoney(s.purchasePrice ?? 0)}</td>
                  )}
                  <td className="px-4 py-3 text-ink-secondary">{formatMoney(s.totalCosts)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{formatMoney(s.salePrice)}</td>
                  {isOwner && (
                    <td className="px-4 py-3"><ProfitBadge profit={s.profit} /></td>
                  )}
                  <td className="px-4 py-3">
                    <SaleChecklist sale={s} onToggle={toggleChecklist} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {sales.map((s) => (
            <SaleCard key={s.saleId} sale={s} isOwner={isOwner} onToggle={toggleChecklist} />
          ))}
        </div>
        </>
      )}
    </div>
  );
}

type ToggleFn = (sale: SaleListItem, field: "docsHandedOver" | "platesDone" | "warrantyGiven") => void;

// Aceleasi bucati sunt folosite si in tabel, si in card — ca sa nu ajunga sa
// arate diferit dupa prima corectie facuta intr-un singur loc.
function SaleTypeBadge({ sale }: { sale: SaleListItem }) {
  return sale.type === "Finantat" ? (
    <Badge tone="info">Finanțat{sale.financingPartner ? ` · ${sale.financingPartner}` : ""}</Badge>
  ) : (
    <Badge tone="good">Cash</Badge>
  );
}

function ProfitBadge({ profit }: { profit: number | null }) {
  const value = profit ?? 0;
  return (
    <Badge tone={value >= 0 ? "good" : "critical"} className="text-xs font-bold">
      {value >= 0 ? "+" : ""}{formatMoney(value)}
    </Badge>
  );
}

function SaleChecklist({ sale, onToggle }: { sale: SaleListItem; onToggle: ToggleFn }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ChecklistPill label="Acte" done={sale.docsHandedOver}
        onToggle={() => onToggle(sale, "docsHandedOver")} />
      <ChecklistPill label="Plăcuțe" done={sale.platesDone}
        onToggle={() => onToggle(sale, "platesDone")} />
      <ChecklistPill label="Garanție" done={sale.warrantyGiven}
        onToggle={() => onToggle(sale, "warrantyGiven")} />
    </div>
  );
}

function SaleCard({ sale, isOwner, onToggle }: { sale: SaleListItem; isOwner: boolean; onToggle: ToggleFn }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/vehicles/${sale.vehicleId}`}
          className="min-w-0 font-medium text-accent hover:underline">
          {sale.vehicleName}
        </Link>
        {isOwner && <span className="shrink-0"><ProfitBadge profit={sale.profit} /></span>}
      </div>

      <p className="mt-1 text-sm text-ink-secondary">
        {sale.buyerName}
        {sale.buyerPhone && <span className="text-ink-muted"> · {sale.buyerPhone}</span>}
      </p>
      <p className="mt-0.5 text-xs text-ink-muted">{formatDate(sale.saleDate)}</p>

      <div className="mt-2"><SaleTypeBadge sale={sale} /></div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 text-sm">
        {isOwner && (
          <>
            <dt className="text-ink-muted">Achiziție</dt>
            <dd className="text-right text-ink-secondary">{formatMoney(sale.purchasePrice ?? 0)}</dd>
          </>
        )}
        <dt className="text-ink-muted">Costuri</dt>
        <dd className="text-right text-ink-secondary">{formatMoney(sale.totalCosts)}</dd>
        <dt className="text-ink-muted">Preț vânzare</dt>
        <dd className="text-right font-medium text-ink">{formatMoney(sale.salePrice)}</dd>
      </dl>

      <div className="mt-3 border-t border-border/60 pt-3">
        <SaleChecklist sale={sale} onToggle={onToggle} />
      </div>
    </div>
  );
}

function ChecklistPill({ label, done, onToggle }: { label: string; done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      // Pe telefon pastilele sunt singurul lucru pe care chiar il apesi in
      // aceasta pagina; 24px inaltime era prea putin. De la md redevin compacte,
      // ca sa incapa in celula de tabel.
      className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors md:min-h-0 md:px-2.5 ${
        done
          ? "border-accent/40 bg-accent/15 text-accent-hover"
          : "border-border text-ink-muted hover:border-ink-muted hover:text-ink-secondary"
      }`}
    >
      {done && <CheckIcon size={11} />}
      {label}
    </button>
  );
}
