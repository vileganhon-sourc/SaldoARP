export interface ArpResponse {
  resultado: ArpRecord[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}

export interface ArpRecord {
  numeroAtaRegistroPreco: string;
  codigoUnidadeGerenciadora: string;
  nomeUnidadeGerenciadora: string;
  codigoOrgao: number;
  nomeOrgao: string;
  linkAtaPNCP?: string;
  linkCompraPNCP?: string;
  numeroCompra: string;
  anoCompra: string;
  codigoModalidadeCompra: string;
  nomeModalidadeCompra: string;
  dataAssinatura: string;
  dataVigenciaInicial: string;
  dataVigenciaFinal: string;
  valorTotal: number;
  statusAta: string;
  objeto: string;
  quantidadeItens: number;
  dataHoraAtualizacao: string;
  dataHoraInclusao: string;
  dataHoraExclusao: string | null;
  ataExcluido: boolean;
  numeroControlePncpAta: string;
  numeroControlePncpCompra: string;
  idCompra: string;
}

export interface ArpItemsResponse {
  resultado: ArpItemRecord[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}

export interface ArpItemRecord {
  numeroAtaRegistroPreco: string;
  codigoUnidadeGerenciadora: string;
  numeroCompra: string;
  anoCompra: string;
  codigoModalidadeCompra: string;
  dataAssinatura: string;
  dataVigenciaInicial: string;
  dataVigenciaFinal: string;
  numeroItem: string;
  codigoItem: number;
  descricaoItem: string;
  tipoItem: string;
  quantidadeHomologadaItem: number;
  classificacaoFornecedor: string;
  niFornecedor: string;
  nomeRazaoSocialFornecedor: string;
  quantidadeHomologadaVencedor: number;
  valorUnitario: number;
  valorTotal: number;
  maximoAdesao: number;
  nomeUnidadeGerenciadora: string;
  nomeModalidadeCompra: string;
  idCompra: string;
  numeroControlePncpCompra: string;
  dataHoraInclusao: string;
  dataHoraAtualizacao: string;
  dataHoraExclusao: string | null;
  itemExcluido: boolean;
  numeroControlePncpAta: string;
  codigoPdm: number;
  nomePdm: string;
}

export interface UnidadesItemResponse {
  resultado: UnidadeItemRecord[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}

export interface UnidadeItemRecord {
  numeroAta: string;
  unidadeGerenciadora: string;
  numeroItem: string;
  codigoPdm: string;
  descricaoItem: string;
  fornecedor: string;
  quantidadeRegistrada: number;
  saldoAdesoes: number;
  saldoRemanejamentoEmpenho: number;
  qtdLimiteAdesao: number;
  qtdLimiteInformadoCompra: number;
  aceitaAdesao: boolean;
  dataHoraInclusao: string;
  dataHoraAtualizacao: string;
  dataHoraExclusao: string | null;
  codigoUnidade: string;
  nomeUnidade: string;
  tipoUnidade: string;
}

export interface FilterParams {
  dataVigenciaInicialMin: string;
  dataVigenciaInicialMax: string;
  codigoUnidadeGerenciadora?: string;
  numeroAtaRegistroPreco?: string;
}

export interface EmpenhosSaldoItemResponse {
  resultado: EmpenhoSaldoItemRecord[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}

export interface EmpenhoSaldoItemRecord {
  numeroItem: string;
  unidade: string;
  tipo: string;
  quantidadeRegistrada: number;
  quantidadeEmpenhada: number;
  saldoEmpenho: number;
  dataHoraInclusao: string | null;
  dataHoraAtualizacao: string;
}

export interface InternalAllocation {
  id: string;
  unitName: string;
  allocatedQty: number;
  empenhadaQty: number;
}

export interface PncpContract {
  numeroContrato: string;
  cnpj?: string;
  anoContrato?: number;
  sequencialContrato?: number;
  objeto?: string;
  valorInicial?: number;
  nomeRazaoSocialFornecedor?: string;
  niFornecedor?: string;
  dataAssinatura?: string;
  dataVigenciaInicial?: string;
  dataVigenciaFinal?: string;
  numeroControlePncp?: string;
  valorTotalHomologado?: number;
  receitaDespesa?: string;
  tipoContrato?: string;
}

export interface PncpContractEmpenho {
  numeroEmpenho: string;
  valorTotal: number;
  dataEmissaoEmpenho: string;
  sequencialEmpenho: number;
}

export interface ProcessoSei {
  id: string;
  numeroProcessoSei: string;
  descricaoObjeto?: string;
  unidadeRequisitante?: string;
  responsavelNome?: string;
  statusProcesso?: 'Em Instrução' | 'Aprovado' | 'Empenhado' | 'Concluído';
  createdAt?: string;
  updatedAt?: string;
}

export interface SyncMetadata {
  isCachedInDb: boolean;
  ultimoSyncEm?: string;
  dataHoraAtualizacaoApi?: string;
  divergenciaDetectada?: boolean;
}

export interface ExtendedInternalAllocation extends InternalAllocation {
  processoSeiId?: string;
  numeroProcessoSei?: string;
  numeroEmpenho?: string;
  dataEmpenho?: string;
  observacoes?: string;
}

