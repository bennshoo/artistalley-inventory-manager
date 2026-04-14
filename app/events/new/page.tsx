import { supabase } from '@/lib/supabase'
import { EventForm } from '@/components/events/event-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NewEventPage() {
  const { data } = await supabase
    .from('event').select('location').not('location', 'is', null).order('date_start', { ascending: false })
  const pastLocations = [...new Set((data ?? []).map((e: any) => e.location).filter(Boolean))] as string[]

  return (
    <div className="space-y-4 max-w-xl">
      <Link href="/events" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> Events
      </Link>
      <h1 className="text-2xl font-semibold">New Event</h1>
      <EventForm pastLocations={pastLocations} />
    </div>
  )
}
