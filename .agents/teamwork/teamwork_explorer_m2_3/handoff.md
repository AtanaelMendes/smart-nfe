# Handoff Report — Formatters, Mock Refinements, DataTable Resilience & M2 Test Suite Strategy

**Agente:** `teamwork_explorer_m2_3`  
**Data:** 2026-11-04  
**Milestone:** Milestone 2 (Core Domain Services & Calculations)  
**Destinatário:** Sub-orquestrador Milestone 2 (`3aeeebdd-68a6-49e6-8f40-494114a9f1f7`)  
**Status do Handoff:** HARD (Estratégia completa, documentada e pronta para implementação)  

---

## 1. Observation

Durante a investigação empírica do repositório `c:\www\smart-nfe`, foram observados os seguintes fatos concretos:

1. **`parseBRL` em `app/lib/formatters/currency.js` (linhas 51-58)**:
   ```javascript
   const cleaned = String(strVal)
     .replace(/[R$\s]/g, '')
     .replace(/\./g, '')
     .replace(',', '.');
   ```
   A remoção incondicional de todos os pontos (`.replace(/\./g, '')`) faz com que `parseBRL("1250.50")` resulte em `125050` (inflação de 100x), confirmado empiricamente na suite adversarial (`tests/tier5/m1_adversarial_stress.test.mjs`, linha 141-146).

2. **`formatDateBR` em `app/lib/formatters/dates.js` (linhas 17-23)**:
   ```javascript
   const [year, month, day] = dateInput.split('-').map(Number);
   dateObj = new Date(Date.UTC(year, month - 1, day));
   ```
   Para entradas com valores fora dos limites do calendário gregoriano (ex: `"2026-99-99"` ou `"2026-02-31"`), `Date.UTC` executa rollover automático, gerando `07/06/2034` em vez de retornar o fallback seguro `"-"`.

3. **Ausência de `app/lib/formatters/numbers.js`**:
   O diretório `app/lib/formatters/` continha apenas `currency.js`, `dates.js` e `status.js`. Não havia utilitário para formatar quantidades aduaneiras com até 4 casas decimais (`formatQuantity`) e decimais genéricos (`formatDecimal`).

4. **`DataTable.jsx` com `data={null}` (linha 171)**:
   ```jsx
   <td colSpan={effectiveColumns.length || 1} className={cellPadding}>
     Exibindo {filteredData.length} de {data.length} registros
   </td>
   ```
   Quando `data={null}` é passado, `data = []` default não é ativado pelo runtime JS, lançando:
   `TypeError: Cannot read properties of null (reading 'length')`.

5. **Discrepâncias matemáticas em `app/lib/data/mockInvoices.js`**:
   - `demo-02` (linhas 81-99): A quantidade é `1.0000`, mas `valorUnitario` variava entre 5075.0000 e 6875.0000 com `valorTotal: '5950.00'` fixo. Em todos os 25 itens `1.0000 * unit != total`.
   - `demo-05` (linhas 254-284): O item 15 (`d5-15`) possuía `quantidade: '74.0000'`, `valorUnitario: '380.0000'` e `valorTotal: '28150.00'` (quando `74 * 380 = 28.120,00`). Além disso, a soma dos 15 itens originais totalizava `363.970,00`, divergindo do cabeçalho de `342.000,00` e das duas notas preparadas `prep-01` (`134.750,00`) e `prep-02` (`207.250,00`).

6. **Interdependência com testes existentes em `tests/tier5/m1_adversarial_stress.test.mjs`**:
   O arquivo continha 4 asserções que validavam a presença desses bugs do M1 (linhas 144, 500, 590 e 665). Ao aplicar as correções, essas 4 linhas precisam ser atualizadas para validar o comportamento corrigido.

---

## 2. Logic Chain

1. **Correção de `currency.js`**:
   - A partir da observação 1, identificou-se que entradas monetárias podem vir no padrão brasileiro (`"1.250,50"`) ou no padrão decimal padrão (`"1250.50"`).
   - Inspecionando a presença de vírgula e ponto e sua ordem relativa (`lastIndexOf`), é possível determinar inequivocamente o separador decimal: se a vírgula vier depois do ponto, é padrão BR; se o ponto vier depois da vírgula ou se houver apenas um ponto sem vírgula, o ponto é separador decimal.
   - Isso elimina a inflação de 100x em strings decimais puras mantendo suporte completo a moedas brasileiras formatadas.

