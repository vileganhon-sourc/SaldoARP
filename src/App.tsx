import React, { useState } from 'react';
import { Header } from './components/Header';
import { ArpSearch } from './components/ArpSearch';
import { ArpItems } from './components/ArpItems';
import { ItemBalances } from './components/ItemBalances';
import { SeiManagementModal } from './components/SeiManagementModal';
import type { ArpRecord, ArpItemRecord } from './types';

type ViewState = 'search' | 'items' | 'balances';

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
      <Header onOpenSeiModal={() => setIsSeiModalOpen(true)} />

      <main>
        {view === 'search' && (
          <ArpSearch 
            onSelectArp={handleSelectArp} 
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
        background: 'var(--bg-footer)',
        color: '#ffffff',
        padding: '2.5rem 3rem',
        fontSize: '0.82rem',
        fontFamily: 'var(--font-family)',
        marginTop: '5rem',
        borderTop: '4px solid var(--accent)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', maxWidth: '1800px', margin: '0 auto' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Controle de Saldos ARP</p>
            <p style={{ opacity: 0.8 }}>Controle Interno de Saldo de Registro de Preços do Governo Federal.</p>
            <p style={{ opacity: 0.6, fontSize: '0.75rem', marginTop: '0.5rem' }}>
              © {new Date().getFullYear()} Controle de Saldos ARP. Desenvolvido para fins de transparência e eficiência pública.
            </p>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.8 }}>
            <p style={{ fontWeight: 600 }}>Dados Abertos do Compras.gov.br</p>
            <p style={{ fontSize: '0.78rem', marginTop: '0.2rem', opacity: 0.7 }}>
              Consumindo dados em tempo real da API oficial do Portal de Compras Governamentais do Brasil.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

