# SmartNFe — Especificação Funcional e Técnica Completa (Fase 1: MVP Frontend com Mocks)

**Documento:** Levantamento de Especificações e Requisitos de Negócio  
**Autor:** Agente Investigador de Especificações (`teamwork_spec_miner_survey_2`)  
**Data:** 04/11/2026  
**Status:** Aprovado para Decomposição e Planejamento Arquitetural  

---

## 1. Visão Geral e Contexto de Negócio

O **SmartNFe** é uma plataforma de preparação inteligente de Notas Fiscais Eletrônicas (NF-e) voltada primariamente para o mercado de **exportação**. No fluxo tradicional de comércio exterior brasileiro, despachantes aduaneiros e contadoras recebem arquivos de NF-e (XML emitidos ou extrações de relatórios em PDF) e precisam:
1. **Conferir minuciosamente os itens** (classificação fiscal NCM, CFOP de exportação iniciado em 7xxx, unidades comerciais e aduaneiras, quantidades com alta precisão decimal, valores unitários e totais sem erros de arredondamento);
2. **Dividir/desmembrar notas volumosas em duas ou mais notas preparadas de destino**, respeitando lotes de contêineres, limitações de peso, limites de valor ou exigências alfandegárias de desembaraço;
3. **Validar inconsistências fiscais** antes de submissão à SEFAZ ou ao SISCOMEX, identificando discrepâncias de cálculo, divergências de CFOP interno/interestadual em notas de exportação ou inconsistências cadastrais.

Esta **Fase 1 (Frontend MVP com dados mockados)** tem como meta disponibilizar uma aplicação rica, rápida, densa e plenamente funcional no navegador para que a contadora usuária avalie todos os fluxos operacionais com dados reais simulados, sem depender do backend PHP (`smart-nfe-api`).

---

## 2. Inventário de Recursos Descobertos (Features Discovered)

| # | Categoria | Feature | Descrição | Entradas | Saídas | Comportamento de Erro | Descoberto Via |
|---|-----------|---------|-----------|----------|--------|-----------------------|----------------|
| 1 | Fundação | SmartNFe Layout & Shell | Estrutura de layout unificada com sidebar recolhível, cabeçalho compacto com breadcrumbs e badge "Modo Demo" permanente | Rota atual, estado collapsed do menu, evento toggle | Shell responsivo com navegação lateral e topo | Rota inexistente redireciona ou exibe 404 limpo | `AppLayout.jsx`, `SmartNFeSidebar.jsx` |
| 2 | Fundação | AppContext Central | Provedor de contexto global com fila de toasts, dark mode e preferências do usuário | Mensagem de toast, toggle dark mode, alteração de configurações | Notificações visuais auto-dismiss, tema `.dark`, estado reativo | Falha no localStorage não derruba a aplicação (try/catch seguro) | `AppContext.jsx` |
| 3 | Fundação | InputFile XML/PDF | Componente drag-and-drop adaptado para receber arquivos fiscais XML e PDF até 10MB | Arquivo arrastado ou selecionado (`.xml`, `.pdf`) | Objeto `File` e callback `onChange(id, file)` | Toast de erro caso extensão != xml/pdf ou tamanho > 10MB | `InputFile.jsx`, `copilot-instructions.md` |
| 4 | Fundação | DataTable com Colunas Explícitas | Tabela de alta performance com suporte a `columns` `{key, label, align, render}`, filtro rápido e densidade compacta | Array de dados, array de colunas, flag `dense` | Tabela HTML estilizada com zebra striping e hover | Exibe estado "Não há dados para exibir..." se vazio | `DataTable.jsx`, R1 |
| 5 | Mocks | 5 Cenários Mockados | Conjunto de 5 notas fiscais de exportação com perfis distintos (8, 25, 50, 12 e 15 itens) em `lib/data/` | ID do cenário (`demo-01` a `demo-05`) | Documento NF-e completo com itens, emitente, destinatário e totais | Se ID inexistente, retorna `null` ou erro controlado | R2, `ORIGINAL_REQUEST.md` |
| 6 | Mocks | Repositório Assíncrono de Invoices | Contrato padrão assíncrono para abstração da camada de dados (`list`, `findById`, `update`, `updateItem`, `getValidationIssues`) | Filtros, ID, dados parciais, itemId | Promises resolvendo entidades tipadas | Rejeita Promise com mensagem amigável ou status de erro | R2, `copilot-instructions.md` |
| 7 | Formatação | Central de Formatadores | Módulos utilitários desacoplados em `lib/formatters/` para moeda BRL, datas BR, quantidades fiscais e status | Valores brutos (string, number, date) | Strings formatadas para o padrão pt-BR | Retorna fallback vazio ou padrão sem quebrar a tela | R2, `copilot-instructions.md` |
| 8 | Cálculos | Motor Decimal Fiscal | Funções aritméticas em strings decimais para cálculo de unitário * quantidade, totais da nota e saldos | Strings decimais de quantidade e preço unitário | Strings decimais com escala exata (2 casas para moeda, 3/4 para qtd) | Retorna "0.00" caso entrada seja nula ou inválida | R2, `ORIGINAL_REQUEST.md` |
| 9 | Persistência | LocalStorage Versionado 1.0.0 | Camada de persistência local com envelope `{ version: "1.0.0", timestamp, data }` e operações save, load, reset e resetAll | Chave de armazenamento, payload JSON | Leitura/gravação íntegra e restauração de dados demo | Se versão incompatível, descarta dados e restaura mocks padrão | R2, `copilot-instructions.md` |
| 10 | Tela 1 | Dashboard Operacional | Painel executivo `/dashboard` com 5 KPIs fiscais, atalhos de importação/reset e tabela de documentos recentes | Interação com KPIs e linhas da tabela | Visualização consolidada de status e atalho direto para conferência | Falha na leitura carrega estado vazio com opção de reset | R3, `copilot-instructions.md` |
| 11 | Tela 2 | Importação Simulada | Tela `/documentos/importar` com dropzone para XML/PDF e 5 cards de carga imediata dos cenários demo | Upload de arquivo ou clique no card de cenário | Simulação de processamento e redirecionamento para conferência | Arquivo inválido exibe toast de erro | R3, `copilot-instructions.md` |
| 12 | Tela 3 | Listagem de Documentos | Tela `/documentos` com busca textual, filtro por status, filtro por tipo (XML/PDF), paginação e ações | Termo de busca, seleção de filtro, troca de página | Lista paginada de documentos com badges informativos | Busca sem resultados exibe NoDataFound com botão "Limpar Filtros" | R3, `copilot-instructions.md` |
| 13 | Tela 4 | Editor de Conferência | Tela `/documentos/[id]/conferencia` com tabela densa, edição inline, navegação Tab/Enter, recalculo e auto-save | Digitação de valores nas células de quantidade e preço | Atualização instantânea dos totais da linha e da nota | Bloqueio de caracteres inválidos em campos numéricos | R3, `copilot-instructions.md` |
| 14 | Tela 5 | Divisão de NF-e | Tela `/documentos/[id]/divisao` permitindo alocar produtos entre 2 ou mais notas de destino com validação de saldo | Quantidades alocadas por nota de destino | Saldo restante em tempo real e geração de notas preparadas | Alocação em excesso (saldo < 0) bloqueia finalização | R3, `copilot-instructions.md` |
| 15 | Tela 6 | Assistente de Validação Fiscal | Tela `/documentos/[id]/validacao` destacando erros fiscais simulados (CFOP incompatível, NCM inválido, divergência matemática) | ID do documento em validação | Cards categorizados com Erro Crítico, Aviso e ação rápida | Permite ignorar aviso com justificativa ou corrigir na conferência | R3, `copilot-instructions.md` |
| 16 | Tela 7 | Gestão de Notas Preparadas | Tela `/notas-preparadas` listando notas originadas das divisões com espelho Danfe e simulação de exportação | Filtros por data e parent NF | Espelho visual da nota preparada e download simulado de XML | Permite excluir nota preparada com diálogo de confirmação | R3, `copilot-instructions.md` |
| 17 | Tela 8 | Configurações de Interface | Tela `/configuracoes` para densidade de tabela, itens por página, limite de valor demo e botão master resetAll | Preferências de layout e dados selecionadas pela usuária | Persistência imediata e aplicação reativa em toda a interface | Tratamento de quota cheia ou bloqueio de localStorage | R3, `copilot-instructions.md` |

