import { useLayoutEffect } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5locales_ptBR from "@amcharts/amcharts5/locales/pt_BR";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const AnswersChart = ({ chartId, chartData = [], height = "150px" }) => {
  useLayoutEffect(() => {
    am5.addLicense("AM5C321901905");
    const root = am5.Root.new(chartId);
    root.locale = am5locales_ptBR;

    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout,
        paddingTop: 30,
        paddingRight: 30,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "category",
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 30,
        }),
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    xAxis.get("renderer").grid.template.set("forceHidden", true);
    xAxis.get("renderer").labels.template.setAll({
      forceHidden: false,
      paddingTop: 30,
    });

    xAxis.data.setAll(chartData);

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 400,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );

    yAxis.get("renderer").grid.template.set("forceHidden", true);
    yAxis.get("renderer").labels.template.set("forceHidden", true);

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis,
        yAxis,
        valueYField: "value",
        categoryXField: "category",
        maskBullets: false,
      })
    );

    series.columns.template.setAll({
      width: am5.p100,
      tooltipY: 0,
      strokeOpacity: 1,
      strokeWidth: 2,
      stroke: am5.color(0xffffff),
      templateField: "columnSettings",
    });

    series.bullets.push((root, target, dataItem) => {
      const context = dataItem.dataContext;

      if (context.currentBullet) {
        const container = am5.Container.new(root, {});
        container.children.push(
          am5.Graphics.new(root, {
            fill: context.columnSettings.fill,
            dy: -5,
            centerY: am5.p100,
            centerX: am5.p50,
            svgPath:
              "M66.9 41.8c0-11.3-9.1-20.4-20.4-20.4-11.3 0-20.4 9.1-20.4 20.4 0 11.3 20.4 32.4 20.4 32.4s20.4-21.1 20.4-32.4zM37 41.4c0-5.2 4.3-9.5 9.5-9.5s9.5 4.2 9.5 9.5c0 5.2-4.2 9.5-9.5 9.5-5.2 0-9.5-4.3-9.5-9.5z",
          })
        );

        container.children.push(
          am5.Label.new(root, {
            dy: -78,
            centerY: am5.p50,
            centerX: am5.p50,
            populateText: true,
            paddingTop: 5,
            paddingRight: 5,
            paddingBottom: 5,
            paddingLeft: 5,
            background: am5.RoundedRectangle.new(root, {
              fill: am5.color(0xffffff),
              cornerRadiusTL: 10,
              cornerRadiusTR: 20,
              cornerRadiusBR: 20,
              cornerRadiusBL: 20,
            }),
          })
        );

        return am5.Bullet.new(root, {
          locationY: 1,
          sprite: container,
        });
      }

      if (context.targetBullet) {
        const container = am5.Container.new(root, { dx: 0 });
        container.children.push(
          am5.Circle.new(root, {
            radius: 28,
            fill: am5.color(0x11326d),
          })
        );

        container.children.push(
          am5.Label.new(root, {
            text: "[bold]Meta[/]",
            textAlign: "center",
            fill: am5.color(0xffffff),
            centerY: am5.p50,
            centerX: am5.p50,
            populateText: true,
          })
        );

        return am5.Bullet.new(root, {
          locationY: 0.5,
          sprite: container,
        });
      }

      return false;
    });

    series.data.setAll(chartData);
    series.appear();
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [chartId, chartData]);

  return <div id={chartId} style={{ width: "100%", height }} />;
};

export default AnswersChart;
