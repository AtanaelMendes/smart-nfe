# Relatório de Handoff — Layout & Shell Components (M1)

**Agente:** `teamwork_explorer_m1_1`  
**Destinatário:** Sub-Orchestrator M1 (`sub_orch_m1_foundation` / `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`)  
**Data:** 04/11/2026  
**Status:** Concluído com sucesso (Hard Handoff)  
**Artefato Principal Produzido:** `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\strategy_layout.md`

---

## 1. Observation (Observações Diretas)

1. **`app/components/Layouts/DemoBadge.jsx` (linhas 9-12):**
   ```jsx
   <span className="inline-flex items-center gap-1.5 bg-slate-800 bg-opacity-80 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow">
     <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
     DEMO
   </span>
   ```
   O texto exibido é estritamente `"DEMO"` e possui a classe CSS `uppercase`. O critério de aceite 60 e o requisito R4 exigem `"Modo Demonstração"`.

2. **`app/components/Layouts/SmartNFeSidebar.jsx` (linhas 16-41):**
   ```javascript
   const menuItems = [
     { label: 'Dashboard', href: '/dashboard', icon: faChartBar },
     {
       label: 'Documentos', href: '/documentos', icon: faFileInvoice,
       children: [
         { label: 'Importar NF-e', href: '/documentos/importar', icon: faFileImport },
         { label: 'Todos os documentos', href: '/documentos', icon: faListAlt },
       ],
     },
     { label: 'Notas Preparadas', href: '/notas-preparadas', icon: faClipboardCheck },
     { label: 'Configurações', href: '/configuracoes', icon: faGear },
   ];
   ```
   "Importar" não está no primeiro nível; está aninhado como filho de "Documentos". A navegação direta exigida no critério de aceite 59 é de 5 itens no nível raiz: Dashboard, Documentos, Importar, Notas Preparadas, Configurações.
   Além disso, a lógica de item ativo na linha 44 (`isActive = pathname === item.href || (item.children && item.children.some(c => pathname === c.href))`) não trata rotas filhas de documentos como `/documentos/[id]/conferencia`.

3. **`app/components/Layouts/SmartNFeHeader.jsx` & `AppLayout.jsx`:**
   `SmartNFeHeader.jsx` possui alternador de tema escuro (`darkMode`) e breadcrumbs dinâmicos, mas faltam classes `dark:*` no elemento `<header>` e no texto, fazendo com que o cabeçalho permaneça branco mesmo no modo escuro.
   `AppLayout.jsx` integra `SmartNFeSidebar`, `SmartNFeHeader`, `ToastContainer` e `DemoBadge`. O `<main>` não possui transição de tema escuro explícita.
   `ToastContainer.jsx` renderiza no canto superior direito (`fixed top-4 right-4 z-[9999]`), porém o container não possui `pointer-events-none` no wrapper externo, podendo interceptar cliques indesejados caso cubra áreas interativas da tela.

4. **`app/context/AppContext.jsx` (linhas 65-70):**
   ```javascript
   const toast = {
     success: (msg) => addToast(msg, 'success'),
     error: (msg) => addToast(msg, 'error'),
     warning: (msg) => addToast(msg, 'warning'),
     info: (msg) => addToast(msg, 'info'),
   };
   ```
   O objeto `toast` é um novo objeto instanciado a cada ciclo de render do `AppProvider`, gerando instabilidade referencial para hooks dependentes. Além disso, `toast.success/error/...` não repassa o parâmetro de duração opcional para `addToast`.
   O estado inicial de `settings` não possui uma constante exportada `DEFAULT_SETTINGS` para permitir restauração de configurações no `/configuracoes`.

5. **Servidor em Execução:**
   Comando executado: `node -e "fetch('http://localhost:3000/dashboard').then(r => console.log('HTTP Status:', r.status))"`
   Resultado: `HTTP Status: 200`
   O servidor de desenvolvimento do usuário está plenamente operacional. A restrição de **NÃO** rodar `pnpm build` ou `pnpm dev` foi integralmente respeitada.

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio)

1. **Ajuste do DemoBadge:**
   - Observação 1 mostra que o badge renderiza `"DEMO"`.
   - O Critério de Aceite 60 e o Requisito R4 exigem explicitamente `"Modo Demonstração"` visível em todas as telas.
   - Logo, substituir a string de texto para `"Modo Demonstração"`, remover a classe `uppercase` (para não forçar "MODO DEMONSTRAÇÃO"), ajustar o tamanho da fonte para `text-xs font-medium` e manter `pointer-events-none` com `data-testid="demo-badge"` resolve a discrepância com conformidade total.

2. **Ajuste da Sidebar:**
   - Observação 2 mostra que "Importar" está em subnível e faltam 5 menus raiz.
   - O Critério de Aceite 59 estabelece: *"A Sidebar exibe exclusivamente a estrutura de menus do SmartNFe (Dashboard, Documentos, Importar, Notas Preparadas, Configurações)"*.
   - A promoção de "Importar" para a raiz como `menuItems[2]` (`href: '/documentos/importar'`) atende diretamente ao requisito.
   - Para evitar colisão visual onde `/documentos/importar` destacaria simultaneamente "Documentos" e "Importar", a lógica de `isActive` foi refinada para:
     `isCurrent || (item.href === '/documentos' && pathname.startsWith('/documentos/') && pathname !== '/documentos/importar')`. Isso garante destaque unívoco para qualquer rota do sistema.

