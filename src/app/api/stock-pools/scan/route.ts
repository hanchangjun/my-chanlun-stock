import { NextRequest, NextResponse } from 'next/server';
import { getStockDataService } from '@/lib/tushare/storage';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { analyzeLevel, AnalysisLevel, LevelAnalysis } from '@/lib/chanlun/multi-level';
import { KlineData } from '@/lib/chanlun/macd';

/**
 * POST /api/stock-pools/scan
 * 扫描股票池，筛选出符合条件的股票
 * 
 * Body:
 * {
 *   poolId?: number;  // 股票池ID（可选，不指定则扫描所有股票）
 *   filterConditions: {
 *     signalType?: 'buy1' | 'buy2' | 'buy3' | 'sell1' | 'sell2' | 'sell3';  // 信号类型
 *     level?: '30m' | '1d' | '1w';  // 级别
 *     hasDivergence?: boolean;  // 是否有背驰
 *     divergenceType?: 'macd' | 'volume';  // 背驰类型
 *     minStrength?: number;  // 最小强度 0-1
 *     trend?: 'up' | 'down' | 'consolidation';  // 趋势方向
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { poolId, filterConditions } = body;

    const supabase = getSupabaseClient();
    const storageService = getStockDataService();

    // 获取要扫描的股票列表
    let stockList: any[] = [];

    if (poolId) {
      // 从指定股票池获取
      const { data: pool, error: poolError } = await supabase
        .from('stock_pools')
        .select('*')
        .eq('id', poolId)
        .single();

      if (poolError) {
        throw new Error(`Failed to fetch stock pool: ${poolError.message}`);
      }

      stockList = pool.stocks || [];
    } else {
      // 获取所有活跃股票
      stockList = await storageService.getAllActiveStocks();
    }

    if (stockList.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'No stocks to scan'
      });
    }

    const results: any[] = [];
    const level = (filterConditions.level as AnalysisLevel) || '1d';

    // 扫描每只股票
    for (const stock of stockList) {
      try {
        const tsCode = typeof stock === 'string' ? stock : stock.ts_code;

        // 获取K线数据
        const klinesData = await storageService.getDailyData(tsCode);
        
        if (klinesData.length < 50) {
          continue; // 数据不足
        }

        // 转换为KlineData格式
        const klines: KlineData[] = klinesData.map(k => ({
          date: k.trade_date,
          open: Number(k.open),
          high: Number(k.high),
          low: Number(k.low),
          close: Number(k.close),
          volume: Number(k.volume),
          amount: k.amount ? Number(k.amount) : 0
        }));

        // 执行分析
        const analysis = analyzeLevel(klines, level);

        if (!analysis) {
          continue;
        }

        // 应用过滤条件
        let passFilters = true;

        // 信号类型过滤
        if (filterConditions.signalType) {
          const hasSignal = analysis.signals.some(s => s.type === filterConditions.signalType);
          if (!hasSignal) {
            passFilters = false;
          }
        }

        // 趋势过滤
        if (filterConditions.trend && analysis.trend !== filterConditions.trend) {
          passFilters = false;
        }

        // 背驰过滤
        if (filterConditions.hasDivergence) {
          const hasTopDivergence = analysis.combinedDivergence.topDivergence !== null;
          const hasBottomDivergence = analysis.combinedDivergence.bottomDivergence !== null;
          
          if (!hasTopDivergence && !hasBottomDivergence) {
            passFilters = false;
          }

          // 背驰类型过滤
          if (filterConditions.divergenceType === 'macd') {
            const hasMACDDivergence = 
              analysis.macdDivergence.topDivergence !== null ||
              analysis.macdDivergence.bottomDivergence !== null;
            if (!hasMACDDivergence) {
              passFilters = false;
            }
          } else if (filterConditions.divergenceType === 'volume') {
            const hasVolumeDivergence = 
              analysis.combinedDivergence.topDivergence?.hasVolumeDivergence ||
              analysis.combinedDivergence.bottomDivergence?.hasVolumeDivergence;
            if (!hasVolumeDivergence) {
              passFilters = false;
            }
          }
        }

        // 强度过滤
        if (filterConditions.minStrength) {
          const maxStrength = Math.max(
            analysis.combinedDivergence.topDivergence?.combinedStrength || 0,
            analysis.combinedDivergence.bottomDivergence?.combinedStrength || 0
          );
          if (maxStrength < filterConditions.minStrength) {
            passFilters = false;
          }
        }

        if (passFilters) {
          results.push({
            tsCode,
            level,
            analysis: {
              trend: analysis.trend,
              signals: analysis.signals,
              divergence: {
                top: analysis.combinedDivergence.topDivergence,
                bottom: analysis.combinedDivergence.bottomDivergence
              },
              currentPrice: analysis.currentPrice
            }
          });
        }
      } catch (error) {
        console.error(`Error analyzing stock ${stock}:`, error);
        continue;
      }
    }

    // 按信号强度排序
    results.sort((a, b) => {
      const maxStrengthA = Math.max(
        a.analysis.divergence.top?.combinedStrength || 0,
        a.analysis.divergence.bottom?.combinedStrength || 0
      );
      const maxStrengthB = Math.max(
        b.analysis.divergence.top?.combinedStrength || 0,
        b.analysis.divergence.bottom?.combinedStrength || 0
      );
      return maxStrengthB - maxStrengthA;
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      filterConditions
    });

  } catch (error) {
    console.error('Error scanning stocks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan stocks' },
      { status: 500 }
    );
  }
}
