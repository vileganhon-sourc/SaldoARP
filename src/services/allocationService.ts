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
        if (data.length > 0) {
          const mapped: InternalAllocation[] = data.map((d: any) => ({
            id: d.id,
            unitName: d.unit_name,
            allocatedQty: Number(d.allocated_qty),
            empenhadaQty: Number(d.empenhada_qty) || 0
          }));
          try {
            localStorage.setItem(`saldoarp-allocations-${itemKey}`, JSON.stringify(mapped));
          } catch {}
          return mapped;
        } else {
          // Se vazio no Supabase, tenta auto-migrar dados do localStorage
          const localStored = localStorage.getItem(`saldoarp-allocations-${itemKey}`);
          if (localStored) {
            const localData: InternalAllocation[] = JSON.parse(localStored);
            if (Array.isArray(localData) && localData.length > 0) {
              await saveAllocations(itemKey, localData);
              return localData;
            }
          }
          return [];
        }
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
        if (data.length > 0) {
          const map: Record<string, string> = {};
          data.forEach((d: any) => {
            map[d.empenho_numero] = d.allocation_id;
          });
          try {
            localStorage.setItem(`saldoarp-empenho-links-${itemKey}`, JSON.stringify(map));
          } catch {}
          return map;
        } else {
          // Se vazio no Supabase, tenta auto-migrar dados do localStorage
          const localStored = localStorage.getItem(`saldoarp-empenho-links-${itemKey}`);
          if (localStored) {
            const localMap: Record<string, string> = JSON.parse(localStored);
            if (localMap && Object.keys(localMap).length > 0) {
              await saveEmpenhoLinks(itemKey, localMap);
              return localMap;
            }
          }
          return {};
        }
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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('empenho_manual_quantidades')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data) {
        if (data.length > 0) {
          const map: Record<string, number> = {};
          data.forEach((d: any) => {
            map[d.emp_key] = Number(d.quantidade);
          });
          try {
            localStorage.setItem(`saldoarp-empenho-quantities-${itemKey}`, JSON.stringify(map));
          } catch {}
          return map;
        } else {
          // Se vazio no Supabase, tenta auto-migrar dados do localStorage
          const localStored = localStorage.getItem(`saldoarp-empenho-quantities-${itemKey}`);
          if (localStored) {
            const localMap: Record<string, number> = JSON.parse(localStored);
            if (localMap && Object.keys(localMap).length > 0) {
              await saveEmpenhoManualQuantities(itemKey, localMap);
              return localMap;
            }
          }
          return {};
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar quantidades manuais de empenhos do Supabase', e);
    }
  }

  // LocalStorage Fallback
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
  // Always update localStorage
  try {
    const key = `saldoarp-empenho-quantities-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(quantities));
  } catch (e) {
    console.error('Erro ao salvar quantidades manuais de empenhos no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('empenho_manual_quantidades').delete().eq('item_key', itemKey);

      const entries = Object.entries(quantities);
      if (entries.length > 0) {
        const rows = entries.map(([emp_key, quantidade]) => ({
          item_key: itemKey,
          emp_key,
          quantidade: Number(quantidade)
        }));
        await supabase.from('empenho_manual_quantidades').insert(rows);
      }
    } catch (e) {
      console.warn('Erro ao salvar quantidades manuais de empenhos no Supabase', e);
    }
  }
}

export async function removeEmpenhoManualQuantity(itemKey: string, empKey: string): Promise<Record<string, number>> {
  let updated: Record<string, number> = {};
  try {
    const current = await fetchEmpenhoManualQuantities(itemKey);
    delete current[empKey];
    updated = current;
    const key = `saldoarp-empenho-quantities-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Erro ao remover quantidade manual do empenho no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('empenho_manual_quantidades')
        .delete()
        .eq('item_key', itemKey)
        .eq('emp_key', empKey);
    } catch (e) {
      console.warn('Erro ao remover quantidade manual do empenho no Supabase', e);
    }
  }

  return updated;
}

