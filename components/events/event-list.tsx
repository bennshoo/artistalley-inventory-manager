'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEventDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Event = {
  id: string
  name: string
  date_start: string
  date_end: string
  location: string | null
  sales_sheet: { status: string }[]
}

export function EventList({ initialEvents }: { initialEvents: Event[] }) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault()
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === events.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(events.map(e => e.id)))
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const ids = [...selected]
    const { error } = await supabase.from('event').delete().in('id', ids)
    if (error) {
      toast.error(error.message)
      setDeleting(false)
      setConfirming(false)
      return
    }
    setEvents(prev => prev.filter(e => !ids.includes(e.id)))
    setSelected(new Set())
    setConfirming(false)
    setDeleting(false)
    toast.success(`${ids.length} event${ids.length > 1 ? 's' : ''} deleted`)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Bulk toolbar — always rendered to reserve space */}
      <div className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2.5 bg-muted/50 transition-all',
        selected.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <span className="text-sm font-medium">{selected.size} selected</span>
        <div className="flex-1" />
        {confirming ? (
          <>
            <span className="text-sm text-muted-foreground">Delete {selected.size} event{selected.size > 1 ? 's' : ''}?</span>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 size={14} className="mr-1 animate-spin" />}
              Yes, delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>Cancel</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 size={14} className="mr-1" />Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
          </>
        )}
      </div>

      {/* Select all row */}
      {events.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input cursor-pointer"
            checked={selected.size === events.length && events.length > 0}
            onChange={toggleAll}
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}

      {/* Event rows */}
      <div className="space-y-2">
        {events.map(event => {
          const hasPendingSheet = event.sales_sheet?.some(s => s.status === 'pending')
          const hasImportedSheet = event.sales_sheet?.some(s => s.status === 'imported')
          const isSelected = selected.has(event.id)
          return (
            <div
              key={event.id}
              className={`flex items-center gap-3 border rounded-lg px-4 py-3 transition-colors ${isSelected ? 'bg-muted border-foreground/20' : 'hover:bg-muted/50'}`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input cursor-pointer shrink-0"
                checked={isSelected}
                onChange={() => {}}
                onClick={e => toggleSelect(event.id, e)}
              />
              <Link href={`/events/${event.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
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
                <span className="text-sm text-muted-foreground shrink-0">{formatEventDate(event.date_start, event.date_end)}</span>
              </Link>
            </div>
          )
        })}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">No events yet. <Link href="/events/new" className="underline">Create one.</Link></p>
        )}
      </div>
    </div>
  )
}
