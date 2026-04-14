import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'
import { ProductList } from '@/components/products/product-list'
import { CsvImportDialog } from '@/components/products/csv-import-dialog'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('product').select('*, category(name, base_price)').order('name'),
    supabase.from('category').select('*').order('name'),
  ])

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground text-sm">{products?.length ?? 0} items</p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog categories={categories ?? []} />
          <LinkButton href="/products/new" size="sm"><Plus size={14} className="mr-1" />Add Product</LinkButton>
        </div>
      </div>

      <ProductList products={(products ?? []) as any} categories={categories ?? []} />
    </div>
  )
}
