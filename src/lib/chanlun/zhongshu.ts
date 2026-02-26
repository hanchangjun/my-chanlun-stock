import { Duan, ZhongShu, BiDirection } from './types';

/**
 * 识别中枢
 * 
 * 缠论中枢的定义：
 * 至少三个连续线段构成中枢
 * 
 * 中枢的形成：
 * - 第一段线段确定中枢方向
 * - 第二段线段与第一段线段有重叠
 * - 第三段线段与前两段线段有重叠
 * 
 * 中枢的延伸：
 * - 后续线段继续与中枢区间重叠
 * 
 * 中枢的破坏：
 * - 向上中枢被向下线段突破中枢下沿
 * - 向下中枢被向上线段突破中枢上沿
 * 
 * @param duanList 线段列表
 * @returns 中枢列表
 */
export function identifyZhongShu(duanList: Duan[]): ZhongShu[] {
  const zhongshuList: ZhongShu[] = [];
  
  if (duanList.length < 3) {
    return zhongshuList;
  }

  let currentZhongShu: ZhongShu | null = null;
  let tempDuanList: Duan[] = [];

  for (let i = 0; i < duanList.length; i++) {
    const currentDuan = duanList[i];

    if (currentZhongShu === null) {
      // 尝试开始新的中枢
      if (canStartZhongShu(duanList, i)) {
        const zhongShu = createZhongShu(duanList, i);
        currentZhongShu = zhongShu;
        tempDuanList = [duanList[i], duanList[i + 1], duanList[i + 2]];
        i += 2; // 跳过已处理的两个线段
      }
    } else {
      // 检查是否可以延伸中枢
      if (canExtendZhongShu(currentZhongShu, currentDuan)) {
        // 延伸中枢
        currentZhongShu.endDate = currentDuan.endDate;
        currentZhongShu.duanList.push(currentDuan);
        tempDuanList.push(currentDuan);
        
        // 更新中枢区间
        updateZhongShuRange(currentZhongShu, tempDuanList);
      } else {
        // 检查中枢是否被破坏
        if (isZhongShuBroken(currentZhongShu, currentDuan)) {
          // 中枢被破坏，完成当前中枢
          zhongshuList.push(currentZhongShu);
          currentZhongShu = null;
          tempDuanList = [];
          i--; // 重新处理当前线段
        } else {
          // 线段在中枢区间内震荡，继续延伸
          currentZhongShu.endDate = currentDuan.endDate;
          currentZhongShu.duanList.push(currentDuan);
          tempDuanList.push(currentDuan);
        }
      }
    }
  }

  // 添加最后一个未完成的中枢
  if (currentZhongShu && tempDuanList.length >= 3) {
    zhongshuList.push(currentZhongShu);
  }

  return zhongshuList;
}

/**
 * 判断是否可以开始中枢
 * 
 * @param duanList 线段列表
 * @param index 当前索引
 * @returns 是否可以开始中枢
 */
function canStartZhongShu(duanList: Duan[], index: number): boolean {
  // 需要至少3个线段来形成中枢
  if (index + 2 >= duanList.length) {
    return false;
  }

  const duan1 = duanList[index];
  const duan2 = duanList[index + 1];
  const duan3 = duanList[index + 2];

  // 检查三个线段是否有重叠
  const range1 = { high: duan1.high, low: duan1.low };
  const range2 = { high: duan2.high, low: duan2.low };
  const range3 = { high: duan3.high, low: duan3.low };

  // 前两个线段必须重叠
  if (!hasOverlap(range1, range2)) {
    return false;
  }

  // 第三个线段必须与前两个线段的交集重叠
  const overlap12 = getOverlap(range1, range2);
  if (!hasOverlap(overlap12, range3)) {
    return false;
  }

  return true;
}

/**
 * 创建中枢
 * 
 * @param duanList 线段列表
 * @param index 当前索引
 * @returns 中枢
 */
