'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Collection } from '@/lib/database.types'
import { COLLECTION_COLORS, getCollectionColor, pickNextColor } from '@/lib/collection-colors'
import { Trash2, Plus, Loader2, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CollectionManager({ initialCollections }: { initialCollections: Collection[] }) {
  const [collections, setCollections] = useState(initialCollections)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', color: '' })
  const [savingId, setSavingId] = useState<string | null>(null)

  async function addCollection() {
    if (!newName.trim()) return
    setAdding(true)
    const color = pickNextColor(collections.map(c => c.color))
    const { data, error } = await supabase
      .from('collection').insert({ name: newName.trim(), color }).select().single()
    if (error) { toast.error(error.message); setAdding(false); return }
    setCollections(c => [...c, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setAdding(false)
    toast.success('Collection added')
  }

  async function saveEdit(id: string) {
    if (!editDraft.name.trim()) return
    setSavingId(id)
    const { data, error } = await supabase
      .from('collection').update({ name: editDraft.name.trim(), color: editDraft.color }).eq('id', id).select().single()
    if (error) { toast.error(error.message); setSavingId(null); return }
    setCollections(c => c.map(x => x.id === id ? data : x).sort((a, b) => a.name.localeCompare(b.name)))
    setEditingId(null)
    setSavingId(null)
    toast.success('Collection updated')
  }

  async function deleteCollection(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('collection').delete().eq('id', id)
    if (error) { toast.error(error.message); setDeletingId(null); return }
    setCollections(c => c.filter(x => x.id !== id))
    setDeletingId(null)
    toast.success('Collection deleted')
  }

  return (
    <div className="space-y-4 w-fit">
      <div className="space-y-1">
        {collections.map(t => {
          const color = getCollectionColor(t.color)
          return (
            <div key={t.id} className="border rounded px-3 py-2">
              {editingId === t.id ? (
                <div className="space-y-2">
                  <Input
                    value={editDraft.name}
                    onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(t.id)}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLLECTION_COLORS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        onClick={() => setEditDraft(d => ({ ...d, color: c.id }))}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 transition-transform',
                          editDraft.color === c.id ? 'border-foreground scale-125' : 'border-transparent'
                        )}
                        style={{ backgroundColor: c.bg }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                      onClick={() => saveEdit(t.id)} disabled={savingId === t.id}>
                      {savingId === t.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => setEditingId(null)}>
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {t.name}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground"
                      onClick={() => { setEditingId(t.id); setEditDraft({ name: t.name, color: t.color }) }}>
                      <Pencil size={11} />
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => deleteCollection(t.id)} disabled={deletingId === t.id}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                      {deletingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {collections.length === 0 && <p className="text-sm text-muted-foreground">No collections yet.</p>}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Collection name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCollection()}
          className="flex-1"
        />
        <Button size="sm" onClick={addCollection} disabled={adding}>
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        </Button>
      </div>
    </div>
  )
}
