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
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-6 w-32 bg-[#1e293b] rounded animate-pulse" />
          <div className="h-8 w-64 bg-[#1e293b] rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-32 bg-[#1e293b] rounded-xl animate-pulse" />
            <div className="h-32 bg-[#1e293b] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">加载失败</h2>
          <p className="text-[#71717A] text-sm mb-4">{error}</p>
          <div className="p-4 bg-[#1e293b] rounded-lg text-left mb-6">
            <p className="text-[#71717A] text-xs mb-2">可能原因：</p>
            <ul className="text-[#52525B] text-xs space-y-1">
              <li>• 模型服务限流</li>
              <li>• Supabase 未连接</li>
            </ul>
            <p className="text-[#71717A] text-xs mt-3">建议：重新执行 或 检查环境变量</p>
          </div>
          <button
            onClick={loadExecutions}
            className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#60A5FA] transition-colors text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/lab" className="text-[#60A5FA] hover:text-[#3B82F6] flex items-center gap-2 mb-4 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回实验室
          </Link>
          <h1 className="text-3xl font-bold text-[#FAFAFA] mb-2">执行对比分析</h1>
          <p className="text-[#71717A]">选择两次执行进行深度对比，包括策略差异、记忆影响和质量评分</p>
        </div>

        {executions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-[#FAFAFA] mb-2">暂无执行记录</h3>
            <p className="text-[#71717A] text-sm mb-6">请先在 Playground 中执行任务，然后返回此处进行对比分析。</p>
            <Link href="/playground" className="px-5 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 transition-all">
              前往 Playground
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-5 glass-card rounded-xl">
            <label className="block text-sm font-medium text-[#FAFAFA] mb-3">执行 A</label>
            <select
              value={selectedA || ''}
              onChange={(e) => setSelectedA(e.target.value)}
              className="w-full px-4 py-3 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#E4E4E7] focus:outline-none focus:border-[#3B82F6] text-sm"
            >
              <option value="">选择执行记录...</option>
              {executions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prompt.slice(0, 50)}... — {new Date(e.timestamp).toLocaleString('zh-CN')}
                </option>
              ))}
            </select>
          </div>
          <div className="p-5 glass-card rounded-xl">
            <label className="block text-sm font-medium text-[#FAFAFA] mb-3">执行 B</label>
            <select
              value={selectedB || ''}
              onChange={(e) => setSelectedB(e.target.value)}
              className="w-full px-4 py-3 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#E4E4E7] focus:outline-none focus:border-[#8B5CF6] text-sm"
            >
              <option value="">选择执行记录...</option>
              {executions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prompt.slice(0, 50)}... — {new Date(e.timestamp).toLocaleString('zh-CN')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!execA && !execB && executions.length > 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">👆</div>
            <p className="text-[#71717A] text-sm">请从上方选择两条执行记录进行对比分析</p>
          </div>
        )}

        {execA && execB && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 glass-card rounded-xl">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">执行 A</h3>
                {execA.status && <AgentStatus status={execA.status as any} className="mb-2" />}
                <p className="text-xs text-[#71717A] mb-2">{new Date(execA.timestamp).toLocaleString('zh-CN')}</p>
                <div className="p-3 bg-[#111113] rounded-lg">
                  <p className="text-[#A1A1AA] text-sm">{execA.prompt}</p>
                </div>
              </div>
              <div className="p-5 glass-card rounded-xl">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">执行 B</h3>
                {execB.status && <AgentStatus status={execB.status as any} className="mb-2" />}
                <p className="text-xs text-[#71717A] mb-2">{new Date(execB.timestamp).toLocaleString('zh-CN')}</p>
                <div className="p-3 bg-[#111113] rounded-lg">
                  <p className="text-[#A1A1AA] text-sm">{execB.prompt}</p>
                </div>
              </div>
            </div>

            <div className="p-5 glass-card rounded-xl">
              <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">策略差异分析</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(99,102,241,0.2)]">
                  <h4 className="text-xs text-[#6366F1] font-medium mb-3">执行 A 策略</h4>
                  <div className="space-y-1.5">
                    {execA.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-[#52525B] w-4">{i + 1}.</span>
                        <AgentBadge agent={s.agent} size="sm" />
                        <span className="text-[#A1A1AA] truncate">{s.task.slice(0, 40)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(139,92,246,0.2)]">
                  <h4 className="text-xs text-[#8B5CF6] font-medium mb-3">执行 B 策略</h4>
                  <div className="space-y-1.5">
                    {execB.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-[#52525B] w-4">{i + 1}.</span>
                        <AgentBadge agent={s.agent} size="sm" />
                        <span className="text-[#A1A1AA] truncate">{s.task.slice(0, 40)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {execA.steps.length !== execB.steps.length && (
                <div className="mt-3 p-2.5 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)]">
                  <p className="text-[11px] text-[#F59E0B]">
                    步骤差异: A 使用 {execA.steps.length} 步，B 使用 {execB.steps.length} 步
                    {execA.steps.length > execB.steps.length ? '（B 更精简）' : '（A 更精简）'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 glass-card rounded-xl">
              <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">记忆影响对比</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#111113]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{execA.memory_influenced ? '🧠' : '💭'}</span>
                    <span className="text-xs text-[#E4E4E7] font-medium">
                      {execA.memory_influenced ? '已使用记忆' : '未使用记忆'}
                    </span>
                  </div>
                  {execA.adaptation_reason && execA.adaptation_reason.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {execA.adaptation_reason.map((r, i) => (
                        <p key={i} className="text-[11px] text-[#A1A1AA]">• {r}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-[#111113]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{execB.memory_influenced ? '🧠' : '💭'}</span>
                    <span className="text-xs text-[#E4E4E7] font-medium">
                      {execB.memory_influenced ? '已使用记忆' : '未使用记忆'}
                    </span>
                  </div>
                  {execB.adaptation_reason && execB.adaptation_reason.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {execB.adaptation_reason.map((r, i) => (
                        <p key={i} className="text-[11px] text-[#A1A1AA]">• {r}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 glass-card rounded-xl">
              <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">质量雷达图</h3>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <RadarChart
                  dataA={[qualityA.relevance, qualityA.structure, qualityA.chinese, qualityA.code]}
                  dataB={[qualityB.relevance, qualityB.structure, qualityB.chinese, qualityB.code]}
                  labels={radarLabels}
                />
                <div className="space-y-3 flex-1">
                  {radarLabels.map((label, i) => {
                    const valuesA = [qualityA.relevance, qualityA.structure, qualityA.chinese, qualityA.code];
                    const valuesB = [qualityB.relevance, qualityB.structure, qualityB.chinese, qualityB.code];
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-[11px] text-[#71717A] w-16 shrink-0">{label}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                            <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${valuesA[i]}%` }} />
                          </div>
                          <span className="text-[10px] text-[#6366F1] font-mono w-8">{valuesA[i]}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                            <div className="h-full bg-[#8B5CF6] rounded-full" style={{ width: `${valuesB[i]}%` }} />
                          </div>
                          <span className="text-[10px] text-[#8B5CF6] font-mono w-8">{valuesB[i]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 glass-card rounded-xl">
              <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">Agent 贡献对比</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs text-[#6366F1] mb-3 font-medium">执行 A</h4>
                  {Object.entries(statsA).map(([agent, count]) => (
                    <div key={agent} className="mb-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <AgentBadge agent={agent} size="sm" />
                        <span className="text-[#A1A1AA] text-xs">{count} 步</span>
                      </div>
                      <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                        <div className="h-full bg-[#6366F1]" style={{ width: `${(count / Object.values(statsA).reduce((a, b) => a + b, 0)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-xs text-[#8B5CF6] mb-3 font-medium">执行 B</h4>
                  {Object.entries(statsB).map(([agent, count]) => (
                    <div key={agent} className="mb-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <AgentBadge agent={agent} size="sm" />
                        <span className="text-[#A1A1AA] text-xs">{count} 步</span>
                      </div>
                      <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                        <div className="h-full bg-[#8B5CF6]" style={{ width: `${(count / Object.values(statsB).reduce((a, b) => a + b, 0)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 glass-card rounded-xl">
              <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">逐步骤对比</h3>
              <div className="space-y-4">
                {Array.from({ length: Math.max(execA.steps.length, execB.steps.length) }).map((_, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border ${execA.steps[index] ? 'border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.03)]' : 'border-[rgba(255,255,255,0.04)] opacity-40'}`}>
                      {execA.steps[index] && (
                        <>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] text-[#52525B]">步骤 {index + 1}</span>
                            <AgentBadge agent={execA.steps[index].agent} size="sm" />
                          </div>
                          <p className="text-xs text-[#A1A1AA] mb-1.5">{execA.steps[index].task}</p>
                          <div className="p-2 bg-[#111113] rounded text-[11px] font-mono text-[#71717A] max-h-24 overflow-y-auto">
                            {execA.steps[index].output.slice(0, 200)}...
                          </div>
                        </>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg border ${execB.steps[index] ? 'border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.03)]' : 'border-[rgba(255,255,255,0.04)] opacity-40'}`}>
                      {execB.steps[index] && (
                        <>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] text-[#52525B]">步骤 {index + 1}</span>
                            <AgentBadge agent={execB.steps[index].agent} size="sm" />
                          </div>
                          <p className="text-xs text-[#A1A1AA] mb-1.5">{execB.steps[index].task}</p>
                          <div className="p-2 bg-[#111113] rounded text-[11px] font-mono text-[#71717A] max-h-24 overflow-y-auto">
                            {execB.steps[index].output.slice(0, 200)}...
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateAgentStats(steps: ExecutionStep[]) {
  const stats: Record<string, number> = {};
  steps.forEach((step) => {
    stats[step.agent] = (stats[step.agent] || 0) + 1;
  });
  return stats;
}
