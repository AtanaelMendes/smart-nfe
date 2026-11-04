## 2026-11-04T17:03:44Z
You are Explorer 3 for Milestone 3 (Document Management Screens).
Your working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_3\

Read authoritative files:
1. ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\www\smart-nfe\PROJECT.md
3. Existing Foundations:
   - c:\www\smart-nfe\app\components\Layouts\AppLayout.jsx
   - c:\www\smart-nfe\app\components\Layouts\Dialog.jsx
   - c:\www\smart-nfe\app\context\AppContext.jsx
   - c:\www\smart-nfe\app\lib\storage\localStorageService.js
   - c:\www\smart-nfe\tests\tier1\m1_layout.test.mjs
   - c:\www\smart-nfe\tests\tier1\m2_domain.test.mjs

MISSION / FOCUS:
1. **Design `/configuracoes` (`app/configuracoes/page.jsx`)**:
   - UI preferences panel hooked to `AppContext` (`settings`, `updateSettings`):
     - Densidade das Tabelas: Compacta (`compact`), Normal (`normal`), Confortável (`comfortable`).
     - Linhas por Página: 10, 25, 50.
     - Tema: Claro (`light`), Escuro (`dark`), Sistema (`system`).
     - Salvamento Automático: toggle ativado / desativado.
     - Limite de Registros na Demonstração: dropdown / input (50, 100, 250).
   - Card "Dados de Demonstração & Fábrica":
     - Exibe estatísticas de armazenamento: versão do schema (`STORAGE_SCHEMA_VERSION = "1.0.0"`), backend ativo (LocalStorage / MemoryStorage), total de documentos em memória/disco.
     - Botão "Restaurar Dados de Fábrica":
       - Abre confirmação modal usando `Dialog.jsx` ("Tem certeza que deseja restaurar todos os dados para o padrão de demonstração? Todas as alterações serão perdidas.").
       - Ao confirmar: chama `localStorageService.resetAll()`, emite toast de sucesso via `useApp().toast('Dados de fábrica restaurados com sucesso!', 'success')`, e atualiza estado.
2. **Automated Test Design for Milestone 3**:
   - Plan test suite `tests/tier1/m3_screens.test.mjs`:
     - Test route rendering & exports for `/documentos/importar`, `/documentos`, `/configuracoes`.
     - Test `invoiceRepository.list()` filtering and pagination logic.
     - Test `localStorageService.resetAll()` integration from settings.
     - Test simulated XML import creation and payload schema.
     - Smoke test live server HTTP endpoints (`/documentos/importar`, `/documentos`, `/configuracoes`).

CRITICAL USER CONSTRAINT:
DO NOT run `pnpm build`, `npm run build`, `pnpm dev`, or `npm run dev`. The live dev server on `http://localhost:3000/dashboard` must stay uninterrupted.
You are read-only. Do NOT modify source code files.

Write a clear, concrete component design, test architecture, and step-by-step recommendation for the Worker in `handoff.md`, and notify orchestrator via `send_message`.