---

## 3. Casos de Borda e Comportamentos Observados (Edge Cases)

| # | Feature | Entrada / Cenário | Comportamento Observado / Requerido |
|---|---------|-------------------|--------------------------------------|
| 1 | Cálculos Decimais | Quantidade `0.001` * Preço `333.3333` | Cálculo deve gerar `1.00` ou arredondamento formal ABNT sem dízima binária (evitar `0.9999999999999999`). |
| 2 | Cálculos Decimais | Item com quantidade zerada (`0`) ou valor unitário `0.0000` | Valor total da linha resulta em `0.00`. Sistema não gera divisão por zero nem NaN nos totais da nota. |
| 3 | Edição Inline na Conferência | Usuário pressiona `Enter` na última célula da última linha | Deve salvar a edição e manter o foco estável (sem saltar para fora da tabela ou disparar submit indesejado). |
| 4 | Edição Inline na Conferência | Usuário pressiona `Tab` percorrendo os campos editáveis | Navega em sequência: Código -> Descrição -> NCM -> CFOP -> Unidade -> Quantidade -> Valor Unitário -> próximo item. |
| 5 | Edição Inline na Conferência | Usuário digita vírgula `,` em campo decimal | O motor de input normaliza automaticamente vírgula para ponto decimal interno (`12,50` -> `12.50`) mantendo formatação amigável. |
| 6 | Divisão de NF-e | Tentativa de alocar quantidade maior que o original (`distribuído > original`) | O saldo do item fica negativo (`saldo < 0`). A linha exibe badge vermelho de excesso e o botão "Salvar Notas Preparadas" é desabilitado. |
| 7 | Divisão de NF-e | Distribuição parcial com sobra (`saldo > 0`) | O sistema alerta com badge âmbar que o item possui saldo não distribuído. Ao salvar, abre modal de confirmação advertindo sobre o saldo remanescente. |
| 8 | Divisão de NF-e | Adicionar 5 ou mais notas de destino | Workspace deve habilitar rolagem horizontal suave mantendo a coluna do Documento Original fixa à esquerda (sticky). |
| 9 | LocalStorage | Chave corrompida ou com versão diferente de `1.0.0` | `localStorageService.load` captura o erro, ignora o conteúdo incompatível e restaura os dados padrão do mock sem travar a interface. |
| 10 | LocalStorage | Navegador em modo anônimo com localStorage bloqueado | Todas as operações de leitura/escrita são encapsuladas em try/catch, utilizando estado em memória temporário como fallback gracefully. |
| 11 | Validação Fiscal | Cenário `demo-04` com CFOP `5102` em nota de exportação | Validador acusa `ERRO CRÍTICO`: "CFOP 5102 não permitido em operação para o exterior. CFOP deve iniciar com 7 (ex: 7101)." |
| 12 | Validação Fiscal | NCM com 7 dígitos (ex: `0901111`) | Validador acusa `ERRO`: "NCM inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos." |
| 13 | Cenário `demo-05` | Produtos repetidos com mesmo código e NCM em itens distintos | A tabela de conferência e a tela de divisão devem identificar os itens pelo `item` sequencial (ou ID único), permitindo tratar cada lote independentemente. |
| 14 | Importação Drag-and-Drop | Usuário arrasta arquivo `.exe` ou imagem `.png` | O componente `InputFile` rejeita imediatamente o arquivo, não altera o estado e exibe toast de erro: "Arquivo inválido! Arquivos aceitos: .xml, .pdf". |
| 15 | Importação Drag-and-Drop | Usuário arrasta arquivo maior que 10MB | Rejeição imediata antes de qualquer leitura em memória, com toast: "O arquivo não pode exceder 10MB". |

