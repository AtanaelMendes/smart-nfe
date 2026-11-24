# Graph Report - smart-nfe  (2026-11-24)

## Corpus Check
- 151 files · ~120,430 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .bat 3, .example 1)

## Summary
- 650 nodes · 1994 edges · 34 communities (23 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca49cc08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- invoiceRepository.js
- cn
- react
- useAppContext
- invoiceRepository.js
- @fortawesome/react-fontawesome
- DatePicker.jsx
- TooltipComponent
- m2_domain.test.mjs
- utils.js
- catalogsRepository.js
- mockInvoices.js
- dashboard/page.jsx
- decimal.js
- preparedInvoiceRepository.js
- JobNotification.jsx
- numbers.js
- SelecaoFiltro.jsx
- package.json
- test_storage_fix.mjs
- InputText.jsx
- proposed_flow_b_multi_xml_import.test.mjs
- Sidebar.jsx
- RichText.jsx
- dateUtils.js
- flow_a_xml_import.test.mjs
- ValidationAssistantManager
- exemploXY.js

## God Nodes (most connected - your core abstractions)
1. `cn()` - 75 edges
2. `react` - 67 edges
3. `useAppContext()` - 63 edges
4. `@fortawesome/react-fontawesome` - 60 edges
5. `@fortawesome/free-solid-svg-icons` - 57 edges
6. `Button()` - 52 edges
7. `cleanDecimalString()` - 43 edges
8. `decimalCompare()` - 41 edges
9. `AppLayout()` - 39 edges
10. `empty()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `InputFile()` --calls--> `useAppContext()`  [EXTRACTED]
  app/components/inputs/InputFile.jsx → app/context/AppContext.jsx
- `getSituacaoVagaLabel()` --calls--> `empty()`  [EXTRACTED]
  app/assets/exampleEnum.js → app/assets/utils.js
- `isVagaAberta()` --calls--> `empty()`  [EXTRACTED]
  app/assets/exampleEnum.js → app/assets/utils.js
- `isVagaCancelada()` --calls--> `empty()`  [EXTRACTED]
  app/assets/exampleEnum.js → app/assets/utils.js
- `isVagaFechada()` --calls--> `empty()`  [EXTRACTED]
  app/assets/exampleEnum.js → app/assets/utils.js

## Import Cycles
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchLabel.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchLabel.jsx`
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchSelect.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchSelect.jsx`
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchRoot.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchRoot.jsx`

## Communities (34 total, 11 thin omitted)

### Community 0 - "invoiceRepository.js"
Cohesion: 0.14
Nodes (5): mutationQueue, sessionInvoices, preparationMutationQueue, sessionPreparations, STORAGE_KEYS

### Community 1 - "cn"
Cohesion: 0.15
Nodes (11): cn(), FabAdd(), FabCancel(), FabCustom(), FabSave(), Card(), CardTitle(), RangeSlider() (+3 more)

### Community 3 - "useAppContext"
Cohesion: 0.23
Nodes (11): ProgressBar(), Accordion(), AccordionItem(), Notifications(), Caption(), Label(), Subtitle(), Title() (+3 more)

### Community 4 - "invoiceRepository.js"
Cohesion: 0.10
Nodes (21): calculateAccessKeyDV(), UF_IBGE_CODES, validateAccessKey(), WEIGHTS_MODULO_11, cleanDecimal(), decodeXmlEntities(), findDirectChild(), findDirectChildren() (+13 more)

### Community 5 - "@fortawesome/react-fontawesome"
Cohesion: 0.16
Nodes (10): DataHora(), hasError(), renderError(), InputDate(), copyFormatedDate(), getValue(), InputFile(), TimePicker() (+2 more)

### Community 6 - "DatePicker.jsx"
Cohesion: 0.29
Nodes (7): Calendar(), DatePicker(), formatDate(), getDaysInMonth(), getFirstDayOfMonth(), isValidDate(), @fortawesome/free-regular-svg-icons

### Community 7 - "TooltipComponent"
Cohesion: 0.13
Nodes (17): ButtonGroup(), normalizarTelefone(), WhatsappButton(), CustomDropdown(), DebouncedSearchLabel(), Fieldset(), InputEmail(), hasError() (+9 more)

### Community 8 - "m2_domain.test.mjs"
Cohesion: 0.08
Nodes (54): btnType(), Button(), generateButtonClass(), WhatsAppChat(), InputTextArea, ProfilePicture(), AppLayout(), Confirm() (+46 more)

### Community 9 - "utils.js"
Cohesion: 0.06
Nodes (34): CD_SITUACOES_VAGA, getSituacaoVagaLabel(), isVagaAberta(), isVagaCancelada(), isVagaEmProspecao(), isVagaEmRequisicaoCriada(), isVagaFechada(), empty() (+26 more)

### Community 11 - "catalogsRepository.js"
Cohesion: 0.17
Nodes (8): getMockCompanies(), MOCK_COMPANIES, getMockPersons(), MOCK_PERSONS, getMockProducts(), MOCK_PRODUCTS, getMockServices(), MOCK_SERVICES

### Community 12 - "mockInvoices.js"
Cohesion: 0.31
Nodes (8): getAllInvoices(), getAllPrepared(), getDashboardKPIs(), getMockInvoiceById(), getMockInvoices(), getMockPreparedInvoices(), MOCK_INVOICES, MOCK_PREPARED_INVOICES

### Community 13 - "dashboard/page.jsx"
Cohesion: 0.16
Nodes (17): cancelCamera(), capturePhoto(), closePhotoModal(), handleDrop(), handleFileSelect(), isMobile, loadProfileFoto(), openCamera() (+9 more)

### Community 14 - "decimal.js"
Cohesion: 0.07
Nodes (86): INITIAL_EMPTY_ITEM(), ProductInvoiceEditor(), ServiceInvoiceEditor(), ConferenciaPage(), DivisaoNotasPage(), catalogsRepository, documentRepository, mutationQueue (+78 more)

### Community 15 - "preparedInvoiceRepository.js"
Cohesion: 0.25
Nodes (3): preparedMutationQueue, sessionPreparedInvoices, localStorageService

### Community 16 - "JobNotification.jsx"
Cohesion: 0.19
Nodes (13): deepClone(), defaultRegistry, getBackend(), getInfo(), has(), isAvailable(), load(), memoryStore (+5 more)

### Community 17 - "numbers.js"
Cohesion: 0.83
Nodes (3): formatDecimal(), formatQuantity(), parseDecimal()

### Community 19 - "SelecaoFiltro.jsx"
Cohesion: 0.18
Nodes (10): PILL_STYLES, PillsBadge(), DebouncedSearchRoot(), DebouncedSearchSelect(), hasError(), renderError(), DebouncedSearchSelectDelayed(), DebouncedSearchSelectNormal() (+2 more)

### Community 20 - "package.json"
Cohesion: 0.06
Nodes (38): AppProvider(), inter, metadata, RootLayout(), dependencies, clsx@^2.1.1, @fortawesome/fontawesome-svg-core@^7.1.0, @fortawesome/free-brands-svg-icons@^7.1.0 (+30 more)

### Community 21 - "test_storage_fix.mjs"
Cohesion: 0.40
Nodes (11): ScreenTourTip(), subscribeTourUpdates(), getRouteKeyByPath(), getSafeStorage(), getScreenTourByPath(), getTourStorageKey(), isTourSeen(), markTourAsSeen() (+3 more)

### Community 22 - "InputText.jsx"
Cohesion: 0.36
Nodes (4): InputCPF(), InputText(), SmallLoading(), apiClient

### Community 30 - "proposed_flow_b_multi_xml_import.test.mjs"
Cohesion: 0.46
Nodes (4): ModalGrid(), NoDataFound(), Timeline(), TimelineModal()

### Community 33 - "Sidebar.jsx"
Cohesion: 0.24
Nodes (6): PERMISSOES, ButtonToggle(), NewBadge(), PageTabs(), Sidebar(), getMenuDropDown()

### Community 39 - "flow_a_xml_import.test.mjs"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, exclude, @/plugins/*

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Sidebar.jsx`, `RichText.jsx`, `useAppContext`, `cn`, `@fortawesome/react-fontawesome`, `DatePicker.jsx`, `TooltipComponent`, `m2_domain.test.mjs`, `utils.js`, `utils.js`, `decimal.js`, `SelecaoFiltro.jsx`, `package.json`, `test_storage_fix.mjs`, `InputText.jsx`, `proposed_flow_b_multi_xml_import.test.mjs`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Should `invoiceRepository.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14166666666666666 - nodes in this community are weakly interconnected._
- **Why does `@fortawesome/react-fontawesome` connect `@fortawesome/react-fontawesome` to `cn`, `RichText.jsx`, `useAppContext`, `Sidebar.jsx`, `react`, `DatePicker.jsx`, `TooltipComponent`, `m2_domain.test.mjs`, `utils.js`, `decimal.js`, `package.json`, `test_storage_fix.mjs`, `InputText.jsx`, `proposed_flow_b_multi_xml_import.test.mjs`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `invoiceRepository.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09659090909090909 - nodes in this community are weakly interconnected._
- **Why does `@fortawesome/free-solid-svg-icons` connect `@fortawesome/react-fontawesome` to `cn`, `RichText.jsx`, `useAppContext`, `Sidebar.jsx`, `react`, `DatePicker.jsx`, `TooltipComponent`, `m2_domain.test.mjs`, `utils.js`, `decimal.js`, `package.json`, `test_storage_fix.mjs`, `InputText.jsx`, `proposed_flow_b_multi_xml_import.test.mjs`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `TooltipComponent` be split into smaller, more focused modules?**
  _Cohesion score 0.1268939393939394 - nodes in this community are weakly interconnected._
- **Should `m2_domain.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07681970884658455 - nodes in this community are weakly interconnected._