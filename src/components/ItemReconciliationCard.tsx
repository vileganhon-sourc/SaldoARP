import React from 'react';
import { ShieldCheck, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react';
import type { ReconciliationReport } from '../types';

interface ItemReconciliationCardProps {
  report: ReconciliationReport;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ItemReconciliationCard: React.FC<ItemReconciliationCardProps> = ({
  report,
  onRefresh,
  isLoading = false
}) => {
  const formatNumber = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  };

  const isConsistent = report.status === 'CONSISTENTE';
  const isDivergent = report.status === 'DIVERGENTE';

  return (
    <div
      className="glass-card"
      style={{
        padding: '1.25rem',
        borderRadius: '10px',
        border: isDivergent ? '1px solid #fecaca' : isConsistent ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
        background: isDivergent ? '#fffaf0' : isConsistent ? '#f0fdf4' : '#f8fafc',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          <ShieldCheck size={18} color="var(--primary)" />
          <span>RECONCILIAÇÃO DO ITEM (AUDITORIA CONTÁBIL)</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', height: 'auto' }}
            title="Recalcular e sincronizar fontes de saldo"
          >
            <RefreshCw size={12} className={isLoading ? 'spinner' : ''} />
            <span>Atualizar</span>
          </button>
        )}
      </div>

      {/* Grid de Balanço */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Coluna 1: Quantidade e Empenhos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Quantidade Registrada:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{formatNumber(report.quantidadeRegistrada)} un</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', paddingLeft: '0.5rem' }}>
            <span>• Empenhos Oficiais (API):</span>
            <strong>{formatNumber(report.totalEmpenhadoApi)} un</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', paddingLeft: '0.5rem' }}>
            <span>• Empenhos Manuais:</span>
            <strong>{formatNumber(report.totalEmpenhadoManual)} un</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem', fontWeight: 800, color: 'var(--primary)' }}>
            <span>Total Empenhado:</span>
            <span>{formatNumber(report.totalEmpenhado)} un</span>
          </div>
        </div>

        {/* Coluna 2: Comparativo de Saldos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Saldo Calculado (Qtd - Empenhos):</span>
            <strong style={{ fontSize: '0.95rem', color: '#0c326f' }}>{formatNumber(report.saldoCalculado)} un</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Saldo Informado na API (SIASG):</span>
            <strong>{report.saldoApi !== undefined ? `${formatNumber(report.saldoApi)} un` : 'N/D'}</strong>
          </div>
          {report.divergencia !== 0 && report.saldoApi !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontWeight: 700 }}>
              <span>Divergência Contábil:</span>
              <span>{report.divergencia > 0 ? `+${formatNumber(report.divergencia)}` : formatNumber(report.divergencia)} un</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Badge de Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 700,
          background: isConsistent ? '#dcfce7' : isDivergent ? '#fef3c7' : '#f1f5f9',
          color: isConsistent ? '#15803d' : isDivergent ? '#92400e' : 'var(--text-secondary)',
          border: isConsistent ? '1px solid #86efac' : isDivergent ? '1px solid #fde047' : '1px solid #cbd5e1'
        }}
      >
        {isConsistent ? (
          <>
            <CheckCircle2 size={16} color="#15803d" />
            <span>✓ SALDOS CONSISTENTES — A soma dos empenhos confere exatamente com o saldo oficial do SIASG.</span>
          </>
        ) : isDivergent ? (
          <>
            <AlertTriangle size={16} color="#b45309" />
            <span>⚠️ {report.mensagem}</span>
          </>
        ) : (
          <>
            <Info size={16} />
            <span>ℹ️ {report.mensagem}</span>
          </>
        )}
      </div>
    </div>
  );
};
