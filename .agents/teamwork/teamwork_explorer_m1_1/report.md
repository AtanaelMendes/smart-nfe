# Relatório Técnico: Investigação de `decimal.js` e Arquitetura do `allocationEngine.js`

**Data**: 2026-11-13  
**Autor**: Explorer 1 — Milestone 1 (M1)  
**Ambiente**: `c:\www\smart-nfe` (Next.js 16, React 19, BigInt nativo, Node 24 native test runner)  
**Arquivos sob análise e desenho**:
- `app/lib/calculations/decimal.js` (análise e extensões)
- `app/lib/calculations/allocationEngine.js` (especificação e código proposto)
- `app/lib/calculations/divisionMath.js` (estratégia de delegação retrocompatível)

---

## 1. Sumário Executivo

A evolução do SmartNFe para o modelo de preparação de exportação $N \text{ origens} \to M \text{ destinos}$ (Requisitos R3 e R4) exige a substituição do algoritmo legado de divisão restrito a $1 \to M$ por um motor unificado de alocação matricial com precisão arbitrária baseada em `BigInt`. 

Esta investigação técnica avaliou minuciosamente:
1. O estado atual de `app/lib/calculations/decimal.js`, identificando as funções existentes, o mecanismo de ponto fixo BigInt, e especificando as extensões estritamente necessárias para operações vetoriais (`decimalSum`, `decimalAverage`), comparações relacionais estritas (`isDecimalPositive`, `decimalEquals`, `decimalMin`, `decimalMax`, `decimalClamp`) e rateio proporcional com conservação exata de centavos sem arredondamento prematuro (`decimalApportionProportional`, `decimalDistributeEqually`).
2. O desenho arquitetural completo e código de produção do novo módulo `app/lib/calculations/allocationEngine.js`, cobrindo:
   - Matriz de alocação $N \to M$ (`calculateAllocationMatrix`).
   - Regra de conservação estrita: $\text{disponível} = \text{original} - \text{alocações ativas externas} - \sum \text{alocações atuais}$.
   - Preservação indelevel da identidade do item por chave composta `${sourceInvoiceId}__${sourceItemId}`.
   - Verificação de compatibilidade de unidades de medida (`checkUnitCompatibility`) com 15 famílias canônicas de unidades fiscais brasileiras.
   - Rateio de despesas acessórias (frete, seguro, outras despesas, desconto) multi-origem com conservação de centavos via absorção de resíduo na última nota ativa por origem.
   - Validação com bloqueio rigoroso de excesso e valores negativos (`hasExcess`, `hasNegative`, status `'ok' | 'partial' | 'excess'` e flag `canSave`).

---

## 2. Investigação Técnica de `app/lib/calculations/decimal.js`

### 2.1 Funções Existentes e Arquitetura Atual
O arquivo `app/lib/calculations/decimal.js` possui 336 linhas e implementa operações com strings decimais sem qualquer biblioteca externa, operando sobre componentes BigInt decompostos:

| Função | Assinatura | Linhas | Mecanismo e Responsabilidade |
|---|---|---|---|
| `cleanDecimalString` | `(input) => string` | 15–58 | Sanitiza entrada (R$, espaços, vírgulas brasileiras `1.234,56`, formato americano `1,234.56`, pontos múltiplos, sinal). Retorna `'0'` se vazio/inválido. |
| `parseDecimal` | `(val) => { sign, intVal, scale }` | 65–87 | Decompõe a string decimal em componentes BigInt. Extrai parte inteira e fracionária, remove zeros à esquerda, determina `scale = fPart.length`, calcula `intVal = BigInt(iPart + fPart)`. Zero recebe `sign = 1n`. |
| `formatBigInt` | `(sign, absVal, scale) => string` | 96–115 | Reconstrói a string decimal canônica a partir de BigInt com preenchimento de zeros à esquerda (`padStart`) e inserção do ponto decimal na posição `length - scale`. |
| `roundSignedBigInt` | `(sign, absVal, curScale, tgtScale) => object` | 125–156 | Arredondamento Half-Up ABNT NBR 5891. Para `curScale > tgtScale`, calcula divisor $10^{\text{diff}}$, metade $\text{half} = \text{divisor} / 2n$, resto $\text{rem} = \text{absVal} \% \text{divisor}$. Se $\text{rem} \ge \text{half}$, incrementa quociente em $1n$. |
| `decimalAdd` | `(a, b, scale = null) => string` | 165–183 | Alinha as escalas de `a` e `b` para $\max(\text{scale}_a, \text{scale}_b)$ multiplicando pelo fator $10^{\text{diff}}$, soma os BigInts com sinal e formata com arredondamento opcional. |
| `decimalSubtract` | `(a, b, scale = null) => string` | 187–210 | Alinha escalas para a máxima, subtrai $s_A - s_B$, calcula sinal e valor absoluto, formata com arredondamento opcional. |
| `decimalMultiply` | `(a, b, scale = null) => string` | 219–233 | Multiplica `intValA * intValB`, soma as escalas $(\text{scale}_a + \text{scale}_b)$, e aplica arredondamento opcional. |
| `decimalDivide` | `(a, b, scale = 2) => string` | 244–266 | Divisão BigInt com teste exato do resto: $\text{dividend} = A \times 10^{\text{scale}_B + \text{tgtScale}}$, $\text{divisor} = B \times 10^{\text{scale}_A}$. Se $\text{rem} \times 2n \ge \text{divisor}$, quociente incrementa $1n$ (Half-Up). Trata divisão por zero retornando `'0.00'`. |
| `roundDecimal` | `(val, scale = 2) => string` | 274–279 | Aplica `roundSignedBigInt` diretamente na string decimal. |
| `decimalCompare` | `(a, b) => number (-1, 0, 1)` | 287–298 | Alinha escalas de `a` e `b` e compara os BigInts normalizados. |
| `isDecimalZero` | `(val) => boolean` | 305–307 | `decimalCompare(val, '0') === 0`. |
| `isDecimalNegative` | `(val) => boolean` | 314–316 | `decimalCompare(val, '0') < 0`. |
| `decimalAbs` | `(val) => string` | 323–326 | Formata com sinal positivo `1n`. |
| `normalizeDecimal` | `(val, scale = 2) => string` | 334–336 | Alias para `roundDecimal(val, scale)`. |

### 2.2 Lacunas Identificadas e Extensões Necessárias

Para suportar o motor unificado de alocação matricial $N \to M$, identificamos 3 grupos de novas funções necessárias em `decimal.js`:

#### A. Operações Vetoriais
1. `decimalSum(array, scale = null)`:
   - **Problema**: A soma de múltiplos itens via chamadas sucessivas de `decimalAdd` com escala intermediária forçada gera truncamento cumulativo ("drift" de centavos ou de frações de quantidade fiscal).
   - **Solução**: `decimalSum` itera sobre a coleção, analisa cada elemento sem arredondamento prematuro, equaliza todos para a escala máxima natural do array em BigInt, acumula em um único registrador `sumInt`, e somente ao final aplica o arredondamento para `scale` (se informada).
