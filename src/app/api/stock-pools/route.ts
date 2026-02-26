import { NextRequest, NextResponse } from 'next/server';
import { getStockDataService } from '@/lib/tushare/storage';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/stock-pools
 * 获取所有股票池
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { data: pools, error } = await supabase
      .from('stock_pools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch stock pools: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      pools: data || []
    });
  } catch (error) {
    console.error('Error fetching stock pools:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stock pools' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stock-pools
 * 创建股票池
 * 
 * Body:
 * {
 *   name: string;
 *   description?: string;
 *   stocks: string[];  // 股票代码列表
 *   filterConditions?: object;  // 过滤条件
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, stocks, filterConditions } = body;

    if (!name || !stocks || !Array.isArray(stocks)) {
      return NextResponse.json(
        { error: 'Missing required parameters: name, stocks' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data: pool, error } = await supabase
      .from('stock_pools')
      .insert({
        name,
        description: description || '',
        stocks,
        filter_conditions: filterConditions || {},
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create stock pool: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      pool
    });
  } catch (error) {
    console.error('Error creating stock pool:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create stock pool' },
      { status: 500 }
    );
  }
}
