import { Bi, Duan, BiDirection } from './types';

/**
 * 识别线段
 * 
 * 缠论线段的定义：
 * 线段由至少三个同方向的笔组成
 * 
 * 向上线段的形成：
 * - 第一笔向上，第二笔向下不创新低，第三笔向上创新高
 * 
 * 向下线段的形成：
 * - 第一笔向下，第二笔向上不创新高，第三笔向下创新低
 * 
 * 线段的破坏：
 * - 向上线段被向下笔破坏（跌破前一个低点）
 * - 向下线段被向上笔破坏（突破前一个高点）
 * 
 * @param biList 笔列表
 * @returns 线段列表
 */
export function identifyDuan(biList: Bi[]): Duan[] {
  const duanList: Duan[] = [];
  
  if (biList.length < 3) {
    return duanList;
  }

  let currentDuan: Duan | null = null;
  let tempBiList: Bi[] = [];

  for (let i = 0; i < biList.length; i++) {
    const currentBi = biList[i];

    if (currentDuan === null) {
      // 尝试开始新的线段
      if (canStartDuan(biList, i)) {
        currentDuan = {
          direction: currentBi.direction,
          startIndex: currentBi.startIndex,
          endIndex: currentBi.endIndex,
          startDate: currentBi.startDate,
          endDate: currentBi.endDate,
          startPrice: currentBi.startPrice,
          endPrice: currentBi.endPrice,
          high: currentBi.high,
          low: currentBi.low,
          biList: [currentBi]
        };
        tempBiList = [currentBi];
      }
    } else {
      // 当前正在构建线段
      if (currentBi.direction === currentDuan.direction) {
        // 同向笔，扩展线段
        currentDuan.endIndex = currentBi.endIndex;
        currentDuan.endDate = currentBi.endDate;
        currentDuan.endPrice = currentBi.endPrice;
        currentDuan.high = Math.max(currentDuan.high, currentBi.high);
        currentDuan.low = Math.min(currentDuan.low, currentBi.low);
        tempBiList.push(currentBi);
      } else {
        // 反向笔，检查是否破坏线段
        if (isDuanBroken(currentDuan, currentBi, tempBiList)) {
          // 线段被破坏，完成当前线段
          currentDuan.endIndex = tempBiList[tempBiList.length - 1].endIndex;
          currentDuan.endDate = tempBiList[tempBiList.length - 1].endDate;
          currentDuan.biList = [...tempBiList];
          duanList.push(currentDuan);
          
          // 尝试开始新线段
          currentDuan = null;
          tempBiList = [];
          i--; // 重新处理当前笔
        } else {
          // 线段未被破坏，继续构建
          tempBiList.push(currentBi);
        }
      }
    }
  }

  // 添加最后一个未完成的线段
  if (currentDuan && tempBiList.length >= 3) {
    currentDuan.endIndex = tempBiList[tempBiList.length - 1].endIndex;
    currentDuan.endDate = tempBiList[tempBiList.length - 1].endDate;
    currentDuan.biList = [...tempBiList];
    duanList.push(currentDuan);
  }

  return duanList;
}

/**
 * 判断是否可以开始线段
 * 
 * @param biList 笔列表
 * @param index 当前索引
 * @returns 是否可以开始线段
 */
function canStartDuan(biList: Bi[], index: number): boolean {
  // 需要至少3个笔来形成线段
  if (index + 2 >= biList.length) {
    return false;
  }

  const bi1 = biList[index];
  const bi2 = biList[index + 1];
  const bi3 = biList[index + 2];

  // 检查是否满足线段形成的条件
  if (bi1.direction === bi3.direction && bi1.direction !== bi2.direction) {
    // 向上线段：第一笔向上，第二笔向下不创新低，第三笔向上创新高
    if (bi1.direction === BiDirection.Up) {
      if (bi2.endPrice >= bi1.startPrice && bi3.endPrice > bi1.endPrice) {
        return true;
      }
    }
    // 向下线段：第一笔向下，第二笔向上不创新高，第三笔向下创新低
    else if (bi1.direction === BiDirection.Down) {
      if (bi2.endPrice <= bi1.startPrice && bi3.endPrice < bi1.endPrice) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 判断线段是否被破坏
 * 
 * @param duan 当前线段
 * @param currentBi 当前笔
 * @param tempBiList 临时笔列表
 * @returns 线段是否被破坏
 */
function isDuanBroken(duan: Duan, currentBi: Bi, tempBiList: Bi[]): boolean {
  // 向上线段被破坏：向下笔跌破前一个低点
  if (duan.direction === BiDirection.Up && currentBi.direction === BiDirection.Down) {
    // 找到前一个低点
    if (tempBiList.length >= 2) {
      const prevLow = tempBiList[tempBiList.length - 2].low;
      if (currentBi.endPrice < prevLow) {
        return true;
      }
    }
  }
  // 向下线段被破坏：向上笔突破前一个高点
  else if (duan.direction === BiDirection.Down && currentBi.direction === BiDirection.Up) {
    // 找到前一个高点
    if (tempBiList.length >= 2) {
      const prevHigh = tempBiList[tempBiList.length - 2].high;
      if (currentBi.endPrice > prevHigh) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 获取当前线段
 * 
 * @param duanList 线段列表
 * @returns 当前线段
 */
export function getCurrentDuan(duanList: Duan[]): Duan | null {
  if (duanList.length === 0) {
    return null;
  }
  return duanList[duanList.length - 1];
}

/**
 * 获取线段的趋势
 * 
 * @param duanList 线段列表
 * @returns 趋势方向
 */
export function getDuanTrend(duanList: Duan[]): BiDirection | null {
  if (duanList.length === 0) {
    return null;
  }

  const lastDuan = duanList[duanList.length - 1];
  return lastDuan.direction;
}
