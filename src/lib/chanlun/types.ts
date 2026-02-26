export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  change: number;
  changePercent: number;
}

/**
 * 分型类型
 */
export enum FractalType {
  None = 'none',
  Top = 'top',      // 顶分型
  Bottom = 'bottom' // 底分型
}

/**
 * 分型
 */
export interface Fractal {
  type: FractalType;
  index: number;
  date: string;
  high: number;
  low: number;
  kline: KLineData;
}

/**
 * 笔的方向
 */
export enum BiDirection {
  Up = 'up',     // 向上笔
  Down = 'down'  // 向下笔
}

/**
 * 笔
 */
export interface Bi {
  direction: BiDirection;
  startIndex: number;
  endIndex: number;
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  high: number;
  low: number;
  startFractal: Fractal;
  endFractal: Fractal;
}

/**
 * 线段
 */
export interface Duan {
  direction: BiDirection;
  startIndex: number;
  endIndex: number;
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  high: number;
  low: number;
  biList: Bi[];
}

/**
 * 中枢
 */
export interface ZhongShu {
  index: number;
  startDate: string;
  endDate: string;
  high: number;      // 中枢上沿
  low: number;       // 中枢下沿
  center: number;    // 中枢中枢
  direction: BiDirection;
  duanList: Duan[];  // 构成中枢的线段
}

/**
 * 买卖点类型
 */
export enum BuySellType {
  FirstBuy = 'first_buy',       // 一买
  SecondBuy = 'second_buy',     // 二买
  ThirdBuy = 'third_buy',       // 三买
  FirstSell = 'first_sell',     // 一卖
  SecondSell = 'second_sell',   // 二卖
  ThirdSell = 'third_sell',     // 三卖
  SmallLevelBuy = 'small_buy',  // 小级别买点
  SmallLevelSell = 'small_sell' // 小级别卖点
}

/**
 * 买卖点
 */
export interface BuySellPoint {
  type: BuySellType;
  index: number;
  date: string;
  price: number;
  strength: number; // 强度 1-5
  description: string;
}

/**
 * 缠论分析结果
 */
export interface ChanLunAnalysis {
  fractals: Fractal[];
  biList: Bi[];
  duanList: Duan[];
  zhongshuList: ZhongShu[];
  buySellPoints: BuySellPoint[];
}
