import { KlineData } from './macd';

/**
 * 量能背驰信号接口
 */
export interface VolumeDivergenceSignal {
  type: 'top' | 'bottom';  // 顶背驰或底背驰
  date: string;
  price: number;
  volume: number;
  strength: number;  // 背驰强度 0-1
  points: {
    date: string;
    price: number;
    volume: number;
  }[];
}

/**
 * 计算移动平均成交量（用于平滑）
 */
export function calculateVolumeMA(volumes: number[], period: number): number[] {
  const ma: number[] = [];

  for (let i = 0; i < volumes.length; i++) {
    if (i < period - 1) {
      // 数据不足，计算当前已有的平均值
      const sum = volumes.slice(0, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / (i + 1));
    } else {
      // 计算完整周期的平均值
      const sum = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / period);
    }
  }

  return ma;
}

/**
 * 判断价量顶背驰
 */
export function detectVolumeTopDivergence(
  highs: KlineData[],
  windowSize: number = 5,
  minPoints: number = 3
): VolumeDivergenceSignal | null {
  if (highs.length < minPoints) {
    return null;
  }

  // 获取最近的minPoints个高点
  const recentHighs = highs.slice(-minPoints);

  // 计算成交量的移动平均
  const volumes = recentHighs.map(h => h.volume);
  const volumeMA = calculateVolumeMA(volumes, windowSize);

  // 构建数据点
  const points = recentHighs.map((high, index) => ({
    date: typeof high.date === 'string' ? high.date : new Date(high.date).toISOString().split('T')[0],
    price: high.high,
    volume: volumeMA[index]
  }));

  // 检查价格是否上升
  const priceTrend = points[points.length - 1].price - points[0].price;
  if (priceTrend <= 0) {
    return null; // 价格没有上升，不能是顶背驰
  }

  // 检查成交量是否下降或持平
  const volumeTrend = points[points.length - 1].volume - points[0].volume;
  if (volumeTrend > 0) {
    return null; // 成交量上升，不是背驰
  }

  // 计算背驰强度
  const priceChange = Math.abs(priceTrend) / points[0].price;
  const volumeChange = Math.abs(volumeTrend) / points[0].volume;
  const strength = Math.min(priceChange * volumeChange * 100, 1);

  return {
    type: 'top',
    date: points[points.length - 1].date,
    price: points[points.length - 1].price,
    volume: points[points.length - 1].volume,
    strength,
    points
  };
}

/**
 * 判断价量底背驰
 */
export function detectVolumeBottomDivergence(
  lows: KlineData[],
  windowSize: number = 5,
  minPoints: number = 3
): VolumeDivergenceSignal | null {
  if (lows.length < minPoints) {
    return null;
  }

  // 获取最近的minPoints个低点
  const recentLows = lows.slice(-minPoints);

  // 计算成交量的移动平均
  const volumes = recentLows.map(l => l.volume);
  const volumeMA = calculateVolumeMA(volumes, windowSize);

  // 构建数据点
  const points = recentLows.map((low, index) => ({
    date: typeof low.date === 'string' ? low.date : new Date(low.date).toISOString().split('T')[0],
    price: low.low,
    volume: volumeMA[index]
  }));

  // 检查价格是否下降
  const priceTrend = points[points.length - 1].price - points[0].price;
  if (priceTrend >= 0) {
    return null; // 价格没有下降，不能是底背驰
  }

  // 检查成交量是否上升（抛压减轻）
  const volumeTrend = points[points.length - 1].volume - points[0].volume;
  if (volumeTrend < 0) {
    return null; // 成交量下降，不是背驰
  }

  // 计算背驰强度
  const priceChange = Math.abs(priceTrend) / points[0].price;
  const volumeChange = Math.abs(volumeTrend) / points[0].volume;
  const strength = Math.min(priceChange * volumeChange * 100, 1);

  return {
    type: 'bottom',
    date: points[points.length - 1].date,
    price: points[points.length - 1].price,
    volume: points[points.length - 1].volume,
    strength,
    points
  };
}

/**
 * 找到局部高点（复用macd.ts的逻辑）
 */
