import { useCallback, useLayoutEffect } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const XyVerticalChart = ({ chartData, nmChart, width, height }) => {
    useLayoutEffect(() => {
        am5.addLicense("AM5C321901905");
        let root = am5.Root.new(nmChart);

        root.setThemes([am5themes_Animated.new(root)]);

        var chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX",
                layout: root.verticalLayout,
            })
        );

        var xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
                categoryField: "label",
                renderer: am5xy.AxisRendererX.new(root, {
                    calculateTotals: true,
                    extraMax: 0.1,
                    cellStartLocation: 0.1,
                    cellEndLocation: 0.9,
                }),
                tooltip: am5.Tooltip.new(root, {}),
            })
        );
        xAxis.data.setAll(chartData);

        var yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {}),
            })
        );

        let colorList = ["#FFD248", "#fc6868", "#fc0505"];

        chartData.forEach((item, index) => {
            var series = chart.series.push(
                am5xy.ColumnSeries.new(root, {
                    name: item.name,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: "value",
                    categoryXField: "category",
                    fill: am5.color(colorList[index]),
                })
            );

            if (item.value > 0) {
                series.bullets.push(function(root) {
                    return am5.Bullet.new(root, {
                        sprite: am5.Label.new(root, {
                            text: "{valueY} vaga(s)",
                            centerX: am5.percent(50),
                            centerY: am5.percent(50),
                            populateText: true, 
                            fill: index === 2 ? am5.color("#fff") : am5.color("#000"),
                        })
                    });
                });
            }

            series.data.setAll([
                {
                    category: item.label,
                    value: item.value,
                },
            ]);

            series.columns.template.setAll({
                tooltipText: "{valueY} vaga(s)",
                width: am5.percent(200),
                tooltipY: 0,
            });

        });

        return () => {
            root.dispose();
        };
    }, []);

    return <div id={nmChart} style={{ width: "100%", height: "300px" }}></div>;
};
export default XyVerticalChart;
