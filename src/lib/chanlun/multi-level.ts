import { KlineData } from './macd';
import { detectFractals } from './fractal';
import { calculateBi } from './bi';
import { calculateDuan } from './duan';
import { calculateZhongshu } from './zhongshu';
import { calculateBuySellPoints } from './indicators';
import { detectMACDDivergence, DivergenceSignal } from './macd';
import { detectCombinedDivergence, CombinedDivergenceSignal } from './volume';

/**
 * 分析级别
 */
export type AnalysisLevel = '30m' | '1d' | '1w';

/**
 * 单级别分析结果
 */
export interface LevelAnalysis {
  level: AnalysisLevel;
  fractals: ReturnType<typeof detectFractals>;
  biList: ReturnType<typeof calculateBi>;
  duanList: ReturnType<typeof calculateDuan>;
  zhongshuList: ReturnType<typeof calculateZhongshu>;
  signals: ReturnType<typeof calculateBuySellPoints>;
  macdDivergence: {
    topDivergence: DivergenceSignal | null;
    bottomDivergence: DivergenceSignal | null;
  };
  combinedDivergence: {
    topDivergence: CombinedDivergenceSignal | null;
    bottomDivergence: CombinedDivergenceSignal | null;
  };
  trend: 'up' | 'down' | 'consolidation';
  currentPrice: number;
}

/**
 * 多周期分析结果
 */
export interface MultiLevelAnalysis {
  tsCode: string;
  levels: {
    '30m': LevelAnalysis | null;
    '1d': LevelAnalysis | null;
    '1w': LevelAnalysis | null;
  };
  resonance: {
    isResonance: boolean;
    type: 'buy' | 'sell' | null;
    levels: AnalysisLevel[];
    strength: 'strong' | 'medium' | 'weak';
  };
  recommendation: string;
}

/**
 * 判断趋势方向
 */
function determineTrend(analysis: LevelAnalysis): 'up' | 'down' | 'consolidation' {
  // 优先使用中枢判断
  if (analysis.zhongshuList.length > 0) {
    const lastZhongshu = analysis.zhongshuList[analysis.zhongshuList.length - 1];
    if (lastZhongshu.direction === 'up') {
      return 'up';
    } else if (lastZhongshu.direction === 'down') {
      return 'down';
    }
  }

  // 使用买卖点判断
  const buySignals = analysis.signals.filter(s => s.type.startsWith('buy'));
  const sellSignals = analysis.signals.filter(s => s.type.startsWith('sell'));

  if (buySignals.length > sellSignals.length) {
    return 'up';
  } else if (sellSignals.length > buySignals.length) {
    return 'down';
  }

  // 使用线段方向
  if (analysis.duanList.length > 0) {
    const lastDuan = analysis.duanList[analysis.duanList.length - 1];
    if (lastDuan.type === 'up') {
      return 'up';
    } else if (lastDuan.type === 'down') {
      return 'down';
    }
  }

  return 'consolidation';
}

/**
 * 分析单个级别
 */
export function analyzeLevel(
  klines: KlineData[],
  level: AnalysisLevel
): LevelAnalysis | null {
  if (klines.length < 50) {
    return null; // 数据不足
  }

  try {
    // 执行缠论分析
    const fractals = detectFractals(klines);
    const biList = calculateBi(fractals);
    const duanList = calculateDuan(biList);
    const zhongshuList = calculateZhongshu(duanList);
    const signals = calculateBuySellPoints(zhongshuList, duanList, biList);
    const macdDivergence = detectMACDDivergence(klines);
    const combinedDivergence = detectCombinedDivergence(klines);

    // 判断趋势
    const trend = determineTrend({
      level,
      fractals,
      biList,
      duanList,
      zhongshuList,
      signals,
      macdDivergence,
      combinedDivergence,
      trend: 'consolidation',
      currentPrice: klines[klines.length - 1].close
    });

    return {
      level,
      fractals,
      biList,
      duanList,
      zhongshuList,
      signals,
      macdDivergence,
      combinedDivergence,
      trend,
      currentPrice: klines[klines.length - 1].close
    };
  } catch (error) {
    console.error(`Error analyzing level ${level}:`, error);
    return null;
  }
}

/**
 * 计算多周期共振
 */
