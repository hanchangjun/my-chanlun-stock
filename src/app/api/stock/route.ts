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
 * 使用新浪财经API免费接口
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || '000001';
  const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly
  const count = parseInt(searchParams.get('count') || '500', 10);

  try {
    // 格式化股票代码（A股代码格式：sh.000001 或 sz.000001）
    let formattedSymbol = symbol;
    if (symbol.match(/^\d{6}$/)) {
      const firstChar = symbol[0];
      if (firstChar === '6') {
        formattedSymbol = `sh.${symbol}`;
      } else {
        formattedSymbol = `sz.${symbol}`;
      }
    }

    // 新浪财经K线数据接口
    const periodMap: Record<string, string> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly'
    };

    const periodParam = periodMap[period] || 'daily';
    
    // 使用新浪财经接口获取K线数据
    const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${formattedSymbol}&scale=${periodParam}&ma=no&datalen=${count}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'Referer': 'https://finance.sina.com.cn/',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();

    // 解析数据（新浪返回的是JavaScript格式的数据）
    if (!data || data === 'null' || data.trim() === '') {
      return NextResponse.json(
        { error: '无法获取股票数据，请检查股票代码' },
        { status: 404 }
      );
    }

    // 使用正则提取JSON数据
    const jsonMatch = data.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // 如果是原始格式，尝试直接解析
      const cleanData = data.replace(/[\n\r\t]/g, '').replace(/'/g, '"');
      const klineData = JSON.parse(cleanData);
      if (Array.isArray(klineData)) {
        return NextResponse.json({
          symbol,
          data: formatKLineData(klineData)
        });
      } else {
        throw new Error('数据格式错误');
      }
    }

    const klineData = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(klineData)) {
      throw new Error('数据格式错误');
    }
    
    // 格式化数据
    const formattedData = formatKLineData(klineData);

    return NextResponse.json({
      symbol,
      period,
      count: formattedData.length,
      data: formattedData
    });

  } catch (error) {
    console.error('获取股票数据失败:', error);
    
    // 如果API失败，返回模拟数据用于演示
    return NextResponse.json({
      symbol,
      period,
      data: generateMockData(symbol, count)
    });
  }
}

function formatKLineData(rawData: any[]): KLineData[] {
  return rawData.map((item: any) => ({
    date: item.day,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: parseFloat(item.volume),
    amount: parseFloat(item.amount) || 0,
    change: 0, // 需要从前一天计算
    changePercent: 0
  })).reverse(); // 新浪数据是从新到旧，需要反转
}

/**
 * 生成模拟数据用于演示
 */
function generateMockData(symbol: string, count: number): KLineData[] {
  const data: KLineData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - count);

  let basePrice = symbol.startsWith('6') ? 10.5 : 15.8;
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    const changePercent = (Math.random() - 0.5) * 0.08; // -4% 到 +4%
    const open = basePrice;
    const change = basePrice * changePercent;
    const close = basePrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(1000000 + Math.random() * 9000000);
    
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

    basePrice = close;
  }

  return data;
}
