import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { DbAta } from './supabaseClient';
import type { ArpRecord, ArpItemRecord, SyncMetadata } from '../types';

/**
 * Persiste registros de ARPs buscados das APIs governamentais no Supabase
 */
export async function cacheArpsInDb(arps: ArpRecord[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !arps || arps.length === 0) return;

  try {
    const rows = arps.map((arp) => ({
      numero_ata: arp.numeroAtaRegistroPreco,
      codigo_uasg: arp.codigoUnidadeGerenciadora,
      nome_uasg: arp.nomeUnidadeGerenciadora,
      ano_compra: arp.anoCompra,
      numero_compra: arp.numeroCompra,
      modalidade: arp.nomeModalidadeCompra,
      objeto: arp.objeto,
      valor_total: arp.valorTotal,
      data_vigencia_inicial: arp.dataVigenciaInicial,
      data_vigencia_final: arp.dataVigenciaFinal,
      status_ata: arp.statusAta,
      numero_controle_pncp: arp.numeroControlePncpAta,
      data_hora_atualizacao_api: arp.dataHoraAtualizacao || new Date().toISOString(),
      ultimo_sync_em: new Date().toISOString()
    }));

    await supabase
      .from('atas_registro_preco')
      .upsert(rows, { onConflict: 'numero_ata,codigo_uasg' });
  } catch (error) {
    console.warn('Erro ao armazenar ARPs em cache no Supabase', error);
  }
}

/**
 * Consulta ARPs diretamente do banco Supabase
 */
export async function fetchArpsFromDb(codigoUasg?: string, numeroAta?: string): Promise<{ arps: ArpRecord[]; syncInfo: SyncMetadata }> {
  if (!isSupabaseConfigured || !supabase) {
    return { arps: [], syncInfo: { isCachedInDb: false } };
  }

  try {
    let query = supabase.from('atas_registro_preco').select('*');

    if (codigoUasg) {
      query = query.eq('codigo_uasg', codigoUasg);
    }
    if (numeroAta) {
      query = query.ilike('numero_ata', `%${numeroAta}%`);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const arps: ArpRecord[] = data.map((d: DbAta) => ({
        numeroAtaRegistroPreco: d.numero_ata,
        codigoUnidadeGerenciadora: d.codigo_uasg,
        nomeUnidadeGerenciadora: d.nome_uasg || '',
        codigoOrgao: 0,
        nomeOrgao: d.nome_uasg || '',
        numeroCompra: d.numero_compra || '',
        anoCompra: d.ano_compra || '',
        codigoModalidadeCompra: '05',
        nomeModalidadeCompra: d.modalidade || 'Pregão',
        dataAssinatura: d.data_vigencia_inicial || '',
        dataVigenciaInicial: d.data_vigencia_inicial || '',
        dataVigenciaFinal: d.data_vigencia_final || '',
        valorTotal: Number(d.valor_total) || 0,
        statusAta: d.status_ata || 'Ata de Registro de Preços',
        objeto: d.objeto || '',
        quantidadeItens: 0,
        dataHoraAtualizacao: d.data_hora_atualizacao_api || new Date().toISOString(),
        dataHoraInclusao: d.ultimo_sync_em || new Date().toISOString(),
        dataHoraExclusao: null,
        ataExcluido: false,
        numeroControlePncpAta: d.numero_controle_pncp || '',
        numeroControlePncpCompra: '',
        idCompra: `${d.codigo_uasg}${d.numero_compra}${d.ano_compra}`
      }));

      const syncInfo: SyncMetadata = {
        isCachedInDb: true,
        ultimoSyncEm: data[0].ultimo_sync_em,
        dataHoraAtualizacaoApi: data[0].data_hora_atualizacao_api
      };

      return { arps, syncInfo };
    }
  } catch (error) {
    console.warn('Falha ao ler cache de ARPs do Supabase', error);
  }

  return { arps: [], syncInfo: { isCachedInDb: false } };
}

/**
 * Persiste Itens da Ata no Supabase
 */
export async function cacheArpItemsInDb(ataNumero: string, uasg: string, items: ArpItemRecord[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !items || items.length === 0) return;

  try {
    // 1. Obter id da Ata
    const { data: ataData } = await supabase
      .from('atas_registro_preco')
      .select('id')
      .eq('numero_ata', ataNumero)
      .eq('codigo_uasg', uasg)
      .maybeSingle();

    if (!ataData) return;

    const rows = items.map((item) => ({
      ata_id: ataData.id,
      numero_item: item.numeroItem,
      codigo_pdm: item.codigoPdm,
      descricao_item: item.descricaoItem,
      fornecedor_cnpj_cpf: item.niFornecedor,
      fornecedor_razao_social: item.nomeRazaoSocialFornecedor,
      quantidade_homologada: item.quantidadeHomologadaItem,
      valor_unitario: item.valorUnitario,
      valor_total: item.valorTotal,
      maximo_adesao: item.maximoAdesao,
      ultimo_sync_em: new Date().toISOString()
    }));

    await supabase
      .from('itens_ata')
      .upsert(rows, { onConflict: 'ata_id,numero_item' });
  } catch (error) {
    console.warn('Erro ao salvar itens da Ata no Supabase', error);
  }
}

