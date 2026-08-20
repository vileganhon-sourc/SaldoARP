import type { ArpResponse, ArpItemsResponse, UnidadesItemResponse, FilterParams } from '../types';

const BASE_URL = 'https://dadosabertos.compras.gov.br/modulo-arp';

// ==================== MOCK DATA ====================
// Realistic mock data parsed from Compras.gov.br ARP module
const MOCK_ARPS: ArpResponse = {
  resultado: [
    {
      numeroAtaRegistroPreco: "00064/2024",
      codigoUnidadeGerenciadora: "200331",
      nomeUnidadeGerenciadora: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
      codigoOrgao: 30911,
      nomeOrgao: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA",
      linkAtaPNCP: "https://pncp.gov.br/app/atas/00394494000136/2024/1130/10",
      linkCompraPNCP: "https://pncp.gov.br/app/editais/00394494000136/2024/001130",
      numeroCompra: "90023",
      anoCompra: "2024",
      codigoModalidadeCompra: "05",
      nomeModalidadeCompra: "Pregão",
      dataAssinatura: "2024-12-27",
      dataVigenciaInicial: "2024-12-28",
      dataVigenciaFinal: "2026-12-27",
      valorTotal: 123092159.46,
      statusAta: "Ata de Registro de Preços",
      objeto: "Registro de preços para eventual aquisição de equipamentos de mergulho, busca e salvamento, especificado(s) no(s) item(ns) 1 a 4 do grupo 1 e 16, 23, 29 e 36 do Termo de Referência, anexo I do edital de Licitação nº 23/2024.",
      quantidadeItens: 8,
      dataHoraAtualizacao: "2026-05-20T14:53:28",
      dataHoraInclusao: "2024-12-30T09:00:40",
      dataHoraExclusao: null,
      ataExcluido: false,
      numeroControlePncpAta: "00394494000136-1-001130/2024-000010",
      numeroControlePncpCompra: "00394494000136-1-001130/2024",
      idCompra: "20033105900232024"
    },
    {
      numeroAtaRegistroPreco: "00068/2024",
      codigoUnidadeGerenciadora: "200331",
      nomeUnidadeGerenciadora: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
      codigoOrgao: 30911,
      nomeOrgao: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA",
      linkAtaPNCP: "https://pncp.gov.br/app/atas/00394494000136/2024/1130/17",
      linkCompraPNCP: "https://pncp.gov.br/app/editais/00394494000136/2024/001130",
      numeroCompra: "90023",
      anoCompra: "2024",
      codigoModalidadeCompra: "05",
      nomeModalidadeCompra: "Pregão",
      dataAssinatura: "2024-12-27",
      dataVigenciaInicial: "2024-12-28",
      dataVigenciaFinal: "2026-12-27",
      valorTotal: 131793.73,
      statusAta: "Ata de Registro de Preços",
      objeto: "A presente Ata tem por objeto o registro de preços para a eventual aquisição de equipamentos de mergulho, busca e salvamento, especificado(s) no(s) item(ns) 11 e 12 do Termo de Referência, anexo I do edital de Licitação nº 23/2024.",
      quantidadeItens: 2,
      dataHoraAtualizacao: "2025-12-29T11:01:19",
      dataHoraInclusao: "2025-06-03T17:07:04",
      dataHoraExclusao: null,
      ataExcluido: false,
      numeroControlePncpAta: "00394494000136-1-001130/2024-000017",
      numeroControlePncpCompra: "00394494000136-1-001130/2024",
      idCompra: "20033105900232024"
    },
    {
      numeroAtaRegistroPreco: "00076/2024",
      codigoUnidadeGerenciadora: "200331",
      nomeUnidadeGerenciadora: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
      codigoOrgao: 30911,
      nomeOrgao: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA",
      linkAtaPNCP: "https://pncp.gov.br/app/atas/00394494000136/2024/947/1",
      linkCompraPNCP: "https://pncp.gov.br/app/editais/00394494000136/2024/000947",
      numeroCompra: "90022",
      anoCompra: "2024",
      codigoModalidadeCompra: "05",
      nomeModalidadeCompra: "Pregão",
      dataAssinatura: "2024-12-27",
      dataVigenciaInicial: "2024-12-28",
      dataVigenciaFinal: "2025-12-28",
      valorTotal: 8797500.00,
      statusAta: "Ata de Registro de Preços",
      objeto: "Aquisição de Equipamentos de Combate a Incêndios Florestais, especificado no item 02 do Termo de Referência, anexo I do edital de Licitação nº 22/2024.",
      quantidadeItens: 1,
      dataHoraAtualizacao: "2024-12-27T14:58:36",
      dataHoraInclusao: "2024-12-27T14:58:36",
      dataHoraExclusao: null,
      ataExcluido: false,
      numeroControlePncpAta: "00394494000136-1-000947/2024-000001",
      numeroControlePncpCompra: "00394494000136-1-000947/2024",
      idCompra: "20033105900222024"
    },
    {
      numeroAtaRegistroPreco: "00077/2024",
      codigoUnidadeGerenciadora: "200331",
      nomeUnidadeGerenciadora: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
      codigoOrgao: 30911,
      nomeOrgao: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA",
      linkAtaPNCP: "https://pncp.gov.br/app/atas/00394494000136/2024/947/2",
      linkCompraPNCP: "https://pncp.gov.br/app/editais/00394494000136/2024/000947",
      numeroCompra: "90022",
      anoCompra: "2024",
      codigoModalidadeCompra: "05",
      nomeModalidadeCompra: "Pregão",
      dataAssinatura: "2024-12-27",
      dataVigenciaInicial: "2024-12-28",
      dataVigenciaFinal: "2025-12-28",
      valorTotal: 0,
      statusAta: "Cancelada",
      objeto: "Registro de Preços para a eventual aquisição de Equipamentos de Combate a Incêndios Florestais, especificado no item 08 do Termo de Referência, anexo I do edital de Licitação nº 22/2024.",
      quantidadeItens: 1,
      dataHoraAtualizacao: "2025-04-03T15:45:45",
      dataHoraInclusao: "2024-12-27T15:11:10",
      dataHoraExclusao: null,
      ataExcluido: false,
      numeroControlePncpAta: "00394494000136-1-000947/2024-000002",
      numeroControlePncpCompra: "00394494000136-1-000947/2024",
      idCompra: "20033105900222024"
    },
    {
      numeroAtaRegistroPreco: "00019/2025",
      codigoUnidadeGerenciadora: "154080",
      nomeUnidadeGerenciadora: "UNIVERSIDADE FEDERAL DE RORAIMA - UFRR",
      codigoOrgao: 26248,
      nomeOrgao: "UNIVERSIDADE FEDERAL DE RORAIMA",
      linkAtaPNCP: "https://pncp.gov.br/app/atas/34792077000163/2025/51/1",
      linkCompraPNCP: "https://pncp.gov.br/app/editais/34792077000163/2025/000051",
      numeroCompra: "90019",
      anoCompra: "2025",
      codigoModalidadeCompra: "05",
      nomeModalidadeCompra: "Pregão",
      dataAssinatura: "2025-12-31",
      dataVigenciaInicial: "2026-01-01",
      dataVigenciaFinal: "2027-01-01",
      valorTotal: 26250.52,
      statusAta: "Ata de Registro de Preços",
      objeto: "Ata de Registro de Preços para aquisição de Veículos Teleguiados (Drones), baterias e transceptores de rádio para suporte a atividades de pesquisa e campo da UFRR.",
      quantidadeItens: 3,
      dataHoraAtualizacao: "2025-12-31T09:40:05",
      dataHoraInclusao: "2025-12-31T09:40:05",
      dataHoraExclusao: null,
      ataExcluido: false,
      numeroControlePncpAta: "34792077000163-1-000051/2025-000001",
      numeroControlePncpCompra: "34792077000163-1-000051/2025",
      idCompra: "15408005900192025"
    }
  ],
  totalRegistros: 5,
  totalPaginas: 1,
  paginasRestantes: 0
};

