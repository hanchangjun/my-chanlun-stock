import { KLineData, Bi, Duan, ZhongShu, BuySellPoint, BuySellType, BiDirection, Fractal } from './types';
import { getCurrentBiDirection } from './bi';
import { getCurrentDuan } from './duan';
import { getCurrentZhongShu } from './zhongshu';

/**
 * 识别买卖点
 * 
 * 缠论买卖点体系：
 * 
 * 一买（第一类买点）：
 * - 下跌趋势中，最后一个中枢的第三类卖点出现后
 * - 价格跌破最后一个中枢的下沿，形成背驰
 * - 通常出现在线段或笔的级别
 * 
 * 二买（第二类买点）：
 * - 一买之后，回抽不破一买的低点
 * - 价格在第一个回调低点形成底分型
 * 
 * 三买（第三类买点）：
 * - 上涨趋势中，价格突破最后一个中枢的上沿
 * - 回抽不跌破中枢上沿
 * 
 * 一卖、二卖、三卖则是对称的卖点
 * 
 * @param klines K线数据
 * @param biList 笔列表
 * @param duanList 线段列表
 * @param zhongshuList 中枢列表
 * @returns 买卖点列表
 */
export function identifyBuySellPoints(
  klines: KLineData[],
  biList: Bi[],
  duanList: Duan[],
  zhongshuList: ZhongShu[]
): BuySellPoint[] {
  const buySellPoints: BuySellPoint[] = [];

  if (klines.length === 0) {
    return buySellPoints;
  }

  // 识别一买（下跌趋势背驰）
  const firstBuys = identifyFirstBuy(klines, biList, duanList, zhongshuList);
  buySellPoints.push(...firstBuys);

  // 识别一卖（上涨趋势背驰）
  const firstSells = identifyFirstSell(klines, biList, duanList, zhongshuList);
  buySellPoints.push(...firstSells);

  // 识别二买
  const secondBuys = identifySecondBuy(klines, biList, zhongshuList);
  buySellPoints.push(...secondBuys);

  // 识别二卖
  const secondSells = identifySecondSell(klines, biList, zhongshuList);
  buySellPoints.push(...secondSells);

  // 识别三买
  const thirdBuys = identifyThirdBuy(klines, biList, duanList, zhongshuList);
  buySellPoints.push(...thirdBuys);

  // 识别三卖
  const thirdSells = identifyThirdSell(klines, biList, duanList, zhongshuList);
  buySellPoints.push(...thirdSells);

  // 识别小级别买卖点（基于分型）
  const smallLevelPoints = identifySmallLevelPoints(klines, biList);
  buySellPoints.push(...smallLevelPoints);

  // 按时间排序
  buySellPoints.sort((a, b) => a.index - b.index);

  return buySellPoints;
}

/**
 * 识别一买
 * 
 * 下跌趋势背驰买点
 */
function identifyFirstBuy(
  klines: KLineData[],
  biList: Bi[],
  duanList: Duan[],
  zhongshuList: ZhongShu[]
): BuySellPoint[] {
  const points: BuySellPoint[] = [];

  if (duanList.length < 3 || zhongshuList.length === 0) {
    return points;
  }

  const lastZhongShu = getCurrentZhongShu(zhongshuList);
  if (!lastZhongShu || lastZhongShu.direction !== BiDirection.Down) {
    return points;
  }

  // 寻找跌破中枢下沿的向下线段
  for (let i = duanList.length - 1; i >= 0; i--) {
    const duan = duanList[i];
    if (duan.direction === BiDirection.Down && duan.low < lastZhongShu.low) {
      // 检查背驰（简化版：成交量萎缩）
      const klineIndex = duan.endIndex;
      if (klineIndex < klines.length) {
        const kline = klines[klineIndex];
        
        // 检查是否底分型
        if (isBottomFractal(klines, klineIndex)) {
          points.push({
            type: BuySellType.FirstBuy,
            index: klineIndex,
            date: kline.date,
            price: kline.low,
            strength: 5,
            description: '一买：下跌趋势背驰，跌破中枢下沿'
          });
          break;
        }
      }
    }
  }

  return points;
}

/**
 * 识别一卖
 * 
 * 上涨趋势背驰卖点
 */
