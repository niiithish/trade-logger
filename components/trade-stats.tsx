import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { formatPnl } from "@/lib/format";
import type { TradeStats } from "@/lib/types";
import { cn } from "@/lib/utils";

function pnlTitleClass(totalPnl: number): string | undefined {
  if (totalPnl > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (totalPnl < 0) {
    return "text-destructive";
  }
}

export function TradeStatsCards({ stats }: { stats: TradeStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <CardDescription>Total P&L</CardDescription>
          <CardTitle className={cn(pnlTitleClass(stats.totalPnl))}>
            {formatPnl(stats.totalPnl)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">{stats.totalTrades} trades</Badge>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardDescription>Win rate</CardDescription>
          <CardTitle>{stats.winRate.toFixed(0)}%</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={stats.winRate}>
            <ProgressLabel>
              Wins / total · {stats.winners}W · {stats.losers}L
            </ProgressLabel>
          </Progress>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardDescription>Avg anxiety</CardDescription>
          <CardTitle>
            {stats.totalTrades ? stats.avgAnxiety.toFixed(1) : "—"}
            <span className="font-normal text-muted-foreground text-sm">
              {" "}
              / 10
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Heart Rate Index</Badge>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardDescription>Avg confluence</CardDescription>
          <CardTitle>
            {stats.totalTrades ? stats.avgConfluence.toFixed(1) : "—"}
            <span className="font-normal text-muted-foreground text-sm">
              {" "}
              / 5
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Avg P&L {formatPnl(stats.avgPnl)}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
