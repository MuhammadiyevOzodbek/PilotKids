import type { Metadata } from "next";
import { Award, BookOpen, CheckCircle2, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/db/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { RankProgress } from "@/components/dashboard/rank-progress";
import { ProgressChart } from "@/components/dashboard/progress-chart";
import { NotificationsList } from "@/components/dashboard/notifications-list";
import { EnrolledCourses } from "@/components/dashboard/enrolled-courses";

export const metadata: Metadata = { title: "Boshqaruv paneli" };

function shortName(title: string): string {
  return title.length > 14 ? title.slice(0, 12) + "…" : title;
}

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const data = await getDashboardData(sessionUser.id);

  if (!data) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">
          Ma'lumotlarni yuklab bo'lmadi. Qaytadan urinib ko'ring.
        </p>
      </div>
    );
  }

  const { user, rankInfo, enrollments, notifications, stats } = data;
  const chartData = enrollments.map((e) => ({
    name: shortName(e.course.title),
    progress: e.progressPercent,
  }));

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Salom, {user.name.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Bugungi o'quv taraqqiyotingiz bilan tanishing.
        </p>
      </header>

      {/* Statistika */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="Umumiy XP" value={user.xp} />
        <StatCard
          icon={Award}
          label="Daraja"
          value={`${rankInfo.current?.badge ?? ""} ${rankInfo.current?.name ?? "—"}`}
        />
        <StatCard icon={BookOpen} label="Kurslar" value={stats.enrolledCount} hint="ro'yxatda" />
        <StatCard
          icon={CheckCircle2}
          label="Tugatilgan"
          value={stats.completedCount}
          hint={`${stats.inProgressCount} jarayonda`}
        />
      </div>

      {/* Daraja progressi + chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RankProgress xp={user.xp} rankInfo={rankInfo} />
        <ProgressChart data={chartData} />
      </div>

      {/* Kurslar + bildirishnomalar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EnrolledCourses items={enrollments} />
        <NotificationsList items={notifications} />
      </div>
    </div>
  );
}
