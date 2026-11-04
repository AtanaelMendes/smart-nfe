# Scope: Milestone 2 — M2_Core_Domain_Services

## Mission & Scope
Implementar a camada central de serviços de domínio, motor de cálculo decimal fiscal sem ponto flutuante binário, formatadores universais, persistência local versionada (schema 1.0.0) e repositórios assíncronos (`app/features/`), além de sanar os débitos técnicos catalogados pelo Challenger no Milestone 1.

## Deliverables & Tasks
1. **Motor de Cálculos Decimais (`app/lib/calculations/`)**:
   - `decimal.js`: Funções fundamentais operando exclusivamente sobre strings decimais (`decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `roundDecimal`). Sem aproximação de float binário.
   - `invoiceTotals.js`: `calculateItemTotal(unitPriceStr, qtyStr)`, `calculateInvoiceTotals(items, discount, freight, insurance)`.
   - `divisionMath.js`: `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)` retornando `{ balanceStr, status: 'ok' | 'remaining' | 'excess' }`.
2. **Central de Formatadores (`app/lib/formatters/`)**:
   - `currency.js`: Corrigir `parseBRL` para aceitar tanto vírgula quanto ponto decimal sem inflacionar o valor por 100.
   - `dates.js`: Tratamento estrito de datas com validação de limites (sem rollover espúrio).
   - `numbers.js`: `formatQuantity` (até 4 casas decimais), `formatDecimal`.
3. **Mocks Fiscais de Exportação (`app/lib/data/mockInvoices.js`)**:
   - Corrigir a matemática interna dos itens de `demo-02` (unit * qtd = item total).
   - Corrigir os itens de `demo-05` (`d5-15` = 28.120,00 e soma dos 15 itens = 342.000,00).
   - Documentar explicitamente as inconsistências de `demo-04` para o validador.
4. **Persistência Local Versionada (`app/lib/storage/localStorageService.js`)**:
   - Schema version `1.0.0`.
   - Métodos assíncronos e síncronos seguros: `save(key, data)`, `load(key, fallback)`, `reset(key)`, `resetAll()`.
   - Tratamento de corrupção e fallback automático para os dados mockados padrão.
5. **Repositórios Assíncronos (`app/features/`)**:
   - `invoiceRepository.js`: Contrato padrão `list(filters)`, `findById(id)`, `update(id, partialData)`, `updateItem(id, itemId, partialItemData)`, `getValidationIssues(id)`, `resetDemoData()`.
   - `preparedInvoiceRepository.js`: Contrato `list(filters)`, `findById(id)`, `create(data)`, `delete(id)`.
6. **DataTable Proteção de Resiliência (`app/components/table/DataTable.jsx`)**:
   - Aplicar correção sugerida pelo Challenger 1: `safeData = Array.isArray(data) ? data : []` para evitar quebra com `data={null}`.
7. **Testes Automatizados Tier 1 e Tier 2 (`tests/tier1/m2_domain.test.mjs`)**:
   - Testes unitários para cálculos decimais (soma, subtração, multiplicação, divisão, escala, arredondamento ABNT).
   - Testes para formatadores (moedas com ponto e vírgula, datas válidas e inválidas, quantidades fiscais).
   - Testes de integridade matemática dos 5 cenários.
   - Testes de persistência (save, load, schema versioning, reset, resetAll).
   - Testes de contrato dos repositórios (`list`, `findById`, `update`, `updateItem`, `getValidationIssues`).

## Hard Constraints
- NÃO rodar `pnpm build` ou `pnpm dev`. O servidor de desenvolvimento continua ativo em http://localhost:3000/dashboard.
- JavaScript/JSX puro (zero TypeScript).
- Cálculos monetários e de quantidades fiscais utilizando strings decimais em `app/lib/calculations/` (proibido aritmética de float binário direto para totais e saldos).
- Verificação executada via `node --no-warnings --test tests/**/*.test.mjs` e `npx eslint`.
