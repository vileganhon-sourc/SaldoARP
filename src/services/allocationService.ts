import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { InternalAllocation, Empenho, Contrato, ContratoEmpenho } from '../types';

export interface GlobalAllocationRecord {
  id: string;
  itemKey: string;
  unitName: string;
  allocatedQty: number;
  empenhadaQty: number;
}

export async function fetchAllAllocationsGlobal(): Promise<GlobalAllocationRecord[]> {
  const records: GlobalAllocationRecord[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('arp_allocations')
        .select('*');

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          itemKey: d.item_key,
          unitName: d.unit_name,
          allocatedQty: Number(d.allocated_qty),
          empenhadaQty: Number(d.empenhada_qty) || 0
        }));
      }
    } catch (e) {
      console.warn('Erro ao carregar todas as alocações do Supabase', e);
    }
  }

  // Fallback para localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('saldoarp-allocations-')) {
        const itemKey = key.replace('saldoarp-allocations-', '');
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((a: any) => {
              records.push({
                id: a.id,
                itemKey,
                unitName: a.unitName,
                allocatedQty: Number(a.allocatedQty),
                empenhadaQty: Number(a.empenhadaQty) || 0
              });
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Erro ao ler alocações do localStorage', e);
  }

  return records;
}

export async function fetchAllocations(itemKey: string): Promise<InternalAllocation[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('arp_allocations')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          unitName: d.unit_name,
          allocatedQty: Number(d.allocated_qty),
          empenhadaQty: Number(d.empenhada_qty) || 0
        }));
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
    }
  } catch (e) {
    console.error('Erro no fallback do localStorage', e);
  }

  return [];
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

export async function fetchEmpenhoLinks(itemKey: string): Promise<Record<string, string>> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('empenho_links')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => {
          map[d.empenho_numero] = d.allocation_id;
        });
        return map;
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
    }
  } catch (e) {
    console.error('Erro no fallback do localStorage (empenho links)', e);
  }

  return {};
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

export async function fetchEmpenhoManualQuantities(itemKey: string): Promise<Record<string, number>> {
  try {
    const key = `saldoarp-empenho-quantities-${itemKey}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro ao ler quantidades manuais de empenhos no localStorage', e);
  }
  return {};
}

export async function saveEmpenhoManualQuantities(itemKey: string, quantities: Record<string, number>): Promise<void> {
  try {
    const key = `saldoarp-empenho-quantities-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(quantities));
  } catch (e) {
    console.error('Erro ao salvar quantidades manuais de empenhos no localStorage', e);
  }
}

export async function removeEmpenhoManualQuantity(itemKey: string, empKey: string): Promise<Record<string, number>> {
  try {
    const current = await fetchEmpenhoManualQuantities(itemKey);
    delete current[empKey];
    await saveEmpenhoManualQuantities(itemKey, current);
    return current;
  } catch (e) {
    console.error('Erro ao remover quantidade manual do empenho no localStorage', e);
    return {};
  }
}

// -------------------------------------------------------------
// Persistência de Empenhos Manuais Canônicos
// -------------------------------------------------------------
export async function fetchManualEmpenhos(itemKey: string): Promise<Empenho[]> {
  try {
    const key = `saldoarp-manual-empenhos-${itemKey}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro ao ler empenhos manuais do localStorage', e);
  }
  return [];
}

export async function saveManualEmpenhos(itemKey: string, empenhos: Empenho[]): Promise<void> {
  try {
    const key = `saldoarp-manual-empenhos-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(empenhos));
  } catch (e) {
    console.error('Erro ao salvar empenhos manuais no localStorage', e);
  }
}

// -------------------------------------------------------------
// Persistência de Contratos Manuais Canônicos
// -------------------------------------------------------------
export async function fetchManualContratos(itemKey: string): Promise<Contrato[]> {
  try {
    const key = `saldoarp-manual-contratos-${itemKey}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro ao ler contratos manuais do localStorage', e);
  }
  return [];
}

export async function saveManualContratos(itemKey: string, contratos: Contrato[]): Promise<void> {
  try {
    const key = `saldoarp-manual-contratos-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(contratos));
  } catch (e) {
    console.error('Erro ao salvar contratos manuais no localStorage', e);
  }
}

// -------------------------------------------------------------
// Persistência de Relacionamentos Contrato-Empenho
// -------------------------------------------------------------
export async function fetchContratoEmpenhoLinks(itemKey: string): Promise<ContratoEmpenho[]> {
  try {
    const key = `saldoarp-contrato-empenho-links-${itemKey}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro ao ler links contrato-empenho do localStorage', e);
  }
  return [];
}

export async function saveContratoEmpenhoLinks(itemKey: string, links: ContratoEmpenho[]): Promise<void> {
  try {
    const key = `saldoarp-contrato-empenho-links-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(links));
  } catch (e) {
    console.error('Erro ao salvar links contrato-empenho no localStorage', e);
  }
}

/**
 * Zera todas as alocações internas e vínculos de empenhos do sistema (LocalStorage e Supabase)
 */
export async function clearAllAllocations(): Promise<void> {
  // 1. Limpa chaves de alocações e vínculos do LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('saldoarp-allocations-') ||
          key.startsWith('saldoarp-empenho-links-') ||
          key.startsWith('saldoarp-empenho-quantities-')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Erro ao limpar alocações do localStorage', e);
    }
  }

  // 2. Limpa tabelas de alocações do Supabase se configurado
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('arp_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('empenho_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('Erro ao limpar alocações no Supabase', e);
    }
  }
}

