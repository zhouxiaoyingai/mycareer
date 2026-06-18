"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Plus,
  Loader2,
  Trash2,
  Briefcase,
  Trophy,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { questionTypeLabels, type InterviewListItem } from "@/types/interview";

function InterviewListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jdId = searchParams.get("jdId");
  const resumeId = searchParams.get("resumeId");
  const action = searchParams.get("action");

  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/interviews");
      if (!response.ok) throw new Error("加载失败");
      const data = await response.json();
      setInterviews(data.data.interviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 自动触发生成
  const triggerGenerate = async (targetJdId?: string, targetResumeId?: string) => {
    try {
      setGenerating(true);
      setGenerateMsg("正在生成面试题，预计 10-30 秒...");

      let response: Response;
      if (targetResumeId) {
        // 从定制简历触发
        response = await fetch(`/api/resumes/${targetResumeId}/interview`, {
          method: "POST",
        });
      } else if (targetJdId) {
        // 从 JD 触发
        response = await fetch(`/api/jds/${targetJdId}/interview`, {
          method: "POST",
        });
      } else {
        // 无参数，无法触发
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "生成失败");
      }

      const json = await response.json();
      const newId = json.data.interview._id;
      // 清除 URL 参数，避免刷新重复触发
      router.replace("/interview");
      // 跳转到题集详情页
      router.push(`/interview/${newId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
      setGenerating(false);
      setGenerateMsg(null);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  // 监听 URL 参数，自动触发生成
  useEffect(() => {
    if (action === "new" && (jdId || resumeId) && !generating) {
      triggerGenerate(jdId ?? undefined, resumeId ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, jdId, resumeId]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该面试题集？相关的答题记录也会一并删除。")) return;
    try {
      setDeletingId(id);
      const response = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除失败");
      await fetchInterviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  if (generating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mic className="h-6 w-6" />
              模拟面试
            </h1>
            <p className="text-muted-foreground mt-1">
              基于 JD 和简历生成的针对性面试题，支持多次答题演练
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="font-medium">{generateMsg || "正在生成..."}</p>
            <p className="text-sm text-muted-foreground mt-2">
              请勿关闭页面，AI 正在基于 JD 和简历生成针对性面试题
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="h-6 w-6" />
            模拟面试
          </h1>
          <p className="text-muted-foreground mt-1">
            基于 JD 和简历生成的针对性面试题，支持多次答题演练
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInterviews}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Link href="/jd">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              从 JD 生成
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Mic className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有面试题集</p>
            <Link href="/jd">
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                从 JD 生成面试题
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {interviews.map((item) => (
            <Card key={item._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {item.jdTitle}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {item.bestScore !== undefined && (
                      <Badge variant="success">
                        <Trophy className="h-3 w-3 mr-1" />
                        最高 {item.bestScore}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      演练 {item.sessionCount} 次
                    </Badge>
                    <Badge variant="secondary">
                      {item.questionCount} 题
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.questionTypes.map((t) => (
                    <Badge key={t} variant="outline">
                      {questionTypeLabels[t]}
                    </Badge>
                  ))}
                  {item.jdCompany && (
                    <span className="text-xs text-muted-foreground self-center">
                      {item.jdCompany}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/interview/${item._id}`)}
                    >
                      查看详情
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(item._id)}
                      disabled={deletingId === item._id}
                    >
                      {deletingId === item._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <InterviewListContent />
    </Suspense>
  );
}
