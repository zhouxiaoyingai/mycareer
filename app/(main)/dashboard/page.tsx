import { getCurrentUser } from "@/lib/supabase/auth";
import { listResumesByUser } from "@/lib/supabase/db/resumes";
import { listJdsByUser } from "@/lib/supabase/db/jds";
import { listInterviewsByUser } from "@/lib/supabase/db/interviews";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Briefcase, Mic, Send, Upload, ClipboardPaste, Play } from "lucide-react";
import { DashboardWidget } from "@/components/discover/dashboard-widget";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const t = await getTranslations("dashboard");

  const [resumes, jds, interviews] = await Promise.all([
    listResumesByUser(session.userId),
    listJdsByUser(session.userId),
    listInterviewsByUser(session.userId),
  ]);

  const stats = [
    { label: t("resumeCount"), value: resumes.length, icon: FileText },
    { label: t("jdCount"), value: jds.length, icon: Briefcase },
    { label: t("interviewCount"), value: interviews.length, icon: Mic },
    { label: t("applicationCount"), value: 0, icon: Send },
  ];

  const quickActions = [
    { label: t("uploadResume"), href: "/resume/upload", icon: Upload },
    { label: t("pasteJD"), href: "/jd/new", icon: ClipboardPaste },
    { label: t("startInterview"), href: "/interview", icon: Play },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("welcome", { name: session!.displayName })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Strength Discovery Widget */}
      <DashboardWidget />

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-4 md:p-6 flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
