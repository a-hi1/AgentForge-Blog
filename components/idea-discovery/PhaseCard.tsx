'use client';

import React, { useState } from 'react';
import { DiscoveryPhase, CollectedFacts } from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';

interface PhaseCardProps {
  phase: DiscoveryPhase;
  isActive: boolean;
  isCompleted: boolean;
  analysis?: string;
  collectedFacts?: CollectedFacts;
  mode?: 'compact' | 'expanded';
}

export function PhaseCard({ phase, isActive, isCompleted, analysis, collectedFacts, mode = 'expanded' }: PhaseCardProps) {
  const [expanded, setExpanded] = useState(mode === 'expanded');
  const phaseName = getPhaseName(phase);

  // compact模式：已完成阶段显示摘要，可点击展开
  if (mode === 'compact' && isCompleted) {
    return (
      <div
        className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 cursor-pointer hover:border-zinc-700 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-zinc-300 flex-1">{phaseName}</h3>
          <svg className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {!expanded && analysis && (
          <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 ml-7">{analysis}</p>
        )}
        {expanded && (
          <div className="mt-3 ml-7">
            {analysis && <p className="text-sm text-zinc-300 mb-3 leading-relaxed">{analysis}</p>}
            {collectedFacts && renderPhaseDetails(phase, collectedFacts)}
          </div>
        )}
      </div>
    );
  }

  // expanded模式：当前阶段显示完整内容
  return (
    <div
      className={`rounded-xl border ${
        isActive
          ? 'border-violet-500 bg-violet-500/10'
          : isCompleted
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-zinc-700 bg-zinc-800/50'
      } p-5 transition-all`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            isActive
              ? 'bg-violet-500 text-white animate-pulse'
              : isCompleted
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-700 text-zinc-400'
          }`}
        >
          {isCompleted ? '✓' : '➤'}
        </div>
        <h3 className={`text-lg font-semibold ${isActive ? 'text-violet-300' : 'text-zinc-200'}`}>
          {phaseName}
        </h3>
      </div>

      {analysis && <p className="text-zinc-300 mb-4 leading-relaxed">{analysis}</p>}

      {collectedFacts && renderPhaseDetails(phase, collectedFacts)}
    </div>
  );
}

function renderPhaseDetails(phase: DiscoveryPhase, facts: CollectedFacts) {
  switch (phase) {
    case 'idea_deconstruction': {
      const deconstruction = facts.ideaDeconstruction;
      if (!deconstruction) return null;
      return (
        <div className="space-y-3 text-sm">
          {Array.isArray(deconstruction.coreInsights) && deconstruction.coreInsights.length > 0 && (
            <div className="rounded-lg bg-violet-900/20 p-4 border border-violet-500/30">
              <div className="text-violet-300 font-medium mb-2">核心洞察：</div>
              <ul className="space-y-2">
                {deconstruction.coreInsights.map((insight, i) => (
                  <li key={i} className="text-violet-100 flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">💡</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case 'reality_assessment': {
      const mr = facts.marketReality;
      if (!mr) return null;
      return (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-zinc-400">为什么拥挤：</span>
            <span className="text-zinc-200 ml-2">{mr.whyCrowded || '-'}</span>
          </div>
          <div>
            <span className="text-zinc-400">巨头：</span>
            {Array.isArray(mr.giants) && mr.giants.map((g, i) => (
              <span key={i} className="text-zinc-200 ml-2">{g}</span>
            ))}
          </div>
          <div>
            <span className="text-zinc-400">机会方向：</span>
            <ul className="mt-1 ml-4 space-y-1">
              {Array.isArray(mr.nicheOpportunities) && mr.nicheOpportunities.map((o, i) => (
                <li key={i} className="text-emerald-400">✓ {o}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-zinc-400">千万别碰：</span>
            <ul className="mt-1 ml-4 space-y-1">
              {Array.isArray(mr.avoidAreas) && mr.avoidAreas.map((a, i) => (
                <li key={i} className="text-red-400">✗ {a}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    case 'differentiation_analysis': {
      const diff = facts.differentiation;
      if (!diff) return null;
      return (
        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-zinc-800 p-3">
            <div className="text-zinc-400 mb-1">具体切入点：</div>
            <div className="text-zinc-200">{diff.entryPoint || '-'}</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-3">
            <div className="text-zinc-400 mb-1">最容易成功的用户群：</div>
            <div className="text-zinc-200">{diff.easiestUserGroup || '-'}</div>
          </div>
          <div className="rounded-lg bg-violet-900/30 p-3 border border-violet-500/30">
            <div className="text-violet-300 mb-1">最小差异化：</div>
            <div className="text-violet-100">{diff.minimalDifferentiation || '-'}</div>
          </div>
        </div>
      );
    }

    case 'mvp_shrink': {
      const mvp = facts.mvp;
      if (!mvp) return null;
      return (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-900/20 p-3 border border-emerald-500/30">
              <div className="text-emerald-400 mb-2 font-medium">必须做：</div>
              <ul className="space-y-1">
                {Array.isArray(mvp.mustHave) && mvp.mustHave.map((m, i) => (
                  <li key={i} className="text-emerald-300">• {m}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-red-900/20 p-3 border border-red-500/30">
              <div className="text-red-400 mb-2 font-medium">暂时不做：</div>
              <ul className="space-y-1">
                {Array.isArray(mvp.mustNotDo) && mvp.mustNotDo.map((m, i) => (
                  <li key={i} className="text-red-300">• {m}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-lg bg-amber-900/20 p-3 border border-amber-500/30">
            <div className="text-amber-400 mb-1 font-medium">最快验证：{mvp.fastestValidation || '-'}</div>
          </div>
        </div>
      );
    }

    case 'validation_path': {
      const dirs = (facts as Record<string, unknown>).possibleDirections as Array<Record<string, unknown>> | undefined;
      if (!dirs) return null;
      return (
        <div className="space-y-2">
          <p className="text-sm text-zinc-400 mb-2">推荐方向：</p>
          {dirs.map((d, i) => (
            <div key={i} className="rounded-lg bg-zinc-800 p-3 text-sm">
              <div className="font-medium text-white">{String(d.name || '')}</div>
              <div className="text-zinc-400 mt-1">{String(d.whyFits || '')}</div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-zinc-500">风险：{String(d.riskLevel || '-')}</span>
                <span className="text-zinc-500">周期：{String(d.estimateCycle || '-')}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'final_confirmation': {
      const report = facts.finalReport;
      if (!report) return null;
      const worth = report.worthDoing || '';
      return (
        <div className="space-y-3">
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            worth.includes('值得') ? 'bg-emerald-500/20 text-emerald-300'
            : worth.includes('验证') ? 'bg-amber-500/20 text-amber-300'
            : 'bg-red-500/20 text-red-300'
          }`}>{worth}</div>
          <p className="text-zinc-300">{report.reason || ''}</p>
          <div className="rounded-lg bg-zinc-800 p-3">
            <div className="text-zinc-400 text-sm mb-1">从哪里开始：</div>
            <div className="text-zinc-200">{report.whereToStart || ''}</div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
