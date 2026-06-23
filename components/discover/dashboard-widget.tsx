"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardWidgetProps {
  hasReport?: boolean;
  lastReportAt?: string;
}

export function DashboardWidget({ hasReport, lastReportAt }: DashboardWidgetProps) {
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {hasReport ? "重新探索你的优势" : "发现你的职业优势"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasReport
                ? `上次探索：${lastReportAt ? new Date(lastReportAt).toLocaleDateString("zh-CN") : "未知"}`
                : "通过 7 个问题，了解你的可迁移技能和职业发展方向"}
            </p>
            <Link href="/discover">
              <span className="inline-flex items-center text-sm font-medium text-primary mt-3 hover:underline cursor-pointer">
                {hasReport ? "重新开始" : "开始探索"} →
              </span>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
