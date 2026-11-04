import { useEffect, useRef, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import moment from "moment";
import am5locales_ptBR from "@amcharts/amcharts5/locales/pt_BR";

const BurnUpChart = ({ chartData, selectedUsers }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (!chartData || chartData.length === 0) {
            console.warn("Nenhum dado disponível para o gráfico.");
            return;
        }
        am5.addLicense("AM5C321901905");

        const root = am5.Root.new(chartRef.current);
        root.locale = am5locales_ptBR;

        const myTheme = am5.Theme.new(root);
        myTheme.rule("AxisLabel", ["minor"]).setAll({ dy: 1 });
        myTheme.rule("Grid", ["x"]).setAll({ strokeOpacity: 0.05 });
        myTheme.rule("Grid", ["x", "minor"]).setAll({ strokeOpacity: 0.05 });

        root.setThemes([am5themes_Animated.new(root), myTheme]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: true,
                wheelX: "panX",
                wheelY: "zoomX",
                pinchZoomX: true,
                maxTooltipDistance: 0
            })
        );

        const xAxis = chart.xAxes.push(
            am5xy.DateAxis.new(root, {
                baseInterval: { timeUnit: "day", count: 1 },
                renderer: am5xy.AxisRendererX.new(root, { minorGridEnabled: true }),
                tooltip: am5.Tooltip.new(root, {}),
                dateFormats: { day: "MMM, dd", month: "MMM", year: "yyyy" },
                periodChangeDateFormats: { day: "MMM, dd", month: "MMM", year: "yyyy" }
            })
        );

        const yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {}),
            })
        );

        const userSeriesMap = {};
        const allDates = new Set();

        chartData.forEach(item => {
            const name = item.name;
            const formattedDate = moment(item.date, "YYYY-MM-DD").valueOf();
            allDates.add(formattedDate);

            if (!userSeriesMap[name]) {
                userSeriesMap[name] = [];
            }
            userSeriesMap[name].push({
                date: formattedDate,
                value: item.totalHours
            });
        });

        const sortedDates = Array.from(allDates).sort();
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];

        let idealLine = [];
        let currentDate = startDate;

        while (currentDate <= endDate) {
            let progress = (currentDate - startDate) / (endDate - startDate);
            idealLine.push({
                date: currentDate,
                value: Math.round(170 * progress)
            });

            currentDate += 86400000;
        }

        let idealSeries = chart.series.push(
            am5xy.LineSeries.new(root, {
                name: "Ideal (0 a 170 horas)",
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: "value",
                valueXField: "date",
                stroke: am5.color("#000"),
                strokeWidth: 2,
                strokeDasharray: [5, 5],
                maskBullets: false
            })
        );

        idealSeries.bullets.push(function () {
            return am5.Bullet.new(root, {
                locationY: 1,
                sprite: am5.Circle.new(root, {
                    radius: 4,
                    fill: am5.color("#000"),
                    stroke: am5.color("#FFFFFF"),
                    strokeWidth: 2,
                    tooltipText: "Linha Ideal 170 Horas"
                })
            });
        });

        idealSeries.data.setAll(idealLine);
        idealSeries.appear(1000);
        idealSeries.strokes.template.setAll({
            strokeWidth: 3
        });

        idealSeries.bullets.push(function () {
            return am5.Bullet.new(root, {
                locationY: 1,
                sprite: am5.Circle.new(root, {
                    radius: 5,
                    fill: am5.color("#000"),
                    stroke: am5.color("#FFFFFF"),
                    strokeWidth: 2
                })
            });
        });

        idealSeries.data.setAll(idealLine);
        idealSeries.appear(1000);

        const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
        let colorIndex = 0;

        const filteredUsers = !selectedUsers || selectedUsers.length === 0
            ? Object.keys(userSeriesMap)
            : selectedUsers.map(u => u.value);

        filteredUsers.forEach(dev => {
            if (!userSeriesMap[dev]) return;

            let cumulativeHours = 0;
            let finalData = sortedDates.map(date => {
                let entry = userSeriesMap[dev].find(d => d.date === date);
                if (entry) {
                    cumulativeHours += entry.value;
                }
                return { date, value: cumulativeHours, user: dev };
            });

            let series = chart.series.push(
                am5xy.LineSeries.new(root, {
                    name: dev,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: "value",
                    valueXField: "date",
                    stroke: am5.color(colors[colorIndex % colors.length]),
                    tooltip: am5.Tooltip.new(root, { labelText: "{user}: {valueY} horas" }),
                    tooltipTarget: "pointer",
                })
            );

            series.strokes.template.setAll({
                strokeWidth: 3
            });

            series.bullets.push(function () {
                return am5.Bullet.new(root, {
                    locationY: 1,
                    sprite: am5.Circle.new(root, {
                        radius: 6,
                        fill: series.get("stroke"),
                        stroke: am5.color("#FFFFFF"),
                        strokeWidth: 1
                    })
                });
            });

            series.data.setAll(finalData);
            colorIndex++;
        });

        const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
            behavior: "none",
            xAxis: xAxis,
            snapTooltip: true
        }));

        cursor.lineY.set("visible", false);

        chart.set("scrollbarX", am5.Scrollbar.new(root, { orientation: "horizontal" }));
        chart.set("scrollbarY", am5.Scrollbar.new(root, { orientation: "vertical" }));

        return () => root.dispose();
    }, [chartData, selectedUsers]);

    const users = chartData.map(item => ({
        value: item.name,
        label: item.name
    })).filter((user, index, self) =>
        index === self.findIndex(u => u.value === user.value)
    );

    return <div ref={chartRef} className="w-full flex-grow min-h-0"></div>


};

export default BurnUpChart;