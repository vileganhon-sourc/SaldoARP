import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { InternalAllocation } from '../types';

export async function fetchAllocations(itemKey: string, defaultAllocations: InternalAllocation[] = []): Promise<InternalAllocation[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('arp_allocations')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          unitName: d.unit_name,
          allocatedQty: d.allocated_qty,
          empenhadaQty: d.empenhada_qty || 0
        }));
      }

      // If empty in Supabase, insert defaults if provided
      if (!error && data && data.length === 0 && defaultAllocations.length > 0) {
        await saveAllocations(itemKey, defaultAllocations);
        return defaultAllocations;
      }
    } catch (e) {
      console.warn('Erro ao conectar com Supabase (allocations), utilizando localStorage como fallback.', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `saldoarp-allocations-${itemKey}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    } else if (defaultAllocations.length > 0) {
      localStorage.setItem(key, JSON.stringify(defaultAllocations));
      return defaultAllocations;
    }
  } catch (e) {
    console.error('Erro no fallback do localStorage', e);
  }

  return defaultAllocations;
}

export async function saveAllocations(itemKey: string, allocations: InternalAllocation[]): Promise<void> {
  // Always update localStorage for offline/instant availability
  try {
    const key = `saldoarp-allocations-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(allocations));
  } catch (e) {
    console.error('Erro ao salvar no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // Upsert/Replace records for this item_key
      await supabase.from('arp_allocations').delete().eq('item_key', itemKey);
      
      if (allocations.length > 0) {
        const rows = allocations.map(a => ({
          id: a.id,
          item_key: itemKey,
          unit_name: a.unitName,
          allocated_qty: a.allocatedQty,
          empenhada_qty: a.empenhadaQty
        }));
        await supabase.from('arp_allocations').insert(rows);
      }
    } catch (e) {
      console.warn('Erro ao persistir alocações no Supabase', e);
    }
  }
}

export async function fetchEmpenhoLinks(itemKey: string, defaultLinks: Record<string, string> = {}): Promise<Record<string, string>> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('empenho_links')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => {
          map[d.empenho_numero] = d.allocation_id;
        });
        return map;
      }
      
      if (!error && data && data.length === 0 && Object.keys(defaultLinks).length > 0) {
        await saveEmpenhoLinks(itemKey, defaultLinks);
        return defaultLinks;
      }
    } catch (e) {
      console.warn('Erro ao carregar vínculos de empenhos do Supabase', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `saldoarp-empenho-links-${itemKey}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    } else if (Object.keys(defaultLinks).length > 0) {
      localStorage.setItem(key, JSON.stringify(defaultLinks));
      return defaultLinks;
    }
  } catch (e) {
    console.error('Erro no fallback do localStorage (empenho links)', e);
  }

  return defaultLinks;
}

export async function saveEmpenhoLinks(itemKey: string, links: Record<string, string>): Promise<void> {
  // Always update localStorage
  try {
    const key = `saldoarp-empenho-links-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(links));
  } catch (e) {
    console.error('Erro ao salvar vínculos no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('empenho_links').delete().eq('item_key', itemKey);
      
      const entries = Object.entries(links);
      if (entries.length > 0) {
        const rows = entries.map(([empenho_numero, allocation_id]) => ({
          item_key: itemKey,
          empenho_numero,
          allocation_id
        }));
        await supabase.from('empenho_links').insert(rows);
      }
    } catch (e) {
      console.warn('Erro ao salvar vínculos no Supabase', e);
    }
  }
}
