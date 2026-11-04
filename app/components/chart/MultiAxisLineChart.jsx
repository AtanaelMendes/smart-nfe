import React , { useLayoutEffect } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5locales_ptBR from "@amcharts/amcharts5/locales/pt_BR";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const MultiAxisLineChart = ({ chartId = "chartdiv", height = "300px", seriesConfigs = [], useSharedYAxis = false }) => {
    useLayoutEffect(() => {
        const root = am5.Root.new(chartId);
        root.locale = am5locales_ptBR;

        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                focusable: true,
                panX: true,
                panY: true,
                wheelX: "panX",
                wheelY: "zoomX",
                pinchZoomX: true,
                layout: root.verticalLayout,
                paddingBottom: 50
            })
        );

        chart.get("colors").set("step", 3);

        const xAxis = chart.xAxes.push(
            am5xy.DateAxis.new(root, {
                maxDeviation: 0.1,
                groupData: false,
                baseInterval: {
                    timeUnit: "day",
                    count: 1,
                },
                renderer: am5xy.AxisRendererX.new(root, {
                    minGridDistance: 80,
                    minorGridEnabled: true,
                }),
                tooltip: am5.Tooltip.new(root, {}),
            })
        );

        let sharedYAxis = null;
        if (useSharedYAxis) {
            sharedYAxis = chart.yAxes.push(
                am5xy.ValueAxis.new(root, {
                    maxDeviation: 1,
                    renderer: am5xy.AxisRendererY.new(root, {}),
                })
            );
        }

        const createAxisAndSeries = (config, index) => {
            const { data, opposite = false, name } = config;
            let yAxis;

            if (useSharedYAxis) {
                yAxis = sharedYAxis;
            } else {
                const yRenderer = am5xy.AxisRendererY.new(root, { opposite });
                yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, {
                        maxDeviation: 1,
                        renderer: yRenderer,
                    })
                );

                if (chart.yAxes.indexOf(yAxis) > 0) {
                    yAxis.set("syncWithAxis", chart.yAxes.getIndex(0));
                }

                yRenderer.grid.template.set("strokeOpacity", 0.05);
            }

            const series = chart.series.push(
                am5xy.LineSeries.new(root, {
                    name: name || `Série ${index + 1}`,
                    xAxis,
                    yAxis,
                    valueYField: "value",
                    valueXField: "date",
                    tooltip: am5.Tooltip.new(root, {
                        pointerOrientation: "horizontal",
                        labelText: "{valueY}",
                    }),
                })
            );

            series.strokes.template.setAll({ strokeWidth: 1 });

            if (!useSharedYAxis) {
                const yRenderer = yAxis.get("renderer");
                yRenderer.labels.template.set("fill", series.get("fill"));
                yRenderer.setAll({
                    stroke: series.get("fill"),
                    strokeOpacity: 1,
                    opacity: 1,
                });
            }

            series.data.processor = am5.DataProcessor.new(root, {
                dateFormat: "yyyy-MM-dd",
                dateFields: ["date"],
            });

            series.data.setAll(data);

            legend.data.push(series);
        };

        chart.set("cursor", am5xy.XYCursor.new(root, {
            xAxis,
            behavior: "none",
        }));
        chart.get("cursor").lineY.set("visible", false);

        chart.set("scrollbarX", am5.Scrollbar.new(root, {
            orientation: "horizontal",
        }));

        const legend = root.container.children.push(am5.Legend.new(root, {
            useDefaultMarker: true,
            y: am5.percent(100),
            centerY: 40,
            x: am5.percent(40),
            marginTop: 20,
            maxColumns: 2,
            fixedWidthGrid: true
        }));

        legend.markers.template.setAll({
            width: 20,
            height: 3,
            strokeWidth: 2,
            fillOpacity: 0
        });

        legend.data.setAll([]);

        seriesConfigs.forEach((config, index) => {
            createAxisAndSeries(config, index);
        });

        chart.appear(1000, 100);

        return () => root.dispose();
    }, [chartId, seriesConfigs, useSharedYAxis]);

    return <div id={chartId} style={{ width: "100%", height }} />;
};

export default MultiAxisLineChart;
