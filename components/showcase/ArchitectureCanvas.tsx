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
    { id: 'frontend', name: 'Frontend', description: 'Next.js + Tailwind showcase', tech: 'React, Next.js', x: 25, y: 25 },
    { id: 'runtime', name: 'Runtime', description: 'Agent execution engine', tech: 'TypeScript, Streams', x: 50, y: 25 },
    { id: 'memory', name: 'Memory', description: 'Vector similarity retrieval', tech: 'PostgreSQL, Supabase', x: 75, y: 25 },
    { id: 'planner', name: 'Planner', description: 'Adaptive planning engine', tech: 'LLM, Rules', x: 25, y: 75 },
    { id: 'persistence', name: 'Persistence', description: 'Cloud storage layer', tech: 'Supabase, PG', x: 50, y: 75 },
    { id: 'analytics', name: 'Analytics', description: 'Metrics and insights', tech: 'Recharts, Dashboard', x: 75, y: 75 },
  ];

  const selected = nodes.find(n => n.id === selectedNode);

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2 bg-[#0a0a0f] rounded-lg h-80 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Nodes */}
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`absolute w-24 h-24 rounded-xl flex flex-col items-center justify-center transition-all ${
                selectedNode === node.id 
                  ? 'bg-[#6366f1] shadow-xl shadow-[#6366f1]/30 scale-110' 
                  : 'bg-[#1e293b] border border-[rgba(255,255,255,0.1)] hover:border-[#6366f1]'
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
              <span className="text-xs font-semibold text-[#f8fafc]">{node.name}</span>
            </button>
          ))}
        </div>

        {/* Details Panel */}
        <div className="bg-[#0f172a] rounded-lg p-6 border border-[rgba(255,255,255,0.05)]">
          {selected ? (
            <>
              <h3 className="text-xl font-bold text-[#818cf8] mb-4">{selected.name}</h3>
              <p className="text-[#94a3b8] mb-4">{selected.description}</p>
              <div className="mb-4">
                <div className="text-sm text-[#64748b] mb-1">Tech Stack</div>
                <div className="flex flex-wrap gap-2">
                  {selected.tech.split(', ').map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-[#1e293b] rounded-full text-xs text-[#94a3b8] border border-[rgba(255,255,255,0.1)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-[#64748b]">
              Click a node to explore details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