function createZhongShu(duanList: Duan[], index: number): ZhongShu {
  const duan1 = duanList[index];
  const duan2 = duanList[index + 1];
  const duan3 = duanList[index + 2];

  // 计算中枢区间
  const overlap12 = getOverlap(
    { high: duan1.high, low: duan1.low },
    { high: duan2.high, low: duan2.low }
  );
  const overlap123 = getOverlap(overlap12, { high: duan3.high, low: duan3.low });

  const zhongShu: ZhongShu = {
    index: index,
    startDate: duan1.startDate,
    endDate: duan3.endDate,
    high: overlap123.high,
    low: overlap123.low,
    center: (overlap123.high + overlap123.low) / 2,
    direction: duan1.direction,
    duanList: [duan1, duan2, duan3]
  };

  return zhongShu;
}

/**
 * 判断是否可以延伸中枢
 * 
 * @param zhongShu 中枢
 * @param duan 线段
 * @returns 是否可以延伸
 */
function canExtendZhongShu(zhongShu: ZhongShu, duan: Duan): boolean {
  const zhongShuRange = { high: zhongShu.high, low: zhongShu.low };
  const duanRange = { high: duan.high, low: duan.low };

  return hasOverlap(zhongShuRange, duanRange);
}

/**
 * 判断中枢是否被破坏
 * 
 * @param zhongShu 中枢
 * @param duan 线段
 * @returns 是否被破坏
 */
function isZhongShuBroken(zhongShu: ZhongShu, duan: Duan): boolean {
  // 向上中枢被破坏：向下线段跌破中枢下沿
  if (zhongShu.direction === BiDirection.Up) {
    if (duan.direction === BiDirection.Down && duan.low < zhongShu.low) {
      return true;
    }
  }
  // 向下中枢被破坏：向上线段突破中枢上沿
  else if (zhongShu.direction === BiDirection.Down) {
    if (duan.direction === BiDirection.Up && duan.high > zhongShu.high) {
      return true;
    }
  }

  return false;
}

/**
 * 更新中枢区间
 * 
 * @param zhongShu 中枢
 * @param duanList 线段列表
 */
function updateZhongShuRange(zhongShu: ZhongShu, duanList: Duan[]): void {
  if (duanList.length < 3) {
    return;
  }

  // 计算所有线段的公共重叠区间
  let overlap = { high: duanList[0].high, low: duanList[0].low };

  for (let i = 1; i < duanList.length; i++) {
    overlap = getOverlap(overlap, { high: duanList[i].high, low: duanList[i].low });
  }

  zhongShu.high = overlap.high;
  zhongShu.low = overlap.low;
  zhongShu.center = (overlap.high + overlap.low) / 2;
}

/**
 * 判断两个区间是否有重叠
 * 
 * @param range1 区间1
 * @param range2 区间2
 * @returns 是否有重叠
 */
function hasOverlap(range1: { high: number; low: number }, range2: { high: number; low: number }): boolean {
  return range1.high >= range2.low && range2.high >= range1.low;
}

/**
 * 获取两个区间的交集
 * 
 * @param range1 区间1
 * @param range2 区间2
 * @returns 交集区间
 */
function getOverlap(range1: { high: number; low: number }, range2: { high: number; low: number }): { high: number; low: number } {
  return {
    high: Math.min(range1.high, range2.high),
    low: Math.max(range1.low, range2.low)
  };
}

/**
 * 获取当前中枢
 * 
 * @param zhongshuList 中枢列表
 * @returns 当前中枢
 */
export function getCurrentZhongShu(zhongshuList: ZhongShu[]): ZhongShu | null {
  if (zhongshuList.length === 0) {
    return null;
  }
  return zhongshuList[zhongshuList.length - 1];
}

/**
 * 判断价格是否在中枢区间内
 * 
 * @param price 价格
 * @param zhongShu 中枢
 * @returns 是否在中枢内
 */
export function isInZhongShu(price: number, zhongShu: ZhongShu): boolean {
  return price >= zhongShu.low && price <= zhongShu.high;
}
