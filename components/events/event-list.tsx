'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MapPin, Trash2, Loader2, Power, X, Search, ChevronDown, ChevronRight, ExternalLink, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEventDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { APP_STATUSES, getAppStatusStyle } from '@/lib/event-app-status'

type Event = {
  id: string
  name: string
  date_start: string
  date_end: string
  location: string | null
  is_active: boolean
  app_status: string
  web_address: string | null
  sales_sheet: { status: string }[]
}

const FILTERS_KEY = 'event-list-filters'

function loadEventFilters() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(sessionStorage.getItem(FILTERS_KEY) ?? '{}') } catch { return {} }
}

export function EventList({ initialEvents }: { initialEvents: Event[] }) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  useEffect(() => { setEvents(initialEvents) }, [initialEvents])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const lastCheckedIndex = useRef<number | null>(null)

  const [upcomingOpen, setUpcomingOpen] = useState(true)
  const [pastOpen, setPastOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [appStatusFilter, setAppStatusFilter] = useState('all')

  useEffect(() => {
    const saved = loadEventFilters()
    if (saved.search) setSearch(saved.search)
    if (saved.dateFrom) setDateFrom(saved.dateFrom)
    if (saved.dateTo) setDateTo(saved.dateTo)
    if (saved.statusFilter) setStatusFilter(saved.statusFilter)
    if (saved.appStatusFilter) setAppStatusFilter(saved.appStatusFilter)
  }, [])

  useEffect(() => {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ search, dateFrom, dateTo, statusFilter, appStatusFilter }))
  }, [search, dateFrom, dateTo, statusFilter, appStatusFilter])

  const hasActiveFilters = search.trim() || dateFrom || dateTo || statusFilter !== 'all' || appStatusFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('all')
    setAppStatusFilter('all')
    sessionStorage.removeItem(FILTERS_KEY)
  }

  const filtered = events.filter(e => {
    const matchesSearch = !search.trim() ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.location?.toLowerCase().includes(search.toLowerCase())

    const matchesFrom = !dateFrom || e.date_start >= dateFrom
    const matchesTo = !dateTo || e.date_end <= dateTo

    const isPending = e.sales_sheet?.some(s => s.status === 'pending')
    const isReconciled = e.sales_sheet?.some(s => s.status === 'reconciled')
    const hasNoSheet = !isPending && !isReconciled
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && isPending) ||
      (statusFilter === 'reconciled' && isReconciled) ||
      (statusFilter === 'none' && hasNoSheet)

    const matchesAppStatus = appStatusFilter === 'all' || e.app_status === appStatusFilter

    return matchesSearch && matchesFrom && matchesTo && matchesStatus && matchesAppStatus
  })

  const selectedEvents = events.filter(e => selected.has(e.id))
  const allSelectedActive = selectedEvents.every(e => e.is_active)
  const allSelectedInactive = selectedEvents.every(e => !e.is_active)

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(e => e.id)))
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

  function addOneYear(dateStr: string): string {
    const year = parseInt(dateStr.slice(0, 4), 10)
    const month = parseInt(dateStr.slice(5, 7), 10)
    const day = parseInt(dateStr.slice(8, 10), 10)
    // Handle Feb 29 leap year edge case
    const candidate = new Date(year + 1, month - 1, day)
    const y = candidate.getFullYear()
    const m = String(candidate.getMonth() + 1).padStart(2, '0')
    const d = String(candidate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  async function handleDuplicate() {
    setDuplicating(true)
    const sourceEvents = events.filter(e => selected.has(e.id))
    const inserts = sourceEvents.map(e => ({
      name: e.name,
      date_start: addOneYear(e.date_start),
      date_end: addOneYear(e.date_end),
      location: e.location,
      tax_rate: (e as any).tax_rate,
      is_active: true,
      app_status: 'Unreleased',
      notes: (e as any).notes ?? null,
      web_address: e.web_address,
    }))
    const { data, error } = await supabase.from('event').insert(inserts).select()
    setDuplicating(false)
    setShowDuplicateConfirm(false)
    if (error) { toast.error(error.message); return }
    setEvents(prev => [...prev, ...(data ?? [])].sort((a, b) => a.date_start.localeCompare(b.date_start)))
    setSelected(new Set())
    toast.success(`${inserts.length} event${inserts.length > 1 ? 's' : ''} duplicated for next year`)
    router.refresh()
  }

  function handleCheckboxClick(e: React.MouseEvent<HTMLInputElement>, event: Event, filteredIndex: number) {
    e.stopPropagation()
    if (e.shiftKey && lastCheckedIndex.current !== null) {
      const start = Math.min(lastCheckedIndex.current, filteredIndex)
      const end = Math.max(lastCheckedIndex.current, filteredIndex)
      const idsInRange = filtered.slice(start, end + 1).map(item => item.id)
      const shouldSelect = !selected.has(event.id)
      setSelected(prev => {
        const next = new Set(prev)
        for (const id of idsInRange) shouldSelect ? next.add(id) : next.delete(id)
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        next.has(event.id) ? next.delete(event.id) : next.add(event.id)
        return next
      })
    }
    lastCheckedIndex.current = filteredIndex
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name or location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <span className={statusFilter === 'all' ? 'text-xs text-muted-foreground' : 'text-xs'}>
              {statusFilter === 'all' ? 'All sheet statuses' :
               statusFilter === 'pending' ? 'Sheet pending' :
               statusFilter === 'reconciled' ? 'Reconciled' : 'No sheet'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sheet statuses</SelectItem>
            <SelectItem value="pending">Sheet pending</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
            <SelectItem value="none">No sheet</SelectItem>
          </SelectContent>
        </Select>

        <Select value={appStatusFilter} onValueChange={v => setAppStatusFilter(v ?? 'all')}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <span className={appStatusFilter === 'all' ? 'text-xs text-muted-foreground' : 'text-xs'}>
              {appStatusFilter === 'all' ? 'All app statuses' : appStatusFilter}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All app statuses</SelectItem>
            {APP_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-8 w-36 min-w-0 text-xs"
          placeholder="From"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-8 w-36 min-w-0 text-xs"
          placeholder="To"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X size={13} />
          </button>
        )}

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="h-8 inline-flex items-center rounded-md px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={12} className="mr-1" />Reset filters
          </button>
        )}
      </div>

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
          <Button size="sm" variant="outline" onClick={() => setShowDuplicateConfirm(true)} disabled={loading || duplicating}>
            <Copy size={13} className="mr-1" />Duplicate for next year
          </Button>
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
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="px-2"><X size={13} /></Button>
            </>
          )}
        </div>
      </div>

      {/* Select all row */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary cursor-pointer"
            checked={selected.size === filtered.length && filtered.length > 0}
            onChange={toggleAll}
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}

      <Dialog open={showDuplicateConfirm} onOpenChange={open => { if (!open) setShowDuplicateConfirm(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate {selected.size} event{selected.size > 1 ? 's' : ''} for next year?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Please manually verify and change event details as needed (dates, location, link).
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDuplicateConfirm(false)} disabled={duplicating}>Cancel</Button>
            <Button size="sm" onClick={handleDuplicate} disabled={duplicating}>
              {duplicating && <Loader2 size={14} className="mr-1 animate-spin" />}Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grouped event rows */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {events.length === 0
            ? <><span>No events yet. </span><Link href="/events/new" className="underline">Create one.</Link></>
            : 'No events match the current filters.'}
        </p>
      ) : (() => {
        const today = new Date().toISOString().split('T')[0]
        const upcoming = filtered.filter(e => e.date_end >= today)
        const past = filtered.filter(e => e.date_end < today)

        const renderRow = (event: Event, filteredIndex: number) => {
          const hasPendingSheet = event.sales_sheet?.some(s => s.status === 'pending')
          const hasReconciledSheet = event.sales_sheet?.some(s => s.status === 'reconciled')
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
                className="h-4 w-4 accent-primary cursor-pointer shrink-0"
                checked={isSelected}
                onChange={() => {}}
                onClick={e => handleCheckboxClick(e, event, filteredIndex)}
              />
              <Link href={`/events/${event.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{event.name}</span>
                    {event.app_status && event.app_status !== 'Unreleased' && (() => {
                      const s = getAppStatusStyle(event.app_status)
                      return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{event.app_status}</span>
                    })()}
                    {!event.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    {hasPendingSheet && <Badge variant="outline" className="text-xs">Sheet Pending</Badge>}
                    {hasReconciledSheet && <Badge variant="secondary" className="text-xs">Reconciled</Badge>}
                  </div>
                  {event.location && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} />{event.location}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground shrink-0">{formatEventDate(event.date_start, event.date_end)}</span>
              </Link>
              {event.web_address && (
                <a href={event.web_address} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          )
        }

        return (
          <div className="space-y-4">
            {past.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setPastOpen(v => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/70 transition-colors"
                >
                  {pastOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Past Events
                  <span className="text-xs text-muted-foreground font-normal">({past.length})</span>
                </button>
                {pastOpen && <div className="space-y-2">{past.map((e, i) => renderRow(e, i))}</div>}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setUpcomingOpen(v => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/70 transition-colors"
                >
                  {upcomingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Upcoming Events
                  <span className="text-xs text-muted-foreground font-normal">({upcoming.length})</span>
                </button>
                {upcomingOpen && <div className="space-y-2">{upcoming.map((e, i) => renderRow(e, past.length + i))}</div>}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