export function findLocalHighs(data: KlineData[], windowSize: number = 5): KlineData[] {
  const highs: KlineData[] = [];

  for (let i = windowSize; i < data.length - windowSize; i++) {
    const current = data[i];
    let isHigh = true;

    // 检查前windowSize根K线
    for (let j = i - windowSize; j < i; j++) {
      if (data[j].high >= current.high) {
        isHigh = false;
        break;
      }
    }

    // 检查后windowSize根K线
    for (let j = i + 1; j <= i + windowSize; j++) {
      if (data[j].high >= current.high) {
        isHigh = false;
        break;
      }
    }

    if (isHigh) {
      highs.push(current);
    }
  }

  return highs;
}

/**
 * 找到局部低点（复用macd.ts的逻辑）
 */
export function findLocalLows(data: KlineData[], windowSize: number = 5): KlineData[] {
  const lows: KlineData[] = [];

  for (let i = windowSize; i < data.length - windowSize; i++) {
    const current = data[i];
    let isLow = true;

    // 检查前windowSize根K线
    for (let j = i - windowSize; j < i; j++) {
      if (data[j].low <= current.low) {
        isLow = false;
        break;
      }
    }

    // 检查后windowSize根K线
    for (let j = i + 1; j <= i + windowSize; j++) {
      if (data[j].low <= current.low) {
        isLow = false;
        break;
      }
    }

    if (isLow) {
      lows.push(current);
    }
  }

  return lows;
}

/**
 * 检测量能背驰
 */
export function detectVolumeDivergence(
  klines: KlineData[],
  windowSize: number = 5,
  minPoints: number = 3
): { topDivergence: VolumeDivergenceSignal | null; bottomDivergence: VolumeDivergenceSignal | null } {
  // 找到局部高点和低点
  const highs = findLocalHighs(klines, windowSize);
  const lows = findLocalLows(klines, windowSize);

  // 检测顶背驰
  const topDivergence = detectVolumeTopDivergence(highs, windowSize, minPoints);

  // 检测底背驰
  const bottomDivergence = detectVolumeBottomDivergence(lows, windowSize, minPoints);

  return {
    topDivergence,
    bottomDivergence
  };
}

/**
 * 综合背驰判断（结合MACD和量能）
 */
export interface CombinedDivergenceSignal {
  type: 'top' | 'bottom';
  date: string;
  price: number;
  hasMACDDivergence: boolean;
  hasVolumeDivergence: boolean;
  macdStrength?: number;
  volumeStrength?: number;
  combinedStrength: number;  // 综合强度 0-1
}

export function detectCombinedDivergence(
  klines: KlineData[],
  windowSize: number = 5,
  minPoints: number = 3
): { topDivergence: CombinedDivergenceSignal | null; bottomDivergence: CombinedDivergenceSignal | null } {
  const { topDivergence: macdTop, bottomDivergence: macdBottom } = require('./macd').detectMACDDivergence(klines, minPoints);
  const { topDivergence: volTop, bottomDivergence: volBottom } = detectVolumeDivergence(klines, windowSize, minPoints);

  // 综合顶背驰
  const topDivergence: CombinedDivergenceSignal | null = macdTop || volTop ? {
    type: 'top',
    date: (macdTop || volTop!)?.date || '',
    price: (macdTop || volTop!)?.price || 0,
    hasMACDDivergence: !!macdTop,
    hasVolumeDivergence: !!volTop,
    macdStrength: macdTop?.strength,
    volumeStrength: volTop?.strength,
    combinedStrength: Math.min(
      ((macdTop?.strength || 0) + (volTop?.strength || 0)) * 1.5,
      1
    )
  } : null;

  // 综合底背驰
  const bottomDivergence: CombinedDivergenceSignal | null = macdBottom || volBottom ? {
    type: 'bottom',
    date: (macdBottom || volBottom!)?.date || '',
    price: (macdBottom || volBottom!)?.price || 0,
    hasMACDDivergence: !!macdBottom,
    hasVolumeDivergence: !!volBottom,
    macdStrength: macdBottom?.strength,
    volumeStrength: volBottom?.strength,
    combinedStrength: Math.min(
      ((macdBottom?.strength || 0) + (volBottom?.strength || 0)) * 1.5,
      1
    )
  } : null;

  return {
    topDivergence,
    bottomDivergence
  };
}
