---
name: arp-loop-validator
description: Executa um ciclo autônomo de engenharia para implementar, validar e corrigir módulos do SaldoARP com loop TDD, validação contábil, integridade de dados e comprovação de critérios até satisfação do /goal.
---

# arp-loop-validator

## Objetivo

Executar um ciclo autônomo de engenharia para implementar, validar e corrigir
um módulo de software até que o `/goal` seja comprovadamente satisfeito.

A Skill deve:

1. inspecionar o estado atual do projeto;
2. identificar as regras e critérios de aceitação definidos no `/goal`;
3. compilar/buildar o projeto;
4. executar lint/typecheck quando disponíveis;
5. executar testes automatizados;
6. validar explicitamente as regras de negócio;
7. identificar falhas;
8. corrigir a implementação;
9. executar novamente os testes;
10. repetir o ciclo até que todos os critérios verificáveis do `/goal` sejam satisfeitos.

A Skill NÃO deve considerar "código escrito" como sinônimo de "objetivo concluído".

---

# 1. PRINCÍPIO FUNDAMENTAL

O `/goal` define O QUE deve estar pronto.

A Skill define COMO validar e corrigir até que esteja pronto.

Nunca substituir critérios explícitos do `/goal` por uma interpretação subjetiva de "parece funcionar".

Um objetivo só pode ser declarado DONE quando houver evidência verificável.

---

# 2. FLUXO PRINCIPAL

Executar continuamente o seguinte ciclo:

INSPECIONAR
→ COMPILAR
→ TESTAR
→ VALIDAR REGRAS
→ ANALISAR FALHAS
→ CORRIGIR
→ COMPILAR
→ TESTAR
→ VALIDAR
→ repetir

Parar somente quando:

* todos os critérios do `/goal` estiverem satisfeitos;
* build/compilação estiver funcionando;
* typecheck estiver funcionando, quando disponível;
* lint estiver funcionando, quando disponível;
* testes relevantes estiverem passando;
* testes de regressão estiverem passando;
* regras críticas de negócio estiverem validadas;
* não existirem falhas conhecidas não justificadas.

---

# 3. ETAPA 1 — INSPECIONAR

Antes de alterar código:

* identificar stack tecnológica;
* identificar package manager;
* identificar scripts disponíveis;
* localizar testes existentes;
* localizar arquivos relacionados ao módulo;
* localizar serviços;
* localizar componentes;
* localizar schema/migrations;
* identificar integrações externas;
* identificar regras de negócio existentes;
* identificar possíveis mocks, fallbacks ou dados hardcoded.

Não reescrever código sem necessidade.

Preservar funcionalidades existentes.

Preferir alterações pequenas, rastreáveis e reversíveis.

---

# 4. ETAPA 2 — INTERPRETAR O /goal

Transformar o `/goal` em uma checklist verificável.

Classificar cada requisito como:

* FUNCTIONAL
* BUSINESS_RULE
* DATA_INTEGRITY
* API_INTEGRATION
* UI
* TEST
* REGRESSION
* SECURITY
* PERFORMANCE

Para cada requisito, identificar:

* entrada;
* condição;
* resultado esperado;
* teste correspondente.

Se um requisito crítico não possuir forma objetiva de validação, criar uma estratégia de validação antes de declarar conclusão.

---

# 5. ETAPA 3 — COMPILAR

Executar os comandos adequados ao projeto.

Exemplos:

* npm run build
* npm run typecheck
* npm run lint

Usar os scripts realmente existentes no projeto.

Não inventar comandos.

Se a compilação falhar:

1. identificar a causa;
2. corrigir;
3. executar novamente.

Não prosseguir para DONE enquanto erros introduzidos pelo trabalho permanecerem.

---

# 6. ETAPA 4 — TESTAR

Executar:

1. testes unitários;
2. testes de integração;
3. testes de regras de negócio;
4. testes de regressão disponíveis.

Quando não houver testes suficientes para uma regra crítica:

* criar o teste;
* executar;
* confirmar que o teste é significativo;
* corrigir a implementação;
* executar novamente.

---

# 7. REGRA: TESTE DEVE SER CAPAZ DE FALHAR

Todo teste crítico deve ser capaz de detectar uma implementação incorreta.

Para cada regra importante, procurar ter:

* cenário válido;
* cenário inválido;
* cenário limite;
* cenário de regressão, quando aplicável.

Sempre que possível:

1. criar o teste;
2. executar contra a implementação incorreta ou atual;
3. confirmar que falha pelo motivo esperado;
4. implementar a correção;
5. executar novamente;
6. confirmar PASS.

Nunca alterar um teste simplesmente para fazê-lo passar.

Se o requisito de negócio mudou, alterar primeiro o `/goal` ou a especificação correspondente.

---

# 8. VALIDAÇÃO ESPECÍFICA DO SALDO

Quando o `/goal` envolver saldo de ARP, aplicar obrigatoriamente:

## Regra fundamental

Saldo = Quantidade Registrada - Soma das Quantidades Empenhadas

O Contrato NÃO reduz diretamente o saldo.

A Alocação NÃO reduz diretamente o saldo da ARP.

O Empenho é o evento que consome quantidade.

## Invariantes

Quantidade Registrada = Total Empenhado + Saldo

Total Empenhado = Soma dos Empenhos considerados válidos

Empenho sem Contrato = válido

Contrato sem Empenho = inválido

Contrato não pode provocar dupla contagem de Empenho

Saldo negativo não deve ser silenciosamente convertido em zero.

---

# 9. VALIDAÇÃO DE EMPENHOS

Verificar:

