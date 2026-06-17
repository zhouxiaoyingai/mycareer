import { getCurrentUser } from "@/lib/cloudbase/auth";
import { listJdsByUser } from "@/lib/cloudbase/jds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function JdListPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const jds = await listJdsByUser(session.userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">岗位 JD</h1>
          <p className="text-muted-foreground mt-1">
            粘贴 JD，AI 解析关键词，生成定制简历
          </p>
        </div>
        <Link href="/jd/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建 JD
          </Button>
        </Link>
      </div>

      {jds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有 JD，开始添加吧</p>
            <Link href="/jd/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建 JD
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jds.map((jd) => (
            <Link key={jd._id} href={`/jd/${jd._id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {jd.structuredTitle || jd.targetRole || "未命名 JD"}
                    </CardTitle>
                    <Badge variant={statusVariants[jd.status]}>
                      {statusLabels[jd.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {jd.structuredCompany && (
                    <p className="text-sm text-muted-foreground">
                      {jd.structuredCompany}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    更新于 {new Date(jd.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
