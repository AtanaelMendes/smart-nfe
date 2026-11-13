# Relatório Técnico de Investigação e Design Arquitetural — Explorer 2 (Milestone 1)

**Projeto**: SmartNFe — Export Preparation N:M & Unified Allocation Architecture  
**Data**: 2026-11-13  
**Branch de Trabalho**: `feature/preparacoes-unificadas`  
**Escopo**:  
1. Diagnóstico e Correção da Vulnerabilidade de Vazamento de Dados em `preparedInvoiceRepository.js` (`sessionPreparedInvoices = new Map()`)  
2. Arquitetura e Especificação Completa do Novo Repositório de Preparações (`preparationRepository.js`)

---

## 1. Resumo Executivo

O SmartNFe estabelece como princípio de integridade e segurança fiscal que **documentos reais importados via XML e suas derivações (preparações, lotes e desmembramentos) devem residir estritamente em memória volátil de sessão**, jamais sendo persistidos no `localStorage` do navegador.

A investigação constatou:
1. **Vulnerabilidade Crítica de Privacidade Fiscal**: Em `app/features/preparedInvoiceRepository.js`, todas as notas preparadas geradas na divisão de notas (`/documentos/[id]/divisao/page.jsx`) são salvas incondicionalmente no `localStorageService` (`STORAGE_KEYS.PREPARED_INVOICES`). Isso significa que quando um usuário importa um XML real confidencial (que reside com segurança em `sessionInvoices`), a divisão dessa nota vaza os produtos, preços, emitente e dados fiscais diretamente para o `localStorage` do navegador.
2. **Repositório de Preparações Inexistente**: O requisito R3 e R4 exige o gerenciamento de preparações $N \text{ origens} \to M \text{ destinos}$, controle de rascunhos, ciclo de vida e apuração das alocações ativas em tempo real (`disponível = original - soma(alocações ativas)`). O arquivo `app/features/preparationRepository.js` ainda não existe.

Apresentamos a solução completa:
- O blueprint com código pronto para `app/features/preparedInvoiceRepository.js`, espelhando o padrão dual-storage de `invoiceRepository.js` com `sessionPreparedInvoices = new Map()`.
- A implementação completa e especificação de `app/features/preparationRepository.js`, integrando serialização atômica (`withMutationLock`), precisão decimal BigInt (`decimal.js`), gerenciamento de rascunhos e o extrator de alocações ativas (`getActiveAllocations`).

---

## 2. Investigação do Vazamento de Armazenamento em `preparedInvoiceRepository.js`

### 2.1 Como o `localStorage` é atualmente utilizado

No arquivo `app/features/preparedInvoiceRepository.js`:
- Linhas 15-18 registram o mock padrão no `localStorageService`:
  ```javascript
  localStorageService.registerDefault(
    STORAGE_KEYS.PREPARED_INVOICES,
    () => getMockPreparedInvoices()
  );
  ```
- As funções internas de leitura e escrita operam de forma cega sobre o storage persistente:
  ```javascript
  // Linhas 55-63
  async function getAllPrepared() {
    const loaded = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, null);
    if (Array.isArray(loaded)) return loaded;
    const initial = getMockPreparedInvoices();
    localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, initial);
    return initial;
  }

  // Linhas 68-70
  async function saveAllPrepared(list) {
    localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, list);
  }
  ```
- O método `create(preparedInvoice)` (linhas 126-148) adiciona a nova nota preparada ao array e invoca `saveAllPrepared(updated)`.
- **Onde ocorre o vazamento**: Em `app/documentos/[id]/divisao/page.jsx:484`, ao concluir a divisão de uma NF-e, o componente chama `preparedInvoiceRepository.create(...)`. Se a NF-e original tiver sido importada de um arquivo XML real (onde `invoiceRepository.sessionInvoices.has(invoice.id) === true`), a nota preparada resultante — contendo toda a lista de itens reais, quantidades, preços unitários, CNPJ do emitente e destinatário — é **gravada em texto claro no `localStorage`**.
- **Impactos**:
  - Violação do sigilo fiscal e da LGPD (dados confidenciais de transações comerciais persistem na máquina local).
  - Possibilidade de estouro de quota do `localStorage` (típico limite de 5MB do navegador) ao dividir XMLs com dezenas de itens.
  - Sobrevivência indevida dos dados fiscais reais após o fechamento da aba ou reinício do navegador.

### 2.2 Como `invoiceRepository.js` implementa o Isolamento de Sessão Volátil

O arquivo `app/features/invoiceRepository.js` estabelece a referência arquitetural correta do projeto:
1. **Coleção Volátil em Memória**:
   ```javascript
   export const sessionInvoices = new Map();
   ```
2. **Detecção de Documento Real**:
   ```javascript
   const isReal = invoiceData.isRealImport === true || invoiceData.isDemo === false;
   ```
3. **Persistência Segregada no `create()`**:
   - Se `isReal === true`:
     ```javascript
     sessionInvoices.set(newDoc.id, deepClone(newDoc));
     return deepClone(newDoc);
     ```
     `saveAllInvoices()` **nunca é chamado**. O `localStorage` permanece 100% intocado.
   - Se `isReal === false`: grava em `localStorageService` sob `STORAGE_KEYS.INVOICES`.
