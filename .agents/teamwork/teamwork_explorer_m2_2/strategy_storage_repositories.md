# Estratégia Arquitetural e de Implementação: Persistência Local e Repositórios Assíncronos

**Projeto:** SmartNFe — Frontend MVP (Fase 1 com Dados Mockados)  
**Milestone:** M2 — Core Domain Services & Data Persistence  
**Autor:** Agente Explorador (`teamwork_explorer_m2_2`)  
**Data:** 04/11/2026  
**Status:** Concluído / Pronto para Implementação  

---

## 1. Visão Geral Executiva

O objetivo desta investigação é formular a arquitetura e a estratégia de código detalhada para a camada de **Persistência Local Versionada** e os **Repositórios Assíncronos** do SmartNFe:

1. **`app/lib/storage/localStorageService.js`**: Serviço central de armazenamento local encapsulado em envelope versionado (`STORAGE_SCHEMA_VERSION = "1.0.0"`), à prova de SSR (Next.js), modo anônimo de navegadores, quota esgotada, JSON corrompido e migração de schema com autorrecuperação dos mocks de fábrica.
2. **`app/features/invoiceRepository.js`**: Repositório assíncrono para os documentos fiscais (`demo-01` a `demo-05`), fornecendo interface Promises idêntica à de uma futura API REST backend, com recálculo integrado de totais ao editar itens, extração e verificação de regras fiscais (`getValidationIssues`) e restauração individual ou global dos dados de demonstração.
3. **`app/features/preparedInvoiceRepository.js`**: Repositório assíncrono para gestão das notas preparadas resultantes de desmembramentos e divisões de carga.

Esta arquitetura garante isolamento total da camada de interface gráfica (React 19 / Next.js 16 App Router) em relação ao backend, permitindo que as 8 telas do sistema operem de forma reativa, rápida e persistente no navegador.

---

## 2. Serviço de Armazenamento Local: `app/lib/storage/localStorageService.js`

### 2.1 Constantes e Envelope de Armazenamento

- **Versão do Esquema:**
  ```javascript
  export const STORAGE_SCHEMA_VERSION = '1.0.0';
  ```
- **Chaves de Armazenamento Padronizadas:**
  ```javascript
  export const STORAGE_KEYS = {
    INVOICES: 'smartnfe_invoices',
    PREPARED_INVOICES: 'smartnfe_prepared_invoices',
    SETTINGS: 'smartnfe_settings',
    DIVISIONS: 'smartnfe_divisions',
  };
  ```
- **Formato do Envelope Padronizado:**
  ```json
  {
    "version": "1.0.0",
    "timestamp": 1730733600000,
    "data": { ... }
  }
  ```

### 2.2 Matriz de Resiliência e Tratamento de Erros

| Cenário de Falha | Causa Raiz | Comportamento Implementado |
|---|---|---|
| **SSR / Next.js Server Components** | `typeof window === 'undefined'` e `localStorage` não acessível no Node | O serviço ativa um adaptador em memória (`Map`) transparente. Nenhuma exceção `ReferenceError` é disparada. |
| **Navegador em Modo Anônimo / Cookies Bloqueados** | Safari/Firefox/Chrome bloqueiam acesso ao `localStorage` lançando `SecurityError` ou `QuotaExceededError` | Na primeira tentativa de acesso, um teste de escrita/leitura (`probe`) detecta o bloqueio e migra a sessão para memória sem interromper a navegação da contadora. |
| **Quota Excedida (`QuotaExceededError`)** | Limite do navegador (~5MB) atingido por outros dados locais | Captura `DOMException` de quota, registra aviso em console, mantém os dados em memória RAM durante a sessão e retorna `false` sem quebrar o componente visual. |
| **JSON Corrompido (`SyntaxError`)** | Edição manual via DevTools ou escrita incompleta | O parser captura `SyntaxError`, registra o incidente e aciona a restauração automática do mock de fábrica registrado para aquela chave. |
| **Incompatibilidade de Versão de Schema** | Dados gravados com versão anterior (ex: `"0.9.0"`) ou formato legado sem envelope | Detecta `envelope.version !== STORAGE_SCHEMA_VERSION`, descarta os dados obsoletos e reinstala os mocks de fábrica na versão `"1.0.0"`. |
| **Ausência de Envelope (Payload Bruto Legado)** | Dados gravados sem envelope `{ version, timestamp, data }` | Detecta ausência de envelope e encapsula ou restaura mocks padrão. |

### 2.3 Registro de Provedores de Fábrica (`defaultRegistry`)

Para que `reset(key)`, `resetAll()` e a autorrecuperação de dados corrompidos funcionem de forma desacoplada, o `localStorageService` implementa um padrão de registro de fábricas:
- `registerDefault(key, factoryFn)`: Registra a função geradora de mocks para aquela chave (ex: `getMockInvoices` para `smartnfe_invoices`).
- Quando `load` encontra corrupção ou chave vazia, invoca a fábrica registrada, salva o envelope no storage e entrega os dados intactos.

### 2.4 Código Completo Proposto para `app/lib/storage/localStorageService.js`

