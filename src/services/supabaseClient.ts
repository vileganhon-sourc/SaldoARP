import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Types for Supabase Tables
export interface DbAllocation {
  id: string;
  item_key: string;
  unit_name: string;
  allocated_qty: number;
  empenhada_qty: number;
  created_at?: string;
}

export interface DbEmpenhoLink {
  id: string;
  item_key: string;
  empenho_numero: string;
  allocation_id: string;
  created_at?: string;
}
