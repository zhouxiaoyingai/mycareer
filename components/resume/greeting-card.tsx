"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import type { Greeting } from "@/types/resume";

interface GreetingCardProps {
  resumeId: string;
  greeting?: Greeting;
  /** 是否显示重新生成按钮（默认 true） */
  showRegenerate?: boolean;
  /** 重新生成后的回调，用于更新父组件状态 */
  onRegenerated?: (greeting: Greeting) => void;
}

export function GreetingCard({
  resumeId,
  greeting,
  showRegenerate = true,
  onRegenerated,
}: GreetingCardProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentGreeting, setCurrentGreeting] = useState(greeting);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!currentGreeting) return;
    try {
      await navigator.clipboard.writeText(currentGreeting.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动选择文本复制");
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/resumes/${resumeId}/greeting`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "重新生成失败");
      }
      const data = await response.json();
      const newGreeting = data.data.greeting as Greeting;
      setCurrentGreeting(newGreeting);
      onRegenerated?.(newGreeting);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重新生成失败");
    } finally {
      setRegenerating(false);
    }
  };

  if (!currentGreeting) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            打招呼话术
          </CardTitle>
          <Badge variant="secondary">v{currentGreeting.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm leading-relaxed">{currentGreeting.text}</p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            生成于{" "}
            {new Date(currentGreeting.generatedAt).toLocaleString("zh-CN")}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </>
              )}
            </Button>
            {showRegenerate && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    重新生成
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
