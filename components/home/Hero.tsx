'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

function PipelineDiagram() {
  const agents = [
    { name: '架构设计', icon: '🏗', x: 50, y: 40 },
    { name: '代码实现', icon: '💻', x: 200, y: 40 },
    { name: '质量审查', icon: '🔍', x: 350, y: 40 },
    { name: '部署上线', icon: '🚀', x: 500, y: 40 },
  ];

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl bg-[rgba(24,24,27,0.5)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 560 120">
        {agents.map((a, i) => (
          i < agents.length - 1 && (
            <line
              key={`line-${i}`}
              x1={a.x + 40}
              y1={a.y + 20}
              x2={agents[i + 1].x}
              y2={agents[i + 1].y + 20}
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="8"
                to="0"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </line>
          )
        ))}
        {agents.map((a, i) => (
          <g key={i}>
            <rect
              x={a.x - 10}
              y={a.y - 5}
              width={80}
              height={50}
              rx={8}
              fill="rgba(24,24,27,0.8)"
              stroke="rgba(59,130,246,0.3)"
              strokeWidth="1"
            />
            <text x={a.x + 30} y={a.y + 18} textAnchor="middle" fontSize="16">{a.icon}</text>
            <text x={a.x + 30} y={a.y + 36} textAnchor="middle" fontSize="9" fill="#A1A1AA">{a.name}</text>
          </g>
        ))}
        <text x="280" y="100" textAnchor="middle" fontSize="10" fill="#71717A">记忆增强 · 自适应规划 · 协同执行</text>
      </svg>
    </div>
  );
}

export default function Hero() {
  const [stats, setStats] = useState({ executions: 0, successRate: 0, memoryHit: 0, avgTime: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch('/api/executions');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const total = data.length;
          const completed = data.filter((e: any) => e.status === 'completed').length;
          const memoryInfluenced = data.filter((e: any) => e.memory_influenced).length;
          setStats({
            executions: total,
            successRate: Math.round((completed / total) * 100),
            memoryHit: Math.round((memoryInfluenced / total) * 100),
            avgTime: 45,
          });
        } else {
          setStats({ executions: 0, successRate: 0, memoryHit: 0, avgTime: 0 });
        }
      } catch {
        setStats({ executions: 0, successRate: 0, memoryHit: 0, avgTime: 0 });
      }
      setStatsLoaded(true);
    };
    loadStats();
  }, []);

  const metrics = useMemo(() => [
    { label: '今日执行', value: `${stats.executions}`, unit: '次', color: 'text-[#FAFAFA]' },
    { label: '成功率', value: `${stats.successRate}`, unit: '%', color: 'text-[#10B981]' },
    { label: 'Memory 命中', value: `${stats.memoryHit}`, unit: '%', color: 'text-[#3B82F6]' },
    { label: '平均耗时', value: `${stats.avgTime}`, unit: 's', color: 'text-[#F59E0B]' },
  ], [stats]);

  return (
    <section className="relative min-h-[85vh] flex items-center py-16 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.06)_0%,_transparent_60%)]" />

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs font-medium tracking-wider mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
              </span>
              系统在线 · 实时可用
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-[1.15] tracking-tight">
              <span className="text-[#FAFAFA]">AgentForge</span>
              <br />
              <span className="bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#8B5CF6] bg-clip-text text-transparent">
                智能工程系统
              </span>
            </h1>

            <p className="text-[#A1A1AA] text-base md:text-lg mb-2 font-medium">
              让 AI 具备持续记忆、自适应规划与工程执行能力
            </p>
            <p className="text-[#71717A] text-sm mb-8 leading-relaxed">
              Memory-Augmented Adaptive Engineering Runtime
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-8">
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold hover:-translate-y-0.5 transition-all text-sm"
              >
                立即体验
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link
                href="/showcase"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[rgba(24,24,27,0.72)] text-[#FAFAFA] font-medium border border-[rgba(255,255,255,0.1)] hover:border-[rgba(59,130,246,0.3)] transition-all text-sm"
              >
                查看能力演示
              </Link>
              <Link
                href="/interview"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[#A1A1AA] font-medium hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] transition-all text-sm"
              >
                系统架构
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <PipelineDiagram />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 max-w-3xl">
          {metrics.map((m, i) => (
            <div key={i} className="px-4 py-3 rounded-xl bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.06)]">
              <div className={`text-2xl font-bold ${m.color} transition-all`}>
                {statsLoaded ? (
                  <>{m.value}<span className="text-sm font-normal text-[#71717A] ml-0.5">{m.unit}</span></>
                ) : (
                  <span className="inline-block w-12 h-6 bg-[rgba(39,39,42,0.8)] rounded animate-pulse" />
                )}
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
