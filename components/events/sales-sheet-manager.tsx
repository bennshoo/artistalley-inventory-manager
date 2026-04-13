'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { SalesSheet } from '@/lib/database.types'
import { Loader2, Download, Upload, FileSpreadsheet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface SalesSheetManagerProps {
  eventId: string
  eventDate: string
  initialSheets: SalesSheet[]
}

export function SalesSheetManager({ eventId, eventDate, initialSheets }: SalesSheetManagerProps) {
  const router = useRouter()
  const [sheets, setSheets] = useState(initialSheets)
  const [generating, setGenerating] = useState(false)
  const [importing, setImporting] = useState(false)

  async function generateSheet() {
    setGenerating(true)

    // Create sales_sheet record
    const { data: sheet, error: sheetError } = await supabase
      .from('sales_sheet')
      .insert({ event_id: eventId, status: 'pending' })
      .select()
      .single()

    if (sheetError || !sheet) {
      toast.error(sheetError?.message ?? 'Failed to create sheet')
      setGenerating(false)
      return
    }

    // Get all products with their latest restock unit_cost
    const { data: products } = await supabase
      .from('product')
      .select('id, name, sku, category(base_price)')
      .order('name')

    if (!products || products.length === 0) {
      toast.error('No products found')
      setGenerating(false)
      return
    }

    // Get latest restock unit_cost per product
    const { data: restocks } = await supabase
      .from('restock')
      .select('product_id, unit_cost, date')
      .order('date', { ascending: false })

    const latestCost: Record<string, number> = {}
    for (const r of restocks ?? []) {
      if (!latestCost[r.product_id]) latestCost[r.product_id] = r.unit_cost
    }

    // Insert sheet rows
    const rows = products.map(p => ({
      sheet_id: sheet.id,
      product_id: p.id,
      qty_sold: 0,
      unit_cost: latestCost[p.id] ?? 0,
      notes: null,
    }))

    const { error: rowsError } = await supabase.from('sales_sheet_row').insert(rows)
    if (rowsError) {
      toast.error(rowsError.message)
      setGenerating(false)
      return
    }

    // Export xlsx
    const wsData = [
      // Metadata row (hidden from user but readable on import)
      ['__meta__', sheet.id, eventId],
      // Header
      ['Product Name', 'SKU', 'Base Price', 'Qty Sold', 'Notes'],
      // Data rows
      ...products.map((p: any) => [p.name, p.sku, p.category?.base_price ?? 0, 0, '']),
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    // Hide the first row by setting row height to 0
    ws['!rows'] = [{ hidden: true }, {}]
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 30 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sales')
    XLSX.writeFile(wb, `sales-sheet-${eventId.slice(0, 8)}.xlsx`)

    setSheets(s => [sheet, ...s])
    toast.success('Sales sheet generated and downloaded')
    setGenerating(false)
    router.refresh()
  }

  async function handleImport(sheetId: string, file: File) {
    setImporting(true)

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][]

    // Row 0 is metadata, row 1 is headers, rows 2+ are data
    // Find sheet_id from metadata row
    const metaRow = rows[0]
    const embeddedSheetId = metaRow?.[1]?.toString()

    // Get product SKU->id mapping
    const { data: products } = await supabase.from('product').select('id, sku, quantity')
    const skuMap: Record<string, { id: string; quantity: number }> = {}
    for (const p of products ?? []) skuMap[p.sku] = { id: p.id, quantity: p.quantity }

    // Get existing sheet rows for unit_cost
    const { data: sheetRows } = await supabase
      .from('sales_sheet_row')
      .select('product_id, unit_cost')
      .eq('sheet_id', sheetId)
    const costMap: Record<string, number> = {}
    for (const r of sheetRows ?? []) costMap[r.product_id] = r.unit_cost

    const dataRows = rows.slice(2) // skip meta + header
    const salesToInsert = []
    const productUpdates: { id: string; quantity: number }[] = []

    for (const row of dataRows) {
      const [name, sku, basePrice, qtySoldRaw] = row
      const qtySold = parseInt(qtySoldRaw) || 0
      if (qtySold <= 0) continue

      const product = skuMap[sku?.toString()]
      if (!product) continue

      salesToInsert.push({
        product_id: product.id,
        event_id: eventId,
        sales_sheet_id: sheetId,
        qty_sold: qtySold,
        unit_cost: costMap[product.id] ?? 0,
        date: eventDate,
      })

      productUpdates.push({
        id: product.id,
        quantity: Math.max(0, product.quantity - qtySold),
      })
    }

    if (salesToInsert.length === 0) {
      toast.error('No rows with qty_sold > 0 found')
      setImporting(false)
      return
    }

    // Insert sales
    const { error: salesError } = await supabase.from('sale').insert(salesToInsert)
    if (salesError) { toast.error(salesError.message); setImporting(false); return }

    // Update product quantities
    for (const u of productUpdates) {
      await supabase.from('product').update({ quantity: u.quantity }).eq('id', u.id)
    }

    // Update sheet status
    await supabase.from('sales_sheet').update({ status: 'imported' }).eq('id', sheetId)
    setSheets(s => s.map(x => x.id === sheetId ? { ...x, status: 'imported' as const } : x))

    toast.success(`Imported ${salesToInsert.length} sale records`)
    setImporting(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Button
        size="sm" onClick={generateSheet} disabled={generating}
        variant="outline"
      >
        {generating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileSpreadsheet size={14} className="mr-1" />}
        Generate Sales Sheet
      </Button>

      {sheets.length === 0 && (
        <p className="text-xs text-muted-foreground">No sales sheets yet.</p>
      )}

      <div className="space-y-2">
        {sheets.map(sheet => (
          <div key={sheet.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {new Date(sheet.generated_at).toLocaleString()}
                </span>
                <Badge variant={sheet.status === 'imported' ? 'secondary' : 'outline'} className="text-xs">
                  {sheet.status}
                </Badge>
              </div>
            </div>
            {sheet.status === 'pending' && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleImport(sheet.id, file)
                    e.target.value = ''
                  }}
                  disabled={importing}
                />
                <Button size="sm" variant="outline" disabled={importing}>
                  {importing ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Upload size={12} className="mr-1" />}
                  Reimport
                </Button>
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
