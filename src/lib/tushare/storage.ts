import { getSupabaseClient } from '@/storage/database/supabase-client';
import { DailyData, StockBasic, MinData, WeeklyData } from './client';
import {
  stocks,
  stockDaily,
  stock30m,
  stockWeekly,
  insertStockSchema,
  insertStockDailySchema,
  insertStock30mSchema,
  insertStockWeeklySchema
} from '@/storage/database/shared/schema';

/**
 * 股票数据存储服务
 */
export class StockDataService {
  private supabase = getSupabaseClient();

  /**
   * 保存股票基本信息
   */
  async saveStockBasic(data: StockBasic): Promise<void> {
    const { error } = await this.supabase
      .from('stocks')
      .upsert({
        ts_code: data.ts_code,
        name: data.name,
        symbol: data.symbol,
        industry: data.industry,
        market: data.market,
        list_date: data.list_date,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'ts_code'
      });

    if (error) {
      throw new Error(`Failed to save stock basic: ${error.message}`);
    }
  }

  /**
   * 批量保存股票基本信息
   */
  async saveStockBasicBatch dataList: Promise<void> {
    const records = dataList.map(data => ({
      ts_code: data.ts_code,
      name: data.name,
      symbol: data.symbol,
      industry: data.industry,
      market: data.market,
      list_date: data.list_date
    }));

    const { error } = await this.supabase
      .from('stocks')
      .upsert(records, {
        onConflict: 'ts_code'
      });

    if (error) {
      throw new Error(`Failed to save stock basic batch: ${error.message}`);
    }
  }

  /**
   * 保存日线数据
   */
  async saveDailyData(data: DailyData): Promise<void> {
    const { error } = await this.supabase
      .from('stock_daily')
      .upsert({
        ts_code: data.ts_code,
        trade_date: data.trade_date,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.vol,
        amount: data.amount
      }, {
        onConflict: 'ts_code,trade_date'
      });

    if (error) {
      throw new Error(`Failed to save daily data: ${error.message}`);
    }
  }

  /**
   * 批量保存日线数据
   */
  async saveDailyDataBatch(dataList: DailyData[]): Promise<void> {
    const records = dataList.map(data => ({
      ts_code: data.ts_code,
      trade_date: data.trade_date,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.vol,
      amount: data.amount
    }));

    const { error } = await this.supabase
      .from('stock_daily')
      .upsert(records, {
        onConflict: 'ts_code,trade_date'
      });

    if (error) {
      throw new Error(`Failed to save daily data batch: ${error.message}`);
    }
  }

  /**
   * 保存30分钟数据
   */
  async save30mData(data: MinData): Promise<void> {
    const { error } = await this.supabase
      .from('stock_30m')
      .upsert({
        ts_code: data.ts_code,
        trade_datetime: data.trade_time,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.vol,
        amount: data.amount
      }, {
        onConflict: 'ts_code,trade_datetime'
      });

    if (error) {
      throw new Error(`Failed to save 30m data: ${error.message}`);
    }
  }

  /**
   * 批量保存30分钟数据
   */
  async save30mDataBatch(dataList: MinData[]): Promise<void> {
    const records = dataList.map(data => ({
      ts_code: data.ts_code,
      trade_datetime: data.trade_time,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.vol,
      amount: data.amount
    }));

    const { error } = await this.supabase
      .from('stock_30m')
      .upsert(records, {
        onConflict: 'ts_code,trade_datetime'
      });

    if (error) {
      throw new Error(`Failed to save 30m data batch: ${error.message}`);
    }
  }

  /**
   * 保存周线数据
   */
  async saveWeeklyData(data: WeeklyData): Promise<void> {
    const { error } = await this.supabase
      .from('stock_weekly')
      .upsert({
        ts_code: data.ts_code,
        week_date: data.trade_date,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.vol,
        amount: data.amount
      }, {
        onConflict: 'ts_code,week_date'
      });

    if (error) {
      throw new Error(`Failed to save weekly data: ${error.message}`);
    }
  }

  /**
   * 批量保存周线数据
   */
  async saveWeeklyDataBatch(dataList: WeeklyData[]): Promise<void> {
    const records = dataList.map(data => ({
      ts_code: data.ts_code,
      week_date: data.trade_date,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.vol,
      amount: data.amount
    }));

    const { error } = await this.supabase
      .from('stock_weekly')
      .upsert(records, {
        onConflict: 'ts_code,week_date'
      });

    if (error) {
      throw new Error(`Failed to save weekly data batch: ${error.message}`);
    }
  }

  /**
   * 获取股票的日线数据
   */
  async getDailyData(tsCode: string, startDate?: string, endDate?: string): Promise<any[]> {
    let query = this.supabase
      .from('stock_daily')
      .select('*')
      .eq('ts_code', tsCode);

    if (startDate) {
      query = query.gte('trade_date', startDate);
    }

    if (endDate) {
      query = query.lte('trade_date', endDate);
    }

    query = query.order('trade_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get daily data: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 获取股票的30分钟数据
   */
  async get30mData(tsCode: string, startDate?: string, endDate?: string): Promise<any[]> {
    let query = this.supabase
      .from('stock_30m')
      .select('*')
      .eq('ts_code', tsCode);

    if (startDate) {
      query = query.gte('trade_datetime', startDate);
    }

    if (endDate) {
      query = query.lte('trade_datetime', endDate);
    }

    query = query.order('trade_datetime', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get 30m data: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 获取股票的周线数据
   */
  async getWeeklyData(tsCode: string, startDate?: string, endDate?: string): Promise<any[]> {
    let query = this.supabase
      .from('stock_weekly')
      .select('*')
      .eq('ts_code', tsCode);

    if (startDate) {
      query = query.gte('week_date', startDate);
    }

    if (endDate) {
      query = query.lte('week_date', endDate);
    }

    query = query.order('week_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get weekly data: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 获取股票基本信息
   */
  async getStockInfo(tsCode: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('stocks')
      .select('*')
      .eq('ts_code', tsCode)
      .single();

    if (error) {
      throw new Error(`Failed to get stock info: ${error.message}`);
    }

    return data;
  }

  /**
   * 获取所有活跃股票
   */
  async getAllActiveStocks(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('stocks')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to get active stocks: ${error.message}`);
    }

    return data || [];
  }
}

// 创建单例
let stockDataService: StockDataService | null = null;

export function getStockDataService(): StockDataService {
  if (!stockDataService) {
    stockDataService = new StockDataService();
  }
  return stockDataService;
}
