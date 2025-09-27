import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartData } from "@/types/coaching";

interface TrendChartProps {
  data: ChartData[];
  className?: string;
}

const chartConfig = {
  overall: {
    label: "Score Global",
    color: "hsl(var(--primary))",
  },
  communication: {
    label: "Communication",
    color: "hsl(var(--accent))",
  },
  technical: {
    label: "Technique",
    color: "hsl(var(--coaching-score-good))",
  },
  confidence: {
    label: "Confiance",
    color: "hsl(var(--coaching-score-average))",
  },
};

export function TrendChart({ data, className }: TrendChartProps) {
  return (
    <div className={className}>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 10]}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="overall" 
              stroke="var(--color-overall)" 
              strokeWidth={3}
              dot={{ fill: "var(--color-overall)", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "var(--color-overall)", strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="communication" 
              stroke="var(--color-communication)" 
              strokeWidth={2}
              dot={{ fill: "var(--color-communication)", strokeWidth: 2, r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="technical" 
              stroke="var(--color-technical)" 
              strokeWidth={2}
              dot={{ fill: "var(--color-technical)", strokeWidth: 2, r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="confidence" 
              stroke="var(--color-confidence)" 
              strokeWidth={2}
              dot={{ fill: "var(--color-confidence)", strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}