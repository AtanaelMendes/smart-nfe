# Estratégia de Implementação — Formatadores, Refinamentos de Mocks, Resiliência do DataTable e Suite de Testes do Milestone 2

**Agente:** `teamwork_explorer_m2_3` (teamwork_explorer)  
**Data:** 2026-11-04  
**Milestone:** Milestone 2 (Core Domain Services & Calculations)  
**Alvos:**  
1. `app/lib/formatters/` (`numbers.js`, fix em `currency.js`, fix em `dates.js`)  
2. `app/lib/data/mockInvoices.js` (refinamento matemático `demo-02`, alinhamento `demo-05`, anotações de inconsistências em `demo-04`)  
3. `app/components/table/DataTable.jsx` (proteção contra `data={null}`)  
4. `tests/tier1/m2_domain.test.mjs` (suite de testes de domínio com `node:test` e `node:assert/strict`)

---

## 1. Visão Executiva e Diagnóstico

Na auditoria do Milestone 1 realizada pelo Challenger (`teamwork_challenger_m1_1`) e nos requisitos do Milestone 2, foram identificados débitos técnicos pontuais e lacunas de formatação/resiliência:
1. **`parseBRL` em `currency.js`**: Remove cegamente todos os caracteres `.` (`.replace(/\./g, '')`), tratando-os como separador de milhar. Ao receber strings decimais padrão (ex: `"1250.50"`), remove o ponto e avalia para `125050` (inflação de 100x).
2. **`formatDateBR` em `dates.js`**: Strings como `"2026-99-99"` ou `"2026-02-31"` sofrem rollover silencioso no `Date.UTC` nativo do JavaScript e retornam datas futuras espúrias (ex: `07/06/2034`) em vez do fallback seguro `"-"`.
3. **Ausência de `numbers.js`**: Não havia módulo centralizado para formatação de quantidades aduaneiras (com até 4 casas decimais) e números decimais com separador pt-BR.
4. **`DataTable.jsx` com `data={null}`**: Se o consumidor passar `data={null}` (comum em carregamento assíncrono), o parâmetro default `data = []` não é acionado, e a linha 171 (`data.length`) lança `TypeError: Cannot read properties of null (reading 'length')`.
5. **Inconsistências em `mockInvoices.js`**:
   - `demo-02`: Os 25 itens possuem `quantidade: '1.0000'`, `valorUnitario` variando de 5075.0000 a 6875.0000, mas `valorTotal: '5950.00'` fixo.
   - `demo-05`: O item 15 possui `74 * 380 = 28.120,00`, mas estava gravado como `28.150,00` (+30,00). Além disso, a soma dos 15 itens divergia do cabeçalho de `342.000,00` e das duas notas preparadas (`prep-01` e `prep-02`).
   - `demo-04`: Necessidade de anotação explícita das regras fiscais violadas para alimentação direta da tela `/documentos/[id]/validacao`.
6. **Alinhamento com testes adversariais existentes**: O arquivo `tests/tier5/m1_adversarial_stress.test.mjs` continha 4 asserções que verificavam a ocorrência desses bugs do M1. Ao aplicar as correções, tais asserções precisam ser atualizadas para atestar a resolução com sucesso.

---

## 2. Estratégia e Especificação de Código: Formatadores (`app/lib/formatters/`)

### 2.1 Novo Módulo: `app/lib/formatters/numbers.js`

#### Responsabilidade
Formatar quantidades aduaneiras/comerciais (até 4 casas decimais) e valores decimais genéricos para a notação padrão brasileira (`1.250,5000` / `1.250,50`), além de prover parsing seguro de entradas textuais.

#### Assinaturas
- `formatQuantity(value, maxDecimals = 4, minDecimals = 0)` -> `string`
- `formatDecimal(value, decimals = 2)` -> `string`
- `parseDecimal(value)` -> `number`

