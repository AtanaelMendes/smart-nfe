# SmartNFe — Test Ready: Fixtures Sintéticas e Testes de Integração Automatizados (R5)

**Data de Publicação:** 2026-11-09T19:50:00Z  
**Responsável:** E2E Test Writer (`teamwork_test_writer_e2e`)  
**Runner:** Node.js 24 native test runner (`node:test`, `assert/strict`)  
**Comando de Execução:**  
```powershell
node --no-warnings --test tests/integration/*.test.mjs
```
**Resultado:** **43 testes passando em 18 suites (100% sucesso, 0 falhas)**

---

## 1. Fixtures Sintéticas NF-e Modelo 55 (`tests/fixtures/`)

| Arquivo Fixture | Descrição e Conformidade | Chave de Acesso (44 dígitos) | DV Módulo 11 (2..9) | Status |
|-----------------|--------------------------|------------------------------|---------------------|:------:|
| `tests/fixtures/synthetic_nfe_export_proc.xml` | Envelope `nfeProc` v4.00 completo com `protNFe` (status 100), emitente nacional (`Agroexport Brasil S.A.`), destinatário no exterior (`Global Trading Logistics B.V.`, Holanda, UF `EX`), 2 itens de exportação (CFOP 7101, NCMs 09011110 e 84089090), frete R$ 5.000,00, seguro R$ 1.200,00, outras despesas R$ 500,00 e valor total da NF-e R$ 173.450,00. | `35241112345678000190550010001458921001234562` | DV = 2 (Matematicamente Válido) | ✓ Íntegro |
| `tests/fixtures/synthetic_nfe_simple.xml` | XML em formato `NFe` avulso (sem envelope `nfeProc` e sem protocolo de autorização). Operação interna (CFOP 5102, NCM 22042100), desconto comercial R$ 100,00, frete R$ 350,00, seguro R$ 90,00 e total da NF-e R$ 19.000,00. | `35241198765432000188550010000000421007890120` | DV = 0 (Resto 0 $\implies$ DV 0) | ✓ Íntegro |
| `tests/fixtures/synthetic_nfe_invalid_key.xml` | XML baseado na operação de exportação com Dígito Verificador propositalmente corrompido para `9` (quando o cálculo matemático oficial exige `2`), para teste de rejeição ativa. | `35241112345678000190550010001458921001234569` | DV = 9 (Corrompido / Rejeição) | ✓ Íntegro |
| `tests/fixtures/synthetic_malformed.xml` | Arquivo XML sintaticamente quebrado (tag aberta sem fechamento), para teste de resiliência e tratamento gracioso de erro sem travamento. | N/A | N/A | ✓ Íntegro |

---

## 2. Cobertura dos Testes de Integração (`tests/integration/`)

### 2.1. Fluxo A: Importação Real de XML NF-e Modelo 55 (`flow_a_xml_import.test.mjs`)
- **Arquivo:** `tests/integration/flow_a_xml_import.test.mjs` (14 testes, 5 suites)
- **Requisitos Cobertos:** R3, R5
- **Cenários Testados:**
  1. *Chave de Acesso e Módulo 11:* Validação estrutural de 44 dígitos com pesos 2 a 9 (chave oficial da exportação com DV 2; chave avulsa com DV 0; rejeição expressa de chave corrompida com DV 9; rejeição de chaves com 43 dígitos, modelo 65 NFC-e e mês 13).
  2. *Extração e Normalização:* Suporte transparente a envelopes `nfeProc` e `NFe` avulso; extração de emitente, destinatário no exterior (`idEstrangeiro`, país Holanda, UF `EX`) e protocolo de autorização (`nProt` 135240001234567, `cStat` 100).
  3. *Precisão de Itens:* Conservação de 4 casas decimais em quantidades (`500.0000`, `10.0000`) e valores unitários (`25.5000`, `15400.0000`); identificadores estáveis `itemId = nfe-${chaveAcesso}-item-${nItem}`.
  4. *Conciliação de Totais:* `vProd - vDesc + vFrete + vSeg + vOutro === vNF` reconciliado com precisão decimal exata.
  5. *Tratamento de XML Quebrado:* Detecção de `parsererror` e rejeição graciosa em `synthetic_malformed.xml` sem exceptions não tratadas.
  6. *Isolamento de Memória de Sessão:* Garantia de flags `isRealImport: true` e `isDemo: false`; proteção estrita contra vazamento de dados fiscais reais para o LocalStorage permanente; imunidade da sessão ativa ao comando `resetDemoData()`.

