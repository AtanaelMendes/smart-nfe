# Handoff Report — Levantamento de Especificações e Regras de Negócio (Survey Spec Miner)

**Agente:** `teamwork_spec_miner_survey_2`  
**Destinatário:** Orquestrador (`3aeeebdd-68a6-49e6-8f40-494114a9f1f7`)  
**Data:** 04/11/2026  
**Tipo de Handoff:** Hard (Tarefa Concluída)  
**Artefato Produzido:** `c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\survey_specs.md`

---

## 1. Observation

1. **Requisitos Originais do Usuário:**
   - Em `c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`, linhas 5 a 79:
     - Objetivo do sistema: Plataforma de preparação inteligente de notas fiscais eletrônicas de exportação para contadoras avaliarem o fluxo antes da API backend.
     - 4 Pilares definidos: R1 (Fundação e auditoria), R2 (Mocks, formatadores, cálculos e persistência), R3 (8 Telas obrigatórias) e R4 (Regras e restrições técnicas).
   - Em `c:\www\smart-nfe\.github\copilot-instructions.md`, linhas 127 a 234:
     - Contrato assíncrono padrão dos repositórios: `list(filters)`, `findById(id)`, `update(id, data)`, `updateItem(id, itemId, data)`, `getValidationIssues(id)`.
     - 5 Cenários mockados definidos: `demo-01` (8 itens), `demo-02` (25 itens), `demo-03` (50 itens), `demo-04` (inconsistências simuladas), `demo-05` (produtos repetidos com 15 itens).
     - Persistência com `STORAGE_SCHEMA_VERSION = "1.0.0"` e métodos `save`, `load`, `reset`, `resetAll`.
     - Regra rígida: "Usar strings decimais para valores de negócio. Centralizar cálculos em `app/lib/calculations/`".

2. **Componentes e Código Existente Inspecionados:**
   - `app/components/Layouts/SmartNFeSidebar.jsx` (linhas 16 a 41): Menu do SmartNFe já estruturado com Dashboard, Documentos, Notas Preparadas e Configurações.
   - `app/components/Layouts/SmartNFeHeader.jsx` (linhas 7 a 58): Cabeçalho com breadcrumbs, badge demo e toggle para dark mode.
   - `app/components/Layouts/AppLayout.jsx` (linhas 8 a 26): Empacota SmartNFeSidebar, SmartNFeHeader, ToastContainer e DemoBadge.
   - `app/components/Layouts/DemoBadge.jsx` (linhas 3 a 14): Badge flutuante inferior com pulso âmbar e texto DEMO.
   - `app/context/AppContext.jsx` (linhas 7 a 84): Provedor com `toasts` (`addToast`, `toast.success`, `error`, etc.), `darkMode` e preferências `settings` (`tableDensity`, `rowsPerPage`, `demoValueLimit`, `showOriginalValues`, `autoSave`).
   - `app/components/table/DataTable.jsx` (linhas 18 a 150): Suporte implementado para `columns` explícitas `{ key, label, align, render }` e flag `dense`.
   - `app/components/inputs/InputFile.jsx` (linhas 28 a 30 e 102 a 124): Aceita extensões `.xml` e `.pdf`, valida tamanho máximo de 10MB e integra toasts.
   - `app/components/Layouts/Dialog.jsx` (linhas 13 a 115): Diálogo modal com confirmação, cancelamento e textarea opcional com `textAreaMinLength`.
   - `next.config.js`: Já limpo, sem `basePath` e sem `output: 'export'`.
   - `app/dashboard/page.jsx` (linhas 7 a 36): Código legado de template que ainda checa `isAuthenticated` e redireciona para `/login`, precisando ser substituído pelo dashboard SmartNFe.

3. **Instrução Crítica do Usuário Recebida em DISPATCH.md (2026-11-04T14:32:28Z):**
   - "CRITICAL USER INSTRUCTION: O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário). NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente."

---

## 2. Logic Chain

1. **Da observação 1 e 2**, foi identificado que a base do layout (`AppLayout`, `SmartNFeSidebar`, `SmartNFeHeader`, `DemoBadge`, `AppContext`) já está construída no padrão do SmartNFe, mas as rotas de negócio (`/documentos`, `/documentos/importar`, `/documentos/[id]/conferencia`, `/documentos/[id]/divisao`, `/documentos/[id]/validacao`, `/notas-preparadas`, `/configuracoes`) e a rota `/dashboard` ainda precisam de implementação ou substituição da lógica de template antigo.
2. **Da observação 1**, o domínio fiscal exige alta fidelidade em regras de exportação brasileiras: CFOP obrigatoriamente iniciado em 7 (ex: 7101/7102), NCM de 8 dígitos, chave de acesso de 44 dígitos, e cálculos de quantidade e unitário que não utilizem aritmética de ponto flutuante binário para evitar resíduos decimais.
3. **Da observação 1 e 2**, os 5 cenários mockados representam perfis complementares que cobrem: conferência padrão (`demo-01`), stress de rolagem e paginação (`demo-02` e `demo-03`), acionamento do motor de inconsistências fiscais (`demo-04`), e gerenciamento de múltiplos lotes repetidos (`demo-05`).
4. **Da observação 3**, qualquer verificação deve ser puramente analítica e baseada em inspeção estática durante esta fase de survey, sem disparar processos em segundo plano que interfiram com a porta 3000 já aberta pelo usuário.
5. **Conclusão direta:** Todas as especificações funcionais e técnicas foram consolidadas de forma exaustiva no arquivo `survey_specs.md`, cobrindo detalhadamente as entidades, contratos, telas, fórmulas e casos de borda.

---

## 3. Caveats

- **Cenários de Mock e Módulos Faltantes:** As pastas `app/lib/data/`, `app/lib/formatters/`, `app/lib/calculations/`, `app/lib/storage/` e `app/features/` ainda não existem fisicamente na pasta de código fonte e foram integralmente especificadas no documento `survey_specs.md` para que as próximas equipes de implementação as criem rigorosamente segundo o contrato.
- **Ambiente de Execução:** Nenhuma compilação ou start de servidor foi acionado por este agente em observância estrita à instrução do usuário.

---

## 4. Conclusion

O levantamento de requisitos de negócio, regras fiscais de exportação, contratos de repositório, cálculo decimal e especificação das 8 telas foi finalizado com 100% de cobertura no documento `survey_specs.md`. O projeto está pronto para a fase de decomposição arquitetural e geração do `PROJECT.md` pelo orquestrador.

---

## 5. Verification Method

Para verificar de forma independente as especificações geradas:
1. Inspecionar o documento completo gerado em:  
   `c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\survey_specs.md`
2. Verificar a aderência contra `c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md` e `c:\www\smart-nfe\.github\copilot-instructions.md`.
3. Confirmar que todas as 8 telas, 5 cenários, contratos de repositório, fórmulas de arredondamento e envelope de LocalStorage versionado 1.0.0 estão detalhados.
