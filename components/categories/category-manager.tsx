'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Category } from '@/lib/database.types'
import { Trash2, Plus, Loader2, Pencil, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', base_price: '' })
  const [savingId, setSavingId] = useState<string | null>(null)

  async function addCategory() {
    if (!newName.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('category')
      .insert({ name: newName.trim(), base_price: parseFloat(newPrice) || 0 })
      .select()
      .single()
    if (error) { toast.error(error.message); setAdding(false); return }
    setCategories(c => [...c, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setNewPrice('')
    setAdding(false)
    router.refresh()
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditDraft({ name: cat.name, base_price: cat.base_price.toString() })
  }

  async function saveEdit(id: string) {
    setSavingId(id)
    const { data, error } = await supabase
      .from('category')
      .update({ name: editDraft.name.trim(), base_price: parseFloat(editDraft.base_price) || 0 })
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error(error.message); setSavingId(null); return }
    setCategories(c => c.map(x => x.id === id ? data : x).sort((a, b) => a.name.localeCompare(b.name)))
    setEditingId(null)
    setSavingId(null)
    toast.success('Category updated')
    router.refresh()
  }

  async function deleteCategory(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('category').delete().eq('id', id)
    if (error) { toast.error(error.message); setDeletingId(null); return }
    setCategories(c => c.filter(x => x.id !== id))
    setDeletingId(null)
    toast.success('Category removed')
    router.refresh()
  }

  return (
    <div className="space-y-4 w-fit">
      {/* Existing categories */}
      <div className="space-y-1">
        {categories.map(c => (
          <div key={c.id} className="border rounded px-3 py-2">
            {editingId === c.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editDraft.name}
                  onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                  className="h-7 text-sm flex-1"
                />
                <Input
                  type="number" step="0.01" min="0"
                  value={editDraft.base_price}
                  onChange={e => setEditDraft(d => ({ ...d, base_price: e.target.value }))}
                  className="h-7 text-sm w-24"
                  placeholder="Price"
                />
                <Button
                  size="sm" variant="ghost" className="h-7 w-7 p-0"
                  onClick={() => saveEdit(c.id)} disabled={savingId === c.id}
                >
                  {savingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-7 w-7 p-0"
                  onClick={() => setEditingId(null)}
                >
                  <X size={12} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">${c.base_price.toFixed(2)}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground"
                    onClick={() => startEdit(c)}
                  >
                    <Pencil size={11} />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => deleteCategory(c.id)}
                    disabled={deletingId === c.id}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    {deletingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="Category name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          className="flex-1"
        />
        <Input
          type="number" step="0.01" min="0"
          placeholder="Price"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          className="w-24"
        />
        <Button size="sm" onClick={addCategory} disabled={adding}>
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        </Button>
      </div>
    </div>
  )
}
