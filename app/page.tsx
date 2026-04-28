import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package, AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react'
import { formatEventDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [productsRes, eventsRes, salesRes] = await Promise.all([
    supabase.from('product').select('id, name, quantity, sku').eq('is_active', true),
    supabase.from('event').select('id, name, date_start, date_end, location')
      .gte('date_end', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .eq('app_status', 'Accepted')
      .order('date_start', { ascending: true }),
    supabase.from('sale').select('qty_sold, unit_cost'),
  ])

  const products = productsRes.data ?? []
  const events = eventsRes.data ?? []
  const sales = salesRes.data ?? []

  const lowStock = products.filter(p => p.quantity <= 5)
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0)
  const totalCOGS = sales.reduce((s, r) => s + r.qty_sold * r.unit_cost, 0)
  const totalSold = sales.reduce((s, r) => s + r.qty_sold, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Inventory overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Package size={12} /> Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{products.length}</div>
            <p className="text-xs text-muted-foreground">{totalUnits} units in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle size={12} /> Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground">5 units or less</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp size={12} /> Units Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalSold}</div>
            <p className="text-xs text-muted-foreground">across all events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp size={12} /> Total COGS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${totalCOGS.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">cost of goods sold</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lowStock.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" /> Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <Link href={`/products/${p.id}`} className="hover:underline">{p.name}</Link>
                  <Badge variant={p.quantity === 0 ? 'destructive' : 'outline'} className="text-xs">
                    {p.quantity} left
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays size={14} /> Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
            {(() => {
              const today = new Date().toISOString().split('T')[0]
              const msPerDay = 1000 * 60 * 60 * 24
              return events.map(e => {
                const isPast = (e as any).date_end < today
                const daysUntilStart = Math.round(
                  (new Date((e as any).date_start).getTime() - new Date(today).getTime()) / msPerDay
                )
                const isOngoing = (e as any).date_start <= today && (e as any).date_end >= today
                let countdown: string | null = null
                if (!isPast) {
                  if (isOngoing) countdown = 'Ongoing'
                  else if (daysUntilStart === 0) countdown = 'Today'
                  else if (daysUntilStart === 1) countdown = 'Tomorrow'
                  else countdown = `${daysUntilStart} days left`
                }
                return (
                  <div key={e.id} className={`flex items-center justify-between text-sm ${isPast ? 'opacity-50' : ''}`}>
                    <Link href={`/events/${e.id}`} className="hover:underline">{e.name}</Link>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {countdown && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOngoing ? 'bg-green-600 text-white' : 'bg-foreground text-background'}`}>
                          {countdown}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {formatEventDate((e as any).date_start, (e as any).date_end)}
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
