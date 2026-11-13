# Relatório de Investigação Técnica — Defeito de Auto-Fechamento do Mobile Drawer

**Agente**: `m2_it2_explorer_1` (teamwork_explorer)  
**Papel**: explorer  
**Data**: 2026-11-13  
**Diretório de Trabalho**: `c:\www\smart-nfe`  
**Pasta de Estado**: `c:\www\smart-nfe\.agents\teamwork\m2_it2_explorer_1\`  
**Milestone**: Milestone 2 — Left Drawer & Responsive Layout (R1) — Iteração 2  

---

## 1. Sumário Executivo

A investigação confirmou integralmente o defeito crítico reportado pelo Challenger 2 (`m2_challenger_2`) em `app/components/Layouts/SmartNFeSidebar.jsx` (linhas 118-124).
O `useEffect` responsável pelo fechamento automático do menu móvel durante a navegação possui o array de dependências `[pathname, mobileOpen, onMobileClose]`. Devido à presença de `mobileOpen` nas dependências sem verificação se `pathname` efetivamente se alterou, qualquer transição de abertura (`mobileOpen: false -> true`) faz o React disparar o callback do efeito no ciclo de renderização subsequente, invocando imediatamente `onMobileClose()`. Como consequência, o drawer móvel fecha de maneira instantânea na mesma rota, tornando impossível para o usuário visualizar o menu ou clicar em links em viewports $\le 1024\text{px}$.

A solução arquitetural definitiva e segura consiste em utilizar `useRef(pathname)` como guarda de histórico de rotas, atualizando a referência incondicionalmente a cada alteração de rota e disparando `onMobileClose()` estritamente quando `pathname !== prevPathnameRef.current`.

---

## 2. Anatomia Detalhada do Defeito

### 2.1. Código Atual em `app/components/Layouts/SmartNFeSidebar.jsx`

No arquivo `SmartNFeSidebar.jsx`, as linhas 1-4 e 118-124 apresentam:

```javascript
// Linhas 1-4:
'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Linhas 118-124:
// Fecha o drawer móvel automaticamente na navegação de rotas
useEffect(() => {
  if (mobileOpen && onMobileClose) {
    onMobileClose();
  }
}, [pathname, mobileOpen, onMobileClose]);
```

### 2.2. Rastreamento do Ciclo de Vida do React 19 (Mecânica de Dependências)

1. **Estado Inicial**:
   - Rota atual: `/dashboard`.
   - `mobileOpen = false`.
   - Na montagem do componente, o efeito executa. Como `mobileOpen` é `false`, a condição `if (mobileOpen && onMobileClose)` avalia como `false`. Nada ocorre.

2. **Ação do Usuário — Abertura do Menu**:
   - Em viewport $\le 1024\text{px}$, o usuário clica no botão hambúrguer no cabeçalho (`SmartNFeHeader.jsx`).
   - `toggleMobileDrawer()` em `AppContext.jsx` altera o estado `mobileDrawerOpen` de `false` para `true`.
   - `AppLayout.jsx` propaga `mobileDrawerOpen` para a prop `mobileOpen` de `SmartNFeSidebar.jsx`.

3. **Re-renderização e Disparo Indevido do Hook**:
   - `SmartNFeSidebar` re-renderiza com:
     - `pathname`: `'/dashboard'` (idêntico ao anterior).
     - `mobileOpen`: `true` (alterado de `false`).
     - `onMobileClose`: referência estável via `useCallback`.
   - O algoritmo de detecção de dependências do React (`Object.is(prevDep, nextDep)`) avalia:
     - `Object.is('/dashboard', '/dashboard')` $\to$ `true`.
     - `Object.is(false, true)` $\to$ `false` (**Diferença detectada!**).
   - O React agenda e executa a função de efeito após a renderização.
   - Dentro da função:
     ```javascript
     if (mobileOpen && onMobileClose) {
       onMobileClose(); // EXECUTADO!
     }
     ```
   - Como `mobileOpen` agora é `true`, a condição avalia para `true` e `onMobileClose()` é chamado imediatamente.
   - `onMobileClose()` executa `setMobileDrawerOpen(false)`, revertendo o estado para `false`.
   - **Resultado Empírico**: O drawer é fechado no mesmo frame/tick em que foi aberto. O usuário não consegue interagir com o menu móvel.

---

## 3. Análise da Solução Arquitetural: Guarda de Rota com `useRef(pathname)`

### 3.1. Princípio de Projeto
O fechamento do drawer móvel deve ocorrer em duas circunstâncias distintas:
1. **Interação Direta do Usuário**:
   - Clique no backdrop (`onClick={onMobileClose}` já implementado na linha 185).
   - Tecla Escape (`handleKeyDown` com `e.preventDefault()` e `e.stopPropagation()` já implementado nas linhas 94-102).
   - Clique no botão 'X' (`onClick={onMobileClose}` já implementado na linha 209).
   - Clique em qualquer item do menu móvel (`onClick={onMobileClose}` já implementado na linha 228).
2. **Transição de Rota Assíncrona / Externa**:
   - Navegação por botões de Avançar/Voltar do navegador (History API).
   - Redirecionamentos programáticos disparados por outros componentes ou timers.

O `useEffect` existe para cobrir o caso 2. Portanto, seu critério de ativação deve ser **estritamente a transição de rota**, nunca a alteração do estado de visibilidade do drawer (`mobileOpen`).

### 3.2. Implementação Proposta com `useRef`

```javascript
import { useEffect, useRef } from 'react';
// ...
const prevPathnameRef = useRef(pathname);

