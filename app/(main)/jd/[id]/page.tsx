import { getCurrentUser } from "@/lib/supabase/auth";
import { getJdById, deleteJd } from "@/lib/supabase/db/jds";
import { listResumesByUser } from "@/lib/supabase/db/resumes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Briefcase,
  MapPin,
  Building2,
  Mic,
} from "lucide-react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { JdStatus } from "@/types/jd";

export const dynamic = "force-dynamic";

const statusVariants: Record<
  JdStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  draft: "warning",
  parsed: "success",
  tailoring: "warning",
  completed: "default",
  archived: "secondary",
};
const statusLabels: Record<JdStatus, string> = {
  draft: "草稿",
  parsed: "已解析",
  tailoring: "定制中",
  completed: "已完成",
  archived: "已归档",
};

function SkillWeightBadge({ weight }: { weight: number }) {
  const variant =
    weight >= 5 ? "danger" : weight >= 4 ? "warning" : weight >= 3 ? "default" : "secondary";
  return <Badge variant={variant as "default"}>权重 {weight}</Badge>;
}

async function handleDelete(jdId: string, userId: string) {
  "use server";
  await deleteJd(jdId, userId);
  revalidatePath("/jd");
  redirect("/jd");
}

export default async function JdDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const jd = await getJdById(params.id, session.userId);
  if (!jd) notFound();

  const standardResumes = await listResumesByUser(session.userId, {
    type: "standard",
    status: "completed",
  });
  const deleteAction = handleDelete.bind(null, params.id, session.userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jd">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{jd.structured.title}</h1>
            <Badge variant={statusVariants[jd.status]}>
              {statusLabels[jd.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            {jd.structured.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {jd.structured.company}
              </span>
            )}
            {jd.structured.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {jd.structured.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {jd.structured.employmentType} · {jd.structured.experienceLevel}
            </span>
          </div>
        </div>
        <form action={deleteAction}>
          <Button type="submit" variant="outline" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">生成定制简历</p>
              <p className="text-sm text-muted-foreground">
                基于此 JD 和你的标准版简历，生成定制化简历
              </p>
            </div>
          </div>
          {standardResumes.length === 0 ? (
            <p className="text-sm text-orange-600">请先创建并确认标准版简历</p>
          ) : (
            <Link href={`/jd/${jd.id}/tailor`}>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                生成定制简历
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">生成模拟面试题</p>
              <p className="text-sm text-muted-foreground">
                基于此 JD 和简历，生成 8 道针对性面试题并支持答题演练
              </p>
            </div>
          </div>
          {standardResumes.length === 0 ? (
            <p className="text-sm text-orange-600">请先创建并确认标准版简历</p>
          ) : (
            <Link href={`/interview?jdId=${jd.id}&action=new`}>
              <Button>
                <Mic className="h-4 w-4 mr-2" />
                生成面试题
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {jd.structured.hardSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">硬技能要求</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jd.structured.hardSkills.map((skill, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {skill.context}
                    </span>
                  </div>
                  <SkillWeightBadge weight={skill.weight} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {jd.structured.softSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">软技能要求</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jd.structured.softSkills.map((skill, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {skill.context}
                    </span>
                  </div>
                  <SkillWeightBadge weight={skill.weight} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {jd.structured.responsibilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">岗位职责</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc list-inside text-sm">
              {jd.structured.responsibilities.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {jd.structured.requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">任职要求</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc list-inside text-sm">
              {jd.structured.requirements.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {jd.structured.niceToHave.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">加分项</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc list-inside text-sm">
              {jd.structured.niceToHave.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
