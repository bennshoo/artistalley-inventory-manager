import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatEventDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const [salesRes, productsRes, eventsRes, revenueRes, costsRes] = await Promise.all([
    supabase.from('sale').select('*, product(name, sku, category(name)), event(name, date_start, date_end)').order('date', { ascending: false }),
    supabase.from('product').select('id, name, sku, quantity, category(name)').order('quantity'),
    supabase.from('event').select('id, name, date_start, date_end').order('date_start', { ascending: false }),
    supabase.from('event_revenue').select('*, event(name)'),
    supabase.from('cost').select('*, event(name)'),
  ])

  const sales = (salesRes.data ?? []) as any[]
  const products = (productsRes.data ?? []) as any[]
  const events = (eventsRes.data ?? []) as any[]
  const revenues = (revenueRes.data ?? []) as any[]
  const costs = (costsRes.data ?? []) as any[]

  // Product performance: units sold per product
  const productSales: Record<string, { name: string; sku: string; qty: number; cogs: number }> = {}
  for (const s of sales) {
    if (!productSales[s.product_id]) {
      productSales[s.product_id] = { name: s.product?.name ?? '', sku: s.product?.sku ?? '', qty: 0, cogs: 0 }
    }
    productSales[s.product_id].qty += s.qty_sold
    productSales[s.product_id].cogs += s.qty_sold * s.unit_cost
  }
  const sortedProductSales = Object.values(productSales).sort((a, b) => b.qty - a.qty)

  // Revenue by category
  const catRevenue: Record<string, number> = {}
  for (const s of sales) {
    const cat = s.product?.category?.name ?? 'Uncategorized'
    catRevenue[cat] = (catRevenue[cat] ?? 0) + s.qty_sold
  }

  // Per-event summary
  const eventSummary = events.map(ev => {
    const evRevenues = revenues.filter((r: any) => r.event_id === ev.id)
    const evCosts = costs.filter((c: any) => c.event_id === ev.id)
    const totalRev = evRevenues.reduce((s: number, r: any) => s + (r.ending_balance - r.starting_balance), 0)
    const totalCost = evCosts.reduce((s: number, c: any) => s + c.amount, 0)
    return { ...ev, totalRev, totalCost, net: totalRev - totalCost }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">Business insights across all events</p>
      </div>

      {/* Per-event summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Event Summaries</CardTitle></CardHeader>
        <CardContent>
          {eventSummary.length === 0 && <p className="text-xs text-muted-foreground">No events yet.</p>}
          <div className="space-y-2">
            {eventSummary.map(ev => (
              <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm border-b pb-2 gap-1">
                <div>
                  <span className="font-medium">{ev.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {formatEventDate(ev.date_start, ev.date_end)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-700">+${ev.totalRev.toFixed(2)}</span>
                  <span className="text-red-700">-${ev.totalCost.toFixed(2)}</span>
                  <span className={`font-medium ${ev.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${ev.net.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product performance */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Product Performance</CardTitle></CardHeader>
          <CardContent>
            {sortedProductSales.length === 0 && <p className="text-xs text-muted-foreground">No sales yet.</p>}
            <div className="space-y-1">
              {sortedProductSales.slice(0, 20).map(p => (
                <div key={p.sku} className="flex items-center justify-between text-xs border-b pb-1">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-1">({p.sku})</span>
                  </div>
                  <div className="flex gap-3">
                    <span>{p.qty} sold</span>
                    <span className="text-muted-foreground">COGS ${p.cogs.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by category */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Units Sold by Category</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(catRevenue).length === 0 && <p className="text-xs text-muted-foreground">No sales yet.</p>}
            <div className="space-y-2">
              {Object.entries(catRevenue).sort(([, a], [, b]) => b - a).map(([cat, qty]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span>{cat}</span>
                  <Badge variant="secondary">{qty} units</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory status */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Current Inventory Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {products.map((p: any) => (
              <div key={p.id} className="border rounded p-2 text-xs">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-muted-foreground">{p.sku}</p>
                <Badge
                  variant={p.quantity === 0 ? 'destructive' : p.quantity <= 5 ? 'outline' : 'secondary'}
                  className="text-xs mt-1"
                >
                  {p.quantity} in stock
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* COGS report */}
      <Card>
        <CardHeader><CardTitle className="text-sm">COGS Report</CardTitle></CardHeader>
        <CardContent>
          {sales.length === 0 && <p className="text-xs text-muted-foreground">No sales yet.</p>}
          <div className="space-y-1">
            {sales.slice(0, 30).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-xs border-b pb-1">
                <div>
                  <span className="font-medium">{s.product?.name}</span>
                  <span className="text-muted-foreground ml-2">{s.event?.name}</span>
                </div>
                <div className="flex gap-3 text-muted-foreground">
                  <span>{s.qty_sold} × ${s.unit_cost}</span>
                  <span className="font-medium text-foreground">${(s.qty_sold * s.unit_cost).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
