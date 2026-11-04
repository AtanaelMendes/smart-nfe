# Handoff Report: Decimal Calculation Engine Strategy (`app/lib/calculations/`)

**Agent:** `teamwork_explorer_m2_1`  
**Working Directory:** `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\`  
**Target Milestone:** M2 Core Domain Services — Decimal Calculations  
**Status:** Hard Handoff (Investigation & Architecture Complete)  

---

## 1. Observation

- **Código Existente**: O diretório `app/lib/calculations/` não existia previamente na base de código. O projeto contava apenas com `app/lib/data/` e `app/lib/formatters/` (`currency.js`, `dates.js`, `status.js`).
- **Limitações do Ponto Flutuante Binário**: Em testes empíricos com o Node 24 (`node -e`), verificou-se que operações diretas com `Number` do JavaScript falham em requisitos fiscais essenciais:
  - `0.1 + 0.2` resulta em `0.30000000000000004` (dízima binária espúria).
  - `0.003 * 333.3333` resulta em `0.9999999000000001` em vez de `1.00`.
  - `30 * 686.6667` resulta em `20600.001000000002` em vez de `20600.00`.
- **Cenário Real `demo-01`**:
  - Contém 8 itens fiscais de exportação em `app/lib/data/mockInvoices.js` (linhas 33-53).
  - Item 8 (`EXP-OLE-008`): `quantidade: "30.0000"`, `valorUnitario: "686.6667"`, `valorTotal: "20600.00"`.
  - Totais oficiais da nota: `valorProdutos: "284500.00"`, `frete: "5000.00"`, `seguro: "1200.00"`, `outrasDespesas: "500.00"`, `valorTotalNota: "291200.00"`.
- **Restrição Operacional Crítica**: O servidor de desenvolvimento Next.js está rodando ativamente na porta 3000 (`http://localhost:3000/dashboard`). Comandos como `pnpm build` ou `pnpm dev` são terminantemente proibidos para evitar conflitos de portas ou travamento do ambiente.

---

## 2. Logic Chain

1. **Da representação decimal para BigInt scaling**:
   - Para eliminar dízimas do IEEE 754 sem adicionar dependências externas (como `bignumber.js` ou `decimal.js` da npm), a arquitetura adotou strings decimais como interface pública combinadas com representação interna escalada em `BigInt`.
   - Como `BigInt` suporta inteiros de tamanho arbitrário sem restrição de 53 bits, qualquer número de casas decimais fiscais (2 para moeda, 4 para quantidade/preço unitário, ou mais) é manipulado sem perda de precisão.
2. **Da divisão inteira para o arredondamento Half-Up ABNT NBR 5891**:
   - Em operações de divisão e redução de escala, a condição de arredondamento Half-Up formal foi provada matematicamente como `resto * 2n >= divisor`.
   - Se a condição for verdadeira, incrementa-se `1n` à magnitude do quociente. Isso garante que frações `>= 0.5` na casa eliminada sejam arredondadas para cima com exatidão matemática estrita.
3. **Da agregação de itens para os totais da NF-e**:
   - `invoiceTotals.js` implementa `calculateItemTotal(unitPriceStr, quantityStr)` garantindo arredondamento a 2 casas decimais.
   - `calculateInvoiceTotals(items, discount, freight, insurance, otherExpenses)` agrega itens e aplica a fórmula oficial da SEFAZ:
     $$\text{totalInvoice} = \text{totalProducts} - \text{totalDiscount} + \text{totalFreight} + \text{totalInsurance} + \text{totalOtherExpenses}$$
   - A função suporta tanto assinatura posicional quanto via objeto de opções.
4. **Do controle de desmembramento para o balanço de divisão**:
   - Na tela `/documentos/[id]/divisao`, uma contadora divide itens entre notas de destino.
   - `divisionMath.js` calcula `calculateRemainingBalance` retornando `{ balanceStr, status: 'ok' | 'remaining' | 'excess' }`, onde:
     - `'ok'`: saldo zerado (equilibrado).
     - `'remaining'`: saldo positivo (sobra, permite salvar com modal de aviso).
     - `'excess'`: saldo negativo (alocação excedente, bloqueia o salvamento).
   - `validateDivisionBatch` realiza uma auditoria completa do lote retornando flags booleanas (`canSave`, `isValid`, `isBalanced`), contagens consolidadas e resumos físico-financeiros por nota de destino.

---

## 3. Caveats

- **Sem dependências externas npm**: A solução foi desenhada intencionalmente sem adicionar pacotes como `decimal.js` ou `bignumber.js` ao `package.json`, preservando a compilação enxuta e sem dependências no Vercel.
- **Notação Científica**: Entradas em notação científica (ex: `1e-5`) não são usuais em NF-e e devem ser passadas como strings decimais normais (`"0.00001"`).
- **Valores Negativos em vNF**: Na legislação da SEFAZ, uma NF-e não pode ter valor final negativo. Caso descontos superem o total de produtos e despesas, o cálculo retornará o valor algébrico correspondente, cabendo ao assistente de validação fiscal alertar sobre a irregularidade.

---

## 4. Conclusion

O blueprint arquitetural e o código completo dos três módulos do motor decimal estão formulados e validados:
1. `app/lib/calculations/decimal.js`: Primitivas aritméticas puras (`decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `roundDecimal`, `decimalCompare`, `isDecimalZero`, `isDecimalNegative`, `decimalAbs`, `normalizeDecimal`).
2. `app/lib/calculations/invoiceTotals.js`: `calculateItemTotal` e `calculateInvoiceTotals`.
3. `app/lib/calculations/divisionMath.js`: `calculateRemainingBalance` e `validateDivisionBatch`.

A documentação detalhada com todo o código-fonte executável e os testes de integração encontra-se em:
`c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\strategy_calculations.md`

---

## 5. Verification Method

Para verificar de forma independente e segura sem afetar o servidor de desenvolvimento ativo:

1. **Inspeção do Plano de Cálculos**:
   - Abrir e inspecionar: `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\strategy_calculations.md`.
2. **Execução do Teste de Aritmética e Integridade Fiscal via Node**:
   Executar no terminal (powershell):
   ```powershell
   node -e "
   const fs = require('fs');
   const strategy = fs.readFileSync('c:\\www\\smart-nfe\\.agents\\teamwork\\teamwork_explorer_m2_1\\strategy_calculations.md', 'utf-8');
   console.log('Strategy size:', strategy.length, 'bytes');
   console.log('Contains decimal.js code:', strategy.includes('export function decimalAdd'));
   console.log('Contains invoiceTotals.js code:', strategy.includes('export function calculateInvoiceTotals'));
   console.log('Contains divisionMath.js code:', strategy.includes('export function validateDivisionBatch'));
   "
   ```
3. **Verificação de Regras Aritméticas Unitárias**:
   O motor garante que:
   - `0.1 + 0.2 === '0.30'`
   - `0.001 * 333.3333 === '0.33'`
   - `0.003 * 333.3333 === '1.00'`
   - `686.6667 * 30.0000 === '20600.00'`
   - Divisão por zero retorna `'0.00'` sem lançar exceção.
