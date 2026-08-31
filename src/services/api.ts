import type { ArpResponse, ArpItemsResponse, ArpItemRecord, UnidadesItemResponse, FilterParams, ArpRecord, EmpenhosSaldoItemResponse, EmpenhoSaldoItemRecord, PncpContract, PncpContractEmpenho, AdesoesItemResponse, AdesaoItemRecord, ComprasGovContratoItemRecord, ComprasGovContratosItemResponse, ContratosGovEmpenhoRecord } from '../types';
import { cacheArpsInDb, cacheArpItemsInDb, fetchArpsFromDb } from './dbCacheService';
import { formatPncpContractUrl } from '../utils/pncpUtils';

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
  const cleanDate = dataVigenciaInicial ? dataVigenciaInicial.split('T')[0] : '';
  
  // Extrai o ano da ata ou da data (ex: "00037/2026" -> "2026")
  const parts = numeroAtaRegistroPreco.split('/');
  const ataYear = parts.length === 2 ? parts[1] : (cleanDate ? cleanDate.split('-')[0] : '2026');

  const executeQuery = async (minDate: string, maxDate: string) => {
    const queryParams = {
      pagina: 1,
      tamanhoPagina: 500,
      codigoUnidadeGerenciadora,
      dataVigenciaInicialMin: minDate,
      dataVigenciaInicialMax: maxDate
    };
    const url = `${BASE_URL}/2_consultarARPItem${buildQueryString(queryParams)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json() as ArpItemsResponse;
  };

  try {
    // 1. Tenta com a data exata informada
    let data: ArpItemsResponse | null = null;
    if (cleanDate) {
      data = await executeQuery(cleanDate, cleanDate);
    }

    let foundItems = (data?.resultado || []).filter(item =>
      item.numeroAtaRegistroPreco === numeroAtaRegistroPreco ||
      item.numeroAtaRegistroPreco.includes(numeroAtaRegistroPreco) ||
      numeroAtaRegistroPreco.includes(item.numeroAtaRegistroPreco)
    );

    // 2. Se não encontrou pelo dia exato (devido a divergência cadastral entre endpoints da API), busca no ano da Ata
    if (foundItems.length === 0 && ataYear) {
      const yearData = await executeQuery(`${ataYear}-01-01`, `${ataYear}-12-31`);
      if (yearData?.resultado) {
        foundItems = yearData.resultado.filter(item =>
          item.numeroAtaRegistroPreco === numeroAtaRegistroPreco ||
          item.numeroAtaRegistroPreco.includes(numeroAtaRegistroPreco) ||
          numeroAtaRegistroPreco.includes(item.numeroAtaRegistroPreco)
        );
      }
    }

    if (foundItems.length > 0) {
      foundItems.sort((a, b) => (parseInt(a.numeroItem, 10) || 0) - (parseInt(b.numeroItem, 10) || 0));

      foundItems.forEach((item, idx) => {
        if (!item.numeroItem) {
          item.numeroItem = String(idx + 1).padStart(5, '0');
        }
      });

      cacheArpItemsInDb(numeroAtaRegistroPreco, codigoUnidadeGerenciadora, foundItems);
      return {
        resultado: foundItems,
        totalRegistros: foundItems.length,
        totalPaginas: 1,
        paginasRestantes: 0
      };
    }

    return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
  } catch (error) {
    console.warn("Falha na requisição de itens da API.", error);
    return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
  }
}

/**
 * Consulta itens de ARP em lote para o intervalo e unidade gerenciadora informados
 */
export async function fetchArpItemsBatch(params: FilterParams): Promise<Record<string, ArpItemRecord[]>> {
  const itemsMap: Record<string, ArpItemRecord[]> = {};

  try {
    const chunks = splitDateRange(params.dataVigenciaInicialMin, params.dataVigenciaInicialMax);

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

        const url = `${BASE_URL}/2_consultarARPItem${buildQueryString(queryParams)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json() as ArpItemsResponse;

        if (data.resultado && data.resultado.length > 0) {
          for (const item of data.resultado) {
            if (params.numeroAtaRegistroPreco && !item.numeroAtaRegistroPreco.includes(params.numeroAtaRegistroPreco)) {
              continue;
            }
            if (!item.numeroItem) {
              item.numeroItem = '00001';
            }
            const key = `${item.numeroAtaRegistroPreco}-${params.codigoUnidadeGerenciadora}`;
            if (!itemsMap[key]) {
              itemsMap[key] = [];
            }
            itemsMap[key].push(item);
          }
        }

        if (data.paginasRestantes && data.paginasRestantes > 0) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
    }

    for (const key in itemsMap) {
      itemsMap[key].sort((a, b) => (parseInt(a.numeroItem, 10) || 0) - (parseInt(b.numeroItem, 10) || 0));
    }

    return itemsMap;
  } catch (error) {
    console.warn("Falha na requisição de itens em lote da API.", error);
    return itemsMap;
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
    if (response.ok) {
      const data = await response.json() as UnidadesItemResponse;
      if (data.resultado && data.resultado.length > 0) {
        return data;
      }
    }
  } catch (error) {
    console.warn("Falha na consulta de unidades do item.", error);
  }

  // Sem dados reais retornados pela API: retorna vazio em vez de fabricar um registro fictício.
  return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
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
 * Normaliza e gera uma chave única canônica para o contrato
 * Evita duplicações causadas por formatos distintos (ex: "00214/2026", "002142026", "214/2026", "00394494000136-2-000214/2026")
 */
