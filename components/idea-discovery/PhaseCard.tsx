'use client';

import React from 'react';
import { DiscoveryPhase } from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';

interface PhaseCardProps {
  phase: DiscoveryPhase;
  isActive: boolean;
  isCompleted: boolean;
  analysis?: string;
  data?: any;
}

export function PhaseCard({
  phase,
  isActive,
  isCompleted,
  analysis,
  data,
}: PhaseCardProps) {
  const phaseName = getPhaseName(phase);

  return (
    <div
      className={`mb-6 rounded-xl border ${
        isActive
          ? 'border-purple-500 bg-purple-500/10'
          : isCompleted
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-slate-700 bg-slate-800/50'
      } p-5 transition-all`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            isActive
              ? 'bg-purple-500 text-white animate-pulse'
              : isCompleted
              ? 'bg-green-500 text-white'
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {isCompleted ? '✓' : '➤'}
        </div>
        <h3
          className={`text-lg font-semibold ${
            isActive ? 'text-purple-300' : 'text-slate-200'
          }`}
        >
          {phaseName}
        </h3>
      </div>

      {analysis && (
        <p className="text-slate-300 mb-4 leading-relaxed">{analysis}</p>
      )}

      {/* 这里可以渲染不同阶段的具体数据 */}
      {data && renderPhaseData(phase, data)}
    </div>
  );
}

function renderPhaseData(phase: DiscoveryPhase, data: any) {
  switch (phase) {
    case 'idea_deconstruction':
      return (
        data.possibleDirections && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400 mb-2">可能的方向：</p>
            {data.possibleDirections.map((d: any) => (
              <div
                key={d.id}
                className="rounded-lg bg-slate-800 p-3 text-sm"
              >
                <div className="font-medium text-white">{d.name}</div>
                <div className="text-slate-400">{d.description}</div>
              </div>
            ))}
          </div>
        )
      );
    case 'reality_assessment':
      return (
        data.marketAssessment && (
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-400">为什么拥挤：</span>
              <span className="text-slate-200 ml-2">
                {data.marketAssessment.whyCrowded}
              </span>
            </div>
            <div>
              <span className="text-slate-400">巨头：</span>
              <span className="text-slate-200 ml-2">
                {data.marketAssessment.whoAreGiants}
              </span>
            </div>
            <div>
              <span className="text-slate-400">机会方向：</span>
              <ul className="mt-1 ml-4 space-y-1">
                {data.marketAssessment.opportunityDirections.map(
                  (o: string, i: number) => (
                    <li key={i} className="text-green-400">✓ {o}</li>
                  )
                )}
              </ul>
            </div>
            <div>
              <span className="text-slate-400">千万别碰：</span>
              <ul className="mt-1 ml-4 space-y-1">
                {data.marketAssessment.avoidDirections.map(
                  (a: string, i: number) => (
                    <li key={i} className="text-red-400">✗ {a}</li>
                  )
                )}
              </ul>
            </div>
          </div>
        )
      );
    case 'differentiation_analysis':
      return (
        data.differentiation && (
          <div className="space-y-2 text-sm">
            <div className="rounded-lg bg-slate-800 p-3">
              <div className="text-slate-400 mb-1">用户为什么会用：</div>
              <div className="text-slate-200">{data.differentiation.whyUse}</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-3">
              <div className="text-slate-400 mb-1">用户为什么会离开：</div>
              <div className="text-slate-200">{data.differentiation.whyLeave}</div>
            </div>
            <div className="rounded-lg bg-purple-900/30 p-3 border border-purple-500/30">
              <div className="text-purple-300 mb-1">最小差异化：</div>
              <div className="text-purple-100">{data.differentiation.minimalDifferentiation}</div>
            </div>
          </div>
        )
      );
    case 'mvp_shrink':
      return (
        data.mvp && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-green-900/20 p-3 border border-green-500/30">
              <div className="text-green-400 mb-2 font-medium">必须有：</div>
              <ul className="space-y-1">
                {data.mvp.mustHave.map((m: string, i: number) => (
                  <li key={i} className="text-green-300">• {m}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-red-900/20 p-3 border border-red-500/30">
              <div className="text-red-400 mb-2 font-medium">绝对不能做：</div>
              <ul className="space-y-1">
                {data.mvp.mustNotDo.map((m: string, i: number) => (
                  <li key={i} className="text-red-300">• {m}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 md:col-span-2">
              <div className="text-slate-300 mb-2 font-medium">第一版只做：</div>
              <ul className="space-y-1">
                {data.mvp.firstVersionFeatures.map((f: string, i: number) => (
                  <li key={i} className="text-slate-200">→ {f}</li>
                ))}
              </ul>
            </div>
          </div>
        )
      );
    case 'validation_path':
      return (
        data.validationPath && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-amber-900/20 p-3 border border-amber-500/30">
              <div className="text-amber-400 mb-1 font-medium">最快验证方式：</div>
              <div className="text-amber-100">{data.validationPath.fastestValidation}</div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">验证步骤：</div>
              <ol className="ml-4 space-y-1">
                {data.validationPath.steps.map((s: string, i: number) => (
                  <li key={i} className="text-slate-200">{i + 1}. {s}</li>
                ))}
              </ol>
            </div>
          </div>
        )
      );
    case 'final_confirmation':
      return (
        data.report && (
          <div className="space-y-3">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              data.report.worthDoing.includes('值得') 
                ? 'bg-green-500/20 text-green-300' 
                : data.report.worthDoing.includes('验证')
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-red-500/20 text-red-300'
            }`}>
              {data.report.worthDoing}
            </div>
            <p className="text-slate-300">{data.report.worthDoingReason}</p>
            <div className="rounded-lg bg-slate-800 p-3">
              <div className="text-slate-400 text-sm mb-1">从哪里开始：</div>
              <div className="text-slate-200">{data.report.whereToStart}</div>
            </div>
            <div className="rounded-lg bg-purple-900/20 p-3 border border-purple-500/30">
              <div className="text-purple-300 text-sm mb-1">最小验证路径：</div>
              <div className="text-purple-100">{data.report.minimalValidation}</div>
            </div>
          </div>
        )
      );
    default:
      return null;
  }
}
