import React, { useState } from 'react';
import { Header } from './components/Header';
import { ArpSearch } from './components/ArpSearch';
import { ArpItems } from './components/ArpItems';
import { ItemBalances } from './components/ItemBalances';
import type { ArpRecord, ArpItemRecord } from './types';
import { setSimulationMode } from './services/api';

type ViewState = 'search' | 'items' | 'balances';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('search');
  const [selectedArp, setSelectedArp] = useState<ArpRecord | null>(null);
  const [selectedItem, setSelectedItem] = useState<ArpItemRecord | null>(null);
  const [simulationMode, setSimMode] = useState<boolean>(true); // Default to true for smooth local experience

  // Sync state to api service
  React.useEffect(() => {
    setSimulationMode(simulationMode);
  }, [simulationMode]);

  const handleSelectArp = (arp: ArpRecord) => {
    setSelectedArp(arp);
    setView('items');
  };

  const handleSelectItem = (item: ArpItemRecord) => {
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

  return (
    <div className="app-container">
      <Header 
        simulationMode={simulationMode} 
        onSimulationModeToggle={setSimMode} 
      />

      <main>
        {view === 'search' && (
          <ArpSearch 
            onSelectArp={handleSelectArp} 
            simulationMode={simulationMode}
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

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
        <p>© {new Date().getFullYear()} SaldoARP - Controle Interno de Saldo de Registro de Preços.</p>
        <p style={{ marginTop: '0.25rem' }}>Consumindo dados abertos da API oficial do Portal de Compras Governamentais do Brasil.</p>
      </footer>
    </div>
  );
};

export default App;
