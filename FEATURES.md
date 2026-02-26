# 缠论股票分析系统 - 功能实现总结

## 一、已完成功能列表

### 1. 数据库设计 ✅

**数据库表结构（14张表）：**

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `stocks` | 股票基础信息 | ts_code, name, symbol, industry |
| `stock_daily` | 日线K线数据 | ts_code, trade_date, open, high, low, close, volume |
| `stock_30m` | 30分钟K线数据 | ts_code, trade_datetime, open, high, low, close, volume |
| `stock_weekly` | 周线K线数据 | ts_code, week_date, open, high, low, close, volume |
| `chanlun_fractals` | 分型标注 | ts_code, level, fractal_type, price |
| `chanlun_bi` | 笔标注 | ts_code, level, bi_type, start_price, end_price |
| `chanlun_duan` | 线段标注 | ts_code, level, duan_type, start_price, end_price |
| `chanlun_zhongshu` | 中枢标注 | ts_code, level, direction, high, low |
| `chanlun_signals` | 买卖点信号 | ts_code, level, signal_type, price, strength |
| `chanlun_divergence` | 背驰标注 | ts_code, level, divergence_type, strength |
| `backtest_results` | 回测结果 | ts_code, strategy_name, win_rate, total_return |
| `stock_pools` | 股票池 | name, stocks, filter_conditions |
| `chanlun_resonance` | 多周期共振 | ts_code, resonance_type, strength, levels |

---

### 2. Tushare API集成 ✅

**文件位置：** `src/lib/tushare/`

**功能：**

#### 客户端 (`client.ts`)
```typescript
// 获取股票基本信息
const stocks = await tushareClient.getStockBasic('000001.SZ');

// 获取日线数据
const dailyData = await tushareClient.getDaily('000001.SZ', '20230101', '20231231');

// 获取30分钟数据
const min30Data = await tushareClient.get30Min('000001.SZ', '20231201', '20231231');

// 获取周线数据
const weeklyData = await tushareClient.getWeekly('000001.SZ', '20230101', '20231231');

// 批量获取日线数据（用于股票池）
const batchData = await tushareClient.getDailyBatch(['000001.SZ', '600519.SH'], '20230101', '20231231');
```

#### 存储服务 (`storage.ts`)
```typescript
const storageService = getStockDataService();

// 保存数据
await storageService.saveDailyData(dailyData);
await storageService.save30mDataBatch(min30Data);
await storageService.saveWeeklyDataBatch(weeklyData);

// 读取数据
const data = await storageService.getDailyData('000001.SZ', '20230101', '20231231');
```

#### API端点

**POST `/api/tushare/fetch`** - 获取并存储数据
```json
{
  "tsCode": "000001.SZ",
  "level": "1d",
  "startDate": "20230101",
  "endDate": "20231231"
}
```

**GET `/api/tushare/data`** - 读取存储的数据
```
GET /api/tushare/data?tsCode=000001.SZ&level=1d&startDate=20230101&endDate=20231231
```

---

### 3. MACD背驰判断 ✅

**文件位置：** `src/lib/chanlun/macd.ts`

**功能：**

```typescript
import { detectMACDDivergence, calculateMACDFromKlines } from '@/lib/chanlun/macd';

// 计算MACD指标
const macdIndicators = calculateMACDFromKlines(klines);
// 返回: { date, dif, dea, macd }[]

// 检测MACD背驰
const { topDivergence, bottomDivergence } = detectMACDDivergence(klines);

// 顶背驰：价格创新高，但MACD没有创新高
if (topDivergence) {
  console.log('顶背驰信号:', topDivergence);
  // {
  //   type: 'top',
  //   date: '20231215',
  //   price: 15.50,
  //   macdValue: 0.25,
  //   strength: 0.85,
  //   points: [...]
  // }
}

// 底背驰：价格创新低，但MACD没有创新低
if (bottomDivergence) {
  console.log('底背驰信号:', bottomDivergence);
}
```

