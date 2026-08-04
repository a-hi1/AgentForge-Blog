import Link from 'next/link';

const features = [
  {
    title: '多智能体流水线',
    desc: 'Architect → Coding → Debug → Deploy 角色顺序执行，契约化 Runtime，输出可校验。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h10M4 18h7" />
      </svg>
    ),
    tone: 'violet',
  },
  {
    title: '记忆增强检索',
    desc: 'Supabase pgvector 语义召回 + 关键词回退；可接 MaxKB text2vec 本地向量。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
      </svg>
    ),
    tone: 'blue',
  },
  {
    title: '质量门禁',
    desc: '规则化 outputValidator：结构、中文占比、代码块完整性；不达标自动重试。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tone: 'green',
  },
  {
    title: 'SSE 实时观测',
    desc: '步骤级流式推送：规划、执行 chunk、质量分、记忆影响，前端可回放。',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    tone: 'amber',
  },
];

const steps = [
  { n: '01', title: '方向探索', desc: '澄清产品方向与边界', href: '/prompt/discovery' },
  { n: '02', title: '项目记忆', desc: '导入仓库，沉淀上下文', href: '/projects' },
  { n: '03', title: 'AI 导出', desc: '编译可执行的工程 Prompt', href: '/prompt' },
  { n: '04', title: 'Agent 运行', desc: '多角色执行 + 记忆召回', href: '/lab' },
];

const stack = [
  'Next.js 14',
  'TypeScript',
  'Supabase',
  'pgvector',
  'DeepSeek',
  'MaxKB Embedding',
  'SSE',
  'Vercel',
];

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="page-shell pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="page-hero max-w-3xl mx-auto animate-fade-up">
          <div className="badge badge-violet mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Memory-Augmented Multi-Agent Workbench
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-white">让 AI 真正</span>
            <br />
            <span className="gradient-text">理解你的项目</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
            导入 GitHub 仓库，规划 → 执行 → 校验 → 记忆闭环。
            一键导出给 Claude / Cursor / GPT，面试可讲、代码可指。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/projects" className="btn-primary w-full sm:w-auto min-w-[160px]">
              导入仓库
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/prompt/discovery" className="btn-secondary w-full sm:w-auto min-w-[160px]">
              开始方向探索
            </Link>
          </div>
        </div>

        {/* Workflow strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto animate-fade-up animate-delay-1">
          {steps.map((s, i) => (
            <Link
              key={s.n}
              href={s.href}
              className="glass-card glass-card-interactive p-4 sm:p-5 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-violet-400/80">{s.n}</span>
                {i < steps.length - 1 && (
                  <svg
                    className="w-3.5 h-3.5 text-[var(--text-muted)] hidden lg:block group-hover:text-violet-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
              <p className="text-sm font-semibold text-white mb-1">{s.title}</p>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="page-shell py-12 sm:py-16">
        <div className="text-center mb-10 animate-fade-up">
          <p className="section-label mb-3">Core Capabilities</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            工程化 AI，而不是聊天壳
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {features.map((f, idx) => (
            <div
              key={f.title}
              className={`glass-card p-6 animate-fade-up animate-delay-${(idx % 4) + 1}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  f.tone === 'violet'
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                    : f.tone === 'blue'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                      : f.tone === 'green'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                }`}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack + CTA */}
      <section className="page-shell py-12 sm:py-20">
        <div className="glass-card mesh-panel p-8 sm:p-12 text-center max-w-4xl mx-auto animate-fade-up">
          <p className="section-label mb-3">Tech Stack</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">
            可演示 · 可深挖 · 可写进简历
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto mb-8 leading-relaxed">
            默认 DeepSeek 对话；向量优先接 MaxKB 内置 text2vec-base-chinese（768 维），
            与 pgvector schema 对齐。密钥不落库，CI 含 typecheck / test / eval / build。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {stack.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] bg-white/[0.03] border border-[var(--border)]"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/lab" className="btn-primary w-full sm:w-auto">
              打开实验室
            </Link>
            <a
              href="https://github.com/a-hi1/AgentForge-Blog"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full sm:w-auto"
            >
              查看源码
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