```javascript
/**
 * SmartNFe — Serviço Central de Persistência Local Versionada
 *
 * Características:
 * - Envelope padronizado: { version: "1.0.0", timestamp, data }
 * - Versionamento estrito com STORAGE_SCHEMA_VERSION = "1.0.0"
 * - Multi-ambiente: Browser, SSR (Next.js) e Node.js test runner
 * - Fallback em memória transparente (MemoryStorage) para modo anônimo e quota cheia
 * - Auto-restauração contra JSON corrompido e version mismatch
 * - Registro desacoplado de mocks de fábrica (registerDefault)
 */

export const STORAGE_SCHEMA_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  INVOICES: 'smartnfe_invoices',
  PREPARED_INVOICES: 'smartnfe_prepared_invoices',
  SETTINGS: 'smartnfe_settings',
  DIVISIONS: 'smartnfe_divisions',
};

/**
 * Provedor de armazenamento em memória volátil.
 * Utilizado em SSR, Node.js e quando localStorage estiver bloqueado.
 */
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    clear: () => { map.clear(); },
    key: (index) => Array.from(map.keys())[index] || null,
    get length() { return map.size; },
  };
}

// Armazenamento em memória para fallbacks
const memoryStore = createMemoryStorage();

// Registro de fábricas de mock padrão para autorrecuperação
const defaultRegistry = new Map();

/**
 * Obtém o backend ativo de storage com detecção de disponibilidade.
 */
let activeBackend = null;

function getBackend() {
  if (activeBackend) return activeBackend;

  // 1. Verifica se estamos no browser e se window.localStorage responde
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const probeKey = '__smartnfe_storage_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      activeBackend = window.localStorage;
      return activeBackend;
    } catch (e) {
      // LocalStorage inacessível (ex: modo anônimo restritivo)
      console.warn('[localStorageService] window.localStorage inacessível. Ativando memória volátil.', e.message);
    }
  }

  // 2. Verifica se estamos em Node.js com globalThis.localStorage funcional
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    try {
      const probeKey = '__smartnfe_storage_probe__';
      globalThis.localStorage.setItem(probeKey, '1');
      globalThis.localStorage.removeItem(probeKey);
      activeBackend = globalThis.localStorage;
      return activeBackend;
    } catch (e) {
      // ignore
    }
  }

  // 3. Fallback seguro para armazenamento em memória
  activeBackend = memoryStore;
  return activeBackend;
}

/**
 * Clona profundamente um valor para evitar mutações acidentais por referência.
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
 * Registra uma função geradora de dados de fábrica para uma determinada chave.
 * @param {string} key
 * @param {Function} factoryFn
 */
export function registerDefault(key, factoryFn) {
  if (typeof factoryFn === 'function') {
    defaultRegistry.set(key, factoryFn);
  }
}

/**
 * Salva dados no storage sob envelope versionado.
 * @param {string} key Chave de armazenamento
 * @param {any} data Dados a persistir
 * @returns {boolean} true se persistido com sucesso, false caso contrário
 */
export function save(key, data) {
  if (!key) return false;

  const envelope = {
    version: STORAGE_SCHEMA_VERSION,
    timestamp: Date.now(),
    data: deepClone(data),
  };

  try {
    const serialized = JSON.stringify(envelope);
    const backend = getBackend();
    backend.setItem(key, serialized);
    return true;
  } catch (err) {
    // Tratamento de QuotaExceededError ou falha de escrita
    console.warn(`[localStorageService] Falha ao persistir chave "${key}" no storage permanente. Preservando em memória.`, err.message);
    memoryStore.setItem(key, JSON.stringify(envelope));
    return false;
  }
}

/**
 * Carrega dados do storage validando envelope e versão de schema.
 * @param {string} key Chave de armazenamento
 * @param {any} fallback Valor padrão caso não exista ou esteja corrompido
 * @returns {any} Dados desempacotados
 */
export function load(key, fallback = null) {
  if (!key) return fallback;

  const backend = getBackend();
  let raw = null;

  try {
    raw = backend.getItem(key);
  } catch (err) {
    console.warn(`[localStorageService] Erro ao ler chave "${key}". Consultando memória.`, err.message);
    raw = memoryStore.getItem(key);
  }

  // 1. Caso a chave não exista no storage
  if (raw === null || raw === undefined) {
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  // 2. Tenta fazer parse do envelope JSON
  let envelope = null;
  try {
    envelope = JSON.parse(raw);
  } catch (err) {
    console.warn(`[localStorageService] JSON corrompido detectado na chave "${key}". Restaurando fábrica.`, err.message);
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  // 3. Validação estrutural do envelope
  if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || !('data' in envelope)) {
    console.warn(`[localStorageService] Envelope inválido para chave "${key}". Restaurando fábrica.`);
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  // 4. Validação de versão de schema (version mismatch)
  if (envelope.version !== STORAGE_SCHEMA_VERSION) {
    console.warn(
      `[localStorageService] Versão incompatível na chave "${key}". Encontrado "${envelope.version}", esperado "${STORAGE_SCHEMA_VERSION}". Restaurando fábrica.`
    );
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  return deepClone(envelope.data);
}

/**
 * Restaura uma chave específica para o valor de fábrica registrado.
 * @param {string} key
 * @returns {any} Dados restaurados ou null
 */
export function reset(key) {
  if (!key) return null;

  if (defaultRegistry.has(key)) {
    const defaultData = defaultRegistry.get(key)();
    save(key, defaultData);
    return deepClone(defaultData);
  }

  remove(key);
  return null;
}

/**
 * Restaura TODAS as chaves do SmartNFe para o estado inicial de fábrica.
 */
export function resetAll() {
  // 1. Restaura todas as chaves padrão conhecidas
  for (const key of Object.values(STORAGE_KEYS)) {
    reset(key);
  }

  // 2. Limpa qualquer chave residual smartnfe_* não registrada
  try {
    const backend = getBackend();
    const toRemove = [];
    for (let i = 0; i < backend.length; i++) {
      const k = backend.key(i);
      if (k && k.startsWith('smartnfe_') && !Object.values(STORAGE_KEYS).includes(k)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => backend.removeItem(k));
  } catch (e) {
    // ignore
  }

  memoryStore.clear();
}

/**
 * Remove uma chave do storage e da memória.
 * @param {string} key
 */
export function remove(key) {
  if (!key) return;
  try {
    getBackend().removeItem(key);
  } catch (e) {}
  memoryStore.removeItem(key);
}

/**
 * Verifica se uma chave existe e está na versão de schema correta.
 * @param {string} key
 * @returns {boolean}
 */
export function has(key) {
  if (!key) return false;
  try {
    const raw = getBackend().getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed && parsed.version === STORAGE_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

/**
 * Informações de diagnóstico sobre uma chave.
 * @param {string} key
 * @returns {Object}
 */
export function getInfo(key) {
  try {
    const raw = getBackend().getItem(key);
    if (!raw) return { exists: false };
    const parsed = JSON.parse(raw);
    return {
      exists: true,
      version: parsed.version,
      timestamp: parsed.timestamp,
      dataSize: raw.length,
      isCurrentSchema: parsed.version === STORAGE_SCHEMA_VERSION,
    };
  } catch {
    return { exists: false, corrupted: true };
  }
}

/**
 * Informa se o localStorage nativo do navegador está ativo.
 * @returns {boolean}
 */
export function isAvailable() {
  return typeof window !== 'undefined' && getBackend() === window.localStorage;
}

/**
 * Permite injetar backend customizado nos testes (ex: simulação de erro de quota).
 * @param {Storage|null} custom
 */
export function setCustomStorage(custom) {
  activeBackend = custom;
}

/**
 * Exportação default agrupada para facilitar importação por desestruturação.
 */
export const localStorageService = {
  STORAGE_SCHEMA_VERSION,
  STORAGE_KEYS,
  save,
  load,
  reset,
  resetAll,
  remove,
  has,
  getInfo,
  isAvailable,
  registerDefault,
  setCustomStorage,
};

export default localStorageService;
```

