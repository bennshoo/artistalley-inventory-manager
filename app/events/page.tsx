import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const { data: events } = await supabase
    .from('event')
    .select('*, sales_sheet(status)')
    .order('date', { ascending: false })

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-muted-foreground text-sm">{events?.length ?? 0} events</p>
        </div>
        <LinkButton href="/events/new" size="sm"><Plus size={14} className="mr-1" />New Event</LinkButton>
      </div>

      <div className="space-y-2">
        {events?.map((event: any) => {
          const hasPendingSheet = event.sales_sheet?.some((s: any) => s.status === 'pending')
          const hasImportedSheet = event.sales_sheet?.some((s: any) => s.status === 'imported')
          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center gap-4 border rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{event.name}</span>
                  {hasPendingSheet && <Badge variant="outline" className="text-xs">Sheet Pending</Badge>}
                  {hasImportedSheet && <Badge variant="secondary" className="text-xs">Imported</Badge>}
                </div>
                {event.location && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={10} />{event.location}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{event.date}</span>
            </Link>
          )
        })}
        {(!events || events.length === 0) && (
          <p className="text-sm text-muted-foreground">No events yet. <Link href="/events/new" className="underline">Create one.</Link></p>
        )}
      </div>
    </div>
  )
}
