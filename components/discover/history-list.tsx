"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StrengthReport } from "@/types/strength";

export function HistoryList() {
  const [reports, setReports] = useState<StrengthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/strength/reports?limit=20")
      .then((r) => r.json())
      .then((res: { success: boolean; data?: { reports: StrengthReport[] }; error?: { message: string } }) => {
        if (res.success && res.data) {
          setReports(res.data.reports);
        } else {
          setError(res.error?.message || "加载失败");
        }
      })
      .catch((e: Error) => setError(e.message || "网络错误"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">加载中…</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">{error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">还没有历史报告</p>
        <Button asChild>
          <Link href="/discover">开始第一次探索</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((r) => {
        const bestFit = r.report?.realityCheck?.bestFit;
        return (
          <Card key={r._id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-base">
                <span>{new Date(r.createdAt).toLocaleString("zh-CN")}</span>
                <span
                  className={
                    "text-xs font-normal " +
                    (r.status === "completed"
                      ? "text-green-600"
                      : "text-orange-600")
                  }
                >
                  {r.status === "completed" ? "已完成" : "生成中"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bestFit ? (
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {bestFit}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">报告生成中…</p>
              )}
              <Button asChild variant="link" className="px-0 h-auto">
                <Link href={`/discover?id=${r._id}`}>
                  {r.status === "completed" ? "查看完整报告" : "查看进度"} →
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