---

## 3. Repositório Assíncrono de Invoices: `app/features/invoiceRepository.js`

### 3.1 Contrato da Interface Assíncrona

| Método | Assinatura | Descrição |
|---|---|---|
| `list` | `list(filters = {})` | Retorna `Promise<Array<Invoice>>` com filtros por busca textual, status, tipo de documento e paginação. |
| `findById` | `findById(id)` | Retorna `Promise<Invoice \| null>` com clone isolado da nota. |
| `update` | `update(id, partialData)` | Atualiza cabeçalho/dados, recalcula totais se itens mudaram e persiste. |
| `updateItem` | `updateItem(id, itemId, partialItemData)` | Atualiza campos do item, recalcula total da linha, recalcula totais da nota, salva snapshot original e persiste. |
| `getValidationIssues` | `getValidationIssues(id)` | Retorna `Promise<Array<ValidationIssue>>` consolidando inconsistências simuladas de `demo-04` e validação dinâmica de regras de exportação. |
| `resetDemoData` | `resetDemoData()` | Restaura os 5 cenários para o estado inicial de fábrica. |
| `resetInvoice` | `resetInvoice(id)` | Restaura uma única nota para o estado inicial sem afetar outras alterações. |
| `create` | `create(invoiceData)` | Cria/importa nova nota fiscal (usada na tela `/documentos/importar`). |

### 3.2 Estratégia de Paginação e Compatibilidade com Componentes

Para garantir compatibilidade 100% tanto com chamadas que esperam um array direto (ex: `DataTable data={invoices}`) quanto com telas que exigem metadados de paginação:
1. `list(filters)` retorna um **Array nativo** contendo os itens paginados.
2. Anexa propriedades não enumeráveis ao Array:
   - `result.total`: Total geral de registros filtrados.
   - `result.page`: Página atual.
   - `result.pageSize`: Itens por página.
   - `result.totalPages`: Total de páginas calculadas.
3. Se o chamador especificar explicitamente `{ returnPagination: true }`, retorna o objeto estruturado `{ data, total, page, pageSize, totalPages }`.

### 3.3 Integração com Cálculos Decimais e Compatibilidade Dupla de Totais

Quando `updateItem` altera quantidade ou preço unitário:
- O total do item é recalculado através de `calculateItemTotal` de `app/lib/calculations/invoiceTotals.js` (com fallback decimal seguro caso o módulo esteja em carga assíncrona).
- Os totais da nota (`totais`) são recalculados através de `calculateInvoiceTotals`.
- Para assegurar compatibilidade absoluta entre telas existentes (como o `/dashboard` de M1 que lê `inv.totais.valorTotalNota`) e novas especificações que referenciem chaves em inglês:
  ```javascript
  totais: {
    valorProdutos: totalProducts,
    valorFrete: totalFreight,
    valorSeguro: totalInsurance,
    valorDesconto: totalDiscount,
    outrasDespesas: totalOther,
    valorTotalNota: totalInvoice,
    // Aliases em inglês
    totalProducts,
    totalFreight,
    totalInsurance,
    totalDiscount,
    totalInvoice,
    pesoLiquido: currentTotals.pesoLiquido || '0.000',
    pesoBruto: currentTotals.pesoBruto || '0.000',
  }
  ```

