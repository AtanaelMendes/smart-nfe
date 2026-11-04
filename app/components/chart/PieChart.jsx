import { useLayoutEffect } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as Am5PiePercent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const PieChart = ({ chartData, nmChart, width, height }) => {
    useLayoutEffect(() => {
        am5.addLicense("AM5C321901905");
        let root = am5.Root.new(nmChart);
        root.setThemes([am5themes_Animated.new(root)]);

        var chart = root.container.children.push(
            Am5PiePercent.PieChart.new(root, {
                layout: root.verticalLayout,
                radius: am5.percent(80),
            })
        );

        var series = chart.series.push(
            Am5PiePercent.PieSeries.new(root, {
                name: "Series",
                valueField: "value",
                categoryField: "label",
            })
        );

        series.labels.template.setAll({
            fontSize: 11,
        });

        series.labels.template.set("visible", true);
        series.ticks.template.set("visible", true);

        series.data.setAll(chartData);

        var legend = chart.children.push(
            am5.Legend.new(root, {
                centerX: am5.percent(50),
                x: am5.percent(50),
                layout: root.gridLayout,
            })
        );

        legend.markers.template.setAll({
            width: 12,
            height: 12,
        });

        legend.labels.template.setAll({
            fontSize: 11,
        });

        legend.valueLabels.template.text = "{value.value}";

        legend.valueLabels.template.adapters.add("text", function (text, target) {
            return target?.dataItem?.dataContext?.value;
        });

        legend.data.setAll(series.dataItems);

        return () => {
            root.dispose();
        };
    }, [chartData]);

    return <div id={nmChart} style={{ width: "100%", height: "300px" }}></div>;
};
export default PieChart;