function identifyFirstSell(
  klines: KLineData[],
  biList: Bi[],
  duanList: Duan[],
  zhongshuList: ZhongShu[]
): BuySellPoint[] {
  const points: BuySellPoint[] = [];

  if (duanList.length < 3 || zhongshuList.length === 0) {
    return points;
  }

  const lastZhongShu = getCurrentZhongShu(zhongshuList);
  if (!lastZhongShu || lastZhongShu.direction !== BiDirection.Up) {
    return points;
  }

  // 寻找突破中枢上沿的向上线段
  for (let i = duanList.length - 1; i >= 0; i--) {
    const duan = duanList[i];
    if (duan.direction === BiDirection.Up && duan.high > lastZhongShu.high) {
      // 检查背驰
      const klineIndex = duan.endIndex;
      if (klineIndex < klines.length) {
        const kline = klines[klineIndex];
        
        // 检查是否顶分型
        if (isTopFractal(klines, klineIndex)) {
          points.push({
            type: BuySellType.FirstSell,
            index: klineIndex,
            date: kline.date,
            price: kline.high,
            strength: 5,
            description: '一卖：上涨趋势背驰，突破中枢上沿'
          });
          break;
        }
      }
    }
  }

  return points;
}

/**
 * 识别二买
 * 
 * 一买之后的回调买点
 */
function identifySecondBuy(
  klines: KLineData[],
  biList: Bi[],
  zhongshuList: ZhongShu[]
): BuySellPoint[] {
  const points: BuySellPoint[] = [];

  if (biList.length < 2) {
    return points;
  }

  // 查找一买位置
  const firstBuyIndex = biList.findIndex(bi => 
    bi.direction === BiDirection.Up && bi.endIndex < klines.length - 10
  );

  if (firstBuyIndex === -1) {
    return points;
  }

  // 一买之后寻找不破前低的底分型
  const firstBuy = biList[firstBuyIndex];
  for (let i = firstBuy.endIndex + 1; i < klines.length - 1; i++) {
    if (isBottomFractal(klines, i)) {
      const kline = klines[i];
      if (kline.low > firstBuy.startPrice * 0.98) { // 不破一买低点
        points.push({
          type: BuySellType.SecondBuy,
          index: i,
          date: kline.date,
          price: kline.low,
          strength: 4,
          description: '二买：回抽不破一买低点'
        });
        break;
      }
    }
  }

  return points;
}

/**
 * 识别二卖
 * 
 * 一卖之后的反弹卖点
 */
function identifySecondSell(
  klines: KLineData[],
  biList: Bi[],
  zhongshuList: ZhongShu[]
): BuySellPoint[] {
  const points: BuySellPoint[] = [];

  if (biList.length < 2) {
    return points;
  }

  // 查找一卖位置
  const firstSellIndex = biList.findIndex(bi => 
    bi.direction === BiDirection.Down && bi.endIndex < klines.length - 10
  );

  if (firstSellIndex === -1) {
    return points;
  }

  // 一卖之后寻找不破前高的顶分型
  const firstSell = biList[firstSellIndex];
  for (let i = firstSell.endIndex + 1; i < klines.length - 1; i++) {
    if (isTopFractal(klines, i)) {
      const kline = klines[i];
      if (kline.high < firstSell.startPrice * 1.02) { // 不破一卖高点
        points.push({
          type: BuySellType.SecondSell,
          index: i,
          date: kline.date,
          price: kline.high,
          strength: 4,
          description: '二卖：反弹不破一卖高点'
        });
        break;
      }
    }
  }

  return points;
}

/**
 * 识别三买
 * 
 * 突破中枢上沿后的回抽买点
 */
function identifyThirdBuy(
  klines: KLineData[],
  biList: Bi[],
  duanList: Duan[],
  zhongshuList: ZhongShu[]
): BuySellPoint[] {
  const points: BuySellPoint[] = [];

  if (duanList.length < 2 || zhongshuList.length === 0) {
    return points;
  }

  const lastZhongShu = getCurrentZhongShu(zhongshuList);
  if (!lastZhongShu) {
    return points;
  }

  // 寻找突破中枢上沿的线段
  for (let i = 0; i < duanList.length; i++) {
    const duan = duanList[i];
    if (duan.direction === BiDirection.Up && duan.high > lastZhongShu.high) {
      // 寻找之后的回抽
      for (let j = i + 1; j < biList.length; j++) {
        const bi = biList[j];
        if (bi.direction === BiDirection.Down) {
          const klineIndex = bi.endIndex;
          if (klineIndex < klines.length) {
            const kline = klines[klineIndex];
            if (kline.low >= lastZhongShu.high * 0.995) { // 回抽不破中枢上沿
              points.push({
                type: BuySellType.ThirdBuy,
                index: klineIndex,
                date: kline.date,
                price: kline.low,
                strength: 4,
                description: '三买：突破中枢上沿，回抽不破'
              });
              break;
            }
          }
        }
      }
      break;
    }
  }

  return points;
}

