# Graph Report - smart-nfe  (2026-11-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1032 nodes · 3674 edges · 58 communities (40 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a3fcfe9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- decimal.js
- ref_node_assert
- @fortawesome/react-fontawesome
- package.json
- invoiceRepository.js
- localStorageService.js
- dev/page.jsx
- useAppContext
- importar/page.jsx
- cn
- utils.js
- empty
- UsoChatBotAnalistas.jsx
- dashboard/page.jsx
- Button
- photo-modal.js
- JobNotification.jsx
- react
- flow_f_scale_50_invoices.test.mjs
- SelecaoFiltro.jsx
- adversarial_audit_test.mjs
- test_storage_fix.mjs
- ValidationSessionController
- step
- test_quota_stale_override.mjs
- Sidebar.jsx
- ScreenTourTip.jsx
- AppContext.jsx
- DataHora.jsx
- m2_challenger2_drawer_coexistence.test.mjs
- ModalGrid.jsx
- validacao/page.jsx
- m2_domain.test.mjs
- AdversarialValidationController
- stress_test_concurrency.mjs
- dateUtils.js
- compilerOptions
- SyntheticDOMEvent
- flow_a_xml_import.test.mjs
- ValidationAssistantManager
- DebouncedSearchSelect
- .eslintrc.json
- RefreshTokenCredential
- InputEmail
- Select2CargosSip
- SelectUnidade
- vercel.json
- next.config.js
- postcss.config.mjs
- start.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 98 edges
2. `cn()` - 97 edges
3. `useAppContext()` - 91 edges
4. `@fortawesome/react-fontawesome` - 79 edges
5. `@fortawesome/free-solid-svg-icons` - 77 edges
6. `FieldLabel()` - 73 edges
7. `decimalCompare()` - 61 edges
8. `cleanDecimalString()` - 58 edges
9. `empty()` - 56 edges
10. `Button()` - 54 edges

## Surprising Connections (you probably didn't know these)
- `generateNFeXml()` --calls--> `decimalAdd()`  [EXTRACTED]
  tests/fixtures/xmlFixtureGenerator.mjs → app/lib/calculations/decimal.js
- `buildXmlItem()` --calls--> `decimalMultiply()`  [EXTRACTED]
  tests/fixtures/xmlFixtureGenerator.mjs → app/lib/calculations/decimal.js
- `generateNFeXml()` --calls--> `decimalMultiply()`  [EXTRACTED]
  tests/fixtures/xmlFixtureGenerator.mjs → app/lib/calculations/decimal.js
- `generateNFeXml()` --calls--> `decimalSubtract()`  [EXTRACTED]
  tests/fixtures/xmlFixtureGenerator.mjs → app/lib/calculations/decimal.js
- `buildXmlItem()` --calls--> `roundDecimal()`  [EXTRACTED]
  tests/fixtures/xmlFixtureGenerator.mjs → app/lib/calculations/decimal.js

