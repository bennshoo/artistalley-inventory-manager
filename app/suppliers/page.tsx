import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { SupplierManager } from '@/components/suppliers/supplier-manager'
import { LinkButton } from '@/components/ui/link-button'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  const [suppliersRes, restocksRes] = await Promise.all([
    supabase.from('supplier').select('*').order('name'),
    supabase.from('restock').select('*, product(name, sku), supplier(name)').order('date', { ascending: false }).limit(20),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suppliers & Restocks</h1>
        <LinkButton href="/restocks/new" size="sm"><Plus size={14} className="mr-1" />Log Restock</LinkButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="font-medium text-sm">Suppliers</h2>
          <SupplierManager initialSuppliers={suppliersRes.data ?? []} />
        </div>

        <div className="space-y-3">
          <h2 className="font-medium text-sm">Recent Restocks</h2>
          {(restocksRes.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No restocks yet.</p>
          )}
          <div className="space-y-2">
            {(restocksRes.data ?? []).map((r: any) => (
              <Card key={r.id} className="py-0">
                <CardContent className="py-3 px-4 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.product?.name}</span>
                    <span className="text-muted-foreground text-xs">{r.date}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    +{r.quantity} units · ${r.unit_cost}/unit · {r.supplier?.name ?? 'No supplier'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