---

## 4. R1: Requisitos de Fundação e Comportamento dos Componentes

### 4.1 Estrutura de Navegação e Layout

- **Sidebar (`SmartNFeSidebar.jsx`)**:
  - A navegação antiga com vínculos com RH, Recrutamento e Helpdesk foi completamente substituída pelos 4 pilares do SmartNFe:
    1. **Dashboard** (`/dashboard`, ícone `faChartBar`)
    2. **Documentos** (`/documentos`, ícone `faFileInvoice`) com submenu recolhível:
       - *Importar NF-e* (`/documentos/importar`, ícone `faFileImport`)
       - *Todos os documentos* (`/documentos`, ícone `faListAlt`)
    3. **Notas Preparadas** (`/notas-preparadas`, ícone `faClipboardCheck`)
    4. **Configurações** (`/configuracoes`, ícone `faGear`)
  - A sidebar possui comportamento recolhível com largura compacta (56px) ou expandida (240px).

- **Cabeçalho Unificado (`SmartNFeHeader.jsx`)**:
  - Trilha de navegação hierárquica (Breadcrumbs) dinâmica para localização rápida.
  - Indicador permanente de "Modo Demo".
  - Botão de alternância instantânea entre Modo Claro e Modo Escuro (`faSun` / `faMoon`).

- **Layout Master (`AppLayout.jsx`)**:
  - Empacota toda a experiência em uma moldura de tela única com scroll otimizado no conteúdo principal (`main`).
  - Inclui globalmente o `ToastContainer` e o `DemoBadge` (badge inferior central fixo com pulsação suave em âmbar "DEMO").

- **Provedor de Estado Global (`AppContext.jsx`)**:
  - Centraliza o barramento de notificações com métodos ergonômicos:
    - `toast.success(mensagem)`
    - `toast.error(mensagem)`
    - `toast.warning(mensagem)`
    - `toast.info(mensagem)`
  - Mantém e sincroniza o estado de tema escuro (`darkMode`) com a classe `.dark` no elemento raiz `<html>`.
  - Armazena as preferências operacionais do usuário: `tableDensity` (`compact` | `normal` | `relaxed`), `rowsPerPage` (10, 20, 50), `demoValueLimit` (R$ 50.000,00), `showOriginalValues` e `autoSave`.

### 4.2 Inventário de Reutilização de Componentes

| Componente | Caminho | Regra de Uso |
|------------|---------|--------------|
| `Button` | `app/components/buttons/Button.jsx` | Variantes: `primary`, `success`, `danger`, `warning`, `ghost`, `outline`. Tamanhos: `small`, `medium`, `large`. |
| `Card` | `app/components/cards/Card.jsx` | Composto por `Card`, `CardTitle`, `CardBody`, `CardActions`. |
| `InputText` | `app/components/inputs/InputText.jsx` | Suporte a máscaras monetárias, CNPJ, busca debounced e botão de limpeza (`clearable`). |
| `InputNumber` | `app/components/inputs/InputNumber.jsx` | Entradas numéricas controladas com limites mínimo e máximo. |
| `InputFile` | `app/components/inputs/InputFile.jsx` | Dropzone com suporte a `.xml` e `.pdf`, feedback visual e toasts integrados ao AppContext. |
| `DataTable` | `app/components/table/DataTable.jsx` | Tabela genérica suportando colunas explícitas (`columns`), renderizadores customizados e flag `dense`. |
| `Dialog` | `app/components/Layouts/Dialog.jsx` | Modal de confirmação com suporte opcional a textarea para justificativas e validação de tamanho mínimo. |
| `Pagination` | `app/components/Layouts/Pagination.jsx` | Controle de paginação com seletor de registros por página. |
| `Skeleton` | `app/components/Layouts/Skeleton.jsx` | Feedback de carregamento (`SkeletonList`, `FormSkeleton`, `Skeleton`). |
| `NoDataFound` | `app/components/Layouts/NoDataFound.jsx` | Exibição de estado vazio com ícone, título e ação sugerida. |
| `PageTabs` | `app/components/Layouts/PageTabs.jsx` | Alternador de abas de tela. |

