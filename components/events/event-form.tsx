'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Event } from '@/lib/database.types'

export function EventForm({ event, pastLocations = [] }: { event?: Event; pastLocations?: string[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: event?.name ?? '',
    date_start: event?.date_start ?? today,
    date_end: event?.date_end ?? today,
    location: event?.location ?? '',
    tax_rate: event?.tax_rate?.toString() ?? '0',
  })
  const set = (f: string, v: string) => setForm(x => ({ ...x, [f]: v }))
  const [showSuggestions, setShowSuggestions] = useState(false)
  const locationRef = useRef<HTMLDivElement>(null)

  const locationSuggestions = form.location.trim()
    ? pastLocations.filter(l => l.toLowerCase().includes(form.location.toLowerCase()) && l !== form.location)
    : pastLocations

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.date_end < form.date_start) {
      toast.error('End date cannot be before start date.')
      return
    }
    setLoading(true)
    const payload = {
      name: form.name,
      date_start: form.date_start,
      date_end: form.date_end,
      location: form.location || null,
      tax_rate: parseFloat(form.tax_rate) || 0,
    }
    if (event) {
      const { error } = await supabase.from('event').update(payload).eq('id', event.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Event updated')
      router.push(`/events/${event.id}`)
    } else {
      const { data, error } = await supabase.from('event').insert(payload).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Event created')
      router.push(`/events/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Anime Expo 2025" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date_start">Date Start</Label>
          <Input id="date_start" type="date" value={form.date_start}
            onChange={e => {
              set('date_start', e.target.value)
              if (form.date_end < e.target.value) set('date_end', e.target.value)
            }} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_end">Date End</Label>
          <Input id="date_end" type="date" value={form.date_end} min={form.date_start}
            onChange={e => set('date_end', e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <div ref={locationRef} className="relative">
          <Input
            id="location"
            value={form.location}
            onChange={e => { set('location', e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="City, State"
            autoComplete="off"
          />
          {showSuggestions && locationSuggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md overflow-hidden">
              {locationSuggestions.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); set('location', loc); setShowSuggestions(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                >
                  {loc}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tax_rate">Sales Tax Rate</Label>
        <Input id="tax_rate" type="number" step="0.0001" min="0" max="1" value={form.tax_rate}
          onChange={e => set('tax_rate', e.target.value)} placeholder="e.g. 0.0825 for 8.25%" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} size="sm">
          {loading && <Loader2 size={14} className="mr-1 animate-spin" />}
          {event ? 'Save Changes' : 'Create Event'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
