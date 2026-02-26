import { KlineData } from './macd';
import { analyzeLevel, AnalysisLevel } from './multi-level';

/**
 * 交易记录接口
 */
export interface TradeRecord {
  type: 'buy' | 'sell';
  date: string;
  price: number;
  signalType: string;  // buy1, buy2, buy3, sell1, sell2, sell3
  shares: number;
  amount: number;
  commission: number;
}

/**
 * 回测结果接口
 */
export interface BacktestResult {
  strategyName: string;
  tsCode: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  sharpeRatio: number;
  trades: TradeRecord[];
  equityCurve: {
    date: string;
    equity: number;
  }[];
}

/**
 * 交易策略接口
 */
export interface TradingStrategy {
  name: string;
  description: string;
  level: AnalysisLevel;
  buyConditions: (analysis: any, kline: KlineData) => boolean;
  sellConditions: (analysis: any, kline: KlineData) => boolean;
  positionSize: (capital: number, price: number) => number;  // 计算买入股数
  stopLoss?: (entryPrice: number, kline: KlineData) => boolean;  // 止损条件
}

/**
 * 默认策略：基于缠论买卖点
 */
export const chanLunStrategy: TradingStrategy = {
  name: '缠论买卖点策略',
  description: '基于缠论一类、二类、三类买卖点的简单策略',
  level: '1d',
  buyConditions: (analysis: any, kline: KlineData) => {
    // 有一类买点或二类买点
    return analysis.signals.some((s: any) => 
      (s.type === 'buy1' || s.type === 'buy2') && 
      s.date === kline.date
    );
  },
  sellConditions: (analysis: any, kline: KlineData) => {
    // 有一类卖点或二类卖点
    return analysis.signals.some((s: any) => 
      (s.type === 'sell1' || s.type === 'sell2') && 
      s.date === kline.date
    );
  },
  positionSize: (capital: number, price: number) => {
    // 全仓买入（简化）
    return Math.floor(capital / price);
  },
  stopLoss: (entryPrice: number, kline: KlineData) => {
    // 跌破10%止损
    return kline.close < entryPrice * 0.9;
  }
};

/**
 * 优化策略：缠论买卖点 + 背驰确认
 */
export const chanLunDivergenceStrategy: TradingStrategy = {
  name: '缠论买卖点+背驰策略',
  description: '基于缠论买卖点，并配合MACD背驰确认',
  level: '1d',
  buyConditions: (analysis: any, kline: KlineData) => {
    // 有一类买点或二类买点，且有底背驰
    const hasBuySignal = analysis.signals.some((s: any) => 
      (s.type === 'buy1' || s.type === 'buy2') && 
      s.date === kline.date
    );
    const hasBottomDivergence = analysis.combinedDivergence.bottomDivergence !== null;
    
    return hasBuySignal && hasBottomDivergence;
  },
  sellConditions: (analysis: any, kline: KlineData) => {
    // 有一类卖点或二类卖点，且有顶背驰
    const hasSellSignal = analysis.signals.some((s: any) => 
      (s.type === 'sell1' || s.type === 'sell2') && 
      s.date === kline.date
    );
    const hasTopDivergence = analysis.combinedDivergence.topDivergence !== null;
    
    return hasSellSignal && hasTopDivergence;
  },
  positionSize: (capital: number, price: number) => {
    // 50%仓位（更保守）
    return Math.floor(capital * 0.5 / price);
  },
  stopLoss: (entryPrice: number, kline: KlineData) => {
    // 跌破8%止损
    return kline.close < entryPrice * 0.92;
  }
};

/**
 * 执行历史回测
 */
