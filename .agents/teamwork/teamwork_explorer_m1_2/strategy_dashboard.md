# Estratégia de Implementação: `/dashboard` e Baseline de Dados Mockados (Milestone 1)

**Agente:** `teamwork_explorer_m1_2` (Teamwork Explorer)  
**Data:** 04/11/2026  
**Status:** Pronto para Implementação  
**Destinatário:** Sub-orquestrador Milestone 1 (`sub_orch_m1_foundation`)

---

## 1. Visão Geral e Objetivos

O objetivo desta investigação é formular a estratégia técnica completa e fornecer os códigos-fonte concretos para:
1. **Reconstruir totalmente a tela inicial `/dashboard` (`app/dashboard/page.jsx`)**:
   - Eliminar a checagem legada de autenticação fictícia (`localStorage.getItem('isAuthenticated')`) e o redirecionamento indevido para `/login`;
   - Integrar a tela com o layout corporativo `AppLayout` (Sidebar, Header compacto com breadcrumbs, alternador dark mode e DemoBadge "Modo Demonstração");
   - Estruturar o painel com **5 KPI Summary Cards** com métricas fiscais consolidadas;
   - Implementar **Barra de Ações Rápidas e Seleção dos Cenários Demo 01 a 05**;
   - Implementar a **Tabela de Documentos Recentes** utilizando o componente `DataTable` com **colunas explícitas** e links de ação direta para `/documentos/[id]/conferencia`, `/documentos/[id]/divisao` e `/documentos/[id]/validacao`.
2. **Criar os módulos centrais de formatação em `app/lib/formatters/`**:
   - `currency.js`: Formatação BRL e parsing para string decimal canônica;
   - `dates.js`: Formatação de datas brasileiras (`DD/MM/AAAA` e `DD/MM/AAAA HH:mm`) usando estritamente a API nativa `Intl.DateTimeFormat` (sem dependência de `moment`);
   - `status.js`: Dicionário semântico e funções auxiliares de rótulos e classes de cor Tailwind CSS 4.
3. **Criar a base de dados mockados em `app/lib/data/mockInvoices.js`**:
   - 5 cenários fictícios de exportação (`demo-01` a `demo-05`) com dados ricos de comércio exterior brasileiro (8, 25, 50, 12 e 15 itens);
   - 2 notas fiscais preparadas de demonstração derivadas de divisões;
   - Função utilitária de cálculo instantâneo dos KPIs do Dashboard (`getDashboardKPIs()`).

---

## 2. Diagnóstico do Código Legado

A inspeção direta em `app/dashboard/page.jsx` revelou:
- **Linhas 18-30**: Interceptação com `localStorage.getItem('isAuthenticated')` que força `router.push('/login')` se o usuário não tiver a flag ativa. Como o MVP deve operar em modo demonstração irrestrito (sem telas de login fictícias), qualquer acesso direto ao `http://localhost:3000/dashboard` fica bloqueado em tela preta ou redirecionamento indesejado.
- **Linhas 8-14**: Estado fictício de template legado (`totalUsers`, `totalSales`, `revenue`, `activeProjects`), completamente desconectado do negócio de NF-e e exportação.
- **Linhas 47-68**: Cabeçalho redundante com botão de Logout em vez de usar `AppLayout` e `SmartNFeHeader`.
- **Linhas 161-244**: Tabela genérica e lista de atividades sem uso de `DataTable.jsx`.

---

## 3. Arquitetura dos Módulos Propostos

```
c:\www\smart-nfe\app\
├── dashboard\
│   └── page.jsx                  # Tela /dashboard reconstruída com AppLayout e DataTable
├── lib\
│   ├── formatters\
│   │   ├── currency.js           # formatBRL, parseBRL, formatNumberBRL
│   │   ├── dates.js              # formatDateBR, formatDateTimeBR (Intl nativo)
│   │   └── status.js             # getStatusLabel, getStatusColor, STATUS_CONFIG
│   └── data\
│       └── mockInvoices.js       # 5 cenários demo + prepared invoices + getDashboardKPIs
```

---

## 4. Códigos Concretos Propostos

### 4.1 `app/lib/formatters/currency.js`

Este módulo atende integralmente ao requisito de manipulação monetária em pt-BR e suporta tanto números quanto strings decimais.

