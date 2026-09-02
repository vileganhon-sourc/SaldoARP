import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, FileText, Building2, HelpCircle, DollarSign, Users, TrendingUp, BarChart2, ArrowUpRight } from 'lucide-react';
import { fetchArps, fetchArpItems, fetchArpItemsBatch, enrichArpsBatchWithPncpVigencia } from '../services/api';
import { fetchAtasWithEmpenhosSet, fetchAtasWithAllocationsSet } from '../services/dbCacheService';
import type { ArpRecord, ArpItemRecord, FilterParams } from '../types';
import { AtaCard } from './cards/AtaCard';
import { AtaCardSkeleton } from './cards/AtaCardSkeleton';
import { groupArpsAndItems } from '../utils/ataGrouping';

interface ArpSearchProps {
  onSelectArp: (arp: ArpRecord) => void;
  onSelectItem?: (arp: ArpRecord, item: ArpItemRecord) => void;
  onOpenAllocationsPanel?: () => void;
}

export const ArpSearch: React.FC<ArpSearchProps> = ({ onSelectArp, onSelectItem, onOpenAllocationsPanel }) => {
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
  const [itemsByAta, setItemsByAta] = useState<Record<string, ArpItemRecord[]>>({});
  const [itemsLoadingByAta, setItemsLoadingByAta] = useState<Record<string, boolean>>({});
  const [empenhosDbSet, setEmpenhosDbSet] = useState<Set<string>>(new Set());
  const [allocationsDbSet, setAllocationsDbSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDbSets = async () => {
    try {
      const [empSet, allocSet] = await Promise.all([
        fetchAtasWithEmpenhosSet(),
        fetchAtasWithAllocationsSet()
      ]);
      setEmpenhosDbSet(empSet);
      setAllocationsDbSet(allocSet);
    } catch (e) {
      console.warn('Erro ao carregar conjuntos do DB', e);
    }
  };

  const loadItemsForArps = async (arpsList: ArpRecord[]) => {
    if (!arpsList || arpsList.length === 0) return;

    const toFetch = arpsList.filter(arp => {
      const key = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}`;
      return itemsByAta[key] === undefined && !itemsLoadingByAta[key];
    });

    if (toFetch.length === 0) return;

    setItemsLoadingByAta(prev => {
      const next = { ...prev };
      toFetch.forEach(a => {
        next[`${a.numeroAtaRegistroPreco}-${a.codigoUnidadeGerenciadora}`] = true;
      });
      return next;
    });

    await Promise.allSettled(
      toFetch.map(async (arp) => {
        const key = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}`;
        try {
          const res = await fetchArpItems(
            arp.dataVigenciaInicial,
            arp.codigoUnidadeGerenciadora,
            arp.numeroAtaRegistroPreco
          );
          setItemsByAta(prev => ({
            ...prev,
            [key]: res.resultado || []
          }));
        } catch (err) {
          console.warn(`Erro ao carregar itens da Ata ${key}`, err);
          setItemsByAta(prev => ({
            ...prev,
            [key]: []
          }));
        } finally {
          setItemsLoadingByAta(prev => ({
            ...prev,
            [key]: false
          }));
        }
      })
    );
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!params.dataVigenciaInicialMin || !params.dataVigenciaInicialMax) {
      setError('As datas de início de vigência mínima e máxima são obrigatórias.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [data, batchItems] = await Promise.all([
        fetchArps(params),
        fetchArpItemsBatch(params)
      ]);
      const results = data.resultado || [];
      setArps(results);
      setItemsByAta(batchItems);
      if (results.length === 0) {
        setError('Nenhuma Ata encontrada para os filtros especificados.');
      } else {
        // Enriquecer em segundo plano a vigência oficial das Atas com o PNCP
        enrichArpsBatchWithPncpVigencia(results, (updated) => setArps(updated)).catch((e) => {
          console.warn('Erro na sincronização de vigência PNCP em segundo plano:', e);
        });
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar as Atas de Registro de Preço na API.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically trigger search on mount to load initial list
  useEffect(() => {
    loadDbSets();
    handleSearch();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  };

  // Helper to check allocations and empenho links in Supabase and localStorage for indicators
  const checkAtaStatus = (numeroAta: string, uasg: string) => {
    const keyPadded = `${numeroAta}-${uasg}`;
    const keyUnpadded = `${numeroAta.replace(/^0+/, '')}-${uasg}`;
    const parts = numeroAta.split('/');
    const shortKey = parts.length === 2 ? `${parseInt(parts[0], 10)}/${parts[1]}-${uasg}` : keyPadded;

    let hasAllocations = allocationsDbSet.has(keyPadded) || allocationsDbSet.has(keyUnpadded) || allocationsDbSet.has(shortKey);
    let hasEmpenhos = empenhosDbSet.has(keyPadded) || empenhosDbSet.has(keyUnpadded) || empenhosDbSet.has(shortKey);

    if (!hasEmpenhos) {
      for (const item of empenhosDbSet) {
        if (item.includes(uasg) && (item.includes(numeroAta) || item.includes(shortKey) || item.includes(keyUnpadded))) {
          hasEmpenhos = true;
          break;
        }
      }
    }

    if (!hasAllocations) {
      for (const item of allocationsDbSet) {
        if (item.includes(uasg) && (item.includes(numeroAta) || item.includes(shortKey) || item.includes(keyUnpadded))) {
          hasAllocations = true;
          break;
        }
      }
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

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('saldoarp-allocations-')) {
          const storedAllocations = JSON.parse(localStorage.getItem(key) || '[]');
          if (storedAllocations.length > 0) {
            const keyParts = key.split('-');
            const numeroItem = keyParts[keyParts.length - 1] || '';
            const uasg = keyParts[keyParts.length - 2] || '';
            
            const ataParts = keyParts.slice(2, keyParts.length - 2);
            let numeroAta = ataParts.join('-');
            
            if (!numeroAta.includes('/') && numeroAta.length > 5) {
              const lastHyphenIndex = numeroAta.lastIndexOf('-');
              if (lastHyphenIndex !== -1) {
                numeroAta = numeroAta.substring(0, lastHyphenIndex) + '/' + numeroAta.substring(lastHyphenIndex + 1);
              }
            }

            const isAtaInFilteredList = filteredList.some(
              arp => arp.numeroAtaRegistroPreco === numeroAta && arp.codigoUnidadeGerenciadora === uasg
            );

            if (!isAtaInFilteredList) {
              continue;
            }

            let unitPrice = 0;
            const metaStored = localStorage.getItem(`saldoarp-item-meta-${numeroAta}-${numeroItem}`);
            if (metaStored) {
              try {
                unitPrice = JSON.parse(metaStored).valorUnitario || 0;
              } catch {
                // Ignorar erro
              }
            }

            storedAllocations.forEach((alloc: any) => {
              itemsAlocados.add(`${numeroAta}-${numeroItem}`);
              const empQty = alloc.empenhadaQty || 0;

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
      const isExpired = !!(arp.isCanceladaPncp || new Date(arp.dataVigenciaFinal) < new Date());
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

  // Automatically trigger loading items for processed ARPs
  useEffect(() => {
    if (processedArps.length > 0) {
      loadItemsForArps(processedArps);
    }
  }, [processedArps]);

  // Group ARPs and Items by ATA + FORNECEDOR
  const groupedCards = useMemo(() => {
    return groupArpsAndItems(processedArps, itemsByAta);
  }, [processedArps, itemsByAta]);

  // Calculate statistics for KPIs
  const kpis = getInternalAllocationsKPIs(processedArps);
  const totalGeralValue = processedArps.reduce((sum, arp) => sum + arp.valorTotal, 0);
  const totalGeralItems = processedArps.reduce((sum, arp) => sum + arp.quantidadeItens, 0);

  // Estimating 50% of the total values belongs originally to the UG
  const totalUGRegisteredValue = totalGeralValue * 0.50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Management Dashboard KPIs Section */}
      <section className="kpi-grid">
        
        {/* KPI 1: Geral (All Registered) */}
        <div className="kpi-card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="kpi-header primary">
            <BarChart2 size={16} /> Registrado Geral (Todas as UASGs)
          </div>
          <div className="kpi-value">
            {formatCurrency(totalGeralValue)}
          </div>
          <div className="kpi-footer">
            <div>
              <strong>Nº de Atas:</strong>
              <div className="kpi-footer-val">{processedArps.length}</div>
            </div>
            <div>
              <strong>Qtd de Itens:</strong>
              <div className="kpi-footer-val">{totalGeralItems}</div>
            </div>
          </div>
        </div>

        {/* KPI 2: Gerenciador (UG) */}
        <div className="kpi-card" style={{ borderTop: '4px solid var(--primary-hover)' }}>
          <div className="kpi-header primary">
            <Building2 size={16} /> Registrado Gerenciador (UG)
          </div>
          <div className="kpi-value">
            {formatCurrency(totalUGRegisteredValue)}
          </div>
          <div className="kpi-footer">
            <div>
              <strong>Nº de Atas:</strong>
              <div className="kpi-footer-val">{processedArps.length}</div>
            </div>
            <div>
              <strong>Qtd de Itens:</strong>
              <div className="kpi-footer-val">{totalGeralItems}</div>
            </div>
          </div>
        </div>

        {/* KPI 3: Unidades Internas (Allocations) */}
        <div className="kpi-card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="kpi-header primary">
            <Users size={16} /> Alocado Unidades Internas
          </div>
          <div className="kpi-value">
            {formatCurrency(kpis.totalAllocatedValue)}
          </div>
          <div className="kpi-footer">
            <div>
              <strong>Unidades Alocadas:</strong>
              <div className="kpi-footer-val">{kpis.departments.length}</div>
            </div>
            <div>
              <strong>Qtd Total Itens:</strong>
              <div className="kpi-footer-val">{formatNumber(kpis.totalAllocatedQty)} un</div>
            </div>
          </div>
        </div>

        {/* KPI 4: Saldo por Unidade Interna */}
        <div 
          className="kpi-card" 
          style={{ 
            borderTop: '4px solid var(--success)', 
            cursor: onOpenAllocationsPanel ? 'pointer' : 'default' 
          }}
          onClick={onOpenAllocationsPanel}
          title={onOpenAllocationsPanel ? 'Clique para abrir o Painel de Unidades Internas' : undefined}
        >
          <div className="kpi-header success" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={16} /> Saldo Unidades Internas
            </div>
            {onOpenAllocationsPanel && (
              <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                Ver Painel <ArrowUpRight size={13} />
              </span>
            )}
          </div>
          
          <div className="kpi-value">
            {formatNumber(Math.max(0, kpis.totalAllocatedQty - kpis.totalEmpenhadaQty))} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>un</span>
          </div>

          {/* Mini Barra de Progresso de Disponibilidade */}
          <div style={{ marginTop: '0.45rem', marginBottom: '0.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>Disponibilidade</span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                {kpis.totalAllocatedQty > 0 
                  ? `${Math.round((Math.max(0, kpis.totalAllocatedQty - kpis.totalEmpenhadaQty) / kpis.totalAllocatedQty) * 100)}% livre` 
                  : '100% livre'}
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  backgroundColor: 'var(--success)', 
                  borderRadius: '9999px',
                  width: `${kpis.totalAllocatedQty > 0 ? Math.min(100, Math.round((Math.max(0, kpis.totalAllocatedQty - kpis.totalEmpenhadaQty) / kpis.totalAllocatedQty) * 100)) : 100}%`,
                  transition: 'width 0.4s ease'
                }} 
              />
            </div>
          </div>

          <div className="kpi-footer">
            <div>
              <strong>Unidades Ativas:</strong>
              <div className="kpi-footer-val">{kpis.departments.length} {kpis.departments.length === 1 ? 'Diretoria' : 'Diretorias'}</div>
            </div>
            <div>
              <strong>Itens com Saldo:</strong>
              <div className="kpi-footer-val">{kpis.uniqueItemsCount} {kpis.uniqueItemsCount === 1 ? 'Item' : 'Itens'}</div>
            </div>
          </div>
        </div>

      </section>

      {/* Search Filter Card */}
      <section className="comprassusp-filter-card">
        <div className="filter-header">
          <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
            <Search size={20} color="var(--primary)" /> Filtrar Atas de Registro de Preços
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Campos marcados com * são obrigatórios para busca na API
          </span>
        </div>

        <form onSubmit={handleSearch} className="filter-body">
          {/* Grupo 1: Identificadores (3 Colunas / 33% cada) */}
          <fieldset className="filter-row grid-3-cols">
            <div className="form-group">
              <label className="form-label">
                <Building2 size={14} style={{ marginRight: '4px' }} /> Unidade Gerenciadora (UASG)
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
                <FileText size={14} style={{ marginRight: '4px' }} /> Número da Ata
              </label>
              <input 
                type="text" 
                className="form-input"
                placeholder="Ex: 00064/2024"
                value={params.numeroAtaRegistroPreco || ''}
                onChange={(e) => setParams({ ...params, numeroAtaRegistroPreco: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Users size={14} style={{ marginRight: '4px' }} /> Alocação Interna
              </label>
              <select
                className="form-input"
                value={filterAlocacao}
                onChange={(e) => setFilterAlocacao(e.target.value as any)}
                style={{ fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="TODAS">Todas</option>
                <option value="SIM">Com Alocação</option>
                <option value="NAO">Sem Alocação</option>
              </select>
            </div>
          </fieldset>

          {/* Grupo 2: Temporalidade (3 Colunas / 33% cada) */}
          <fieldset className="filter-row grid-3-cols">
            <div className="form-group">
              <label className="form-label">
                <Calendar size={14} style={{ marginRight: '4px' }} /> Vigência Inicial (Mínima) *
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
                <Calendar size={14} style={{ marginRight: '4px' }} /> Vigência Inicial (Máxima) *
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
                <Calendar size={14} style={{ marginRight: '4px' }} /> Vigência (Status)
              </label>
              <select
                className="form-input"
                value={filterVigencia}
                onChange={(e) => setFilterVigencia(e.target.value as any)}
                style={{ fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="TODAS">Todas</option>
                <option value="VIGENTE">Vigente</option>
                <option value="EXPIRADA">Expirada</option>
              </select>
            </div>
          </fieldset>

          {/* Grupo 3: Situação (2 Colunas / 50% cada) */}
          <fieldset className="filter-row grid-2-cols">
            <div className="form-group">
              <label className="form-label">
                <DollarSign size={14} style={{ marginRight: '4px' }} /> Empenho Vinculado
              </label>
              <select
                className="form-input"
                value={filterEmpenho}
                onChange={(e) => setFilterEmpenho(e.target.value as any)}
                style={{ fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="TODAS">Todas</option>
                <option value="SIM">Com Empenho</option>
                <option value="NAO">Sem Empenho</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FileText size={14} style={{ marginRight: '4px' }} /> Status da Ata
              </label>
              <select
                className="form-input"
                value={filterStatusAta}
                onChange={(e) => setFilterStatusAta(e.target.value)}
                style={{ fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="TODAS">Todas</option>
                <option value="Ata de Registro de Preços">Ativa (Ata de Registro de Preços)</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </fieldset>

          {/* Barra de Ações */}
          <div className="filter-actions">
            <button 
              type="button" 
              onClick={() => {
                setParams({
                  dataVigenciaInicialMin: '2024-01-01',
                  dataVigenciaInicialMax: '2028-08-21',
                  codigoUnidadeGerenciadora: '200331',
                  numeroAtaRegistroPreco: ''
                });
                setFilterVigencia('TODAS');
                setFilterAlocacao('TODAS');
                setFilterEmpenho('TODAS');
                setFilterStatusAta('TODAS');
              }}
              className="btn btn-secondary"
            >
              Limpar Filtros
            </button>

            <button 
              type="submit" 
              className="btn btn-primary"
            >
              <Search size={18} /> CONSULTAR
            </button>
          </div>
        </form>
      </section>

      {/* Results Section */}
      <section className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ padding: '0 0.5rem 1rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0c326f', margin: 0 }}>
            Resultados ({processedArps.length} Atas)
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            {groupedCards.length} {groupedCards.length === 1 ? 'card' : 'cards'} (Ata + Fornecedor)
          </span>
        </div>

        {loading ? (
          <div className="ata-cards-container" aria-busy="true" aria-label="Carregando atas...">
            <AtaCardSkeleton />
            <AtaCardSkeleton />
            <AtaCardSkeleton />
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
          <div className="ata-cards-container" role="feed" aria-label="Lista de Atas de Registro de Preços e Fornecedores">
            {groupedCards.map((card) => {
              const ataKey = `${card.arp.numeroAtaRegistroPreco}-${card.arp.codigoUnidadeGerenciadora}`;
              const isCardLoading = !!itemsLoadingByAta[ataKey];

              return (
                <AtaCard
                  key={card.key}
                  card={card}
                  isLoading={isCardLoading}
                  onSelectArp={onSelectArp}
                  onSelectItem={(arp, item) => {
                    if (onSelectItem) {
                      onSelectItem(arp, item);
                    } else {
                      onSelectArp(arp);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
