'use client';

import React from 'react';
import { DiscoveryPhase } from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';

interface PhaseCardProps {
  phase: DiscoveryPhase;
  isActive: boolean;
  isCompleted: boolean;
  analysis?: string;
  data?: Record<string, unknown>;
}

export function PhaseCard({ phase, isActive, isCompleted, analysis, data }: PhaseCardProps) {
  const phaseName = getPhaseName(phase);

  return (
    <div
      className={`mb-6 rounded-xl border ${
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

      {data && renderPhaseContent(phase, data)}
    </div>
  );
}

function renderPhaseContent(phase: DiscoveryPhase, data: Record<string, unknown>) {
  switch (phase) {
    case 'idea_deconstruction':
      return null;

    case 'reality_assessment': {
      const mr = data.marketReality as Record<string, unknown> | undefined;
      if (!mr) return null;
      return (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-zinc-400">为什么拥挤：</span>
            <span className="text-zinc-200 ml-2">{String(mr.whyCrowded || '-')}</span>
          </div>
          <div>
            <span className="text-zinc-400">巨头：</span>
            {Array.isArray(mr.giants) && (mr.giants as string[]).map((g, i) => (
              <span key={i} className="text-zinc-200 ml-2">{g}</span>
            ))}
          </div>
          <div>
            <span className="text-zinc-400">机会方向：</span>
            <ul className="mt-1 ml-4 space-y-1">
              {Array.isArray(mr.nicheOpportunities) && (mr.nicheOpportunities as string[]).map((o, i) => (
                <li key={i} className="text-emerald-400">✓ {o}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-zinc-400">千万别碰：</span>
            <ul className="mt-1 ml-4 space-y-1">
              {Array.isArray(mr.avoidAreas) && (mr.avoidAreas as string[]).map((a, i) => (
                <li key={i} className="text-red-400">✗ {a}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    case 'differentiation_analysis': {
      const diff = data.differentiation as Record<string, unknown> | undefined;
      if (!diff) return null;
      return (
        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-zinc-800 p-3">
            <div className="text-zinc-400 mb-1">具体切入点：</div>
            <div className="text-zinc-200">{String(diff.entryPoint || '-')}</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-3">
            <div className="text-zinc-400 mb-1">最容易成功的用户群：</div>
            <div className="text-zinc-200">{String(diff.easiestUserGroup || '-')}</div>
          </div>
          <div className="rounded-lg bg-violet-900/30 p-3 border border-violet-500/30">
            <div className="text-violet-300 mb-1">最小差异化：</div>
            <div className="text-violet-100">{String(diff.minimalDifferentiation || '-')}</div>
          </div>
        </div>
      );
    }

    case 'mvp_shrink': {
      const mvp = data.mvp as Record<string, unknown> | undefined;
      if (!mvp) return null;
      return (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-900/20 p-3 border border-emerald-500/30">
              <div className="text-emerald-400 mb-2 font-medium">必须做：</div>
              <ul className="space-y-1">
                {Array.isArray(mvp.mustHave) && (mvp.mustHave as string[]).map((m, i) => (
                  <li key={i} className="text-emerald-300">• {m}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-red-900/20 p-3 border border-red-500/30">
              <div className="text-red-400 mb-2 font-medium">暂时不做：</div>
              <ul className="space-y-1">
                {Array.isArray(mvp.mustNotDo) && (mvp.mustNotDo as string[]).map((m, i) => (
                  <li key={i} className="text-red-300">• {m}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-lg bg-amber-900/20 p-3 border border-amber-500/30">
            <div className="text-amber-400 mb-1 font-medium">最快验证：{String(mvp.fastestValidation || '-')}</div>
          </div>
        </div>
      );
    }

    case 'validation_path': {
      const dirs = data.directions as Array<Record<string, unknown>> | undefined;
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
      const report = data.report as Record<string, unknown> | undefined;
      if (!report) return null;
      const worth = String(report.worthDoing || '');
      return (
        <div className="space-y-3">
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            worth.includes('值得') ? 'bg-emerald-500/20 text-emerald-300'
            : worth.includes('验证') ? 'bg-amber-500/20 text-amber-300'
            : 'bg-red-500/20 text-red-300'
          }`}>{worth}</div>
          <p className="text-zinc-300">{String(report.reason || '')}</p>
          <div className="rounded-lg bg-zinc-800 p-3">
            <div className="text-zinc-400 text-sm mb-1">从哪里开始：</div>
            <div className="text-zinc-200">{String(report.whereToStart || '')}</div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
