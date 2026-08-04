'use client';

import { RepoMeta } from '../../lib/github/importer';
import { CodeAnalysis } from '../../lib/github/codeAnalyzer';
import { MaturityResult } from '../../lib/projects/maturityAnalyzer';
import CopyPromptButton from '../prompt/CopyPromptButton';

interface Props {
  repoMeta: RepoMeta;
  codeAnalysis: CodeAnalysis;
  maturity: MaturityResult;
  recommendations: { title: string; prompt: string }[];
  onRefresh?: () => void;
}

function HealthIndicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--text-tertiary)]">{label}</span>
      {ok ? (
        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
          已配置
        </span>
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20">
          缺失
        </span>
      )}
    </div>
  );
}

function getDebtColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

export default function RepoInsights({
  repoMeta,
  codeAnalysis,
  maturity,
  recommendations,
  onRefresh,
}: Props) {
  const getLevelColor = (score: number) => {
    if (score >= 86) return 'text-emerald-400 bg-emerald-500/10';
    if (score >= 71) return 'text-blue-400 bg-blue-500/10';
    if (score >= 51) return 'text-amber-400 bg-amber-500/10';
    if (score >= 31) return 'text-orange-400 bg-orange-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const architectureLabels = {
    monolith: '单体应用',
    fullstack: '全栈应用',
    frontend: '前端应用',
    'api-first': 'API 优先',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <a
              href={`https://github.com/${repoMeta.owner}/${repoMeta.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 hover:text-violet-200 transition-colors"
            >
              {repoMeta.owner}/{repoMeta.name}
            </a>
          </h2>
          {repoMeta.description && (
            <p className="text-[var(--text-tertiary)] mt-1">{repoMeta.description}</p>
          )}
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh} className="btn-secondary shrink-0">
            刷新分析
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="text-sm text-[var(--text-muted)]">成熟度评分</div>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-3xl font-bold ${getLevelColor(maturity.score).split(' ')[0]}`}>
              {maturity.score}
            </span>
            <span className="text-[var(--text-muted)] mb-1">/100</span>
          </div>
          <div className={`inline-block mt-2 px-2 py-0.5 rounded-md text-xs ${getLevelColor(maturity.score)}`}>
            {maturity.levelLabel}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-sm text-[var(--text-muted)]">开发阶段</div>
          <div className="text-xl font-bold text-white mt-1">{maturity.phaseLabel}</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-sm text-[var(--text-muted)]">Stars</div>
          <div className="text-xl font-bold text-white mt-1">{repoMeta.stars.toLocaleString()}</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-sm text-[var(--text-muted)]">架构类型</div>
          <div className="text-xl font-bold text-white mt-1">
            {architectureLabels[codeAnalysis.architecture]}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">仓库健康度</h3>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getDebtColor(codeAnalysis.health.techDebtScore)}`}>
              {codeAnalysis.health.techDebtScore}
            </span>
            <span className="text-xs text-[var(--text-muted)]">/100</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <HealthIndicator label="测试覆盖" ok={codeAnalysis.health.hasTests} />
          <HealthIndicator label="文档" ok={codeAnalysis.health.hasDocs} />
          <HealthIndicator label="CI/CD" ok={codeAnalysis.health.hasCI} />
          <HealthIndicator label="代码规范" ok={codeAnalysis.health.hasLinting} />
          <HealthIndicator label="TypeScript" ok={codeAnalysis.health.hasTypeScript} />
          <HealthIndicator label="环境变量示例" ok={codeAnalysis.health.hasEnvExample} />
        </div>

        {codeAnalysis.health.suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">自动生成建议</h4>
            <div className="space-y-2">
              {codeAnalysis.health.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/[0.03] rounded-xl border border-[var(--border)]"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-[var(--text-secondary)]">{s.issue}</span>
                  </div>
                  <CopyPromptButton text={s.prompt} label="生成 Prompt" variant="compact" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3">技术栈</h3>
          <div className="flex flex-wrap gap-2">
            {codeAnalysis.techStack.map((tech, i) => (
              <span key={i} className="badge badge-violet">
                {tech}
              </span>
            ))}
            {codeAnalysis.techStack.length === 0 && (
              <span className="text-[var(--text-muted)] text-sm">未识别到技术栈</span>
            )}
          </div>

          <h3 className="font-semibold text-white mt-5 mb-3">文件结构</h3>
          <div className="text-[var(--text-secondary)] font-mono text-sm bg-black/20 border border-[var(--border)] p-3 rounded-xl">
            {codeAnalysis.directorySummary}
          </div>

          <h3 className="font-semibold text-white mt-5 mb-3">已识别功能</h3>
          <div className="flex flex-wrap gap-2">
            {codeAnalysis.features.map((f, i) => (
              <span key={i} className="badge badge-green">
                {f}
              </span>
            ))}
            {codeAnalysis.features.length === 0 && (
              <span className="text-[var(--text-muted)] text-sm">未识别到功能模块</span>
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3">缺失模块</h3>
          <div className="space-y-2">
            {codeAnalysis.missingModules.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-amber-300 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{m}</span>
              </div>
            ))}
            {codeAnalysis.missingModules.length === 0 && (
              <span className="text-emerald-400 text-sm">核心模块齐全</span>
            )}
          </div>

          <h3 className="font-semibold text-white mt-5 mb-3">推荐 Prompt</h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3 bg-white/[0.03] rounded-xl border border-[var(--border)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-violet-300">{rec.title}</span>
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
