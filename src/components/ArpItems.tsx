import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, ShoppingBag, Eye, Users, Award, ExternalLink, DollarSign } from 'lucide-react';
import { fetchArpItems } from '../services/api';
import type { ArpRecord, ArpItemRecord } from '../types';

interface ArpItemsProps {
  arp: ArpRecord;
  onSelectItem: (item: ArpItemRecord) => void;
  onBack: () => void;
}

export const ArpItems: React.FC<ArpItemsProps> = ({ arp, onSelectItem, onBack }) => {
  const [items, setItems] = useState<ArpItemRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchArpItems(
          arp.dataVigenciaInicial,
          arp.codigoUnidadeGerenciadora,
          arp.numeroAtaRegistroPreco
        );
        
        let filtered = data.resultado || [];
        
        // Filter items to match the exact parent ATA's PNCP control number
        // This separates active items from cancelled items of the same ATA number!
        if (arp.numeroControlePncpAta) {
          filtered = filtered.filter(item => 
            !item.numeroControlePncpAta || item.numeroControlePncpAta === arp.numeroControlePncpAta
          );
        }
        
        // Sort items in ascending numeric order by item number (1, 2, 3, ..., 11, 12, etc.)
        filtered.sort((a, b) => {
          const numA = parseInt(a.numeroItem, 10) || 0;
          const numB = parseInt(b.numeroItem, 10) || 0;
          return numA - numB;
        });

        setItems(filtered);
        if (filtered.length === 0) {
          setError('Nenhum item localizado para esta Ata de Registro de Preços.');
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao buscar os itens da Ata.');
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [arp]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper to check allocations and empenho links in localStorage for an item
  const checkItemStatus = (numeroItem: string) => {
    let hasAllocations = false;
    let hasEmpenhos = false;

    // Simulation/demo defaults for SENASP key items
    if (arp.codigoUnidadeGerenciadora === '200331' && 
        (arp.numeroAtaRegistroPreco === '00068/2024' || arp.numeroAtaRegistroPreco === '00051/2025') && 
        numeroItem === '00011') {
      hasAllocations = true;
      hasEmpenhos = true;
    }

    try {
      const allocKey = `saldoarp-allocations-${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${numeroItem}`;
      const allocData = JSON.parse(localStorage.getItem(allocKey) || '[]');
      if (allocData.length > 0) {
        hasAllocations = true;
      }

      const linksKey = `saldoarp-empenho-links-${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${numeroItem}`;
      const linksData = JSON.parse(localStorage.getItem(linksKey) || '{}');
      if (Object.keys(linksData).length > 0) {
        hasEmpenhos = true;
      }
    } catch {
      // Ignorar erros de parse do localStorage
    }

    return { hasAllocations, hasEmpenhos };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navigation Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-item" style={{ cursor: 'pointer' }} onClick={onBack}>
          Atas
        </span>
        <span style={{ margin: '0 0.25rem' }}>/</span>
        <span className="breadcrumb-item active">Ata {arp.numeroAtaRegistroPreco}</span>
      </div>

      {/* Header card with ARP general info */}
      <section className="glass-card" style={{ background: 'linear-gradient(135deg, #f0f5fc 0%, #e1ebf8 100%)', borderColor: '#b2cbe6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-info">Ata nº {arp.numeroAtaRegistroPreco}</span>
              <span className="badge badge-success">UASG Gerenciadora: {arp.codigoUnidadeGerenciadora}</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {arp.nomeUnidadeGerenciadora}
            </h2>
          </div>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <ChevronLeft size={16} /> Voltar à busca
          </button>
        </div>

        {/* Re-organized metadata layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem', marginTop: '0.5rem' }}>
          
          {/* Left Column: Objeto (Justified description, centered label) */}
          <div className="meta-field" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderRight: '1px solid rgba(0,0,0,0.06)', paddingRight: '1.5rem' }}>
            <span className="meta-label" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', color: '#0c326f', textAlign: 'center', width: '100%', display: 'block' }}>
              Objeto da Ata
            </span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'justify', lineHeight: '1.5' }}>
              {arp.objeto}
            </div>
          </div>

          {/* Right Column: Stacked fields with centered labels and values */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center' }}>
            
            <div className="meta-field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span className="meta-label" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', color: '#0c326f', width: '100%' }}>
                Órgão Superior
              </span>
              <span className="meta-value" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem', fontWeight: 600 }}>
                {arp.nomeOrgao || arp.nomeUnidadeGerenciadora}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
              <div className="meta-field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <span className="meta-label" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', color: '#0c326f', width: '100%' }}>
                  Vigência
                </span>
                <span className="meta-value" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem', fontWeight: 600 }}>
                  {formatDate(arp.dataVigenciaInicial)} a {formatDate(arp.dataVigenciaFinal)}
                </span>
              </div>

              <div className="meta-field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <span className="meta-label" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', color: '#0c326f', width: '100%' }}>
                  Valor Total da Ata
                </span>
                <span className="meta-value" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  {formatCurrency(arp.valorTotal)}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* External links */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {arp.linkAtaPNCP && (
            <a href={arp.linkAtaPNCP} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500 }}>
              Ver Ata no PNCP <ExternalLink size={12} />
            </a>
          )}
          {arp.linkCompraPNCP && (
            <a href={arp.linkCompraPNCP} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500 }}>
              Ver Licitação no PNCP <ExternalLink size={12} />
            </a>
          )}
        </div>
      </section>

      {/* Items section */}
      <section className="glass-card">
        <h3 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          <ShoppingBag size={18} color="var(--primary)" /> Itens Registrados na Ata ({items.length})
        </h3>

        {loading ? (
          <div className="spinner-container">
            <div className="spinner spinner-glow"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Carregando catálogo de itens da ata...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <HelpCircle size={40} className="empty-state-icon" />
            <p style={{ fontSize: '0.95rem' }}>{error}</p>
          </div>
        ) : (
          <div className="items-grid">
            {items.map((item, idx) => {
              const { hasAllocations, hasEmpenhos } = checkItemStatus(item.numeroItem);

              return (
                <div key={`${item.numeroItem}-${idx}`} className="item-card">
                  <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="item-number">Item {item.numeroItem}</span>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {item.tipoItem}
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        Código: {item.codigoItem}
                      </span>

                      {/* Status Indicators */}
                      {hasAllocations && (
                        <span 
                          title="Item possui alocação interna realizada"
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.2rem',
                            fontSize: '0.62rem', 
                            fontWeight: 800, 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: '#e3f2fd', 
                            color: '#1565c0', 
                            border: '1px solid #90caf9' 
                          }}
                        >
                          <Users size={10} /> ALOCADO
                        </span>
                      )}

                      {hasEmpenhos && (
                        <span 
                          title="Item possui empenhos vinculados"
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.2rem',
                            fontSize: '0.62rem', 
                            fontWeight: 800, 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: '#e8f5e9', 
                            color: '#2e7d32', 
                            border: '1px solid #a5d6a7' 
                          }}
                        >
                          <DollarSign size={10} /> EMPENHADO
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => onSelectItem(item)}
                      className="btn btn-primary" 
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}
                    >
                      <Eye size={12} /> Saldos & Órgãos
                    </button>
                  </div>

                  <div className="item-description">
                    {item.descricaoItem}
                  </div>

                  {/* Neutrally styled item metadata container */}
                  <div className="item-metadata" style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                    <div className="meta-field">
                      <span className="meta-label">
                        <Award size={10} style={{ marginRight: '2px' }} /> Fornecedor Detentor
                      </span>
                      <span className="meta-value" style={{ fontSize: '0.8rem', fontWeight: 600 }} title={item.nomeRazaoSocialFornecedor}>
                        {item.nomeRazaoSocialFornecedor}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 400 }}>
                          CNPJ/CPF: {item.niFornecedor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                        </div>
                      </span>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label">Qtd Homologada</span>
                      <span className="meta-value" style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {formatNumber(item.quantidadeHomologadaItem)}
                      </span>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label">Valor Unitário</span>
                      <span className="meta-value-price" style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatCurrency(item.valorUnitario)}
                      </span>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label">Valor Total</span>
                      <span className="meta-value-price" style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatCurrency(item.valorTotal)}
                      </span>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label" style={{ display: 'flex', alignItems: 'center' }}>
                        <Users size={10} style={{ marginRight: '2px' }} /> Limite Carona (Máx)
                      </span>
                      <span className="meta-value" style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.maximoAdesao > 0 ? `${formatNumber(item.maximoAdesao)} un` : 'Não aceita carona'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
