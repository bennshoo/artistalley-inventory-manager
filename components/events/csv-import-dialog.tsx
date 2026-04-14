'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, FileUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'
import { APP_STATUSES } from '@/lib/event-app-status'

interface Mapping {
  name: string
  date_start: string
  date_end: string
  location: string
  tax_rate: string
  app_status: string
}

interface ParsedRow {
  name: string
  date_start: string
  date_end: string
  location: string | null
  tax_rate: number
  app_status: string
  isDuplicate: boolean
  existingId: string | null
}

const NONE = '__none__'

export function EventCsvImportDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({ name: '', date_start: '', date_end: '', location: '', tax_rate: '' })
  const [mapErrors, setMapErrors] = useState<Partial<Mapping>>({})
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'overwrite'>('skip')
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  function reset() {
    setStep('upload')
    setHeaders([])
    setRawRows([])
    setMapping({ name: '', date_start: '', date_end: '', location: '', tax_rate: '', app_status: '' })
    setMapErrors({})
    setParsed([])
    setDuplicateAction('skip')
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(e.target?.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const all = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]
      const nonEmpty = all.filter(r => r.some(c => c !== null && c !== undefined && String(c).trim() !== ''))
      if (nonEmpty.length < 2) {
        toast.error('File must have a header row and at least one data row.')
        return
      }
      setHeaders(nonEmpty[0].map(h => String(h ?? '').trim()))
      setRawRows(nonEmpty.slice(1))
      setMapping({ name: '', date_start: '', date_end: '', location: '', tax_rate: '', app_status: '' })
      setMapErrors({})
      setStep('map')
    }
    reader.readAsArrayBuffer(file)
  }

  /** Normalise a cell value to a YYYY-MM-DD string, or null if unparseable */
  function parseDate(raw: any): string | null {
    if (!raw) return null
    // Excel serial number
    if (typeof raw === 'number') {
      const d = XLSX.SSF.parse_date_code(raw)
      if (!d) return null
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    }
    const s = String(raw).trim()
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // M/D/YYYY or M/D/YY
    const parts = s.split('/')
    if (parts.length === 3) {
      const [m, d, y] = parts.map(Number)
      const year = y < 100 ? 2000 + y : y
      return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return null
  }

  async function buildPreview() {
    const errors: Partial<Mapping> = {}
    if (!mapping.name) errors.name = 'Required'
    if (!mapping.date_start) errors.date_start = 'Required'
    if (Object.keys(errors).length > 0) { setMapErrors(errors); return }

    setPreviewing(true)

    const nameIdx = headers.indexOf(mapping.name)
    const dateStartIdx = headers.indexOf(mapping.date_start)
    const dateEndIdx = mapping.date_end && mapping.date_end !== NONE ? headers.indexOf(mapping.date_end) : -1
    const locationIdx = mapping.location && mapping.location !== NONE ? headers.indexOf(mapping.location) : -1
    const taxRateIdx = mapping.tax_rate && mapping.tax_rate !== NONE ? headers.indexOf(mapping.tax_rate) : -1
    const appStatusIdx = mapping.app_status && mapping.app_status !== NONE ? headers.indexOf(mapping.app_status) : -1

    const result: Omit<ParsedRow, 'isDuplicate' | 'existingId'>[] = []
    const parseErrors: string[] = []

    for (const row of rawRows) {
      const name = String(row[nameIdx] ?? '').trim()
      if (!name) continue

      const date_start = parseDate(row[dateStartIdx])
      if (!date_start) { parseErrors.push(`Skipped "${name}": invalid start date`); continue }

      const date_end = dateEndIdx >= 0 ? (parseDate(row[dateEndIdx]) ?? date_start) : date_start
      const location = locationIdx >= 0 ? String(row[locationIdx] ?? '').trim() || null : null
      const tax_rate = taxRateIdx >= 0 ? parseFloat(String(row[taxRateIdx])) || 0 : 0
      const rawAppStatus = appStatusIdx >= 0 ? String(row[appStatusIdx] ?? '').trim() : ''
      const app_status = APP_STATUSES.includes(rawAppStatus as any) ? rawAppStatus : 'Unreleased'

      result.push({ name, date_start, date_end, location, tax_rate, app_status })
    }

    if (parseErrors.length > 0) toast.warning(parseErrors.slice(0, 3).join('\n'))

    if (result.length === 0) {
      toast.error('No valid rows found.')
      setPreviewing(false)
      return
    }

    // Check for duplicate names
    const names = result.map(r => r.name.toLowerCase())
    const { data: existing } = await supabase
      .from('event')
      .select('id, name')
      .in('name', result.map(r => r.name))

    const existingMap: Record<string, string> = {}
    for (const e of existing ?? []) existingMap[e.name.toLowerCase()] = e.id

    setParsed(result.map(r => ({
      ...r,
      isDuplicate: !!existingMap[r.name.toLowerCase()],
      existingId: existingMap[r.name.toLowerCase()] ?? null,
    })))
    setPreviewing(false)
    setStep('preview')
  }

  async function handleImport() {
    setImporting(true)

    const newRows = parsed.filter(p => !p.isDuplicate)
    const dupRows = parsed.filter(p => p.isDuplicate)

    if (newRows.length > 0) {
      const { error } = await supabase.from('event').insert(newRows.map(p => ({
        name: p.name,
        date_start: p.date_start,
        date_end: p.date_end,
        location: p.location,
        tax_rate: p.tax_rate,
        app_status: p.app_status,
        is_active: true,
      })))
      if (error) { toast.error(error.message); setImporting(false); return }
    }

    if (duplicateAction === 'overwrite' && dupRows.length > 0) {
      for (const p of dupRows) {
        const { error } = await supabase.from('event').update({
          name: p.name,
          date_start: p.date_start,
          date_end: p.date_end,
          location: p.location,
          tax_rate: p.tax_rate,
          app_status: p.app_status,
        }).eq('id', p.existingId!)
        if (error) { toast.error(`Failed to update "${p.name}": ${error.message}`); setImporting(false); return }
      }
    }

    const importedCount = newRows.length + (duplicateAction === 'overwrite' ? dupRows.length : 0)
    const skippedCount = duplicateAction === 'skip' ? dupRows.length : 0
    const parts = []
    if (importedCount > 0) parts.push(`${importedCount} event${importedCount > 1 ? 's' : ''} imported`)
    if (skippedCount > 0) parts.push(`${skippedCount} duplicate${skippedCount > 1 ? 's' : ''} skipped`)
    toast.success(parts.join(', '))

    setImporting(false)
    setOpen(false)
    reset()
    router.refresh()
  }

  const dupCount = parsed.filter(p => p.isDuplicate).length

  const FIELDS = [
    { field: 'name' as const,       label: 'Event Name',         required: true },
    { field: 'app_status' as const, label: 'Application Status', required: false },
    { field: 'date_start' as const, label: 'Start Date',         required: true },
    { field: 'date_end' as const,   label: 'End Date',           required: false },
    { field: 'location' as const,   label: 'Location',           required: false },
    { field: 'tax_rate' as const,   label: 'Tax Rate',           required: false },
  ]

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(true) }}>
        <FileUp size={14} className="mr-1" />Import CSV
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset() }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {step === 'upload' && 'Import Events from CSV'}
              {step === 'map' && 'Match Columns'}
              {step === 'preview' && 'Preview Import'}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file. You'll map the columns in the next step.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-10 cursor-pointer hover:bg-muted/50 transition-colors">
                <FileUp size={24} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to choose a file</span>
                <span className="text-xs text-muted-foreground">.csv, .xlsx, .xls</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </label>
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Match your spreadsheet columns to the event fields below.
              </p>
              <div className="space-y-3">
                {FIELDS.map(({ field, label, required }) => (
                  <div key={field} className="grid grid-cols-[140px_1fr] items-center gap-4">
                    <span className="text-sm font-medium">
                      {label}{required && <span className="text-destructive ml-0.5">*</span>}
                    </span>
                    <div className="space-y-1">
                      <Select
                        value={mapping[field]}
                        onValueChange={v => {
                          setMapping(m => ({ ...m, [field]: v === NONE ? '' : (v ?? '') }))
                          setMapErrors(e => ({ ...e, [field]: undefined }))
                        }}
                      >
                        <SelectTrigger className={cn('w-full', mapErrors[field] && 'border-destructive')}>
                          <span className={mapping[field] ? 'text-sm' : 'text-muted-foreground text-sm'}>
                            {mapping[field] || (required ? 'Select column' : 'Select column (optional)')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {!required && <SelectItem value={NONE}>— Skip —</SelectItem>}
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mapErrors[field] && (
                        <p className="text-xs text-destructive">{mapErrors[field]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Dates can be YYYY-MM-DD, M/D/YYYY, or Excel date values. If End Date is omitted it defaults to Start Date.
                Duplicates are matched by event name.
              </p>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm flex-wrap">
                <span><span className="font-medium">{parsed.length}</span> events ready</span>
                {dupCount > 0 && (
                  <span className="text-orange-600">
                    <span className="font-medium">{dupCount}</span> duplicate name{dupCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {dupCount > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30 px-3 py-2">
                  <span className="text-xs text-orange-800 dark:text-orange-300 flex-1">
                    {dupCount} event{dupCount > 1 ? 's' : ''} with matching names already exist. What should happen?
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant={duplicateAction === 'skip' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setDuplicateAction('skip')}>Skip</Button>
                    <Button size="sm" variant={duplicateAction === 'overwrite' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setDuplicateAction('overwrite')}>Overwrite</Button>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Start</th>
                      <th className="text-left px-3 py-2 font-medium">End</th>
                      <th className="text-left px-3 py-2 font-medium">Location</th>
                      <th className="text-left px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 8).map((row, i) => (
                      <tr key={i} className={cn('border-t', row.isDuplicate && 'bg-orange-50/50 dark:bg-orange-950/20')}>
                        <td className="px-3 py-1.5 truncate max-w-45">{row.name}</td>
                        <td className="px-3 py-1.5">{row.date_start}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.date_end !== row.date_start ? row.date_end : '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground truncate max-w-30">{row.location ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          {row.isDuplicate && (
                            <span className="text-orange-600 font-medium">{duplicateAction}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 8 && (
                  <p className="text-xs text-muted-foreground px-3 py-2 border-t">…and {parsed.length - 8} more</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {step === 'upload' && (
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            )}
            {step === 'map' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>Back</Button>
                <Button size="sm" onClick={buildPreview} disabled={previewing}>
                  {previewing && <Loader2 size={14} className="mr-1 animate-spin" />}
                  Preview
                </Button>
              </>
            )}
            {step === 'preview' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep('map')}>Back</Button>
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing && <Loader2 size={14} className="mr-1 animate-spin" />}
                  Import {parsed.length - (duplicateAction === 'skip' ? dupCount : 0)} event{parsed.length > 1 ? 's' : ''}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
