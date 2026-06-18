"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Play,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  questionTypeLabels,
  type Interview,
  type SessionListItem,
} from "@/types/interview";

interface InterviewDetail {
  interview: Interview;
  sessions: SessionListItem[];
}

export default function InterviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/interviews/${params.id}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "加载失败");
      }
      const json = await response.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartSession = async () => {
    try {
      setStarting(true);
      const response = await fetch(`/api/interviews/${params.id}/sessions`, {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "创建会话失败");
      }
      const json = await response.json();
      router.push(`/interview/${params.id}/sessions/${json.data.session._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建会话失败");
      setStarting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定删除该面试题集？相关的答题记录也会一并删除。")) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("删除失败");
      router.push("/interview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link href="/interview">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/interview">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data?.interview.jdSnapshot.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {data?.interview.jdSnapshot.company && (
              <span className="text-sm text-muted-foreground">
                {data.interview.jdSnapshot.company}
              </span>
            )}
            <Badge variant="outline">
              {data?.interview.questions.length ?? 0} 题
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleStartSession} disabled={starting}>
            {starting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            开始答题
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-red-600 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* 题目列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">面试题目</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.interview.questions.map((q, idx) => (
            <div key={q.id} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleQuestion(q.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground shrink-0">
                    Q{idx + 1}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {questionTypeLabels[q.type]}
                  </Badge>
                  <span className="font-medium truncate">{q.question}</span>
                </div>
                {expandedQuestions.has(q.id) ? (
                  <ChevronUp className="h-4 w-4 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
                )}
              </div>
              {expandedQuestions.has(q.id) && (
                <div className="p-3 border-t space-y-3 bg-background">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      参考答案
                    </h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {q.referenceAnswer}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      答题思路
                    </h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {q.answerStrategy}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 历史会话 */}
      {data && data.sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">答题记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.sessions.map((s, idx) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      第 {data.sessions.length - idx} 次
                    </span>
                    {s.status === "completed" ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        已完成
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <Clock className="h-3 w-3 mr-1" />
                        进行中
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {s.answeredCount}/{s.totalQuestions} 题
                      {s.overallScore !== undefined && (
                        <span className="ml-2 font-medium text-foreground">
                          得分 {s.overallScore}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString("zh-CN")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/interview/${params.id}/sessions/${s._id}`)
                      }
                    >
                      {s.status === "completed" ? "查看" : "继续"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
