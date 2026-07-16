import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Widget } from "../data/Widget";
import { cn } from "@/lib/utils";

export interface DonutChartCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  data: { name: string; value: number; color?: string }[];
  centerLabel?: React.ReactNode;
  centerValue?: React.ReactNode;
  height?: number;
  actions?: React.ReactNode;
  className?: string;
}

const defaults = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
];

export function DonutChartCard({
  title, subtitle, data, centerLabel, centerValue, height = 240, actions, className,
}: DonutChartCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Widget title={title} subtitle={subtitle} actions={actions} padding="sm" className={className}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: height, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: "var(--shadow-md)",
                }}
              />
              <Pie data={data} innerRadius="62%" outerRadius="88%" paddingAngle={2} dataKey="value" stroke="none">
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color || defaults[i % defaults.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{centerLabel ?? "Total"}</span>
            <span className="text-lg font-bold font-mono tabular-nums text-fg">{centerValue ?? total}</span>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5 text-xs">
          {data.map((d, i) => {
            const pct = total ? (d.value / total) * 100 : 0;
            return (
              <li key={d.name} className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ background: d.color || defaults[i % defaults.length] }} />
                <span className="flex-1 truncate text-fg">{d.name}</span>
                <span className="font-mono tabular-nums text-fg-muted">{pct.toFixed(0)}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Widget>
  );
}
