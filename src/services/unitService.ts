import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface InternalDepartment {
  id: string;
  sigla: string;
  nomeCompleto: string;
  descricao?: string;
  ativo: boolean;
  criadoEm?: string;
}

export const DEFAULT_DEPARTMENTS: InternalDepartment[] = [
  {
    id: 'dep-dfnsp',
    sigla: 'DFNSP',
    nomeCompleto: 'Diretoria da Força Nacional de Segurança Pública',
    ativo: true
  },
  {
    id: 'dep-dsusp',
    sigla: 'DSUSP',
    nomeCompleto: 'Diretoria do Sistema Único de Segurança Pública',
    ativo: true
  },
  {
    id: 'dep-dpoa',
    sigla: 'DPOA',
    nomeCompleto: 'Diretoria de Operações Integradas e de Inteligência',
    ativo: true
  },
  {
    id: 'dep-dge',
    sigla: 'DGE',
    nomeCompleto: 'Diretoria de Gestão e Ensino em Segurança Pública',
    ativo: true
  },
  {
    id: 'dep-cgoe',
    sigla: 'CGOE',
    nomeCompleto: 'Coordenação-Geral de Operações Especiais',
    ativo: true
  },
  {
    id: 'dep-cgpo',
    sigla: 'CGPO',
    nomeCompleto: 'Coordenação-Geral de Planejamento e Orçamento',
    ativo: true
  },
  {
    id: 'dep-emendas',
    sigla: 'Emendas Parlamentares',
    nomeCompleto: 'Alocação para Emendas Parlamentares e Convênios',
    ativo: true
  },
  {
    id: 'dep-gabinete',
    sigla: 'Gabinete / SENASP',
    nomeCompleto: 'Gabinete da Secretaria Nacional de Segurança Pública',
    ativo: true
  }
];

const STORAGE_KEY = 'saldoarp-internal-departments';

export async function fetchDepartments(): Promise<InternalDepartment[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('internal_departments')
        .select('*')
        .order('sigla');

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          sigla: d.sigla,
          nomeCompleto: d.nome_completo || d.nomeCompleto || '',
          descricao: d.descricao || '',
          ativo: d.ativo !== false,
          criadoEm: d.created_at
        }));
      }
    } catch (e) {
      console.warn('Erro ao carregar departamentos do Supabase, usando localStorage', e);
    }
  }

  // LocalStorage Fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Inicializa com defaults
  saveDepartments(DEFAULT_DEPARTMENTS);
  return DEFAULT_DEPARTMENTS;
}

export async function saveDepartments(departments: InternalDepartment[]): Promise<void> {
  // Always update localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(departments));
  } catch (e) {
    console.error('Erro ao salvar departamentos no localStorage', e);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const rows = departments.map(d => ({
        id: d.id,
        sigla: d.sigla,
        nome_completo: d.nomeCompleto,
        descricao: d.descricao || '',
        ativo: d.ativo
      }));

      await supabase.from('internal_departments').upsert(rows, { onConflict: 'id' });
    } catch (e) {
      console.warn('Erro ao sincronizar departamentos no Supabase', e);
    }
  }
}

export async function addDepartment(sigla: string, nomeCompleto: string): Promise<InternalDepartment> {
  const current = await fetchDepartments();
  const cleanSigla = sigla.trim();
  const cleanNome = nomeCompleto.trim();

  // Verifica duplicidade de sigla
  const existing = current.find(d => d.sigla.toLowerCase() === cleanSigla.toLowerCase());
  if (existing) {
    return existing;
  }

  const newDep: InternalDepartment = {
    id: `dep-${Date.now()}`,
    sigla: cleanSigla,
    nomeCompleto: cleanNome || cleanSigla,
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  const updated = [...current, newDep];
  await saveDepartments(updated);
  return newDep;
}

export async function updateDepartment(id: string, sigla: string, nomeCompleto: string): Promise<void> {
  const current = await fetchDepartments();
  const updated = current.map(d => 
    d.id === id 
      ? { ...d, sigla: sigla.trim(), nomeCompleto: nomeCompleto.trim() } 
      : d
  );
  await saveDepartments(updated);
}

export async function deleteDepartment(id: string): Promise<void> {
  const current = await fetchDepartments();
  const updated = current.filter(d => d.id !== id);
  await saveDepartments(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('internal_departments').delete().eq('id', id);
    } catch {}
  }
}

/**
 * Mescla e higieniza nomes legados de alocações (ex: "DFNSPdddd" -> "DFNSP")
 * Atualiza automaticamente o Supabase e localStorage
 */
export async function mergeDepartmentName(oldName: string, targetSigla: string): Promise<number> {
  let count = 0;

  // 1. Atualiza no Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('arp_allocations')
        .update({ unit_name: targetSigla })
        .eq('unit_name', oldName)
        .select();
      if (data) count = data.length;
    } catch (e) {
      console.warn('Erro ao mesclar alocações no Supabase', e);
    }
  }

  // 2. Atualiza no LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('saldoarp-allocations-')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let changed = false;
            const updated = list.map((a: any) => {
              if (a.unitName === oldName) {
                changed = true;
                count++;
                return { ...a, unitName: targetSigla };
              }
              return a;
            });
            if (changed) {
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Erro ao mesclar alocações no localStorage', e);
  }

  return count;
}