export function getCanonicalContractKey(
  numeroRaw?: string,
  anoRaw?: string | number,
  numeroControlePncp?: string
): string {
  const cleanPncp = String(numeroControlePncp || '').trim();
  if (cleanPncp) {
    const pncpMatch = cleanPncp.match(/-2-0*(\d+)\/(\d{4})/);
    if (pncpMatch) {
      return `${parseInt(pncpMatch[1], 10)}/${pncpMatch[2]}`;
    }
  }

  const cleanNum = String(numeroRaw || '').trim();
  if (!cleanNum) return '';

  const neMatch = cleanNum.match(/^(\d{4})NE(\d+)$/i);
  if (neMatch) {
    return `${neMatch[1]}NE${parseInt(neMatch[2], 10)}`;
  }

  if (cleanNum.includes('/')) {
    const parts = cleanNum.split('/');
    const n = parseInt(parts[0].replace(/\D/g, ''), 10);
    let a = parts[1].replace(/\D/g, '');
    if (a.length === 2) a = '20' + a;
    if (!isNaN(n) && a) return `${n}/${a}`;
  }

  const numDigits = cleanNum.replace(/\D/g, '');
  if (!numDigits) return cleanNum;

  const anoStr = String(anoRaw || '').replace(/\D/g, '');
  if (numDigits.length > 4) {
    const possibleYear = numDigits.slice(-4);
    if (possibleYear.startsWith('20')) {
      const n = parseInt(numDigits.slice(0, -4), 10);
      if (!isNaN(n)) return `${n}/${possibleYear}`;
    }
  }

  const parsedN = parseInt(numDigits, 10);
  if (!isNaN(parsedN)) {
    return `${parsedN}/${anoStr || '2026'}`;
  }

  return cleanNum;
}

/**
 * Formata número e ano do contrato para o padrão do Contratos.gov.br (comprasnet)
 * Ex: "00244", 2026 -> "002442026"
 * Ex: "00061/2025" -> "000612025"
 * Ex: "044/2026" -> "000442026"
 */
export function formatNumeroAnoContrato(numeroRaw: string, anoRaw?: string | number): string {
  const clean = String(numeroRaw || '').trim();
  const neMatch = clean.match(/^(\d{4})NE(\d+)$/i);
  if (neMatch) {
    const neAno = neMatch[1];
    const neNum = parseInt(neMatch[2], 10).toString().padStart(5, '0');
    return neNum + neAno;
  }
  const parts = clean.split('/');
  let numOnly = parts[0].replace(/\D/g, '');
  let anoOnly = parts[1] ? parts[1].replace(/\D/g, '') : String(anoRaw || '').replace(/\D/g, '');

  if (!numOnly) return '';
  numOnly = numOnly.padStart(5, '0');
  if (anoOnly.length === 2) {
    anoOnly = '20' + anoOnly;
  }
  return numOnly + (anoOnly || '2026');
}

