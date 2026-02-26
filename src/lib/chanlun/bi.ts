import { KLineData, Fractal, Bi, BiDirection, FractalType } from './types';
import { filterValidFractals } from './fractal';

/**
 * 识别笔
 * 
 * 缠论笔的定义：
 * 笔是连接相邻两个分型的线段
 * - 向上笔：从底分型到顶分型
 * - 向下笔：从顶分型到底分型
 * 
 * 笔的确认规则：
 * - 顶分型之后至少出现底分型，才能形成向下笔
 * - 底分型之后至少出现顶分型，才能形成向上笔
 * 
 * @param klines K线数据
 * @param fractals 分型列表
 * @returns 笔列表
 */
export function identifyBi(klines: KLineData[], fractals: Fractal[]): Bi[] {
  const biList: Bi[] = [];
  
  if (fractals.length < 2) {
    return biList;
  }

  // 过滤有效分型
  const validFractals = filterValidFractals(fractals);

  // 识别笔
  for (let i = 0; i < validFractals.length - 1; i++) {
    const current = validFractals[i];
    const next = validFractals[i + 1];

    // 类型必须相反
    if (current.type === next.type) {
      continue;
    }

    // 向上笔：底分型 -> 顶分型
    if (current.type === FractalType.Bottom && next.type === FractalType.Top) {
      const bi: Bi = {
        direction: BiDirection.Up,
        startIndex: current.index,
        endIndex: next.index,
        startDate: current.date,
        endDate: next.date,
        startPrice: current.low,
        endPrice: next.high,
        high: next.high,
        low: current.low,
        startFractal: current,
        endFractal: next
      };

      // 检查笔的有效性：至少包含3根K线
      if (bi.endIndex - bi.startIndex >= 2) {
        biList.push(bi);
      }
    }
    // 向下笔：顶分型 -> 底分型
    else if (current.type === FractalType.Top && next.type === FractalType.Bottom) {
      const bi: Bi = {
        direction: BiDirection.Down,
        startIndex: current.index,
        endIndex: next.index,
        startDate: current.date,
        endDate: next.date,
        startPrice: current.high,
        endPrice: next.low,
        high: current.high,
        low: next.low,
        startFractal: current,
        endFractal: next
      };

      // 检查笔的有效性
      if (bi.endIndex - bi.startIndex >= 2) {
        biList.push(bi);
      }
    }
  }

  return biList;
}

/**
 * 验证笔的完成
 * 
 * 笔的完成需要：
 * - 方向相反的新笔形成
 * - 或者价格突破了关键位
 * 
 * @param biList 笔列表
 * @returns 完成的笔列表
 */
export function validateCompletedBi(biList: Bi[]): Bi[] {
  if (biList.length === 0) {
    return biList;
  }

  // 最后一笔未完成，需要后续确认
  const completedBi = biList.slice(0, biList.length - 1);

  return completedBi;
}

/**
 * 获取当前笔的方向
 * 
 * @param biList 笔列表
 * @returns 笔的方向
 */
export function getCurrentBiDirection(biList: Bi[]): BiDirection | null {
  if (biList.length === 0) {
    return null;
  }
  return biList[biList.length - 1].direction;
}

/**
 * 获取当前笔的价格区间
 * 
 * @param biList 笔列表
 * @returns 价格区间 {high, low}
 */
export function getCurrentBiRange(biList: Bi[]): { high: number; low: number } | null {
  if (biList.length === 0) {
    return null;
  }

  const lastBi = biList[biList.length - 1];
  return {
    high: lastBi.high,
    low: lastBi.low
  };
}
