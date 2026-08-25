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
