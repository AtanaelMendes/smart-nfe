# Graph Report - smart-nfe  (2026-11-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 648 nodes · 1992 edges · 31 communities (22 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76e8a1ce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- decimal.js
- react
- utils.js
- localStorageService.js
- invoiceRepository.js
- nfeXmlParser.js
- @fortawesome/react-fontawesome
- cn
- photo-modal.js
- TooltipComponent
- utils.js
- JobNotification.jsx
- dashboard/page.jsx
- ScreenTourTip.jsx
- DatePicker.jsx
- JobNotification.jsx
- InputDate
- RichText.jsx
- SelecaoFiltro.jsx
- jsconfig.json
- test_storage_fix.mjs
- InputEmail
- numbers.js
- Select2
- proposed_flow_b_multi_xml_import.test.mjs

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
- `ProductInvoiceEditor()` --calls--> `useAppContext()`  [EXTRACTED]
  app/components/notes/ProductInvoiceEditor.jsx → app/context/AppContext.jsx
- `ProductInvoiceEditor()` --calls--> `formatBRL()`  [EXTRACTED]
  app/components/notes/ProductInvoiceEditor.jsx → app/lib/formatters/currency.js
- `ServiceInvoiceEditor()` --calls--> `useAppContext()`  [EXTRACTED]
  app/components/notes/ServiceInvoiceEditor.jsx → app/context/AppContext.jsx
- `ServiceInvoiceEditor()` --calls--> `formatBRL()`  [EXTRACTED]
  app/components/notes/ServiceInvoiceEditor.jsx → app/lib/formatters/currency.js
- `ConferenciaPage()` --calls--> `Button()`  [EXTRACTED]
  app/documentos/[id]/conferencia/page.jsx → app/components/buttons/Button.jsx

## Import Cycles
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchLabel.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchLabel.jsx`
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchRoot.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchRoot.jsx`
- 2-file cycle: `app/components/inputs/DebouncedSearch/DebouncedSearchSelect.jsx -> app/components/inputs/DebouncedSearch/index.jsx -> app/components/inputs/DebouncedSearch/DebouncedSearchSelect.jsx`

## Communities (31 total, 9 thin omitted)

### Community 0 - "decimal.js"
Cohesion: 0.06
Nodes (89): INITIAL_EMPTY_ITEM(), ProductInvoiceEditor(), ServiceInvoiceEditor(), ConferenciaPage(), DivisaoNotasPage(), catalogsRepository, documentRepository, mutationQueue (+81 more)

### Community 1 - "react"
Cohesion: 0.07
Nodes (61): btnType(), Button(), generateButtonClass(), WhatsAppChat(), InputFile(), InputTextArea, ProfilePicture(), AppLayout() (+53 more)

### Community 2 - "utils.js"
Cohesion: 0.06
Nodes (35): CD_SITUACOES_VAGA, getSituacaoVagaLabel(), isVagaAberta(), isVagaCancelada(), isVagaEmProspecao(), isVagaEmRequisicaoCriada(), isVagaFechada(), empty() (+27 more)

### Community 3 - "localStorageService.js"
Cohesion: 0.06
Nodes (29): preparationMutationQueue, sessionPreparations, getAllPrepared(), preparedMutationQueue, sessionPreparedInvoices, getMockCompanies(), MOCK_COMPANIES, getMockPreparedInvoices() (+21 more)

### Community 4 - "invoiceRepository.js"
Cohesion: 0.06
Nodes (38): AppProvider(), inter, metadata, RootLayout(), dependencies, clsx@^2.1.1, @fortawesome/fontawesome-svg-core@^7.1.0, @fortawesome/free-brands-svg-icons@^7.1.0 (+30 more)

### Community 5 - "nfeXmlParser.js"
Cohesion: 0.10
Nodes (21): calculateAccessKeyDV(), UF_IBGE_CODES, validateAccessKey(), WEIGHTS_MODULO_11, cleanDecimal(), decodeXmlEntities(), findDirectChild(), findDirectChildren() (+13 more)

### Community 6 - "@fortawesome/react-fontawesome"
Cohesion: 0.17
Nodes (10): CustomDropdown(), Fieldset(), InputNumber(), Select(), TimePicker(), Accordion(), AccordionItem(), FieldLabel() (+2 more)

### Community 7 - "cn"
Cohesion: 0.12
Nodes (13): cn(), FabAdd(), FabCancel(), FabCustom(), FabSave(), Card(), CardTitle(), InputMonth() (+5 more)