```javascript
/**
 * Central de Formatação Monetária (BRL) — SmartNFe
 * Formata valores numéricos e strings decimais para o padrão monetário brasileiro.
 */

/**
 * Formata um valor numérico ou string decimal para moeda brasileira (BRL).
 * @param {string|number|null|undefined} value - Valor bruto a formatar (ex: "284500.00" ou 284500)
 * @returns {string} String formatada (ex: "R$ 284.500,00")
 */
export function formatBRL(value) {
  if (value === null || value === undefined || value === '') {
    return 'R$ 0,00';
  }

  let num;
  if (typeof value === 'number') {
    num = value;
  } else {
    // Normaliza separador decimal e remove espaços
    const sanitized = String(value).trim().replace(',', '.');
    num = parseFloat(sanitized);
  }

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Converte valor formatado em reais (ex: "R$ 1.234,56" ou "1.234,56") para string decimal canônica ("1234.56").
 * @param {string|number} strVal
 * @returns {string} String decimal canônica com 2 casas
 */
export function parseBRL(strVal) {
  if (strVal === null || strVal === undefined || strVal === '') {
    return '0.00';
  }

  if (typeof strVal === 'number') {
    return Number.isFinite(strVal) ? strVal.toFixed(2) : '0.00';
  }

  const cleaned = String(strVal)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? '0.00' : parsed.toFixed(2);
}

/**
 * Formata número decimal sem o símbolo R$ (ex: "1.234,56").
 * @param {string|number} value
 * @param {number} decimals
 * @returns {string}
 */
export function formatNumberBRL(value, decimals = 2) {
  if (value === null || value === undefined || value === '') {
    return '0,00';
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
```

---

### 4.2 `app/lib/formatters/dates.js`

Este módulo utiliza estritamente `Intl.DateTimeFormat` nativo do JavaScript moderno, eliminando completamente `moment` e `date-fns`.

```javascript
/**
 * Central de Formatação de Datas — SmartNFe
 * Utiliza estritamente APIs nativas Intl.DateTimeFormat (sem dependência de moment ou date-fns).
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
    } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // Data ISO simples YYYY-MM-DD: interpreta sem timezone shift
      const [year, month, day] = dateInput.split('-').map(Number);
      dateObj = new Date(Date.UTC(year, month - 1, day));
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
    const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
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

### 4.3 `app/lib/formatters/status.js`

Este módulo define a identidade visual e os rótulos de todos os status fiscais do SmartNFe:

```javascript
/**
 * Central de Rótulos e Cores de Status — SmartNFe
 * Classes compatíveis com Tailwind CSS 4 e suporte a Dark Mode.
 */

export const STATUS_CONFIG = {
  importado: {
    label: 'Importado',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    description: 'Documento importado aguardando início da conferência',
  },
  em_conferencia: {
    label: 'Em Conferência',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
    description: 'Auditoria de itens e classificação fiscal em andamento',
  },
  conferido: {
    label: 'Conferido',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    description: 'Itens, NCM e valores auditados e validados',
  },
  dividido: {
    label: 'Dividido',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    dot: 'bg-purple-500',
    description: 'Desmembrado em notas preparadas de destino',
  },
  com_inconsistencias: {
    label: 'Com Inconsistências',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    dot: 'bg-red-500',
    description: 'Inconsistências fiscais impeditivas detectadas',
  },
  preparado: {
    label: 'Preparado',
    className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    dot: 'bg-teal-500',
    description: 'Nota preparada gerada e pronta para exportação',
  },
};

/**
 * Retorna o rótulo amigável em português para o status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || status || 'Desconhecido';
}

/**
 * Retorna as classes Tailwind CSS para o badge de status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusColor(status) {
  return STATUS_CONFIG[status]?.className || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
}

/**
 * Retorna a classe de cor da bolinha indicadora.
 * @param {string} status
 * @returns {string}
 */
export function getStatusDot(status) {
  return STATUS_CONFIG[status]?.dot || 'bg-gray-400';
}
```

---

### 4.4 `app/lib/data/mockInvoices.js`

Este módulo implementa os **5 cenários obrigatórios** com atributos ricos de exportação brasileira:

```javascript
/**
 * Baseline de Dados Mockados de Demonstração — SmartNFe (Fase 1)
 * Cenários fictícios de exportação (demo-01 a demo-05) explicitamente identificados como demonstração.
 */

