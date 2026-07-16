import * as React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Widget } from "../data/Widget";

export interface LineChartCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  data: any[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  actions?: React.ReactNode;
  className?: string;
}
const defaults = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export function LineChartCard({
  title, subtitle, data, xKey, series, height = 240, actions, className,
}: LineChartCardProps) {
  return (
    <Widget title={title} subtitle={subtitle} actions={actions} padding="sm" className={className}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border-subtle))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} stroke="hsl(var(--fg-subtle))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--fg-subtle))" fontSize={11} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "var(--shadow-md)",
              }}
            />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color || defaults[i % defaults.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  );
}