// -------------------------------------------------------------
// Persistência de Empenhos Manuais Canônicos
// -------------------------------------------------------------
export async function fetchManualEmpenhos(itemKey: string): Promise<Empenho[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('empenhos_manuais')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data) {
        if (data.length > 0) {
          const mapped: Empenho[] = data.map((d: any) => ({
            id: d.id,
            numero: d.numero,
            ano: Number(d.ano),
            arpId: d.arp_id,
            itemId: d.item_id,
            uasg: d.uasg,
            quantidade: Number(d.quantidade),
            valorUnitario: d.valor_unitario !== null && d.valor_unitario !== undefined ? Number(d.valor_unitario) : undefined,
            valorTotal: d.valor_total !== null && d.valor_total !== undefined ? Number(d.valor_total) : undefined,
            data: d.data || undefined,
            fornecedor: d.fornecedor || undefined,
            cnpjFornecedor: d.cnpj_fornecedor || undefined,
            unidadeInternaId: d.unidade_interna_id || undefined,
            observacao: d.observacao || undefined,
            origem: d.origem || 'MANUAL',
            status: d.status || 'CONFIRMADO',
            criadoEm: d.criado_em || new Date().toISOString(),
            atualizadoEm: d.atualizado_em || new Date().toISOString()
          }));

          try {
            localStorage.setItem(`saldoarp-manual-empenhos-${itemKey}`, JSON.stringify(mapped));
          } catch {}

          return mapped;
        } else {
          // Se vazio no Supabase, tenta auto-migrar dados do localStorage
          const localStored = localStorage.getItem(`saldoarp-manual-empenhos-${itemKey}`);
          if (localStored) {
            const localData: Empenho[] = JSON.parse(localStored);
            if (Array.isArray(localData) && localData.length > 0) {
              await saveManualEmpenhos(itemKey, localData);
              return localData;
            }
          }
          return [];
        }
      }
    } catch (e) {
      console.warn('Erro ao ler empenhos manuais do Supabase', e);
    }
  }

  // LocalStorage Fallback
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
  // Always update localStorage
  try {
    const key = `saldoarp-manual-empenhos-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(empenhos));
  } catch (e) {
    console.error('Erro ao salvar empenhos manuais no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('empenhos_manuais').delete().eq('item_key', itemKey);

      if (empenhos.length > 0) {
        const rows = empenhos.map(e => ({
          id: e.id,
          item_key: itemKey,
          numero: e.numero,
          ano: e.ano,
          arp_id: e.arpId,
          item_id: e.itemId,
          uasg: e.uasg,
          quantidade: e.quantidade,
          valor_unitario: e.valorUnitario !== undefined ? e.valorUnitario : null,
          valor_total: e.valorTotal !== undefined ? e.valorTotal : null,
          data: e.data || null,
          fornecedor: e.fornecedor || null,
          cnpj_fornecedor: e.cnpjFornecedor || null,
          unidade_interna_id: e.unidadeInternaId || null,
          observacao: e.observacao || null,
          origem: e.origem || 'MANUAL',
          status: e.status || 'CONFIRMADO',
          criado_em: e.criadoEm || new Date().toISOString(),
          atualizado_em: e.atualizadoEm || new Date().toISOString()
        }));
        await supabase.from('empenhos_manuais').insert(rows);
      }
    } catch (e) {
      console.warn('Erro ao salvar empenhos manuais no Supabase', e);
    }
  }
}

// -------------------------------------------------------------
// Persistência de Contratos Manuais Canônicos
// -------------------------------------------------------------
export async function fetchManualContratos(itemKey: string): Promise<Contrato[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('contratos_manuais')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data) {
        if (data.length > 0) {
          const mapped: Contrato[] = data.map((d: any) => ({
            id: d.id,
            numero: d.numero,
            ano: Number(d.ano),
            arpId: d.arp_id,
            itemId: d.item_id || undefined,
            uasg: d.uasg,
            numeroControlePncp: d.numero_controle_pncp || undefined,
            linkPncp: d.link_pncp || undefined,
            fornecedor: d.fornecedor || undefined,
            cnpjFornecedor: d.cnpj_fornecedor || undefined,
            objeto: d.objeto || undefined,
            quantidadeContratada: d.quantidade_contratada !== null && d.quantidade_contratada !== undefined ? Number(d.quantidade_contratada) : undefined,
            valorTotal: d.valor_total !== null && d.valor_total !== undefined ? Number(d.valor_total) : undefined,
            origem: d.origem || 'MANUAL',
            criadoEm: d.criado_em || new Date().toISOString(),
            atualizadoEm: d.atualizado_em || new Date().toISOString()
          }));

          try {
            localStorage.setItem(`saldoarp-manual-contratos-${itemKey}`, JSON.stringify(mapped));
          } catch {}

          return mapped;
        } else {
          // Se vazio no Supabase, tenta auto-migrar dados do localStorage
          const localStored = localStorage.getItem(`saldoarp-manual-contratos-${itemKey}`);
          if (localStored) {
            const localData: Contrato[] = JSON.parse(localStored);
            if (Array.isArray(localData) && localData.length > 0) {
              await saveManualContratos(itemKey, localData);
              return localData;
            }
          }
          return [];
        }
      }
    } catch (e) {
      console.warn('Erro ao ler contratos manuais do Supabase', e);
    }
  }

  // LocalStorage Fallback
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
  // Always update localStorage
  try {
    const key = `saldoarp-manual-contratos-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(contratos));
  } catch (e) {
    console.error('Erro ao salvar contratos manuais no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('contratos_manuais').delete().eq('item_key', itemKey);

      if (contratos.length > 0) {
        const rows = contratos.map(c => ({
          id: c.id,
          item_key: itemKey,
          numero: c.numero,
          ano: c.ano,
          arp_id: c.arpId,
          item_id: c.itemId || null,
          uasg: c.uasg,
          numero_controle_pncp: c.numeroControlePncp || null,
          link_pncp: c.linkPncp || null,
          fornecedor: c.fornecedor || null,
          cnpj_fornecedor: c.cnpjFornecedor || null,
          objeto: c.objeto || null,
          quantidade_contratada: c.quantidadeContratada !== undefined ? c.quantidadeContratada : null,
          valor_total: c.valorTotal !== undefined ? c.valorTotal : null,
          origem: c.origem || 'MANUAL',
          criado_em: c.criadoEm || new Date().toISOString(),
          atualizado_em: c.atualizadoEm || new Date().toISOString()
        }));
        await supabase.from('contratos_manuais').insert(rows);
      }
    } catch (e) {
      console.warn('Erro ao salvar contratos manuais no Supabase', e);
    }
  }
}

