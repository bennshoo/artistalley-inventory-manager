-- One-time repair for inventory quantities that drifted due to double-counting
-- (manual quantity updates on top of the on_sale_insert / on_adjustment_insert
-- triggers). Run AFTER deploying the code fix, or new operations will re-corrupt.
--
-- Truth: quantity = restocks + adjustments - sales - voided(finalized sheets)

-- 1. PREVIEW — review current vs. correct before changing anything.
select p.sku, p.name, p.quantity as current_qty,
  coalesce((select sum(quantity) from restock where product_id = p.id), 0)
  + coalesce((select sum(delta) from inventory_adjustment where product_id = p.id), 0)
  - coalesce((select sum(qty_sold) from sale where product_id = p.id), 0)
  - coalesce((select sum(ssr.qty_voided) from sales_sheet_row ssr
              join sales_sheet ss on ss.id = ssr.sheet_id
              where ssr.product_id = p.id and ss.status = 'reconciled'), 0) as correct_qty
from product p
order by (p.quantity - (
  coalesce((select sum(quantity) from restock where product_id = p.id), 0)
  + coalesce((select sum(delta) from inventory_adjustment where product_id = p.id), 0)
  - coalesce((select sum(qty_sold) from sale where product_id = p.id), 0)
  - coalesce((select sum(ssr.qty_voided) from sales_sheet_row ssr
              join sales_sheet ss on ss.id = ssr.sheet_id
              where ssr.product_id = p.id and ss.status = 'reconciled'), 0)
)) desc;

-- 2. APPLY — recompute every product's quantity from its ledger.
update product p set quantity =
  coalesce((select sum(quantity) from restock where product_id = p.id), 0)
  + coalesce((select sum(delta) from inventory_adjustment where product_id = p.id), 0)
  - coalesce((select sum(qty_sold) from sale where product_id = p.id), 0)
  - coalesce((select sum(ssr.qty_voided) from sales_sheet_row ssr
              join sales_sheet ss on ss.id = ssr.sheet_id
              where ssr.product_id = p.id and ss.status = 'reconciled'), 0);
