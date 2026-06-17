import { getCurrentUser } from "@/lib/cloudbase/auth";
import { getResumeById } from "@/lib/cloudbase/resumes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import {
  detectPlaceholders,
  countPlaceholders,
  estimatePages,
} from "@/lib/utils/markdown";
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

export default async function ResumeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login");
  }

  const resume = await getResumeById(params.id, session.userId);
  if (!resume) {
    notFound();
  }

  const hasContent = Boolean(resume.content?.zh || resume.content?.en);
  const zhPlaceholders = resume.content?.zh
    ? detectPlaceholders(resume.content.zh)
    : [];
  const enPlaceholders = resume.content?.en
    ? detectPlaceholders(resume.content.en)
    : [];
  const zhPages = resume.content?.zh ? estimatePages(resume.content.zh) : 0;
  const enPages = resume.content?.en ? estimatePages(resume.content.en) : 0;

  const reviewableProvenance = resume.provenance.filter(
    (p) => p.hallucinationRisk !== "low",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/resume">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {resume.targetRole || typeLabels[resume.type]}
            </h1>
            <Badge variant={statusVariants[resume.status]}>
              {statusLabels[resume.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {typeLabels[resume.type]} · 更新于{" "}
            {new Date(resume.updatedAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
      </div>

      {resume.type === "master" && (
        <Card>
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">生成标准版简历</p>
                <p className="text-sm text-muted-foreground">
                  基于 STAR 原则生成中英双版标准简历
                </p>
              </div>
            </div>
            <Link href={`/resume/${resume._id}/generate`}>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                生成标准版
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {hasContent ? (
        <Tabs defaultValue="zh" className="w-full">
          <TabsList>
            <TabsTrigger value="zh">
              中文版（{zhPages} 页）
              {zhPlaceholders.length > 0 && (
                <Badge variant="warning" className="ml-2">
                  {countPlaceholders(resume.content?.zh ?? "")} 处待填
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="en">
              英文版（{enPages} 页）
              {enPlaceholders.length > 0 && (
                <Badge variant="warning" className="ml-2">
                  {countPlaceholders(resume.content?.en ?? "")} 处待填
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="provenance">
              追溯信息（{resume.provenance.length}）
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zh">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">中文版简历</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-md">
                  {resume.content?.zh || "暂无中文版内容"}
                </pre>
                {zhPlaceholders.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      需要填写的占位符
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                      {zhPlaceholders.map((p, i) => (
                        <li key={i}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="en">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">English Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-md">
                  {resume.content?.en || "No English content yet"}
                </pre>
                {enPlaceholders.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      Placeholders to fill
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                      {enPlaceholders.map((p, i) => (
                        <li key={i}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="provenance">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">追溯信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resume.provenance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无追溯信息</p>
                ) : (
                  <>
                    {reviewableProvenance.length > 0 && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-center gap-2 text-sm font-medium text-orange-800">
                          <AlertTriangle className="h-4 w-4" />
                          需要审核的改写（{reviewableProvenance.length} 项）
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {resume.provenance.map((p, i) => (
                        <div
                          key={i}
                          className="border rounded-md p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {p.field}
                            </code>
                            <Badge
                              variant={
                                p.hallucinationRisk === "high"
                                  ? "danger"
                                  : p.hallucinationRisk === "medium"
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {p.hallucinationRisk}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            <span className="font-medium">原文：</span>
                            {p.fromOriginal}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            <span className="font-medium">动作：</span>
                            {p.rewriteAction}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              此简历尚未生成标准版内容
            </p>
            {resume.type === "master" && (
              <Link href={`/resume/${resume._id}/generate`}>
                <Button>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成标准版
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {resume.aiFlavorScore !== undefined && resume.aiFlavorScore > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {resume.aiFlavorScore < 6 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <p className="font-medium">
                  AI 味检测：{resume.aiFlavorScore} 次命中
                </p>
                <p className="text-sm text-muted-foreground">
                  {resume.aiFlavorScore < 6
                    ? "通过检测，AI 味较低"
                    : "命中较多，建议修改"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
