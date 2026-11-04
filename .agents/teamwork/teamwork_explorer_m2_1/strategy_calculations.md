# Estratégia Arquitetural e de Implementação: Motor de Cálculos Decimais Fiscais

**Documento:** Planejamento e Especificação Técnica do Motor de Cálculos Decimais  
**Autor:** Agente Explorador M2.1 (`teamwork_explorer_m2_1`)  
**Data:** 04/11/2026  
**Escopo:** `app/lib/calculations/` (`decimal.js`, `invoiceTotals.js`, `divisionMath.js`)  
**Status:** Pronto para Implementação  

---

## 1. Visão Geral e Arquitetura do Subsistema

O SmartNFe processa notas fiscais eletrônicas de exportação onde a precisão matemática é um requisito fiscal inegociável. No padrão da SEFAZ (MOC NF-e 4.0 / NTs vigentes) e nas regras aduaneiras do SISCOMEX:
- Valores unitários (`vUnCom`) e quantidades (`qCom`) trabalham com até 4 casas decimais (ex: `0.0001` a `9999999.9999`).
- Valores totais de produtos (`vProd`), totais de impostos/despesas/frete e valor total da NF-e (`vNF`) operam com exatamente 2 casas decimais (`0.00` a `999999999999.99`).
- O arredondamento fiscal formal segue a norma ABNT NBR 5891 / Half-Up (meio para cima), onde frações `>= 0.5` na casa descartada são incrementadas na casa mantida.

### O Risco do Ponto Flutuante Binário (IEEE 754)
A aritmética nativa de `Number` do JavaScript introduz erros de representação binária clássicos:
```javascript
0.1 + 0.2                          // -> 0.30000000000000004
0.003 * 333.3333                   // -> 0.9999999000000001 (deve arredondar para 1.00)
30 * 686.6667                      // -> 20600.001000000002
1000000000000.1 + 0.2              // Perda de precisão em mantissas grandes
```
Em tabelas com dezenas de itens (como o cenário `demo-03` com 50 itens) ou divisões fracionadas de contêineres (`demo-02`), o acúmulo de dízimas binárias causa discrepâncias de centavos entre a soma das linhas e o total da nota, reprovando o documento na validação fiscal da SEFAZ.

### A Abordagem Adotada: Strings Decimais + BigInt Scaling com Exact Remainder Half-Up
Para garantir **precisão arbitrária e absoluta** sem adicionar dependências externas ao `package.json`:
1. Todas as entradas e saídas públicas do motor são **strings decimais canônicas** (ex: `"12750.00"`, `"500.0000"`).
2. Internamente, as strings são decompostas em componentes:
   - Sinal: `1n` ou `-1n`
   - Magnitude inteira: `BigInt` dos dígitos concatenados sem separador
   - Escala: contagem de casas decimais
3. As operações aritméticas básicas (+, -, *, /) escalam os `BigInt` por potências de 10 (`10n ** BigInt(scale)`), realizando aritmética inteira exata sem limite de 53 bits.
4. O arredondamento Half-Up utiliza o princípio matemático exato do resto da divisão inteira:
   - Para arredondar um quociente na divisão inteira: se `resto * 2n >= divisor`, soma-se `1n` ao quociente.
   - Isso elimina qualquer necessidade de conversão temporária para float ou guard digits empíricos.

---

## 2. Mapa dos Três Módulos em `app/lib/calculations/`

```
app/lib/calculations/
├── decimal.js          # Primitivas aritméticas puras em strings decimais
├── invoiceTotals.js    # Agregação fiscal de totais de itens e cabeçalho de NF-e
└── divisionMath.js     # Balanço de saldos para divisão e desmembramento multi-destino
```

---

## 3. Especificação Detalhada e Código de `decimal.js`

