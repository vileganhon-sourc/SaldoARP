import React from 'react';
import { Wifi, Database, FileText } from 'lucide-react';

interface HeaderProps {
  onOpenSeiModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSeiModal }) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Gov.br Federal Identity Topbar */}
      <div style={{
        background: '#0c326f',
        color: '#ffffff',
        padding: '0.4rem 3rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        fontFamily: 'var(--font-family)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '-0.03em' }}>
            gov<span style={{ color: '#00cc55' }}>.</span>br
          </span>
          <span style={{ opacity: 0.5, margin: '0 0.25rem' }}>|</span>
          <span style={{ fontWeight: 600, opacity: 0.95 }}>Ministério da Justiça e Segurança Pública</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', opacity: 0.9, fontWeight: 400 }} className="gov-topbar-links">
          <a href="https://www.gov.br/mj/pt-br" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Portal MJSP</a>
          <a href="https://www.gov.br/pt-br/orgaos-do-governo" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Órgãos do Governo</a>
          <a href="https://www.gov.br/acessoainformacao/pt-br" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Acesso à Informação</a>
        </div>
      </div>

      {/* Main MJSP Styled Header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '3px solid #0c326f',
        padding: '1.1rem 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
        fontFamily: 'var(--font-family)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src="/logo.png" 
              alt="Logo Compras SUSP / MJSP" 
              style={{ 
                maxHeight: '100%', 
                maxWidth: '100%', 
                objectFit: 'contain' 
              }} 
            />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0c326f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ministério da Justiça e Segurança Pública
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.1rem 0 0 0', letterSpacing: '-0.02em', borderBottom: 'none', paddingBottom: 0 }}>
              SaldoARP <span style={{ fontWeight: 400, fontSize: '1.1rem', color: '#475569' }}>| Gestão de Registro de Preços</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.1rem 0 0 0', fontWeight: 500 }}>
              Secretaria Nacional de Segurança Pública — SENASP
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onOpenSeiModal && (
            <button
              onClick={onOpenSeiModal}
              style={{
                backgroundColor: '#0c326f',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <FileText size={16} color="#00cc55" /> Processos SEI
            </button>
          )}

          <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Database size={14} color="#0284c7" /> Cache Banco (Ativo)
          </span>

          <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Wifi size={14} color="#16a34a" /> API Conectada
          </span>
        </div>
      </header>
    </div>
  );
};

