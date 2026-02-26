import { NextRequest, NextResponse } from 'next/server';
import { getStockDataService } from '@/lib/tushare/storage';

/**
 * GET /api/tushare/data
 * 获取存储的股票数据
 * 
 * Query Parameters:
 * - tsCode: 股票代码
 * - level: 数据级别 ('30m', '1d', '1w')
 * - startDate?: 开始日期
 * - endDate?: 结束日期
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tsCode = searchParams.get('tsCode');
    const level = searchParams.get('level');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!tsCode || !level) {
      return NextResponse.json(
        { error: 'Missing required parameters: tsCode, level' },
        { status: 400 }
      );
    }

    const storageService = getStockDataService();
    let data: any[] = [];

    switch (level) {
      case '30m':
        data = await storageService.get30mData(tsCode, startDate || undefined, endDate || undefined);
        break;

      case '1d':
        data = await storageService.getDailyData(tsCode, startDate || undefined, endDate || undefined);
        break;

      case '1w':
        data = await storageService.getWeeklyData(tsCode, startDate || undefined, endDate || undefined);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid level: ${level}. Must be '30m', '1d', or '1w'` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: data,
      count: data.length
    });

  } catch (error) {
    console.error('Error getting stock data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get data' },
      { status: 500 }
    );
  }
}