const MOCK_ITEMS: Record<string, ArpItemsResponse> = {
  // Key format: "unidadeGerenciadora-dataVigenciaInicial"
  "200331-2024-12-28": {
    resultado: [
      {
        numeroAtaRegistroPreco: "00068/2024",
        codigoUnidadeGerenciadora: "200331",
        numeroCompra: "90023",
        anoCompra: "2024",
        codigoModalidadeCompra: "05",
        dataAssinatura: "2024-12-27T00:00:00",
        dataVigenciaInicial: "2024-12-28",
        dataVigenciaFinal: "2025-12-27",
        numeroItem: "00011",
        codigoItem: 611963,
        descricaoItem: "ACESSÓRIO / PEÇA MERGULHO, TIPO FACA DE MERGULHO COM BAINHA, COMPRIMENTO LÂMINA 14 CM, MATERIAL LÂMINA AÇO INOXIDÁVEL, CABO EMBORRACHADO",
        tipoItem: "Material",
        quantidadeHomologadaItem: 500,
        classificacaoFornecedor: "001",
        niFornecedor: "11031398000140",
        nomeRazaoSocialFornecedor: "RBF DISTRIBUIDORA E SERVICOS LTDA",
        quantidadeHomologadaVencedor: 500,
        valorUnitario: 158.00,
        valorTotal: 79000.00,
        maximoAdesao: 1000.00,
        nomeUnidadeGerenciadora: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
        nomeModalidadeCompra: "Pregão",
        idCompra: "20033105900232024",
        numeroControlePncpCompra: "00394494000136-1-001130/2024",
        dataHoraInclusao: "2024-12-27T17:33:40",
        dataHoraAtualizacao: "2024-12-27T17:33:40",
        dataHoraExclusao: null,
        itemExcluido: false,
        numeroControlePncpAta: "00394494000136-1-001130/2024-000017",
        codigoPdm: 1661,
        nomePdm: "ACESSÓRIO / PEÇA MERGULHO"
      },
      {
        numeroAtaRegistroPreco: "00068/2024",
        codigoUnidadeGerenciadora: "200331",
        numeroCompra: "90023",
        anoCompra: "2024",
        codigoModalidadeCompra: "05",
        dataAssinatura: "2024-12-27T00:00:00",
        dataVigenciaInicial: "2024-12-28",
        dataVigenciaFinal: "2025-12-27",
        numeroItem: "00012",
        codigoItem: 611964,
        descricaoItem: "ACESSÓRIO / PEÇA MERGULHO, TIPO CINTO LASTRO, MATERIAL NYLON, COR PRETO, DIMENSÕES 50MM X 1,6M, FIVELA DE AÇO",
        tipoItem: "Material",
        quantidadeHomologadaItem: 1940,
        classificacaoFornecedor: "001",
        niFornecedor: "11031398000140",
        nomeRazaoSocialFornecedor: "RBF DISTRIBUIDORA E SERVICOS LTDA",
        quantidadeHomologadaVencedor: 1940,
        valorUnitario: 27.00,
        valorTotal: 52380.00,
        maximoAdesao: 3880.00,
        nomeUnidadeGerenciadora: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
        nomeModalidadeCompra: "Pregão",
        idCompra: "20033105900232024",
        numeroControlePncpCompra: "00394494000136-1-001130/2024",
        dataHoraInclusao: "2024-12-27T17:33:40",
        dataHoraAtualizacao: "2024-12-27T17:33:40",
        dataHoraExclusao: null,
        itemExcluido: false,
        numeroControlePncpAta: "00394494000136-1-001130/2024-000007",
        codigoPdm: 1661,
        nomePdm: "ACESSÓRIO / PEÇA MERGULHO"
      },
      {
        numeroAtaRegistroPreco: "00076/2024",
        codigoUnidadeGerenciadora: "200331",
        numeroCompra: "90022",
        anoCompra: "2024",
        codigoModalidadeCompra: "05",
        dataAssinatura: "2024-12-27T00:00:00",
        dataVigenciaInicial: "2024-12-28",
        dataVigenciaFinal: "2025-12-28",
        numeroItem: "00003",
        codigoItem: 613602,
        descricaoItem: "SISTEMA COMBATE INCÊNDIO, TIPO CONJUNTO DE COMBATE INCÊNDIO MÓVEL VEÍCULAR, TANQUE RÍGIDO 400 L, MOTO-BOMBA E MANGUEIRAS",
        tipoItem: "Material",
        quantidadeHomologadaItem: 391,
        classificacaoFornecedor: "001",
        niFornecedor: "15453449000425",
        nomeRazaoSocialFornecedor: "RESGATECNICA COMERCIO DE EQUIPAMENTOS DE RESGATE LTDA",
        quantidadeHomologadaVencedor: 391,
        valorUnitario: 22500.00,
        valorTotal: 8797500.00,
        maximoAdesao: 0,
        nomeUnidadeGerenciadora: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
        nomeModalidadeCompra: "Pregão",
        idCompra: "20033105900222024",
        numeroControlePncpCompra: "00394494000136-1-000947/2024",
        dataHoraInclusao: "2024-12-27T14:58:36",
        dataHoraAtualizacao: "2024-12-27T14:58:36",
        dataHoraExclusao: null,
        itemExcluido: false,
        numeroControlePncpAta: "00394494000136-1-000947/2024-000001",
        codigoPdm: 1278,
        nomePdm: "SISTEMA COMBATE INCÊNDIO"
      }
    ],
    totalRegistros: 3,
    totalPaginas: 1,
    paginasRestantes: 0
  },
  "154080-2026-01-01": {
    resultado: [
      {
        numeroAtaRegistroPreco: "00019/2025",
        codigoUnidadeGerenciadora: "154080",
        numeroCompra: "90019",
        anoCompra: "2025",
        codigoModalidadeCompra: "05",
        dataAssinatura: "2025-12-31T00:00:00",
        dataVigenciaInicial: "2026-01-01",
        dataVigenciaFinal: "2027-01-01",
        numeroItem: "00026",
        codigoItem: 611462,
        descricaoItem: "VEÍCULOS TELEGUIADOS, TIPO AERONAVE REMOTAMENTE PILOTADA (DRONE), QUANTIDADE MOTORES 4 MOTORES, TAMANHO DIAGONAL 247 MM, PESO MÁXIMO 290 G, CARACTERÍSTICAS ADICIONAIS SENSOR CMOS DE 48MP DE 1/1.3\"",
        tipoItem: "Material",
        quantidadeHomologadaItem: 2.00,
        classificacaoFornecedor: "001",
        niFornecedor: "43182905000132",
        nomeRazaoSocialFornecedor: "ASSUNTEC - ASSUNTOS TECNOLOGICOS COMERCIO DE EQUIPAMENTOS LTDA",
        quantidadeHomologadaVencedor: 2,
        valorUnitario: 4668.88,
        valorTotal: 9337.76,
        maximoAdesao: 4.00,
        nomeUnidadeGerenciadora: "UNIVERSIDADE FEDERAL DE RORAIMA",
        nomeModalidadeCompra: "Pregão",
        idCompra: "15408005900192025",
        numeroControlePncpCompra: "34792077000163-1-000051/2025",
        dataHoraInclusao: "2025-12-31T09:40:05",
        dataHoraAtualizacao: "2025-12-31T09:40:05",
        dataHoraExclusao: null,
        itemExcluido: false,
        numeroControlePncpAta: "34792077000163-1-000051/2025-000001",
        codigoPdm: 16741,
        nomePdm: "veículos teleguiados"
      },
      {
        numeroAtaRegistroPreco: "00019/2025",
        codigoUnidadeGerenciadora: "154080",
        numeroCompra: "90019",
        anoCompra: "2025",
        codigoModalidadeCompra: "05",
        dataAssinatura: "2025-12-31T00:00:00",
        dataVigenciaInicial: "2026-01-01",
        dataVigenciaFinal: "2027-01-01",
        numeroItem: "00027",
        codigoItem: 605548,
        descricaoItem: "BATERIA RECARREGÁVEL, MODELO PH4, APLICAÇÃO 1 DRONE PHANTOM 4, TENSÃO NOMINAL 12 V, CAPACIDADE NOMINAL 5.350 MAH",
        tipoItem: "Material",
        quantidadeHomologadaItem: 4.00,
        classificacaoFornecedor: "001",
        niFornecedor: "43182905000132",
        nomeRazaoSocialFornecedor: "ASSUNTEC - ASSUNTOS TECNOLOGICOS COMERCIO DE EQUIPAMENTOS LTDA",
        quantidadeHomologadaVencedor: 4,
        valorUnitario: 1988.00,
        valorTotal: 7952.00,
        maximoAdesao: 8.00,
        nomeUnidadeGerenciadora: "UNIVERSIDADE FEDERAL DE RORAIMA",
        nomeModalidadeCompra: "Pregão",
        idCompra: "15408005900192025",
        numeroControlePncpCompra: "34792077000163-1-000051/2025",
        dataHoraInclusao: "2025-12-31T09:40:05",
        dataHoraAtualizacao: "2025-12-31T09:40:05",
        dataHoraExclusao: null,
        itemExcluido: false,
        numeroControlePncpAta: "34792077000163-1-000051/2025-000001",
        codigoPdm: 3475,
        nomePdm: "BATERIA RECARREGÁVEL"
      },
      {
        numeroAtaRegistroPreco: "00019/2025",
        codigoUnidadeGerenciadora: "154080",
        numeroCompra: "90019",
        anoCompra: "2025",
        codigoModalidadeCompra: "05",
        dataAssinatura: "2025-12-31T00:00:00",
        dataVigenciaInicial: "2026-01-01",
        dataVigenciaFinal: "2027-01-01",
        numeroItem: "00028",
        codigoItem: 274238,
        descricaoItem: "TRANSCEPTOR, TIPO TRANSMISSOR-RECEPTOR VHF/FM, FREQÜÊNCIA COMUNICAÇÃO 133 A 174 MHZ, ALCANCE 35 KM, ALIMENTAÇÃO BATERIA",
        tipoItem: "Material",
        quantidadeHomologadaItem: 3.00,
        classificacaoFornecedor: "001",
        niFornecedor: "43182905000132",
        nomeRazaoSocialFornecedor: "ASSUNTEC - ASSUNTOS TECNOLOGICOS COMERCIO DE EQUIPAMENTOS LTDA",
        quantidadeHomologadaVencedor: 3,
        valorUnitario: 2987.00,
        valorTotal: 8961.00,
        maximoAdesao: 6.00,
        nomeUnidadeGerenciadora: "UNIVERSIDADE FEDERAL DE RORAIMA",
        nomeModalidadeCompra: "Pregão",
        idCompra: "15408005900192025",
        numeroControlePncpCompra: "34792077000163-1-000051/2025",
        dataHoraInclusao: "2025-12-31T09:40:05",
        dataHoraAtualizacao: "2025-12-31T09:40:05",
        dataHoraExclusao: null,
        itemExcluido: false,
        numeroControlePncpAta: "34792077000163-1-000051/2025-000001",
        codigoPdm: 1381,
        nomePdm: "TRANSCEPTOR"
      }
    ],
    totalRegistros: 3,
    totalPaginas: 1,
    paginasRestantes: 0
  }
};