### 3.1 Contrato e Assinaturas
- `decimalAdd(a, b, scale = null)`: Soma dois decimais. Se `scale` for informado, arredonda para a escala especificada.
- `decimalSubtract(a, b, scale = null)`: Subtrai `b` de `a`. Se `scale` for informado, arredonda para a escala especificada.
- `decimalMultiply(a, b, scale = null)`: Multiplica `a * b`. Se `scale` for nulo, preserva precisão exata (`scaleA + scaleB`).
- `decimalDivide(a, b, scale = 2)`: Divide `a / b` com arredondamento Half-Up para `scale` casas (default 2). Trata divisão por zero graciosamente retornando `"0.00"`.
- `roundDecimal(val, scale = 2)`: Arredonda uma string decimal para `scale` casas decimais (Half-Up formal ABNT).
- `decimalCompare(a, b)`: Retorna `-1` se `a < b`, `0` se `a === b`, `1` se `a > b`.
- `isDecimalZero(val)`: Retorna `true` se o valor for nulo, vazio ou numericamente igual a zero (`"0.00"`, `"-0.0000"`).
- `isDecimalNegative(val)`: Retorna `true` se o valor for estritamente menor que zero.
- `decimalAbs(val)`: Retorna o valor absoluto sem sinal negativo.
- `normalizeDecimal(val, scale = 2)`: Higieniza e padroniza qualquer entrada para formato decimal canônico com escala fixa.

### 3.2 Código Proposto para `app/lib/calculations/decimal.js`

