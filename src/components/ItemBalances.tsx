import React, { useState, useEffect } from 'react';
import { ChevronLeft, Building2, HelpCircle, ArrowRightLeft, Users, DollarSign, Plus, Edit2, Trash2, X, Check, ExternalLink, ChevronRight, ChevronDown, Share2 } from 'lucide-react';
import { fetchUnidadesItem, fetchEmpenhosSaldoItem, fetchPncpContracts, fetchPncpContractEmpenhos, fetchAdesoesItem, fetchContratosGovEmpenhos, fetchContratoEmpenhoDetalhe, fetchContratosGovData, getCanonicalContractKey } from '../services/api';
import { fetchAllocations, saveAllocations, fetchEmpenhoLinks, saveEmpenhoLinks, fetchEmpenhoManualQuantities, saveEmpenhoManualQuantities } from '../services/allocationService';
import { cacheArpsInDb, cacheArpItemsInDb } from '../services/dbCacheService';
import { fetchDepartments, type InternalDepartment } from '../services/unitService';
import { ManageDepartmentsModal } from './ManageDepartmentsModal';
import { formatPncpContractUrl } from '../utils/pncpUtils';
import type { ArpRecord, ArpItemRecord, UnidadeItemRecord, EmpenhoSaldoItemRecord, InternalAllocation, PncpContract, PncpContractEmpenho, AdesaoItemRecord, ContratosGovEmpenhoRecord } from '../types';

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
  const [activeTab, setActiveTab] = useState<'unidades' | 'empenhos' | 'alocacao' | 'adesoes'>('unidades');

  const [adesoes, setAdesoes] = useState<AdesaoItemRecord[]>([]);
  const [adesoesLoading, setAdesoesLoading] = useState<boolean>(true);
  const [adesoesError, setAdesoesError] = useState<string | null>(null);

  const [contracts, setContracts] = useState<PncpContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState<boolean>(true);
  const [contractsError, setContractsError] = useState<string | null>(null);

  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({});
  const [contractEmpenhos, setContractEmpenhos] = useState<Record<string, PncpContractEmpenho[]>>({});
  const [contractGovEmpenhos, setContractGovEmpenhos] = useState<Record<string, ContratosGovEmpenhoRecord[]>>({});
  const [empenhosLoadingMap, setEmpenhosLoadingMap] = useState<Record<string, boolean>>({});
  const [selectedEmpenhoDetail, setSelectedEmpenhoDetail] = useState<EmpenhoSaldoItemRecord | null>(null);

  const [allocations, setAllocations] = useState<InternalAllocation[]>([]);
  const [empenhoLinks, setEmpenhoLinks] = useState<Record<string, string>>({});
  const [empenhoManualQuantities, setEmpenhoManualQuantities] = useState<Record<string, number>>({});
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [newAllocatedQty, setNewAllocatedQty] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // Cadastro de Unidades Oficiais
  const [departments, setDepartments] = useState<InternalDepartment[]>([]);
  const [isManageDepsModalOpen, setIsManageDepsModalOpen] = useState<boolean>(false);

  const getFirstAvailableUnitSigla = (
    deps: InternalDepartment[],
    allocs: InternalAllocation[],
    excludeId: string | null = null
  ): string => {
    const allocatedUnits = new Set(
      allocs
        .filter(a => a.id !== excludeId)
        .map(a => a.unitName.trim().toLowerCase())
    );
    const available = deps.find(d => !allocatedUnits.has(d.sigla.trim().toLowerCase()));
    return available ? available.sigla : (deps[0]?.sigla || '');
  };

  const loadDepartments = async () => {
    const deps = await fetchDepartments();
    setDepartments(deps);
    if (deps.length > 0 && !newUnitName) {
      setNewUnitName(getFirstAvailableUnitSigla(deps, allocations, editingId));
    }
  };


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
    try {
      const data = await fetchEmpenhosSaldoItem(
        item.numeroAtaRegistroPreco,
        item.codigoUnidadeGerenciadora
      );
      const targetItemNum = parseInt(item.numeroItem, 10);
      const filtered = (data.resultado || []).filter(rec => {
        const recItemNum = parseInt(rec.numeroItem, 10);
        return recItemNum === targetItemNum || rec.numeroItem === item.numeroItem;
      });
      setEmpenhos(filtered);
    } catch (err: any) {
      console.warn('Erro ao buscar saldos de empenhos:', err);
    }
  };

  const loadAdesoes = async () => {
    setAdesoesLoading(true);
    setAdesoesError(null);
    try {
      const data = await fetchAdesoesItem(
        item.numeroAtaRegistroPreco,
        item.codigoUnidadeGerenciadora,
        item.numeroItem
      );
      const targetItemNum = parseInt(item.numeroItem, 10);
      const filtered = (data.resultado || []).filter(rec => {
        const recItemNum = parseInt(rec.numeroItem, 10);
        return recItemNum === targetItemNum || rec.numeroItem === item.numeroItem || (!rec.numeroItem);
      });
      setAdesoes(filtered);
      if (filtered.length === 0) {
        setAdesoesError('Nenhuma adesão (carona) externa registrada para este item no Compras.gov.br.');
      }
    } catch (err: any) {
      setAdesoesError(err.message || 'Falha ao buscar as adesões do item.');
    } finally {
      setAdesoesLoading(false);
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

    // Extrai sequencial da ata diretamente (ex: "00003/2026" -> sequencialAta = "3")
    const ataMatch = (arp.numeroAtaRegistroPreco || '').split('/');
    if (ataMatch.length === 2 && !isNaN(parseInt(ataMatch[0], 10))) {
      const isSenasp = arp.codigoUnidadeGerenciadora === '200331';
      return {
        cnpj: isSenasp ? '00394494000136' : '',
        ano: ataMatch[1] || arp.anoCompra || '2026',
        sequencial: arp.numeroCompra || '1',
        sequencialAta: parseInt(ataMatch[0], 10).toString()
      };
    }

    return null;
  };

  const loadContracts = async () => {
    setContractsLoading(true);
    setContractsError(null);
    const params = parsePncpParams();

    try {
      const cnpj = params?.cnpj || (arp.codigoUnidadeGerenciadora === '200331' || arp.codigoUnidadeGerenciadora === '200330' ? '00394494000136' : '');
      const ano = params?.ano || arp.anoCompra || '2026';
      const sequencial = params?.sequencial || arp.numeroCompra || '1';
      const sequencialAta = params?.sequencialAta || '';

      const fallbackParams = {
        codigoOrgao: arp.codigoOrgao,
        codigoUnidadeGestora: arp.codigoUnidadeGerenciadora,
        idCompra: arp.idCompra,
        numeroCompra: arp.numeroCompra,
        anoCompra: arp.anoCompra,
        codigoModalidadeCompra: arp.codigoModalidadeCompra,
        dataVigenciaInicial: arp.dataVigenciaInicial,
        numeroControlePncpCompra: arp.numeroControlePncpCompra
      };

      const fornecedorInfo = {
        niFornecedor: item.niFornecedor,
        nomeFornecedor: item.nomeRazaoSocialFornecedor
      };

      const data = await fetchPncpContracts(cnpj, ano, sequencial, sequencialAta, item.numeroItem, fallbackParams, fornecedorInfo);
      setContracts(data);

      // Carrega empenhos em background para todos os contratos e enriquece com dados oficiais
      data.forEach(async (c) => {
        const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncp);
        if (c.contratoId) {
          try {
            const rawGovEmps = await fetchContratosGovEmpenhos(c.contratoId);
            if (rawGovEmps && rawGovEmps.length > 0) {
              const govEmps = await enrichGovEmpenhosWithDetails(rawGovEmps, c.contratoId, c);
              setContractGovEmpenhos(prev => ({ 
                ...prev, 
                [c.numeroContrato]: govEmps,
                [canKey]: govEmps
              }));
            }
          } catch (e) {
            console.warn('Erro ao carregar empenhos do Contratos.gov.br:', e);
          }
        }
        if (c.cnpj && c.anoContrato && c.sequencialContrato) {
          try {
            const emps = await fetchPncpContractEmpenhos(c.cnpj, String(c.anoContrato), String(c.sequencialContrato));
            if (emps && emps.length > 0) {
              setContractEmpenhos(prev => ({
                ...prev,
                [c.numeroContrato]: emps,
                [canKey]: emps
              }));
            }
          } catch (e) {
            console.warn('Erro ao carregar empenhos do PNCP:', e);
          }
        }
      });
    } catch (err: any) {
      setContractsError(err.message || 'Falha ao buscar contratos do PNCP.');
    } finally {
      setContractsLoading(false);
    }
  };

  const enrichGovEmpenhosWithDetails = async (
    govEmps: ContratosGovEmpenhoRecord[],
    contratoId?: number,
    contratoObj?: PncpContract
  ): Promise<ContratosGovEmpenhoRecord[]> => {
    let contractItems: any[] = [];
    if (contratoId) {
      try {
        const itemsRes = await fetch(`/api-contratos-gov/api/contrato/${contratoId}/itens`);
        if (itemsRes.ok) {
          contractItems = await itemsRes.json();
        }
      } catch (e) {
        console.warn('Erro ao carregar itens do contrato:', contratoId, e);
      }
    }

    const targetItemNum = parseInt(item.numeroItem, 10);
    const matchedContractItem = Array.isArray(contractItems) ? contractItems.find((i: any) => {
      const numComp = parseInt(i.numero_item_compra || '0', 10);
      return numComp === targetItemNum;
    }) : undefined;

    const parseVal = (v: any) => {
      if (typeof v === 'number') return v;
      if (!v) return 0;
      const clean = String(v).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    };

    const enriched = await Promise.all(
      govEmps.map(async (emp) => {
        if (!emp.id && !emp.numero) return emp;
        let quantidadeFisica: number | undefined = undefined;
        let itensMinuta: any[] | undefined = undefined;

        // Fonte 1: Tenta consultar a minuta individual do empenho (/consultar/{id})
        if (emp.id) {
          try {
            const detalhe = await fetchContratoEmpenhoDetalhe(emp.id);
            if (detalhe && detalhe.itens_minuta) {
              itensMinuta = detalhe.itens_minuta;
              const matchedMinuta = detalhe.itens_minuta.find((i: any) => parseInt(i.numero_item_compra || '0', 10) === targetItemNum);
              if (matchedMinuta && typeof matchedMinuta.quantidade === 'number') {
                quantidadeFisica = matchedMinuta.quantidade;
              }
            }
          } catch (e) {
            // Ignora 401
          }
        }

        const valEmp = parseVal(emp.empenhado);

        // Fonte 2: Se a minuta individual der 401, usa os itens oficiais do Contrato (/api/contrato/{id}/itens)
        if (quantidadeFisica === undefined && matchedContractItem && typeof matchedContractItem.quantidade === 'number') {
          const itemValTotal = parseVal(matchedContractItem.valortotal || matchedContractItem.valor_total);
          const itemValUnit = parseVal(matchedContractItem.valorunitario || matchedContractItem.valor_unitario);

          if (itemValTotal > 0 && valEmp > 0 && Math.abs(valEmp - itemValTotal) < 1) {
            quantidadeFisica = matchedContractItem.quantidade;
          } else if (itemValUnit > 0 && valEmp > 0) {
            const calculatedQty = Math.round(valEmp / itemValUnit);
            if (calculatedQty > 0) {
              quantidadeFisica = calculatedQty;
            }
          } else if (govEmps.length === 1 || (contractItems && contractItems.length === 1)) {
            quantidadeFisica = matchedContractItem.quantidade;
          }
        }

        // Fonte 3: Utiliza a quantidadeContratada oficial já presente no contratoObj
        if (quantidadeFisica === undefined && contratoObj?.quantidadeContratada && contratoObj.quantidadeContratada > 0) {
          const unitVal = contratoObj.valorUnitarioItem || parseVal(item.valorUnitario);
          if (unitVal && unitVal > 0 && valEmp > 0) {
            const calcQty = Math.round(valEmp / unitVal);
            if (calcQty > 0) {
              quantidadeFisica = calcQty;
            }
          }
          if (quantidadeFisica === undefined && (govEmps.length === 1 || Math.abs(valEmp - parseVal(contratoObj.valorTotalItem)) < 1)) {
            quantidadeFisica = contratoObj.quantidadeContratada;
          }
        }

        return {
          ...emp,
          itens_minuta: itensMinuta,
          quantidadeFisicaOriginal: quantidadeFisica
        };
      })
    );
    return enriched;
  };

  const getEmpenhoQuantityInfo = (
    empKey: string, 
    emp?: ContratosGovEmpenhoRecord,
    manualQtdsMap: Record<string, number> = empenhoManualQuantities
  ): { qty: number; isManual: boolean; isOfficial: boolean } => {
    // Prioridade 1: Quantidade Oficial retornada pela API (itens_minuta)
    if (emp?.quantidadeFisicaOriginal !== undefined && emp.quantidadeFisicaOriginal !== null) {
      return { qty: emp.quantidadeFisicaOriginal, isManual: false, isOfficial: true };
    }
    if (emp?.itens_minuta && emp.itens_minuta.length > 0) {
      const targetItemNum = parseInt(item.numeroItem, 10);
      const match = emp.itens_minuta.find((i: any) => parseInt(i.numero_item_compra || '0', 10) === targetItemNum);
      if (match && typeof match.quantidade === 'number') {
        return { qty: match.quantidade, isManual: false, isOfficial: true };
      }
    }
    // Prioridade 2: Preenchimento manual pelo usuário se a API não retornou dados
    if (manualQtdsMap[empKey] !== undefined) {
      return { qty: manualQtdsMap[empKey], isManual: true, isOfficial: false };
    }
    return { qty: 0, isManual: false, isOfficial: false };
  };

  const toggleContractExpansion = async (contrato: PncpContract) => {
    const key = contrato.numeroContrato;
    const canKey = getCanonicalContractKey(contrato.numeroContrato, contrato.anoContrato, contrato.numeroControlePncp);
    const isCurrentlyExpanded = !!expandedContracts[key] || !!expandedContracts[canKey];
    
    setExpandedContracts(prev => ({ 
      ...prev, 
      [key]: !isCurrentlyExpanded,
      [canKey]: !isCurrentlyExpanded 
    }));

    if (!isCurrentlyExpanded && !contractGovEmpenhos[key] && !contractGovEmpenhos[canKey] && !contractEmpenhos[key] && !contractEmpenhos[canKey]) {
      setEmpenhosLoadingMap(prev => ({ ...prev, [key]: true, [canKey]: true }));
      try {
        let govEmpsLoaded = false;
        if (contrato.contratoId) {
          const rawGovEmps = await fetchContratosGovEmpenhos(contrato.contratoId);
          if (rawGovEmps && rawGovEmps.length > 0) {
            const govEmps = await enrichGovEmpenhosWithDetails(rawGovEmps, contrato.contratoId, contrato);
            setContractGovEmpenhos(prev => ({ ...prev, [key]: govEmps, [canKey]: govEmps }));
            govEmpsLoaded = true;
          }
        }
        if (!govEmpsLoaded && contrato.uasg) {
          const govData = await fetchContratosGovData(contrato.uasg, contrato.numeroContrato, contrato.anoContrato, ['200331', '200330', contrato.uasg]);
          if (govData.contratoId) {
            contrato.contratoId = govData.contratoId;
            const rawGovEmps = await fetchContratosGovEmpenhos(govData.contratoId);
            if (rawGovEmps && rawGovEmps.length > 0) {
              const govEmps = await enrichGovEmpenhosWithDetails(rawGovEmps, govData.contratoId, contrato);
              setContractGovEmpenhos(prev => ({ ...prev, [key]: govEmps, [canKey]: govEmps }));
              govEmpsLoaded = true;
            }
          }
        }
        if (contrato.cnpj && contrato.anoContrato && contrato.sequencialContrato) {
          const emps = await fetchPncpContractEmpenhos(contrato.cnpj, String(contrato.anoContrato), String(contrato.sequencialContrato));
          if (emps && emps.length > 0) {
            setContractEmpenhos(prev => ({ ...prev, [key]: emps, [canKey]: emps }));
          }
        }
      } catch (err) {
        console.error('Error fetching contract empenhos:', err);
      } finally {
        setEmpenhosLoadingMap(prev => ({ ...prev, [key]: false, [canKey]: false }));
      }
    }
  };

  useEffect(() => {
    if (selectedEmpenhoDetail) {
      const filtered = getFilteredContractsForModal(selectedEmpenhoDetail);
      filtered.forEach(c => {
        const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncp);
        if (!contractGovEmpenhos[c.numeroContrato] && !contractGovEmpenhos[canKey] && !contractEmpenhos[c.numeroContrato] && !contractEmpenhos[canKey] && !empenhosLoadingMap[c.numeroContrato] && !empenhosLoadingMap[canKey]) {
          fetchContractEmpenhosForModal(c);
        }
      });
    }
  }, [selectedEmpenhoDetail]);

  const fetchContractEmpenhosForModal = async (contrato: PncpContract) => {
    const key = contrato.numeroContrato;
    const canKey = getCanonicalContractKey(contrato.numeroContrato, contrato.anoContrato, contrato.numeroControlePncp);
    setEmpenhosLoadingMap(prev => ({ ...prev, [key]: true, [canKey]: true }));
    try {
      if (contrato.contratoId) {
        const rawGovEmps = await fetchContratosGovEmpenhos(contrato.contratoId);
        if (rawGovEmps && rawGovEmps.length > 0) {
          const govEmps = await enrichGovEmpenhosWithDetails(rawGovEmps, contrato.contratoId, contrato);
          setContractGovEmpenhos(prev => ({ ...prev, [key]: govEmps, [canKey]: govEmps }));
        }
      }
      if (contrato.cnpj && contrato.anoContrato && contrato.sequencialContrato) {
        const emps = await fetchPncpContractEmpenhos(contrato.cnpj, String(contrato.anoContrato), String(contrato.sequencialContrato));
        if (emps && emps.length > 0) {
          setContractEmpenhos(prev => ({ ...prev, [key]: emps, [canKey]: emps }));
        }
      }
    } catch (err) {
      console.error('Error fetching contract empenhos for modal:', err);
    } finally {
      setEmpenhosLoadingMap(prev => ({ ...prev, [key]: false, [canKey]: false }));
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

    if (!targetCnpj) return contracts;

    return contracts.filter(c => {
      if (c.cnpj === targetCnpj) {
        return true;
      }
      if (c.cnpj && c.cnpj.includes(targetCnpj)) {
        return true;
      }
      return false;
    });
  };

  const loadAllocations = async () => {
    setAllocationError(null);
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const rawData = await fetchAllocations(itemKey);

    // Consolidar alocações duplicadas com o mesmo nome de unidade se existirem
    const mapByUnitName = new Map<string, InternalAllocation>();
    const remappedIds = new Map<string, string>();
    let hasDuplicates = false;

    rawData.forEach(alloc => {
      const normalizedName = alloc.unitName.trim();
      const key = normalizedName.toLowerCase();
      if (!mapByUnitName.has(key)) {
        mapByUnitName.set(key, { ...alloc, unitName: normalizedName });
      } else {
        hasDuplicates = true;
        const main = mapByUnitName.get(key)!;
        remappedIds.set(alloc.id, main.id);
        main.allocatedQty += alloc.allocatedQty;
        main.empenhadaQty += alloc.empenhadaQty;
      }
    });

    const consolidated = Array.from(mapByUnitName.values());

    if (hasDuplicates) {
      await saveAllocations(itemKey, consolidated);

      if (remappedIds.size > 0) {
        const currentLinks = await fetchEmpenhoLinks(itemKey);
        let linksUpdated = false;
        const newLinks = { ...currentLinks };
        for (const empNum in newLinks) {
          const targetId = newLinks[empNum];
          if (remappedIds.has(targetId)) {
            newLinks[empNum] = remappedIds.get(targetId)!;
            linksUpdated = true;
          }
        }
        if (linksUpdated) {
          setEmpenhoLinks(newLinks);
          await saveEmpenhoLinks(itemKey, newLinks);
        }
      }
    }

    setAllocations(consolidated);
  };

  const loadEmpenhoLinks = async () => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const links = await fetchEmpenhoLinks(itemKey);
    setEmpenhoLinks(links);
    const manualQtds = await fetchEmpenhoManualQuantities(itemKey);
    setEmpenhoManualQuantities(manualQtds);
  };

  useEffect(() => {
    cacheArpsInDb([arp]);
    cacheArpItemsInDb(arp.numeroAtaRegistroPreco, arp.codigoUnidadeGerenciadora, [item]);
    loadUnidades();
    loadEmpenhos();
    loadContracts();
    loadAllocations();
    loadEmpenhoLinks();
    loadAdesoes();
    loadDepartments();
  }, [item]);

  const saveAllocationsToStorage = async (newAllocations: InternalAllocation[]) => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    setAllocations(newAllocations);
    await saveAllocations(itemKey, newAllocations);
  };

  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    setAllocationError(null);

    const fallbackUnit = getFirstAvailableUnitSigla(departments, allocations, editingId);
    const chosenUnit = (newUnitName || fallbackUnit).trim();

    if (!chosenUnit) {
      setAllocationError('Selecione uma unidade interna oficial.');
      return;
    }

    // Validação de duplicidade: não permitir alocar a mesma unidade mais de uma vez
    const isDuplicate = allocations.some(
      a => a.id !== editingId && a.unitName.trim().toLowerCase() === chosenUnit.toLowerCase()
    );

    if (isDuplicate) {
      setAllocationError(`A unidade "${chosenUnit}" já possui uma alocação cadastrada para este item. Edite a alocação existente na tabela abaixo ou selecione outra unidade.`);
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
          ? { ...a, unitName: chosenUnit, allocatedQty: allocQty }
          : a
      );
      setEditingId(null);
    } else {
      const newAlloc: InternalAllocation = {
        id: Date.now().toString(),
        unitName: chosenUnit,
        allocatedQty: allocQty,
        empenhadaQty: 0
      };
      updatedList = [...allocations, newAlloc];
    }

    saveAllocationsToStorage(updatedList);
    
    const nextAvailable = getFirstAvailableUnitSigla(departments, updatedList, null);
    setNewUnitName(nextAvailable);
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
      const nextAvailable = getFirstAvailableUnitSigla(departments, updated, null);
      setNewUnitName(nextAvailable);
      setNewAllocatedQty('');
    } else {
      const nextAvailable = getFirstAvailableUnitSigla(departments, updated, editingId);
      setNewUnitName(nextAvailable);
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
    const nextAvailable = getFirstAvailableUnitSigla(departments, allocations, null);
    setNewUnitName(nextAvailable);
    setNewAllocatedQty('');
    setAllocationError(null);
  };

  const handleUpdateEmpenhoQuantity = async (empKey: string, newQty: number) => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const updatedManual = {
      ...empenhoManualQuantities,
      [empKey]: Math.max(0, newQty)
    };
    setEmpenhoManualQuantities(updatedManual);
    await saveEmpenhoManualQuantities(itemKey, updatedManual);
    await recalculateAllocationsWithLinks(empenhoLinks, updatedManual);
  };

  const recalculateAllocationsWithLinks = async (
    linksMap: Record<string, string>,
    manualQtdsMap: Record<string, number> = empenhoManualQuantities
  ) => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;

    const updatedAllocations = allocations.map(alloc => {
      // 1. Empenhos do modulo-arp
      const linkedArpEmpenhos = empenhos.filter(emp => linksMap[emp.unidade] === alloc.id || (emp.numeroEmpenho && linksMap[emp.numeroEmpenho] === alloc.id));
      const totalArp = linkedArpEmpenhos.reduce((sum, curr) => sum + curr.quantidadeEmpenhada, 0);

      // 2. Empenhos do Contratos.gov.br (usa quantidade física oficial da API ou ajuste manual do usuário)
      let totalGov = 0;
      Object.entries(contractGovEmpenhos).forEach(([, emps]) => {
        emps.forEach(emp => {
          const empKey = emp.numero || String(emp.id);
          const isLinked = linksMap[emp.numero] === alloc.id || (emp.id && linksMap[String(emp.id)] === alloc.id);
          if (isLinked) {
            const info = getEmpenhoQuantityInfo(empKey, emp, manualQtdsMap);
            totalGov += info.qty;
          }
        });
      });

      return {
        ...alloc,
        empenhadaQty: totalArp + totalGov
      };
    });

    setAllocations(updatedAllocations);
    await saveAllocations(itemKey, updatedAllocations);
  };

  useEffect(() => {
    if (allocations.length > 0) {
      recalculateAllocationsWithLinks(empenhoLinks, empenhoManualQuantities);
    }
  }, [contractGovEmpenhos, empenhos, empenhoLinks, empenhoManualQuantities]);

  const handleLinkEmpenho = async (empenhoUnidade: string, departmentId: string) => {
    const itemKey = `${arp.numeroAtaRegistroPreco}-${arp.codigoUnidadeGerenciadora}-${item.numeroItem}`;
    const updatedLinks = {
      ...empenhoLinks,
      [empenhoUnidade]: departmentId
    };
    if (!departmentId) {
      delete updatedLinks[empenhoUnidade];
    }
    setEmpenhoLinks(updatedLinks);
    await saveEmpenhoLinks(itemKey, updatedLinks);

    await recalculateAllocationsWithLinks(updatedLinks, empenhoManualQuantities);
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
    return formatPncpContractUrl(
      contrato.numeroControlePncp,
      contrato.linkVisualizacao
    );
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
    // 1. Empenhos do modulo-arp (por unidade ou numeroEmpenho)
    const linkedArpEmpenhos = empenhos.filter(emp => empenhoLinks[emp.unidade] === alloc.id || (emp.numeroEmpenho && empenhoLinks[emp.numeroEmpenho] === alloc.id));
    const totalArpEmpenhada = linkedArpEmpenhos.reduce((sum, curr) => sum + curr.quantidadeEmpenhada, 0);

    // 2. Empenhos do Contratos.gov.br vinculados por numeroEmpenho ou ID
    let totalGovEmpenhada = 0;
    Object.entries(contractGovEmpenhos).forEach(([, emps]) => {
      emps.forEach(emp => {
        const empKey = emp.numero || String(emp.id);
        if (empenhoLinks[emp.numero] === alloc.id || (emp.id && empenhoLinks[String(emp.id)] === alloc.id)) {
          const info = getEmpenhoQuantityInfo(empKey, emp, empenhoManualQuantities);
          totalGovEmpenhada += info.qty;
        }
      });
    });

    return {
      ...alloc,
      empenhadaQty: totalArpEmpenhada + totalGovEmpenhada
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

  const totalAdesaoRegistrada = adesoes.reduce((acc, a) => acc + (Number(a.quantidadeRegistrada) || 0), 0);
  const totalAdesaoEmpenhada = adesoes.reduce((acc, a) => acc + (Number(a.quantidadeEmpenhada) || 0), 0);
  const totalAdesaoSaldo = adesoes.reduce((acc, a) => acc + (Number(a.saldoEmpenho) || 0), 0);
  const adesaoConsumidaPercent = totalAdesaoRegistrada > 0 ? (totalAdesaoEmpenhada / totalAdesaoRegistrada) * 100 : 0;

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
          <div 
            className="glass-card balance-card-summary" 
            onClick={() => setActiveTab('adesoes')}
            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            title="Clique para ver o detalhamento de caronas externas autorizadas"
          >
            <div className="balance-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent)' }}>
              <Users size={24} />
            </div>
            <div className="balance-info-wrap" style={{ flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="meta-label">Saldo para Adesões (Caronas)</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>Ver Caronas →</span>
              </div>
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
            Saldos dos Órgãos (Geral)
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
          <button 
            onClick={() => setActiveTab('adesoes')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: activeTab === 'adesoes' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'adesoes' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'adesoes' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              boxShadow: activeTab === 'adesoes' ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Share2 size={13} /> Adesões / Caronas (Endpoint 5)
            {adesoes.length > 0 && (
              <span style={{
                background: activeTab === 'adesoes' ? 'rgba(255,255,255,0.3)' : 'var(--accent)',
                color: '#fff',
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                fontWeight: 800
              }}>
                {adesoes.length}
              </span>
            )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Função auxiliar para renderizar cada seção de contratos */}
                  {[
                    {
                      title: 'Unidade Gestora (Gerenciadora)',
                      icon: <Building2 size={16} color="var(--primary)" />,
                      list: contracts.filter(c => {
                        const u = String(c.uasg || '').trim();
                        if (u === '200331' || u === '200330') return true;
                        if (c.tipoUnidade === 'GERENCIADORA') return true;
                        return false;
                      }),
                      badgeClass: 'badge-info',
                      badgeLabel: 'Órgão Gerenciador'
                    },
                    {
                      title: 'Participantes',
                      icon: <Users size={16} color="#0f766e" />,
                      list: contracts.filter(c => {
                        const u = String(c.uasg || '').trim();
                        if (u === '200331' || u === '200330') return false;
                        if (c.tipoUnidade === 'GERENCIADORA') return false;
                        return true;
                      }),
                      badgeClass: 'badge-success',
                      badgeLabel: 'Órgãos Participantes'
                    }
                  ].map((section, sidx) => (
                    <div key={`contract-sec-${sidx}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {section.icon} {section.title}
                        </div>
                        <span className={`badge ${section.badgeClass}`} style={{ fontSize: '0.72rem' }}>
                          {section.list.length} {section.list.length === 1 ? 'contrato' : 'contratos'}
                        </span>
                      </div>

                      {section.list.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: '#ffffff', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                          Nenhum contrato localizado para este grupo.
                        </div>
                      ) : (
                        <div className="table-container" style={{ marginTop: 0, overflowX: 'auto', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <table className="custom-table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Número do contrato</th>
                                <th>Órgão</th>
                                <th>Fornecedor</th>
                                <th>Quantidade contratada</th>
                                <th style={{ textAlign: 'center' }}>Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.list.map((c, idx) => {
                                const contractUrl = c.linkVisualizacao || getContractPncpUrl(c);
                                const canKey = getCanonicalContractKey(c.numeroContrato, c.anoContrato, c.numeroControlePncp);
                                const isExpanded = !!expandedContracts[c.numeroContrato] || !!expandedContracts[canKey];
                                const govEmps = contractGovEmpenhos[c.numeroContrato] || contractGovEmpenhos[canKey];
                                const pncpEmps = contractEmpenhos[c.numeroContrato] || contractEmpenhos[canKey];
                                const isLoadingEmps = !!empenhosLoadingMap[c.numeroContrato] || !!empenhosLoadingMap[canKey];

                                // 2 - Incluir ano depois do Número do Contrato
                                const displayNumeroContrato = (() => {
                                  const num = c.numeroContrato;
                                  if (!num) return '-';
                                  if (num.includes('/')) return num;
                                  if (/^\d{4}NE/i.test(num)) return num;
                                  return c.anoContrato ? `${num}/${c.anoContrato}` : num;
                                })();

                                // 3 - Incluir a UASG depois do Órgão
                                const isGer = section.title.includes('Gerenciadora');
                                const contractUasg = c.uasg || (isGer ? (arp.codigoUnidadeGerenciadora || '200331') : '');

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
                                      <td style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', color: '#0c326f' }}>
                                        {displayNumeroContrato}
                                      </td>
                                      <td style={{ fontSize: '0.85rem' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                          {c.orgaoNome || c.unidadeNome || arp.nomeOrgao || arp.nomeUnidadeGerenciadora || arp.codigoUnidadeGerenciadora}
                                          {contractUasg ? (
                                            <span style={{ marginLeft: '0.4rem', fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 600, background: '#eff6ff', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                              UASG: {contractUasg}
                                            </span>
                                          ) : null}
                                        </div>
                                        {c.unidadeNome && c.orgaoNome && c.unidadeNome !== c.orgaoNome && (
                                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{c.unidadeNome}</div>
                                        )}
                                      </td>
                                      <td style={{ fontSize: '0.82rem' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.nomeRazaoSocialFornecedor}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                          CNPJ: {c.niFornecedor?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || '-'}
                                        </div>
                                      </td>
                                      <td style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 700, color: c.quantidadeContratada != null ? 'var(--success)' : 'var(--text-muted)' }}>
                                        {c.quantidadeContratada != null ? (
                                          <span>{formatNumber(c.quantidadeContratada)}</span>
                                        ) : (
                                          <span style={{ fontSize: '0.76rem', fontWeight: 500, color: 'var(--text-muted)' }} title="Aguardando sincronização de dados abertos">
                                            N/D (Aguardando sincronização)
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        {contractUrl ? (
                                          <a 
                                            href={contractUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="btn btn-secondary"
                                            style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', height: 'auto', border: '1px solid var(--border-color)', color: 'var(--primary)' }}
                                            title="Visualizar contrato no portal oficial"
                                          >
                                            <ExternalLink size={14} /> Visualizar
                                          </a>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                                        )}
                                      </td>
                                    </tr>
                                    
                                    {/* Nested Expandable Commitments (Empenhos) Row */}
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={6} style={{ padding: '0 0 1rem 0', background: '#f8fafc' }}>
                                          <div style={{ padding: '1rem', marginLeft: '2.5rem', marginRight: '1rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                              <DollarSign size={14} color="var(--primary)" /> Empenhos Vinculados a este Contrato ({govEmps?.length || pncpEmps?.length || 0})
                                            </h5>
                                            
                                            {isLoadingEmps ? (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                                                <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
                                                <span>Buscando empenhos do contrato...</span>
                                              </div>
                                            ) : govEmps && govEmps.length > 0 ? (
                                              <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                                  <thead>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>N.º Empenho</th>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Órgão / UG</th>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '200px' }}>Unidade Interna</th>
                                                      <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '140px' }}>Qtd Física (Item)</th>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Data de Emissão</th>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Plano Interno / Natureza</th>
                                                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor Empenhado</th>
                                                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor a Liquidar</th>
                                                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor Liquidado</th>
                                                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor Pago</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {govEmps.map((emp, eidx) => {
                                                      const parseVal = (v: any) => {
                                                        if (typeof v === 'number') return v;
                                                        const n = parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.'));
                                                        return isNaN(n) ? 0 : n;
                                                      };
                                                      const currentLinkId = empenhoLinks[emp.numero] || (emp.id ? empenhoLinks[String(emp.id)] : '') || '';
                                                      const empKey = emp.numero || String(emp.id);
                                                      const qtyInfo = getEmpenhoQuantityInfo(empKey, emp);

                                                      return (
                                                        <tr key={`${emp.numero}-${eidx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0c326f', fontFamily: 'monospace' }}>{emp.numero}</td>
                                                          <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>
                                                            {c.orgaoNome || (emp.unidade_gestora ? `UASG ${emp.unidade_gestora}` : '-')}
                                                          </td>
                                                          <td style={{ padding: '6px 8px' }}>
                                                            {allocations.length === 0 ? (
                                                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Sem unidades cadastradas</span>
                                                            ) : (
                                                              <select
                                                                value={currentLinkId}
                                                                onChange={(e) => handleLinkEmpenho(emp.numero, e.target.value)}
                                                                className="form-input"
                                                                style={{
                                                                  padding: '0.2rem 0.4rem',
                                                                  fontSize: '0.75rem',
                                                                  height: 'auto',
                                                                  width: '100%',
                                                                  maxWidth: '220px',
                                                                  borderColor: currentLinkId ? 'var(--primary)' : '#cbd5e1',
                                                                  background: currentLinkId ? '#eff6ff' : '#ffffff',
                                                                  fontWeight: currentLinkId ? 600 : 400
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
                                                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                                              <input 
                                                                type="number"
                                                                min="0"
                                                                disabled={qtyInfo.isOfficial}
                                                                readOnly={qtyInfo.isOfficial}
                                                                className="form-input"
                                                                value={qtyInfo.qty}
                                                                onChange={(e) => {
                                                                  if (qtyInfo.isOfficial) return;
                                                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                                  handleUpdateEmpenhoQuantity(empKey, val);
                                                                }}
                                                                style={{
                                                                  width: '70px',
                                                                  padding: '0.15rem 0.3rem',
                                                                  fontSize: '0.78rem',
                                                                  textAlign: 'center',
                                                                  fontWeight: 700,
                                                                  color: qtyInfo.isOfficial ? '#15803d' : (qtyInfo.isManual ? '#b45309' : 'var(--text-primary)'),
                                                                  borderColor: qtyInfo.isOfficial ? '#86efac' : (qtyInfo.isManual ? '#f59e0b' : '#cbd5e1'),
                                                                  background: qtyInfo.isOfficial ? '#f0fdf4' : (qtyInfo.isManual ? '#fffbeb' : '#ffffff'),
                                                                  cursor: qtyInfo.isOfficial ? 'not-allowed' : 'text',
                                                                  opacity: qtyInfo.isOfficial ? 0.95 : 1
                                                                }}
                                                                title={qtyInfo.isOfficial ? 'Quantidade física oficial da API (Somente leitura)' : (qtyInfo.isManual ? 'Quantidade informada manualmente' : 'Informe a quantidade física deste empenho')}
                                                              />
                                                              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: qtyInfo.isOfficial ? '#15803d' : (qtyInfo.isManual ? '#b45309' : '#94a3b8') }}>
                                                                {qtyInfo.isOfficial ? 'Oficial' : (qtyInfo.isManual ? 'Manual' : 'un')}
                                                              </span>
                                                            </div>
                                                          </td>
                                                          <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{formatDate(emp.data_emissao)}</td>
                                                          <td style={{ padding: '6px 8px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                                            <div>{emp.planointerno || '-'}</div>
                                                            <div>{emp.naturezadespesa || ''}</div>
                                                          </td>
                                                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                                                            {formatCurrency(parseVal(emp.empenhado))}
                                                          </td>
                                                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--warning)', fontFamily: 'monospace' }}>
                                                            {formatCurrency(parseVal(emp.aliquidar))}
                                                          </td>
                                                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
                                                            {formatCurrency(parseVal(emp.liquidado))}
                                                          </td>
                                                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                                            {formatCurrency(parseVal(emp.pago))}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ) : pncpEmps && pncpEmps.length > 0 ? (
                                              <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                                  <thead>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>N.º Empenho</th>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Órgão / UG</th>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '200px' }}>Unidade Interna</th>
                                                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Data de Emissão</th>
                                                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor Total</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {pncpEmps.map((emp, eidx) => {
                                                      const currentLinkId = empenhoLinks[emp.numeroEmpenho] || '';
                                                      return (
                                                        <tr key={`${emp.numeroEmpenho}-${eidx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                          <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.numeroEmpenho}</td>
                                                          <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{c.orgaoNome || c.unidadeNome || '-'}</td>
                                                          <td style={{ padding: '6px 8px' }}>
                                                            {allocations.length === 0 ? (
                                                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Sem unidades cadastradas</span>
                                                            ) : (
                                                              <select
                                                                value={currentLinkId}
                                                                onChange={(e) => handleLinkEmpenho(emp.numeroEmpenho, e.target.value)}
                                                                className="form-input"
                                                                style={{
                                                                  padding: '0.2rem 0.4rem',
                                                                  fontSize: '0.75rem',
                                                                  height: 'auto',
                                                                  width: '100%',
                                                                  maxWidth: '220px',
                                                                  borderColor: currentLinkId ? 'var(--primary)' : '#cbd5e1',
                                                                  background: currentLinkId ? '#eff6ff' : '#ffffff',
                                                                  fontWeight: currentLinkId ? 600 : 400
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
                                                          <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{formatDate(emp.dataEmissaoEmpenho)}</td>
                                                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                                                            {formatCurrency(emp.valorTotal)}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ) : (
                                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                                                Nenhum empenho publicado para este contrato.
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
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : activeTab === 'alocacao' ? (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>
                      <Building2 size={13} style={{ marginRight: '4px' }} /> Unidade / Departamento Interno *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManageDepsModalOpen(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title="Cadastrar, editar ou mesclar diretorias oficiais"
                    >
                      ⚙️ Gerenciar Unidades
                    </button>
                  </div>
                  <select 
                    className="form-input" 
                    value={newUnitName || getFirstAvailableUnitSigla(departments, allocations, editingId)}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}
                    required
                  >
                    {departments.map(d => {
                      const isAllocated = allocations.some(
                        a => a.id !== editingId && a.unitName.trim().toLowerCase() === d.sigla.trim().toLowerCase()
                      );
                      return (
                        <option key={d.id} value={d.sigla} disabled={isAllocated}>
                          {d.sigla} — {d.nomeCompleto} {isAllocated ? ' (Já alocada)' : ''}
                        </option>
                      );
                    })}
                  </select>
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
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, height: '38px', padding: '0 1rem', fontSize: '0.8rem' }}
                    disabled={!editingId && departments.length > 0 && departments.every(d => allocations.some(a => a.unitName.trim().toLowerCase() === d.sigla.trim().toLowerCase()))}
                  >
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
        ) : (
          /* ADESOES / CARONAS EXTERNAS TAB CONTENT (ENDPOINT 5) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 1rem' }}>
            {/* Header / Context Banner */}
            <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Share2 size={16} /> Adesões / Caronas de Órgãos Não Participantes
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>Endpoint 5: 5_consultarAdesoesItem</span>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Art. 86 da Lei 14.133/21</span>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: 0, lineHeight: 1.5 }}>
                Este painel detalha as solicitações e autorizações de adesão (caronas) formalizadas por órgãos e entidades externas que não integraram inicialmente o processo licitatório. 
                Os limites legais da Lei 14.133/2021 estabelecem teto de até <strong>50%</strong> do quantitativo do item por órgão não participante e <strong>200% (2x)</strong> no total cumulativo da Ata.
              </p>
            </div>

            {/* Stat Cards for Caronas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Órgãos Solicitantes (Caronas)</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  {adesoes.length} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>órgãos</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Entidades com carona autorizada/registrada
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Autorizado para Caronas</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {formatNumber(totalAdesaoRegistrada)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    de {formatNumber(item.maximoAdesao || (item.quantidadeHomologadaItem * 2))} máx
                  </span>
                </div>
                <div className="progress-track" style={{ height: '5px', marginTop: '0.4rem', background: '#e9ecef' }}>
                  <div className="progress-fill fill-info" style={{ width: `${Math.min((totalAdesaoRegistrada / (item.maximoAdesao || (item.quantidadeHomologadaItem * 2) || 1)) * 100, 100)}%` }}></div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Limite máximo global permitido: {formatNumber(item.maximoAdesao || (item.quantidadeHomologadaItem * 2))} un
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Empenhado por Caronas</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  {formatNumber(totalAdesaoEmpenhada)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>un</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Consumo: {formatNumber(adesaoConsumidaPercent)}% da cota concedida
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span className="meta-label" style={{ fontSize: '0.7rem' }}>Saldo Concedido Não Empenhado</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  {formatNumber(totalAdesaoSaldo || (totalAdesaoRegistrada - totalAdesaoEmpenhada))} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>un</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Equivalente a {formatCurrency((totalAdesaoSaldo || (totalAdesaoRegistrada - totalAdesaoEmpenhada)) * item.valorUnitario)}
                </div>
              </div>
            </div>

            {/* Adesões Data Table */}
            {adesoesLoading ? (
              <div className="spinner-container" style={{ padding: '2rem' }}>
                <div className="spinner spinner-glow"></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Consultando adesões de carona no Compras.gov.br (Endpoint 5)...</p>
              </div>
            ) : adesoes.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem 1.5rem', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <Share2 size={40} className="empty-state-icon" style={{ opacity: 0.4, color: 'var(--primary)' }} />
                <h4 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Nenhuma Carona Externa Registrada</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto' }}>
                  {adesoesError || `Nenhum órgão não participante solicitou ou teve autorização de adesão registrada para o Item ${item.numeroItem} no módulo oficial do Compras.gov.br.`}
                </p>
              </div>
            ) : (
              <div className="table-container" style={{ marginTop: 0, overflowX: 'auto', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <table className="custom-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Órgão Não Participante (Carona)</th>
                      <th>Tipo de Vínculo</th>
                      <th>Qtd. Concedida / Registrada</th>
                      <th style={{ width: '220px' }}>Qtd. Empenhada</th>
                      <th>Saldo p/ Empenho</th>
                      <th>Data do Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adesoes.map((ade, idx) => {
                      const empQtd = ade.quantidadeEmpenhada || 0;
                      const regQtd = ade.quantidadeRegistrada || 0;
                      const saldoQtd = ade.saldoEmpenho ?? (regQtd - empQtd);
                      const consPerc = regQtd > 0 ? (empQtd / regQtd) * 100 : 0;

                      return (
                        <tr key={`ade-${ade.unidade}-${idx}`}>
                          <td style={{ fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 700, color: '#0c326f' }}>
                              {ade.orgaoAdesao || (ade.unidade ? `UASG ${ade.unidade}` : 'Órgão Solicitante')}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {ade.unidade ? `UASG: ${ade.unidade}` : ''}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                              {ade.tipo || 'NÃO PARTICIPANTE (CARONA)'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {formatNumber(regQtd)} un
                          </td>
                          <td>
                            <div className="progress-container">
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatNumber(empQtd)}</span>
                                <span style={{ color: 'var(--text-muted)' }}>{formatNumber(consPerc)}%</span>
                              </div>
                              <div className="progress-track" style={{ height: '6px', background: '#e9ecef' }}>
                                <div 
                                  className={`progress-fill ${getProgressColorClass(100 - consPerc)}`}
                                  style={{ width: `${Math.min(consPerc, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: saldoQtd > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {formatNumber(saldoQtd)} un
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {ade.dataHoraInclusao ? formatDate(ade.dataHoraInclusao) : ade.dataHoraAtualizacao ? formatDate(ade.dataHoraAtualizacao) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* Modal de Gestão Central de Unidades Oficiais */}
      <ManageDepartmentsModal
        isOpen={isManageDepsModalOpen}
        onClose={() => {
          setIsManageDepsModalOpen(false);
          loadDepartments();
          loadAllocations();
        }}
        onDepartmentsUpdated={() => {
          loadDepartments();
          loadAllocations();
        }}
      />
    </div>
  );
};