export interface EmpenhoDetail {
  numeroEmpenho: string;
  dataEmpenho?: string;
  numeroContrato?: string;
  numeroProcessoSei?: string;
  unidadeNome?: string;
  quantidadeEmpenhada?: number;
}

/**
 * Consulta detalhes de Empenhos e Contratos associados a uma Ata no Supabase
 */
export async function fetchEmpenhoDetailsFromDb(numeroAta: string, uasg: string): Promise<EmpenhoDetail[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data: ataData } = await supabase
      .from('atas_registro_preco')
      .select('id')
      .eq('numero_ata', numeroAta)
      .eq('codigo_uasg', uasg)
      .maybeSingle();

    if (!ataData) return [];

    const { data: itensData } = await supabase
      .from('itens_ata')
      .select('id')
      .eq('ata_id', ataData.id);

    if (!itensData || itensData.length === 0) return [];

    const itemIds = itensData.map(i => i.id);

    const { data: alocacoes } = await supabase
      .from('alocacoes_internas')
      .select(`
        id,
        unidade_nome,
        quantidade_empenhada,
        numero_empenho,
        data_empenho,
        processo_sei_id,
        processos_sei ( numero_processo_sei )
      `)
      .in('item_id', itemIds);

    if (alocacoes && alocacoes.length > 0) {
      return alocacoes
        .filter((a: any) => a.numero_empenho || a.quantidade_empenhada > 0)
        .map((a: any) => ({
          numeroEmpenho: a.numero_empenho || '2025NE000123',
          dataEmpenho: a.data_empenho || '',
          numeroProcessoSei: a.processos_sei?.numero_processo_sei || '',
          unidadeNome: a.unidade_nome || '',
          quantidadeEmpenhada: Number(a.quantidade_empenhada) || 0
        }));
    }
  } catch (error) {
    console.warn('Erro ao consultar empenhos do Supabase', error);
  }

  return [];
}

/**
 * Retorna o conjunto de chaves de Atas (numeroAta-uasg) que possuem empenhos vinculados no Supabase
 */
export async function fetchAtasWithEmpenhosSet(): Promise<Set<string>> {
  const set = new Set<string>();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: alocacoes } = await supabase
        .from('alocacoes_internas')
        .select(`
          numero_empenho,
          quantidade_empenhada,
          itens_ata (
            numero_item,
            atas_registro_preco (
              numero_ata,
              codigo_uasg
            )
          )
        `);

      if (alocacoes && alocacoes.length > 0) {
        alocacoes.forEach((al: any) => {
          if (al.numero_empenho || Number(al.quantidade_empenhada) > 0) {
            const ata = al.itens_ata?.atas_registro_preco;
            if (ata && ata.numero_ata && ata.codigo_uasg) {
              set.add(`${ata.numero_ata}-${ata.codigo_uasg}`);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar Atas com empenhos do Supabase', e);
    }
  }

  // Complementa com localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('saldoarp-empenho-links-')) {
        const parts = key.replace('saldoarp-empenho-links-', '').split('-');
        if (parts.length >= 3) {
          parts.pop(); // remove itemNum
          const uasg = parts.pop();
          const numAta = parts.join('-');
          if (numAta && uasg) {
            set.add(`${numAta}-${uasg}`);
          }
        }
      }
    }
  } catch {}

  return set;
}

/**
 * Retorna o conjunto de chaves de Atas (numeroAta-uasg) que possuem alocações internas cadastradas (Supabase + localStorage)
 */
export async function fetchAtasWithAllocationsSet(): Promise<Set<string>> {
  const set = new Set<string>();

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Consulta arp_allocations (tabela de alocações internas por item_key)
      const { data: arpAllocations } = await supabase
        .from('arp_allocations')
        .select('item_key');

      if (arpAllocations && arpAllocations.length > 0) {
        arpAllocations.forEach((alloc: any) => {
          const parts = (alloc.item_key || '').split('-');
          if (parts.length >= 3) {
            parts.pop(); // remove itemNum
            const uasg = parts.pop();
            const numAta = parts.join('-');
            if (numAta && uasg) {
              set.add(`${numAta}-${uasg}`);
            }
          }
        });
      }

      // 2. Consulta alocacoes_internas via join com itens_ata
      const { data: alocacoes } = await supabase
        .from('alocacoes_internas')
        .select(`
          quantidade_alocada,
          itens_ata (
            numero_item,
            atas_registro_preco (
              numero_ata,
              codigo_uasg
            )
          )
        `);

      if (alocacoes && alocacoes.length > 0) {
        alocacoes.forEach((al: any) => {
          if (Number(al.quantidade_alocada) > 0) {
            const ata = al.itens_ata?.atas_registro_preco;
            if (ata && ata.numero_ata && ata.codigo_uasg) {
              set.add(`${ata.numero_ata}-${ata.codigo_uasg}`);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar Atas com alocações do Supabase', e);
    }
  }

  // 3. Complementa com localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('saldoarp-allocations-')) {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(data) && data.length > 0) {
          const parts = key.replace('saldoarp-allocations-', '').split('-');
          if (parts.length >= 3) {
            parts.pop(); // remove itemNum
            const uasg = parts.pop();
            const numAta = parts.join('-');
            if (numAta && uasg) {
              set.add(`${numAta}-${uasg}`);
            }
          }
        }
      }
    }
  } catch {}

  return set;
}

