"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Trophy,
  RotateCcw,
} from "lucide-react";
import {
  questionTypeLabels,
  type Interview,
  type InterviewSession,
  type SessionAnswer,
} from "@/types/interview";

interface SessionDetail {
  interview: Interview;
  session: InterviewSession;
}

export default function SessionPlayPage({
  params,
}: {
  params: { id: string; sid: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/interviews/${params.id}/sessions/${params.sid}`,
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "加载失败");
      }
      const json = await response.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [params.id, params.sid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const answeredIds = new Set(data?.session.answers.map((a) => a.questionId) ?? []);
  const questions = data?.interview.questions ?? [];
  const currentQuestion = questions.find((q) => !answeredIds.has(q.id));
  const currentIndex = questions.findIndex((q) => !answeredIds.has(q.id));
  const answered_count = data?.session.answers.length ?? 0;
  const total_questions = questions.length;
  const progress = total_questions > 0 ? (answered_count / total_questions) * 100 : 0;

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentAnswer.trim()) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      const response = await fetch(
        `/api/interviews/${params.id}/sessions/${params.sid}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            userAnswer: currentAnswer.trim(),
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "提交失败");
      }
      setCurrentAnswer("");
      await fetchData();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    try {
      setCompleting(true);
      setSubmitError(null);
      const response = await fetch(
        `/api/interviews/${params.id}/sessions/${params.sid}/complete`,
        { method: "POST" },
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "完成会话失败");
      }
      await fetchData();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "完成会话失败");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link href={`/interview/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = data?.session.status === "completed";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/interview/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {isCompleted ? "答题结果" : "答题演练"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.interview.jd_snapshot.title}
          </p>
        </div>
        {isCompleted && data?.session.overall_score !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold flex items-center gap-1">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {data.session.overall_score}
            </div>
            <p className="text-xs text-muted-foreground">总分</p>
          </div>
        )}
      </div>

      {submitError && (
        <Card>
          <CardContent className="py-4 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {submitError}
          </CardContent>
        </Card>
      )}

      {/* 进度 */}
      {!isCompleted && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">答题进度</span>
              <span className="text-sm text-muted-foreground">
                {answered_count} / {total_questions}
              </span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      {/* 整体反馈 */}
      {isCompleted && data?.session.overall_feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">整体反馈</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {data.session.overall_feedback}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 当前题目 */}
      {!isCompleted && currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {questionTypeLabels[currentQuestion.type]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                第 {currentIndex + 1} / {total_questions} 题
              </span>
            </div>
            <CardTitle className="text-base mt-2">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                你的回答
              </h4>
              <Textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="请输入你的答案..."
                rows={8}
                disabled={submitting}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                提交答案
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 已答完所有题，但未完成会话 */}
      {!isCompleted && !currentQuestion && (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="font-medium">所有题目已答完</p>
              <p className="text-sm text-muted-foreground mt-1">
                点击下方按钮生成整体评分和改进建议
              </p>
            </div>
            <Button onClick={handleComplete} disabled={completing}>
              {completing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trophy className="h-4 w-4 mr-2" />
              )}
              生成整体评分
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 已答题列表 */}
      {data && data.session.answers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">已答题（{answered_count}）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.session.answers.map((ans, idx) => {
              const q = questions.find((qq) => qq.id === ans.questionId);
              if (!q) return null;
              return <AnswerItem key={ans.questionId} index={idx} question={q} answer={ans} />;
            })}
          </CardContent>
        </Card>
      )}

      {/* 完成后操作 */}
      {isCompleted && (
        <div className="flex justify-center gap-2">
          <Button onClick={handleStartNewSession} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            再练一次
          </Button>
          <Link href={`/interview/${params.id}`}>
            <Button>返回题集</Button>
          </Link>
        </div>
      )}
    </div>
  );

  async function handleStartNewSession() {
    try {
      const response = await fetch(`/api/interviews/${params.id}/sessions`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("创建会话失败");
      const json = await response.json();
      router.push(`/interview/${params.id}/sessions/${json.data.session.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "创建会话失败");
    }
  }
}

function AnswerItem({
  index,
  question,
  answer,
}: {
  index: number;
  question: { id: string; type: string; question: string; referenceAnswer: string };
  answer: SessionAnswer;
}) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor =
    answer.score >= 90
      ? "text-green-600"
      : answer.score >= 70
        ? "text-blue-600"
        : answer.score >= 50
          ? "text-orange-600"
          : "text-red-600";

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">Q{index + 1}</span>
          <Badge variant="secondary" className="shrink-0">
            {questionTypeLabels[question.type as keyof typeof questionTypeLabels]}
          </Badge>
          <span className="font-medium truncate">{question.question}</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`text-sm font-bold ${scoreColor}`}>{answer.score}</span>
        </div>
      </div>
      {expanded && (
        <div className="p-3 border-t space-y-3 bg-background text-sm">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">你的答案</h4>
            <p className="whitespace-pre-wrap">{answer.userAnswer}</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">参考答案</h4>
            <p className="whitespace-pre-wrap">{question.referenceAnswer}</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">反馈</h4>
            <p className="whitespace-pre-wrap">{answer.feedback}</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">对比分析</h4>
            <p className="whitespace-pre-wrap">{answer.comparison}</p>
          </div>
        </div>
      )}
    </div>
  );
}