---

## 5. R2: Especificação de Mocks, Formatadores, Cálculos e Persistência

### 5.1 Os 5 Cenários de Demonstração Obrigatórios

Cada cenário de demonstração deve estar configurado em `app/lib/data/mockInvoices.js` com o atributo `isDemo: true` e dados ricos de comércio exterior brasileiro:

#### Cenário 1: `demo-01` — NF-e XML Padrão Completo (8 itens)
- **Tipo:** XML (Simulação de arquivo emitido por indústria exportadora).
- **Número / Série:** NF-e `000.145.892`, Série `1`.
- **Chave de Acesso:** `35241112345678000190550010001458921001234567`.
- **Emitente:** Agroexport Brasil S.A. (CNPJ: `12.345.678/0001-90`, Santos/SP).
- **Destinatário:** Global Trading Logistics B.V. (Roterdã, Holanda / NL).
- **Natureza da Operação:** `EXPORTAÇÃO DE MERCADORIAS`.
- **Quantidade de Itens:** 8 itens de commodities e produtos alimentícios (Café Arábica Tipo 6, Soja em Grãos, Açúcar Refinado, Suco de Laranja Concentrado, Polpa de Madeira, Carne Bovina Congelada, Castanha de Caju, Óleo de Soja Bruto).
- **Condição Fiscal:** 100% consistente, sem erros, pronto para conferência e divisão.
- **Valor Total dos Produtos:** R$ 284.500,00 | **Valor Total da Nota:** R$ 291.200,00 (com frete e seguro).

#### Cenário 2: `demo-02` — NF-e PDF Exportação (25 itens)
- **Tipo:** PDF (Simulação de extração de espelho de exportação com 25 produtos industriais).
- **Número / Série:** NF-e `000.089.410`, Série `2`.
- **Chave de Acesso:** `41241198765432000155550020000894101007654321`.
- **Emitente:** Metalúrgica Sul Americana Ltda (CNPJ: `98.765.432/0001-55`, Joinville/SC).
- **Destinatário:** Industrial Supply Corp. (Houston, Texas / EUA).
- **Natureza da Operação:** `EXPORTAÇÃO DE MANUFATURADOS`.
- **Quantidade de Itens:** 25 itens metalmecânicos (peças usinadas, válvulas industriais, tubos de inox, engrenagens, mancais, parafusos especiais).
- **Objetivo no Teste:** Avaliar a rolagem da tabela, paginação e desmembramento em 2 ou mais contêineres de exportação.
- **Valor Total da Nota:** R$ 148.750,00.

#### Cenário 3: `demo-03` — NF-e Grande para Stress Test (50 itens)
- **Tipo:** XML Grande (Carga volumosa de exportação de autopeças e componentes elétricos).
- **Número / Série:** NF-e `000.320.100`, Série `1`.
- **Chave de Acesso:** `43241155544433000188550010003201001009988776`.
- **Emitente:** Eletroparts do Brasil Componentes S.A. (CNPJ: `55.544.433/0001-88`, Porto Alegre/RS).
- **Destinatário:** Auto Assembly Europe GmbH (Hamburgo / Alemanha).
- **Natureza da Operação:** `REMESSA DE COMPONENTES AUTOMOTIVOS PARA EXPORTAÇÃO`.
- **Quantidade de Itens:** 50 itens sequenciais.
- **Objetivo no Teste:** Stress test de performance da tabela densa, fluidez da navegação por teclado (Tab/Enter), cálculo de totais em tempo real e paginação.
- **Valor Total da Nota:** R$ 625.800,00.

#### Cenário 4: `demo-04` — NF-e com Inconsistências Fiscais Simuladas (12 itens)
- **Tipo:** XML com Inconsistências (Cenário preparado para o Assistente de Validação).
- **Número / Série:** NF-e `000.012.789`, Série `1`.
- **Chave de Acesso:** `31241111122233000144550010000127891004433221`.
- **Emitente:** Calçados Vale do Rio Doce Ltda (CNPJ: `11.122.233/0001-44`, Franca/SP).
- **Destinatário:** Fashion Footwear Group S.L. (Valência / Espanha).
- **Natureza da Operação:** `EXPORTACAO DE CALCADOS DE COURO`.
- **Quantidade de Itens:** 12 itens.
- **Inconsistências Fiscais Integradas (mínimo 4 apontamentos):**
  1. **Item 03 (CFOP Incorreto):** CFOP cadastrado como `5102` (Venda interna) em vez de `7101` (Exportação).
  2. **Item 05 (Divergência Matemática):** Quantidade `100.0000`, Valor Unitário `45.0000`, porém Valor Total gravado como `4.000,00` (divergência de R$ 500,00).
  3. **Item 08 (NCM Inválido):** NCM cadastrado com 7 dígitos (`6403590`) faltando o último dígito verificador.
  4. **Item 11 (Unidade de Medida Divergente):** Unidade cadastrada como `METROS` em item cuja classificação aduaneira exige `PARES`.
- **Objetivo no Teste:** Demonstrar visualmente os badges de alerta, a tela de validação fiscal e a capacidade de correção direta na conferência.

