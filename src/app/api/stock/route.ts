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
  const stockProfiles: Record<string, { basePrice: number; priceRange: [number, number]; volatility: number; trend: number }> = {
    '000001': { basePrice: 15.5, priceRange: [11.0, 20.0], volatility: 0.03, trend: 0.0002 },  // 平安银行
    '000002': { basePrice: 22.8, priceRange: [17.0, 29.0], volatility: 0.032, trend: 0.0001 }, // 万科A
    '600036': { basePrice: 38.5, priceRange: [30.0, 47.0], volatility: 0.028, trend: 0.0003 }, // 招商银行
    '600519': { basePrice: 1680, priceRange: [1450, 1950], volatility: 0.025, trend: 0.0004 },    // 贵州茅台
    '000858': { basePrice: 158, priceRange: [135, 185], volatility: 0.03, trend: 0.0002 },   // 五粮液
    '601318': { basePrice: 45.5, priceRange: [35.0, 58.0], volatility: 0.03, trend: 0.0002 }     // 中国平安
  };

  const profile = stockProfiles[symbol] || { basePrice: 20, priceRange: [14, 26], volatility: 0.03, trend: 0.0002 };
  
  let currentPrice = profile.basePrice;
  const trendCycle = 60; // 趋势周期天数
  let cyclePosition = Math.random() * trendCycle;
  const [minPrice, maxPrice] = profile.priceRange;

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    // 生成价格波动
    cyclePosition += 1;
    const cyclePhase = (cyclePosition % trendCycle) / trendCycle;
    
    // 趋势因子：使用更小的幅度，避免价格偏离过大
    const trendFactor = Math.sin(cyclePhase * Math.PI * 2) * 0.02 + profile.trend;
    
    // 随机因子：控制日内波动在合理范围
    const randomFactor = (Math.random() - 0.5) * profile.volatility * 2;
    
    // 回归因子：让价格倾向于回归到基础价格（减弱回归力度）
    const regressionFactor = (profile.basePrice - currentPrice) / profile.basePrice * 0.0025;
    
    // 综合变化率
    const changePercent = trendFactor + randomFactor + regressionFactor;
    
    // 限制单日最大涨跌幅为±10%
    const clampedChangePercent = Math.max(-0.1, Math.min(0.1, changePercent));
    
    const change = currentPrice * clampedChangePercent;
    
    const open = currentPrice;
    const close = currentPrice + change;
    
    // 生成合理的最高价和最低价（增加日内波动）
    const intradayVolatility = Math.random() * 0.015 + 0.005; // 0.5%-2.0%的日内波动
    const high = Math.max(open, close) * (1 + intradayVolatility);
    const low = Math.min(open, close) * (1 - intradayVolatility);
    
    // 确保价格在合理范围内
    const finalHigh = Math.min(Math.max(high, minPrice), maxPrice);
    const finalLow = Math.min(Math.max(low, minPrice), maxPrice);
    const finalClose = Math.min(Math.max(close, minPrice), maxPrice);
    const finalOpen = Math.min(Math.max(open, minPrice), maxPrice);
    
    // 生成成交量（与波动相关）
    const baseVolume = 5000000;
    const volumeMultiplier = 1 + Math.abs(clampedChangePercent) * 15;
    const volume = Math.floor(baseVolume * volumeMultiplier * (0.7 + Math.random() * 0.6));
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(finalOpen.toFixed(2)),
      high: parseFloat(finalHigh.toFixed(2)),
      low: parseFloat(finalLow.toFixed(2)),
      close: parseFloat(finalClose.toFixed(2)),
      volume,
      amount: volume * (finalOpen + finalClose) / 2,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat((clampedChangePercent * 100).toFixed(2))
    });

    currentPrice = finalClose;
  }

  // 计算涨跌幅
  for (let i = 1; i < data.length; i++) {
    data[i].change = data[i].close - data[i - 1].close;
    data[i].changePercent = (data[i].change / data[i - 1].close) * 100;
  }

  return data;
}