#### Código Proposto
```javascript
/**
 * Central de Formatação Numérica e Quantidades Fiscais — SmartNFe
 * Padrão brasileiro de pontuação (milhar com ponto, decimal com vírgula).
 */

/**
 * Converte com segurança entradas numéricas ou textuais (pt-BR ou decimal padrão) para float.
 * @param {string|number|null|undefined} value
 * @returns {number}
 */
export function parseDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  let cleaned = String(value).trim();
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato BR: "1.250,50" -> remove ponto, substitui vírgula
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US: "1,250.50" -> remove vírgula
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? 0 : parsed;
}

/**
 * Formata quantidade fiscal (com até maxDecimals casas decimais, padrão 4).
 * Suporta inteiros sem decimais forçados ou com minDecimals configurável.
 * Ex: formatQuantity(500) -> "500"
 * Ex: formatQuantity("500.1234", 4) -> "500,1234"
 * Ex: formatQuantity("0.0010", 4) -> "0,001"
 * @param {string|number|null|undefined} value
 * @param {number} [maxDecimals=4]
 * @param {number} [minDecimals=0]
 * @returns {string}
 */
export function formatQuantity(value, maxDecimals = 4, minDecimals = 0) {
  if (value === null || value === undefined || value === '') {
    return minDecimals > 0 ? `0,${'0'.repeat(minDecimals)}` : '0';
  }

  const num = parseDecimal(value);
  if (num === 0 && (value === 0 || value === '0' || value === '0.00' || value === '0,00')) {
    return minDecimals > 0 ? `0,${'0'.repeat(minDecimals)}` : '0';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.max(0, minDecimals),
    maximumFractionDigits: Math.max(0, maxDecimals),
  }).format(num);
}

/**
 * Formata número decimal genérico com número fixo de casas decimais (padrão 2).
 * Ex: formatDecimal(1250.5, 2) -> "1.250,50"
 * Ex: formatDecimal("1250.555", 2) -> "1.250,56"
 * @param {string|number|null|undefined} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatDecimal(value, decimals = 2) {
  if (value === null || value === undefined || value === '') {
    return decimals > 0 ? `0,${'0'.repeat(decimals)}` : '0';
  }

  const num = parseDecimal(value);

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
```

---

### 2.2 Correção em `app/lib/formatters/currency.js`

#### Diagnóstico
A função `parseBRL(strVal)` atual:
```javascript
// CÓDIGO ATUAL COM BUG:
const cleaned = String(strVal)
  .replace(/[R$\s]/g, '')
  .replace(/\./g, '') // <- DELETA O PONTO DE 1250.50 GERANDO 125050!
  .replace(',', '.');
```

#### Solução Proposta
Distinguir se a entrada é brasileira (`1.250,50`) ou decimal padrão (`1250.50` / `284500.00`):
1. Remover prefixo `R$`, espaços e caracteres invisíveis.
2. Se contiver vírgula e ponto:
   - Se a vírgula for posterior ao ponto (`1.250,50`), remove os pontos e troca a vírgula por ponto.
   - Se o ponto for posterior à vírgula (`1,250.50`), remove as vírgulas.
3. Se contiver apenas vírgula (`1250,50` ou `,50`): troca a vírgula por ponto.
4. Se contiver apenas ponto:
   - Se houver múltiplos pontos (`1.250.000`), são separadores de milhar -> remove os pontos.
   - Se houver 1 único ponto (`1250.50` ou `284500.00`), é separador decimal -> mantém o ponto!
5. Se não contiver nem ponto nem vírgula: converte diretamente.
6. Tratar números negativos (`-R$ 1.250,50` ou `-1250.50`).

#### Código Proposto para `parseBRL` em `currency.js`
```javascript
export function parseBRL(strVal) {
  if (strVal === null || strVal === undefined || strVal === '') {
    return 0;
  }

  if (typeof strVal === 'number') {
    return Number.isFinite(strVal) ? strVal : 0;
  }

  let cleaned = String(strVal)
    .replace(/[R$\s]/g, '')
    .trim();

  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastCommaIndex = cleaned.lastIndexOf(',');
    const lastDotIndex = cleaned.lastIndexOf('.');
    if (lastCommaIndex > lastDotIndex) {
      // Padrão brasileiro: "1.250,50"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: "1,250.50"
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas vírgula: "1250,50"
    cleaned = cleaned.replace(',', '.');
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Múltiplos pontos: "1.000.000"
      cleaned = cleaned.replace(/\./g, '');
    }
    // Único ponto: "1250.50" -> mantém o ponto
  }

  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? 0 : parsed;
}
```

---

### 2.3 Correção em `app/lib/formatters/dates.js`

#### Diagnóstico
A validação regex `/^\d{4}-\d{2}-\d{2}$/` aceita strings como `"2026-99-99"` ou `"2026-02-31"`. O construtor `Date.UTC(year, month - 1, day)` executa rollover de calendário e produz uma data válida (ex: ano de 2034).

