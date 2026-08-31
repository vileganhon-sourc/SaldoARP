import { describe, it, expect } from 'vitest';
import {
  calculateTotalEmpenhado,
  calculateTotalEmpenhadoPorOrigem,
  calculateSaldo,
  calculateSaldoWithContratos,
  validateContrato,
  calculateSaldoPorUnidade,
  calculateSaldoAlocado,
  reconcileBalances,
  matchAndMergeEmpenhos,
  normalizeEmpenhoNumero,
  getEmpenhoCanonicalKey
} from '../balanceService';
import type { Empenho, Contrato, ContratoEmpenho } from '../../types';

describe('balanceService - Suíte de 20 Testes Obrigatórios e Invariantes Contábeis', () => {

  // Teste 1: 255 registrados + nenhum empenho = saldo 255
  it('1. Deve calcular saldo 255 quando quantidade registrada = 255 e nenhum empenho cadastrado', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [];
    const saldo = calculateSaldo(qtdRegistrada, empenhos);
    const total = calculateTotalEmpenhado(empenhos);

    expect(total).toBe(0);
    expect(saldo).toBe(255);
    // Invariante: QtdRegistrada = TotalEmpenhado + Saldo
    expect(qtdRegistrada).toBe(total + saldo);
  });

  // Teste 2: 255 registrados + empenho de 27 = saldo 228
  it('2. Deve calcular saldo 228 quando quantidade registrada = 255 e existe 1 empenho de 27', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      {
        id: 'emp-1',
        numero: '2026NE000100',
        ano: 2026,
        arpId: '00003/2026',
        itemId: '1',
        uasg: '200331',
        quantidade: 27,
        origem: 'API',
        status: 'CONFIRMADO',
        criadoEm: '2026-01-01',
        atualizadoEm: '2026-01-01'
      }
    ];
    const total = calculateTotalEmpenhado(empenhos);
    const saldo = calculateSaldo(qtdRegistrada, empenhos);

    expect(total).toBe(27);
    expect(saldo).toBe(228);
    expect(qtdRegistrada).toBe(total + saldo);
  });

  // Teste 3: 255 registrados + empenhos 27, 15 e 20 = saldo 193
  it('3. Deve calcular saldo 193 quando quantidade registrada = 255 e existem empenhos de 27, 15 e 20', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      { id: '1', numero: 'NE001', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 27, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' },
      { id: '2', numero: 'NE002', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 15, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' },
      { id: '3', numero: 'NE003', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 20, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];
    const total = calculateTotalEmpenhado(empenhos);
    const saldo = calculateSaldo(qtdRegistrada, empenhos);

    expect(total).toBe(62);
    expect(saldo).toBe(193);
    expect(qtdRegistrada).toBe(total + saldo);
  });

  // Teste 4: Empenho sem contrato = válido
  it('4. Deve validar que um Empenho pode existir autonomamente sem Contrato', () => {
    const empenhoSemContrato: Empenho = {
      id: 'emp-direto',
      numero: '2026NE000999',
      ano: 2026,
      arpId: '00001/2026',
      itemId: '1',
      uasg: '200331',
      quantidade: 50,
      origem: 'API',
      status: 'CONFIRMADO',
      criadoEm: '2026-01-10',
      atualizadoEm: '2026-01-10'
    };

    // Empenho direto entra no cômputo do saldo normalmente
    const saldo = calculateSaldo(100, [empenhoSemContrato]);
    expect(saldo).toBe(50);
    expect(empenhoSemContrato.id).toBeDefined();
  });

  // Teste 5: Contrato com um empenho = válido
  it('5. Deve validar que um Contrato vinculado a 1 Nota de Empenho é válido', () => {
    const contrato: Partial<Contrato> = {
      id: 'ct-1',
      numero: '10/2026',
      ano: 2026,
      arpId: '00001/2026',
      uasg: '200331',
      origem: 'MANUAL'
    };
    const empenhoIds = ['emp-1'];
    const validacao = validateContrato(contrato, empenhoIds);

    expect(validacao.valid).toBe(true);
    expect(validacao.error).toBeUndefined();
  });

  // Teste 6: Contrato com vários empenhos = válido
  it('6. Deve validar que um Contrato vinculado a múltiplos Empenhos é válido', () => {
    const contrato: Partial<Contrato> = {
      id: 'ct-multi',
      numero: '20/2026',
      ano: 2026,
      arpId: '00001/2026',
      uasg: '200331',
      origem: 'MANUAL'
    };
    const empenhoIds = ['emp-1', 'emp-2', 'emp-3'];
    const validacao = validateContrato(contrato, empenhoIds);

    expect(validacao.valid).toBe(true);
    expect(validacao.error).toBeUndefined();
  });

  // Teste 7: Contrato sem empenho = inválido
  it('7. Deve rejeitar formalmente um Contrato que não possua Notas de Empenho vinculadas (Contrato sem Empenho = inválido)', () => {
    const contratoSemEmpenho: Partial<Contrato> = {
      id: 'ct-invalido',
      numero: '30/2026',
      ano: 2026,
      arpId: '00001/2026',
      uasg: '200331',
      origem: 'MANUAL'
    };
    const validacao = validateContrato(contratoSemEmpenho, []);

    expect(validacao.valid).toBe(false);
    expect(validacao.error).toContain('todo contrato deve possuir pelo menos uma Nota de Empenho');
  });

  // Teste 8: Inclusão de contrato não altera saldo
  it('8. Deve assegurar que cadastrar ou incluir um Contrato NÃO altera o saldo da Ata', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      { id: '1', numero: 'NE001', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 27, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    // Saldo antes do contrato
    const saldoAntes = calculateSaldo(qtdRegistrada, empenhos);
    expect(saldoAntes).toBe(228);

    // Contrato adicionado formalmente
    const contratos: Contrato[] = [
      { id: 'ct-1', numero: '01/2026', ano: 2026, arpId: 'Ata1', uasg: '200331', quantidadeContratada: 100, valorTotal: 50000, origem: 'MANUAL', criadoEm: '', atualizadoEm: '' }
    ];
    const vinculos: ContratoEmpenho[] = [
      { id: 'v-1', contratoId: 'ct-1', empenhoId: '1', dataVinculo: '2026-01-01', origem: 'MANUAL' }
    ];

    // Saldo após o contrato
    const resApos = calculateSaldoWithContratos(qtdRegistrada, empenhos, contratos, vinculos);

    expect(resApos.saldo).toBe(228);
    expect(resApos.saldo).toBe(saldoAntes);
  });

  // Teste 9: Vínculo de contrato a empenho não duplica empenho
  it('9. Deve garantir que vincular um Contrato a um Empenho não duplica a dedução no saldo', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      { id: '1', numero: 'NE001', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 27, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    const resComVinculo = calculateSaldoWithContratos(qtdRegistrada, empenhos, undefined, [
      { id: 'v-1', contratoId: 'ct-1', empenhoId: '1', dataVinculo: '2026-01-01', origem: 'MANUAL' }
    ]);

    expect(resComVinculo.totalEmpenhado).toBe(27);
    expect(resComVinculo.saldo).toBe(228);
  });

  // Teste 10: Mesmo empenho vinculado a múltiplos contratos não duplica o consumo
  it('10. Deve garantir que o mesmo Empenho vinculado a múltiplos Contratos não seja contabilizado mais de uma vez', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      { id: 'emp-100', numero: '2026NE000100', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 27, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    // Empenho emp-100 associado aos contratos ct-1 e ct-2
    const vinculosMultiplos: ContratoEmpenho[] = [
      { id: 'v-1', contratoId: 'ct-1', empenhoId: 'emp-100', dataVinculo: '2026-01-01', origem: 'MANUAL' },
      { id: 'v-2', contratoId: 'ct-2', empenhoId: 'emp-100', dataVinculo: '2026-01-02', origem: 'MANUAL' }
    ];

    const res = calculateSaldoWithContratos(qtdRegistrada, empenhos, undefined, vinculosMultiplos);

    // O consumo contábil DEVE permanecer estritamente 27 (não 54)
    expect(res.totalEmpenhado).toBe(27);
    expect(res.saldo).toBe(228);
  });

  // Teste 11: Empenho manual entra no cálculo do saldo
  it('11. Deve incluir Empenhos cadastrados manualmente no cálculo do saldo da Ata', () => {
    const qtdRegistrada = 255;
    const apiEmpenhos: Empenho[] = [
      { id: 'api-1', numero: '2026NE000001', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 42, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];
    const manualEmpenhos: Empenho[] = [
      { id: 'man-1', numero: '2026NE000002', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 20, origem: 'MANUAL', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    const merged = matchAndMergeEmpenhos(apiEmpenhos, manualEmpenhos);
    const total = calculateTotalEmpenhado(merged);
    const saldo = calculateSaldo(qtdRegistrada, merged);

    expect(total).toBe(62);
    expect(saldo).toBe(193);
  });

  // Teste 12: Empenho manual possui origem MANUAL
  it('12. Deve identificar e preservar explicitamente a origem MANUAL para empenhos inseridos pelo usuário', () => {
    const manualEmpenho: Empenho = {
      id: 'man-12',
      numero: '2026NE000777',
      ano: 2026,
      arpId: 'Ata1',
      itemId: '1',
      uasg: '200331',
      quantidade: 15,
      origem: 'MANUAL',
      status: 'CONFIRMADO',
      criadoEm: '2026-01-01',
      atualizadoEm: '2026-01-01'
    };

    const merged = matchAndMergeEmpenhos([], [manualEmpenho]);
    expect(merged).toHaveLength(1);
    expect(merged[0].origem).toBe('MANUAL');

    const breakdown = calculateTotalEmpenhadoPorOrigem(merged);
    expect(breakdown.manual).toBe(15);
    expect(breakdown.api).toBe(0);
  });

  // Teste 13: Empenho posteriormente localizado pela API não gera duplicidade
  it('13. Deve reconhecer correspondência entre empenho manual e retornado pela API promovendo para SINCRONIZADO sem duplicar', () => {
    // Dia 1: Usuário cadastra empenho manual NE 700 (20 un)
    const manualEmpenhos: Empenho[] = [
      { id: 'man-700', numero: '2026NE000700', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 20, unidadeInternaId: 'dep-ditel', observacao: 'Empenho para rádio', origem: 'MANUAL', status: 'CONFIRMADO', criadoEm: '2026-01-01', atualizadoEm: '2026-01-01' }
    ];

    // Dia 5: API passa a retornar o mesmo empenho NE 700 (20 un)
    const apiEmpenhos: Empenho[] = [
      { id: 'api-700', numero: '2026NE700', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 20, origem: 'API', status: 'CONFIRMADO', criadoEm: '2026-01-05', atualizadoEm: '2026-01-05' }
    ];

    const merged = matchAndMergeEmpenhos(apiEmpenhos, manualEmpenhos);

    // Deve resultar em exatamente 1 registro, promovido para SINCRONIZADO
    expect(merged).toHaveLength(1);
    expect(merged[0].origem).toBe('SINCRONIZADO');
    expect(merged[0].status).toBe('CONFIRMADO');
    expect(merged[0].quantidade).toBe(20);
    expect(merged[0].unidadeInternaId).toBe('dep-ditel');
  });

  // Teste 14: Divergência entre dado manual e API é sinalizada
  it('14. Deve sinalizar status DIVERGENTE quando a quantidade informada manualmente diferir da retornada pela API', () => {
    const manualEmpenhos: Empenho[] = [
      { id: 'man-1', numero: '2026NE000500', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 30, origem: 'MANUAL', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];
    const apiEmpenhos: Empenho[] = [
      { id: 'api-1', numero: '2026NE500', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 25, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    const merged = matchAndMergeEmpenhos(apiEmpenhos, manualEmpenhos);

    expect(merged).toHaveLength(1);
    expect(merged[0].origem).toBe('SINCRONIZADO');
    expect(merged[0].status).toBe('DIVERGENTE');
  });

  // Teste 15: Empenho superior à quantidade registrada gera saldo negativo/inconsistência
  it('15. Deve gerar saldo negativo e apontar excesso/inconsistência quando Total Empenhado > Quantidade Registrada', () => {
    const qtdRegistrada = 100;
    const empenhos: Empenho[] = [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 120, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    const saldo = calculateSaldo(qtdRegistrada, empenhos);
    // Invariante: Saldo negativo NÃO é convertido silenciosamente para zero
    expect(saldo).toBe(-20);

    const report = reconcileBalances(qtdRegistrada, empenhos, null);
    expect(report.status).toBe('DIVERGENTE');
    expect(report.saldoCalculado).toBe(-20);
    expect(report.mensagem).toContain('excesso/inconsistência');
  });

  // Teste 16: Saldo zero quando total empenhado = quantidade registrada
  it('16. Deve resultar em saldo exatamente ZERO quando total empenhado for igual à quantidade homologada', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 255, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    const saldo = calculateSaldo(qtdRegistrada, empenhos);
    expect(saldo).toBe(0);

    const report = reconcileBalances(qtdRegistrada, empenhos, 0);
    expect(report.status).toBe('CONSISTENTE');
    expect(report.saldoCalculado).toBe(0);
  });

  // Teste 17: Alteração da quantidade empenhada recalcula o saldo
  it('17. Deve recalcular o saldo imediatamente após a edição da quantidade de um empenho', () => {
    const qtdRegistrada = 255;
    let empenhos: Empenho[] = [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 50, origem: 'MANUAL', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    expect(calculateSaldo(qtdRegistrada, empenhos)).toBe(205);

    // Usuário altera a quantidade do empenho de 50 para 75
    empenhos = empenhos.map(e => e.id === '1' ? { ...e, quantidade: 75 } : e);

    expect(calculateSaldo(qtdRegistrada, empenhos)).toBe(180);
    expect(calculateTotalEmpenhado(empenhos)).toBe(75);
  });

  // Teste 18: Exclusão/cancelamento de empenho recalcula o saldo corretamente
  it('18. Deve restaurar o saldo da Ata após a exclusão ou cancelamento de uma Nota de Empenho', () => {
    const qtdRegistrada = 255;
    let empenhos: Empenho[] = [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 27, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' },
      { id: '2', numero: 'NE02', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 15, origem: 'MANUAL', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    expect(calculateSaldo(qtdRegistrada, empenhos)).toBe(213);

    // Exclusão do empenho manual id: 2
    empenhos = empenhos.filter(e => e.id !== '2');

    expect(calculateTotalEmpenhado(empenhos)).toBe(27);
    expect(calculateSaldo(qtdRegistrada, empenhos)).toBe(228);
  });

  // Teste 19: Saldo API igual ao saldo calculado = CONSISTENTE
  it('19. Deve emitir status CONSISTENTE quando o saldo informado pela API for idêntico ao saldo calculado pelos empenhos', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 62, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    const report = reconcileBalances(qtdRegistrada, empenhos, 193);

    expect(report.saldoCalculado).toBe(193);
    expect(report.saldoApi).toBe(193);
    expect(report.divergencia).toBe(0);
    expect(report.status).toBe('CONSISTENTE');
    expect(report.mensagem).toBe('✓ SALDOS CONSISTENTES');
  });

  // Teste 20: Saldo API diferente do saldo calculado = DIVERGÊNCIA
  it('20. Deve emitir status DIVERGENTE e explicitar a diferença quando Saldo Calculado (193) != Saldo API (200)', () => {
    const qtdRegistrada = 255;
    const empenhos: Empenho[] = [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 62, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ];

    const report = reconcileBalances(qtdRegistrada, empenhos, 200);

    expect(report.saldoCalculado).toBe(193);
    expect(report.saldoApi).toBe(200);
    expect(report.divergencia).toBe(7);
    expect(report.status).toBe('DIVERGENTE');
    expect(report.mensagem).toBe('⚠️ Divergência de 7 unidades.');
  });

  // Testes complementares: Saldo por Unidade e Alocação Interna
  it('21. Deve calcular saldo por unidade gestora corretamente', () => {
    const res = calculateSaldoPorUnidade(100, [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 40, origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ]);
    expect(res.totalRegistrado).toBe(100);
    expect(res.totalEmpenhado).toBe(40);
    expect(res.saldo).toBe(60);
    expect(res.percentualConsumido).toBe(40);
  });

  it('22. Deve calcular saldo de cota departamental sem alterar o saldo da ARP', () => {
    const res = calculateSaldoAlocado(50, [
      { id: '1', numero: 'NE01', ano: 2026, arpId: 'Ata1', itemId: '1', uasg: '200331', quantidade: 15, unidadeInternaId: 'dep-ditel', origem: 'API', status: 'CONFIRMADO', criadoEm: '', atualizadoEm: '' }
    ]);
    expect(res.cotaAlocada).toBe(50);
    expect(res.totalEmpenhado).toBe(15);
    expect(res.saldoDisponivel).toBe(35);
    expect(res.percentualConsumido).toBe(30);
  });

  it('23. Deve normalizar números de empenho e gerar chaves canônicas determinísticas', () => {
    expect(normalizeEmpenhoNumero('2026NE000142')).toBe('2026NE142');
    expect(normalizeEmpenhoNumero('000700')).toBe('700');
    expect(getEmpenhoCanonicalKey({ numero: '2026NE000700', ano: 2026, uasg: '200331', itemId: '1' })).toBe('2026NE700-2026-200331-1');
  });

});
