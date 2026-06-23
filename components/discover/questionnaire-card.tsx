"use client";

import { useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ============== Types ==============

export interface Option {
  value: string;
  label: string;
}

export interface ScaleDimension {
  key: string;
  label: string;
}

export interface Question {
  id: string;
  question: string;
  type: "single" | "multi" | "scale" | "ranking";
  options?: Option[];
  dimensions?: ScaleDimension[];
  maxSelect?: number;
  optional?: boolean;
}

// ============== SingleQuestion ==============

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

// ============== MultiQuestion ==============

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

// ============== ScaleQuestion ==============

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

// ============== RankingQuestion ==============

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

// ============== QuestionnaireCard ==============

export interface QuestionnaireCardProps {
  question: Question;
  value: string | string[] | Record<string, number>;
  onChange: (value: string | string[] | Record<string, number>) => void;
}

export function QuestionnaireCard({ question, value, onChange }: QuestionnaireCardProps) {
  switch (question.type) {
    case "single":
      return (
        <SingleQuestion
          question={question}
          options={question.options!}
          value={(value as string) ?? ""}
          onChange={onChange as (value: string) => void}
        />
      );
    case "multi":
      return (
        <MultiQuestion
          question={question}
          options={question.options!}
          value={(value as string[]) ?? []}
          maxSelect={question.maxSelect}
          onChange={onChange as (value: string[]) => void}
        />
      );
    case "scale":
      return (
        <ScaleQuestion
          question={question}
          dimensions={question.dimensions!}
          value={(value as Record<string, number>) ?? {}}
          onChange={onChange as (value: Record<string, number>) => void}
        />
      );
    case "ranking":
      return (
        <RankingQuestion
          question={question}
          options={question.options!}
          value={(value as string[]) ?? []}
          onChange={onChange as (value: string[]) => void}
        />
      );
    default:
      return null;
  }
}
