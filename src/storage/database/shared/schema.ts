import { pgTable, serial, timestamp, varchar, decimal, jsonb, text, integer, boolean, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// 系统健康检查表（Supabase系统表，不得删除）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 股票基础信息表
export const stocks = pgTable("stocks", {
	tsCode: varchar("ts_code", { length: 10 }).primaryKey(),
	name: varchar("name", { length: 50 }).notNull(),
	symbol: varchar("symbol", { length: 10 }).notNull(),
	industry: varchar("industry", { length: 50 }),
	market: varchar("market", { length: 10 }),
	listDate: varchar("list_date", { length: 8 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("stocks_symbol_idx").on(table.symbol),
	index("stocks_industry_idx").on(table.industry),
]);

// 日线K线数据表
export const stockDaily = pgTable("stock_daily", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	tradeDate: varchar("trade_date", { length: 8 }).notNull(),
	open: decimal("open", { precision: 12, scale: 2 }).notNull(),
	high: decimal("high", { precision: 12, scale: 2 }).notNull(),
	low: decimal("low", { precision: 12, scale: 2 }).notNull(),
	close: decimal("close", { precision: 12, scale: 2 }).notNull(),
	volume: decimal("volume", { precision: 20, scale: 2 }).notNull(),
	amount: decimal("amount", { precision: 20, scale: 2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("stock_daily_ts_code_idx").on(table.tsCode),
	index("stock_daily_trade_date_idx").on(table.tradeDate),
]);

// 30分钟K线数据表
export const stock30m = pgTable("stock_30m", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	tradeDatetime: timestamp("trade_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	open: decimal("open", { precision: 12, scale: 2 }).notNull(),
	high: decimal("high", { precision: 12, scale: 2 }).notNull(),
	low: decimal("low", { precision: 12, scale: 2 }).notNull(),
	close: decimal("close", { precision: 12, scale: 2 }).notNull(),
	volume: decimal("volume", { precision: 20, scale: 2 }).notNull(),
	amount: decimal("amount", { precision: 20, scale: 2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("stock_30m_ts_code_idx").on(table.tsCode),
	index("stock_30m_trade_datetime_idx").on(table.tradeDatetime),
]);

// 周线K线数据表
export const stockWeekly = pgTable("stock_weekly", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	weekDate: varchar("week_date", { length: 8 }).notNull(),
	open: decimal("open", { precision: 12, scale: 2 }).notNull(),
	high: decimal("high", { precision: 12, scale: 2 }).notNull(),
	low: decimal("low", { precision: 12, scale: 2 }).notNull(),
	close: decimal("close", { precision: 12, scale: 2 }).notNull(),
	volume: decimal("volume", { precision: 20, scale: 2 }).notNull(),
	amount: decimal("amount", { precision: 20, scale: 2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("stock_weekly_ts_code_idx").on(table.tsCode),
	index("stock_weekly_week_date_idx").on(table.weekDate),
]);

// 分型标注表
export const chanlunFractals = pgTable("chanlun_fractals", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	level: varchar("level", { length: 10 }).notNull(), // '30m', '1d', '1w'
	fractalType: varchar("fractal_type", { length: 10 }).notNull(), // 'top', 'bottom'
	tradeDate: varchar("trade_date", { length: 8 }).notNull(),
	price: decimal("price", { precision: 12, scale: 2 }).notNull(),
	data: jsonb("data"), // 存储分型的三根K线数据
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chanlun_fractals_ts_code_idx").on(table.tsCode),
	index("chanlun_fractals_level_idx").on(table.level),
	index("chanlun_fractals_trade_date_idx").on(table.tradeDate),
]);

// 笔标注表
export const chanlunBi = pgTable("chanlun_bi", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	level: varchar("level", { length: 10 }).notNull(),
	biType: varchar("bi_type", { length: 10 }).notNull(), // 'up', 'down'
	startDate: varchar("start_date", { length: 8 }).notNull(),
	startPrice: decimal("start_price", { precision: 12, scale: 2 }).notNull(),
	endDate: varchar("end_date", { length: 8 }).notNull(),
	endPrice: decimal("end_price", { precision: 12, scale: 2 }).notNull(),
	data: jsonb("data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chanlun_bi_ts_code_idx").on(table.tsCode),
	index("chanlun_bi_level_idx").on(table.level),
	index("chanlun_bi_start_date_idx").on(table.startDate),
]);

// 线段标注表
export const chanlunDuan = pgTable("chanlun_duan", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	level: varchar("level", { length: 10 }).notNull(),
	duanType: varchar("duan_type", { length: 10 }).notNull(), // 'up', 'down'
	startDate: varchar("start_date", { length: 8 }).notNull(),
	startPrice: decimal("start_price", { precision: 12, scale: 2 }).notNull(),
	endDate: varchar("end_date", { length: 8 }).notNull(),
	endPrice: decimal("end_price", { precision: 12, scale: 2 }).notNull(),
	data: jsonb("data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chanlun_duan_ts_code_idx").on(table.tsCode),
	index("chanlun_duan_level_idx").on(table.level),
	index("chanlun_duan_start_date_idx").on(table.startDate),
]);

// 中枢标注表
export const chanlunZhongshu = pgTable("chanlun_zhongshu", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	level: varchar("level", { length: 10 }).notNull(),
	direction: varchar("direction", { length: 10 }).notNull(), // 'up', 'down', 'consolidation'
	startDate: varchar("start_date", { length: 8 }).notNull(),
	endDate: varchar("end_date", { length: 8 }).notNull(),
	high: decimal("high", { precision: 12, scale: 2 }).notNull(),
	low: decimal("low", { precision: 12, scale: 2 }).notNull(),
	data: jsonb("data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chanlun_zhongshu_ts_code_idx").on(table.tsCode),
	index("chanlun_zhongshu_level_idx").on(table.level),
	index("chanlun_zhongshu_start_date_idx").on(table.startDate),
]);

// 买卖点信号表
export const chanlunSignals = pgTable("chanlun_signals", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	level: varchar("level", { length: 10 }).notNull(),
	signalType: varchar("signal_type", { length: 10 }).notNull(), // 'buy1', 'buy2', 'buy3', 'sell1', 'sell2', 'sell3'
	tradeDate: varchar("trade_date", { length: 8 }).notNull(),
	price: decimal("price", { precision: 12, scale: 2 }).notNull(),
	strength: integer("strength").default(0), // 信号强度 0-100
	isConfirmed: boolean("is_confirmed").default(false), // 是否确认（K线确认）
	data: jsonb("data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chanlun_signals_ts_code_idx").on(table.tsCode),
	index("chanlun_signals_level_idx").on(table.level),
	index("chanlun_signals_signal_type_idx").on(table.signalType),
	index("chanlun_signals_trade_date_idx").on(table.tradeDate),
]);

// 背驰标注表
export const chanlunDivergence = pgTable("chanlun_divergence", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	level: varchar("level", { length: 10 }).notNull(),
	divergenceType: varchar("divergence_type", { length: 10 }).notNull(), // 'macd', 'volume'
	direction: varchar("direction", { length: 10 }).notNull(), // 'top', 'bottom'
	tradeDate: varchar("trade_date", { length: 8 }).notNull(),
	price: decimal("price", { precision: 12, scale: 2 }).notNull(),
	strength: decimal("strength", { precision: 10, scale: 4 }), // 背驰强度
	macdDiff: decimal("macd_diff", { precision: 20, scale: 4 }), // MACD差值
	volumeChange: decimal("volume_change", { precision: 20, scale: 2 }), // 成交量变化
	data: jsonb("data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chanlun_divergence_ts_code_idx").on(table.tsCode),
	index("chanlun_divergence_level_idx").on(table.level),
	index("chanlun_divergence_divergence_type_idx").on(table.divergenceType),
	index("chanlun_divergence_trade_date_idx").on(table.tradeDate),
]);

// 回测结果表
export const backtestResults = pgTable("backtest_results", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	strategyName: varchar("strategy_name", { length: 50 }).notNull(), // 策略名称
	startDate: varchar("start_date", { length: 8 }).notNull(),
	endDate: varchar("end_date", { length: 8 }).notNull(),
	totalTrades: integer("total_trades").default(0),
	winningTrades: integer("winning_trades").default(0),
	losingTrades: integer("losing_trades").default(0),
	winRate: decimal("win_rate", { precision: 5, scale: 2 }), // 胜率
	totalReturn: decimal("total_return", { precision: 10, scale: 2 }), // 总收益率
	maxDrawdown: decimal("max_drawdown", { precision: 10, scale: 2 }), // 最大回撤
	profitFactor: decimal("profit_factor", { precision: 10, scale: 2 }), // 盈亏比
	data: jsonb("data"), // 详细交易记录
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("backtest_results_ts_code_idx").on(table.tsCode),
	index("backtest_results_strategy_name_idx").on(table.strategyName),
]);

