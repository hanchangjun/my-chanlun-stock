import { NextRequest, NextResponse } from 'next/server';
import { getTushareClient } from '@/lib/tushare/client';
import { getStockDataService } from '@/lib/tushare/storage';

/**
 * POST /api/tushare/fetch
 * 从Tushare获取股票数据并存储
 * 
 * Body:
 * {
 *   tsCode: string,        // 股票代码
 *   level: '30m' | '1d' | '1w',  // 数据级别
 *   startDate?: string,    // 开始日期 YYYYMMDD
 *   endDate?: string       // 结束日期 YYYYMMDD
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tsCode, level, startDate, endDate } = body;

    if (!tsCode || !level) {
      return NextResponse.json(
        { error: 'Missing required parameters: tsCode, level' },
        { status: 400 }
      );
    }

    const tushareClient = getTushareClient();
    const storageService = getStockDataService();

    // 获取股票基本信息
    const stockBasicList = await tushareClient.getStockBasic(tsCode);
    if (stockBasicList.length > 0) {
      await storageService.saveStockBasic(stockBasicList[0]);
    }

    let dataCount = 0;

    // 根据级别获取数据
    switch (level) {
      case '30m':
        const minData = await tushareClient.get30Min(tsCode, startDate, endDate);
        await storageService.save30mDataBatch(minData);
        dataCount = minData.length;
        break;

      case '1d':
        const dailyData = await tushareClient.getDaily(tsCode, startDate, endDate);
        await storageService.saveDailyDataBatch(dailyData);
        dataCount = dailyData.length;
        break;

      case '1w':
        const weeklyData = await tushareClient.getWeekly(tsCode, startDate, endDate);
        await storageService.saveWeeklyDataBatch(weeklyData);
        dataCount = weeklyData.length;
        break;

      default:
        return NextResponse.json(
          { error: `Invalid level: ${level}. Must be '30m', '1d', or '1w'` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully fetched ${dataCount} records for ${tsCode} (${level})`,
      count: dataCount
    });

  } catch (error) {
    console.error('Error fetching Tushare data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