* empenho retornado pela API;
* empenho inserido manualmente;
* identificação da origem;
* prevenção de duplicidade;
* alteração;
* exclusão/cancelamento;
* impacto no saldo;
* correspondência posterior entre registro manual e API.

Um Empenho manual deve ser identificado como MANUAL.

Um Empenho posteriormente confirmado pela API não deve gerar duplicidade.

---

# 10. VALIDAÇÃO DE CONTRATOS

Verificar:

* contrato retornado pela API;
* contrato manual;
* contrato com um empenho;
* contrato com vários empenhos;
* contrato sem empenho;
* vínculos;
* duplicidade;
* impacto no saldo.

Regra obrigatória:

Contrato sem Empenho = inválido.

Regra obrigatória:

Adicionar ou remover vínculo de Contrato não pode alterar diretamente o saldo da ARP.

---

# 11. VALIDAÇÃO API × DADOS MANUAIS

Quando houver duas fontes:

API
MANUAL

não sobrescrever silenciosamente informações divergentes.

Classificar:

* CONFIRMADO;
* MANUAL;
* CORRESPONDENTE;
* DIVERGENTE;
* NÃO LOCALIZADO.

Quando um registro manual posteriormente aparecer na API:

* detectar correspondência;
* evitar duplicidade;
* preservar histórico/origem;
* sinalizar eventual divergência.

---

# 12. DADOS ARTIFICIAIS

Não utilizar dados de negócio fictícios para fazer a aplicação funcionar.

Não criar fallback que produza:

* empenho fictício;
* contrato fictício;
* fornecedor fictício;
* CNPJ hardcoded;
* quantidade artificial;
* valor artificial;
* número PNCP artificial.

Quando uma API não encontrar informação:

API não encontrou
→ informar ausência
→ permitir entrada manual quando previsto pelo /goal

Não:

API não encontrou
→ inventar registro.

---

# 13. RECONCILIAÇÃO

Quando existir saldo informado por uma fonte externa, comparar com o saldo calculado.

Exemplo:

Quantidade registrada = 255

Empenhos:
27 + 15 + 20 = 62

Saldo calculado = 193

Saldo API = 193

Resultado:

CONSISTENTE

Se:

Saldo calculado = 193
Saldo API = 200

Resultado:

DIVERGÊNCIA = 7

Nunca mascarar divergências.

---

# 14. LOOP DE CORREÇÃO

Quando um teste ou validação falhar:

1. identificar exatamente qual critério falhou;
2. localizar a causa;
3. corrigir a causa;
4. evitar corrigir apenas o sintoma;
5. executar novamente o teste que falhou;
6. executar testes relacionados;
7. executar a suíte de regressão;
8. voltar ao início do ciclo.

Priorizar:

REGRA DE NEGÓCIO
→ INTEGRIDADE DOS DADOS
→ TESTES
→ IMPLEMENTAÇÃO
→ UI

Não corrigir UI para esconder erro de regra de negócio.

---

# 15. PREVENÇÃO DE REGRESSÃO

Após cada alteração relevante:

* executar teste específico;
* executar testes relacionados;
* executar suíte de regressão.

Uma funcionalidade previamente aprovada não pode ser quebrada para fazer outro critério passar.

Se isso ocorrer:

1. identificar conflito;
2. corrigir a implementação;
3. preservar ambos os comportamentos quando possível;
4. criar teste de regressão permanente.

---

# 16. LIMITE DO LOOP

Não entrar em loop infinito.

Se a mesma falha persistir após várias tentativas de correção:

1. parar a alteração;
2. diagnosticar a causa;
3. registrar a falha;
4. informar qual requisito está bloqueado;
5. informar quais hipóteses foram testadas;
6. não declarar DONE.

Nunca remover ou enfraquecer um requisito para escapar de uma falha.

Nunca apagar um teste porque ele impede a conclusão.

---

# 17. CRITÉRIO DE DONE

Declarar DONE somente quando:

[ ] /goal interpretado

[ ] Todos os critérios funcionais satisfeitos

[ ] Regras de negócio satisfeitas

[ ] Build passando

[ ] Typecheck passando, quando disponível

[ ] Lint passando, quando disponível

[ ] Testes unitários passando

[ ] Testes de integração passando, quando aplicável

[ ] Testes de regressão passando

[ ] Testes críticos demonstradamente capazes de detectar falhas

[ ] Nenhum dado artificial introduzido

[ ] Nenhum mock/fallback de negócio utilizado para mascarar ausência de dados

[ ] Integridade dos dados preservada

[ ] Alterações documentadas

[ ] Nenhuma falha conhecida relacionada ao /goal

Somente então declarar:

DONE

---

# 18. RELATÓRIO FINAL

Ao concluir o loop, produzir relatório objetivo contendo:

## Implementado

Lista das alterações realizadas.

## Arquivos alterados

Lista dos arquivos.

## Regras validadas

Lista das regras de negócio testadas.

## Testes

Para cada teste:

* nome;
* resultado;
* PASS/FAIL.

## Build

Resultado.

## Typecheck

Resultado.

## Lint

Resultado.

## Regressão

Resultado.

## Evidências

Informar os comandos executados e os resultados relevantes.

## Pendências

Se houver qualquer requisito não atendido, não declarar DONE.

Informar:

* requisito;
* motivo;
* impacto;
* próximo passo recomendado.

---

# 19. PRINCÍPIO FINAL

A Skill deve otimizar para:

CORREÇÃO
+
EVIDÊNCIA
+
REPETIBILIDADE

e não para:

VELOCIDADE
ou
QUANTIDADE DE CÓDIGO PRODUZIDO.

O objetivo do loop não é "alterar o projeto".

O objetivo é produzir um estado do projeto no qual seja possível demonstrar que o /goal foi satisfeito.
