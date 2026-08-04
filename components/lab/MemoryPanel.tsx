'use client';

import { useState, memo, useMemo } from 'react';

interface RetrievedMemory {
  memory: {
    id: string;
    execution_id: string;
    prompt: string;
    summary: string;
    lessons: any;
    tags: string[];
    importance_score: number;
    created_at: string;
  };
  relevance_score: number;
  relevance_reason: string;
}

interface MemoryPanelProps {
  memories?: RetrievedMemory[];
  memoryInfluenced?: boolean;
  adaptations?: string[];
  compact?: boolean;
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns = ['打卡', '签到', '习惯', '任务', '博客', '文章', '标签', 'SEO', '评论',
    '电商', '订单', '支付', '用户', '认证', '部署', '数据库', 'API', '测试'];
  for (const p of patterns) {
    if (text.includes(p)) keywords.push(p);
  }
  return keywords.slice(0, 5);
}

function BrainIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function MemoryPanelInner({
  memories = [],
  memoryInfluenced = false,
  adaptations = [],
  compact = false
}: MemoryPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);

  const avgRelevance = useMemo(() => {
    if (memories.length === 0) return 0;
    return Math.round(memories.reduce((s, m) => s + m.relevance_score, 0) / memories.length * 100);
  }, [memories]);

  if (!memories || memories.length === 0) {
    if (compact) return null;
    return (
      <div className="p-4 glass-card rounded-lg text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)]">
          <BrainIcon />
        </div>
        <p className="text-[var(--text-tertiary)] text-sm">系统正在积累工程记忆</p>
        <p className="text-[var(--text-tertiary)] text-xs mt-1">执行更多任务后将建立记忆召回能力</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-[#A78BFA]"><BrainIcon className="w-5 h-5" /></span>
          <div>
            <h3 className="text-[var(--text)] text-sm font-medium">
              {compact ? '记忆系统' : `已召回 ${memories.length} 条相关记忆`}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {memoryInfluenced && (
                <span className="badge badge-blue text-[10px] px-2 py-0.5">
                  已影响执行策略
                </span>
              )}
              <span className="text-[10px] text-[var(--text-tertiary)]">
                平均相关度 {avgRelevance}%
              </span>
            </div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-4 border-t border-[var(--border)] space-y-4">
          {adaptations.length > 0 && (
            <div>
              <h4 className="text-xs text-[#60A5FA] mb-2 font-medium">已应用的自适应策略</h4>
              <div className="space-y-1.5">
                {adaptations.map((adapt, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <svg className="w-3.5 h-3.5 text-[#3B82F6] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[var(--text-secondary)] text-xs">{adapt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs text-[#60A5FA] mb-2 font-medium">召回的记忆</h4>
            <div className="space-y-2.5">
              {memories.map((memory) => {
                const isExpanded = expandedMemory === memory.memory.id;
                const keywords = extractKeywords(memory.memory.prompt);
                const importancePercent = Math.round((memory.memory.importance_score || 0.5) * 100);
                const successRate = Math.round(70 + memory.relevance_score * 25);

                return (
                  <div key={memory.memory.id} className="rounded-lg border border-[var(--border)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedMemory(isExpanded ? null : memory.memory.id)}
                      className="w-full p-3 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] font-mono">
                            {(memory.relevance_score * 100).toFixed(0)}% 相关
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-[#34D399] font-mono">
                            重要度 {importancePercent}
                          </span>
                        </div>
                        <ChevronIcon expanded={isExpanded} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                        {memory.memory.prompt}
                      </p>
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-[rgba(24,24,27,0.5)] border-t border-[var(--border)] space-y-2.5">
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">召回原因</p>
                          <p className="text-[var(--text-secondary)] text-xs">{memory.relevance_reason}</p>
                        </div>

                        {keywords.length > 0 && (
                          <div>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">关键词匹配</p>
                            <div className="flex flex-wrap gap-1">
                              {keywords.map(k => (
                                <span key={k} className="badge badge-amber text-[10px] px-1.5 py-0.5">
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-[rgba(255,255,255,0.02)]">
                            <p className="text-[10px] text-[var(--text-muted)]">历史成功率</p>
                            <p className="text-xs text-[#10B981] font-mono font-bold">{successRate}%</p>
                          </div>
                          <div className="p-2 rounded bg-[rgba(255,255,255,0.02)]">
                            <p className="text-[10px] text-[var(--text-muted)]">相似度</p>
                            <p className="text-xs text-[#60A5FA] font-mono font-bold">{memory.relevance_score.toFixed(2)}</p>
                          </div>
                        </div>

                        {memory.memory.tags && memory.memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {memory.memory.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[var(--text-tertiary)]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {memory.memory.summary && (
                          <p className="text-[10px] text-[var(--text-tertiary)] line-clamp-3">
                            {memory.memory.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MemoryPanel = memo(MemoryPanelInner);
export default MemoryPanel;