// 股票池表
export const stockPools = pgTable("stock_pools", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 50 }).notNull().unique(),
	description: text("description"),
	filterConditions: jsonb("filter_conditions"), // 过滤条件
	stocks: jsonb("stocks"), // 股票列表
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("stock_pools_name_idx").on(table.name),
	index("stock_pools_is_active_idx").on(table.isActive),
]);

// 多周期共振标注表
export const chanlunResonance = pgTable("chanlun_resonance", {
	id: serial("id").primaryKey(),
	tsCode: varchar("ts_code", { length: 10 }).notNull(),
	tradeDate: varchar("trade_date", { length: 8 }).notNull(),
	resonanceType: varchar("resonance_type", { length: 10 }).notNull(), // 'buy', 'sell'
	strength: varchar("strength", { length: 10 }), // 'strong', 'medium', 'weak'
	levels: jsonb("levels"), // 共振的级别 ['30m', '1d', '1w']
	price: decimal("price", { precision: 12, scale: 2 }).notNull(),
	data: jsonb("data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chanlun_resonance_ts_code_idx").on(table.tsCode),
	index("chanlun_resonance_trade_date_idx").on(table.tradeDate),
	index("chanlun_resonance_resonance_type_idx").on(table.resonanceType),
]);

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

export const insertStockSchema = createCoercedInsertSchema(stocks).pick({
  tsCode: true,
  name: true,
  symbol: true,
  industry: true,
  market: true,
  listDate: true,
});

