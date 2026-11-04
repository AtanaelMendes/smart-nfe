import { useLayoutEffect } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5locales_ptBR from "@amcharts/amcharts5/locales/pt_BR";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const YearlySeriesChart = ({ yearlyData, monthlyData, nmChart }) => {
    useLayoutEffect(() => {
        am5.addLicense("AM5C321901905");
        const root = am5.Root.new(nmChart);
        root.locale = am5locales_ptBR;

        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "none",
                wheelY: "none",
                layout: root.verticalLayout,
            })
        );

        const addVariance = (data) => {
            for (let i = 0; i < data.length - 1; i++) {
                data[i].valueNext = data[i + 1].value;
            }
        };

        addVariance(yearlyData);
        Object.keys(monthlyData).forEach((year) => {
            addVariance(monthlyData[year]);
        });

        const xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
                categoryField: "year",
                renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }),
                tooltip: am5.Tooltip.new(root, {}),
            })
        );

        const yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                min: 0,
                extraMax: 0.15,
                renderer: am5xy.AxisRendererY.new(root, {}),
            })
        );

        const getVariancePercent = (dataItem) => {
            if (dataItem) {
                const value = dataItem.get("valueY");
                const openValue = dataItem.get("openValueY");
                if (openValue !== 0) {
                    const change = value - openValue;
                    return Math.round((change / openValue) * 100);
                }
            }
            return 0;
        };

        const series = chart.series.push(
            am5xy.ColumnSeries.new(root, {
                xAxis,
                yAxis,
                valueYField: "value",
                categoryXField: "year",
                tooltip: am5.Tooltip.new(root, { labelText: "{categoryX}: {valueY}" }),
            })
        );

        const varianceSeries = chart.series.push(
            am5xy.ColumnSeries.new(root, {
                xAxis,
                yAxis,
                valueYField: "valueNext",
                openValueYField: "value",
                categoryXField: "year",
                fill: am5.color(0x555555),
                stroke: am5.color(0x555555),
            })
        );

        varianceSeries.columns.template.setAll({ width: 1 });

        varianceSeries.bullets.push(() => {
            const label = am5.Label.new(root, {
                fontWeight: "500",
                fill: am5.color(0x00cc00),
                centerY: am5.p100,
                centerX: am5.p50,
                populateText: true,
            });

            label.adapters.add("text", (_, target) => {
                const percent = getVariancePercent(target.dataItem);
                const diff =
                    target.dataItem.get("valueY") -
                    target.dataItem.get("openValueY");
                const sign = diff >= 0 ? "+" : "-";
                return `${sign}${Math.abs(diff)} (${sign}${Math.abs(percent)}%)`;
            });

            label.adapters.add("fill", (fill, target) => {
                return getVariancePercent(target.dataItem) < 0
                    ? am5.color(0xcc0000)
                    : fill;
            });

            return am5.Bullet.new(root, { locationY: 1, sprite: label });
        });

        const showChartData = () => {
            series.set("categoryXField", "year");
            varianceSeries.set("categoryXField", "year");
            xAxis.set("categoryField", "year");

            series.data.setAll(yearlyData);
            varianceSeries.data.setAll(yearlyData);
            xAxis.data.setAll(yearlyData);
        };

        series.columns.template.events.on("click", (ev) => {
            const selectedYear = ev.target.dataItem.dataContext.year;
            if (monthlyData[selectedYear]) {
                series.set("categoryXField", "month");
                varianceSeries.set("categoryXField", "month");
                xAxis.set("categoryField", "month");

                series.data.setAll(monthlyData[selectedYear]);
                varianceSeries.data.setAll(monthlyData[selectedYear]);
                xAxis.data.setAll(monthlyData[selectedYear]);
            }
        });

        const button = chart.children.push(
            am5.Button.new(root, {
                label: am5.Label.new(root, {
                    text: "Visão anual",
                    fontSize: 15,
                    fontWeight: "600",
                    paddingTop: 2,
                    paddingRight: 4,
                    paddingBottom: 2,
                    paddingLeft: 4
                  }),
                x: am5.percent(45),
                y: 255,
            })
        );

        button.events.on("click", () => {
            showChartData();
        });

        showChartData();
        series.appear();
        chart.appear(1000, 100);

        // Limpeza do gráfico ao desmontar
        return () => {
            root.dispose();
        };
    }, [yearlyData, nmChart]);

    return <div id={nmChart} style={{ width: "100%", height: "300px" }} />;
};

export default YearlySeriesChart;