#### Solução Proposta
Após a construção de `dateObj = new Date(Date.UTC(year, month - 1, day))`, validar se os componentes UTC conferem exatamente com as partes originais:
```javascript
if (
  dateObj.getUTCFullYear() !== year ||
  dateObj.getUTCMonth() !== month - 1 ||
  dateObj.getUTCDate() !== day
) {
  return '-';
}
```
Aplicar a mesma proteção em `formatDateTimeBR` para strings ISO com timestamp.

#### Código Proposto para `dates.js`
```javascript
/**
 * Central de Formatação de Datas — SmartNFe
 * Utiliza estritamente APIs nativas Intl.DateTimeFormat (sem dependência de moment ou date-fns).
 * Validação rigorosa de calendário sem rollover de datas inválidas.
 */

/**
 * Formata data ISO para o padrão brasileiro DD/MM/AAAA.
 * @param {string|Date|number|null|undefined} dateInput - ISO string, timestamp ou Date
 * @returns {string} Data formatada (ex: "15/10/2026") ou "-" se inválido
 */
export function formatDateBR(dateInput) {
  if (!dateInput) return '-';
  try {
    let dateObj;
    if (dateInput instanceof Date) {
      dateObj = dateInput;
      if (Number.isNaN(dateObj.getTime())) return '-';
    } else if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      const isoSimpleMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoSimpleMatch) {
        const year = Number(isoSimpleMatch[1]);
        const month = Number(isoSimpleMatch[2]);
        const day = Number(isoSimpleMatch[3]);

        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) {
          return '-';
        }

        dateObj = new Date(Date.UTC(year, month - 1, day));
        // Prevenção estrita de rollover (ex: 2026-02-31 ou 2026-99-99)
        if (
          dateObj.getUTCFullYear() !== year ||
          dateObj.getUTCMonth() !== month - 1 ||
          dateObj.getUTCDate() !== day
        ) {
          return '-';
        }
      } else {
        // Possível data com hora ou outro formato
        const isoWithTimeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T/);
        if (isoWithTimeMatch) {
          const year = Number(isoWithTimeMatch[1]);
          const month = Number(isoWithTimeMatch[2]);
          const day = Number(isoWithTimeMatch[3]);
          if (month < 1 || month > 12 || day < 1 || day > 31) {
            return '-';
          }
        }
        dateObj = new Date(trimmed);
        if (Number.isNaN(dateObj.getTime())) {
          return '-';
        }
      }
    } else {
      dateObj = new Date(dateInput);
      if (Number.isNaN(dateObj.getTime())) {
        return '-';
      }
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Formata data e hora ISO para o padrão brasileiro DD/MM/AAAA HH:mm.
 * @param {string|Date|number|null|undefined} dateInput
 * @returns {string} Data/hora formatada (ex: "15/10/2026 14:30") ou "-" se inválido
 */
export function formatDateTimeBR(dateInput) {
  if (!dateInput) return '-';
  try {
    let dateObj;
    if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        const day = Number(isoMatch[3]);
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return '-';
        }
      }
      dateObj = new Date(trimmed);
    } else {
      dateObj = new Date(dateInput);
    }

    if (Number.isNaN(dateObj.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj);
  } catch {
    return '-';
  }
}
```

---

## 3. Estratégia e Especificação de Código: Mocks (`app/lib/data/mockInvoices.js`)

### 3.1 Refinamento de `demo-02` (25 itens metalmecânicos)

#### Problema Identificado
Em `demo-02`, a fórmula geradora atual era:
```javascript
itens: Array.from({ length: 25 }, (_, idx) => {
  const num = idx + 1;
  const unit = (5000 + (num * 75)).toFixed(4); // Varia de 5075.0000 a 6875.0000
  const total = (5950.00).toFixed(2);          // Fixo em 5950.00
  return {
    quantidade: '1.0000',
    valorUnitario: unit,
    valorTotal: total,
    ...
  };
})
```
Como a quantidade é `1.0000`, para todos os 25 itens `1.0000 * unit != total`!