```javascript
/**
 * Motor de Aritmética Decimal Pura — SmartNFe
 * 
 * Implementa operações aritméticas com strings decimais de precisão arbitrária
 * utilizando BigInt para eliminar completamente erros de ponto flutuante binário (IEEE 754).
 * Suporta escalas arbitrárias e regras de arredondamento fiscal ABNT NBR 5891 (Half-Up).
 */

/**
 * Higieniza entradas brutas (string, number, nulo) para formato numérico limpo.
 * Trata vírgulas brasileiras, símbolos de moeda (R$) e espaços.
 * @param {string|number|null|undefined} input
 * @returns {string} String limpa (ex: "-1234.56" ou "0")
 */
export function cleanDecimalString(input) {
  if (input === null || input === undefined || input === '') {
    return '0';
  }

  let s = String(input).trim().replace(/[R$\s]/g, '');
  if (!s) return '0';

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    if (s.indexOf('.') < s.indexOf(',')) {
      // Formato brasileiro: 1.234,56 -> 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,234.56 -> 1234.56
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Formato com vírgula decimal simples: 1250,50 -> 1250.50
    s = s.replace(',', '.');
  }

  let sign = '';
  if (s.startsWith('-')) {
    sign = '-';
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  // Remove quaisquer caracteres residuais que não sejam dígitos ou ponto
  s = s.replace(/[^\d.]/g, '');

  const parts = s.split('.');
  if (parts.length > 2) {
    // Preserva apenas o primeiro ponto decimal caso existam múltiplos
    s = parts[0] + '.' + parts.slice(1).join('');
  }

  if (!s || s === '.') return '0';
  return sign + s;
}

/**
 * Decompõe a string decimal em componentes BigInt com sinal e escala.
 * @param {string|number|null|undefined} val
 * @returns {{ sign: bigint, intVal: bigint, scale: number }}
 */
export function parseDecimal(val) {
  const s = cleanDecimalString(val);
  let sign = 1n;
  let numStr = s;

  if (s.startsWith('-')) {
    sign = -1n;
    numStr = s.slice(1);
  }

  const [iPart = '0', fPart = ''] = numStr.split('.');
  const cleanIPart = iPart.replace(/^0+(?=\d)/, '') || '0';
  const scale = fPart.length;
  const digits = cleanIPart + fPart;
  const intVal = BigInt(digits);

  // Zero nunca tem sinal negativo
  if (intVal === 0n) {
    sign = 1n;
  }

  return { sign, intVal, scale };
}

/**
 * Formata componentes BigInt em string decimal canônica.
 * @param {bigint} sign
 * @param {bigint} absVal
 * @param {number} scale
 * @returns {string}
 */
export function formatBigInt(sign, absVal, scale) {
  if (absVal === 0n) {
    return scale > 0 ? '0.' + '0'.repeat(scale) : '0';
  }

  let s = absVal.toString();
  const signPrefix = sign < 0n ? '-' : '';

  if (scale === 0) {
    return signPrefix + s;
  }

  if (s.length <= scale) {
    s = s.padStart(scale + 1, '0');
  }

  const intPart = s.slice(0, s.length - scale);
  const fracPart = s.slice(s.length - scale);
  return signPrefix + intPart + '.' + fracPart;
}

/**
 * Executa arredondamento Half-Up formal em componentes BigInt.
 * @param {bigint} sign
 * @param {bigint} absVal
 * @param {number} currentScale
 * @param {number} targetScale
 * @returns {{ sign: bigint, absVal: bigint, scale: number }}
 */
function roundSignedBigInt(sign, absVal, currentScale, targetScale) {
  if (absVal === 0n) {
    return { sign: 1n, absVal: 0n, scale: targetScale };
  }

  if (currentScale === targetScale) {
    return { sign, absVal, scale: targetScale };
  }

  if (currentScale < targetScale) {
    const factor = 10n ** BigInt(targetScale - currentScale);
    return { sign, absVal: absVal * factor, scale: targetScale };
  }

  // currentScale > targetScale
  const diff = BigInt(currentScale - targetScale);
  const divisor = 10n ** diff;
  const half = divisor / 2n;
  const rem = absVal % divisor;
  let quot = absVal / divisor;

  // Arredondamento Half-Up (>= 0.5 incrementa)
  if (rem >= half) {
    quot += 1n;
  }

  if (quot === 0n) {
    return { sign: 1n, absVal: 0n, scale: targetScale };
  }

  return { sign, absVal: quot, scale: targetScale };
}

/**
 * Soma duas strings decimais.
 * @param {string|number} a
 * @param {string|number} b
 * @param {number|null} [scale=null] - Escala de saída opcional
 * @returns {string}
 */
export function decimalAdd(a, b, scale = null) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);
  const maxScale = Math.max(pA.scale, pB.scale);

  const sA = pA.sign * pA.intVal * (10n ** BigInt(maxScale - pA.scale));
  const sB = pB.sign * pB.intVal * (10n ** BigInt(maxScale - pB.scale));
  const sum = sA + sB;

  const sign = sum < 0n ? -1n : 1n;
  const absVal = sum < 0n ? -sum : sum;

  if (scale !== null && scale !== undefined) {
    const rounded = roundSignedBigInt(sign, absVal, maxScale, scale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(sign, absVal, maxScale);
}

/**
 * Subtrai a segunda string decimal da primeira (a - b).
 * @param {string|number} a
 * @param {string|number} b
 * @param {number|null} [scale=null] - Escala de saída opcional
 * @returns {string}
 */
export function decimalSubtract(a, b, scale = null) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);
  const maxScale = Math.max(pA.scale, pB.scale);

  const sA = pA.sign * pA.intVal * (10n ** BigInt(maxScale - pA.scale));
  const sB = pB.sign * pB.intVal * (10n ** BigInt(maxScale - pB.scale));
  const diff = sA - sB;

  const sign = diff < 0n ? -1n : 1n;
  const absVal = diff < 0n ? -diff : diff;

  if (scale !== null && scale !== undefined) {
    const rounded = roundSignedBigInt(sign, absVal, maxScale, scale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(sign, absVal, maxScale);
}

/**
 * Multiplica duas strings decimais (a * b).
 * @param {string|number} a
 * @param {string|number} b
 * @param {number|null} [scale=null] - Escala de saída opcional
 * @returns {string}
 */
export function decimalMultiply(a, b, scale = null) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);

  const prodSign = (pA.sign * pB.sign) < 0n ? -1n : 1n;
  const prodAbs = pA.intVal * pB.intVal;
  const prodScale = pA.scale + pB.scale;

  if (scale !== null && scale !== undefined) {
    const rounded = roundSignedBigInt(prodSign, prodAbs, prodScale, scale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(prodSign, prodAbs, prodScale);
}

/**
 * Divide a primeira string decimal pela segunda (a / b).
 * Trata divisão por zero graciosamente retornando zeros formatados na escala.
 * Utiliza o teste exato do resto (rem * 2n >= divisor) para Half-Up matemático.
 * @param {string|number} a
 * @param {string|number} b
 * @param {number} [scale=2] - Escala de saída desejada (default: 2)
 * @returns {string}
 */
export function decimalDivide(a, b, scale = 2) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);

  const targetScale = scale >= 0 ? scale : 2;

  if (pB.intVal === 0n) {
    return targetScale > 0 ? '0.' + '0'.repeat(targetScale) : '0';
  }

  const dividend = pA.intVal * (10n ** BigInt(pB.scale + targetScale));
  const divisor = pB.intVal * (10n ** BigInt(pA.scale));

  let quot = dividend / divisor;
  const rem = dividend % divisor;

  if (rem * 2n >= divisor) {
    quot += 1n;
  }

  const divSign = (pA.sign * pB.sign) < 0n && quot !== 0n ? -1n : 1n;
  return formatBigInt(divSign, quot, targetScale);
}

/**
 * Arredonda uma string decimal para a escala informada seguindo regra Half-Up.
 * @param {string|number} val
 * @param {number} [scale=2]
 * @returns {string}
 */
export function roundDecimal(val, scale = 2) {
  const p = parseDecimal(val);
  const targetScale = scale >= 0 ? scale : 2;
  const rounded = roundSignedBigInt(p.sign, p.intVal, p.scale, targetScale);
  return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
}

/**
 * Compara dois valores decimais.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {number} -1 se a < b, 0 se a === b, 1 se a > b
 */
export function decimalCompare(a, b) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);
  const maxScale = Math.max(pA.scale, pB.scale);

  const sA = pA.sign * pA.intVal * (10n ** BigInt(maxScale - pA.scale));
  const sB = pB.sign * pB.intVal * (10n ** BigInt(maxScale - pB.scale));

  if (sA < sB) return -1;
  if (sA > sB) return 1;
  return 0;
}

/**
 * Verifica se o valor decimal é numericamente igual a zero.
 * @param {string|number|null|undefined} val
 * @returns {boolean}
 */
export function isDecimalZero(val) {
  return decimalCompare(val, '0') === 0;
}

/**
 * Verifica se o valor decimal é estritamente negativo.
 * @param {string|number|null|undefined} val
 * @returns {boolean}
 */
export function isDecimalNegative(val) {
  return decimalCompare(val, '0') < 0;
}

/**
 * Retorna o valor absoluto de uma string decimal.
 * @param {string|number|null|undefined} val
 * @returns {string}
 */
export function decimalAbs(val) {
  const p = parseDecimal(val);
  return formatBigInt(1n, p.intVal, p.scale);
}

/**
 * Normaliza e padroniza uma entrada em string decimal com escala garantida.
 * @param {string|number|null|undefined} val
 * @param {number} [scale=2]
 * @returns {string}
 */
export function normalizeDecimal(val, scale = 2) {
  return roundDecimal(val, scale);
}
```

