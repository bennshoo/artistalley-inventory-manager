import { supabase } from "@/lib/supabase";
import { CategoriesTabs } from "@/components/categories/categories-tabs";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [{ data: categories }, { data: collections }] = await Promise.all([
    supabase.from("category").select("*").order("name"),
    supabase.from("collection").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories & Collections</h1>
      </div>

      <CategoriesTabs categories={categories ?? []} collections={collections ?? []} />
    </div>
  );
}