// Fecha o drawer móvel automaticamente na navegação de rotas
useEffect(() => {
  if (prevPathnameRef.current !== pathname) {
    prevPathnameRef.current = pathname;
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }
}, [pathname, mobileOpen, onMobileClose]);
```

### 3.3. Rastreamento dos Cenários e Casos de Borda com a Solução

| Cenário | Estado Inicial | Evento | Comportamento do Hook | Resultado |
|---|---|---|---|---|
| **A. Montagem Inicial** | Montagem | Render inicial na rota `/dashboard` | `prevPathnameRef.current` inicializado com `/dashboard`. `prevPathnameRef.current !== pathname` é `false`. | Nenhuma ação. Drawer permanece fechado. |
| **B. Abertura na mesma rota** | Fechado na rota `/dashboard` | Usuário clica no hambúrguer (`mobileOpen = true`) | `mobileOpen` mudou, efeito roda. Porém `prevPathnameRef.current` (`/dashboard`) é igual a `pathname` (`/dashboard`). Condição `!==` é `false`. | **Nenhuma ação! Drawer permanece aberto.** |
| **C. Re-renderizações espúrias** | Aberto na rota `/dashboard` | Tema dark mode altera, resize de janela, etc. | Efeito roda. `prevPathnameRef.current === pathname`. Condição `!==` é `false`. | Nenhuma ação. Drawer permanece aberto. |
| **D. Navegação externa com drawer aberto** | Aberto na rota `/dashboard` | Botão "Voltar" do navegador acionado $\to$ rota vai para `/documentos` | `pathname` mudou. `'/dashboard' !== '/documentos'` é `true`. Atualiza `prevPathnameRef.current = '/documentos'`. Como `mobileOpen` é `true`, invoca `onMobileClose()`. | **Drawer fecha corretamente na mudança de rota.** |
| **E. Navegação com drawer fechado** | Fechado na rota `/dashboard` | Usuário navega para `/documentos` (ex: link na página) | `pathname` mudou. `prevPathnameRef.current !== pathname` é `true`. Atualiza `prevPathnameRef.current = '/documentos'`. Como `mobileOpen` é `false`, `onMobileClose` NÃO é chamado. | **Ref sincronizado com nova rota.** |
| **F. Abertura posterior na nova rota** | Fechado na rota `/documentos` | Usuário clica no hambúrguer | `mobileOpen` se torna `true`. Efeito roda. Como `prevPathnameRef.current` já foi atualizado para `/documentos` no passo E, `prevPathnameRef.current !== pathname` é `false`. | **Drawer permanece aberto na nova rota.** |
| **G. Clique no link da mesma rota no menu** | Aberto na rota `/documentos` | Usuário clica em "Documentos" no menu móvel | `NavItem` dispara `onClick={onMobileClose}` síncrono. O `pathname` não muda. | Drawer fecha via evento de clique do usuário. |

### 3.4. Ponto Crítico de Implementação: Atualização Incondicional do Ref

Um risco sutil de regressão ocorreria se o desenvolvedor posicionasse a atualização do ref dentro do bloco `if (mobileOpen)`:
```javascript
// INCORRETO - NÃO FAZER:
if (prevPathnameRef.current !== pathname) {
  if (mobileOpen && onMobileClose) {
    prevPathnameRef.current = pathname; // ERRO: Se drawer estava fechado, ref não atualiza!
    onMobileClose();
  }
}
```
Se a atualização do ref estivesse condicionada a `mobileOpen === true`:
- Uma navegação ocorrida enquanto o drawer estivesse fechado deixaria `prevPathnameRef.current` defasado (apontando para a rota antiga).
- Quando o usuário posteriormente abrisse o drawer na nova rota, a comparação `prevPathnameRef.current !== pathname` detectaria a defasagem e fecharia o drawer no instante da abertura!

**Regra Absoluta**: `prevPathnameRef.current = pathname;` deve ser executado **imediatamente e incondicionalmente** dentro de `if (prevPathnameRef.current !== pathname)`.

---

## 4. Avaliação das Recomendações Secundárias do Challenger 2

### 4.1. Alinhamento de Breakpoint em `AppContext.jsx` (1024px)
- **Constatação do Challenger 2**:
  Tailwind v4 define `--breakpoint-lg: 1024px;` que compila para `@media (min-width: 1024px)`. No JS, `AppContext.jsx` utiliza `window.innerWidth > 1024`.
- **Análise Forense e Contrato do Projeto**:
  O documento oficial `ORIGINAL_REQUEST.md` (R1, linha 18) e `PROJECT.md` (linha 23) estabelecem expressamente:
  > *"O drawer deve permanecer expandido por padrão acima de 1024px quando não houver preferência salva e recolhido por padrão em LG ou inferior (até 1024px)"*
  
  Tanto `tests/integration/flow_a_drawer_layout.test.mjs` (linha 222) quanto `tests/tier5/m2_challenger_drawer_adversarial.test.mjs` (linha 82 e 95) testam explicitamente:
  ```javascript
  assert.strictEqual(vp1024.jsIsLg, false, '1024px: JS avalia 1024 > 1024 como false');
  assert.strictEqual(vp1024.jsDefaultCollapsed, true, '1024px: default recolhido (w-14) no aside desktop');
  ```
- **Recomendação**: **NÃO alterar** `window.innerWidth > 1024` para `>= 1024` em `AppContext.jsx`. A especificação exige explicitamente que em 1024px o padrão seja recolhido (`sidebarCollapsed: true`), e os testes automatizados vigentes quebram se alterado para `>= 1024`.

### 4.2. Adição de `e.stopPropagation()` em `app/documentos/[id]/conferencia/page.jsx`
- **Constatação**: Na linha 184 de `conferencia/page.jsx`, o handler de Escape de células de edição contém `e.preventDefault()`, mas não `e.stopPropagation()`.
- **Análise**: `ScreenTourTip.jsx` já verifica `if (event.defaultPrevented) return;` e não fecha. Adicionar `e.stopPropagation()` é uma melhoria recomendada de defesa em profundidade que impede o evento de subir ao objeto `window`. O Worker de M2 pode aplicar essa linha com segurança sem risco de regressão.

---

## 5. Proposta de Código (Diff Patch)

### Arquivo: `app/components/Layouts/SmartNFeSidebar.jsx`

```diff
--- a/app/components/Layouts/SmartNFeSidebar.jsx
+++ b/app/components/Layouts/SmartNFeSidebar.jsx
@@ -1,5 +1,5 @@
 'use client';
