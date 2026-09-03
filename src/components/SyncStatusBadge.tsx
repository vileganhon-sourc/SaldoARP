import React from 'react';
import { RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import type { SyncMetadata } from '../types';

interface SyncStatusBadgeProps {
  syncInfo: SyncMetadata;
  isSyncing: boolean;
  syncProgress?: { step: string; percent: number; current?: number; total?: number } | null;
  onTriggerSync: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  syncInfo,
  isSyncing,
  syncProgress,
  onTriggerSync
}) => {
  const formatSyncTime = (isoString?: string) => {
    if (!isoString) return 'Nunca';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      padding: '0.4rem 0.85rem',
      borderRadius: '8px',
      fontSize: '0.8rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
        <Database size={15} color="var(--primary)" />
        <span style={{ fontWeight: 600 }}>Banco Local:</span>
        {isSyncing ? (
          <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <RefreshCw size={12} className="spin-animation" /> Sincronizando com Governo ({syncProgress?.percent || 0}%)
          </span>
        ) : syncInfo.isCachedInDb ? (
          <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle size={13} /> Atualizado ({formatSyncTime(syncInfo.ultimoSyncEm)})
          </span>
        ) : (
          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={13} /> Sincronização pendente
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onTriggerSync}
        disabled={isSyncing}
        className="btn-sync-action"
        title="Forçar sincronização de Atas e Itens com Compras.gov.br e PNCP"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0.25rem 0.6rem',
          backgroundColor: isSyncing ? '#cbd5e1' : '#ffffff',
          color: isSyncing ? '#64748b' : '#0c326f',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <RefreshCw size={12} className={isSyncing ? 'spin-animation' : ''} />
        {isSyncing ? 'Atualizando...' : 'Sincronizar com Governo'}
      </button>

      {isSyncing && syncProgress && (
        <div style={{ width: '80px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${syncProgress.percent}%`,
            height: '100%',
            backgroundColor: 'var(--primary)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
    </div>
  );
};