---

## 4. Especificação Detalhada e Código de `invoiceTotals.js`

### 4.1 Regras de Negócio Fiscais
1. **Total da Linha de Produto (`calculateItemTotal`)**:
   - `itemTotal = round(unitPrice * quantity, 2)`
   - Se quantidade ou preço unitário forem nulos, inválidos ou `<= 0`, o total deve ser `"0.00"`.
2. **Totais da Nota Fiscal (`calculateInvoiceTotals`)**:
   - `totalProducts`: Soma dos totais de todos os itens (`vProd`).
   - `totalDiscount`: Desconto total concedido (`vDesc`).
   - `totalFreight`: Frete destacado na nota (`vFrete`).
   - `totalInsurance`: Seguro destacado (`vSeg`).
   - `totalOtherExpenses`: Outras despesas acessórias (`vOutro`).
   - `totalInvoice`: Fórmula fiscal SEFAZ:
     $$\text{totalInvoice} = \text{totalProducts} - \text{totalDiscount} + \text{totalFreight} + \text{totalInsurance} + \text{totalOtherExpenses}$$
   - Todos os valores retornados são strings decimais com exatamente 2 casas.
   - Suporta tanto assinatura posicional quanto por objeto de opções.

### 4.2 Código Proposto para `app/lib/calculations/invoiceTotals.js`

