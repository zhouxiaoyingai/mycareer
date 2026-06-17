"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface StandardResume {
  _id: string;
  targetRole?: string;
  updatedAt: string;
}

export default function TailorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [standardResumes, setStandardResumes] = useState<StandardResume[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const response = await fetch(
          "/api/resumes?type=standard&status=confirmed",
        );
        if (!response.ok) throw new Error("获取标准版简历失败");
        const data = await response.json();
        setStandardResumes(data.data.resumes || []);
        if (data.data.resumes?.length > 0)
          setSelectedId(data.data.resumes[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setFetching(false);
      }
    };
    fetchResumes();
  }, []);

  const handleTailor = async () => {
    if (!selectedId) {
      setError("请选择标准版简历");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jds/${params.id}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standardResumeId: selectedId }),
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

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/jd/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">生成定制简历</h1>
          <p className="text-muted-foreground mt-1">
            选择标准版简历，基于 JD 生成定制版
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>选择标准版简历</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {standardResumes.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                暂无已确认的标准版简历
              </p>
              <Link href="/resume">
                <Button>去创建标准版简历</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {standardResumes.map((resume) => (
                  <label
                    key={resume._id}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedId === resume._id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="standardResume"
                      value={resume._id}
                      checked={selectedId === resume._id}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {resume.targetRole || "标准版简历"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        更新于{" "}
                        {new Date(resume.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Link href={`/jd/${params.id}`}>
                  <Button variant="outline">取消</Button>
                </Link>
                <Button
                  onClick={handleTailor}
                  disabled={loading || !selectedId}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      生成定制简历
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
