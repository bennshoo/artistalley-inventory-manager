import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Edit, MapPin, ExternalLink } from 'lucide-react'
import { formatEventDate } from '@/lib/utils'
import { getAppStatusStyle } from '@/lib/event-app-status'
import { LinkButton } from '@/components/ui/link-button'
import { RevenueLogger } from '@/components/events/revenue-logger'
import { CostLogger } from '@/components/events/cost-logger'
import { SalesSheetManager } from '@/components/events/sales-sheet-manager'
import { DeleteEventButton } from '@/components/events/delete-event-button'
import { ToggleEventActiveButton } from '@/components/events/toggle-event-active-button'
import { EventNotesEditor } from '@/components/events/event-notes-editor'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [eventRes, revenueRes, costsRes, sheetsRes] = await Promise.all([
    supabase.from('event').select('*').eq('id', id).single(),
    supabase.from('event_revenue').select('*').eq('event_id', id),
    supabase.from('cost').select('*').eq('event_id', id).order('created_at'),
    supabase.from('sales_sheet').select('*').eq('event_id', id).order('generated_at', { ascending: false }),
  ])

  if (!eventRes.data) notFound()
  const event = eventRes.data
  const revenues = revenueRes.data ?? []
  const costs = costsRes.data ?? []
  const sheets = sheetsRes.data ?? []

  const totalRevenue = revenues.reduce((s, r) => s + (r.ending_balance - r.starting_balance), 0)
  const totalCosts = costs.reduce((s, c) => s + c.amount, 0)
  const netProfit = totalRevenue - totalCosts

  return (
    <div className="space-y-6">
      <Link href="/events" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> Events
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{formatEventDate(event.date_start, event.date_end)}</span>
            {event.location && <span className="flex items-center gap-1"><MapPin size={12} />{event.location}</span>}
            {event.tax_rate > 0 && <span>{(event.tax_rate * 100).toFixed(2)}% tax</span>}
            {event.app_status && (() => {
              const s = getAppStatusStyle(event.app_status)
              return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{event.app_status}</span>
            })()}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.web_address && (
            <a href={event.web_address} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-muted transition-colors">
              <ExternalLink size={14} />
            </a>
          )}
          <ToggleEventActiveButton eventId={id} isActive={event.is_active ?? true} />
          <LinkButton href={`/events/${id}/edit`} size="sm" variant="outline"><Edit size={14} className="mr-1" />Edit</LinkButton>
          <DeleteEventButton eventId={id} />
        </div>
      </div>

      <EventNotesEditor eventId={id} initialNotes={event.notes} />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-semibold text-green-700">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Costs</p>
            <p className="text-xl font-semibold text-red-700">${totalCosts.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p className={`text-xl font-semibold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ${netProfit.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue by Payment Method</CardTitle></CardHeader>
          <CardContent>
            <RevenueLogger eventId={id} initialRevenues={revenues} />
          </CardContent>
        </Card>

        {/* Costs */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Costs</CardTitle></CardHeader>
          <CardContent>
            <CostLogger eventId={id} initialCosts={costs} />
          </CardContent>
        </Card>
      </div>

      {/* Sales Sheet */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Sales Sheet</CardTitle></CardHeader>
        <CardContent>
          <SalesSheetManager eventId={id} eventDate={event.date_start} initialSheets={sheets} />
        </CardContent>
      </Card>
    </div>
  )
}
