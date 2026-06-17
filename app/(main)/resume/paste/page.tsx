"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardPaste, Loader2, AlertCircle } from "lucide-react";

export default function ResumePastePage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (content.trim().length < 10) {
      setError("简历内容过短，请至少输入 10 个字符");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/resumes/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawContent: content,
          sourceType: "paste",
          hint: hint || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "解析失败");
      }

      const data = await response.json();
      // 将解析结果存入 sessionStorage 供下一步使用
      sessionStorage.setItem("parsedResume", JSON.stringify(data.data));
      router.push("/resume/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">粘贴简历文本</h1>
        <p className="text-muted-foreground mt-1">
          将简历内容粘贴到下方，AI 会自动解析为结构化数据
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>简历内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">简历文本</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此粘贴你的简历内容..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {content.length} 字符
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hint">补充说明（可选）</Label>
            <Textarea
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="如：这是 3 年前的简历，部分信息可能过时"
              className="min-h-[80px]"
            />
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
            <Button onClick={handleParse} disabled={!content || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  解析简历
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
