import Link from 'next/link';
import GlassCard from '@/components/shared/GlassCard';

const capabilities = [
  {
    title: '多智能体协作',
    desc: 'Architect / Coding / Debug / Deploy 角色流水线，契约化 Runtime，顺序执行可观测。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: '记忆增强',
    desc: 'pgvector 语义召回 + 关键词回退；可选 MaxKB text2vec 本地向量，768 维对齐。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    title: '可观测性',
    desc: 'SSE 流式步骤、质量分、记忆影响事件；Lab 面板展示真实执行记录。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: '工程产物',
    desc: '上下文编译导出、修复 Prompt、仓库成熟度分析，直接喂给 Cursor / Claude。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

const layers = [
  {
    n: '01',
    title: '前端展示层',
    desc: 'Next.js 14 App Router · Tailwind · OLED 暗色玻璃态 · SSE 客户端',
  },
  {
    n: '02',
    title: 'Agent 运行时',
    desc: 'Planner · 多角色执行 · outputValidator · 限流 · DeepSeek LLM',
  },
  {
    n: '03',
    title: '数据与向量',
    desc: 'Supabase PostgreSQL · pgvector · MaxKB text2vec / 哈希回退',
  },
];

export default function AboutPage() {
  return (
    <div className="page-shell py-14 sm:py-20">
      <div className="page-hero max-w-2xl mx-auto animate-fade-up">
        <span className="badge badge-violet mb-5">About</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          关于 AgentForge
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          独立完成的记忆增强多智能体工程工作台。面向 AI Agent / RAG / 全栈实习作品集，
          只写代码里能指着讲的能力。
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">
        <GlassCard className="p-7 sm:p-8 animate-fade-up" mesh>
          <h2 className="text-xl font-semibold text-white mb-3">定位</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            AgentForge 不是「又一个 ChatUI」。它把工程任务拆成规划、多角色执行、质量门禁与
            记忆召回的闭环，前端用 SSE 实时展示，后端用 Supabase + pgvector 持久化经验。
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            对话模型默认 DeepSeek；向量可接 MaxKB 内置
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/[0.05] text-violet-300 text-xs font-mono">
              text2vec-base-chinese
            </code>
            ，无服务时自动哈希回退，保证演示链路不断。
          </p>
        </GlassCard>

        <GlassCard className="p-7 sm:p-8 animate-fade-up animate-delay-1">
          <h2 className="text-xl font-semibold text-white mb-6">核心能力</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {capabilities.map((c) => (
              <div key={c.title} className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-violet-500/12 border border-violet-500/20 text-violet-300 flex items-center justify-center">
                  {c.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{c.title}</h3>
                  <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-7 sm:p-8 animate-fade-up animate-delay-2">
          <h2 className="text-xl font-semibold text-white mb-6">系统分层</h2>
          <div className="space-y-4">
            {layers.map((l) => (
              <div key={l.n} className="flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/[0.06] flex items-center justify-center font-mono text-xs text-violet-300">
                  {l.n}
                </div>
                <div className="pt-1">
                  <h3 className="text-sm font-semibold text-white mb-0.5">{l.title}</h3>
                  <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 animate-fade-up animate-delay-3">
          <Link href="/projects" className="btn-primary w-full sm:w-auto">
            导入仓库体验
          </Link>
          <a
            href="https://github.com/a-hi1/AgentForge-Blog"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full sm:w-auto"
          >
            GitHub 源码
          </a>
        </div>
      </div>
    </div>
  );
}
