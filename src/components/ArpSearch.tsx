import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Building2, ChevronRight, HelpCircle } from 'lucide-react';
import { fetchArps } from '../services/api';
import type { ArpRecord, FilterParams } from '../types';

interface ArpSearchProps {
  onSelectArp: (arp: ArpRecord) => void;
  simulationMode: boolean;
}

export const ArpSearch: React.FC<ArpSearchProps> = ({ onSelectArp, simulationMode }) => {
  const [params, setParams] = useState<FilterParams>({
    dataVigenciaInicialMin: '2024-12-28',
    dataVigenciaInicialMax: '2026-12-30',
    codigoUnidadeGerenciadora: '200331',
    numeroAtaRegistroPreco: ''
  });

  const [arps, setArps] = useState<ArpRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically trigger search on mount to load initial demo list
  useEffect(() => {
    handleSearch();
  }, [simulationMode]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!params.dataVigenciaInicialMin || !params.dataVigenciaInicialMax) {
      setError('As datas de início de vigência mínima e máxima são obrigatórias.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchArps(params);
      setArps(data.resultado || []);
      if (!data.resultado || data.resultado.length === 0) {
        setError('Nenhuma Ata encontrada para os filtros especificados.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar as Atas do servidor.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // Format YYYY-MM-DD to DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section className="glass-card">
        <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
          <Search size={20} color="var(--primary)" /> Filtrar Atas de Registro de Preços
        </h2>

        <form onSubmit={handleSearch} className="search-grid">
          <div className="form-group">
            <label className="form-label">
              <Building2 size={13} style={{ marginRight: '4px' }} /> Unidade Gerenciadora (UASG)
            </label>
            <input 
              type="text" 
              className="form-input"
              placeholder="Ex: 200331"
              value={params.codigoUnidadeGerenciadora || ''}
              onChange={(e) => setParams({ ...params, codigoUnidadeGerenciadora: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Calendar size={13} style={{ marginRight: '4px' }} /> Vigência Inicial (Mínima) *
            </label>
            <input 
              type="date" 
              className="form-input"
              value={params.dataVigenciaInicialMin}
              onChange={(e) => setParams({ ...params, dataVigenciaInicialMin: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Calendar size={13} style={{ marginRight: '4px' }} /> Vigência Inicial (Máxima) *
            </label>
            <input 
              type="date" 
              className="form-input"
              value={params.dataVigenciaInicialMax}
              onChange={(e) => setParams({ ...params, dataVigenciaInicialMax: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FileText size={13} style={{ marginRight: '4px' }} /> Número da Ata
            </label>
            <input 
              type="text" 
              className="form-input"
              placeholder="Ex: 00064/2024"
              value={params.numeroAtaRegistroPreco || ''}
              onChange={(e) => setParams({ ...params, numeroAtaRegistroPreco: e.target.value })}
            />
          </div>

          <div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '45px' }}>
              <Search size={18} /> Consultar
            </button>
          </div>
        </form>

        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          💡 <strong>Dica de busca de simulação:</strong> Use UASG <code>200331</code> com Vigência <code>28/12/2024</code> a <code>30/12/2024</code>, ou UASG <code>154080</code> com Vigência <code>01/01/2026</code>.
        </div>
      </section>

      <section className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Resultados ({arps.length})
          </h3>
        </div>

        {loading ? (
          <div className="spinner-container">
            <div className="spinner spinner-glow"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando atas no banco de dados do Compras.gov...</p>
          </div>
        ) : error && arps.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={40} className="empty-state-icon" />
            <p style={{ fontSize: '0.95rem' }}>{error}</p>
          </div>
        ) : arps.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} className="empty-state-icon" />
            <p style={{ fontSize: '0.95rem' }}>Insira os filtros acima e clique em Consultar para carregar dados.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nº Ata</th>
                  <th>Órgão Gerenciador</th>
                  <th>Objeto</th>
                  <th>Início Vigência</th>
                  <th>Fim Vigência</th>
                  <th>Valor Total</th>
                  <th>Status</th>
                  <th style={{ width: '80px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {arps.map((arp, index) => {
                  const isExpired = new Date(arp.dataVigenciaFinal) < new Date();
                  
                  return (
                    <tr key={`${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${index}`}>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--accent)' }}>
                        {arp.numeroAtaRegistroPreco}
                      </td>
                      <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {arp.nomeUnidadeGerenciadora}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          UASG: {arp.codigoUnidadeGerenciadora}
                        </div>
                      </td>
                      <td style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={arp.objeto}>
                          {arp.objeto}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(arp.dataVigenciaInicial)}
                      </td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{formatDate(arp.dataVigenciaFinal)}</span>
                          {isExpired ? (
                            <span className="badge badge-danger" style={{ alignSelf: 'flex-start', marginTop: '2px', fontSize: '0.65rem', padding: '0.05rem 0.3rem' }}>Expirada</span>
                          ) : (
                            <span className="badge badge-success" style={{ alignSelf: 'flex-start', marginTop: '2px', fontSize: '0.65rem', padding: '0.05rem 0.3rem' }}>Vigente</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {formatCurrency(arp.valorTotal)}
                      </td>
                      <td>
                        <span className={`badge ${
                          arp.statusAta.toLowerCase().includes('canc') ? 'badge-danger' : 'badge-info'
                        }`}>
                          {arp.statusAta}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => onSelectArp(arp)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}
                        >
                          Itens <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
