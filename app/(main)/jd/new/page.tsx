"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function JdNewPage() {
  const router = useRouter();
  const [jdText, setJdText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParseAndSave = async () => {
    if (jdText.trim().length < 10) {
      setError("JD 文本至少需要 10 个字符");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const parseResponse = await fetch("/api/jds/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText,
          targetRole: targetRole || undefined,
        }),
      });
      if (!parseResponse.ok) {
        const data = await parseResponse.json();
        throw new Error(data.error?.message || "解析失败");
      }
      const parseData = await parseResponse.json();
      const structured = parseData.data.structured;

      const createResponse = await fetch("/api/jds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: jdText,
          structured,
          targetRole: targetRole || undefined,
          status: "parsed",
        }),
      });
      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error?.message || "保存失败");
      }
      const createData = await createResponse.json();
      router.push(`/jd/${createData.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jd">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新建 JD</h1>
          <p className="text-muted-foreground mt-1">
            粘贴职位描述，AI 将自动解析关键词
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>JD 内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetRole">目标岗位（可选）</Label>
            <Input
              id="targetRole"
              placeholder="如：高级前端工程师"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              提供目标岗位可提升 AI 解析准确度
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jdText">职位描述 *</Label>
            <Textarea
              id="jdText"
              placeholder="粘贴完整的职位描述（JD）..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={12}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              当前字数：{jdText.length}
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Link href="/jd">
              <Button variant="outline">取消</Button>
            </Link>
            <Button
              onClick={handleParseAndSave}
              disabled={loading || jdText.trim().length < 10}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  解析并保存
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
