import { supabase } from "@/lib/supabase";
import { LeaderboardTabs, type LeaderRow, type GroupRow } from "@/components/leaderboard/leaderboard-tabs";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { data } = await supabase
    .from("sale")
    .select("qty_sold, unit_cost, product_id, product(name, sku, image_url, category(name), collection(name))");

  const sales = (data ?? []) as any[];

  // Per-product leaderboard
  const productMap: Record<string, LeaderRow> = {};
  // Units sold per category and per collection
  const catMap: Record<string, number> = {};
  const collectionMap: Record<string, number> = {};
  for (const s of sales) {
    if (!productMap[s.product_id]) {
      productMap[s.product_id] = {
        id: s.product_id,
        name: s.product?.name ?? "",
        sku: s.product?.sku ?? "",
        image_url: s.product?.image_url ?? null,
        qty: 0,
        cogs: 0,
      };
    }
    productMap[s.product_id].qty += s.qty_sold;
    productMap[s.product_id].cogs += s.qty_sold * s.unit_cost;

    const cat = s.product?.category?.name ?? "Uncategorized";
    catMap[cat] = (catMap[cat] ?? 0) + s.qty_sold;

    const col = s.product?.collection?.name ?? "No collection";
    collectionMap[col] = (collectionMap[col] ?? 0) + s.qty_sold;
  }

  const products = Object.values(productMap).sort((a, b) => b.qty - a.qty);
  const toSortedRows = (m: Record<string, number>): GroupRow[] =>
    Object.entries(m).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Product Leaderboard</h1>
        <p className="text-muted-foreground text-sm">Ranked by units sold across all events</p>
      </div>

      <LeaderboardTabs
        products={products}
        categories={toSortedRows(catMap)}
        collections={toSortedRows(collectionMap)}
      />
    </div>
  );
}