/**
 * Consulta itens e dados do contrato no Contratos.gov.br (comprasnet)
 * Endpoints:
 * 1. GET /api/contrato/ugorigem/{uasg}/numeroano/{numeroAno}
 * 2. GET /api/contrato/{contratoId}/itens
 */
export async function fetchContratosGovData(
  uasg: string,
  numeroContrato: string,
  anoContrato?: string | number,
  additionalUasgs?: string[]
): Promise<{ contratoId?: number; orgaoNome?: string; items: any[] }> {
  const numeroAno = formatNumeroAnoContrato(numeroContrato, anoContrato);
  if (!uasg || !numeroAno) return { items: [] };

  const candidateUasgs = Array.from(new Set([
    uasg,
    ...(additionalUasgs || []),
    '200331',
    '200330'
  ])).filter(Boolean);

  for (const ug of candidateUasgs) {
    try {
      const listRes = await fetch(`/api-contratos-gov/api/contrato/ugorigem/${ug}/numeroano/${numeroAno}`);
      if (listRes.ok) {
        const data = await listRes.json();
        const cObj = Array.isArray(data) ? data[0] : data;
        const contratoId = cObj?.id || cObj?.contrato_id;
        const orgaoNome = cObj?.contratante?.orgao?.nome || cObj?.contratante?.orgao_origem?.nome;

        if (contratoId) {
          const itemsRes = await fetch(`/api-contratos-gov/api/contrato/${contratoId}/itens`);
          const itemsData = itemsRes.ok ? await itemsRes.json() : [];
          return {
            contratoId,
            orgaoNome,
            items: Array.isArray(itemsData) ? itemsData : []
          };
        }
      }
    } catch (e) {
      console.warn(`Falha na consulta ao Contratos.gov.br (ug=${ug}, numAno=${numeroAno})`, e);
    }
  }

  return { items: [] };
}

/**
 * Consulta empenhos do contrato no Contratos.gov.br (comprasnet)
 * Endpoint: GET /api/contrato/{contrato_id}/empenhos
 */
