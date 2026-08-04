'use client';

import React from 'react';
import { DiscoveryQuestion } from '@/lib/idea-discovery';

interface QuestionRendererProps {
  question: DiscoveryQuestion;
  answer: unknown;
  onChange: (value: unknown) => void;
}

function ContextHint({ context }: { context?: string }) {
  if (!context) return null;
  return (
    <p className="text-sm text-[var(--text-tertiary)] bg-white/[0.03] border border-[var(--border)] rounded-xl px-3 py-2 flex items-start gap-2">
      <svg className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{context}</span>
    </p>
  );
}

export function QuestionRenderer({
  question,
  answer,
  onChange,
}: QuestionRendererProps) {
  switch (question.type) {
    case 'single_choice': {
      const options = question.options || [];
      const isGridLayout = options.length >= 4;

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-white font-medium text-lg">{question.text}</p>
            <ContextHint context={question.context} />
          </div>

          <div className={isGridLayout ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
            {options.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => onChange(option.id)}
                className={`group relative text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                  answer === option.id
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-100 shadow-glow-sm'
                    : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-white/[0.04]'
                }`}
              >
                {answer === option.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 rounded-md bg-violet-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="font-medium pr-6">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-[var(--text-muted)] mt-1">
                    {option.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'multiple_choice': {
      const currentAnswers = Array.isArray(answer) ? (answer as string[]) : [];
      const mcOptions = question.options || [];
      const isMcGridLayout = mcOptions.length >= 4;

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-white font-medium text-lg">{question.text}</p>
            <ContextHint context={question.context} />
            {currentAnswers.length > 0 && (
              <p className="text-xs text-violet-300">已选择 {currentAnswers.length} 项</p>
            )}
          </div>

          <div className={isMcGridLayout ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
            {mcOptions.map((option) => {
              const isSelected = currentAnswers.includes(option.id);
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => {
                    const newAnswers = isSelected
                      ? currentAnswers.filter((id) => id !== option.id)
                      : [...currentAnswers, option.id];
                    onChange(newAnswers);
                  }}
                  className={`group text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-violet-500/60 bg-violet-500/15 text-violet-100 shadow-glow-sm'
                      : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500'
                          : 'border-[var(--border-strong)] group-hover:border-violet-400/50'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-[var(--text-muted)] mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'text':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-white font-medium text-lg">{question.text}</p>
            <ContextHint context={question.context} />
          </div>
          <textarea
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="input-field resize-none"
            rows={3}
          />
        </div>
      );

    case 'confirmation':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-white font-medium text-lg">{question.text}</p>
            <ContextHint context={question.context} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`flex-1 rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                answer === true
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                  : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-emerald-500/40 hover:bg-emerald-500/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">是</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onChange(false)}
              className={`flex-1 rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                answer === false
                  ? 'border-red-500/60 bg-red-500/15 text-red-200'
                  : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-red-500/40 hover:bg-red-500/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-medium">否</span>
              </div>
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
