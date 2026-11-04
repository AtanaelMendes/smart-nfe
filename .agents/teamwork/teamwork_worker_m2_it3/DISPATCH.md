## 2026-11-04T16:45:41Z
[Message] timestamp=2026-11-04T16:45:41Z sender=3aeeebdd-68a6-49e6-8f40-494114a9f1f7 priority=MESSAGE_PRIORITY_HIGH content=You are the Implementation Worker for Milestone 2 Iteration 3.
Your working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_it3\

Read authoritative files:
1. ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\www\smart-nfe\PROJECT.md
3. Explorer 1 Handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_it3_1\handoff.md
4. Explorer 2 Handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_it3_2\handoff.md
5. Explorer 3 Handoff & Patch: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_it3_3\handoff.md and c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_it3_3\invoiceRepository_situacao_fix.patch
6. Challenger 1 Handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m2_it2_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL USER CONSTRAINT:
The project is already running at http://localhost:3000/dashboard (dev server run externally by user). DO NOT run build commands (e.g. `pnpm build`, `npm run build`) and DO NOT start dev servers (`pnpm dev`, `npm run dev`), to avoid port conflicts or environment freezes. Perform only tests and verifications (e.g. unit/node test scripts, lint) that do not conflict with or bring down the active dev server.

WRITE OWNERSHIP:
You have exclusive write ownership of:
- `c:\www\smart-nfe\app\features\invoiceRepository.js`

IMPLEMENTATION TASK:
In `app/features/invoiceRepository.js`, update the dynamic item validation and state synchronization in `updateItem()` (around lines 270–325).
Harmonize item `situacao` determination and empty-field validation with `getValidationIssues()`:
```javascript
      // Sincroniza inconsistências e situação do item modificado
      const isExport = Boolean(
        invoice.destinatario?.pais &&
        invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
        invoice.destinatario?.paisCodigo !== 'BR'
      );
      const cleanCfop = String(updatedItem.cfop || '').trim();
      const cleanNcm = String(updatedItem.ncm || '').replace(/\D/g, '');
      const expectedTotal = calculateItemTotal(updatedItem.valorUnitario, updatedItem.quantidade);
      const cleanRec = cleanDecimalString(updatedItem.valorTotal);
      const recordedTotal = Number.isFinite(parseFloat(cleanRec))
        ? parseFloat(cleanRec).toFixed(2)
        : '0.00';
      const hasMathDiff = Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01;

      // Validação fiscal unificada do item (sincronizada com getValidationIssues)
      const hasCfopError = isExport
        ? (!cleanCfop || !cleanCfop.startsWith('7'))
        : cleanCfop.startsWith('7');
      const hasNcmError = cleanNcm.length !== 8;
      const hasFiscalError = hasCfopError || hasNcmError || hasMathDiff;

      if (Array.isArray(updatedItem.inconsistencias)) {
        updatedItem.inconsistencias = updatedItem.inconsistencias.filter((inc) => {
          if (inc.campo === 'cfop') return hasCfopError;
          if (inc.campo === 'ncm') return hasNcmError;
          if (inc.campo === 'valorTotal') return hasMathDiff;
          if (inc.campo === 'unidade') {
            const expectedUnit = (inc.esperado || 'PAR').trim().toUpperCase();
            return String(updatedItem.unidade || '').trim().toUpperCase() !== expectedUnit;
          }
          if (inc.esperado) {
            return String(updatedItem[inc.campo] || '').trim() !== String(inc.esperado).trim();
          }
          return true;
        });
      }

      const hasRemainingMockErrors =
        Array.isArray(updatedItem.inconsistencias) && updatedItem.inconsistencias.length > 0;

      const hasAnyError = hasFiscalError || hasRemainingMockErrors;

      if (hasAnyError) {
        updatedItem.situacao = 'inconsistente';
      } else {
        updatedItem.situacao = 'conferido';
      }
```

VERIFICATION PIPELINE:
1. `node --no-warnings --test tests/tier5/m2_challenger1_concurrency_validation.test.mjs` (must pass 13/13 100%)
2. `node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs` (must pass 23/23 100%)
3. `node --no-warnings --test tests/tier1/m2_domain.test.mjs` (must pass 44/44 100%)
4. `node --no-warnings --test tests/**/*.test.mjs` (must pass 151/151 100%)
5. `npx eslint app/features/invoiceRepository.js` (0 errors, 0 warnings)
6. Smoke test: `node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"`

When finished, produce `handoff.md` in your working directory and notify the orchestrator with `send_message`.
