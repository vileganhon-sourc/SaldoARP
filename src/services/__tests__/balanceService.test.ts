import { describe, it, expect } from 'vitest';
import {
  calculateTotalEmpenhado,
  calculateSaldo,
  calculateSaldoPorUnidade,
  calculateSaldoAlocado,
  reconcileBalances,
  matchAndMergeEmpenhos,
  normalizeEmpenhoNumero
} from '../balanceService';
import type { Empenho } from '../../types';

describe('balanceService - Motor Oficial de Saldos e Reconciliação', () => {
  const mockEmpenhos: Empenho[] = [
    {
      id: 'emp-1',
      numero: '2026NE000001',
      ano: 2026,
      arpId: '00017/2026',
      itemId: '00003',
      uasg: '200331',
      quantidade: 27,
      origem: 'API',
      status: 'CONFIRMADO',
      criadoEm: '2026-01-10T10:00:00Z',
      atualizadoEm: '2026-01-10T10:00:00Z'
    },
    {
      id: 'emp-2',
      numero: '2026NE000002',
      ano: 2026,
      arpId: '00017/2026',
      itemId: '00003',
      uasg: '200331',
      quantidade: 15,
      origem: 'API',
      status: 'CONFIRMADO',
      criadoEm: '2026-01-12T10:00:00Z',
      atualizadoEm: '2026-01-12T10:00:00Z'
    },
    {
      id: 'emp-3',
      numero: '2026NE000003',
      ano: 2026,
      arpId: '00017/2026',
      itemId: '00003',
      uasg: '200331',
      quantidade: 20,
      origem: 'MANUAL',
      status: 'CONFIRMADO',
      criadoEm: '2026-01-15T10:00:00Z',
      atualizadoEm: '2026-01-15T10:00:00Z'
    }
  ];

  it('Normalização correta de números de empenho', () => {
    expect(normalizeEmpenhoNumero('2026NE000142')).toBe('2026NE142');
    expect(normalizeEmpenhoNumero('000142')).toBe('142');
    expect(normalizeEmpenhoNumero('2026NE700')).toBe('2026NE700');
  });

  it('Fórmula oficial do saldo: Saldo = QuantidadeRegistrada - ∑ Empenhos', () => {
    const qtdRegistrada = 255;
    const totalEmpenhado = calculateTotalEmpenhado(mockEmpenhos);
    const saldo = calculateSaldo(qtdRegistrada, mockEmpenhos);

    expect(totalEmpenhado).toBe(62); // 27 + 15 + 20
    expect(saldo).toBe(193); // 255 - 62
  });

  it('Balanço por Unidade Gestora', () => {
    const balance = calculateSaldoPorUnidade(100, mockEmpenhos.slice(0, 2)); // 27 + 15 = 42
    expect(balance.totalRegistrado).toBe(100);
    expect(balance.totalEmpenhado).toBe(42);
    expect(balance.saldo).toBe(58);
    expect(balance.percentualConsumido).toBe(42);
  });

  it('Balanço de Alocação Interna Departamental', () => {
    const cota = 50;
    const balance = calculateSaldoAlocado(cota, [mockEmpenhos[0]]); // 27
    expect(balance.cotaAlocada).toBe(50);
    expect(balance.totalEmpenhado).toBe(27);
    expect(balance.saldoDisponivel).toBe(23);
    expect(balance.percentualConsumido).toBe(54);
  });

  it('Reconciliação: Caso CONSISTENTE', () => {
    const report = reconcileBalances(255, mockEmpenhos, 193);
    expect(report.status).toBe('CONSISTENTE');
    expect(report.divergencia).toBe(0);
    expect(report.saldoCalculado).toBe(193);
    expect(report.saldoApi).toBe(193);
  });

  it('Reconciliação: Caso DIVERGENTE', () => {
    const report = reconcileBalances(255, mockEmpenhos, 200);
    expect(report.status).toBe('DIVERGENTE');
    expect(report.divergencia).toBe(7); // API informa 7 a mais
    expect(report.saldoCalculado).toBe(193);
    expect(report.saldoApi).toBe(200);
  });

  it('Sincronização Inteligente: Promoção de MANUAL para SINCRONIZADO sem duplicar', () => {
    const manualList: Empenho[] = [
      {
        id: 'manual-1',
        numero: '2026NE000700',
        ano: 2026,
        arpId: '00017/2026',
        itemId: '00003',
        uasg: '200331',
        quantidade: 20,
        unidadeInternaId: 'dep-cgop',
        origem: 'MANUAL',
        status: 'CONFIRMADO',
        criadoEm: '2026-01-01T00:00:00Z',
        atualizadoEm: '2026-01-01T00:00:00Z'
      }
    ];

    const apiList: Empenho[] = [
      {
        id: 'api-1',
        numero: '2026NE000700',
        ano: 2026,
        arpId: '00017/2026',
        itemId: '00003',
        uasg: '200331',
        quantidade: 20,
        origem: 'API',
        status: 'CONFIRMADO',
        criadoEm: '2026-01-05T00:00:00Z',
        atualizadoEm: '2026-01-05T00:00:00Z'
      }
    ];

    const merged = matchAndMergeEmpenhos(apiList, manualList);
    expect(merged.length).toBe(1); // Não duplicou!
    expect(merged[0].origem).toBe('SINCRONIZADO');
    expect(merged[0].unidadeInternaId).toBe('dep-cgop'); // Preservou alocação
    expect(merged[0].status).toBe('CONFIRMADO');
  });
});
