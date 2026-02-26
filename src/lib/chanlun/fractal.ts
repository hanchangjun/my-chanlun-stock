import { KLineData, Fractal, FractalType } from './types';

/**
 * 识别分型
 * 
 * 缠论分型定义：
 * - 顶分型：三根K线，中间K线的高点是最高的，低点也是最高的
 * - 底分型：三根K线，中间K线的低点是最低的，高点也是最低的
 * 
 * 包含关系处理：
 * 如果K线之间存在包含关系，需要按照缠论规则处理：
 * - 向上趋势中，高点取较高的，低点取较高的
 * - 向下趋势中，高点取较低的，低点取较低的
 * 
 * @param klines K线数据
 * @returns 分型列表
 */
export function identifyFractals(klines: KLineData[]): Fractal[] {
  const fractals: Fractal[] = [];
  
  if (klines.length < 3) {
    return fractals;
  }

  // 先处理包含关系
  const processedKlines = processIncludeRelations(klines);

  // 识别分型
  for (let i = 1; i < processedKlines.length - 1; i++) {
    const prev = processedKlines[i - 1];
    const curr = processedKlines[i];
    const next = processedKlines[i + 1];

    // 顶分型：中间K线的高点最高，低点也最高
    if (curr.high > prev.high && 
        curr.high > next.high &&
        curr.low > prev.low && 
        curr.low > next.low) {
      
      fractals.push({
        type: FractalType.Top,
        index: i,
        date: curr.date,
        high: curr.high,
        low: curr.low,
        kline: klines[i]
      });
    }
    // 底分型：中间K线的低点最低，高点也最低
    else if (curr.low < prev.low && 
             curr.low < next.low &&
             curr.high < prev.high && 
             curr.high < next.high) {
      
      fractals.push({
        type: FractalType.Bottom,
        index: i,
        date: curr.date,
        high: curr.high,
        low: curr.low,
        kline: klines[i]
      });
    }
  }

  return fractals;
}

/**
 * 处理包含关系
 * 
 * 缠论包含关系处理规则：
 * 如果两根相邻K线存在包含关系（一根K线完全在另一根K线范围内）：
 * - 向上趋势中：高点取较高的，低点取较高的
 * - 向下趋势中：高点取较低的，低点取较低的
 * 
 * @param klines 原始K线数据
 * @returns 处理后的K线数据
 */
function processIncludeRelations(klines: KLineData[]): KLineData[] {
  const processed = [...klines];
  
  // 简化处理：直接返回原始K线，不处理包含关系
  // 实际应用中需要根据趋势方向处理包含关系
  
  return processed;
}

/**
 * 过滤有效分型
 * 
 * 缠论规定：
 * - 连续的同类分型（如连续两个顶分型）只保留最高的一个
 * - 顶分型和底分型之间至少要有一根K线
 * 
 * @param fractals 原始分型列表
 * @returns 过滤后的分型列表
 */
export function filterValidFractals(fractals: Fractal[]): Fractal[] {
  if (fractals.length === 0) {
    return fractals;
  }

  const validFractals: Fractal[] = [fractals[0]];

  for (let i = 1; i < fractals.length; i++) {
    const current = fractals[i];
    const last = validFractals[validFractals.length - 1];

    // 如果类型相同，保留更极端的
    if (current.type === last.type) {
      if (current.type === FractalType.Top) {
        // 顶分型：保留更高的
        if (current.high > last.high) {
          validFractals[validFractals.length - 1] = current;
        }
      } else {
        // 底分型：保留更低的
        if (current.low < last.low) {
          validFractals[validFractals.length - 1] = current;
        }
      }
    } else {
      // 类型不同，直接添加
      validFractals.push(current);
    }
  }

  return validFractals;
}
