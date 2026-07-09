"use client";

import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  InfoIcon,
  PlusCircleIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";
import { LogTradeButton } from "@/components/log-trade-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DashboardMetrics } from "@/lib/analytics";
import { formatPnl, pnlTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";

function ChangeLine({
  value,
  inverted = false,
}: {
  value: number | null;
  inverted?: boolean;
}) {
  if (value === null) {
    return (
      <p className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
        <ArrowUpRightIcon className="size-3.5 opacity-40" />
        No prior trade day
      </p>
    );
  }

  if (Math.abs(value) < 0.005) {
    return (
      <p className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
        <ArrowUpRightIcon className="size-3.5 opacity-40" />
        No change from last trade day
      </p>
    );
  }

  const positive = inverted ? value < 0 : value > 0;
  return (
    <p
      className={cn(
        "mt-2 flex items-center gap-1 font-medium text-xs",
        positive ? "text-emerald-400" : "text-red-400"
      )}
    >
      {value > 0 ? (
        <ArrowUpRightIcon className="size-3.5" />
      ) : (
        <ArrowDownRightIcon className="size-3.5" />
      )}
      {Math.abs(value).toFixed(2)}% {value > 0 ? "Up" : "Down"} from last trade
      day
    </p>
  );
}

function Ring({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      height="48"
      viewBox="0 0 48 48"
      width="48"
    >
      <circle
        className="text-muted/40"
        cx="24"
        cy="24"
        fill="none"
        r={r}
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle
        cx="24"
        cy="24"
        fill="none"
        r={r}
        stroke={color}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth="4"
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

function MetricLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground text-xs">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger className="inline-flex border-0 bg-transparent p-0">
          <InfoIcon className="size-3.5 opacity-60" />
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

const equityConfig = {
  cumulative: {
    color: "#f5f5f5",
    label: "Cumulative P&L",
  },
  daily: {
    color: "#a3a3a3",
    label: "Daily P&L",
  },
} satisfies ChartConfig;

const radarConfig = {
  value: {
    color: "#f5f5f5",
    label: "Score",
  },
} satisfies ChartConfig;

export function DashboardOverview({ metrics }: { metrics: DashboardMetrics }) {
  const radarData = [
    { full: 100, metric: "Win Rate", value: metrics.compass.winRate },
    { full: 100, metric: "Max Drawdown", value: metrics.compass.maxDrawdown },
    { full: 100, metric: "Consistency", value: metrics.compass.consistency },
    { full: 100, metric: "Profit Factor", value: metrics.compass.profitFactor },
    {
      full: 100,
      metric: "Avg Win/Loss",
      value: metrics.compass.avgWinLoss,
    },
    { full: 100, metric: "Recovery", value: metrics.compass.recovery },
  ];

  const chartData = metrics.equityCurve.map((p) => ({
    ...p,
    label: p.date.slice(5), // MM-DD
  }));

  const empty = metrics.totalTrades === 0;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {empty ? (
        <Card className="border-dashed">
          <CardContent className="py-10">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PlusCircleIcon />
                </EmptyMedia>
                <EmptyTitle>Start your journal</EmptyTitle>
                <EmptyDescription>
                  Log MNQ/MES trades with chart, P&amp;L, and Heart Rate Index
                  metrics. Your compass and equity curve appear here.
                </EmptyDescription>
              </EmptyHeader>
              <LogTradeButton>
                <PlusCircleIcon data-icon="inline-start" />
                Log first trade
              </LogTradeButton>
            </Empty>
          </CardContent>
        </Card>
      ) : null}

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="ring-1 ring-border" size="sm">
          <CardHeader className="pb-1">
            <MetricLabel label="Net P&L" tip="Sum of all logged trade P&L" />
            <CardTitle
              className={cn(
                "text-2xl tabular-nums tracking-tight",
                metrics.totalPnl === 0
                  ? undefined
                  : pnlTextClass(metrics.totalPnl)
              )}
            >
              {formatPnl(metrics.totalPnl)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChangeLine value={metrics.pnlChangePct} />
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border" size="sm">
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <MetricLabel
                  label="Win Rate"
                  tip="Winning trades / total trades"
                />
                <CardTitle className="text-2xl tabular-nums tracking-tight">
                  {metrics.winRate.toFixed(2)}%
                </CardTitle>
              </div>
              <Ring color="#10b981" value={metrics.winRate} />
            </div>
          </CardHeader>
          <CardContent>
            <ChangeLine value={metrics.winRateChangePct} />
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border" size="sm">
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <MetricLabel
                  label="Profit Factor"
                  tip="Gross wins ÷ gross losses"
                />
                <CardTitle className="text-2xl tabular-nums tracking-tight">
                  {metrics.profitFactor.toFixed(2)}
                </CardTitle>
              </div>
              <Ring
                color={metrics.profitFactor >= 1 ? "#10b981" : "#f87171"}
                max={3}
                value={Math.min(metrics.profitFactor, 3)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ChangeLine value={metrics.profitFactorChangePct} />
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border" size="sm">
          <CardHeader className="pb-1">
            <MetricLabel
              label="Avg. Win/Loss Ratio"
              tip="Average win size ÷ average loss size"
            />
            <CardTitle className="text-2xl tabular-nums tracking-tight">
              {metrics.avgWinLossRatio.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChangeLine value={metrics.avgWinLossChangePct} />
          </CardContent>
        </Card>
      </div>

      {/* Compass + equity */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <Card className="ring-1 ring-border">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                Compass Score
                <Tooltip>
                  <TooltipTrigger className="inline-flex border-0 bg-transparent p-0">
                    <InfoIcon className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Composite of win rate, drawdown control, consistency, profit
                    factor, R-multiple, and recovery
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Process quality · Heart Rate Index aware
              </CardDescription>
            </div>
            <div className="font-medium text-2xl text-strong tabular-nums">
              {metrics.compass.score}
            </div>
          </CardHeader>
          <CardContent>
            {empty ? (
              <p className="py-16 text-center text-muted-foreground text-sm">
                Log trades to build your compass score
              </p>
            ) : (
              <ChartContainer
                className="mx-auto h-72 w-full"
                config={radarConfig}
              >
                <RadarChart
                  cx="50%"
                  cy="50%"
                  data={radarData}
                  outerRadius="70%"
                >
                  <PolarGrid stroke="#2a2a2a" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "#7f7f7f", fontSize: 14 }}
                  />
                  <Radar
                    dataKey="value"
                    fill="var(--color-value)"
                    fillOpacity={0.2}
                    stroke="var(--color-value)"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ChartContainer>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {radarData.map((d) => (
                <div
                  className="flex items-center justify-between rounded-md bg-selected px-2 py-1.5"
                  key={d.metric}
                >
                  <span className="truncate text-muted-foreground">
                    {d.metric}
                  </span>
                  <span className="font-medium text-strong tabular-nums">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border">
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                P&L Performance
                <Tooltip>
                  <TooltipTrigger className="inline-flex border-0 bg-transparent p-0">
                    <InfoIcon className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Equity curve built from daily net P&L of logged trades
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                {metrics.totalTrades} trades · {metrics.winners}W /{" "}
                {metrics.losers}L
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cumulative">
              <TabsList className="mb-4">
                <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
              </TabsList>

              <TabsContent value="cumulative">
                {chartData.length === 0 ? (
                  <p className="py-20 text-center text-muted-foreground text-sm">
                    No equity data yet
                  </p>
                ) : (
                  <ChartContainer className="h-72 w-full" config={equityConfig}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="fillCumulative"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--color-cumulative)"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-cumulative)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#2a2a2a" vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="label"
                        minTickGap={24}
                        tickLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                        tickLine={false}
                        width={64}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatPnl(Number(value ?? 0))}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.date ?? ""
                            }
                          />
                        }
                      />
                      <Area
                        dataKey="cumulative"
                        fill="url(#fillCumulative)"
                        stroke="var(--color-cumulative)"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </TabsContent>

              <TabsContent value="daily">
                {chartData.length === 0 ? (
                  <p className="py-20 text-center text-muted-foreground text-sm">
                    No daily P&L yet
                  </p>
                ) : (
                  <ChartContainer className="h-72 w-full" config={equityConfig}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="fillDaily"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--color-daily)"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-daily)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#2a2a2a" vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="label"
                        minTickGap={24}
                        tickLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                        tickLine={false}
                        width={64}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatPnl(Number(value ?? 0))}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.date ?? ""
                            }
                          />
                        }
                      />
                      <Area
                        dataKey="daily"
                        fill="url(#fillDaily)"
                        stroke="var(--color-daily)"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
