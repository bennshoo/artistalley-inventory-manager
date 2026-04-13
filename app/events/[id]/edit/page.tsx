import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { EventForm } from '@/components/events/event-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Event } from '@/lib/database.types'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabase.from('event').select('*').eq('id', id).single()
  if (!data) notFound()
  const event = data as unknown as Event

  return (
    <div className="space-y-4 max-w-xl">
      <Link href={`/events/${id}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> {event.name}
      </Link>
      <h1 className="text-2xl font-semibold">Edit Event</h1>
      <EventForm event={event} />
    </div>
  )
}