#### Cenário 5: `demo-05` — NF-e com Produtos Repetidos em Múltiplos Lotes (15 itens)
- **Tipo:** XML de Lotes Múltiplos.
- **Número / Série:** NF-e `000.205.670`, Série `3`.
- **Chave de Acesso:** `50241177788899000122550030002056701001122334`.
- **Emitente:** Cooperativa Agroindustrial Centro-Oeste (CNPJ: `77.788.899/0001-22`, Cuiabá/MT).
- **Destinatário:** Asian Grain Corporation (Xangai / China).
- **Natureza da Operação:** `EXPORTAÇÃO DE GRÃOS AGRÍCOLAS EM LOTES`.
- **Quantidade de Itens:** 15 itens, contendo 3 produtos que se repetem com códigos e NCMs idênticos, porém com lotes, volumes e quantidades diferentes:
  - `SOJA-GR-01` aparece nos itens 1, 4, 7, 10 e 13.
  - `MILHO-GR-02` aparece nos itens 2, 5, 8, 11 e 14.
  - `SORGO-GR-03` aparece nos itens 3, 6, 9, 12 e 15.
- **Objetivo no Teste:** Demonstrar que o sistema não confunde linhas de produtos idênticos e permite dividir cada lote de forma independente.

---

### 5.2 Esquema Completo das Entidades de Domínio

#### Estrutura do Documento NF-e (`Invoice`)
```typescript
interface Invoice {
  id: string;                     // "demo-01", "demo-02", etc.
  numero: string;                 // "000.145.892"
  serie: string;                  // "1"
  chaveAcesso: string;            // 44 dígitos
  tipoDocumento: "XML" | "PDF";
  naturezaOperacao: string;       // "EXPORTACAO DE MERCADORIAS"
  dataEmissao: string;            // ISO 8601: "2026-10-15T10:30:00Z"
  dataEntradaSaida?: string;
  status: "importado" | "em_conferencia" | "conferido" | "dividido" | "com_inconsistencias" | "preparado";
  emitente: {
    cnpj: string;                 // "12.345.678/0001-90"
    razaoSocial: string;
    nomeFantasia?: string;
    inscricaoEstadual?: string;
    uf: string;
    municipio: string;
  };
  destinatario: {
    nome: string;                 // "Global Trading Logistics B.V."
    pais: string;                 // "Holanda"
    paisCodigo?: string;          // "NL"
    idEstrangeiro?: string;       // "NL884920192B01"
    endereco?: string;
  };
  itens: InvoiceItem[];
  totais: {
    valorProdutos: string;        // String decimal "284500.00"
    valorFrete: string;           // "5000.00"
    valorSeguro: string;          // "1200.00"
    valorDesconto: string;        // "0.00"
    outrasDespesas: string;       // "500.00"
    valorTotalNota: string;       // "291200.00"
    pesoLiquido: string;          // "45000.000"
    pesoBruto: string;            // "46200.000"
  };
  transporte?: {
    modalidadeFrete: string;      // "0" (CIF) ou "1" (FOB)
    transportadora?: string;
    veiculoPlaca?: string;
    quantidadeVolumes?: string;
    especieVolumes?: string;
  };
  informacoesComplementares?: string;
  isDemo: boolean;                // true
  criadoEm: string;
  atualizadoEm: string;
}
```

#### Estrutura do Item da NF-e (`InvoiceItem`)
```typescript
interface InvoiceItem {
  id: string;                     // "demo-01-item-1"
  item: number;                   // 1, 2, 3...
  codigo: string;                 // "EXP-CAF-001"
  descricao: string;              // "Café em Grão Cru Arábica Tipo 6"
  ncm: string;                    // "09011110" (8 dígitos)
  cfop: string;                   // "7101" (4 dígitos iniciado por 7)
  unidade: string;                // "SC", "KG", "TON", "UN"
  quantidade: string;             // String decimal: "500.0000"
  valorUnitario: string;          // String decimal: "25.5000"
  valorTotal: string;             // String decimal: "12750.00"
  valorDesconto?: string;         // "0.00"
  valorFrete?: string;            // "0.00"
  situacao: "pendente" | "conferido" | "inconsistente";
  modificado: boolean;            // true se o usuário alterou qualquer campo
  valorOriginal: {                // Snapshot imutável dos valores carregados
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
    valorTotal: string;
  };
  inconsistencias?: Array<{
    tipo: "erro" | "aviso" | "info";
    campo: string;
    mensagem: string;
    esperado: string;
    encontrado: string;
  }>;
}
```

---

### 5.3 Contrato de Repositórios Assíncronos

Para permitir a substituição transparente no futuro pela API REST PHP (`smart-nfe-api`), todos os métodos operam com Promises assíncronas:

```javascript
// app/features/invoices/mockInvoiceRepository.js
const invoiceRepository = {
  // Lista com filtros por texto, status, tipo e paginação
  list: async (filters = {}) => {
    // Retorna { data: Invoice[], total: number, page: number, perPage: number }
  },

  // Busca nota por ID
  findById: async (id) => {
    // Retorna Invoice | null
  },

  // Atualiza cabeçalho ou dados da nota
  update: async (id, partialData) => {
    // Persiste no localStorageService e retorna a nota atualizada
  },

  // Atualiza um item específico, recalcula totais da nota e salva
  updateItem: async (invoiceId, itemId, itemData) => {
    // Recalcula valorTotal do item, totais da nota, marca modificado: true e persiste
  },

  // Retorna os apontamentos fiscais da nota
  getValidationIssues: async (id) => {
    // Retorna ValidationIssue[]
  },

  // Restaura a nota específica para os valores originais do mock
  resetInvoice: async (id) => {
    // Restaura e retorna a nota original
  }
};
```