export function calculateResonance(analysis: MultiLevelAnalysis) {
  const levels: AnalysisLevel[] = ['30m', '1d', '1w'];
  const buyLevels: AnalysisLevel[] = [];
  const sellLevels: AnalysisLevel[] = [];

  // 收集各级别的买入和卖出信号
  levels.forEach(level => {
    const levelAnalysis = analysis.levels[level];
    if (levelAnalysis) {
      // 检查最近的买入信号
      const recentBuySignal = levelAnalysis.signals
        .filter(s => s.type.startsWith('buy'))
        .sort((a, b) => b.index - a.index)[0];

      // 检查最近的卖出信号
      const recentSellSignal = levelAnalysis.signals
        .filter(s => s.type.startsWith('sell'))
        .sort((a, b) => b.index - a.index)[0];

      // 判断哪个信号更近
      if (recentBuySignal && recentSellSignal) {
        if (recentBuySignal.index > recentSellSignal.index) {
          buyLevels.push(level);
        } else {
          sellLevels.push(level);
        }
      } else if (recentBuySignal) {
        buyLevels.push(level);
      } else if (recentSellSignal) {
        sellLevels.push(level);
      } else {
        // 没有信号，使用趋势判断
        if (levelAnalysis.trend === 'up') {
          buyLevels.push(level);
        } else if (levelAnalysis.trend === 'down') {
          sellLevels.push(level);
        }
      }
    }
  });

  // 判断共振类型和强度
  const isResonance = buyLevels.length >= 2 || sellLevels.length >= 2;
  const resonanceType: 'buy' | 'sell' | null = 
    buyLevels.length >= sellLevels.length ? 'buy' : 'sell';
  const resonanceLevels = buyLevels.length >= sellLevels.length ? buyLevels : sellLevels;
  const strength: 'strong' | 'medium' | 'weak' =
    resonanceLevels.length >= 3 ? 'strong' :
    resonanceLevels.length === 2 ? 'medium' : 'weak';

  return {
    isResonance,
    type: isResonance ? resonanceType : null,
    levels: resonanceLevels,
    strength
  };
}

/**
 * 生成操作建议
 */
export function generateRecommendation(analysis: MultiLevelAnalysis): string {
  const { resonance, levels } = analysis;
  const dailyAnalysis = levels['1d'];
  const weeklyAnalysis = levels['1w'];

  if (!resonance.isResonance) {
    return '观望：各级别信号不明确，建议等待多周期共振信号';
  }

  if (resonance.type === 'buy' && resonance.strength === 'strong') {
    let recommendation = '强烈建议买入：多周期强烈看涨共振';
    
    // 检查背驰
    if (dailyAnalysis?.combinedDivergence.bottomDivergence) {
      recommendation += '，日线出现背驰信号，买入机会增强';
    }
    if (weeklyAnalysis?.combinedDivergence.bottomDivergence) {
      recommendation += '，周线出现背驰信号，中期买入机会';
    }

    return recommendation;
  }

  if (resonance.type === 'buy' && resonance.strength === 'medium') {
    let recommendation = '建议买入：多周期看涨共振';
    
    // 检查背驰
    if (dailyAnalysis?.combinedDivergence.bottomDivergence) {
      recommendation += '，日线出现背驰信号';
    }

    return recommendation;
  }

  if (resonance.type === 'sell' && resonance.strength === 'strong') {
    let recommendation = '强烈建议卖出：多周期强烈看跌共振';
    
    // 检查背驰
    if (dailyAnalysis?.combinedDivergence.topDivergence) {
      recommendation += '，日线出现背驰信号，卖出风险增加';
    }
    if (weeklyAnalysis?.combinedDivergence.topDivergence) {
      recommendation += '，周线出现背驰信号，中期风险';
    }

    return recommendation;
  }

  if (resonance.type === 'sell' && resonance.strength === 'medium') {
    let recommendation = '建议卖出：多周期看跌共振';
    
    // 检查背驰
    if (dailyAnalysis?.combinedDivergence.topDivergence) {
      recommendation += '，日线出现背驰信号';
    }

    return recommendation;
  }

  return '观望：信号不够强烈，建议等待';
}

/**
 * 执行多周期分析
 */
export function analyzeMultiLevel(
  tsCode: string,
  klines30m: KlineData[],
  klinesDaily: KlineData[],
  klinesWeekly: KlineData[]
): MultiLevelAnalysis {
  const analysis: MultiLevelAnalysis = {
    tsCode,
    levels: {
      '30m': analyzeLevel(klines30m, '30m'),
      '1d': analyzeLevel(klinesDaily, '1d'),
      '1w': analyzeLevel(klinesWeekly, '1w')
    },
    resonance: {
      isResonance: false,
      type: null,
      levels: [],
      strength: 'weak'
    },
    recommendation: ''
  };

  // 计算共振
  analysis.resonance = calculateResonance(analysis);

  // 生成建议
  analysis.recommendation = generateRecommendation(analysis);

  return analysis;
}
