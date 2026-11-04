# Scope: Parallel E2E Testing Track

## Mission & Scope
Criar a infraestrutura e a suíte completa de testes E2E (Tiers 1-4) derivada dos requisitos do usuário e de negócio (`ORIGINAL_REQUEST.md` e `PROJECT.md`), utilizando o test runner nativo do Node 24 (`node:test` e `node:assert`), publicando `TEST_INFRA.md` e `TEST_READY.md`.

## Deliverables & Tasks
1. **Infraestrutura de Teste (`TEST_INFRA.md`)**:
   - Criar `TEST_INFRA.md` na raiz do projeto conforme a metodologia de 4 Tiers.
2. **Casos de Teste (Tiers 1-4)**:
   - `tests/tier1/`: Testes de cobertura de features (mínimo 5 por feature essencial: formatadores BRL/data/qtd, cálculos decimais sem float binário, integridade dos 5 cenários mockados, envelope de localStorage versionado 1.0.0, contratos de repositório assíncronos).
   - `tests/tier2/`: Testes de borda e casos extremos (arredondamentos ABNT, valores zerados, quantidades fracionárias extremas, validação de saldos na divisão, corrupção de localStorage com fallback seguro).
   - `tests/tier3/`: Testes de integração cross-feature e smoke checks HTTP ao vivo contra `http://localhost:3000` (verificando HTTP 200, título e presença de elementos SmartNFe).
   - `tests/tier4/`: Cenários de aplicação do mundo real (jornada de conferência de NF-e, desmembramento de nota em múltiplos contêineres, detecção e resolução de inconsistências em demo-04).
3. **Publicação do Sinal de Conclusão**:
   - Gerar `TEST_READY.md` na raiz do projeto com o comando de execução e resumo de cobertura.

## Hard Constraints
- NÃO rodar comandos de build (`pnpm build`, `npm run build`) e NÃO iniciar servidores (`pnpm dev`, `npm run dev`).
- Os testes rodam com `node --no-warnings --test tests/**/*.test.mjs`.
- Escrever testes em arquivos `.mjs` dentro da pasta `tests/`. NÃO alterar código de produção em `app/`.

## Acceptance Criteria
- [ ] `TEST_INFRA.md` criado na raiz do projeto.
- [ ] Testes criados para Tiers 1, 2, 3 e 4 cobrindo os requisitos de negócio.
- [ ] `node --no-warnings --test tests/**/*.test.mjs` executa e passa com código de saída 0.
- [ ] `TEST_READY.md` publicado na raiz do projeto.
