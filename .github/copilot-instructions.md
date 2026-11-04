# SmartNFe — Agent Instructions

## Visão Geral

SmartNFe é uma plataforma de preparação inteligente de notas fiscais eletrônicas de exportação.
Esta é a **Fase 1 — Frontend MVP com dados mockados**, desenvolvida em Next.js 16, React 19, Tailwind CSS 4 e JavaScript/JSX.

**Objetivo:** Permitir que uma contadora avalie a experiência do sistema antes do desenvolvimento da API backend.

---

## Repositórios

- **Frontend (este repositório):** https://github.com/AtanaelMendes/smart-nfe
- **Backend (referência — NÃO modificar):** https://github.com/AtanaelMendes/smart-nfe-api

---

## Stack

- Next.js 16 com App Router
- React 19
- JavaScript/JSX (não converter para TypeScript nesta fase)
- Tailwind CSS 4
- Font Awesome 7 (`@fortawesome/react-fontawesome`)
- `clsx` + `tailwind-merge` → utilitário `cn()` em `app/assets/utils.js`
- pnpm (respeitar `pnpm-lock.yaml`)

---

## Regras de Reutilização de Componentes

**OBRIGATÓRIO antes de criar qualquer componente:**

1. Verificar se existe equivalente em `app/components/`
2. Se existir e atender → reutilizar
3. Se existir, mas precisar de melhorias → evoluir o original (sem quebrar outros usos)
4. Criar componente novo apenas se a responsabilidade for realmente diferente
5. Nunca duplicar JSX, estilos ou lógica entre telas
6. Centralizar formatação de moeda, datas, quantidades, números e status em `app/lib/formatters/`

### Componentes existentes a reutilizar

```
app/components/buttons/Button.jsx           → botões com variantes (primary, success, danger, warning, ghost)
app/components/cards/Card.jsx               → Card, CardTitle, CardBody, CardActions, CardImage
app/components/inputs/InputText.jsx         → input com máscaras (CPF, CNPJ, CEP, phone, currency)
app/components/inputs/InputNumber.jsx       → input numérico
app/components/inputs/InputFile.jsx         → drag-and-drop de arquivos (ADAPTAR para XML/PDF)
app/components/inputs/Select.jsx            → select
app/components/inputs/Checkbox.jsx          → checkbox
app/components/table/DataTable.jsx          → tabela genérica (ADAPTAR para colunas explícitas)
app/components/Layouts/Dialog.jsx           → modal de confirmação com textarea opcional
app/components/Layouts/Pagination.jsx       → paginação com seletor de itens por página
app/components/Layouts/Skeleton.jsx         → Skeleton, FormSkeleton, SkeletonList
app/components/Layouts/NoDataFound.jsx      → estado vazio
app/components/Layouts/PageTabs.jsx         → abas
app/components/Layouts/Sidebar.jsx          → SUBSTITUIR navegação por menus SmartNFe
app/assets/utils.js                         → cn(), formatAnyDateInDDMMYYYY(), numberToReais(), empty()
```

---

## Arquitetura de Arquivos