#### Solução Proposta
Para manter a riqueza de ter preços industriais variados para cada uma das 25 peças diferentes E preservar a soma total de `25 * 5950 = 148.750,00`:
Usar variação simétrica em torno da média `5950`:
```javascript
const num = idx + 1;
const price = 5950 + (num - 13) * 50; // varia de 5350.00 a 6550.00, média exata 5950.00
const unit = price.toFixed(4);
const total = price.toFixed(2);
```
Propriedades matemáticas comprovadas:
1. Para cada item: `1.0000 * unit === total` (0 divergências!).
2. A soma de `(num - 13)` de 1 a 25 é `(1-13) + (2-13) + ... + (25-13) = 0`.
3. Portanto, a soma de `valorTotal` dos 25 itens é exatamente `25 * 5950.00 = 148.750,00`.
4. Os totais de `totais.valorProdutos` (`148750.00`), `totais.valorTotalNota` (`148750.00`) e o KPI consolidado do Dashboard (`1497050.00`) permanecem **100% idênticos e inalterados**.

---

### 3.2 Refinamento de `demo-05` (15 itens em lotes múltiplos)

#### Problema Identificado
1. No item 15 (`d5-15`): `quantidade: '74.0000'` e `valorUnitario: '380.0000'`, resultando em `28.120,00`, mas gravado como `'28150.00'`.
2. A soma dos 15 itens originais era `363.970,00`, enquanto o cabeçalho registrava `342.000,00` e as notas preparadas (`prep-01` = 134.750,00 e `prep-02` = 207.250,00) somavam `342.000,00`.

#### Solução Proposta
Calibrar com precisão cirúrgica as quantidades inteiras dos lotes de Soja (unitário `400.0000`), Milho (unitário `350.0000`) e Sorgo (unitário `380.0000`) de modo que:
- **Item 15 (`d5-15`)**: exatamente `quantidade: '74.0000'`, `valorUnitario: '380.0000'`, `valorTotal: '28120.00'`.
- **Cada um dos 15 itens**: satisfaça `quantidade * valorUnitario == valorTotal`.
- **Itens de `prep-01` (itens 1 a 6)**: somem exatamente `134.750,00`.
- **Itens de `prep-02` (itens 7 a 15)**: somem exatamente `207.250,00`.
- **Soma dos 15 itens**: `134.750,00 + 207.250,00 = 342.000,00`.

#### Tabela de Itens Calibrados para `demo-05`:
| Item ID | Produto | Lote | Qtd (TON) | Unitário (R$) | Total (R$) | Pertence a |
|---|---|---|---|---|---|---|
| `d5-1` | Soja | L01 | 50.0000 | 400.0000 | 20.000,00 | `prep-01` |
| `d5-2` | Milho | L01 | 60.0000 | 350.0000 | 21.000,00 | `prep-01` |
| `d5-3` | Sorgo | L01 | 55.0000 | 380.0000 | 20.900,00 | `prep-01` |
| `d5-4` | Soja | L02 | 54.0000 | 400.0000 | 21.600,00 | `prep-01` |
| `d5-5` | Milho | L02 | 65.0000 | 350.0000 | 22.750,00 | `prep-01` |
| `d5-6` | Sorgo | L02 | 75.0000 | 380.0000 | 28.500,00 | `prep-01` |
| **Subtotal `prep-01`** | | | **359.0000** | | **134.750,00** | |
| `d5-7` | Soja | L03 | 49.0000 | 400.0000 | 19.600,00 | `prep-02` |
| `d5-8` | Milho | L03 | 51.0000 | 350.0000 | 17.850,00 | `prep-02` |
| `d5-9` | Sorgo | L03 | 64.0000 | 380.0000 | 24.320,00 | `prep-02` |
| `d5-10` | Soja | L04 | 53.0000 | 400.0000 | 21.200,00 | `prep-02` |
| `d5-11` | Milho | L04 | 58.0000 | 350.0000 | 20.300,00 | `prep-02` |
| `d5-12` | Sorgo | L04 | 72.0000 | 380.0000 | 27.360,00 | `prep-02` |
| `d5-13` | Soja | L05 | 60.0000 | 400.0000 | 24.000,00 | `prep-02` |
| `d5-14` | Milho | L05 | 70.0000 | 350.0000 | 24.500,00 | `prep-02` |
| `d5-15` | Sorgo | L05 | 74.0000 | 380.0000 | 28.120,00 | `prep-02` |
| **Subtotal `prep-02`** | | | **551.0000** | | **207.250,00** | |
| **TOTAL GERAL (15 itens)** | | | **910.0000** | | **342.000,00** | |

