"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Copy,
  Check,
  Loader2,
  Briefcase,
  Plus,
} from "lucide-react";
import type { Greeting } from "@/types/resume";

interface GreetingItem {
  resumeId: string;
  targetRole?: string;
  jdId?: string;
  jdTitle?: string;
  matchScore?: number;
  greeting: Greeting;
  updatedAt: string;
}

export default function GreetingPage() {
  const [greetings, setGreetings] = useState<GreetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGreetings = async () => {
      try {
        const response = await fetch("/api/greetings");
        if (!response.ok) throw new Error("加载失败");
        const data = await response.json();
        setGreetings(data.data.greetings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchGreetings();
  }, []);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("复制失败，请手动选择文本复制");
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
            <MessageSquare className="h-6 w-6" />
            打招呼话术
          </h1>
          <p className="text-muted-foreground mt-1">
            所有定制简历生成的打招呼短文历史记录
          </p>
        </div>
        <Link href="/jd">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            生成新话术
          </Button>
        </Link>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-red-600 text-sm">{error}</CardContent>
        </Card>
      )}

      {greetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有打招呼话术</p>
            <Link href="/jd">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                从 JD 生成定制简历
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {greetings.map((item) => (
            <Card key={item.resumeId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {item.jdTitle || item.targetRole || "目标岗位"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {item.matchScore !== undefined && (
                      <Badge variant="secondary">
                        匹配度 {item.matchScore}
                      </Badge>
                    )}
                    <Badge variant="outline">v{item.greeting.version}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm leading-relaxed">{item.greeting.text}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    生成于{" "}
                    {new Date(item.greeting.generatedAt).toLocaleString("zh-CN")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(item.resumeId, item.greeting.text)}
                    >
                      {copiedId === item.resumeId ? (
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
                    <Link href={`/resume/${item.resumeId}`}>
                      <Button size="sm" variant="outline">
                        查看简历
                      </Button>
                    </Link>
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
