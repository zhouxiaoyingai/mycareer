"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

const MILESTONE_MESSAGES = [
  "我们找到了你的当前位置",
  "发现了让你投入的事情",
  "找到了你过往的成就模式",
  "了解了你理想的工作环境",
  "明确了什么对你最重要",
  "评估了你的转型勇气",
  "准备生成你的专属报告",
];

interface ProgressBarProps {
  currentStep: number;  // 0-indexed
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percent = ((currentStep + 1) / totalSteps) * 100;
  const milestone = MILESTONE_MESSAGES[currentStep] ?? "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{milestone}</span>
        <span className="text-muted-foreground">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}
