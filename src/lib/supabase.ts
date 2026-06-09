import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

// ─── Types ────────────────────────────────────────────────────
export interface Field {
  id: string
  name: string
  sport_type: string
  price_per_hour: number
  is_active: boolean
  created_at: string
}

export interface Reservation {
  id: string
  field_id: string | null
  customer_name: string
  customer_phone?: string
  date: string
  start_time: string
  end_time: string
  total_amount: number
  amount_paid: number
  status: 'confirmada' | 'completada' | 'cancelada' | 'pendiente'
  payment_status: 'pendiente' | 'parcial' | 'pagado'
  notes?: string
  created_at: string
  fields?: Field
}

export interface Product {
  id: string
  name: string
  category: 'producto' | 'bebida'
  price: number
  cost: number
  stock: number
  min_stock: number
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Championship {
  id: string
  name: string
  sport_type: string
  category?: string
  start_date?: string
  end_date?: string
  registration_fee: number
  prize?: string
  max_teams?: number
  status: 'inscripcion' | 'en_curso' | 'finalizado' | 'cancelado'
  notes?: string
  created_at: string
}

export interface Team {
  id: string
  championship_id: string
  name: string
  captain_name?: string
  captain_phone?: string
  player_count: number
  registration_paid: boolean
  amount_paid: number
  notes?: string
  created_at: string
}

export interface Sale {
  id: string
  sale_type: 'producto' | 'bebida' | 'alquiler' | 'campeonato' | 'otro'
  customer_name?: string
  total_amount: number
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'otro'
  notes?: string
  created_at: string
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
}