### Community 8 - "photo-modal.js"
Cohesion: 0.16
Nodes (17): cancelCamera(), capturePhoto(), closePhotoModal(), handleDrop(), handleFileSelect(), isMobile, loadProfileFoto(), openCamera() (+9 more)

### Community 9 - "TooltipComponent"
Cohesion: 0.18
Nodes (9): ButtonGroup(), normalizarTelefone(), WhatsappButton(), DebouncedSearchLabel(), InputPassword(), InputText(), SmallLoading(), SortControl() (+1 more)

### Community 10 - "utils.js"
Cohesion: 0.18
Nodes (10): PILL_STYLES, PillsBadge(), DebouncedSearchRoot(), DebouncedSearchSelect(), hasError(), renderError(), DebouncedSearchSelectDelayed(), DebouncedSearchSelectNormal() (+2 more)

### Community 12 - "JobNotification.jsx"
Cohesion: 0.34
Nodes (7): Notifications(), Caption(), Label(), Title(), JobNotification(), ScheduleNotification(), VagaRecrutamentoNotification()

### Community 13 - "dashboard/page.jsx"
Cohesion: 0.24
Nodes (6): PERMISSOES, ButtonToggle(), NewBadge(), PageTabs(), Sidebar(), getMenuDropDown()

### Community 14 - "ScreenTourTip.jsx"
Cohesion: 0.40
Nodes (11): ScreenTourTip(), subscribeTourUpdates(), getRouteKeyByPath(), getSafeStorage(), getScreenTourByPath(), getTourStorageKey(), isTourSeen(), markTourAsSeen() (+3 more)

### Community 15 - "DatePicker.jsx"
Cohesion: 0.29
Nodes (7): Calendar(), DatePicker(), formatDate(), getDaysInMonth(), getFirstDayOfMonth(), isValidDate(), @fortawesome/free-regular-svg-icons

### Community 16 - "JobNotification.jsx"
Cohesion: 0.46
Nodes (4): ModalGrid(), NoDataFound(), Timeline(), TimelineModal()

### Community 17 - "InputDate"
Cohesion: 0.38
Nodes (6): DataHora(), hasError(), renderError(), InputDate(), copyFormatedDate(), getValue()

### Community 18 - "RichText.jsx"
Cohesion: 0.43
Nodes (3): ProgressBar(), RichText(), SunEditor

### Community 20 - "jsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, exclude, @/plugins/*

### Community 22 - "InputEmail"
Cohesion: 0.67
Nodes (3): InputEmail(), hasError(), renderError()

### Community 23 - "numbers.js"
Cohesion: 0.83
Nodes (3): formatDecimal(), formatQuantity(), parseDecimal()

### Community 24 - "Select2"
Cohesion: 1.00
Nodes (3): Select2(), hasError(), renderError()

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `decimal.js`, `utils.js`, `invoiceRepository.js`, `@fortawesome/react-fontawesome`, `cn`, `TooltipComponent`, `utils.js`, `ref_amcharts_amcharts5`, `JobNotification.jsx`, `dashboard/page.jsx`, `ScreenTourTip.jsx`, `DatePicker.jsx`, `JobNotification.jsx`, `RichText.jsx`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Should `decimal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06331045003813883 - nodes in this community are weakly interconnected._
- **Why does `@fortawesome/react-fontawesome` connect `@fortawesome/react-fontawesome` to `decimal.js`, `react`, `utils.js`, `invoiceRepository.js`, `cn`, `TooltipComponent`, `JobNotification.jsx`, `dashboard/page.jsx`, `ScreenTourTip.jsx`, `DatePicker.jsx`, `JobNotification.jsx`, `RichText.jsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.0652395514780836 - nodes in this community are weakly interconnected._
- **Why does `@fortawesome/free-solid-svg-icons` connect `@fortawesome/react-fontawesome` to `decimal.js`, `react`, `utils.js`, `invoiceRepository.js`, `cn`, `TooltipComponent`, `JobNotification.jsx`, `dashboard/page.jsx`, `ScreenTourTip.jsx`, `DatePicker.jsx`, `JobNotification.jsx`, `RichText.jsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `utils.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06015037593984962 - nodes in this community are weakly interconnected._
- **Should `localStorageService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.055904961565338925 - nodes in this community are weakly interconnected._