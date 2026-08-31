import React, { useState } from 'react';
import { Header } from './components/Header';
import { ArpSearch } from './components/ArpSearch';
import { ArpItems } from './components/ArpItems';
import { ItemBalances } from './components/ItemBalances';
import { InternalAllocationsDashboard } from './components/InternalAllocationsDashboard';
import { SeiManagementModal } from './components/SeiManagementModal';
import type { ArpRecord, ArpItemRecord } from './types';

type ViewState = 'search' | 'items' | 'balances' | 'allocations';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('search');
  const [selectedArp, setSelectedArp] = useState<ArpRecord | null>(null);
  const [selectedItem, setSelectedItem] = useState<ArpItemRecord | null>(null);
  const [isSeiModalOpen, setIsSeiModalOpen] = useState<boolean>(false);

  const handleSelectArp = (arp: ArpRecord) => {
    setSelectedArp(arp);
    setView('items');
  };

  const handleSelectItem = (item: ArpItemRecord) => {
    setSelectedItem(item);
    setView('balances');
  };

  const handleSelectItemFromSearch = (arp: ArpRecord, item: ArpItemRecord) => {
    setSelectedArp(arp);
    setSelectedItem(item);
    setView('balances');
  };

  const handleBackToSearch = () => {
    setSelectedArp(null);
    setSelectedItem(null);
    setView('search');
  };

  const handleBackToItems = () => {
    setSelectedItem(null);
    setView('items');
  };

  const handleNavigateView = (targetView: 'search' | 'allocations') => {
    setSelectedArp(null);
    setSelectedItem(null);
    setView(targetView);
  };

  return (
    <div className="app-container">
      <Header 
        activeView={view} 
        onNavigateView={handleNavigateView} 
      />

      <main>
        {view === 'search' && (
          <ArpSearch 
            onSelectArp={handleSelectArp} 
            onSelectItem={handleSelectItemFromSearch}
            onOpenAllocationsPanel={() => setView('allocations')}
          />
        )}

        {view === 'allocations' && (
          <InternalAllocationsDashboard
            onBack={() => setView('search')}
            onSelectItem={handleSelectItemFromSearch}
          />
        )}

        {view === 'items' && selectedArp && (
          <ArpItems 
            arp={selectedArp} 
            onSelectItem={handleSelectItem} 
            onBack={handleBackToSearch}
          />
        )}

        {view === 'balances' && selectedArp && selectedItem && (
          <ItemBalances 
            arp={selectedArp} 
            item={selectedItem} 
            onBack={handleBackToItems}
          />
        )}
      </main>

      <SeiManagementModal 
        isOpen={isSeiModalOpen} 
        onClose={() => setIsSeiModalOpen(false)} 
      />

      <footer style={{
        background: '#0c326f',
        color: '#ffffff',
        padding: '2.5rem 3rem',
        fontSize: '0.82rem',
        fontFamily: 'var(--font-family)',
        marginTop: '5rem',
        borderTop: '4px solid #00cc55'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', maxWidth: '1800px', margin: '0 auto' }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem', color: '#ffffff' }}>
              Ministério da Justiça e Segurança Pública
            </p>
            <p style={{ opacity: 0.9, color: '#e2e8f0' }}>
              Secretaria Nacional de Segurança Pública — SENASP | Controle de Saldos de Atas de Registro de Preços
            </p>
            <p style={{ opacity: 0.7, fontSize: '0.75rem', marginTop: '0.5rem', color: '#cbd5e1' }}>
              © {new Date().getFullYear()} Governo Federal. Todos os direitos reservados. Padrão Visual Institucional BR-DS / MJSP.
            </p>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.9 }}>
            <p style={{ fontWeight: 700, color: '#ffffff' }}>Dados Oficiais das APIs Compras.gov.br e PNCP</p>
            <p style={{ fontSize: '0.78rem', marginTop: '0.2rem', opacity: 0.8, color: '#cbd5e1' }}>
              Sincronizado com os dados abertos do Governo Federal e licitações públicas.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

