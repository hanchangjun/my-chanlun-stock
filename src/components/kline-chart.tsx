'use client';

import React, { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { KLineData, ChanLunAnalysis, FractalType, BiDirection, BuySellType } from '@/lib/chanlun';

interface KLineChartProps {
  data: KLineData[];
  analysis?: ChanLunAnalysis;
  showFractals?: boolean;
  showBi?: boolean;
  showDuan?: boolean;
  showZhongShu?: boolean;
  showBuySellPoints?: boolean;
}

export function KLineChart({
  data,
  analysis,
  showFractals = true,
  showBi = true,
  showDuan = true,
  showZhongShu = true,
  showBuySellPoints = true
}: KLineChartProps) {
  const chartRef = useRef<ReactECharts>(null);

  // 计算涨跌颜色
  const getColor = (i: number) => {
    if (i === 0) return '#ec5e5e';
    return data[i].close >= data[i - 1].close ? '#f54949' : '#1dbf7a';
  };

  // 准备K线数据
  const klineData = data.map((item, index) => [
    item.open,
    item.close,
    item.low,
    item.high,
  ]);

  // 准备成交量数据
  const volumeData = data.map((item, index) => [
    index,
    item.volume,
    item.close >= item.open ? 1 : -1
  ]);

  // 准备MA均线数据
  const calculateMA = (dayCount: number) => {
    const result: (number | string)[] = [];
    for (let i = 0, len = data.length; i < len; i++) {
      if (i < dayCount - 1) {
        result.push('-');
        continue;
      }
      let sum = 0;
      for (let j = 0; j < dayCount; j++) {
        sum += data[i - j].close;
      }
      result.push(+(sum / dayCount).toFixed(2));
    }
    return result;
  };

  const ma5 = calculateMA(5);
  const ma10 = calculateMA(10);
  const ma20 = calculateMA(20);
  const ma30 = calculateMA(30);

  // 分型标记
  const fractalMarkers = analysis?.fractals.flatMap((fractal, idx) => {
    if (!showFractals) return [];
    
    const isTop = fractal.type === FractalType.Top;
    return [{
      name: isTop ? '顶分型' : '底分型',
      coord: [fractal.index, isTop ? fractal.high : fractal.low],
      value: isTop ? '顶' : '底',
      itemStyle: {
        color: isTop ? '#ff4444' : '#44ff44'
      },
      label: {
        show: true,
        position: isTop ? 'top' : 'bottom',
        fontSize: 10,
        color: isTop ? '#ff4444' : '#44ff44'
      }
    }];
  }) || [];

  // 买卖点标记
  const buySellMarkers = analysis?.buySellPoints.flatMap((point, idx) => {
    if (!showBuySellPoints) return [];
    
    const isBuy = point.type.includes('buy');
    const color = getBuySellColor(point.type);
    
    return [{
      name: point.description,
      coord: [point.index, point.price],
      value: isBuy ? '买' : '卖',
      symbolSize: point.strength * 3,
      itemStyle: {
        color: color
      },
      label: {
        show: true,
        position: isBuy ? 'bottom' : 'top',
        fontSize: 11,
        fontWeight: 'bold',
        color: color,
        formatter: isBuy ? `买${point.strength}` : `卖${point.strength}`
      }
    }];
  }) || [];

  // 线段标注
  const duanAnnotations = analysis?.duanList.filter(() => showDuan).flatMap(duan => {
    const color = duan.direction === BiDirection.Up ? '#ff6b6b' : '#4ecdc4';
    
    return [{
      name: '线段',
      type: 'line',
      xAxis: duan.startIndex,
      yAxis: duan.startPrice,
      xAxis2: duan.endIndex,
      yAxis2: duan.endPrice,
      lineStyle: {
        color: color,
        width: 2,
        type: 'solid',
        opacity: 0.7
      },
      label: {
        show: false
      }
    }];
  }) || [];

  // 中枢标注
  const zhongshuAnnotations = analysis?.zhongshuList.filter(() => showZhongShu).flatMap((zs, idx) => {
    const startIndex = analysis.duanList.findIndex(d => 
      d.startDate === zs.startDate && d.endDate === zs.endDate
    );
    const startIdx = startIndex >= 0 ? analysis.duanList[startIndex].startIndex : 0;
    const endIdx = startIndex >= 0 && startIndex < analysis.duanList.length - 1 
      ? analysis.duanList[startIndex + zs.duanList.length - 1].endIndex 
      : data.length - 1;
    
    return [
      {
        name: '中枢上沿',
        type: 'line',
        xAxis: startIdx,
        yAxis: zs.high,
        xAxis2: endIdx,
        yAxis2: zs.high,
        lineStyle: {
          color: '#9b59b6',
          width: 2,
          type: 'dashed',
          opacity: 0.6
        },
        label: {
          show: false
        }
      },
      {
        name: '中枢下沿',
        type: 'line',
        xAxis: startIdx,
        yAxis: zs.low,
        xAxis2: endIdx,
        yAxis2: zs.low,
        lineStyle: {
          color: '#9b59b6',
          width: 2,
          type: 'dashed',
          opacity: 0.6
        },
        label: {
          show: false
        }
      },
      {
        name: '中枢',
        type: 'rect',
        xAxis: startIdx,
        yAxis: zs.low,
        xAxis2: endIdx,
        yAxis2: zs.high,
        itemStyle: {
          color: '#9b59b6',
          opacity: 0.1
        },
        label: {
          show: true,
          position: 'inside',
          formatter: `中枢${idx + 1}`,
          color: '#9b59b6',
          fontSize: 10
        }
      }
    ];
  }) || [];

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      },
      formatter: (params: any) => {
        const dataIndex = params[0].dataIndex;
        const k = data[dataIndex];
        const changePercent = parseFloat(((k.close - k.open) / k.open * 100).toFixed(2));
        
        let html = `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${k.date}</div>
            <div>开盘: ${k.open.toFixed(2)}</div>
            <div>最高: ${k.high.toFixed(2)}</div>
            <div>最低: ${k.low.toFixed(2)}</div>
            <div>收盘: ${k.close.toFixed(2)}</div>
            <div style="color: ${changePercent >= 0 ? '#f54949' : '#1dbf7a'}">涨跌: ${changePercent}%</div>
            <div>成交量: ${(k.volume / 10000).toFixed(0)}万手</div>
          </div>
        `;
        return html;
      }
    },
    legend: {
      data: ['日K', 'MA5', 'MA10', 'MA20', 'MA30'],
      top: 10,
      textStyle: {
        color: '#666'
      }
    },
    grid: [
      {
        left: '10%',
        right: '8%',
        top: '15%',
        height: '50%'
      },
      {
        left: '10%',
        right: '8%',
        top: '70%',
        height: '15%'
      }
    ],
    xAxis: [
      {
        type: 'category',
        data: data.map((item, index) => index),
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
        axisLabel: {
          formatter: (value: number) => {
            return data[value]?.date || '';
          }
        }
      },
      {
        type: 'category',
        gridIndex: 1,
        data: data.map((item, index) => index),
        axisLabel: { show: false }
      }
    ],
    yAxis: [
      {
        scale: true,
        splitArea: {
          show: true
        },
        axisLabel: {
          formatter: '{value}'
        }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 50,
        end: 100
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        top: '90%',
        start: 50,
        end: 100
      }
    ],
    series: [
      {
        name: '日K',
        type: 'candlestick',
        data: klineData,
        itemStyle: {
          color: '#f54949',
          color0: '#1dbf7a',
          borderColor: '#f54949',
          borderColor0: '#1dbf7a'
        },
        markPoint: {
          data: [...fractalMarkers, ...buySellMarkers]
        }
      },
      {
        name: 'MA5',
        type: 'line',
        data: ma5,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 1
        }
      },
      {
        name: 'MA10',
        type: 'line',
        data: ma10,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 1
        }
      },
      {
        name: 'MA20',
        type: 'line',
        data: ma20,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 1
        }
      },
      {
        name: 'MA30',
        type: 'line',
        data: ma30,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 1
        }
      },
      {
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumeData,
        itemStyle: {
          color: (params: any) => {
            return params[2] === 1 ? '#f54949' : '#1dbf7a';
          }
        }
      }
    ],
    graphic: [...duanAnnotations, ...zhongshuAnnotations]
  };

  return (
    <div className="w-full h-full">
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '600px' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}

// 获取买卖点颜色
function getBuySellColor(type: BuySellType): string {
  switch (type) {
    case BuySellType.FirstBuy:
      return '#ff4444';
    case BuySellType.SecondBuy:
      return '#ff6666';
    case BuySellType.ThirdBuy:
      return '#ff8888';
    case BuySellType.SmallLevelBuy:
      return '#ffaaaa';
    case BuySellType.FirstSell:
      return '#4444ff';
    case BuySellType.SecondSell:
      return '#6666ff';
    case BuySellType.ThirdSell:
      return '#8888ff';
    case BuySellType.SmallLevelSell:
      return '#aaaaff';
    default:
      return '#000000';
  }
}