```javascript
/**
 * Motor de Agregação de Totais Fiscais de NF-e — SmartNFe
 * 
 * Calcula totais de itens e consolida valores da nota fiscal (produtos, frete,
 * seguro, despesas, descontos e total da NF-e) com precisão decimal exata.
 */

import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  roundDecimal,
  cleanDecimalString,
} from './decimal.js';

/**
 * Calcula o valor total do item da NF-e (preço unitário * quantidade).
 * Retorna string decimal com 2 casas decimais.
 * 
 * @param {string|number|null|undefined} unitPriceStr
 * @param {string|number|null|undefined} quantityStr
 * @returns {string} Ex: "12750.00"
 */
export function calculateItemTotal(unitPriceStr, quantityStr) {
  if (
    unitPriceStr === null ||
    unitPriceStr === undefined ||
    quantityStr === null ||
    quantityStr === undefined
  ) {
    return '0.00';
  }

  return decimalMultiply(unitPriceStr, quantityStr, 2);
}

/**
 * Consolida e calcula os totais gerais da nota fiscal.
 * Suporta assinatura posicional ou via objeto de opções.
 * 
 * Assinatura 1 (Posicional):
 *   calculateInvoiceTotals(items, discountStr, freightStr, insuranceStr, otherExpensesStr)
 * Assinatura 2 (Objeto):
 *   calculateInvoiceTotals(items, { discount, freight, insurance, otherExpenses })
 * 
 * @param {Array<object>} items - Array de itens da nota fiscal
 * @param {string|number|object} [discountOrOptions='0.00']
 * @param {string|number} [freightStr='0.00']
 * @param {string|number} [insuranceStr='0.00']
 * @param {string|number} [otherExpensesStr='0.00']
 * @returns {{
 *   totalProducts: string,
 *   totalDiscount: string,
 *   totalFreight: string,
 *   totalInsurance: string,
 *   totalOtherExpenses: string,
 *   totalInvoice: string
 * }}
 */
export function calculateInvoiceTotals(
  items,
  discountOrOptions = '0.00',
  freightStr = '0.00',
  insuranceStr = '0.00',
  otherExpensesStr = '0.00'
) {
  let discountVal = '0.00';
  let freightVal = '0.00';
  let insuranceVal = '0.00';
  let otherExpensesVal = '0.00';

  if (typeof discountOrOptions === 'object' && discountOrOptions !== null) {
    discountVal = discountOrOptions.discount ?? discountOrOptions.valorDesconto ?? '0.00';
    freightVal = discountOrOptions.freight ?? discountOrOptions.valorFrete ?? '0.00';
    insuranceVal = discountOrOptions.insurance ?? discountOrOptions.valorSeguro ?? '0.00';
    otherExpensesVal = discountOrOptions.otherExpenses ?? discountOrOptions.outrasDespesas ?? '0.00';
  } else {
    discountVal = discountOrOptions || '0.00';
    freightVal = freightStr || '0.00';
    insuranceVal = insuranceStr || '0.00';
    otherExpensesVal = otherExpensesStr || '0.00';
  }

  // Soma de produtos
  const safeItems = Array.isArray(items) ? items : [];
  let totalProducts = '0.00';

  for (const item of safeItems) {
    if (!item) continue;
    // Se o item já tiver valorTotal pré-calculado, usa-o; caso contrário, calcula via unitPrice * qty
    const itemTotal = item.valorTotal ?? item.total ?? calculateItemTotal(
      item.valorUnitario ?? item.unitPrice,
      item.quantidade ?? item.quantity
    );
    totalProducts = decimalAdd(totalProducts, itemTotal, 2);
  }

  const totalDiscount = roundDecimal(discountVal, 2);
  const totalFreight = roundDecimal(freightVal, 2);
  const totalInsurance = roundDecimal(insuranceVal, 2);
  const totalOtherExpenses = roundDecimal(otherExpensesVal, 2);

  // Fórmula SEFAZ: Total NF = Produtos - Desconto + Frete + Seguro + Outras Despesas
  const afterDiscount = decimalSubtract(totalProducts, totalDiscount, 2);
  const withFreight = decimalAdd(afterDiscount, totalFreight, 2);
  const withInsurance = decimalAdd(withFreight, totalInsurance, 2);
  const totalInvoice = decimalAdd(withInsurance, totalOtherExpenses, 2);

  return {
    totalProducts,
    totalDiscount,
    totalFreight,
    totalInsurance,
    totalOtherExpenses,
    totalInvoice,
  };
}
```

---

## 5. Especificação Detalhada e Código de `divisionMath.js`

