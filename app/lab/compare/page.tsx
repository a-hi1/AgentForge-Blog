'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';

interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: string;
  timestamp: string;
}

interface Execution {
  id: string;
  prompt: string;
  status?: string;
  summary?: string;
  timestamp: string;
  memory_influenced?: boolean;
  adaptation_reason?: string[];
  steps: ExecutionStep[];
}

function calculateQuality(output: string): { chinese: number; structure: number; code: number; relevance: number } {
  const cleanText = output.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
  const totalChars = cleanText.replace(/\s/g, '').length;
  const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length;
  const chinese = totalChars > 0 ? Math.min(100, Math.round(chineseChars / totalChars * 120)) : 0;

  const headingCount = (output.match(/^#{1,3}\s/gm) || []).length;
  const structure = Math.min(100, (headingCount >= 4 ? 40 : headingCount >= 2 ? 25 : 10) + (/^[-*]\s/m.test(output) ? 20 : 0) + (/```/.test(output) ? 20 : 0) + (output.length > 500 ? 20 : 0));

  let codeScore = 100;
  const fenceCount = (output.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) codeScore -= 30;
  codeScore = Math.max(0, Math.min(100, codeScore));

  let relevance = 50;
  if (/表|字段|接口|模块|组件|函数|方法/.test(output)) relevance += 25;
  if (/\d+\.\s/.test(output)) relevance += 10;
  if (/```/.test(output)) relevance += 10;
  relevance = Math.min(100, relevance);

  return { chinese, structure, code: codeScore, relevance };
}

function RadarChart({ dataA, dataB, labels }: { dataA: number[]; dataB: number[]; labels: string[] }) {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const count = labels.length;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const getPath = (data: number[]) =>
    data.map((v, i) => {
      const p = getPoint(i, v);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }).join(' ') + ' Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[25, 50, 75, 100].map(level => (
        <polygon
          key={level}
          points={labels.map((_, i) => {
            const p = getPoint(i, level);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}
      {labels.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" />;
      })}
      <path d={getPath(dataA)} fill="rgba(99,102,241,0.15)" stroke="#6366F1" strokeWidth="2" />
      <path d={getPath(dataB)} fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" strokeWidth="2" />
      {labels.map((label, i) => {
        const p = getPoint(i, 120);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" fontSize="9" fill="#A1A1AA">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export default function ComparePage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/executions');
      const data = await response.json();
      setExecutions(data);
    } catch (err) {
      console.error('加载执行列表失败:', err);
      setError('加载执行列表失败，请检查网络连接或稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const execA = selectedA ? executions.find((e) => e.id === selectedA) : null;
  const execB = selectedB ? executions.find((e) => e.id === selectedB) : null;

  const statsA = execA ? calculateAgentStats(execA.steps) : {};
  const statsB = execB ? calculateAgentStats(execB.steps) : {};

  const qualityA = useMemo(() => {
    if (!execA) return { chinese: 0, structure: 0, code: 0, relevance: 0 };
    const allOutput = execA.steps.map(s => s.output).join('\n');
    return calculateQuality(allOutput);
  }, [execA]);

  const qualityB = useMemo(() => {
    if (!execB) return { chinese: 0, structure: 0, code: 0, relevance: 0 };
    const allOutput = execB.steps.map(s => s.output).join('\n');
    return calculateQuality(allOutput);
  }, [execB]);

  const radarLabels = ['可执行性', '完整性', '中文质量', '工程准确性'];

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
        <div className="page-shell max-w-6xl space-y-6">
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.05]" />
          <div className="space-y-3 border-b border-white/[0.06] pb-8">
            <div className="h-9 w-72 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-4 w-[28rem] max-w-full animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-32 animate-pulse rounded-lg border border-white/[0.05] bg-white/[0.025]" />
            <div className="h-32 animate-pulse rounded-lg border border-white/[0.05] bg-white/[0.025]" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-144px)] items-center py-12">
        <div className="page-shell max-w-lg">
          <section className="glass-card p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#F87171]/20 bg-[#F87171]/10 text-[#F87171]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.949 3.374H4.646c-1.732 0-2.815-1.874-1.949-3.374L10.05 3.374c.866-1.5 3.032-1.5 3.898 0l7.354 12.752zM12 16.5h.008v.008H12V16.5z" />
              </svg>
            </div>
            <p className="section-label mb-3">COMPARISON DATA</p>
            <h2 className="mb-3 text-xl font-semibold text-[#FAFAFA]">加载失败</h2>
            <p className="mb-6 text-sm leading-6 text-[#A1A1AA]">{error}</p>
            <div className="mb-7 rounded-lg border border-white/[0.06] bg-black/20 p-4 text-left">
              <p className="mb-3 text-xs font-medium text-[#A1A1AA]">检查以下服务状态</p>
              <ul className="space-y-2 text-xs text-[#71717A]">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />模型服务请求配额</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />Supabase 数据连接</li>
              </ul>
            </div>
            <button onClick={loadExecutions} className="btn-primary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.023 9.348h4.992V4.356m-.997 4.993a8.25 8.25 0 10.683 8.301" />
              </svg>
              重新加载
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
      <div className="page-shell max-w-6xl">
        <header className="mb-8 border-b border-white/[0.06] pb-8">
          <Link href="/lab" className="btn-ghost mb-6 text-[#60A5FA]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
            </svg>
            返回实验室
          </Link>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="badge badge-violet mb-4">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6.75 3v18M17.25 3v18M3.75 6h6m4.5 0h6m-16.5 6h6m4.5 0h6m-16.5 6h6m4.5 0h6" />
                </svg>
                分析工具
              </span>
              <h1 className="mb-3 text-3xl font-bold text-[#FAFAFA]">执行对比分析</h1>
              <p className="max-w-2xl text-sm leading-6 text-[#A1A1AA]">选择两次执行，比较策略差异、记忆影响和输出质量。</p>
            </div>
            <div className="font-mono text-xs text-[#52525B]">{executions.length} AVAILABLE RUNS</div>
          </div>
        </header>

        {executions.length === 0 && (
          <section className="glass-card mb-8 p-10 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#71717A]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v18M17.25 3v18M3.75 6h6m4.5 0h6m-10.5 6h6m4.5 0h6" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[#FAFAFA]">暂无执行记录</h2>
            <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-[#71717A]">请先在 Playground 中执行任务，然后返回此处进行对比分析。</p>
            <Link href="/playground" className="btn-primary">
              前往 Playground
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </section>
        )}

        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          {[
            { key: 'A', value: selectedA, onChange: setSelectedA, accent: 'badge-blue', border: 'focus:border-[#3B82F6]/60' },
            { key: 'B', value: selectedB, onChange: setSelectedB, accent: 'badge-violet', border: 'focus:border-[#8B5CF6]/60' },
          ].map((selection) => (
            <div key={selection.key} className="glass-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="section-label mb-1">SELECT RUN</p>
                  <label htmlFor={`execution-${selection.key}`} className="text-sm font-semibold text-[#FAFAFA]">执行 {selection.key}</label>
                </div>
                <span className={`badge ${selection.accent}`}>{selection.key}</span>
              </div>
              <select
                id={`execution-${selection.key}`}
                value={selection.value || ''}
                onChange={(e) => selection.onChange(e.target.value)}
                className={`input-field cursor-pointer appearance-none ${selection.border}`}
              >
                <option value="">选择执行记录...</option>
                {executions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.prompt.slice(0, 50)}... — {new Date(e.timestamp).toLocaleString('zh-CN')}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>

        {!execA && !execB && executions.length > 0 && (
          <section className="mb-8 border-y border-white/[0.06] py-10 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#71717A]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 5v14m0-14l-4 4m4-4l4 4" />
              </svg>
            </div>
            <p className="text-sm text-[#71717A]">从上方选择两条执行记录开始对比。</p>
          </section>
        )}

        {execA && execB && (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {[{ exec: execA, label: '执行 A', tone: 'text-[#93C5FD]', border: 'border-[#3B82F6]/20' }, { exec: execB, label: '执行 B', tone: 'text-[#C4B5FD]', border: 'border-[#8B5CF6]/20' }].map(({ exec, label, tone, border }) => (
                <section key={label} className="glass-card p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className={`text-sm font-semibold ${tone}`}>{label}</h2>
                    {exec.status && <AgentStatus status={exec.status as any} />}
                  </div>
                  <p className="mb-3 text-[11px] text-[#71717A]">{new Date(exec.timestamp).toLocaleString('zh-CN')}</p>
                  <div className={`rounded-lg border ${border} bg-black/20 p-4`}>
                    <p className="text-sm leading-6 text-[#A1A1AA]">{exec.prompt}</p>
                  </div>
                </section>
              ))}
            </div>

            <section className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <p className="section-label mb-1">STRATEGY</p>
                <h2 className="text-base font-semibold text-[#FAFAFA]">策略差异分析</h2>
              </div>
              <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
                {[{ exec: execA, title: '执行 A 策略', tone: 'text-[#93C5FD]', border: 'border-[#3B82F6]/20' }, { exec: execB, title: '执行 B 策略', tone: 'text-[#C4B5FD]', border: 'border-[#8B5CF6]/20' }].map(({ exec, title, tone, border }) => (
                  <div key={title} className={`rounded-lg border ${border} bg-black/20 p-4`}>
                    <h3 className={`mb-4 text-xs font-medium ${tone}`}>{title}</h3>
                    <div className="space-y-2.5">
                      {exec.steps.map((s, i) => (
                        <div key={i} className="flex min-w-0 items-center gap-2 text-xs">
                          <span className="w-4 shrink-0 font-mono text-[#52525B]">{String(i + 1).padStart(2, '0')}</span>
                          <AgentBadge agent={s.agent} size="sm" />
                          <span className="truncate text-[#A1A1AA]">{s.task.slice(0, 40)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {execA.steps.length !== execB.steps.length && (
                <div className="mx-5 mb-5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/[0.05] p-3 sm:mx-6 sm:mb-6">
                  <p className="text-xs text-[#FBBF24]">步骤差异：A 使用 {execA.steps.length} 步，B 使用 {execB.steps.length} 步 {execA.steps.length > execB.steps.length ? '（B 更精简）' : '（A 更精简）'}</p>
                </div>
              )}
            </section>

            <section className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <p className="section-label mb-1">MEMORY SIGNAL</p>
                <h2 className="text-base font-semibold text-[#FAFAFA]">记忆影响对比</h2>
              </div>
              <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
                {[{ exec: execA, label: '执行 A', tone: 'text-[#93C5FD]' }, { exec: execB, label: '执行 B', tone: 'text-[#C4B5FD]' }].map(({ exec, label, tone }) => (
                  <div key={label} className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${exec.memory_influenced ? 'bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.7)]' : 'bg-[#52525B]'}`} />
                      <span className={`text-xs font-medium ${tone}`}>{label} · {exec.memory_influenced ? '已使用记忆' : '未使用记忆'}</span>
                    </div>
                    {exec.adaptation_reason && exec.adaptation_reason.length > 0 && (
                      <div className="space-y-2 border-t border-white/[0.05] pt-3">
                        {exec.adaptation_reason.map((r, i) => <p key={i} className="text-xs leading-5 text-[#A1A1AA]">{r}</p>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <p className="section-label mb-1">QUALITY PROFILE</p>
                <h2 className="text-base font-semibold text-[#FAFAFA]">质量雷达图</h2>
              </div>
              <div className="flex flex-col items-center gap-8 p-5 sm:p-6 md:flex-row">
                <RadarChart dataA={[qualityA.relevance, qualityA.structure, qualityA.chinese, qualityA.code]} dataB={[qualityB.relevance, qualityB.structure, qualityB.chinese, qualityB.code]} labels={radarLabels} />
                <div className="w-full flex-1 space-y-3">
                  <div className="mb-4 flex gap-4 text-[10px] text-[#71717A]"><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />执行 A</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />执行 B</span></div>
                  {radarLabels.map((label, i) => {
                    const valuesA = [qualityA.relevance, qualityA.structure, qualityA.chinese, qualityA.code];
                    const valuesB = [qualityB.relevance, qualityB.structure, qualityB.chinese, qualityB.code];
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-[11px] text-[#71717A]">{label}</span>
                        <div className="flex min-w-0 flex-1 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${valuesA[i]}%` }} /></div><span className="w-7 font-mono text-[10px] text-[#6366F1]">{valuesA[i]}</span></div>
                        <div className="flex min-w-0 flex-1 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${valuesB[i]}%` }} /></div><span className="w-7 font-mono text-[10px] text-[#8B5CF6]">{valuesB[i]}</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6"><p className="section-label mb-1">AGENT DISTRIBUTION</p><h2 className="text-base font-semibold text-[#FAFAFA]">Agent 贡献对比</h2></div>
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
                {[{ stats: statsA, title: '执行 A', color: '#6366F1', tone: 'text-[#93C5FD]' }, { stats: statsB, title: '执行 B', color: '#8B5CF6', tone: 'text-[#C4B5FD]' }].map(({ stats, title, color, tone }) => {
                  const total = Object.values(stats).reduce((a, b) => a + b, 0);
                  return <div key={title}><h3 className={`mb-4 text-xs font-medium ${tone}`}>{title}</h3>{Object.entries(stats).map(([agent, count]) => <div key={agent} className="mb-3"><div className="mb-1.5 flex items-center gap-2"><AgentBadge agent={agent} size="sm" /><span className="text-xs text-[#A1A1AA]">{count} 步</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full" style={{ width: `${total ? (count / total) * 100 : 0}%`, backgroundColor: color }} /></div></div>)}</div>;
                })}
              </div>
            </section>

            <section className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6"><p className="section-label mb-1">STEP DELTA</p><h2 className="text-base font-semibold text-[#FAFAFA]">逐步骤对比</h2></div>
              <div className="space-y-4 p-5 sm:p-6">
                {Array.from({ length: Math.max(execA.steps.length, execB.steps.length) }).map((_, index) => (
                  <div key={index} className="grid gap-3 lg:grid-cols-2">
                    {[{ step: execA.steps[index], color: 'border-[#6366F1]/20 bg-[#6366F1]/[0.03]' }, { step: execB.steps[index], color: 'border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.03]' }].map(({ step, color }, side) => <div key={side} className={`rounded-lg border p-3 ${step ? color : 'border-white/[0.04] bg-white/[0.01] opacity-40'}`}>{step ? <><div className="mb-2 flex items-center gap-2"><span className="font-mono text-[10px] text-[#52525B]">步骤 {index + 1}</span><AgentBadge agent={step.agent} size="sm" /></div><p className="mb-2 text-xs leading-5 text-[#A1A1AA]">{step.task}</p><div className="max-h-24 overflow-y-auto rounded border border-white/[0.04] bg-black/25 p-2 font-mono text-[11px] leading-5 text-[#71717A]">{step.output.slice(0, 200)}...</div></> : <span className="text-xs text-[#52525B]">该执行没有对应步骤</span>}</div>)}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function calculateAgentStats(steps: ExecutionStep[]) {
  const stats: Record<string, number> = {};
  steps.forEach((step) => {
    stats[step.agent] = (stats[step.agent] || 0) + 1;
  });
  return stats;
}