Ajustes nos totais de `demo-05`:
- `pesoLiquido`: `'910000.000'` (910 toneladas)
- `pesoBruto`: `'928000.000'`
- `valorProdutos`: `'342000.00'`
- `valorTotalNota`: `'342000.00'`

---

### 3.3 Estruturação de Anotações em `demo-04` (Inconsistências Fiscais)

O cenário `demo-04` deve alimentar diretamente o `ValidationPanel.jsx` da tela `/documentos/[id]/validacao`. As inconsistências são documentadas tanto nos itens quanto no cabeçalho com a taxonomia padronizada:
- **Item 3 (`d4-3`)**:
  `campo: 'cfop'`, `tipo: 'erro'`, `regra: 'CFOP_EXPORTACAO'`, `esperado: '7101'`, `encontrado: '5102'`, `mensagem: 'CFOP 5102 não permitido em operação para o exterior. CFOP deve iniciar com 7 (ex: 7101).'`.
- **Item 5 (`d4-5`)**:
  `campo: 'valorTotal'`, `tipo: 'erro'`, `regra: 'CALCULO_MATEMATICO'`, `esperado: '4500.00'`, `encontrado: '4000.00'`, `mensagem: 'Divergência matemática: 100 x 45,00 resulta em 4.500,00, mas valor total gravado é 4.000,00.'`.
- **Item 8 (`d4-8`)**:
  `campo: 'ncm'`, `tipo: 'erro'`, `regra: 'NCM_TAMANHO'`, `esperado: '64035910'`, `encontrado: '6403590'`, `mensagem: 'NCM inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos.'`.
- **Item 11 (`d4-11`)**:
  `campo: 'unidade'`, `tipo: 'aviso'`, `regra: 'UNIDADE_ADUANEIRA'`, `esperado: 'PAR'`, `encontrado: 'METROS'`, `mensagem: 'Unidade comercial METROS divergente da unidade padrão aduaneira PAR para calçados.'`.
- **Cabeçalho / Totais**:
  A soma dos itens gravados é `91.300,00`, enquanto o campo `totais.valorProdutos` registra `89.300,00` (divergência de cabeçalho de R$ 2.000,00), simulando falha de fechamento de lote fiscal.

---

## 4. Estratégia e Especificação de Código: `DataTable.jsx` Proteção de Resiliência

### 4.1 Diagnóstico do Bug
No arquivo `app/components/table/DataTable.jsx`:
```jsx
// Linha 29:
export default function DataTable({
  data = [], // <- Default do ES6 só se ativa se data === undefined! Se data === null, data permanece null!
  ...
}) {
  ...
  // Linha 171:
  Exibindo {filteredData.length} de {data.length} registros // <- LANÇA TypeError: null.length
```

### 4.2 Correção Proposta
Normalizar `safeData` no topo do componente:
```javascript
const safeData = Array.isArray(data) ? data : [];
```
E substituir todas as referências internas a `data` por `safeData`:
1. No `useMemo` de `filteredData`:
   ```javascript
   const filteredData = useMemo(() => {
     if (!filterText.trim()) return safeData;

     const term = filterText.toLowerCase().trim();
     return safeData.filter((item) => {
       if (!item || typeof item !== 'object') return false;
       return Object.values(item).some((val) => {
         if (val === null || val === undefined) return false;
         return String(val).toLowerCase().includes(term);
       });
     });
   }, [safeData, filterText]);
   ```
2. No `tfoot`:
   ```jsx
   <td colSpan={effectiveColumns.length || 1} className={cellPadding}>
     Exibindo {filteredData.length} de {safeData.length} registros
   </td>
   ```

Essa alteração torna o `DataTable` 100% imune a `data={null}`, `data={undefined}` ou dados ainda não resolvidos por repositórios assíncronos.

---

## 5. Estratégia da Suite de Testes do Milestone 2: `tests/tier1/m2_domain.test.mjs`

### 5.1 Arquitetura da Suite
Criar o arquivo `tests/tier1/m2_domain.test.mjs` utilizando exclusivamente a API nativa do Node 24 (`node:test` + `node:assert/strict`).

A suite será estruturada em 6 blocos descritivos (`describe`):
1. **M2 Formatters: Moeda BRL (`currency.js`)**
   - Suporte bidirecional para formato BR (`1.250,50`) e formato standard (`1250.50`).
   - Negativos, prefixo `R$`, zeros e entradas inválidas.
