import type { Empenho, ReconciliationReport } from '../types';

/**
 * Normaliza o número do empenho para comparação canônica.
 * Ex: "2026NE000142" -> "2026NE142", "00142" -> "142", "2026NE000700" -> "2026NE700"
 */
export function normalizeEmpenhoNumero(numero?: string): string {
  if (!numero) return '';
  const trimmed = numero.trim().toUpperCase();
  const neMatch = trimmed.match(/^(\d{4})NE0*(\d+)$/);
  if (neMatch) {
    return `${neMatch[1]}NE${neMatch[2]}`;
  }
  const digitsOnly = trimmed.match(/^0*(\d+)$/);
  if (digitsOnly) {
    return digitsOnly[1];
  }
  return trimmed;
}

/**
 * Gera uma chave única determinística para o empenho.
 */
export function getEmpenhoCanonicalKey(empenho: Partial<Empenho>): string {
  const normNum = normalizeEmpenhoNumero(empenho.numero);
  const ano = empenho.ano || '';
  const uasg = (empenho.uasg || '').trim();
  const itemId = (empenho.itemId || '').trim();
  return `${normNum}-${ano}-${uasg}-${itemId}`;
}

/**
 * 1. Calcula o total empenhado absoluto a partir de uma lista de empenhos.
 * Invariante: TotalEmpenhado = ∑ Empenho.quantidade
 */
export function calculateTotalEmpenhado(empenhos: Empenho[]): number {
  if (!empenhos || empenhos.length === 0) return 0;
  return empenhos.reduce((acc, curr) => acc + (Number(curr.quantidade) || 0), 0);
}

/**
 * 2. Discrimina os totais empenhados por tipo de origem (Oficial API vs Manual).
 */
export function calculateTotalEmpenhadoPorOrigem(empenhos: Empenho[]): {
  api: number;
  manual: number;
  sincronizado: number;
  total: number;
} {
  let api = 0;
  let manual = 0;
  let sincronizado = 0;

  (empenhos || []).forEach(emp => {
    const qtd = Number(emp.quantidade) || 0;
    if (emp.origem === 'MANUAL') {
      manual += qtd;
    } else if (emp.origem === 'SINCRONIZADO') {
      sincronizado += qtd;
    } else {
      api += qtd;
    }
  });

  return {
    api,
    manual,
    sincronizado,
    total: api + manual + sincronizado
  };
}

/**
 * 3. Fórmula Oficial do Saldo Remanescente da Ata / Item:
 * Saldo = QuantidadeRegistrada - ∑ Empenhos
 * 
 * Regra:
 * NUNCA subtrair Contratos.
 * NUNCA subtrair Alocações Internas.
 */
export function calculateSaldo(quantidadeRegistrada: number, empenhos: Empenho[]): number {
  const qtdRegistrada = Number(quantidadeRegistrada) || 0;
  const totalEmpenhado = calculateTotalEmpenhado(empenhos);
  return qtdRegistrada - totalEmpenhado;
}

/**
 * 4. Calcula o balanço de uma Unidade Gestora específica.
 */
export function calculateSaldoPorUnidade(
  quantidadeRegistradaUnidade: number,
  empenhosUnidade: Empenho[]
): {
  totalRegistrado: number;
  totalEmpenhado: number;
  saldo: number;
  percentualConsumido: number;
} {
  const totalRegistrado = Number(quantidadeRegistradaUnidade) || 0;
  const totalEmpenhado = calculateTotalEmpenhado(empenhosUnidade);
  const saldo = totalRegistrado - totalEmpenhado;
  const percentualConsumido = totalRegistrado > 0 ? (totalEmpenhado / totalRegistrado) * 100 : 0;

  return {
    totalRegistrado,
    totalEmpenhado,
    saldo,
    percentualConsumido
  };
}

/**
 * 5. Calcula o saldo departamental de uma Alocação Interna:
 * SaldoAlocacao = CotaAlocada - ∑ EmpenhosVinculadosAoDepartamento
 */
export function calculateSaldoAlocado(
  cotaAlocada: number,
  empenhosDoDepartamento: Empenho[]
): {
  cotaAlocada: number;
  totalEmpenhado: number;
  saldoDisponivel: number;
  percentualConsumido: number;
} {
  const cota = Number(cotaAlocada) || 0;
  const totalEmpenhado = calculateTotalEmpenhado(empenhosDoDepartamento);
  const saldoDisponivel = cota - totalEmpenhado;
  const percentualConsumido = cota > 0 ? (totalEmpenhado / cota) * 100 : 0;

  return {
    cotaAlocada: cota,
    totalEmpenhado,
    saldoDisponivel,
    percentualConsumido
  };
}

