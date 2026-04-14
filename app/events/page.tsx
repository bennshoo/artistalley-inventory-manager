import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'
import { EventList } from '@/components/events/event-list'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const { data: events } = await supabase
    .from('event')
    .select('*, sales_sheet(status)')
    .order('date_start', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-muted-foreground text-sm">{events?.length ?? 0} events</p>
        </div>
        <LinkButton href="/events/new" size="sm"><Plus size={14} className="mr-1" />New Event</LinkButton>
      </div>

      <EventList initialEvents={(events ?? []) as any} />
    </div>
  )
}
