import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { saleService } from "../services/saleService";
import { formatDate, formatMoney } from "../utils/format";
import { Badge } from "../components/ui";
import type { SaleListItem } from "../types";

export default function Sales() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  if (loading) return <p className="text-ink-secondary">Se încarcă vânzările...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Vânzări</h1>
          <p className="text-sm text-ink-secondary">{sales.length} mașini vândute</p>
        </div>
        {sales.length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-4 py-2 shadow-sm">
            <span className="text-sm text-ink-secondary">Profit total: </span>
            <span className={`text-sm font-bold ${totalProfit >= 0 ? "text-good" : "text-critical"}`}>
              {formatMoney(totalProfit)}
            </span>
          </div>
        )}
      </div>

      {sales.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
          <div className="text-4xl">💰</div>
          <p className="mt-2 text-ink-secondary">Nicio vânzare înregistrată încă.</p>
          <p className="text-sm text-ink-muted">
            Deschide o mașină din stoc și apasă „Marchează ca vândută".
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-alt text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Mașină</th>
                <th className="px-4 py-3">Dată</th>
                <th className="px-4 py-3">Cumpărător</th>
                <th className="px-4 py-3">Tip</th>
                <th className="px-4 py-3">Achiziție</th>
                <th className="px-4 py-3">Costuri</th>
                <th className="px-4 py-3">Preț vânzare</th>
                <th className="px-4 py-3">Profit</th>
                <th className="px-4 py-3">Checklist</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.saleId} className="border-b border-border last:border-0">
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
                  <td className="px-4 py-3 text-ink-secondary">{formatMoney(s.purchasePrice)}</td>
                  <td className="px-4 py-3 text-ink-secondary">{formatMoney(s.totalCosts)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{formatMoney(s.salePrice)}</td>
                  <td className={`px-4 py-3 font-bold ${s.profit >= 0 ? "text-good" : "text-critical"}`}>
                    {formatMoney(s.profit)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs text-ink-secondary">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={s.docsHandedOver}
                          onChange={() => toggleChecklist(s, "docsHandedOver")} />
                        Acte predate
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={s.platesDone}
                          onChange={() => toggleChecklist(s, "platesDone")} />
                        Plăcuțe
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={s.warrantyGiven}
                          onChange={() => toggleChecklist(s, "warrantyGiven")} />
                        Garanție
                      </label>
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
