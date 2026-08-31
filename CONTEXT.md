# CONTEXT.md — Documentação e Contexto Geral do Projeto SaldoARP

---

## 1. Visão Geral e Propósito

O **SaldoARP** é uma aplicação web moderna e especializada em **auditoria, governança, consulta e reconciliação contábil de Atas de Registro de Preços (ARP)** da Administração Pública Federal brasileira.

O sistema atua consolidando dados públicos provenientes de múltiplos sistemas estruturantes federais:
- **Compras.gov.br (SIASG / módulo-arp)**: Consulta de atas homologadas, itens, quantitativos e saldos por órgão participante/gerenciador.
- **Portal Nacional de Contratações Públicas (PNCP)**: Consulta oficial de atas publicadas e contratos administrativos celebrados.
- **Contratos.gov.br**: Detalhamento de contratos, itens de contratação e histórico de execução financeira de notas de empenho.

---

## 2. Invariantes Contábeis e Regras de Negócio Fundamentais

### 2.1. Hierarquia e Cardinalidade Canônica
A estrutura do domínio segue estritamente a hierarquia orçamentária e contratual pública:

$$\text{ARP (Ata de Registro de Preços)} \longrightarrow \text{Itens da Ata} \longrightarrow \text{Órgãos / UASGs} \longrightarrow \text{Notas de Empenho (NE)} \longleftrightarrow \text{Contratos}$$

- **Item $\to$ Empenhos**: Relação de $1 : N$. Um item da ata pode ser empenhado através de múltiplas Notas de Empenho ao longo de sua vigência.
- **Contrato $\longleftrightarrow$ Empenhos**: Relação $N : N$ modelada através da entidade associativa `contrato_empenho`. Um contrato pode vincular 1 ou mais empenhos, e um empenho pode estar associado a um contrato ou ser uma execução direta por Nota de Empenho.

### 2.2. A Fórmula Oficial do Saldo da Ata
O saldo remanescente de um item de Ata de Registro de Preços é consumido **exclusivamente por Notas de Empenho**:

$$\mathbf{SaldoARP} = \mathbf{QuantidadeRegistrada} - \sum \mathbf{Empenhos}$$

> [!IMPORTANT]
> **Contratos e Alocações NÃO reduzem o saldo da Ata de Registro de Preços:**
> 1. **Contratos**: São instrumentos jurídicos formais que formalizam a relação com o fornecedor e agrupam/lastreiam notas de empenho. Subtrair contratos e empenhos simultaneamente geraria contagem dupla.
> 2. **Alocações Internas (Departamentais)**: Representam divisões administrativas/planejamento interno de cotas entre diretorias ou coordenações. O saldo da alocação departamental é $\text{SaldoAlocação} = \text{CotaAlocada} - \sum \text{EmpenhosDoDepartamento}$, não afetando o saldo global da Ata.

### 2.3. Reconciliação Contábil (`reconcileBalances`)
O sistema realiza conferência contínua entre duas fontes:
- **Fonte 1**: Saldo reportado diretamente pela API do Compras.gov.br.
- **Fonte 2**: Saldo calculado matematicamente pelo somatório das Notas de Empenho apuradas.

**Regra de Não-Interferência Destrutiva**: Em caso de divergência entre o saldo calculado e o saldo da API, o sistema **NÃO** altera nenhum dos valores arbitrariamente; ele exibe um alerta explícito com o delta numérico (ex: `⚠️ Divergência de 7 unidades`) e classifica o item com status `DIVERGENTE`.

### 2.4. Matriz de Confiança dos Registros
Todos os registros de empenho e contrato são classificados de forma visual e auditável:

| Indicador | Classificação | Descrição |
| :--- | :--- | :--- |
| 🟢 | **Oficial** | Registro retornado diretamente pela API oficial (SIASG/PNCP/Contratos.gov). |
| 🟡 | **Manual** | Inserido manualmente pelo usuário por ausência momentânea nos dados abertos. |
| 🔵 | **Sincronizado** | Inserido manualmente e posteriormente confirmado e vinculado pela API oficial. |
| 🔴 | **Divergente** | Registro com discrepância de quantidade ou valor entre fontes. |

### 2.5. Promoção Automática (`matchAndMergeEmpenhos`)
Quando uma Nota de Empenho cadastrada como `MANUAL` passa a ser retornada pela API do Compras.gov.br / Contratos.gov.br com a mesma chave canônica ($\text{número normalizado} + \text{ano} + \text{UASG} + \text{item}$), o sistema **promove** o registro para `SINCRONIZADO`, preservando vínculos departamentais e evitando duplicidade.

### 2.6. Integridade e Segurança dos Dados (Fim dos Dados Fictícios)
- Proibição estrita de gerar números de controle PNCP artificiais (`numeroControlePncp`). Se o PNCP não fornecer o identificador, o campo permanece vazio/nulo.
- Links e URLs do PNCP só são renderizados se oficiais e válidos.
- Remoção total de CNPJs ou identificadores mockados em código.
- Travas de formulário: **Impossível criar um Contrato Manual sem vincular previamente a pelo menos 1 Nota de Empenho**.

