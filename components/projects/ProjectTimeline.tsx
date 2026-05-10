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
}

const NODE_CONFIG: Record<TimelineNode['type'], { icon: string; color: string; bgColor: string }> = {
  idea: { icon: '💡', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  generated: { icon: '✨', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10 border-indigo-500/30' },
  executed: { icon: '▶️', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  feedback: { icon: '📝', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30' },
  optimized: { icon: '🔄', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' },
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
      nodes.push({
        id: `${asset.id}-executed`,
        type: 'executed',
        label: 'Playground 执行',
        description: asset.executionSuccess !== false ? '执行完成' : '执行失败',
        timestamp: asset.createdAt,
        promptId: asset.id,
        score: asset.score,
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
      <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50 text-center">
        <p className="text-sm text-gray-500">暂无项目时间线数据</p>
        <Link href="/prompt" className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
          生成第一个 Prompt →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-5">项目时间线</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700/50" />
        <div className="space-y-4">
          {nodes.map((node, i) => {
            const cfg = NODE_CONFIG[node.type];
            return (
              <div key={node.id} className="relative flex items-start gap-4 pl-2">
                <div className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-sm ${cfg.bgColor}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${cfg.color}`}>{node.label}</span>
                    {node.version && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-gray-400">v{node.version}</span>
                    )}
                    {node.score !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        node.score >= 80 ? 'bg-green-500/20 text-green-400' :
                        node.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {node.score}分
                      </span>
                    )}
                    {node.feedback && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        node.feedback === 'excellent' ? 'bg-green-500/20 text-green-400' :
                        node.feedback === 'average' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {node.feedback === 'excellent' ? '优秀' : node.feedback === 'average' ? '一般' : '失败'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{node.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500">
                      {new Date(node.timestamp).toLocaleDateString()} {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {node.promptId && (
                      <Link
                        href={`/prompt/history?id=${node.promptId}`}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
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
