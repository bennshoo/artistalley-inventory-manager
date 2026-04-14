import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { EventForm } from '@/components/events/event-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Event } from '@/lib/database.types'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ data }, locationsRes] = await Promise.all([
    supabase.from('event').select('*').eq('id', id).single(),
    supabase.from('event').select('location').not('location', 'is', null).order('date_start', { ascending: false }),
  ])
  if (!data) notFound()
  const event = data as unknown as Event
  const pastLocations = [...new Set((locationsRes.data ?? []).map((e: any) => e.location).filter(Boolean))] as string[]

  return (
    <div className="space-y-4 max-w-xl">
      <Link href={`/events/${id}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> {event.name}
      </Link>
      <h1 className="text-2xl font-semibold">Edit Event</h1>
      <EventForm event={event} pastLocations={pastLocations} />
    </div>
  )
}
