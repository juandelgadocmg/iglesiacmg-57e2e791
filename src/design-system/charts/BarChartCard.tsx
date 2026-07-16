import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Widget } from "../data/Widget";

export interface BarChartCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  data: any[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  actions?: React.ReactNode;
  stacked?: boolean;
  className?: string;
}

const defaults = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export function BarChartCard({
  title, subtitle, data, xKey, series, height = 240, actions, stacked, className,
}: BarChartCardProps) {
  return (
    <Widget title={title} subtitle={subtitle} actions={actions} padding="sm" className={className}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border-subtle))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} stroke="hsl(var(--fg-subtle))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--fg-subtle))" fontSize={11} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ fill: "hsl(var(--surface-2))" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "var(--shadow-md)",
              }}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color || defaults[i % defaults.length]}
                stackId={stacked ? "stack" : undefined}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  );
}