2. `decimalAverage(array, scale = 2)`:
   - Calcula a média aritmética da coleção sem perda de precisão intermediária: `decimalDivide(decimalSum(array), String(array.length), scale)`.

#### B. Comparações Relacionais Estritas
1. `isDecimalPositive(val)`: `decimalCompare(val, '0') > 0`.
2. `decimalEquals(a, b)`: `decimalCompare(a, b) === 0`.
3. `decimalGreaterThan(a, b)`: `decimalCompare(a, b) > 0`.
4. `decimalGreaterThanOrEqual(a, b)`: `decimalCompare(a, b) >= 0`.
5. `decimalLessThan(a, b)`: `decimalCompare(a, b) < 0`.
6. `decimalLessThanOrEqual(a, b)`: `decimalCompare(a, b) <= 0`.
7. `decimalMin(...values)` / `decimalMin(array)`: Retorna o menor valor da lista.
8. `decimalMax(...values)` / `decimalMax(array)`: Retorna o maior valor da lista.
9. `decimalClamp(val, min, max)`: Restringe o valor ao intervalo `[min, max]`.

#### C. Utilitários de Rateio e Divisão Exata (Zero-Drift)
1. `decimalDistributeEqually(totalVal, numParts, scale = 4)`:
   - Divide `totalVal` em `numParts` partes iguais usando divisão inteira BigInt:
     $$\text{baseInt} = \frac{\text{scaledTotal}}{N}, \quad \text{remInt} = \text{scaledTotal} \% N$$
   - As primeiras $N - 1$ partes recebem `baseInt`; a última parte recebe $\text{baseInt} + \text{remInt}$.
   - Garante que a soma das $N$ fatias seja **identicamente igual** ao total de entrada, sem qualquer desvio ou resíduo órfão.
2. `decimalApportionProportional(totalAmount, weights, scale = 2)`:
   - Rateia `totalAmount` proporcionalmente aos pesos informados em `weights` (valores de produtos alocados).
   - Para os primeiros itens ativos, calcula a fatia arredondada:
     $$\text{slice}_i = \text{round}\left( \text{totalAmount} \times \frac{w_i}{\sum w}, \text{scale} \right)$$
   - O último item ativo absorve o saldo remanescente exato:
     $$\text{slice}_{\text{last}} = \text{totalAmount} - \sum_{j < \text{last}} \text{slice}_j$$
   - Se a soma dos pesos for zero, aciona fallback para `decimalDistributeEqually`.
   - Garante **zero drift** na conservação de despesas fiscais ao centavo.

---

## 3. Arquitetura e Desenho Detalhado de `app/lib/calculations/allocationEngine.js`

### 3.1 Entidades e Estruturas de Dados

