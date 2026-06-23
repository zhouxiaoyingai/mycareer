"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ============== Types ==============

type PageState = "idle" | "answering" | "submitting" | "generating" | "completed" | "error";

interface Option {
  value: string;
  label: string;
}

interface ScaleDimension {
  key: string;
  label: string;
}

interface Question {
  id: string;
  question: string;
  type: "single" | "multi" | "scale" | "ranking";
  options?: Option[];
  dimensions?: ScaleDimension[];
  maxSelect?: number;
  optional?: boolean;
}

interface Answers {
  currentStage: string;
  flowExperiences: string[];
  achievementType: string;
  workEnvironmentPreferences: Record<string, number>;
  valueRanking: string[];
  riskTolerance: string;
  learningStyle: string[];
  // Extra fields required by API but not in the 7 questions
  careerClarity?: string;
  achievementStory?: string;
  yearsOfExperience: number;
}

interface Report {
  _id: string;
  status: string;
  report?: {
    transferableSkills: Array<{ skill: string; transferTo: string; evidence: string }>;
    careerPaths: Array<{
      careerName: string;
      industry: string;
      skillMatch: string;
      entryPath: string;
      salaryRange: string;
      searchStrategy: string;
      transitionTime: string;
    }>;
    quickWins: Array<{ step: string; resource: string; purpose: string }>;
    realityCheck: { bestFit: string; timelines: Array<{ path: string; phase: string; duration: string }> };
  };
}

// ============== Questions Definition ==============

const QUESTIONS: Question[] = [
  {
    id: "currentStage",
    question: "你现在处于哪个阶段？",
    type: "single",
    options: [
      { value: "employed-exploring", label: "我有工作，但想看看其他机会" },
      { value: "fresh-graduate", label: "我刚毕业或即将毕业，职业方向还不确定" },
      { value: "career-transition", label: "我想转行，但对目标方向很迷茫" },
      { value: "unemployed", label: "我已经失业一段时间，不知道该从何开始" },
      { value: "self-exploration", label: "以上都不符合，我想更了解自己" },
    ],
  },
  {
    id: "flowExperiences",
    question: "回想一下，最近一次觉得「时间过得很快，做得很投入」是什么时候？（最多选3个）",
    type: "multi",
    maxSelect: 3,
    options: [
      { value: "building-things", label: "写代码/文档/内容，把想法变成具体成果时" },
      { value: "communicating", label: "和别人聊天，协调资源、解决冲突时" },
      { value: "analyzing-data", label: "分析数据、研究问题、找出规律时" },
      { value: "teaching-sharing", label: "教别人做事、分享知识、被请教时" },
      { value: "leading-projects", label: "主导项目，推动进展，对结果负责时" },
      { value: "designing", label: "画图、设计，做美感相关的事情时" },
      { value: "none-unsure", label: "还没出现过这种感觉 / 不确定" },
    ],
  },
  {
    id: "achievementType",
    question: "以下哪件事最让你有成就感？",
    type: "single",
    options: [
      { value: "building-from-scratch", label: "从0到1搭建了一个东西（项目/产品/系统）" },
      { value: "persuading-others", label: "成功说服了别人接受我的想法或方案" },
      { value: "solving-hard-problems", label: "解决了别人解决不了的问题" },
      { value: "developing-people", label: "培养了一个人，看到他的成长" },
      { value: "winning-competition", label: "在竞争中获胜/超越了之前的自己" },
      { value: "creative-recognition", label: "完成了一件有创意的事，得到了认可" },
    ],
  },
  {
    id: "workEnvironmentPreferences",
    question: "你理想中的工作环境是什么样的？（每项1-5分）",
    type: "scale",
    dimensions: [
      { key: "remoteWork", label: "远程/自由工作" },
      { key: "stability", label: "稳定/可预期" },
      { key: "fastPaced", label: "快节奏/高压" },
      { key: "teamwork", label: "团队协作多" },
      { key: "independence", label: "独立自主多" },
      { key: "creativity", label: "创意/自由度" },
    ],
  },
  {
    id: "valueRanking",
    question: "以下6件事，如果只能选一个长期拥有，你选哪个？（拖动排序）",
    type: "ranking",
    options: [
      { value: "high-income", label: "高收入/好的物质生活" },
      { value: "helping-others", label: "帮助别人/让世界更好" },
      { value: "learning-growth", label: "不断学习/成长" },
      { value: "respect-influence", label: "被尊重/有影响力" },
      { value: "work-life-balance", label: "工作生活平衡/有空闲时间" },
      { value: "challenging", label: "有挑战性/不无聊" },
    ],
  },
  {
    id: "riskTolerance",
    question: "想象你需要从零开始学习一个新领域，可能半年内收入降低。你会怎么做？",
    type: "single",
    options: [
      { value: "full-action", label: "立刻行动，全身心投入学习" },
      { value: "partial-transition", label: "先边工作边了解，等有把握了再转" },
      { value: "need-guarantees", label: "不太确定，除非有更多保障" },
      { value: "risk-averse", label: "算了，我不想冒这个险" },
    ],
  },
  {
    id: "learningStyle",
    question: "你通常是怎么学会一件新事物的？（选填，最多2个）",
    type: "multi",
    maxSelect: 2,
    optional: true,
    options: [
      { value: "self-study", label: "看教程/文档/书籍，自己琢磨" },
      { value: "learning-by-doing", label: "跟着别人做，边做边学" },
      { value: "discussing", label: "找人请教，讨论中学习" },
      { value: "problem-solving", label: "实践中遇到问题，解决问题中学习" },
    ],
  },
];

