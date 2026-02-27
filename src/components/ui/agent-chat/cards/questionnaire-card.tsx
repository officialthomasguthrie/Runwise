"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClarificationQuestion, QuestionnaireAnswer } from "@/lib/ai/types";

interface QuestionnaireCardProps {
  questions: ClarificationQuestion[];
  onSubmit: (answers: QuestionnaireAnswer[]) => void;
}

export function QuestionnaireCard({ questions, onSubmit }: QuestionnaireCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>("");
  const [submitted, setSubmitted] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  useEffect(() => {
    if (currentQuestion?.type === "text" && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [currentIndex, currentQuestion?.type]);

  const canProceed =
    currentAnswer !== "" &&
    (Array.isArray(currentAnswer) ? currentAnswer.length > 0 : String(currentAnswer).trim().length > 0);

  const handleNext = () => {
    if (!canProceed || !currentQuestion) return;

    const answer: QuestionnaireAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: currentAnswer,
    };
    const updatedAnswers = [...answers, answer];

    if (isLastQuestion) {
      setSubmitted(true);
      onSubmit(updatedAnswers);
    } else {
      setAnswers(updatedAnswers);
      setCurrentIndex(currentIndex + 1);
      setCurrentAnswer("");
    }
  };

  const handleBack = () => {
    if (isFirstQuestion) return;
    const prevAnswer = answers[currentIndex - 1];
    setAnswers(answers.slice(0, -1));
    setCurrentIndex(currentIndex - 1);
    setCurrentAnswer(prevAnswer?.answer ?? "");
  };

  const handleSingleChoice = (option: string) => setCurrentAnswer(option);

  const handleMultipleChoice = (option: string) => {
    setCurrentAnswer((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      if (arr.includes(option)) return arr.filter((o) => o !== option);
      return [...arr, option];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canProceed) {
      e.preventDefault();
      handleNext();
    }
  };

  // Collapsed summary after submit
  if (submitted) {
    return (
      <div className="rounded-md border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Your answers
          </h3>
        </div>
        <div className="px-4 py-3 space-y-2">
          {answers.map((a, i) => (
            <div key={i} className="text-sm">
              <span className="text-muted-foreground">{a.question}</span>
              <span className="text-foreground ml-1">
                — {Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Progress */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 rounded-full transition-all duration-200",
                idx < currentIndex && "bg-pink-400/60",
                idx === currentIndex && "bg-pink-400",
                idx > currentIndex && "bg-white/10"
              )}
              style={{ width: idx <= currentIndex ? 18 : 10 }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Question */}
      <div className="px-4 pb-3 pt-2">
        <p className="text-sm font-medium text-foreground mb-3 leading-relaxed">
          {currentQuestion.question}
        </p>

        {currentQuestion.type === "single_choice" && currentQuestion.options && (
          <div className="space-y-1.5">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSingleChoice(opt)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors",
                  currentAnswer === opt
                    ? "border-pink-400/50 bg-pink-400/10 text-foreground"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      currentAnswer === opt ? "border-pink-400 bg-pink-400" : "border-white/20"
                    )}
                  >
                    {currentAnswer === opt && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  {opt}
                </span>
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
          <div className="space-y-1.5">
            {currentQuestion.options.map((opt) => {
              const selected = Array.isArray(currentAnswer) && currentAnswer.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => handleMultipleChoice(opt)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors",
                    selected
                      ? "border-pink-400/50 bg-pink-400/10 text-foreground"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        "w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0",
                        selected ? "border-pink-400 bg-pink-400" : "border-white/20"
                      )}
                    >
                      {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    {opt}
                  </span>
                </button>
              );
            })}
            {Array.isArray(currentAnswer) && currentAnswer.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">{currentAnswer.length} selected</p>
            )}
          </div>
        )}

        {currentQuestion.type === "text" && (
          <textarea
            ref={textInputRef}
            value={typeof currentAnswer === "string" ? currentAnswer : ""}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentQuestion.placeholder ?? "Type your answer…"}
            className="w-full min-h-[60px] max-h-[120px] resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-pink-400/30"
            rows={2}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 pb-3 flex items-center justify-between">
        {isFirstQuestion ? (
          <div />
        ) : (
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLastQuestion ? (
            <>
              Continue
              <ArrowRight className="h-3 w-3" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-3 w-3" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
