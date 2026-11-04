# ProfilePicture - Sistema de Detecção Facial

## 📋 Visão Geral

O componente `ProfilePicture.jsx` foi aprimorado com detecção facial robusta baseada no sistema implementado no `photo-modal.js` do Portal do Candidato. O sistema utiliza **MediaPipe** como solução principal e múltiplos fallbacks para garantir funcionalidade em todos os navegadores.

## 🚀 Funcionalidades

### ✅ Detecção Facial Multi-Camada
1. **MediaPipe Face Detection** (Primário)
   - Detecção precisa com IA do Google
   - Preservação de instância para reutilização
   - Tolerância a erros WASM

2. **Face Detection API** (Fallback)
   - API nativa do navegador quando disponível
   - Análise de posicionamento em tempo real

3. **Análise de Pixels** (Fallback Final)
   - Detecção baseada em características faciais
   - Funciona em qualquer navegador

### 🔄 Preservação de Instância MediaPipe
- **Primeira sessão**: MediaPipe criado (~2-3s)
- **Próximas sessões**: Reutilização instantânea ⚡
- **Zero overhead** de recriação WASM
- **Recuperação automática** de erros

### 📍 Sistema de Posicionamento
- **Verde**: ✅ Rosto bem posicionado - pronto para captura
- **Amarelo**: ⚠️ Ajuste necessário (distância/posição)
- **Vermelho**: ❌ Rosto não detectado

## 🛠️ Implementação Técnica

### Estados e Refs Adicionados
```jsx
// Estados MediaPipe
const [mediaPipeReady, setMediaPipeReady] = useState(false);
const [mediaPipeErrorCount, setMediaPipeErrorCount] = useState(0);
const [isMonitoringStarted, setIsMonitoringStarted] = useState(false);
const [isDetectingFace, setIsDetectingFace] = useState(false);

// Refs MediaPipe
const faceDetectionRef = useRef(null);
const mediaPipeCameraRef = useRef(null);
const mediaPipeCallbackReceived = useRef(false);
```

### Funções Principais

#### `checkMediaPipeSupport()`
- Verifica disponibilidade do MediaPipe
- Reutiliza instância existente se disponível
- Configura detecção com `minDetectionConfidence: 0.05`

#### `startFacePositionMonitoring()`
- Resetar flags de monitoramento
- Inicializa MediaPipe ou fallback
- Controla fluxo de detecção

#### `processMediaPipeResults()`
- Analisa resultados da detecção
- Calcula posicionamento e tamanho do rosto
- Atualiza UI com instruções em tempo real

#### `cleanupMediaPipe()`
- **Limpeza suave** - preserva instância
- Para apenas a câmera MediaPipe
- Mantém `faceDetection` para reutilização

### Métricas de Posicionamento
```javascript
// Tolerâncias ajustadas para rostos distantes
const toleranceX = 0.25; // 25% da largura
const toleranceY = 0.25; // 25% da altura
const idealSize = 0.06;  // 6% da tela
const sizeRatio = faceSize / idealSize;

// Critérios de aprovação
if (distanceX <= toleranceX && distanceY <= toleranceY && 
    sizeRatio >= 0.2 && sizeRatio <= 4.0 && confidence > 0.05) {
    // ✅ Aprovado
}
```

## 📦 Dependências

### Scripts CDN (adicionados em `_app.jsx`)
```jsx
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" />
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" />
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" />
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js" />
```

### APIs do Navegador
- `navigator.mediaDevices.getUserMedia()` - Acesso à câmera
- `FaceDetector` API (quando disponível)
- `Canvas` API para análise de pixels

## 🔧 Configuração e Uso

### 1. Importação
```jsx
import ProfilePicture from '@/components/inputs/ProfilePicture';
```

### 2. Uso Básico
```jsx
<ProfilePicture
    init={true}
    onChange={(field, file) => {
        // Arquivo capturado/selecionado
        console.log('Nova foto:', file);
    }}
    currentImage={existingImageUrl}
/>
```

### 3. Props Disponíveis
- `init`: boolean - Controla inicialização do componente
- `onChange`: function - Callback quando foto é capturada/selecionada
- `currentImage`: string - URL da imagem atual (preview)

## 🐛 Debugging

### Console Logs
O sistema fornece logs detalhados para debugging:
```
🔍 Verificando MediaPipe Face Detection...
♻️ MediaPipe JÁ FUNCIONA - reutilizando instância existente
🎥 Iniciando monitoramento de posição facial...
🚀 Iniciando detecção facial MEDIAPIPE
✅ MediaPipe: ROSTO BEM POSICIONADO
```

### Flags de Estado
- `mediaPipeReady`: MediaPipe está inicializado
- `isMonitoringStarted`: Monitoramento ativo
- `isDetectingFace`: Detecção em execução
- `mediaPipeErrorCount`: Contador de erros

## 🚨 Tratamento de Erros

### Erros WASM
- Detecta erros `Module.arguments`, `Aborted`, `WASM`
- Pausa MediaPipe mas preserva instância
- Fallback automático para API nativa

### Fallback Cascata
1. **MediaPipe** → Erro WASM → Pausa temporária
2. **Face Detection API** → Não disponível → Análise de pixels
3. **Análise de Pixels** → Sempre funciona

## 📈 Performance

### Métricas de Inicialização
- **Primeira vez**: ~2-3 segundos (carregamento MediaPipe)
- **Reutilização**: ~100-200ms (instantâneo)
- **Fallback nativo**: ~500ms
- **Análise de pixels**: ~300ms

### Otimizações
- Instância MediaPipe preservada entre sessões
- Detecção a cada 500ms (responsivo mas eficiente)
- Limpeza suave que mantém recursos
- Timeout de segurança de 3 segundos

## 🔄 Ciclo de Vida

```
1. openCamera()
   ├── Resetar flags
   ├── Reutilizar MediaPipe se disponível
   └── Iniciar stream de vídeo

2. startFacePositionMonitoring()
   ├── Verificar MediaPipe Support
   ├── Inicializar detecção
   └── Processar resultados

3. stopCamera()
   ├── Resetar flags
   ├── Limpeza suave MediaPipe
   └── Parar streams
```

## 🎯 Próximos Passos

1. **Otimização Mobile**: Ajustes específicos para dispositivos móveis
2. **Cache de Recursos**: Cache local dos scripts MediaPipe
3. **Métricas Avançadas**: Tracking de qualidade da foto
4. **Filtros de Imagem**: Ajustes automáticos de iluminação

---

**Desenvolvido por**: Equipe RHBsaas  
**Base**: Portal do Candidato - photo-modal.js  
**Versão**: 1.0.0  
**Data**: Agosto 2025
