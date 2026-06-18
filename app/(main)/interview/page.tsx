"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { questionTypeLabels, type InterviewListItem } from "@/types/interview";

export default function InterviewPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchInterviews();
  }, []);

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
              生成面试题
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-red-600 text-sm">{error}</CardContent>
        </Card>
      )}

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Mic className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有面试题集</p>
            <Link href="/jd">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
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
