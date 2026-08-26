import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { DbProcessoSei } from './supabaseClient';
import type { ProcessoSei } from '../types';

const STORAGE_KEY = 'saldoarp-processos-sei';

/**
 * Busca todos os processos SEI cadastrados (do Supabase ou localStorage)
 */
export async function fetchProcessosSei(): Promise<ProcessoSei[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('processos_sei')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((d: DbProcessoSei) => ({
          id: d.id,
          numeroProcessoSei: d.numero_processo_sei,
          descricaoObjeto: d.descricao_objeto || '',
          unidadeRequisitante: d.unidade_requisitante || '',
          responsavelNome: d.responsavel_nome || '',
          statusProcesso: (d.status_processo as any) || 'Em Instrução',
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
      }
    } catch (e) {
      console.warn('Erro ao consultar processos SEI no Supabase. Utilizando fallback local.', e);
    }
  }

  // Fallback LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro no fallback do localStorage para Processos SEI', e);
  }

  return [];
}

/**
 * Salva ou atualiza um processo SEI no Supabase e localStorage
 */
export async function saveProcessoSei(processo: Omit<ProcessoSei, 'id'> & { id?: string }): Promise<ProcessoSei> {
  const newId = processo.id || `sei-${Date.now()}`;
  const record: ProcessoSei = {
    ...processo,
    id: newId,
    updatedAt: new Date().toISOString(),
    createdAt: processo.id ? (processo as ProcessoSei).createdAt : new Date().toISOString()
  };

  // Salva no LocalStorage
  try {
    const current = await fetchProcessosSei();
    const index = current.findIndex(p => p.id === record.id || p.numeroProcessoSei === record.numeroProcessoSei);
    let updatedList: ProcessoSei[];
    if (index >= 0) {
      updatedList = [...current];
      updatedList[index] = record;
    } else {
      updatedList = [record, ...current];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.error('Erro ao salvar processo SEI no localStorage', e);
  }

  // Persiste no Supabase se configurado
  if (isSupabaseConfigured && supabase) {
    try {
      const dbRow: Partial<DbProcessoSei> = {
        numero_processo_sei: record.numeroProcessoSei,
        descricao_objeto: record.descricaoObjeto,
        unidade_requisitante: record.unidadeRequisitante,
        responsavel_nome: record.responsavelNome,
        status_processo: record.statusProcesso,
        updated_at: new Date().toISOString()
      };

      if (processo.id) {
        await supabase
          .from('processos_sei')
          .update(dbRow)
          .eq('id', processo.id);
      } else {
        const { data } = await supabase
          .from('processos_sei')
          .insert({
            ...dbRow,
            id: newId
          })
          .select()
          .single();
        if (data) {
          record.id = data.id;
        }
      }
    } catch (e) {
      console.warn('Erro ao salvar processo SEI no Supabase', e);
    }
  }

  return record;
}

/**
 * Exclui um processo SEI
 */
export async function deleteProcessoSei(id: string): Promise<void> {
  // Remove do localStorage
  try {
    const current = await fetchProcessosSei();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Erro ao remover do localStorage', e);
  }

  // Remove do Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('processos_sei').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao excluir processo SEI no Supabase', e);
    }
  }
}
