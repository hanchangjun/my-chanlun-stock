/**
 * K线数据接口
 */
export interface KlineData {
  date: string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
}

/**
 * MACD指标接口
 */
export interface MACDIndicator {
  date: string;
  dif: number;
  dea: number;
  macd: number;
}

/**
 * 背驰信号接口
 */
export interface DivergenceSignal {
  type: 'top' | 'bottom';  // 顶背驰或底背驰
  date: string;
  price: number;
  macdValue: number;
  strength: number;  // 背驰强度 0-1
  points: {
    date: string;
    price: number;
    macdValue: number;
  }[];
}

/**
 * 计算EMA（指数移动平均）
 */
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);

  // 第一天使用SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  const firstEMA = sum / Math.min(period, data.length);
  ema.push(firstEMA);

  // 后续使用EMA公式
  for (let i = period; i < data.length; i++) {
    const emaValue = data[i] * k + ema[i - 1] * (1 - k);
    ema.push(emaValue);
  }

  return ema;
}

/**
 * 计算MACD指标
 * @param closePrices 收盘价数组
 * @param fastPeriod 快线周期，默认12
 * @param slowPeriod 慢线周期，默认26
 * @param signalPeriod 信号线周期，默认9
 */
export function calculateMACD(
  closePrices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { emaFast: number[]; emaSlow: number[]; dif: number[]; dea: number[]; macd: number[] } {
  if (closePrices.length < slowPeriod + signalPeriod) {
    throw new Error('Not enough data to calculate MACD');
  }

  // 计算快线和慢线的EMA
  const emaFast = calculateEMA(closePrices, fastPeriod);
  const emaSlow = calculateEMA(closePrices, slowPeriod);

  // 计算DIF（快线 - 慢线）
  const dif: number[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    dif.push(emaFast[i] - emaSlow[i]);
  }

  // 计算DEA（DIF的EMA）
  const dea = calculateEMA(dif, signalPeriod);

  // 计算MACD = (DIF - DEA) * 2
  const macd: number[] = [];
  for (let i = 0; i < dea.length; i++) {
    macd.push((dif[i] - dea[i]) * 2);
  }

  return {
    emaFast,
    emaSlow,
    dif,
    dea,
    macd
  };
}

/**
 * 将K线数据转换为MACD指标
 */
export function calculateMACDFromKlines(
  klines: KlineData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDIndicator[] {
  const closePrices = klines.map(k => k.close);
  const { dif, dea, macd } = calculateMACD(closePrices, fastPeriod, slowPeriod, signalPeriod);

  // 偏移量（因为EMA需要周期数的数据）
  const offset = slowPeriod + signalPeriod - 2;

  const indicators: MACDIndicator[] = [];
  for (let i = 0; i < macd.length; i++) {
    indicators.push({
      date: typeof klines[i + offset].date === 'string' 
        ? klines[i + offset].date 
        : new Date(klines[i + offset].date).toISOString().split('T')[0],
      dif: dif[i + offset],
      dea: dea[i],
      macd: macd[i]
    });
  }

  return indicators;
}

/**
 * 找到局部高点
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
 * 找到局部低点
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
 * 判断顶背驰
 */
export function detectTopDivergence(
  highs: KlineData[],
  macdIndicators: MACDIndicator[],
  minPoints: number = 3
): DivergenceSignal | null {
  if (highs.length < minPoints) {
    return null;
  }

  // 获取最近的minPoints个高点
  const recentHighs = highs.slice(-minPoints);
  
  // 获取对应的MACD值
  const points = recentHighs.map(high => {
    const macd = macdIndicators.find(m => m.date === 
      (typeof high.date === 'string' ? high.date : new Date(high.date).toISOString().split('T')[0])
    );
    return {
      date: typeof high.date === 'string' ? high.date : new Date(high.date).toISOString().split('T')[0],
      price: high.high,
      macdValue: macd?.macd || 0
    };
  });

  // 检查价格是否上升
  const priceTrend = points[points.length - 1].price - points[0].price;
  if (priceTrend <= 0) {
    return null; // 价格没有上升，不能是顶背驰
  }

  // 检查MACD是否下降
  const macdTrend = points[points.length - 1].macdValue - points[0].macdValue;
  if (macdTrend >= 0) {
    return null; // MACD没有下降，不是背驰
  }

  // 计算背驰强度
  const priceChange = Math.abs(priceTrend) / points[0].price;
  const macdChange = Math.abs(macdTrend);
  const strength = Math.min(priceChange * macdChange * 100, 1);

  return {
    type: 'top',
    date: points[points.length - 1].date,
    price: points[points.length - 1].price,
    macdValue: points[points.length - 1].macdValue,
    strength,
    points
  };
}

/**
 * 判断底背驰
 */
export function detectBottomDivergence(
  lows: KlineData[],
  macdIndicators: MACDIndicator[],
  minPoints: number = 3
): DivergenceSignal | null {
  if (lows.length < minPoints) {
    return null;
  }

  // 获取最近的minPoints个低点
  const recentLows = lows.slice(-minPoints);
  
  // 获取对应的MACD值
  const points = recentLows.map(low => {
    const macd = macdIndicators.find(m => m.date === 
      (typeof low.date === 'string' ? low.date : new Date(low.date).toISOString().split('T')[0])
    );
    return {
      date: typeof low.date === 'string' ? low.date : new Date(low.date).toISOString().split('T')[0],
      price: low.low,
      macdValue: macd?.macd || 0
    };
  });

  // 检查价格是否下降
  const priceTrend = points[points.length - 1].price - points[0].price;
  if (priceTrend >= 0) {
    return null; // 价格没有下降，不能是底背驰
  }

  // 检查MACD是否上升
  const macdTrend = points[points.length - 1].macdValue - points[0].macdValue;
  if (macdTrend <= 0) {
    return null; // MACD没有上升，不是背驰
  }

  // 计算背驰强度
  const priceChange = Math.abs(priceTrend) / points[0].price;
  const macdChange = Math.abs(macdTrend);
  const strength = Math.min(priceChange * macdChange * 100, 1);

  return {
    type: 'bottom',
    date: points[points.length - 1].date,
    price: points[points.length - 1].price,
    macdValue: points[points.length - 1].macdValue,
    strength,
    points
  };
}

/**
 * 检测MACD背驰
 */
export function detectMACDDivergence(
  klines: KlineData[],
  minPoints: number = 3
): { topDivergence: DivergenceSignal | null; bottomDivergence: DivergenceSignal | null } {
  // 计算MACD指标
  const macdIndicators = calculateMACDFromKlines(klines);

  // 找到局部高点和低点
  const highs = findLocalHighs(klines);
  const lows = findLocalLows(klines);

  // 检测顶背驰
  const topDivergence = detectTopDivergence(highs, macdIndicators, minPoints);

  // 检测底背驰
  const bottomDivergence = detectBottomDivergence(lows, macdIndicators, minPoints);

  return {
    topDivergence,
    bottomDivergence
  };
}
