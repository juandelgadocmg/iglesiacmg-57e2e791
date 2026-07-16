import * as React from "react";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Widget } from "../data/Widget";
import { cn } from "@/lib/utils";

export interface AreaChartCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  data: any[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  actions?: React.ReactNode;
  className?: string;
}

const defaultColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

export function AreaChartCard({
  title, subtitle, data, xKey, series, height = 240, actions, className,
}: AreaChartCardProps) {
  return (
    <Widget title={title} subtitle={subtitle} actions={actions} padding="sm" className={cn(className)}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color || defaultColors[i % defaultColors.length]} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={s.color || defaultColors[i % defaultColors.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
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
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color || defaultColors[i % defaultColors.length]}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  );
}