const STORAGE_KEY = "strength-draft";

// ============== Initial Answers ==============

const initialAnswers: Answers = {
  currentStage: "",
  flowExperiences: [],
  achievementType: "",
  workEnvironmentPreferences: {
    remoteWork: 3,
    stability: 3,
    fastPaced: 3,
    teamwork: 3,
    independence: 3,
    creativity: 3,
  },
  valueRanking: [],
  riskTolerance: "",
  learningStyle: [],
  yearsOfExperience: 0,
};

// ============== ReportView Placeholder ==============

function ReportView({ report }: { report: Report }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            你的优势识别报告
          </CardTitle>
          <CardDescription>
            生成时间：{new Date().toLocaleDateString("zh-CN")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {report.report ? (
            <>
              {/* 可迁移技能 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">可迁移技能</h3>
                <div className="space-y-3">
                  {report.report.transferableSkills.map((skill, i) => (
                    <Card key={i} className="p-4">
                      <p className="font-medium">{skill.skill}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        可迁移到：{skill.transferTo}
                      </p>
                      <p className="text-sm mt-1">{skill.evidence}</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 职业路径 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">推荐职业路径</h3>
                <div className="space-y-3">
                  {report.report.careerPaths.map((path, i) => (
                    <Card key={i} className="p-4">
                      <p className="font-medium">
                        {path.careerName}（{path.industry}）
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        技能匹配：{path.skillMatch}
                      </p>
                      <p className="text-sm mt-1">薪资范围：{path.salaryRange}</p>
                      <p className="text-sm mt-1">转型时间：{path.transitionTime}</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 快速起步 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">快速起步</h3>
                <div className="space-y-2">
                  {report.report.quickWins.map((win, i) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{win.step}</p>
                        <p className="text-sm text-muted-foreground">
                          资源：{win.resource}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 现实检验 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">现实检验</h3>
                <Card className="p-4">
                  <p className="font-medium">最佳匹配：{report.report.realityCheck.bestFit}</p>
                  <div className="mt-2 space-y-1">
                    {report.report.realityCheck.timelines.map((t, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {t.path} → {t.phase}（{t.duration}）
                      </p>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              报告内容正在生成中...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Question Components ==============

function SingleQuestion({
  question,
  options,
  value,
  onChange,
}: {
  question: Question;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{question.question}</h2>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-colors",
              value === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiQuestion({
  question,
  options,
  value,
  maxSelect,
  onChange,
}: {
  question: Question;
  options: Option[];
  value: string[];
  maxSelect?: number;
  onChange: (value: string[]) => void;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else if (maxSelect === undefined || value.length < maxSelect) {
      onChange([...value, v]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{question.question}</h2>
        <span className="text-sm text-muted-foreground">
          {maxSelect ? `最多选 ${maxSelect} 项` : ""}
        </span>
      </div>
      <div className="space-y-2">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          const disabled = !selected && maxSelect !== undefined && value.length >= maxSelect;
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              disabled={disabled}
              className={cn(
                "w-full text-left p-4 rounded-lg border transition-colors flex items-center gap-3",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                  selected ? "bg-primary border-primary" : "border-muted-foreground"
                )}
              >
                {selected && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
              </div>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScaleQuestion({
  question,
  dimensions,
  value,
  onChange,
}: {
  question: Question;
  dimensions: ScaleDimension[];
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}) {
  const handleChange = (key: string, val: number) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{question.question}</h2>
      <div className="space-y-4">
        {dimensions.map((dim) => (
          <div key={dim.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{dim.label}</span>
              <span className="text-sm font-medium">{value[dim.key] ?? 3}</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => handleChange(dim.key, n)}
                  className={cn(
                    "flex-1 h-10 rounded-md border transition-colors text-sm font-medium",
                    (value[dim.key] ?? 3) === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingQuestion({
  question,
  options,
  value,
  onChange,
}: {
  question: Question;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  // Initialize with all options in order if empty
  useEffect(() => {
    if (value.length === 0 && options.length > 0) {
      onChange(options.map((o) => o.value));
    }
  }, [options, value, onChange]);

  const moveItem = (from: number, direction: "up" | "down") => {
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= value.length) return;
    const newValue = [...value];
    [newValue[from], newValue[to]] = [newValue[to], newValue[from]];
    onChange(newValue);
  };

  const getLabel = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{question.question}</h2>
      <p className="text-sm text-muted-foreground">拖动或点击按钮调整顺序，最高优先级在最上面</p>
      <div className="space-y-2">
        {value.map((v, i) => (
          <div
            key={v}
            className="flex items-center gap-2 p-3 rounded-lg border bg-card"
          >
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
              {i + 1}
            </span>
            <span className="flex-1 text-sm">{getLabel(v)}</span>
            <button
              onClick={() => moveItem(i, "up")}
              disabled={i === 0}
              className="p-1 hover:bg-accent rounded disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => moveItem(i, "down")}
              disabled={i === value.length - 1}
              className="p-1 hover:bg-accent rounded disabled:opacity-30"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== Main Page Component ==============

export default function DiscoverPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [reportId, setReportId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRestMessage, setShowRestMessage] = useState(false);
  const [showPreviewHint, setShowPreviewHint] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { step, answers: savedAnswers } = JSON.parse(saved);
        if (step !== undefined && savedAnswers !== undefined) {
          setCurrentStep(step);
          setAnswers({ ...initialAnswers, ...savedAnswers });
          if (step > 0) {
            setPageState("answering");
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save draft to localStorage on answers change
  useEffect(() => {
    if (pageState === "answering") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step: currentStep, answers })
      );
    }
  }, [answers, currentStep, pageState]);

  // Polling for report status
  const pollReport = useCallback(async (id: string) => {
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;

    const check = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        setError("报告生成超时，请重试");
        setPageState("error");
        return;
      }

      try {
        const res = await fetch(`/api/strength/reports/${id}`);
        const data = await res.json();

        if (data.code === 0 && data.data) {
          const reportData = data.data;
          setReport(reportData);

          if (reportData.status === "completed") {
            setPageState("completed");
            localStorage.removeItem(STORAGE_KEY);
            return;
          }

          if (reportData.status === "failed") {
            setError("报告生成失败");
            setPageState("error");
            return;
          }
        }

        attempts++;
        setTimeout(check, 2000);
      } catch {
        attempts++;
        setTimeout(check, 2000);
      }
    };

    await check();
  }, []);

  const startQuestionnaire = () => {
    setPageState("answering");
    setCurrentStep(0);
    setAnswers(initialAnswers);
    setShowRestMessage(false);
    setShowPreviewHint(false);
  };

  const handleAnswer = (questionId: string, value: string | string[] | Record<string, number>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const goNext = async () => {
    // Validate current step
    const q = QUESTIONS[currentStep];
    const answer = answers[q.id as keyof Answers];

    if (!q.optional) {
      if (Array.isArray(answer) && answer.length === 0) return;
      if (typeof answer === "string" && !answer) return;
      if (q.type === "scale" && typeof answer === "object" && Object.keys(answer).length === 0) return;
    }

    // Q3 → Q4: show rest message
    if (currentStep === 2) {
      setShowRestMessage(true);
      setTimeout(() => {
        setShowRestMessage(false);
        setCurrentStep(3);
      }, 2000);
      return;
    }

    // Q4: show preview hint
    if (currentStep === 3) {
      setShowPreviewHint(true);
    }

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Submit
      setPageState("submitting");
      try {
        const res = await fetch("/api/strength/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });

        const data = await res.json();

        if (data.code === 0 && data.data?.id) {
          setReportId(data.data.id);
          setPageState("generating");
          pollReport(data.data.id);
        } else {
          throw new Error(data.message || "提交失败");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "提交失败");
        setPageState("error");
      }
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setShowRestMessage(false);
      setShowPreviewHint(false);
    } else {
      setPageState("idle");
    }
  };

  const retry = () => {
    setError(null);
    setPageState("idle");
    setReportId(null);
    setReport(null);
  };

  const currentQuestion = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  // ============== Render States ==============

  if (pageState === "idle") {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <PrefillBanner
          onApply={(data) => {
            setAnswers((prev) => ({
              ...prev,
              yearsOfExperience: data.yearsOfExperience,
            }));
          }}
        />
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3">发现你的优势</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              通过 7 个问题，了解你的职业特质、优势技能和适合的发展方向。
              完成后获得个性化的优势报告和职业建议。
            </p>
            <Button onClick={startQuestionnaire} size="lg">
              开始探索
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              预计用时 5-10 分钟，进度自动保存
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "submitting") {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center py-12">
          <CardContent>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">正在提交...</h2>
            <p className="text-muted-foreground">请稍候</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "generating") {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center py-12">
          <CardContent>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">正在分析中...</h2>
            <p className="text-muted-foreground mb-6">
              AI 正在根据你的回答生成专属报告
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              预计需要 1-2 分钟
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "completed" && report) {
    return (
      <div className="max-w-3xl mx-auto">
        <ReportView report={report} />
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={retry}>
            重新开始
          </Button>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">出错了</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={retry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重新开始
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // answering state
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            问题 {currentStep + 1} / {QUESTIONS.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Rest message between Q3 and Q4 */}
      {showRestMessage ? (
        <Card className="py-8 text-center">
          <CardContent>
            <p className="text-lg text-muted-foreground">
              休息一下——接下来的问题关于你理想的工作方式，不是关于你的过去
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6">
          <CardContent>
            {/* Q1: single */}
            {currentQuestion.type === "single" && (
              <SingleQuestion
                question={currentQuestion}
                options={currentQuestion.options!}
                value={(answers[currentQuestion.id as keyof Answers] as string) ?? ""}
                onChange={(v) => handleAnswer(currentQuestion.id, v)}
              />
            )}

            {/* Q2 & Q7: multi */}
            {currentQuestion.type === "multi" && (
              <MultiQuestion
                question={currentQuestion}
                options={currentQuestion.options!}
                value={(answers[currentQuestion.id as keyof Answers] as string[]) ?? []}
                maxSelect={currentQuestion.maxSelect}
                onChange={(v) => handleAnswer(currentQuestion.id, v)}
              />
            )}

            {/* Q4: scale */}
            {currentQuestion.type === "scale" && (
              <ScaleQuestion
                question={currentQuestion}
                dimensions={currentQuestion.dimensions!}
                value={answers.workEnvironmentPreferences}
                onChange={(v) => handleAnswer(currentQuestion.id, v)}
              />
            )}

            {/* Q5: ranking */}
            {currentQuestion.type === "ranking" && (
              <RankingQuestion
                question={currentQuestion}
                options={currentQuestion.options!}
                value={answers.valueRanking}
                onChange={(v) => handleAnswer(currentQuestion.id, v)}
              />
            )}

            {/* Preview hint after Q4 */}
            {showPreviewHint && currentStep === 3 && (
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-center">
                  我们已经发现你有一种特质...
                  <br />
                  <span className="text-muted-foreground">
                    完成剩余3题，获取完整报告
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={showRestMessage}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? "返回" : "上一题"}
        </Button>

        {currentStep < QUESTIONS.length - 1 || showRestMessage ? (
          <Button onClick={goNext} disabled={showRestMessage}>
            {currentStep === 2 ? "下一题" : currentStep === 3 ? "继续" : "下一题"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={goNext}>
            提交
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
