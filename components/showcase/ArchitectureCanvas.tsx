'use client';

import { useState } from 'react';

interface Node {
  id: string;
  name: string;
  description: string;
  tech: string;
  x: number;
  y: number;
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
        <div className="lg:col-span-2 bg-[#09090B] rounded-lg h-80 relative overflow-hidden">
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
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`absolute w-24 h-24 rounded-xl flex flex-col items-center justify-center transition-all ${
                selectedNode === node.id 
                  ? 'bg-[#3B82F6] shadow-xl shadow-[#3B82F6]/30 scale-110' 
                  : 'bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.1)] hover:border-[#3B82F6]'
              }`}
              style={{
                left: `calc(${node.x}% - 48px)`,
                top: `calc(${node.y}% - 48px)`,
              }}
            >
              <span className="text-2xl mb-1">
                {node.id === 'frontend' && '🎨'}
                {node.id === 'runtime' && '⚙️'}
                {node.id === 'memory' && '🧠'}
                {node.id === 'planner' && '🎯'}
                {node.id === 'persistence' && '💾'}
                {node.id === 'analytics' && '📊'}
              </span>
              <span className="text-xs font-semibold text-[#FAFAFA]">{node.name}</span>
            </button>
          ))}
        </div>

        <div className="bg-[#111113] rounded-lg p-6 border border-[rgba(255,255,255,0.05)]">
          {selected ? (
            <>
              <h3 className="text-xl font-bold text-[#60A5FA] mb-4">{selected.name}</h3>
              <p className="text-[#A1A1AA] mb-4">{selected.description}</p>
              <div className="mb-4">
                <div className="text-sm text-[#71717A] mb-1">技术栈</div>
                <div className="flex flex-wrap gap-2">
                  {selected.tech.split(', ').map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-[rgba(24,24,27,0.72)] rounded-full text-xs text-[#A1A1AA] border border-[rgba(255,255,255,0.1)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-[#71717A]">
              点击节点探索组件详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
