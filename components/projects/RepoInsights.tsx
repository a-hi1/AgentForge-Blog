'use client';

import { RepoMeta } from '../../lib/github/importer';
import { CodeAnalysis } from '../../lib/github/codeAnalyzer';
import { MaturityResult } from '../../lib/projects/maturityAnalyzer';
import { useState } from 'react';
import CopyPromptButton from '../prompt/CopyPromptButton';

interface Props {
  repoMeta: RepoMeta;
  codeAnalysis: CodeAnalysis;
  maturity: MaturityResult;
  recommendations: { title: string; prompt: string }[];
  onRefresh?: () => void;
}

export default function RepoInsights({ repoMeta, codeAnalysis, maturity, recommendations, onRefresh }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const getLevelColor = (score: number) => {
    if (score >= 86) return 'text-emerald-500 bg-emerald-500/10';
    if (score >= 71) return 'text-blue-500 bg-blue-500/10';
    if (score >= 51) return 'text-yellow-500 bg-yellow-500/10';
    if (score >= 31) return 'text-orange-500 bg-orange-500/10';
    return 'text-red-500 bg-red-500/10';
  };

  const architectureLabels = {
    monolith: '单体应用',
    fullstack: '全栈应用',
    frontend: '前端应用',
    'api-first': 'API 优先'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <a
              href={`https://github.com/${repoMeta.owner}/${repoMeta.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              {repoMeta.owner}/{repoMeta.name}
            </a>
          </h2>
          {repoMeta.description && (
            <p className="text-gray-400 mt-1">{repoMeta.description}</p>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            刷新分析
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-gray-400">成熟度评分</div>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-3xl font-bold ${getLevelColor(maturity.score).split(' ')[0]}`}>
              {maturity.score}
            </span>
            <span className="text-gray-500 mb-1">/100</span>
          </div>
          <div className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${getLevelColor(maturity.score)}`}>
            {maturity.levelLabel}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-gray-400">开发阶段</div>
          <div className="text-xl font-bold mt-1">{maturity.phaseLabel}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-gray-400">Stars</div>
          <div className="text-xl font-bold mt-1">{repoMeta.stars.toLocaleString()}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-gray-400">架构类型</div>
          <div className="text-xl font-bold mt-1">{architectureLabels[codeAnalysis.architecture]}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="font-semibold mb-3">技术栈</h3>
          <div className="flex flex-wrap gap-2">
            {codeAnalysis.techStack.map((tech, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm"
              >
                {tech}
              </span>
            ))}
            {codeAnalysis.techStack.length === 0 && (
              <span className="text-gray-500 text-sm">未识别到技术栈</span>
            )}
          </div>

          <h3 className="font-semibold mt-5 mb-3">文件结构</h3>
          <div className="text-gray-300 font-mono text-sm bg-slate-900/50 p-3 rounded-lg">
            {codeAnalysis.directorySummary}
          </div>

          <h3 className="font-semibold mt-5 mb-3">已识别功能</h3>
          <div className="flex flex-wrap gap-2">
            {codeAnalysis.features.map((f, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm"
              >
                {f}
              </span>
            ))}
            {codeAnalysis.features.length === 0 && (
              <span className="text-gray-500 text-sm">未识别到功能模块</span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="font-semibold mb-3">缺失模块</h3>
          <div className="space-y-2">
            {codeAnalysis.missingModules.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-orange-300">
                <span>⚠️</span>
                <span>{m}</span>
              </div>
            ))}
            {codeAnalysis.missingModules.length === 0 && (
              <span className="text-emerald-400">✅ 核心模块齐全</span>
            )}
          </div>

          <h3 className="font-semibold mt-5 mb-3">推荐 Prompt</h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3 bg-slate-900/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-indigo-300">{rec.title}</span>
                  <CopyPromptButton text={rec.prompt} label="复制" variant="compact" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