2. **Correção de `dates.js`**:
   - A partir da observação 2, validando se `month` está entre 1 e 12 e `day` entre 1 e 31, e em seguida comparando `dateObj.getUTCFullYear() === year && dateObj.getUTCMonth() === month - 1 && dateObj.getUTCDate() === day`, qualquer rollover de calendário (ex: 31 de fevereiro ou dia 99) é imediatamente interceptado, retornando `"-"`.

3. **Criação de `numbers.js`**:
   - A partir da observação 3 e dos requisitos de exportação (até 4 casas decimais para itens aduaneiros), implementou-se `formatQuantity(value, maxDecimals = 4, minDecimals = 0)`, `formatDecimal(value, decimals = 2)` e `parseDecimal(value)` utilizando `Intl.NumberFormat('pt-BR')`.

4. **Correção de `DataTable.jsx`**:
   - A partir da observação 4, normalizando `const safeData = Array.isArray(data) ? data : [];` no início do componente e utilizando `safeData` em `filteredData` e no rodapé `safeData.length`, o componente torna-se 100% tolerante a `data={null}` ou `data={undefined}`.

5. **Calibração de `mockInvoices.js`**:
   - Para `demo-02`: utilizando a variação simétrica `price = 5950 + (num - 13) * 50`, `unit` e `total` tornam-se iguais para cada item (com `qtd = 1.0000`), a soma dos 25 itens é exatamente `25 * 5950.00 = 148.750,00` e preserva-se o KPI do Dashboard (`1497050.00`).
   - Para `demo-05`: ajustou-se o item 15 para `quantidade: '74.0000'`, `valorUnitario: '380.0000'`, `valorTotal: '28120.00'` e calibrou-se as toneladas dos lotes de modo que os 6 itens de `prep-01` somem exatamente `134.750,00`, os 9 itens de `prep-02` somem `207.250,00` e o total geral dos 15 itens seja exatamente `342.000,00`.

---

## 3. Caveats

1. **Servidor Ativo em localhost:3000**:
   - O servidor Next.js está em execução contínua no host. NÃO foi executado e NÃO deve ser executado `pnpm dev` ou `pnpm build`.
2. **Atualização das 4 asserções em `m1_adversarial_stress.test.mjs`**:
   - As 4 asserções de snapshot de vulnerabilidade (linhas 144, 500, 590, 665) foram desenhadas no M1 para demonstrar as falhas. Quando o implementador aplicar as correções, deve também atualizar essas 4 linhas para validar o estado corrigido, garantindo que `npm test` continue passando com 100% de sucesso.
3. **Escopo Restrito a Investigação**:
   - Este agente não alterou arquivos de produção em `app/` ou `tests/`, apenas produziu a estratégia e relatórios em sua pasta de trabalho `.agents/teamwork/teamwork_explorer_m2_3/`.

---

## 4. Conclusion

A estratégia para Formatadores, Refinamentos de Mocks, Resiliência do DataTable e Suite de Testes do Milestone 2 está completamente formulada, matematicamente balanceada ao centavo e pronta para execução imediata pelo Worker.

O documento detalhado com todos os códigos-fonte propostos encontra-se em:
`c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_3\strategy_formatters_mocks_tests.md`

---

## 5. Verification Method

Para verificar a implementação pelo implementador:

1. **Execução de Testes Nativos Node 24**:
   ```bash
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   node --no-warnings --test tests/**/*.test.mjs
   ```
2. **Critérios de Sucesso**:
   - `parseBRL('1250.50')` retorna `1250.5`.
   - `formatDateBR('2026-99-99')` retorna `"-"`.
   - `formatQuantity('500.1234')` retorna `"500,1234"`.
   - `<DataTable data={null} />` não lança exceção.
   - Todos os 25 itens de `demo-02` satisfazem `qtd * unit == total`.
   - `demo-05` possui item 15 com `28.120,00` e soma dos 15 itens igual a `342.000,00`.
   - 100% dos testes em `tests/**/*.test.mjs` passam com código de saída 0.
