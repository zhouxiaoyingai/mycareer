"use client";

import { Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Skill {
  skill: string;
  transferTo: string;
  evidence: string;
}

interface CareerPath {
  careerName: string;
  industry: string;
  skillMatch: string;
  salaryRange: string;
  transitionTime: string;
}

interface QuickWin {
  step: string;
  resource: string;
  purpose: string;
}

interface RealityCheck {
  bestFit: string;
  timelines: Array<{ path: string; phase: string; duration: string }>;
}

interface ReportData {
  transferableSkills: Skill[];
  careerPaths: CareerPath[];
  quickWins: QuickWin[];
  realityCheck: RealityCheck;
}

interface Report {
  _id: string;
  status: string;
  report?: ReportData;
}

interface ReportViewProps {
  report: Report;
  onReset?: () => void;
}

export function ReportView({ report, onReset }: ReportViewProps) {
  const data = report.report;

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
        <CardContent className="space-y-8">
          {data ? (
            <>
              {/* 可迁移技能 */}
              <section>
                <h3 className="text-lg font-semibold mb-3">可迁移技能</h3>
                <div className="grid gap-3">
                  {data.transferableSkills.map((skill, i) => (
                    <Card key={i} className="p-4">
                      <p className="font-medium">{skill.skill}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        可迁移到：{skill.transferTo}
                      </p>
                      <p className="text-sm mt-1">{skill.evidence}</p>
                    </Card>
                  ))}
                </div>
              </section>

              {/* 职业路径 */}
              <section>
                <h3 className="text-lg font-semibold mb-3">推荐职业路径</h3>
                <div className="grid gap-3">
                  {data.careerPaths.map((path, i) => (
                    <Card key={i} className="p-4">
                      <p className="font-medium">
                        {path.careerName}
                        <span className="text-muted-foreground font-normal ml-2">({path.industry})</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        技能匹配：{path.skillMatch}
                      </p>
                      <p className="text-sm mt-1">
                        转型时间：{path.transitionTime}
                      </p>
                    </Card>
                  ))}
                </div>
              </section>

              {/* 快速起步 */}
              <section>
                <h3 className="text-lg font-semibold mb-3">快速起步</h3>
                <div className="space-y-3">
                  {data.quickWins.map((win, i) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{win.step}</p>
                        <p className="text-xs text-muted-foreground">
                          资源：{win.resource}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 现实检验 */}
              <section>
                <h3 className="text-lg font-semibold mb-3">现实检验</h3>
                <Card className="p-4">
                  <p className="font-medium text-sm">最佳匹配：{data.realityCheck.bestFit}</p>
                  <div className="mt-2 space-y-1">
                    {data.realityCheck.timelines.map((t, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {t.path} → {t.phase}（{t.duration}）
                      </p>
                    ))}
                  </div>
                </Card>
              </section>
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
