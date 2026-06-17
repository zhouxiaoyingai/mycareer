import { getCurrentUser } from "@/lib/cloudbase/auth";
import { listResumesByUser } from "@/lib/cloudbase/resumes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Upload, ClipboardPaste } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ResumeType, ResumeStatus } from "@/types/resume";

export const dynamic = "force-dynamic";

const typeLabels: Record<ResumeType, string> = {
  master: "原始简历",
  standard: "标准版",
  tailored: "定制版",
};

const statusVariants: Record<
  ResumeStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  draft: "warning",
  parsed: "secondary",
  generating: "warning",
  completed: "success",
  failed: "outline",
  confirmed: "success",
  archived: "secondary",
};

const statusLabels: Record<ResumeStatus, string> = {
  draft: "草稿",
  parsed: "已解析",
  generating: "生成中",
  completed: "已完成",
  failed: "失败",
  confirmed: "已确认",
  archived: "已归档",
};

export default async function ResumeListPage() {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login");
  }

  const resumes = await listResumesByUser(session.userId);

  const grouped = {
    master: resumes.filter((r) => r.type === "master"),
    standard: resumes.filter((r) => r.type === "standard"),
    tailored: resumes.filter((r) => r.type === "tailored"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">我的简历</h1>
          <p className="text-muted-foreground mt-1">
            管理你的原始简历、标准版和 JD 定制版
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/resume/upload">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              上传简历
            </Button>
          </Link>
          <Link href="/resume/paste">
            <Button variant="outline">
              <ClipboardPaste className="h-4 w-4 mr-2" />
              粘贴文本
            </Button>
          </Link>
          <Link href="/resume/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建简历
            </Button>
          </Link>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有简历，开始创建吧</p>
            <div className="flex gap-2">
              <Link href="/resume/upload">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  上传 PDF/Word
                </Button>
              </Link>
              <Link href="/resume/paste">
                <Button>
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  粘贴文本
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(["master", "standard", "tailored"] as ResumeType[]).map((type) => {
            const list = grouped[type];
            if (list.length === 0) return null;
            return (
              <div key={type}>
                <h2 className="text-lg font-semibold mb-3">
                  {typeLabels[type]}（{list.length}）
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((resume) => (
                    <Link key={resume._id} href={`/resume/${resume._id}`}>
                      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">
                              {resume.targetRole || typeLabels[resume.type]}
                            </CardTitle>
                            <Badge variant={statusVariants[resume.status]}>
                              {statusLabels[resume.status]}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            更新于{" "}
                            {new Date(resume.updatedAt).toLocaleDateString("zh-CN")}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
