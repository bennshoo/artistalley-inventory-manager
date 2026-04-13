import { supabase } from '@/lib/supabase'
import { RestockForm } from '@/components/suppliers/restock-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NewRestockPage() {
  const [productsRes, suppliersRes] = await Promise.all([
    supabase.from('product').select('id, name, sku').order('name'),
    supabase.from('supplier').select('*').order('name'),
  ])

  return (
    <div className="space-y-4 max-w-xl">
      <Link href="/suppliers" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> Suppliers & Restocks
      </Link>
      <h1 className="text-2xl font-semibold">Log Restock</h1>
      <RestockForm products={productsRes.data ?? []} suppliers={suppliersRes.data ?? []} />
    </div>
  )
}
