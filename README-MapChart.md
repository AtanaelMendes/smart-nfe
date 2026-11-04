# MapChart - Componente de Mapa com amCharts 5

## 📍 Visão Geral

Componente React que exibe um mapa interativo do Brasil usando amCharts 5, com um pin destacando a localização de Joinville - SC.

## 🚀 Funcionalidades

- **Mapa Interativo**: Navegação com pan e zoom
- **Pin Personalizado**: Marcador vermelho em Joinville com tooltip
- **Estados Interativos**: Hover e seleção dos estados brasileiros
- **Controles de Zoom**: Botões de zoom in/out e home
- **Design Responsivo**: Layout adaptável usando Tailwind CSS
- **Animações**: Transições suaves ao carregar o mapa

## 🛠️ Tecnologias Utilizadas

- **amCharts 5**: Biblioteca de gráficos e mapas
- **@amcharts/amcharts5-geodata**: Dados geográficos do Brasil
- **React**: Hooks `useLayoutEffect` para gerenciamento do ciclo de vida
- **Tailwind CSS**: Estilização responsiva
- **Next.js**: Framework React com SSR desabilitado para o componente

## 📂 Estrutura de Arquivos

```
pages/map/
├── index.jsx           # Página principal do mapa
└── mapChart.jsx        # Versão alternativa (deprecated)

src/components/chart/
└── MapChart.jsx        # Componente principal do mapa
```

## 🔧 Uso

### Importação Dinâmica (Recomendado)
```jsx
import dynamic from "next/dynamic";
const MapChart = dynamic(() => import("@/components/chart/MapChart"), { 
  ssr: false 
});

const MapPage = () => {
  return <MapChart />;
};
```

### Importação Direta
```jsx
import MapChart from "@/components/chart/MapChart";

const MapPage = () => {
  return <MapChart />;
};
```

## ⚙️ Configurações Principais

### Coordenadas de Joinville
```javascript
homeGeoPoint: { 
  longitude: -48.8455, 
  latitude: -26.3045 
}
```

### Pin de Localização
```javascript
const joinvilleData = [{
  geometry: {
    type: "Point",
    coordinates: [-48.8455, -26.3045]
  },
  title: "Joinville - SC",
  description: "Maior cidade de Santa Catarina"
}];
```

### Cores do Tema
- **Estados (normal)**: `#e0e0e0`
- **Estados (hover)**: `#74b9ff`
- **Estados (ativo)**: `#0984e3`
- **Pin**: `#ff6b6b` com borda branca

## 🎨 Personalização

### Adicionar Mais Pins
```javascript
const cities = [
  {
    geometry: { type: "Point", coordinates: [-48.8455, -26.3045] },
    title: "Joinville - SC"
  },
  {
    geometry: { type: "Point", coordinates: [-46.6333, -23.5500] },
    title: "São Paulo - SP"
  }
];

pointSeries.data.setAll(cities);
```

### Mudar Projeção do Mapa
```javascript
projection: am5map.geoOrthographic(), // Globo 3D
// ou
projection: am5map.geoAlbersUsa(),     // Projeção Albers
```

### Personalizar Zoom Inicial
```javascript
homeZoomLevel: 6, // Zoom mais próximo
// ou
homeZoomLevel: 2, // Zoom mais distante
```

## 🔍 Interações Disponíveis

1. **Pan**: Arrastar para mover o mapa
2. **Zoom**: Scroll do mouse ou botões de controle
3. **Hover**: Estados mudam de cor ao passar o mouse
4. **Click**: Estados podem ser selecionados
5. **Home**: Botão para voltar à visualização inicial
6. **Tooltip**: Informações ao passar o mouse sobre o pin

## 📱 Responsividade

O componente é totalmente responsivo e adapta-se a diferentes tamanhos de tela:

- **Desktop**: Altura completa da tela
- **Mobile**: Layout otimizado para telas menores
- **Tablet**: Adaptação automática do tamanho

## 🧹 Limpeza de Recursos

O componente implementa cleanup automático para evitar vazamentos de memória:

```javascript
return () => {
  root.dispose(); // Limpa todos os recursos do amCharts
};
```

## 🌐 Acesso

- **Desenvolvimento**: `http://localhost:3001/map`
- **Produção**: Depende da configuração do seu domínio

## 📦 Dependências Necessárias

```json
{
  "@amcharts/amcharts5": "^5.11.1",
  "@amcharts/amcharts5-geodata": "^5.1.5"
}
```

## 🐛 Solução de Problemas

### Erro de SSR
Use importação dinâmica com `{ ssr: false }`

### Mapa não carrega
Verifique se as dependências geodata estão instaladas

### Performance lenta
Considere lazy loading ou paginação se adicionando muitos pins

---

*Desenvolvido com ❤️ usando amCharts 5 e React*