2. **M2 Formatters: Datas Seguras sem Rollover (`dates.js`)**
   - Formatos ISO válidos DD/MM/AAAA.
   - Rejeição estrita de dias e meses inválidos (`2026-99-99`, `2026-02-31`, anos não bissextos) retornando `"-"`.
   - Ausência absoluta de `moment` ou `date-fns`.
3. **M2 Formatters: Quantidades e Decimais (`numbers.js`)**
   - `formatQuantity` com até 4 casas decimais e inteiros limpos.
   - `formatDecimal` com 2 casas e separador de milhar.
   - `parseDecimal` resiliente.
4. **M2 Mocks: Integridade Matemática dos 5 Cenários (`mockInvoices.js`)**
   - `demo-01`: 8 itens, totais consistentes.
   - `demo-02`: 25 itens com `quantidade * valorUnitario === valorTotal` em 100% dos itens (0 erros) e soma igual a 148.750,00.
   - `demo-03`: 50 itens íntegros.
   - `demo-04`: presença das 4 inconsistências simuladas (CFOP 5102, NCM 7 dígitos, divergência matemática, unidade METROS).
   - `demo-05`: item 15 com `74 * 380 = 28.120,00` e soma dos 15 itens igual a exatamente `342.000,00`.
   - Consistência com notas preparadas (`prep-01` 134.750,00 + `prep-02` 207.250,00 = 342.000,00).
5. **M2 Components: DataTable Resiliência**
   - Renderização sem quebra quando `data={null}`.
   - Renderização limpa quando `data={undefined}` ou `data={[]}`.
6. **M2 Calculations & Repositories Smoke Check**
   - Verificação de contrato das engines de cálculo (`decimal.js`, `invoiceTotals.js`, `divisionMath.js`).
   - Verificação de contrato do `localStorageService` e `invoiceRepository`.

---

## 6. Alinhamento Crítico com a Suite Adversarial M1

### Achado de Investigação
No arquivo `tests/tier5/m1_adversarial_stress.test.mjs`, o Challenger M1 havia escrito asserções que comprovavam os bugs:
- **Linha 144**: `assert.strictEqual(parsedDotDecimal, 125050)` (atestava o bug de `parseBRL('1250.50')`).
- **Linha 500**: `assert.ok(threwError)` (atestava o bug do `DataTable` com `data={null}`).
- **Linha 590**: `assert.strictEqual(unitQtyMismatches, 25)` (atestava o bug matemático dos 25 itens de `demo-02`).
- **Linha 665**: `assert.strictEqual(item15.valorTotal, '28150.00')` (atestava a discrepância de 30 reais no item 15 de `demo-05`).

### Ação Recomendada para o Worker
Quando o `teamwork_worker` aplicar as correções no Milestone 2, deverá também atualizar essas 4 linhas de asserção em `tests/tier5/m1_adversarial_stress.test.mjs` para refletir o estado corrigido:
1. `parseBRL('1250.50')` deve validar `1250.5`.
2. `DataTable` com `data={null}` deve validar `assert.doesNotThrow(...)`.
3. `unitQtyMismatches` em `demo-02` deve validar `assert.strictEqual(unitQtyMismatches, 0)`.
4. `item15.valorTotal` em `demo-05` deve validar `'28120.00'`.

Dessa forma, o comando global `node --no-warnings --test tests/**/*.test.mjs` passará com **100% de sucesso em todos os tiers**.

---

## 7. Próximos Passos e Verificação

1. **Implementador**:
   - Criar `app/lib/formatters/numbers.js`.
   - Modificar `app/lib/formatters/currency.js` (`parseBRL`).
   - Modificar `app/lib/formatters/dates.js` (`formatDateBR` e `formatDateTimeBR`).
   - Atualizar `app/lib/data/mockInvoices.js` (`demo-02`, `demo-05`, `demo-04`).
   - Atualizar `app/components/table/DataTable.jsx` (`safeData`).
   - Criar `tests/tier1/m2_domain.test.mjs`.
   - Atualizar as 4 asserções de snapshot de bug em `tests/tier5/m1_adversarial_stress.test.mjs`.
2. **Comando de Teste**:
   `node --no-warnings --test tests/tier1/m2_domain.test.mjs`
   `node --no-warnings --test tests/**/*.test.mjs`
3. **Restrição Mantida**: Zero execuções de `pnpm dev` ou `pnpm build`. Servidor em `http://localhost:3000/dashboard` segue preservado.
