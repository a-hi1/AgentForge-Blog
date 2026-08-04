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

export function PhaseCard({
  phase,
  isActive,
  isCompleted,
  analysis,
  collectedFacts,
  mode = 'expanded',
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(mode === 'expanded');
  const phaseName = getPhaseName(phase);

  if (mode === 'compact' && isCompleted) {
    return (
      <div
        className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 cursor-pointer hover:border-[var(--border-strong)] hover:bg-white/[0.04] transition-all"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] flex-1">{phaseName}</h3>
          <svg
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {!expanded && analysis && (
          <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 ml-7">{analysis}</p>
        )}
        {expanded && (
          <div className="mt-3 ml-7">
            {analysis && (
              <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">{analysis}</p>
            )}
            {collectedFacts && renderPhaseDetails(phase, collectedFacts)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isActive
          ? 'border-violet-500/50 bg-violet-500/10 shadow-glow-sm'
          : isCompleted
            ? 'border-emerald-500/25 bg-emerald-500/5'
            : 'border-[var(--border)] bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
            isActive
              ? 'bg-violet-500 text-white'
              : isCompleted
                ? 'bg-emerald-500 text-white'
                : 'bg-white/[0.06] text-[var(--text-muted)]'
          }`}
        >
          {isCompleted ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
        <h3 className={`text-lg font-semibold ${isActive ? 'text-violet-300' : 'text-white'}`}>
          {phaseName}
        </h3>
      </div>

      {analysis && (
        <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">{analysis}</p>
      )}

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
            <div className="rounded-xl bg-violet-500/10 p-4 border border-violet-500/25">
              <div className="text-violet-300 font-medium mb-2">核心洞察</div>
              <ul className="space-y-2">
                {deconstruction.coreInsights.map((insight, i) => (
                  <li key={i} className="text-violet-100/90 flex items-start gap-2">
                    <svg className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>{insight}</span>
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
            <span className="text-[var(--text-muted)]">为什么拥挤：</span>
            <span className="text-[var(--text-secondary)] ml-2">{mr.whyCrowded || '-'}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">巨头：</span>
            {Array.isArray(mr.giants) &&
              mr.giants.map((g, i) => (
                <span key={i} className="text-[var(--text-secondary)] ml-2">
                  {g}
                </span>
              ))}
          </div>
          <div>
            <span className="text-[var(--text-muted)]">机会方向：</span>
            <ul className="mt-1 ml-4 space-y-1">
              {Array.isArray(mr.nicheOpportunities) &&
                mr.nicheOpportunities.map((o, i) => (
                  <li key={i} className="text-emerald-400 flex items-start gap-1.5">
                    <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>{o}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">千万别碰：</span>
            <ul className="mt-1 ml-4 space-y-1">
              {Array.isArray(mr.avoidAreas) &&
                mr.avoidAreas.map((a, i) => (
                  <li key={i} className="text-red-400 flex items-start gap-1.5">
                    <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    <span>{a}</span>
                  </li>
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
          <div className="rounded-xl bg-white/[0.03] border border-[var(--border)] p-3">
            <div className="text-[var(--text-muted)] mb-1">具体切入点</div>
            <div className="text-[var(--text-secondary)]">{diff.entryPoint || '-'}</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-[var(--border)] p-3">
            <div className="text-[var(--text-muted)] mb-1">最容易成功的用户群</div>
            <div className="text-[var(--text-secondary)]">{diff.easiestUserGroup || '-'}</div>
          </div>
          <div className="rounded-xl bg-violet-500/10 p-3 border border-violet-500/25">
            <div className="text-violet-300 mb-1">最小差异化</div>
            <div className="text-violet-100/90">{diff.minimalDifferentiation || '-'}</div>
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
            <div className="rounded-xl bg-emerald-500/10 p-3 border border-emerald-500/25">
              <div className="text-emerald-400 mb-2 font-medium">必须做</div>
              <ul className="space-y-1">
                {Array.isArray(mvp.mustHave) &&
                  mvp.mustHave.map((m, i) => (
                    <li key={i} className="text-emerald-300/90">• {m}</li>
                  ))}
              </ul>
            </div>
            <div className="rounded-xl bg-red-500/10 p-3 border border-red-500/25">
              <div className="text-red-400 mb-2 font-medium">暂时不做</div>
              <ul className="space-y-1">
                {Array.isArray(mvp.mustNotDo) &&
                  mvp.mustNotDo.map((m, i) => (
                    <li key={i} className="text-red-300/90">• {m}</li>
                  ))}
              </ul>
            </div>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/25">
            <div className="text-amber-300 font-medium">
              最快验证：{mvp.fastestValidation || '-'}
            </div>
          </div>
        </div>
      );
    }

    case 'validation_path': {
      const dirs = (facts as Record<string, unknown>).possibleDirections as
        | Array<Record<string, unknown>>
        | undefined;
      if (!dirs) return null;
      return (
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-muted)] mb-2">推荐方向</p>
          {dirs.map((d, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/[0.03] border border-[var(--border)] p-3 text-sm"
            >
              <div className="font-medium text-white">{String(d.name || '')}</div>
              <div className="text-[var(--text-muted)] mt-1">{String(d.whyFits || '')}</div>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                <span>风险：{String(d.riskLevel || '-')}</span>
                <span>周期：{String(d.estimateCycle || '-')}</span>
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
          <div
            className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
              worth.includes('值得')
                ? 'bg-emerald-500/15 text-emerald-300'
                : worth.includes('验证')
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-red-500/15 text-red-300'
            }`}
          >
            {worth}
          </div>
          <p className="text-[var(--text-secondary)]">{report.reason || ''}</p>
          <div className="rounded-xl bg-white/[0.03] border border-[var(--border)] p-3">
            <div className="text-[var(--text-muted)] text-sm mb-1">从哪里开始</div>
            <div className="text-[var(--text-secondary)]">{report.whereToStart || ''}</div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
