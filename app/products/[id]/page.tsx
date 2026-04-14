import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Edit } from 'lucide-react'
import { ProductImage } from '@/components/products/product-image'
import { DeleteProductButton } from '@/components/products/delete-product-button'
import { ToggleProductActiveButton } from '@/components/products/toggle-product-active-button'
import { LinkButton } from '@/components/ui/link-button'

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [productRes, restocksRes, salesRes, adjustmentsRes] = await Promise.all([
    supabase.from('product').select('*, category(name, base_price)').eq('id', id).single(),
    supabase.from('restock').select('*, supplier(name)').eq('product_id', id).order('date', { ascending: false }),
    supabase.from('sale').select('*, event(name)').eq('product_id', id).order('date', { ascending: false }),
    supabase.from('inventory_adjustment').select('*').eq('product_id', id).order('date', { ascending: false }),
  ])

  if (!productRes.data) notFound()
  const product = productRes.data as any
  const restocks = restocksRes.data ?? []
  const sales = salesRes.data ?? []
  const adjustments = adjustmentsRes.data ?? []

  return (
    <div className="space-y-6">
      <Link href="/products" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> Products
      </Link>

      <div className="flex items-start gap-4">
        <ProductImage url={product.image_url} name={product.name} size={80} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <Badge variant="outline" className="text-xs">{product.sku}</Badge>
          </div>
          {product.category?.name && (
            <Badge variant="secondary" className="text-xs mt-1">
              {product.category.name} · ${product.category.base_price.toFixed(2)}
            </Badge>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm">
            <Badge variant={product.quantity === 0 ? 'destructive' : product.quantity <= 5 ? 'outline' : 'secondary'}>
              {product.quantity} in stock
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <ToggleProductActiveButton productId={id} isActive={product.is_active} />
          <LinkButton href={`/products/${id}/edit`} size="sm" variant="outline"><Edit size={14} className="mr-1" />Edit</LinkButton>
          <DeleteProductButton id={id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Restock History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {restocks.length === 0 && <p className="text-xs text-muted-foreground">No restocks yet.</p>}
            {restocks.map(r => (
              <div key={r.id} className="text-xs border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">+{r.quantity} units</span>
                  <span className="text-muted-foreground">{r.date}</span>
                </div>
                <div className="text-muted-foreground">${r.unit_cost}/unit · {(r as any).supplier?.name ?? 'No supplier'}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Sales History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sales.length === 0 && <p className="text-xs text-muted-foreground">No sales yet.</p>}
            {sales.map(s => (
              <div key={s.id} className="text-xs border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{s.qty_sold} sold</span>
                  <span className="text-muted-foreground">{s.date}</span>
                </div>
                <div className="text-muted-foreground">{(s as any).event?.name}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Adjustments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {adjustments.length === 0 && <p className="text-xs text-muted-foreground">No adjustments yet.</p>}
            {adjustments.map(a => (
              <div key={a.id} className="text-xs border-b pb-2">
                <div className="flex justify-between">
                  <span className={`font-medium ${a.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {a.delta > 0 ? '+' : ''}{a.delta}
                  </span>
                  <span className="text-muted-foreground">{a.date}</span>
                </div>
                {a.note && <div className="text-muted-foreground">{a.note}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