/**
 * 6. Relatório de Reconciliação Contábil e Auditoria do Item:
 * Compara Fonte 1 (API SIASG) com Fonte 2 (Soma dos Empenhos Conhecidos).
 * NÃO altera nem sobrescreve nenhuma das fontes automaticamente.
 */
export function reconcileBalances(
  quantidadeRegistrada: number,
  empenhos: Empenho[],
  saldoInformadoApi?: number | null
): ReconciliationReport {
  const qtdRegistrada = Number(quantidadeRegistrada) || 0;
  const breakdown = calculateTotalEmpenhadoPorOrigem(empenhos);
  const totalEmpenhado = breakdown.total;
  const saldoCalculado = qtdRegistrada - totalEmpenhado;

  if (saldoInformadoApi === undefined || saldoInformadoApi === null || isNaN(saldoInformadoApi)) {
    return {
      quantidadeRegistrada: qtdRegistrada,
      totalEmpenhadoApi: breakdown.api + breakdown.sincronizado,
      totalEmpenhadoManual: breakdown.manual,
      totalEmpenhado,
      saldoCalculado,
      saldoApi: undefined,
      divergencia: 0,
      status: 'NAO_INFORMADO',
      mensagem: 'Saldo apurado a partir dos empenhos conhecidos (sem retorno do saldo da API).'
    };
  }

  const saldoApiNum = Number(saldoInformadoApi);
  const divergencia = saldoApiNum - saldoCalculado;

  if (divergencia === 0) {
    return {
      quantidadeRegistrada: qtdRegistrada,
      totalEmpenhadoApi: breakdown.api + breakdown.sincronizado,
      totalEmpenhadoManual: breakdown.manual,
      totalEmpenhado,
      saldoCalculado,
      saldoApi: saldoApiNum,
      divergencia: 0,
      status: 'CONSISTENTE',
      mensagem: 'Saldos consistentes. A soma dos empenhos confere com o saldo informado pela API.'
    };
  }

  return {
    quantidadeRegistrada: qtdRegistrada,
    totalEmpenhadoApi: breakdown.api + breakdown.sincronizado,
    totalEmpenhadoManual: breakdown.manual,
    totalEmpenhado,
    saldoCalculado,
    saldoApi: saldoApiNum,
    divergencia,
    status: 'DIVERGENTE',
    mensagem: divergencia > 0
      ? `Divergência: O SIASG/API informa ${divergencia} un a mais que a soma dos empenhos conhecidos.`
      : `Divergência: A soma dos empenhos excede o saldo do SIASG/API em ${Math.abs(divergencia)} un.`
  };
}

/**
 * 7. Algoritmo Inteligente de Sincronização e Fusão (Smart Reconciliation / Upsert):
 * Conecta empenhos vindos da API oficial com empenhos manuais cadastrados pelo usuário.
 * 
 * Regras:
 * - Se um empenho manual for localizado na API (mesmo número, ano, uasg, item):
 *   1. Promove a origem para 'SINCRONIZADO'
 *   2. Mantém os metadados de alocação departamental preenchidos pelo usuário
 *   3. Não cria registro duplicado (evita dupla contagem)
 *   4. Valida se a quantidade oficial confere com a digitada manualmente
 */
export function matchAndMergeEmpenhos(
  apiEmpenhos: Empenho[],
  manualEmpenhos: Empenho[]
): Empenho[] {
  const mergedMap = new Map<string, Empenho>();

  // 1. Indexa empenhos oficiais da API
  (apiEmpenhos || []).forEach(emp => {
    const key = getEmpenhoCanonicalKey(emp);
    mergedMap.set(key, { ...emp, origem: 'API' });
  });

  // 2. Processa empenhos manuais
  (manualEmpenhos || []).forEach(manual => {
    const key = getEmpenhoCanonicalKey(manual);
    const existingApi = mergedMap.get(key);

    if (existingApi) {
      // Correspondência encontrada! Promove para SINCRONIZADO e preserva alocação interna
      const isQtdMatch = Number(existingApi.quantidade) === Number(manual.quantidade);
      mergedMap.set(key, {
        ...existingApi,
        unidadeInternaId: manual.unidadeInternaId || existingApi.unidadeInternaId,
        observacao: manual.observacao || existingApi.observacao,
        origem: 'SINCRONIZADO',
        status: isQtdMatch ? 'CONFIRMADO' : 'DIVERGENTE',
        atualizadoEm: new Date().toISOString()
      });
    } else {
      // Registro exclusivamente manual (não localizado na API)
      mergedMap.set(key, {
        ...manual,
        origem: 'MANUAL'
      });
    }
  });

  return Array.from(mergedMap.values());
}
