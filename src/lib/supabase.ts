import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  products: Product
  sales: Sale
  sale_items: SaleItem
  reservations: Reservation
  fields: Field
  customers: Customer
  championships: Championship
  teams: Team
  matches: Match
  product_categories: ProductCategory
  stock_movements: StockMovement
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
  color: string
  icon: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description?: string
  category_id?: string
  price: number
  cost: number
  stock: number
  min_stock: number
  unit: string
  image_url?: string
  is_beverage: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  product_categories?: ProductCategory
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  document_id?: string
  notes?: string
  created_at: string
}

export interface Field {
  id: string
  name: string
  sport_type: string
  capacity: number
  price_per_hour: number
  description?: string
  is_active: boolean
  created_at: string
}

export interface Reservation {
  id: string
  field_id: string
  customer_id?: string
  customer_name: string
  customer_phone?: string
  date: string
  start_time: string
  end_time: string
  duration_hours?: number
  total_amount: number
  status: 'confirmada' | 'cancelada' | 'completada' | 'pendiente'
  payment_status: 'pendiente' | 'parcial' | 'pagado'
  amount_paid: number
  notes?: string
  created_at: string
  fields?: Field
}

export interface Championship {
  id: string
  name: string
  sport_type: string
  category?: string
  start_date?: string
  end_date?: string
  registration_fee: number
  prize_description?: string
  max_teams?: number
  status: 'inscripcion' | 'en_curso' | 'finalizado' | 'cancelado'
  description?: string
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

export interface Match {
  id: string
  championship_id: string
  field_id?: string
  home_team_id: string
  away_team_id: string
  match_date?: string
  match_time?: string
  home_score?: number
  away_score?: number
  stage: string
  status: 'programado' | 'en_juego' | 'finalizado' | 'cancelado'
  notes?: string
  created_at: string
  home_team?: Team
  away_team?: Team
}

export interface Sale {
  id: string
  sale_type: 'producto' | 'bebida' | 'alquiler' | 'campeonato' | 'otro'
  customer_name?: string
  customer_id?: string
  reservation_id?: string
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
  subtotal?: number
  created_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  movement_type: 'entrada' | 'salida' | 'ajuste'
  quantity: number
  reason?: string
  reference_id?: string
  created_at: string
}
