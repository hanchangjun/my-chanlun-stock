import { NextRequest, NextResponse } from 'next/server';
import { analyzeChanLun, generateAnalysisReport, ChanLunAnalysis } from '@/lib/chanlun';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || '600036';
  const count = parseInt(searchParams.get('count') || '100', 10);

  try {
    // 获取股票数据
    const stockResponse = await fetch(`http://localhost:5000/api/stock?symbol=${symbol}&count=${count}`);
    const stockData = await stockResponse.json();
    
    if (!stockData.data || stockData.data.length === 0) {
      return NextResponse.json({ error: '无法获取股票数据' }, { status: 404 });
    }

    // 执行缠论分析
    const analysis: ChanLunAnalysis = analyzeChanLun(stockData.data);
    
    // 生成报告
    const report = generateAnalysisReport(analysis);

    // 详细验证
    const validation = {
      fractals: {
        total: analysis.fractals.length,
        tops: analysis.fractals.filter(f => f.type === 'top').length,
        bottoms: analysis.fractals.filter(f => f.type === 'bottom').length,
        sampleVerification: []
      },
      bi: {
        total: analysis.biList.length,
        up: analysis.biList.filter(b => b.direction === 'up').length,
        down: analysis.biList.filter(b => b.direction === 'down').length
      },
      duan: {
        total: analysis.duanList.length,
        up: analysis.duanList.filter(d => d.direction === 'up').length,
        down: analysis.duanList.filter(d => d.direction === 'down').length
      },
      zhongshu: {
        total: analysis.zhongshuList.length,
        details: analysis.zhongshuList.map((zs, idx) => ({
          index: idx + 1,
          startDate: zs.startDate,
          endDate: zs.endDate,
          range: `${zs.low.toFixed(2)} - ${zs.high.toFixed(2)}`,
          center: zs.center.toFixed(2),
          duanCount: zs.duanList.length,
          direction: zs.direction
        }))
      },
      buySellPoints: {
        total: analysis.buySellPoints.length,
        buys: analysis.buySellPoints.filter(p => p.type.includes('buy')).length,
        sells: analysis.buySellPoints.filter(p => p.type.includes('sell')).length,
        details: analysis.buySellPoints.map(p => ({
          type: p.type,
          date: p.date,
          price: p.price.toFixed(2),
          description: p.description
        }))
      }
    };

    return NextResponse.json({
      symbol,
      stockInfo: {
        dateRange: `${stockData.data[0].date} ~ ${stockData.data[stockData.data.length - 1].date}`,
        days: stockData.data.length,
        priceRange: `${Math.min(...stockData.data.map((d: any) => d.low)).toFixed(2)} - ${Math.max(...stockData.data.map((d: any) => d.high)).toFixed(2)}`,
        currentPrice: stockData.data[stockData.data.length - 1].close.toFixed(2)
      },
      analysis,
      validation,
      report
    });

  } catch (error) {
    console.error('缠论分析失败:', error);
    return NextResponse.json(
      { error: '分析失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