### 2.2. Fluxo B: Conferência com Edição Estável e Recálculo Decimal (`flow_b_conferencia_stable_edit.test.mjs`)
- **Arquivo:** `tests/integration/flow_b_conferencia_stable_edit.test.mjs` (11 testes, 4 suites)
- **Requisitos Cobertos:** R1, R4, R5
- **Cenários Testados:**
  1. *Edição Estável por `itemId`:* Edição de itens sob tabela filtrada por NCM (`09011110`) atualiza exclusivamente a linha selecionada e não modifica itens adjacentes.
  2. *Filtro por Descrição e Ordenação:* Edição sob filtro textual e sob ordenação invertida afeta estritamente o item direcionado.
  3. *Itens com Códigos e Descrições Repetidas:* Linhas duplicadas (`EXP-VAL-003`) mantêm identidades independentes via `itemId` imutável.
  4. *Motor Decimal Puro:* Eliminação de desvios IEEE 754 (`0.1 + 0.2 = 0.30`); aplicação de arredondamento Half-Up ABNT NBR 5891 em frações críticas.
  5. *Preservação de Despesas Acessórias:* Recálculo do total da NF-e preserva integralmente frete, seguro, outras despesas e descontos sem substituição por soma simplificada de produtos.
  6. *Snapshot de `valorOriginal`:* Criação de snapshot na 1ª alteração; imutabilidade do snapshot em edições sucessivas.
  7. *Restauração:* Restauração individual com `handleRestoreItem` e em lote com `handleRestoreAll`, reconciliando totais ao baseline original.

### 2.3. Fluxo C: Divisão de Notas com Conservação de Saldos (`flow_c_division_balances.test.mjs`)
- **Arquivo:** `tests/integration/flow_c_division_balances.test.mjs` (11 testes, 5 suites)
- **Requisitos Cobertos:** R1, R4, R5
- **Cenários Testados:**
  1. *Conservação Decimal:* Divisão de produtos com 4 casas decimais (`333.3333`) sem arredondamento prematuro para 2 casas.
  2. *Distribuição de Saldo Restante:* Ação de alocar resíduo para uma nota específica zerando a pendência com precisão absoluta.
  3. *Distribuição Equilibrada:* Divisão igualitária em N notas com preservação estrita da quantidade total (compensação do resíduo fracionário na última nota).
  4. *Bloqueio de Alocação Excessiva:* Alocação maior que a quantidade disponível marca `status: 'excess'`, `hasExcess: true` e bloqueia `canSave: false`.
  5. *Bloqueio de Saldos Pendentes:* Quantidades não alocadas acusam `hasRemaining: true` e impedem a conclusão da divisão (`isBalanced: false`).
  6. *Adição e Remoção Dinâmica:* Inserção de 3ª nota e remoção de nota de destino com recálculo automático instantâneo dos saldos.
  7. *Rateio de Despesas Acessórias:* Rateio proporcional de frete (`R$ 5.000,00`) entre notas preservando a soma total exata.

### 2.4. Fluxo D: Validação Fiscal, Correção Segura e Mecanismo de Undo (`flow_d_validation_safe_fix_undo.test.mjs`)
- **Arquivo:** `tests/integration/flow_d_validation_safe_fix_undo.test.mjs` (7 testes, 4 suites)
- **Requisitos Cobertos:** R2, R5
- **Cenários Testados:**
  1. *Auditoria de Apontamentos:* Detecção dos 4 apontamentos fiscais previstos no cenário `demo-04` (CFOP de exportação, classificação NCM, divergência matemática e unidade aduaneira).
  2. *Confirmação Explícita:* Exibição de valores atual e proposto, campo e origem da regra; suporte a cancelamento sem alterações no documento.
  3. *Bloqueio de "Corrigir Todas" em Campos Sensíveis:* A funcionalidade em massa aplica apenas correções mecânicas (matemática e unidades) e bloqueia expressamente alterações em massa de CFOP e NCM.
  4. *Mecanismo de Desfazer (Undo):* Reversão atômica do valor no repositório; reexecução automática do validador fiscal; reabertura do apontamento na lista.
  5. *Pilha LIFO Sequencial:* Suporte a múltiplos passos de Undo em ordem cronológica inversa restaurando o documento ao estado inicial.

---

## 3. Matriz de Rastreabilidade

| Requisito Original | Especificação | Fixture / Suite de Teste | Status |
|:------------------:|:-------------:|:------------------------:|:------:|
| **R1** (Tabela Conferência & Decimais) | `itemId` estável, precisão 4 decimais, preservação frete/seguro | `flow_b_conferencia_stable_edit.test.mjs`, `flow_c_division_balances.test.mjs` | **PASS (100%)** |
| **R2** (Assistente Fiscal & Undo) | Confirmação explícita, bloqueio em massa CFOP/NCM, Undo stack | `flow_d_validation_safe_fix_undo.test.mjs` | **PASS (100%)** |
| **R3** (Importador XML Modelo 55) | Leitura XML, Chave 44 dígitos DV Mod 11, Isolamento sessão | `flow_a_xml_import.test.mjs`, 4 fixtures sintéticas | **PASS (100%)** |
| **R4** (Interface & Divisão) | Snapshot `valorOriginal`, rateio restante/equilibrado, bloqueio excesso | `flow_b_conferencia_stable_edit.test.mjs`, `flow_c_division_balances.test.mjs` | **PASS (100%)** |
| **R5** (Testes de Integração Node 24) | `node:test`, `assert/strict`, zero erros de execução | Suíte completa em `tests/integration/` | **PASS (100%)** |

---

## 4. Instruções de Execução

Executar toda a suíte de testes de integração:
```powershell
node --no-warnings --test tests/integration/*.test.mjs
```

Executar suítes individuais:
```powershell
node --no-warnings --test tests/integration/flow_a_xml_import.test.mjs
node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs
node --no-warnings --test tests/integration/flow_c_division_balances.test.mjs
node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs
```
