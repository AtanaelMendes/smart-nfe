## 2026-11-04T19:29:16Z
You are Remediation Worker (teamwork_worker).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_lint_fix\
Original Request path: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: c:\www\smart-nfe\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL USER INSTRUCTIONS:
- O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário).
- NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
- Apenas crie, edite arquivos e realize testes ou verificações que não derrubem nem conflitem com o servidor já ativo.

FORENSIC AUDIT FAILURE EVIDENCE FROM AUDITOR:
```
Target File: c:\www\smart-nfe\app\documentos\page.jsx
Linha 291:
<p className="text-sm text-slate-600 dark:text-slate-300 p-4">
  Tem certeza de que deseja excluir o documento <strong>NF-e {deleteDialog.invoice?.numero}</strong>? Esta ação pode ser desfeita clicando em "Restaurar Mocks".
</p>

Erros reportados pelo ESLint:
C:\www\smart-nfe\app\documentos\page.jsx
   53:6    warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  291:151  error    `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`                                              react/no-unescaped-entities
  291:167  error    `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`                                              react/no-unescaped-entities

✖ 3 problems (2 errors, 1 warning)
Exit Code: 1
```

TASKS:
1. Fix `app/documentos/page.jsx`:
   - Replace unescaped `"` around "Restaurar Mocks" with `&quot;Restaurar Mocks&quot;`.
   - Fix the `useEffect` hook warning at line 53 by wrapping `loadData` in `useCallback` or providing the proper dependency array.
2. Run ESLint verification:
   - Run `node node_modules/eslint/bin/eslint.js app/documentos/page.jsx` — it MUST return exit code 0 with 0 errors and 0 warnings.
   - Run `node node_modules/eslint/bin/eslint.js app/` across the whole `app/` directory to ensure no other screen has any ESLint errors or unescaped entities!
3. Verification:
   - Smoke test `http://localhost:3000/documentos` via node fetch to ensure HTTP 200 OK.
   - Run existing tests: `node --no-warnings --test tests/tier1/*.test.mjs` to ensure zero regressions.
4. Delivery:
   - Write `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_lint_fix\handoff.md`.
   - Send completion message to orchestrator with verbatim command outputs.