```
app/
├── components/
│   ├── Layouts/          → componentes de layout (Sidebar, Dialog, Pagination, etc.)
│   ├── buttons/
│   ├── cards/
│   ├── inputs/
│   ├── table/
│   └── fiscal/           → componentes de domínio fiscal
│       ├── InvoiceHeader.jsx
│       ├── InvoiceStatus.jsx
│       ├── InvoiceItemsTable.jsx
│       ├── InvoiceItemEditor.jsx
│       ├── InvoiceTotals.jsx
│       ├── DocumentPreview.jsx
│       ├── DivisionWorkspace.jsx
│       ├── DivisionSummary.jsx
│       └── ValidationPanel.jsx
├── dashboard/            → /dashboard
├── documentos/           → /documentos e /documentos/[id]/...
│   └── [id]/
│       ├── conferencia/
│       ├── divisao/
│       └── validacao/
├── notas-preparadas/     → /notas-preparadas
├── configuracoes/        → /configuracoes
├── features/             → lógica de negócio separada da UI
│   ├── invoices/
│   │   ├── invoiceService.js
│   │   ├── mockInvoiceRepository.js
│   │   └── invoiceSchemas.js
│   ├── documents/
│   │   ├── documentService.js
│   │   └── mockDocumentRepository.js
│   ├── division/
│   │   ├── divisionService.js
│   │   └── mockDivisionRepository.js
│   └── validation/
│       ├── validationService.js
│       └── validationRules.js
├── lib/
│   ├── data/
│   │   ├── mockInvoices.js     → dados de NF-e fictícios (5 cenários)
│   │   ├── mockProducts.js     → produtos com NCM, CFOP, unidades
│   │   └── mockCompanies.js    → empresas emitentes/destinatárias
│   ├── formatters/
│   │   ├── currency.js         → formatBRL(), parseBRL()
│   │   ├── dates.js            → formatDateBR(), formatDateTimesBR()
│   │   ├── numbers.js          → formatQuantity(), formatDecimal()
│   │   └── status.js           → getStatusLabel(), getStatusColor()
│   ├── calculations/
│   │   ├── invoiceTotals.js    → calcularTotais(), recalcularNota()
│   │   └── division.js         → calcularSaldo(), validarDistribuicao()
│   └── storage/
│       └── localStorageService.js  → save/load/reset com schema versionado
└── context/
    └── AppContext.jsx           → darkMode, notifications, settings
```

---

## Contrato de Repositório (Mock → API futura)

Todos os repositórios devem seguir este padrão para facilitar a futura substituição pela API PHP:

```js
const invoiceRepository = {
  list: async (filters) => {},          // → GET /api/invoices
  findById: async (id) => {},           // → GET /api/invoices/:id
  update: async (id, data) => {},       // → PUT /api/invoices/:id
  updateItem: async (id, itemId, data) => {}, // → PUT /api/invoices/:id/items/:itemId
  getValidationIssues: async (id) => {}, // → GET /api/invoices/:id/validation
};
```

**Nesta fase:** implementações mockadas que consultam `app/lib/data/`.
**Fase futura:** substituir a implementação sem reescrever as telas.

---

## Telas Obrigatórias

| Tela | Rota | Prioridade |
|------|------|------------|
| Dashboard | `/dashboard` | Alta |
| Importar NF-e | `/documentos/importar` | Alta |
| Documentos | `/documentos` | Alta |
| Conferência | `/documentos/[id]/conferencia` | **Crítica** |
| Divisão | `/documentos/[id]/divisao` | Alta |
| Validação | `/documentos/[id]/validacao` | Alta |
| Notas Preparadas | `/notas-preparadas` | Média |
| Configurações | `/configuracoes` | Média |

---

## Dados Mockados

### Cenários obrigatórios

| ID | Descrição | Itens |
|----|-----------|-------|
| `demo-01` | NF-e XML padrão | 8 |
| `demo-02` | NF-e PDF exportação | 25 |
| `demo-03` | NF-e grande | 50 |
| `demo-04` | NF-e com inconsistências | 12 |
| `demo-05` | NF-e com produtos repetidos | 15 |

### Formato de produto

```js
{
  id: "uuid",
  item: 1,
  codigo: "PROD-001",
  descricao: "Descrição do produto",
  ncm: "12345678",
  cfop: "7101",
  unidade: "KG",
  quantidade: "10.000",         // string decimal (evitar float)
  valorUnitario: "25.5000",     // string decimal
  valorTotal: "255.00",         // string decimal
  situacao: "pendente" | "conferido" | "inconsistente",
  modificado: false,
  valorOriginal: { ... }        // cópia dos valores originais
}
```

**Regra:** Usar strings decimais para valores de negócio. Centralizar cálculos em `app/lib/calculations/`.

---

## Identidade Visual SmartNFe

### Cores (já configuradas em `globals.css`)
- **Primário:** `--color-primary: rgb(28, 100, 242)` → azul
- **Sucesso:** `--color-success: rgb(34, 197, 94)` → verde
- **Aviso:** `--color-warning: rgb(255, 100, 0)` → laranja
- **Perigo:** `--color-danger: rgb(255, 0, 0)` → vermelho

