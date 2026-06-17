"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

interface GeneratePageProps {
  params: { id: string };
}

export default function ResumeGeneratePage({ params }: GeneratePageProps) {
  const router = useRouter();
  const [templateStyle, setTemplateStyle] = useState<
    "star" | "project" | "skill" | "mixed"
  >("star");
  const [length, setLength] = useState<"1page" | "2page" | "auto">("auto");
  const [language, setLanguage] = useState<"zh" | "en" | "both">("both");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/resumes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterResumeId: params.id,
          templateStyle,
          length,
          language,
          targetRole: targetRole || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "生成失败");
      }

      const data = await response.json();
      router.push(`/resume/${data.data.resumeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">生成标准版简历</h1>
        <p className="text-muted-foreground mt-1">
          基于 STAR 原则生成中英双版标准简历
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>生成选项</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>模板风格</Label>
            <Select
              value={templateStyle}
              onValueChange={(v) =>
                setTemplateStyle(v as "star" | "project" | "skill" | "mixed")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="star">STAR 原则强化</SelectItem>
                <SelectItem value="project">项目导向</SelectItem>
                <SelectItem value="skill">技能导向</SelectItem>
                <SelectItem value="mixed">混合风格</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>简历长度</Label>
            <Select
              value={length}
              onValueChange={(v) =>
                setLength(v as "1page" | "2page" | "auto")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1page">1 页</SelectItem>
                <SelectItem value="2page">2 页</SelectItem>
                <SelectItem value="auto">自动</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>语言</Label>
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as "zh" | "en" | "both")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">仅中文</SelectItem>
                <SelectItem value="en">仅英文</SelectItem>
                <SelectItem value="both">中英双版</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetRole">目标岗位（可选）</Label>
            <Input
              id="targetRole"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="如：高级前端工程师"
            />
            <p className="text-xs text-muted-foreground">
              用于关键词对齐，但不会编造相关经历
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              取消
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成标准版
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
