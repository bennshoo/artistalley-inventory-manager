export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      category: {
        Row: { id: string; name: string; base_price: number; created_at: string }
        Insert: { id?: string; name: string; base_price?: number; created_at?: string }
        Update: { id?: string; name?: string; base_price?: number; created_at?: string }
      }
      product: {
        Row: {
          id: string; name: string; sku: string; image_url: string | null
          quantity: number; category_id: string | null; is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; name: string; sku: string; image_url?: string | null
          quantity?: number; category_id?: string | null; is_active?: boolean; created_at?: string
        }
        Update: {
          id?: string; name?: string; sku?: string; image_url?: string | null
          quantity?: number; category_id?: string | null; is_active?: boolean; created_at?: string
        }
      }
      supplier: {
        Row: { id: string; name: string; contact: string | null; created_at: string }
        Insert: { id?: string; name: string; contact?: string | null; created_at?: string }
        Update: { id?: string; name?: string; contact?: string | null; created_at?: string }
      }
      restock: {
        Row: {
          id: string; quantity: number; unit_cost: number; date: string
          product_id: string; supplier_id: string | null; created_at: string
        }
        Insert: {
          id?: string; quantity: number; unit_cost: number; date: string
          product_id: string; supplier_id?: string | null; created_at?: string
        }
        Update: {
          id?: string; quantity?: number; unit_cost?: number; date?: string
          product_id?: string; supplier_id?: string | null; created_at?: string
        }
      }
      inventory_adjustment: {
        Row: {
          id: string; delta: number; note: string | null; date: string
          product_id: string; created_at: string
        }
        Insert: {
          id?: string; delta: number; note?: string | null; date: string
          product_id: string; created_at?: string
        }
        Update: {
          id?: string; delta?: number; note?: string | null; date?: string
          product_id?: string; created_at?: string
        }
      }
      event: {
        Row: {
          id: string; name: string; date_start: string; date_end: string; location: string | null
          tax_rate: number; created_at: string
        }
        Insert: {
          id?: string; name: string; date_start: string; date_end: string; location?: string | null
          tax_rate?: number; created_at?: string
        }
        Update: {
          id?: string; name?: string; date_start?: string; date_end?: string; location?: string | null
          tax_rate?: number; created_at?: string
        }
      }
      event_revenue: {
        Row: {
          id: string; payment_method: 'square' | 'cash' | 'venmo'
          starting_balance: number; ending_balance: number; event_id: string; created_at: string
        }
        Insert: {
          id?: string; payment_method: 'square' | 'cash' | 'venmo'
          starting_balance: number; ending_balance: number; event_id: string; created_at?: string
        }
        Update: {
          id?: string; payment_method?: 'square' | 'cash' | 'venmo'
          starting_balance?: number; ending_balance?: number; event_id?: string; created_at?: string
        }
      }
      cost: {
        Row: {
          id: string; type: string; amount: number; note: string | null
          event_id: string | null; supplier_id: string | null; created_at: string
        }
        Insert: {
          id?: string; type: string; amount: number; note?: string | null
          event_id?: string | null; supplier_id?: string | null; created_at?: string
        }
        Update: {
          id?: string; type?: string; amount?: number; note?: string | null
          event_id?: string | null; supplier_id?: string | null; created_at?: string
        }
      }
      sales_sheet: {
        Row: {
          id: string; generated_at: string; status: 'pending' | 'imported'
          event_id: string; created_at: string
        }
        Insert: {
          id?: string; generated_at?: string; status?: 'pending' | 'imported'
          event_id: string; created_at?: string
        }
        Update: {
          id?: string; generated_at?: string; status?: 'pending' | 'imported'
          event_id?: string; created_at?: string
        }
      }
      tag: {
        Row: { id: string; name: string; color: string; created_at: string }
        Insert: { id?: string; name: string; color?: string; created_at?: string }
        Update: { id?: string; name?: string; color?: string; created_at?: string }
      }
      product_tag: {
        Row: { product_id: string; tag_id: string }
        Insert: { product_id: string; tag_id: string }
        Update: { product_id?: string; tag_id?: string }
      }
      sales_sheet_row: {
        Row: {
          id: string; qty_sold: number; unit_cost: number; notes: string | null
          sheet_id: string; product_id: string; created_at: string
        }
        Insert: {
          id?: string; qty_sold?: number; unit_cost: number; notes?: string | null
          sheet_id: string; product_id: string; created_at?: string
        }
        Update: {
          id?: string; qty_sold?: number; unit_cost?: number; notes?: string | null
          sheet_id?: string; product_id?: string; created_at?: string
        }
      }
      sale: {
        Row: {
          id: string; qty_sold: number; unit_cost: number; date: string
          product_id: string; event_id: string; sales_sheet_id: string; created_at: string
        }
        Insert: {
          id?: string; qty_sold: number; unit_cost: number; date: string
          product_id: string; event_id: string; sales_sheet_id: string; created_at?: string
        }
        Update: {
          id?: string; qty_sold?: number; unit_cost?: number; date?: string
          product_id?: string; event_id?: string; sales_sheet_id?: string; created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Category = Database['public']['Tables']['category']['Row']
export type Product = Database['public']['Tables']['product']['Row']
export type Supplier = Database['public']['Tables']['supplier']['Row']
export type Restock = Database['public']['Tables']['restock']['Row']
export type InventoryAdjustment = Database['public']['Tables']['inventory_adjustment']['Row']
export type Event = Database['public']['Tables']['event']['Row']
export type EventRevenue = Database['public']['Tables']['event_revenue']['Row']
export type Cost = Database['public']['Tables']['cost']['Row']
export type Tag = Database['public']['Tables']['tag']['Row']
export type SalesSheet = Database['public']['Tables']['sales_sheet']['Row']
export type SalesSheetRow = Database['public']['Tables']['sales_sheet_row']['Row']
export type Sale = Database['public']['Tables']['sale']['Row']
