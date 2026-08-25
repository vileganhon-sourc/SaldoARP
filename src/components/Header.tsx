import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  simulationMode: boolean;
  onSimulationModeToggle: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ simulationMode, onSimulationModeToggle }) => {
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
          <span style={{ fontWeight: 400, opacity: 0.9 }}>Governo Federal</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', opacity: 0.9, fontWeight: 400 }} className="gov-topbar-links">
          <a href="https://www.gov.br/pt-br/orgaos-do-governo" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Órgãos do Governo</a>
          <a href="https://www.gov.br/acessoainformacao/pt-br" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Acesso à Informação</a>
          <a href="https://www.planalto.gov.br/legislacao" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Legislação</a>
          <a href="https://www.gov.br/secom/pt-br/canais_atendimento" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Canais</a>
        </div>
      </div>

      {/* Main Gov.br Styled Header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '2px solid #1351b4',
        padding: '1.5rem 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        fontFamily: 'var(--font-family)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '45px',
            height: '45px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src="/logo.png" 
              alt="Logo Compras SUSP" 
              style={{ 
                maxHeight: '100%', 
                maxWidth: '100%', 
                objectFit: 'contain' 
              }} 
            />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#000000', margin: 0, letterSpacing: '-0.02em', borderBottom: 'none', paddingBottom: 0 }}>
              Controle de Saldos ARP
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#556275', margin: '0.1rem 0 0 0', fontWeight: 500 }}>
              Controle Interno de Saldo de Registro de Preços | Ministério da Gestão e da Inovação em Serviços Públicos
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {simulationMode ? (
            <span className="badge badge-warning" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '4px' }}>
              <WifiOff size={14} style={{ marginRight: '4px' }} /> Modo Simulação
            </span>
          ) : (
            <span className="badge badge-success" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '4px' }}>
              <Wifi size={14} style={{ marginRight: '4px' }} /> API Conectada (Real)
            </span>
          )}

          <button 
            onClick={() => onSimulationModeToggle(!simulationMode)}
            className="gov-toggle-btn"
            style={{
              background: simulationMode ? '#1351b4' : '#ffffff',
              color: simulationMode ? '#ffffff' : '#1351b4',
              border: '2px solid #1351b4',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.45rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {simulationMode ? "Conectar API Real" : "Usar Dados Simulados"}
          </button>
        </div>
      </header>

      {/* Alert block for CORS simulation */}
      {simulationMode && (
        <div style={{ 
          margin: '1.5rem 3rem 0 3rem',
          fontSize: '0.85rem', 
          color: '#856404', 
          background: '#fff3cd', 
          padding: '0.75rem 1.25rem', 
          borderRadius: '4px', 
          border: '1px solid #ffeeba',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-family)'
        }}>
          <span>💡</span>
          <div>
            <strong>Nota sobre CORS:</strong> Devido a restrições de segurança do navegador (CORS) nas APIs públicas do <em>compras.gov.br</em>, o Modo Simulação permite testar o comportamento visual da aplicação usando dados reais mockados. Clique em <strong>Conectar API Real</strong> se o proxy local estiver habilitado.
          </div>
        </div>
      )}
    </div>
  );
};
