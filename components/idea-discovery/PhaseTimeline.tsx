'use client';

import React from 'react';
import { DiscoveryPhase, CollectedFacts } from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';

interface PhaseTimelineProps {
  allPhases: DiscoveryPhase[];
  getPhaseStatus: (phase: DiscoveryPhase) => 'pending' | 'active' | 'completed';
  collectedFacts?: CollectedFacts;
  onPhaseClick?: (phase: DiscoveryPhase) => void;
}

function getPhaseSummary(phase: DiscoveryPhase, facts?: CollectedFacts): string {
  if (!facts) return '';
  const f = facts as Record<string, unknown>;
  switch (phase) {
    case 'idea_deconstruction':
      return facts.ideaDeconstruction?.coreInsights?.[0]?.slice(0, 35) || '';
    case 'reality_assessment':
      return facts.marketReality?.whyCrowded?.slice(0, 35) || '';
    case 'differentiation_analysis':
      return facts.differentiation?.entryPoint?.slice(0, 35) || '';
    case 'mvp_shrink':
      return facts.mvp?.mustHave?.[0]?.slice(0, 35) || '';
    case 'validation_path':
      return (
        facts.selectedDirection?.name ||
        (f.possibleDirections as Array<{ name?: string }> | undefined)?.[0]?.name ||
        ''
      );
    case 'final_confirmation':
      return facts.finalReport?.worthDoing || '';
    default:
      return '';
  }
}

export function PhaseTimeline({
  allPhases,
  getPhaseStatus,
  collectedFacts,
  onPhaseClick,
}: PhaseTimelineProps) {
  return (
    <div className="relative">
      {allPhases.map((phase, index) => {
        const status = getPhaseStatus(phase);
        const summary = getPhaseSummary(phase, collectedFacts);
        const isLast = index === allPhases.length - 1;

        return (
          <div
            key={phase}
            className={`relative flex gap-3 cursor-pointer group ${!isLast ? 'pb-6' : ''}`}
            onClick={() => onPhaseClick?.(phase)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPhaseClick?.(phase);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {!isLast && (
              <div className="absolute left-[11px] top-6 w-0.5 h-full bg-white/[0.08]">
                {status === 'completed' && (
                  <div className="absolute inset-0 bg-emerald-500/80" />
                )}
              </div>
            )}

            <div className="relative z-10 shrink-0 mt-0.5">
              {status === 'completed' ? (
                <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : status === 'active' ? (
                <div className="w-6 h-6 rounded-md bg-violet-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-[var(--border-strong)]" />
              )}
            </div>

            <div className={`min-w-0 flex-1 ${status === 'pending' ? 'opacity-40' : ''}`}>
              <div
                className={`text-sm font-medium ${
                  status === 'active'
                    ? 'text-violet-300'
                    : status === 'completed'
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-muted)]'
                }`}
              >
                {getPhaseName(phase)}
              </div>
              {summary && status === 'completed' && (
                <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  {summary}
                  {summary.length >= 35 ? '…' : ''}
                </div>
              )}
              {status === 'active' && (
                <div className="text-xs text-violet-400/80 mt-0.5">进行中…</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