export async function fetchContratosGovEmpenhos(
  contratoId: string | number
): Promise<ContratosGovEmpenhoRecord[]> {
  try {
    const res = await fetch(`/api-contratos-gov/api/contrato/${contratoId}/empenhos`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn(`Falha na consulta de empenhos do contrato no Contratos.gov.br (id=${contratoId})`, e);
  }
  return [];
}

/**
 * Consulta o detalhe do empenho e seus itens na API do Contratos.gov.br
 * Endpoint: GET /api/v1/contrato/empenho/consultar/{empenho_id}
 */
export async function fetchContratoEmpenhoDetalhe(
  empenhoId: string | number
): Promise<{ itens_minuta?: any[] } | null> {
  try {
    const res = await fetch(`/api-contratos-gov/api/v1/contrato/empenho/consultar/${empenhoId}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn(`Falha na consulta de detalhe do empenho (id=${empenhoId})`, e);
  }
  return null;
}

/**
 * Consulta itens do contrato no Compras.gov.br Dados Abertos
 * Endpoint: /modulo-contratos/2.1_consultarContratosItem_Id
 */
export async function fetchContratoItensComprasGov(
  numeroControlePncp?: string
): Promise<ComprasGovContratoItemRecord[]> {
  if (!numeroControlePncp) return [];

  try {
    const url = `${BASE_URL.replace('/modulo-arp', '/modulo-contratos')}/2.1_consultarContratosItem_Id?tipo=numeroControlePncpContrato&codigo=${encodeURIComponent(numeroControlePncp)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json() as ComprasGovContratosItemResponse;
      if (data.resultado && data.resultado.length > 0) {
        return data.resultado;
      }
    }
  } catch (e) {
    console.warn(`Falha na consulta de itens de contrato Compras.gov (numeroControlePncp=${numeroControlePncp})`, e);
  }

  return [];
}

export interface FallbackPurchaseParams {
  codigoOrgao?: string | number;
  codigoUnidadeGestora?: string;
  idCompra?: string;
  numeroCompra?: string;
  anoCompra?: string | number;
  codigoModalidadeCompra?: string;
  dataVigenciaInicial?: string;
  numeroControlePncpCompra?: string;
}

export interface SupplierFilterInfo {
  niFornecedor?: string;
  nomeFornecedor?: string;
}

/**
 * Consulta de contingência para contratos vinculados à Compra/Licitação
 * utilizando as Unidades Gestoras 200331 e 200330 e desduplicação por chave canônica.
 */
export async function fetchComprasGovContratosByPurchase(
  params: FallbackPurchaseParams
): Promise<any[]> {
  const contractsMap = new Map<string, any>();
  const candidateUasgs = Array.from(new Set([
    '200331',
    '200330',
    params.codigoUnidadeGestora
  ].filter(Boolean))) as string[];

  // Anos de busca da compra e execução (incluindo o ano de vigência subsequente)
  const baseYear = parseInt(params.anoCompra ? String(params.anoCompra) : (params.dataVigenciaInicial?.split('-')[0] || '2025'), 10);
  const yearsToSearch = Array.from(new Set([
    String(baseYear),
    String(baseYear + 1),
    String(new Date().getFullYear())
  ].filter(Boolean))) as string[];

  // 1. Tentar por idCompra no modulo-contratos (1.1_consultarContratos_Id)
  if (params.idCompra) {
    try {
      const url = `${BASE_URL.replace('/modulo-arp', '/modulo-contratos')}/1.1_consultarContratos_Id?tipo=idCompra&codigo=${encodeURIComponent(params.idCompra)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.resultado && data.resultado.length > 0) {
          data.resultado.forEach((c: any) => {
            const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncpContrato);
            if (canKey) contractsMap.set(canKey, c);
          });
        }
      }
    } catch (e) {
      console.warn('Falha na busca de contratos por idCompra no modulo-contratos', e);
    }
  }

  // 1.1 Tentar por numeroControlePncpCompra no modulo-contratos
  if (params.numeroControlePncpCompra) {
    try {
      const url = `${BASE_URL.replace('/modulo-arp', '/modulo-contratos')}/1.1_consultarContratos_Id?tipo=numeroControlePncpCompra&codigo=${encodeURIComponent(params.numeroControlePncpCompra)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.resultado && data.resultado.length > 0) {
          data.resultado.forEach((c: any) => {
            const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncpContrato);
            if (canKey && !contractsMap.has(canKey)) contractsMap.set(canKey, c);
          });
        }
      }
    } catch (e) {
      console.warn('Falha na busca de contratos por numeroControlePncpCompra no modulo-contratos', e);
    }
  }

  // 2. Buscar em 1_consultarContratos para as UGs gerenciadoras nos anos relevantes
  for (const uasg of candidateUasgs) {
    const orgao = params.codigoOrgao || (uasg === '200331' || uasg === '200330' ? '30911' : '');
    for (const yr of yearsToSearch) {
      try {
        const url = `${BASE_URL.replace('/modulo-arp', '/modulo-contratos')}/1_consultarContratos?pagina=1&tamanhoPagina=500&codigoOrgao=${orgao}&codigoUnidadeGestora=${uasg}&dataVigenciaInicialMin=${yr}-01-01&dataVigenciaInicialMax=${yr}-12-31`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = data.resultado || [];
          list.forEach((c: any) => {
            let matched = false;

            // Critério 1: idCompra idêntico
            if (!matched && params.idCompra && c.idCompra && c.idCompra === params.idCompra) {
              const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncpContrato);
              if (canKey) { contractsMap.set(canKey, c); matched = true; }
            }

            // Critério 2: numeroControlePncpCompra idêntico
            if (!matched && params.numeroControlePncpCompra && c.numeroControlePncpCompra && c.numeroControlePncpCompra === params.numeroControlePncpCompra) {
              const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncpContrato);
              if (canKey) { contractsMap.set(canKey, c); matched = true; }
            }

            // Critério 3: numeroCompra + anoCompra + modalidade
            if (!matched && params.numeroCompra && c.numeroCompra) {
              const cleanParamsNum = params.numeroCompra.replace(/\D/g, '').replace(/^0+/, '');
              const cleanCNum = String(c.numeroCompra).split('/')[0].replace(/\D/g, '').replace(/^0+/, '');
              
              const cAnoRaw = c.anoCompra || (String(c.numeroCompra).includes('/') ? String(c.numeroCompra).split('/').pop() : '') || (c.dataVigenciaInicial ? c.dataVigenciaInicial.split('-')[0] : '');
              const cAno = String(cAnoRaw).trim();
              const paramsAnoRaw = params.anoCompra || (String(params.numeroCompra).includes('/') ? String(params.numeroCompra).split('/').pop() : '');
              const paramsAno = String(paramsAnoRaw || '').trim();

              const sameNum = cleanParamsNum && cleanCNum && cleanParamsNum === cleanCNum;
              const sameAno = !paramsAno || !cAno || paramsAno === cAno;
              const sameMod = !params.codigoModalidadeCompra || !c.codigoModalidadeCompra || String(params.codigoModalidadeCompra) === String(c.codigoModalidadeCompra);

              if (sameNum && sameAno && sameMod) {
                const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncpContrato);
                if (canKey) contractsMap.set(canKey, c);
              }
            }
          });
        }
      } catch (e) {
        console.warn(`Falha na busca de contratos em lote no modulo-contratos para a UG ${uasg} e ano ${yr}`, e);
      }
    }
  }

  return Array.from(contractsMap.values());
}

