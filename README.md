# 缠论股票分析系统

> 基于缠论理论的A股股票分析系统，提供专业的技术分析工具

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![React](https://img.shields.io/badge/React-19-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 项目简介

这是一个基于缠论理论开发的A股股票分析系统，能够自动识别K线中的分型、笔、线段、中枢等核心结构，并提供一二三类买卖点的识别和标注。系统采用现代化的Web技术栈构建，提供直观的可视化界面和详细的分析报告。

## 功能特性

### 核心功能
- 📊 **K线图可视化** - 专业级K线图表，支持MA5/10/20/30均线
- 🔍 **分型识别** - 自动识别顶分型和底分型
- 📈 **笔分析** - 识别向上笔和向下笔
- 📉 **线段分析** - 识别向上线段和向下线段
- 🎯 **中枢识别** - 自动计算并标注中枢区间
- 💹 **买卖点分析** - 识别一二三类买卖点及小级别买卖点
- 📝 **分析报告** - 生成详细的缠论分析报告

### 可视化标注
- ✅ 分型标注（顶分型红色、底分型绿色）
- ✅ 笔的连线（向上红色、向下青色）
- ✅ 线段标注
- ✅ 中枢区间（紫色虚线框）
- ✅ 买卖点标记（区分1、2、3类）
- ✅ 买卖点图例说明

### 交互功能
- 🔍 股票代码搜索
- ⭐ 热门股票快捷选择
- 🎛️ 可视化图层开关
- 🔄 实时数据刷新
- 📊 价格状态显示
- 📈 结构统计信息

## 技术栈

### 前端框架
- **Next.js 16** - React框架，App Router
- **React 19** - UI库
- **TypeScript 5** - 类型安全
- **Tailwind CSS 4** - 样式框架

### UI组件库
- **shadcn/ui** - 高质量React组件库
- **Radix UI** - 无样式组件库
- **Lucide React** - 图标库

### 图表库
- **ECharts 6** - 专业图表库
- **echarts-for-react** - React封装

### 数据处理
- 自研缠论算法实现
- 模拟数据生成（演示用）

## 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- pnpm 包管理器

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/your-username/chanlun-stock-analysis.git
cd chanlun-stock-analysis

# 安装依赖
pnpm install
```

### 运行开发服务器

```bash
# 启动开发服务器
pnpm dev

# 或者使用 coze CLI
coze dev
```

服务将在 `http://localhost:5000` 启动

### 构建生产版本

```bash
# 构建项目
pnpm build

# 启动生产服务器
pnpm start
```

## 使用说明

### 基本使用

1. **搜索股票**
   - 在搜索框输入6位股票代码（如：000001、600519）
   - 点击"分析"按钮或按回车键

2. **查看图表**
   - K线图显示价格走势和均线
   - 缠论结构自动标注
   - 可通过缩放和平移查看不同时间段

3. **调整显示**
   - 点击"显示设置"标签
   - 切换分型、笔、线段、中枢、买卖点的显示

4. **查看报告**
   - 右侧面板显示实时统计
   - 底部显示详细分析报告

### 热门股票

系统预置以下热门股票：
- 平安银行 (000001)
- 万科A (000002)
- 招商银行 (600036)
- 贵州茅台 (600519)
- 五粮液 (000858)
- 中国平安 (601318)

## 缠论基础知识

### 分型
由三根K线组成：
- **顶分型**：中间K线的高点最高，低点也最高
- **底分型**：中间K线的低点最低，高点也最低

### 笔
连接相邻两个相反分型的线段：
- **向上笔**：底分型 → 顶分型
- **向下笔**：顶分型 → 底分型

### 线段
由至少三个同方向的笔组成，是更高级别的结构

### 中枢
至少三个连续线段的重叠区间，是价格波动的核心区域

### 买卖点
- **一买/一卖**：趋势转折点（背驰）
- **二买/二卖**：回抽不破前高/前低
- **三买/三卖**：突破中枢后回抽确认

## 项目结构

```
chanlun-stock-analysis/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API路由
│   │   │   ├── stock/         # 股票数据接口
│   │   │   └── test-chanlun/  # 测试接口
│   │   ├── page.tsx           # 主页面
│   │   ├── layout.tsx         # 布局组件
│   │   └── globals.css        # 全局样式
│   ├── components/            # React组件
│   │   ├── ui/               # shadcn/ui组件
│   │   └── kline-chart.tsx   # K线图组件
│   └── lib/                   # 工具库
│       └── chanlun/          # 缠论算法
│           ├── types.ts       # 类型定义
│           ├── fractal.ts     # 分型识别
│           ├── bi.ts          # 笔识别
│           ├── duan.ts        # 线段识别
│           ├── zhongshu.ts    # 中枢识别
│           ├── indicators.ts  # 买卖点识别
│           └── index.ts       # 主入口
├── public/                    # 静态资源
├── .coze                      # Coze配置
├── package.json              # 依赖配置
└── README.md                 # 项目说明
```

## API接口

### 获取股票数据
```
GET /api/stock?symbol={code}&count={number}
```

**参数：**
- `symbol`: 股票代码（如：000001）
- `count`: 获取K线数量（默认：300）

**返回：**
```json
{
  "symbol": "000001",
  "period": "daily",
  "count": 300,
  "data": [...]
}
```

### 缠论分析测试
```
GET /api/test-chanlun?symbol={code}&count={number}
```

**返回：**
```json
{
  "symbol": "000001",
  "stockInfo": {...},
  "analysis": {...},
  "validation": {...},
  "report": "..."
}
```

## 配置说明

### 股票数据配置

在 `src/app/api/stock/route.ts` 中可以配置股票参数：

```typescript
const stockProfiles = {
  '000001': { 
    basePrice: 15.5,           // 基础价格
    priceRange: [11.0, 20.0],  // 价格区间
    volatility: 0.03,          // 波动率
    trend: 0.0002              // 趋势因子
  },
  // ...
};
```

### 缠论参数调整

可以在 `src/lib/chanlun/` 目录下调整缠论算法参数。

## 注意事项

### 数据说明
- 当前使用模拟数据进行演示
- 模拟数据基于真实股票的波动特征生成
- 建议未来接入真实行情数据接口

### 性能优化
- 建议获取200-300天数据以获得最佳分析效果
- 图表支持缩放和平移，可查看不同时间段
- 关闭不需要的标注可提升性能

### 免责声明
本系统仅供学习和研究使用，不构成任何投资建议。投资有风险，入市需谨慎。

## 开发路线图

- [ ] 接入真实行情数据API
- [ ] 支持多周期分析（日线、周线、月线）
- [ ] 添加更多技术指标
- [ ] 支持自定义参数配置
- [ ] 添加回测功能
- [ ] 支持多股票对比分析
- [ ] 添加移动端适配

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某个特性'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/your-username/chanlun-stock-analysis/issues)
- 发送邮件：your-email@example.com

## 致谢

- 缠论理论 - 缠中说禅
- Next.js 团队
- shadcn/ui 组件库
- ECharts 图表库

## 更新日志

### v1.0.0 (2026-02-26)
- ✨ 初始版本发布
- ✅ 实现缠论核心算法（分型、笔、线段、中枢）
- ✅ 实现买卖点识别（一二三类）
- ✅ K线图可视化
- ✅ 分析报告生成
- ✅ 响应式UI设计

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**
# chanlun-stock-analysis