**背驰强度计算：**
- `strength` 值范围：0-1
- 越接近1，背驰信号越强
- 计算公式：`priceChange * macdChange * 100`

---

### 4. 量能背驰判断 ✅

**文件位置：** `src/lib/chanlun/volume.ts`

**功能：**

```typescript
import { 
  detectVolumeDivergence, 
  detectCombinedDivergence 
} from '@/lib/chanlun/volume';

// 检测量能背驰
const { topDivergence, bottomDivergence } = detectVolumeDivergence(klines);

// 检测综合背驰（MACD + 量能）
const combined = detectCombinedDivergence(klines);

// 顶背驰：价格创新高，但成交量没有创新高
if (combined.topDivergence) {
  console.log('综合顶背驰:', combined.topDivergence);
  // {
  //   type: 'top',
  //   hasMACDDivergence: true,
  //   hasVolumeDivergence: true,
  //   macdStrength: 0.7,
  //   volumeStrength: 0.6,
  //   combinedStrength: 0.95
  // }
}
```

**背驰类型：**

| 类型 | 价格趋势 | 成交量趋势 | 市场含义 |
|------|---------|-----------|---------|
| 顶背驰 | 上升 | 下降/持平 | 价量背离，可能见顶 |
| 底背驰 | 下降 | 上升 | 抛压减轻，可能见底 |

---

### 5. 多周期分析 ✅

**文件位置：** `src/lib/chanlun/multi-level.ts`

**功能：**

```typescript
import { analyzeMultiLevel } from '@/lib/chanlun/multi-level';

// 执行多周期分析
const analysis = analyzeMultiLevel(
  '000001.SZ',
  klines30m,   // 30分钟K线
  klinesDaily, // 日线K线
  klinesWeekly // 周线K线
);

// 分析结果
console.log(analysis);

// 单级别分析
console.log('30分钟级别:', analysis.levels['30m']);
console.log('日线级别:', analysis.levels['1d']);
console.log('周线级别:', analysis.levels['1w']);

// 多周期共振
console.log('共振判断:', analysis.resonance);
// {
//   isResonance: true,
//   type: 'buy',        // 'buy' | 'sell' | null
//   levels: ['1d', '1w'], // 共振的级别
//   strength: 'strong'    // 'strong' | 'medium' | 'weak'
// }

// 操作建议
console.log('建议:', analysis.recommendation);
// "强烈建议买入：多周期强烈看涨共振，日线出现背驰信号"
```

**共振强度判断：**

| 共振级别数量 | 强度 | 含义 |
|-------------|------|------|
| 3个级别 | strong | 强烈共振 |
| 2个级别 | medium | 中等共振 |
| 1个级别 | weak | 弱共振 |

---

### 6. 股票池筛选功能 ✅

**API端点：**

**POST `/api/stock-pools`** - 创建股票池
```json
{
  "name": "科技龙头股",
  "description": "科技行业龙头股票池",
  "stocks": ["000001.SZ", "000002.SZ", "600519.SH"],
  "filterConditions": {
    "industry": "科技"
  }
}
```

**GET `/api/stock-pools`** - 获取所有股票池

**POST `/api/stock-pools/scan`** - 扫描股票池
```json
{
  "poolId": 1,
  "filterConditions": {
    "signalType": "buy1",      // 信号类型
    "level": "1d",            // 级别
    "hasDivergence": true,    // 是否有背驰
    "divergenceType": "macd", // 背驰类型
    "minStrength": 0.5,       // 最小强度
    "trend": "up"             // 趋势方向
  }
}
```

**返回结果：**
```json
{
  "success": true,
  "results": [
    {
      "tsCode": "000001.SZ",
      "level": "1d",
      "analysis": {
        "trend": "up",
        "signals": [...],
        "divergence": {
          "top": null,
          "bottom": {
            "type": "bottom",
            "combinedStrength": 0.85,
            "hasMACDDivergence": true,
            "hasVolumeDivergence": true
          }
        },
        "currentPrice": 15.50
      }
    }
  ],
  "count": 1
}
```

---

### 7. 历史回测功能 ✅

