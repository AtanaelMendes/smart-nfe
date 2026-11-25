import { useCallback, useLayoutEffect, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5geodata_brazilLow from "@amcharts/amcharts5-geodata/brazilLow";
import Button from "@/components/buttons/Button";

const MapChart = () => {
  const [showJoinvilleDetails, setShowJoinvilleDetails] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [rhbUnidades, setRhbUnidades] = useState([
	{
		"CD_PESSOA" : 80197,
		"NM_UNIDADE" : "RHBRASIL - JOINVILLE",
		"CD_UF" : "SC",
		"NM_CIDADE" : "JOINVILLE",
		"DS_EMAIL" : "joinville@rhbrasil.com.br",
		"CD_CEP" : 89204250,
		"GR_LATITUDE" : "-26.29783",
		"GR_LONGITUDE" : "-48.85054",
		"GR_LOCALIZACAO" : null
	},
	{
		"CD_PESSOA" : 80229,
		"NM_UNIDADE" : "RH GLOBAL",
		"CD_UF" : "PR",
		"NM_CIDADE" : "CURITIBA",
		"DS_EMAIL" : "jonas@gruporhbrasil.com.br",
		"CD_CEP" : 80030100,
		"GR_LATITUDE" : "-25.42284",
		"GR_LONGITUDE" : "-49.26548",
		"GR_LOCALIZACAO" : 498035
	},
	{
		"CD_PESSOA" : 611760,
		"NM_UNIDADE" : "RHBRASIL - SAO PAULO",
		"CD_UF" : "SP",
		"NM_CIDADE" : "SAO PAULO",
		"DS_EMAIL" : "saopaulo@rhbrasil.com.br",
		"CD_CEP" : 2034006,
		"GR_LATITUDE" : "-23.50537",
		"GR_LONGITUDE" : "-46.62535",
		"GR_LOCALIZACAO" : null
	},
	{
		"CD_PESSOA" : 701066,
		"NM_UNIDADE" : "RHBRASIL - MATRIZ",
		"CD_UF" : "SC",
		"NM_CIDADE" : "JOINVILLE",
		"DS_EMAIL" : "comercial@rhbrasil.com.br;nadiese.voigt@rhbrasil.com.br",
		"CD_CEP" : 89204250,
		"GR_LATITUDE" : "-26.29783",
		"GR_LONGITUDE" : "-48.85054",
		"GR_LOCALIZACAO" : null
	},
	{
		"CD_PESSOA" : 2626352,
		"NM_UNIDADE" : "RHBRASIL - TRADE",
		"CD_UF" : "SC",
		"NM_CIDADE" : "JOINVILLE",
		"DS_EMAIL" : "trade@rhbprommo.com.br",
		"CD_CEP" : 89204250,
		"GR_LATITUDE" : "-26.29783",
		"GR_LONGITUDE" : "-48.85054",
		"GR_LOCALIZACAO" : null
	},
	{
		"CD_PESSOA" : 3556513,
		"NM_UNIDADE" : "DREAM JOB",
		"CD_UF" : "SC",
		"NM_CIDADE" : "JOINVILLE",
		"DS_EMAIL" : "sandra@dreamjob.com.br",
		"CD_CEP" : 89201405,
		"GR_LATITUDE" : "-26.30307",
		"GR_LONGITUDE" : "-48.85092",
		"GR_LOCALIZACAO" : null
	},
	{
		"CD_PESSOA" : 5697939,
		"NM_UNIDADE" : "DAYONE",
		"CD_UF" : "SC",
		"NM_CIDADE" : "JOINVILLE",
		"DS_EMAIL" : "suporte@rhbrasil.com.br",
		"CD_CEP" : 89201710,
		"GR_LATITUDE" : "-26.30307",
		"GR_LONGITUDE" : "-48.85092",
		"GR_LOCALIZACAO" : null
	}
]);

  console.log("Estado do modal:", showJoinvilleDetails); // Para debug

  useLayoutEffect(() => {
    // Adicionar licença do AmCharts
    am5.addLicense("AM5C321901905");

    // Criar root
    const root = am5.Root.new("chartdiv");

    // Aplicar tema
    root.setThemes([am5themes_Animated.new(root)]);

    // Criar chart
    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX: "translateX",
        panY: "translateY",
        projection: am5map.geoMercator(),
        homeZoomLevel: 4,
        homeGeoPoint: { longitude: -48.8455, latitude: -26.3045 }, // Joinville coordinates
        wheelY: "zoom",
        pinchZoom: true
      })
    );

    // Criar série de polígonos para o mapa do Brasil
    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_brazilLow
      })
    );

    // Configurar templates dos polígonos
    polygonSeries.mapPolygons.template.setAll({
      tooltipText: "{name}",
      toggleKey: "active",
      interactive: true,
      fill: am5.color("#e0e0e0"),
      stroke: am5.color("#ffffff"),
      strokeWidth: 1
    });

    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: am5.color("#74b9ff")
    });

    polygonSeries.mapPolygons.template.states.create("active", {
      fill: am5.color("#0984e3")
    });

    // Adicionar evento de clique nos estados
    polygonSeries.mapPolygons.template.events.on("click", function(ev) {
      const mapPolygon = ev.target;
      const dataContext = mapPolygon.dataItem.dataContext;
      
      // Mapear códigos de estados para nomes mais amigáveis
      const estadosComFiliais = {
        'BR-SC': 'SC',
        'BR-SP': 'SP', 
        'BR-PR': 'PR'
      };
      
      const estadoClicado = estadosComFiliais[dataContext.id];
      
      if (estadoClicado) {
        // Verificar se há filiais neste estado
        const filiaisDoEstado = rhbUnidades.filter(u => u.CD_UF === estadoClicado);
        
        if (filiaisDoEstado.length > 0) {
          console.log(`Estado ${estadoClicado} clicado - ${filiaisDoEstado.length} filiais encontradas`);
          setSelectedEstado({
            uf: estadoClicado,
            nome: dataContext.name || estadoClicado,
            filiais: filiaisDoEstado
          });
        }
      }
    });

    // Criar série de pontos para os pins
    const pointSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {})
    );

    // Converter dados das unidades RHBrasil para formato do mapa
    const unidadesMapData = rhbUnidades.map((unidade, index) => {
      let latitude = parseFloat(unidade.GR_LATITUDE);
      let longitude = parseFloat(unidade.GR_LONGITUDE);
      
      // Agrupar unidades pela cidade para garantir separação adequada
      const unidadesNaMesmaCidade = rhbUnidades.filter(u => 
        u.NM_CIDADE === unidade.NM_CIDADE && u.CD_UF === unidade.CD_UF
      );
      
      // Se há múltiplas unidades na mesma cidade, aplicar distribuição circular
      if (unidadesNaMesmaCidade.length > 1) {
        const offsetIndex = unidadesNaMesmaCidade.findIndex(u => u.CD_PESSOA === unidade.CD_PESSOA);
        const offsetRadius = 0.12; // 12km de separação
        const angle = (offsetIndex * 2 * Math.PI) / unidadesNaMesmaCidade.length;
        
        // Calcular centro da cidade baseado na média das coordenadas
        const centroLat = unidadesNaMesmaCidade.reduce((sum, u) => sum + parseFloat(u.GR_LATITUDE), 0) / unidadesNaMesmaCidade.length;
        const centroLng = unidadesNaMesmaCidade.reduce((sum, u) => sum + parseFloat(u.GR_LONGITUDE), 0) / unidadesNaMesmaCidade.length;
        
        latitude = centroLat + offsetRadius * Math.sin(angle);
        longitude = centroLng + offsetRadius * Math.cos(angle);
        
        console.log(`Unidade ${unidade.NM_UNIDADE} (${unidade.CD_PESSOA}) em ${unidade.NM_CIDADE} - Offset aplicado: ${offsetIndex}/${unidadesNaMesmaCidade.length}, Ângulo: ${(angle * 180 / Math.PI).toFixed(1)}°, Nova posição: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
      
      return {
        geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        title: unidade.NM_UNIDADE,
        cidade: unidade.NM_CIDADE,
        uf: unidade.CD_UF,
        email: unidade.DS_EMAIL,
        cep: unidade.CD_CEP,
        cdPessoa: unidade.CD_PESSOA
      };
    });

    console.log("Dados das unidades para o mapa:", unidadesMapData);

    // Configurar template dos pontos COM EVENTO DE CLIQUE DINÂMICO
    pointSeries.bullets.push(function(root, series, dataItem) {
      const data = dataItem.dataContext;

      // Definir cores diferentes por estado
      const coresPorUF = {
        'SC': '#ff6b6b', // Vermelho para SC
        'SP': '#4ecdc4', // Verde-água para SP
        'PR': '#45b7d1'  // Azul para PR
      };

      const cor = coresPorUF[data.uf] || '#999999';

      // Verificar quantas unidades estão na mesma cidade
      const unidadesNaMesmaCidade = rhbUnidades.filter(u => 
        u.NM_CIDADE === data.cidade && u.CD_UF === data.uf
      ).length;

      const tooltipText = unidadesNaMesmaCidade > 1 
        ? `{title}\n{cidade} - {uf}\n(${unidadesNaMesmaCidade} unidades nesta cidade)\nEmail: {email}`
        : `{title}\n{cidade} - {uf}\nEmail: {email}`;

      const circle = am5.Circle.new(root, {
        radius: 8,
        tooltipText: tooltipText,
        fill: am5.color(cor),
        stroke: am5.color("#ffffff"),
        strokeWidth: 2,
        cursorOverStyle: "pointer",
        interactive: true
      });

      circle.states.create("hover", {
        radius: 12,
        fill: am5.color(cor === '#ff6b6b' ? '#e55353' : cor)
      });

      // Adicionar evento de clique específico para cada unidade
      circle.events.on("click", function(ev) {
        console.log("Unidade clicada:", data.title);
        // Encontrar a unidade completa nos dados originais
        const unidadeCompleta = rhbUnidades.find(u => u.CD_PESSOA === data.cdPessoa);
        setSelectedUnidade(unidadeCompleta);
      });

      const bullet = am5.Bullet.new(root, {
        sprite: circle
      });

      return bullet;
    });

    // Adicionar dados à série de pontos
    pointSeries.data.setAll(unidadesMapData);

    // Adicionar controles de zoom
    const zoomControl = chart.set("zoomControl", am5map.ZoomControl.new(root, {}));
    zoomControl.homeButton.set("visible", true);

    // Adicionar animação inicial
    chart.appear(1000, 100);

    // Configurar eventos quando tudo estiver pronto
    chart.onPrivate("maskRectangle", () => {
      setTimeout(() => {
        console.log("Chart pronto, configurando eventos...");
        console.log("Número de bullets:", pointSeries.bullets.length);

        pointSeries.bullets.each((bullet, index) => {
          const sprite = bullet.get("sprite");
          console.log("Bullet", index, "sprite:", sprite);

          if (sprite) {
            // Configurar propriedades necessárias
            sprite.setAll({
              interactive: true,
              focusable: true,
              cursorOverStyle: "pointer"
            });

            // Adicionar múltiplos tipos de eventos
            sprite.events.on("click", function(ev) {
              console.log("CLICK evento disparado!");
              ev.stopPropagation();
              // Tentar encontrar a unidade pelos dados do bullet
              const bulletData = sprite.dataItem?.dataContext;
              if (bulletData) {
                const unidadeCompleta = rhbUnidades.find(u => u.CD_PESSOA === bulletData.cdPessoa);
                setSelectedUnidade(unidadeCompleta);
              }
            });
            
            sprite.events.on("pointerup", function(ev) {
              console.log("POINTERUP evento disparado!");
              ev.stopPropagation();
              // Tentar encontrar a unidade pelos dados do bullet
              const bulletData = sprite.dataItem?.dataContext;
              if (bulletData) {
                const unidadeCompleta = rhbUnidades.find(u => u.CD_PESSOA === bulletData.cdPessoa);
                setSelectedUnidade(unidadeCompleta);
              }
            });            console.log("Eventos configurados para bullet", index);
          }
        });
      }, 200);
    });

    // Cleanup function
    return () => {
      root.dispose();
    };
  }, [rhbUnidades, setShowJoinvilleDetails]);

  // Componente para exibir lista de filiais por estado
  const EstadoFiliais = ({ estado }) => {
    // Cores por estado
    const coresEstado = {
      'SC': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', button: 'bg-red-500 hover:bg-red-600' },
      'SP': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', button: 'bg-teal-500 hover:bg-teal-600' },
      'PR': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', button: 'bg-blue-500 hover:bg-blue-600' }
    };

    const cores = coresEstado[estado.uf] || coresEstado['SC'];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className={`${cores.bg} ${cores.border} border rounded-lg p-4 mb-6`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-3xl font-bold ${cores.text}`}>
                  🏢 Filiais em {estado.nome}
                  <span className="text-lg text-gray-600 ml-2">({estado.filiais.length} unidades)</span>
                </h2>
                <Button
                  buttonType="ghost"
                  outline
                  size="small"
                  onClick={() => setSelectedEstado(null)}
                  title="Fechar lista de filiais"
                  className="text-xl font-bold !px-2 !py-1 text-gray-500 hover:text-gray-700 dark:hover:text-slate-200"
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Clique em qualquer filial para ver os detalhes completos
              </p>
            </div>

            {/* Lista de filiais */}
            <div className="grid gap-4">
              {estado.filiais.map((filial, index) => (
                <div 
                  key={filial.CD_PESSOA}
                  className={`${cores.border} border-2 rounded-lg p-4 hover:${cores.bg} cursor-pointer transition-all duration-200 hover:shadow-md`}
                  onClick={() => {
                    setSelectedEstado(null);
                    setSelectedUnidade(filial);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">🏢</span>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {filial.NM_UNIDADE}
                        </h3>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600 ml-11">
                        <div>
                          <p><span className="font-medium">📍 Cidade:</span> {filial.NM_CIDADE}</p>
                          <p><span className="font-medium">📮 CEP:</span> {String(filial.CD_CEP).replace(/(\d{5})(\d{3})/, '$1-$2')}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">✉️ Email:</span> {filial.DS_EMAIL.split(';')[0].trim()}</p>
                          <p><span className="font-medium">🆔 Código:</span> {filial.CD_PESSOA}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">🌐 Coordenadas:</span></p>
                          <p className="text-xs">{filial.GR_LATITUDE}, {filial.GR_LONGITUDE}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        buttonType="primary"
                        onClick={() => {
                          setSelectedEstado(null);
                          setSelectedUnidade(filial);
                        }}
                        title={`Ver detalhes de ${filial.NM_UNIDADE}`}
                        className={`${cores.button} text-white transition-colors flex items-center gap-1`}
                      >
                        <span>👁️</span>
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Estatísticas do estado */}
            <div className={`${cores.bg} ${cores.border} border rounded-lg p-4 mt-6`}>
              <h3 className={`text-lg font-semibold ${cores.text} mb-2`}>📊 Estatísticas do Estado</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p><span className="font-medium">Total de Unidades:</span> {estado.filiais.length}</p>
                </div>
                <div>
                  <p><span className="font-medium">Cidades com Filiais:</span> {[...new Set(estado.filiais.map(f => f.NM_CIDADE))].length}</p>
                </div>
                <div>
                  <p><span className="font-medium">Estado:</span> {estado.uf}</p>
                </div>
              </div>
            </div>

            {/* Botão de fechar */}
            <div className="mt-6 text-center">
              <Button
                buttonType="secondary"
                onClick={() => setSelectedEstado(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white !px-6 !py-2 rounded-lg transition-colors"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente para exibir detalhes da unidade selecionada
  const UnidadeDetails = ({ unidade }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">{unidade.NM_UNIDADE}</h2>
            <Button
              buttonType="ghost"
              outline
              size="small"
              onClick={() => setSelectedUnidade(null)}
              title="Fechar detalhes da unidade"
              className="text-xl font-bold !px-2 !py-1 text-gray-500 hover:text-gray-700 dark:hover:text-slate-200"
            >
              ✕
            </Button>
          </div>

          {/* Conteúdo principal */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Informações da unidade */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Informações da Unidade</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Nome:</span> {unidade.NM_UNIDADE}</p>
                  <p><span className="font-medium">Cidade:</span> {unidade.NM_CIDADE}</p>
                  <p><span className="font-medium">Estado:</span> {unidade.CD_UF}</p>
                  <p><span className="font-medium">CEP:</span> {String(unidade.CD_CEP).replace(/(\d{5})(\d{3})/, '$1-$2')}</p>
                  <p><span className="font-medium">Código:</span> {unidade.CD_PESSOA}</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-3">Contato</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Email:</span></p>
                  <div className="pl-4">
                    {unidade.DS_EMAIL.split(';').map((email, index) => (
                      <p key={index} className="text-sm">
                        <a href={`mailto:${email.trim()}`} className="text-blue-600 hover:underline">
                          {email.trim()}
                        </a>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-3">Localização</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Latitude:</span> {unidade.GR_LATITUDE}</p>
                  <p><span className="font-medium">Longitude:</span> {unidade.GR_LONGITUDE}</p>
                  {unidade.GR_LOCALIZACAO && (
                    <p><span className="font-medium">Código Localização:</span> {unidade.GR_LOCALIZACAO}</p>
                  )}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-3">Ações Rápidas</h3>
                <div className="space-y-2">
                  <Button
                    buttonType="primary"
                    block
                    onClick={() => window.open(`https://maps.google.com/?q=${unidade.GR_LATITUDE},${unidade.GR_LONGITUDE}`, '_blank')}
                    className="transition-colors"
                  >
                    📍 Ver no Google Maps
                  </Button>
                  <Button
                    buttonType="success"
                    block
                    onClick={() => window.open(`mailto:${unidade.DS_EMAIL.split(';')[0].trim()}`, '_blank')}
                    className="transition-colors"
                  >
                    ✉️ Enviar Email
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de fechar */}
          <div className="mt-6 text-center">
            <Button
              buttonType="primary"
              onClick={() => setSelectedUnidade(null)}
              className="!px-6 !py-2 rounded-lg transition-colors"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 h-full">
          <div  id="chartdiv"  className="w-full h-[90%] rounded-md border border-gray-200" />
          <div className="mt-4 text-center">
            <div className="flex justify-center items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                <span className="text-sm text-gray-600">Santa Catarina ({rhbUnidades.filter(u => u.CD_UF === 'SC').length})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-teal-400 rounded-full border-2 border-white"></div>
                <span className="text-sm text-gray-600">São Paulo ({rhbUnidades.filter(u => u.CD_UF === 'SP').length})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                <span className="text-sm text-gray-600">Paraná ({rhbUnidades.filter(u => u.CD_UF === 'PR').length})</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Clique nos pins para detalhes das unidades ou clique nos estados para ver todas as filiais
            </p>
          </div>
        </div>
      </div>

      {/* Modal de lista de filiais por estado */}
      {selectedEstado && <EstadoFiliais estado={selectedEstado} />}

      {/* Modal de detalhes da unidade selecionada */}
      {selectedUnidade && <UnidadeDetails unidade={selectedUnidade} />}
    </>
  );
};

export default MapChart;
