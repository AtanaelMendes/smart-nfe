## 2026-11-09T19:34:26Z
[Message] timestamp=2026-11-09T19:34:26Z sender=71db8a14-4c80-4575-92ba-b52ae572b170 priority=MESSAGE_PRIORITY_HIGH content=Você é o E2E Test Writer da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_test_writer_e2e\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\TEST_INFRA.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\handoff.md

Missão:
Criar a infraestrutura de testes sintéticos e os testes automatizados de integração para os 4 fluxos exigidos (R5):
1. Criar a pasta `tests/fixtures/` e gerar fixtures sintéticas de NF-e modelo 55:
   - `tests/fixtures/synthetic_nfe_export_proc.xml`: XML completo em formato `nfeProc` v4.00 com protocolo de autorização, emitente, destinatário no exterior, itens de exportação (CFOP 7101, NCM 09011110 e 84089090), frete, seguro, outras despesas e chave de acesso de 44 dígitos com Dígito Verificador matematicamente válido pelo Módulo 11 (pesos 2..9).
   - `tests/fixtures/synthetic_nfe_simple.xml`: XML válido em formato `NFe` avulso (sem envelope `nfeProc` e sem protocolo).
   - `tests/fixtures/synthetic_nfe_invalid_key.xml`: XML idêntico mas com Dígito Verificador propositalmente corrompido para testar rejeição.
   - `tests/fixtures/synthetic_malformed.xml`: Arquivo XML sintaticamente quebrado (tag não fechada) para testar tratamento gracioso de erro.
2. Criar a pasta `tests/integration/` e implementar os testes automatizados de integração (utilizando o runner nativo do Node 24: `node:test` e `assert/strict`):
   - `tests/integration/flow_a_xml_import.test.mjs`: Testes do Fluxo A (Importação real de XML, validação da chave 44 dígitos com DV módulo 11, mapeamento de itens com até 4 decimais, conciliação dos totais da NF-e, isolamento da memória de sessão contra poluição do LocalStorage, e tratamento de XML inválido/malformado).
   - `tests/integration/flow_b_conferencia_stable_edit.test.mjs`: Estrutura de testes do Fluxo B (Edição de itens por itemId estável sob filtro por NCM e descrição, recálculo de totais em decimal puro, preservação de frete/seguro, snapshot de valorOriginal e restauração).
   - `tests/integration/flow_c_division_balances.test.mjs`: Estrutura de testes do Fluxo C (Divisão entre notas conservando 4 casas decimais sem arredondamento prematuro, distribuição equilibrada e de saldo restante, bloqueio de alocação excessiva e de saldos pendentes).
   - `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`: Estrutura de testes do Fluxo D (Detecção de apontamentos fiscais, confirmação explícita de correções, bloqueio de aplicação em massa para CFOP/NCM sensíveis, e mecanismo de Undo com reversão de estado e reexecução de validações).
3. Publicar `TEST_READY.md` na raiz do projeto com o sumário dos testes implementados.
4. Escrever relatório detalhado em `handoff.md` no seu diretório de trabalho com os comandos de execução e resultados dos testes.

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
