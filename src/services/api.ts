import type { ArpResponse, ArpItemsResponse, UnidadesItemResponse, FilterParams, ArpRecord, EmpenhosSaldoItemResponse, EmpenhoSaldoItemRecord, PncpContract, PncpContractEmpenho } from '../types';
import { cacheArpsInDb, cacheArpItemsInDb, fetchArpsFromDb } from './dbCacheService';

const BASE_URL = '/api-arp/modulo-arp';

export function getSimulationMode(): boolean {
  return false;
}

export function setSimulationMode(_value: boolean) {
  // Simulation mode permanently disabled
}

/**
 * Encodes query parameters safely.
 */
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Splits a date range into chunks of at most 365 days to respect the Compras.gov API limit.
 */
function splitDateRange(startDateStr: string, endDateStr: string): { start: string; end: string }[] {
  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  const chunks: { start: string; end: string }[] = [];
  
  let currentStart = new Date(start);
  while (currentStart <= end) {
    let currentEnd = new Date(currentStart);
    currentEnd.setUTCDate(currentEnd.getUTCDate() + 364); // 365 days inclusive (currentStart + 364 days)
    if (currentEnd > end) {
      currentEnd = new Date(end);
    }
    
    const format = (d: Date) => d.toISOString().split('T')[0];
    chunks.push({
      start: format(currentStart),
      end: format(currentEnd)
    });
    
    currentStart = new Date(currentEnd);
    currentStart.setUTCDate(currentStart.getUTCDate() + 1);
  }
  return chunks;
}

/**
 * 1. Consultar ARP
 * Endereço: /modulo-arp/1_consultarARP
 */
export async function fetchArps(params: FilterParams): Promise<ArpResponse> {
  try {
    const chunks = splitDateRange(params.dataVigenciaInicialMin, params.dataVigenciaInicialMax);
    const allArpsMap = new Map<string, ArpRecord>();

    for (const chunk of chunks) {
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const queryParams = {
          pagina: currentPage,
          tamanhoPagina: 500,
          codigoUnidadeGerenciadora: params.codigoUnidadeGerenciadora,
          dataVigenciaInicialMin: chunk.start,
          dataVigenciaInicialMax: chunk.end
        };

        const url = `${BASE_URL}/1_consultarARP${buildQueryString(queryParams)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json() as ArpResponse;

        if (data.resultado && data.resultado.length > 0) {
          for (const arp of data.resultado) {
            if (params.numeroAtaRegistroPreco && !arp.numeroAtaRegistroPreco.includes(params.numeroAtaRegistroPreco)) {
              continue;
            }
            const key = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}`;
            allArpsMap.set(key, arp);
          }
        }

        if (data.paginasRestantes && data.paginasRestantes > 0) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
    }

    const mergedList = Array.from(allArpsMap.values());
    mergedList.sort((a, b) => b.dataVigenciaFinal.localeCompare(a.dataVigenciaFinal));

    cacheArpsInDb(mergedList);

    return {
      resultado: mergedList,
      totalRegistros: mergedList.length,
      totalPaginas: 1,
      paginasRestantes: 0
    };
  } catch (error) {
    console.warn("Falha na requisição API. Consultando cache do Supabase...", error);
    const cached = await fetchArpsFromDb(params.codigoUnidadeGerenciadora, params.numeroAtaRegistroPreco);
    return {
      resultado: cached.arps,
      totalRegistros: cached.arps.length,
      totalPaginas: 1,
      paginasRestantes: 0
    };
  }
}

/**
 * 2. Consultar ARP Item
 * Endereço: /modulo-arp/2_consultarARPItem
 */