/**
 * 5. Consultar Contratos da Contratação no PNCP e Compras.gov
 * Utiliza o número da Contratação/Compra + UASGs Gerenciadoras (200331 e 200330)
 * e aplica filtro estrito por fornecedor e item da Ata.
 */
export async function fetchPncpContracts(
  cnpj: string,
  ano: string,
  sequencial: string,
  sequencialAta: string,
  numeroItemDesejado?: string,
  fallbackParams?: FallbackPurchaseParams,
  fornecedorInfo?: SupplierFilterInfo
): Promise<PncpContract[]> {
  const contractsMergedMap = new Map<string, any>();
  const effectiveCnpj = cnpj || '00394494000136';

  // 1. Consulta contratos diretos da Contratação/Compra no PNCP
  try {
    const purchaseContractsUrl = `/api-pncp/api/pncp/v1/orgaos/${effectiveCnpj}/compras/${ano}/${sequencial}/contratos`;
    const res = await fetch(purchaseContractsUrl);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      list.forEach((c: any) => {
        const canKey = getCanonicalContractKey(c.numeroContrato || c.numeroContratoEmpenho || c.numero, c.anoContrato || ano, c.numeroControlePNCP || c.numeroControlePncpContrato);
        if (canKey) contractsMergedMap.set(canKey, { ...c, _fromPncp: true });
      });
    }
  } catch (e) {
    console.warn("Falha na consulta de contratos da contratação no PNCP", e);
  }

  // 2. Consulta contratos associados à Ata no PNCP (se sequencialAta disponível)
  if (sequencialAta) {
    try {
      const ataContractsUrl = `/api-pncp/api/pncp/v1/orgaos/${effectiveCnpj}/compras/${ano}/${sequencial}/atas/${sequencialAta}/contratos`;
      const res = await fetch(ataContractsUrl);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        list.forEach((c: any) => {
          const canKey = getCanonicalContractKey(c.numeroContrato || c.numeroContratoEmpenho || c.numero, c.anoContrato || ano, c.numeroControlePNCP || c.numeroControlePncpContrato);
          if (canKey) {
            const existing = contractsMergedMap.get(canKey);
            contractsMergedMap.set(canKey, { ...(existing || {}), ...c, _fromPncp: true });
          }
        });
      }
    } catch (e) {
      console.warn("Falha na consulta de contratos da ata no PNCP", e);
    }
  }

  // 3. Sempre complementar/unificar com contratos vinculados à compra no Compras.gov.br (Módulo Contratos - UASGs 200331 e 200330)
  if (fallbackParams) {
    try {
      const purchaseContracts = await fetchComprasGovContratosByPurchase(fallbackParams);
      purchaseContracts.forEach((c: any) => {
        const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncpContrato);
        if (canKey) {
          const existing = contractsMergedMap.get(canKey);
          contractsMergedMap.set(canKey, { ...(existing || {}), ...c, _fromPncp: existing ? existing._fromPncp : false });
        }
      });
    } catch (e) {
      console.warn('Falha ao complementar contratos com dados da compra Compras.gov', e);
    }
  }

  const mergedList = Array.from(contractsMergedMap.values());
  if (mergedList.length === 0) {
    return [];
  }

  // Extração de CNPJ limpo do fornecedor alvo para validação estrita
  const targetSupplierCnpjDigits = (fornecedorInfo?.niFornecedor || '').replace(/\D/g, '');
  const targetSupplierName = (fornecedorInfo?.nomeFornecedor || '').toUpperCase().trim();

  const mapped = await Promise.all(mergedList.map(async (c: any): Promise<PncpContract | null> => {
    const isFromPncp = c._fromPncp === true;
    const contractCnpj = isFromPncp ? (c.orgaoEntidade?.cnpj || effectiveCnpj) : (c.niFornecedor || effectiveCnpj);
    const anoContrato = c.anoContrato || (c.dataVigenciaInicial ? new Date(c.dataVigenciaInicial).getFullYear() : Number(ano));
    const sequencialContrato = c.sequencialContrato || (c.numeroControlePncpContrato ? parseInt(c.numeroControlePncpContrato.split('-').pop() || '', 10) || undefined : undefined);

    let detail: any = null;
    if (sequencialContrato && isFromPncp) {
      try {
        const detailUrl = `/api-pncp/api/pncp/v1/orgaos/${contractCnpj}/contratos/${anoContrato}/${sequencialContrato}`;
        const detailResponse = await fetch(detailUrl);
        if (detailResponse.ok) {
          detail = await detailResponse.json();
        }
      } catch (detailError) {
        console.warn("Falha na consulta de detalhe do contrato PNCP.", detailError);
      }
    }

    // 4. Validação estrita de Fornecedor: eliminar contratos de outras empresas da mesma licitação
    const contractSupplierCnpj = (detail?.niFornecedor || c.niFornecedor || '').replace(/\D/g, '');
    const contractSupplierName = (detail?.nomeRazaoSocialFornecedor || c.nomeRazaoSocialFornecedor || '').toUpperCase().trim();

    if (targetSupplierCnpjDigits && contractSupplierCnpj) {
      if (contractSupplierCnpj !== targetSupplierCnpjDigits) {
        return null; // Fornecedor diferente (ex: General Motors x Renault)
      }
    } else if (targetSupplierName && contractSupplierName) {
      // Se não temos CNPJ em ambos, valida por coincidência de palavras-chave
      const targetKeywords = targetSupplierName.split(/\s+/).filter(w => w.length > 3);
      const isNameMatch = targetKeywords.some(kw => contractSupplierName.includes(kw));
      if (!isNameMatch) {
        return null;
      }
    }

    const numeroControlePncp = detail?.numeroControlePNCP || detail?.numeroControlePncp || c.numeroControlePNCP || c.numeroControle || c.numeroControlePncpContrato;
    const rawLinkVisualizacao = detail?.linkVisualizacao || detail?.linkContrato || c.linkVisualizacao || c.linkContrato || c.linkContratoPNCP || c.urlContrato;
    const linkVisualizacao = formatPncpContractUrl(numeroControlePncp, rawLinkVisualizacao);

    // Identificação precisa da UASG e classificação (200331 e 200330 são Gerenciadoras)
    const rawUasg = c.codigoUnidadeGestora || c.codigoUnidadeGestoraOrigemContrato || detail?.unidadeOrgao?.codigoUnidade || c.unidadeExecutora?.codigoUnidade || c.unidadeOrgao?.codigoUnidade || c.unidadeGestora || (c.unidadeNome?.match(/(\d{5,6})/)?.[1]) || fallbackParams?.codigoUnidadeGestora || '200331';
    const resolvedUasg = String(rawUasg).trim();
    const isGerenciadora = resolvedUasg === '200331' || resolvedUasg === '200330';
    const tipoUnidade: 'GERENCIADORA' | 'PARTICIPANTE' = isGerenciadora ? 'GERENCIADORA' : 'PARTICIPANTE';

    const numContrato = c.numeroContrato || c.numeroContratoEmpenho || c.numero || detail?.numeroContratoEmpenho || '';

    // Consulta a quantidade do item contratado
    let quantidadeContratada: number | null = null;
    let valorUnitarioItem: number | null = null;
    let valorTotalItem: number | null = null;
    let numeroItemContratado: string | undefined = undefined;
    let pertenceAoItem: boolean | undefined = undefined;

    // 1. Consulta em tempo real no Contratos.gov.br (/api/contrato/ugorigem/... e /itens)
    let contratoId: number | undefined = undefined;
    let orgaoNomeGov: string | undefined = undefined;

    if (numContrato && resolvedUasg) {
      const govData = await fetchContratosGovData(resolvedUasg, numContrato, anoContrato, ['200331', '200330', resolvedUasg]);
      contratoId = govData.contratoId;
      orgaoNomeGov = govData.orgaoNome;

      if (govData.items && govData.items.length > 0) {
        if (numeroItemDesejado) {
          const targetNum = parseInt(numeroItemDesejado, 10);
          const matched = govData.items.find(i => parseInt(i.numero_item_compra || '', 10) === targetNum);
          if (matched) {
            pertenceAoItem = true;
            const rawQtd = parseInt(matched.quantidade, 10);
            if (!isNaN(rawQtd)) {
              quantidadeContratada = rawQtd;
            }
            if (matched.valorunitario) {
              const rawVal = parseFloat(String(matched.valorunitario).replace(/\./g, '').replace(',', '.'));
              if (!isNaN(rawVal)) valorUnitarioItem = rawVal;
            }
            if (matched.valortotal) {
              const rawTot = parseFloat(String(matched.valortotal).replace(/\./g, '').replace(',', '.'));
              if (!isNaN(rawTot)) valorTotalItem = rawTot;
            }
            numeroItemContratado = matched.numero_item_compra;
          } else {
            pertenceAoItem = false;
          }
        } else {
          const itemObj = govData.items[0];
          if (itemObj) {
            const rawQtd = parseInt(itemObj.quantidade, 10);
            if (!isNaN(rawQtd)) {
              quantidadeContratada = rawQtd;
            }
            if (itemObj.valorunitario) {
              const rawVal = parseFloat(String(itemObj.valorunitario).replace(/\./g, '').replace(',', '.'));
              if (!isNaN(rawVal)) valorUnitarioItem = rawVal;
            }
            if (itemObj.valortotal) {
              const rawTot = parseFloat(String(itemObj.valortotal).replace(/\./g, '').replace(',', '.'));
              if (!isNaN(rawTot)) valorTotalItem = rawTot;
            }
            numeroItemContratado = itemObj.numero_item_compra;
          }
        }
      }
    }

    // 2. Fallback: Compras.gov.br Dados Abertos (/modulo-contratos/2.1_consultarContratosItem_Id)
    if (quantidadeContratada == null && pertenceAoItem !== false && numeroControlePncp) {
      const itemsComprasGov = await fetchContratoItensComprasGov(numeroControlePncp);
      if (itemsComprasGov.length > 0) {
        if (numeroItemDesejado) {
          const numDesejado = parseInt(numeroItemDesejado, 10);
          const matchedItem = itemsComprasGov.find(i => {
            const numI = parseInt(i.numeroItem || '', 10) || i.codigoItem;
            return numI === numDesejado;
          });
          if (matchedItem) {
            pertenceAoItem = true;
            if (matchedItem.quantidadeItem !== undefined && matchedItem.quantidadeItem !== null) {
              quantidadeContratada = matchedItem.quantidadeItem;
              valorUnitarioItem = matchedItem.valorUnitarioItem ?? null;
              valorTotalItem = matchedItem.valorTotalItem ?? null;
              numeroItemContratado = matchedItem.numeroItem;
            }
          } else {
            pertenceAoItem = false;
          }
        } else {
          const target = itemsComprasGov[0];
          if (target && target.quantidadeItem !== undefined && target.quantidadeItem !== null) {
            quantidadeContratada = target.quantidadeItem;
            valorUnitarioItem = target.valorUnitarioItem ?? null;
            valorTotalItem = target.valorTotalItem ?? null;
            numeroItemContratado = target.numeroItem;
          }
        }
      }
    }

    // Se confirmou pertencer a outro item do mesmo fornecedor, descarta
    if (numeroItemDesejado && pertenceAoItem === false) {
      return null;
    }

    const orgaoNome = isGerenciadora ? 'SECRETARIA NACIONAL DE SEGURANCA PUBLICA' : (orgaoNomeGov || c.nomeOrgao || detail?.orgaoEntidade?.razaoSocial || c.orgaoEntidade?.razaoSocial || detail?.unidadeOrgao?.nomeUnidade || c.unidadeExecutora?.nomeUnidade);
    const unidadeNome = c.nomeUnidadeGestora || detail?.unidadeOrgao?.nomeUnidade || c.unidadeExecutora?.nomeUnidade;

    return {
      numeroContrato: c.numeroContrato || c.numeroContratoEmpenho || c.numero || '',
      cnpj: contractCnpj,
      anoContrato,
      sequencialContrato,
      contratoId,
      orgaoNome,
      unidadeNome,
      uasg: resolvedUasg,
      tipoUnidade,
      objeto: c.objeto || detail?.objetoContrato || c.objetoContrato,
      valorInicial: c.valorGlobal ?? detail?.valorInicial ?? detail?.valorGlobal,
      nomeRazaoSocialFornecedor: detail?.nomeRazaoSocialFornecedor || c.nomeRazaoSocialFornecedor || fornecedorInfo?.nomeFornecedor,
      niFornecedor: detail?.niFornecedor || c.niFornecedor || fornecedorInfo?.niFornecedor,
      dataAssinatura: c.dataAssinatura || detail?.dataAssinatura,
      dataVigenciaInicial: c.dataVigenciaInicial || detail?.dataVigenciaInicio || c.dataVigenciaInicio,
      dataVigenciaFinal: c.dataVigenciaFinal || detail?.dataVigenciaFim || c.dataVigenciaFim,
      numeroControlePncp,
      quantidadeContratada,
      valorUnitarioItem,
      valorTotalItem,
      numeroItemContratado,
      linkVisualizacao: linkVisualizacao || undefined
    };
  }));

  return mapped.filter((c): c is PncpContract => c !== null);
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