---

### 5.4 Módulo Centralizado de Formatação (`app/lib/formatters/`)

1. **`currency.js`**:
   - `formatBRL(value)`: Recebe string decimal, number ou nulo. Retorna moeda brasileira: `"R$ 1.234,56"`.
   - `parseBRL(stringVal)`: Converte `"R$ 1.234,56"` ou `"1234,56"` na string decimal canônica `"1234.56"`.

2. **`dates.js`**:
   - `formatDateBR(isoString)`: Retorna formato padrão brasileiro: `"DD/MM/AAAA"`.
   - `formatDateTimeBR(isoString)`: Retorna formato com hora: `"DD/MM/AAAA HH:mm"`.

3. **`numbers.js`**:
   - `formatQuantity(value, decimals = 3)`: Formata quantidade com número variável de casas decimais (ex: `"10.000"` -> `"10,000"`, `"1234.5"` -> `"1.234,500"`).
   - `formatDecimal(value, decimals = 2)`: Formata números decimais com separador de milhar pt-BR.
   - `parseDecimal(brString)`: Converte texto digitado pelo usuário (`"1.250,50"`) para string numérica (`"1250.50"`).

4. **`status.js`**:
   - `getStatusLabel(status)`: Tradução amigável dos status fiscais (`importado` -> "Importado", `em_conferencia` -> "Em Conferência", `conferido` -> "Conferido", `dividido` -> "Dividido", `com_inconsistencias` -> "Com Inconsistências", `preparado` -> "Preparado").
   - `getStatusColor(status)`: Classes Tailwind de cor e estilo semântico (azul, amarelo/âmbar, verde, vermelho, roxo).

---

### 5.5 Motor de Cálculos Fiscais em Strings Decimais (`app/lib/calculations/`)

Regras rígidas para eliminar erros de ponto flutuante binário do IEEE 754:
- Toda operação aritmética é executada sobre representações de escala fixa (inteiros multiplicados por 10^escala) ou através de funções de string decimal:
  - `multiplicarQtdPreco(quantidadeStr, precoUnitarioStr)`:
    - Normaliza entradas para escala de precisão.
    - Executa multiplicação.
    - Arredonda meio para cima (half-up) para exatamente 2 casas decimais.
    - Retorna string decimal com 2 casas (ex: `"255.00"`).
  - `calcularTotaisNota(itens, adicionais = {})`:
    - Soma os totais dos produtos: `valorProdutos = sum(item.valorTotal)`.
    - Adiciona frete, seguro e outras despesas.
    - Deduz desconto.
    - Retorna `valorTotalNota`, `pesoLiquidoTotal` e `pesoBrutoTotal` em formato decimal consistente.
  - `calcularSaldoDivisao(totalOriginal, alocacoes)`:
    - `saldo = totalOriginal - soma(alocacoes)`.
    - Detecta: `saldo === 0` (equilibrado), `saldo > 0` (sobra) e `saldo < 0` (excesso).
  - `validarDistribuicao(notaOriginal, notasDestino)`:
    - Retorna diagnóstico item a item e global com status de validação para permitir ou bloquear a gravação.

---

### 5.6 Persistência Local (`localStorageService.js`)

- **Versão do Esquema:** `STORAGE_SCHEMA_VERSION = "1.0.0"`.
- **Envelope Padronizado:**
  ```json
  {
    "version": "1.0.0",
    "timestamp": "2026-11-04T14:30:00.000Z",
    "data": { ... }
  }
  ```
- **Métodos da API:**
  - `save(key, data)`: Salva com envelope e versão.
  - `load(key, fallback)`: Valida se `version === STORAGE_SCHEMA_VERSION`. Se incompatível ou inexistente, retorna fallback.
  - `reset(key)`: Restaura uma nota ou divisão específica para os valores padrão do mock.
  - `resetAll()`: Limpa todos os dados salvos (`smartnfe_invoices`, `smartnfe_divisions`, `smartnfe_prepared`) e reestabelece os 5 cenários iniciais.
- **Limites de Segurança:**
  - Armazena exclusivamente cenários fictícios e preferências de tela.
  - Nunca armazena dados fiscais reais nem certificados digitais.

---

## 6. R3: Especificação Detalhada das 8 Telas

### 6.1 Tela 1: `/dashboard` (Painel Operacional)
- **Objetivo:** Ponto de entrada que sintetiza o volume documental e o andamento das conferências.
- **Componentes:**
  - **Cards Indicadores (5 KPIs):**
    1. *Total de Documentos* (ex: 5 documentos).
    2. *Em Conferência* (ex: 2 notas).
    3. *Conferidos e Prontos* (ex: 1 nota).
    4. *Com Inconsistências* (ex: 1 nota — badge vermelho de atenção).
    5. *Notas Preparadas* (ex: 2 notas geradas a partir de divisão).
  - **Barra de Ações Rápidas:**
    - Botão "Importar NF-e" -> Redireciona para `/documentos/importar`.
    - Botão "Ver Todos os Documentos" -> Redireciona para `/documentos`.
    - Botão "Resetar Dados Demo" -> Abre diálogo de confirmação para restaurar os 5 cenários.
  - **Tabela de Documentos Recentes (`DataTable.jsx`):**
    - Exibe as notas cadastradas com colunas: Número/Série, Tipo (XML/PDF), Emitente, Destinatário, Itens, Valor Total, Status e Ações rápidas (Conferir, Dividir, Validar).
