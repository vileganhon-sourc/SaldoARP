import React from 'react';
import { Database, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  simulationMode: boolean;
  onSimulationModeToggle: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ simulationMode, onSimulationModeToggle }) => {
  return (
    <header className="glass-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Database size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SaldoARP
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Painel de Consulta & Saldos de Registro de Preços do Governo Federal
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {simulationMode ? (
            <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              <WifiOff size={14} /> Modo Simulação
            </span>
          ) : (
            <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              <Wifi size={14} /> API Conectada
            </span>
          )}

          <button 
            onClick={() => onSimulationModeToggle(!simulationMode)}
            className="demo-action-btn"
            title="Alterna entre buscar dados reais e dados simulados (evita bloqueios CORS do navegador)"
          >
            {simulationMode ? "Conectar API Real" : "Usar Dados Simulados"}
          </button>
        </div>
      </div>

      {simulationMode && (
        <div style={{ 
          fontSize: '0.82rem', 
          color: 'var(--warning)', 
          background: 'rgba(245, 158, 11, 0.08)', 
          padding: '0.6rem 1rem', 
          borderRadius: '8px', 
          border: '1px solid rgba(245, 158, 11, 0.2)' 
        }}>
          💡 <strong>Nota sobre CORS:</strong> Devido a restrições de segurança do navegador (CORS) nas APIs públicas do <em>compras.gov.br</em>, habilitamos o Modo Simulação de forma a demonstrar o comportamento visual da aplicação usando dados reais mockados da UASG 200331 (SENASP) e 154080 (UFRR).
        </div>
      )}
    </header>
  );
};
