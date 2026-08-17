'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  type: string;
  accuracy: number;
  cnt: number;
}

export function TypeRadar({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无论型分布数据</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="type" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar name="正确率(%)" dataKey="accuracy" stroke="#2563EB" fill="#2563EB" fillOpacity={0.4} />
      </RadarChart>
    </ResponsiveContainer>
  );
}