const MOCK_UNIDADES: Record<string, UnidadesItemResponse> = {
  // Key format: "numeroAta-unidadeGerenciadora-numeroItem"
  "00019/2025-154080-00026": {
    resultado: [
      {
        numeroAta: "00019/2025",
        unidadeGerenciadora: "154080",
        numeroItem: "00026",
        codigoPdm: "16741",
        descricaoItem: "VEÍCULOS TELEGUIADOS, TIPO AERONAVE REMOTAMENTE PILOTADA (DRONE)",
        fornecedor: "43182905000132 - ASSUNTEC - ASSUNTOS TECNOLOGICOS COMERCIO DE EQUIPAMENTOS LTDA",
        quantidadeRegistrada: 2.00,
        saldoAdesoes: 3.00, // 1 drone já foi "caronado" por outra UASG
        saldoRemanejamentoEmpenho: 1.00, // UFRR já empenhou 1 drone (sobra 1)
        qtdLimiteAdesao: 4.00,
        qtdLimiteInformadoCompra: 4.00,
        aceitaAdesao: true,
        dataHoraInclusao: "2025-12-31T09:38:57",
        dataHoraAtualizacao: "2025-12-31T09:38:57",
        dataHoraExclusao: null,
        codigoUnidade: "154080",
        nomeUnidade: "UNIVERSIDADE FEDERAL DE RORAIMA",
        tipoUnidade: "GERENCIADORA"
      },
      {
        numeroAta: "00019/2025",
        unidadeGerenciadora: "154080",
        numeroItem: "00026",
        codigoPdm: "16741",
        descricaoItem: "VEÍCULOS TELEGUIADOS, TIPO AERONAVE REMOTAMENTE PILOTADA (DRONE)",
        fornecedor: "43182905000132 - ASSUNTEC - ASSUNTOS TECNOLOGICOS COMERCIO DE EQUIPAMENTOS LTDA",
        quantidadeRegistrada: 1.00,
        saldoAdesoes: 0.00,
        saldoRemanejamentoEmpenho: 0.00, // Já consumiu tudo
        qtdLimiteAdesao: 0.00,
        qtdLimiteInformadoCompra: 1.00,
        aceitaAdesao: false,
        dataHoraInclusao: "2025-12-31T09:38:57",
        dataHoraAtualizacao: "2025-12-31T09:38:57",
        dataHoraExclusao: null,
        codigoUnidade: "153051",
        nomeUnidade: "UNIVERSIDADE FEDERAL DE RONDONIA - PARTICIPANTE 1",
        tipoUnidade: "PARTICIPANTE"
      }
    ],
    totalRegistros: 2,
    totalPaginas: 1,
    paginasRestantes: 0
  },
  "00019/2025-154080-00027": {
    resultado: [
      {
        numeroAta: "00019/2025",
        unidadeGerenciadora: "154080",
        numeroItem: "00027",
        codigoPdm: "3475",
        descricaoItem: "BATERIA RECARREGÁVEL",
        fornecedor: "43182905000132 - ASSUNTEC - ASSUNTOS TECNOLOGICOS COMERCIO DE EQUIPAMENTOS LTDA",
        quantidadeRegistrada: 4.00,
        saldoAdesoes: 8.00, // 0 adesões efetuadas
        saldoRemanejamentoEmpenho: 3.00, // 1 empenhada
        qtdLimiteAdesao: 8.00,
        qtdLimiteInformadoCompra: 8.00,
        aceitaAdesao: true,
        dataHoraInclusao: "2025-12-31T09:38:57",
        dataHoraAtualizacao: "2025-12-31T09:38:57",
        dataHoraExclusao: null,
        codigoUnidade: "154080",
        nomeUnidade: "UNIVERSIDADE FEDERAL DE RORAIMA",
        tipoUnidade: "GERENCIADORA"
      }
    ],
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0
  },
  "00019/2025-154080-00028": {
    resultado: [
      {
        numeroAta: "00019/2025",
        unidadeGerenciadora: "154080",
        numeroItem: "00028",
        codigoPdm: "1381",
        descricaoItem: "TRANSCEPTOR",
        fornecedor: "43182905000132 - ASSUNTEC - ASSUNTOS TECNOLOGICOS COMERCIO DE EQUIPAMENTOS LTDA",
        quantidadeRegistrada: 3.00,
        saldoAdesoes: 5.00, // 1 adesão efetuada (restam 5 de 6)
        saldoRemanejamentoEmpenho: 2.00, // 1 empenhado
        qtdLimiteAdesao: 6.00,
        qtdLimiteInformadoCompra: 6.00,
        aceitaAdesao: true,
        dataHoraInclusao: "2025-12-31T09:38:57",
        dataHoraAtualizacao: "2025-12-31T09:38:57",
        dataHoraExclusao: null,
        codigoUnidade: "154080",
        nomeUnidade: "UNIVERSIDADE FEDERAL DE RORAIMA",
        tipoUnidade: "GERENCIADORA"
      }
    ],
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0
  },
  "00068/2024-200331-00011": {
    resultado: [
      {
        numeroAta: "00068/2024",
        unidadeGerenciadora: "200331",
        numeroItem: "00011",
        codigoPdm: "1661",
        descricaoItem: "ACESSÓRIO / PEÇA MERGULHO, TIPO FACA DE MERGULHO COM BAINHA",
        fornecedor: "11031398000140 - RBF DISTRIBUIDORA E SERVICOS LTDA",
        quantidadeRegistrada: 500.00,
        saldoAdesoes: 750.00, // 250 já foram consumidos por adesões
        saldoRemanejamentoEmpenho: 450.00, // 50 empenhados pelo gerenciador
        qtdLimiteAdesao: 1000.00,
        qtdLimiteInformadoCompra: 1000.00,
        aceitaAdesao: true,
        dataHoraInclusao: "2024-12-27T17:33:40",
        dataHoraAtualizacao: "2024-12-27T17:33:40",
        dataHoraExclusao: null,
        codigoUnidade: "200331",
        nomeUnidade: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
        tipoUnidade: "GERENCIADORA"
      }
    ],
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0
  },
  "00068/2024-200331-00012": {
    resultado: [
      {
        numeroAta: "00068/2024",
        unidadeGerenciadora: "200331",
        numeroItem: "00012",
        codigoPdm: "1661",
        descricaoItem: "ACESSÓRIO / PEÇA MERGULHO, TIPO CINTO LASTRO",
        fornecedor: "11031398000140 - RBF DISTRIBUIDORA E SERVICOS LTDA",
        quantidadeRegistrada: 1940.00,
        saldoAdesoes: 3000.00, // 880 consumidos por caronas
        saldoRemanejamentoEmpenho: 1000.00, // 940 consumidos por empenhos do gerenciador
        qtdLimiteAdesao: 3880.00,
        qtdLimiteInformadoCompra: 3880.00,
        aceitaAdesao: true,
        dataHoraInclusao: "2024-12-27T17:33:40",
        dataHoraAtualizacao: "2024-12-27T17:33:40",
        dataHoraExclusao: null,
        codigoUnidade: "200331",
        nomeUnidade: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
        tipoUnidade: "GERENCIADORA"
      }
    ],
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0
  },
  "00076/2024-200331-00003": {
    resultado: [
      {
        numeroAta: "00076/2024",
        unidadeGerenciadora: "200331",
        numeroItem: "00003",
        codigoPdm: "1278",
        descricaoItem: "SISTEMA COMBATE INCÊNDIO",
        fornecedor: "15453449000425 - RESGATECNICA COMERCIO DE EQUIPAMENTOS DE RESGATE LTDA",
        quantidadeRegistrada: 391.00,
        saldoAdesoes: 0.00,
        saldoRemanejamentoEmpenho: 200.00, // 191 empenhados
        qtdLimiteAdesao: 0.00,
        qtdLimiteInformadoCompra: 0.00,
        aceitaAdesao: false, // Não aceita adesão/carona
        dataHoraInclusao: "2024-12-27T14:58:36",
        dataHoraAtualizacao: "2024-12-27T14:58:36",
        dataHoraExclusao: null,
        codigoUnidade: "200331",
        nomeUnidade: "SECRETARIA NACIONAL DE SEGURANCA PUBLICA - SENASP",
        tipoUnidade: "GERENCIADORA"
      }
    ],
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0
  }
};