-import { useEffect } from 'react';
+import { useEffect, useRef } from 'react';
 import Link from 'next/link';
 import { usePathname } from 'next/navigation';
 import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
@@ -115,9 +115,13 @@ export default function SmartNFeSidebar({
     };
   }, [mobileOpen]);
 
+  const prevPathnameRef = useRef(pathname);
+
   // Fecha o drawer móvel automaticamente na navegação de rotas
   useEffect(() => {
-    if (mobileOpen && onMobileClose) {
-      onMobileClose();
+    if (prevPathnameRef.current !== pathname) {
+      prevPathnameRef.current = pathname;
+      if (mobileOpen && onMobileClose) {
+        onMobileClose();
+      }
     }
   }, [pathname, mobileOpen, onMobileClose]);
```

---

## 6. Recomendações de Testes para o Worker

Para prevenir que suítes de teste aprovem implementações com bugs sutis de ciclo de vida (como ocorreu no primeiro ciclo de M2):
1. **Adicionar teste empírico em `tests/integration/flow_a_drawer_layout.test.mjs`**:
   Substituir ou complementar a função auxiliar pura `handleRouteChange` por uma simulação que execute a função de efeito quando `mobileOpen` alterna de `false` para `true` na mesma rota, assegurando que `onMobileClose` NÃO é chamado.
2. **Executar a suíte completa de verificação**:
   - `node --no-warnings --test tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`
   - `node --no-warnings --test tests/tier5/m2_challenger_drawer_adversarial.test.mjs`
   - `node --no-warnings --test tests/integration/flow_a_drawer_layout.test.mjs`
   - `node --no-warnings --test tests/unit/leftDrawer.test.mjs`
   - `npm run lint`
   - `npm run build`
