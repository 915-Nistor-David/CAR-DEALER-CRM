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
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
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
                  <td className="px-4 py-3">
                    {s.type === "Finantat" ? (
                      <Badge tone="info">
                        Finanțat{s.financingPartner ? ` · ${s.financingPartner}` : ""}
                      </Badge>
                    ) : (
                      <Badge tone="good">Cash</Badge>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-ink-secondary">{formatMoney(s.purchasePrice ?? 0)}</td>
                  )}
                  <td className="px-4 py-3 text-ink-secondary">{formatMoney(s.totalCosts)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{formatMoney(s.salePrice)}</td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      <Badge tone={(s.profit ?? 0) >= 0 ? "good" : "critical"} className="text-xs font-bold">
                        {(s.profit ?? 0) >= 0 ? "+" : ""}{formatMoney(s.profit ?? 0)}
                      </Badge>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <ChecklistPill
                        label="Acte"
                        done={s.docsHandedOver}
                        onToggle={() => toggleChecklist(s, "docsHandedOver")}
                      />
                      <ChecklistPill
                        label="Plăcuțe"
                        done={s.platesDone}
                        onToggle={() => toggleChecklist(s, "platesDone")}
                      />
                      <ChecklistPill
                        label="Garanție"
                        done={s.warrantyGiven}
                        onToggle={() => toggleChecklist(s, "warrantyGiven")}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChecklistPill({ label, done, onToggle }: { label: string; done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