- **Estados:** Loading (Skeleton), Vazio (NoDataFound com CTA de reset) e Sucesso.

### 6.2 Tela 2: `/documentos/importar` (Importação Simulada)
- **Objetivo:** Permitir upload arrastando arquivos XML/PDF ou selecionar um dos 5 cenários para teste imediato.
- **Componentes:**
  - **Área Drag-and-Drop (`InputFile.jsx`):**
    - Aceita `.xml` e `.pdf` até 10MB.
    - Ao soltar arquivo: exibe nome, tamanho, anima barra de progresso simulada, exibe toast de sucesso e oferece botão "Abrir na Conferência".
  - **Vitrine de Cenários Demo (5 Cards Interativos):**
    - Card com título, descrição, tags de perfil e botão "Carregar e Conferir" para cada um dos 5 cenários (`demo-01` a `demo-05`).

### 6.3 Tela 3: `/documentos` (Listagem Completa de Documentos)
- **Objetivo:** Gestão, filtragem e busca de todos os documentos fiscais importados.
- **Componentes:**
  - **Barra de Busca e Filtros:**
    - Campo de busca debounced por número, emitente, país ou chave de acesso.
    - Select de Status (Todos, Importado, Em Conferência, Conferido, Dividido, Inconsistente).
    - Select de Tipo (Todos, XML, PDF).
    - Botão "Limpar Filtros".
  - **Tabela Principal (`DataTable.jsx`):**
    - Colunas: Número/Série, Tipo, Emissão, Emitente (CNPJ + Razão), Destinatário (País), Qtd Itens, Valor Total e Ações (Conferência, Divisão, Validação).
  - **Paginação (`Pagination.jsx`):**
    - Controle de página atual e seletor de 10, 20 ou 50 itens por página.

### 6.4 Tela 4: `/documentos/[id]/conferencia` (Editor Principal de Conferência — CRÍTICA)
- **Objetivo:** Espaço central de trabalho onde a contadora audita linha por linha os produtos da NF-e, faz ajustes finos e valida totais.
- **Componentes:**
  - **Cabeçalho Fiscal Resumido (`InvoiceHeader.jsx`):**
    - Dados do emitente, destinatário estrangeiro, número, chave de 44 dígitos, modalidade de frete e status atual.
  - **Tabela Densa com Edição Inline (`InvoiceItemsTable.jsx`):**
    - Densidade dinâmica controlada pelo AppContext (`compact`, `normal`, `relaxed`).
    - Colunas: `#`, `Código`, `Descrição`, `NCM`, `CFOP`, `Unidade`, `Quantidade`, `Valor Unitário`, `Valor Total`, `Situação`, `Ações`.
  - **Navegação Ergonômica por Teclado:**
    - `Tab` / `Shift+Tab`: Navega horizontalmente entre campos editáveis da mesma linha ou pula para o primeiro campo da linha seguinte.
    - `Enter`: Confirma a edição do campo atual e move o foco para a mesma coluna na linha abaixo.
    - `Escape`: Cancela a edição da célula e restaura o valor anterior.
  - **Recálculo em Tempo Real:**
    - Ao alterar `Quantidade` ou `Valor Unitário`, o `Valor Total` da linha e a barra de totais da nota são recalculados instantaneamente sem delay perceptível.
  - **Barra Inferior de Totais Fixos (`InvoiceTotals.jsx`):**
    - Subtotal dos Produtos, Frete, Seguro, Despesas, Desconto, Valor Total da NF-e e Pesos Líquido/Bruto.
  - **Persistência Automática:**
    - Debounced auto-save no `localStorageService` com indicador visual "Salvo" e botão manual "Salvar Alterações".
    - Botão "Restaurar Original" com `Dialog.jsx` para reverter edições.

### 6.5 Tela 5: `/documentos/[id]/divisao` (Divisão de NF-e / Multi-Destino)
- **Objetivo:** Distribuir produtos e quantidades de uma nota de exportação entre 2 ou mais notas fiscais preparadas de destino.
- **Componentes:**
  - **Barra de Gestão de Divisão:**
    - Botão "+ Adicionar Nota de Destino".
    - Botão "Divisão Proporcional / Rápida".
    - Botão "Limpar Distribuição".
    - Botão de ação primária "Salvar e Gerar Notas Preparadas".
  - **Workspace Multi-Coluna (`DivisionWorkspace.jsx`):**
    - Coluna Fixa à Esquerda: Documento Original com lista de itens, quantidades originais e saldo não alocado.
    - Colunas de Destino (Nota 1, Nota 2, etc.):
      - Identificador provisório editável (ex: `NF-DEST-01`).
      - Campo numérico de alocação de quantidade para cada item.
      - Botões rápidos: "100%" (aloca todo o saldo restante do item), "50%", "Zerar".
      - Subtotal e total da nota de destino atualizados em tempo real.
  - **Painel de Validação de Saldos (`DivisionSummary.jsx`):**
    - Avaliação item a item:
      - `Verde`: Saldo zerado (distribuição perfeita).
      - `Âmbar`: Saldo positivo (itens restantes não alocados).
      - `Vermelho`: Saldo negativo (excesso alocado — bloqueia a gravação com alerta impeditivo).
  - **Geração de Notas Preparadas:**
    - Grava as novas notas no `localStorageService` e disponibiliza na tela `/notas-preparadas`.