// State flag to track whether we are in Simulation Mode (e.g. if fetch failed due to CORS)
let isSimulationMode = false;

export function getSimulationMode(): boolean {
  return isSimulationMode;
}

export function setSimulationMode(value: boolean) {
  isSimulationMode = value;
}

/**
 * Encodes query parameters safely.
 */
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * 1. Consultar ARP
 * Endereço: /modulo-arp/1_consultarARP
 */
export async function fetchArps(params: FilterParams): Promise<ArpResponse> {
  const queryParams = {
    pagina: 1,
    tamanhoPagina: 50,
    codigoUnidadeGerenciadora: params.codigoUnidadeGerenciadora,
    dataVigenciaInicialMin: params.dataVigenciaInicialMin,
    dataVigenciaInicialMax: params.dataVigenciaInicialMax
  };

  const url = `${BASE_URL}/1_consultarARP${buildQueryString(queryParams)}`;

  if (isSimulationMode) {
    return filterMockArps(params);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json() as ArpResponse;
    
    // Apply client-side filter for numeroAta if provided
    if (params.numeroAtaRegistroPreco && data.resultado) {
      data.resultado = data.resultado.filter(arp => 
        arp.numeroAtaRegistroPreco.includes(params.numeroAtaRegistroPreco!)
      );
      data.totalRegistros = data.resultado.length;
    }
    
    return data;
  } catch (error) {
    console.warn("API request failed (possibly CORS or offline). Falling back to mock data.", error);
    isSimulationMode = true;
    return filterMockArps(params);
  }
}

