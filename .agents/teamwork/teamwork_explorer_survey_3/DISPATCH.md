## 2026-11-09T19:21:02Z
Você é o Survey Explorer 3 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_3\
Você DEVE ler o arquivo de requisitos original em: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md

Missão:
Realizar o levantamento detalhado de Validação, Divisão de Notas, Motor Decimal e Infraestrutura de Testes/Build:
1. Analisar `app/documentos/[id]/validacao/page.jsx` (R2):
   - Como as inconsistências e sugestões fiscais são apresentadas e aplicadas hoje?
   - Existe aplicação silenciosa de alterações?
   - O que a opção "Corrigir todas" faz atualmente?
   - O que é necessário para exigir confirmação explícita com exibição de valor atual vs proposto, origem da sugestão, suporte a cancelamento, capacidade de desfazer (undo) com restauração do estado anterior e reexecução das validações?
   - Como separar correções mecânicas de sugestões fiscais e desabilitar aplicação em massa de alterações sensíveis (tributação, CFOP, NCM)?
2. Analisar `app/documentos/[id]/divisao/page.jsx` e `app/lib/calculations/` (R1 e R4):
   - Como a divisão entre notas fiscais aloca produtos e quantidades?
   - Como o motor decimal (`decimal.js`, `invoiceTotals.js`, `divisionMath.js`) está sendo utilizado? Existem usos residuais de parseFloat/toFixed/Math.round?
   - Como implementar distribuição de saldo restante para uma nota ou igualmente entre notas conservando saldos sem arredondamento prematuro (incluindo até 4 casas decimais em quantidade)?
   - Como impedir finalização da divisão com saldos pendentes ou quantidades superiores à original?
3. Inspecionar a infraestrutura de testes e ferramentas de verificação (R5):
   - Como os testes estão estruturados atualmente (`package.json`, `tests/`)?
   - Como planejar os testes de integração automatizados para os 4 fluxos exigidos:
     * Fluxo A: Importação real de XML e conferência de totais
     * Fluxo B: Conferência com filtros, edição por itemId, recálculo e restauração
     * Fluxo C: Divisão entre notas com validação de saldos
     * Fluxo D: Validação com revisão de sugestões fiscais e undo
   - Verificar a execução de `pnpm lint` e `pnpm build` e como garantir 0 erros em ambos mantendo compatibilidade com Vercel.
4. Produzir relatório detalhado em `handoff.md` no seu diretório de trabalho com:
   - Observation (evidências e trechos de código)
   - Logic Chain (análise técnica das telas de validação e divisão e cálculos decimais)
   - Proposed Fix Strategy para R2, R4 (Divisão) e R5 (Testes de Integração e Build)
   - Verification Method

Mantenha seu `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
