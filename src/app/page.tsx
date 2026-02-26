'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { KLineChart } from '@/components/kline-chart';
import { KLineData, ChanLunAnalysis, analyzeChanLun, generateAnalysisReport, getPriceStatus } from '@/lib/chanlun';
import { Search, TrendingUp, TrendingDown, Activity, BarChart3, RefreshCw } from 'lucide-react';

export default function Home() {
  const [symbol, setSymbol] = useState('000001');
  const [klineData, setKlineData] = useState<KLineData[]>([]);
  const [analysis, setAnalysis] = useState<ChanLunAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState('');

  // 显示选项
  const [showFractals, setShowFractals] = useState(true);
  const [showBi, setShowBi] = useState(true);
  const [showDuan, setShowDuan] = useState(true);
  const [showZhongShu, setShowZhongShu] = useState(true);
  const [showBuySellPoints, setShowBuySellPoints] = useState(true);

  // 获取股票数据
  const fetchStockData = async (stockSymbol: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/stock?symbol=${stockSymbol}&count=300`);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
        setKlineData([]);
        setAnalysis(null);
        setReport('');
        return;
      }

      if (result.data && result.data.length > 0) {
        const data = result.data;
        setKlineData(data);
        
        // 执行缠论分析
        const analysisResult = analyzeChanLun(data);
        setAnalysis(analysisResult);
        
        // 生成分析报告
        const analysisReport = generateAnalysisReport(analysisResult);
        setReport(analysisReport);
        
        setSymbol(stockSymbol);
      } else {
        setError('未能获取到股票数据');
        setKlineData([]);
        setAnalysis(null);
        setReport('');
      }
    } catch (err) {
      setError('获取数据失败，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 搜索股票
  const handleSearch = () => {
    if (symbol.trim()) {
      fetchStockData(symbol.trim());
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchStockData(symbol);
  };

  // 初始加载
  useEffect(() => {
    // 只在组件挂载时加载一次
    fetchStockData(symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当前价格状态
  const currentPrice = klineData.length > 0 ? klineData[klineData.length - 1].close : 0;
  const prevPrice = klineData.length > 1 ? klineData[klineData.length - 2].close : currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePercent = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
  const priceStatus = analysis && currentPrice > 0 ? getPriceStatus(analysis, currentPrice) : '';

  // 常用股票列表
  const popularStocks = [
    { symbol: '000001', name: '平安银行' },
    { symbol: '000002', name: '万科A' },
    { symbol: '600036', name: '招商银行' },
    { symbol: '600519', name: '贵州茅台' },
    { symbol: '000858', name: '五粮液' },
    { symbol: '601318', name: '中国平安' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            缠论分析系统
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            基于缠论理论的A股股票分析，识别分型、笔、线段、中枢及买卖点
          </p>
        </div>

        {/* 搜索区域 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="请输入股票代码（如：000001、600519）"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} size="lg">
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    分析
                  </>
                )}
              </Button>
              <Button onClick={handleRefresh} variant="outline" size="lg" disabled={loading}>
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>

            {/* 常用股票 */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 self-center">热门：</span>
              {popularStocks.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStockData(stock.symbol)}
                  disabled={loading}
                >
                  {stock.name} ({stock.symbol})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 主内容区域 */}
        {klineData.length > 0 && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：K线图 */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        K线图与缠论标注
                      </CardTitle>
                      <CardDescription>
                        {symbol} • 当前价: <span className={`font-semibold ${priceChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {currentPrice.toFixed(2)}
                        </span>
                        <span className={`ml-2 ${priceChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="chart" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chart">图表视图</TabsTrigger>
                      <TabsTrigger value="settings">显示设置</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="chart" className="mt-4">
                      <KLineChart
                        data={klineData}
                        analysis={analysis}
                        showFractals={showFractals}
                        showBi={showBi}
                        showDuan={showDuan}
                        showZhongShu={showZhongShu}
                        showBuySellPoints={showBuySellPoints}
                      />
                    </TabsContent>
                    
                    <TabsContent value="settings" className="mt-4 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-fractals">显示分型</Label>
                          <Switch
                            id="show-fractals"
                            checked={showFractals}
                            onCheckedChange={setShowFractals}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-bi">显示笔</Label>
                          <Switch
                            id="show-bi"
                            checked={showBi}
                            onCheckedChange={setShowBi}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-duan">显示线段</Label>
                          <Switch
                            id="show-duan"
                            checked={showDuan}
                            onCheckedChange={setShowDuan}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-zhongshu">显示中枢</Label>
                          <Switch
                            id="show-zhongshu"
                            checked={showZhongShu}
                            onCheckedChange={setShowZhongShu}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-buysell">显示买卖点</Label>
                          <Switch
                            id="show-buysell"
                            checked={showBuySellPoints}
                            onCheckedChange={setShowBuySellPoints}
                          />
                        </div>
                      </div>
                      
                      {/* 买卖点图例 */}
                      {showBuySellPoints && (
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm font-semibold mb-3">买卖点图例：</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#ff4444]"></div>
                              <span>一买（趋势反转）</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#ff6666]"></div>
                              <span>二买（确认买点）</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#ff8888]"></div>
                              <span>三买（突破买点）</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#ffaaaa]"></div>
                              <span>小买（短线机会）</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#4444ff]"></div>
                              <span>一卖（趋势反转）</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#6666ff]"></div>
                              <span>二卖（确认卖点）</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#8888ff]"></div>
                              <span>三卖（跌破卖点）</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#aaaaff]"></div>
                              <span>小卖（短线风险）</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：分析报告 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 价格状态 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    当前状态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">当前价格</p>
                      <p className={`text-3xl font-bold ${priceChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {currentPrice.toFixed(2)}
                      </p>
                      <p className={`text-sm ${priceChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                      </p>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <p className="font-semibold mb-2">价格状态：</p>
                      <p>{priceStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 统计信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    结构统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {analysis.fractals.length}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">分型</p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {analysis.biList.length}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">笔</p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {analysis.duanList.length}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">线段</p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {analysis.zhongshuList.length}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">中枢</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {analysis.buySellPoints.length}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">买卖点</p>
                  </div>
                </CardContent>
              </Card>

              {/* 分析报告 */}
              <Card>
                <CardHeader>
                  <CardTitle>分析报告</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-mono bg-slate-100 dark:bg-slate-800 p-4 rounded-lg max-h-96 overflow-y-auto">
                    {report || '暂无分析报告'}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 缠论说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>缠论基础知识</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2 text-blue-600">分型</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  由三根K线组成，顶分型中间K线最高，底分型中间K线最低。分型是缠论分析的基础结构。
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-purple-600">笔</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  连接相邻两个相反分型的线段。向上笔从底分型到顶分型，向下笔从顶分型到底分型。
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-green-600">线段</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  由至少三个同方向的笔组成，是更高级别的结构。线段的完成需要反向笔的确认。
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-orange-600">中枢</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  至少三个连续线段的重叠区间构成中枢，是价格波动的核心区域，对后续走势有重要影响。
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-red-600">买卖点</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  一二三类买卖点是缠论的核心交易信号。一买/一卖是趋势转折点，二三买/卖是确认信号。
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-slate-600">背驰</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  价格创出新高/低点，但动能减弱的现象，是趋势反转的重要预警信号。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