---

## 3. Arquitetura do Sistema e Stack Tecnológica

### 3.1. Frontend
- **Framework**: React 18 / 19 com TypeScript.
- **Build Tool & Bundler**: Vite.
- **Estilos**: Vanilla CSS moderno com Design Tokens, Glassmorphism, Dark/Light palettes institucionais e responsividade completa.
- **Ícones**: Lucide React.
- **Testes Unitários**: Vitest (100% de cobertura das fórmulas matemáticas de saldo e agrupamentos).

### 3.2. Armazenamento e Persistência Híbrida
- **Supabase (PostgreSQL)**: Persistência remota em nuvem para cache de consultas de atas, departamentos oficiais cadastrados, alocações internas e vínculos de empenhos/contratos manuais.
- **LocalStorage Fallback**: Resiliência para funcionamento local offline caso a conexão com o Supabase esteja temporariamente indisponível.

### 3.3. Proxies de API e Deploy (Vercel)
Para contornar restrições de CORS e certificar estabilidade em produção, o arquivo `vercel.json` gerencia rewrites transparentes:
- `/api-arp/*` $\longrightarrow$ `https://dadosabertos.compras.gov.br/*`
- `/api-pncp/*` $\longrightarrow$ `https://pncp.gov.br/*`
- `/api-contratos-gov/*` $\longrightarrow$ `https://contratos.comprasnet.gov.br/*`

---

## 4. Estrutura do Código-Fonte

```
SaldoARP/
├── .env / .env.example          # Configurações de API (Supabase URL, Anon Key, Transparência)
├── vercel.json                  # Regras de rewrite e proxy reverso para produção
├── vite.config.ts               # Configuração do Vite e Vitest
├── src/
│   ├── types/
│   │   └── index.ts             # Tipagem TypeScript canônica (ArpRecord, Empenho, Contrato, etc.)
│   ├── services/
│   │   ├── api.ts               # Clientes HTTP e integração com SIASG, PNCP e Contratos.gov
│   │   ├── balanceService.ts    # Motor oficial de cálculo de saldo, matching e reconciliação
│   │   ├── allocationService.ts # Gestão e persistência de alocações internas, empenhos e contratos manuais
│   │   ├── dbCacheService.ts    # Camada de cache e persistência com Supabase
│   │   ├── unitService.ts       # Gestão do catálogo oficial de unidades internas (DITEL, DTI, etc.)
│   │   └── __tests__/
│   │       └── balanceService.test.ts # Suíte de testes unitários do motor de saldo
│   ├── components/
│   │   ├── ArpSearch.tsx        # Busca avançada de Atas por vigência, órgão, UASG e número
│   │   ├── Header.tsx           # Barra superior com branding institucional e alternância de visões
│   │   ├── ItemBalances.tsx     # Tela principal de auditoria, saldos de unidades, contratos e empenhos
│   │   ├── ItemReconciliationCard.tsx # Card executivo de conciliação contábil do item
│   │   ├── InternalAllocationsDashboard.tsx # Painel consolidado de governança de cotas internas
│   │   ├── ManageDepartmentsModal.tsx # Modal de gestão das siglas das unidades internas
│   │   ├── cards/               # Componentes reutilizáveis de listagem e visualização de itens
│   │   └── modals/
│   │       ├── ManualEmpenhoModal.tsx   # Modal de inclusão/edição de Nota de Empenho manual
│   │       └── ManualContratoModal.tsx  # Modal de inclusão de Contrato com trava de empenho obrigatório
│   ├── utils/
│   │   ├── ataGrouping.ts       # Agrupamento e agregação de itens por ata
│   │   ├── pncpUtils.ts         # Sanitização e montagem segura de links oficiais PNCP
│   │   └── __tests__/
│   │       └── ataGrouping.test.ts # Testes unitários do agrupamento de atas
│   ├── index.css                # Sistema de design tokens, layouts, tabelas e progress bars
│   └── App.tsx                  # Componente raiz da aplicação e roteamento de estados
```

---

## 5. Como Executar, Testar e Publicar

### 5.1. Instalação e Execução Local
```powershell
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento local
npm run dev
```

### 5.2. Execução da Suíte de Testes Unitários
```powershell
# Executar testes unitários com Vitest
npx vitest run
```

### 5.3. Build de Produção
```powershell
# Validar tipagem TypeScript e gerar pacote otimizado em dist/
npm run build
```

---

## 6. Links e Ambientes Oficiais

- **Ambiente de Produção (Vercel)**: [https://saldo-arp.vercel.app](https://saldo-arp.vercel.app)
- **Repositório GitHub**: [https://github.com/vileganhon-sourc/SaldoARP](https://github.com/vileganhon-sourc/SaldoARP)
- **Branch Principal de Produção**: `main`
- **Branch de Release da Versão 2**: `v2.0`