export async function runBacktest(
  klines: KlineData[],
  strategy: TradingStrategy,
  initialCapital: number = 100000,
  commissionRate: number = 0.0003  // 万分之三手续费
): Promise<BacktestResult> {
  const trades: TradeRecord[] = [];
  const equityCurve: { date: string; equity: number }[] = [];
  
  let capital = initialCapital;
  let shares = 0;
  let inPosition = false;
  let entryPrice = 0;
  let maxEquity = initialCapital;
  let maxDrawdown = 0;
  
  // 滑动窗口分析（每100根K线分析一次）
  const windowSize = 100;
  
  for (let i = windowSize; i < klines.length; i++) {
    const kline = klines[i];
    
    // 获取窗口内的K线进行分析
    const windowKlines = klines.slice(i - windowSize, i + 1);
    const analysis = analyzeLevel(windowKlines, strategy.level);
    
    if (!analysis) {
      continue;
    }
    
    // 计算当前权益
    const currentEquity = capital + shares * kline.close;
    equityCurve.push({
      date: kline.date,
      equity: currentEquity
    });
    
    // 更新最大回撤
    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = (maxEquity - currentEquity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    
    // 止损检查
    if (inPosition && strategy.stopLoss) {
      if (strategy.stopLoss(entryPrice, kline)) {
        const commission = shares * kline.close * commissionRate;
        capital += shares * kline.close - commission;
        trades.push({
          type: 'sell',
          date: kline.date,
          price: kline.close,
          signalType: 'stop_loss',
          shares,
          amount: shares * kline.close,
          commission
        });
        shares = 0;
        inPosition = false;
        continue;
      }
    }
    
    // 买入逻辑
    if (!inPosition && strategy.buyConditions(analysis, kline)) {
      const sharesToBuy = strategy.positionSize(capital, kline.close);
      if (sharesToBuy > 0) {
        const amount = sharesToBuy * kline.close;
        const commission = amount * commissionRate;
        
        if (capital >= amount + commission) {
          capital -= amount + commission;
          shares = sharesToBuy;
          inPosition = true;
          entryPrice = kline.close;
          
          const signal = analysis.signals.find((s: any) => s.date === kline.date);
          
          trades.push({
            type: 'buy',
            date: kline.date,
            price: kline.close,
            signalType: signal?.type || 'unknown',
            shares: sharesToBuy,
            amount,
            commission
          });
        }
      }
    }
    
    // 卖出逻辑
    if (inPosition && strategy.sellConditions(analysis, kline)) {
      const commission = shares * kline.close * commissionRate;
      capital += shares * kline.close - commission;
      
      trades.push({
        type: 'sell',
        date: kline.date,
        price: kline.close,
        signalType: analysis.signals.find((s: any) => s.date === kline.date)?.type || 'unknown',
        shares,
        amount: shares * kline.close,
        commission
      });
      
      shares = 0;
      inPosition = false;
    }
  }
  
  // 如果最后还有持仓，按最后价格平仓
  if (inPosition) {
    const lastKline = klines[klines.length - 1];
    const commission = shares * lastKline.close * commissionRate;
    capital += shares * lastKline.close - commission;
    
    trades.push({
      type: 'sell',
      date: lastKline.date,
      price: lastKline.close,
      signalType: 'final_close',
      shares,
      amount: shares * lastKline.close,
      commission
    });
  }
  
  // 计算统计指标
  const finalCapital = capital;
  const totalReturn = finalCapital - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;
  
  // 计算盈亏交易
  let totalProfit = 0;
  let totalLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  
  for (let i = 0; i < trades.length - 1; i += 2) {
    if (i + 1 < trades.length) {
      const buyTrade = trades[i];
      const sellTrade = trades[i + 1];
      
      if (buyTrade.type === 'buy' && sellTrade.type === 'sell') {
        const profit = (sellTrade.price - buyTrade.price) * buyTrade.shares - 
          buyTrade.commission - sellTrade.commission;
        
        if (profit > 0) {
          totalProfit += profit;
          winningTrades++;
        } else {
          totalLoss += Math.abs(profit);
          losingTrades++;
        }
      }
    }
  }
  
  const totalTrades = trades.length / 2;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
  
  // 计算夏普比率（简化版）
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const dailyReturn = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
    returns.push(dailyReturn);
  }
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;
  
  return {
    strategyName: strategy.name,
    tsCode: klines[0].date, // 使用日期作为标识
    startDate: klines[0].date,
    endDate: klines[klines.length - 1].date,
    initialCapital,
    finalCapital,
    totalReturn,
    totalReturnPercent,
    totalTrades: Math.floor(totalTrades),
    winningTrades,
    losingTrades,
    winRate,
    maxDrawdown,
    maxDrawdownPercent: maxDrawdown * 100,
    profitFactor,
    sharpeRatio,
    trades,
    equityCurve
  };
}

/**
 * 批量回测多只股票
 */
export async function runBatchBacktest(
  stocksKlines: { tsCode: string; klines: KlineData[] }[],
  strategy: TradingStrategy,
  initialCapital: number = 100000
): Promise<BacktestResult[]> {
  const results: BacktestResult[] = [];
  
  for (const { tsCode, klines } of stocksKlines) {
    try {
      const result = await runBacktest(klines, strategy, initialCapital);
      result.tsCode = tsCode;
      results.push(result);
    } catch (error) {
      console.error(`Error backtesting ${tsCode}:`, error);
    }
  }
  
  return results;
}
