"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ClarificationQuestion, QuestionnaireAnswer } from '@/lib/ai/types';

import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
interface WorkflowQuestionnaireProps {
  questions: ClarificationQuestion[];
  onComplete: (answers: QuestionnaireAnswer[]) => void;
  isGenerating?: boolean;
}

export const WorkflowQuestionnaire: React.FC<WorkflowQuestionnaireProps> = ({
  questions,
  onComplete,
  isGenerating = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animPhase, setAnimPhase] = useState<'idle' | 'exit' | 'entering' | 'entered'>('idle');
  const [animDir, setAnimDir] = useState<1 | -1>(1); // 1 = forward, -1 = backward
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;
  const totalQuestions = questions.length;

  // Focus text input when question changes
  useEffect(() => {
    if (currentQuestion?.type === 'text' && textInputRef.current && animPhase === 'entered') {
      textInputRef.current.focus();
    }
  }, [animPhase, currentQuestion?.type]);

  const canProceed = useCallback(() => {
    if (!currentAnswer) return false;
    if (Array.isArray(currentAnswer)) return currentAnswer.length > 0;
    return currentAnswer.trim().length > 0;
  }, [currentAnswer]);

  // Shared transition: exit current → swap index → enter new
  const transitionTo = useCallback((nextIndex: number, nextAnswer: string | string[], direction: 1 | -1, newAnswers: QuestionnaireAnswer[]) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimDir(direction);

    // Phase 1: slide out
    setAnimPhase('exit');

    setTimeout(() => {
      // Swap content
      setAnswers(newAnswers);
      setCurrentIndex(nextIndex);
      setCurrentAnswer(nextAnswer);

      // Phase 2: jump to start position on the opposite side
      setAnimPhase('entering');

      // Force a frame so the browser paints the 'entering' position before transitioning
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Phase 3: slide in
          setAnimPhase('entered');
          setTimeout(() => {
            setAnimPhase('idle');
            setIsAnimating(false);
          }, 250);
        });
      });
    }, 200);
  }, [isAnimating]);

  const handleNext = useCallback(() => {
    if (!canProceed() || isAnimating) return;

    const answer: QuestionnaireAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: currentAnswer,
    };
    const updatedAnswers = [...answers, answer];

    if (isLastQuestion) {
      setIsCompleted(true);
      onComplete(updatedAnswers);
    } else {
      transitionTo(currentIndex + 1, '', 1, updatedAnswers);
    }
  }, [canProceed, isAnimating, currentQuestion, currentAnswer, answers, isLastQuestion, onComplete, transitionTo, currentIndex]);

  const handleBack = useCallback(() => {
    if (isFirstQuestion || isAnimating) return;

    const previousAnswers = [...answers];
    const restoredAnswer = previousAnswers.pop();

    transitionTo(currentIndex - 1, restoredAnswer?.answer ?? '', -1, previousAnswers);
  }, [isFirstQuestion, isAnimating, answers, transitionTo, currentIndex]);

  const handleSingleChoice = (option: string) => {
    setCurrentAnswer(option);
  };

  const handleMultipleChoice = (option: string) => {
    setCurrentAnswer((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      if (current.includes(option)) {
        return current.filter((o) => o !== option);
      }
      return [...current, option];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canProceed()) {
      e.preventDefault();
      handleNext();
    }
  };

  // Completed state
  if (isCompleted) {
    return (
      <div className="px-1 py-3">
        <div className="rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm p-4">
          <div className="flex items-center gap-2.5 text-sm text-foreground/70">
            <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
            <span>Building your workflow...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // Compute slide transform for the question content only
  // exit: slide out in the opposite direction of travel
  // entering: starting position on the incoming side (no transition)
  // entered/idle: at rest, centered
  let contentStyle: React.CSSProperties = {};
  let contentTransition = '';

  if (animPhase === 'exit') {
    // Slide out: forward → slide left, backward → slide right
    contentStyle = { transform: `translateX(${animDir * -40}px)`, opacity: 0 };
    contentTransition = 'transform 200ms ease-in, opacity 200ms ease-in';
  } else if (animPhase === 'entering') {
    // Jump to starting position on the incoming side (no transition)
    contentStyle = { transform: `translateX(${animDir * 40}px)`, opacity: 0 };
    contentTransition = 'none';
  } else if (animPhase === 'entered') {
    // Slide in to center
    contentStyle = { transform: 'translateX(0)', opacity: 1 };
    contentTransition = 'transform 250ms ease-out, opacity 250ms ease-out';
  } else {
    // idle
    contentStyle = { transform: 'translateX(0)', opacity: 1 };
    contentTransition = 'none';
  }

  return (
    <div className="px-1 py-3">
      <div className="rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        {/* Progress bar — stays fixed, dots animate in place */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ease-out ${
                  idx > currentIndex ? 'bg-stone-300/50 dark:bg-white/10' : ''
                }`}
                style={{
                  width: idx <= currentIndex ? 20 : 12,
                  ...(idx <= currentIndex
                    ? { backgroundColor: idx === currentIndex ? '#bd28b3' : '#bd28b3b3' }
                    : {}),
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-medium text-foreground/40 tracking-wide uppercase">
            {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Question content — this is the only part that slides */}
        <div className="relative overflow-hidden">
          <div
            className="px-4 pb-3 pt-2"
            style={{ ...contentStyle, transition: contentTransition, willChange: 'transform, opacity' }}
          >
            <p className="text-sm font-medium text-foreground mb-3 leading-relaxed">
              {currentQuestion.question}
            </p>

            {/* Single choice */}
            {currentQuestion.type === 'single_choice' && currentQuestion.options && (
              <div className="space-y-1.5">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSingleChoice(option)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 border ${
                      currentAnswer === option
                        ? 'border-[#bd28b3]/50 bg-[#bd28b3]/10 text-foreground ring-1 ring-[#bd28b3]/20'
                        : 'border-stone-200/60 dark:border-white/8 bg-white/40 dark:bg-white/[0.02] text-foreground/80 hover:border-stone-300 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          currentAnswer === option
                            ? 'border-[#bd28b3] bg-[#bd28b3]'
                            : 'border-stone-300 dark:border-white/20'
                        }`}
                      >
                        {currentAnswer === option && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Multiple choice */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-1.5">
                {currentQuestion.options.map((option) => {
                  const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => handleMultipleChoice(option)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 border ${
                        isSelected
                          ? 'border-[#bd28b3]/50 bg-[#bd28b3]/10 text-foreground ring-1 ring-[#bd28b3]/20'
                          : 'border-stone-200/60 dark:border-white/8 bg-white/40 dark:bg-white/[0.02] text-foreground/80 hover:border-stone-300 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center transition-all border-2 ${
                            isSelected
                              ? 'border-[#bd28b3] bg-[#bd28b3]'
                              : 'border-stone-300 dark:border-white/20'
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          )}
                        </div>
                        <span>{option}</span>
                      </div>
                    </button>
                  );
                })}
                {Array.isArray(currentAnswer) && currentAnswer.length > 0 && (
                  <p className="text-[11px] text-foreground/40 mt-1 pl-1">
                    {currentAnswer.length} selected
                  </p>
                )}
              </div>
            )}

            {/* Text input */}
            {currentQuestion.type === 'text' && (
              <textarea
                ref={textInputRef}
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentQuestion.placeholder || 'Type your answer...'}
                className="w-full bg-white/60 dark:bg-white/[0.03] border border-stone-200/60 dark:border-white/10 rounded-lg outline-none resize-none text-sm text-foreground placeholder:text-foreground/30 py-2.5 px-3 focus:border-[#bd28b3]/30 dark:focus:border-[#bd28b3]/30 focus:ring-1 focus:ring-[#bd28b3]/10 transition-all"
                rows={2}
                style={{ minHeight: '60px', maxHeight: '120px' }}
              />
            )}
          </div>
        </div>

        {/* Navigation — stays fixed, no slide */}
        <div className="px-4 pb-3 flex items-center justify-between">
          {!isFirstQuestion ? (
            <button
              onClick={handleBack}
              disabled={isAnimating}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 text-foreground/50 hover:text-foreground/80 hover:bg-stone-100/60 dark:hover:bg-white/5 active:scale-[0.97] disabled:opacity-40"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={!canProceed() || isGenerating || isAnimating}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              canProceed() && !isGenerating
                ? 'bg-[#bd28b3]/90 hover:bg-[#bd28b3] text-white shadow-sm shadow-[#bd28b3]/20 active:scale-[0.97]'
                : 'bg-stone-200/50 dark:bg-white/5 text-foreground/30 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Building...</span>
              </>
            ) : isLastQuestion ? (
              <>
                <span>Build Workflow</span>
                <Check className="h-3 w-3" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