### Diretrizes de UI
- Interface limpa, profissional, discreta
- Tema claro como padrão; suporte a tema escuro via `.dark`
- Tabelas compactas (densidade configurável)
- Sidebar lateral recolhível
- Cabeçalho compacto com breadcrumbs
- **Badge "Modo Demonstração"** em todas as telas
- Sem gráficos sem utilidade clara
- Sem excesso de cards coloridos
- Priorizar produtividade e densidade de informação
- Layout otimizado para desktop/notebook

---

## Persistência Local

```js
// Esquema versionado
const STORAGE_SCHEMA_VERSION = "1.0.0";

localStorageService.save(key, data);    // salva com versão
localStorageService.load(key);          // verifica versão, retorna null se incompatível
localStorageService.reset(key);         // restaura dados iniciais
localStorageService.resetAll();         // restaura todos os cenários
```

**Permitido armazenar:** estado dos cenários fictícios, preferências de UI
**Proibido armazenar:** XMLs fiscais, PDFs reais, dados pessoais

---

## Configuração Next.js

```js
// next.config.js — configuração SmartNFe
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // SEM basePath
  // SEM output: 'export' (usar build padrão Vercel)
  env: {
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE || 'demo',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'SmartNFe',
  },
};
```

### .env.local
```env
NEXT_PUBLIC_APP_MODE=demo
NEXT_PUBLIC_APP_NAME=SmartNFe
```

---

## Comandos de Desenvolvimento

```bash
pnpm install          # instalar dependências
pnpm dev              # servidor de desenvolvimento
pnpm lint             # verificar erros
pnpm build            # build de produção
```

---

## Regras de Qualidade

1. **Build sem erros** — não ignorar erros de lint/build para publicar
2. **Sem botões sem função** — todo elemento interativo deve ter comportamento
3. **Estados obrigatórios** — loading, erro, sucesso, vazio, confirmação
4. **Navegação por teclado** — Tab/Enter na tabela de produtos
5. **Dados consistentes** — editar produto em /conferencia reflete em /divisao e /validacao
6. **Sem API real** — nenhuma chamada HTTP nesta fase
7. **Sem tela de login fictícia** — acesso direto ao sistema demo

---

## O Que NÃO Fazer

- ❌ Recriar o projeto do zero
- ❌ Converter para TypeScript
- ❌ Criar chamadas HTTP reais
- ❌ Implementar autenticação fictícia como segurança real
- ❌ Usar `output: 'export'` ou `basePath: '/saas'`
- ❌ Modificar o repositório `smart-nfe-api`
- ❌ Fazer deploy sem autorização
- ❌ Duplicar componentes que fazem a mesma coisa
- ❌ Espalhar arrays mockados diretamente nos componentes JSX
- ❌ Usar ponto flutuante para valores monetários/fiscais

---

## Sequência de Implementação

```
Etapa A — Auditoria       → Inspecionar componentes, dependências, incompatibilidades
Etapa B — Fundação        → next.config.js, layout, Sidebar SmartNFe, identidade visual
Etapa C — Mocks           → lib/data/, lib/formatters/, lib/calculations/, features/
Etapa D — Telas           → 8 telas usando componentes compartilhados
Etapa E — Integração      → Conectar telas aos mesmos dados, implementar todas as ações
Etapa F — Qualidade       → Testes, lint, build
Etapa G — Vercel          → Documentação de deploy, README, relatório de componentes
```

---

## Critérios de Aceite

A fase está concluída quando:
- [ ] 8 telas implementadas e navegáveis
- [ ] Layout consistente com identidade SmartNFe
- [ ] Importação simulada funcional
- [ ] Conferência permite editar produtos com persistência
- [ ] Divisão permite distribuir produtos entre notas
- [ ] Totais atualizados coerentemente
- [ ] Validação demonstrativa identifica inconsistências
- [ ] Componentes existentes reutilizados adequadamente
- [ ] `pnpm build` sem erros
- [ ] Pronto para Vercel sem necessidade de API
