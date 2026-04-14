'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, FileUp } from 'lucide-react'
import { Category } from '@/lib/database.types'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'

interface Props {
  categories: Category[]
}

interface Mapping {
  name: string
  sku: string
  category: string
}

interface ParsedRow {
  name: string
  sku: string
  category_id: string | null
  matchedCategory: string | null
}

const NONE = '__none__'

export function CsvImportDialog({ categories }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({ name: '', sku: '', category: '' })
  const [mapErrors, setMapErrors] = useState<Partial<Mapping>>({})
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)

  function reset() {
    setStep('upload')
    setHeaders([])
    setRawRows([])
    setMapping({ name: '', sku: '', category: '' })
    setMapErrors({})
    setParsed([])
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
      setMapping({ name: '', sku: '', category: '' })
      setMapErrors({})
      setStep('map')
    }
    reader.readAsArrayBuffer(file)
  }

  function buildPreview() {
    const errors: Partial<Mapping> = {}
    if (!mapping.name) errors.name = 'Required'
    if (!mapping.sku) errors.sku = 'Required'
    if (Object.keys(errors).length > 0) { setMapErrors(errors); return }

    const catMap: Record<string, Category> = {}
    for (const c of categories) catMap[c.name.toLowerCase().trim()] = c

    const nameIdx = headers.indexOf(mapping.name)
    const skuIdx = headers.indexOf(mapping.sku)
    const catIdx = mapping.category && mapping.category !== NONE ? headers.indexOf(mapping.category) : -1

    const result: ParsedRow[] = []
    for (const row of rawRows) {
      const name = String(row[nameIdx] ?? '').trim()
      const sku = String(row[skuIdx] ?? '').trim()
      if (!name || !sku) continue

      let category_id: string | null = null
      let matchedCategory: string | null = null
      if (catIdx >= 0) {
        const raw = String(row[catIdx] ?? '').trim().toLowerCase()
        const match = catMap[raw]
        if (match) { category_id = match.id; matchedCategory = match.name }
      }
      result.push({ name, sku, category_id, matchedCategory })
    }

    if (result.length === 0) {
      toast.error('No valid rows found. Make sure Name and SKU columns have data.')
      return
    }
    setParsed(result)
    setStep('preview')
  }

  async function handleImport() {
    setImporting(true)
    const records = parsed.map(p => ({
      name: p.name,
      sku: p.sku,
      category_id: p.category_id,
      is_active: !!p.category_id,
    }))
    const { error } = await supabase.from('product').insert(records)
    if (error) { toast.error(error.message); setImporting(false); return }
    toast.success(`Imported ${records.length} product${records.length > 1 ? 's' : ''}`)
    setImporting(false)
    setOpen(false)
    reset()
    router.refresh()
  }

  const noMatchCount = parsed.filter(p => !p.category_id).length

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(true) }}>
        <FileUp size={14} className="mr-1" />Import CSV
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset() }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {step === 'upload' && 'Import Products from CSV'}
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
                Match your spreadsheet columns to the product fields below.
              </p>
              <div className="space-y-3">
                {([
                  { field: 'name' as const, label: 'Product Name', required: true },
                  { field: 'sku' as const, label: 'SKU', required: true },
                  { field: 'category' as const, label: 'Category', required: false },
                ]).map(({ field, label, required }) => (
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
                Categories are matched by name. Unmatched categories will be left blank and the product will be inactive.
              </p>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span><span className="font-medium">{parsed.length}</span> products ready</span>
                {noMatchCount > 0 && (
                  <span className="text-amber-600">
                    <span className="font-medium">{noMatchCount}</span> with no category match (will be inactive)
                  </span>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">SKU</th>
                      <th className="text-left px-3 py-2 font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 truncate max-w-[180px]">{row.name}</td>
                        <td className="px-3 py-1.5">{row.sku}</td>
                        <td className={cn('px-3 py-1.5', !row.matchedCategory && 'text-muted-foreground')}>
                          {row.matchedCategory ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 8 && (
                  <p className="text-xs text-muted-foreground px-3 py-2 border-t">
                    …and {parsed.length - 8} more
                  </p>
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
                <Button size="sm" onClick={buildPreview}>Preview</Button>
              </>
            )}
            {step === 'preview' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep('map')}>Back</Button>
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing && <Loader2 size={14} className="mr-1 animate-spin" />}
                  Import {parsed.length} product{parsed.length > 1 ? 's' : ''}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