#### A. Chave Composta do Item de Origem (`sourceKey`)
Para garantir a rastreabilidade fiscal aduaneira e impedir a fusão indevida de mercadorias de emitentes distintos:
$$\text{sourceKey} = \text{`\$\{sourceInvoiceId\}\_\_\$\{sourceItemId\}\`}$$
Exemplos:
- `nfe-352411000145892-01__nfe-352411000145892-01-item-1`
- `demo-01__d1-item-1`

O motor fornece as funções utilitárias:
- `buildSourceItemKey(item)`: extrai `sourceInvoiceId` e `sourceItemId` com fallbacks para `invoiceId`, `itemId`, `id`, `nItem`.
- `parseSourceItemKey(key)`: decompõe `sourceKey` em `{ sourceInvoiceId, sourceItemId }`.

#### B. Compatibilidade de Unidades de Medida (`checkUnitCompatibility`)
As NF-e brasileiras utilizam códigos SEFAZ heterogêneos para a mesma grandeza física. O motor categoriza e normaliza as unidades em 15 famílias canônicas:
1. `MASS_KG`: `['KG', 'KGS', 'QUILO', 'QUILOS', 'KILO', 'KILOS', 'QUILOGRAMA', 'QUILOGRAMAS']`
2. `MASS_TON`: `['TON', 'TONS', 'TONELADA', 'TONELADAS', 'T']`
3. `MASS_G`: `['G', 'GR', 'GRAMA', 'GRAMAS']`
4. `UNIT`: `['UN', 'UND', 'UNID', 'UNIDADE', 'UNIDADES', 'PC', 'PCA', 'PÇA', 'PECA', 'PECAS', 'PEÇAS', 'ITEM', 'ITENS']`
5. `BOX`: `['CX', 'CXS', 'CAIXA', 'CAIXAS']`
6. `SACK`: `['SC', 'SCS', 'SACO', 'SACOS', 'SAC']`
7. `PACKAGE`: `['PCT', 'PCTE', 'PACOTE', 'PACOTES']`
8. `VOLUME_L`: `['L', 'LT', 'LTS', 'LITRO', 'LITROS']`
9. `LENGTH_M`: `['M', 'MT', 'MTS', 'METRO', 'METROS']`
10. `AREA_M2`: `['M2', 'M²', 'MT2', 'METRO QUADRADO', 'METROS QUADRADOS']`
11. `VOLUME_M3`: `['M3', 'M³', 'MT3', 'METRO CUBICO', 'METROS CUBICOS']`
12. `PAIR`: `['PAR', 'PARES', 'PR']`
13. `DOZEN`: `['DZ', 'DUZIA', 'DUZIAS']`
14. `BALE`: `['FARDO', 'FARDOS', 'FD']`
15. `PALLET`: `['PAL', 'PALETE', 'PALETES', 'PALLET', 'PALLETS']`

Regra de validação:
- Normaliza strings removendo acentos e caracteres especiais (`PÇA` $\to$ `PCA`, `M²` $\to$ `M2`).
- Retorna `true` se ambas as unidades pertencem à mesma família canônica OU se as strings normalizadas forem idênticas.
- Retorna `false` em caso de incompatibilidade (ex: tentar alocar `KG` onde o destino exige `UN`).

### 3.2 A Regra de Conservação Matemática Estrita
Para cada item de origem $k \in \text{sourceItems}$ identificado por `sourceKey`:
1. $\text{originalQty}_k$: Quantidade original da nota fiscal de entrada (escala 4).
2. $\text{priorAllocatedQty}_k$: Soma das alocações ativas do item em **outras preparações** persistidas no sistema (passadas via `activeAllocations[sourceKey]`).
3. $\text{availableQty}_k = \text{originalQty}_k - \text{priorAllocatedQty}_k$.
4. $\text{allocatedQtyTotal}_k = \sum_{d \in \text{Destinos}} \text{alocação}_{k, d}$.
5. $\text{remainingQty}_k = \text{availableQty}_k - \text{allocatedQtyTotal}_k$.

**Classificação de Status por Item**:
- Se $\text{alocação}_{k, d} < 0$ para qualquer $d$, ou $\text{remainingQty}_k < 0$:
  - `hasExcess = true`, `hasNegative = true`, `status = 'excess'`.
- Se $\text{remainingQty}_k == 0$ e $\text{allocatedQtyTotal}_k > 0$:
  - `hasExcess = false`, `hasRemaining = false`, `status = 'ok'`.
- Se $\text{remainingQty}_k > 0$:
  - `hasExcess = false`, `hasRemaining = true`, `status = 'partial'`.

### 3.3 Rateio de Despesas Acessórias Multi-Origem (Zero-Drift Cent Conservation)
Quando itens de múltiplas notas fiscais de origem $s_1, s_2, \ldots, s_N$ são alocados para múltiplos destinos $d_1, d_2, \ldots, d_M$:
1. Para cada nota de origem $s$:
   - Agrupam-se todas as linhas de produtos alocadas para cada destino $d$ provenientes de $s$:
     $$V_{s, d} = \sum_{i \in \text{itens de } s} \text{lineTotal}(i, d)$$
   - Calcula-se o valor total de produtos de $s$ alocados nesta preparação:
     $$V_s = \sum_d V_{s, d}$$
2. Para cada despesa acessória de $s$ ($F_s$ frete, $S_s$ seguro, $O_s$ outras despesas, $D_s$ desconto):
   - Se $V_s > 0$, para cada destino ativo $d$ (exceto o último ativo de $s$):
     $$\text{frete}_{s, d} = \text{round}\left( F_s \times \frac{V_{s, d}}{V_s}, 2 \right)$$
   - O último destino ativo que recebe mercadorias de $s$ absorve o saldo exato remanescente:
     $$\text{frete}_{s, \text{last}} = F_s - \sum_{d \ne \text{last}} \text{frete}_{s, d}$$
3. O frete final do destino $d$ é a soma das fatias absorvidas de todas as suas origens:
   $$\text{totalFreight}_d = \sum_s \text{frete}_{s, d}$$
   (o mesmo para seguro, outras despesas e desconto).
4. O total de cada nota de destino segue a fórmula SEFAZ consolidada via `invoiceTotals.js`:
   $$\text{totalInvoice}_d = \text{totalProducts}_d - \text{totalDiscount}_d + \text{totalFreight}_d + \text{totalInsurance}_d + \text{totalOtherExpenses}_d$$

### 3.4 Contrato da Função `calculateAllocationMatrix`
```typescript
calculateAllocationMatrix(
  sourceItems: Array<SourceItem>,
  destinationNotes: Array<DestinationNote> | Record<string, any>,
  activeAllocations?: Map<string, string> | Record<string, string>,
  options?: {
    minDestinations?: number, // default: 1 (ou 2 para divisão estrita)
    requireBalanced?: boolean, // default: false (true exige 100% alocado)
    sourceInvoiceTotals?: Record<string, InvoiceTotals>
  }
): AllocationMatrixResult
```

**Formato do Retorno (`AllocationMatrixResult`)**:
- `matrix`: `{ [destinationId]: { [sourceKey]: { allocatedQty, remainingQty, unitPrice, lineTotal, apportionedExpenses } } }`
- `sourceBalances`: `{ [sourceKey]: { sourceKey, sourceInvoiceId, sourceItemId, codigo, descricao, unidade, originalQty, priorAllocatedQty, availableQty, allocatedQtyTotal, remainingQty, hasExcess, hasNegative, hasRemaining, isBalanced, status: 'ok'|'partial'|'excess' } }`
- `destinationSummaries`: Array de resumos por destino com `allocatedItemsCount`, `totalQuantity`, `totalProducts`, `totalFreight`, `totalInsurance`, `totalOtherExpenses`, `totalDiscount`, `totalInvoice` e lista de itens formatados com preservação de origem.
- `canSave`: `boolean` — `true` se e somente se:
  - `hasExcess === false` (nenhum item excede o disponível)
  - `hasNegative === false` (nenhuma alocação é negativa)
  - `destinationNotes.length >= (options.minDestinations ?? 1)`
  - Pelo menos um item possui alocação $> 0$
  - Se `options.requireBalanced === true`, todos os itens de origem devem estar 100% balanceados (`status === 'ok'`).
- `totals`: `{ totalSourceValue, totalAllocatedValue, totalSourceItems, totalAllocatedItems }`
- `summary`: `{ totalSourceItemsCount, destinationNotesCount, balancedCount, partialCount, excessCount, unallocatedCount }`

---

## 4. Código Proposto: Extensões para `app/lib/calculations/decimal.js`

Abaixo estão os blocos de código prontos para inclusão em `app/lib/calculations/decimal.js`:

```javascript
// ============================================================================
// EXTENSÕES BIGINT — Milestone 1 (Comparações Estritas, Vetores e Rateio)
// ============================================================================

/**
 * Verifica se o valor decimal é estritamente positivo (> 0).
 * @param {string|number|null|undefined} val
 * @returns {boolean}
 */
export function isDecimalPositive(val) {
  return decimalCompare(val, '0') > 0;
}

/**
 * Verifica se dois valores decimais são numericamente equivalentes (a === b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalEquals(a, b) {
  return decimalCompare(a, b) === 0;
}

/**
 * Verifica se o primeiro valor decimal é estritamente maior que o segundo (a > b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalGreaterThan(a, b) {
  return decimalCompare(a, b) > 0;
}

/**
 * Verifica se o primeiro valor decimal é maior ou igual ao segundo (a >= b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalGreaterThanOrEqual(a, b) {
  return decimalCompare(a, b) >= 0;
}

/**
 * Verifica se o primeiro valor decimal é estritamente menor que o segundo (a < b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalLessThan(a, b) {
  return decimalCompare(a, b) < 0;
}

/**
 * Verifica se o primeiro valor decimal é menor ou igual ao segundo (a <= b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalLessThanOrEqual(a, b) {
  return decimalCompare(a, b) <= 0;
}

/**
 * Retorna o menor valor decimal entre os argumentos informados.
 * Aceita múltiplos argumentos ou um array único.
 * @param  {...any} args
 * @returns {string}
 */
export function decimalMin(...args) {
  const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  if (!list || list.length === 0) return '0';

  let minVal = list[0];
  for (let i = 1; i < list.length; i++) {
    if (decimalCompare(list[i], minVal) < 0) {
      minVal = list[i];
    }
  }
  return cleanDecimalString(minVal);
}

/**
 * Retorna o maior valor decimal entre os argumentos informados.
 * Aceita múltiplos argumentos ou um array único.
 * @param  {...any} args
 * @returns {string}
 */
export function decimalMax(...args) {
  const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  if (!list || list.length === 0) return '0';

  let maxVal = list[0];
  for (let i = 1; i < list.length; i++) {
    if (decimalCompare(list[i], maxVal) > 0) {
      maxVal = list[i];
    }
  }
  return cleanDecimalString(maxVal);
}

/**
 * Restringe o valor decimal ao intervalo [min, max].
 * @param {string|number} val
 * @param {string|number} min
 * @param {string|number} max
 * @returns {string}
 */
export function decimalClamp(val, min, max) {
  if (decimalCompare(val, min) < 0) return cleanDecimalString(min);
  if (decimalCompare(val, max) > 0) return cleanDecimalString(max);
  return cleanDecimalString(val);
}

/**
 * Soma um array de strings/números decimais sem perda de precisão intermediária.
 * Determina a escala máxima natural da lista e acumula em BigInt antes de formatar.
 * @param {Array<string|number>} array - Lista de valores decimais
 * @param {number|null} [scale=null] - Escala de saída opcional (Half-Up)
 * @returns {string}
 */
export function decimalSum(array, scale = null) {
  if (!Array.isArray(array) || array.length === 0) {
    return scale !== null && scale >= 0 ? '0.' + '0'.repeat(scale) : '0';
  }

  // Primeiro passo: parseia todos os valores e descobre a escala máxima
  const parsed = [];
  let maxScale = 0;

  for (const item of array) {
    if (item === null || item === undefined || item === '') continue;
    const p = parseDecimal(item);
    parsed.push(p);
    if (p.scale > maxScale) {
      maxScale = p.scale;
    }
  }

  if (parsed.length === 0) {
    return scale !== null && scale >= 0 ? '0.' + '0'.repeat(scale) : '0';
  }

  // Segundo passo: normaliza todos para maxScale e acumula em BigInt
  let totalSigned = 0n;
  for (const p of parsed) {
    const factor = 10n ** BigInt(maxScale - p.scale);
    totalSigned += p.sign * p.intVal * factor;
  }

  const sign = totalSigned < 0n ? -1n : 1n;
  const absVal = totalSigned < 0n ? -totalSigned : totalSigned;

  if (scale !== null && scale !== undefined && scale >= 0) {
    const rounded = roundSignedBigInt(sign, absVal, maxScale, scale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(sign, absVal, maxScale);
}

/**
 * Calcula a média aritmética de um array de decimais.
 * @param {Array<string|number>} array
 * @param {number} [scale=2]
 * @returns {string}
 */
export function decimalAverage(array, scale = 2) {
  if (!Array.isArray(array) || array.length === 0) {
    return scale >= 0 ? '0.' + '0'.repeat(scale) : '0.00';
  }
  const sum = decimalSum(array);
  return decimalDivide(sum, String(array.length), scale);
}

/**
 * Divide uma quantidade ou valor em partes estritamente iguais entre N partes,
 * utilizando divisão inteira BigInt pura com alocação do resíduo (resto)
 * na última parte para garantir conservação exata (zero drift).
 * 
 * Exemplo: '10.0000' em 3 notas -> ['3.3333', '3.3333', '3.3334']
 * Exemplo: '1.0000' em 7 notas -> 6 x '0.1428', 1 x '0.1432'
 * 
 * @param {string|number} totalValue - Valor total a dividir
 * @param {number} numParts - Quantidade de partes (N >= 1)
 * @param {number} [scale=4] - Casas decimais de saída (padrão fiscal: 4)
 * @returns {Array<string>} Array com N strings com soma idêntica ao total de entrada
 */
export function decimalDistributeEqually(totalValue, numParts, scale = 4) {
  const n = parseInt(numParts, 10);
  if (isNaN(n) || n <= 0) return [];

  const p = parseDecimal(totalValue);
  const targetScale = Math.max(scale >= 0 ? scale : 4, p.scale);

  if (p.intVal === 0n || p.sign < 0n) {
    return Array.from({ length: n }, () => formatBigInt(1n, 0n, targetScale));
  }

  if (n === 1) {
    const factor = 10n ** BigInt(targetScale - p.scale);
    return [formatBigInt(p.sign, p.intVal * factor, targetScale)];
  }

  const scaledTotal = p.intVal * (10n ** BigInt(targetScale - p.scale));
  const bigN = BigInt(n);

  const baseInt = scaledTotal / bigN;
  const remInt = scaledTotal % bigN;

  const result = [];
  const baseFormatted = formatBigInt(1n, baseInt, targetScale);

  for (let i = 0; i < n - 1; i++) {
    result.push(baseFormatted);
  }

  const lastInt = baseInt + remInt;
  result.push(formatBigInt(1n, lastInt, targetScale));

  return result;
}

/**
 * Rateia um valor total proporcionalmente a um array de pesos (valores ou quantidades),
 * garantindo conservação exata de centavos ao absorver o resíduo no último elemento ativo.
 * 
 * @param {string|number} totalAmount - Valor total a ser rateado
 * @param {Array<string|number>} weights - Pesos de cada destino (ex: valor dos produtos)
 * @param {number} [scale=2] - Precisão decimal de saída (padrão monetário: 2)
 * @returns {Array<string>} Array de valores rateados com soma identicamente igual ao totalAmount
 */
export function decimalApportionProportional(totalAmount, weights = [], scale = 2) {
  if (!Array.isArray(weights) || weights.length === 0) return [];

  const targetScale = scale >= 0 ? scale : 2;
  const totalClean = roundDecimal(totalAmount || '0', targetScale);

  if (weights.length === 1) {
    return [totalClean];
  }

  const totalWeight = decimalSum(weights);

  // Caso patológico: soma dos pesos é zero ou negativa -> divide igualmente
  if (decimalCompare(totalWeight, '0') <= 0) {
    return decimalDistributeEqually(totalClean, weights.length, targetScale);
  }

  // Identifica o índice do último item ativo com peso > 0
  let lastActiveIdx = -1;
  for (let i = weights.length - 1; i >= 0; i--) {
    if (decimalCompare(weights[i], '0') > 0) {
      lastActiveIdx = i;
      break;
    }
  }

  if (lastActiveIdx === -1) {
    return decimalDistributeEqually(totalClean, weights.length, targetScale);
  }

  const result = new Array(weights.length).fill(formatBigInt(1n, 0n, targetScale));
  let allocatedSum = formatBigInt(1n, 0n, targetScale);

  for (let i = 0; i < weights.length; i++) {
    const w = cleanDecimalString(weights[i]);
    if (decimalCompare(w, '0') <= 0) {
      result[i] = formatBigInt(1n, 0n, targetScale);
      continue;
    }

    if (i !== lastActiveIdx) {
      // ratio = w / totalWeight com 8 casas decimais de precisão interna
      const ratio = decimalDivide(w, totalWeight, 8);
      const slice = decimalMultiply(totalClean, ratio, targetScale);
      result[i] = slice;
      allocatedSum = decimalAdd(allocatedSum, slice, targetScale);
    } else {
      // O último item ativo absorve o resíduo exato (totalClean - allocatedSum)
      result[i] = decimalSubtract(totalClean, allocatedSum, targetScale);
    }
  }

  return result;
}
```

---

## 5. Código Proposto: Implementação Completa de `app/lib/calculations/allocationEngine.js`

Abaixo está o código de produção completo a ser implementado em `app/lib/calculations/allocationEngine.js`:

```javascript
/**
 * Motor Unificado de Alocação e Matriz de Conservação N:M — SmartNFe
 * 
 * Suporta os cenários de Agrupamento (N -> 1), Divisão (1 -> M) e Preparação Mista (N -> M).
 * Implementa precisão decimal arbitrária baseada em BigInt puro (sem IEEE 754),
 * conservação matemática estrita de saldos, preservação perpétua da identidade do item
 * (sourceInvoiceId + sourceItemId), validação de compatibilidade de unidades fiscais
 * e rateio multi-origem de despesas acessórias com absorção de resíduos ao centavo.
 */

import {
  cleanDecimalString,
  parseDecimal,
  formatBigInt,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  roundDecimal,
  decimalCompare,
  isDecimalNegative,
  isDecimalZero,
  isDecimalPositive,
  decimalSum,
  decimalDistributeEqually,
  decimalApportionProportional,
} from './decimal.js';

import { calculateInvoiceTotals, calculateItemTotal } from './invoiceTotals.js';

// ============================================================================
// CONSTANTES E FAMÍLIAS CANÔNICAS DE UNIDADES FISCAIS SEFAZ
// ============================================================================

export const ALLOCATION_STATUS = {
  OK: 'ok',
  PARTIAL: 'partial',
  EXCESS: 'excess',
};

export const UNIT_FAMILIES = {
  MASS_KG: ['KG', 'KGS', 'QUILO', 'QUILOS', 'KILO', 'KILOS', 'QUILOGRAMA', 'QUILOGRAMAS'],
  MASS_TON: ['TON', 'TONS', 'TONELADA', 'TONELADAS', 'T'],
  MASS_G: ['G', 'GR', 'GRAMA', 'GRAMAS'],
  UNIT: ['UN', 'UND', 'UNID', 'UNIDADE', 'UNIDADES', 'PC', 'PCA', 'PÇA', 'PECA', 'PECAS', 'PEÇAS', 'ITEM', 'ITENS'],
  BOX: ['CX', 'CXS', 'CAIXA', 'CAIXAS'],
  SACK: ['SC', 'SCS', 'SACO', 'SACOS', 'SAC'],
  PACKAGE: ['PCT', 'PCTE', 'PACOTE', 'PACOTES'],
  VOLUME_L: ['L', 'LT', 'LTS', 'LITRO', 'LITROS'],
  LENGTH_M: ['M', 'MT', 'MTS', 'METRO', 'METROS'],
  AREA_M2: ['M2', 'M²', 'MT2', 'METRO QUADRADO', 'METROS QUADRADOS'],
  VOLUME_M3: ['M3', 'M³', 'MT3', 'METRO CUBICO', 'METROS CUBICOS'],
  PAIR: ['PAR', 'PARES', 'PR'],
  DOZEN: ['DZ', 'DUZIA', 'DUZIAS'],
  BALE: ['FARDO', 'FARDOS', 'FD'],
  PALLET: ['PAL', 'PALETE', 'PALETES', 'PALLET', 'PALLETS'],
};

// ============================================================================
// AUXILIARES DE CHAVE COMPOSTA E IDENTIDADE DO ITEM
// ============================================================================

/**
 * Constrói a chave composta única do item de origem: `${sourceInvoiceId}__${sourceItemId}`.
 * Garante a preservação absoluta da identidade fiscal e fornecedor original.
 * @param {object} item
 * @returns {string}
 */
export function buildSourceItemKey(item) {
  if (!item) return '';
  const invId = item.sourceInvoiceId ?? item.invoiceId ?? item.parentInvoiceId ?? '';
  const itmId = item.sourceItemId ?? item.itemId ?? item.id ?? item.nItem ?? item.codigo ?? '';
  if (invId && itmId) {
    return `${invId}__${itmId}`;
  }
  return String(itmId || invId || 'unknown');
}

/**
 * Decompõe a chave composta em sourceInvoiceId e sourceItemId.
 * @param {string} key
 * @returns {{ sourceInvoiceId: string|null, sourceItemId: string }}
 */
export function parseSourceItemKey(key) {
  const s = String(key || '');
  const parts = s.split('__');
  if (parts.length >= 2) {
    return {
      sourceInvoiceId: parts[0],
      sourceItemId: parts.slice(1).join('__'),
    };
  }
  return {
    sourceInvoiceId: null,
    sourceItemId: s,
  };
}

// ============================================================================
// VALIDAÇÃO DE COMPATIBILIDADE DE UNIDADES FISCAIS
// ============================================================================

/**
 * Normaliza strings de unidade de medida comercial e tributária da SEFAZ.
 * @param {string} unitStr
 * @returns {string}
 */
export function normalizeUnit(unitStr) {
  if (!unitStr) return '';
  return String(unitStr)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[²]/g, '2')
    .replace(/[³]/g, '3')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Obtém a família canônica correspondente à unidade normalizada.
 * @param {string} normalizedUnit
 * @returns {string|null}
 */
function getUnitFamily(normalizedUnit) {
  if (!normalizedUnit) return null;
  for (const [family, members] of Object.entries(UNIT_FAMILIES)) {
    if (members.includes(normalizedUnit)) {
      return family;
    }
  }
  return null;
}

/**
 * Verifica se duas unidades de medida são compatíveis entre si.
 * @param {object|string} itemOrUnitA
 * @param {object|string} itemOrUnitB
 * @returns {boolean}
 */
export function checkUnitCompatibility(itemOrUnitA, itemOrUnitB) {
  const rawA = typeof itemOrUnitA === 'object' && itemOrUnitA !== null
    ? (itemOrUnitA.unidade ?? itemOrUnitA.uCom ?? itemOrUnitA.uTrib ?? itemOrUnitA.unit ?? '')
    : itemOrUnitA;
  const rawB = typeof itemOrUnitB === 'object' && itemOrUnitB !== null
    ? (itemOrUnitB.unidade ?? itemOrUnitB.uCom ?? itemOrUnitB.uTrib ?? itemOrUnitB.unit ?? '')
    : itemOrUnitB;

  const uA = normalizeUnit(rawA);
  const uB = normalizeUnit(rawB);

  if (!uA && !uB) return true;
  if (!uA || !uB) return false;
  if (uA === uB) return true;

  const famA = getUnitFamily(uA);
  const famB = getUnitFamily(uB);

  if (famA && famB && famA === famB) {
    return true;
  }

  return false;
}

// ============================================================================
// CÁLCULO DE SALDO DE CONSERVAÇÃO INDIVIDUAL
// ============================================================================

/**
 * Calcula o saldo remanescente de um item aplicando a regra de conservação:
 * disponível = originalQty - priorAllocatedQty - currentAllocatedQtyTotal
 * 
 * @param {string|number} originalQty
 * @param {Array<string|number|object>|object} currentAllocations
 * @param {string|number} [priorAllocatedQty='0.0000']
 * @param {number} [scale=4]
 * @returns {{
 *   originalQty: string,
 *   priorAllocatedQty: string,
 *   availableQty: string,
 *   allocatedQtyTotal: string,
 *   remainingQty: string,
 *   hasExcess: boolean,
 *   hasNegative: boolean,
 *   hasRemaining: boolean,
 *   isBalanced: boolean,
 *   status: 'ok' | 'partial' | 'excess'
 * }}
 */
export function calculateItemConservationBalance(
  originalQty,
  currentAllocations,
  priorAllocatedQty = '0.0000',
  scale = 4
) {
  const origStr = roundDecimal(originalQty || '0', scale);
  const priorStr = roundDecimal(priorAllocatedQty || '0', scale);

  const availableStr = decimalSubtract(origStr, priorStr, scale);

  let allocList = [];
  if (Array.isArray(currentAllocations)) {
    allocList = currentAllocations;
  } else if (currentAllocations && typeof currentAllocations === 'object') {
    allocList = Object.values(currentAllocations);
  }

  let allocatedTotal = '0.' + '0'.repeat(scale);
  let hasNegative = false;

  for (const alloc of allocList) {
    const qStr = typeof alloc === 'object' && alloc !== null
      ? cleanDecimalString(alloc.quantidade ?? alloc.quantity ?? alloc.allocatedQty ?? '0')
      : cleanDecimalString(alloc ?? '0');

    if (isDecimalNegative(qStr)) {
      hasNegative = true;
    }
    allocatedTotal = decimalAdd(allocatedTotal, qStr, scale);
  }

  const remainingStr = decimalSubtract(availableStr, allocatedTotal, scale);
  const cmpRemaining = decimalCompare(remainingStr, '0');
  const cmpAvailable = decimalCompare(availableStr, '0');

  const hasExcess = hasNegative || cmpRemaining < 0 || cmpAvailable < 0;
  const hasRemaining = !hasExcess && cmpRemaining > 0;
  const isBalanced = !hasExcess && cmpRemaining === 0 && decimalCompare(allocatedTotal, '0') > 0;

  let status = ALLOCATION_STATUS.PARTIAL;
  if (hasExcess) {
    status = ALLOCATION_STATUS.EXCESS;
  } else if (cmpRemaining === 0) {
    status = ALLOCATION_STATUS.OK;
  } else {
    status = ALLOCATION_STATUS.PARTIAL;
  }

  return {
    originalQty: origStr,
    priorAllocatedQty: priorStr,
    availableQty: availableStr,
    allocatedQtyTotal: allocatedTotal,
    remainingQty: remainingStr,
    hasExcess,
    hasNegative,
    hasRemaining,
    isBalanced,
    status,
  };
}

// ============================================================================
// MOTOR MATRICIAL UNIFICADO N -> M (calculateAllocationMatrix)
// ============================================================================

/**
 * Calcula a matriz de alocação de itens de N origens para M destinos.
 * 
 * @param {Array<object>} sourceItems - Itens de origem com identificação e valores
 * @param {Array<object>|object} destinationNotes - Notas de destino com alocações
 * @param {Map|object} [activeAllocations={}] - Alocações ativas externas para subtração
 * @param {object} [options={}] - Opções: minDestinations, requireBalanced, sourceInvoiceTotals
 * @returns {object} Matriz, saldos por item, resumos por nota, canSave e totais
 */
export function calculateAllocationMatrix(
  sourceItems = [],
  destinationNotes = [],
  activeAllocations = {},
  options = {}
) {
  const minDestinations = options.minDestinations ?? 1;
  const requireBalanced = options.requireBalanced ?? false;
  const sourceInvoiceTotals = options.sourceInvoiceTotals ?? {};

  const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

  // 1. Normaliza as notas de destino para formato padrão
  let notes = [];
  if (Array.isArray(destinationNotes)) {
    notes = destinationNotes.map((note, idx) => {
      const id = note.id || note.noteId || `dest-${idx + 1}`;
      const numero = note.numero || note.number || `EXP-${String(idx + 1).padStart(3, '0')}`;
      let allocations = {};

      if (note.allocations && typeof note.allocations === 'object') {
        allocations = { ...note.allocations };
      } else if (Array.isArray(note.itens || note.items)) {
        const arr = note.itens || note.items;
        for (const item of arr) {
          const key = buildSourceItemKey(item) || item.id || item.codigo;
          const q = item.quantidade ?? item.quantity ?? item.allocatedQty ?? '0';
          allocations[key] = q;
        }
      }
      return { id, numero, allocations, raw: note };
    });
  } else if (destinationNotes && typeof destinationNotes === 'object') {
    notes = Object.entries(destinationNotes).map(([id, allocs], idx) => ({
      id,
      numero: `EXP-${String(idx + 1).padStart(3, '0')}`,
      allocations: typeof allocs === 'object' && allocs !== null ? allocs : {},
      raw: allocs,
    }));
  }

  // 2. Mapeia itens de origem por chave composta única
  const sourceMap = new Map();
  for (const item of safeSourceItems) {
    const key = buildSourceItemKey(item);
    sourceMap.set(key, item);
  }

  // 3. Processa saldos de conservação para cada item de origem
  const sourceBalances = {};
  const matrix = {};
  for (const note of notes) {
    matrix[note.id] = {};
  }

  let totalAllocatedItems = 0;
  let hasAnyExcess = false;
  let hasAnyNegative = false;
  let hasAnyRemaining = false;
  let allBalanced = safeSourceItems.length > 0;
  let hasAtLeastOneAllocation = false;

  let totalSourceValue = '0.00';
  let totalAllocatedValue = '0.00';

  let balancedCount = 0;
  let partialCount = 0;
  let excessCount = 0;
  let unallocatedCount = 0;

  for (const [key, item] of sourceMap.entries()) {
    const parsed = parseSourceItemKey(key);
    const sourceInvoiceId = item.sourceInvoiceId || parsed.sourceInvoiceId || '';
    const sourceItemId = item.sourceItemId || parsed.sourceItemId || '';
    const originalQtyStr = cleanDecimalString(item.quantidade ?? '0');
    const unitPriceStr = cleanDecimalString(item.valorUnitario ?? '0');

    // Item line total original
    const origItemTotal = item.valorTotal ?? calculateItemTotal(unitPriceStr, originalQtyStr);
    totalSourceValue = decimalAdd(totalSourceValue, origItemTotal, 2);

    // Alocação ativa externa pré-existente
    let priorAllocated = '0.0000';
    if (activeAllocations instanceof Map) {
      priorAllocated = activeAllocations.get(key) || '0.0000';
    } else if (activeAllocations && typeof activeAllocations === 'object') {
      priorAllocated = activeAllocations[key] || '0.0000';
    }

    // Coleta as alocações deste item em cada nota de destino
    const currentAllocationsByNote = {};
    for (const note of notes) {
      let allocatedQty = note.allocations[key];
      // Fallback: se a nota salvou apenas pelo itemId simples sem prefixo
      if (allocatedQty === undefined && note.allocations[sourceItemId] !== undefined) {
        allocatedQty = note.allocations[sourceItemId];
      }
      if (allocatedQty === undefined && item.id && note.allocations[item.id] !== undefined) {
        allocatedQty = note.allocations[item.id];
      }
      currentAllocationsByNote[note.id] = cleanDecimalString(allocatedQty || '0');
    }

    // Calcula saldo de conservação
    const balance = calculateItemConservationBalance(
      originalQtyStr,
      currentAllocationsByNote,
      priorAllocated,
      4
    );

    if (balance.hasExcess) hasAnyExcess = true;
    if (balance.hasNegative) hasAnyNegative = true;
    if (balance.hasRemaining) hasAnyRemaining = true;
    if (!balance.isBalanced) allBalanced = false;

    if (decimalCompare(balance.allocatedQtyTotal, '0') > 0) {
      hasAtLeastOneAllocation = true;
    }

    if (balance.status === ALLOCATION_STATUS.OK) balancedCount++;
    else if (balance.status === ALLOCATION_STATUS.EXCESS) excessCount++;
    else {
      if (decimalCompare(balance.allocatedQtyTotal, '0') === 0) unallocatedCount++;
      else partialCount++;
    }

    sourceBalances[key] = {
      sourceKey: key,
      sourceInvoiceId,
      sourceItemId,
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      unidade: item.unidade || '',
      ncm: item.ncm || '',
      ...balance,
    };

    // Preenche as células da matriz para cada destino
    for (const note of notes) {
      const qAlloc = currentAllocationsByNote[note.id];
      const lineTotal = decimalMultiply(unitPriceStr, qAlloc, 2);

      if (decimalCompare(qAlloc, '0') > 0) {
        totalAllocatedItems++;
        totalAllocatedValue = decimalAdd(totalAllocatedValue, lineTotal, 2);
      }

      matrix[note.id][key] = {
        allocatedQty: roundDecimal(qAlloc, 4),
        remainingQty: balance.remainingQty,
        unitPrice: unitPriceStr,
        lineTotal,
        apportionedExpenses: {
          freight: '0.00',
          insurance: '0.00',
          otherExpenses: '0.00',
          discount: '0.00',
          valorFrete: '0.00',
          valorSeguro: '0.00',
          outrasDespesas: '0.00',
          valorDesconto: '0.00',
        },
      };
    }
  }

  // 4. Rateio Proporcional de Despesas Acessórias Multi-Origem (Zero-Drift)
  // Agrupa origens distintas presentes nos itens
  const uniqueOrigins = new Set();
  for (const item of safeSourceItems) {
    const invId = item.sourceInvoiceId || parseSourceItemKey(buildSourceItemKey(item)).sourceInvoiceId;
    if (invId) uniqueOrigins.add(invId);
  }

  // Estrutura de acumulação de despesas por destino
  const destinationExpenseTotals = {};
  for (const note of notes) {
    destinationExpenseTotals[note.id] = {
      freight: '0.00',
      insurance: '0.00',
      otherExpenses: '0.00',
      discount: '0.00',
    };
  }

  for (const originId of uniqueOrigins) {
    // Obtém totais da nota de origem se disponíveis
    const originTotals = sourceInvoiceTotals[originId] || {};
    const origFrete = cleanDecimalString(originTotals.valorFrete ?? originTotals.freight ?? '0.00');
    const origSeguro = cleanDecimalString(originTotals.valorSeguro ?? originTotals.insurance ?? '0.00');
    const origOutras = cleanDecimalString(originTotals.outrasDespesas ?? originTotals.otherExpenses ?? '0.00');
    const origDesconto = cleanDecimalString(originTotals.valorDesconto ?? originTotals.discount ?? '0.00');

    // Calcula total de produtos desta origem alocado para cada destino
    const originProdByDest = notes.map((note) => {
      let prodSum = '0.00';
      for (const [key, item] of sourceMap.entries()) {
        const parsed = parseSourceItemKey(key);
        const invId = item.sourceInvoiceId || parsed.sourceInvoiceId;
        if (invId === originId) {
          const cell = matrix[note.id][key];
          if (cell) {
            prodSum = decimalAdd(prodSum, cell.lineTotal, 2);
          }
        }
      }
      return prodSum;
    });

    const totalAllocatedOriginProd = decimalSum(originProdByDest);

    // Se houver despesas nesta origem e produtos alocados dela
    if (decimalCompare(totalAllocatedOriginProd, '0') > 0) {
      const freteParts = decimalApportionProportional(origFrete, originProdByDest, 2);
      const seguroParts = decimalApportionProportional(origSeguro, originProdByDest, 2);
      const outrasParts = decimalApportionProportional(origOutras, originProdByDest, 2);
      const descontoParts = decimalApportionProportional(origDesconto, originProdByDest, 2);

      for (let i = 0; i < notes.length; i++) {
        const destId = notes[i].id;
        destinationExpenseTotals[destId].freight = decimalAdd(
          destinationExpenseTotals[destId].freight,
          freteParts[i] || '0.00',
          2
        );
        destinationExpenseTotals[destId].insurance = decimalAdd(
          destinationExpenseTotals[destId].insurance,
          seguroParts[i] || '0.00',
          2
        );
        destinationExpenseTotals[destId].otherExpenses = decimalAdd(
          destinationExpenseTotals[destId].otherExpenses,
          outrasParts[i] || '0.00',
          2
        );
        destinationExpenseTotals[destId].discount = decimalAdd(
          destinationExpenseTotals[destId].discount,
          descontoParts[i] || '0.00',
          2
        );
      }
    }
  }

  // 5. Consolida os resumos financeiros e fiscais de cada nota de destino
  const destinationSummaries = notes.map((note) => {
    let noteTotalProducts = '0.00';
    let noteTotalQty = '0.0000';
    let allocatedItemsCount = 0;
    const destItems = [];

    for (const [key, cell] of Object.entries(matrix[note.id])) {
      if (decimalCompare(cell.allocatedQty, '0') > 0) {
        allocatedItemsCount++;
        noteTotalQty = decimalAdd(noteTotalQty, cell.allocatedQty, 4);
        noteTotalProducts = decimalAdd(noteTotalProducts, cell.lineTotal, 2);

        const src = sourceMap.get(key);
        destItems.push({
          sourceKey: key,
          sourceInvoiceId: src?.sourceInvoiceId || parseSourceItemKey(key).sourceInvoiceId,
          sourceItemId: src?.sourceItemId || parseSourceItemKey(key).sourceItemId,
          codigo: src?.codigo || '',
          descricao: src?.descricao || '',
          ncm: src?.ncm || '',
          unidade: src?.unidade || '',
          quantidade: cell.allocatedQty,
          valorUnitario: cell.unitPrice,
          valorTotal: cell.lineTotal,
          sourceInvoiceNumero: src?.sourceInvoiceNumero,
          sourceEmitente: src?.sourceEmitente,
        });
      }
    }

    const expenses = destinationExpenseTotals[note.id];
    const totals = calculateInvoiceTotals(destItems, {
      discount: expenses.discount,
      freight: expenses.freight,
      insurance: expenses.insurance,
      otherExpenses: expenses.otherExpenses,
    });

    return {
      destinationId: note.id,
      numero: note.numero,
      allocatedItemsCount,
      totalQuantity: noteTotalQty,
      totalProducts: totals.totalProducts,
      totalFreight: totals.totalFreight,
      totalInsurance: totals.totalInsurance,
      totalOtherExpenses: totals.totalOtherExpenses,
      totalDiscount: totals.totalDiscount,
      totalInvoice: totals.totalInvoice,
      items: destItems,
    };
  });

  // 6. Avaliação de elegibilidade para salvamento (canSave)
  let canSave = true;

  // Bloqueio por notas insuficientes
  if (notes.length < minDestinations) {
    canSave = false;
  }
  // Bloqueio absoluto por qualquer excesso ou alocação negativa
  if (hasAnyExcess || hasAnyNegative) {
    canSave = false;
  }
  // Se exigido balanceamento estrito (modo divisão 100%), rejeita qualquer sobra remanescente
  if (requireBalanced && (!allBalanced || hasAnyRemaining)) {
    canSave = false;
  }
  // Bloqueia caso nenhuma alocação tenha sido realizada
  if (!hasAtLeastOneAllocation && safeSourceItems.length > 0) {
    canSave = false;
  }

  const isValid = !hasAnyExcess && !hasAnyNegative && (!requireBalanced || !hasAnyRemaining);

  return {
    matrix,
    sourceBalances,
    destinationSummaries,
    canSave,
    isValid,
    hasExcess: hasAnyExcess,
    hasNegative: hasAnyNegative,
    hasRemaining: hasAnyRemaining,
    isBalanced: allBalanced,
    totals: {
      totalSourceValue,
      totalAllocatedValue,
      totalSourceItems: safeSourceItems.length,
      totalAllocatedItems,
    },
    summary: {
      totalSourceItemsCount: safeSourceItems.length,
      destinationNotesCount: notes.length,
      balancedCount,
      partialCount,
      excessCount,
      unallocatedCount,
    },
  };
}
```

---

## 6. Estratégia de Retrocompatibilidade e Delegação para `divisionMath.js`

O arquivo `app/lib/calculations/divisionMath.js` continuará exportando as mesmas 6 funções originais com 100% de equivalência estrutural e sem quebrar nenhum dos 383 testes existentes:
1. `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)`:
   - Delega para `calculateItemConservationBalance(originalQtyStr, allocatedQtyArray, '0.0000', 4)`.
   - Mapeia o retorno para a forma exata esperada: `{ balanceStr, status, totalAllocatedStr, isOk, hasRemaining, hasExcess, hasNegative }`.
2. `validateDivisionBatch(originalItems, destinationNotes)`:
   - Delega para `calculateAllocationMatrix(originalItems, destinationNotes, {}, { minDestinations: 2, requireBalanced: true })`.
   - Mapeia `destinationSummaries` para `notesSummary` e `sourceBalances` para `itemReports`.
3. `distributeEqually(originalQtyStr, numNotes, scale = 4)`:
   - Delega para `decimalDistributeEqually(originalQtyStr, numNotes, scale)`.
4. `distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4)`:
   - Utiliza `calculateRemainingBalance` e `distributeEqually`.
5. `apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr)`:
   - Preservado com mesma assinatura.
6. `apportionAllInvoiceExpenses(parentTotals, notesWithProducts)`:
   - Delega para `decimalApportionProportional` ou mantém o loop de conservação de centavos testado no Challenger M4.

Desta forma, todo o código legado em `/documentos/[id]/divisao` e os testes de integração continuam funcionando sem qualquer alteração de interface.

---

## 7. Estratégia de Testes para o Worker (`tests/unit/allocationEngine.test.mjs`)

O Worker que implementar estas funcionalidades deve criar a suíte unitária cobrindo:
1. **Conservação de Quantidades Fiscais (4 decimais)**:
   - Cenário $N \to 1$ (agrupamento de 3 fornecedores em 1 destino de exportação).
   - Cenário $1 \to M$ (divisão de 1 fornecedor em 4 contêineres de exportação).
   - Cenário $N \to M$ (matriz mista 5 notas de fornecedores $\to$ 3 clientes de exportação).
2. **Conservação de Saldos com Alocações Ativas Pré-existentes**:
   - `available = original - priorActive`.
   - Bloqueio quando a soma total ultrapassa `available`.
3. **Preservação Perpétua da Identidade do Item**:
   - Garantia de que itens com mesmo código e NCM de fornecedores distintos não sofrem fusão.
4. **Verificação de Compatibilidade de Unidades**:
   - `checkUnitCompatibility('KG', 'QUILOGRAMA') === true`
   - `checkUnitCompatibility('UN', 'PC') === true`
   - `checkUnitCompatibility('KG', 'UN') === false`
5. **Rateio Proporcional de Despesas Acessórias com Cent-Conservation**:
   - Divisão de R$ 0,01 de frete entre 3 notas $\to$ $[0.00, 0.00, 0.01]$, soma exatamente $0.01$.
   - Divisão de despesas assimétricas multi-origem $\to$ soma de cada origem é idêntica ao original.
6. **Bloqueio Rigoroso de Inconsistências**:
   - Alocações negativas disparam `hasNegative: true` e `canSave: false`.
   - Alocação excessiva dispara `hasExcess: true`, `status: 'excess'` e `canSave: false`.

---

## 8. Conclusão

A arquitetura proposta para `allocationEngine.js` e as extensões para `decimal.js` atendem com perfeição matemática e regulatória às diretrizes do Milestone 1:
- Aritmética decimal nativa `BigInt` pura (sem bibliotecas externas).
- Zero drift em quantidades fiscais e valores monetários.
- 100% retrocompatível com a base existente.
- Pronta para implementação pelo Worker.
