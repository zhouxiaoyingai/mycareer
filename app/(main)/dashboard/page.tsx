import { getCurrentUser } from "@/lib/cloudbase/auth";
import { findMany, Collections } from "@/lib/cloudbase/db";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Briefcase, Mic, Send, Upload, ClipboardPaste, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getCurrentUser();
  const t = await getTranslations("dashboard");

  const [resumes, jds, interviews, applications] = await Promise.all([
    findMany(Collections.RESUMES, { userId: session!.userId }),
    findMany(Collections.JDS, { userId: session!.userId }),
    findMany(Collections.INTERVIEWS, { userId: session!.userId }),
    findMany(Collections.APPLICATIONS, { userId: session!.userId }),
  ]);

  const stats = [
    { label: t("resumeCount"), value: resumes.length, icon: FileText },
    { label: t("jdCount"), value: jds.length, icon: Briefcase },
    { label: t("interviewCount"), value: interviews.length, icon: Mic },
    { label: t("applicationCount"), value: applications.length, icon: Send },
  ];

  const quickActions = [
    { label: t("uploadResume"), href: "/resume/upload", icon: Upload },
    { label: t("pasteJD"), href: "/jd/input", icon: ClipboardPaste },
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
