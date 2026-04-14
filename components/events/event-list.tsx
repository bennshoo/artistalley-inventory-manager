'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Trash2, Loader2, Power } from 'lucide-react'
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
  is_active: boolean
  sales_sheet: { status: string }[]
}

export function EventList({ initialEvents }: { initialEvents: Event[] }) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedEvents = events.filter(e => selected.has(e.id))
  const allSelectedActive = selectedEvents.every(e => e.is_active)
  const allSelectedInactive = selectedEvents.every(e => !e.is_active)

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

  async function bulkSetActive(active: boolean) {
    setLoading(true)
    const ids = [...selected]
    const { error } = await supabase.from('event').update({ is_active: active }).in('id', ids)
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setEvents(prev => prev.map(e => selected.has(e.id) ? { ...e, is_active: active } : e))
    setLoading(false)
    toast.success(`${ids.length} event${ids.length > 1 ? 's' : ''} ${active ? 'activated' : 'deactivated'}`)
  }

  async function handleDelete() {
    setLoading(true)
    const ids = [...selected]
    const { error } = await supabase.from('event').delete().in('id', ids)
    if (error) {
      toast.error(error.message)
      setLoading(false)
      setConfirming(false)
      return
    }
    setEvents(prev => prev.filter(e => !ids.includes(e.id)))
    setSelected(new Set())
    setConfirming(false)
    setLoading(false)
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
        <div className="flex gap-2 ml-auto flex-wrap">
          {!allSelectedActive && (
            <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)} disabled={loading}>
              <Power size={13} className="mr-1" />Activate
            </Button>
          )}
          {!allSelectedInactive && (
            <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)} disabled={loading}>
              <Power size={13} className="mr-1" />Deactivate
            </Button>
          )}
          {confirming ? (
            <>
              <span className="text-sm text-muted-foreground self-center">Delete {selected.size} event{selected.size > 1 ? 's' : ''}?</span>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading && <Loader2 size={14} className="mr-1 animate-spin" />}
                Yes, delete
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={loading}>Cancel</Button>
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
              className={cn(
                'flex items-center gap-3 border rounded-lg px-4 py-3 transition-colors',
                isSelected ? 'bg-muted border-foreground/20' : 'hover:bg-muted/50',
                !event.is_active && 'bg-muted/60 border-muted-foreground/20 opacity-60'
              )}
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
                    {!event.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
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