### 5.1 Regras de Negócio para Desmembramento / Divisão de NF-e
Na tela `/documentos/[id]/divisao`, a contadora aloca quantidades de cada produto entre duas ou mais notas fiscais de destino:
1. **Status de Balanço de um Item (`calculateRemainingBalance`)**:
   - `balance = originalQty - sum(allocatedQuantities)`
   - Se `balance === 0`: status `'ok'` (distribuição perfeita, equilibrada).
   - Se `balance > 0`: status `'remaining'` (sobra / quantidade não alocada; permite salvar exibindo aviso).
   - Se `balance < 0`: status `'excess'` (alocação em excesso; bloqueia gravação com erro impeditivo).
   - Escala: quantidades mantêm até 4 casas decimais fiscais (`0.0000`).
2. **Validação em Lote do Workspace de Divisão (`validateDivisionBatch`)**:
   - Audita todos os itens da nota original em relação a todas as notas de destino criadas.
   - Fornece diagnóstico completo:
     - `canSave`: `boolean` (requer pelo menos 1 nota de destino e nenhuma linha com excesso `balance < 0`).
     - `isBalanced`: `boolean` (todas as linhas estão perfeitamente distribuídas com saldo 0).
     - `hasExcess`: `boolean` (há pelo menos um item com saldo negativo).
     - `hasRemaining`: `boolean` (há pelo menos um item com saldo positivo pendente).
     - `summary`: contagens analíticas de itens balanceados, sobras e excessos.
     - `itemReports`: lista detalhada linha a linha.
     - `notesSummary`: resumo consolidado por nota de destino (quantidade total e valor total dos produtos de cada nota gerada).

### 5.2 Código Proposto para `app/lib/calculations/divisionMath.js`