export const MOCK_INVOICES = [
  // -------------------------------------------------------------------------
  // CENÁRIO 1: demo-01 — XML Completo Padrão (8 itens)
  // -------------------------------------------------------------------------
  {
    id: 'demo-01',
    numero: '000.145.892',
    serie: '1',
    chaveAcesso: '35241112345678000190550010001458921001234567',
    tipoDocumento: 'XML',
    naturezaOperacao: 'EXPORTAÇÃO DE MERCADORIAS',
    dataEmissao: '2026-10-15T10:30:00Z',
    status: 'em_conferencia',
    isDemo: true,
    emitente: {
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'Agroexport Brasil S.A.',
      uf: 'SP',
      municipio: 'Santos',
    },
    destinatario: {
      nome: 'Global Trading Logistics B.V.',
      pais: 'Holanda',
      paisCodigo: 'NL',
      idEstrangeiro: 'NL884920192B01',
    },
    itens: [
      { id: 'd1-1', item: 1, codigo: 'EXP-CAF-001', descricao: 'Café em Grão Cru Arábica Tipo 6', ncm: '09011110', cfop: '7101', unidade: 'SC', quantidade: '500.0000', valorUnitario: '25.5000', valorTotal: '12750.00', situacao: 'conferido', modificado: false },
      { id: 'd1-2', item: 2, codigo: 'EXP-SOJ-002', descricao: 'Soja em Grãos Não Transgênica', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '120.0000', valorUnitario: '350.0000', valorTotal: '42000.00', situacao: 'conferido', modificado: false },
      { id: 'd1-3', item: 3, codigo: 'EXP-ACU-003', descricao: 'Açúcar Cristal Branco Refinado Tipo Icumsa 45', ncm: '17019900', cfop: '7101', unidade: 'TON', quantidade: '80.0000', valorUnitario: '420.0000', valorTotal: '33600.00', situacao: 'conferido', modificado: false },
      { id: 'd1-4', item: 4, codigo: 'EXP-SUC-004', descricao: 'Suco de Laranja Concentrado Congelado FCOJ 66 Brix', ncm: '20091100', cfop: '7101', unidade: 'TON', quantidade: '25.0000', valorUnitario: '1800.0000', valorTotal: '45000.00', situacao: 'pendente', modificado: false },
      { id: 'd1-5', item: 5, codigo: 'EXP-CEL-005', descricao: 'Polpa de Celulose Branqueada de Eucalipto', ncm: '47032900', cfop: '7101', unidade: 'TON', quantidade: '150.0000', valorUnitario: '480.0000', valorTotal: '72000.00', situacao: 'pendente', modificado: false },
      { id: 'd1-6', item: 6, codigo: 'EXP-BOV-006', descricao: 'Cortes Congelados de Carne Bovina Desossada', ncm: '02023000', cfop: '7101', unidade: 'KG', quantidade: '3500.0000', valorUnitario: '12.5000', valorTotal: '43750.00', situacao: 'pendente', modificado: false },
      { id: 'd1-7', item: 7, codigo: 'EXP-CAS-007', descricao: 'Castanha de Caju Torrada e Salgada W1-240', ncm: '08013200', cfop: '7101', unidade: 'KG', quantidade: '800.0000', valorUnitario: '18.5000', valorTotal: '14800.00', situacao: 'pendente', modificado: false },
      { id: 'd1-8', item: 8, codigo: 'EXP-OLE-008', descricao: 'Óleo Bruto de Soja Degomado para Refino', ncm: '15071000', cfop: '7101', unidade: 'TON', quantidade: '30.0000', valorUnitario: '686.6667', valorTotal: '20600.00', situacao: 'pendente', modificado: false },
    ],
    totais: {
      valorProdutos: '284500.00',
      valorFrete: '5000.00',
      valorSeguro: '1200.00',
      valorDesconto: '0.00',
      outrasDespesas: '500.00',
      valorTotalNota: '291200.00',
      pesoLiquido: '45000.000',
      pesoBruto: '46200.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 2: demo-02 — PDF Exportação (25 itens metalmecânicos)
  // -------------------------------------------------------------------------
  {
    id: 'demo-02',
    numero: '000.089.410',
    serie: '2',
    chaveAcesso: '41241198765432000155550020000894101007654321',
    tipoDocumento: 'PDF',
    naturezaOperacao: 'EXPORTAÇÃO DE MANUFATURADOS',
    dataEmissao: '2026-10-18T14:15:00Z',
    status: 'importado',
    isDemo: true,
    emitente: {
      cnpj: '98.765.432/0001-55',
      razaoSocial: 'Metalúrgica Sul Americana Ltda',
      uf: 'SC',
      municipio: 'Joinville',
    },
    destinatario: {
      nome: 'Industrial Supply Corp.',
      pais: 'Estados Unidos',
      paisCodigo: 'US',
      idEstrangeiro: 'US-TX-9874125',
    },
    itens: Array.from({ length: 25 }, (_, idx) => {
      const num = idx + 1;
      const unit = (5000 + (num * 75)).toFixed(4);
      const total = (5950.00).toFixed(2);
      return {
        id: `d2-${num}`,
        item: num,
        codigo: `MET-PECA-${String(num).padStart(3, '0')}`,
        descricao: `Componente Industrial Usinado Classe ${num} em Inox 316`,
        ncm: '84818099',
        cfop: '7101',
        unidade: 'UN',
        quantidade: '1.0000',
        valorUnitario: total,
        valorTotal: total,
        situacao: 'pendente',
        modificado: false,
      };
    }),
    totais: {
      valorProdutos: '148750.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '148750.00',
      pesoLiquido: '1250.000',
      pesoBruto: '1380.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 3: demo-03 — Stress Test Grande (50 itens de autopeças)
  // -------------------------------------------------------------------------
  {
    id: 'demo-03',
    numero: '000.320.100',
    serie: '1',
    chaveAcesso: '43241155544433000188550010003201001009988776',
    tipoDocumento: 'XML',
    naturezaOperacao: 'REMESSA DE COMPONENTES AUTOMOTIVOS PARA EXPORTAÇÃO',
    dataEmissao: '2026-10-20T08:45:00Z',
    status: 'conferido',
    isDemo: true,
    emitente: {
      cnpj: '55.544.433/0001-88',
      razaoSocial: 'Eletroparts do Brasil Componentes S.A.',
      uf: 'RS',
      municipio: 'Porto Alegre',
    },
    destinatario: {
      nome: 'Auto Assembly Europe GmbH',
      pais: 'Alemanha',
      paisCodigo: 'DE',
      idEstrangeiro: 'DE814523990',
    },
    itens: Array.from({ length: 50 }, (_, idx) => {
      const num = idx + 1;
      const unit = (125.16).toFixed(4);
      const qtd = '100.0000';
      const total = '12516.00';
      return {
        id: `d3-${num}`,
        item: num,
        codigo: `AUT-ELE-${String(num).padStart(3, '0')}`,
        descricao: `Chicote Elétrico Automotivo Mod. Turbo Série ${num}`,
        ncm: '85443000',
        cfop: '7101',
        unidade: 'PC',
        quantidade: qtd,
        valorUnitario: unit,
        valorTotal: total,
        situacao: 'conferido',
        modificado: false,
      };
    }),
    totais: {
      valorProdutos: '625800.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '625800.00',
      pesoLiquido: '8400.000',
      pesoBruto: '8900.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 4: demo-04 — Inconsistências Fiscais Simuladas (12 itens)
  // -------------------------------------------------------------------------
  {
    id: 'demo-04',
    numero: '000.012.789',
    serie: '1',
    chaveAcesso: '31241111122233000144550010000127891004433221',
    tipoDocumento: 'XML',
    naturezaOperacao: 'EXPORTACAO DE CALCADOS DE COURO',
    dataEmissao: '2026-10-22T16:00:00Z',
    status: 'com_inconsistencias',
    isDemo: true,
    emitente: {
      cnpj: '11.122.233/0001-44',
      razaoSocial: 'Calçados Vale do Rio Doce Ltda',
      uf: 'SP',
      municipio: 'Franca',
    },
    destinatario: {
      nome: 'Fashion Footwear Group S.L.',
      pais: 'Espanha',
      paisCodigo: 'ES',
      idEstrangeiro: 'ESB98765432',
    },
    itens: [
      { id: 'd4-1', item: 1, codigo: 'CALC-001', descricao: 'Sapato Social Oxford Couro Legítimo', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '100.0000', valorUnitario: '85.0000', valorTotal: '8500.00', situacao: 'conferido', modificado: false },
      { id: 'd4-2', item: 2, codigo: 'CALC-002', descricao: 'Mocassim Masculino Confort Café', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '120.0000', valorUnitario: '75.0000', valorTotal: '9000.00', situacao: 'conferido', modificado: false },
      // Inconsistência 1: CFOP 5102 (venda interna) em nota de exportação
      { id: 'd4-3', item: 3, codigo: 'CALC-003', descricao: 'Bota Cano Curto Feminina Couro', ncm: '64035910', cfop: '5102', unidade: 'PAR', quantidade: '80.0000', valorUnitario: '95.0000', valorTotal: '7600.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'erro', campo: 'cfop', mensagem: 'CFOP 5102 não permitido em operação para o exterior. CFOP deve iniciar com 7 (ex: 7101).', esperado: '7101', encontrado: '5102' }] },
      { id: 'd4-4', item: 4, codigo: 'CALC-004', descricao: 'Sandália Rasteira em Couro Nobuck', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '150.0000', valorUnitario: '40.0000', valorTotal: '6000.00', situacao: 'conferido', modificado: false },
      // Inconsistência 2: Divergência matemática (100 * 45 = 4500, gravado 4000)
      { id: 'd4-5', item: 5, codigo: 'CALC-005', descricao: 'Sapatilha Casual Couro Natural', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '100.0000', valorUnitario: '45.0000', valorTotal: '4000.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'erro', campo: 'valorTotal', mensagem: 'Divergência matemática: 100 x 45,00 resulta em 4.500,00, mas valor total gravado é 4.000,00.', esperado: '4500.00', encontrado: '4000.00' }] },
      { id: 'd4-6', item: 6, codigo: 'CALC-006', descricao: 'Tênis Casual em Couro Floater', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '90.0000', valorUnitario: '90.0000', valorTotal: '8100.00', situacao: 'conferido', modificado: false },
      { id: 'd4-7', item: 7, codigo: 'CALC-007', descricao: 'Scarpin Salto Médio Fino', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '110.0000', valorUnitario: '70.0000', valorTotal: '7700.00', situacao: 'conferido', modificado: false },
      // Inconsistência 3: NCM inválido de 7 dígitos (falta o 8º dígito)
      { id: 'd4-8', item: 8, codigo: 'CALC-008', descricao: 'Bota Montaria Couro Vintage', ncm: '6403590', cfop: '7101', unidade: 'PAR', quantidade: '60.0000', valorUnitario: '120.0000', valorTotal: '7200.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'erro', campo: 'ncm', mensagem: 'NCM inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos.', esperado: '64035910', encontrado: '6403590' }] },
      { id: 'd4-9', item: 9, codigo: 'CALC-009', descricao: 'Chinelo Slide em Couro Premium', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '200.0000', valorUnitario: '35.0000', valorTotal: '7000.00', situacao: 'conferido', modificado: false },
      { id: 'd4-10', item: 10, codigo: 'CALC-010', descricao: 'Cinto em Couro Legítimo Fivela Fosca', ncm: '42033000', cfop: '7101', unidade: 'UN', quantidade: '300.0000', valorUnitario: '25.0000', valorTotal: '7500.00', situacao: 'conferido', modificado: false },
      // Inconsistência 4: Unidade METROS em produto de pares
      { id: 'd4-11', item: 11, codigo: 'CALC-011', descricao: 'Coturno Militar em Couro Hidrofugado', ncm: '64035910', cfop: '7101', unidade: 'METROS', quantidade: '70.0000', valorUnitario: '130.0000', valorTotal: '9100.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'aviso', campo: 'unidade', mensagem: 'Unidade comercial METROS divergente da unidade padrão aduaneira PAR para este NCM.', esperado: 'PAR', encontrado: 'METROS' }] },
      { id: 'd4-12', item: 12, codigo: 'CALC-012', descricao: 'Carteira Masculina Couro Bovino', ncm: '42023100', cfop: '7101', unidade: 'UN', quantidade: '320.0000', valorUnitario: '30.0000', valorTotal: '9600.00', situacao: 'conferido', modificado: false },
    ],
    totais: {
      valorProdutos: '89300.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '89300.00',
      pesoLiquido: '1100.000',
      pesoBruto: '1240.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 5: demo-05 — Produtos Repetidos em Lotes Múltiplos (15 itens)
  // -------------------------------------------------------------------------
  {
    id: 'demo-05',
    numero: '000.205.670',
    serie: '3',
    chaveAcesso: '50241177788899000122550030002056701001122334',
    tipoDocumento: 'XML',
    naturezaOperacao: 'EXPORTAÇÃO DE GRÃOS AGRÍCOLAS EM LOTES',
    dataEmissao: '2026-10-25T11:20:00Z',
    status: 'dividido',
    isDemo: true,
    emitente: {
      cnpj: '77.788.899/0001-22',
      razaoSocial: 'Cooperativa Agroindustrial Centro-Oeste',
      uf: 'MT',
      municipio: 'Cuiabá',
    },
    destinatario: {
      nome: 'Asian Grain Corporation',
      pais: 'China',
      paisCodigo: 'CN',
      idEstrangeiro: 'CN-SHA-100293',
    },
    itens: [
      // 3 produtos repetidos em 5 lotes cada (15 itens)
      { id: 'd5-1', item: 1, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L01', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '50.0000', valorUnitario: '400.0000', valorTotal: '20000.00', situacao: 'conferido', modificado: false },
      { id: 'd5-2', item: 2, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L01', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '60.0000', valorUnitario: '350.0000', valorTotal: '21000.00', situacao: 'conferido', modificado: false },
      { id: 'd5-3', item: 3, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L01', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '70.0000', valorUnitario: '380.0000', valorTotal: '26600.00', situacao: 'conferido', modificado: false },

      { id: 'd5-4', item: 4, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L02', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '55.0000', valorUnitario: '400.0000', valorTotal: '22000.00', situacao: 'conferido', modificado: false },
      { id: 'd5-5', item: 5, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L02', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '65.0000', valorUnitario: '350.0000', valorTotal: '22750.00', situacao: 'conferido', modificado: false },
      { id: 'd5-6', item: 6, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L02', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '75.0000', valorUnitario: '380.0000', valorTotal: '28500.00', situacao: 'conferido', modificado: false },

      { id: 'd5-7', item: 7, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L03', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '52.0000', valorUnitario: '400.0000', valorTotal: '20800.00', situacao: 'conferido', modificado: false },
      { id: 'd5-8', item: 8, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L03', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '62.0000', valorUnitario: '350.0000', valorTotal: '21700.00', situacao: 'conferido', modificado: false },
      { id: 'd5-9', item: 9, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L03', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '72.0000', valorUnitario: '380.0000', valorTotal: '27360.00', situacao: 'conferido', modificado: false },

      { id: 'd5-10', item: 10, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L04', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '58.0000', valorUnitario: '400.0000', valorTotal: '23200.00', situacao: 'conferido', modificado: false },
      { id: 'd5-11', item: 11, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L04', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '68.0000', valorUnitario: '350.0000', valorTotal: '23800.00', situacao: 'conferido', modificado: false },
      { id: 'd5-12', item: 12, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L04', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '78.0000', valorUnitario: '380.0000', valorTotal: '29640.00', situacao: 'conferido', modificado: false },

      { id: 'd5-13', item: 13, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L05', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '60.0000', valorUnitario: '400.0000', valorTotal: '24000.00', situacao: 'conferido', modificado: false },
      { id: 'd5-14', item: 14, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L05', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '70.0000', valorUnitario: '350.0000', valorTotal: '24500.00', situacao: 'conferido', modificado: false },
      { id: 'd5-15', item: 15, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L05', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '74.0000', valorUnitario: '380.0000', valorTotal: '28150.00', situacao: 'conferido', modificado: false },
    ],
    totais: {
      valorProdutos: '342000.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '342000.00',
      pesoLiquido: '964.000',
      pesoBruto: '985.000',
    },
  },
];

// ---------------------------------------------------------------------------
// Baseline de Notas Preparadas (resultantes de divisão simulada)
// ---------------------------------------------------------------------------
export const MOCK_PREPARED_INVOICES = [
  {
    id: 'prep-01',
    numero: '000.205.670-A',
    serie: '1',
    parentInvoiceId: 'demo-05',
    origemNumero: '000.205.670',
    status: 'preparado',
    dataCriacao: '2026-10-26T09:00:00Z',
    destinatario: { nome: 'Asian Grain Corporation', pais: 'China' },
    quantidadeItens: 6,
    valorTotalNota: '134750.00',
    descricaoLote: 'Contêiner Marítimo 01 - Soja e Milho Lotes L01-L02',
  },
  {
    id: 'prep-02',
    numero: '000.205.670-B',
    serie: '1',
    parentInvoiceId: 'demo-05',
    origemNumero: '000.205.670',
    status: 'preparado',
    dataCriacao: '2026-10-26T09:15:00Z',
    destinatario: { nome: 'Asian Grain Corporation', pais: 'China' },
    quantidadeItens: 9,
    valorTotalNota: '207250.00',
    descricaoLote: 'Contêiner Marítimo 02 - Sorgo e Restante de Lotes',
  },
];

/**
 * Retorna as notas com propriedades flat adicionais para pesquisa instantânea no DataTable.
 * @returns {Array}
 */
export function getMockInvoices() {
  return MOCK_INVOICES.map(inv => ({
    ...inv,
    // Propriedades achatadas para filtro textual do DataTable
    emitenteNome: inv.emitente?.razaoSocial || '',
    emitenteCnpj: inv.emitente?.cnpj || '',
    destinatarioNome: inv.destinatario?.nome || '',
    destinatarioPais: inv.destinatario?.pais || '',
    quantidadeItens: inv.itens?.length || 0,
    valorTotalFormatado: inv.totais?.valorTotalNota || '0.00',
  }));
}

/**
 * Retorna nota mock por ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getMockInvoiceById(id) {
  const list = getMockInvoices();
  return list.find(inv => inv.id === id) || null;
}

/**
 * Retorna notas preparadas mock.
 * @returns {Array}
 */
export function getMockPreparedInvoices() {
  return [...MOCK_PREPARED_INVOICES];
}

/**
 * Calcula dinamicamente os 5 KPIs do Dashboard.
 * @returns {Object}
 */
export function getDashboardKPIs() {
  const invoices = getMockInvoices();
  const prepared = getMockPreparedInvoices();

  const totalNotas = invoices.length;
  const totalProdutos = invoices.reduce((acc, inv) => acc + (inv.itens?.length || 0), 0);
  const aguardandoValidacao = invoices.filter(
    inv => inv.status === 'com_inconsistencias' || inv.status === 'em_conferencia'
  ).length;
  const notasPreparadas = prepared.length;

  const valorTotalDemonstrado = invoices.reduce((acc, inv) => {
    const val = parseFloat(inv.totais?.valorTotalNota || '0');
    return acc + (Number.isNaN(val) ? 0 : val);
  }, 0);

  return {
    totalNotas,
    totalProdutos,
    aguardandoValidacao,
    notasPreparadas,
    valorTotalDemonstrado,
  };
}
```

---

### 4.5 `app/dashboard/page.jsx`

Este é o arquivo principal a ser substituído. Ele:
- Remove totalmente o `localStorage.getItem('isAuthenticated')` e a dependência de `/login`;
- Utiliza `AppLayout` com breadcrumbs `Dashboard`;
- Exibe os 5 KPI Cards fiscais com ícones FontAwesome e semântica visual;
- Oferece barra de ações rápidas com botões de acesso direto a cada um dos 5 cenários demo;
- Exibe a tabela de documentos recentes utilizando o `DataTable` com `columns` explícitas e botões de ação com links funcionais para `/documentos/[id]/conferencia`, `/documentos/[id]/divisao` e `/documentos/[id]/validacao`.

```jsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice,
  faBoxesStacked,
  faTriangleExclamation,
  faClipboardCheck,
  faCoins,
  faFileImport,
  faListAlt,
  faArrowRight,
  faCheckCircle,
  faPlay,
  faShieldHalved,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import DataTable from '@/components/table/DataTable';
import Button from '@/components/buttons/Button';
import Card, { CardBody } from '@/components/cards/Card';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';
import { getStatusLabel, getStatusColor, STATUS_CONFIG } from '@/lib/formatters/status';
import { getMockInvoices, getDashboardKPIs } from '@/lib/data/mockInvoices';

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  // Dados mockados e KPIs
  const [invoices, setInvoices] = useState(() => getMockInvoices());
  const kpis = useMemo(() => getDashboardKPIs(), [invoices]);

  // Ação de carga rápida de cenário demo
  const handleLoadScenario = (scenarioId, label) => {
    toast.info(`Carregando cenário ${label} para conferência...`);
    router.push(`/documentos/${scenarioId}/conferencia`);
  };

  // Definição das colunas explícitas para o DataTable
  const columns = useMemo(() => [
    {
      key: 'numero',
      label: 'Número / Série',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              NF-e {item.numero}
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                item.tipoDocumento === 'XML'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
              }`}
            >
              {item.tipoDocumento}
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Série {item.serie} &bull; {formatDateBR(item.dataEmissao)}
          </span>
        </div>
      ),
    },
    {
      key: 'emitente',
      label: 'Emitente',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col max-w-[220px]">
          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate" title={item.emitente?.razaoSocial}>
            {item.emitente?.razaoSocial}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            CNPJ: {item.emitente?.cnpj} ({item.emitente?.uf})
          </span>
        </div>
      ),
    },
    {
      key: 'destinatario',
      label: 'Destinatário / País',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate" title={item.destinatario?.nome}>
            {item.destinatario?.nome}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>🌐 {item.destinatario?.pais}</span>
            {item.destinatario?.paisCodigo && (
              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded font-mono">
                {item.destinatario?.paisCodigo}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'itens',
      label: 'Itens',
      align: 'center',
      render: (item) => (
        <div className="text-center">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {item.itens?.length || 0} itens
          </span>
        </div>
      ),
    },
    {
      key: 'valor',
      label: 'Valor Total',
      align: 'right',
      render: (item) => (
        <div className="text-right">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatBRL(item.totais?.valorTotalNota)}
          </span>
          {item.totais?.valorFrete && item.totais.valorFrete !== '0.00' && (
            <div className="text-[10px] text-slate-400">
              Frete: {formatBRL(item.totais.valorFrete)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (item) => {
        const dotColor = STATUS_CONFIG[item.status]?.dot || 'bg-slate-400';
        return (
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {getStatusLabel(item.status)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'acoes',
      label: 'Ações',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <Link
            href={`/documentos/${item.id}/conferencia`}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-xs"
            title="Abrir conferência de itens"
          >
            <span>Conferir</span>
          </Link>
          <Link
            href={`/documentos/${item.id}/divisao`}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded transition-colors"
            title="Dividir produtos em notas preparadas"
          >
            <span>Dividir</span>
          </Link>
          {item.status === 'com_inconsistencias' && (
            <Link
              href={`/documentos/${item.id}/validacao`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 rounded transition-colors"
              title="Auditar inconsistências fiscais"
            >
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3 text-red-600" />
            </Link>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Painel Operacional de NF-e de Exportação
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Preparação, auditoria de itens fiscais e desmembramento para comércio exterior
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/documentos/importar">
              <Button buttonType="primary" size="medium" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="w-4 h-4" />
                <span>Importar NF-e</span>
              </Button>
            </Link>
            <Link href="/documentos">
              <Button buttonType="ghost" bordered={true} size="medium" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faListAlt} className="w-4 h-4" />
                <span>Ver Todos Documentos</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 5 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Notas Importadas */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notas Importadas
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {kpis.totalNotas}
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                5 cenários fiscais carregados
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faFileInvoice} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total de Produtos */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total de Produtos
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {kpis.totalProdutos}
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                Itens fiscais auditáveis
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faBoxesStacked} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Aguardando Validação */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Aguardando Validação
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {kpis.aguardandoValidacao}
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                1 nota com erros simulados
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Notas Preparadas */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notas Preparadas
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {kpis.notasPreparadas}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Geradas a partir de divisão
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faClipboardCheck} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 5: Valor Total Demonstrado */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Valor Total Demonstrado
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 truncate" title={formatBRL(kpis.valorTotalDemonstrado)}>
                {formatBRL(kpis.valorTotalDemonstrado)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Volume sob preparação
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faCoins} className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Vitrine de Acesso Rápido aos Cenários Demo */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
                <FontAwesomeIcon icon={faPlay} className="w-3.5 h-3.5 text-amber-400" />
                <span>Carregamento Rápido de Cenários de Demonstração</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Clique em qualquer cenário para abrir diretamente a tela de conferência detalhada:
              </p>
            </div>
            <span className="text-[11px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded font-mono">
              Ambiente de Avaliação Contábil
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <button
              onClick={() => handleLoadScenario('demo-01', 'Demo 01 (Agroexport)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none"
            >
              <span className="text-xs font-bold text-white">Demo 01 — XML Agro</span>
              <span className="text-[11px] text-blue-200">8 itens (Café/Soja)</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 291.200,00</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-02', 'Demo 02 (Metalúrgica)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none"
            >
              <span className="text-xs font-bold text-white">Demo 02 — PDF Metal</span>
              <span className="text-[11px] text-blue-200">25 itens metalmecânicos</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 148.750,00</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-03', 'Demo 03 (Eletroparts)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none"
            >
              <span className="text-xs font-bold text-white">Demo 03 — Stress Test</span>
              <span className="text-[11px] text-blue-200">50 itens automotivos</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 625.800,00</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-04', 'Demo 04 (Inconsistências)')}
              className="flex flex-col text-left p-2.5 rounded bg-red-950/50 hover:bg-red-900/50 transition-all border border-red-500/40 hover:border-red-400 focus:outline-none"
            >
              <span className="text-xs font-bold text-red-200 flex items-center justify-between">
                <span>Demo 04 — Erros</span>
                <span className="text-[9px] bg-red-800 text-white px-1 rounded">Atenção</span>
              </span>
              <span className="text-[11px] text-red-300">12 itens com alertas</span>
              <span className="text-[10px] text-red-400 mt-1">CFOP / NCM / Matemática</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-05', 'Demo 05 (Lotes Múltiplos)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none"
            >
              <span className="text-xs font-bold text-white">Demo 05 — Lotes Repetidos</span>
              <span className="text-[11px] text-blue-200">15 itens (Soja/Milho/Sorgo)</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 342.000,00</span>
            </button>
          </div>
        </div>

        {/* Tabela de Documentos Recentes */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <DataTable
            data={invoices}
            columns={columns}
            dense={false}
            mainText="Documentos Recentes para Preparação de Exportação"
            action={
              <Link
                href="/documentos"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1 mr-2"
              >
                <span>Ver todos</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" />
              </Link>
            }
          />
        </div>
      </div>
    </AppLayout>
  );
}
```

---

## 5. Casos de Borda e Mitigações

1. **Tentativa de Autenticação / Redirecionamento Indesejado**:
   - *Risco:* Qualquer código remanescente que tente validar `isAuthenticated` no `localStorage` redireciona para `/login`.
   - *Mitigação:* `app/dashboard/page.jsx` remove 100% de qualquer chamada a `localStorage.getItem('isAuthenticated')` ou `router.push('/login')`. O acesso à tela torna-se instantâneo e livre.
2. **Formatação de Moeda com Valores Nulos ou Inválidos**:
   - *Risco:* Validação de itens incompletos resultando em `NaN` na tela.
   - *Mitigação:* `formatBRL` em `app/lib/formatters/currency.js` trata `null`, `undefined`, `''`, `NaN` e strings com vírgula ou ponto, retornando seguramente `"R$ 0,00"`.
3. **Fusos Horários em Datas Fiscais (Off-by-one Day)**:
   - *Risco:* String de data `"2026-10-15"` renderizada como `"14/10/2026"` devido ao timezone local do navegador em GMT-3.
   - *Mitigação:* `formatDateBR` em `app/lib/formatters/dates.js` força `timeZone: 'UTC'` para datas em formato `YYYY-MM-DD`, garantindo que o dia emitido seja exatamente o exibido.
4. **Filtro de Busca Textual no `DataTable` com Objetos Aninhados**:
   - *Risco:* `DataTable.jsx` faz busca usando `Object.values(item)`. Como emitente e destinatário são objetos aninhados, a busca por "Agroexport" falharia se baseada apenas nas chaves de nível superior.
   - *Mitigação:* `getMockInvoices()` em `mockInvoices.js` fornece propriedades achatadas (`emitenteNome`, `emitenteCnpj`, `destinatarioNome`, `destinatarioPais`), permitindo busca instantânea por emitente, destinatário, CNPJ ou país diretamente na tabela.
5. **Dark Mode e Aderência Visual**:
   - *Risco:* Cores sem contraste ou quebras no modo escuro.
   - *Mitigação:* Todos os componentes utilizam pares de classes semânticas `dark:...` do Tailwind CSS 4 alinhados com `globals.css`.

---

## 6. Plano de Verificação e Critérios de Aceite

| # | Item de Teste | Método de Verificação | Critério de Sucesso |
|---|---------------|-----------------------|---------------------|
| 1 | Servidor Dev Ativo | `node -e "fetch('http://localhost:3000/dashboard')..."` | HTTP 200 retornado sem redirecionamento 307/302 para `/login` |
| 2 | Remoção de Auth Check | Inspecionar código de `app/dashboard/page.jsx` | 0 ocorrências de `isAuthenticated` e `/login` |
| 3 | Presença dos 5 KPIs | Validar texto HTML da página | 5 cards presentes ("Notas Importadas", "Total de Produtos", "Aguardando Validação", "Notas Preparadas", "Valor Total Demonstrado") |
| 4 | Botões de Ação Rápida | Validar botões e links | Botões "Importar NF-e" e 5 atalhos para os cenários demo |
| 5 | Tabela com `columns` | Renderização do `DataTable` | 7 colunas explícitas renderizadas com badges e botões de ação |
| 6 | Formatação BRL e Datas | Teste unitário de formatters | Moedas formatadas com `R$` e datas no formato `DD/MM/AAAA` sem dependência de `moment` |
| 7 | Lint Estático | `npx eslint app/dashboard/page.jsx app/lib/` | 0 erros impeditivos de lint |
