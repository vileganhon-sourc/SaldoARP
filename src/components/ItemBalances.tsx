import React, { useState, useEffect } from 'react';
import { ChevronLeft, Building2, HelpCircle, ArrowRightLeft, Users, DollarSign } from 'lucide-react';
import { fetchUnidadesItem } from '../services/api';
import type { ArpRecord, ArpItemRecord, UnidadeItemRecord } from '../types';

interface ItemBalancesProps {
  arp: ArpRecord;
  item: ArpItemRecord;
  onBack: () => void;
}

export const ItemBalances: React.FC<ItemBalancesProps> = ({ arp, item, onBack }) => {
  const [unidades, setUnidades] = useState<UnidadeItemRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUnidades();
  }, [item]);

  const loadUnidades = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUnidadesItem(
        item.numeroAtaRegistroPreco,
        item.codigoUnidadeGerenciadora,
        item.numeroItem
      );
      setUnidades(data.resultado || []);
      if (!data.resultado || data.resultado.length === 0) {
        setError('Nenhum detalhamento de saldos por órgão cadastrado para este item.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar os saldos das unidades para o item.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  };

  // Calculate totals
  const totalRegistrado = unidades.reduce((acc, curr) => acc + curr.quantidadeRegistrada, 0);
  const totalSaldoRemanejamento = unidades.reduce((acc, curr) => acc + curr.saldoRemanejamentoEmpenho, 0);
  const totalLimiteAdesao = unidades.reduce((acc, curr) => acc + curr.qtdLimiteAdesao, 0);
  const totalSaldoAdesoes = unidades.reduce((acc, curr) => acc + curr.saldoAdesoes, 0);

  // Consumed calculations
  const totalConsumidoEmpenho = totalRegistrado - totalSaldoRemanejamento;
  const totalConsumidoAdesao = totalLimiteAdesao - totalSaldoAdesoes;

  // Percentage calculations
  const empenhoPercent = totalRegistrado > 0 ? (totalSaldoRemanejamento / totalRegistrado) * 100 : 0;
  const empenhoConsumidoPercent = 100 - empenhoPercent;
  const adesaoPercent = totalLimiteAdesao > 0 ? (totalSaldoAdesoes / totalLimiteAdesao) * 100 : 0;
  const adesaoConsumidoPercent = 100 - adesaoPercent;

  // Determine colors based on percentages
  const getProgressColorClass = (percent: number) => {
    if (percent < 20) return 'fill-danger';
    if (percent < 50) return 'fill-warning';
    return 'fill-success';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navigation Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-item" style={{ cursor: 'pointer' }} onClick={onBack}>
          Ata {arp.numeroAtaRegistroPreco}
        </span>
        <span style={{ margin: '0 0.25rem' }}>/</span>
        <span className="breadcrumb-item active">Item {item.numeroItem}</span>
      </div>

      {/* Item info overview */}
      <section className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="item-number">Item {item.numeroItem}</span>
              <span className="badge badge-info">{item.tipoItem}</span>
              <span className="badge badge-success">Preço Unitário: {formatCurrency(item.valorUnitario)}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {item.descricaoItem}
            </h2>
          </div>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <ChevronLeft size={16} /> Voltar aos itens
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div className="meta-field">
            <span className="meta-label">Fornecedor</span>
            <span className="meta-value" style={{ color: 'var(--text-secondary)' }}>{item.nomeRazaoSocialFornecedor}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Quantidade Original</span>
            <span className="meta-value">{formatNumber(item.quantidadeHomologadaItem)} unidades</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Valor Total do Item</span>
            <span className="meta-value" style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(item.valorTotal)}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Situação Sicap / Adesão</span>
            <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {item.maximoAdesao > 0 ? (
                <span className="badge badge-success">Aceita Adesão</span>
              ) : (
                <span className="badge badge-danger">Não Aceita Adesão</span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Global item balance metrics */}
      {!loading && !error && (
        <section className="balances-header-grid">
          {/* Empenho Balance Card */}
          <div className="glass-card balance-card-summary">
            <div className="balance-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
              <ArrowRightLeft size={24} />
            </div>
            <div className="balance-info-wrap" style={{ flexGrow: 1 }}>
              <span className="meta-label">Saldo p/ Empenho / Remanejamento</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="balance-val" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(totalSaldoRemanejamento)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  de {formatNumber(totalRegistrado)} un
                </span>
              </div>
              
              <div className="progress-container" style={{ marginTop: '0.75rem' }}>
                <div className="progress-track">
                  <div 
                    className={`progress-fill ${getProgressColorClass(empenhoPercent)}`}
                    style={{ width: `${empenhoPercent}%` }}
                  ></div>
                </div>
                <div className="progress-label-row">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Consumido: {formatNumber(totalConsumidoEmpenho)} ({formatNumber(empenhoConsumidoPercent)}%)</span>
                  <span style={{ fontWeight: 700, fontSize: '0.7rem', color: empenhoPercent < 20 ? 'var(--danger)' : 'var(--success)' }}>{formatNumber(empenhoPercent)}% restante</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adesao (Carona) Balance Card */}
          <div className="glass-card balance-card-summary">
            <div className="balance-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent)' }}>
              <Users size={24} />
            </div>
            <div className="balance-info-wrap" style={{ flexGrow: 1 }}>
              <span className="meta-label">Saldo para Adesões (Caronas)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="balance-val" style={{ color: 'var(--accent)' }}>
                  {formatNumber(totalSaldoAdesoes)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  de {formatNumber(totalLimiteAdesao)} un
                </span>
              </div>

              <div className="progress-container" style={{ marginTop: '0.75rem' }}>
                <div className="progress-track">
                  <div 
                    className={`progress-fill ${getProgressColorClass(adesaoPercent)}`}
                    style={{ width: `${adesaoPercent}%` }}
                  ></div>
                </div>
                <div className="progress-label-row">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Consumido: {formatNumber(totalConsumidoAdesao)} ({formatNumber(adesaoConsumidoPercent)}%)</span>
                  <span style={{ fontWeight: 700, fontSize: '0.7rem', color: adesaoPercent < 20 ? 'var(--danger)' : 'var(--accent)' }}>{formatNumber(adesaoPercent)}% restante</span>
                </div>
              </div>
            </div>
          </div>

          {/* Value Balance Card */}
          <div className="glass-card balance-card-summary">
            <div className="balance-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
              <DollarSign size={24} />
            </div>
            <div className="balance-info-wrap">
              <span className="meta-label">Valor Financeiro Disponível (Empenho)</span>
              <span className="balance-val" style={{ color: 'var(--success)', marginTop: '0.25rem' }}>
                {formatCurrency(totalSaldoRemanejamento * item.valorUnitario)}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Total consumido: {formatCurrency(totalConsumidoEmpenho * item.valorUnitario)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Granular unit breakdown */}
      <section className="glass-card" style={{ padding: '1rem' }}>
        <h3 className="section-title" style={{ fontSize: '1.1rem', padding: '0.5rem 1rem' }}>
          <Building2 size={16} color="var(--primary)" /> Saldos Detalhados por Órgão Vinculado
        </h3>

        {loading ? (
          <div className="spinner-container">
            <div className="spinner spinner-glow"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando saldos individuais por unidade...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <HelpCircle size={40} className="empty-state-icon" />
            <p style={{ fontSize: '0.95rem' }}>{error}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Órgão Participante / UASG</th>
                  <th>Tipo</th>
                  <th>Original Registrado</th>
                  <th style={{ width: '220px' }}>Saldo p/ Empenho</th>
                  <th>Limite Adesão (Carona)</th>
                  <th style={{ width: '220px' }}>Saldo p/ Adesão</th>
                  <th>Aceita Carona?</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((uni, idx) => {
                  const empPerc = uni.quantidadeRegistrada > 0 ? (uni.saldoRemanejamentoEmpenho / uni.quantidadeRegistrada) * 100 : 0;
                  const adePerc = uni.qtdLimiteAdesao > 0 ? (uni.saldoAdesoes / uni.qtdLimiteAdesao) * 100 : 0;

                  return (
                    <tr key={`${uni.codigoUnidade}-${idx}`}>
                      <td style={{ fontSize: '0.88rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {uni.nomeUnidade}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                          UASG: {uni.codigoUnidade}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${uni.tipoUnidade === 'GERENCIADORA' ? 'badge-info' : 'badge-success'}`}>
                          {uni.tipoUnidade}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {formatNumber(uni.quantidadeRegistrada)}
                      </td>
                      <td>
                        <div className="progress-container">
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatNumber(uni.saldoRemanejamentoEmpenho)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{formatNumber(empPerc)}%</span>
                          </div>
                          <div className="progress-track" style={{ height: '6px' }}>
                            <div 
                              className={`progress-fill ${getProgressColorClass(empPerc)}`}
                              style={{ width: `${empPerc}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', color: uni.qtdLimiteAdesao > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {uni.qtdLimiteAdesao > 0 ? formatNumber(uni.qtdLimiteAdesao) : '-'}
                      </td>
                      <td>
                        {uni.qtdLimiteAdesao > 0 ? (
                          <div className="progress-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatNumber(uni.saldoAdesoes)}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{formatNumber(adePerc)}%</span>
                            </div>
                            <div className="progress-track" style={{ height: '6px' }}>
                              <div 
                                className={`progress-fill ${getProgressColorClass(adePerc)}`}
                                style={{ width: `${adePerc}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>
                        )}
                      </td>
                      <td>
                        {uni.aceitaAdesao ? (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Sim</span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Não</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