```javascript
/**
 * Motor de Divisão e Distribuição de NF-e — SmartNFe
 * 
 * Executa o cálculo de saldos remanescentes e a validação em tempo real da distribuição
 * de itens entre duas ou mais notas fiscais de destino preparadas.
 */

import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
  roundDecimal,
  isDecimalZero,
} from './decimal.js';

/**
 * Extrai a quantidade numérica em string a partir de diversos formatos de entrada.
 * @param {string|number|object} val
 * @returns {string}
 */
function extractQuantity(val) {
  if (val === null || val === undefined) return '0';
  if (typeof val === 'object') {
    return String(val.quantidade ?? val.quantity ?? val.allocatedQty ?? val.qty ?? '0');
  }
  return String(val);
}

/**
 * Obtém a quantidade de casas decimais de uma string numérica.
 * @param {string} str
 * @returns {number}
 */
function getDecimalPlaces(str) {
  const s = String(str || '').trim().replace(',', '.');
  const parts = s.split('.');
  return parts[1] ? parts[1].length : 0;
}

/**
 * Calcula o saldo restante da distribuição de um item.
 * 
 * @param {string|number} originalQtyStr - Quantidade original da nota
 * @param {Array<string|number|object>} allocatedQtyArray - Array de alocações efetuadas
 * @returns {{
 *   balanceStr: string,
 *   status: 'ok' | 'remaining' | 'excess',
 *   totalAllocatedStr: string,
 *   isOk: boolean,
 *   hasRemaining: boolean,
 *   hasExcess: boolean
 * }}
 */
export function calculateRemainingBalance(originalQtyStr, allocatedQtyArray) {
  const origStr = String(originalQtyStr || '0').trim();
  const arr = Array.isArray(allocatedQtyArray) ? allocatedQtyArray : [];

  // Garante escala mínima de 4 casas decimais para quantidades fiscais
  const maxScale = Math.max(
    4,
    getDecimalPlaces(origStr),
    ...arr.map(item => getDecimalPlaces(extractQuantity(item)))
  );

  let totalAllocated = '0.' + '0'.repeat(maxScale);
  for (const item of arr) {
    const q = extractQuantity(item);
    totalAllocated = decimalAdd(totalAllocated, q, maxScale);
  }

  const balanceStr = decimalSubtract(origStr, totalAllocated, maxScale);
  const cmp = decimalCompare(balanceStr, '0');

  let status = 'ok';
  if (cmp > 0) {
    status = 'remaining';
  } else if (cmp < 0) {
    status = 'excess';
  }

  return {
    balanceStr,
    status,
    totalAllocatedStr: totalAllocated,
    isOk: status === 'ok',
    hasRemaining: status === 'remaining',
    hasExcess: status === 'excess',
  };
}

/**
 * Valida o lote completo de distribuição da nota fiscal original entre notas de destino.
 * Gera relatório detalhado com diagnóstico por item, resumo por nota e flags de bloqueio.
 * 
 * @param {Array<object>} originalItems - Itens da nota fiscal original
 * @param {Array<object>|object} destinationNotes - Notas de destino configuradas
 * @returns {{
 *   isValid: boolean,
 *   canSave: boolean,
 *   hasExcess: boolean,
 *   hasRemaining: boolean,
 *   isBalanced: boolean,
 *   summary: {
 *     totalItemsCount: number,
 *     destinationNotesCount: number,
 *     balancedCount: number,
 *     remainingCount: number,
 *     excessCount: number
 *   },
 *   itemReports: Array<object>,
 *   notesSummary: Array<object>
 * }}
 */
export function validateDivisionBatch(originalItems, destinationNotes) {
  const origList = Array.isArray(originalItems) ? originalItems : [];

  // Normaliza destinationNotes para formato padronizado de array
  let notes = [];
  if (Array.isArray(destinationNotes)) {
    notes = destinationNotes.map((note, idx) => {
      const noteId = note.id || note.noteId || `nota-${idx + 1}`;
      const noteNum = note.numero || note.number || `DEST-${String(idx + 1).padStart(2, '0')}`;
      let noteItems = [];

      if (Array.isArray(note.itens)) {
        noteItems = note.itens;
      } else if (Array.isArray(note.items)) {
        noteItems = note.items;
      } else if (note.allocations && typeof note.allocations === 'object') {
        noteItems = Object.entries(note.allocations).map(([id, qty]) => ({ id, quantidade: qty }));
      }

      return { id: noteId, numero: noteNum, itens: noteItems, raw: note };
    });
  } else if (destinationNotes && typeof destinationNotes === 'object') {
    notes = Object.entries(destinationNotes).map(([noteId, allocs], idx) => {
      const noteItems = Object.entries(allocs || {}).map(([id, qty]) => ({ id, quantidade: qty }));
      return {
        id: noteId,
        numero: `DEST-${String(idx + 1).padStart(2, '0')}`,
        itens: noteItems,
        raw: allocs,
      };
    });
  }

  const itemReports = [];
  let balancedCount = 0;
  let remainingCount = 0;
  let excessCount = 0;

  for (const origItem of origList) {
    const itemId = origItem.id;
    const itemNumber = origItem.item;
    const codigo = origItem.codigo;
    const descricao = origItem.descricao;
    const originalQtyStr = String(origItem.quantidade || '0');
    const unitPriceStr = String(origItem.valorUnitario || '0');

    // Mapeia as alocações deste item em cada nota de destino
    const allocationsByNote = {};
    const allocatedArray = [];

    for (const note of notes) {
      const matched = note.itens.find(
        i => i.id === itemId || i.itemId === itemId || i.codigo === codigo
      );
      const allocatedQty = matched ? extractQuantity(matched) : '0.0000';
      allocationsByNote[note.id] = allocatedQty;
      allocatedArray.push(allocatedQty);
    }

    const { balanceStr, status, totalAllocatedStr } = calculateRemainingBalance(
      originalQtyStr,
      allocatedArray
    );

    if (status === 'ok') balancedCount++;
    else if (status === 'remaining') remainingCount++;
    else if (status === 'excess') excessCount++;

    itemReports.push({
      itemId,
      itemNumber,
      codigo,
      descricao,
      originalQty: originalQtyStr,
      unitPrice: unitPriceStr,
      totalAllocated: totalAllocatedStr,
      balanceStr,
      status,
      allocationsByNote,
    });
  }

  // Resumo financeiro e físico de cada nota de destino
  const notesSummary = notes.map(note => {
    let noteProductTotal = '0.00';
    let noteTotalQty = '0.0000';
    let allocatedItemsCount = 0;

    for (const item of note.itens) {
      const q = extractQuantity(item);
      if (decimalCompare(q, '0') > 0) {
        allocatedItemsCount++;
        noteTotalQty = decimalAdd(noteTotalQty, q, 4);

        // Busca o preço unitário do item original correspondente
        const orig = origList.find(
          o => o.id === item.id || o.id === item.itemId || o.codigo === item.codigo
        );
        const unitPrice = orig
          ? String(orig.valorUnitario || '0')
          : String(item.valorUnitario || '0');

        const itemTotal = decimalMultiply(unitPrice, q, 2);
        noteProductTotal = decimalAdd(noteProductTotal, itemTotal, 2);
      }
    }

    return {
      noteId: note.id,
      numero: note.numero,
      allocatedItemsCount,
      totalQuantity: noteTotalQty,
      totalProducts: noteProductTotal,
    };
  });

  const hasExcess = excessCount > 0;
  const hasRemaining = remainingCount > 0;
  const isBalanced = origList.length > 0 && balancedCount === origList.length;

  // canSave: Requer ao menos uma nota de destino e NENHUM item com alocação em excesso
  const canSave = notes.length > 0 && !hasExcess;
  const isValid = !hasExcess;

  return {
    isValid,
    canSave,
    hasExcess,
    hasRemaining,
    isBalanced,
    summary: {
      totalItemsCount: origList.length,
      destinationNotesCount: notes.length,
      balancedCount,
      remainingCount,
      excessCount,
    },
    itemReports,
    notesSummary,
  };
}
```