/**
 * 识别三卖
 * 
 * 跌破中枢下沿后的反弹卖点
 */
function identifyThirdSell(
  klines: KLineData[],
  biList: Bi[],
  duanList: Duan[],
  zhongshuList: ZhongShu[]
): BuySellPoint[] {
  const points: BuySellPoint[] = [];

  if (duanList.length < 2 || zhongshuList.length === 0) {
    return points;
  }

  const lastZhongShu = getCurrentZhongShu(zhongshuList);
  if (!lastZhongShu) {
    return points;
  }

  // 寻找跌破中枢下沿的线段
  for (let i = 0; i < duanList.length; i++) {
    const duan = duanList[i];
    if (duan.direction === BiDirection.Down && duan.low < lastZhongShu.low) {
      // 寻找之后的反弹
      for (let j = i + 1; j < biList.length; j++) {
        const bi = biList[j];
        if (bi.direction === BiDirection.Up) {
          const klineIndex = bi.endIndex;
          if (klineIndex < klines.length) {
            const kline = klines[klineIndex];
            if (kline.high <= lastZhongShu.low * 1.005) { // 反弹不破中枢下沿
              points.push({
                type: BuySellType.ThirdSell,
                index: klineIndex,
                date: kline.date,
                price: kline.high,
                strength: 4,
                description: '三卖：跌破中枢下沿，反弹不破'
              });
              break;
            }
          }
        }
      }
      break;
    }
  }

  return points;
}

/**
 * 识别小级别买卖点
 * 
 * 基于分型的短线买卖点
 */
function identifySmallLevelPoints(klines: KLineData[], biList: Bi[]): BuySellPoint[] {
  const points: BuySellPoint[] = [];

  for (let i = 1; i < klines.length - 1; i++) {
    // 识别底分型作为小买点
    if (isBottomFractal(klines, i)) {
      const kline = klines[i];
      points.push({
        type: BuySellType.SmallLevelBuy,
        index: i,
        date: kline.date,
        price: kline.low,
        strength: 2,
        description: '小买：底分型'
      });
    }
    // 识别顶分型作为小卖点
    else if (isTopFractal(klines, i)) {
      const kline = klines[i];
      points.push({
        type: BuySellType.SmallLevelSell,
        index: i,
        date: kline.date,
        price: kline.high,
        strength: 2,
        description: '小卖：顶分型'
      });
    }
  }

  return points;
}

/**
 * 判断是否为顶分型
 */
function isTopFractal(klines: KLineData[], index: number): boolean {
  if (index < 1 || index >= klines.length - 1) {
    return false;
  }

  const prev = klines[index - 1];
  const curr = klines[index];
  const next = klines[index + 1];

  return curr.high > prev.high && 
         curr.high > next.high &&
         curr.low > prev.low && 
         curr.low > next.low;
}

/**
 * 判断是否为底分型
 */
function isBottomFractal(klines: KLineData[], index: number): boolean {
  if (index < 1 || index >= klines.length - 1) {
    return false;
  }

  const prev = klines[index - 1];
  const curr = klines[index];
  const next = klines[index + 1];

  return curr.low < prev.low && 
         curr.low < next.low &&
         curr.high < prev.high && 
         curr.high < next.high;
}

/**
 * 生成买卖点摘要
 */
export function generateBuySellSummary(buySellPoints: BuySellPoint[]): string {
  const buys = buySellPoints.filter(p => p.type.includes('buy'));
  const sells = buySellPoints.filter(p => p.type.includes('sell'));

  let summary = `共识别到 ${buySellPoints.length} 个买卖点\n`;
  summary += `买点: ${buys.length} 个\n`;
  summary += `卖点: ${sells.length} 个\n\n`;

  if (buys.length > 0) {
    summary += '最新买点:\n';
    const latestBuy = buys[buys.length - 1];
    summary += `- ${latestBuy.description} (${latestBuy.date} @ ${latestBuy.price.toFixed(2)})\n`;
  }

  if (sells.length > 0) {
    summary += '\n最新卖点:\n';
    const latestSell = sells[sells.length - 1];
    summary += `- ${latestSell.description} (${latestSell.date} @ ${latestSell.price.toFixed(2)})\n`;
  }

  return summary;
}
