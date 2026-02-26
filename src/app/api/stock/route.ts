import { NextRequest, NextResponse } from 'next/server';

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
 * 获取股票K线数据
 * 注意：当前使用模拟数据，因为免费API不稳定
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || '000001';
  const period = searchParams.get('period') || 'daily';
  const count = parseInt(searchParams.get('count') || '500', 10);

  try {
    // 尝试从真实API获取数据
    const realData = await fetchRealData(symbol, period, count);
    if (realData && realData.length > 0) {
      return NextResponse.json({
        symbol,
        period,
        count: realData.length,
        data: realData
      });
    }
  } catch (error) {
    console.log('获取真实数据失败，使用模拟数据:', error);
  }

  // 使用模拟数据
  const mockData = generateMockData(symbol, count);
  return NextResponse.json({
    symbol,
    period,
    count: mockData.length,
    data: mockData,
    isMock: true
  });
}

/**
 * 尝试从真实API获取数据
 */
async function fetchRealData(symbol: string, period: string, count: number): Promise<KLineData[] | null> {
  try {
    let formattedSymbol = symbol;
    if (symbol.match(/^\d{6}$/)) {
      const firstChar = symbol[0];
      formattedSymbol = firstChar === '6' ? `sh.${symbol}` : `sz.${symbol}`;
    }

    const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${formattedSymbol}&scale=${period}&ma=no&datalen=${count}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'Referer': 'https://finance.sina.com.cn/',
      },
    });

    if (!response.ok) return null;

    const data = await response.text();
    if (!data || data === 'null' || data.trim() === '') return null;

    const jsonMatch = data.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const klineData = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(klineData) || klineData.length === 0) return null;

    return formatKLineData(klineData);
  } catch (error) {
    return null;
  }
}

function formatKLineData(rawData: any[]): KLineData[] {
  const formatted = rawData.map((item: any) => ({
    date: item.day,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: parseFloat(item.volume),
    amount: parseFloat(item.amount) || 0,
    change: 0,
    changePercent: 0
  })).reverse();

  // 计算涨跌幅
  for (let i = 1; i < formatted.length; i++) {
    const prev = formatted[i - 1];
    const curr = formatted[i];
    curr.change = curr.close - prev.close;
    curr.changePercent = (curr.change / prev.close) * 100;
  }

  return formatted;
}

/**
 * 生成真实的模拟数据
 * 基于真实股票的价格波动模式
 */
function generateMockData(symbol: string, count: number): KLineData[] {
  const data: KLineData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - count);

  // 根据不同股票设置不同的基础价格和波动特征
  const stockProfiles: Record<string, { basePrice: number; volatility: number; trend: number }> = {
    '000001': { basePrice: 15.5, volatility: 0.03, trend: 0.001 },  // 平安银行
    '000002': { basePrice: 22.8, volatility: 0.035, trend: 0.0005 }, // 万科A
    '600036': { basePrice: 38.5, volatility: 0.025, trend: 0.0015 }, // 招商银行
    '600519': { basePrice: 1680, volatility: 0.02, trend: 0.002 },    // 贵州茅台
    '000858': { basePrice: 158, volatility: 0.028, trend: 0.001 },   // 五粮液
    '601318': { basePrice: 45.5, volatility: 0.03, trend: 0.001 }     // 中国平安
  };

  const profile = stockProfiles[symbol] || { basePrice: 20, volatility: 0.03, trend: 0.001 };
  
  let currentPrice = profile.basePrice;
  const trendCycle = 60; // 趋势周期天数
  let cyclePosition = Math.random() * trendCycle;

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    // 生成价格波动（结合趋势、周期波动和随机波动）
    cyclePosition += 1;
    const cyclePhase = (cyclePosition % trendCycle) / trendCycle;
    const trendFactor = Math.sin(cyclePhase * Math.PI * 2) * 0.5 + profile.trend;
    const randomFactor = (Math.random() - 0.5) * profile.volatility * 2;
    
    const changePercent = trendFactor + randomFactor;
    const change = currentPrice * changePercent;
    
    const open = currentPrice;
    const close = currentPrice + change;
    
    // 生成合理的最高价和最低价
    const intradayVolatility = Math.random() * 0.015 + 0.005; // 0.5%-2%的日内波动
    const high = Math.max(open, close) * (1 + intradayVolatility);
    const low = Math.min(open, close) * (1 - intradayVolatility);
    
    // 生成成交量（与波动相关）
    const baseVolume = 5000000;
    const volumeMultiplier = 1 + Math.abs(changePercent) * 10;
    const volume = Math.floor(baseVolume * volumeMultiplier * (0.5 + Math.random()));
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      amount: volume * (open + close) / 2,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat((changePercent * 100).toFixed(2))
    });

    currentPrice = close;
    
    // 确保价格为正
    if (currentPrice <= 0) {
      currentPrice = profile.basePrice;
    }
  }

  // 计算涨跌幅
  for (let i = 1; i < data.length; i++) {
    data[i].change = data[i].close - data[i - 1].close;
    data[i].changePercent = (data[i].change / data[i - 1].close) * 100;
  }

  return data;
}