---

## 6. Matriz de Casos de Borda e Verificação

| Cenário de Teste | Entrada | Resultado Esperado | Justificativa Fiscal |
|---|---|---|---|
| Soma float clássica | `decimalAdd("0.1", "0.2", 2)` | `"0.30"` | Elimina dízima `0.30000000000000004` |
| Arredondamento unitário * quantidade | `decimalMultiply("0.001", "333.3333", 2)` | `"0.33"` | Produto 0.3333333 arredondado Half-Up para 2 decimais |
| Arredondamento com fração 0.9999 | `decimalMultiply("0.003", "333.3333", 2)` | `"1.00"` | Produto 0.9999999 arredondado formalmente para 1.00 |
| Caso real demo-01 item 8 | `decimalMultiply("686.6667", "30.0000", 2)` | `"20600.00"` | Produto 20600.0010 arredonda para exatamente 20600.00 |
| Divisão fracionária periódica | `decimalDivide("10", "3", 2)` | `"3.33"` | 3.333... arredonda para 3.33 |
| Divisão por zero | `decimalDivide("100", "0", 2)` | `"0.00"` | Resiliência de interface sem `Infinity` nem `NaN` |
| Entrada vazia ou nula | `decimalAdd(null, undefined, 2)` | `"0.00"` | Proteção contra dados corrompidos |
| Formato com vírgula BR | `decimalAdd("1.250,50", "249,50", 2)` | `"1500.00"` | Suporte a dados digitados diretamente pela contadora |
| Totais da NF demo-01 | 8 itens + frete 5000 + seguro 1200 + despesas 500 | `totalProducts: "284500.00"`, `totalInvoice: "291200.00"` | Consistência com o mock fiscal oficial |
| Divisão de NF equilibrada | 500 alocado [250, 250] | `balanceStr: "0.0000"`, `status: "ok"` | Alocação perfeita |
| Divisão com saldo restante | 500 alocado [200, 100] | `balanceStr: "200.0000"`, `status: "remaining"` | Permite salvar com confirmação |
| Divisão com excesso | 500 alocado [300, 250] | `balanceStr: "-50.0000"`, `status: "excess"` | Bloqueia botão de salvar |

---

## 7. Roteiro de Implementação e Instruções para o Worker

1. **Criação do Diretório**: Criar a pasta `app/lib/calculations/`.
2. **Criação dos 3 Arquivos**:
   - `app/lib/calculations/decimal.js` (conforme Seção 3.2).
   - `app/lib/calculations/invoiceTotals.js` (conforme Seção 4.2).
   - `app/lib/calculations/divisionMath.js` (conforme Seção 5.2).
3. **Criação de Testes de Domínio M2**:
   - Os testes unitários devem ser integrados ao arquivo `tests/tier1/m2_domain.test.mjs` pelo agente de testes/worker.
4. **Verificação Segura**:
   - Executar exclusivamente: `node --no-warnings --test tests/tier1/*.test.mjs`
   - **NÃO** executar `pnpm build` ou `pnpm dev` sob hipótese alguma.