4. **Listagem Unificada (`list()`)**:
   - Mescla `sessionDocs = Array.from(sessionInvoices.values())` com `uniquePersisted` (itens do `localStorage` que não estejam na sessão).
   - Documentos da sessão volátil são posicionados no topo.
5. **Busca e Mutações (`findById`, `update`, `delete`)**:
   - Consultam e manipulam primeiramente o mapa em memória (`sessionInvoices.has(id)`).
   - Só recorrem ao `localStorageService` para documentos de demonstração.
6. **Utilitários de Ciclo de Vida**:
   - `clearSession()` para zerar a memória volátil.
   - `isSessionInvoice(id)` para verificar o escopo de um documento.
   - `resetDemoData()` restaura apenas os mocks de demonstração sem apagar os documentos de sessão.

### 2.3 Solução Proposta para `preparedInvoiceRepository.js`

Introduzimos `export const sessionPreparedInvoices = new Map()` com detecção automática de proveniência:
1. **Detecção Inteligente de Origem**:
   A nota preparada é classificada como real se:
   - Apresentar flag explícita `isRealImport: true` ou `isDemo: false`.
   - OU seu `parentInvoiceId` ou `documentoOrigemId` estiver registrado em `sessionInvoices`.
   - OU qualquer ID listado em `sourceInvoiceIds` ou `origens` estiver em `sessionInvoices`.
   - OU qualquer item em `itens` possuir `sourceInvoiceId` presente em `sessionInvoices`.
2. **Preservação de Retrocompatibilidade**:
   - As notas de demonstração (`demo-01` a `demo-05`) e preparações legadas de mock continuam sendo salvas e lidas do `localStorageService`.
   - O filtro `parentInvoiceId` em `list()` passa a suportar tanto `p.parentInvoiceId === filters.parentInvoiceId` quanto `p.sourceInvoiceIds?.includes(filters.parentInvoiceId)` e `p.documentoOrigemId === filters.parentInvoiceId`.
   - O método `resetDemoData()` zera `sessionPreparedInvoices.clear()` para garantir isolamento em suítes de testes automatizados e resets do usuário.

---

## 3. Código Proposto: `app/features/preparedInvoiceRepository.js`