### 6.6 Tela 6: `/documentos/[id]/validacao` (Assistente de Validação Fiscal)
- **Objetivo:** Demonstrar visualmente a verificação de regras fiscais de comércio exterior brasileiro (especialmente evidenciado no cenário `demo-04`).
- **Componentes:**
  - **Resumo Executivo de Validação:**
    - Badges consolidados: total de erros impeditivos, alertas e advertências.
  - **Cards Categorizados de Inconsistências (`ValidationPanel.jsx`):**
    - *Erros Críticos (Vermelho):*
      - CFOP incompatível (ex: CFOP iniciado com 5 ou 6 em operação com destinatário estrangeiro).
      - NCM inválido (formato diferente de 8 dígitos).
      - Divergência matemática (quantidade * unitário != total gravado).
    - *Alertas (Amarelo):*
      - Valor da nota excedendo o limite padrão configurado.
      - Unidade comercial incomum para o NCM selecionado.
  - **Assistente de Correção:**
    - Cada apontamento exibe: Valor Encontrado, Valor Esperado, Explicativo Legal e botão "Corrigir na Conferência" ou "Auto-Corrigir".

### 6.7 Tela 7: `/notas-preparadas` (Listagem das Notas Preparadas)
- **Objetivo:** Exibir as notas fiscais resultantes das divisões executadas pela usuária contadora.
- **Componentes:**
  - **Tabela de Notas Preparadas (`DataTable.jsx`):**
    - Colunas: Identificador, NF de Origem, Qtd Itens Alocados, Valor Total dos Produtos, Valor Total da Nota, Data de Criação e Status.
  - **Ações por Linha:**
    - "Ver Espelho / Danfe": Abre modal (`DocumentPreview.jsx`) com visualização formatada da nota de exportação.
    - "Simular Exportação XML": Dispara download fictício do arquivo `.xml` preparado.
    - "Excluir": Abre diálogo de confirmação e remove a nota preparada.
  - **Estado Vazio:** Mensagem explicativa instruindo a dividir um documento caso a lista esteja vazia.

### 6.8 Tela 8: `/configuracoes` (Preferências de Interface e Dados)
- **Objetivo:** Personalização da densidade visual, comportamento das tabelas e gerenciamento dos mocks.
- **Componentes:**
  - **Preferências de Tabela:**
    - Seletor de Densidade: `compact` (recomendado para contabilidade com alta densidade), `normal` ou `relaxed`.
    - Itens por página padrão (10, 20, 50, 100).
    - Checkbox para exibição de valores originais na conferência.
    - Checkbox para auto-salvamento contínuo.
  - **Tema e Aparência:**
    - Interruptor de Modo Escuro (`.dark`).
  - **Parâmetros Fiscais da Demonstração:**
    - Limite de valor por nota para sugestão de divisão (padrão: R$ 50.000,00).
    - CFOP padrão de exportação (`7101` / `7102`).
  - **Área de Reset dos Dados Mockados:**
    - Exibição da versão do schema (`1.0.0`) e status de integridade do storage.
    - Botão "Restaurar Todos os Dados da Demonstração (Reset All)" com confirmação de segurança via `Dialog.jsx`.

---

## 7. R4: Restrições Técnicas e Critérios de Aceite

### 7.1 Restrições Obrigatórias
1. **Linguagem e Stack:** Exclusivamente JavaScript/JSX (não usar TypeScript nesta fase). Next.js 16 (App Router), React 19, Tailwind CSS 4, Font Awesome 7 e pnpm.
2. **Isolamento de Backend:** Nenhuma chamada HTTP real (`fetch` para APIs externas, GraphQL, etc.). Não alterar o repositório `smart-nfe-api`.
3. **Sem Telas de Login Fictícias:** Acesso direto às rotas da aplicação demo (remover redirecionamento para `/login` existente no template legado).
4. **Vercel Readiness:** Configuração em `next.config.js` limpa, sem `basePath: '/saas'` e sem `output: 'export'`.
5. **Indicação Permanente de Demonstração:** Badge visual visível em 100% das telas da plataforma.
6. **Restrição Operacional Crítica do Ambiente:** O servidor de desenvolvimento já se encontra em execução externamente na porta 3000. **NÃO executar comandos de build nem iniciar novos servidores de desenvolvimento** durante as etapas de levantamento e implementação para evitar travamentos ou conflitos de porta.

### 7.2 Critérios de Aceite do MVP
- [ ] Todas as 8 rotas operacionais carregam e renderizam sem erros de runtime no navegador.
- [ ] Os 5 cenários mockados (`demo-01` a `demo-05`) carregam com dados completos de exportação.
- [ ] A navegação por teclado (Tab/Enter) na conferência permite transição fluida entre células editáveis.
- [ ] A alteração de valores na conferência recalcula totais e persiste no `localStorageService`.
- [ ] A tela de divisão permite distribuir itens entre 2+ notas e valida saldos em tempo real.
- [ ] A tela de validação fiscal expõe as inconsistências deliberadas do cenário `demo-04`.
- [ ] A tela de notas preparadas lista adequadamente os desmembramentos realizados.
- [ ] A tela de configurações permite alternar densidade e restaurar todos os cenários.
