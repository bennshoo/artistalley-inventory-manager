-- In-app inventory reconciliation
-- Adds starting ("brought") and voided quantities to each sales sheet row.
-- Run this in the Supabase SQL editor.

alter table sales_sheet_row
  add column if not exists qty_brought int not null default 0,
  add column if not exists qty_voided int not null default 0;
