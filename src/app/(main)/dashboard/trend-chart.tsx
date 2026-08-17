'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  day: string;
  total: number;
  correct: number;
}

export function TrendChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">近 14 天暂无答题记录</p>;
  }
  const chartData = data.map((d) => ({
    day: d.day.slice(5), // MM-DD
    答题数: d.total,
    正确数: d.correct,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="答题数" stroke="#2563EB" strokeWidth={2} />
        <Line type="monotone" dataKey="正确数" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}