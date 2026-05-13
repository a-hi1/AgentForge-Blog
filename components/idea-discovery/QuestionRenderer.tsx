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
      const options = question.options || [];
      const isGridLayout = options.length >= 4;
      
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-200 font-medium text-lg">{question.text}</p>
            {question.context && (
              <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2">
                💡 {question.context}
              </p>
            )}
          </div>
          
          <div className={`${isGridLayout ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => onChange(option.id)}
                className={`group relative text-left rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] ${
                  answer === option.id
                    ? 'border-violet-500 bg-violet-500/15 text-violet-200 shadow-lg shadow-violet-500/20'
                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-750'
                }`}
              >
                {answer === option.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                )}
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
      const mcOptions = question.options || [];
      const isMcGridLayout = mcOptions.length >= 4;
      
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-200 font-medium text-lg">{question.text}</p>
            {question.context && (
              <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2">
                💡 {question.context}
              </p>
            )}
            {currentAnswers.length > 0 && (
              <p className="text-xs text-violet-400">
                已选择 {currentAnswers.length} 项
              </p>
            )}
          </div>
          
          <div className={`${isMcGridLayout ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
            {mcOptions.map((option) => {
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
                  className={`group text-left rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500/15 text-violet-200 shadow-lg shadow-violet-500/20'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500'
                          : 'border-slate-500 group-hover:border-slate-400'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
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
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-200 font-medium text-lg">{question.text}</p>
            {question.context && (
              <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2">
                💡 {question.context}
              </p>
            )}
          </div>
          <textarea
            value={answer || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none transition-all"
            rows={3}
          />
        </div>
      );

    case 'confirmation':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-200 font-medium text-lg">{question.text}</p>
            {question.context && (
              <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2">
                💡 {question.context}
              </p>
            )}
          </div>
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => onChange(true)}
              className={`flex-1 rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] ${
                answer === true
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200 shadow-lg shadow-emerald-500/20'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-emerald-600/50 hover:bg-emerald-500/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">✓</span>
                <span className="font-medium">是</span>
              </div>
            </button>
            <button
              onClick={() => onChange(false)}
              className={`flex-1 rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] ${
                answer === false
                  ? 'border-red-500 bg-red-500/15 text-red-200 shadow-lg shadow-red-500/20'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-red-600/50 hover:bg-red-500/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">✗</span>
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