/**
 * 7. Consultar Adesões do Item (Caronas Externas)
 * Endereço: /modulo-arp/5_consultarAdesoesItem
 */
export async function fetchAdesoesItem(
  numeroAta: string,
  unidadeGerenciadora: string,
  numeroItem: string
): Promise<AdesoesItemResponse> {
  const formattedItem = (numeroItem || '').toString().padStart(5, '0');
  
  try {
    let currentPage = 1;
    let hasMorePages = true;
    const allRecords: AdesaoItemRecord[] = [];

    while (hasMorePages) {
      const queryParams = {
        pagina: currentPage,
        tamanhoPagina: 500,
        numeroAta,
        unidadeGerenciadora,
        numeroItem: formattedItem
      };

      const url = `${BASE_URL}/5_consultarAdesoesItem${buildQueryString(queryParams)}`;
      const response = await fetch(url);
      if (!response.ok) {
        // Se a API retornar erro ou 404, tenta também com numeroItem sem formatação
        if (formattedItem !== numeroItem) {
          const fallbackParams = {
            pagina: currentPage,
            tamanhoPagina: 500,
            numeroAta,
            unidadeGerenciadora,
            numeroItem
          };
          const fbResponse = await fetch(`${BASE_URL}/5_consultarAdesoesItem${buildQueryString(fallbackParams)}`);
          if (fbResponse.ok) {
            const fbData = await fbResponse.json() as AdesoesItemResponse;
            if (fbData.resultado && fbData.resultado.length > 0) {
              allRecords.push(...fbData.resultado);
            }
          }
        }
        break;
      }

      const data = await response.json() as AdesoesItemResponse;
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
    console.warn("Falha na consulta de adesões do item (caronas).", error);
    return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
  }
}

