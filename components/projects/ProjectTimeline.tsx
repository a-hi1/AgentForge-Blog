'use client';

import { useEffect, useState } from 'react';
import { getPromptHistory, PromptAsset } from '@/lib/prompt/history';
import Link from 'next/link';

interface TimelineNode {
  id: string;
  type: 'idea' | 'generated' | 'executed' | 'feedback' | 'optimized';
  label: string;
  description: string;
  timestamp: string;
  promptId?: string;
  score?: number;
  feedback?: string;
  version?: number;
  outcome?: 'success' | 'partial' | 'failed';
  failureReason?: string;
}

const NODE_CONFIG: Record<TimelineNode['type'], { label: string; color: string; bgColor: string }> = {
  idea: { label: 'Idea', color: 'text-amber-300', bgColor: 'bg-amber-500/10 border-amber-500/25' },
  generated: { label: 'Gen', color: 'text-violet-300', bgColor: 'bg-violet-500/10 border-violet-500/25' },
  executed: { label: 'Run', color: 'text-blue-300', bgColor: 'bg-blue-500/10 border-blue-500/25' },
  feedback: { label: 'FB', color: 'text-violet-300', bgColor: 'bg-violet-500/10 border-violet-500/25' },
  optimized: { label: 'Opt', color: 'text-emerald-300', bgColor: 'bg-emerald-500/10 border-emerald-500/25' },
};

function buildTimeline(history: PromptAsset[]): TimelineNode[] {
  const nodes: TimelineNode[] = [];

  const sorted = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const asset of sorted) {
    nodes.push({
      id: `${asset.id}-generated`,
      type: 'generated',
      label: `Prompt 生成：${asset.title}`,
      description: asset.input || asset.title,
      timestamp: asset.createdAt,
      promptId: asset.id,
      score: asset.score,
      version: asset.version,
    });

    if (asset.executionUsed) {
      const execOutcome = asset.executionSuccess === false ? 'failed' :
        asset.feedback === 'failed' ? 'failed' :
        asset.feedback === 'average' ? 'partial' :
        asset.feedback === 'excellent' ? 'success' :
        asset.executionSuccess === true ? 'success' : undefined;
      nodes.push({
        id: `${asset.id}-executed`,
        type: 'executed',
        label: 'Playground 执行',
        description: asset.executionSuccess !== false ? '执行完成' : '执行失败',
        timestamp: asset.createdAt,
        promptId: asset.id,
        score: asset.score,
        outcome: execOutcome,
        failureReason: execOutcome === 'failed' ? '执行未达到预期效果' : undefined,
      });
    }

    if (asset.feedback) {
      nodes.push({
        id: `${asset.id}-feedback`,
        type: 'feedback',
        label: `反馈：${asset.feedback === 'excellent' ? '优秀' : asset.feedback === 'average' ? '一般' : '失败'}`,
        description: asset.feedback === 'failed' ? '执行结果不理想，需要优化' : '执行效果反馈已记录',
        timestamp: asset.createdAt,
        promptId: asset.id,
        feedback: asset.feedback,
      });
    }

    if (asset.version && asset.version > 1) {
      nodes.push({
        id: `${asset.id}-optimized`,
        type: 'optimized',
        label: `优化版本 v${asset.version}`,
        description: asset.mutationReason || 'Prompt 迭代优化',
        timestamp: asset.createdAt,
        promptId: asset.id,
        score: asset.score,
        version: asset.version,
      });
    }
  }

  return nodes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

interface ProjectTimelineProps {
  limit?: number;
}

export default function ProjectTimeline({ limit = 20 }: ProjectTimelineProps) {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPromptHistory({ limit: 50 }).then(history => {
      const timeline = buildTimeline(history);
      setNodes(timeline.slice(0, limit));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/[0.06] rounded w-1/3" />
                <div className="h-3 bg-white/[0.06] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">暂无项目时间线数据</p>
        <Link href="/prompt" className="text-sm text-violet-300 hover:text-violet-200 mt-2 inline-block transition-colors">
          生成第一个 Prompt →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold text-white mb-5">项目时间线</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />
        <div className="space-y-4">
          {nodes.map((node) => {
            const cfg = NODE_CONFIG[node.type];
            return (
              <div key={node.id} className="relative flex items-start gap-4 pl-2">
                <div className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-semibold ${cfg.bgColor} ${cfg.color}`}>
                  {cfg.label}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-sm font-medium ${cfg.color}`}>{node.label}</span>
                    {node.version && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-[var(--text-muted)]">v{node.version}</span>
                    )}
                    {node.score !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        node.score >= 80 ? 'bg-emerald-500/15 text-emerald-300' :
                        node.score >= 60 ? 'bg-amber-500/15 text-amber-300' :
                        'bg-red-500/15 text-red-300'
                      }`}>
                        {node.score}分
                      </span>
                    )}
                    {node.feedback && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        node.feedback === 'excellent' ? 'bg-emerald-500/15 text-emerald-300' :
                        node.feedback === 'average' ? 'bg-amber-500/15 text-amber-300' :
                        'bg-red-500/15 text-red-300'
                      }`}>
                        {node.feedback === 'excellent' ? '优秀' : node.feedback === 'average' ? '一般' : '失败'}
                      </span>
                    )}
                    {node.outcome && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${
                        node.outcome === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' :
                        node.outcome === 'partial' ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' :
                        'bg-red-500/15 text-red-300 border-red-500/25'
                      }`}>
                        {node.outcome === 'success' ? '成功' : node.outcome === 'partial' ? '部分' : '失败'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{node.description}</p>
                  {node.failureReason && (
                    <p className="text-xs text-red-400/80 mt-1 truncate">{node.failureReason}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {new Date(node.timestamp).toLocaleDateString()} {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {node.promptId && (
                      <Link
                        href={`/prompt/history?id=${node.promptId}`}
                        className="text-[10px] text-violet-300 hover:text-violet-200 transition-colors"
                      >
                        查看详情 →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