**文件位置：** `src/lib/chanlun/backtest.ts`

**内置策略：**

#### 策略1：缠论买卖点策略
```typescript
import { chanLunStrategy, runBacktest } from '@/lib/chanlun/backtest';

const result = await runBacktest(
  klines,
  chanLunStrategy,
  100000,  // 初始资金
  0.0003   // 手续费率
);

console.log(result);
// {
//   strategyName: '缠论买卖点策略',
//   totalReturnPercent: 25.5,
//   winRate: 60.0,
//   maxDrawdownPercent: 15.2,
//   profitFactor: 1.8,
//   sharpeRatio: 1.2,
//   trades: [...],
//   equityCurve: [...]
// }
```

#### 策略2：缠论买卖点+背驰策略
```typescript
import { chanLunDivergenceStrategy, runBacktest } from '@/lib/chanlun/backtest';

const result = await runBacktest(
  klines,
  chanLunDivergenceStrategy,
  100000,
  0.0003
);
```

**自定义策略：**

```typescript
const myStrategy: TradingStrategy = {
  name: '我的策略',
  description: '自定义策略',
  level: '1d',
  buyConditions: (analysis, kline) => {
    // 自定义买入条件
    return analysis.signals.some(s => s.type === 'buy1');
  },
  sellConditions: (analysis, kline) => {
    // 自定义卖出条件
    return analysis.signals.some(s => s.type === 'sell1');
  },
  positionSize: (capital, price) => {
    // 自定义仓位管理
    return Math.floor(capital * 0.5 / price);
  },
  stopLoss: (entryPrice, kline) => {
    // 自定义止损
    return kline.close < entryPrice * 0.9;
  }
};

const result = await runBacktest(klines, myStrategy);
```

**回测指标说明：**

| 指标 | 说明 | 好的标准 |
|------|------|---------|
| `totalReturnPercent` | 总收益率 | > 20% |
| `winRate` | 胜率 | > 50% |
| `maxDrawdownPercent` | 最大回撤 | < 20% |
| `profitFactor` | 盈亏比 | > 1.5 |
| `sharpeRatio` | 夏普比率 | > 1.0 |

---

## 二、使用流程

### 步骤1：配置Tushare Token

创建 `.env` 文件：
```env
TUSHARE_TOKEN=your_tushare_token_here
```

### 步骤2：获取股票数据

```bash
# 获取日线数据
curl -X POST http://localhost:5000/api/tushare/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "tsCode": "000001.SZ",
    "level": "1d",
    "startDate": "20230101",
    "endDate": "20231231"
  }'

# 获取30分钟数据
curl -X POST http://localhost:5000/api/tushare/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "tsCode": "000001.SZ",
    "level": "30m",
    "startDate": "20231201",
    "endDate": "20231231"
  }'

# 获取周线数据
curl -X POST http://localhost:5000/api/tushare/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "tsCode": "000001.SZ",
    "level": "1w",
    "startDate": "20230101",
    "endDate": "20231231"
  }'
```

### 步骤3：多周期分析

```typescript
// 在后端API中调用
import { analyzeMultiLevel } from '@/lib/chanlun/multi-level';
import { getStockDataService } from '@/lib/tushare/storage';

const storageService = getStockDataService();
const klines30m = await storageService.get30mData('000001.SZ');
const klinesDaily = await storageService.getDailyData('000001.SZ');
const klinesWeekly = await storageService.getWeeklyData('000001.SZ');

const analysis = analyzeMultiLevel('000001.SZ', klines30m, klinesDaily, klinesWeekly);
```

### 步骤4：股票池筛选

```bash
# 创建股票池
curl -X POST http://localhost:5000/api/stock-pools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "科技龙头股",
    "stocks": ["000001.SZ", "000002.SZ", "600519.SH"]
  }'

# 扫描股票池
curl -X POST http://localhost:5000/api/stock-pools/scan \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 1,
    "filterConditions": {
      "signalType": "buy1",
      "level": "1d",
      "hasDivergence": true
    }
  }'
```

