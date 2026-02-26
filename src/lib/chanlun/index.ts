/**
 * 缠论分析主入口
 * 
 * 整合缠论各个模块，提供统一的分析接口
 */

import { KLineData, ChanLunAnalysis } from './types';
import { identifyFractals, filterValidFractals } from './fractal';
import { identifyBi } from './bi';
import { identifyDuan } from './duan';
import { identifyZhongShu } from './zhongshu';
import { identifyBuySellPoints, generateBuySellSummary } from './indicators';

/**
 * 执行完整的缠论分析
 * 
 * @param klines K线数据
 * @returns 缠论分析结果
 */
export function analyzeChanLun(klines: KLineData[]): ChanLunAnalysis {
  // 1. 识别分型
  const rawFractals = identifyFractals(klines);
  const fractals = filterValidFractals(rawFractals);

  // 2. 识别笔
  const biList = identifyBi(klines, fractals);

  // 3. 识别线段
  const duanList = identifyDuan(biList);

  // 4. 识别中枢
  const zhongshuList = identifyZhongShu(duanList);

  // 5. 识别买卖点
  const buySellPoints = identifyBuySellPoints(klines, biList, duanList, zhongshuList);

  return {
    fractals,
    biList,
    duanList,
    zhongshuList,
    buySellPoints
  };
}

/**
 * 生成缠论分析报告
 * 
 * @param analysis 缠论分析结果
 * @returns 分析报告文本
 */
export function generateAnalysisReport(analysis: ChanLunAnalysis): string {
  const { fractals, biList, duanList, zhongshuList, buySellPoints } = analysis;

  let report = '=== 缠论分析报告 ===\n\n';

  // 分型统计
  report += `【分型统计】\n`;
  const topFractals = fractals.filter(f => f.type === 'top').length;
  const bottomFractals = fractals.filter(f => f.type === 'bottom').length;
  report += `顶分型: ${topFractals} 个\n`;
  report += `底分型: ${bottomFractals} 个\n\n`;

  // 笔统计
  report += `【笔统计】\n`;
  const upBi = biList.filter(b => b.direction === 'up').length;
  const downBi = biList.filter(b => b.direction === 'down').length;
  report += `向上笔: ${upBi} 个\n`;
  report += `向下笔: ${downBi} 个\n`;
  if (biList.length > 0) {
    const lastBi = biList[biList.length - 1];
    report += `当前笔方向: ${lastBi.direction === 'up' ? '向上' : '向下'}\n`;
  }
  report += '\n';

  // 线段统计
  report += `【线段统计】\n`;
  report += `线段数量: ${duanList.length} 个\n`;
  if (duanList.length > 0) {
    const lastDuan = duanList[duanList.length - 1];
    report += `当前线段方向: ${lastDuan.direction === 'up' ? '向上' : '向下'}\n`;
  }
  report += '\n';

  // 中枢统计
  report += `【中枢统计】\n`;
  report += `中枢数量: ${zhongshuList.length} 个\n`;
  if (zhongshuList.length > 0) {
    const lastZhongShu = zhongshuList[zhongshuList.length - 1];
    report += `最新中枢区间: ${lastZhongShu.low.toFixed(2)} - ${lastZhongShu.high.toFixed(2)}\n`;
    report += `中枢中枢: ${lastZhongShu.center.toFixed(2)}\n`;
  }
  report += '\n';

  // 买卖点
  report += `【买卖点分析】\n`;
  report += generateBuySellSummary(buySellPoints);

  // 趋势判断
  report += `\n【趋势判断】\n`;
  if (duanList.length >= 3) {
    const recentDuans = duanList.slice(-3);
    const upCount = recentDuans.filter(d => d.direction === 'up').length;
    const downCount = recentDuans.filter(d => d.direction === 'down').length;
    
    if (upCount > downCount) {
      report += '短期趋势: 上涨\n';
    } else if (downCount > upCount) {
      report += '短期趋势: 下跌\n';
    } else {
      report += '短期趋势: 震荡\n';
    }
  } else {
    report += '趋势: 待观察\n';
  }

  return report;
}

/**
 * 获取当前价格状态
 * 
 * @param analysis 缠论分析结果
 * @param currentPrice 当前价格
 * @returns 价格状态描述
 */
export function getPriceStatus(analysis: ChanLunAnalysis, currentPrice: number): string {
  const { zhongshuList, duanList } = analysis;

  if (zhongshuList.length > 0) {
    const lastZhongShu = zhongshuList[zhongshuList.length - 1];
    
    if (currentPrice > lastZhongShu.high) {
      return `价格突破中枢上沿 (${lastZhongShu.high.toFixed(2)})`;
    } else if (currentPrice < lastZhongShu.low) {
      return `价格跌破中枢下沿 (${lastZhongShu.low.toFixed(2)})`;
    } else {
      return `价格在中枢区间内 (${lastZhongShu.low.toFixed(2)} - ${lastZhongShu.high.toFixed(2)})`;
    }
  }

  if (duanList.length > 0) {
    const lastDuan = duanList[duanList.length - 1];
    return `当前处于${lastDuan.direction === 'up' ? '向上' : '向下'}线段`;
  }

  return '等待形成结构';
}

export * from './types';
export * from './fractal';
export * from './bi';
export * from './duan';
export * from './zhongshu';
export * from './indicators';
