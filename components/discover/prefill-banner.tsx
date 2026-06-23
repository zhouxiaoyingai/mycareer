"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export interface PrefillData {
  yearsOfExperience: number;
  skills: string[];
}

interface ResumeEntry {
  startDate?: string;
  [k: string]: unknown;
}

interface ResumeStructured {
  experiences?: ResumeEntry[];
  skills?: Array<string | { name: string }>;
  [k: string]: unknown;
}

interface ResumeListItem {
  structured?: ResumeStructured;
  [k: string]: unknown;
}

interface PrefillBannerProps {
  onApply: (data: PrefillData) => void;
}

/**
 * 简历预填充提示横幅（仅在 idle 状态展示）
 * 检测用户简历，若存在则提示自动填充 yearsOfExperience 和技能
 */
export function PrefillBanner({ onApply }: PrefillBannerProps) {
  const [data, setData] = useState<PrefillData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/resumes?limit=1")
      .then((r) => r.json())
      .then((res: { success: boolean; data?: { resumes: ResumeListItem[] } }) => {
        if (cancelled || !res.success) return;
        const resume = res.data?.resumes?.[0];
        if (!resume?.structured) return;

        // 提取年限（从最早一段工作经历的开始时间推算）
        const exps = resume.structured.experiences || [];
        let years = 0;
        if (exps.length > 0) {
          const earliest = exps
            .map((e) => e.startDate)
            .filter((d): d is string => Boolean(d))
            .sort()[0];
          if (earliest) {
            const diffMs = Date.now() - new Date(earliest).getTime();
            years = Math.max(0, Math.floor(diffMs / (365 * 24 * 3600 * 1000)));
          }
        }

        // 提取技能名
        const skills = (resume.structured.skills || []).map((s) =>
          typeof s === "string" ? s : s.name
        );

        if (years > 0 || skills.length > 0) {
          setData({ yearsOfExperience: years, skills });
        }
      })
      .catch(() => {
        // 静默失败：没简历不影响主流程
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || !data) return null;

  return (
    <Card className="mb-4 bg-blue-50/50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm mb-3">
              检测到你已有简历，可自动填充
              {data.yearsOfExperience > 0 && (
                <>
                  {" "}
                  <strong>{data.yearsOfExperience} 年经验</strong>
                </>
              )}
              {data.skills.length > 0 && (
                <>
                  {" "}
                  和 <strong>{data.skills.length} 项技能</strong>
                </>
              )}
              ，探索更精准
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onApply(data)}>
                自动填充
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                稍后再说
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
