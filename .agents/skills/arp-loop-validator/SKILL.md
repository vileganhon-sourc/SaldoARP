---
name: arp-loop-validator
description: Executa um ciclo autônomo de engenharia em arquitetura multiagente (Orquestrador, Implementador, Verificador) para implementar, validar, auditar e comprovar regras contábeis e de software do SaldoARP até aprovação formal.
---

# arp-loop-validator

## Objetivo

Executar um ciclo autônomo e adversarial de engenharia de software para implementar, validar e corrigir módulos do **SaldoARP** até que todos os critérios do `/goal` sejam formalmente comprovados e aprovados pelo Verificador independente.

---

# 1. ARQUITETURA MULTIAGENTE DO LOOP

```
                     /goal (Requisitos & Invariantes)
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   ORQUESTRADOR    │
                         │                   │
                         │ Coordena o ciclo  │
                         └─────────┬─────────┘
                                   │
                            ┌──────▼──────┐
                            │IMPLEMENTADOR│
                            │             │
                            │ Cria código │
                            │ Cria testes │
                            └──────┬──────┘
                                   │
                            código / testes
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    VERIFICADOR    │
                         │                   │
                         │ Auditoria Crítica │
                         │ Tenta quebrar a   │
                         │ implementação     │
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

### 1.3. Subagente: `verificador`
- **Papel**: Auditor independente e adversarial.
- **Função**: Executa testes adversariais, verifica capacidade de falha, inspeciona ausência de dados fictícios e é a **única autoridade que pode emitir `APPROVED`** para encerrar o ciclo.

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

# 3. MATRIZ DOS 20 TESTES OBRIGATÓRIOS

Toda suíte de testes de saldo deve conter obrigatoriamente os seguintes 20 cenários verificáveis (capazes de falhar se a implementação estiver incorreta):

| Nº | Regra / Cenário | Condição de Entrada | Resultado Esperado |
| :---: | :--- | :--- | :--- |
| **1** | 255 reg + 0 emp | Qtd: 255, Empenhos: 0 | Saldo = 255 |
| **2** | 255 reg + emp de 27 | Qtd: 255, Empenho: 27 | Saldo = 228 |
| **3** | 255 reg + emp 27, 15, 20 | Qtd: 255, Empenhos: 27, 15, 20 | Total = 62, Saldo = 193 |
| **4** | Empenho sem contrato | Empenho isolado | Válido e entra no cálculo |
| **5** | Contrato com 1 empenho | Contrato + 1 empenho | Válido (`valid: true`) |
| **6** | Contrato com vários empenhos | Contrato + 3 empenhos | Válido (`valid: true`) |
| **7** | Contrato sem empenho | Contrato + 0 empenhos | Inválido / Rejeitado (`valid: false`) |
| **8** | Inclusão de contrato | Adicionar contrato pós-empenho | Saldo permanece inalterado |
| **9** | Vínculo contrato $\to$ empenho | Vincular contrato ao empenho | Total empenhado não duplica |
| **10** | Múltiplos vínculos | Mesma NE em 2 contratos | Consumo conta 1 única vez |
| **11** | Empenho manual no saldo | NE API (42) + NE Manual (20) | Total = 62, Saldo = 193 |
| **12** | Origem MANUAL identificada | Cadastro manual | Preserva `origem: 'MANUAL'` |
| **13** | Promoção automática | Manual NE 700 + API NE 700 | 1 registro `SINCRONIZADO` |
| **14** | Divergência de quantidade | Manual (30 un) != API (25 un) | Status `DIVERGENTE` |
| **15** | Empenho > Qtd registrada | Registrado 100, Empenhado 120 | Saldo = -20 (Excesso sinalizado) |
| **16** | Saldo zero | Registrado 255, Empenhado 255 | Saldo = 0, CONSISTENTE |
| **17** | Alteração de quantidade | Editar NE de 50 para 75 | Recalcula saldo imediatamente |
| **18** | Exclusão de empenho | Remover NE de 15 | Saldo é restaurado |
| **19** | Saldo API == Saldo Calculado | Saldo Calc 193 == Saldo API 193 | `✓ SALDOS CONSISTENTES` |
| **20** | Saldo API != Saldo Calculado | Saldo Calc 193 != Saldo API 200 | `⚠️ Divergência de 7 un` |

---

# 4. REGRA DE OURO: CAPACIDADE DE FALHAR

**"Nunca confie em um teste que você não viu falhar."**

Cada teste deve comprovar que:
- Se a função subtraísse contratos do saldo $\to$ o teste 8 e 9 **falhariam**.
- Se um empenho em 2 contratos somasse duas vezes $\to$ o teste 10 **falharia**.
- Se um contrato sem empenho fosse aceito $\to$ o teste 7 **falharia**.
- Se uma divergência de saldo fosse ignorada $\to$ o teste 20 **falharia**.

---

# 5. PROTOCOLO DE CONCLUSÃO (DONE)

O ciclo só pode ser encerrado quando:
- `npm run build` passar com 0 erros de tipagem/bundling.
- `npx vitest run` aprovar 100% dos testes unitários e de regressão.
- O subagente **Verificador** emitir o relatório `APPROVED` com **Confiança ALTA**.
