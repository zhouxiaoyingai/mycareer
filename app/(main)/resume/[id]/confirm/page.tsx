"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { GreetingCard } from "@/components/resume/greeting-card";
import type { ConfirmableItem } from "@/types/jd";
import type { Greeting } from "@/types/resume";

export default function ConfirmPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [items, setItems] = useState<ConfirmableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [greeting, setGreeting] = useState<Greeting | undefined>(undefined);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const response = await fetch(`/api/resumes/${params.id}`);
        if (!response.ok) throw new Error("加载失败");
        const data = await response.json();
        setItems(data.data.confirmableItems || []);
        setGreeting(data.data.greeting);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchResume();
  }, [params.id]);

  const handleItemStatus = (
    itemId: string,
    status: ConfirmableItem["status"],
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status,
              userModifiedText:
                status === "modified" ? customTexts[itemId] ?? "" : undefined,
            }
          : item,
      ),
    );
  };

  const handleCustomTextChange = (itemId: string, text: string) => {
    setCustomTexts((prev) => ({ ...prev, [itemId]: text }));
  };

  const handleSubmit = async () => {
    const pendingItems = items.filter((item) => item.status === "pending");
    if (pendingItems.length > 0) {
      setError(`还有 ${pendingItems.length} 项未处理`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/resumes/${params.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            status: item.status,
            userModifiedText: item.userModifiedText,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "提交失败");
      }
      router.push(`/resume/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingCount = items.filter((item) => item.status === "pending").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/resume/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">待确认项审核</h1>
          <p className="text-muted-foreground mt-1">
            AI 在生成定制简历时做了以下推断，请逐项确认
          </p>
        </div>
      </div>

      {greeting && (
        <GreetingCard
          resumeId={params.id}
          greeting={greeting}
          showRegenerate={false}
        />
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <p className="text-muted-foreground">该简历无待确认项</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              共 {items.length} 项，剩余 {pendingCount} 项待处理
            </p>
          </div>

          {items.map((item, index) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">项 {index + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.type}</Badge>
                    {item.status !== "pending" && (
                      <Badge
                        variant={
                          item.status === "accepted"
                            ? "success"
                            : item.status === "rejected"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {item.status === "accepted"
                          ? "已接受"
                          : item.status === "rejected"
                            ? "已拒绝"
                            : "已修改"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">问题</p>
                  <p className="text-sm text-muted-foreground">
                    {item.question}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium mb-1">原文</p>
                    <p className="text-sm">{item.originalText}</p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                    <p className="text-xs font-medium mb-1">AI 推断</p>
                    <p className="text-sm">{item.inferredText}</p>
                  </div>
                </div>

                {item.status === "modified" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">自定义修改</p>
                    <Textarea
                      placeholder="输入你想要的文本..."
                      value={customTexts[item.id] ?? item.userModifiedText ?? ""}
                      onChange={(e) =>
                        handleCustomTextChange(item.id, e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={item.status === "accepted" ? "default" : "outline"}
                    onClick={() => handleItemStatus(item.id, "accepted")}
                  >
                    接受推断
                  </Button>
                  <Button
                    size="sm"
                    variant={item.status === "rejected" ? "default" : "outline"}
                    onClick={() => handleItemStatus(item.id, "rejected")}
                  >
                    保留原文
                  </Button>
                  <Button
                    size="sm"
                    variant={item.status === "modified" ? "default" : "outline"}
                    onClick={() => handleItemStatus(item.id, "modified")}
                  >
                    自定义
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Link href={`/resume/${params.id}`}>
              <Button variant="outline">取消</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={submitting || pendingCount > 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                "提交确认"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