```javascript
/**
 * SmartNFe — Repositório Assíncrono de Notas Fiscais Preparadas
 *
 * Características:
 * - Gerencia notas resultantes de desmembramento, divisão e preparação de exportação (1->M e N->M)
 * - Isolamento de Sessão: Notas derivadas de XMLs reais são mantidas exclusivamente
 *   em memória volátil (sessionPreparedInvoices = new Map()), SEM persistência em localStorage
 * - Persistência versionada via localStorageService apenas para cenários de demonstração (demo-01 a demo-05)
 * - Geração automática de identificadores e datas ISO
 * - Suporte a filtros por NF original (parentInvoiceId / sourceInvoiceIds), status e busca textual
 * - Fila de mutação assíncrona serializada com autocura de falhas (withMutationLock)
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { getMockPreparedInvoices } from '../lib/data/mockInvoices.js';
import { sessionInvoices } from './invoiceRepository.js';

// Registro automático da fábrica de mocks para autorrecuperação e reset
localStorageService.registerDefault(
  STORAGE_KEYS.PREPARED_INVOICES,
  () => getMockPreparedInvoices()
);

// ============================================================================
// Coleção Volátil em Memória de Sessão (Isolamento Fiscal / R4 e R5)
// ============================================================================
export const sessionPreparedInvoices = new Map();

// ============================================================================
// Mutex Queue para Serialização de Mutações Concorrentes
// ============================================================================
let preparedMutationQueue = Promise.resolve();

/**
 * Enfileira uma mutação assíncrona para garantir execução serializada e atômica.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withMutationLock(fn) {
  const resultPromise = preparedMutationQueue.then(
    () => fn(),
    () => fn()
  );
  preparedMutationQueue = resultPromise.catch(() => {});
  return resultPromise;
}

/**
 * Clona profundamente um valor para evitar vazamentos de referência.
 */
function deepClone(value) {
  if (value === undefined || value === null) return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

/**
 * Determina se a nota preparada origina-se de documento fiscal real (sessão volátil).
 * @param {Object} doc
 * @returns {boolean}
 */
function isRealPreparedInvoice(doc) {
  if (!doc) return false;
  // 1. Flags explícitas
  if (doc.isRealImport === true) return true;
  if (doc.isDemo === false) return true;

  // 2. Verificação de ID da nota pai / origem contra sessionInvoices
  if (doc.parentInvoiceId && sessionInvoices.has(doc.parentInvoiceId)) return true;
  if (doc.documentoOrigemId && sessionInvoices.has(doc.documentoOrigemId)) return true;

  // 3. Verificação de array de origens múltiplas (N origens)
  if (Array.isArray(doc.sourceInvoiceIds) && doc.sourceInvoiceIds.some((id) => sessionInvoices.has(id))) {
    return true;
  }
  if (Array.isArray(doc.origens) && doc.origens.some((o) => sessionInvoices.has(o.invoiceId || o.id))) {
    return true;
  }

  // 4. Verificação de itens individuais
  if (Array.isArray(doc.itens) && doc.itens.some((it) => it.sourceInvoiceId && sessionInvoices.has(it.sourceInvoiceId))) {
    return true;
  }

  return false;
}

/**
 * Obtém todas as notas preparadas salvas no storage persistente.
 */
async function getAllPrepared() {
  const loaded = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, null);
  if (Array.isArray(loaded)) {
    return loaded;
  }
  const initial = getMockPreparedInvoices();
  localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, initial);
  return initial;
}

/**
 * Salva a lista de notas preparadas no storage persistente.
 */
async function saveAllPrepared(list) {
  localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, list);
}

export const preparedInvoiceRepository = {
  /**
   * Lista notas preparadas com filtros opcionais.
   * Mescla notas em sessão no topo com as notas persistidas no LocalStorage.
   * @param {Object} filters
   * @param {string} [filters.query] Busca textual (número, destinatário, lote)
   * @param {string} [filters.parentInvoiceId] Filtro por NF original
   * @param {string} [filters.status] Filtro por status
   * @returns {Promise<Array<Object>>}
   */
  async list(filters = {}) {
    const persisted = await getAllPrepared();
    const sessionDocs = Array.from(sessionPreparedInvoices.values());

    const sessionIds = new Set(sessionDocs.map((doc) => doc.id));
    const uniquePersisted = persisted.filter((doc) => !sessionIds.has(doc.id));

    let list = [...sessionDocs, ...uniquePersisted];

    // 1. Busca textual abrangente
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter((p) => {
        const num = String(p.numero || '').toLowerCase();
        const origem = String(p.origemNumero || p.numeroOrigem || '').toLowerCase();
        const dest = String(p.destinatario?.nome || '').toLowerCase();
        const desc = String(p.descricaoLote || p.nomePreparacao || '').toLowerCase();
        return num.includes(q) || origem.includes(q) || dest.includes(q) || desc.includes(q);
      });
    }

    // 2. Filtro por NF de origem (compatível com 1->M e N->M)
    if (filters.parentInvoiceId) {
      list = list.filter((p) => {
        if (p.parentInvoiceId === filters.parentInvoiceId) return true;
        if (p.documentoOrigemId === filters.parentInvoiceId) return true;
        if (Array.isArray(p.sourceInvoiceIds) && p.sourceInvoiceIds.includes(filters.parentInvoiceId)) return true;
        if (Array.isArray(p.origens) && p.origens.some((o) => (o.invoiceId || o.id) === filters.parentInvoiceId)) return true;
        return false;
      });
    }

    // 3. Filtro por status
    if (filters.status && filters.status !== 'todos' && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    }

    return deepClone(list);
  },

  /**
   * Busca nota preparada por ID.
   * Consulta a sessão em memória antes de recorrer ao storage persistente.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;

    if (sessionPreparedInvoices.has(id)) {
      return deepClone(sessionPreparedInvoices.get(id));
    }

    const list = await getAllPrepared();
    const found = list.find((p) => p.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Cadastra uma nova nota preparada.
   * Se for derivada de documento real, armazena estritamente em memória volátil.
   * @param {Object} preparedInvoice Dados da nota preparada
   * @returns {Promise<Object>}
   */
  async create(preparedInvoice) {
    return withMutationLock(async () => {
      if (!preparedInvoice) {
        throw new Error('Dados da nota preparada são obrigatórios');
      }

      const isReal = isRealPreparedInvoice(preparedInvoice);
      const id =
        preparedInvoice.id ||
        `prep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newEntry = {
        ...preparedInvoice,
        id,
        status: preparedInvoice.status || 'preparado',
        isDemo: isReal ? false : (preparedInvoice.isDemo ?? true),
        isRealImport: isReal,
        dataCriacao: preparedInvoice.dataCriacao || new Date().toISOString(),
      };

      if (isReal) {
        // Armazenamento EXCLUSIVO em memória de sessão temporária
        sessionPreparedInvoices.set(newEntry.id, deepClone(newEntry));
        return deepClone(newEntry);
      }

      // Fluxo para demonstrações e mocks
      const list = await getAllPrepared();
      const updated = [newEntry, ...list];
      await saveAllPrepared(updated);
      return deepClone(newEntry);
    });
  },

  /**
   * Remove uma nota preparada pelo ID (da sessão ou do localStorage).
   * @param {string} id
   * @returns {Promise<boolean>} true se foi removida, false se não encontrada
   */
  async delete(id) {
    return withMutationLock(async () => {
      if (!id) return false;

      if (sessionPreparedInvoices.has(id)) {
        sessionPreparedInvoices.delete(id);
        return true;
      }

      const list = await getAllPrepared();
      const filtered = list.filter((p) => p.id !== id);
      const wasRemoved = filtered.length !== list.length;
      if (wasRemoved) {
        await saveAllPrepared(filtered);
      }
      return wasRemoved;
    });
  },

  /**
   * Atualiza dados parciais de uma nota preparada.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>}
   */
  async update(id, partialData) {
    return withMutationLock(async () => {
      if (sessionPreparedInvoices.has(id)) {
        const existing = sessionPreparedInvoices.get(id);
        const updated = {
          ...existing,
          ...partialData,
          id: existing.id,
          atualizadoEm: new Date().toISOString(),
        };
        sessionPreparedInvoices.set(id, deepClone(updated));
        return deepClone(updated);
      }

      const list = await getAllPrepared();
      const index = list.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Nota preparada não encontrada: ${id}`);
      }

      const updated = {
        ...list[index],
        ...partialData,
        id: list[index].id,
        atualizadoEm: new Date().toISOString(),
      };

      list[index] = updated;
      await saveAllPrepared(list);
      return deepClone(updated);
    });
  },

  /**
   * Limpa a memória volátil de sessão.
   */
  clearSession() {
    sessionPreparedInvoices.clear();
  },

  /**
   * Retorna a quantidade de notas preparadas na sessão volátil.
   */
  getSessionCount() {
    return sessionPreparedInvoices.size;
  },

  /**
   * Verifica se uma nota preparada reside na sessão volátil.
   * @param {string} id
   * @returns {boolean}
   */
  isSessionPreparedInvoice(id) {
    return sessionPreparedInvoices.has(id);
  },

  /**
   * Restaura as notas preparadas de fábrica.
   * Limpa a sessão em memória e restaura o storage persistente.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    return withMutationLock(async () => {
      sessionPreparedInvoices.clear();
      localStorageService.reset(STORAGE_KEYS.PREPARED_INVOICES);
    });
  },
};

export default preparedInvoiceRepository;
```

---

## 4. Design e Implementação de `app/features/preparationRepository.js`

### 4.1 O Modelo de Domínio da Preparação (`Preparation`)

Uma "Preparação" representa uma operação fiscal completa de composição de exportação, podendo configurar:
- **Agrupamento ($N \to 1$)**: Múltiplas notas de fornecedores compondo 1 nota de exportação.
- **Divisão ($1 \to M$)**: Uma única nota de fornecedor distribuída em vários lotes/contêineres de exportação.
- **Preparação Mista ($N \to M$)**: $N$ notas fiscais de fornecedores distribuídas livremente entre $M$ destinos.

```typescript
interface Preparation {
  id: string;                      // ex: "prep-20261113-a8f2"
  numero: string;                  // ex: "PREP-2026-0001"
  titulo: string;                  // ex: "Exportação Grãos Safra 2026 - Roterdã"
  tipo: 'agrupamento' | 'divisao' | 'mista';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  isRealImport: boolean;           // true se alguma origem for real
  isDemo: boolean;
  clienteExportacao?: {
    id: string;
    nome: string;
    pais: string;
    paisCodigo: string;
  };
  origens: Array<{
    invoiceId: string;
    numero: string;
    serie?: string;
    chaveAcesso?: string;
    emitente: { razaoSocial: string; cnpj: string; uf?: string };
    totais?: Record<string, string>;
  }>;
  destinos: Array<{
    id: string;                    // ex: "dest-1"
    numero?: string;               // ex: "EXP-2026-001-A"
    nome: string;                  // ex: "Lote Principal Roterdã"
    destinatario?: { nome: string; pais: string; paisCodigo?: string; cnpj?: string };
    observacoes?: string;
    totais?: Record<string, string>;
    allocations?: Record<string, string>; // { [sourceKey]: "300.0000" }
  }>;
  alocacoes: Record<string, string>; // { [`${sourceInvoiceId}__${sourceItemId}__${destId}`]: "300.0000" }
  totais?: {
    totalOrigens: number;
    totalDestinos: number;
    totalItensOrigem: number;
    totalItensAlocados: number;
    quantidadeTotalAlocada: string;
    valorTotalProdutos: string;
    valorTotalPreparacao: string;
  };
  criadoEm: string;                // ISO
  atualizadoEm: string;            // ISO
}
```

### 4.2 Máquina de Estados e Ciclo de Vida da Preparação

| Status | Sinônimos Aceitos | Significado | Reserva de Saldo em `getActiveAllocations`? |
|---|---|---|---|
| `'draft'` | `'rascunho'` | Preparação em edição/configuração pelo despachante. | **Sim** (por padrão `includeDrafts: true`, liberável com `includeDrafts: false`). |
| `'active'` | `'ativa'` | Preparação aprovada e ativa, reservando mercadorias. | **Sim** (reserva firme de estoque). |
| `'completed'` | `'concluida'`, `'concluido'` | Preparação faturada/concluída. Mercadorias consumidas. | **Sim** (saldo consumido permanentemente). |
| `'cancelled'` | `'cancelada'`, `'cancelado'` | Preparação cancelada/estornada. | **Não** (saldos são imediatamente devolvidos às origens). |

### 4.3 O Algoritmo de Extração de Alocações Ativas (`getActiveAllocations`)

O cálculo do saldo disponível em tempo real exige deduzir todas as quantidades já comprometidas:
$$\text{Saldo Disponível}(s, i) = \text{Quantidade Original}(s, i) - \sum_{p \in \text{Preparações Válidas}} \text{Alocação}_p(s, i)$$

**Regras do Extrator**:
1. **Exclusão da Preparação Corrente**: O parâmetro `excludePreparationId` ignora a própria preparação sendo editada, permitindo que o usuário altere alocações sem subtrair seu próprio saldo anterior.
2. **Exclusão de Canceladas**: Preparações com `status === 'cancelled'` ou `'cancelada'` são desconsideradas.
3. **Múltiplos Formatos de Alocação Suportados**:
   - `prep.alocacoes`: chaves `${sourceInvoiceId}__${sourceItemId}__${destinationId}` ou `${sourceInvoiceId}__${sourceItemId}`.
   - `dest.allocations` dentro de `prep.destinos[]`.
   - `dest.itens` ou `prep.itens` com atributos `sourceInvoiceId` e `sourceItemId`.
4. **Aritmética BigInt Pura**:
   - As quantidades são acumuladas via `decimalAdd(currentSum, cleanQty, 4)` de `app/lib/calculations/decimal.js`.
   - **Zero floating-point IEEE-754**.
5. **Retorno Polimórfico**:
   - Retorna uma instância de `Map` que possui os métodos padrão (`map.get(sourceKey)`, `map.has(sourceKey)`, `map.size`, `for (const [k, v] of map)`), além de um método `.toObject()` que retorna o objeto plano `{ [sourceKey]: "quantidade" }`.

---

## 5. Código Proposto: `app/features/preparationRepository.js`

```javascript
/**
 * SmartNFe — Repositório Assíncrono de Preparações de Exportação (N:M)
 *
 * Características:
 * - Gerencia o ciclo de vida completo de preparações (Agrupamento N->1, Divisão 1->M, Mista N->M)
 * - Dual-Storage: Isolamento estrito de sessão (sessionPreparations = new Map()) para origens reais
 *   e persistência versionada via localStorageService (STORAGE_KEYS.PREPARATIONS) para demonstrações
 * - Controle de concorrência com fila atômica serializada (withMutationLock) e autocura de falhas
 * - Gestão de rascunhos (drafts) e máquina de estados ('draft' | 'active' | 'completed' | 'cancelled')
 * - Extrator de alocações ativas (getActiveAllocations) com precisão decimal BigInt (decimal.js)
 *   para garantia da regra estrita de conservação: disponível = original - soma(alocações ativas)
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { cleanDecimalString, decimalAdd, roundDecimal } from '../lib/calculations/decimal.js';
import { sessionInvoices } from './invoiceRepository.js';

const STORAGE_KEY_PREPARATIONS = STORAGE_KEYS.PREPARATIONS || 'smartnfe_preparations';

// Registro automático de fábrica no localStorageService
localStorageService.registerDefault(STORAGE_KEY_PREPARATIONS, () => []);

// ============================================================================
// Coleção Volátil em Memória de Sessão (Isolamento Fiscal / R3, R4 e R5)
// ============================================================================
export const sessionPreparations = new Map();

// ============================================================================
// Mutex Queue para Serialização de Mutações Concorrentes
// ============================================================================
let preparationMutationQueue = Promise.resolve();

/**
 * Enfileira uma mutação assíncrona garantindo execução atômica serializada.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withMutationLock(fn) {
  const resultPromise = preparationMutationQueue.then(
    () => fn(),
    () => fn()
  );
  preparationMutationQueue = resultPromise.catch(() => {});
  return resultPromise;
}

/**
 * Clona profundamente um valor para evitar efeitos colaterais de mutação externa.
 */
function deepClone(value) {
  if (value === undefined || value === null) return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

/**
 * Normaliza o status para padrão canônico minúsculo.
 * @param {string} status
 * @returns {'draft'|'active'|'completed'|'cancelled'}
 */
export function normalizePreparationStatus(status) {
  if (!status) return 'draft';
  const s = String(status).trim().toLowerCase();
  if (s === 'rascunho' || s === 'draft') return 'draft';
  if (s === 'ativa' || s === 'active') return 'active';
  if (s === 'concluida' || s === 'concluido' || s === 'concluído' || s === 'completed') return 'completed';
  if (s === 'cancelada' || s === 'cancelado' || s === 'cancelled' || s === 'canceled') return 'cancelled';
  return s;
}

/**
 * Determina se a preparação envolve qualquer documento fiscal real em memória volátil.
 * @param {Object} prep
 * @returns {boolean}
 */
function isRealPreparation(prep) {
  if (!prep) return false;
  if (prep.isRealImport === true) return true;
  if (prep.isDemo === false) return true;

  // 1. Origens declaradas
  if (Array.isArray(prep.origens)) {
    for (const orig of prep.origens) {
      const origId = orig.invoiceId || orig.id;
      if (origId && sessionInvoices.has(origId)) return true;
      if (orig.isRealImport === true || orig.isDemo === false) return true;
    }
  }

  // 2. Chaves de origens múltiplas
  if (Array.isArray(prep.sourceInvoiceIds)) {
    if (prep.sourceInvoiceIds.some((id) => sessionInvoices.has(id))) return true;
  }

  // 3. Nota pai individual
  if (prep.parentInvoiceId && sessionInvoices.has(prep.parentInvoiceId)) return true;

  // 4. Itens individuais com chave de origem
  if (Array.isArray(prep.itens)) {
    if (prep.itens.some((it) => it.sourceInvoiceId && sessionInvoices.has(it.sourceInvoiceId))) return true;
  }

  return false;
}

/**
 * Obtém todas as preparações salvas no storage persistente.
 */
async function getAllPersistedPreparations() {
  const loaded = localStorageService.load(STORAGE_KEY_PREPARATIONS, null);
  if (Array.isArray(loaded)) return loaded;
  localStorageService.save(STORAGE_KEY_PREPARATIONS, []);
  return [];
}

/**
 * Salva a lista de preparações no storage persistente.
 */
async function saveAllPersistedPreparations(list) {
  localStorageService.save(STORAGE_KEY_PREPARATIONS, list);
}

export const preparationRepository = {
  /**
   * Lista preparações com filtros opcionais.
   * Mescla a sessão volátil em memória no topo com as preparações do LocalStorage.
   * @param {Object} filters
   * @param {string|string[]} [filters.status] Filtro de status ('draft', 'active', 'completed', 'cancelled', 'todos')
   * @param {string} [filters.type] Filtro de tipo ('agrupamento', 'divisao', 'mista')
   * @param {string} [filters.query] Busca textual (número, título, cliente de exportação)
   * @param {string} [filters.clienteExportacaoId] Filtro por ID do cliente de exportação
   * @returns {Promise<Array<Object>>}
   */
  async list(filters = {}) {
    const persisted = await getAllPersistedPreparations();
    const sessionDocs = Array.from(sessionPreparations.values());

    const sessionIds = new Set(sessionDocs.map((doc) => doc.id));
    const uniquePersisted = persisted.filter((doc) => !sessionIds.has(doc.id));

    let list = [...sessionDocs, ...uniquePersisted];

    // 1. Filtro por status
    const statusFilter = filters.status;
    if (statusFilter && statusFilter !== 'todos' && statusFilter !== 'all' && statusFilter !== 'ALL') {
      const allowed = Array.isArray(statusFilter)
        ? statusFilter.map(normalizePreparationStatus)
        : [normalizePreparationStatus(statusFilter)];

      list = list.filter((p) => allowed.includes(normalizePreparationStatus(p.status)));
    }

    // 2. Filtro por tipo
    const typeFilter = filters.type || filters.tipo;
    if (typeFilter && typeFilter !== 'todos' && typeFilter !== 'all') {
      const targetType = String(typeFilter).toLowerCase();
      list = list.filter((p) => String(p.tipo || '').toLowerCase() === targetType);
    }

    // 3. Filtro por cliente de exportação atribuído
    if (filters.clienteExportacaoId) {
      list = list.filter((p) => p.clienteExportacao?.id === filters.clienteExportacaoId);
    }

    // 4. Busca textual
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter((p) => {
        const num = String(p.numero || '').toLowerCase();
        const tit = String(p.titulo || '').toLowerCase();
        const cli = String(p.clienteExportacao?.nome || '').toLowerCase();
        const obs = String(p.observacoes || '').toLowerCase();
        const destMatch = Array.isArray(p.destinos) && p.destinos.some((d) => String(d.nome || '').toLowerCase().includes(q));
        const origMatch = Array.isArray(p.origens) && p.origens.some((o) => String(o.numero || '').toLowerCase().includes(q));
        return num.includes(q) || tit.includes(q) || cli.includes(q) || obs.includes(q) || destMatch || origMatch;
      });
    }

    return deepClone(list);
  },

  /**
   * Busca preparação por ID.
   * Consulta primeiro a sessão volátil em memória e, em seguida, o LocalStorage.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;

    if (sessionPreparations.has(id)) {
      return deepClone(sessionPreparations.get(id));
    }

    const list = await getAllPersistedPreparations();
    const found = list.find((p) => p.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Cria uma nova preparação ou rascunho.
   * Se envolver documentos reais de XML, salva exclusivamente na sessão volátil.
   * @param {Object} preparationData
   * @returns {Promise<Object>}
   */
  async create(preparationData) {
    return withMutationLock(async () => {
      if (!preparationData) {
        throw new Error('Dados da preparação são obrigatórios');
      }

      const isReal = isRealPreparation(preparationData);
      const id =
        preparationData.id ||
        `prep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const numero =
        preparationData.numero ||
        `PREP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      const status = normalizePreparationStatus(preparationData.status || 'draft');

      const newEntry = {
        ...preparationData,
        id,
        numero,
        titulo: preparationData.titulo || `Preparação ${numero}`,
        tipo: preparationData.tipo || 'mista',
        status,
        isDemo: isReal ? false : (preparationData.isDemo ?? true),
        isRealImport: isReal,
        origens: Array.isArray(preparationData.origens) ? preparationData.origens : [],
        destinos: Array.isArray(preparationData.destinos) ? preparationData.destinos : [],
        alocacoes: preparationData.alocacoes || preparationData.allocations || {},
        criadoEm: preparationData.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      if (isReal) {
        sessionPreparations.set(newEntry.id, deepClone(newEntry));
        return deepClone(newEntry);
      }

      const list = await getAllPersistedPreparations();
      const updated = [newEntry, ...list];
      await saveAllPersistedPreparations(updated);
      return deepClone(newEntry);
    });
  },

  /**
   * Atualiza dados parciais de uma preparação existente.
   * Preserva a segregação de armazenamento e atualiza o timestamp atualizadoEm.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>}
   */
  async update(id, partialData) {
    return withMutationLock(async () => {
      if (!id) {
        throw new Error('ID da preparação é obrigatório para atualização');
      }

      const status = partialData.status ? normalizePreparationStatus(partialData.status) : undefined;

      // 1. Caso resida na sessão volátil
      if (sessionPreparations.has(id)) {
        const existing = sessionPreparations.get(id);
        const updated = {
          ...existing,
          ...partialData,
          ...(status ? { status } : {}),
          id: existing.id,
          atualizadoEm: new Date().toISOString(),
        };
        sessionPreparations.set(id, deepClone(updated));
        return deepClone(updated);
      }

      // 2. Caso seja persistida no LocalStorage
      const list = await getAllPersistedPreparations();
      const index = list.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Preparação não encontrada: ${id}`);
      }

      const existing = list[index];
      const updated = {
        ...existing,
        ...partialData,
        ...(status ? { status } : {}),
        id: existing.id,
        atualizadoEm: new Date().toISOString(),
      };

      list[index] = updated;
      await saveAllPersistedPreparations(list);
      return deepClone(updated);
    });
  },

  /**
   * Exclui uma preparação pelo ID (da sessão ou do LocalStorage).
   * Libera imediatamente as alocações vinculadas.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return withMutationLock(async () => {
      if (!id) return false;

      if (sessionPreparations.has(id)) {
        sessionPreparations.delete(id);
        return true;
      }

      const list = await getAllPersistedPreparations();
      const filtered = list.filter((p) => p.id !== id);
      const wasRemoved = filtered.length !== list.length;
      if (wasRemoved) {
        await saveAllPersistedPreparations(filtered);
      }
      return wasRemoved;
    });
  },

  /**
   * Extrai o mapa consolidado de alocações ativas em preparações válidas,
   * somando as quantidades comprometidas por chave `${sourceInvoiceId}__${sourceItemId}`.
   *
   * @param {string} [excludePreparationId] ID da preparação a ignorar (ex: edição atual)
   * @param {Object} [options]
   * @param {boolean} [options.includeDrafts=true] Se rascunhos devem reservar saldo
   * @returns {Promise<Map<string, string> & { toObject: () => Record<string, string> }>}
   */
  async getActiveAllocations(excludePreparationId = null, options = {}) {
    const includeDrafts = options.includeDrafts !== false;

    // Obtém todas as preparações existentes em sessão e persistentes
    const list = await this.list();
    const allocationsMap = new Map();

    /**
     * Soma com precisão decimal BigInt de 4 casas
     */
    function accumulate(sourceKey, rawQty) {
      if (!sourceKey || rawQty === undefined || rawQty === null) return;
      const clean = cleanDecimalString(rawQty);
      if (clean === '0' || clean === '0.0000') return;

      const current = allocationsMap.get(sourceKey) || '0.0000';
      const sum = decimalAdd(current, clean, 4);
      allocationsMap.set(sourceKey, sum);
    }

    for (const prep of list) {
      // 1. Ignora a preparação corrente sendo editada
      if (excludePreparationId && prep.id === excludePreparationId) {
        continue;
      }

      const st = normalizePreparationStatus(prep.status);

      // 2. Preparações canceladas NUNCA retêm alocações
      if (st === 'cancelled') {
        continue;
      }

      // 3. Rascunhos só retêm saldo se includeDrafts for true
      if (st === 'draft' && !includeDrafts) {
        continue;
      }

      // 4. Extração de prep.alocacoes ou prep.allocations (Record<chave, quantidade>)
      const alocObj = prep.alocacoes || prep.allocations;
      if (alocObj && typeof alocObj === 'object') {
        for (const [key, qty] of Object.entries(alocObj)) {
          const parts = key.split('__');
          // Formato: sourceInvoiceId__sourceItemId__destId OU sourceInvoiceId__sourceItemId
          const sourceKey = parts.length >= 2 ? `${parts[0]}__${parts[1]}` : key;
          accumulate(sourceKey, qty);
        }
      }

      // 5. Extração de destinos[].allocations
      if (Array.isArray(prep.destinos)) {
        for (const dest of prep.destinos) {
          const destAlloc = dest.allocations || dest.alocacoes;
          if (destAlloc && typeof destAlloc === 'object') {
            for (const [key, qty] of Object.entries(destAlloc)) {
              const parts = key.split('__');
              const sourceKey = parts.length >= 2 ? `${parts[0]}__${parts[1]}` : key;
              accumulate(sourceKey, qty);
            }
          }
          if (Array.isArray(dest.itens)) {
            for (const it of dest.itens) {
              const sInv = it.sourceInvoiceId;
              const sItm = it.sourceItemId || it.id;
              if (sInv && sItm) {
                accumulate(`${sInv}__${sItm}`, it.quantidade);
              }
            }
          }
        }
      }

      // 6. Extração de itens diretos
      if (Array.isArray(prep.itens)) {
        for (const it of prep.itens) {
          const sInv = it.sourceInvoiceId;
          const sItm = it.sourceItemId || it.id;
          if (sInv && sItm) {
            accumulate(`${sInv}__${sItm}`, it.quantidade);
          }
        }
      }
    }

    // Adiciona método ergonômico toObject() para interoperabilidade com objetos planos
    allocationsMap.toObject = function () {
      return Object.fromEntries(allocationsMap.entries());
    };

    return allocationsMap;
  },

  /**
   * Limpa a memória volátil de preparações.
   */
  clearSession() {
    sessionPreparations.clear();
  },

  /**
   * Retorna a contagem de preparações na sessão volátil.
   */
  getSessionCount() {
    return sessionPreparations.size;
  },

  /**
   * Verifica se uma preparação reside na sessão volátil.
   * @param {string} id
   * @returns {boolean}
   */
  isSessionPreparation(id) {
    return sessionPreparations.has(id);
  },

  /**
   * Restaura o repositório de preparações: limpa a memória volátil e reseta o LocalStorage.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    return withMutationLock(async () => {
      sessionPreparations.clear();
      localStorageService.reset(STORAGE_KEY_PREPARATIONS);
    });
  },
};

export default preparationRepository;
```

---

## 6. Alterações Complementares de Suporte

### 6.1 Atualização de `app/lib/storage/localStorageService.js`
Adicionar a chave `PREPARATIONS` em `STORAGE_KEYS`:
```javascript
export const STORAGE_KEYS = {
  INVOICES: 'smartnfe_invoices',
  PREPARED_INVOICES: 'smartnfe_prepared_invoices',
  SETTINGS: 'smartnfe_settings',
  DIVISIONS: 'smartnfe_divisions',
  PREPARATIONS: 'smartnfe_preparations', // <--- NOVA CHAVE
};
```

### 6.2 Atualização de `app/features/index.js`
Exportar o novo repositório:
```javascript
export * from './invoiceRepository.js';
export * from './preparedInvoiceRepository.js';
export * from './preparationRepository.js'; // <--- NOVO EXPORT
```

---

## 7. Estratégia de Verificação e Casos de Teste para o Worker

Propõe-se a criação da suíte `tests/tier1/m1_preparation_repository.test.mjs` com os seguintes testes:

1. **CRUD Básico & Mutações em LocalStorage (Demo Mode)**:
   - `create()` cadastra preparação mock e persiste em `STORAGE_KEYS.PREPARATIONS`.
   - `findById()` localiza pelo ID.
   - `update()` atualiza título, status e alocações serializadamente.
   - `delete()` remove com sucesso.
2. **Prova Empírica de Isolamento de Sessão Fiscal**:
   - Espionar `localStorageService.save`.
   - Criar uma NF-e real em `sessionInvoices.set('nfe-real-001', ...)`.
   - Criar uma preparação referenciando `origens: [{ invoiceId: 'nfe-real-001' }]`.
   - Assegurar que `sessionPreparations.has(prep.id) === true`.
   - Assegurar que `saveCalls.length === 0` (0 gravações no LocalStorage).
   - Assegurar que `localStorageService.load(STORAGE_KEYS.PREPARATIONS)` não contém a preparação real.
3. **Máquina de Estados e Normalização**:
   - Transições `'draft'` $\to$ `'active'` $\to$ `'completed'` $\to$ `'cancelled'`.
   - Suporte a sinônimos em português (`'rascunho'`, `'concluida'`, `'cancelada'`).
4. **Conservação e Cálculo de `getActiveAllocations`**:
   - Inserir Preparação 1 (Ativa) alocando 300.0000 do item `nfe-1__item-1`.
   - Inserir Preparação 2 (Rascunho) alocando 200.0000 do item `nfe-1__item-1`.
   - Inserir Preparação 3 (Cancelada) com 500.0000 do item `nfe-1__item-1`.
   - Chamar `getActiveAllocations()`:
     - Deve retornar exatamente `500.0000` (ignora cancelada, soma ativa + rascunho).
   - Chamar `getActiveAllocations(prep2.id)`:
     - Deve retornar exatamente `300.0000` (exclui a própria preparação sendo editada).
   - Chamar `getActiveAllocations(null, { includeDrafts: false })`:
     - Deve retornar exatamente `300.0000` (ignora rascunhos).
5. **Concorrência e Queue Healing**:
   - 10 criações simultâneas via `Promise.all` não geram lost updates.
   - Erros intencionais (`create(null)`) não quebram a fila de mutação.