## Import Cycles
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchSelect.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchSelect.jsx`
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchLabel.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchLabel.jsx`
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchRoot.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchRoot.jsx`

## Communities (58 total, 18 thin omitted)

### Community 0 - "decimal.js"
Cohesion: 0.06
Nodes (104): INITIAL_EMPTY_ITEM(), ProductInvoiceEditor(), ServiceInvoiceEditor(), DivisaoNotasPage(), catalogsRepository, documentRepository, mutationQueue, recalculateNFeTotals() (+96 more)

### Community 1 - "ref_node_assert"
Cohesion: 0.05
Nodes (33): testFiles, testsDir, ROOT_DIR, ROOT_DIR, ROOT_DIR, accessKeyModulePath, localStorageModulePath, nfeParserModulePath (+25 more)

### Community 2 - "@fortawesome/react-fontawesome"
Cohesion: 0.12
Nodes (23): ButtonGroup(), CustomDropdown(), DebouncedSearchLabel(), Fieldset(), InputPassword(), Select(), SelectAnalistaFilter(), hasError() (+15 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (38): AppProvider(), inter, metadata, RootLayout(), eslintConfig, dependencies, clsx@^2.1.1, @fortawesome/fontawesome-svg-core@^7.1.0 (+30 more)

### Community 4 - "invoiceRepository.js"
Cohesion: 0.10
Nodes (19): invoiceRepository, mutationQueue, sessionInvoices, isRealPreparation(), normalizePreparationStatus(), preparationMutationQueue, preparationRepository, sessionPreparations (+11 more)

### Community 5 - "localStorageService.js"
Cohesion: 0.10
Nodes (27): require, ROOT_DIR, require, ROOT_DIR, mutationQueue, originalUpdateItem, run(), run() (+19 more)

### Community 6 - "dev/page.jsx"
Cohesion: 0.11
Nodes (27): ButtonDropDown(), ButtonRadioGroup(), FloatActionButtonExpandable(), normalizarTelefone(), WhatsappButton(), Card(), CardActions(), CardBody() (+19 more)

### Community 7 - "useAppContext"
Cohesion: 0.17
Nodes (24): AppLayout(), DemoBadge(), Dialog(), SmartNFeHeader(), menuItems, NavItem(), SmartNFeSidebar(), toastConfig (+16 more)

### Community 8 - "importar/page.jsx"
Cohesion: 0.09
Nodes (25): DEMO_SCENARIOS, ImportarDocumentoPage(), calculateAccessKeyDV(), formatAccessKey(), UF_IBGE_CODES, validateAccessKey(), WEIGHTS_MODULO_11, cleanDecimal() (+17 more)

### Community 9 - "cn"
Cohesion: 0.09
Nodes (30): cn(), FabAdd(), FabCancel(), FabCustom(), FabSave(), Calendar(), DatePicker(), formatDate() (+22 more)

### Community 10 - "utils.js"
Cohesion: 0.09
Nodes (17): getBreakpoint(), isBelowLg(), isBelowMd(), isBelowXl(), isLg(), isMd(), isSm(), isXl() (+9 more)

### Community 11 - "empty"
Cohesion: 0.10
Nodes (29): CD_SITUACOES_VAGA, getSituacaoVagaLabel(), isVagaAberta(), isVagaCancelada(), isVagaEmProspecao(), isVagaEmRequisicaoCriada(), isVagaFechada(), empty() (+21 more)

### Community 12 - "UsoChatBotAnalistas.jsx"
Cohesion: 0.10
Nodes (4): PieChart, UsoChatBotAnalistas(), Iframe(), Loading()

### Community 13 - "dashboard/page.jsx"
Cohesion: 0.22
Nodes (19): inv4, issues, kpis, DashboardPage(), getAllInvoices(), getDashboardKPIs(), getMockInvoiceById(), getMockInvoices() (+11 more)

### Community 14 - "Button"
Cohesion: 0.17
Nodes (14): btnType(), Button(), generateButtonClass(), PILL_STYLES, PillsBadge(), WhatsAppChat(), InputTextArea, ProfilePicture() (+6 more)

### Community 15 - "photo-modal.js"
Cohesion: 0.16
Nodes (17): cancelCamera(), capturePhoto(), closePhotoModal(), handleDrop(), handleFileSelect(), isMobile, loadProfileFoto(), openCamera() (+9 more)

### Community 16 - "JobNotification.jsx"
Cohesion: 0.20
Nodes (10): ProgressBar(), RichText(), SunEditor, Notifications(), Caption(), Label(), Title(), JobNotification() (+2 more)

### Community 18 - "flow_f_scale_50_invoices.test.mjs"
Cohesion: 0.22
Nodes (12): dv, buildXmlItem(), calculateModulo11(), COMMODITIES_CATALOG, FOREIGN_CLIENTS_CATALOG, generateAccessKey(), generateNFeBatch(), generateNFeXml() (+4 more)

### Community 19 - "SelecaoFiltro.jsx"
Cohesion: 0.18
Nodes (13): Checkbox(), DebouncedSearchRoot(), DebouncedSearch, DebouncedSearchContext, Radio(), RadioTipoProcesso(), hasError(), renderError() (+5 more)

### Community 20 - "adversarial_audit_test.mjs"
Cohesion: 0.14
Nodes (12): { code }, compileFn, dtSource, moduleEnv, require, stubbedSource, { transformSync }, require (+4 more)

### Community 21 - "test_storage_fix.mjs"
Cohesion: 0.17
Nodes (13): createTestHarness(), deepClone(), getBackend(), has(), load(), save(), h, loaded (+5 more)

### Community 22 - "ValidationSessionController"
Cohesion: 0.19
Nodes (3): createConfirmationPayload(), isSensitiveIssue(), ValidationSessionController

### Community 23 - "step"
Cohesion: 0.22
Nodes (13): homolog, master, manual-deploy, step, step, step, pipelines, branches (+5 more)

### Community 24 - "test_quota_stale_override.mjs"
Cohesion: 0.22
Nodes (10): createTestHarness(), deepClone(), getBackend(), load(), save(), h, loaded, quotaStorage (+2 more)

### Community 25 - "Sidebar.jsx"
Cohesion: 0.24
Nodes (6): PERMISSOES, ButtonToggle(), NewBadge(), PageTabs(), Sidebar(), getMenuDropDown()

### Community 26 - "ScreenTourTip.jsx"
Cohesion: 0.40
Nodes (11): ScreenTourTip(), subscribeTourUpdates(), getRouteKeyByPath(), getSafeStorage(), getScreenTourByPath(), getTourStorageKey(), isTourSeen(), markTourAsSeen() (+3 more)

### Community 27 - "AppContext.jsx"
Cohesion: 0.22
Nodes (7): InputCPF(), InputNIT(), InputPIS(), InputText(), ThemeProvider(), AppContext, DEFAULT_SETTINGS

### Community 28 - "DataHora.jsx"
Cohesion: 0.31
Nodes (7): DataHora(), hasError(), renderError(), InputDate(), copyFormatedDate(), getValue(), TimePicker()

### Community 29 - "m2_challenger2_drawer_coexistence.test.mjs"
Cohesion: 0.20
Nodes (7): APP_CONTEXT_PATH, CONFERENCIA_PATH, HEADER_PATH, ReactHookHarness, ROOT_DIR, SCREEN_TOUR_PATH, SIDEBAR_PATH

### Community 31 - "ModalGrid.jsx"
Cohesion: 0.46
Nodes (4): ModalGrid(), NoDataFound(), Timeline(), TimelineModal()

### Community 32 - "validacao/page.jsx"
Cohesion: 0.52
Nodes (6): createConfirmationPayload(), FiscalFixConfirmationModal(), isSensitiveIssue(), SafeBulkReviewModal(), SENSITIVE_FIELDS, ValidacaoPage()

### Community 33 - "m2_domain.test.mjs"
Cohesion: 0.52
Nodes (5): formatDecimal(), formatQuantity(), parseDecimal(), require, ROOT_DIR

### Community 35 - "stress_test_concurrency.mjs"
Cohesion: 0.47
Nodes (5): queue, state, testHighConcurrency(), updateItemMock(), withMutationLock()

### Community 37 - "compilerOptions"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, exclude, @/plugins/*

### Community 39 - "flow_a_xml_import.test.mjs"
Cohesion: 0.40
Nodes (4): calculateReferenceDV(), FIXTURES_DIR, ROOT_DIR, validateAccessKeyReference()

### Community 41 - "DebouncedSearchSelect"
Cohesion: 0.50
Nodes (5): DebouncedSearchSelect(), hasError(), renderError(), DebouncedSearchSelectDelayed(), DebouncedSearchSelectNormal()

### Community 42 - ".eslintrc.json"
Cohesion: 0.40
Nodes (4): extends, rules, react-hooks/exhaustive-deps, next/core-web-vitals

### Community 44 - "InputEmail"
Cohesion: 0.67
Nodes (3): InputEmail(), hasError(), renderError()

### Community 45 - "Select2CargosSip"
Cohesion: 0.67
Nodes (3): Select2CargosSip(), hasError(), renderError()

### Community 46 - "SelectUnidade"
Cohesion: 1.00
Nodes (3): SelectUnidade(), hasError(), renderError()

## Knowledge Gaps
- **1 isolated node(s):** `next/core-web-vitals`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 276 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `decimal.js`, `@fortawesome/react-fontawesome`, `package.json`, `localStorageService.js`, `dev/page.jsx`, `useAppContext`, `importar/page.jsx`, `cn`, `utils.js`, `UsoChatBotAnalistas.jsx`, `dashboard/page.jsx`, `Button`, `JobNotification.jsx`, `SelecaoFiltro.jsx`, `adversarial_audit_test.mjs`, `Sidebar.jsx`, `ScreenTourTip.jsx`, `AppContext.jsx`, `DataHora.jsx`, `ModalGrid.jsx`, `validacao/page.jsx`, `m2_domain.test.mjs`, `login/page.jsx`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `decimal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0621923937360179 - nodes in this community are weakly interconnected._
- **Why does `useAppContext()` connect `useAppContext` to `decimal.js`, `validacao/page.jsx`, `@fortawesome/react-fontawesome`, `dev/page.jsx`, `importar/page.jsx`, `cn`, `empty`, `Select2CargosSip`, `Button`, `SelectUnidade`, `JobNotification.jsx`, `react`, `dashboard/page.jsx`, `SelecaoFiltro.jsx`, `Sidebar.jsx`, `AppContext.jsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `ref_node_assert` be split into smaller, more focused modules?**
  _Cohesion score 0.0514216575922565 - nodes in this community are weakly interconnected._
- **Why does `@fortawesome/free-solid-svg-icons` connect `@fortawesome/react-fontawesome` to `decimal.js`, `validacao/page.jsx`, `package.json`, `dev/page.jsx`, `useAppContext`, `importar/page.jsx`, `cn`, `utils.js`, `dashboard/page.jsx`, `Button`, `JobNotification.jsx`, `react`, `SelecaoFiltro.jsx`, `Sidebar.jsx`, `ScreenTourTip.jsx`, `DataHora.jsx`, `ModalGrid.jsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `@fortawesome/react-fontawesome` be split into smaller, more focused modules?**
  _Cohesion score 0.11809923130677848 - nodes in this community are weakly interconnected._