function filterMockArps(params: FilterParams): ArpResponse {
  let list = [...MOCK_ARPS.resultado];

  if (params.codigoUnidadeGerenciadora) {
    list = list.filter(arp => arp.codigoUnidadeGerenciadora === params.codigoUnidadeGerenciadora);
  }
  if (params.numeroAtaRegistroPreco) {
    list = list.filter(arp => arp.numeroAtaRegistroPreco.includes(params.numeroAtaRegistroPreco!));
  }

  // Filter based on vigência range overlap or simply return the matching subset
  return {
    resultado: list,
    totalRegistros: list.length,
    totalPaginas: 1,
    paginasRestantes: 0
  };
}

/**
 * 2. Consultar ARP Item
 * Endereço: /modulo-arp/2_consultarARPItem
 */
export async function fetchArpItems(
  dataVigenciaInicial: string,
  codigoUnidadeGerenciadora: string,
  numeroAtaRegistroPreco: string
): Promise<ArpItemsResponse> {
  const queryParams = {
    pagina: 1,
    tamanhoPagina: 100, // Get a good batch to filter down
    codigoUnidadeGerenciadora,
    dataVigenciaInicialMin: dataVigenciaInicial,
    dataVigenciaInicialMax: dataVigenciaInicial
  };

  const url = `${BASE_URL}/2_consultarARPItem${buildQueryString(queryParams)}`;

  if (isSimulationMode) {
    return filterMockItems(codigoUnidadeGerenciadora, dataVigenciaInicial, numeroAtaRegistroPreco);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json() as ArpItemsResponse;
    
    // The API returns all items of that unit starting on that day.
    // We must filter client-side to only keep items belonging to this specific numeroAtaRegistroPreco.
    if (data.resultado) {
      data.resultado = data.resultado.filter(item => 
        item.numeroAtaRegistroPreco === numeroAtaRegistroPreco
      );
      data.totalRegistros = data.resultado.length;
    }
    return data;
  } catch (error) {
    console.warn("API request failed (possibly CORS). Falling back to mock data.", error);
    isSimulationMode = true;
    return filterMockItems(codigoUnidadeGerenciadora, dataVigenciaInicial, numeroAtaRegistroPreco);
  }
}

