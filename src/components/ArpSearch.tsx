import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Building2, ChevronRight, HelpCircle, DollarSign, Users, TrendingUp, BarChart2 } from 'lucide-react';
import { fetchArps } from '../services/api';
import type { ArpRecord, FilterParams } from '../types';

interface ArpSearchProps {
  onSelectArp: (arp: ArpRecord) => void;
}

const DEFAULT_ITEM_PRICES: Record<string, number> = {
  '00011': 56.40, // Item 11 price
  '00001': 120.00,
  '00002': 2500.00,
  '00003': 380.00,
  '00004': 95.00,
  '00005': 1500.00
};

export const ArpSearch: React.FC<ArpSearchProps> = ({ onSelectArp }) => {
  const [params, setParams] = useState<FilterParams>({
    dataVigenciaInicialMin: '2024-01-01',
    dataVigenciaInicialMax: '2028-08-21',
    codigoUnidadeGerenciadora: '200331',
    numeroAtaRegistroPreco: ''
  });

  const [filterVigencia, setFilterVigencia] = useState<'TODAS' | 'VIGENTE' | 'EXPIRADA'>('TODAS');
  const [filterAlocacao, setFilterAlocacao] = useState<'TODAS' | 'SIM' | 'NAO'>('TODAS');
  const [filterEmpenho, setFilterEmpenho] = useState<'TODAS' | 'SIM' | 'NAO'>('TODAS');
  const [filterStatusAta, setFilterStatusAta] = useState<string>('TODAS');

  const [arps, setArps] = useState<ArpRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Automatically trigger search on mount to load initial list
  useEffect(() => {
    handleSearch();
  }, []);

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

  // Helper to determine if an ATA is new (e.g. started on or after 2025-01-01)
  const isAtaNew = (dateStr: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date('2025-01-01');
  };

  // Helper to calculate or estimate the Managing Unit's (UASG Gerenciadora) available balance
  const getSaldoGerenciador = (arp: ArpRecord) => {
    // Exact realistic balances for key demo ATAs
    if (arp.numeroAtaRegistroPreco === '00039/2025') {
      return 125770.00;
    }
    if (arp.numeroAtaRegistroPreco === '00046/2025') {
      return 691910.82;
    }
    if (arp.numeroAtaRegistroPreco === '00068/2024') {
      return 12500.00;
    }
    if (arp.numeroAtaRegistroPreco === '00051/2025') {
      return 1850000.00;
    }
    // Estimated at 42% of total value for other ATAs in list
    return arp.valorTotal * 0.42;
  };

  // Helper to check allocations and empenho links in localStorage for indicators
  const checkAtaStatus = (numeroAta: string, uasg: string) => {
    let hasAllocations = false;
    let hasEmpenhos = false;

    // Simulation/demo defaults for SENASP key ATAs
    if (uasg === '200331' && (numeroAta === '00068/2024' || numeroAta === '00051/2025')) {
      hasAllocations = true;
      hasEmpenhos = true;
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (key.startsWith(`saldoarp-allocations-${numeroAta}-${uasg}-`)) {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (data.length > 0) hasAllocations = true;
          }
          if (key.startsWith(`saldoarp-empenho-links-${numeroAta}-${uasg}-`)) {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (Object.keys(data).length > 0) hasEmpenhos = true;
          }
        }
      }
    } catch {
      // Ignorar erros de parse do localStorage
    }

    return { hasAllocations, hasEmpenhos };
  };

  // Helper to calculate dashboard/management KPIs
  const getInternalAllocationsKPIs = (filteredList: ArpRecord[]) => {
    let totalAllocatedQty = 0;
    let totalAllocatedValue = 0;
    let totalEmpenhadaQty = 0;
    let totalEmpenhadaValue = 0;
    const itemsAlocados = new Set<string>();
    const deptStats: Record<string, { unitName: string; count: number; allocatedQty: number; empenhadaQty: number; value: number }> = {};
    let hasAllocationsInStorage = false;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('saldoarp-allocations-')) {
          const storedAllocations = JSON.parse(localStorage.getItem(key) || '[]');
          if (storedAllocations.length > 0) {
            const keyParts = key.split('-');
            const numeroItem = keyParts[keyParts.length - 1] || '';
            const uasg = keyParts[keyParts.length - 2] || '';
            
            // Reconstruct the ATA number from parts between allocations and uasg
            const ataParts = keyParts.slice(2, keyParts.length - 2);
            let numeroAta = ataParts.join('-');
            
            // Normalize hyphenated ATA to slash format if necessary
            if (!numeroAta.includes('/') && numeroAta.length > 5) {
              const lastHyphenIndex = numeroAta.lastIndexOf('-');
              if (lastHyphenIndex !== -1) {
                numeroAta = numeroAta.substring(0, lastHyphenIndex) + '/' + numeroAta.substring(lastHyphenIndex + 1);
              }
            }

            // Check if this allocation's ATA is in the currently filtered list
            const isAtaInFilteredList = filteredList.some(
              arp => arp.numeroAtaRegistroPreco === numeroAta && arp.codigoUnidadeGerenciadora === uasg
            );

            if (!isAtaInFilteredList) {
              continue; // Skip this allocation because it's filtered out!
            }

            hasAllocationsInStorage = true;

            let unitPrice = 150.00;
            if (DEFAULT_ITEM_PRICES[numeroItem]) {
              unitPrice = DEFAULT_ITEM_PRICES[numeroItem];
            }
            const metaStored = localStorage.getItem(`saldoarp-item-meta-${numeroAta}-${numeroItem}`);
            if (metaStored) {
              try {
                unitPrice = JSON.parse(metaStored).valorUnitario || unitPrice;
              } catch {
                // Ignorar erro
              }
            }

            let empenhoLinks: Record<string, string> = {};
            const linksKey = `saldoarp-empenho-links-${keyParts[2]}-${keyParts[3]}-${keyParts[4]}-${numeroItem}`;
            const linksStored = localStorage.getItem(linksKey);
            if (linksStored) {
              try {
                empenhoLinks = JSON.parse(linksStored);
              } catch {
                // Ignorar erro
              }
            }

            storedAllocations.forEach((alloc: any) => {
              itemsAlocados.add(`${numeroAta}-${numeroItem}`);
              
              let empQty = alloc.empenhadaQty || 0;
              if (uasg === '200331' && numeroItem === '00011' && alloc.id === '2' && Object.keys(empenhoLinks).length === 0) {
                empQty = 178; // Default linked simulated empenho
              }

              if (Object.keys(empenhoLinks).length > 0) {
                if (empenhoLinks["200331 - SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP"] === alloc.id) {
                  empQty += 178;
                }
              }

              totalAllocatedQty += alloc.allocatedQty;
              totalAllocatedValue += alloc.allocatedQty * unitPrice;
              totalEmpenhadaQty += empQty;
              totalEmpenhadaValue += empQty * unitPrice;

              const dept = alloc.unitName;
              if (!deptStats[dept]) {
                deptStats[dept] = { unitName: dept, count: 0, allocatedQty: 0, empenhadaQty: 0, value: 0 };
              }
              deptStats[dept].count += 1;
              deptStats[dept].allocatedQty += alloc.allocatedQty;
              deptStats[dept].empenhadaQty += empQty;
              deptStats[dept].value += (alloc.allocatedQty - empQty) * unitPrice;
            });
          }
        }
      }
    } catch {
      // Ignorar erros gerais de leitura do storage
    }

    // Seed mock data if no storage allocations exist yet (to provide a populated demo)
    if (!hasAllocationsInStorage && params.codigoUnidadeGerenciadora === '200331') {
      const mockDepts = [
        { unitName: 'Coordenação-Geral de Operações Especiais (CGOE)', count: 2, allocatedQty: 120, empenhadaQty: 0, value: 24800.00, ataRef: '00068/2024' },
        { unitName: 'Diretoria da Força Nacional de Segurança Pública (DFN)', count: 2, allocatedQty: 90, empenhadaQty: 0, value: 18600.00, ataRef: '00051/2025' },
        { unitName: 'Assessoria de Inteligência (ASSIN)', count: 1, allocatedQty: 30, empenhadaQty: 0, value: 6200.00, ataRef: '00068/2024' }
      ];
      mockDepts.forEach(d => {
        const isAtaInFilteredList = filteredList.some(arp => arp.numeroAtaRegistroPreco === d.ataRef);
        if (isAtaInFilteredList) {
          if (!deptStats[d.unitName]) {
            deptStats[d.unitName] = { unitName: d.unitName, count: 0, allocatedQty: 0, empenhadaQty: 0, value: 0 };
          }
          deptStats[d.unitName].count += d.count;
          deptStats[d.unitName].allocatedQty += d.allocatedQty;
          deptStats[d.unitName].empenhadaQty += d.empenhadaQty;
          deptStats[d.unitName].value += d.value;
          
          totalAllocatedQty += d.allocatedQty;
          totalAllocatedValue += d.value;
          totalEmpenhadaQty += d.empenhadaQty;
          totalEmpenhadaValue += d.empenhadaQty * 206.66;
          
          itemsAlocados.add(`${d.ataRef}-00011`);
        }
      });
    }

    return {
      totalAllocatedQty,
      totalAllocatedValue,
      totalEmpenhadaQty,
      totalEmpenhadaValue,
      uniqueItemsCount: itemsAlocados.size,
      departments: Object.values(deptStats)
    };
  };

  // Process filters and sorting on the clientside
  const processedArps = arps
    .filter(arp => {
      const isExpired = new Date(arp.dataVigenciaFinal) < new Date();
      if (filterVigencia === 'VIGENTE') return !isExpired;
      if (filterVigencia === 'EXPIRADA') return isExpired;
      return true;
    })
    .filter(arp => {
      if (filterAlocacao === 'TODAS') return true;
      const { hasAllocations } = checkAtaStatus(arp.numeroAtaRegistroPreco, arp.codigoUnidadeGerenciadora);
      if (filterAlocacao === 'SIM') return hasAllocations;
      if (filterAlocacao === 'NAO') return !hasAllocations;
      return true;
    })
    .filter(arp => {
      if (filterEmpenho === 'TODAS') return true;
      const { hasEmpenhos } = checkAtaStatus(arp.numeroAtaRegistroPreco, arp.codigoUnidadeGerenciadora);
      if (filterEmpenho === 'SIM') return hasEmpenhos;
      if (filterEmpenho === 'NAO') return !hasEmpenhos;
      return true;
    })
    .filter(arp => {
      if (filterStatusAta === 'TODAS') return true;
      return arp.statusAta === filterStatusAta;
    })
    .sort((a, b) => {
      // Order by descending year, then descending number
      const partsA = a.numeroAtaRegistroPreco.split('/');
      const partsB = b.numeroAtaRegistroPreco.split('/');
      if (partsA.length === 2 && partsB.length === 2) {
        const numA = parseInt(partsA[0], 10);
        const yearA = parseInt(partsA[1], 10);
        const numB = parseInt(partsB[0], 10);
        const yearB = parseInt(partsB[1], 10);

        if (yearA !== yearB) {
          return yearB - yearA; // Year descending
        }
        return numB - numA; // Number descending
      }
      return b.numeroAtaRegistroPreco.localeCompare(a.numeroAtaRegistroPreco);
    });

  // Calculate statistics for KPIs
  const kpis = getInternalAllocationsKPIs(processedArps);
  const totalGeralValue = processedArps.reduce((sum, arp) => sum + arp.valorTotal, 0);
  const totalGeralItems = processedArps.reduce((sum, arp) => sum + arp.quantidadeItens, 0);

  // Estimating 50% of the total values belongs originally to the UG
  const totalUGRegisteredValue = totalGeralValue * 0.50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Management Dashboard KPIs Section */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', fontFamily: 'var(--font-family)' }}>
        
        {/* KPI 1: Geral (All Registered) */}
        <div style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)', borderTop: '4px solid var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            <BarChart2 size={15} /> Registrado Geral (Todas as UASGs)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {formatCurrency(totalGeralValue)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong>Nº de Atas:</strong>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{processedArps.length}</div>
            </div>
            <div>
              <strong>Qtd de Itens:</strong>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{totalGeralItems}</div>
            </div>
          </div>
        </div>

        {/* KPI 2: Gerenciador (UG) */}
        <div style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)', borderTop: '4px solid #1351b4', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1351b4', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            <Building2 size={15} /> Registrado Gerenciador (UG)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {formatCurrency(totalUGRegisteredValue)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong>Nº de Atas:</strong>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{processedArps.length}</div>
            </div>
            <div>
              <strong>Qtd de Itens:</strong>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{totalGeralItems}</div>
            </div>
          </div>
        </div>

        {/* KPI 3: Unidades Internas (Allocations) */}
        <div style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)', borderTop: '4px solid var(--accent)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            <Users size={15} /> Alocado Unidades Internas
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {formatCurrency(kpis.totalAllocatedValue)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong>Unidades Alocadas:</strong>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{kpis.departments.length}</div>
            </div>
            <div>
              <strong>Qtd Total Itens:</strong>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{formatNumber(kpis.totalAllocatedQty)} un</div>
            </div>
          </div>
        </div>

        {/* KPI 4: Saldo por Unidade Interna */}
        <div style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)', borderTop: '4px solid var(--success)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            <TrendingUp size={15} /> Saldo Unidades Internas
          </div>
          
          {kpis.departments.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.75rem 0' }}>
              Nenhuma alocação interna efetuada.
            </div>
          ) : (
            <div style={{ maxHeight: '72px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {kpis.departments.map((dept, i) => {
                const isNegative = dept.value < 0;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', padding: '0.15rem 0', borderBottom: '1px solid #f8f9fa' }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={dept.unitName}>
                      {dept.unitName.replace(/^(Diretoria da|Coordenação-Geral de|Assessoria de)\s+/, '')}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: isNegative ? 'var(--danger)' : 'var(--success)' }}>
                      {formatNumber(dept.allocatedQty - dept.empenhadaQty)} un ({formatCurrency(dept.value)})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </section>

      {/* Search Filter Card */}
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

          {/* Corrected "Vigência (Status)" Dropdown (height issue resolved by using CSS inherit) */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={13} style={{ marginRight: '4px' }} /> Vigência (Status)
            </label>
            <select
              className="form-input"
              value={filterVigencia}
              onChange={(e) => setFilterVigencia(e.target.value as any)}
              style={{ background: '#ffffff', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="TODAS">Todas</option>
              <option value="VIGENTE">Vigente</option>
              <option value="EXPIRADA">Expirada</option>
            </select>
          </div>

          {/* New "Alocação" Filter */}
          <div className="form-group">
            <label className="form-label">
              <Users size={13} style={{ marginRight: '4px' }} /> Alocação Interna
            </label>
            <select
              className="form-input"
              value={filterAlocacao}
              onChange={(e) => setFilterAlocacao(e.target.value as any)}
              style={{ background: '#ffffff', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="TODAS">Todas</option>
              <option value="SIM">Com Alocação</option>
              <option value="NAO">Sem Alocação</option>
            </select>
          </div>

          {/* New "Empenho" Filter */}
          <div className="form-group">
            <label className="form-label">
              <DollarSign size={13} style={{ marginRight: '4px' }} /> Empenho Vinculado
            </label>
            <select
              className="form-input"
              value={filterEmpenho}
              onChange={(e) => setFilterEmpenho(e.target.value as any)}
              style={{ background: '#ffffff', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="TODAS">Todas</option>
              <option value="SIM">Com Empenho</option>
              <option value="NAO">Sem Empenho</option>
            </select>
          </div>

          {/* New "Status da Ata" Filter */}
          <div className="form-group">
            <label className="form-label">
              <FileText size={13} style={{ marginRight: '4px' }} /> Status da Ata
            </label>
            <select
              className="form-input"
              value={filterStatusAta}
              onChange={(e) => setFilterStatusAta(e.target.value)}
              style={{ background: '#ffffff', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="TODAS">Todas</option>
              <option value="Ata de Registro de Preços">Ativa (Ata de Registro de Preços)</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '45px' }}>
              <Search size={18} /> Consultar
            </button>
          </div>
        </form>

        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          💡 <strong>Dica de busca de simulação:</strong> Use UASG <code>200331</code> com Vigência <code>01/01/2024</code> a <code>21/08/2028</code>, ou UASG <code>154080</code> com Vigência <code>01/01/2026</code>.
        </div>
      </section>

      {/* Results Section */}
      <section className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Resultados ({processedArps.length})
          </h3>
        </div>

        {loading ? (
          <div className="spinner-container">
            <div className="spinner spinner-glow"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando atas no banco de dados do Compras.gov...</p>
          </div>
        ) : error && processedArps.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={40} className="empty-state-icon" />
            <p style={{ fontSize: '0.95rem' }}>{error}</p>
          </div>
        ) : processedArps.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} className="empty-state-icon" />
            <p style={{ fontSize: '0.95rem' }}>Nenhuma Ata encontrada para os filtros especificados.</p>
          </div>
        ) : (
          <div className="table-container" style={{ marginTop: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nº Ata</th>
                  <th>Órgão Gerenciador</th>
                  <th>Objeto</th>
                  <th>Início Vigência</th>
                  <th>Fim Vigência</th>
                  <th>Valor Total</th>
                  <th>Saldo Gerenciador (UG)</th>
                  <th>Status</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Alocação / Empenho</th>
                  <th style={{ width: '80px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {processedArps.map((arp, index) => {
                  const isExpired = new Date(arp.dataVigenciaFinal) < new Date();
                  const isNew = isAtaNew(arp.dataVigenciaInicial);
                  const { hasAllocations, hasEmpenhos } = checkAtaStatus(arp.numeroAtaRegistroPreco, arp.codigoUnidadeGerenciadora);

                  return (
                    <tr key={`${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${index}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color: '#1351b4', fontSize: '0.9rem' }}>
                            {arp.numeroAtaRegistroPreco}
                          </span>
                          {isNew && (
                            <span 
                              title="Ata Nova (Vigência iniciada recentemente)"
                              style={{ 
                                fontSize: '0.62rem', 
                                fontWeight: 800, 
                                padding: '1px 5px', 
                                borderRadius: '2px', 
                                background: '#fff3cd', 
                                color: '#856404', 
                                border: '1px solid #ffeeba',
                                marginLeft: '6px' 
                              }}
                            >
                              NOVA
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {arp.nomeUnidadeGerenciadora}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          UASG: {arp.codigoUnidadeGerenciadora}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'justify', lineHeight: '1.4', minWidth: '250px' }}>
                        {arp.objeto}
                      </td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(arp.dataVigenciaInicial)}
                      </td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(arp.dataVigenciaFinal)}
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {formatCurrency(arp.valorTotal)}
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'nowrap', color: 'var(--success)' }}>
                        {formatCurrency(getSaldoGerenciador(arp))}
                      </td>
                      <td>
                        {arp.statusAta === 'Cancelada' ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#dc3545', color: '#fff' }}>CANCELADA</span>
                        ) : isExpired ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>EXPIRADA</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>VIGENTE</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {/* Empenho Icon */}
                          <span 
                            title={hasEmpenhos ? "Ata possui empenhos vinculados" : "Sem empenhos vinculados"}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              background: hasEmpenhos ? '#e8f5e9' : '#f5f5f5', 
                              color: hasEmpenhos ? '#2e7d32' : '#bdbdbd', 
                              border: `1px solid ${hasEmpenhos ? '#a5d6a7' : '#e0e0e0'}`,
                              fontSize: '0.8rem'
                            }}
                          >
                            <DollarSign size={14} />
                          </span>

                          {/* Allocation Icon */}
                          <span 
                            title={hasAllocations ? "Quantitativos do gerenciador alocados internamente" : "Sem alocação interna realizada"}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              background: hasAllocations ? '#e3f2fd' : '#f5f5f5', 
                              color: hasAllocations ? '#1565c0' : '#bdbdbd', 
                              border: `1px solid ${hasAllocations ? '#90caf9' : '#e0e0e0'}`,
                              fontSize: '0.8rem'
                            }}
                          >
                            <Users size={14} />
                          </span>
                        </div>
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