export async function fetchArpItems(
  dataVigenciaInicial: string,
  codigoUnidadeGerenciadora: string,
  numeroAtaRegistroPreco: string
): Promise<ArpItemsResponse> {
  const queryParams = {
    pagina: 1,
    tamanhoPagina: 100,
    codigoUnidadeGerenciadora,
    dataVigenciaInicialMin: dataVigenciaInicial,
    dataVigenciaInicialMax: dataVigenciaInicial
  };

  const url = `${BASE_URL}/2_consultarARPItem${buildQueryString(queryParams)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json() as ArpItemsResponse;
    
    if (data.resultado) {
      data.resultado = data.resultado.filter(item => 
        item.numeroAtaRegistroPreco === numeroAtaRegistroPreco
      );
      data.resultado.sort((a, b) => (parseInt(a.numeroItem, 10) || 0) - (parseInt(b.numeroItem, 10) || 0));
      data.totalRegistros = data.resultado.length;
      cacheArpItemsInDb(numeroAtaRegistroPreco, codigoUnidadeGerenciadora, data.resultado);
    }
    return data;
  } catch (error) {
    console.warn("Falha na requisição de itens da API.", error);
    return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
  }
}

/**
 * 3. Consultar Unidades Item
 * Endereço: /modulo-arp/3_consultarUnidadesItem
 */
export async function fetchUnidadesItem(
  numeroAta: string,
  unidadeGerenciadora: string,
  numeroItem: string
): Promise<UnidadesItemResponse> {
  const formattedItem = (numeroItem || '').toString().padStart(5, '0');
  
  const queryParams = {
    pagina: 1,
    tamanhoPagina: 50,
    numeroAta,
    unidadeGerenciadora,
    numeroItem: formattedItem
  };

  const url = `${BASE_URL}/3_consultarUnidadesItem${buildQueryString(queryParams)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as UnidadesItemResponse;
  } catch (error) {
    console.warn("Falha na consulta de unidades do item.", error);
    return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
  }
}

/**
 * 4. Consultar Empenhos Saldo Item
 * Endereço: /modulo-arp/4_consultarEmpenhosSaldoItem
 */
export async function fetchEmpenhosSaldoItem(
  numeroAta: string,
  unidadeGerenciadora: string
): Promise<EmpenhosSaldoItemResponse> {
  try {
    let currentPage = 1;
    let hasMorePages = true;
    const allRecords: EmpenhoSaldoItemRecord[] = [];

    while (hasMorePages) {
      const queryParams = {
        pagina: currentPage,
        tamanhoPagina: 500,
        numeroAta,
        unidadeGerenciadora
      };

      const url = `${BASE_URL}/4_consultarEmpenhosSaldoItem${buildQueryString(queryParams)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json() as EmpenhosSaldoItemResponse;

      if (data.resultado && data.resultado.length > 0) {
        allRecords.push(...data.resultado);
      }

      if (data.paginasRestantes && data.paginasRestantes > 0) {
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }

    return {
      resultado: allRecords,
      totalRegistros: allRecords.length,
      totalPaginas: 1,
      paginasRestantes: 0
    };
  } catch (error) {
    console.warn("Falha na consulta de empenhos do item.", error);
    return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
  }
}

/**
 * 5. Consultar Contratos da Ata no PNCP
 * Endereço: /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/atas/{sequencialAta}/contratos
 */
export async function fetchPncpContracts(
  cnpj: string,
  ano: string,
  sequencial: string,
  sequencialAta: string
): Promise<PncpContract[]> {
  const url = `/api-pncp/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/atas/${sequencialAta}/contratos`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.warn("Falha na consulta de contratos PNCP.", error);
    return [];
  }
}

/**
 * 6. Consultar Empenhos do Contrato no PNCP
 * Endereço: /api/pncp/v1/orgaos/{cnpj}/contratos/{ano}/{sequencialContrato}/empenhos
 */
export async function fetchPncpContractEmpenhos(
  cnpj: string,
  ano: string,
  sequencialContrato: string
): Promise<PncpContractEmpenho[]> {
  const url = `/api-pncp/api/pncp/v1/orgaos/${cnpj}/contratos/${ano}/${sequencialContrato}/empenhos`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.warn("Falha na consulta de empenhos do contrato PNCP.", error);
    return [];
  }
}
