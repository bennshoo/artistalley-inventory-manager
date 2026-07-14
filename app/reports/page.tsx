import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEventDate } from "@/lib/utils";
import { ReportFilters } from "@/components/reports/report-filters";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }) {
  const { dateFrom, dateTo } = await searchParams;
  const [salesRes, eventsRes, revenueRes, costsRes] =
    await Promise.all([
      supabase
        .from("sale")
        .select(
          "*, product(name, sku, category(name)), event(name, date_start, date_end)",
        )
        .order("date", { ascending: false }),
      supabase
        .from("event")
        .select("id, name, date_start, date_end")
        .eq("app_status", "Accepted")
        .order("date_start", { ascending: false }),
      supabase.from("event_revenue").select("*, event(name)"),
      supabase.from("cost").select("*, event(name)"),
    ]);

  const sales = (salesRes.data ?? []) as any[];
  const allEvents = (eventsRes.data ?? []) as any[];
  const revenues = (revenueRes.data ?? []) as any[];
  const costs = (costsRes.data ?? []) as any[];


  const events = allEvents.filter(e =>
    (!dateFrom || e.date_start >= dateFrom) &&
    (!dateTo || e.date_end <= dateTo)
  );

  const generalExpenses = costs.filter((c: any) => c.event_id === null);
  const totalGeneralExpenses = generalExpenses.reduce((s: number, c: any) => s + c.amount, 0);

  // Per-event summary
  const eventSummary = events.map((ev) => {
    const evRevenues = revenues.filter((r: any) => r.event_id === ev.id);
    const evCosts = costs.filter((c: any) => c.event_id === ev.id);
    const totalRev = evRevenues.reduce(
      (s: number, r: any) => s + (r.ending_balance - r.starting_balance),
      0,
    );
    const totalCost = evCosts.reduce((s: number, c: any) => s + c.amount, 0);
    return { ...ev, totalRev, totalCost, net: totalRev - totalCost };
  });

  // High-level profit & loss — realized (events that have ended) only
  const today = new Date().toISOString().split("T")[0];
  const realizedEvents = eventSummary.filter((ev) => ev.date_end < today);
  const futureEvents = eventSummary.filter((ev) => ev.date_end >= today);

  const realizedEventIdSet = new Set(realizedEvents.map((e) => e.id));
  const totalRevenue = realizedEvents.reduce((s, ev) => s + ev.totalRev, 0);
  const totalEventCosts = realizedEvents.reduce((s, ev) => s + ev.totalCost, 0);
  const totalCOGS = sales
    .filter((s: any) => realizedEventIdSet.has(s.event_id))
    .reduce((sum: number, s: any) => sum + s.qty_sold * s.unit_cost, 0);
  const totalExpenses = totalEventCosts + totalGeneralExpenses + totalCOGS;
  const netProfit = totalRevenue - totalExpenses;

  // Committed expenses on upcoming events, kept out of realized profit
  const committedFutureExpenses = futureEvents.reduce((s, ev) => s + ev.totalCost, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
      </div>

      <Suspense>
        <ReportFilters />
      </Suspense>

      {/* High-level P&L (realized) */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-2xl font-semibold text-green-700">${totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-2xl font-semibold text-red-700">${totalExpenses.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${totalEventCosts.toFixed(2)} event · ${totalGeneralExpenses.toFixed(2)} general · ${totalCOGS.toFixed(2)} COGS
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={`text-2xl font-semibold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                ${netProfit.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">
          Realized from events that have ended.
          {committedFutureExpenses > 0 && (
            <> Plus <span className="font-medium text-foreground">${committedFutureExpenses.toFixed(2)}</span> committed to upcoming events (excluded from profit).</>
          )}
        </p>
      </div>

      {/* Per-event summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Event Summaries</CardTitle>
        </CardHeader>
        <CardContent>
          {eventSummary.length === 0 && (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          )}
          <div className="space-y-2">
            {eventSummary.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm border-b pb-2 gap-1"
              >
                <div>
                  <span className="font-medium">{ev.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {formatEventDate(ev.date_start, ev.date_end)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-700">
                    +${ev.totalRev.toFixed(2)}
                  </span>
                  <span className="text-red-700">
                    -${ev.totalCost.toFixed(2)}
                  </span>
                  <span
                    className={`font-medium ${ev.net >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    ${ev.net.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* COGS report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">COGS Report</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 && (
            <p className="text-xs text-muted-foreground">No sales yet.</p>
          )}
          <div className="space-y-1">
            {sales.slice(0, 30).map((s: any) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-xs border-b pb-1"
              >
                <div>
                  <span className="font-medium">{s.product?.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {s.event?.name}
                  </span>
                </div>
                <div className="flex gap-3 text-muted-foreground">
                  <span>
                    {s.qty_sold} × ${s.unit_cost}
                  </span>
                  <span className="font-medium text-foreground">
                    ${(s.qty_sold * s.unit_cost).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* General expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>General Expenses</span>
            <span className="text-muted-foreground font-normal">${totalGeneralExpenses.toFixed(2)} total</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generalExpenses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No general expenses recorded.</p>
          ) : (
            <div className="space-y-1">
              {generalExpenses.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-xs border-b pb-1">
                  <div>
                    <span className="font-medium">{c.type.replace(/_/g, " ").replace(/\b\w/g, (x: string) => x.toUpperCase())}</span>
                    {c.note && <span className="text-muted-foreground ml-2">{c.note}</span>}
                  </div>
                  <span className="font-medium">${c.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