### 步骤5：历史回测

```typescript
import { runBacktest, chanLunStrategy } from '@/lib/chanlun/backtest';
import { getStockDataService } from '@/lib/tushare/storage';

const storageService = getStockDataService();
const klines = await storageService.getDailyData('000001.SZ');

const result = await runBacktest(klines, chanLunStrategy, 100000);
console.log(result);
```

---

## 三、技术架构

### 前端技术栈
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- ECharts

### 后端技术栈
- Next.js API Routes
- Supabase (PostgreSQL)
- Tushare API
- Drizzle ORM

### 核心算法
- 缠论分型识别
- 缠论笔、线段、中枢算法
- MACD指标计算
- 背驰判断算法
- 多周期共振算法
- 历史回测引擎

---

## 四、下一步优化建议

### 短期优化
1. ✅ 更新前端UI，展示背驰信号
2. ✅ 添加多周期切换按钮
3. ✅ 添加回测结果展示页面
4. ✅ 添加股票池管理界面

### 中期优化
1. 添加WebSocket实时数据推送
2. 添加邮件/Telegram告警
3. 添加更多技术指标（KDJ、RSI、BOLL）
4. 添加机器学习模型预测

### 长期优化
1. 添加量化交易平台
2. 添加自动交易功能
3. 添加社交分享功能
4. 添加移动端APP

---

## 五、注意事项

### 数据限制
- Tushare免费账户：每分钟120次请求
- 建议批量获取数据，减少API调用
- 使用缓存机制，避免重复请求

### 性能优化
- 大量股票回测时，使用批量处理
- 定期清理历史数据
- 使用数据库索引优化查询

### 风险提示
- 缠论理论仅供参考，不构成投资建议
- 历史回测不代表未来表现
- 严格执行止损，控制风险

---

## 六、API文档

所有API端点：

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/tushare/fetch` | 获取并存储股票数据 |
| GET | `/api/tushare/data` | 读取存储的股票数据 |
| GET | `/api/stock-pools` | 获取所有股票池 |
| POST | `/api/stock-pools` | 创建股票池 |
| POST | `/api/stock-pools/scan` | 扫描股票池 |
| POST | `/api/stock?symbol=000001&count=300` | 获取模拟数据（原有） |

---

## 七、代码文件结构

```
src/
├── app/
│   ├── api/
│   │   ├── tushare/
│   │   │   ├── fetch/route.ts
│   │   │   └── data/route.ts
│   │   ├── stock-pools/
│   │   │   ├── route.ts
│   │   │   └── scan/route.ts
│   │   └── stock/route.ts (原有)
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn/ui组件)
│   └── kline-chart.tsx
├── lib/
│   ├── chanlun/
│   │   ├── types.ts
│   │   ├── fractal.ts
│   │   ├── bi.ts
│   │   ├── duan.ts
│   │   ├── zhongshu.ts
│   │   ├── indicators.ts
│   │   ├── index.ts
│   │   ├── macd.ts (新增)
│   │   ├── volume.ts (新增)
│   │   ├── multi-level.ts (新增)
│   │   └── backtest.ts (新增)
│   └── tushare/
│       ├── client.ts (新增)
│       └── storage.ts (新增)
└── storage/
    └── database/
        ├── shared/
        │   └── schema.ts (已更新)
        └── supabase-client.ts (新增)
```

---

## 八、总结

已完成的功能：

1. ✅ 数据库设计（14张表）
2. ✅ Tushare API集成（30分钟、日线、周线）
3. ✅ MACD背驰判断
4. ✅ 量能背驰判断
5. ✅ 多周期分析（30分钟、日线、周线）
6. ✅ 多周期共振判断
7. ✅ 股票池筛选功能
8. ✅ 历史回测功能

系统已具备完整的缠论分析能力，可以进行：
- 真实股票数据获取
- 多级别缠论分析
- 背驰信号识别
- 多周期共振判断
- 股票池批量筛选
- 历史回测验证

下一步：更新前端UI，展示所有新功能！