// -------------------------------------------------------------
// Persistência de Relacionamentos Contrato-Empenho
// -------------------------------------------------------------
export async function fetchContratoEmpenhoLinks(itemKey: string): Promise<ContratoEmpenho[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('contrato_empenho_links')
        .select('*')
        .eq('item_key', itemKey);

      if (!error && data) {
        if (data.length > 0) {
          const mapped: ContratoEmpenho[] = data.map((d: any) => ({
            id: d.id,
            contratoId: d.contrato_id,
            empenhoId: d.empenho_id,
            quantidadeVinculada: d.quantidade_vinculada !== null && d.quantidade_vinculada !== undefined ? Number(d.quantidade_vinculada) : undefined,
            dataVinculo: d.data_vinculo || new Date().toISOString(),
            origem: d.origem || 'MANUAL'
          }));

          try {
            localStorage.setItem(`saldoarp-contrato-empenho-links-${itemKey}`, JSON.stringify(mapped));
          } catch {}

          return mapped;
        } else {
          // Se vazio no Supabase, tenta auto-migrar dados do localStorage
          const localStored = localStorage.getItem(`saldoarp-contrato-empenho-links-${itemKey}`);
          if (localStored) {
            const localData: ContratoEmpenho[] = JSON.parse(localStored);
            if (Array.isArray(localData) && localData.length > 0) {
              await saveContratoEmpenhoLinks(itemKey, localData);
              return localData;
            }
          }
          return [];
        }
      }
    } catch (e) {
      console.warn('Erro ao ler links contrato-empenho do Supabase', e);
    }
  }

  // LocalStorage Fallback
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
  // Always update localStorage
  try {
    const key = `saldoarp-contrato-empenho-links-${itemKey}`;
    localStorage.setItem(key, JSON.stringify(links));
  } catch (e) {
    console.error('Erro ao salvar links contrato-empenho no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('contrato_empenho_links').delete().eq('item_key', itemKey);

      if (links.length > 0) {
        const rows = links.map(l => ({
          id: l.id,
          item_key: itemKey,
          contrato_id: l.contratoId,
          empenho_id: l.empenhoId,
          quantidade_vinculada: l.quantidadeVinculada !== undefined ? l.quantidadeVinculada : null,
          data_vinculo: l.dataVinculo || new Date().toISOString(),
          origem: l.origem || 'MANUAL'
        }));
        await supabase.from('contrato_empenho_links').insert(rows);
      }
    } catch (e) {
      console.warn('Erro ao salvar links contrato-empenho no Supabase', e);
    }
  }
}

/**
 * Zera todas as alocações internas e vínculos de empenhos do sistema (LocalStorage e Supabase)
 */
export async function clearAllAllocations(): Promise<void> {
  // 1. Limpa chaves de alocações e vínculos do LocalStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('saldoarp-allocations-') ||
          key.startsWith('saldoarp-empenho-links-') ||
          key.startsWith('saldoarp-empenho-quantities-') ||
          key.startsWith('saldoarp-manual-empenhos-') ||
          key.startsWith('saldoarp-manual-contratos-') ||
          key.startsWith('saldoarp-contrato-empenho-links-')
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
      await supabase.from('empenho_manual_quantidades').delete().neq('item_key', '00000000-0000-0000-0000-000000000000');
      await supabase.from('empenhos_manuais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('contratos_manuais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('contrato_empenho_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('Erro ao limpar alocações no Supabase', e);
    }
  }
}
