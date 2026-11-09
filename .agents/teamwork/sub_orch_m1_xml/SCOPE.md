# Scope: Milestone 1 — XML Model 55 Browser Parser & Session Repository

## Architecture
- Module: `app/features/xml/` and session layer in `app/features/invoiceRepository.js`.
- Importer UI: `app/documentos/importar/page.jsx`.
- Strict boundary: Browser-only DOMParser, File API, no external HTTP calls, no backend, no dangerouslySetInnerHTML.
- In-memory session: `sessionInvoices = new Map()`. Zero real fiscal data in persistent `localStorage`.

## Features
- F1: Browser XML NF-e 55 Parser (`app/features/xml/nfeXmlParser.js`) supporting `nfeProc` and `NFe`, namespace-agnostic (`getElementsByTagNameNS('*', localName)`), parsererror handling.
- F2: Chave de Acesso 44-digit structural and Modulo 11 check digit validator (`app/features/xml/accessKeyValidator.js`) with weights [2..9].
- F3: XML to Invoice Contract Mapper (`app/features/xml/xmlToInvoiceMapper.js`) producing deterministic `itemId: 'nfe-' + chaveAcesso + '-item-' + nItem`, `isRealImport: true`, `isDemo: false`.
- F4: In-memory session Map in `app/features/invoiceRepository.js` preventing persistent LocalStorage pollution while seamlessly listing and finding documents.
- F5: Real file import in `app/documentos/importar/page.jsx` with instant validation feedback and session storage warning banner.

## File Boundaries & Write Ownership
- `app/features/xml/nfeXmlParser.js`
- `app/features/xml/accessKeyValidator.js`
- `app/features/xml/xmlToInvoiceMapper.js`
- `app/features/invoiceRepository.js` (session Map and repository methods)
- `app/documentos/importar/page.jsx`

## Verification
- Unit & integration verification of XML parsing with `nfeProc` and `NFe`.
- Modulo 11 vector checks.
- Session Map isolation verification (confirming `localStorageService.save` is NOT called for real imports).