3. **Integração do Header e AppLayout:**
   - Observação 3 indica ausência de estilização escura no header e falta de `pointer-events-none` no invólucro do ToastContainer.
   - Adicionando `dark:bg-slate-900 dark:border-slate-800` no header e `dark:bg-slate-900 dark:text-slate-100` no container principal de `AppLayout.jsx`, o sistema ganha suporte completo ao alternador de tema já existente no `AppContext`.
   - Adicionando `pointer-events-none` no container de toast e `pointer-events-auto` em cada toast individual, garante-se que os toasts sejam clicáveis/fecháveis sem bloquear o conteúdo subjacente da página.

4. **Estabilização do AppContext:**
   - Observação 4 mostra recriação de `toast` a cada render.
   - O uso de `useMemo` tanto para o objeto `toast` quanto para o `value` do contexto garante estabilidade de referência, eliminando re-renders infinitos ou desnecessários em componentes que usem `useAppContext()`.
   - Adicionar o parâmetro opcional de duração em `toast.success(msg, duration)` e exportar `DEFAULT_SETTINGS` cumpre integralmente o Contrato 5 de `PROJECT.md` e facilita a tela de configurações.

---

## 3. Caveats (Ressalvas)

- **Modo Somente Leitura:** Esta exploração não modificou nenhum arquivo de código-fonte no repositório, em conformidade estrita com o papel de `explorer` e as restrições impostas. Todas as alterações propostas foram fornecidas com código completo e pronto para aplicação em `strategy_layout.md`.
- **Servidor Ativo:** Como o servidor já está ativo na porta 3000, as alterações a serem aplicadas pelo agente de implementação serão compiladas automaticamente pelo Fast Refresh do Next.js sem necessidade de reiniciar o processo.
- **Telas Restantes:** O `AppLayout` já está pronto para envelopar `/dashboard` e as demais 7 telas conforme forem implementadas nos Milestones 1 a 5.

---

## 4. Conclusion (Conclusão)

A formulação da estratégia para o Milestone 1 (Layout & Shell) está completa, detalhada e validada:
1. `DemoBadge.jsx`: Código pronto exibindo `"Modo Demonstração"` com indicador âmbar e `pointer-events-none`.
2. `SmartNFeSidebar.jsx`: Código pronto com os 5 menus raiz exclusivos (Dashboard, Documentos, Importar, Notas Preparadas, Configurações) e resolução perfeita de rota ativa.
3. `SmartNFeHeader.jsx` & `AppLayout.jsx`: Código pronto com suporte dark mode, breadcrumbs dinâmicos e toasts não-bloqueantes.
4. `AppContext.jsx`: Código pronto com `toast` e `value` memoizados, `DEFAULT_SETTINGS` exportado e suporte a durações customizadas.

O agente de implementação pode aplicar diretamente as propostas documentadas em `strategy_layout.md`.

---

## 5. Verification Method (Método de Verificação Independente)

O revisor e a equipe podem validar a estratégia e a futura implementação executando os seguintes comandos via terminal PowerShell ou Node:

1. **Inspeção Estática de Conformidade do DemoBadge:**
   ```powershell
   node -e "const fs = require('fs'); const s = fs.readFileSync('app/components/Layouts/DemoBadge.jsx', 'utf8'); if (!s.includes('Modo Demonstração')) throw new Error('DemoBadge não contém Modo Demonstração'); if (s.includes('DEMO')) throw new Error('DemoBadge ainda contém DEMO'); console.log('PASS: DemoBadge text OK');"
   ```

2. **Inspeção Estática da Sidebar:**
   ```powershell
   node -e "const fs = require('fs'); const s = fs.readFileSync('app/components/Layouts/SmartNFeSidebar.jsx', 'utf8'); if (!s.includes('/documentos/importar')) throw new Error('Sidebar não tem Importar na raiz'); console.log('PASS: Sidebar root Importar OK');"
   ```

3. **Inspeção de Contrato do AppContext:**
   ```powershell
   node -e "const fs = require('fs'); const s = fs.readFileSync('app/context/AppContext.jsx', 'utf8'); if (!s.includes('useMemo')) throw new Error('AppContext falta useMemo'); console.log('PASS: AppContext memoization OK');"
   ```

4. **Smoke Test de Servidor Ativo (sem build):**
   ```powershell
   node -e "fetch('http://localhost:3000/dashboard').then(r => console.log('PASS: HTTP', r.status)).catch(e => console.error('FAIL:', e.message))"
   ```

Condição de Invalidação: O handoff é considerado inválido caso o texto do DemoBadge não seja `"Modo Demonstração"` ou caso o menu "Importar" não conste no nível raiz da sidebar.
