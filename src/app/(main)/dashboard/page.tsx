import { auth } from '@/lib/auth';
import { requireUser } from '@/lib/guards';
import { getDashboardStats } from '@/lib/stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from './trend-chart';
import { TypeRadar } from './type-radar';
import type { QuestionType } from '@/lib/db/schema';
import { QUESTION_TYPE_LABEL } from '@/lib/ai/prompts';

export default async function DashboardPage() {
  const user = await requireUser();
  const userId = user.id;
  const s = await getDashboardStats(userId);

  const radarData = s.byType.map((r) => ({
    type: QUESTION_TYPE_LABEL[r.type as QuestionType],
    accuracy: r.cnt ? Math.round((r.correct / r.cnt) * 100) : 0,
    cnt: r.cnt,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">学习看板</h1>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="累计答题" value={s.totalAttempts} />
        <Stat label="正确率" value={`${s.accuracy}%`} />
        <Stat label="错题数" value={s.wrongCount} />
        <Stat label="已上传资料" value={s.totalMats} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>近 14 天答题曲线</CardTitle>
            <CardDescription>每日答题数与正确率</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={s.trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>知识点雷达图</CardTitle>
            <CardDescription>按题型统计正确率</CardDescription>
          </CardHeader>
          <CardContent>
            <TypeRadar data={radarData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}