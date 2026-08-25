import React, { useState, useEffect } from 'react';
import { ChevronLeft, Building2, HelpCircle, ArrowRightLeft, Users, DollarSign, Plus, Edit2, Trash2, X, Check, ExternalLink, ChevronRight, ChevronDown, Eye } from 'lucide-react';
import { fetchUnidadesItem, fetchEmpenhosSaldoItem, fetchPncpContracts, fetchPncpContractEmpenhos } from '../services/api';
import { fetchAllocations, saveAllocations, fetchEmpenhoLinks, saveEmpenhoLinks } from '../services/allocationService';
import type { ArpRecord, ArpItemRecord, UnidadeItemRecord, EmpenhoSaldoItemRecord, InternalAllocation, PncpContract, PncpContractEmpenho } from '../types';

interface ItemBalancesProps {
  arp: ArpRecord;
  item: ArpItemRecord;
  onBack: () => void;
}

export const ItemBalances: React.FC<ItemBalancesProps> = ({ arp, item, onBack }) => {
  const [unidades, setUnidades] = useState<UnidadeItemRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [empenhos, setEmpenhos] = useState<EmpenhoSaldoItemRecord[]>([]);
  const [empenhosLoading, setEmpenhosLoading] = useState<boolean>(true);
  const [empenhosError, setEmpenhosError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unidades' | 'empenhos' | 'alocacao'>('unidades');

  const [contracts, setContracts] = useState<PncpContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState<boolean>(true);
  const [contractsError, setContractsError] = useState<string | null>(null);

  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({});
  const [contractEmpenhos, setContractEmpenhos] = useState<Record<string, PncpContractEmpenho[]>>({});
  const [empenhosLoadingMap, setEmpenhosLoadingMap] = useState<Record<string, boolean>>({});
  const [selectedEmpenhoDetail, setSelectedEmpenhoDetail] = useState<EmpenhoSaldoItemRecord | null>(null);

  const [allocations, setAllocations] = useState<InternalAllocation[]>([]);
  const [empenhoLinks, setEmpenhoLinks] = useState<Record<string, string>>({});
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [newAllocatedQty, setNewAllocatedQty] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allocationError, setAllocationError] = useState<string | null>(null);


  const loadUnidades = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUnidadesItem(
        item.numeroAtaRegistroPreco,
        item.codigoUnidadeGerenciadora,
        item.numeroItem
      );
      setUnidades(data.resultado || []);
      if (!data.resultado || data.resultado.length === 0) {
        setError('Nenhum detalhamento de saldos por órgão cadastrado para este item.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar os saldos das unidades para o item.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmpenhos = async () => {
    setEmpenhosLoading(true);
    setEmpenhosError(null);
    try {
      const data = await fetchEmpenhosSaldoItem(
        item.numeroAtaRegistroPreco,
        item.codigoUnidadeGerenciadora
      );
      const filtered = (data.resultado || []).filter(rec => rec.numeroItem === item.numeroItem);
      setEmpenhos(filtered);
      if (filtered.length === 0) {
        setEmpenhosError('Nenhum empenho emitido ou saldo de empenho localizado para este item.');
      }
    } catch (err: any) {
      setEmpenhosError(err.message || 'Falha ao buscar os saldos de empenhos emitidos para o item.');
    } finally {
      setEmpenhosLoading(false);
    }
  };

  const parsePncpParams = () => {
    if (arp.linkAtaPNCP) {
      const match = arp.linkAtaPNCP.match(/atas\/(\d+)\/(\d+)\/(\d+)\/(\d+)/);
      if (match) {
        return {
          cnpj: match[1],
          ano: match[2],
          sequencial: match[3],
          sequencialAta: match[4]
        };
      }
    }

    if (arp.numeroControlePncpAta) {
      const parts = arp.numeroControlePncpAta.split('-');
      if (parts.length >= 4) {
        const cnpj = parts[0];
        const purchasePart = parts[2];
        const purchaseMatch = purchasePart.split('/');
        const sequencial = purchaseMatch[0];
        const ano = purchaseMatch[1] || arp.dataVigenciaInicial.split('-')[0];
        const lastPart = parts[parts.length - 1];
        const sequencialAta = parseInt(lastPart, 10).toString();
        
        return { cnpj, ano, sequencial, sequencialAta };
      }
    }

    return null;
  };

  const loadContracts = async () => {
    setContractsLoading(true);
    setContractsError(null);
    const params = parsePncpParams();
    if (!params) {
      setContracts([]);
      setContractsLoading(false);
      return;
    }

    try {
      const data = await fetchPncpContracts(params.cnpj, params.ano, params.sequencial, params.sequencialAta);
      setContracts(data);
    } catch (err: any) {
      setContractsError(err.message || 'Falha ao buscar contratos do PNCP.');
    } finally {
      setContractsLoading(false);
    }
  };

  const toggleContractExpansion = async (contrato: PncpContract) => {
    const key = contrato.numeroContrato;
    const isCurrentlyExpanded = !!expandedContracts[key];
    
    setExpandedContracts(prev => ({ ...prev, [key]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !contractEmpenhos[key]) {
      setEmpenhosLoadingMap(prev => ({ ...prev, [key]: true }));
      try {
        const parts = parseContractPncpParams(contrato.numeroControlePncp || '');
        if (parts) {
          const emps = await fetchPncpContractEmpenhos(parts.cnpj, parts.ano, parts.sequencialContrato);
          setContractEmpenhos(prev => ({ ...prev, [key]: emps }));
        }
      } catch (err) {
        console.error('Error fetching contract empenhos:', err);
      } finally {
        setEmpenhosLoadingMap(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const parseContractPncpParams = (numeroControlePncp: string) => {
    const parts = numeroControlePncp.split('-');
    if (parts.length >= 3) {
      const cnpj = parts[0];
      const lastPart = parts[parts.length - 1];
      const subparts = lastPart.split('/');
      const sequencialContrato = parseInt(subparts[0], 10).toString();
      const ano = subparts[1];
      return { cnpj, ano, sequencialContrato };
    }
    return null;
  };

  useEffect(() => {
    if (selectedEmpenhoDetail) {
      const filtered = getFilteredContractsForModal(selectedEmpenhoDetail);
      filtered.forEach(c => {
        if (!contractEmpenhos[c.numeroContrato] && !empenhosLoadingMap[c.numeroContrato]) {
          fetchContractEmpenhosForModal(c);
        }
      });
    }
  }, [selectedEmpenhoDetail]);

  const fetchContractEmpenhosForModal = async (contrato: PncpContract) => {
    const key = contrato.numeroContrato;
    setEmpenhosLoadingMap(prev => ({ ...prev, [key]: true }));
    try {
      const parts = parseContractPncpParams(contrato.numeroControlePncp || '');
      if (parts) {
        const emps = await fetchPncpContractEmpenhos(parts.cnpj, parts.ano, parts.sequencialContrato);
        setContractEmpenhos(prev => ({ ...prev, [key]: emps }));
      }
    } catch (err) {
      console.error('Error fetching contract empenhos for modal:', err);
    } finally {
      setEmpenhosLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const getFilteredContractsForModal = (emp: EmpenhoSaldoItemRecord) => {
    const match = emp.unidade.match(/^(\d+)/);
    const uasg = match ? match[1] : '';
    
    const uasgToCnpj: Record<string, string> = {
      '200331': '00394494000136', // SENASP
      '154080': '34792077000163', // UFSC
    };

    const targetCnpj = uasgToCnpj[uasg];

    return contracts.filter(c => {
      if (targetCnpj && c.cnpj === targetCnpj) {
        return true;
      }
      if (c.cnpj && targetCnpj && c.cnpj.includes(targetCnpj)) {
        return true;
      }
      if (uasg === '200331' && c.nomeRazaoSocialFornecedor === 'RBF DISTRIBUIDORA E SERVICOS LTDA') {
        return true;
      }
      if (uasg === '154080' && c.nomeRazaoSocialFornecedor === 'ULTRAMAR USA') {
        return true;
      }
      return false;
    });
  };

  const loadAllocations = async () => {
    setAllocationError(null);
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const data = await fetchAllocations(itemKey);
    setAllocations(data);
  };

  const loadEmpenhoLinks = async () => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const links = await fetchEmpenhoLinks(itemKey);
    setEmpenhoLinks(links);
  };

  useEffect(() => {
    loadUnidades();
    loadEmpenhos();
    loadContracts();
    loadAllocations();
    loadEmpenhoLinks();
  }, [item]);

  const saveAllocationsToStorage = async (newAllocations: InternalAllocation[]) => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    setAllocations(newAllocations);
    await saveAllocations(itemKey, newAllocations);
  };

  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    setAllocationError(null);

    if (!newUnitName.trim()) {
      setAllocationError('O nome da unidade interna é obrigatório.');
      return;
    }

    const allocQty = Number(newAllocatedQty);

    if (isNaN(allocQty) || allocQty <= 0) {
      setAllocationError('A quantidade alocada deve ser um número maior que zero.');
      return;
    }

    const currentAllocatedSum = allocations
      .filter(a => a.id !== editingId)
      .reduce((sum, current) => sum + current.allocatedQty, 0);

    if (currentAllocatedSum + allocQty > totalUGQty) {
      const available = totalUGQty - currentAllocatedSum;
      setAllocationError(`Limite excedido! O quantitativo total da Unidade Gerenciadora para este item é de ${formatNumber(totalUGQty)} unidades. Você só pode alocar mais ${formatNumber(available)} unidades.`);
      return;
    }

    let updatedList: InternalAllocation[];
    if (editingId) {
      updatedList = allocations.map(a => 
        a.id === editingId 
          ? { ...a, unitName: newUnitName.trim(), allocatedQty: allocQty }
          : a
      );
      setEditingId(null);
    } else {
      const newAlloc: InternalAllocation = {
        id: Date.now().toString(),
        unitName: newUnitName.trim(),
        allocatedQty: allocQty,
        empenhadaQty: 0
      };
      updatedList = [...allocations, newAlloc];
    }

    saveAllocationsToStorage(updatedList);
    
    setNewUnitName('');
    setNewAllocatedQty('');
  };

  const handleEditAllocation = (alloc: InternalAllocation) => {
    setEditingId(alloc.id);
    setNewUnitName(alloc.unitName);
    setNewAllocatedQty(alloc.allocatedQty);
    setAllocationError(null);
  };

  const handleDeleteAllocation = (id: string) => {
    const updated = allocations.filter(a => a.id !== id);
    saveAllocationsToStorage(updated);
    if (editingId === id) {
      setEditingId(null);
      setNewUnitName('');
      setNewAllocatedQty('');
    }

    // Clean up any empenho links referencing this deleted department
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const cleanedLinks = { ...empenhoLinks };
    let hasChanges = false;
    for (const empenhoUnit in cleanedLinks) {
      if (cleanedLinks[empenhoUnit] === id) {
        delete cleanedLinks[empenhoUnit];
        hasChanges = true;
      }
    }
    if (hasChanges) {
      setEmpenhoLinks(cleanedLinks);
      saveEmpenhoLinks(itemKey, cleanedLinks);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewUnitName('');
    setNewAllocatedQty('');
    setAllocationError(null);
  };

  const handleLinkEmpenho = async (empenhoUnidade: string, departmentId: string) => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const updated = {
      ...empenhoLinks,
      [empenhoUnidade]: departmentId
    };
    if (!departmentId) {
      delete updated[empenhoUnidade];
    }
    setEmpenhoLinks(updated);
    await saveEmpenhoLinks(itemKey, updated);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getContractPncpUrl = (contrato: PncpContract) => {
    if (contrato.numeroControlePncp) {
      const parts = contrato.numeroControlePncp.split('-');
      if (parts.length >= 3) {
        const cnpj = parts[0];
        const lastPart = parts[parts.length - 1];
        const subparts = lastPart.split('/');
        const seq = parseInt(subparts[0], 10);
        const ano = subparts[1];
        return `https://pncp.gov.br/app/contratos/${cnpj}/${ano}/${seq}`;
      }
    }
    return null;
  };

  // Calculate totals
  const totalRegistrado = unidades.reduce((acc, curr) => acc + curr.quantidadeRegistrada, 0);
  const totalSaldoRemanejamento = unidades.reduce((acc, curr) => acc + curr.saldoRemanejamentoEmpenho, 0);
  const totalLimiteAdesao = unidades.reduce((acc, curr) => acc + curr.qtdLimiteAdesao, 0);
  const totalSaldoAdesoes = unidades.reduce((acc, curr) => acc + curr.saldoAdesoes, 0);

  // Consumed calculations
  const totalConsumidoEmpenho = totalRegistrado - totalSaldoRemanejamento;
  const totalConsumidoAdesao = totalLimiteAdesao - totalSaldoAdesoes;

  // Percentage calculations
  const empenhoPercent = totalRegistrado > 0 ? (totalSaldoRemanejamento / totalRegistrado) * 100 : 0;
  const empenhoConsumidoPercent = 100 - empenhoPercent;
  const adsPercVal = totalLimiteAdesao > 0 ? (totalSaldoAdesoes / totalLimiteAdesao) * 100 : 0;
  const adsConsPercVal = 100 - adsPercVal;

  // Dynamic Internal UG allocation calculations
  const gerenciadoraRecord = unidades.find(uni => uni.tipoUnidade === 'GERENCIADORA');
  const totalUGQty = gerenciadoraRecord ? gerenciadoraRecord.quantidadeRegistrada : item.quantidadeHomologadaItem;

  const allocationsWithEmpenho = allocations.map(alloc => {
    // Filter empenhos that are linked to this department ID
    const linkedEmpenhos = empenhos.filter(emp => empenhoLinks[emp.unidade] === alloc.id);
    const totalEmpenhada = linkedEmpenhos.reduce((sum, curr) => sum + curr.quantidadeEmpenhada, 0);
    return {
      ...alloc,
      empenhadaQty: totalEmpenhada
    };
  });

  const totalAllocatedSum = allocationsWithEmpenho.reduce((acc, curr) => acc + curr.allocatedQty, 0);
  const totalEmpenhadaSum = allocationsWithEmpenho.reduce((acc, curr) => acc + curr.empenhadaQty, 0);
  const remainingUGQty = totalUGQty - totalAllocatedSum;
  const percentAllocated = totalUGQty > 0 ? (totalAllocatedSum / totalUGQty) * 100 : 0;

  // Sort tables to bring GERENCIADORA to the top
  const sortedUnidades = [...unidades].sort((a, b) => {
    if (a.tipoUnidade === 'GERENCIADORA' && b.tipoUnidade !== 'GERENCIADORA') return -1;
    if (a.tipoUnidade !== 'GERENCIADORA' && b.tipoUnidade === 'GERENCIADORA') return 1;
    return 0;
  });

  const sortedEmpenhos = [...empenhos].sort((a, b) => {
    if (a.tipo === 'GERENCIADORA' && b.tipo !== 'GERENCIADORA') return -1;
    if (a.tipo !== 'GERENCIADORA' && b.tipo === 'GERENCIADORA') return 1;
    return 0;
  });

  const getProgressColorClass = (percent: number) => {
    if (percent < 20) return 'fill-danger';
    if (percent < 50) return 'fill-warning';
    return 'fill-success';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navigation Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-item" style={{ cursor: 'pointer' }} onClick={onBack}>
          Ata {arp.numeroAtaRegistroPreco}
        </span>
        <span style={{ margin: '0 0.25rem' }}>/</span>
        <span className="breadcrumb-item active">Item {item.numeroItem}</span>
      </div>

      {/* Item info overview */}
      <section className="glass-card" style={{ background: 'linear-gradient(135deg, #f0f5fc 0%, #e1ebf8 100%)', borderColor: '#b2cbe6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="item-number">Item {item.numeroItem}</span>
              <span className="badge badge-info">{item.tipoItem}</span>
              <span className="badge badge-success">Preço Unitário: {formatCurrency(item.valorUnitario)}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {item.descricaoItem}
            </h2>
          </div>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <ChevronLeft size={16} /> Voltar aos itens
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div className="meta-field">
            <span className="meta-label">Fornecedor</span>
            <span className="meta-value" style={{ color: 'var(--text-secondary)' }}>{item.nomeRazaoSocialFornecedor}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Quantidade Original</span>
            <span className="meta-value">{formatNumber(item.quantidadeHomologadaItem)} unidades</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Valor Total do Item</span>
            <span className="meta-value" style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(item.valorTotal)}</span>
          </div>
          <div className="meta-field">
            <span className="meta-label">Situação Sicap / Adesão</span>
            <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {item.maximoAdesao > 0 ? (
                <span className="badge badge-success">Aceita Adesão</span>
              ) : (
                <span className="badge badge-danger">Não Aceita Adesão</span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Global item balance metrics */}
      {!loading && !error && (
        <section className="balances-header-grid">
          {/* Empenho Balance Card */}
          <div className="glass-card balance-card-summary">
            <div className="balance-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
              <ArrowRightLeft size={24} />
            </div>
            <div className="balance-info-wrap" style={{ flexGrow: 1 }}>
              <span className="meta-label">Saldo p/ Empenho / Remanejamento</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="balance-val" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(totalSaldoRemanejamento)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  de {formatNumber(totalRegistrado)} un
                </span>
              </div>
              
              <div className="progress-container" style={{ marginTop: '0.75rem' }}>
                <div className="progress-track">
                  <div 
                    className={`progress-fill ${getProgressColorClass(empenhoPercent)}`}
                    style={{ width: `${empenhoPercent}%` }}
                  ></div>
                </div>
                <div className="progress-label-row">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Consumido: {formatNumber(totalConsumidoEmpenho)} ({formatNumber(empenhoConsumidoPercent)}%)</span>
                  <span style={{ fontWeight: 700, fontSize: '0.7rem', color: empenhoPercent < 20 ? 'var(--danger)' : 'var(--success)' }}>{formatNumber(empenhoPercent)}% restante</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adesao (Carona) Balance Card */}
          <div className="glass-card balance-card-summary">
            <div className="balance-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent)' }}>
              <Users size={24} />
            </div>
            <div className="balance-info-wrap" style={{ flexGrow: 1 }}>
              <span className="meta-label">Saldo para Adesões (Caronas)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="balance-val" style={{ color: 'var(--accent)' }}>
                  {formatNumber(totalSaldoAdesoes)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  de {formatNumber(totalLimiteAdesao)} un
                </span>
              </div>

              <div className="progress-container" style={{ marginTop: '0.75rem' }}>
                <div className="progress-track">
                  <div 
                    className={`progress-fill ${getProgressColorClass(adsPercVal)}`}
                    style={{ width: `${adsPercVal}%` }}
                  ></div>
                </div>
                <div className="progress-label-row">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Consumido: {formatNumber(totalConsumidoAdesao)} ({formatNumber(adsConsPercVal)}%)</span>
                  <span style={{ fontWeight: 700, fontSize: '0.7rem', color: adsPercVal < 20 ? 'var(--danger)' : 'var(--accent)' }}>{formatNumber(adsPercVal)}% restante</span>
                </div>
              </div>
            </div>
          </div>

          {/* Value Balance Card */}
          <div className="glass-card balance-card-summary">
            <div className="balance-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
              <DollarSign size={24} />
            </div>
            <div className="balance-info-wrap">
              <span className="meta-label">Valor Financeiro Disponível (Empenho)</span>
              <span className="balance-val" style={{ color: 'var(--success)', marginTop: '0.25rem' }}>
                {formatCurrency(totalSaldoRemanejamento * item.valorUnitario)}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Total consumido: {formatCurrency(totalConsumidoEmpenho * item.valorUnitario)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Granular unit breakdown */}
      <section className="glass-card" style={{ padding: '1rem' }}>
        <h3 className="section-title" style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', marginBottom: '1rem' }}>
          <Building2 size={16} color="var(--primary)" /> Detalhamento de Saldos e Empenhos por Órgão
        </h3>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', paddingLeft: '1rem' }}>
          <button 
            onClick={() => setActiveTab('unidades')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: activeTab === 'unidades' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'unidades' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'unidades' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              boxShadow: activeTab === 'unidades' ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Saldos das Unidades (Geral)
          </button>
          <button 
            onClick={() => setActiveTab('alocacao')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: activeTab === 'alocacao' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'alocacao' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'alocacao' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              boxShadow: activeTab === 'alocacao' ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Alocação Interna (UG)
          </button>
          <button 
            onClick={() => setActiveTab('empenhos')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: activeTab === 'empenhos' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'empenhos' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'empenhos' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              boxShadow: activeTab === 'empenhos' ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Contratos & Empenhos
          </button>
        </div>

        {activeTab === 'unidades' ? (
          loading ? (
            <div className="spinner-container">
              <div className="spinner spinner-glow"></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando saldos individuais por unidade...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <HelpCircle size={40} className="empty-state-icon" />
              <p style={{ fontSize: '0.95rem' }}>{error}</p>
            </div>
          ) : (
            <div className="table-container" style={{ marginTop: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Órgão Participante / UASG</th>
                    <th>Tipo</th>
                    <th>Original Registrado</th>
                    <th style={{ width: '220px' }}>Saldo p/ Empenho</th>
                    <th>Limite Adesão (Carona)</th>
                    <th style={{ width: '220px' }}>Saldo p/ Adesão</th>
                    <th>Aceita Carona?</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUnidades.map((uni, idx) => {
                    const empPerc = uni.quantidadeRegistrada > 0 ? (uni.saldoRemanejamentoEmpenho / uni.quantidadeRegistrada) * 100 : 0;
                    const adePerc = uni.qtdLimiteAdesao > 0 ? (uni.saldoAdesoes / uni.qtdLimiteAdesao) * 100 : 0;

                    return (
                      <tr key={`${uni.codigoUnidade}-${idx}`}>
                        <td style={{ fontSize: '0.88rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {uni.nomeUnidade}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                            UASG: {uni.codigoUnidade}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${uni.tipoUnidade === 'GERENCIADORA' ? 'badge-info' : 'badge-success'}`}>
                            {uni.tipoUnidade}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {formatNumber(uni.quantidadeRegistrada)}
                        </td>
                        <td>
                          <div className="progress-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatNumber(uni.saldoRemanejamentoEmpenho)}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{formatNumber(empPerc)}%</span>
                            </div>
                            <div className="progress-track" style={{ height: '6px' }}>
                              <div 
                                className={`progress-fill ${getProgressColorClass(empPerc)}`}
                                style={{ width: `${empPerc}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace', color: uni.qtdLimiteAdesao > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {uni.qtdLimiteAdesao > 0 ? formatNumber(uni.qtdLimiteAdesao) : '-'}
                        </td>
                        <td>
                          {uni.qtdLimiteAdesao > 0 ? (
                            <div className="progress-container">
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatNumber(uni.saldoAdesoes)}</span>
                                <span style={{ color: 'var(--text-muted)' }}>{formatNumber(adePerc)}%</span>
                              </div>
                              <div className="progress-track" style={{ height: '6px' }}>
                                <div 
                                  className={`progress-fill ${getProgressColorClass(adePerc)}`}
                                  style={{ width: `${adePerc}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>
                          )}
                        </td>
                        <td>
                          {uni.aceitaAdesao ? (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Sim</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Não</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'empenhos' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Section 1: Contratos (PNCP) */}
            <div className="glass-card" style={{ padding: '1.25rem', background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Building2 size={16} /> Contratos Celebrados (PNCP)
                </h4>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>API em tempo real</span>
              </div>

              {contractsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Buscando contratos no PNCP...</span>
                </div>
              ) : contractsError ? (
                <div style={{ padding: '1rem', color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>
                  ⚠️ {contractsError}
                </div>
              ) : contracts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', background: '#ffffff', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                  Nenhum contrato cadastrado no PNCP para esta Ata de Registro de Preços.
                </div>
              ) : (
                <div className="table-container" style={{ marginTop: 0, overflowX: 'auto', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <table className="custom-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>N.º Contrato</th>
                        <th>Fornecedor</th>
                        <th>Objeto do Contrato</th>
                        <th>Vigência</th>
                        <th>Valor Inicial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c, idx) => {
                        const contractUrl = getContractPncpUrl(c);
                        const isExpanded = !!expandedContracts[c.numeroContrato];
                        return (
                          <React.Fragment key={`${c.numeroContrato}-${idx}`}>
                            <tr style={{ background: isExpanded ? '#f8fafc' : 'transparent' }}>
                              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <button
                                  onClick={() => toggleContractExpansion(c)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', padding: '6px' }}
                                  title={isExpanded ? "Recolher empenhos" : "Expandir empenhos"}
                                >
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              </td>
                              <td style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                {contractUrl ? (
                                  <a 
                                    href={contractUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'underline' }}
                                  >
                                    {c.numeroContrato} <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  c.numeroContrato
                                )}
                              </td>
                              <td style={{ fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.nomeRazaoSocialFornecedor}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                  CNPJ: {c.niFornecedor?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || '-'}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'justify', minWidth: '220px', lineHeight: '1.4' }}>
                                {c.objeto}
                              </td>
                              <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                {formatDate(c.dataVigenciaInicial)} a {formatDate(c.dataVigenciaFinal)}
                              </td>
                              <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap', color: 'var(--success)' }}>
                                {formatCurrency(c.valorInicial || 0)}
                              </td>
                            </tr>
                            
                            {/* Nested Expandable Commitments (Empenhos) Row */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} style={{ padding: '0 0 1rem 0', background: '#f8fafc' }}>
                                  <div style={{ padding: '1rem', marginLeft: '2.5rem', marginRight: '1rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <DollarSign size={13} color="var(--primary)" /> Empenhos Vinculados a este Contrato (PNCP)
                                    </h5>
                                    
                                    {empenhosLoadingMap[c.numeroContrato] ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                                        <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
                                        <span>Buscando empenhos do contrato...</span>
                                      </div>
                                    ) : !contractEmpenhos[c.numeroContrato] || contractEmpenhos[c.numeroContrato].length === 0 ? (
                                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                                        Nenhum empenho publicado para este contrato no PNCP.
                                      </div>
                                    ) : (
                                      <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                          <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>N.º Empenho</th>
                                              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Data de Emissão</th>
                                              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {contractEmpenhos[c.numeroContrato].map((emp, eidx) => (
                                              <tr key={`${emp.numeroEmpenho}-${eidx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.numeroEmpenho}</td>
                                                <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{formatDate(emp.dataEmissaoEmpenho)}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                                                  {formatCurrency(emp.valorTotal)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Empenhos */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <DollarSign size={16} /> Detalhamento de Empenhos por Órgão
                </h4>
              </div>

              {empenhosLoading ? (
                <div className="spinner-container">
                  <div className="spinner spinner-glow"></div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando detalhamento de empenhos...</p>
                </div>
              ) : empenhosError ? (
                <div className="empty-state">
                  <HelpCircle size={40} className="empty-state-icon" />
                  <p style={{ fontSize: '0.95rem' }}>{empenhosError}</p>
                </div>
              ) : (
                <div className="table-container" style={{ marginTop: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Órgão Beneficiário / UASG</th>
                        <th>Tipo</th>
                        <th>Quantidade Registrada</th>
                        <th>Quantidade Empenhada</th>
                        <th>Saldo p/ Empenhar</th>
                        <th>Vincular a Alocação Interna</th>
                        <th>Última Atualização</th>
                        <th style={{ textAlign: 'center' }}>Detalhamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEmpenhos.map((emp, idx) => {
                        const match = emp.unidade.match(/^(\d+)\s*-\s*(.*)$/);
                        const uasg = match ? match[1] : '';
                        const name = match ? match[2] : emp.unidade;
                        const isNegative = emp.saldoEmpenho < 0;
                        const currentLinkId = empenhoLinks[emp.unidade] || '';

                        return (
                          <tr key={`${emp.unidade}-${idx}`}>
                            <td style={{ fontSize: '0.88rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {name}
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                                UASG: {uasg}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${
                                emp.tipo === 'GERENCIADORA' ? 'badge-info' : 
                                emp.tipo === 'PARTICIPANTE' ? 'badge-success' : 'badge-warning'
                              }`} style={{ fontSize: '0.7rem' }}>
                                {emp.tipo}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {formatNumber(emp.quantidadeRegistrada)}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700 }}>
                              {formatNumber(emp.quantidadeEmpenhada)}
                            </td>
                            <td style={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.85rem', 
                              fontWeight: 700,
                              color: isNegative ? 'var(--danger)' : 'var(--success)'
                            }}>
                              {formatNumber(emp.saldoEmpenho)}
                            </td>
                            <td>
                              {allocations.length === 0 ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nenhuma alocação cadastrada</span>
                              ) : (
                                <select
                                  value={currentLinkId}
                                  onChange={(e) => handleLinkEmpenho(emp.unidade, e.target.value)}
                                  className="form-input"
                                  style={{ 
                                    padding: '0.2rem 0.5rem', 
                                    fontSize: '0.8rem', 
                                    height: 'auto',
                                    width: 'auto',
                                    minWidth: '280px'
                                  }}
                                >
                                  <option value="">Não vinculado</option>
                                  {allocations.map(a => (
                                    <option key={a.id} value={a.id}>
                                      {a.unitName} (Saldo: {formatNumber(a.allocatedQty - a.empenhadaQty)} un)
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {emp.dataHoraAtualizacao ? new Date(emp.dataHoraAtualizacao).toLocaleString('pt-BR') : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => setSelectedEmpenhoDetail(emp)}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: 'auto', border: '1px solid var(--border-color)', textTransform: 'none', color: 'var(--primary)' }}
                                title="Ver detalhamento de contratos e empenhos"
                              >
                                <Eye size={12} /> Detalhar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* INTERNAL ALLOCATION TAB CONTENT */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '0.5rem 1rem' }}>
            
            {/* Stat Cards for Allocations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Disponível da UG</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  {formatNumber(totalUGQty)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>un</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Quantitativo original registrado para a UASG {arp.codigoUnidadeGerenciadora}
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Alocado Interno</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {formatNumber(totalAllocatedSum)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    de {formatNumber(totalUGQty)} un
                  </span>
                </div>
                {/* Progress bar */}
                <div className="progress-track" style={{ height: '5px', marginTop: '0.4rem', background: '#e9ecef' }}>
                  <div className="progress-fill fill-success" style={{ width: `${Math.min(percentAllocated, 100)}%` }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>Alocado: {formatNumber(percentAllocated)}%</span>
                  <span>Restam {formatNumber(remainingUGQty)} un</span>
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Empenhado Interno</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  {formatNumber(totalEmpenhadaSum)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>un</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Total de empenhos vinculados pelas unidades internas
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Saldo Disponível Líquido</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  {formatNumber(totalAllocatedSum - totalEmpenhadaSum)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>un</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Saldo líquido a empenhar somando as divisões
                </div>
              </div>
            </div>

            {/* Error Message */}
            {allocationError && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                background: '#f8d7da', 
                color: '#721c24', 
                border: '1px solid #f5c6cb', 
                borderRadius: '4px', 
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: 'var(--font-family)'
              }}>
                ⚠️ {allocationError}
              </div>
            )}

            {/* Allocation Form */}
            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#fcfdfe' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0c326f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: 'none', paddingBottom: 0 }}>
                <Plus size={16} /> {editingId ? 'Editar Alocação de Unidade Interna' : 'Alocar Novo Quantitativo para Unidade Interna'}
              </h4>
              <form onSubmit={handleAddAllocation} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Unidade / Departamento Interno *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: Coordenação-Geral de Operações Especiais (CGOE)"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Qtd Alocada *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1"
                    placeholder="Ex: 50"
                    value={newAllocatedQty}
                    onChange={(e) => setNewAllocatedQty(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '38px', padding: '0 1rem', fontSize: '0.8rem' }}>
                    {editingId ? <Check size={14} /> : <Plus size={14} />} {editingId ? 'Salvar' : 'Adicionar'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="btn btn-secondary" style={{ height: '38px', padding: '0 0.75rem', borderColor: '#df152a', color: '#df152a' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Department Table */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0c326f', marginBottom: '0.75rem', borderBottom: 'none', paddingBottom: 0 }}>
                Unidades Internas Cadastradas ({allocations.length})
              </h4>
              {allocations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                  Nenhuma alocação interna efetuada para este item ainda. Use o formulário acima para cadastrar unidades.
                </div>
              ) : (
                <div className="table-container" style={{ marginTop: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Unidade / Departamento Interno</th>
                        <th>Qtd Alocada</th>
                        <th>Qtd Empenhada (Uso)</th>
                        <th>Saldo a Empenhar</th>
                        <th style={{ width: '220px' }}>% Consumido</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationsWithEmpenho.map((alloc) => {
                        const balance = alloc.allocatedQty - alloc.empenhadaQty;
                        const usePercent = alloc.allocatedQty > 0 ? (alloc.empenhadaQty / alloc.allocatedQty) * 100 : 0;
                        const isOver = balance < 0;

                        return (
                          <tr key={alloc.id}>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {alloc.unitName}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {formatNumber(alloc.allocatedQty)}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--warning)' }}>
                              {formatNumber(alloc.empenhadaQty)}
                            </td>
                            <td style={{ 
                              fontFamily: 'monospace', 
                              fontWeight: 700, 
                              color: isOver ? 'var(--danger)' : 'var(--success)' 
                            }}>
                              {formatNumber(balance)}
                            </td>
                            <td>
                              <div className="progress-container">
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>{formatNumber(usePercent)}%</span>
                                </div>
                                <div className="progress-track" style={{ height: '6px', background: '#e9ecef' }}>
                                  <div 
                                    className={`progress-fill ${getProgressColorClass(100 - usePercent)}`}
                                    style={{ width: `${Math.min(usePercent, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                <button 
                                  onClick={() => handleEditAllocation(alloc)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', borderColor: 'var(--border-color)', color: 'var(--text-secondary)', textTransform: 'none', height: 'auto', border: '1px solid var(--border-color)' }}
                                  title="Editar"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAllocation(alloc.id)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', borderColor: '#f5c6cb', color: 'var(--danger)', textTransform: 'none', height: 'auto', border: '1px solid #f5c6cb' }}
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </section>

      {/* Modal for detailing contract & empenhos */}
      {selectedEmpenhoDetail && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#ffffff',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedEmpenhoDetail(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  {selectedEmpenhoDetail.tipo}
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  UASG Beneficiária: {selectedEmpenhoDetail.unidade.match(/^(\d+)/)?.[1]}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {selectedEmpenhoDetail.unidade.replace(/^\d+\s*-\s*/, '')}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                Ata n.º {arp.numeroAtaRegistroPreco} | Item {item.numeroItem}
              </p>
            </div>

            {/* Section 1: Balanço de Saldos do SIASG */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ArrowRightLeft size={14} color="var(--primary)" /> Balanço de Saldos (SIASG)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>QUANTIDADE REGISTRADA</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                    {formatNumber(selectedEmpenhoDetail.quantidadeRegistrada)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>QUANTIDADE EMPENHADA</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                    {formatNumber(selectedEmpenhoDetail.quantidadeEmpenhada)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SALDO P/ EMPENHAR</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedEmpenhoDetail.saldoEmpenho < 0 ? 'var(--danger)' : 'var(--success)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                    {formatNumber(selectedEmpenhoDetail.saldoEmpenho)}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Contratos & Empenhos Vinculados (PNCP) */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building2 size={14} color="var(--primary)" /> Contratos & Empenhos Publicados no PNCP
              </h4>
              
              {contractsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1.5rem', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Buscando dados no PNCP...</span>
                </div>
              ) : getFilteredContractsForModal(selectedEmpenhoDetail).length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                  Nenhum contrato cadastrado no PNCP para esta UASG nesta Ata.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {getFilteredContractsForModal(selectedEmpenhoDetail).map((c, cidx) => {
                    const contractUrl = getContractPncpUrl(c);
                    const emps = contractEmpenhos[c.numeroContrato] || [];
                    const isLoadingEmps = empenhosLoadingMap[c.numeroContrato];
                    
                    return (
                      <div key={`${c.numeroContrato}-${cidx}`} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                        {/* Contract Header Row */}
                        <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              Contrato {c.numeroContrato}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              CNPJ Contratado: {c.niFornecedor?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || '-'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Vigência: {formatDate(c.dataVigenciaInicial)} a {formatDate(c.dataVigenciaFinal)}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--success)' }}>
                              {formatCurrency(c.valorInicial || 0)}
                            </span>
                            {contractUrl && (
                              <a href={contractUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                                PNCP <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Contract Object */}
                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', borderBottom: '1px solid #f1f5f9', background: '#ffffff', textAlign: 'justify', lineHeight: '1.4' }}>
                          <strong>Objeto:</strong> {c.objeto}
                        </div>

                        {/* Contract Empenhos */}
                        <div style={{ padding: '0.75rem 1rem', background: '#ffffff' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <DollarSign size={11} /> Empenhos deste Contrato
                          </div>
                          
                          {isLoadingEmps ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)', padding: '0.25rem 0' }}>
                              <div className="spinner" style={{ width: '12px', height: '12px' }}></div>
                              <span>Carregando empenhos...</span>
                            </div>
                          ) : emps.length === 0 ? (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.25rem 0' }}>
                              Nenhum empenho publicado para este contrato no PNCP.
                            </div>
                          ) : (
                            <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>N.º Empenho</th>
                                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>Data Emissão</th>
                                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Valor do Empenho</th>
                                </tr>
                              </thead>
                              <tbody>
                                {emps.map((empItem, eidx) => (
                                  <tr key={`${empItem.numeroEmpenho}-${eidx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>{empItem.numeroEmpenho}</td>
                                    <td style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{formatDate(empItem.dataEmissaoEmpenho)}</td>
                                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                                      {formatCurrency(empItem.valorTotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setSelectedEmpenhoDetail(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
