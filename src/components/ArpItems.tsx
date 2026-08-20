import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, ShoppingBag, Eye, Users, Award, ExternalLink } from 'lucide-react';
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
    loadItems();
  }, [arp]);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchArpItems(
        arp.dataVigenciaInicial,
        arp.codigoUnidadeGerenciadora,
        arp.numeroAtaRegistroPreco
      );
      setItems(data.resultado || []);
      if (!data.resultado || data.resultado.length === 0) {
        setError('Nenhum item localizado para esta Ata de Registro de Preços.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar os itens da Ata.');
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
      <section className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div className="meta-field">
            <span className="meta-label">Objeto da Ata</span>
            <span className="meta-value" style={{ color: 'var(--text-secondary)' }}>{arp.objeto}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Órgão Superior</span>
            <span className="meta-value">{arp.nomeOrgao}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Vigência</span>
            <span className="meta-value">
              {arp.dataVigenciaInicial.split('-').reverse().join('/')} a {arp.dataVigenciaFinal.split('-').reverse().join('/')}
            </span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Valor Total da Ata</span>
            <span className="meta-value" style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
              {formatCurrency(arp.valorTotal)}
            </span>
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
              return (
                <div key={`${item.numeroItem}-${idx}`} className="item-card">
                  <div className="item-header">
                    <div>
                      <span className="item-number">Item {item.numeroItem}</span>
                      <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                        {item.tipoItem}
                      </span>
                      <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                        Código: {item.codigoItem}
                      </span>
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

                  <div className="item-metadata" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
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
                      <span className="meta-value" style={{ fontFamily: 'monospace' }}>
                        {formatNumber(item.quantidadeHomologadaItem)}
                      </span>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label">Valor Unitário</span>
                      <span className="meta-value-price" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(item.valorUnitario)}
                      </span>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label">Valor Total</span>
                      <span className="meta-value-price" style={{ color: 'var(--success)' }}>
                        {formatCurrency(item.valorTotal)}
                      </span>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label" style={{ display: 'flex', alignItems: 'center' }}>
                        <Users size={10} style={{ marginRight: '2px' }} /> Limite Carona (Máx)
                      </span>
                      <span className="meta-value" style={{ color: item.maximoAdesao > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
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
