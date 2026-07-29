'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProductImage } from '@/components/products/product-image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, ClipboardList, Save, Lock, Unlock, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActiveProduct {
  id: string
  name: string
  sku: string
  type: string | null
  image_url: string | null
  quantity: number
  unit_cost: number
}

export interface ReconRow {
  id: string
  product_id: string
  name: string
  sku: string
  type: string | null
  image_url: string | null
  stock: number
  qty_brought: number
  qty_sold: number
  qty_voided: number
  unit_cost: number
}

interface ReconciliationManagerProps {
  eventId: string
  eventDate: string
  initialSheetId: string | null
  initialStatus: 'pending' | 'reconciled' | null
  initialRows: ReconRow[]
  activeProducts: ActiveProduct[]
}

export function ReconciliationManager({
  eventId, eventDate, initialSheetId, initialStatus, initialRows, activeProducts,
}: ReconciliationManagerProps) {
  const router = useRouter()
  const [sheetId, setSheetId] = useState(initialSheetId)
  const [status, setStatus] = useState(initialStatus)
  const [rows, setRows] = useState<ReconRow[]>(initialRows)
  const [starting, setStarting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sort, setSort] = useState<{ key: 'name' | 'type'; dir: 'asc' | 'desc' }>({ key: 'type', dir: 'asc' })
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function toggleSort(key: 'name' | 'type') {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  // Tab moves down a column, then wraps to the top of the next column
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>, colIndex: number, rowIndex: number, rowCount: number) {
    if (e.key !== 'Tab') return
    const dir = e.shiftKey ? -1 : 1
    let r = rowIndex + dir
    let c = colIndex
    if (r >= rowCount) { r = 0; c = colIndex + 1 }
    else if (r < 0) { r = rowCount - 1; c = colIndex - 1 }
    const target = inputRefs.current[`${c}-${r}`]
    if (target) {
      e.preventDefault()
      target.focus()
      target.select()
    }
  }

  const reconciled = status === 'reconciled'

  function setField(rowId: string, field: 'qty_brought' | 'qty_sold' | 'qty_voided', value: string) {
    const n = Math.max(0, parseInt(value) || 0)
    setRows(rs => rs.map(r => r.id === rowId ? { ...r, [field]: n } : r))
  }

  // Editing Remaining back-solves Sold: sold = brought - voided - remaining
  function setRemaining(rowId: string, value: string) {
    const target = Math.max(0, parseInt(value) || 0)
    setRows(rs => rs.map(r =>
      r.id === rowId ? { ...r, qty_sold: Math.max(0, r.qty_brought - r.qty_voided - target) } : r
    ))
  }

  async function startReconciliation() {
    if (activeProducts.length === 0) { toast.error('No active products to reconcile'); return }
    setStarting(true)
    const { data: sheet, error } = await supabase
      .from('sales_sheet').insert({ event_id: eventId, status: 'pending' }).select().single()
    if (error || !sheet) { toast.error(error?.message ?? 'Failed to start'); setStarting(false); return }

    const inserts = activeProducts.map(p => ({
      sheet_id: sheet.id,
      product_id: p.id,
      qty_brought: 0,
      qty_sold: 0,
      qty_voided: 0,
      unit_cost: p.unit_cost,
      notes: null,
    }))
    const { data: inserted, error: rowsErr } = await supabase.from('sales_sheet_row').insert(inserts).select()
    if (rowsErr) { toast.error(rowsErr.message); setStarting(false); return }

    const pMap = new Map(activeProducts.map(p => [p.id, p]))
    const newRows: ReconRow[] = (inserted ?? []).map(r => {
      const p = pMap.get(r.product_id)!
      return {
        id: r.id, product_id: r.product_id, name: p.name, sku: p.sku, type: p.type, image_url: p.image_url, stock: p.quantity,
        qty_brought: r.qty_brought, qty_sold: r.qty_sold, qty_voided: r.qty_voided, unit_cost: r.unit_cost,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))

    setSheetId(sheet.id)
    setStatus('pending')
    setRows(newRows)
    setStarting(false)
    toast.success('Reconciliation started')
    router.refresh()
  }

  async function persistRows() {
    const payload = rows.map(r => ({
      id: r.id, sheet_id: sheetId!, product_id: r.product_id,
      qty_brought: r.qty_brought, qty_sold: r.qty_sold, qty_voided: r.qty_voided, unit_cost: r.unit_cost,
    }))
    return supabase.from('sales_sheet_row').upsert(payload)
  }

  async function save() {
    setSaving(true)
    const { error } = await persistRows()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Progress saved')
  }

  async function finalize() {
    setFinalizing(true)
    setConfirmFinalize(false)

    const { error: saveErr } = await persistRows()
    if (saveErr) { toast.error(saveErr.message); setFinalizing(false); return }

    // Record sales (for reporting / COGS)
    const salesToInsert = rows.filter(r => r.qty_sold > 0).map(r => ({
      product_id: r.product_id,
      event_id: eventId,
      sales_sheet_id: sheetId!,
      qty_sold: r.qty_sold,
      unit_cost: r.unit_cost,
      date: eventDate,
    }))
    if (salesToInsert.length > 0) {
      const { error } = await supabase.from('sale').insert(salesToInsert)
      if (error) { toast.error(error.message); setFinalizing(false); return }
    }

    // Sold units are deducted by the on_sale_insert trigger.
    // Voided units also leave inventory but have no ledger row, so apply them here.
    const voidedRows = rows.filter(r => r.qty_voided > 0)
    if (voidedRows.length > 0) {
      const { data: current } = await supabase.from('product').select('id, quantity').in('id', voidedRows.map(r => r.product_id))
      const qtyMap = new Map((current ?? []).map(p => [p.id, p.quantity]))
      for (const r of voidedRows) {
        const next = Math.max(0, (qtyMap.get(r.product_id) ?? 0) - r.qty_voided)
        await supabase.from('product').update({ quantity: next }).eq('id', r.product_id)
      }
    }

    const { error: statusErr } = await supabase.from('sales_sheet').update({ status: 'reconciled' }).eq('id', sheetId!)
    if (statusErr) { toast.error(statusErr.message); setFinalizing(false); return }

    setStatus('reconciled')
    setFinalizing(false)
    toast.success('Reconciliation finalized — inventory updated')
    router.refresh()
  }

  async function reopen() {
    setReopening(true)

    // Restore stock that was deducted on finalize
    const affected = rows.filter(r => r.qty_sold + r.qty_voided > 0)
    if (affected.length > 0) {
      const { data: current } = await supabase.from('product').select('id, quantity').in('id', affected.map(r => r.product_id))
      const qtyMap = new Map((current ?? []).map(p => [p.id, p.quantity]))
      for (const r of affected) {
        const next = (qtyMap.get(r.product_id) ?? 0) + (r.qty_sold + r.qty_voided)
        await supabase.from('product').update({ quantity: next }).eq('id', r.product_id)
      }
    }

    // Remove the sale records created at finalize
    await supabase.from('sale').delete().eq('sales_sheet_id', sheetId!)

    const { error } = await supabase.from('sales_sheet').update({ status: 'pending' }).eq('id', sheetId!)
    if (error) { toast.error(error.message); setReopening(false); return }

    setStatus('pending')
    setReopening(false)
    toast.success('Reopened for editing — inventory restored')
    router.refresh()
  }

  async function deleteSheet() {
    setConfirmDelete(false)
    const { error } = await supabase.from('sales_sheet').delete().eq('id', sheetId!)
    if (error) { toast.error(error.message); return }
    setSheetId(null)
    setStatus(null)
    setRows([])
    toast.success('Reconciliation deleted')
    router.refresh()
  }

  async function addMissingProducts() {
    const existing = new Set(rows.map(r => r.product_id))
    const missing = activeProducts.filter(p => !existing.has(p.id))
    if (missing.length === 0) { toast.info('All active products are already listed'); return }
    const inserts = missing.map(p => ({
      sheet_id: sheetId!, product_id: p.id,
      qty_brought: 0, qty_sold: 0, qty_voided: 0, unit_cost: p.unit_cost, notes: null,
    }))
    const { data: inserted, error } = await supabase.from('sales_sheet_row').insert(inserts).select()
    if (error) { toast.error(error.message); return }
    const pMap = new Map(missing.map(p => [p.id, p]))
    const newRows: ReconRow[] = (inserted ?? []).map(r => {
      const p = pMap.get(r.product_id)!
      return {
        id: r.id, product_id: r.product_id, name: p.name, sku: p.sku, type: p.type, image_url: p.image_url, stock: p.quantity,
        qty_brought: r.qty_brought, qty_sold: r.qty_sold, qty_voided: r.qty_voided, unit_cost: r.unit_cost,
      }
    })
    setRows(rs => [...rs, ...newRows].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`Added ${newRows.length} product${newRows.length > 1 ? 's' : ''}`)
  }

  // ── Empty state ──────────────────────────────────────────
  if (!sheetId) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Start a reconciliation to record how much inventory you bring to this event, then how much was sold and voided.
        </p>
        <Button size="sm" onClick={startReconciliation} disabled={starting}>
          {starting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <ClipboardList size={14} className="mr-1" />}
          Start Inventory Reconciliation
        </Button>
      </div>
    )
  }

  const totals = rows.reduce((acc, r) => ({
    brought: acc.brought + r.qty_brought,
    sold: acc.sold + r.qty_sold,
    voided: acc.voided + r.qty_voided,
    remaining: acc.remaining + (r.qty_brought - r.qty_sold - r.qty_voided),
  }), { brought: 0, sold: 0, voided: 0, remaining: 0 })

  const sortedRows = [...rows].sort((a, b) => {
    const av = sort.key === 'type' ? (a.type ?? '') : a.name
    const bv = sort.key === 'type' ? (b.type ?? '') : b.name
    const primary = av.localeCompare(bv)
    return (sort.dir === 'asc' ? primary : -primary) || a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={reconciled ? 'secondary' : 'outline'} className="text-xs">
            {reconciled ? 'Reconciled' : 'In progress'}
          </Badge>
          {!reconciled && (
            <button onClick={addMissingProducts} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Plus size={12} /> Add missing products
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {reconciled ? (
            <Button size="sm" variant="outline" onClick={reopen} disabled={reopening}>
              {reopening ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Unlock size={14} className="mr-1" />}
              Reopen
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                Save
              </Button>
              <Button size="sm" onClick={() => setConfirmFinalize(true)} disabled={finalizing}>
                {finalizing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Lock size={14} className="mr-1" />}
                Finalize
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active products to reconcile.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left font-medium py-2 pr-2">
                  <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                    Product
                    {sort.key === 'name' && (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </button>
                </th>
                <th className="text-left font-medium py-2 px-2">
                  <button onClick={() => toggleSort('type')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                    Type
                    {sort.key === 'type' && (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </button>
                </th>
                <th className="text-right font-medium py-2 px-2">Stock</th>
                <th className="text-center font-medium py-2 px-2">Brought</th>
                <th className="text-center font-medium py-2 px-2">Sold</th>
                <th className="text-center font-medium py-2 px-2">Voided</th>
                <th className="text-center font-medium py-2 pl-2">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, rowIndex) => {
                const remaining = r.qty_brought - r.qty_sold - r.qty_voided
                const rowCount = sortedRows.length
                const broughtOverStock = r.qty_brought > r.stock
                const overSold = r.qty_sold + r.qty_voided > r.qty_brought
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2 min-w-40">
                        <ProductImage url={r.image_url} name={r.name} size={32} />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground text-xs">{r.type ?? '—'}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground tabular-nums">{r.stock}</td>
                    <td className="py-2 px-2 text-center">
                      {reconciled ? r.qty_brought : (
                        <Input type="number" min="0" value={r.qty_brought}
                          ref={el => { inputRefs.current[`0-${rowIndex}`] = el }}
                          aria-invalid={broughtOverStock}
                          title={broughtOverStock ? `Brought exceeds stock (${r.stock})` : undefined}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => handleInputKeyDown(e, 0, rowIndex, rowCount)}
                          onChange={e => setField(r.id, 'qty_brought', e.target.value)}
                          className="h-8 w-16 text-xs text-center mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {reconciled ? r.qty_sold : (
                        <Input type="number" min="0" value={r.qty_sold}
                          ref={el => { inputRefs.current[`1-${rowIndex}`] = el }}
                          aria-invalid={overSold}
                          title={overSold ? 'Sold + voided exceeds brought' : undefined}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => handleInputKeyDown(e, 1, rowIndex, rowCount)}
                          onChange={e => setField(r.id, 'qty_sold', e.target.value)}
                          className="h-8 w-16 text-xs text-center mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {reconciled ? r.qty_voided : (
                        <Input type="number" min="0" value={r.qty_voided}
                          ref={el => { inputRefs.current[`2-${rowIndex}`] = el }}
                          aria-invalid={overSold}
                          title={overSold ? 'Sold + voided exceeds brought' : undefined}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => handleInputKeyDown(e, 2, rowIndex, rowCount)}
                          onChange={e => setField(r.id, 'qty_voided', e.target.value)}
                          className="h-8 w-16 text-xs text-center mx-auto" />
                      )}
                    </td>
                    <td className="py-2 pl-2 text-center">
                      {reconciled ? (
                        <span className={cn('font-medium tabular-nums', remaining < 0 && 'text-destructive')}>{remaining}</span>
                      ) : (
                        <Input type="number" min="0" value={remaining}
                          ref={el => { inputRefs.current[`3-${rowIndex}`] = el }}
                          aria-invalid={remaining < 0}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => handleInputKeyDown(e, 3, rowIndex, rowCount)}
                          onChange={e => setRemaining(r.id, e.target.value)}
                          className="h-8 w-16 text-xs text-center mx-auto" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Finalize confirmation */}
      <Dialog open={confirmFinalize} onOpenChange={o => { if (!o) setConfirmFinalize(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize reconciliation?</DialogTitle>
            <DialogDescription>
              This records {totals.sold} sold unit{totals.sold === 1 ? '' : 's'} and deducts {totals.sold + totals.voided} unit{totals.sold + totals.voided === 1 ? '' : 's'} (sold + voided) from inventory. You can reopen later to make changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmFinalize(false)}>Cancel</Button>
            <Button size="sm" onClick={finalize} disabled={finalizing}>
              {finalizing && <Loader2 size={14} className="mr-1 animate-spin" />}Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={o => { if (!o) setConfirmDelete(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this reconciliation?</DialogTitle>
            <DialogDescription>
              This removes all entered quantities for this event. Inventory is not affected since it hasn&apos;t been finalized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={deleteSheet}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
