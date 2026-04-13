import { EventForm } from '@/components/events/event-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewEventPage() {
  return (
    <div className="space-y-4 max-w-xl">
      <Link href="/events" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> Events
      </Link>
      <h1 className="text-2xl font-semibold">New Event</h1>
      <EventForm />
    </div>
  )
}