export const insertStockDailySchema = createCoercedInsertSchema(stockDaily).pick({
  tsCode: true,
  tradeDate: true,
  open: true,
  high: true,
  low: true,
  close: true,
  volume: true,
  amount: true,
});

export const insertStock30mSchema = createCoercedInsertSchema(stock30m).pick({
  tsCode: true,
  tradeDatetime: true,
  open: true,
  high: true,
  low: true,
  close: true,
  volume: true,
  amount: true,
});

export const insertStockWeeklySchema = createCoercedInsertSchema(stockWeekly).pick({
  tsCode: true,
  weekDate: true,
  open: true,
  high: true,
  low: true,
  close: true,
  volume: true,
  amount: true,
});

export const insertChanlunSignalSchema = createCoercedInsertSchema(chanlunSignals).pick({
  tsCode: true,
  level: true,
  signalType: true,
  tradeDate: true,
  price: true,
  strength: true,
  isConfirmed: true,
  data: true,
});

export const insertBacktestResultSchema = createCoercedInsertSchema(backtestResults).pick({
  tsCode: true,
  strategyName: true,
  startDate: true,
  endDate: true,
  totalTrades: true,
  winningTrades: true,
  losingTrades: true,
  winRate: true,
  totalReturn: true,
  maxDrawdown: true,
  profitFactor: true,
  data: true,
});

// TypeScript types
export type Stock = typeof stocks.$inferSelect;
export type StockDaily = typeof stockDaily.$inferSelect;
export type Stock30m = typeof stock30m.$inferSelect;
export type StockWeekly = typeof stockWeekly.$inferSelect;
export type ChanlunFractal = typeof chanlunFractals.$inferSelect;
export type ChanlunBi = typeof chanlunBi.$inferSelect;
export type ChanlunDuan = typeof chanlunDuan.$inferSelect;
export type ChanlunZhongshu = typeof chanlunZhongshu.$inferSelect;
export type ChanlunSignal = typeof chanlunSignals.$inferSelect;
export type ChanlunDivergence = typeof chanlunDivergence.$inferSelect;
export type BacktestResult = typeof backtestResults.$inferSelect;
export type StockPool = typeof stockPools.$inferSelect;
export type ChanlunResonance = typeof chanlunResonance.$inferSelect;