### 3.4 Motor de Inconsistências Fiscais (`getValidationIssues`)

O método `getValidationIssues(id)` opera em duas frentes complementares:
1. **Inconsistências Estáticas Cadastradas (`demo-04`)**:
   - Extrai as inconsistências embutidas em `item.inconsistencias` (CFOP 5102, divergência matemática de R$ 500,00 no item 5, NCM com 7 dígitos no item 8 e unidade METROS no item 11).
2. **Validação Dinâmica em Tempo Real**:
   - **Regra 1 (CFOP de Exportação):** Se destinatário for estrangeiro (`pais !== 'Brasil'` e `paisCodigo !== 'BR'`), verifica se todo item possui CFOP iniciando com `7`.
   - **Regra 2 (Formato de NCM):** Verifica se o NCM possui exatamente 8 dígitos numéricos.
   - **Regra 3 (Conferência Matemática de Linha):** Compara `valorUnitario * quantidade` com `valorTotal` do item. Se houver discrepância > R$ 0,01, acusa erro.
   - **Regra 4 (Auto-Resolução):** Se a contadora corrigir o item na tela de Conferência (ex: mudar CFOP de 5102 para 7101), o erro deixa de ser acusado dinamicamente!

### 3.5 Código Completo Proposto para `app/features/invoiceRepository.js`

