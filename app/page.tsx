import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] py-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-20">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            让 AI 真正理解你的项目
          </h1>
          <p className="text-base text-zinc-500 max-w-lg mx-auto mb-8 leading-relaxed">
            导入 GitHub 仓库，自动整理项目上下文，一键复制给 Claude / Cursor / GPT。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/projects"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-sm font-medium text-white transition-all"
            >
              导入仓库
            </Link>
            <Link
              href="/prompt/discovery"
              className="px-5 py-2.5 rounded-lg border border-zinc-800 text-sm font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              开始方向探索
            </Link>
          </div>
        </div>

        {/* Workflow */}
        <div className="mb-20">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { step: 1, label: '方向探索', desc: '找到值得做' },
              { step: 2, label: '项目记忆', desc: 'AI 理解项目' },
              { step: 3, label: 'AI 导出', desc: '开始开发' },
            ].map((w) => (
              <div key={w.step} className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-400">
                    {w.step}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{w.label}</p>
                    <p className="text-xs text-zinc-500">{w.desc}</p>
                  </div>
                </div>
                {w.step < 3 && (
                  <span className="text-zinc-600">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <p className="text-sm text-zinc-500 mb-1">还没有项目记忆</p>
          <p className="text-xs text-zinc-600">导入一个 GitHub 仓库，让 AI 理解你的项目</p>
        </div>

      </div>
    </div>
  );
}
