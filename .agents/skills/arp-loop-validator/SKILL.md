---
name: arp-loop-validator
description: Executa um ciclo autônomo de engenharia em arquitetura multiagente (Orquestrador, Implementador, Verificador) para implementar, validar, auditar e comprovar regras contábeis e de software do SaldoARP até aprovação formal.
---

# arp-loop-validator (V2)

## Objetivo

Executar um ciclo autônomo, rigoroso e adversarial de engenharia de software para validar, auditar e comprovar regras contábeis e de software do **SaldoARP** até que todos os critérios sejam formalmente comprovados pelo Verificador independente (NO TEST).

O princípio fundamental é:
> **PASSAR NO TESTE NÃO É SUFICIENTE.**  
> O NO TEST deve verificar também se o teste seria capaz de detectar uma implementação errada (*Capacidade de Falha* e *Mutation Check*).

---

# 1. ARQUITETURA MULTIAGENTE DO LOOP

```
                     /goal (Requisitos & Invariantes)
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   ORQUESTRADOR    │
                         │ Coordena o ciclo  │
                         └─────────┬─────────┘
                                   │
                            ┌──────▼──────┐
                            │IMPLEMENTADOR│
                            │ Cria código │
                            │ Cria testes │
                            └──────┬──────┘
                                   │
                            código / testes
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    VERIFICADOR    │
                         │   (NO TEST V2)    │
                         │ Auditoria Crítica │
                         │ Mutation Checks   │
                         └─────────┬─────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                      REPROVA              APROVA
                         │                   │
                         ▼                   ▼
                   FEEDBACK OBJETIVO      STATUS: DONE
                         │             (Confiança ALTA)
                         └──────► IMPLEMENTADOR
```

### 1.1. Subagente: `orquestrador`
- **Papel**: Maestro do loop.
- **Função**: Envia requisitos ao Implementador, repassa a entrega ao Verificador, coleta feedbacks de reprovação, impede loops infinitos e declara o encerramento quando aprovado pelo Verificador.

### 1.2. Subagente: `implementador`
- **Papel**: Construtor técnico.
- **Função**: Escreve código, modela schemas, implementa serviços, cria testes locais e entrega ao Verificador com a mensagem: `"IMPLEMENTAÇÃO ENTREGUE PARA VERIFICAÇÃO."` (nunca se autoaprova).

### 1.3. Subagente: `verificador` (NO TEST V2)
- **Papel**: Auditor independente e adversarial.
- **Função**: Executa testes adversariais, verifica mutações de código, inspeciona ausência de dados fictícios e é a **única autoridade que pode emitir `APROVADO`** para encerrar o ciclo.

---

# 2. INVARIANTES CONTÁBEIS DO SALDOARP

Na validação de itens de Ata de Registro de Preços, aplicar estritamente:

1. **Fórmula Oficial**:
   $$\mathbf{SaldoARP} = \mathbf{QuantidadeRegistrada} - \sum \mathbf{Empenhos}$$
2. **Isolamento de Contratos**: Contratos **NUNCA** reduzem o saldo da Ata diretamente.
3. **Isolamento de Alocações Internas**: Alocações **NUNCA** reduzem o saldo da Ata ($\text{SaldoAlocação} = \text{Cota} - \sum \text{EmpenhosDoDepto}$).
4. **Cardinalidade e Travas**:
   - $1 \text{ Item} \to N \text{ Empenhos}$.
   - Empenho sem Contrato = **VÁLIDO**.
   - Contrato sem Empenho = **INVÁLIDO** (salvamento bloqueado).
   - Vínculo de empenho a múltiplos contratos **NÃO duplica** o empenho consumido.
5. **Reconciliação e Não-Interferência**:
   - Compara Saldo Calculado x Saldo Informado pela API.
   - Discrepâncias são sinalizadas com o delta numérico explícito (`⚠️ Divergência de X un`), sem auto-correção forçada.
6. **Matriz de Confiança**:
   - 🟢 Oficial (API) | 🟡 Manual (Usuário) | 🔵 Sincronizado (Manual confirmado pela API) | 🔴 Divergente.
7. **Proibição de Dados Artificiais**:
   - Nunca fabricar contratos, empenhos, CNPJs, nem gerar `numeroControlePncp` sintético se a API não retornar.

---

# 3. RASTREABILIDADE FORMAL OBRIGATÓRIA

Todo requisito crítico deve possuir rastreabilidade unívoca:

$$\text{REQUISITO} \to \text{REGRA DE NEGÓCIO} \to \text{CÓDIGO RESPONSÁVEL} \to \text{TESTE} \to \text{EVIDÊNCIA} \to \text{RESULTADO}$$

Se um requisito crítico não possuir teste correspondente comprovado:
$$\mathbf{STATUS = BLOQUEADO}$$

---

# 4. CAMADA MUTATION CHECK (TESTE DO TESTE)

Diferenciação mandatória:
- **A) Mutation Check Adversarial**: Testes automatizados direcionados que provocam mutações controladas nas regras (ex: inversão de sinal, quebra de travas de contrato, duplicações de registros) para comprovar que os testes quebram de fato se a regra for violada.
- **B) Mutation Testing Automatizado**: Framework estocástico que injeta mutantes no AST da aplicação e calcula o `Mutation Score`.

**Regra dos Mutantes Sobreviventes**:
Se um mutante sobreviver em uma regra crítica:
$$\mathbf{STATUS = BLOQUEADO}$$

---

# 5. PROTOCOLO DE INSPEÇÃO DE CÓDIGO

O Verificador deve inspecionar ativamente:
- Valores hardcoded ou dados fictícios mascarando a API;
- Mocks silenciosos ou swallow de erros com `try/catch` vazios;
- Coerções indevidas de tipo;
- Truncamento indevido de saldo negativo para zero (ex: uso incorreto de `Math.max(0, saldo)`);
- Comportamentos que façam o sistema parecer correto mesmo estando errado.

---

# 6. CRITÉRIOS DE STATUS E NÍVEL DE CONFIANÇA

### Status
- **APROVADO**: Requisitos rastreados, regras testadas, testes adversariais executados, 0 mutantes sobreviventes, regressão e build 100% OK.
- **REPROVADO**: Qualquer falha crítica, regressão ou violação contábil identificada.
- **BLOQUEADO**: Cobertura crítica inconclusiva, mutante crítico sobrevivente ou bloqueio de ambiente.

### Nível de Confiança
- **ALTO**: Requisitos rastreados + código inspecionado + testes executados + mutation checks executados + regressão + build sem lacunas.
- **MÉDIO**: Funciona, mas com limitação de escopo ou cobertura.
- **BAIXO**: Poucos testes, inspeção superficial ou ausência de testes adversariais.

---

# 7. FORMATO DO RELATÓRIO NO TEST

Todo relatório de validação deve ser emitido no formato padrão com:
- `# RELATÓRIO NO TEST`
- `## Status`
- `## Nível de Confiança`
- `## Resumo`
- `## Baseline`
- `## Rastreabilidade`
- `## Mutation Check`
- `## Inspeção de Código`
- `## Testes Executados`
- `## Regressão`
- `## Build`
- `## Falhas`
- `## Warnings`
- `## Correções`
- `## Decisão Final`
- `## Limitações`