function filterMockItems(
  codigoUnidadeGerenciadora: string,
  dataVigenciaInicial: string,
  numeroAtaRegistroPreco: string
): ArpItemsResponse {
  const key = `${codigoUnidadeGerenciadora}-${dataVigenciaInicial}`;
  const mockBatch = MOCK_ITEMS[key];
  if (!mockBatch) {
    // Return empty list if no mock for this specific key
    return { resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
  }

  const filtered = mockBatch.resultado.filter(item => item.numeroAtaRegistroPreco === numeroAtaRegistroPreco);
  return {
    resultado: filtered,
    totalRegistros: filtered.length,
    totalPaginas: 1,
    paginasRestantes: 0
  };
}

/**
 * 3. Consultar Unidades Item
 * Endereço: /modulo-arp/3_consultarUnidadesItem
 */
export async function fetchUnidadesItem(
  numeroAta: string,
  unidadeGerenciadora: string,
  numeroItem: string
): Promise<UnidadesItemResponse> {
  // Ensure the numeroItem is padded or formatted as required by the API
  const formattedItem = numeroItem.padStart(5, '0');
  
  const queryParams = {
    pagina: 1,
    tamanhoPagina: 50,
    numeroAta,
    unidadeGerenciadora,
    numeroItem: formattedItem
  };

  const url = `${BASE_URL}/3_consultarUnidadesItem${buildQueryString(queryParams)}`;

  if (isSimulationMode) {
    return getMockUnidades(numeroAta, unidadeGerenciadora, formattedItem);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as UnidadesItemResponse;
  } catch (error) {
    console.warn("API request failed (possibly CORS). Falling back to mock data.", error);
    isSimulationMode = true;
    return getMockUnidades(numeroAta, unidadeGerenciadora, formattedItem);
  }
}

function getMockUnidades(
  numeroAta: string,
  unidadeGerenciadora: string,
  numeroItem: string
): UnidadesItemResponse {
  const key = `${numeroAta}-${unidadeGerenciadora}-${numeroItem}`;
  const mockResult = MOCK_UNIDADES[key];
  if (mockResult) {
    return mockResult;
  }

  // Create a dynamic realistic mock if not found in MOCK_UNIDADES
  // So that manually searched ARPs can still display item details
  return {
    resultado: [
      {
        numeroAta,
        unidadeGerenciadora,
        numeroItem,
        codigoPdm: "9999",
        descricaoItem: "Item consultado sem detalhe de unidade cadastrado",
        fornecedor: "00000000000100 - FORNECEDOR PADRÃO LTDA",
        quantidadeRegistrada: 100,
        saldoAdesoes: 200,
        saldoRemanejamentoEmpenho: 100,
        qtdLimiteAdesao: 200,
        qtdLimiteInformadoCompra: 100,
        aceitaAdesao: true,
        dataHoraInclusao: new Date().toISOString(),
        dataHoraAtualizacao: new Date().toISOString(),
        dataHoraExclusao: null,
        codigoUnidade: unidadeGerenciadora,
        nomeUnidade: "ÓRGÃO GERENCIADOR DO REGISTRO DE PREÇOS",
        tipoUnidade: "GERENCIADORA"
      }
    ],
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0
  };
}
