import { supabase } from "@/lib/supabase";
import { AdjustmentForm } from "@/components/adjustments/adjustment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdjustmentsPage() {
  const [productsRes, adjustmentsRes] = await Promise.all([
    supabase.from("product").select("id, name, sku, quantity").order("name"),
    supabase
      .from("inventory_adjustment")
      .select("*, product(name, sku)")
      .order("date", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory Adjustments</h1>
        <p className="text-muted-foreground text-sm">
          Use this tool to manually correct inventory inconsistencies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustmentForm products={productsRes.data ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Adjustment History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(adjustmentsRes.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                No adjustments yet.
              </p>
            )}
            {(adjustmentsRes.data ?? []).map((a: any) => (
              <div key={a.id} className="text-xs border-b pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.product?.name}</span>
                  <span className="text-muted-foreground">{a.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${a.delta > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {a.delta > 0 ? "+" : ""}
                    {a.delta} units
                  </span>
                  {a.note && (
                    <span className="text-muted-foreground">{a.note}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
