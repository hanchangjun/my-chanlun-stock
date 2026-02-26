import axios from 'axios';

// Tushare API 配置
const TUSHARE_API_URL = 'https://api.tushare.pro';

export interface TushareResponse<T> {
  request_id: string;
  code: number;
  msg: string;
  data: T;
}

export interface TushareData<T> {
  fields: string[];
  items: T[][];
}

// K线数据接口
export interface DailyData {
  ts_code: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  pre_close: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
}

export interface StockBasic {
  ts_code: string;
  symbol: string;
  name: string;
  area: string;
  industry: string;
  market: string;
  list_date: string;
}

export interface MinData {
  ts_code: string;
  trade_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  amount: number;
}

export interface WeeklyData {
  ts_code: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  pre_close: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
}

// Tushare客户端类
export class TushareClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(apiName: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await axios.post<TushareResponse<TushareData<T>>>(
        TUSHARE_API_URL,
        {
          api_name: apiName,
          token: this.token,
          params: params,
          fields: ''
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Tushare API error: ${response.data.msg}`);
      }

      const { fields, items } = response.data.data;
      
      // 将数组转换为对象
      return items.map((item) => {
        const obj: any = {};
        fields.forEach((field, index) => {
          // 将字符串数字转换为数字类型
          const value = item[index];
          if (typeof value === 'string' && !isNaN(Number(value))) {
            obj[field] = Number(value);
          } else {
            obj[field] = value;
          }
        });
        return obj as T;
      }) as T;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Tushare API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取股票基本信息
   */
  async getStockBasic(tsCode?: string): Promise<StockBasic[]> {
    return this.request<StockBasic>('stock_basic', {
      ts_code: tsCode,
      list_status: 'L'
    });
  }

  /**
   * 获取日线行情
   */
  async getDaily(tsCode: string, startDate?: string, endDate?: string): Promise<DailyData[]> {
    return this.request<DailyData>('daily', {
      ts_code: tsCode,
      start_date: startDate,
      end_date: endDate
    });
  }

  /**
   * 获取30分钟行情
   */
  async get30Min(tsCode: string, startDate?: string, endDate?: string): Promise<MinData[]> {
    return this.request<MinData>('stk_mins', {
      ts_code: tsCode,
      trade_date: startDate,
      end_date: endDate,
      freq: '30min'
    });
  }

  /**
   * 获取周线行情
   */
  async getWeekly(tsCode: string, startDate?: string, endDate?: string): Promise<WeeklyData[]> {
    return this.request<WeeklyData>('weekly', {
      ts_code: tsCode,
      start_date: startDate,
      end_date: endDate
    });
  }

  /**
   * 批量获取日线行情（用于股票池）
   */
  async getDailyBatch(tsCodes: string[], startDate?: string, endDate?: string): Promise<DailyData[]> {
    // Tushare API限制每次最多查询5000条，需要分批
    const batchSize = 500;
    const allData: DailyData[] = [];

    for (let i = 0; i < tsCodes.length; i += batchSize) {
      const batch = tsCodes.slice(i, i + batchSize);
      const data = await this.request<DailyData>('daily', {
        ts_code: batch.join(','),
        start_date: startDate,
        end_date: endDate
      });
      allData.push(...data);
    }

    return allData;
  }
}

// 创建单例
let tushareClient: TushareClient | null = null;

export function getTushareClient(): TushareClient {
  if (!tushareClient) {
    const token = process.env.TUSHARE_TOKEN;
    if (!token) {
      throw new Error('TUSHARE_TOKEN is not set in environment variables');
    }
    tushareClient = new TushareClient(token);
  }
  return tushareClient;
}
