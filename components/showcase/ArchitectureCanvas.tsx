'use client';

import { useState, type ReactNode } from 'react';

interface Node {
  id: string;
  name: string;
  description: string;
  tech: string;
  x: number;
  y: number;
}

function NodeIcon({ id }: { id: string }): ReactNode {
  const props = {
    className: 'w-6 h-6 mb-1',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'frontend':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      );
    case 'runtime':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'memory':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case 'planner':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'persistence':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ArchitectureCanvas() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodes: Node[] = [
    { id: 'frontend', name: '前端层', description: 'Next.js + Tailwind 展示层', tech: 'React, Next.js', x: 25, y: 25 },
    { id: 'runtime', name: '运行时', description: '代理执行引擎', tech: 'TypeScript, Streams', x: 50, y: 25 },
    { id: 'memory', name: '记忆系统', description: '向量相似度检索', tech: 'PostgreSQL, Supabase', x: 75, y: 25 },
    { id: 'planner', name: '规划器', description: '自适应规划引擎', tech: 'LLM, Rules', x: 25, y: 75 },
    { id: 'persistence', name: '持久层', description: '云存储层', tech: 'Supabase, PG', x: 50, y: 75 },
    { id: 'analytics', name: '分析面板', description: '指标与洞察', tech: 'Recharts, Dashboard', x: 75, y: 75 },
  ];

  const selected = nodes.find(n => n.id === selectedNode);

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-sunken)] rounded-lg h-80 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3B82F6" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {nodes.map((node) => (
            <button
              type="button"
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              aria-label={node.name}
              className={`absolute w-24 h-24 rounded-xl flex flex-col items-center justify-center transition-all ${
                selectedNode === node.id
                  ? 'bg-[#3B82F6] text-white shadow-xl shadow-[#3B82F6]/30 scale-110'
                  : 'bg-[rgba(24,24,27,0.72)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[#3B82F6]'
              }`}
              style={{
                left: `calc(${node.x}% - 48px)`,
                top: `calc(${node.y}% - 48px)`,
              }}
            >
              <NodeIcon id={node.id} />
              <span className="text-xs font-semibold text-[var(--text)]">{node.name}</span>
            </button>
          ))}
        </div>

        <div className="bg-[rgba(255,255,255,0.02)] rounded-lg p-6 border border-[var(--border)]">
          {selected ? (
            <>
              <h3 className="text-xl font-bold text-[#60A5FA] mb-4">{selected.name}</h3>
              <p className="text-[var(--text-secondary)] mb-4">{selected.description}</p>
              <div className="mb-4">
                <div className="text-sm text-[var(--text-tertiary)] mb-1">技术栈</div>
                <div className="flex flex-wrap gap-2">
                  {selected.tech.split(', ').map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-[rgba(24,24,27,0.72)] rounded-full text-xs text-[var(--text-secondary)] border border-[var(--border-light)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-[var(--text-tertiary)]">
              点击节点探索组件详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