```javascript
/**
 * SmartNFe — Repositório Assíncrono de Invoices (Documentos Fiscais)
 *
 * Características:
 * - Interface baseada em Promises para desacoplamento e futura migração REST
 * - Persistência versionada via localStorageService (STORAGE_KEYS.INVOICES)
 * - Busca textual flexível, filtros de status, tipo e paginação
 * - Recálculo em tempo real de itens e totais da nota
 * - Snapshot imutável de valores originais (valorOriginal) para rollback seguro
 * - Validador fiscal dinâmico integrado para conferência e assistência (demo-04)
 */

import { localStorageService, STORAGE_KEYS } from '@/lib/storage/localStorageService';
import { getMockInvoices, MOCK_INVOICES } from '@/lib/data/mockInvoices';

// Registro automático da fábrica de mocks para autorrecuperação e reset
localStorageService.registerDefault(STORAGE_KEYS.INVOICES, () => getMockInvoices());

/**
 * Clona profundamente um objeto.
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
 * Cálculo decimal auxiliar para total de item (2 casas decimais)
 * com suporte nativo a strings sem imprecisão de float binário.
 */
function computeItemTotal(unitPriceStr, qtyStr) {
  const price = parseFloat(String(unitPriceStr || '0').replace(',', '.'));
  const qty = parseFloat(String(qtyStr || '0').replace(',', '.'));
  if (Number.isNaN(price) || Number.isNaN(qty)) return '0.00';
  return (price * qty).toFixed(2);
}

/**
 * Recalcula totais da nota a partir dos itens e acréscimos/deduções.
 */
function recalculateInvoiceTotals(items, currentTotals = {}) {
  const safeItems = Array.isArray(items) ? items : [];

  let sumProducts = 0;
  for (const item of safeItems) {
    const itemTotal = parseFloat(String(item.valorTotal || '0').replace(',', '.'));
    if (!Number.isNaN(itemTotal)) {
      sumProducts += itemTotal;
    }
  }

  const frete = parseFloat(String(currentTotals.valorFrete || currentTotals.totalFreight || '0').replace(',', '.')) || 0;
  const seguro = parseFloat(String(currentTotals.valorSeguro || currentTotals.totalInsurance || '0').replace(',', '.')) || 0;
  const outras = parseFloat(String(currentTotals.outrasDespesas || currentTotals.totalOther || '0').replace(',', '.')) || 0;
  const desconto = parseFloat(String(currentTotals.valorDesconto || currentTotals.totalDiscount || '0').replace(',', '.')) || 0;

  const totalNota = Math.max(0, sumProducts + frete + seguro + outras - desconto);

  const totalProducts = sumProducts.toFixed(2);
  const totalFreight = frete.toFixed(2);
  const totalInsurance = seguro.toFixed(2);
  const totalOther = outras.toFixed(2);
  const totalDiscount = desconto.toFixed(2);
  const totalInvoice = totalNota.toFixed(2);

  return {
    valorProdutos: totalProducts,
    valorFrete: totalFreight,
    valorSeguro: totalInsurance,
    valorDesconto: totalDiscount,
    outrasDespesas: totalOther,
    valorTotalNota: totalInvoice,
    // Aliases em inglês para interoperabilidade
    totalProducts,
    totalFreight,
    totalInsurance,
    totalDiscount,
    totalInvoice,
    pesoLiquido: currentTotals.pesoLiquido || '0.000',
    pesoBruto: currentTotals.pesoBruto || '0.000',
  };
}

/**
 * Retorna todos os documentos persistidos no storage (ou restaura mocks padrão).
 */
async function getAllInvoices() {
  const loaded = localStorageService.load(STORAGE_KEYS.INVOICES, null);
  if (Array.isArray(loaded) && loaded.length > 0) {
    return loaded;
  }
  // Se ainda não existir no storage, inicializa
  const initial = getMockInvoices();
  localStorageService.save(STORAGE_KEYS.INVOICES, initial);
  return initial;
}

/**
 * Salva a lista completa de documentos no storage.
 */
async function saveAllInvoices(invoices) {
  localStorageService.save(STORAGE_KEYS.INVOICES, invoices);
}

export const invoiceRepository = {
  /**
   * Lista documentos fiscais aplicando filtros e paginação.
   * @param {Object} filters
   * @param {string} [filters.query] Termo para busca textual
   * @param {string|string[]} [filters.status] Filtro por status
   * @param {string} [filters.type] Filtro por tipo (XML / PDF)
   * @param {number} [filters.page=1] Página atual (base 1)
   * @param {number} [filters.pageSize=0] Itens por página (0 = todos)
   * @param {boolean} [filters.returnPagination=false] Retornar objeto com metadados
   * @returns {Promise<Array<Object>|Object>}
   */
  async list(filters = {}) {
    const invoices = await getAllInvoices();
    let result = invoices;

    // 1. Busca textual abrangente (número, emitente, destinatário, chave de acesso)
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      result = result.filter((inv) => {
        const num = String(inv.numero || '').toLowerCase();
        const chave = String(inv.chaveAcesso || '').toLowerCase();
        const emitRazao = String(inv.emitente?.razaoSocial || '').toLowerCase();
        const emitCnpj = String(inv.emitente?.cnpj || '').toLowerCase();
        const destNome = String(inv.destinatario?.nome || '').toLowerCase();
        const destPais = String(inv.destinatario?.pais || '').toLowerCase();

        return (
          num.includes(q) ||
          chave.includes(q) ||
          emitRazao.includes(q) ||
          emitCnpj.includes(q) ||
          destNome.includes(q) ||
          destPais.includes(q)
        );
      });
    }

    // 2. Filtro por status
    if (filters.status && filters.status !== 'todos' && filters.status !== 'all') {
      if (Array.isArray(filters.status)) {
        result = result.filter((inv) => filters.status.includes(inv.status));
      } else {
        result = result.filter((inv) => inv.status === filters.status);
      }
    }

    // 3. Filtro por tipo de documento (XML / PDF)
    const typeFilter = filters.type || filters.tipoDocumento;
    if (typeFilter && typeFilter !== 'todos' && typeFilter !== 'all') {
      result = result.filter(
        (inv) => String(inv.tipoDocumento || '').toUpperCase() === String(typeFilter).toUpperCase()
      );
    }

    const total = result.length;
    const page = parseInt(filters.page, 10) || 1;
    const pageSize = parseInt(filters.pageSize || filters.perPage, 10) || 0;

    let items = result;
    if (pageSize > 0) {
      const start = (page - 1) * pageSize;
      items = result.slice(start, start + pageSize);
    }

    // Se o consumidor solicitou explicitamente o envelope de paginação
    if (filters.returnPagination) {
      return {
        data: deepClone(items),
        total,
        page,
        pageSize: pageSize || total,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
      };
    }

    // Retorna Array com propriedades não enumeráveis para máxima compatibilidade
    const arrayResult = deepClone(items);
    Object.defineProperties(arrayResult, {
      total: { value: total, writable: true, enumerable: false },
      page: { value: page, writable: true, enumerable: false },
      pageSize: { value: pageSize || total, writable: true, enumerable: false },
      totalPages: {
        value: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
        writable: true,
        enumerable: false,
      },
    });

    return arrayResult;
  },

  /**
   * Busca um documento fiscal por ID.
   * @param {string} id ID do documento (ex: 'demo-01')
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;
    const invoices = await getAllInvoices();
    const found = invoices.find((inv) => inv.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Atualiza dados de um documento e persiste.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>} Documento atualizado
   */
  async update(id, partialData) {
    const invoices = await getAllInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      throw new Error(`Documento fiscal não encontrado: ${id}`);
    }

    const existing = invoices[index];
    const updated = {
      ...existing,
      ...partialData,
      id: existing.id, // preserva ID original
      atualizadoEm: new Date().toISOString(),
    };

    // Recalcula totais caso a lista de itens tenha sido alterada
    if (partialData.itens && !partialData.totais) {
      updated.totais = recalculateInvoiceTotals(updated.itens, updated.totais);
    }

    invoices[index] = updated;
    await saveAllInvoices(invoices);
    return deepClone(updated);
  },

  /**
   * Atualiza um item individual na NF-e, recalcula a linha e os totais da nota.
   * @param {string} invoiceId ID da NF-e
   * @param {string|number} itemId ID do item ou número sequencial
   * @param {Object} partialItemData Campos a atualizar (quantidade, valorUnitario, etc)
   * @returns {Promise<Object>} Documento fiscal atualizado
   */
  async updateItem(invoiceId, itemId, partialItemData) {
    const invoices = await getAllInvoices();
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      throw new Error(`Documento fiscal não encontrado: ${invoiceId}`);
    }

    if (!Array.isArray(invoice.itens)) {
      invoice.itens = [];
    }

    const itemIndex = invoice.itens.findIndex(
      (it) => it.id === itemId || String(it.item) === String(itemId)
    );
    if (itemIndex === -1) {
      throw new Error(`Item "${itemId}" não encontrado no documento "${invoiceId}"`);
    }

    const currentItem = invoice.itens[itemIndex];

    // Cria snapshot imutável do valor original na primeira alteração
    if (!currentItem.valorOriginal) {
      currentItem.valorOriginal = {
        codigo: currentItem.codigo,
        descricao: currentItem.descricao,
        ncm: currentItem.ncm,
        cfop: currentItem.cfop,
        unidade: currentItem.unidade,
        quantidade: currentItem.quantidade,
        valorUnitario: currentItem.valorUnitario,
        valorTotal: currentItem.valorTotal,
      };
    }

    const updatedItem = {
      ...currentItem,
      ...partialItemData,
      id: currentItem.id,
      item: currentItem.item,
      modificado: true,
    };

    // Recalcula o valor total da linha se preço ou quantidade mudaram
    const qty = updatedItem.quantidade;
    const unitPrice = updatedItem.valorUnitario;
    updatedItem.valorTotal = computeItemTotal(unitPrice, qty);

    invoice.itens[itemIndex] = updatedItem;

    // Recalcula totais consolidados da nota
    invoice.totais = recalculateInvoiceTotals(invoice.itens, invoice.totais);
    invoice.atualizadoEm = new Date().toISOString();

    // Se a nota estava recém importada, transiciona para 'em_conferencia'
    if (invoice.status === 'importado') {
      invoice.status = 'em_conferencia';
    }

    await saveAllInvoices(invoices);
    return deepClone(invoice);
  },

  /**
   * Obtém os apontamentos fiscais (erros e avisos) de um documento.
   * Consolida inconsistências mockadas e executa regras dinâmicas de conferência.
   * @param {string} id ID do documento
   * @returns {Promise<Array<Object>>}
   */
  async getValidationIssues(id) {
    const invoice = await this.findById(id);
    if (!invoice) return [];

    const issues = [];

    // 1. Apontamentos estáticos pré-anotados nos itens (cenário demo-04)
    if (Array.isArray(invoice.itens)) {
      for (const item of invoice.itens) {
        if (Array.isArray(item.inconsistencias)) {
          for (const inc of item.inconsistencias) {
            issues.push({
              id: `issue-${item.id}-${inc.campo}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: inc.tipo || 'erro',
              campo: inc.campo,
              mensagem: inc.mensagem,
              esperado: inc.esperado || '',
              encontrado: inc.encontrado || '',
              regra: inc.campo === 'cfop' ? 'CFOP de Exportação' : inc.campo === 'ncm' ? 'Validação de NCM' : 'Conferência Fiscal',
              sugestao: inc.esperado ? `Corrigir para "${inc.esperado}"` : 'Verificar documentação aduaneira',
            });
          }
        }
      }
    }

    // 2. Validação dinâmica de regras de comércio exterior
    const isExport =
      invoice.destinatario?.pais &&
      invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
      invoice.destinatario?.paisCodigo !== 'BR';

    if (Array.isArray(invoice.itens)) {
      for (const item of invoice.itens) {
        // Regra CFOP de Exportação
        if (isExport && item.cfop && !item.cfop.startsWith('7')) {
          const already = issues.some((iss) => iss.itemId === item.id && iss.campo === 'cfop');
          if (!already) {
            issues.push({
              id: `rule-cfop-${item.id}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: 'erro',
              campo: 'cfop',
              mensagem: `CFOP ${item.cfop} inválido para operação com exterior (${invoice.destinatario?.pais}). CFOP de exportação deve iniciar com 7 (ex: 7101).`,
              esperado: '7101',
              encontrado: item.cfop,
              regra: 'CFOP de Exportação',
              sugestao: 'Alterar CFOP para 7101 (Exportação de produção própria)',
            });
          }
        }

        // Regra Formato NCM (8 dígitos)
        const cleanNcm = String(item.ncm || '').replace(/\D/g, '');
        if (cleanNcm.length > 0 && cleanNcm.length !== 8) {
          const already = issues.some((iss) => iss.itemId === item.id && iss.campo === 'ncm');
          if (!already) {
            issues.push({
              id: `rule-ncm-${item.id}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: 'erro',
              campo: 'ncm',
              mensagem: `NCM "${item.ncm}" inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos (encontrado: ${cleanNcm.length}).`,
              esperado: '8 dígitos numéricos',
              encontrado: item.ncm,
              regra: 'Classificação Fiscal NCM',
              sugestao: 'Completar os dígitos faltantes da NCM na tabela TIPI.',
            });
          }
        }

        // Regra Divergência Matemática
        const expectedTotal = computeItemTotal(item.valorUnitario, item.quantidade);
        const recordedTotal = parseFloat(String(item.valorTotal || '0').replace(',', '.')).toFixed(2);
        if (Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01) {
          const already = issues.some((iss) => iss.itemId === item.id && iss.campo === 'valorTotal');
          if (!already) {
            issues.push({
              id: `rule-math-${item.id}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: 'erro',
              campo: 'valorTotal',
              mensagem: `Divergência matemática: ${item.quantidade} x ${item.valorUnitario} = ${expectedTotal}, mas valor total gravado é ${item.valorTotal}.`,
              esperado: expectedTotal,
              encontrado: item.valorTotal,
              regra: 'Conferência Matemática',
              sugestao: `Ajustar valor total da linha para R$ ${expectedTotal}`,
            });
          }
        }
      }
    }

    return issues;
  },

  /**
   * Restaura todos os documentos para os 5 cenários de demonstração originais.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    localStorageService.reset(STORAGE_KEYS.INVOICES);
  },

  /**
   * Restaura uma única nota para o valor de fábrica correspondente.
   * @param {string} id ID da nota a restaurar
   * @returns {Promise<Object>} Nota restaurada
   */
  async resetInvoice(id) {
    const factoryInvoices = getMockInvoices();
    const factoryItem = factoryInvoices.find((inv) => inv.id === id);
    if (!factoryItem) {
      throw new Error(`Cenário original de fábrica não encontrado para ID: ${id}`);
    }

    const currentInvoices = await getAllInvoices();
    const index = currentInvoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      currentInvoices.push(deepClone(factoryItem));
    } else {
      currentInvoices[index] = deepClone(factoryItem);
    }

    await saveAllInvoices(currentInvoices);
    return deepClone(factoryItem);
  },

  /**
   * Cria ou importa um novo documento fiscal.
   * @param {Object} invoiceData
   * @returns {Promise<Object>}
   */
  async create(invoiceData) {
    const invoices = await getAllInvoices();
    const id = invoiceData.id || `doc-${Date.now()}`;
    const newDoc = {
      ...invoiceData,
      id,
      status: invoiceData.status || 'importado',
      isDemo: true,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    if (!newDoc.totais && Array.isArray(newDoc.itens)) {
      newDoc.totais = recalculateInvoiceTotals(newDoc.itens, {});
    }

    const updated = [newDoc, ...invoices];
    await saveAllInvoices(updated);
    return deepClone(newDoc);
  },
};

export default invoiceRepository;
```

---

## 4. Repositório Assíncrono de Notas Preparadas: `app/features/preparedInvoiceRepository.js`

### 4.1 Contrato da Interface Assíncrona

| Método | Assinatura | Descrição |
|---|---|---|
| `list` | `list(filters = {})` | Retorna `Promise<Array<PreparedInvoice>>` filtrado por busca textual, `parentInvoiceId` e status. |
| `findById` | `findById(id)` | Retorna `Promise<PreparedInvoice \| null>`. |
| `create` | `create(preparedInvoice)` | Cadastra nova nota preparada resultante de divisão e persiste. |
| `delete` | `delete(id)` | Remove nota preparada por ID e persiste. |
| `resetDemoData` | `resetDemoData()` | Restaura as notas preparadas de fábrica (`MOCK_PREPARED_INVOICES`). |

### 4.2 Código Completo Proposto para `app/features/preparedInvoiceRepository.js`

```javascript
/**
 * SmartNFe — Repositório Assíncrono de Notas Fiscais Preparadas
 *
 * Características:
 * - Gerencia notas resultantes de desmembramento e divisão de exportação
 * - Persistência versionada via localStorageService (STORAGE_KEYS.PREPARED_INVOICES)
 * - Geração automática de identificadores e data de criação
 * - Suporte a filtros por NF original (parentInvoiceId) e busca textual
 */

import { localStorageService, STORAGE_KEYS } from '@/lib/storage/localStorageService';
import { getMockPreparedInvoices, MOCK_PREPARED_INVOICES } from '@/lib/data/mockInvoices';

// Registro automático da fábrica de mocks para autorrecuperação e reset
localStorageService.registerDefault(
  STORAGE_KEYS.PREPARED_INVOICES,
  () => getMockPreparedInvoices()
);

/**
 * Clona profundamente um valor.
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
 * Obtém todas as notas preparadas salvas no storage.
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
 * Salva a lista de notas preparadas.
 */
async function saveAllPrepared(list) {
  localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, list);
}

export const preparedInvoiceRepository = {
  /**
   * Lista notas preparadas com filtros opcionais.
   * @param {Object} filters
   * @param {string} [filters.query] Busca textual (número, destinatário, lote)
   * @param {string} [filters.parentInvoiceId] Filtro por NF original
   * @param {string} [filters.status] Filtro por status
   * @returns {Promise<Array<Object>>}
   */
  async list(filters = {}) {
    let list = await getAllPrepared();

    // 1. Busca textual
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter((p) => {
        const num = String(p.numero || '').toLowerCase();
        const origem = String(p.origemNumero || '').toLowerCase();
        const dest = String(p.destinatario?.nome || '').toLowerCase();
        const desc = String(p.descricaoLote || '').toLowerCase();
        return num.includes(q) || origem.includes(q) || dest.includes(q) || desc.includes(q);
      });
    }

    // 2. Filtro por NF de origem
    if (filters.parentInvoiceId) {
      list = list.filter((p) => p.parentInvoiceId === filters.parentInvoiceId);
    }

    // 3. Filtro por status
    if (filters.status && filters.status !== 'todos' && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    }

    return deepClone(list);
  },

  /**
   * Busca nota preparada por ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;
    const list = await getAllPrepared();
    const found = list.find((p) => p.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Cadastra uma nova nota preparada.
   * @param {Object} preparedInvoice Dados da nota preparada
   * @returns {Promise<Object>}
   */
  async create(preparedInvoice) {
    if (!preparedInvoice) {
      throw new Error('Dados da nota preparada são obrigatórios');
    }

    const list = await getAllPrepared();
    const id =
      preparedInvoice.id ||
      `prep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newEntry = {
      ...preparedInvoice,
      id,
      status: preparedInvoice.status || 'preparado',
      dataCriacao: preparedInvoice.dataCriacao || new Date().toISOString(),
    };

    const updated = [newEntry, ...list];
    await saveAllPrepared(updated);
    return deepClone(newEntry);
  },

  /**
   * Remove uma nota preparada pelo ID.
   * @param {string} id
   * @returns {Promise<boolean>} true se foi removida, false se não encontrada
   */
  async delete(id) {
    if (!id) return false;
    const list = await getAllPrepared();
    const filtered = list.filter((p) => p.id !== id);
    const wasRemoved = filtered.length !== list.length;
    if (wasRemoved) {
      await saveAllPrepared(filtered);
    }
    return wasRemoved;
  },

  /**
   * Atualiza dados parciais de uma nota preparada.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>}
   */
  async update(id, partialData) {
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
  },

  /**
   * Restaura as notas preparadas de fábrica.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    localStorageService.reset(STORAGE_KEYS.PREPARED_INVOICES);
  },
};

export default preparedInvoiceRepository;
```

---

## 5. Integração com Milestones e Componentes

### 5.1 Compatibilidade com o Dashboard (M1)

No Milestone 1, `app/dashboard/page.jsx` lê dados síncronos de `getMockInvoices()`.
Com a introdução dos repositórios assíncronos:
- `DashboardPage` poderá continuar funcionando imediatamente porque o `localStorageService` registrará os defaults em `smartnfe_invoices`.
- O Dashboard poderá adotar `await invoiceRepository.list()` e `invoiceRepository.getValidationIssues()` sem alterar seu layout ou lógica visual.
- As ações de reset do dashboard chamarão `invoiceRepository.resetDemoData()` ou `localStorageService.resetAll()`.

### 5.2 Preparação para as Próximas Telas (M3, M4, M5)

1. **M3 — `/documentos` e `/documentos/importar`**:
   - `/documentos` utilizará `invoiceRepository.list({ query, status, type, page, pageSize })`.
   - `/documentos/importar` utilizará `invoiceRepository.create(uploadedDoc)` e redirecionará para a conferência.
2. **M4 — `/documentos/[id]/conferencia` e `/documentos/[id]/validacao`**:
   - `/conferencia` consumirá `invoiceRepository.findById(id)` e salvará cada célula editada via `invoiceRepository.updateItem(id, itemId, changes)`.
   - `/validacao` consumirá `invoiceRepository.getValidationIssues(id)`.
3. **M5 — `/documentos/[id]/divisao` e `/notas-preparadas`**:
   - `/divisao` gerará as notas de destino chamando `preparedInvoiceRepository.create(newPrep)`.
   - `/notas-preparadas` listará os registros chamando `preparedInvoiceRepository.list()` e permitirá exclusão via `delete(id)`.

---

## 6. Verificação Automatizada e Casos de Teste (Tier 1)

Para o subagente implementador e para o executor de testes `tests/tier1/m2_domain.test.mjs`, os seguintes testes automatizados devem ser incluídos:

### 6.1 Casos de Teste para `localStorageService`
1. **Envelope e Versão:** Gravar item via `save('test_key', { a: 1 })`, verificar via backend cru que o JSON gravado possui `{ version: "1.0.0", timestamp: Number, data: { a: 1 } }`.
2. **Version Mismatch:** Gravar envelope com `version: "0.9.0"`. Chamar `load('test_key', 'fallback_val')` e confirmar que retorna `fallback_val` ou restaura mock de fábrica.
3. **JSON Corrompido:** Gravar string inválida `"{ invalid json .."`. Chamar `load('test_key', 'fallback')` e confirmar que não lança erro e retorna fallback.
4. **Fallback em Memória:** Simular `window.localStorage` inacessível (ou injetar backend lançando `QuotaExceededError`) e comprovar que `save` e `load` funcionam via memória interna.
5. **Reset e ResetAll:** Modificar chave e executar `reset(STORAGE_KEYS.INVOICES)` comprovando restauração dos 5 cenários.

### 6.2 Casos de Teste para `invoiceRepository`
1. **Contrato de Listagem:** `list()` retorna os 5 cenários mockados (`demo-01` a `demo-05`).
2. **Filtros:**
   - `list({ query: 'Agroexport' })` retorna apenas `demo-01`.
   - `list({ type: 'PDF' })` retorna apenas `demo-02`.
   - `list({ status: 'em_conferencia' })` filtra corretamente.
3. **Edição de Item e Recálculo:**
   - Chamar `updateItem('demo-01', 'd1-1', { quantidade: '600.0000', valorUnitario: '30.0000' })`.
   - Verificar: item `valorTotal` recalculado para `'18000.00'`.
   - Verificar: item `modificado === true`.
   - Verificar: item `valorOriginal` preservado com quantidade `'500.0000'`.
   - Verificar: totais da nota (`totais.valorProdutos` e `totais.valorTotalNota`) recalculados.
4. **Validação Fiscal:**
   - Chamar `getValidationIssues('demo-04')`.
   - Verificar: retorna pelo menos 4 apontamentos (CFOP 5102, discrepância matemática de R$ 500,00, NCM de 7 dígitos e unidade METROS).
5. **Restauração Demo:**
   - Chamar `resetDemoData()`.
   - Verificar que `demo-01` volta aos valores originais.

### 6.3 Casos de Teste para `preparedInvoiceRepository`
1. **Listagem Padrão:** `list()` retorna as 2 notas preparadas de baseline (`prep-01`, `prep-02`).
2. **Criação:** `create({ parentInvoiceId: 'demo-01', numero: '000.145.892-A', valorTotalNota: '50000.00' })` persiste nova nota.
3. **Busca e Exclusão:** `findById` localiza a nota recém-criada e `delete(id)` remove-a com sucesso.
4. **Restauração:** `resetDemoData()` reestabelece as notas de demonstração.

---

## 7. Conclusão da Investigação

A arquitetura formulada atende a todos os requisitos do projeto:
- Pure JavaScript (zero TypeScript), compatível com Next.js 16 App Router e React 19.
- Resiliente a ambientes restritivos (SSR, modo anônimo, testes Node nativos sem navegador).
- Desacopla regras fiscais e persistência dos componentes de tela, pronta para implementação imediata.
