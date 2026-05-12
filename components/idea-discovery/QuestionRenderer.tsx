'use client';

import React from 'react';
import { DiscoveryQuestion } from '@/lib/idea-discovery';

interface QuestionRendererProps {
  question: DiscoveryQuestion;
  answer: any;
  onChange: (value: any) => void;
}

export function QuestionRenderer({
  question,
  answer,
  onChange,
}: QuestionRendererProps) {
  switch (question.type) {
    case 'single_choice':
      return (
        <div className="space-y-2">
          <p className="text-slate-200 font-medium">{question.text}</p>
          {question.context && (
            <p className="text-sm text-slate-400">{question.context}</p>
          )}
          <div className="space-y-2 mt-3">
            {question.options?.map((option) => (
              <button
                key={option.id}
                onClick={() => onChange(option.id)}
                className={`w-full text-left rounded-lg border p-4 transition-all ${
                  answer === option.id
                    ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-750'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-slate-400 mt-1">
                    {option.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      );

    case 'multiple_choice':
      const currentAnswers = Array.isArray(answer) ? answer : [];
      return (
        <div className="space-y-2">
          <p className="text-slate-200 font-medium">{question.text}</p>
          {question.context && (
            <p className="text-sm text-slate-400">{question.context}</p>
          )}
          <div className="space-y-2 mt-3">
            {question.options?.map((option) => {
              const isSelected = currentAnswers.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    const newAnswers = isSelected
                      ? currentAnswers.filter((id) => id !== option.id)
                      : [...currentAnswers, option.id];
                    onChange(newAnswers);
                  }}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-slate-500'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-slate-400 mt-1">
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

    case 'text':
      return (
        <div className="space-y-2">
          <p className="text-slate-200 font-medium">{question.text}</p>
          {question.context && (
            <p className="text-sm text-slate-400">{question.context}</p>
          )}
          <textarea
            value={answer || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
            rows={4}
          />
        </div>
      );

    case 'confirmation':
      return (
        <div className="space-y-2">
          <p className="text-slate-200 font-medium">{question.text}</p>
          {question.context && (
            <p className="text-sm text-slate-400">{question.context}</p>
          )}
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => onChange(true)}
              className={`flex-1 rounded-lg border p-3 transition-all ${
                answer === true
                  ? 'border-green-500 bg-green-500/10 text-green-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              ✓ 是
            </button>
            <button
              onClick={() => onChange(false)}
              className={`flex-1 rounded-lg border p-3 transition-all ${
                answer === false
                  ? 'border-red-500 bg-red-500/10 text-red-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              ✗ 否
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
